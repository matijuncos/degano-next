import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET() {
  const client = await clientPromise;
  const db = client.db('degano-app');

  const categories = await db.collection('categories').find().toArray();
  const equipment = await db.collection('equipment').find().toArray();

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
      parentId: c.parentId,
    })),
    ...equipmentNodes,
  ];

  return new NextResponse(JSON.stringify(merged), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store' // ⛔️ Desactiva la caché completamente
    }
  });
}
