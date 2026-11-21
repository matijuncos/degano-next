// src/utils/bulkPrice.ts
// Aumento masivo de precios de equipamiento (SOLO admin). Lógica pura y testeada.
// - Precio nuevo EXACTO (sin redondeos): porcentaje o monto fijo a sumar.
// - En la vista previa se agrupan las unidades con mismo nombre y mismos precios;
//   la persona puede tipear otro precio por grupo y gana lo tipeado.
// - Los equipos sin ese precio cargado no se tocan (no se inventan precios).
// - Deshacer el último aumento: vuelve al precio anterior solo lo que sigue con
//   el precio del aumento (si alguien lo editó después, no se pisa).
import { categoryPaths, categoryWithDescendants } from './stockExport';

export type PriceField = 'rentalPrice' | 'investmentPrice';
export type IncreaseMode = 'percent' | 'fixed';

const round2 = (n: number) => Math.round(n * 100) / 100;
const isPrice = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;

/** Precio nuevo exacto (2 decimales como máximo, nunca negativo), o null si no había precio. */
export function computeNewPrice(current: unknown, mode: IncreaseMode, value: number): number | null {
  if (!isPrice(current) || !Number.isFinite(value)) return null;
  const next = mode === 'percent' ? current * (1 + value / 100) : current + value;
  return Math.max(0, round2(next));
}

export interface PreviewGroup {
  key: string;
  name: string;
  path: string;
  ids: string[];
  prices: Partial<Record<PriceField, { old: number; new: number }>>;
}

const collator = new Intl.Collator('es', { sensitivity: 'base', numeric: true });

export function previewGroups(
  equipment: any[] | null | undefined,
  categories: { _id: any; name: string; parentId?: any }[],
  opts: { categoryIds: string[]; fields: PriceField[]; mode: IncreaseMode; value: number }
): PreviewGroup[] {
  if (!Array.isArray(equipment) || !opts.fields.length) return [];
  const paths = categoryPaths(categories || []);
  const scope = opts.categoryIds.length
    ? new Set(opts.categoryIds.flatMap((id) => Array.from(categoryWithDescendants(categories || [], id))))
    : null;
  const groups = new Map<string, PreviewGroup>();
  for (const eq of equipment) {
    const catId = eq?.categoryId ? String(eq.categoryId) : '';
    if (scope && !scope.has(catId)) continue;
    const prices: PreviewGroup['prices'] = {};
    for (const f of opts.fields) {
      const next = computeNewPrice(eq?.[f], opts.mode, opts.value);
      if (next !== null) prices[f] = { old: eq[f], new: next };
    }
    if (!Object.keys(prices).length) continue; // sin precios a cambiar
    const name = String(eq?.name || 'Sin nombre');
    const key = [catId, name, eq?.rentalPrice ?? '', eq?.investmentPrice ?? ''].join('|');
    const g = groups.get(key);
    if (g) g.ids.push(String(eq._id));
    else groups.set(key, { key, name, path: (paths.get(catId) || ['Sin categoría']).join(' › '), ids: [String(eq._id)], prices });
  }
  const firstOld = (g: PreviewGroup) => g.prices.rentalPrice?.old ?? g.prices.investmentPrice?.old ?? 0;
  return Array.from(groups.values()).sort(
    (a, b) => collator.compare(a.path, b.path) || collator.compare(a.name, b.name) || firstOld(a) - firstOld(b)
  );
}

/** Clave de un precio editado a mano en la vista previa. */
export const overrideKey = (groupKey: string, field: PriceField) => `${groupKey}|${field}`;

/** Precios esperados en la base (los que vio la vista previa): el servidor no aplica si cambiaron. */
export type PriceChange = { _id: string; expected: Partial<Record<PriceField, number>> } & Partial<Record<PriceField, number>>;

/** Cambios por unidad: lo tipeado gana; si el precio final queda igual al actual, no se manda. */
export function buildChanges(groups: PreviewGroup[], overrides: Record<string, number | null | undefined>): PriceChange[] {
  const out: PriceChange[] = [];
  for (const g of groups) {
    const set: Partial<Record<PriceField, number>> = {};
    const expected: Partial<Record<PriceField, number>> = {};
    for (const [f, p] of Object.entries(g.prices) as [PriceField, { old: number; new: number }][]) {
      const typed = overrides[overrideKey(g.key, f)];
      const next = isPrice(typed) ? round2(typed) : p.new;
      if (next !== p.old) {
        set[f] = next;
        expected[f] = p.old;
      }
    }
    if (!Object.keys(set).length) continue;
    for (const id of g.ids) out.push({ _id: id, ...set, expected: { ...expected } });
  }
  return out;
}

export interface BatchChange {
  _id: string;
  old: Partial<Record<PriceField, number>>;
  new: Partial<Record<PriceField, number>>;
}

/** Deshacer: solo lo que sigue con el precio del aumento; lo editado después (o borrado) se saltea. */
export function planUndo(batch: BatchChange[], current: any[]) {
  const byId = new Map((current || []).map((e) => [String(e._id), e]));
  const restore: { _id: string; set: Partial<Record<PriceField, number>>; from: Partial<Record<PriceField, number>> }[] = [];
  const skipped: string[] = [];
  for (const c of batch) {
    const eq = byId.get(String(c._id));
    const fields = Object.keys(c.new) as PriceField[];
    const untouched = !!eq && fields.every((f) => eq[f] === c.new[f]);
    if (!untouched) {
      skipped.push(String(c._id));
      continue;
    }
    const set: Partial<Record<PriceField, number>> = {};
    for (const f of fields) if (c.old[f] !== undefined) set[f] = c.old[f]!;
    restore.push({ _id: String(c._id), set, from: { ...c.new } });
  }
  return { restore, skipped };
}

const FIELDS: PriceField[] = ['rentalPrice', 'investmentPrice'];

/** ¿El equipo tiene hoy exactamente esos precios? */
export function stillAt(eq: any, prices: Partial<Record<PriceField, number>>): boolean {
  return !!eq && (Object.keys(prices) as PriceField[]).every((f) => eq[f] === prices[f]);
}

/**
 * Servidor, al aplicar: el precio ANTERIOR sale de la base y tiene que ser el que
 * vio la vista previa (`expected`). Si no (lo editaron en el medio, o la vista
 * previa usó datos viejos) → `stale` y no se aplica nada de ese equipo.
 * Nunca se inventa un precio que el equipo no tenía.
 */
export function planApply(wanted: any[], current: any[]): { changes: BatchChange[]; stale: string[] } {
  const byId = new Map((current || []).map((e) => [String(e._id), e]));
  const changes: BatchChange[] = [];
  const stale: string[] = [];
  for (const w of wanted || []) {
    const id = String(w?._id);
    const eq = byId.get(id);
    const ch: BatchChange = { _id: id, old: {}, new: {} };
    let ok = !!eq;
    for (const f of FIELDS) {
      if (!ok || !isPrice(w?.[f])) continue;
      const exp = w?.expected?.[f];
      if (!isPrice(exp) || !isPrice(eq[f]) || eq[f] !== exp) {
        ok = false;
        continue;
      }
      const next = round2(w[f]);
      if (next === eq[f]) continue;
      ch.old[f] = eq[f];
      ch.new[f] = next;
    }
    if (!ok) stale.push(id);
    else if (Object.keys(ch.new).length) changes.push(ch);
  }
  return { changes, stale };
}
