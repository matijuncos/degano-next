import { describe, it, expect } from 'vitest';
import { sortByName, sortEquipment } from './sortByName';

const names = (list: { name?: string | null }[]) => list.map((x) => x.name);

describe('sortByName', () => {
  it('ordena alfabéticamente sin importar mayúsculas', () => {
    expect(names(sortByName([{ name: 'parlante' }, { name: 'Consola' }, { name: 'micrófono' }])))
      .toEqual(['Consola', 'micrófono', 'parlante']);
  });
  it('ignora acentos', () => {
    expect(names(sortByName([{ name: 'Mixer' }, { name: 'Micrófono' }, { name: 'Microfono B' }])))
      .toEqual(['Micrófono', 'Microfono B', 'Mixer']);
  });
  it('ordena números de forma natural', () => {
    expect(names(sortByName([{ name: 'Parlante 10' }, { name: 'Parlante 2' }, { name: 'Parlante 1' }])))
      .toEqual(['Parlante 1', 'Parlante 2', 'Parlante 10']);
  });
  it('tolera nombres vacíos y no muta la original', () => {
    const list = [{ name: 'B' }, { name: null }, { name: 'A' }];
    expect(names(sortByName(list))).toEqual([null, 'A', 'B']);
    expect(names(list)).toEqual(['B', null, 'A']);
  });
});

describe('sortEquipment', () => {
  const list = [
    { name: 'Truss', code: 'TR 1 - 10' },
    { name: 'Strobe', code: 'ESTB-02' },
    { name: 'Truss', code: 'TR 1 - 2' },
    { name: 'Ámbar', code: '' },
    { name: 'Strobe', code: 'ESTB-01' }
  ];
  const codes = (l: any[]) => l.map((x) => x.code);

  it('por nombre ascendente, desempata por código natural', () => {
    expect(codes(sortEquipment(list, 'name', 'asc'))).toEqual(['', 'ESTB-01', 'ESTB-02', 'TR 1 - 2', 'TR 1 - 10']);
  });
  it('por nombre descendente', () => {
    expect(sortEquipment(list, 'name', 'desc').map((x) => x.name)).toEqual(['Truss', 'Truss', 'Strobe', 'Strobe', 'Ámbar']);
  });
  it('por código natural, ascendente y descendente; sin código al final', () => {
    expect(codes(sortEquipment(list, 'code', 'asc'))).toEqual(['ESTB-01', 'ESTB-02', 'TR 1 - 2', 'TR 1 - 10', '']);
    expect(codes(sortEquipment(list, 'code', 'desc'))).toEqual(['TR 1 - 10', 'TR 1 - 2', 'ESTB-02', 'ESTB-01', '']);
  });
  it('no muta la lista original', () => {
    const copy = [...list];
    sortEquipment(list, 'code', 'desc');
    expect(list).toEqual(copy);
  });
});
