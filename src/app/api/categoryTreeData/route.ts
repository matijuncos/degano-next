export const dynamic = 'force-dynamic'; // ⬅️ esto fuerza el comportamiento dinámico
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { requireAuth } from '@/lib/requireAuth';

export async function GET() {
  const unauth = await requireAuth();
  if (unauth) return unauth;
  const client = await clientPromise;
  const db = client.db('degano-app');

  const [categories, equipment] = await Promise.all([
    db.collection('categories').find().sort({ name: 1 }).toArray(),
    db.collection('equipment')
      .find({}, { projection: { _id: 1, name: 1, categoryId: 1 } })
      .sort({ createdAt: 1, name: 1 })
      .toArray()
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
