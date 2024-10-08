import clientPromise from '@/lib/mongodb';
import { getSession } from '@auth0/nextjs-auth0';
import { MongoClient, ObjectId } from 'mongodb';
import { NextApiResponse } from 'next';
import { NextResponse } from 'next/server';

export const PUT = async function handler(req: Request, res: NextApiResponse) {
  const body = await req.json();
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const typedClientPromise: Promise<MongoClient> =
    clientPromise as Promise<MongoClient>;
  const client = await typedClientPromise;
  const db = client.db('degano-app');

  if (body.cleanStock) {
    const updateResult = await db
      .collection('equipmentListV2')
      .updateOne(
        { _id: new ObjectId(body._id as string) },
        { $set: { equipment: [] } }
      );
    if (updateResult.matchedCount === 0) {
      return NextResponse.json(
        { message: 'Equipment not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      {
        message: 'Equipment cleand up successfully',
        updateResult
      },
      {
        status: 201
      }
    );
  }

  if (!body._id && body?.equipment?.length) {
    const newEquimentColection = await db
      .collection('equipmentListV2')
      .insertOne({ equipment: body.equipment });
    return NextResponse.json(
      {
        message: 'Equipment added successfully',
        newEquimentColection
      },
      {
        status: 200
      }
    );
  }

  const updatedResult = await db
    .collection('equipmentListV2')
    .updateOne(
      { _id: new ObjectId(body._id as string) },
      { $set: { equipment: body.equipment } }
    );
  if (updatedResult.matchedCount === 0) {
    return NextResponse.json(
      { message: 'Equipment not found' },
      { status: 404 }
    );
  }

  return NextResponse.json(
    {
      message: 'Equipment updated successfully',
      updatedResult
    },
    {
      status: 201
    }
  );
};
