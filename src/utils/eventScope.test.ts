import { describe, it, expect } from 'vitest';
import { eventForPage, filesUpdateBody, fileInFolder, ownFiles, listUpdateBody, renameFile } from './eventScope';

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

describe('listUpdateBody: guardar SOLO la lista que cambia (archivos del evento o de música)', () => {
  it('archivos del evento (como antes) y archivos de música', () => {
    expect(listUpdateBody('e1', 'files', [{ url: 'a' }], 'evt-1')).toEqual({ _id: 'e1', files: [{ url: 'a' }], folderId: 'evt-1' });
    expect(listUpdateBody('e1', 'musicFiles', [{ url: 'm' }])).toEqual({ _id: 'e1', musicFiles: [{ url: 'm' }] });
  });
  it('sin evento: error (nunca se guarda en el aire)', () => {
    expect(() => listUpdateBody('', 'musicFiles', [])).toThrow();
  });
});

describe('renameFile: cambiar solo el nombre visible', () => {
  const list = [{ url: 'u1', name: 'viejo.mp3' }, { url: 'u2', name: 'otro.mp3' }];
  it('renombra el archivo indicado y no toca los demás', () => {
    expect(renameFile(list, 'u1', '  Vals de los novios.mp3 ')).toEqual([{ url: 'u1', name: 'Vals de los novios.mp3' }, list[1]]);
  });
  it('si el nombre nuevo no tiene extensión, conserva la del archivo (para que descargue bien)', () => {
    expect(renameFile(list, 'u1', 'Vals')[0].name).toBe('Vals.mp3');
    expect(renameFile(list, 'u1', 'Vals.wav')[0].name).toBe('Vals.wav');
  });
  it('nombre vacío o igual: devuelve la MISMA lista (no guarda nada)', () => {
    expect(renameFile(list, 'u1', '   ')).toBe(list);
    expect(renameFile(list, 'u1', 'viejo.mp3')).toBe(list);
    expect(renameFile(list, 'no-existe', 'x')).toBe(list);
  });
});
