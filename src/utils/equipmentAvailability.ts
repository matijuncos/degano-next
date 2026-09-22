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

export interface ScheduledUse {
  eventId?: string;
  startDate: Date | string;
  endDate: Date | string;
  [key: string]: any;
}

/**
 * Dos rangos se solapan si uno empieza antes de que el otro termine Y termina
 * después de que el otro empieza. Rangos que solo se tocan en el borde
 * (fin == inicio) NO se consideran solapados: un evento puede empezar justo
 * cuando termina el anterior.
 */
export function rangesOverlap(
  aStart: Date | string,
  aEnd: Date | string,
  bStart: Date | string,
  bEnd: Date | string
): boolean {
  const as = new Date(aStart).getTime();
  const ae = new Date(aEnd).getTime();
  const bs = new Date(bStart).getTime();
  const be = new Date(bEnd).getTime();
  if ([as, ae, bs, be].some((t) => Number.isNaN(t))) return false;
  return as < be && ae > bs;
}

/**
 * ¿El equipo está ocupado en el rango pedido? Recorre sus `scheduledUses`
 * buscando solapamiento. `ignoreEventId` permite excluir las reservas del
 * propio evento que se está editando (si no, se detectaría conflicto consigo
 * mismo).
 */
export function hasScheduleConflict(
  eventStart: Date | string,
  eventEnd: Date | string,
  scheduledUses?: ScheduledUse[] | null,
  options?: { ignoreEventId?: string }
): boolean {
  const uses = scheduledUses || [];
  return uses.some((use) => {
    if (!use) return false;
    if (
      options?.ignoreEventId &&
      use.eventId &&
      String(use.eventId) === String(options.ignoreEventId)
    ) {
      return false;
    }
    return rangesOverlap(eventStart, eventEnd, use.startDate, use.endDate);
  });
}
