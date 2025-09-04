// src/app/api/bands/route.ts
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

// GET todas las bandas
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db('degano-app');
    const bands = await db.collection('bands').find().toArray();
    return NextResponse.json(bands);
  } catch (error) {
    console.error('Error GET bands:', error);
    return NextResponse.json({ error: 'Error fetching bands' }, { status: 500 });
  }
}

// POST nueva banda
export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body._id) {
      delete body._id;
    }
    const client = await clientPromise;
    const db = client.db('degano-app');
    const result = await db.collection('bands').insertOne(body);
    return NextResponse.json({ ...body, _id: result.insertedId });
  } catch (error) {
    console.error('Error POST band:', error);
    return NextResponse.json({ error: 'Error creating band' }, { status: 500 });
  }
}

// PUT actualizar banda
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    if (!body._id) {
      return NextResponse.json({ error: 'Missing _id' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('degano-app');

    const { _id, ...rest } = body;

    await db.collection('bands').updateOne(
      { _id: new ObjectId(_id) },
      { $set: rest }
    );

    return NextResponse.json(body);
  } catch (error) {
    console.error('Error PUT band:', error);
    return NextResponse.json({ error: 'Error updating band' }, { status: 500 });
  }
}

// DELETE banda
export async function DELETE(req: Request) {
  try {
    const { _id } = await req.json();
    if (!_id) {
      return NextResponse.json({ error: 'Missing _id' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('degano-app');
    await db.collection('bands').deleteOne({ _id: new ObjectId(_id) });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error DELETE band:', error);
    return NextResponse.json({ error: 'Error deleting band' }, { status: 500 });
  }
}
