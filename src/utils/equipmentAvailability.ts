/**
 * Utilidades para determinar la disponibilidad EN VIVO de un equipo respecto
 * a un evento. La idea: el equipamiento guardado en el evento es una "foto"
 * congelada al momento de agregarlo; para saber si HOY está disponible hay
 * que cruzar contra el estado actual del equipo en la colección `equipment`.
 */

export interface LiveEquipmentStatus {
  isOut?: boolean;
  reason?: string | null;
  details?: string | null;
}

/**
 * Un equipo está "no disponible" para un evento cuando está fuera de servicio
 * por una baja/reparación manual. Se EXCLUYE el motivo 'En Evento' porque ese
 * estado es una reserva (el equipo sigue siendo utilizable en la fecha del
 * evento que lo reservó), no una baja real.
 */
export function isEquipmentUnavailable(
  live?: LiveEquipmentStatus | null
): boolean {
  return !!(live?.isOut && live?.reason !== 'En Evento');
}

/**
 * Motivo legible de la no disponibilidad (ej. 'Reparación'). Devuelve string
 * vacío si el equipo está disponible o no tiene motivo.
 */
export function getUnavailabilityReason(
  live?: LiveEquipmentStatus | null
): string {
  if (!isEquipmentUnavailable(live)) return '';
  return live?.reason || 'Fuera de servicio';
}
