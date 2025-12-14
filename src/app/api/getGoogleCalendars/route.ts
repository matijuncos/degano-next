import { NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accessToken } = await req.json();

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Access token is required' },
        { status: 400 }
      );
    }

    // Obtener lista de calendarios del usuario
    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/users/me/calendarList',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: 'Failed to fetch calendars', details: error },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Filtrar y formatear calendarios
    const calendars = data.items.map((calendar: any) => ({
      id: calendar.id,
      summary: calendar.summary,
      description: calendar.description,
      backgroundColor: calendar.backgroundColor,
      foregroundColor: calendar.foregroundColor,
      primary: calendar.primary || false,
      accessRole: calendar.accessRole
    }));

    return NextResponse.json({ calendars }, { status: 200 });
  } catch (error) {
    console.error('Error fetching Google calendars:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
