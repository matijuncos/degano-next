// Identidad del usuario logueado dentro de la app.
//
// Reemplaza a la vieja colección `users`: el directorio único es `employees`.
// - POST → se llama en cada login. Estampa authSub/lastLoginAt sobre el registro
//   de STAFF que tenga ese email; si no existe ninguno, crea una entrada de
//   directorio con isStaff:false (no es personal de eventos, no sale en selectores).
// - GET  → devuelve el registro del usuario actual, para que el front sepa
//   "quién soy" al filtrar tableros, tareas y calendarios por empleado.
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';
import clientPromise from '@/lib/mongodb';
import { requireAuth } from '@/lib/requireAuth';
import { getUserRole } from '@/utils/roleUtils';
import {
  ensureEmployeeIndexes,
  registerLogin,
  resolveEmployee
} from '@/lib/resolveEmployee';

async function getDb() {
  const client = await clientPromise;
  return client.db('degano-app');
}

export async function POST() {
  const unauth = await requireAuth();
  if (unauth) return unauth;
  try {
    const session = await getSession();
    const db = await getDb();
    await ensureEmployeeIndexes(db);
    await registerLogin(db, session?.user);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[me POST]', error);
    return NextResponse.json(
      { error: 'Error al registrar el ingreso' },
      { status: 500 }
    );
  }
}

export async function GET() {
  const unauth = await requireAuth();
  if (unauth) return unauth;
  try {
    const session = await getSession();
    const db = await getDb();
    const result = await resolveEmployee(db, session?.user);

    // Sin vínculo no es un error: el usuario simplemente no puede ser miembro de
    // tableros/calendarios restringidos. El front decide cómo mostrarlo.
    if (!result.ok) {
      return NextResponse.json({ employee: null, reason: result.reason });
    }

    const { employee } = result;
    return NextResponse.json({
      employee: {
        _id: String(employee._id),
        fullName: employee.fullName,
        email: employee.email ?? null,
        rol: employee.rol ?? '',
        isStaff: employee.isStaff !== false
      },
      role: getUserRole(session?.user)
    });
  } catch (error) {
    console.error('[me GET]', error);
    return NextResponse.json(
      { error: 'Error al obtener tu identidad' },
      { status: 500 }
    );
  }
}
