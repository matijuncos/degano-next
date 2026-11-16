// src/lib/equipmentCleanup.ts
// Limpieza de reservas vencidas + estado de los equipos según sus reservas (la
// corre GET /api/equipment sin fechas):
//  - reserva que EMPEZÓ → el equipo pasa a "En uso" con la ubicación del evento;
//  - evento que TERMINÓ → vuelve a Depósito (solo si es seguro).
//
// Antes se cortaba: corría en segundo plano sin esperar y liberaba uno por uno
// SOLO a los equipos a los que en esa pasada se les quitó una reserva; en
// eventos grandes (cientos de equipos) Vercel cortaba la función a la mitad y
// los que faltaban quedaban "En Evento" para siempre (298 equipos, nov 2026).
// Ahora: se espera; la liberación mira TODOS los "En Evento" (si algo se corta,
// la próxima pasada lo completa) y va en una sola operación + historial en lote.
//
// IMPORTANTE: todas las escrituras son atómicas en Mongo ($pull / update
// condicional). NUNCA reescribir `scheduledUses` con una copia leída antes: si en
// el medio se crea/edita un evento, esa copia vieja pisa sus reservas (así
// aparecieron reservas fantasma y reservas faltantes, oct 2026).
//
// REGLA: jamás mostrar disponible algo que está en uso. Qué se libera lo decide
// `pickReleasable` (utils/equipmentRelease, testeada): ante la duda, NO.
import { createHistoryEntries } from '@/utils/equipmentHistoryUtils';
import { pickReleasable, liveEventEquipmentIds, pickActivations } from '@/utils/equipmentRelease';

const DAY_MS = 24 * 60 * 60 * 1000;

// Eventos que pueden estar en curso (fechas Date o texto: el filtro fino es en JS)
async function equipmentInLiveEvents(db: any, now: Date): Promise<Set<string>> {
  const dayAgo = new Date(now.getTime() - DAY_MS);
  const events = await db
    .collection('events')
    .find(
      {
        // Solo eventos con equipos que terminan desde ayer. Las fechas pueden ser
        // Date o texto ISO (se comparan como texto: el ISO ordena bien)
        'equipment.0': { $exists: true },
        $or: [{ endDate: { $gte: dayAgo } }, { endDate: { $type: 'string', $gte: dayAgo.toISOString() } }]
      },
      { projection: { date: 1, endDate: 1, 'equipment._id': 1 } }
    )
    .toArray();
  return liveEventEquipmentIds(events, now);
}

export interface CleanupResult {
  activated: { _id: string; code?: string; name?: string; event?: string }[];
  released: { _id: string; code?: string; name?: string }[];
}

// Equipos cuya reserva ya EMPEZÓ y no figuran "En uso" con ese evento → se
// marcan (como postEvent con un evento de hoy). Sin esto, un evento cargado con
// anticipación mostraba sus equipos "Disponible" mientras ocurría. Nunca pisa
// una baja manual (reparación, etc.): eso lo decide pickActivations (testeada).
async function activateStartedUses(db: any, userId: string, now: Date, dryRun: boolean, runId: string) {
  const equipmentCol = db.collection('equipment');
  const inUseNow = { scheduledUses: { $elemMatch: { startDate: { $lte: now }, endDate: { $gte: now } } } };
  const notManualOut = { $or: [{ 'outOfService.isOut': { $ne: true } }, { 'outOfService.reason': 'En Evento' }] };
  const candidates = await equipmentCol
    .find({ ...inUseNow, ...notManualOut })
    .project({ _id: 1, name: 1, code: 1, outOfService: 1, lastUsedStartDate: 1, lastUsedEndDate: 1, scheduledUses: 1 })
    .toArray();
  const byId = new Map(candidates.map((c: any) => [String(c._id), c]));
  const toActivate = pickActivations(candidates, now);
  const list = toActivate.map((a: any) => {
    const eq: any = byId.get(String(a._id));
    return { _id: String(a._id), code: eq?.code, name: eq?.name, event: a.set.outOfService.details };
  });
  if (dryRun || !toActivate.length) return list;

  // Una sola ida a la base; cada update vuelve a exigir uso en curso y que no
  // sea una baja manual (por si cambió en el medio)
  // El filtro excluye a los que YA figuran con este mismo uso: si otra pasada
  // (otra persona abriendo Equipamiento a la vez) los marcó, no se repite nada.
  // Se marca con `cleanupRunId` para saber qué cambió ESTA pasada.
  await equipmentCol.bulkWrite(
    toActivate.map((a: any) => ({
      updateOne: {
        filter: {
          _id: a._id,
          ...inUseNow,
          ...notManualOut,
          $nor: [
            {
              'outOfService.reason': 'En Evento',
              lastUsedStartDate: a.set.lastUsedStartDate,
              lastUsedEndDate: a.set.lastUsedEndDate
            }
          ]
        },
        update: { $set: { ...a.set, cleanupRunId: runId } }
      }
    })),
    { ordered: false }
  );

  // Historial solo de lo que cambió ESTA pasada (en lote; el historial es permanente)
  const after = await equipmentCol
    .find({ _id: { $in: toActivate.map((a: any) => a._id) }, cleanupRunId: runId })
    .project({ _id: 1 })
    .toArray();
  const okIds = new Set(after.map((e: any) => String(e._id)));
  await createHistoryEntries(
    db,
    toActivate
      .filter((a: any) => okIds.has(String(a._id)))
      .map((a: any) => {
        const eq: any = byId.get(String(a._id));
        return {
          equipmentId: String(a._id),
          equipmentName: eq?.name,
          equipmentCode: eq?.code,
          action: 'cambio_estado',
          userId: userId || 'SYSTEM',
          fromValue: eq?.outOfService?.isOut ? 'En Evento (otro evento)' : 'Disponible',
          toValue: 'En Evento',
          eventId: a.use?.eventId ? String(a.use.eventId) : undefined,
          eventName: a.use?.eventName,
          eventDate: a.set.lastUsedStartDate,
          eventEndDate: a.set.lastUsedEndDate,
          eventLocation: a.use?.location,
          details: `En uso automáticamente - empezó la reserva (${a.set.outOfService.details})`
        };
      })
  );
  return list.filter((x: any) => okIds.has(x._id));
}

