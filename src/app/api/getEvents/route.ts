import { MongoClient, ObjectId } from 'mongodb'; // Import ObjectId
import type { NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';
import { NextResponse } from 'next/server';

export const GET = async function handler(req: Request, res: NextApiResponse) {
  try {
    const typedClientPromise: Promise<MongoClient> =
      clientPromise as Promise<MongoClient>;
    const client = await typedClientPromise;
    const db = client.db('degano-app');
    const events = await db.collection('events').find().toArray(); // Use ObjectId
    // If I wanted to get all, add limit and pagination
    console.log(events);
    return NextResponse.json({ events }, { status: 200 });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
};
