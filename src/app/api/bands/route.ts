// src/app/api/bands/route.ts
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { withAuth, withAdminAuth, AuthContext } from '@/lib/withAuth';

export const dynamic = 'force-dynamic';

// GET todas las bandas
export const GET = withAuth(async (context: AuthContext) => {
  try {
    const client = await clientPromise;
    const db = client.db('degano-app');
    const bands = await db.collection('bands').find().toArray();
    return NextResponse.json(bands);
  } catch (error) {
    console.error('Error GET bands:', error);
    return NextResponse.json(
      { error: 'Error fetching bands' },
      { status: 500 }
    );
  }
});

// POST nueva banda
export const POST = withAdminAuth(async (context: AuthContext, req: Request) => {
  try {
    const body = await req.json();
    const { _id, showTime, testTime, ...rest } = body;
    const cleanBody = { ...rest };
    const client = await clientPromise;
    const db = client.db('degano-app');
    const result = await db.collection('bands').insertOne(cleanBody);
    return NextResponse.json({ ...cleanBody, _id: result.insertedId });
  } catch (error) {
    console.error('Error POST band:', error);
    return NextResponse.json({ error: 'Error creating band' }, { status: 500 });
  }
});

// PUT actualizar banda
export const PUT = withAuth(async (context: AuthContext, req: Request) => {
  try {
    const body = await req.json();
    if (!body._id) {
      return NextResponse.json({ error: 'Missing _id' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('degano-app');

    const { _id, ...rest } = body;

    await db
      .collection('bands')
      .updateOne({ _id: new ObjectId(_id) }, { $set: rest });

    return NextResponse.json(body);
  } catch (error) {
    console.error('Error PUT band:', error);
    return NextResponse.json({ error: 'Error updating band' }, { status: 500 });
  }
}, { requiredPermission: 'canEditShows' });

export const PATCH = withAuth(async (context: AuthContext, req: Request) => {
  try {
    const body = await req.json();
    const { bandId, contact, removeContactId } = body;

    if (!bandId) {
      return NextResponse.json({ error: 'Missing bandId' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('degano-app');

    if (removeContactId) {
      // eliminar un contacto
      await db
        .collection('bands')
        .updateOne(
          { _id: new ObjectId(String(bandId)) },
          { $pull: { contacts: { _id: removeContactId } } as any }
        );
    } else if (contact?._id) {
      // actualizar o insertar contacto
      await db
        .collection('bands')
        .updateOne(
          { _id: new ObjectId(bandId), 'contacts._id': contact._id },
          { $set: { 'contacts.$': contact } }
        );
      await db
        .collection('bands')
        .updateOne(
          { _id: new ObjectId(bandId), 'contacts._id': { $ne: contact._id } },
          { $push: { contacts: contact } }
        );
    }

    const updatedBand = await db
      .collection('bands')
      .findOne({ _id: new ObjectId(String(bandId)) });
    return NextResponse.json(updatedBand);
  } catch (error) {
    console.error('Error PATCH contact in band:', error);
    return NextResponse.json(
      { error: 'Error updating contact in band' },
      { status: 500 }
    );
  }
}, { requiredPermission: 'canEditShows' });

// DELETE banda
export const DELETE = withAuth(async (context: AuthContext, req: Request) => {
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
}, { requiredPermission: 'canDeleteShows' });
