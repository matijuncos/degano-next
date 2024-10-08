import { MongoClient } from 'mongodb'; // Import ObjectId
import type { NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';
import { NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';

export const POST = async function handler(req: Request, res: NextApiResponse) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const typedClientPromise: Promise<MongoClient> =
      clientPromise as Promise<MongoClient>;
    const client = await typedClientPromise;
    const body = await req.json();
    const { _id, ...bodyWithoutId } = body;
    const db = client.db('degano-app');
    const event = await db
      .collection('events')
      .insertOne(!_id ? bodyWithoutId : body);
    const newEvent = await db
      .collection('events')
      .findOne({ _id: event.insertedId });
    const existingClient = await db
      .collection('clients')
      .findOne({ email: body.email });

    if (!existingClient) {
      await db.collection('clients').insertOne({
        fullName: body.fullName,
        phoneNumber: body.phoneNumber,
        email: body.email
      });
    }
    return NextResponse.json({ event: newEvent }, { status: 200 });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
};
