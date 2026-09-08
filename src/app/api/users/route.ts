// Directorio propio de usuarios. Se llena solo: cada persona que entra hace
// un upsert de su identidad (sub/email/nombre/rol) vía POST. El GET (solo admin)
// devuelve la lista para el selector de visibilidad de tableros.
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';
import clientPromise from '@/lib/mongodb';
import { requireAuth } from '@/lib/requireAuth';
import { getUserRole } from '@/utils/roleUtils';

async function getDb() {
  const client = await clientPromise;
  return client.db('degano-app');
}

// POST → registra/actualiza al usuario logueado en el directorio
export async function POST() {
  const unauth = await requireAuth();
  if (unauth) return unauth;
  try {
    const session = await getSession();
    const u: any = session?.user;
    const sub = u?.sub;
    if (!sub) {
      return NextResponse.json({ error: 'Sin identidad' }, { status: 400 });
    }
    const db = await getDb();
    await db.collection('users').updateOne(
      { sub },
      {
        $set: {
          sub,
          email: u.email || null,
          name: u.name || u.nickname || u.email || sub,
          role: getUserRole(u),
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[users POST]', error);
    return NextResponse.json({ error: 'Error al registrar usuario' }, { status: 500 });
  }
}

// GET → lista de usuarios del directorio (solo admin)
export async function GET() {
  const unauth = await requireAuth(['admin']);
  if (unauth) return unauth;
  try {
    const db = await getDb();
    const users = await db
      .collection('users')
      .find({}, { projection: { sub: 1, email: 1, name: 1, role: 1, _id: 0 } })
      .sort({ name: 1 })
      .toArray();
    return NextResponse.json({ users });
  } catch (error) {
    console.error('[users GET]', error);
    return NextResponse.json({ error: 'Error al obtener usuarios' }, { status: 500 });
  }
}
