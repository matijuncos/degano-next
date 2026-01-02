import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';
import { UserRole, Permission } from '@/types/auth';
import { getUserRole, hasPermission } from '@/utils/roleUtils';

export interface AuthContext {
  user: any;
  role: UserRole;
}

/**
 * Middleware para proteger API routes y validar permisos
 */
export function withAuth<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: (context: AuthContext, ...args: Parameters<T>) => Promise<NextResponse>,
  options?: {
    requiredPermission?: keyof Permission;
    allowedRoles?: UserRole[];
  }
) {
  return async (...args: Parameters<T>): Promise<NextResponse> => {
    try {
      // Obtener sesión
      const session = await getSession();

      // Verificar si el usuario está autenticado
      if (!session || !session.user) {
        return NextResponse.json(
          { error: 'No autenticado. Por favor inicia sesión.' },
          { status: 401 }
        );
      }

      const user = session.user;
      const role = getUserRole(user);

      // Verificar si el rol es válido
      if (!role) {
        return NextResponse.json(
          { error: 'Rol de usuario no válido' },
          { status: 403 }
        );
      }

      // Verificar roles permitidos
      if (options?.allowedRoles && !options.allowedRoles.includes(role)) {
        return NextResponse.json(
          {
            error: 'No tienes permisos para realizar esta acción',
            requiredRoles: options.allowedRoles,
            yourRole: role,
          },
          { status: 403 }
        );
      }

      // Verificar permiso específico
      if (options?.requiredPermission) {
        const hasPerm = hasPermission(role, options.requiredPermission);
        if (!hasPerm) {
          return NextResponse.json(
            {
              error: 'No tienes el permiso necesario para esta acción',
              requiredPermission: options.requiredPermission,
              yourRole: role,
            },
            { status: 403 }
          );
        }
      }

      // Crear contexto de autenticación
      const authContext: AuthContext = { user, role };

      // Ejecutar el handler
      return await handler(authContext, ...args);
    } catch (error) {
      console.error('Error en withAuth:', error);
      return NextResponse.json(
        { error: 'Error de autenticación' },
        { status: 500 }
      );
    }
  };
}

/**
 * Wrapper específico para operaciones que solo admins pueden hacer
 */
export function withAdminAuth<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: (context: AuthContext, ...args: Parameters<T>) => Promise<NextResponse>
) {
  return withAuth(handler, { allowedRoles: ['admin'] });
}

/**
 * Wrapper para operaciones que admins y managers pueden hacer
 */
export function withManagerAuth<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: (context: AuthContext, ...args: Parameters<T>) => Promise<NextResponse>
) {
  return withAuth(handler, { allowedRoles: ['admin', 'manager'] });
}
