import { getSession } from '@auth0/nextjs-auth0';
import { NextResponse } from 'next/server';
import { getUserRole } from '@/utils/roleUtils';
import { UserRole } from '@/types/auth';

// Guard liviano para API routes: corta con 401 si no hay sesión, y con 403 si el
// rol no está permitido (cuando se pasan roles). Reusa el mismo getSession/getUserRole
// que withAuth. Uso: const unauth = await requireAuth(); if (unauth) return unauth;
//                    const unauth = await requireAuth(['admin','manager']); ...
export async function requireAuth(
  allowedRoles?: UserRole[]
): Promise<NextResponse | null> {
  try {
    const session = await getSession();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'No autenticado. Iniciá sesión.' },
        { status: 401 }
      );
    }
    if (allowedRoles && allowedRoles.length > 0) {
      const role = getUserRole(session.user);
      if (!allowedRoles.includes(role)) {
        return NextResponse.json(
          { error: 'No tenés permisos para esta acción' },
          { status: 403 }
        );
      }
    }
    return null;
  } catch {
    return NextResponse.json({ error: 'Error de autenticación' }, { status: 500 });
  }
}
