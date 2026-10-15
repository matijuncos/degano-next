/**
 * Borrador del formulario de Nuevo Evento (para no perder lo cargado si se
 * vuelve atrás o se cierra la pestaña por error en plena carga).
 *
 * Se guarda TODO el evento tal cual lo tiene el formulario, en dos partes:
 *  - `event`: todo menos `equipment` (liviano, se escribe en cada cambio)
 *  - `equipment`: los equipos completos (pesado: cada uno trae sus reservas;
 *    se escribe solo cuando cambia la lista)
 * Las fechas (`Date`) se marcan al guardar para volver a ser `Date` al leer.
 */

export const DRAFT_VERSION = 1;
// Es para recuperar en el momento, no para retomar otro día
export const DRAFT_TTL_MS = 4 * 60 * 60 * 1000;

export interface DraftMeta {
  v: number;
  savedAt: number; // epoch ms
  tab: number; // tab del formulario donde estaban
}

export function draftKeys(userId: string) {
  const base = `degano:newEventDraft:${userId}`;
  return { meta: `${base}:meta`, event: `${base}:event`, equipment: `${base}:equipment` };
}

const DATE_TAG = '__date';

/** JSON que conserva los `Date` (incluso inválidos). */
export function encodeDraft(value: unknown): string {
  return JSON.stringify(value, function (this: any, key: string, v: any) {
    const raw = this[key];
    if (raw instanceof Date) {
      return { [DATE_TAG]: isNaN(raw.getTime()) ? null : raw.toISOString() };
    }
    return v;
  });
}

export function decodeDraft<T = any>(text: string): T {
  return JSON.parse(text, (_key, v) => {
    if (v && typeof v === 'object' && !Array.isArray(v) && DATE_TAG in v && Object.keys(v).length === 1) {
      return v[DATE_TAG] === null ? new Date(NaN) : new Date(v[DATE_TAG]);
    }
    return v;
  });
}

/** Separa los equipos (pesados) del resto del evento. */
export function splitEventForDraft<T extends Record<string, any>>(event: T) {
  const { equipment, ...rest } = event;
  return { rest, equipment: equipment ?? [] };
}

export function isDraftUsable(meta: DraftMeta | null | undefined, now: number): boolean {
  return !!meta && meta.v === DRAFT_VERSION && now - meta.savedAt <= DRAFT_TTL_MS && now >= meta.savedAt - 60_000;
}

/** "hace un momento" / "hace 5 min" / "hace 2 h" */
export function draftAgeLabel(savedAt: number, now: number): string {
  const min = Math.max(0, Math.round((now - savedAt) / 60_000));
  if (min < 1) return 'hace un momento';
  if (min < 60) return `hace ${min} min`;
  return `hace ${Math.floor(min / 60)} h`;
}

/**
 * Quita lo que no es contenido cargado: undefined, null, '', 0, false, listas
 * y objetos vacíos (recursivo). Los formularios agregan campos vacíos al
 * montarse; eso no cuenta como "algo cargado".
 */
export function stripEmpty(value: any): any {
  if (value instanceof Date) return isNaN(value.getTime()) ? undefined : value;
  if (Array.isArray(value)) {
    const arr = value.map(stripEmpty).filter((v) => v !== undefined);
    return arr.length ? arr : undefined;
  }
  if (value && typeof value === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      const s = stripEmpty(v);
      if (s !== undefined) out[k] = s;
    }
    return Object.keys(out).length ? out : undefined;
  }
  if (value === null || value === undefined || value === '' || value === 0 || value === false) return undefined;
  if (typeof value === 'string' && value.trim() === '') return undefined;
  return value;
}

/** ¿El usuario cargó algo respecto del estado inicial? (ignora folderId) */
export function hasDraftContent(event: Record<string, any>, pristine: Record<string, any>): boolean {
  const { folderId: _a, ...a } = event || {};
  const { folderId: _b, ...b } = pristine || {};
  return JSON.stringify(stripEmpty(a) ?? null) !== JSON.stringify(stripEmpty(b) ?? null);
}
