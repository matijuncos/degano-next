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
  canViewClientPhones: boolean;  // Números de teléfono de clientes y extras
  canCreateClients: boolean;
  canEditClients: boolean;
  canDeleteClients: boolean;

  // Shows/Bandas
  canViewShows: boolean;
  canViewShowPhones: boolean;  // Números de teléfono de contactos de shows
  canCreateShows: boolean;
  canEditShows: boolean;
  canDeleteShows: boolean;

  // Equipamiento
  canViewEquipment: boolean;
  canViewEquipmentPrices: boolean;
  canCreateEquipment: boolean;
  canEditEquipment: boolean;
  canDeleteEquipment: boolean;
  canViewEquipmentHistory: boolean;

  // Información financiera (presupuestos, pagos, precios)
  canViewPayments: boolean;
  canEditPayments: boolean;
  canCreatePayments: boolean;
  canDeletePayments: boolean;

  // Archivos
  canViewFiles: boolean;
  canUploadFiles: boolean;
  canDeleteFiles: boolean;

  // Calendario
  canViewCalendar: boolean;

  // Empleados/Staff
  canViewEmployees: boolean;
  canCreateEmployees: boolean;
  canEditEmployees: boolean;
  canDeleteEmployees: boolean;

  // Salones/Lugares
  canViewSalons: boolean;
  canCreateSalons: boolean;
  canEditSalons: boolean;
  canDeleteSalons: boolean;
}

export interface AuthUser {
  email: string;
  name: string;
  role: UserRole;
  permissions: Permission;
}

// Definición de permisos por rol según especificaciones:
//
// ADMIN: Control total, crea todo
// MANAGER: Acceso a todo EXCEPTO teléfonos de clientes/extras y dinero. Puede CREAR eventos. NO crea otros recursos, SÍ modifica y elimina
// VIEWER: Solo lectura. NO ve teléfonos de clientes/shows ni dinero. NO crea, edita ni elimina nada
export const ROLE_PERMISSIONS: Record<UserRole, Permission> = {
  admin: {
    // Eventos - Admin NO puede eliminar eventos
    canViewEvents: true,
    canCreateEvents: true,
    canEditEvents: true,
    canDeleteEvents: false,  // ❌ NO elimina (solo manager)

    // Clientes
    canViewClients: true,
    canViewClientPhones: true,
    canCreateClients: true,
    canEditClients: true,
    canDeleteClients: true,

    // Shows/Bandas
    canViewShows: true,
    canViewShowPhones: true,
    canCreateShows: true,
    canEditShows: true,
    canDeleteShows: true,

    // Equipamiento
    canViewEquipment: true,
    canViewEquipmentPrices: true,
    canCreateEquipment: true,
    canEditEquipment: true,
    canDeleteEquipment: true,
    canViewEquipmentHistory: true,

    // Información financiera
    canViewPayments: true,
    canEditPayments: true,
    canCreatePayments: true,
    canDeletePayments: true,

    // Archivos
    canViewFiles: true,
    canUploadFiles: true,
    canDeleteFiles: true,

    // Calendario
    canViewCalendar: true,

    // Empleados/Staff - Control total
    canViewEmployees: true,
    canCreateEmployees: true,
    canEditEmployees: true,
    canDeleteEmployees: true,

    // Salones/Lugares - Control total
    canViewSalons: true,
    canCreateSalons: true,
    canEditSalons: true,
    canDeleteSalons: true,
  },

  manager: {
    // Eventos - Manager puede crear eventos
    canViewEvents: true,
    canCreateEvents: true,
    canEditEvents: true,
    canDeleteEvents: true,

    // Clientes - NO puede ver teléfonos
    canViewClients: true,
    canViewClientPhones: false,  // ❌ NO ve teléfonos de clientes/extras
    canCreateClients: false,     // ❌ NO crea
    canEditClients: true,
    canDeleteClients: true,

    // Shows/Bandas - SÍ ve teléfonos, NO elimina
    canViewShows: true,
    canViewShowPhones: true,     // ✅ SÍ ve teléfonos de shows
    canCreateShows: false,       // ❌ NO crea
    canEditShows: true,
    canDeleteShows: false,       // ❌ NO elimina (solo admin)

    // Equipamiento - Puede crear, NO ve precios
    canViewEquipment: true,
    canViewEquipmentPrices: false,  // ❌ NO ve precios (muestra ****)
    canCreateEquipment: true,       // ✅ SÍ crea
    canEditEquipment: true,
    canDeleteEquipment: true,
    canViewEquipmentHistory: true,

    // Información financiera - NO acceso a nada de dinero
    canViewPayments: false,      // ❌ NO ve presupuestos/pagos
    canEditPayments: false,
    canCreatePayments: false,
    canDeletePayments: false,

    // Archivos
    canViewFiles: true,
    canUploadFiles: false,       // ❌ NO crea/sube
    canDeleteFiles: true,

    // Calendario
    canViewCalendar: true,

    // Empleados/Staff - Solo lectura
    canViewEmployees: true,
    canCreateEmployees: false,   // ❌ NO crea (solo admin)
    canEditEmployees: false,     // ❌ NO edita (solo admin)
    canDeleteEmployees: false,   // ❌ NO elimina (solo admin)

    // Salones/Lugares - Puede editar, NO crear ni eliminar
    canViewSalons: true,
    canCreateSalons: false,      // ❌ NO crea (solo admin)
    canEditSalons: true,         // ✅ SÍ edita
    canDeleteSalons: false,      // ❌ NO elimina (solo admin)
  },

  viewer: {
    // Eventos - Solo puede ver
    canViewEvents: true,
    canCreateEvents: false,      // ❌ NO crea
    canEditEvents: false,        // ❌ NO edita
    canDeleteEvents: false,      // ❌ NO elimina

    // Clientes - Viewer ve teléfonos como ****
    canViewClients: true,
    canViewClientPhones: true,   // ✅ SÍ ve teléfonos (como ****)
    canCreateClients: false,     // ❌ NO crea
    canEditClients: false,       // ❌ NO edita
    canDeleteClients: false,     // ❌ NO elimina

    // Shows/Bandas - NO ve teléfonos (diferencia con manager)
    canViewShows: true,
    canViewShowPhones: false,    // ❌ NO ve teléfonos de shows
    canCreateShows: false,       // ❌ NO crea
    canEditShows: false,         // ❌ NO edita
    canDeleteShows: false,       // ❌ NO elimina

    // Equipamiento
    canViewEquipment: true,
    canViewEquipmentPrices: false,  // ❌ NO ve precios
    canCreateEquipment: false,      // ❌ NO crea
    canEditEquipment: false,        // ❌ NO edita
    canDeleteEquipment: false,      // ❌ NO elimina
    canViewEquipmentHistory: false, // ❌ NO ve historial

    // Información financiera
    canViewPayments: false,
    canEditPayments: false,
    canCreatePayments: false,
    canDeletePayments: false,

    // Archivos
    canViewFiles: true,
    canUploadFiles: false,
    canDeleteFiles: false,

    // Calendario
    canViewCalendar: true,

    // Empleados/Staff - Solo lectura
    canViewEmployees: true,
    canCreateEmployees: false,   // ❌ NO crea
    canEditEmployees: false,     // ❌ NO edita
    canDeleteEmployees: false,   // ❌ NO elimina

    // Salones/Lugares - Solo lectura
    canViewSalons: true,
    canCreateSalons: false,      // ❌ NO crea
    canEditSalons: false,        // ❌ NO edita
    canDeleteSalons: false,      // ❌ NO elimina
  },
};
