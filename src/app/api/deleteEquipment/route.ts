import clientPromise from '@/lib/mongodb';
import { getSession } from '@auth0/nextjs-auth0';
import { MongoClient, ObjectId } from 'mongodb';
import { NextApiResponse } from 'next';
import { NextResponse } from 'next/server';

export const DELETE = async function handler(
  req: Request,
  res: NextApiResponse
) {
  const body = await req.json();
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const typedClientPromise: Promise<MongoClient> =
    clientPromise as Promise<MongoClient>;
  const client = await typedClientPromise;
  const db = client.db('degano-app');
  const { equipment } = body;
  const newEquipmentCollection = await db
    .collection('equipmentListV2')
    .findOneAndDelete({_id: new ObjectId(equipment._id as string)});
  return NextResponse.json({
    message: 'Equipment deleted successfully',
    newEquipmentCollection,
    status: 200
  });
};
