import { UserRole, Permission, ROLE_PERMISSIONS } from '@/types/auth';

/**
 * Obtiene los permisos de un rol específico
 */
export function getPermissions(role: UserRole | undefined): Permission {
  if (!role || !ROLE_PERMISSIONS[role]) {
    // Por defecto, devolver permisos de viewer
    return ROLE_PERMISSIONS.viewer;
  }
  return ROLE_PERMISSIONS[role];
}

/**
 * Verifica si un usuario tiene un permiso específico
 */
export function hasPermission(
  role: UserRole | undefined,
  permission: keyof Permission
): boolean {
  const permissions = getPermissions(role);
  return permissions[permission];
}

/**
 * Verifica si un usuario tiene al menos uno de los roles especificados
 */
export function hasRole(
  userRole: UserRole | undefined,
  allowedRoles: UserRole[]
): boolean {
  if (!userRole) return false;
  return allowedRoles.includes(userRole);
}

/**
 * Verifica si un usuario es administrador
 */
export function isAdmin(role: UserRole | undefined): boolean {
  return role === 'admin';
}

/**
 * Verifica si un usuario puede realizar una acción específica
 */
export function canPerformAction(
  role: UserRole | undefined,
  action: keyof Permission
): boolean {
  return hasPermission(role, action);
}

/**
 * Obtiene el rol del usuario desde el objeto de Auth0
 * VERSIÓN SIMPLIFICADA: Usa user.role directamente
 */
export function getUserRole(user: any): UserRole {
  if (!user) {
    return 'viewer';
  }

  // Usar directamente user.role (asignado en Auth0 Dashboard)
  if (user.role && isValidRole(user.role)) {
    return user.role as UserRole;
  }

  // Default: viewer
  console.warn('[WARNING] Usuario sin rol asignado, usando viewer por defecto');
  return 'viewer';
}

/**
 * Verifica si un string es un rol válido
 */
function isValidRole(role: string): boolean {
  return ['admin', 'manager', 'viewer'].includes(role);
}

/**
 * Filtra datos sensibles según el rol del usuario
 */
export function filterSensitiveData<T extends Record<string, any>>(
  data: T,
  role: UserRole | undefined,
  sensitiveFields: (keyof T)[]
): Partial<T> {
  const permissions = getPermissions(role);
  const filtered = { ...data };

  // Si no puede ver pagos, eliminar campos financieros
  if (!permissions.canViewPayments) {
    sensitiveFields.forEach((field) => {
      if (field in filtered) {
        delete filtered[field];
      }
    });
  }

  return filtered;
}

/**
 * Ofusca precios si el usuario no tiene permiso
 */
export function obfuscatePrices<T extends { price?: number | string }>(
  items: T[],
  role: UserRole | undefined
): T[] {
  const permissions = getPermissions(role);

  if (permissions.canViewEquipmentPrices) {
    return items;
  }

  return items.map((item) => ({
    ...item,
    price: item.price !== undefined ? '****' : undefined,
  }));
}
