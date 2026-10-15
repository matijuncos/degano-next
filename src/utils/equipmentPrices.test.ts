import { describe, it, expect } from 'vitest';
import {
  stripEquipmentPrices,
  stripPriceFields,
  restoreEquipmentPrices,
  sumRentalPrice
} from './equipmentPrices';

describe('stripEquipmentPrices', () => {
  it('saca todos los campos de precio y deja el resto', () => {
    const items = [
      { _id: 'a', name: 'Strobe', rentalPrice: 1000, investmentPrice: 50, rentalPriceFormatted: '$ 1.000', investmentPriceFormatted: 'US$ 50', note: 'x' }
    ];
    expect(stripEquipmentPrices(items)).toEqual([{ _id: 'a', name: 'Strobe', note: 'x' }]);
    expect(items[0].rentalPrice).toBe(1000); // no muta el original
  });
  it('lista vacía o nula', () => {
    expect(stripEquipmentPrices(undefined)).toEqual([]);
    expect(stripPriceFields({ _id: 'a' })).toEqual({ _id: 'a' });
  });
});

describe('restoreEquipmentPrices', () => {
  const previous = [{ _id: 'a', rentalPrice: 1000, investmentPrice: 50 }];
  const db = new Map<string, any>([
    ['a', { _id: 'a', rentalPrice: 9999, investmentPrice: 99 }],
    ['b', { _id: 'b', rentalPrice: 2000 }]
  ]);

  it('equipo que ya estaba: conserva el precio del evento (no el de la base)', () => {
    const r = restoreEquipmentPrices([{ _id: 'a', name: 'Strobe' }], previous, db);
    expect(r[0]).toEqual({ _id: 'a', name: 'Strobe', rentalPrice: 1000, investmentPrice: 50 });
  });
  it('equipo nuevo: toma el precio actual de la base', () => {
    const r = restoreEquipmentPrices([{ _id: 'b', name: 'Yamaha' }], previous, db);
    expect(r[0]).toEqual({ _id: 'b', name: 'Yamaha', rentalPrice: 2000 });
  });
  it('descarta precios falsos que vengan en el body', () => {
    const r = restoreEquipmentPrices([{ _id: 'a', rentalPrice: 0, investmentPrice: '****' as any }], previous, db);
    expect(r[0].rentalPrice).toBe(1000);
    expect(r[0].investmentPrice).toBe(50);
  });
  it('equipo sin precio en ningún lado: queda sin precio (no inventa)', () => {
    const r = restoreEquipmentPrices([{ _id: 'zzz', rentalPrice: 5 }], previous, db);
    expect(r[0]).toEqual({ _id: 'zzz' });
  });
});

describe('sumRentalPrice', () => {
  it('suma solo rentalPrice numérico', () => {
    expect(sumRentalPrice([{ rentalPrice: 1000 }, { rentalPrice: '500' }, {}, { rentalPrice: null }])).toBe(1500);
    expect(sumRentalPrice(undefined)).toBe(0);
  });
});
