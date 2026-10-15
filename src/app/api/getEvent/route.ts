import { MongoClient, ObjectId } from 'mongodb';
import type { NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/withAuth';
import { sanitizeEventForRole } from '@/lib/sanitizeEvent';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (context: AuthContext, req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing event id' }, { status: 400 });
    }

    const typedClientPromise: Promise<MongoClient> =
      clientPromise as Promise<MongoClient>;
    const client = await typedClientPromise;
    const db = client.db('degano-app');

    const event = await db
      .collection('events')
      .findOne({ _id: new ObjectId(id) });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Ofuscar datos sensibles según permisos (misma regla en todas las respuestas)
    const filteredEvent = sanitizeEventForRole(event, context.role);

    return NextResponse.json(
      { event: filteredEvent },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );
  } catch (error) {
    console.error('Error fetching event:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
});
