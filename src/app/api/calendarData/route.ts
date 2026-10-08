export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { withAuth, AuthContext } from '@/lib/withAuth';
import { visibleCalendarsFilter } from '@/utils/calendarVisibility';

// GET — devuelve calendarios + eventos en una sola request, filtrados por
// la visibilidad de cada calendario para el usuario logueado
export const GET = withAuth(async (context: AuthContext, _req: Request) => {
  const client = await clientPromise;
  const db = client.db('degano-app');

  // Calendarios visibles y eventos en paralelo (antes: uno después del otro).
  // Los eventos se filtran ACÁ por los calendarios visibles: nadie recibe
  // eventos de un calendario al que no tiene acceso.
  const [calendars, allEvents] = await Promise.all([
    visibleCalendarsFilter(db, context.user, context.role).then((filter) =>
      db
        .collection('app_calendars')
        .find(filter, {
          projection: { _id: 1, name: 1, color: 1, ownerId: 1, visibility: 1, memberIds: 1, staffPayable: 1 }
        })
        .toArray()
    ),
    db
      .collection('calendar_events')
      .find(
        {},
        {
          projection: { _id: 1, title: 1, start: 1, end: 1, allDay: 1, calendarId: 1, description: 1, staff: 1 }
        }
      )
      .toArray()
  ]);

  const calendarIds = new Set(calendars.map((cal) => cal._id.toString()));
  const events = allEvents.filter((ev) => calendarIds.has(String(ev.calendarId)));

  return NextResponse.json({ calendars, events });
});
