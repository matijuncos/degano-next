// src/lib/categoryItemGuardServer.ts
// Cuáles de los "equipos" de un cuerpo son en realidad CATEGORÍAS (ver
// utils/categoryItemGuard). Una sola consulta, solo por los ids recibidos.
import { Db, ObjectId } from 'mongodb';
import { equipmentIdsIn } from '@/utils/categoryItemGuard';

export async function categoryIdsAmong(db: Db, equipment: unknown): Promise<Set<string>> {
  const ids = equipmentIdsIn(equipment).filter((id) => ObjectId.isValid(id));
  if (!ids.length) return new Set();
  const cats = await db
    .collection('categories')
    .find({ _id: { $in: ids.map((id) => new ObjectId(id)) } }, { projection: { _id: 1 } })
    .toArray();
  return new Set(cats.map((c) => String(c._id)));
}
