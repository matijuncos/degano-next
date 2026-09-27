import { describe, expect, it } from 'vitest';
import { isValidMapsUrl, normalizeMapsUrl } from './mapsUtils';

describe('normalizeMapsUrl', () => {
  it('vacío o ausente es válido y queda vacío', () => {
    expect(normalizeMapsUrl('')).toBe('');
    expect(normalizeMapsUrl('   ')).toBe('');
    expect(normalizeMapsUrl(undefined)).toBe('');
    expect(normalizeMapsUrl(null)).toBe('');
  });

  it('acepta links cortos de "Compartir"', () => {
    expect(normalizeMapsUrl('https://maps.app.goo.gl/AbC123')).toBe(
      'https://maps.app.goo.gl/AbC123'
    );
    expect(normalizeMapsUrl('https://goo.gl/maps/xyz')).toBe(
      'https://goo.gl/maps/xyz'
    );
  });

  it('acepta links largos de google.com/maps y dominios de país', () => {
    const long =
      'https://www.google.com/maps/place/Salon+X/@-31.4,-64.1,17z';
    expect(normalizeMapsUrl(long)).toBe(long);
    expect(normalizeMapsUrl('https://www.google.com.ar/maps/place/X')).toBe(
      'https://www.google.com.ar/maps/place/X'
    );
    expect(normalizeMapsUrl('https://maps.google.com/?q=-31.4,-64.1')).toBe(
      'https://maps.google.com/?q=-31.4,-64.1'
    );
  });

  it('agrega https y recorta espacios', () => {
    expect(normalizeMapsUrl('  maps.app.goo.gl/AbC123 ')).toBe(
      'https://maps.app.goo.gl/AbC123'
    );
    expect(normalizeMapsUrl('http://maps.app.goo.gl/AbC123')).toBe(
      'https://maps.app.goo.gl/AbC123'
    );
  });

  it('rechaza links que no son de Google Maps', () => {
    expect(normalizeMapsUrl('https://google.com/search?q=salon')).toBeNull();
    expect(normalizeMapsUrl('https://goo.gl/abc')).toBeNull();
    expect(normalizeMapsUrl('https://evil.com/maps')).toBeNull();
    expect(normalizeMapsUrl('https://maps.app.goo.gl.evil.com/x')).toBeNull();
    expect(normalizeMapsUrl('javascript:alert(1)')).toBeNull();
    expect(normalizeMapsUrl('Av. Siempre Viva 123')).toBeNull();
    expect(normalizeMapsUrl(123)).toBeNull();
  });

  it('isValidMapsUrl', () => {
    expect(isValidMapsUrl('')).toBe(true);
    expect(isValidMapsUrl('https://maps.app.goo.gl/x')).toBe(true);
    expect(isValidMapsUrl('hola')).toBe(false);
  });
});
