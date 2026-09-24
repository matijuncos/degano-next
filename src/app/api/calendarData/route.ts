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

  const calendars = await db
    .collection('app_calendars')
    .find(await visibleCalendarsFilter(db, context.user, context.role), {
      projection: { _id: 1, name: 1, color: 1, ownerId: 1, visibility: 1, memberIds: 1 }
    })
    .toArray();

  const calendarIds = calendars.map((cal) => cal._id.toString());
  const events = calendarIds.length
    ? await db
        .collection('calendar_events')
        .find(
          { calendarId: { $in: calendarIds } },
          {
            projection: { _id: 1, title: 1, start: 1, end: 1, allDay: 1, calendarId: 1, description: 1 }
          }
        )
        .toArray()
    : [];

  return NextResponse.json({ calendars, events });
});
