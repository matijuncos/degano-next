import clientPromise from '@/lib/mongodb';
import { MongoClient } from 'mongodb';
import { NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/withAuth';

// Solo admin y manager pueden eliminar clientes
export const DELETE = withAuth(
  async (context: AuthContext, request: Request, { params }: { params: { id: string } }) => {
    const eventId = params.id;

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
  },
  { requiredPermission: 'canDeleteClients' }
);
