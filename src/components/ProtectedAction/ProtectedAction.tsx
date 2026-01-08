'use client';

import { ReactNode } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { Permission, UserRole } from '@/types/auth';
import { Tooltip, Box } from '@mantine/core';

interface ProtectedActionProps {
  children: ReactNode;
  /** Permiso requerido para mostrar el componente */
  requiredPermission?: keyof Permission;
  /** Roles permitidos (alternativa a requiredPermission) */
  allowedRoles?: UserRole[];
  /** Qué mostrar cuando el usuario no tiene permisos */
  fallback?: ReactNode;
  /** Mostrar tooltip explicativo cuando no tiene permisos */
  showTooltip?: boolean;
  /** Mensaje del tooltip */
  tooltipMessage?: string;
  /** Deshabilitar en lugar de ocultar */
  disableInsteadOfHide?: boolean;
}

/**
 * Componente para proteger acciones basado en permisos del usuario
 *
 * @example
 * // Proteger por permiso específico
 * <ProtectedAction requiredPermission="canDeleteEvents">
 *   <Button onClick={handleDelete}>Eliminar</Button>
 * </ProtectedAction>
 *
 * @example
 * // Proteger por roles
 * <ProtectedAction allowedRoles={['admin', 'manager']}>
 *   <Button>Acción Admin/Manager</Button>
 * </ProtectedAction>
 *
 * @example
 * // Deshabilitar en lugar de ocultar
 * <ProtectedAction
 *   requiredPermission="canEditEvents"
 *   disableInsteadOfHide
 *   showTooltip
 *   tooltipMessage="No tienes permisos para editar"
 * >
 *   <Button>Editar</Button>
 * </ProtectedAction>
 */
export default function ProtectedAction({
  children,
  requiredPermission,
  allowedRoles,
  fallback = null,
  showTooltip = false,
  tooltipMessage = 'No tienes permisos para esta acción',
  disableInsteadOfHide = false,
}: ProtectedActionProps) {
  const { can, role, isLoading } = usePermissions();

  // Mientras carga, no mostrar nada
  if (isLoading) {
    return null;
  }

  // Verificar permiso específico
  let hasAccess = true;
  if (requiredPermission) {
    hasAccess = can(requiredPermission);
  }

  // Verificar roles permitidos
  if (allowedRoles && hasAccess) {
    hasAccess = allowedRoles.includes(role);
  }

  // Si tiene acceso, mostrar el componente normalmente
  if (hasAccess) {
    return <>{children}</>;
  }

  // Si no tiene acceso y se debe deshabilitar
  if (disableInsteadOfHide) {
    const disabledChild = (
      <Box
        style={{
          opacity: 0.5,
          pointerEvents: 'none',
          cursor: 'not-allowed',
          filter: 'grayscale(100%)',
        }}
      >
        {children}
      </Box>
    );

    if (showTooltip) {
      return (
        <Tooltip label={tooltipMessage} withArrow>
          {disabledChild}
        </Tooltip>
      );
    }

    return disabledChild;
  }

  // Si no tiene acceso, mostrar fallback u ocultar
  return <>{fallback}</>;
}
