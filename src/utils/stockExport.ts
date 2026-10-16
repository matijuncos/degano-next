/**
 * Imprimir / exportar el stock de equipamiento (PDF, Excel, CSV).
 * Lógica pura (testeada): arma las filas con su categoría, filtra por alcance
 * y estado, resume por equipo y genera el CSV. Los precios solo vienen en los
 * datos si el usuario es admin (el servidor los saca para el resto).
 */

const collator = new Intl.Collator('es', { sensitivity: 'base', numeric: true });

export type StockStatus = 'Disponible' | 'En uso' | 'Fuera de servicio';

export interface StockRow {
  categoria: string; // categoría principal
  subcategoria: string; // resto de la ruta ("Strobes" o "Cabezales › Beam")
  nombre: string;
  codigo: string;
  marca: string;
  modelo: string;
  serie: string;
  propiedad: string;
  ubicacion: string;
  estado: StockStatus;
  motivo: string; // motivo de fuera de servicio
  rentalPrice?: number;
  investmentPrice?: number;
}

export interface StockSummaryRow {
  categoria: string;
  subcategoria: string;
  nombre: string;
  total: number;
  disponibles: number;
  enUso: number;
  fueraDeServicio: number;
}

type Cat = { _id: any; name: string; parentId?: any };

/** Ruta de nombres raíz → hoja de cada categoría (a prueba de ciclos). */
export function categoryPaths(categories: Cat[]): Map<string, string[]> {
  const byId = new Map(categories.map((c) => [String(c._id), c]));
  const cache = new Map<string, string[]>();
  const pathOf = (id: string): string[] => {
    if (cache.has(id)) return cache.get(id)!;
    const out: string[] = [];
    const seen = new Set<string>();
    let cur = byId.get(id);
    while (cur && !seen.has(String(cur._id))) {
      seen.add(String(cur._id));
      out.unshift(cur.name);
      cur = cur.parentId ? byId.get(String(cur.parentId)) : undefined;
    }
    cache.set(id, out);
    return out;
  };
  categories.forEach((c) => pathOf(String(c._id)));
  return cache;
}

/** Ids de una categoría y todas sus subcategorías. */
export function categoryWithDescendants(categories: Cat[], rootId: string): Set<string> {
  const children = new Map<string, string[]>();
  categories.forEach((c) => {
    const p = c.parentId ? String(c.parentId) : '';
    children.set(p, [...(children.get(p) || []), String(c._id)]);
  });
  const out = new Set<string>();
  const stack = [String(rootId)];
  while (stack.length) {
    const id = stack.pop()!;
    if (out.has(id)) continue;
    out.add(id);
    stack.push(...(children.get(id) || []));
  }
  return out;
}

export function stockStatus(eq: { outOfService?: { isOut?: boolean; reason?: string | null } | null }): StockStatus {
  if (!eq.outOfService?.isOut) return 'Disponible';
  return eq.outOfService.reason === 'En Evento' ? 'En uso' : 'Fuera de servicio';
}

/**
 * Filas del stock, ordenadas por categoría, nombre y código (orden natural).
 *  - scopeCategoryId: solo esa categoría y sus subcategorías (null = todo)
 *  - includeOutOfService: si es false se omiten los dados de baja/reparación
 */
export function buildStockRows(
  equipment: any[],
  categories: Cat[],
  opts: { scopeCategoryId?: string | null; includeOutOfService: boolean }
): StockRow[] {
  const paths = categoryPaths(categories);
  const scope = opts.scopeCategoryId ? categoryWithDescendants(categories, opts.scopeCategoryId) : null;
  const rows: StockRow[] = [];
  for (const eq of equipment || []) {
    const catId = eq.categoryId ? String(eq.categoryId) : '';
    if (scope && !scope.has(catId)) continue;
    const estado = stockStatus(eq);
    if (!opts.includeOutOfService && estado === 'Fuera de servicio') continue;
    const path = paths.get(catId) || [];
    const row: StockRow = {
      categoria: path[0] || 'Sin categoría',
      subcategoria: path.slice(1).join(' › '),
      nombre: String(eq.name ?? '').trim(),
      codigo: String(eq.code ?? '').trim(),
      marca: String(eq.brand ?? '').trim(),
      modelo: String(eq.model ?? '').trim(),
      serie: String(eq.serialNumber ?? '').trim(),
      propiedad: eq.propiedad || 'Degano',
      ubicacion: String(eq.location ?? '').trim(),
      estado,
      motivo: estado === 'Fuera de servicio' ? String(eq.outOfService?.reason || '').trim() : ''
    };
    if (typeof eq.rentalPrice === 'number') row.rentalPrice = eq.rentalPrice;
    if (typeof eq.investmentPrice === 'number') row.investmentPrice = eq.investmentPrice;
    rows.push(row);
  }
  return rows.sort(
    (a, b) =>
      collator.compare(a.categoria, b.categoria) ||
      collator.compare(a.subcategoria, b.subcategoria) ||
      collator.compare(a.nombre, b.nombre) ||
      collator.compare(a.codigo, b.codigo)
  );
}

