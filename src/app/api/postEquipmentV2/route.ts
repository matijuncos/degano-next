import clientPromise from '@/lib/mongodb';
import { MongoClient } from 'mongodb';
import { NextApiResponse } from 'next';
import { NextResponse } from 'next/server';
import { withAdminAuth, AuthContext } from '@/lib/withAuth';

// Solo admin puede crear equipamiento
export const POST = withAdminAuth(async (context: AuthContext, req: any) => {
  const body = await req.json();
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
});
