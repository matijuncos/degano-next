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
  return conflictingUses(eventStart, eventEnd, scheduledUses, options).length > 0;
}

/**
 * Las reservas que ocupan el equipo en el rango pedido (misma regla que
 * `hasScheduleConflict`). Sirve para mostrar DÓNDE está en uso.
 */
export function conflictingUses(
  eventStart: Date | string,
  eventEnd: Date | string,
  scheduledUses?: ScheduledUse[] | null,
  options?: { ignoreEventId?: string }
): ScheduledUse[] {
  return (scheduledUses || []).filter((use) => {
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

/**
 * Reservas en curso en este momento (empezaron y no terminaron, bordes
 * incluidos). Es el "En Uso" de la vista general, sin fechas de evento.
 */
export function usesInProgress(
  scheduledUses?: ScheduledUse[] | null,
  now: Date = new Date()
): ScheduledUse[] {
  const t = now.getTime();
  return (scheduledUses || []).filter(
    (use) =>
      !!use &&
      new Date(use.startDate).getTime() <= t &&
      new Date(use.endDate).getTime() >= t
  );
}

/** Reserva que ocupa un equipo, tal como la ve el modal "¿Dónde está en uso?" */
export interface BusyUse {
  eventId: string;
  eventType?: string;
  clientName?: string;
  location?: string;
  startDate: string;
  endDate: string;
}

// Hora argentina fija (UTC-03:00), igual que el resto de la app. Se arma a
// mano porque toLocaleDateString cambia el formato según el navegador.
const AR_OFFSET_MS = -3 * 60 * 60 * 1000;
const WEEKDAYS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Rango legible en hora argentina, ej. "sáb 07/11 18:30 → dom 08/11 04:00".
 * Si termina el mismo día: "dom 08/11 13:00 → 18:00".
 */
export function formatUseRange(start: Date | string, end: Date | string): string {
  const ar = (v: Date | string) => new Date(new Date(v).getTime() + AR_OFFSET_MS);
  const day = (d: Date) =>
    `${WEEKDAYS[d.getUTCDay()]} ${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}`;
  const time = (d: Date) => `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
  const s = ar(start);
  const e = ar(end);
  const sameDay = day(s) === day(e);
  return `${day(s)} ${time(s)} → ${sameDay ? '' : day(e) + ' '}${time(e)}`;
}

/**
 * Al editar un evento, ¿qué reserva hay que ignorar para este equipo?
 * Solo la del propio evento, y solo si el equipo NO está guardado en él: esa
 * reserva es una fantasma (quedó de una edición anterior) y no debe bloquear
 * volver a agregarlo. Si el equipo sí está en el evento se sigue mostrando
 * "En Evento" como siempre (no cambian los conteos de stock en pantalla).
 */
export function ghostEventIdToIgnore(
  equipmentId: string,
  eventId: string | null | undefined,
  savedEventEquipmentIds: Set<string>
): string | undefined {
  if (!eventId) return undefined;
  return savedEventEquipmentIds.has(String(equipmentId)) ? undefined : eventId;
}

/**
 * URL de `/api/equipment` en modo evento. `eventId` (opcional) es el evento
 * que se está editando; sin fechas devuelve la URL general.
 */
export function equipmentAvailabilityUrl(
  eventStartDate?: Date | string | null,
  eventEndDate?: Date | string | null,
  eventId?: string | null
): string {
  if (!eventStartDate || !eventEndDate) return '/api/equipment';
  const base = `/api/equipment?eventStartDate=${new Date(eventStartDate).toISOString()}&eventEndDate=${new Date(eventEndDate).toISOString()}`;
  return eventId ? `${base}&excludeEventId=${encodeURIComponent(eventId)}` : base;
}

/**
 * Qué hacer con un equipo que se QUITA de un evento (o cuyo evento se borra),
 * ya sin la reserva de ese evento:
 *  - 'active': tiene otro uso en curso hoy → no se toca
 *  - 'free': figuraba "En Evento" y ya no tiene uso hoy → vuelve a Depósito/Disponible
 *  - 'keep': dado de baja / en reparación / ya disponible → NO se toca
 *    (antes se lo marcaba "Disponible" aunque estuviera roto)
 * Comparación por día (igual que antes), con la fecha del servidor.
 */
export function releaseDecision(
  equipment: { scheduledUses?: ScheduledUse[] | null; outOfService?: LiveEquipmentStatus | null },
  now: Date = new Date()
): 'active' | 'free' | 'keep' {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const hasActiveUse = (equipment.scheduledUses || []).some((use) => {
    const s = new Date(use.startDate);
    const e = new Date(use.endDate);
    s.setHours(0, 0, 0, 0);
    e.setHours(0, 0, 0, 0);
    return today >= s && today <= e;
  });
  if (hasActiveUse) return 'active';
  return equipment.outOfService?.reason === 'En Evento' ? 'free' : 'keep';
}