/** Resumen por equipo (mismo nombre dentro de la misma categoría). */
export function summarizeStock(rows: StockRow[]): StockSummaryRow[] {
  const map = new Map<string, StockSummaryRow>();
  for (const r of rows) {
    const key = `${r.categoria}|${r.subcategoria}|${r.nombre}`;
    const s =
      map.get(key) ||
      { categoria: r.categoria, subcategoria: r.subcategoria, nombre: r.nombre, total: 0, disponibles: 0, enUso: 0, fueraDeServicio: 0 };
    s.total++;
    if (r.estado === 'Disponible') s.disponibles++;
    else if (r.estado === 'En uso') s.enUso++;
    else s.fueraDeServicio++;
    map.set(key, s);
  }
  return Array.from(map.values()); // ya vienen ordenadas por buildStockRows
}

/** Columnas del detalle; los precios solo si se pueden ver. */
export function stockColumns(withPrices: boolean): { key: keyof StockRow; label: string }[] {
  const cols: { key: keyof StockRow; label: string }[] = [
    { key: 'categoria', label: 'Categoría' },
    { key: 'subcategoria', label: 'Subcategoría' },
    { key: 'nombre', label: 'Nombre' },
    { key: 'codigo', label: 'Código' },
    { key: 'marca', label: 'Marca' },
    { key: 'modelo', label: 'Modelo' },
    { key: 'serie', label: 'N° de serie' },
    { key: 'propiedad', label: 'Propiedad' },
    { key: 'ubicacion', label: 'Ubicación' },
    { key: 'estado', label: 'Estado' },
    { key: 'motivo', label: 'Motivo' }
  ];
  if (withPrices) {
    cols.push({ key: 'rentalPrice', label: 'Precio de renta (ARS)' });
    cols.push({ key: 'investmentPrice', label: 'Precio de inversión (USD)' });
  }
  return cols;
}

/**
 * CSV para Excel en español: separador ';' (el de Excel con configuración
 * regional argentina) y BOM UTF-8 para que respete acentos y ñ.
 */
export function toCsv(rows: Record<string, any>[], columns: { key: string; label: string }[]): string {
  const esc = (v: any) => {
    const s = v === undefined || v === null ? '' : String(v);
    return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [columns.map((c) => esc(c.label)).join(';')];
  for (const r of rows) lines.push(columns.map((c) => esc(r[c.key])).join(';'));
  return '﻿' + lines.join('\r\n');
}

/** "Stock Degano - 15-10-2026" (o con la categoría) */
export function stockFileName(scopeName: string | null, now: Date = new Date()): string {
  const ar = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  const d = `${String(ar.getUTCDate()).padStart(2, '0')}-${String(ar.getUTCMonth() + 1).padStart(2, '0')}-${ar.getUTCFullYear()}`;
  const scope = scopeName ? ` - ${scopeName}` : '';
  return `Stock Degano${scope} - ${d}`.replace(/[\/\\:*?"<>|]/g, '-');
}

// ─────────────────────────────────────────────────────────────────────────
// Paginado manual del PDF (renglones de alto fijo). react-pdf tarda MUCHO en
// partir solo un listado largo (2500 filas ≈ 65 s); armando las hojas acá
// cada hoja ya entra justa y no tiene que partir nada.
// ─────────────────────────────────────────────────────────────────────────

export type StockLine<T> =
  | { kind: 'cat'; text: string }
  | { kind: 'sub'; text: string }
  | { kind: 'th' }
  | { kind: 'row'; row: T };

export const STOCK_LINE_HEIGHTS = { cat: 18, sub: 14, th: 13, row: 12 };

/**
 * Reparte las filas (ya ordenadas por categoría/subcategoría) en hojas.
 *  - Un título (categoría / subcategoría) nunca queda solo al pie: va con su
 *    encabezado de tabla y al menos una fila.
 *  - Si una tabla se corta, la hoja siguiente arranca con
 *    "Categoría › Sub (cont.)" + encabezado de tabla.
 *  - firstBudget: alto útil de la primera hoja (tiene los totales arriba).
 */
export function paginateStockLines<T extends { categoria: string; subcategoria: string }>(
  rows: T[],
  opts: { budget: number; firstBudget: number; heights?: typeof STOCK_LINE_HEIGHTS }
): StockLine<T>[][] {
  const H = opts.heights ?? STOCK_LINE_HEIGHTS;
  const pages: StockLine<T>[][] = [[]];
  let used = 0;
  let budget = opts.firstBudget;
  const newPage = () => {
    pages.push([]);
    used = 0;
    budget = opts.budget;
  };
  const push = (l: StockLine<T>) => {
    pages[pages.length - 1].push(l);
    used += H[l.kind];
  };
  let curCat = '';
  let curSub: string | null = null;
  for (const r of rows) {
    const newCat = r.categoria !== curCat;
    const newSub = newCat || r.subcategoria !== curSub;
    if (newSub) {
      // Bloque de títulos + encabezado + 1 fila: no se separa
      const block = (newCat ? H.cat : 0) + (r.subcategoria ? H.sub : 0) + H.th + H.row;
      if (used + block > budget && used > 0) newPage();
      if (newCat) push({ kind: 'cat', text: r.categoria });
      if (r.subcategoria) push({ kind: 'sub', text: r.subcategoria });
      push({ kind: 'th' });
      curCat = r.categoria;
      curSub = r.subcategoria;
    } else if (used + H.row > budget) {
      // La tabla sigue en otra hoja: título de continuación + encabezado
      newPage();
      push({ kind: 'sub', text: `${[r.categoria, r.subcategoria].filter(Boolean).join(' › ')} (cont.)` });
      push({ kind: 'th' });
    }
    push({ kind: 'row', row: r });
  }
  return pages[0].length || pages.length > 1 ? pages : [[]];
}
