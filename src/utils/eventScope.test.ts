import { describe, it, expect } from 'vitest';
import { eventForPage, filesUpdateBody } from './eventScope';

describe('eventForPage', () => {
  const ev = { _id: 'abc', type: 'Boda', files: [{ url: 'x' }] };
  it('solo devuelve el evento si es el de la página', () => {
    expect(eventForPage(ev, 'abc')).toBe(ev);
    expect(eventForPage(ev, 'otro')).toBeNull(); // todavía es el evento abierto antes
    expect(eventForPage(null, 'abc')).toBeNull();
    expect(eventForPage({ type: 'sin id' } as any, 'abc')).toBeNull();
    expect(eventForPage(ev, undefined)).toBeNull();
  });
});

describe('filesUpdateBody', () => {
  it('manda solo id + archivos (+ carpeta), nunca el resto del evento', () => {
    const body = filesUpdateBody('abc', [{ url: 'u' }], 'evt-1');
    expect(body).toEqual({ _id: 'abc', files: [{ url: 'u' }], folderId: 'evt-1' });
    expect(Object.keys(filesUpdateBody('abc', []))).toEqual(['_id', 'files']);
  });
  it('sin evento no se guarda nada', () => {
    expect(() => filesUpdateBody(undefined, [])).toThrow();
  });
});
