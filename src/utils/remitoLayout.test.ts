import { describe, it, expect } from 'vitest';
import { paginateRemitoRows, remitoDateParts, REMITO_ROWS, MIN_LAST_ROWS } from './remitoLayout';

const sum = (pages: { count: number }[]) => pages.reduce((s, p) => s + p.count, 0);

describe('paginateRemitoRows', () => {
  it('pocos ítems: una hoja, completada con renglones vacíos', () => {
    const p = paginateRemitoRows(7);
    expect(p).toEqual([{ from: 0, count: 7, blanks: REMITO_ROWS.firstWithFooter - 7, isLast: true }]);
  });
  it('sin ítems: una hoja con todos los renglones vacíos', () => {
    expect(paginateRemitoRows(0)[0]).toMatchObject({ count: 0, blanks: REMITO_ROWS.firstWithFooter, isLast: true });
  });
  it('justo el máximo de una hoja entra en una', () => {
    expect(paginateRemitoRows(REMITO_ROWS.firstWithFooter)).toHaveLength(1);
  });
  it('uno más: pasa a dos hojas y no se pierde ningún ítem', () => {
    const n = REMITO_ROWS.firstWithFooter + 1;
    const p = paginateRemitoRows(n);
    expect(p).toHaveLength(2);
    expect(sum(p)).toBe(n);
    expect(p[0].isLast).toBe(false);
    expect(p[1].isLast).toBe(true);
    expect(p[1].from).toBe(p[0].count);
  });
  it('muchos ítems: hojas continuas, sin huecos ni repetidos, la última con pie', () => {
    for (const n of [80, 150, 300]) {
      const p = paginateRemitoRows(n);
      expect(sum(p)).toBe(n);
      p.slice(1).forEach((pg, i) => expect(pg.from).toBe(p[i].from + p[i].count));
      const last = p[p.length - 1];
      expect(last.isLast).toBe(true);
      expect(last.count + last.blanks).toBe(REMITO_ROWS.nextWithFooter);
      p.slice(0, -1).forEach((pg) => expect(pg.blanks).toBe(0));
    }
  });
});

describe('paginateRemitoRows: ninguna hoja se pasa de su capacidad', () => {
  it('para cualquier cantidad de 0 a 400', () => {
    for (let n = 0; n <= 400; n++) {
      const p = paginateRemitoRows(n);
      expect(sum(p)).toBe(n);
      p.forEach((pg, i) => {
        expect(pg.count).toBeGreaterThanOrEqual(0);
        expect(pg.blanks).toBeGreaterThanOrEqual(0);
        const cap = p.length === 1
          ? REMITO_ROWS.firstWithFooter
          : i === 0
            ? REMITO_ROWS.firstWithoutFooter
            : pg.isLast
              ? REMITO_ROWS.nextWithFooter
              : REMITO_ROWS.nextWithoutFooter;
        expect(pg.count + pg.blanks).toBeLessThanOrEqual(cap);
        if (i > 0) expect(pg.from).toBe(p[i - 1].from + p[i - 1].count);
      });
      expect(p.filter((pg) => pg.isLast)).toHaveLength(1);
      // con varias hojas, la última nunca queda solo con el pie
      if (p.length > 1) expect(p[p.length - 1].count).toBeGreaterThanOrEqual(MIN_LAST_ROWS);
    }
  });
});

describe('remitoDateParts', () => {
  it('día / mes / año de 2 dígitos en hora argentina', () => {
    expect(remitoDateParts(new Date('2026-09-30T15:00:00Z'))).toEqual(['30', '09', '26']);
    // 01/10 01:00 UTC = 30/09 22:00 en Argentina
    expect(remitoDateParts(new Date('2026-10-01T01:00:00Z'))).toEqual(['30', '09', '26']);
  });
});
