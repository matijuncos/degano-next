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
    const equipmentToUpdate = equipment.filter((eq) => eq._id);
    const equipmentToInsert = equipment.filter((eq) => !eq._id);
    if (equipmentToUpdate.length > 0) {
      const operations = equipmentToUpdate.map(({ _id, equipmentData }) => {
        const totalQuantity = +equipmentData.totalQuantity;
        const currentQuantity = +equipmentData.currentQuantity;
        const selectedQuantity = +equipmentData.selectedQuantity;

        const updatedEquipment = {
          ...equipmentData,
          totalQuantity: String(totalQuantity - selectedQuantity),
          currentQuantity: String(currentQuantity - selectedQuantity)
        };

        return {
          updateOne: {
            filter: { _id: new ObjectId(_id as string) },
            update: { $set: updatedEquipment }
          }
        };
      });

      const newEquipmentCollection = await db
        .collection('equipmentListV2')
        .bulkWrite(operations);
      return NextResponse.json({
        message: 'Equipment updated successfully',
        newEquipmentCollection,
        status: 201
      });
    }
    if (equipmentToInsert.length > 0) {
      const newEquipmentCollection = await db
        .collection('equipmentListV2')
        .insertMany(equipmentToInsert);
      return NextResponse.json({
        message: 'Equipment added successfully',
        newEquipmentCollection,
        status: 200
      });
    }
  }

  if (!equipment._id) {
    const newEquipmentCollection = await db
      .collection('equipmentListV2')
      .insertOne(equipment);
    return NextResponse.json(
      {
        message: 'Equipment added successfully',
        newEquipmentCollection,
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
