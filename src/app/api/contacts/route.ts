import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db('degano-app');
    const contacts = await db.collection('contacts').find().toArray();
    return NextResponse.json(contacts);
  } catch (error) {
    console.error('Error GET /contacts', error);
    return NextResponse.json(
      { error: 'Error fetching contacts' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body._id) {
      delete body._id;
    }

    const client = await clientPromise;
    const db = client.db('degano-app');
    const res = await db.collection('contacts').insertOne(body);
    return NextResponse.json({ ...body, _id: res.insertedId });
  } catch (error) {
    console.error('Error POST /contacts', error);
    return NextResponse.json(
      { error: 'Error creating contact' },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    if (!body._id) {
      return NextResponse.json({ error: 'Missing _id' }, { status: 400 });
    }
    const client = await clientPromise;
    const db = client.db('degano-app');
    const { _id, ...rest } = body;
    await db
      .collection('contacts')
      .updateOne({ _id: new ObjectId(String(_id)) }, { $set: rest });
    return NextResponse.json({ _id, ...rest });
  } catch (error) {
    console.error('Error PUT /contacts', error);
    return NextResponse.json(
      { error: 'Error updating contact' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { _id } = await req.json();
    if (!_id) {
      return NextResponse.json({ error: 'Missing _id' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('degano-app');

    await db
      .collection('contacts')
      .deleteOne({ _id: new ObjectId(String(_id)) });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error DELETE /contacts', error);
    return NextResponse.json(
      { error: 'Error deleting contact' },
      { status: 500 }
    );
  }
}
