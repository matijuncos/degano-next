import { MongoClient, ObjectId } from 'mongodb'; // Import ObjectId
import type { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';
import { NextResponse } from 'next/server';

export const GET = async function handler(req: Request, res: NextApiResponse) {
  try {
    const typedClientPromise: Promise<MongoClient> =
      clientPromise as Promise<MongoClient>;
    const client = await typedClientPromise;
    const db = client.db('degano-app');
    const { searchParams } = new URL(req.url);
    const pageSize = 20;
    const page = Number(searchParams.get('page')) || 1;
    const clients = await db
      .collection('clients')
      .find()
      .skip((page - 1) * pageSize) // Calculate the number of documents to skip
      .limit(pageSize)
      .toArray();

      console.log('clients, ', clients)
    return NextResponse.json({ clients }, { status: 200 });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
};
