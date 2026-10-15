import { Db, ObjectId } from 'mongodb';
import { findBookingConflicts, bookingConflictMessage } from '@/utils/equipmentSuggestions';

/**
 * Validación del servidor contra doble asignación: los equipos indicados no
 * pueden estar reservados por OTRO evento en esas fechas. Devuelve el mensaje
 * de error (para un 409) o null si está todo bien. Una sola consulta.
 */
export async function checkBookingConflicts(
  db: Db,
  equipmentIds: string[],
  start: Date | string,
  end: Date | string,
  eventId?: string | null
): Promise<string | null> {
  const ids = Array.from(new Set(equipmentIds.map(String))).filter((id) => ObjectId.isValid(id));
  if (ids.length === 0 || !start || !end) return null;
  const docs = await db
    .collection('equipment')
    .find(
      { _id: { $in: ids.map((id) => new ObjectId(id)) } },
      { projection: { name: 1, code: 1, scheduledUses: 1 } }
    )
    .toArray();
  const conflicts = findBookingConflicts(docs as any, start, end, eventId);
  return conflicts.length ? bookingConflictMessage(conflicts) : null;
}
