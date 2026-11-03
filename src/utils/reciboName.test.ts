import { describe, it, expect } from 'vitest';
import { filterNameSuggestions, safeReciboName } from './reciboName';

describe('sugerencias de "A nombre de"', () => {
  const names = ['Abril Casella', 'Juan Pérez'];
  it('vacío o un nombre de la lista → todas', () => {
    expect(filterNameSuggestions(names, '')).toEqual(names);
    expect(filterNameSuggestions(names, 'abril casella')).toEqual(names);
  });
  it('escribiendo → filtra; un nombre nuevo → sin sugerencias (vale igual)', () => {
    expect(filterNameSuggestions(names, 'juan')).toEqual(['Juan Pérez']);
    expect(filterNameSuggestions(names, 'Empresa SRL')).toEqual([]);
  });
});

describe('nombre para el archivo', () => {
  it('saca caracteres que rompen la ruta', () => {
    expect(safeReciboName(' Pérez / Gómez  S.A. ')).toBe('Pérez - Gómez S.A.');
    expect(safeReciboName('a:b*c?"d<e>f|g\\h')).toBe('a-b-c--d-e-f-g-h');
  });
  it('ñ y tildes en forma NFC', () => {
    expect(safeReciboName('Nuñez')).toBe('Nuñez');
  });
  it('vacío → Cliente', () => {
    expect(safeReciboName('   ')).toBe('Cliente');
    expect(safeReciboName(null)).toBe('Cliente');
  });
});
