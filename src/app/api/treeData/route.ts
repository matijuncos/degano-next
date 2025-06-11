// src/app/api/treeData/route.ts
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET() {
  const client = await clientPromise;
  const db = client.db('degano-app');

  // ⛳️ Usamos tus colecciones reales
  const categories = await db.collection('categories').find().toArray();
  const equipment = await db.collection('equipment').find().toArray();

  // Adaptamos equipos para integrarlos al árbol
  const equipmentNodes = equipment.map(eq => ({
    _id: eq._id.toString(),
    name: eq.name,
    parentId: eq.categoryId || 'equipment', // usamos categoryId como parentId real
    categoryId: eq.categoryId,
  }));

  // Fusionamos categorías y equipamiento
  const merged = [
    ...categories.map(c => ({
      _id: c._id.toString(),
      name: c.name,
      parentId: c.parentId,
    })),
    ...equipmentNodes,
  ];

  return NextResponse.json(merged);
}
