import { describe, it, expect } from 'vitest';
import { computeNewPrice, previewGroups, buildChanges, planUndo, planApply, stillAt } from './bulkPrice';

describe('computeNewPrice: exacto, sin redondeos', () => {
  it('porcentaje', () => {
    expect(computeNewPrice(72500, 'percent', 15)).toBe(83375);
    expect(computeNewPrice(9990, 'percent', 15)).toBe(11488.5);
    expect(computeNewPrice(186000, 'percent', 15)).toBe(213900);
  });
  it('monto fijo', () => {
    expect(computeNewPrice(72500, 'fixed', 5000)).toBe(77500);
  });
  it('sin precio cargado: no se toca (null)', () => {
    expect(computeNewPrice(null, 'percent', 15)).toBeNull();
    expect(computeNewPrice(undefined, 'fixed', 5000)).toBeNull();
  });
  it('sin decimales de punto flotante raros', () => {
    expect(computeNewPrice(1000, 'percent', 7.3)).toBe(1073);
    expect(computeNewPrice(333.33, 'percent', 10)).toBe(366.66);
  });
  it('nunca negativo (ej. un descuento de más)', () => {
    expect(computeNewPrice(1000, 'fixed', -5000)).toBe(0);
  });
});

const categories = [
  { _id: 'ilu', name: 'ILUMINACION' },
  { _id: 'cab', name: 'Cabezales', parentId: 'ilu' },
  { _id: 'son', name: 'SONIDO' }
];
const equipment = [
  { _id: '1', name: 'Halo', categoryId: 'cab', rentalPrice: 72500, investmentPrice: 900000 },
  { _id: '2', name: 'Halo', categoryId: 'cab', rentalPrice: 72500, investmentPrice: 900000 },
  { _id: '3', name: 'Halo', categoryId: 'cab', rentalPrice: 70000, investmentPrice: 900000 }, // otro precio: otro grupo
  { _id: '4', name: 'Parlante', categoryId: 'son', rentalPrice: 50000 },
  { _id: '5', name: 'Cable', categoryId: 'son' } // sin precios: no aparece
];

describe('previewGroups: agrupa por nombre + precios actuales, dentro del alcance', () => {
  it('categorías elegidas (con subcategorías) y precios a cambiar', () => {
    const g = previewGroups(equipment, categories, { categoryIds: ['ilu'], fields: ['rentalPrice'], mode: 'percent', value: 10 });
    expect(g.map((x) => [x.name, x.ids.length, x.prices.rentalPrice?.old, x.prices.rentalPrice?.new])).toEqual([
      ['Halo', 1, 70000, 77000],
      ['Halo', 2, 72500, 79750]
    ]);
    expect(g[0].path).toBe('ILUMINACION › Cabezales');
  });
  it('todo el stock y los dos precios; equipos sin precio no aparecen', () => {
    const g = previewGroups(equipment, categories, { categoryIds: [], fields: ['rentalPrice', 'investmentPrice'], mode: 'fixed', value: 1000 });
    expect(g.map((x) => x.name)).toEqual(['Halo', 'Halo', 'Parlante']);
    const parlante = g[2];
    expect(parlante.prices.rentalPrice).toEqual({ old: 50000, new: 51000 });
    expect(parlante.prices.investmentPrice).toBeUndefined(); // no tenía: no se inventa
  });
});

