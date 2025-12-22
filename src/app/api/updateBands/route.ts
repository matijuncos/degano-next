import { MongoClient, ObjectId } from 'mongodb';
import type { NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';
import { NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';

export const PUT = async function handler(req: Request, res: NextApiResponse) {
  try {
    const typedClientPromise: Promise<MongoClient> =
      clientPromise as Promise<MongoClient>;
    const client = await typedClientPromise;
    const body = await req.json();
    const db = client.db('degano-app');
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const eventId = body._id;
    const bandsWithIds = (body.bands || []).map((b: any) => ({
      ...b,
      _id: new ObjectId(b._id)
    }));

    if (!eventId || !bandsWithIds) {
      return NextResponse.json(
        { error: 'Missing eventId or bands' },
        { status: 400 }
      );
    }

    const event = await db
      .collection('events')
      .findOneAndUpdate(
        { _id: new ObjectId(eventId) },
        { $set: { bands: bandsWithIds } },
        { returnDocument: 'after' }
      );
    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
};
