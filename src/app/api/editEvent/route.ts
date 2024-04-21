import { MongoClient } from 'mongodb'; // Import ObjectId
import type { NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';
import { NextResponse } from 'next/server';

export const UPDATE = async function handler(
  req: Request,
  res: NextApiResponse
) {
  try {
    const typedClientPromise: Promise<MongoClient> =
      clientPromise as Promise<MongoClient>;
    const client = await typedClientPromise;
    const body = await req.json();
    const db = client.db('degano-app');
    const eventId = body._id;
    delete body._id;
    console.log('body? ', body);
    const event = await db
      .collection('events')
      .findOneAndUpdate(
        { _id: eventId },
        { $set: body },
        { returnDocument: 'after' }
      );
    return NextResponse.json({ event }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
};
