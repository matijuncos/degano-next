// API de tableros (Comunicación Interna).
// - Crear: cualquier usuario logueado.
// - Definir/cambiar visibilidad: SOLO admin (si crea un no-admin queda 'all').
// - Eliminar: SOLO admin.
// - Ver: dueño, miembros (si es 'restricted') o cualquiera (si es 'all'). Sin
//   excepción para admins: un tablero privado es privado incluso para ellos.
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { requireAuth } from '@/lib/requireAuth';
import { getUserRole } from '@/utils/roleUtils';
import { BoardVisibility } from '@/types/boards';

async function getDb() {
  const client = await clientPromise;
  return client.db('degano-app');
}

// Identidad del usuario logueado (sub + rol + nombre)
async function currentUser(): Promise<{ sub: string | null; role: string; name: string | null }> {
  try {
    const session = await getSession();
    const u: any = session?.user;
    if (!u) return { sub: null, role: 'viewer', name: null };
    return {
      sub: u.sub || null,
      role: getUserRole(u),
      name: u.name || u.nickname || u.email || null
    };
  } catch {
    return { sub: null, role: 'viewer', name: null };
  }
}

const uniq = (arr: string[]) => Array.from(new Set(arr.filter(Boolean)));

// GET → tableros que el usuario puede ver
export async function GET() {
  const unauth = await requireAuth();
  if (unauth) return unauth;
  try {
    const { sub } = await currentUser();
    const db = await getDb();
    // Visible si: es de todos, es legacy (sin visibility), sos el dueño o sos miembro.
    const query = {
      $or: [
        { visibility: 'all' },
        { visibility: { $exists: false } },
        { ownerId: sub },
        { memberIds: sub }
      ]
    };
    const boards = await db
      .collection('boards')
      .find(query)
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
    const { sub, role, name: userName } = await currentUser();
    const isAdmin = role === 'admin';

    // La visibilidad SOLO la define un admin. Un no-admin siempre crea 'all'.
    let visibility: BoardVisibility = 'all';
    let memberIds: string[] = [];
    if (isAdmin && body.visibility === 'restricted') {
      visibility = 'restricted';
      const requested = Array.isArray(body.memberIds) ? body.memberIds.map(String) : [];
      memberIds = uniq([sub || '', ...requested]); // el dueño siempre incluido
    }

    const db = await getDb();
    const count = await db.collection('boards').countDocuments();
    const doc = {
      name: String(body.name).trim(),
      description: body.description ? String(body.description) : '',
      order: count,
      createdAt: new Date(),
      createdBy: userName,
      ownerId: sub,
      visibility,
      memberIds
    };
    const result = await db.collection('boards').insertOne(doc);
    return NextResponse.json({ board: { ...doc, _id: result.insertedId } }, { status: 201 });
  } catch (error) {
    console.error('[boards POST]', error);
    return NextResponse.json({ error: 'Error al crear tablero' }, { status: 500 });
  }
}

// PUT → editar tablero. Nombre/descripción: cualquiera. Visibilidad: solo admin.
export async function PUT(req: Request) {
  const unauth = await requireAuth();
  if (unauth) return unauth;
  try {
    const body = await req.json();
    if (!body.id) {
      return NextResponse.json({ error: 'Falta el id del tablero' }, { status: 400 });
    }
    const { role } = await currentUser();
    const isAdmin = role === 'admin';
    const db = await getDb();
    const boardId = new ObjectId(String(body.id));

    const updates: Record<string, unknown> = {};
    if (typeof body.name === 'string') updates.name = body.name.trim();
    if (typeof body.description === 'string') updates.description = body.description;
    if (typeof body.order === 'number') updates.order = body.order;

    // Cambios de visibilidad: SOLO admin. Se ignoran silenciosamente si no lo es.
    if (isAdmin && (body.visibility === 'all' || body.visibility === 'restricted')) {
      if (body.visibility === 'all') {
        updates.visibility = 'all';
        updates.memberIds = [];
      } else {
        const existing = await db.collection('boards').findOne({ _id: boardId });
        const owner = existing?.ownerId ? String(existing.ownerId) : '';
        const requested = Array.isArray(body.memberIds) ? body.memberIds.map(String) : [];
        updates.visibility = 'restricted';
        updates.memberIds = uniq([owner, ...requested]); // el dueño no se puede quitar
      }
    }

    await db.collection('boards').updateOne({ _id: boardId }, { $set: updates });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[boards PUT]', error);
    return NextResponse.json({ error: 'Error al editar tablero' }, { status: 500 });
  }
}

// DELETE → borrar tablero + sus tareas (SOLO admin)
export async function DELETE(req: Request) {
  const unauth = await requireAuth(['admin']);
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