export async function cleanupExpiredScheduledUses(
  db: any,
  userId: string,
  { dryRun = false, now = new Date() }: { dryRun?: boolean; now?: Date } = {}
): Promise<CleanupResult> {
  // `now` solo se cambia para simular (dryRun); la ruta usa la hora real
  const equipmentCol = db.collection('equipment');

  // 1. Quitar solo las reservas vencidas (una operación)
  if (!dryRun) {
    await equipmentCol.updateMany(
      { 'scheduledUses.endDate': { $lt: now } },
      { $pull: { scheduledUses: { endDate: { $lt: now } } } }
    );
  }

  // Id de esta pasada: el historial se escribe solo para lo que cambió ella
  const runId = `${now.getTime()}-${Math.random().toString(36).slice(2, 10)}`;

  // 2 y 3 en paralelo (no se pisan: activar es para equipos CON uso en curso;
  // liberar, para los que NO tienen uso en curso):
  //  2. Reservas que ya empezaron → "En uso"
  //  3. Candidatos a liberar: "En Evento" sin uso en curso (lo fino lo decide pickReleasable)
  const notInUseNow = {
    'outOfService.reason': 'En Evento',
    scheduledUses: { $not: { $elemMatch: { startDate: { $lte: now }, endDate: { $gte: now } } } }
  };
  const [activated, candidates] = await Promise.all([
    activateStartedUses(db, userId, now, dryRun, runId),
    equipmentCol
      .find(notInUseNow)
      .project({ _id: 1, name: 1, code: 1, lastUsedEndDate: 1, scheduledUses: 1 })
      .toArray()
  ]);
  if (!candidates.length) return { activated, released: [] };

  // Si esto falla, se corta acá (no se libera nada)
  const busy = await equipmentInLiveEvents(db, now);
  const toRelease = pickReleasable(candidates, busy, now);
  const released = toRelease.map((e: any) => ({ _id: String(e._id), code: e.code, name: e.name }));
  if (dryRun || !toRelease.length) return { activated, released };

  // 4. Liberar en una sola operación. El filtro vuelve a exigir "sin uso en
  // curso": si justo se le asignó un evento en curso, no se toca.
  const ids = toRelease.map((e: any) => e._id);
  // También exige que el último uso ya haya terminado (si en el medio se lo marcó
  // para un evento de hoy, no se libera). Se marca con `cleanupRunId`.
  await equipmentCol.updateMany(
    {
      _id: { $in: ids },
      ...notInUseNow,
      // Fecha guardada como Date o como texto ISO (registros viejos)
      $or: [{ lastUsedEndDate: { $lt: now } }, { lastUsedEndDate: { $type: 'string', $lt: now.toISOString() } }]
    },
    {
      $set: {
        location: 'Deposito',
        lastUsedStartDate: null,
        lastUsedEndDate: null,
        outOfService: { isOut: false, reason: null, details: null },
        cleanupRunId: runId
      }
    }
  );

  // Historial solo de lo que liberó ESTA pasada (en lote; el historial es permanente)
  const done = await equipmentCol
    .find({ _id: { $in: ids }, cleanupRunId: runId })
    .project({ _id: 1, name: 1, code: 1 })
    .toArray();
  await createHistoryEntries(
    db,
    done.map((eq: any) => ({
      equipmentId: eq._id.toString(),
      equipmentName: eq.name,
      equipmentCode: eq.code,
      action: 'cambio_estado',
      userId: userId || 'SYSTEM',
      fromValue: 'En Evento',
      toValue: 'Disponible',
      details: 'Liberado automáticamente - evento finalizado'
    }))
  );
  return { activated, released: done.map((e: any) => ({ _id: String(e._id), code: e.code, name: e.name })) };
}
