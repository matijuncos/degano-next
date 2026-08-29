import { MongoClient, ObjectId } from 'mongodb'; // Import ObjectId
import type { NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/requireAuth';

export const GET = async function handler(req: Request) {
  const unauth = await requireAuth();
  if (unauth) return unauth;
  try {
    const typedClientPromise: Promise<MongoClient> =
      clientPromise as Promise<MongoClient>;
    const client = await typedClientPromise;
    const db = client.db('degano-app');
    const equipment = await db.collection('equipmentListV2').find().toArray();
    return NextResponse.json({ equipment }, { status: 200 });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
};
