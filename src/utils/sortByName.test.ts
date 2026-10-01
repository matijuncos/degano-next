import { describe, it, expect } from 'vitest';
import { sortByName } from './sortByName';

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
