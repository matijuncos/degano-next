import { describe, it, expect } from 'vitest';
import { equipmentIdsIn, withoutCategoryItems } from './categoryItemGuard';

describe('categoryItemGuard: una categoría nunca se guarda como equipo de un evento', () => {
  const equipment = [
    { _id: 'eq1', name: 'CD Gemini' },
    { _id: 'cat1', name: 'CD Players' }, // categoría tocada por error en la tabla
    { _id: 'eq2', name: 'CD Sony' }
  ];
  it('saca los renglones cuyo _id es una categoría', () => {
    expect(withoutCategoryItems(equipment, new Set(['cat1']))).toEqual({
      equipment: [equipment[0], equipment[2]],
      removed: ['CD Players']
    });
  });
  it('sin categorías coladas no cambia nada', () => {
    const r = withoutCategoryItems(equipment.slice(0, 1), new Set(['cat1']));
    expect(r).toEqual({ equipment: [equipment[0]], removed: [] });
  });
  it('acepta _id como ObjectId (se compara como texto) y tolera basura', () => {
    const oid = { toString: () => 'cat1' };
    expect(withoutCategoryItems([{ _id: oid, name: 'X' }, null as any], new Set(['cat1'])).equipment).toEqual([null]);
    expect(withoutCategoryItems(undefined as any, new Set()).equipment).toEqual([]);
  });
  it('ids a consultar: los del cuerpo, sin repetir ni vacíos', () => {
    expect(equipmentIdsIn([{ _id: 'a' }, { _id: 'a' }, { _id: '' }, {}, { _id: 'b' }])).toEqual(['a', 'b']);
    expect(equipmentIdsIn(undefined)).toEqual([]);
  });
});
