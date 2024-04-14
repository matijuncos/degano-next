import clientPromise from '@/lib/mongodb';
import { MongoClient, ObjectId } from 'mongodb';
import { NextApiResponse } from 'next';
import { NextResponse } from 'next/server';

export const PUT = async function handler(req: Request, res: NextApiResponse) {
  const body = await req.json();
  const typedClientPromise: Promise<MongoClient> =
    clientPromise as Promise<MongoClient>;
  const client = await typedClientPromise;
  const db = client.db('degano-app');
  const updateResult = await db
    .collection('equipmentList')
    .updateOne(
      { _id: new ObjectId(body._id as string) },
      { $set: { equipment: body.equipment } }
    );
  if (updateResult.matchedCount === 0) {
    return NextResponse.json(
      { message: 'Equipment not found' },
      { status: 404 }
    );
  }

  return NextResponse.json(
    {
      message: 'Equipment updated successfully',
      updateResult
    },
    {
      status: 201
    }
  );
};
