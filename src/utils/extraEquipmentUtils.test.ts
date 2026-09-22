import { describe, it, expect } from 'vitest';
import {
  computeConvertibleExtras,
  removeConvertedExtras,
  ExtraItem,
  InventoryUnit
} from './extraEquipmentUtils';

// Helper para armar unidades de inventario
const unit = (id: string, name: string, isOut = false): InventoryUnit => ({
  _id: id,
  name,
  outOfService: { isOut }
});

describe('computeConvertibleExtras', () => {
  it('no propone nada si no hay stock disponible', () => {
    const extras: ExtraItem[] = [{ name: 'Par Led', quantity: 3 }];
    expect(
      computeConvertibleExtras({ extraEquipment: extras, availableEquipment: [] })
    ).toEqual([]);
  });

  it('no propone nada si el evento no tiene tercerizados', () => {
    expect(
      computeConvertibleExtras({
        extraEquipment: [],
        availableEquipment: [unit('1', 'Par Led')]
      })
    ).toEqual([]);
  });

  it('convierte cuando aparece stock (ej: se compró más equipamiento)', () => {
    const result = computeConvertibleExtras({
      extraEquipment: [{ name: 'Par Led', quantity: 2 }],
      availableEquipment: [unit('1', 'Par Led'), unit('2', 'Par Led')]
    });
    expect(result).toHaveLength(1);
    expect(result[0].convertible).toBe(2);
    expect(result[0].units.map((u) => u._id)).toEqual(['1', '2']);
  });

  it('convierte solo lo que alcanza (stock parcial)', () => {
    // 5 tercerizados pero solo aparecieron 3 unidades
    const result = computeConvertibleExtras({
      extraEquipment: [{ name: 'Par Led', quantity: 5 }],
      availableEquipment: [
        unit('1', 'Par Led'),
        unit('2', 'Par Led'),
        unit('3', 'Par Led')
      ]
    });
    expect(result[0].convertible).toBe(3);
  });

  it('nunca convierte más de lo que estaba tercerizado', () => {
    // Hay 10 disponibles pero solo 2 tercerizados
    const result = computeConvertibleExtras({
      extraEquipment: [{ name: 'Par Led', quantity: 2 }],
      availableEquipment: Array.from({ length: 10 }, (_, i) =>
        unit(String(i), 'Par Led')
      )
    });
    expect(result[0].convertible).toBe(2);
    expect(result[0].units).toHaveLength(2);
  });

  it('ignora unidades fuera de servicio', () => {
    const result = computeConvertibleExtras({
      extraEquipment: [{ name: 'Par Led', quantity: 2 }],
      availableEquipment: [
        unit('1', 'Par Led', true), // en reparación
        unit('2', 'Par Led')
      ]
    });
    expect(result[0].convertible).toBe(1);
    expect(result[0].units[0]._id).toBe('2');
  });

  it('ignora unidades ya asignadas a este evento', () => {
    const result = computeConvertibleExtras({
      extraEquipment: [{ name: 'Par Led', quantity: 2 }],
      availableEquipment: [unit('1', 'Par Led'), unit('2', 'Par Led')],
      assignedEquipment: [{ _id: '1' }]
    });
    expect(result[0].convertible).toBe(1);
    expect(result[0].units[0]._id).toBe('2');
  });

  it('solo considera unidades del mismo nombre', () => {
    const result = computeConvertibleExtras({
      extraEquipment: [{ name: 'Par Led', quantity: 2 }],
      availableEquipment: [unit('1', 'Bola de Espejos'), unit('2', 'Par Led')]
    });
    expect(result[0].convertible).toBe(1);
    expect(result[0].units[0]._id).toBe('2');
  });

  it('NO asigna la misma unidad a dos entradas con el mismo nombre', () => {
    // Dos entradas de "Par Led" (distinta categoría) y solo 1 unidad libre
    const result = computeConvertibleExtras({
      extraEquipment: [
        { name: 'Par Led', mainCategoryName: 'Iluminación', quantity: 1 },
        { name: 'Par Led', mainCategoryName: 'Extra', quantity: 1 }
      ],
      availableEquipment: [unit('1', 'Par Led')]
    });
    const totalConvertido = result.reduce((s, r) => s + r.convertible, 0);
    expect(totalConvertido).toBe(1); // no se duplica
    const ids = result.flatMap((r) => r.units.map((u) => u._id));
    expect(new Set(ids).size).toBe(ids.length); // sin repetidos
  });

  it('maneja varios nombres distintos a la vez', () => {
    const result = computeConvertibleExtras({
      extraEquipment: [
        { name: 'Par Led', quantity: 1 },
        { name: 'Bola de Espejos', quantity: 2 }
      ],
      availableEquipment: [
        unit('1', 'Par Led'),
        unit('2', 'Bola de Espejos'),
        unit('3', 'Bola de Espejos')
      ]
    });
    expect(result).toHaveLength(2);
    expect(result.find((r) => r.extra.name === 'Par Led')?.convertible).toBe(1);
    expect(result.find((r) => r.extra.name === 'Bola de Espejos')?.convertible).toBe(2);
  });

  it('tolera entradas y listas vacías o nulas', () => {
    expect(computeConvertibleExtras({})).toEqual([]);
    expect(
      computeConvertibleExtras({ extraEquipment: null, availableEquipment: null })
    ).toEqual([]);
  });
});

