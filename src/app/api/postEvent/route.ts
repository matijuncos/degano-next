import { MongoClient } from 'mongodb'; // Import ObjectId
import type { NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';
import { NextResponse } from 'next/server';

export const POST = async function handler(req: Request, res: NextApiResponse) {
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
    return NextResponse.json({ event }, { status: 200 });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
};
