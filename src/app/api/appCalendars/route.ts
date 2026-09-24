export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { withAuth, withAdminAuth, AuthContext } from '@/lib/withAuth';
import {
  visibleCalendarsFilter,
  normalizeCalendarVisibility,
  currentEmployeeId
} from '@/utils/calendarVisibility';

const CALENDAR_PROJECTION = { _id: 1, name: 1, color: 1, ownerId: 1, visibility: 1, memberIds: 1 };

// GET — cada usuario ve solo los calendarios a los que tiene acceso
export const GET = withAuth(async (context: AuthContext, _req: Request) => {
  const client = await clientPromise;
  const db = client.db('degano-app');
  const calendars = await db
    .collection('app_calendars')
    .find(await visibleCalendarsFilter(db, context.user, context.role), {
      projection: CALENDAR_PROJECTION
    })
    .toArray();
  return NextResponse.json(calendars);
});

// POST — solo admin puede crear calendarios (y definir su visibilidad)
export const POST = withAdminAuth(async (context: AuthContext, req: Request) => {
  const body = await req.json();
  const { name, color } = body;

  if (!name || !color) {
    return NextResponse.json({ error: 'Nombre y color son requeridos' }, { status: 400 });
  }

  // Sin visibilidad explícita se crea como antes: solo admins
  const access = normalizeCalendarVisibility(body) || {
    visibility: 'admins',
    memberIds: []
  };

  const client = await clientPromise;
  const db = client.db('degano-app');
  // El dueño se guarda con el id de su registro de STAFF, igual que los miembros
  const ownerId = await currentEmployeeId(db, context.user);
  const result = await db
    .collection('app_calendars')
    .insertOne({ name, color, ownerId, ...access });
  const created = await db.collection('app_calendars').findOne({ _id: result.insertedId });
  return NextResponse.json(created, { status: 201 });
});

// PUT — solo admin puede editar calendarios (que pueda ver)
export const PUT = withAdminAuth(async (context: AuthContext, req: Request) => {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
  }

  const body = await req.json();

  const client = await clientPromise;
  const db = client.db('degano-app');
  const _id = new ObjectId(id);

  const existing = await db
    .collection('app_calendars')
    .findOne({ _id, ...await visibleCalendarsFilter(db, context.user, context.role) });
  if (!existing) {
    return NextResponse.json({ error: 'Calendario no encontrado' }, { status: 404 });
  }

  const updates: Record<string, unknown> = {};
  if (typeof body.name === 'string' && body.name.trim()) updates.name = body.name.trim();
  if (typeof body.color === 'string' && body.color) updates.color = body.color;

  // Los calendarios viejos no tienen dueño: lo toma el admin que define la visibilidad
  const access = normalizeCalendarVisibility(body);
  if (access) {
    Object.assign(updates, access);
    if (!existing.ownerId) {
      updates.ownerId = await currentEmployeeId(db, context.user);
    }
  }

  await db.collection('app_calendars').updateOne({ _id }, { $set: updates });
  const updated = await db.collection('app_calendars').findOne({ _id });
  return NextResponse.json(updated);
});

// DELETE — solo admin puede eliminar calendarios que pueda ver (y sus eventos)
export const DELETE = withAdminAuth(async (context: AuthContext, req: Request) => {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
  }

  const client = await clientPromise;
  const db = client.db('degano-app');
  const _id = new ObjectId(id);

  const existing = await db
    .collection('app_calendars')
    .findOne({ _id, ...await visibleCalendarsFilter(db, context.user, context.role) });
  if (!existing) {
    return NextResponse.json({ error: 'Calendario no encontrado' }, { status: 404 });
  }

  // Eliminar todos los eventos que pertenecen a este calendario
  await db.collection('calendar_events').deleteMany({ calendarId: id });

  // Eliminar el calendario
  await db.collection('app_calendars').deleteOne({ _id });

  return NextResponse.json({ success: true });
});
