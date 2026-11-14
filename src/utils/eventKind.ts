// src/utils/eventKind.ts
// Tipo de evento: "evento" (el de siempre) o "alquiler" (Degano alquila equipos
// a terceros). El alquiler es un evento completo (stock, staff, presupuesto)
// pero SIN Show, Música, Timing ni Archivos. Lógica pura y testeada: la usan el
// front (pestañas, navegación, secciones, colores) y el servidor.
// Sin campo `eventKind` (todos los eventos viejos) = evento. El tipo lo define
// SOLO `eventKind`, nunca el texto de "Tipo de evento" (`type`).
import { EVENT_TABS } from '@/context/config';
import { fileInFolder } from '@/utils/eventScope';

export type EventKind = 'evento' | 'alquiler';

export const eventKindOf = (ev: Record<string, any> | null | undefined): EventKind =>
  ev?.eventKind === 'alquiler' ? 'alquiler' : 'evento';

export const isRental = (ev: Record<string, any> | null | undefined) => eventKindOf(ev) === 'alquiler';

// Campos de Show, Música, Timing y Archivos, y los horarios de ceremonia
// (iglesia / civil): un alquiler no los guarda.
// `folderId` NO va acá: postEvent lo usa para no duplicar en un reintento.
export const RENTAL_HIDDEN_FIELDS = [
  'bands',
  'music',
  'playlist',
  'welcomeSongs',
  'walkIn',
  'vals',
  'openingPartySong',
  'openingPartySongs',
  'closingSongs',
  'customMoments',
  'ceremoniaCivil',
  'ceremoniaExtra',
  'ambienceMusic',
  'timing',
  'files',
  'churchDate',
  'civil'
] as const;

// Horarios de ceremonia: no tienen sentido en un alquiler (ni se ofrecen para cargar)
export const RENTAL_CEREMONY_FIELDS = ['churchDate', 'civil'] as const;

// Orden de las pestañas en pantalla (Archivos va antes de Presupuesto aunque su
// número sea mayor)
const TAB_ORDER = [
  EVENT_TABS.CLIENT,
  EVENT_TABS.EVENT,
  EVENT_TABS.SHOW,
  EVENT_TABS.MUSIC,
  EVENT_TABS.TIMING,
  EVENT_TABS.MORE_INFO,
  EVENT_TABS.EQUIPMENT,
  EVENT_TABS.STAFF,
  EVENT_TABS.FILES,
  EVENT_TABS.PAYMENT
];
const RENTAL_HIDDEN_TABS = new Set<number>([EVENT_TABS.SHOW, EVENT_TABS.MUSIC, EVENT_TABS.TIMING, EVENT_TABS.FILES]);

export const tabsFor = (kind: EventKind): number[] =>
  kind === 'alquiler' ? TAB_ORDER.filter((t) => !RENTAL_HIDDEN_TABS.has(t)) : [...TAB_ORDER];

/**
 * Los formularios llaman a una pestaña fija (ej. EventForm → Show). Si esa
 * pestaña no existe para el tipo, se sigue en la misma dirección hasta una que sí.
 */
export function resolveTab(target: number, from: number, kind: EventKind): number {
  const valid = tabsFor(kind);
  if (valid.includes(target)) return target;
  const forward = TAB_ORDER.indexOf(target) > TAB_ORDER.indexOf(from);
  const start = TAB_ORDER.indexOf(target);
  for (let i = start; i >= 0 && i < TAB_ORDER.length; i += forward ? 1 : -1) {
    if (valid.includes(TAB_ORDER[i])) return TAB_ORDER[i];
  }
  return EVENT_TABS.CLIENT;
}

// Pestaña de un borrador restaurado: si el tipo no la tiene, Cliente
export const restoreTab = (saved: number, kind: EventKind): number =>
  tabsFor(kind).includes(saved) ? saved : EVENT_TABS.CLIENT;

// La pantalla Evento / Alquiler aparece solo sin borrador (uno viejo sin tipo = evento)
export const needsKindChoice = (draft: { event?: { eventKind?: unknown } } | null | undefined) => !draft;

export function stripRentalFields<T extends object>(body: T): T {
  const out: any = { ...body };
  for (const f of RENTAL_HIDDEN_FIELDS) delete out[f];
  return out;
}

const hasContent = (v: unknown): boolean => {
  if (v == null) return false;
  if (typeof v === 'string') return v.trim() !== '';
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'object') return Object.values(v as object).some(hasContent);
  return false;
};

// ¿Hay algo cargado en Show / Música / Timing / Archivos? (para avisar antes de pasar a alquiler)
export function hasRentalHiddenData(ev: Record<string, any>): { any: boolean; files: { url: string }[] } {
  const files = Array.isArray(ev.files) ? ev.files : [];
  return { any: RENTAL_HIDDEN_FIELDS.some((f) => hasContent(ev[f])), files };
}

// updateEvent: el tipo queda fijo una vez creado; un alquiler no guarda esas secciones
export function sanitizeKindUpdate<T extends object>(body: T, storedKind: EventKind): T {
  const out: any = { ...body };
  delete out.eventKind;
  return storedKind === 'alquiler' ? stripRentalFields(out) : out;
}

// Calendario: cobre (no se parece a ningún calendario que Juan usa: elegido el 14/11/2026), con
// la misma lógica de estado que los verdes de los eventos
const RENTAL_COLORS = {
  future: { backgroundColor: '#a0522d', borderColor: '#7f4024' },
  current: { backgroundColor: '#c0703f', borderColor: '#a0522d' },
  past: { backgroundColor: '#5e3420', borderColor: '#46261a' }
} as const;
export const rentalEventColors = (status: 'past' | 'current' | 'future') => ({ ...RENTAL_COLORS[status] });

// El tipo se puede cambiar solo mientras se crea: un evento con _id ya existe
export const canChangeKind = (ev: { _id?: unknown } | null | undefined) => !ev?._id;

// Poner el tipo: en alquiler, "Tipo de evento" vacío → "Alquiler"; al volver a
// evento, el "Alquiler" precargado se limpia. Un tipo escrito no se pisa.
export function withKind<T extends { type?: string }>(data: T, next: EventKind): T & { eventKind: EventKind } {
  const current = data.type ?? '';
  const type =
    next === 'alquiler' && !current.trim() ? 'Alquiler' : next === 'evento' && current === 'Alquiler' ? '' : current;
  return { ...data, type, eventKind: next };
}

/**
 * Borra de S3 los archivos subidos antes de crear (al pasar a alquiler). Solo
 * los de la carpeta propia del formulario (`fileInFolder`); un 4xx/5xx o un
 * error de red cuenta como fallado (esos quedan en el formulario).
 */
export async function deleteOwnFiles(
  files: { url: string }[],
  folderId: string | undefined,
  del: (url: string) => Promise<{ ok: boolean }>
): Promise<{ deleted: string[]; failed: string[] }> {
  const own = files.filter((f) => fileInFolder(f.url, folderId));
  const results = await Promise.all(
    own.map(async (f) => {
      try {
        return { url: f.url, ok: (await del(f.url)).ok };
      } catch {
        return { url: f.url, ok: false };
      }
    })
  );
  return {
    deleted: results.filter((r) => r.ok).map((r) => r.url),
    failed: results.filter((r) => !r.ok).map((r) => r.url)
  };
}
