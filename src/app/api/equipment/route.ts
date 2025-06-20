export const dynamic = 'force-dynamic'; // ⬅️ esto fuerza el comportamiento dinámico
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
  return NextResponse.json({ ...body, _id: newEq.insertedId });
}

export async function PUT(req: Request) {
  const body = await req.json();
  const client = await clientPromise;
  const db = client.db('degano-app');

  const { _id, ...rest } = body;
  await db.collection('equipment').updateOne(
    { _id: new ObjectId(String(_id)) },
    { $set: rest }
  );
  const updatedItem = await db.collection('equipment').findOne({ _id: new ObjectId(String(_id)) });
  return NextResponse.json(updatedItem);
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const client = await clientPromise;
  const db = client.db('degano-app');
  await db.collection('equipment').deleteOne({ _id: new ObjectId(id) });

  return NextResponse.json({ success: true });
}
