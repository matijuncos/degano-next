import { Db, ObjectId } from 'mongodb';
import { releaseDecision } from '@/utils/equipmentAvailability';

/**
 * Equipos que se quitan de un evento (o cuyo evento se borra): saca la
 * reserva de ese evento y libera los que corresponda. PERF: 3 operaciones en
 * total sin importar cuántos equipos (antes eran 2-3 por equipo y en eventos
 * grandes la request se cortaba por tiempo a mitad de camino).
 * Devuelve los equipos con su decisión, para registrar el historial.
 */
export async function releaseEquipmentFromEvent(
  db: Db,
  equipmentIds: string[],
  eventId: string
): Promise<{ _id: ObjectId; name?: string; code?: string; decision: 'active' | 'free' | 'keep' }[]> {
  const ids = Array.from(new Set(equipmentIds.map(String)))
    .filter((id) => ObjectId.isValid(id))
    .map((id) => new ObjectId(id));
  if (ids.length === 0) return [];
  const col = db.collection('equipment');

  await col.updateMany({ _id: { $in: ids } }, { $pull: { scheduledUses: { eventId } } as any });

  const docs = await col
    .find({ _id: { $in: ids } }, { projection: { name: 1, code: 1, scheduledUses: 1, outOfService: 1 } })
    .toArray();
  const now = new Date();
  const result = docs.map((d: any) => ({ _id: d._id, name: d.name, code: d.code, decision: releaseDecision(d, now) }));

  const freeIds = result.filter((r) => r.decision === 'free').map((r) => r._id);
  if (freeIds.length) {
    // Condición en el mismo update: solo los que siguen "En Evento"
    await col.updateMany(
      { _id: { $in: freeIds }, 'outOfService.reason': 'En Evento' },
      {
        $set: {
          location: 'Deposito',
          lastUsedStartDate: null,
          lastUsedEndDate: null,
          outOfService: { isOut: false, reason: null, details: null }
        }
      }
    );
  }
  return result;
}
