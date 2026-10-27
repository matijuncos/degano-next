import { describe, it, expect } from 'vitest';
import {
  normalizeVenueText,
  venueMatchKey,
  venueNameFilter,
  arTodayStart,
  fromTodayFilter,
  parseSalonInput,
  eventSetFromSalonChange,
  eventSetFromSalon,
  summarizeVenueUsage,
  possibleDuplicates
} from './venues';

describe('nombres de lugar', () => {
  it('normaliza espacios', () => {
    expect(normalizeVenueText('  Villa   Golf  ')).toBe('Villa Golf');
    expect(normalizeVenueText(3)).toBe('');
  });
  it('el filtro de Mongo matchea el mismo nombre sin importar mayúsculas ni espacios', () => {
    const f = venueNameFilter(' Villa  Golf ');
    const re = new RegExp(f.$regex, f.$options);
    expect(re.test('Villa Golf')).toBe(true);
    expect(re.test(' villa   golf ')).toBe(true);
    expect(re.test('Villa Golf Club')).toBe(false);
    expect(re.test('Club Villa Golf')).toBe(false);
  });
  it('escapa caracteres especiales del nombre', () => {
    const f = venueNameFilter('Salón (Centro) + 1');
    const re = new RegExp(f.$regex, f.$options);
    expect(re.test('Salón (Centro) + 1')).toBe(true);
    expect(re.test('Salón Centro 1')).toBe(false);
  });
  it('clave de comparación', () => {
    expect(venueMatchKey(' Villa  GOLF')).toBe('villa golf');
  });
});

describe('desde hoy (día argentino)', () => {
  it('medianoche argentina de hoy', () => {
    // 26/10 01:00 UTC = 25/10 22:00 en Argentina → hoy es el 25
    expect(arTodayStart(new Date('2026-10-26T01:00:00Z')).toISOString()).toBe('2026-10-25T03:00:00.000Z');
    expect(arTodayStart(new Date('2026-10-26T15:00:00Z')).toISOString()).toBe('2026-10-26T03:00:00.000Z');
  });
  it('filtra por string ISO y por Date', () => {
    const f = fromTodayFilter(new Date('2026-10-26T15:00:00Z'));
    expect(f.$or[0].date.$gte).toBe('2026-10-26T03:00:00.000Z');
    expect(f.$or[1].date.$gte).toBeInstanceOf(Date);
  });
});

describe('parseSalonInput', () => {
  it('nombre obligatorio, el resto normalizado', () => {
    expect(parseSalonInput({ name: ' ' }).ok).toBe(false);
    expect(parseSalonInput({ name: ' Villa Golf ', city: ' Córdoba ', contactPhone: 351 })).toEqual({
      ok: true,
      value: { name: 'Villa Golf', address: '', city: 'Córdoba', province: '', contactName: '', contactPhone: '' }
    });
  });
});

describe('qué se cambia en los eventos', () => {
  const prev = { name: 'Villa Golf', address: 'Calle 1', city: 'Córdoba', contactPhone: '351' };
  it('solo los campos que cambiaron', () => {
    expect(eventSetFromSalonChange(prev, { ...prev, address: 'Calle 2 ' })).toEqual({ eventAddress: 'Calle 2' });
    expect(eventSetFromSalonChange(prev, { ...prev, name: 'Villa Golf Club' })).toEqual({ lugar: 'Villa Golf Club' });
  });
  it('sin cambios → nada; campo borrado → vacío', () => {
    expect(eventSetFromSalonChange(prev, prev)).toEqual({});
    expect(eventSetFromSalonChange(prev, { ...prev, contactPhone: '' })).toEqual({ venueContactPhone: '' });
  });
  it('un campo que no viene no se toca', () => {
    expect(eventSetFromSalonChange(prev, { name: 'Villa Golf' })).toEqual({});
  });
  it('unir lugares: todos los datos del destino', () => {
    expect(eventSetFromSalon({ name: 'A', city: 'X' })).toEqual({
      lugar: 'A', eventAddress: '', eventCity: 'X', eventProvince: '', venueContactName: '', venueContactPhone: '', venueMapsUrl: ''
    });
  });
});

describe('uso de cada lugar', () => {
  const salons = [{ _id: 's1', name: 'Villa Golf' }, { _id: 's2', name: 'Salón Sol' }];
  it('cuenta por salón y detecta lugares sin ficha', () => {
    const { usage, orphans } = summarizeVenueUsage(
      [
        { lugar: 'Villa Golf', total: 5, upcoming: 2 },
        { lugar: 'villa golf ', total: 1, upcoming: 1 },
        { lugar: 'Quinta Ruiz', total: 3, upcoming: 0 },
        { lugar: '', total: 4, upcoming: 4 },
        { lugar: null, total: 1, upcoming: 0 }
      ],
      salons
    );
    expect(usage).toEqual({ s1: { total: 6, upcoming: 3 } });
    expect(orphans).toEqual([{ name: 'Quinta Ruiz', total: 3, upcoming: 0 }]);
  });
  it('posibles duplicados (tildes y mayúsculas)', () => {
    const d = possibleDuplicates([...salons, { _id: 's3', name: 'salon sol' }]);
    expect([...d].sort()).toEqual(['s2', 's3']);
  });
});
