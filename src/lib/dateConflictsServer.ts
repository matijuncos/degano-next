import { Db, ObjectId } from 'mongodb';
import { conflictingUses, isEquipmentUnavailable } from '@/utils/equipmentAvailability';
import { reservationStart } from '@/utils/reservationRange';
import { sumRentalPrice } from '@/utils/equipmentPrices';
import { createHistoryEntries } from '@/utils/equipmentHistoryUtils';
import { releaseEquipmentFromEvent } from '@/lib/equipmentRelease';
import {
  buildConflictReport,
  buildChangeNotice,
  applyLocalResolutions,
  ConflictResolution,
  DateConflict,
  NoticeChange,
  OtherEventInfo,
  OtherEventOp
} from '@/utils/dateChangeConflicts';

/**
 * Lado servidor de los choques al cambiar fechas (ver utils/dateChangeConflicts).
 * Acá viven las consultas y las escrituras sobre OTROS eventos y equipos; la
 * decisión es siempre de la lógica pura.
 */

/** Lo elegido ya no vale (alguien reservó entremedio): el 409 se recalcula. */
export class ConflictChangedError extends Error {
  constructor(message = 'Los equipos cambiaron mientras elegías') {
    super(message);
    this.name = 'ConflictChangedError';
  }
}

const toObjectIds = (ids: string[]) =>
  Array.from(new Set(ids.map(String))).filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
// eventId de las reservas: se guardó como string, pero puede haber ObjectId viejos
const idVariants = (id: string) => (ObjectId.isValid(id) ? [String(id), new ObjectId(id)] : [String(id)]);

const EVENT_RANGE_PROJECTION = {
  'equipment._id': 1,
  date: 1,
  endDate: 1,
  equipmentArrivalDate: 1,
  equipmentArrivalTime: 1,
  equipmentArrivalConfirmedFor: 1,
  type: 1,
  name: 1,
  lugar: 1
};

function otherEventInfo(ev: any): OtherEventInfo {
  return {
    _id: String(ev._id),
    equipmentIds: (ev.equipment || []).map((e: any) => String(e._id)),
    start: reservationStart(ev),
    end: new Date(ev.endDate)
  };
}

/**
 * Choques de los equipos de ESTE evento en el rango nuevo, con candidatos.
 * [] = no choca nada. 3 consultas (las dos últimas en paralelo).
 */
export async function loadConflictReport(
  db: Db,
  args: { eventId: string; start: Date; end: Date; eventEquipmentIds: string[] }
): Promise<DateConflict[]> {
  const { eventId, start, end } = args;
  const ids = toObjectIds(args.eventEquipmentIds);
  if (!ids.length) return [];
  const docs = await db
    .collection('equipment')
    .find({ _id: { $in: ids } }, { projection: { name: 1, code: 1, categoryId: 1, scheduledUses: 1, outOfService: 1 } })
    .toArray();
  const clashing = docs.filter((d: any) => conflictingUses(start, end, d.scheduledUses, { ignoreEventId: eventId }).length > 0);
  if (!clashing.length) return [];

  const names = Array.from(new Set(clashing.map((d: any) => d.name).filter(Boolean)));
  const categoryIds = Array.from(new Set(clashing.map((d: any) => d.categoryId).filter(Boolean).map(String)));
  const otherIds = Array.from(
    new Set(
      clashing.flatMap((d: any) =>
        conflictingUses(start, end, d.scheduledUses, { ignoreEventId: eventId }).map((u) => String(u.eventId))
      )
    )
  );
  const [pool, others] = await Promise.all([
    db
      .collection('equipment')
      .find(
        { $or: [{ name: { $in: names } }, { categoryId: { $in: categoryIds.flatMap(idVariants) } }] },
        { projection: { name: 1, code: 1, categoryId: 1, scheduledUses: 1, outOfService: 1 } }
      )
      .toArray(),
    db
      .collection('events')
      .find({ _id: { $in: toObjectIds(otherIds) } }, { projection: EVENT_RANGE_PROJECTION })
      .toArray()
  ]);
  // Los que chocan van en el pool aunque no compartan nombre/categoría con nadie
  const poolById = new Map<string, any>([...clashing, ...pool].map((u: any) => [String(u._id), u]));
  return buildConflictReport({
    eventId,
    start,
    end,
    eventEquipmentIds: args.eventEquipmentIds,
    conflictingIds: clashing.map((d: any) => String(d._id)),
    pool: Array.from(poolById.values()),
    otherEvents: new Map(others.map((ev: any) => [String(ev._id), otherEventInfo(ev)])),
    now: new Date()
  });
}

