// src/lib/venueUpdate.ts
// Aplica el cambio de un lugar a los eventos de HOY EN ADELANTE (los pasados
// conservan lo que figuraba). Si cambia el nombre, también se actualiza el
// lugar en las reservas de equipos de esos eventos (scheduledUses) y, si el
// equipo está hoy en uno de esos eventos, su ubicación; con su historial.
import { Db, ObjectId } from 'mongodb';
import { fromTodayFilter, venueNameFilter } from '@/utils/venues';
import { createHistoryEntries } from '@/utils/equipmentHistoryUtils';

export async function applyVenueToUpcomingEvents(
  db: Db,
  oldName: string,
  set: Record<string, string>,
  now: Date,
  userId?: string
): Promise<{ eventsUpdated: number }> {
  if (!oldName.trim() || !Object.keys(set).length) return { eventsUpdated: 0 };

  const events = await db
    .collection('events')
    .find(
      { lugar: venueNameFilter(oldName), ...fromTodayFilter(now) },
      { projection: { _id: 1, type: 1, name: 1, fullName: 1, date: 1, endDate: 1 } }
    )
    .toArray();
  if (!events.length) return { eventsUpdated: 0 };

  const ids = events.map((e) => e._id);
  await db.collection('events').updateMany({ _id: { $in: ids } }, { $set: { ...set, updatedAt: now } });

  const newName = set.lugar;
  if (newName !== undefined) await renameInEquipment(db, events, oldName, newName, userId);
  return { eventsUpdated: events.length };
}

// Reservas de equipos de esos eventos: el lugar se guarda por nombre
async function renameInEquipment(db: Db, events: any[], oldName: string, newName: string, userId?: string) {
  const idStrings = events.map((e) => String(e._id));
  // eventId se guarda como string; se cubre también ObjectId por las dudas
  const anyId = [...idStrings, ...events.map((e) => e._id as ObjectId)];
  const equipment = await db
    .collection('equipment')
    .find({ 'scheduledUses.eventId': { $in: anyId } }, { projection: { name: 1, code: 1, scheduledUses: 1 } })
    .toArray();
  if (!equipment.length) return;

  await db.collection('equipment').updateMany(
    { 'scheduledUses.eventId': { $in: anyId } },
    { $set: { 'scheduledUses.$[u].location': newName } },
    { arrayFilters: [{ 'u.eventId': { $in: anyId } }] }
  );
  // Equipos que están hoy en uno de esos eventos: su ubicación actual es el lugar
  await db.collection('equipment').updateMany(
    { location: venueNameFilter(oldName), 'outOfService.reason': 'En Evento', 'scheduledUses.eventId': { $in: anyId } },
    { $set: { location: newName } }
  );

  const byId = new Map(events.map((e) => [String(e._id), e]));
  const entries = equipment.flatMap((eq: any) =>
    (eq.scheduledUses ?? [])
      .filter((u: any) => byId.has(String(u.eventId)))
      .map((u: any) => {
        const ev = byId.get(String(u.eventId));
        return {
          equipmentId: String(eq._id),
          equipmentName: eq.name,
          equipmentCode: eq.code,
          action: 'edicion' as const,
          userId,
          eventId: String(u.eventId),
          eventName: ev.name || ev.type,
          eventDate: ev.date,
          eventEndDate: ev.endDate,
          eventLocation: newName,
          eventClientName: ev.fullName,
          changes: [{ field: 'lugar del evento', oldValue: oldName, newValue: newName }],
          fromValue: oldName,
          toValue: newName,
          details: `Lugar del evento renombrado: "${oldName}" → "${newName}"`
        };
      })
  );
  await createHistoryEntries(db, entries as any);
}
