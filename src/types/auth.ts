// Tipos de autenticación y autorización

export type UserRole = 'admin' | 'manager' | 'viewer';

export interface Permission {
  // Eventos
  canViewEvents: boolean;
  canCreateEvents: boolean;
  canEditEvents: boolean;
  canDeleteEvents: boolean;

  // Clientes
  canViewClients: boolean;
  canCreateClients: boolean;
  canEditClients: boolean;
  canDeleteClients: boolean;

  // Equipamiento
  canViewEquipment: boolean;
  canViewEquipmentPrices: boolean;
  canManageEquipment: boolean;
  canViewEquipmentHistory: boolean;

  // Información financiera
  canViewPayments: boolean;
  canEditPayments: boolean;

  // Archivos
  canUploadFiles: boolean;
  canDeleteFiles: boolean;

  // Calendario
  canViewCalendar: boolean;
  canSyncCalendar: boolean;
}

export interface AuthUser {
  email: string;
  name: string;
  role: UserRole;
  permissions: Permission;
}

// Definición de permisos por rol
export const ROLE_PERMISSIONS: Record<UserRole, Permission> = {
  admin: {
    // Eventos
    canViewEvents: true,
    canCreateEvents: true,
    canEditEvents: true,
    canDeleteEvents: true,

    // Clientes
    canViewClients: true,
    canCreateClients: true,
    canEditClients: true,
    canDeleteClients: true,

    // Equipamiento
    canViewEquipment: true,
    canViewEquipmentPrices: true,
    canManageEquipment: true,
    canViewEquipmentHistory: true,

    // Información financiera
    canViewPayments: true,
    canEditPayments: true,

    // Archivos
    canUploadFiles: true,
    canDeleteFiles: true,

    // Calendario
    canViewCalendar: true,
    canSyncCalendar: true,
  },

  manager: {
    // Eventos
    canViewEvents: true,
    canCreateEvents: true,
    canEditEvents: true,
    canDeleteEvents: false, // Solo admin puede eliminar

    // Clientes
    canViewClients: true,
    canCreateClients: true,
    canEditClients: true,
    canDeleteClients: false,

    // Equipamiento
    canViewEquipment: true,
    canViewEquipmentPrices: false, // No puede ver precios
    canManageEquipment: true,
    canViewEquipmentHistory: true,

    // Información financiera
    canViewPayments: false, // No puede ver pagos
    canEditPayments: false,

    // Archivos
    canUploadFiles: true,
    canDeleteFiles: true,

    // Calendario
    canViewCalendar: true,
    canSyncCalendar: true,
  },

  viewer: {
    // Eventos
    canViewEvents: true,
    canCreateEvents: false,
    canEditEvents: false,
    canDeleteEvents: false,

    // Clientes
    canViewClients: true,
    canCreateClients: false,
    canEditClients: false,
    canDeleteClients: false,

    // Equipamiento
    canViewEquipment: true,
    canViewEquipmentPrices: false,
    canManageEquipment: false,
    canViewEquipmentHistory: false,

    // Información financiera
    canViewPayments: false,
    canEditPayments: false,

    // Archivos
    canUploadFiles: false,
    canDeleteFiles: false,

    // Calendario
    canViewCalendar: true,
    canSyncCalendar: false,
  },
};