/**
 * Cambia el OTRO evento para que el actual conserve sus unidades: reemplaza la
 * unidad (precio real de la nueva), la terceriza (+1 en extraEquipment) o la
 * quita; recalcula equipmentPrice, mueve/saca la reserva, historial y deja UN
 * aviso en ese evento. Revalida contra la base antes de escribir.
 */
type OtherEventChangeArgs = {
  otherEventId: string;
  ops: OtherEventOp[];
  fromEventId: string;
  fromEventName: string;
  userSub?: string;
  byName: string;
};
export type OtherEventChangePlan = Awaited<ReturnType<typeof prepareOtherEventChange>>;

/**
 * Paso 1 (sin escribir): lee y valida el cambio en el otro evento. Se hace
 * para TODOS los eventos antes de escribir en ninguno: si uno ya no cierra
 * (ConflictChangedError), no se toca nada.
 */
export async function prepareOtherEventChange(db: Db, args: OtherEventChangeArgs) {
  const { otherEventId, ops } = args;
  if (!ops.length || !ObjectId.isValid(otherEventId)) throw new ConflictChangedError();
  const replaces = ops.filter((o) => o.kind === 'replace' && o.toId);
  const [other, units] = await Promise.all([
    db.collection('events').findOne({ _id: new ObjectId(otherEventId) }),
    db
      .collection('equipment')
      .find(
        { _id: { $in: toObjectIds(ops.flatMap((o) => [o.fromId, ...(o.toId ? [o.toId] : [])])) } },
        { projection: { history: 0 } }
      )
      .toArray()
  ]);
  if (!other) throw new ConflictChangedError();
  const unitById = new Map(units.map((u: any) => [String(u._id), u]));
  const info = otherEventInfo(other);
  const inOther = new Set(info.equipmentIds);
  for (const o of ops) {
    if (!inOther.has(String(o.fromId))) throw new ConflictChangedError();
    if (o.kind !== 'replace') continue;
    const to = unitById.get(String(o.toId));
    if (
      !o.toId ||
      inOther.has(String(o.toId)) ||
      !to ||
      isEquipmentUnavailable(to.outOfService) ||
      conflictingUses(info.start, info.end, to.scheduledUses, { ignoreEventId: otherEventId }).length > 0
    ) {
      throw new ConflictChangedError();
    }
  }
  return { args, other, unitById, info, replaces };
}

