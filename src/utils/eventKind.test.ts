import { describe, it, expect } from 'vitest';
import { EVENT_TABS as T } from '@/context/config';
import {
  eventKindOf,
  isRental,
  tabsFor,
  resolveTab,
  restoreTab,
  needsKindChoice,
  stripRentalFields,
  hasRentalHiddenData,
  sanitizeKindUpdate,
  rentalEventColors,
  canChangeKind,
  withKind,
  deleteOwnFiles
} from './eventKind';

describe('eventKind: tipo del evento', () => {
  it('sin campo, valor inválido o "Alquiler" escrito en el tipo de evento → evento', () => {
    expect(eventKindOf(undefined)).toBe('evento');
    expect(eventKindOf(null)).toBe('evento');
    expect(eventKindOf({})).toBe('evento');
    expect(eventKindOf({ eventKind: 'otro' })).toBe('evento');
    expect(eventKindOf({ type: 'Alquiler' } as any)).toBe('evento');
  });
  it('alquiler', () => {
    expect(eventKindOf({ eventKind: 'alquiler' })).toBe('alquiler');
    expect(isRental({ eventKind: 'alquiler' })).toBe(true);
    expect(isRental({})).toBe(false);
  });
});

describe('eventKind: pestañas', () => {
  it('evento: las 10 como hoy (Archivos antes de Presupuesto)', () => {
    expect(tabsFor('evento')).toEqual([
      T.CLIENT, T.EVENT, T.SHOW, T.MUSIC, T.TIMING, T.MORE_INFO, T.EQUIPMENT, T.STAFF, T.FILES, T.PAYMENT
    ]);
  });
  it('alquiler: sin Show, Música, Timing ni Archivos', () => {
    expect(tabsFor('alquiler')).toEqual([T.CLIENT, T.EVENT, T.MORE_INFO, T.EQUIPMENT, T.STAFF, T.PAYMENT]);
  });
  it('alquiler: los saltos fijos de los formularios caen en una pestaña que existe', () => {
    expect(resolveTab(T.SHOW, T.EVENT, 'alquiler')).toBe(T.MORE_INFO); // EventForm → Siguiente
    expect(resolveTab(T.TIMING, T.MORE_INFO, 'alquiler')).toBe(T.EVENT); // MoreInfoForm → Atrás
    expect(resolveTab(T.FILES, T.STAFF, 'alquiler')).toBe(T.PAYMENT); // StaffForm → Siguiente
    expect(resolveTab(T.STAFF, T.PAYMENT, 'alquiler')).toBe(T.STAFF); // PaymentForm → Atrás
    expect(resolveTab(T.EQUIPMENT, T.MORE_INFO, 'alquiler')).toBe(T.EQUIPMENT);
  });
  it('evento: nunca cambia el destino', () => {
    for (const t of Object.values(T)) expect(resolveTab(t, T.CLIENT, 'evento')).toBe(t);
    expect(resolveTab(T.FILES, T.STAFF, 'evento')).toBe(T.FILES);
  });
  it('borrador guardado en una pestaña que el alquiler no tiene → Cliente', () => {
    expect(restoreTab(T.SHOW, 'alquiler')).toBe(T.CLIENT);
    expect(restoreTab(T.EQUIPMENT, 'alquiler')).toBe(T.EQUIPMENT);
    expect(restoreTab(T.TIMING, 'evento')).toBe(T.TIMING);
  });
  it('pantalla de elección: solo sin borrador (un borrador viejo sin tipo sigue como evento)', () => {
    expect(needsKindChoice(null)).toBe(true);
    expect(needsKindChoice({ event: {} })).toBe(false);
    expect(needsKindChoice({ event: { eventKind: 'alquiler' } })).toBe(false);
  });
});

