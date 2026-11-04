import { describe, it, expect } from 'vitest';
import { eventForPage, filesUpdateBody, fileInFolder, ownFiles } from './eventScope';

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

describe('archivos de un evento nuevo', () => {
  const base = 'https://degano-events-files.s3.us-east-2.amazonaws.com';
  it('solo cuenta los de su propia carpeta', () => {
    expect(fileInFolder(`${base}/evt-AAA/x-foto.jpg`, 'evt-AAA')).toBe(true);
    expect(fileInFolder(`${base}/evt-BBB/x-foto.jpg`, 'evt-AAA')).toBe(false);
    expect(fileInFolder(`${base}/evt-AAA2/x.jpg`, 'evt-AAA')).toBe(false); // prefijo parecido
    expect(fileInFolder(`${base}/evt-AAA/x.jpg`, undefined)).toBe(false);
  });
  it('al crear el evento se descartan archivos de otra carpeta', () => {
    const files = [
      { url: `${base}/evt-AAA/a.mp3`, name: 'a.mp3' },
      { url: `${base}/evt-OTRO/b.mp3`, name: 'b.mp3' }
    ];
    expect(ownFiles(files, 'evt-AAA').map((f: any) => f.name)).toEqual(['a.mp3']);
    expect(ownFiles(undefined, 'evt-AAA')).toEqual([]);
  });
});
