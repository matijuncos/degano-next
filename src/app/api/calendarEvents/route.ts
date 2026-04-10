export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { withAuth, withAdminAuth, AuthContext } from '@/lib/withAuth';

// GET — cualquier usuario autenticado puede leer los eventos
export const GET = withAuth(async (_context: AuthContext, _req: Request) => {
  const client = await clientPromise;
  const db = client.db('degano-app');
  const events = await db.collection('calendar_events').find({}).toArray();
  return NextResponse.json(events);
});

// POST — solo admin puede crear eventos
export const POST = withAdminAuth(async (_context: AuthContext, req: Request) => {
  const body = await req.json();
  const { title, start, end, allDay, calendarId, description } = body;

  if (!title || !start || !calendarId) {
    return NextResponse.json({ error: 'Título, fecha de inicio y calendario son requeridos' }, { status: 400 });
  }

  const client = await clientPromise;
  const db = client.db('degano-app');

  const doc = {
    title,
    start: new Date(start),
    end: end ? new Date(end) : new Date(start),
    allDay: !!allDay,
    calendarId,
    description: description || ''
  };

  const result = await db.collection('calendar_events').insertOne(doc);
  const created = await db.collection('calendar_events').findOne({ _id: result.insertedId });
  return NextResponse.json(created, { status: 201 });
});

// PUT — solo admin puede editar eventos
export const PUT = withAdminAuth(async (_context: AuthContext, req: Request) => {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
  }

  const body = await req.json();
  const { title, start, end, allDay, calendarId, description } = body;

  const client = await clientPromise;
  const db = client.db('degano-app');

  await db.collection('calendar_events').updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        title,
        start: new Date(start),
        end: end ? new Date(end) : new Date(start),
        allDay: !!allDay,
        calendarId,
        description: description || ''
      }
    }
  );

  const updated = await db.collection('calendar_events').findOne({ _id: new ObjectId(id) });
  return NextResponse.json(updated);
});

// DELETE — solo admin puede eliminar eventos
export const DELETE = withAdminAuth(async (_context: AuthContext, req: Request) => {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
  }

  const client = await clientPromise;
  const db = client.db('degano-app');
  await db.collection('calendar_events').deleteOne({ _id: new ObjectId(id) });

  return NextResponse.json({ success: true });
});
