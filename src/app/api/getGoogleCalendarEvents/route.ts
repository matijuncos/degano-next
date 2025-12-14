import { NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accessToken, calendarIds, timeMin, timeMax } = await req.json();

    if (!accessToken || !calendarIds || !Array.isArray(calendarIds)) {
      return NextResponse.json(
        { error: 'Access token and calendar IDs are required' },
        { status: 400 }
      );
    }

    // Obtener eventos de cada calendario
    const allEvents: any[] = [];
    const errors: any[] = [];

    for (const calendarId of calendarIds) {
      try {
        const params = new URLSearchParams({
          timeMin: timeMin || new Date().toISOString(),
          timeMax:
            timeMax ||
            new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 días por defecto
          singleEvents: 'true',
          orderBy: 'startTime',
          maxResults: '250'
        });

        const response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
            calendarId
          )}/events?${params}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (!response.ok) {
          const error = await response.json();
          errors.push({
            calendarId,
            error: error.error?.message || 'Failed to fetch events'
          });
          continue;
        }

        const data = await response.json();

        // Formatear eventos
        const events = (data.items || []).map((event: any) => ({
          id: event.id,
          calendarId: calendarId,
          summary: event.summary,
          description: event.description,
          start: event.start?.dateTime || event.start?.date,
          end: event.end?.dateTime || event.end?.date,
          location: event.location,
          htmlLink: event.htmlLink,
          status: event.status,
          creator: event.creator,
          organizer: event.organizer,
          isAllDay: !event.start?.dateTime
        }));

        allEvents.push(...events);
      } catch (error) {
        console.error(`Error fetching events for calendar ${calendarId}:`, error);
        errors.push({
          calendarId,
          error: 'Failed to fetch events'
        });
      }
    }

    return NextResponse.json(
      {
        events: allEvents,
        errors: errors.length > 0 ? errors : undefined
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching Google calendar events:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
