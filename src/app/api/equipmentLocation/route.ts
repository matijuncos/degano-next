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

export const DELETE = withAdminAuth(async (context: AuthContext, req: Request) => {
  try {
    const { searchParams } = new URL(req.url);
    const name = searchParams.get('name');

    if (!name) {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('degano-app');

    // Verificar si hay equipos usando esta localización
    const equipmentCount = await db.collection('equipment').countDocuments({ location: name });

    if (equipmentCount > 0) {
      return NextResponse.json(
        { error: `No se puede eliminar. Hay ${equipmentCount} equipo(s) usando esta localización.` },
        { status: 400 }
      );
    }

    const result = await db.collection('equipmentLocation').deleteOne({ name });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Localización no encontrada' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Localización eliminada' });
  } catch (error) {
    return NextResponse.json({ error: 'Error al eliminar localización' }, { status: 500 });
  }
});
