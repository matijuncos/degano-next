import clientPromise from '@/lib/mongodb';
import { MongoClient, ObjectId } from 'mongodb';
import { NextApiResponse } from 'next';
import { NextResponse } from 'next/server';

export const PUT = async function handler(req: Request, res: NextApiResponse) {
  const body = await req.json(); // Assuming the body contains the updated equipment object
  const typedClientPromise: Promise<MongoClient> =
    clientPromise as Promise<MongoClient>;
  const client = await typedClientPromise;
  const db = client.db('sample_mflix');

  const updateResult = await db.collection('equipmentList').updateOne(
    { _id: new ObjectId('661b0410b12807bce014f06f') }, // This targets the document by its _id
    { $set: { equipment: body.equipment } } // This sets the 'equipment' field to the new array
  );
  console.log(updateResult);
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
