// src/utils/reservationRange.ts
// Rango de la RESERVA de equipos de un evento y aviso de eventos muy pegados.
//
// - La reserva arranca con la LLEGADA DEL EQUIPAMIENTO (equipmentArrivalDate +
//   equipmentArrivalTime, hora argentina) cuando está cargada y es antes del
//   inicio; si no, con el inicio del evento. Termina con el fin del evento.
// - Tope contra errores de tipeo: si la llegada es más de MAX_ARRIVAL_LEAD_DAYS
//   antes, solo se usa si el usuario lo CONFIRMÓ para esas fechas
//   (`equipmentArrivalConfirmedFor` = arrivalConfirmKey). Si cambia la llegada o
//   la fecha del evento, la confirmación deja de valer sola.
// - nearUses: otro evento que termina / empieza a menos de NEAR_EVENT_HOURS de
//   esta reserva (sin superponerse): AVISO, no bloqueo.
// Lógica pura y testeada. La usan el front (disponibilidad, avisos) y el
// servidor (reservas, choques).

export const MAX_ARRIVAL_LEAD_DAYS = 3;
export const NEAR_EVENT_HOURS = 6;

const HOUR_MS = 60 * 60 * 1000;
const AR_OFFSET_MS = 3 * HOUR_MS; // Argentina: UTC-03:00 fijo

export interface ArrivalFields {
  date?: unknown; // inicio del evento
  endDate?: unknown;
  equipmentArrivalDate?: unknown; // 'YYYY-MM-DD' o Date (medianoche AR)
  equipmentArrivalTime?: unknown; // 'HH:mm'
  equipmentArrivalConfirmedFor?: unknown;
}

const toTime = (v: unknown): number => (v == null || v === '' ? NaN : new Date(v as any).getTime());

// Día argentino ('YYYY-MM-DD') de una fecha guardada como texto o Date
function arDay(v: unknown): string | null {
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) && v.length <= 10) return v.slice(0, 10);
  const t = toTime(v);
  if (!Number.isFinite(t)) return null;
  return new Date(t - AR_OFFSET_MS).toISOString().slice(0, 10);
}

/** Momento de llegada del equipamiento, o null si no está cargada / es inválida. */
export function arrivalStart(ev: ArrivalFields): Date | null {
  const day = arDay(ev.equipmentArrivalDate);
  if (!day) return null;
  const time = typeof ev.equipmentArrivalTime === 'string' && /^\d{2}:\d{2}$/.test(ev.equipmentArrivalTime) ? ev.equipmentArrivalTime : '00:00';
  const t = new Date(`${day}T${time}:00.000-03:00`);
  return Number.isFinite(t.getTime()) ? t : null;
}

/** Clave de "para qué fechas se confirmó" una llegada anticipada. */
export function arrivalConfirmKey(ev: ArrivalFields): string {
  const a = arrivalStart(ev);
  const s = toTime(ev.date);
  return `${a ? a.toISOString() : ''}|${Number.isFinite(s) ? new Date(s).toISOString() : ''}`;
}

// Llegada válida, antes del inicio y más anticipada que el tope
function exceedsLead(ev: ArrivalFields): boolean {
  const a = arrivalStart(ev);
  const s = toTime(ev.date);
  if (!a || !Number.isFinite(s) || a.getTime() >= s) return false;
  return s - a.getTime() > MAX_ARRIVAL_LEAD_DAYS * 24 * HOUR_MS;
}

/** ¿La llegada es más de 3 días antes y no se confirmó para estas fechas? */
export function needsArrivalConfirm(ev: ArrivalFields): boolean {
  return exceedsLead(ev) && ev.equipmentArrivalConfirmedFor !== arrivalConfirmKey(ev);
}

/** Inicio de la reserva de equipos del evento. */
export function reservationStart(ev: ArrivalFields): Date {
  const s = new Date(ev.date as any);
  const a = arrivalStart(ev);
  if (!a || !Number.isFinite(s.getTime()) || a.getTime() >= s.getTime()) return s;
  if (needsArrivalConfirm(ev)) return s; // anticipación grande sin confirmar
  return a;
}

/** Inicio de la reserva como ISO, o undefined si las fechas del evento no son válidas (para la UI). */
export function reservationStartIso(ev: ArrivalFields | null | undefined): string | undefined {
  if (!ev?.date) return undefined;
  const r = reservationStart(ev);
  return Number.isFinite(r.getTime()) ? r.toISOString() : undefined;
}

/** Días (redondeados) entre la llegada y el inicio del evento, para el aviso. */
export function arrivalLeadDays(ev: ArrivalFields): number {
  const a = arrivalStart(ev);
  const s = toTime(ev.date);
  if (!a || !Number.isFinite(s)) return 0;
  return Math.round((s - a.getTime()) / (24 * HOUR_MS));
}

export type NearSide = 'antes' | 'despues';

/** Reservas (de OTROS eventos) que quedan a menos de NEAR_EVENT_HOURS de esta, sin superponerse. */
export function nearUses<T extends { eventId?: unknown; startDate?: unknown; endDate?: unknown }>(
  uses: T[] | null | undefined,
  start: unknown,
  end: unknown,
  ignoreEventId?: string | null
): { use: T; side: NearSide; gapHours: number }[] {
  const s = toTime(start);
  const e = toTime(end);
  if (!Number.isFinite(s) || !Number.isFinite(e)) return [];
  const limit = NEAR_EVENT_HOURS * HOUR_MS;
  const out: { use: T; side: NearSide; gapHours: number }[] = [];
  for (const u of uses ?? []) {
    if (!u || (ignoreEventId && String(u.eventId) === String(ignoreEventId))) continue;
    const us = toTime(u.startDate);
    const ue = toTime(u.endDate);
    if (!Number.isFinite(us) || !Number.isFinite(ue)) continue;
    if (us < e && ue > s) continue; // se superponen: eso es choque, no aviso
    if (ue <= s && s - ue < limit) out.push({ use: u, side: 'antes', gapHours: Math.round(((s - ue) / HOUR_MS) * 10) / 10 });
    else if (us >= e && us - e < limit) out.push({ use: u, side: 'despues', gapHours: Math.round(((us - e) / HOUR_MS) * 10) / 10 });
  }
  return out;
}

const WEEKDAYS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const pad = (n: number) => String(n).padStart(2, '0');
/** "dom 01/11 15:00" en hora argentina (armado a mano: igual en todos los navegadores). */
export function arDateTimeLabel(v: unknown): string {
  const t = toTime(v);
  if (!Number.isFinite(t)) return '';
  const d = new Date(t - AR_OFFSET_MS);
  return `${WEEKDAYS[d.getUTCDay()]} ${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}
