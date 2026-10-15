import { describe, it, expect } from 'vitest';
import {
  encodeDraft,
  decodeDraft,
  splitEventForDraft,
  isDraftUsable,
  draftAgeLabel,
  draftKeys,
  DRAFT_VERSION,
  DRAFT_TTL_MS,
  hasDraftContent
} from './eventDraft';

describe('encodeDraft / decodeDraft', () => {
  it('conserva todo, incluidas fechas anidadas como Date', () => {
    const ev = {
      fullName: 'Ana',
      date: new Date('2026-11-07T21:30:00.000Z'),
      payment: { subsequentPayments: [{ amount: 100, date: new Date('2026-10-01T15:00:00.000Z') }] },
      timing: [{ time: '21:00', title: 'Entrada' }],
      empty: null,
      flag: false,
      text: '2026-11-07T21:30:00.000Z' // un string con forma de fecha sigue siendo string
    };
    const back = decodeDraft(encodeDraft(ev));
    expect(back.date).toBeInstanceOf(Date);
    expect(back.date.toISOString()).toBe('2026-11-07T21:30:00.000Z');
    expect(back.payment.subsequentPayments[0].date).toBeInstanceOf(Date);
    expect(typeof back.text).toBe('string');
    expect(back).toEqual(ev);
  });
  it('una fecha inválida vuelve como fecha inválida', () => {
    const back = decodeDraft(encodeDraft({ d: new Date(NaN) }));
    expect(back.d).toBeInstanceOf(Date);
    expect(isNaN(back.d.getTime())).toBe(true);
  });
});

describe('splitEventForDraft', () => {
  it('separa los equipos y no pierde ningún otro campo', () => {
    const ev = { fullName: 'Ana', equipment: [{ _id: 'a', scheduledUses: [{}] }], extraEquipment: [{ name: 'x' }] };
    const { rest, equipment } = splitEventForDraft(ev);
    expect(equipment).toBe(ev.equipment);
    expect(rest).toEqual({ fullName: 'Ana', extraEquipment: [{ name: 'x' }] });
    expect({ ...rest, equipment }).toEqual(ev);
  });
  it('sin equipos devuelve lista vacía', () => {
    expect(splitEventForDraft({ fullName: 'Ana' }).equipment).toEqual([]);
  });
});

describe('isDraftUsable', () => {
  const now = Date.parse('2026-10-14T15:00:00Z');
  it('vigente dentro del plazo', () => {
    expect(isDraftUsable({ v: DRAFT_VERSION, savedAt: now - 10 * 60_000, tab: 2 }, now)).toBe(true);
  });
  it('dura 30 minutos desde el último cambio', () => {
    expect(isDraftUsable({ v: DRAFT_VERSION, savedAt: now - 29 * 60_000, tab: 0 }, now)).toBe(true);
    expect(isDraftUsable({ v: DRAFT_VERSION, savedAt: now - 31 * 60_000, tab: 0 }, now)).toBe(false);
  });
  it('vencido, de otra versión o inexistente: no se usa', () => {
    expect(isDraftUsable({ v: DRAFT_VERSION, savedAt: now - DRAFT_TTL_MS - 1, tab: 0 }, now)).toBe(false);
    expect(isDraftUsable({ v: DRAFT_VERSION + 1, savedAt: now, tab: 0 }, now)).toBe(false);
    expect(isDraftUsable(null, now)).toBe(false);
  });
});

describe('draftAgeLabel / draftKeys', () => {
  const now = Date.parse('2026-10-14T15:00:00Z');
  it('etiqueta legible', () => {
    expect(draftAgeLabel(now - 20_000, now)).toBe('hace un momento');
    expect(draftAgeLabel(now - 5 * 60_000, now)).toBe('hace 5 min');
    expect(draftAgeLabel(now - 130 * 60_000, now)).toBe('hace 2 h');
  });
  it('claves separadas por usuario', () => {
    expect(draftKeys('auth0|a').event).not.toBe(draftKeys('auth0|b').event);
  });
});

describe('hasDraftContent', () => {
  const pristine = { fullName: '', equipment: [], folderId: 'evt-1', payment: { totalToPay: 0 } };
  it('campos vacíos agregados por los formularios no cuentan', () => {
    expect(hasDraftContent({ ...pristine, extraClients: [], timing: [], music: { opening: { title: '' } } }, pristine)).toBe(false);
  });
  it('folderId distinto no cuenta', () => {
    expect(hasDraftContent({ ...pristine, folderId: 'evt-2' }, pristine)).toBe(false);
  });
  it('cualquier dato real cuenta', () => {
    expect(hasDraftContent({ ...pristine, fullName: 'Ana' }, pristine)).toBe(true);
    expect(hasDraftContent({ ...pristine, date: new Date('2026-11-07T21:30:00Z') }, pristine)).toBe(true);
    expect(hasDraftContent({ ...pristine, equipment: [{ _id: 'a' }] }, pristine)).toBe(true);
    expect(hasDraftContent({ ...pristine, payment: { totalToPay: 1000 } }, pristine)).toBe(true);
  });
});
