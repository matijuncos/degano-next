// API de tableros (Comunicación Interna). Cualquier usuario logueado puede
// crear/editar/borrar (es comunicación interna del equipo).
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { requireAuth } from '@/lib/requireAuth';

async function getDb() {
  const client = await clientPromise;
  return client.db('degano-app');
}

// Nombre legible del usuario logueado para auditoría liviana
async function currentUserName(): Promise<string | null> {
  try {
    const session = await getSession();
    return session?.user?.name || session?.user?.email || null;
  } catch {
    return null;
  }
}

// GET → lista de tableros ordenada
export async function GET() {
  const unauth = await requireAuth();
  if (unauth) return unauth;
  try {
    const db = await getDb();
    const boards = await db
      .collection('boards')
      .find()
      .sort({ order: 1, createdAt: 1 })
      .toArray();
    return NextResponse.json({ boards });
  } catch (error) {
    console.error('[boards GET]', error);
    return NextResponse.json({ error: 'Error al obtener tableros' }, { status: 500 });
  }
}

// POST → crear tablero
export async function POST(req: Request) {
  const unauth = await requireAuth();
  if (unauth) return unauth;
  try {
    const body = await req.json();
    if (!body.name || !String(body.name).trim()) {
      return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 });
    }
    const db = await getDb();
    const count = await db.collection('boards').countDocuments();
    const doc = {
      name: String(body.name).trim(),
      description: body.description ? String(body.description) : '',
      order: count,
      createdAt: new Date(),
      createdBy: await currentUserName()
    };
    const result = await db.collection('boards').insertOne(doc);
    return NextResponse.json({ board: { ...doc, _id: result.insertedId } }, { status: 201 });
  } catch (error) {
    console.error('[boards POST]', error);
    return NextResponse.json({ error: 'Error al crear tablero' }, { status: 500 });
  }
}

// PUT → editar tablero (nombre/descripción/orden)
export async function PUT(req: Request) {
  const unauth = await requireAuth();
  if (unauth) return unauth;
  try {
    const body = await req.json();
    if (!body.id) {
      return NextResponse.json({ error: 'Falta el id del tablero' }, { status: 400 });
    }
    const db = await getDb();
    const { id, _id, ...rest } = body;
    const updates: Record<string, unknown> = {};
    if (typeof rest.name === 'string') updates.name = rest.name.trim();
    if (typeof rest.description === 'string') updates.description = rest.description;
    if (typeof rest.order === 'number') updates.order = rest.order;
    await db.collection('boards').updateOne(
      { _id: new ObjectId(String(id)) },
      { $set: updates }
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[boards PUT]', error);
    return NextResponse.json({ error: 'Error al editar tablero' }, { status: 500 });
  }
}

// DELETE → borrar tablero + sus tareas (cascada)
export async function DELETE(req: Request) {
  const unauth = await requireAuth();
  if (unauth) return unauth;
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Falta el id del tablero' }, { status: 400 });
    }
    const db = await getDb();
    await db.collection('boards').deleteOne({ _id: new ObjectId(id) });
    await db.collection('tasks').deleteMany({ boardId: id });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[boards DELETE]', error);
    return NextResponse.json({ error: 'Error al borrar tablero' }, { status: 500 });
  }
}
