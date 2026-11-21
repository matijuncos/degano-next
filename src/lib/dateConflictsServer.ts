import { Db, ObjectId } from 'mongodb';
import { conflictingUses, isEquipmentUnavailable } from '@/utils/equipmentAvailability';
import { reservationStart } from '@/utils/reservationRange';
import { sumRentalPrice } from '@/utils/equipmentPrices';
import { createHistoryEntries } from '@/utils/equipmentHistoryUtils';
import { releaseEquipmentFromEvent } from '@/lib/equipmentRelease';
import {
  buildConflictReport,
  buildChangeNotice,
  replacementRow,
  DateConflict,
  OtherEventInfo
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
 * Cambia unidades en OTRO evento (para que este conserve las suyas): renglón
 * con el precio real de la unidad nueva + equipmentPrice recalculado, la
 * reserva pasa de la vieja a la nueva, historial y UN aviso en ese evento.
 * Revalida contra la base antes de escribir.
 */
export async function swapUnitsInOtherEvent(
  db: Db,
  args: {
    otherEventId: string;
    swaps: { fromId: string; toId: string }[];
    fromEventId: string;
    fromEventName: string;
    userSub?: string;
    byName: string;
  }
): Promise<{ fromCode: string; toCode: string }[]> {
  const { otherEventId, swaps } = args;
  if (!swaps.length || !ObjectId.isValid(otherEventId)) throw new ConflictChangedError();
  const [other, units] = await Promise.all([
    db.collection('events').findOne({ _id: new ObjectId(otherEventId) }),
    db
      .collection('equipment')
      .find({ _id: { $in: toObjectIds(swaps.flatMap((s) => [s.fromId, s.toId])) } }, { projection: { history: 0 } })
      .toArray()
  ]);
  if (!other) throw new ConflictChangedError();
  const unitById = new Map(units.map((u: any) => [String(u._id), u]));
  const info = otherEventInfo(other);
  const inOther = new Set(info.equipmentIds);
  for (const s of swaps) {
    const to = unitById.get(String(s.toId));
    if (
      !inOther.has(String(s.fromId)) ||
      inOther.has(String(s.toId)) ||
      !to ||
      isEquipmentUnavailable(to.outOfService) ||
      conflictingUses(info.start, info.end, to.scheduledUses, { ignoreEventId: otherEventId }).length > 0
    ) {
      throw new ConflictChangedError();
    }
  }

  const toByFrom = new Map(swaps.map((s) => [String(s.fromId), String(s.toId)]));
  const equipment = (other.equipment || []).map((row: any) => {
    const toId = toByFrom.get(String(row._id));
    return toId ? replacementRow(row, unitById.get(toId)) : row;
  });
  const changes = swaps.map((s) => {
    const from: any = unitById.get(String(s.fromId)) || {};
    const to: any = unitById.get(String(s.toId)) || {};
    return { fromName: from.name || '', fromCode: from.code || '', toName: to.name || '', toCode: to.code || '' };
  });
  const now = new Date();
  // ORDEN (si la request se corta a la mitad): 1) reserva en la unidad nueva,
  // 2) el evento, 3) se libera la vieja. Una reserva de más se ve y se limpia
  // ("reserva sobrante"); una que FALTA dejaría la unidad libre para otro evento.
  const sample: any = swaps
    .map((s) => unitById.get(String(s.fromId)))
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
  const toIds = toObjectIds(swaps.map((s) => s.toId));
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
  await db.collection('events').updateOne(
    { _id: other._id },
    {
      $set: { equipment, equipmentPrice: sumRentalPrice(equipment), updatedAt: now },
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

  const released = await releaseEquipmentFromEvent(db, swaps.map((s) => s.fromId), String(otherEventId));
  const decisionById = new Map(released.map((r) => [String(r._id), r.decision]));

  const label = `${other.type || ''} - ${other.lugar || ''}`;
  await createHistoryEntries(db, [
    ...swaps.map((s, i) => ({
      equipmentId: String(s.toId),
      equipmentName: changes[i].toName,
      equipmentCode: changes[i].toCode,
      action: 'uso_evento' as const,
      userId: args.userSub,
      eventId: String(otherEventId),
      eventName: other.type,
      eventDate: info.start,
      eventEndDate: info.end,
      eventLocation: other.lugar,
      eventClientName: other.fullName,
      details: `Reemplaza a ${changes[i].fromCode} en ${label} (al cambiar las fechas de ${args.fromEventName})`
    })),
    ...swaps.map((s, i) => ({
      equipmentId: String(s.fromId),
      equipmentName: changes[i].fromName,
      equipmentCode: changes[i].fromCode,
      action: 'cambio_estado' as const,
      userId: args.userSub,
      fromValue: 'En Evento',
      toValue: decisionById.get(String(s.fromId)) === 'free' ? 'Disponible' : 'Sin cambios',
      details: `Reemplazado por ${changes[i].toCode} en ${label} (al cambiar las fechas de ${args.fromEventName})`
    }))
  ]);
  return changes.map((c) => ({ fromCode: c.fromCode, toCode: c.toCode }));
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
