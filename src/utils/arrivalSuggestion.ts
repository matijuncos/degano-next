// src/utils/arrivalSuggestion.ts
// Sugerencia de llegada (staff y equipamiento) en Nuevo evento: el día del
// evento, SUGGESTED_ARRIVAL_HOURS_BEFORE horas antes del inicio (hora argentina).
// Es solo una sugerencia: se completa si la llegada está vacía y se actualiza si
// cambia el horario del evento MIENTRAS siga con el valor sugerido; si la
// cambiaron a mano, no se toca. Si no la modifican, queda ese valor (pedido de
// Juan, 15/11/2026). Lógica pura y testeada.

export const SUGGESTED_ARRIVAL_HOURS_BEFORE = 2;

const AR_OFFSET_MS = 3 * 60 * 60 * 1000; // Argentina: UTC-03:00 fijo

export interface ArrivalValue {
  day?: string | null; // 'YYYY-MM-DD'
  time?: string | null; // 'HH:mm'
}

export function suggestedArrival(eventStart: unknown): { day: string; time: string } | null {
  if (eventStart == null || eventStart === '') return null;
  const t = new Date(eventStart as any).getTime();
  if (!Number.isFinite(t)) return null;
  const ar = new Date(t - SUGGESTED_ARRIVAL_HOURS_BEFORE * 60 * 60 * 1000 - AR_OFFSET_MS).toISOString();
  return { day: ar.slice(0, 10), time: ar.slice(11, 16) };
}

const same = (a: ArrivalValue, b: { day: string; time: string } | null) =>
  !!b && (a.day || '') === b.day && (a.time || '') === b.time;

/**
 * Qué poner en la llegada cuando cambia el inicio del evento (prevStart → newStart),
 * o null si no hay que tocarla.
 */
export function nextArrival(
  current: ArrivalValue,
  prevStart: unknown,
  newStart: unknown
): { day: string; time: string } | null {
  const next = suggestedArrival(newStart);
  if (!next) return null;
  const empty = !current.day && !current.time;
  const stillSuggested = same(current, suggestedArrival(prevStart));
  if (!empty && !stillSuggested) return null; // cargada a mano
  if (same(current, next)) return null; // ya está
  return next;
}