describe('eventKind: campos que un alquiler no guarda', () => {
  it('saca Show, Música, Timing y Archivos, nunca el folderId', () => {
    const body = {
      bands: [1], music: { genres: [] }, playlist: [1], welcomeSongs: ['a'], walkIn: ['a'], vals: ['a'],
      openingPartySong: 'x', openingPartySongs: ['a'], closingSongs: ['a'], customMoments: [1],
      ceremoniaCivil: {}, ceremoniaExtra: {}, ambienceMusic: [1], timing: [1], files: [1], musicFiles: [1],
      folderId: 'evt-x', lugar: 'X', equipment: [1]
    };
    expect(stripRentalFields(body)).toEqual({ folderId: 'evt-x', lugar: 'X', equipment: [1] });
    // Horarios de ceremonia (de un borrador que empezó como evento)
    expect(stripRentalFields({ churchDate: '18:00', civil: '17:00', lugar: 'X' })).toEqual({ lugar: 'X' });
    expect(body.bands).toEqual([1]); // no muta
  });
  it('detecta si hay algo cargado en esas secciones', () => {
    expect(hasRentalHiddenData({ bands: [], playlist: [], timing: [], music: { genres: [] } }).any).toBe(false);
    expect(hasRentalHiddenData({ timing: [{ time: '21', title: 'Entrada', details: '' }] }).any).toBe(true);
    expect(hasRentalHiddenData({ openingPartySong: 'Tema' }).any).toBe(true);
    expect(hasRentalHiddenData({ civil: '17:00' }).any).toBe(true);
    expect(hasRentalHiddenData({ churchDate: '', civil: '' }).any).toBe(false);
    const files = [{ url: 'https://x/evt-1/a.pdf' }];
    expect(hasRentalHiddenData({ files })).toEqual({ any: true, files });
    expect(hasRentalHiddenData({}).files).toEqual([]);
    // revisión: los archivos de Música también se cuentan (y se borran) al pasar a alquiler
    const music = [{ url: 'https://x/evt-1/musica/vals.mp3' }];
    expect(hasRentalHiddenData({ files, musicFiles: music }).files).toEqual([...files, ...music]);
  });
  it('updateEvent: el tipo nunca cambia; un alquiler no guarda esas secciones', () => {
    expect(sanitizeKindUpdate({ eventKind: 'alquiler', bands: [1] }, 'evento')).toEqual({ bands: [1] });
    expect(sanitizeKindUpdate({ eventKind: 'evento', bands: [1], timing: [1] }, 'alquiler')).toEqual({});
    expect(sanitizeKindUpdate({ _id: 'x', staff: [] }, 'alquiler')).toEqual({ _id: 'x', staff: [] });
  });
});

describe('eventKind: colores del calendario', () => {
  it('cobre por estado (no se parece a ningún calendario en uso)', () => {
    expect(rentalEventColors('future')).toEqual({ backgroundColor: '#a0522d', borderColor: '#7f4024' });
    expect(rentalEventColors('current')).toEqual({ backgroundColor: '#c0703f', borderColor: '#a0522d' });
    expect(rentalEventColors('past')).toEqual({ backgroundColor: '#5e3420', borderColor: '#46261a' });
  });
});

describe('eventKind: revisión final', () => {
  it('el tipo solo se puede cambiar mientras el evento NO está creado', () => {
    expect(canChangeKind({ _id: '' })).toBe(true);
    expect(canChangeKind({})).toBe(true);
    expect(canChangeKind({ _id: '6a0b5c9b69aa4980740a16ff' })).toBe(false);
  });
  it('elegir alquiler precarga "Alquiler"; volver a evento lo limpia; no pisa un tipo escrito', () => {
    expect(withKind({ type: '' }, 'alquiler')).toEqual({ type: 'Alquiler', eventKind: 'alquiler' });
    expect(withKind({ type: 'Alquiler' }, 'evento')).toEqual({ type: '', eventKind: 'evento' });
    expect(withKind({ type: 'Casamiento' }, 'alquiler')).toEqual({ type: 'Casamiento', eventKind: 'alquiler' });
  });
  it('borrar archivos al pasar a alquiler: solo los de la carpeta propia, y reporta los que fallan', async () => {
    const files = [
      { url: 'https://b.s3.amazonaws.com/evt-1/a.pdf' },
      { url: 'https://b.s3.amazonaws.com/evt-1/b.pdf' },
      { url: 'https://b.s3.amazonaws.com/evt-OTRO/c.pdf' }
    ];
    const calls: string[] = [];
    const del = async (url: string) => {
      calls.push(url);
      return { ok: !url.endsWith('b.pdf') };
    };
    const r = await deleteOwnFiles(files, 'evt-1', del);
    expect(calls).toEqual([files[0].url, files[1].url]); // nunca el de otra carpeta
    expect(r).toEqual({ deleted: [files[0].url], failed: [files[1].url] });
  });
  it('un error de red cuenta como fallado', async () => {
    const r = await deleteOwnFiles([{ url: 'https://b/evt-1/a.pdf' }], 'evt-1', async () => {
      throw new Error('red');
    });
    expect(r.failed).toEqual(['https://b/evt-1/a.pdf']);
  });
});
