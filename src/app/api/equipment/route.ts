// equipment/route.ts
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET() {
  const client = await clientPromise;
  const db = client.db('degano-app');
  const equipments = await db.collection('equipment').find().toArray();
  return NextResponse.json(equipments);
}

export async function POST(req: Request) {
  const body = await req.json();
  const client = await clientPromise;
  const db = client.db('degano-app');
  const newEq = await db.collection('equipment').insertOne(body);

  const deltaAvailable = body.outOfService?.isOut ? 0 : 1;
  await db.collection('categories').updateOne(
    { _id: new ObjectId(String(body.categoryId)) },
    {
      $inc: {
        totalStock: 1,
        availableStock: deltaAvailable
      }
    }
  );

  return NextResponse.json({ ...body, _id: newEq.insertedId });
}

export async function PUT(req: Request) {
  const body = await req.json();
  const client = await clientPromise;
  const db = client.db('degano-app');

  const { _id, ...rest } = body;
  const objectId = new ObjectId(String(_id));

  const oldItem = await db.collection('equipment').findOne({ _id: objectId });
  const wasOut = oldItem?.outOfService?.isOut;
  const isOut = rest?.outOfService?.isOut;

  await db.collection('equipment').updateOne(
    { _id: objectId },
    { $set: rest }
  );

  let deltaAvailable = 0;
  if (wasOut !== isOut) {
    deltaAvailable = wasOut && !isOut ? 1 : !wasOut && isOut ? -1 : 0;
  }

  if (deltaAvailable !== 0) {
    await db.collection('categories').updateOne(
      { _id: new ObjectId(String(rest.categoryId)) },
      {
        $inc: { availableStock: deltaAvailable }
      }
    );
  }

  const updatedItem = await db.collection('equipment').findOne({ _id: objectId });
  return NextResponse.json(updatedItem);
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const client = await clientPromise;
  const db = client.db('degano-app');

  const equipment = await db.collection('equipment').findOne({ _id: new ObjectId(id) });
  if (equipment) {
    const deltaAvailable = equipment.outOfService?.isOut ? 0 : -1;
    await db.collection('categories').updateOne(
      { _id: new ObjectId(String(equipment.categoryId)) },
      {
        $inc: {
          totalStock: -1,
          availableStock: deltaAvailable
        }
      }
    );
  }

  await db.collection('equipment').deleteOne({ _id: new ObjectId(id) });

  return NextResponse.json({ success: true });
}
