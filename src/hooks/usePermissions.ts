import { useUser } from '@auth0/nextjs-auth0/client';
import { UserRole, Permission } from '@/types/auth';
import { getPermissions, getUserRole, hasPermission } from '@/utils/roleUtils';

/**
 * Hook para obtener los permisos del usuario actual
 */
export function usePermissions() {
  const { user, isLoading } = useUser();
  const role = getUserRole(user) as UserRole;
  const permissions = getPermissions(role);

  return {
    permissions,
    role,
    isLoading,
    /**
     * Verifica si el usuario tiene un permiso específico
     */
    can: (permission: keyof Permission) => hasPermission(role, permission),
    /**
     * Verifica si el usuario es admin
     */
    isAdmin: role === 'admin',
    /**
     * Verifica si el usuario es manager
     */
    isManager: role === 'manager',
    /**
     * Verifica si el usuario es viewer
     */
    isViewer: role === 'viewer',
  };
}
