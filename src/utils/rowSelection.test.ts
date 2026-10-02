import { describe, it, expect } from 'vitest';
import { rangeIds, toggleId, unionIds, summarizeSelection, boxFromPoints, idsInBox } from './rowSelection';

const order = ['a', 'b', 'c', 'd', 'e'];

describe('rangeIds', () => {
  it('selecciona el rango hacia abajo', () => {
    expect(rangeIds(order, 'b', 'd')).toEqual(['b', 'c', 'd']);
  });
  it('selecciona el rango hacia arriba', () => {
    expect(rangeIds(order, 'd', 'b')).toEqual(['b', 'c', 'd']);
  });
  it('una sola fila cuando inicio y fin coinciden', () => {
    expect(rangeIds(order, 'c', 'c')).toEqual(['c']);
  });
  it('tolera ids que ya no están en la lista', () => {
    expect(rangeIds(order, 'x', 'c')).toEqual(['c']);
    expect(rangeIds(order, 'c', 'x')).toEqual(['c']);
    expect(rangeIds(order, 'x', 'y')).toEqual([]);
  });
});

describe('toggleId / unionIds', () => {
  it('agrega y quita', () => {
    expect(toggleId(['a'], 'b')).toEqual(['a', 'b']);
    expect(toggleId(['a', 'b'], 'a')).toEqual(['b']);
  });
  it('une sin duplicados', () => {
    expect(unionIds(['a', 'b'], ['b', 'c'])).toEqual(['a', 'b', 'c']);
  });
});

describe('summarizeSelection', () => {
  it('cuenta unidades por nombre (vista por unidad)', () => {
    const entries = [
      { id: '1', name: 'Parlante', count: 1, available: 1 },
      { id: '2', name: 'Parlante', count: 1, available: 0 },
      { id: '3', name: 'Cable', count: 1, available: 1 },
      { id: '4', name: 'Parlante', count: 1, available: 1 }
    ];
    expect(summarizeSelection(entries, ['1', '2', '3'])).toEqual({
      rows: [
        { name: 'Parlante', count: 2, available: 1 },
        { name: 'Cable', count: 1, available: 1 }
      ],
      totalCount: 3,
      totalAvailable: 2
    });
  });
  it('suma el total de cada grupo (vista agrupada del evento)', () => {
    const entries = [
      { id: 'Parlante', name: 'Parlante', count: 8, available: 5 },
      { id: 'Cable', name: 'Cable', count: 20, available: 12 }
    ];
    const summary = summarizeSelection(entries, ['Cable', 'Parlante']);
    expect(summary.rows.map((r) => r.name)).toEqual(['Parlante', 'Cable']);
    expect(summary.totalCount).toBe(28);
    expect(summary.totalAvailable).toBe(17);
  });
  it('vacío si no hay nada seleccionado', () => {
    expect(summarizeSelection([{ id: '1', name: 'X', count: 1, available: 1 }], [])).toEqual({
      rows: [],
      totalCount: 0,
      totalAvailable: 0
    });
  });
});

describe('rectángulo de selección', () => {
  const rows = ['a', 'b', 'c', 'd'].map((id, i) => ({ id, top: i * 20, bottom: i * 20 + 20, left: 0, right: 500 }));

  it('normaliza el rectángulo sin importar la dirección del arrastre', () => {
    expect(boxFromPoints(100, 50, 10, 5)).toEqual({ top: 5, bottom: 50, left: 10, right: 100 });
  });
  it('selecciona las filas que toca el rectángulo, aunque sea apenas', () => {
    expect(idsInBox(rows, boxFromPoints(10, 25, 50, 41))).toEqual(['b', 'c']);
  });
  it('arrastrar hacia arriba da el mismo resultado', () => {
    expect(idsInBox(rows, boxFromPoints(50, 41, 10, 25))).toEqual(['b', 'c']);
  });
  it('no selecciona nada si el rectángulo queda fuera de las filas', () => {
    expect(idsInBox(rows, boxFromPoints(600, 0, 700, 80))).toEqual([]);
    expect(idsInBox(rows, boxFromPoints(10, 90, 50, 120))).toEqual([]);
  });
  it('el borde exacto no cuenta como tocar', () => {
    expect(idsInBox(rows, boxFromPoints(10, 20, 50, 20))).toEqual([]);
  });
});
