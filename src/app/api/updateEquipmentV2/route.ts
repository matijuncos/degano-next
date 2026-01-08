import clientPromise from '@/lib/mongodb';
import { getSession } from '@auth0/nextjs-auth0';
import { MongoClient, ObjectId } from 'mongodb';
import { NextApiResponse } from 'next';
import { NextResponse } from 'next/server';

export const PUT = async function handler(req: Request) {
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
  // falta revisar..
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
  if (Array.isArray(equipment)) {
    const equipmentToInsert = equipment.filter((eq) => !eq._id);
    if (equipmentToInsert.length > 0) {
      const newEquipmentCollection = await db
        .collection('equipmentListV2')
        .insertMany(equipmentToInsert);
        const insertedIds = Object.values(newEquipmentCollection.insertedIds);
        const insertedEquipments = await db
          .collection('equipmentListV2')
          .find({ _id: { $in: insertedIds } })
          .toArray();
      return NextResponse.json({
        message: 'Equipment added successfully',
        insertedEquipments,
        status: 200
      });
    }
  }

  if (!equipment._id) {
    const newEquipmentCollection = await db
      .collection('equipmentListV2')
      .insertOne(equipment);
      const insertedDocument = await db
      .collection('equipmentListV2')
      .findOne({ _id: newEquipmentCollection.insertedId });    
    return NextResponse.json(
      {
        message: 'Equipment added successfully',
        insertedDocument,
        status: 200
      });
  } else {
    const { _id, ...equipmentData } = equipment;
    console.log('equipment ', equipment)
    const updatedResult = await db
      .collection('equipmentListV2')
      .updateOne(
        { _id: new ObjectId(_id as string)},
        { $set: equipmentData }
      );

    if (updatedResult.matchedCount === 0) {
      throw new Error('Equipment not found');
    }
    return NextResponse.json(
      {
        message: 'Equipment updated successfully',
        updatedResult,
        status: 201
      }
    );
  }
};
