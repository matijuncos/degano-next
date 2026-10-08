// src/utils/civilCeremony.test.ts
import { describe, it, expect } from 'vitest';
import { normalizeCivil, hasCivilContent, CIVIL_INGRESO_FIELDS } from './civilCeremony';

describe('normalizeCivil', () => {
  it('sin ceremonia → todo vacío', () => {
    expect(normalizeCivil(undefined)).toEqual({
      ingreso: '', ingresoNovios: '', ingresoNovio: '', ingresoNovia: '', firmas: '', salida: '', otros: []
    });
  });
  it('evento viejo: el ingreso único pasa a "Ingreso novios" y se vacía el viejo', () => {
    const c = normalizeCivil({ ingreso: 'Canción A', firmas: 'F', salida: 'S', otros: [] });
    expect(c.ingresoNovios).toBe('Canción A');
    expect(c.ingreso).toBe('');
    expect(c.firmas).toBe('F');
  });
  it('formato nuevo: respeta cada ingreso, aunque quede un "ingreso" viejo', () => {
    const c = normalizeCivil({ ingreso: 'Vieja', ingresoNovios: '', ingresoNovio: 'X', ingresoNovia: 'Y', firmas: '', salida: '' });
    expect([c.ingresoNovios, c.ingresoNovio, c.ingresoNovia]).toEqual(['', 'X', 'Y']);
  });
  it('los labels están en el orden Novios, Novio, Novia', () => {
    expect(CIVIL_INGRESO_FIELDS.map((f) => f.key)).toEqual(['ingresoNovios', 'ingresoNovio', 'ingresoNovia']);
  });
});

describe('hasCivilContent', () => {
  it('detecta cualquier ingreso (nuevo o viejo), firmas, salida u otros', () => {
    expect(hasCivilContent(undefined)).toBe(false);
    expect(hasCivilContent({ ingreso: '', firmas: '', salida: '', otros: [] })).toBe(false);
    expect(hasCivilContent({ ingreso: 'A', firmas: '', salida: '' })).toBe(true);
    expect(hasCivilContent({ ingreso: '', ingresoNovia: 'B', firmas: '', salida: '' })).toBe(true);
    expect(hasCivilContent({ ingreso: '', firmas: '', salida: '', otros: [{ titulo: 't', cancion: 'c' }] })).toBe(true);
  });
});
