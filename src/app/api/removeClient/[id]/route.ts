import clientPromise from '@/lib/mongodb';
import { getSession } from '@auth0/nextjs-auth0';
import { MongoClient } from 'mongodb';
import { NextResponse } from 'next/server';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const eventId = params.id;
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const isAdmin = session?.user?.role === 'admin';
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!eventId) {
    return NextResponse.json(
      { message: 'Event ID is missing', success: false },
      { status: 400 }
    );
  }
  try {
    const typedClientPromise: Promise<MongoClient> =
      clientPromise as Promise<MongoClient>;
    const client = await typedClientPromise;
    const db = client.db('degano-app');
    const ObjectId = require('mongodb').ObjectId;
    const events = await db
      .collection('clients')
      .findOneAndDelete({ _id: new ObjectId(eventId) });
    return NextResponse.json({
      message: 'Client deleted successfully',
      success: true
    });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { message: error, success: false },
      { status: 500 }
    );
  }
}
