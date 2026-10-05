import { describe, it, expect } from 'vitest';
import { pickUnitsForSelection } from './equipmentGroupUtils';

const unit = (id: string, name: string, isOut = false) => ({ _id: id, name, outOfService: { isOut } });

const items = [
  unit('p1', 'Parlante'),
  unit('p2', 'Parlante'),
  unit('p3', 'Parlante', true), // fuera de servicio
  unit('p4', 'Parlante'),
  unit('c1', 'Cable'),
  unit('c2', 'Cable'),
  unit('m1', 'Micrófono')
];

describe('pickUnitsForSelection', () => {
  it('agrega la cantidad pedida de cada nombre seleccionado', () => {
    const { units, perName } = pickUnitsForSelection(items, ['Parlante', 'Cable'], [], { Parlante: 2, Cable: 1 });
    expect(units.map((u) => u._id)).toEqual(['p1', 'p2', 'c1']);
    expect(perName).toEqual([
      { name: 'Parlante', requested: 2, added: 2 },
      { name: 'Cable', requested: 1, added: 1 }
    ]);
  });

  it('sin cantidad cargada agrega 1', () => {
    const { units } = pickUnitsForSelection(items, ['Cable'], [], {});
    expect(units.map((u) => u._id)).toEqual(['c1']);
  });

  it('tope en lo disponible: no terceriza el excedente', () => {
    const { units, perName } = pickUnitsForSelection(items, ['Parlante'], [], { Parlante: 10 });
    expect(units.map((u) => u._id)).toEqual(['p1', 'p2', 'p4']);
    expect(perName).toEqual([{ name: 'Parlante', requested: 10, added: 3 }]);
  });

  it('saltea los fuera de servicio y los que ya están en el evento', () => {
    const { units } = pickUnitsForSelection(items, ['Parlante'], ['p1'], { Parlante: 3 });
    expect(units.map((u) => u._id)).toEqual(['p2', 'p4']);
  });

  it('informa 0 agregados cuando no queda nada disponible', () => {
    const { units, perName } = pickUnitsForSelection(items, ['Micrófono'], ['m1'], { 'Micrófono': 2 });
    expect(units).toEqual([]);
    expect(perName).toEqual([{ name: 'Micrófono', requested: 2, added: 0 }]);
  });

  it('ignora los nombres no seleccionados', () => {
    const { units } = pickUnitsForSelection(items, [], [], { Parlante: 2 });
    expect(units).toEqual([]);
  });
});
