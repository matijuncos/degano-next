import { UserRole } from '@/types/auth';
import { getPermissions, obfuscatePhone } from '@/utils/roleUtils';
import { stripEquipmentPrices } from '@/utils/equipmentPrices';

/**
 * Presupuesto vacío (misma forma que un evento nuevo). Un evento puede tener
 * `payment: null` en la base (lo borraba un bug al guardar como manager) y las
 * pantallas de presupuesto leen `payment.x` directo: así no se rompen.
 */
export function emptyPayment() {
  return {
    upfrontAmount: '',
    totalToPay: '',
    partialPayed: false,
    totalPayed: false,
    subsequentPayments: [],
    annexes: [],
    budgetFileUrl: '',
    budgetFiles: []
  };
}

/**
 * Evento tal como lo puede ver un rol. Se usa en TODA respuesta que devuelve
 * un evento (getEvent y también las de guardar: updateEvent, postEvent,
 * notas), si no, guardar algo le devolvería al front los datos ocultos.
 *  - Pagos/presupuesto → null si no es admin
 *  - Teléfonos de clientes / shows → '****' según rol
 *  - Precios de equipamiento (y su total) → fuera si no es admin
 */
export function sanitizeEventForRole<T extends Record<string, any>>(
  event: T | null | undefined,
  role: UserRole | undefined
): T | null | undefined {
  if (!event) return event;
  const permissions = getPermissions(role);
  return {
    ...event,
    payment: permissions.canViewPayments ? event.payment ?? emptyPayment() : null,
    phoneNumber: obfuscatePhone(event.phoneNumber, role, 'client'),
    extraClients: (event.extraClients || []).map((client: any) => ({
      ...client,
      phoneNumber: obfuscatePhone(client.phoneNumber, role, 'client')
    })),
    bands: (event.bands || []).map((band: any) => ({
      ...band,
      contacts: (band.contacts || []).map((contact: any) => ({
        ...contact,
        phone: obfuscatePhone(contact.phone, role, 'show')
      }))
    })),
    equipment: permissions.canViewEquipmentPrices
      ? event.equipment || []
      : stripEquipmentPrices(event.equipment),
    equipmentPrice: permissions.canViewEquipmentPrices ? event.equipmentPrice : undefined
  };
}
