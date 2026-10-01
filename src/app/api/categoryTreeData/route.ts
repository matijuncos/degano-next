export const dynamic = 'force-dynamic'; // ⬅️ esto fuerza el comportamiento dinámico
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { sortByName } from '@/utils/sortByName';
import { requireAuth } from '@/lib/requireAuth';

export async function GET() {
  const unauth = await requireAuth();
  if (unauth) return unauth;
  const client = await clientPromise;
  const db = client.db('degano-app');

  const [categories, equipment] = await Promise.all([
    db.collection('categories').find().toArray().then(sortByName),
    db.collection('equipment')
      .find({}, { projection: { _id: 1, name: 1, categoryId: 1 } })
      .toArray()
      .then(sortByName)
  ]);

  const equipmentNodes = equipment.map(eq => ({
    _id: eq._id.toString(),
    name: eq.name,
    parentId: eq.categoryId || 'equipment',
    categoryId: eq.categoryId,
  }));

  const merged = [
    ...categories.map(c => ({
      _id: c._id.toString(),
      name: c.name,
      parentId: c.parentId
    })),
    ...equipmentNodes,
  ];

  return NextResponse.json(merged);
}
