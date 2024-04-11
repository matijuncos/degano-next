import { MongoClient, ObjectId } from 'mongodb'; // Import ObjectId
import type { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';
import { NextResponse } from 'next/server';

export const GET = async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const typedClientPromise: Promise<MongoClient> =
      clientPromise as Promise<MongoClient>;
    const client = await typedClientPromise;
    const db = client.db('sample_mflix');
    const movies = await db
      .collection('movies')
      .findOne({ _id: new ObjectId('573a1390f29313caabcd42e8') }); // Use ObjectId
    // If I wanted to get all, add limit and pagination
    console.log(movies);
    return NextResponse.json({ movies }, { status: 200 });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
};
