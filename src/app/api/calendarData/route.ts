export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { withAuth, AuthContext } from '@/lib/withAuth';

// GET — devuelve calendarios + eventos en una sola request
export const GET = withAuth(async (_context: AuthContext, _req: Request) => {
  const client = await clientPromise;
  const db = client.db('degano-app');

  const [calendars, events] = await Promise.all([
    db.collection('app_calendars').find({}, {
      projection: { _id: 1, name: 1, color: 1 }
    }).toArray(),
    db.collection('calendar_events').find({}, {
      projection: { _id: 1, title: 1, start: 1, end: 1, allDay: 1, calendarId: 1, description: 1 }
    }).toArray()
  ]);

  return NextResponse.json({ calendars, events });
});
