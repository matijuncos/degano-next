import clientPromise from '@/lib/mongodb';
import { getSession } from '@auth0/nextjs-auth0';
import { MongoClient } from 'mongodb';
import { NextApiResponse } from 'next';
import { NextResponse } from 'next/server';

export const POST = async function handler(req: any, res: NextApiResponse) {
  const body = await req.json();
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const typedClientPromise: Promise<MongoClient> =
    clientPromise as Promise<MongoClient>;
  const client = await typedClientPromise;
  const db = client.db('degano-app');
  const postEqList = await db
    .collection('equipmentListV2')
    .insertOne({ equipment: body });
  return NextResponse.json(
    {
      postEqList,
      success: true
    },
    {
      status: 201
    }
  );
};
