export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { withAuth, withAdminAuth, AuthContext } from '@/lib/withAuth';
import { visibleCalendarsFilter } from '@/utils/calendarVisibility';

// ¿El usuario tiene acceso al calendario? (visibilidad por calendario)
async function canAccessCalendar(db: any, context: AuthContext, calendarId: string) {
  if (!ObjectId.isValid(calendarId)) return false;
  const found = await db.collection('app_calendars').findOne(
    { _id: new ObjectId(calendarId), ...await visibleCalendarsFilter(db, context.user, context.role) },
    { projection: { _id: 1 } }
  );
  return !!found;
}

// GET — cada usuario ve solo los eventos de los calendarios a los que tiene acceso
export const GET = withAuth(async (context: AuthContext, _req: Request) => {
  const client = await clientPromise;
  const db = client.db('degano-app');
  const calendars = await db
    .collection('app_calendars')
    .find(await visibleCalendarsFilter(db, context.user, context.role), { projection: { _id: 1 } })
    .toArray();
  const calendarIds = calendars.map((cal) => cal._id.toString());
  const events = await db.collection('calendar_events').find({ calendarId: { $in: calendarIds } }, {
    projection: {
      _id: 1, title: 1, start: 1, end: 1, allDay: 1, calendarId: 1
    }
  }).toArray();
  return NextResponse.json(events);
});

// POST — solo admin puede crear eventos
export const POST = withAdminAuth(async (context: AuthContext, req: Request) => {
  const body = await req.json();
  const { title, start, end, allDay, calendarId, description } = body;

  if (!title || !start || !calendarId) {
    return NextResponse.json({ error: 'Título, fecha de inicio y calendario son requeridos' }, { status: 400 });
  }

  const client = await clientPromise;
  const db = client.db('degano-app');

  if (!(await canAccessCalendar(db, context, calendarId))) {
    return NextResponse.json({ error: 'Calendario no encontrado' }, { status: 404 });
  }

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
export const PUT = withAdminAuth(async (context: AuthContext, req: Request) => {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
  }

  const body = await req.json();
  const { title, start, end, allDay, calendarId, description } = body;

  const client = await clientPromise;
  const db = client.db('degano-app');

  // Tiene que tener acceso al calendario actual del evento y al de destino
  const current = await db.collection('calendar_events').findOne({ _id: new ObjectId(id) });
  if (
    !current ||
    !(await canAccessCalendar(db, context, String(current.calendarId))) ||
    !(await canAccessCalendar(db, context, calendarId))
  ) {
    return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 });
  }

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
export const DELETE = withAdminAuth(async (context: AuthContext, req: Request) => {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
  }

  const client = await clientPromise;
  const db = client.db('degano-app');
  const current = await db.collection('calendar_events').findOne({ _id: new ObjectId(id) });
  if (!current || !(await canAccessCalendar(db, context, String(current.calendarId)))) {
    return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 });
  }
  await db.collection('calendar_events').deleteOne({ _id: new ObjectId(id) });

  return NextResponse.json({ success: true });
});