/** Paso 2: escribe el cambio ya validado (ver prepareOtherEventChange). */
export async function applyOtherEventChange(
  db: Db,
  plan: OtherEventChangePlan
): Promise<(NoticeChange & { kind: OtherEventOp['kind'] })[]> {
  const { args, other, unitById, info, replaces } = plan;
  const { otherEventId, ops } = args;

  // Misma transformación que en el evento actual (lógica pura testeada)
  const asLocal: ConflictResolution[] = ops.map((o) =>
    o.kind === 'replace'
      ? { equipmentId: o.fromId, action: 'replaceHere', toId: String(o.toId) }
      : { equipmentId: o.fromId, action: o.kind }
  );
  const { equipment, extraEquipment } = applyLocalResolutions(
    other.equipment || [],
    other.extraEquipment || [],
    asLocal,
    unitById
  );
  const changes = ops.map((o) => {
    const from: any = unitById.get(String(o.fromId)) || {};
    const to: any = o.toId ? unitById.get(String(o.toId)) || {} : {};
    return { fromName: from.name || '', fromCode: from.code || '', toName: to.name || '', toCode: to.code || '', kind: o.kind };
  });
  const now = new Date();
  // ORDEN (si la request se corta a la mitad): 1) reserva en la unidad nueva,
  // 2) el evento, 3) se libera la vieja. Una reserva de más se ve y se limpia
  // ("reserva sobrante"); una que FALTA dejaría la unidad libre para otro evento.
  if (replaces.length) {
    const sample: any = ops
      .map((o) => unitById.get(String(o.fromId)))
      .flatMap((u: any) => u?.scheduledUses || [])
      .find((u: any) => String(u?.eventId) === String(otherEventId));
    const scheduledUse = {
      eventId: String(otherEventId),
      eventName: sample?.eventName ?? (other.name || other.type),
      eventType: sample?.eventType ?? other.type,
      startDate: info.start,
      endDate: info.end,
      location: sample?.location ?? other.lugar
    };
    const toIds = toObjectIds(replaces.map((o) => String(o.toId)));
    await db.collection('equipment').updateMany({ _id: { $in: toIds } }, { $push: { scheduledUses: scheduledUse } as any });
    // Si ese evento está en curso, la unidad nueva figura "En Evento" (igual que updateEvent)
    if (info.start.getTime() <= now.getTime() && now.getTime() <= info.end.getTime()) {
      await db.collection('equipment').updateMany(
        { _id: { $in: toIds } },
        {
          $set: {
            lastUsedStartDate: info.start,
            lastUsedEndDate: info.end,
            location: other.lugar,
            outOfService: { isOut: true, reason: 'En Evento', details: `${other.type} - ${other.lugar}` }
          }
        }
      );
    }
  }
  await db.collection('events').updateOne(
    { _id: other._id },
    {
      $set: { equipment, extraEquipment, equipmentPrice: sumRentalPrice(equipment), updatedAt: now },
      $push: {
        equipmentChangeNotices: buildChangeNotice({
          byName: args.byName,
          fromEventId: args.fromEventId,
          fromEventName: args.fromEventName,
          now,
          changes
        })
      } as any
    }
  );

  const released = await releaseEquipmentFromEvent(db, ops.map((o) => o.fromId), String(otherEventId));
  const decisionById = new Map(released.map((r) => [String(r._id), r.decision]));

  const label = `${other.type || ''} - ${other.lugar || ''}`;
  const why = `al cambiar las fechas de ${args.fromEventName}`;
  await createHistoryEntries(db, [
    ...changes
      .map((c, i) => ({ c, o: ops[i] }))
      .filter(({ o }) => o.kind === 'replace')
      .map(({ c, o }) => ({
        equipmentId: String(o.toId),
        equipmentName: c.toName,
        equipmentCode: c.toCode,
        action: 'uso_evento' as const,
        userId: args.userSub,
        eventId: String(otherEventId),
        eventName: other.type,
        eventDate: info.start,
        eventEndDate: info.end,
        eventLocation: other.lugar,
        eventClientName: other.fullName,
        details: `Reemplaza a ${c.fromCode} en ${label} (${why})`
      })),
    ...changes.map((c, i) => ({
      equipmentId: String(ops[i].fromId),
      equipmentName: c.fromName,
      equipmentCode: c.fromCode,
      action: 'cambio_estado' as const,
      userId: args.userSub,
      fromValue: 'En Evento',
      toValue: decisionById.get(String(ops[i].fromId)) === 'free' ? 'Disponible' : 'Sin cambios',
      details:
        c.kind === 'replace'
          ? `Reemplazado por ${c.toCode} en ${label} (${why})`
          : c.kind === 'outsource'
          ? `Quitado de ${label}: se terceriza (${why})`
          : `Quitado de ${label} (${why})`
    }))
  ]);
  return changes;
}

/**
 * Saca una reserva sobrante: su evento no existe o ya no tiene ese equipo
 * (queda cuando un guardado/borrado se corta a la mitad). Revalida antes.
 */
export async function releaseStaleUse(
  db: Db,
  args: { equipmentId: string; orphanEventId: string; userSub?: string }
): Promise<void> {
  const { equipmentId, orphanEventId } = args;
  if (!ObjectId.isValid(equipmentId)) throw new ConflictChangedError();
  const [ev, unit] = await Promise.all([
    ObjectId.isValid(orphanEventId)
      ? db.collection('events').findOne({ _id: new ObjectId(orphanEventId) }, { projection: { 'equipment._id': 1 } })
      : Promise.resolve(null),
    db.collection('equipment').findOne({ _id: new ObjectId(equipmentId) }, { projection: { name: 1, code: 1 } })
  ]);
  if (!unit) throw new ConflictChangedError();
  const stillUsed = (ev?.equipment || []).some((e: any) => String(e._id) === String(equipmentId));
  if (stillUsed) throw new ConflictChangedError();

  // releaseEquipmentFromEvent saca la reserva (eventId string) y libera el estado
  // si corresponde; las reservas viejas con eventId ObjectId se sacan aparte
  if (ObjectId.isValid(orphanEventId)) {
    await db
      .collection('equipment')
      .updateOne({ _id: unit._id }, { $pull: { scheduledUses: { eventId: new ObjectId(orphanEventId) } } as any });
  }
  const [released] = await releaseEquipmentFromEvent(db, [equipmentId], String(orphanEventId));
  await createHistoryEntries(db, [
    {
      equipmentId: String(equipmentId),
      equipmentName: unit.name,
      equipmentCode: unit.code,
      action: 'cambio_estado' as const,
      userId: args.userSub,
      fromValue: 'Reservado',
      toValue: released?.decision === 'free' ? 'Disponible' : 'Sin cambios',
      details: 'Reserva sin evento liberada (quedó de un guardado cortado)'
    }
  ]);
}