describe('removeConvertedExtras', () => {
  it('elimina la entrada cuando se convierte todo', () => {
    const extras: ExtraItem[] = [{ name: 'Par Led', quantity: 2 }];
    const conversions = computeConvertibleExtras({
      extraEquipment: extras,
      availableEquipment: [unit('1', 'Par Led'), unit('2', 'Par Led')]
    });
    expect(removeConvertedExtras(extras, conversions)).toEqual([]);
  });

  it('descuenta parcialmente y conserva el resto', () => {
    const extras: ExtraItem[] = [{ name: 'Par Led', quantity: 5 }];
    const conversions = computeConvertibleExtras({
      extraEquipment: extras,
      availableEquipment: [unit('1', 'Par Led'), unit('2', 'Par Led')]
    });
    expect(removeConvertedExtras(extras, conversions)).toEqual([
      { name: 'Par Led', quantity: 3 }
    ]);
  });

  it('no toca las entradas que no se convirtieron', () => {
    const extras: ExtraItem[] = [
      { name: 'Par Led', quantity: 2 },
      { name: 'Bola de Espejos', quantity: 4 }
    ];
    const conversions = computeConvertibleExtras({
      extraEquipment: extras,
      availableEquipment: [unit('1', 'Par Led'), unit('2', 'Par Led')]
    });
    const result = removeConvertedExtras(extras, conversions);
    expect(result).toEqual([{ name: 'Bola de Espejos', quantity: 4 }]);
  });

  it('distingue entradas del mismo nombre en distinta categoría', () => {
    const extras: ExtraItem[] = [
      { name: 'Par Led', mainCategoryName: 'Iluminación', quantity: 2 },
      { name: 'Par Led', mainCategoryName: 'Extra', quantity: 2 }
    ];
    const conversions = computeConvertibleExtras({
      extraEquipment: extras,
      availableEquipment: [unit('1', 'Par Led')]
    });
    const result = removeConvertedExtras(extras, conversions);
    // Solo se descuenta 1 de la primera entrada; la segunda queda intacta
    expect(result).toEqual([
      { name: 'Par Led', mainCategoryName: 'Iluminación', quantity: 1 },
      { name: 'Par Led', mainCategoryName: 'Extra', quantity: 2 }
    ]);
  });

  it('sin conversiones devuelve la lista igual', () => {
    const extras: ExtraItem[] = [{ name: 'Par Led', quantity: 2 }];
    expect(removeConvertedExtras(extras, [])).toEqual(extras);
  });
});