describe('buildChanges: lo que se manda a guardar (con lo editado a mano)', () => {
  const groups = previewGroups(equipment, categories, { categoryIds: ['ilu'], fields: ['rentalPrice'], mode: 'percent', value: 10 });
  it('sin ediciones: el precio exacto del porcentaje, por unidad', () => {
    expect(buildChanges(groups, {})).toEqual([
      { _id: '3', rentalPrice: 77000, expected: { rentalPrice: 70000 } },
      { _id: '1', rentalPrice: 79750, expected: { rentalPrice: 72500 } },
      { _id: '2', rentalPrice: 79750, expected: { rentalPrice: 72500 } }
    ]);
  });
  it('lo que tipea la persona gana; si deja el precio igual al actual, ese grupo no cambia', () => {
    const keyB = groups[1].key;
    const keyA = groups[0].key;
    expect(buildChanges(groups, { [`${keyB}|rentalPrice`]: 80000, [`${keyA}|rentalPrice`]: 70000 })).toEqual([
      { _id: '1', rentalPrice: 80000, expected: { rentalPrice: 72500 } },
      { _id: '2', rentalPrice: 80000, expected: { rentalPrice: 72500 } }
    ]);
  });
  it('valores inválidos tipeados se ignoran (queda el calculado)', () => {
    const keyA = groups[0].key;
    expect(buildChanges(groups, { [`${keyA}|rentalPrice`]: -5 as any })[0]).toEqual({ _id: '3', rentalPrice: 77000, expected: { rentalPrice: 70000 } });
  });
});

describe('planUndo: deshacer el último aumento', () => {
  const batch = [
    { _id: '1', old: { rentalPrice: 72500 }, new: { rentalPrice: 79750 } },
    { _id: '2', old: { rentalPrice: 72500 }, new: { rentalPrice: 79750 } }
  ];
  it('vuelve al precio anterior lo que sigue con el precio del aumento', () => {
    const current = [{ _id: '1', rentalPrice: 79750 }, { _id: '2', rentalPrice: 81000 }]; // el 2 se editó a mano después
    expect(planUndo(batch, current)).toEqual({
      restore: [{ _id: '1', set: { rentalPrice: 72500 }, from: { rentalPrice: 79750 } }],
      skipped: ['2']
    });
  });
  it('equipo borrado después: se saltea', () => {
    expect(planUndo(batch, [{ _id: '1', rentalPrice: 79750 }]).skipped).toEqual(['2']);
  });
});

describe('planApply: el servidor solo aplica sobre el precio que vio la vista previa', () => {
  const current = [
    { _id: '1', rentalPrice: 100, investmentPrice: 1000 },
    { _id: '2', rentalPrice: 150 }, // alguien lo cambió después de la vista previa
    { _id: '3' } // no tiene precio de alquiler: no se inventa
  ];
  it('arma los cambios con el precio anterior de la base', () => {
    const r = planApply([{ _id: '1', rentalPrice: 110, expected: { rentalPrice: 100 } }], current);
    expect(r).toEqual({ changes: [{ _id: '1', old: { rentalPrice: 100 }, new: { rentalPrice: 110 } }], stale: [] });
  });
  it('si el precio de la base no es el de la vista previa: desactualizado, no se aplica', () => {
    const r = planApply([{ _id: '2', rentalPrice: 110, expected: { rentalPrice: 100 } }], current);
    expect(r).toEqual({ changes: [], stale: ['2'] });
  });
  it('sin precio esperado no se aplica (no se confía a ciegas)', () => {
    expect(planApply([{ _id: '1', rentalPrice: 110 }], current).changes).toEqual([]);
  });
  it('no inventa precios ni manda cambios iguales; equipo borrado = desactualizado', () => {
    const r = planApply(
      [
        { _id: '3', rentalPrice: 110, expected: { rentalPrice: 100 } },
        { _id: '1', investmentPrice: 1000, expected: { investmentPrice: 1000 } },
        { _id: '9', rentalPrice: 110, expected: { rentalPrice: 100 } }
      ],
      current
    );
    expect(r.changes).toEqual([]);
    expect(r.stale).toEqual(['3', '9']);
  });
});

describe('stillAt: el historial solo registra lo que de verdad se escribió', () => {
  it('compara todos los precios del cambio', () => {
    expect(stillAt({ _id: '1', rentalPrice: 110, investmentPrice: 5 }, { rentalPrice: 110 })).toBe(true);
    expect(stillAt({ _id: '1', rentalPrice: 100 }, { rentalPrice: 110 })).toBe(false);
    expect(stillAt(undefined, { rentalPrice: 110 })).toBe(false);
  });
});
