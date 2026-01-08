import { MongoClient, ObjectId } from 'mongodb'; // Import ObjectId
import type { NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

export const GET = async function handler(req: NextRequest) {
  try {
    const typedClientPromise: Promise<MongoClient> =
      clientPromise as Promise<MongoClient>;
    const client = await typedClientPromise;
    const db = client.db('degano-app');
    const equipment = await db.collection('equipmentList').find().toArray();
    
    // Invalidate cache for the specific path after fetching new data
    revalidatePath(req.nextUrl.pathname);
    
    return NextResponse.json({ equipment }, { status: 200 });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
};
