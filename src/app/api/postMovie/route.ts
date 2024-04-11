import { MongoClient, ObjectId } from 'mongodb'; // Import ObjectId
import type { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';
import { NextResponse } from 'next/server';

export const POST = async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const typedClientPromise: Promise<MongoClient> =
      clientPromise as Promise<MongoClient>;
    const client = await typedClientPromise;
    const db = client.db('sample_mflix');
    const movie = await db.collection('movies').insertOne(req.body);
    return NextResponse.json({ movie }, { status: 200 });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
};
