import { describe, it, expect } from 'vitest';
import {
  categoryPaths,
  categoryWithDescendants,
  buildStockRows,
  summarizeStock,
  stockColumns,
  toCsv,
  stockFileName,
  stockStatus,
  paginateStockLines
} from './stockExport';

const categories = [
  { _id: 'ilu', name: 'ILUMINACION' },
  { _id: 'str', name: 'Strobes', parentId: 'ilu' },
  { _id: 'son', name: 'SONIDO' },
  { _id: 'par', name: 'Parlantes', parentId: 'son' },
  { _id: 'act', name: 'Activos', parentId: 'par' }
];
const eq = [
  { _id: '1', name: 'Strobe 1500', code: 'ST-10', categoryId: 'str', outOfService: { isOut: false } },
  { _id: '2', name: 'Strobe 1500', code: 'ST-2', categoryId: 'str', outOfService: { isOut: true, reason: 'En Evento' } },
  { _id: '3', name: 'Yamaha 15', code: 'PA-1', categoryId: 'act', brand: 'Yamaha', outOfService: { isOut: true, reason: 'Reparación' }, rentalPrice: 100000 },
  { _id: '4', name: 'Sin cat', code: 'X-1', categoryId: 'nope' }
];

describe('categorías', () => {
  it('ruta raíz → hoja', () => {
    expect(categoryPaths(categories).get('act')).toEqual(['SONIDO', 'Parlantes', 'Activos']);
  });
  it('no se cuelga con un ciclo', () => {
    const loop = [{ _id: 'a', name: 'A', parentId: 'b' }, { _id: 'b', name: 'B', parentId: 'a' }];
    expect(categoryPaths(loop).get('a')!.length).toBeLessThanOrEqual(2);
  });
  it('categoría con todas sus subcategorías', () => {
    expect([...categoryWithDescendants(categories, 'son')].sort()).toEqual(['act', 'par', 'son']);
  });
});

describe('buildStockRows', () => {
  it('todo el stock, ordenado por categoría, nombre y código natural', () => {
    const rows = buildStockRows(eq, categories, { includeOutOfService: true });
    expect(rows.map((r) => r.codigo)).toEqual(['ST-2', 'ST-10', 'X-1', 'PA-1']);
    expect(rows[0]).toMatchObject({ categoria: 'ILUMINACION', subcategoria: 'Strobes', estado: 'En uso' });
    expect(rows[3]).toMatchObject({ categoria: 'SONIDO', subcategoria: 'Parlantes › Activos', estado: 'Fuera de servicio', motivo: 'Reparación', marca: 'Yamaha' });
    expect(rows[2].categoria).toBe('Sin categoría');
  });
  it('solo una categoría (con subcategorías)', () => {
    expect(buildStockRows(eq, categories, { scopeCategoryId: 'son', includeOutOfService: true }).map((r) => r.codigo)).toEqual(['PA-1']);
  });
  it('sin los fuera de servicio (los "en uso" se mantienen)', () => {
    const rows = buildStockRows(eq, categories, { includeOutOfService: false });
    expect(rows.map((r) => r.codigo)).toEqual(['ST-2', 'ST-10', 'X-1']);
  });
  it('precios solo si vienen en los datos (admin)', () => {
    const rows = buildStockRows(eq, categories, { includeOutOfService: true });
    expect(rows.find((r) => r.codigo === 'PA-1')!.rentalPrice).toBe(100000);
    expect('rentalPrice' in rows.find((r) => r.codigo === 'ST-2')!).toBe(false);
  });
});

describe('summarizeStock', () => {
  it('cuenta por equipo y estado', () => {
    const s = summarizeStock(buildStockRows(eq, categories, { includeOutOfService: true }));
    expect(s.find((x) => x.nombre === 'Strobe 1500')).toMatchObject({ total: 2, disponibles: 1, enUso: 1, fueraDeServicio: 0 });
    expect(s.find((x) => x.nombre === 'Yamaha 15')).toMatchObject({ total: 1, fueraDeServicio: 1 });
  });
});

describe('estado / columnas / CSV / nombre', () => {
  it('estado', () => {
    expect(stockStatus({})).toBe('Disponible');
    expect(stockStatus({ outOfService: { isOut: true, reason: '' } })).toBe('Fuera de servicio');
  });
  it('columnas de precio solo con permiso', () => {
    expect(stockColumns(false).some((c) => c.key === 'rentalPrice')).toBe(false);
    expect(stockColumns(true).some((c) => c.key === 'rentalPrice')).toBe(true);
  });
  it('CSV con BOM, ; y comillas cuando hace falta', () => {
    const csv = toCsv([{ a: 'Truss 3 Mts.; 24"', b: 'ñandú' }], [{ key: 'a', label: 'A' }, { key: 'b', label: 'B' }]);
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv).toBe('﻿A;B\r\n"Truss 3 Mts.; 24""";ñandú');
  });
  it('nombre de archivo con fecha argentina', () => {
    expect(stockFileName(null, new Date('2026-10-16T02:00:00Z'))).toBe('Stock Degano - 15-10-2026');
    expect(stockFileName('SONIDO', new Date('2026-10-15T15:00:00Z'))).toBe('Stock Degano - SONIDO - 15-10-2026');
  });
});

describe('paginateStockLines', () => {
  const H = { cat: 18, sub: 14, th: 13, row: 12 };
  const mk = (n: number, cat = 'SONIDO', sub = 'Parlantes') =>
    Array.from({ length: n }, (_, i) => ({ categoria: cat, subcategoria: sub, id: i }));
  const heightOf = (p: any[]) => p.reduce((s, l) => s + (H as any)[l.kind], 0);

  it('ninguna hoja se pasa del alto y no se pierde ninguna fila', () => {
    const rows = [...mk(150), ...mk(40, 'VIDEO', ''), ...mk(3, 'VIDEO', 'Pantallas')];
    const pages = paginateStockLines(rows, { budget: 200, firstBudget: 150, heights: H });
    pages.forEach((p, i) => expect(heightOf(p)).toBeLessThanOrEqual(i === 0 ? 150 : 200));
    const ids = pages.flat().filter((l: any) => l.kind === 'row').map((l: any) => `${l.row.categoria}-${l.row.subcategoria}-${l.row.id}`);
    expect(ids).toHaveLength(rows.length);
    expect(new Set(ids).size).toBe(rows.length);
  });
  it('cada hoja con filas arranca con un encabezado de tabla (o títulos + encabezado)', () => {
    const pages = paginateStockLines(mk(100), { budget: 200, firstBudget: 200, heights: H });
    pages.forEach((p) => {
      const firstRow = p.findIndex((l: any) => l.kind === 'row');
      expect(p.slice(0, firstRow).some((l: any) => l.kind === 'th')).toBe(true);
    });
    expect((pages[1][0] as any).text).toBe('SONIDO › Parlantes (cont.)');
  });
  it('un título nunca queda solo al pie de la hoja', () => {
    const rows = [...mk(10), ...mk(5, 'VIDEO', 'Pantallas')];
    const pages = paginateStockLines(rows, { budget: 190, firstBudget: 190, heights: H });
    pages.forEach((p) => {
      const last = p[p.length - 1] as any;
      expect(last.kind).toBe('row');
    });
  });
  it('sin filas: una hoja vacía', () => {
    expect(paginateStockLines([], { budget: 200, firstBudget: 150 })).toEqual([[]]);
  });
});
