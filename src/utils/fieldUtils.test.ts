import { describe, it, expect } from 'vitest';
import { detectMissingFields } from './fieldUtils';

describe('detectMissingFields ("Agregar campos" de la página del evento)', () => {
  const keys = (ev: any) => detectMissingFields(ev).map((f) => f.key);
  it('un evento sugiere los horarios de iglesia y civil', () => {
    expect(keys({})).toEqual(expect.arrayContaining(['churchDate', 'civil']));
  });
  it('un alquiler NO los sugiere (no tiene ceremonia)', () => {
    const k = keys({ eventKind: 'alquiler' });
    expect(k).not.toContain('churchDate');
    expect(k).not.toContain('civil');
    expect(k).toContain('company'); // el resto sí
  });
});
