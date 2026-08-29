import clientPromise from '@/lib/mongodb';
import { MongoClient } from 'mongodb';
import { NextApiResponse } from 'next';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/requireAuth';

export const POST = async function handler(req: any) {
  const unauth = await requireAuth(['admin', 'manager']);
  if (unauth) return unauth;
  const body = await req.json();
  const typedClientPromise: Promise<MongoClient> =
    clientPromise as Promise<MongoClient>;
  const client = await typedClientPromise;
  const db = client.db('degano-app');
  const postEqList = await db
    .collection('equipmentList')
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
