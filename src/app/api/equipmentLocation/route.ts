// src/app/api/equipmentLocation/route.ts
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { withAuth, withAdminAuth, AuthContext } from '@/lib/withAuth';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (context: AuthContext) => {
  try {
    const client = await clientPromise;
    const db = client.db('degano-app');
    const equipmentLocation = await db.collection('equipmentLocation').find().toArray();

    const names = equipmentLocation.map(loc => loc.name);
    return NextResponse.json(names);
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener localizaciones' }, { status: 500 });
  }
});


export const POST = withAdminAuth(async (context: AuthContext, req: Request) => {
  try {
    const body = await req.json();
    const { name } = body;
    if (!name) {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('degano-app');
    const existing = await db.collection('equipmentLocation').findOne({ name });

    if (existing) {
      return NextResponse.json(existing);
    }

    const result = await db.collection('equipmentLocation').insertOne({ name });
    return NextResponse.json({ _id: result.insertedId, name });
  } catch (error) {
    return NextResponse.json({ error: 'Error al guardar localización' }, { status: 500 });
  }
});
