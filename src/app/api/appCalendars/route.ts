export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { withAuth, withAdminAuth, AuthContext } from '@/lib/withAuth';

// GET — cualquier usuario autenticado puede leer los calendarios
export const GET = withAuth(async (_context: AuthContext, _req: Request) => {
  const client = await clientPromise;
  const db = client.db('degano-app');
  const calendars = await db.collection('app_calendars').find({}).toArray();
  return NextResponse.json(calendars);
});

// POST — solo admin puede crear calendarios
export const POST = withAdminAuth(async (_context: AuthContext, req: Request) => {
  const body = await req.json();
  const { name, color } = body;

  if (!name || !color) {
    return NextResponse.json({ error: 'Nombre y color son requeridos' }, { status: 400 });
  }

  const client = await clientPromise;
  const db = client.db('degano-app');
  const result = await db.collection('app_calendars').insertOne({ name, color });
  const created = await db.collection('app_calendars').findOne({ _id: result.insertedId });
  return NextResponse.json(created, { status: 201 });
});

// PUT — solo admin puede editar calendarios
export const PUT = withAdminAuth(async (_context: AuthContext, req: Request) => {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
  }

  const body = await req.json();
  const { name, color } = body;

  const client = await clientPromise;
  const db = client.db('degano-app');
  await db.collection('app_calendars').updateOne(
    { _id: new ObjectId(id) },
    { $set: { name, color } }
  );
  const updated = await db.collection('app_calendars').findOne({ _id: new ObjectId(id) });
  return NextResponse.json(updated);
});

// DELETE — solo admin puede eliminar calendarios (y sus eventos)
export const DELETE = withAdminAuth(async (_context: AuthContext, req: Request) => {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
  }

  const client = await clientPromise;
  const db = client.db('degano-app');

  // Eliminar todos los eventos que pertenecen a este calendario
  await db.collection('calendar_events').deleteMany({ calendarId: id });

  // Eliminar el calendario
  await db.collection('app_calendars').deleteOne({ _id: new ObjectId(id) });

  return NextResponse.json({ success: true });
});
