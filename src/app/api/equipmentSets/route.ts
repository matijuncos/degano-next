export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { withAuth, withManagerAuth, AuthContext } from '@/lib/withAuth';

// GET — cualquier usuario autenticado puede leer los sets
export const GET = withAuth(async (_context: AuthContext, _req: Request) => {
  const client = await clientPromise;
  const db = client.db('degano-app');
  const sets = await db.collection('equipment_sets').find({}).toArray();
  return NextResponse.json(sets);
});

// POST — admin y manager pueden crear sets
export const POST = withManagerAuth(async (_context: AuthContext, req: Request) => {
  const body = await req.json();
  const { name, items } = body;

  if (!name || !items || !Array.isArray(items)) {
    return NextResponse.json({ error: 'Nombre e items son requeridos' }, { status: 400 });
  }

  const client = await clientPromise;
  const db = client.db('degano-app');
  const result = await db.collection('equipment_sets').insertOne({ name, items });
  const created = await db.collection('equipment_sets').findOne({ _id: result.insertedId });
  return NextResponse.json(created, { status: 201 });
});

// PUT — admin y manager pueden editar sets
export const PUT = withManagerAuth(async (_context: AuthContext, req: Request) => {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
  }

  const body = await req.json();
  const { name, items } = body;

  const client = await clientPromise;
  const db = client.db('degano-app');
  await db.collection('equipment_sets').updateOne(
    { _id: new ObjectId(id) },
    { $set: { name, items } }
  );
  const updated = await db.collection('equipment_sets').findOne({ _id: new ObjectId(id) });
  return NextResponse.json(updated);
});

// DELETE — admin y manager pueden eliminar sets
export const DELETE = withManagerAuth(async (_context: AuthContext, req: Request) => {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
  }

  const client = await clientPromise;
  const db = client.db('degano-app');
  await db.collection('equipment_sets').deleteOne({ _id: new ObjectId(id) });
  return NextResponse.json({ success: true });
});
