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
  console.log(body);
  /*   if (!body?.equipment?.length) {
    return NextResponse.json(
      { message: 'Equipment Array is empty and it will remove everything.' },
      { status: 400 }
    );
  } */

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
