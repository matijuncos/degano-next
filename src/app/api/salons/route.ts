import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getSession } from '@auth0/nextjs-auth0';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db('degano-app');

    const salons = await db
      .collection('salons')
      .find()
      .sort({ name: 1 })
      .toArray();

    return NextResponse.json(
      { salons },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );
  } catch (error) {
    console.error('Error fetching salons:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, city, address, contact } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Salon name is required' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db('degano-app');

    // Verificar si el salón ya existe
    const existingSalon = await db
      .collection('salons')
      .findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });

    if (existingSalon) {
      return NextResponse.json(
        { salon: existingSalon },
        { status: 200 }
      );
    }

    // Crear nuevo salón
    const newSalon = {
      name,
      city: city || '',
      address: address || '',
      contact: contact || '',
      createdAt: new Date()
    };

    const result = await db.collection('salons').insertOne(newSalon);

    return NextResponse.json(
      { salon: { ...newSalon, _id: result.insertedId } },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating salon:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
