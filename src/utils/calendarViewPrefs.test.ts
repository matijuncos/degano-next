import { describe, it, expect } from 'vitest';
import { DEFAULT_VIEW_PREFS, parseViewPrefs, pruneHiddenIds, viewPrefsKey, showInternalEvent } from './calendarViewPrefs';

describe('parseViewPrefs', () => {
  it('sin valor guardado devuelve el default (todo visible)', () => {
    expect(parseViewPrefs(null)).toEqual(DEFAULT_VIEW_PREFS);
  });

  it('JSON corrupto devuelve el default', () => {
    expect(parseViewPrefs('{no es json')).toEqual(DEFAULT_VIEW_PREFS);
  });

  it('lee ids ocultos y el estado de los eventos nativos', () => {
    const raw = JSON.stringify({ hiddenCalendarIds: ['a', 'b'], nativeEventsHidden: true, rentalsHidden: true });
    expect(parseViewPrefs(raw)).toEqual({ hiddenCalendarIds: ['a', 'b'], nativeEventsHidden: true, rentalsHidden: true });
  });

  it('descarta valores que no son string y duplicados', () => {
    const raw = JSON.stringify({ hiddenCalendarIds: ['a', 1, null, 'a'], nativeEventsHidden: 'si', rentalsHidden: 1 });
    expect(parseViewPrefs(raw)).toEqual({ hiddenCalendarIds: ['a'], nativeEventsHidden: false, rentalsHidden: false });
  });

  it('preferencias guardadas antes de existir el tilde de alquileres: alquileres visibles', () => {
    const raw = JSON.stringify({ hiddenCalendarIds: [], nativeEventsHidden: true });
    expect(parseViewPrefs(raw).rentalsHidden).toBe(false);
  });
});

describe('pruneHiddenIds', () => {
  it('quita calendarios que ya no existen', () => {
    expect(pruneHiddenIds(['a', 'borrado', 'c'], ['a', 'b', 'c'])).toEqual(['a', 'c']);
  });

  it('un calendario nuevo no queda oculto', () => {
    expect(pruneHiddenIds(['a'], ['a', 'nuevo'])).not.toContain('nuevo');
  });
});

describe('viewPrefsKey', () => {
  it('separa preferencias por usuario', () => {
    expect(viewPrefsKey('auth0|1')).not.toBe(viewPrefsKey('auth0|2'));
  });
});

describe('showInternalEvent: tildes "Eventos" y "Alquileres" por separado', () => {
  const evento = { eventKind: undefined };
  const alquiler = { eventKind: 'alquiler' };
  const prefs = (nativeEventsHidden: boolean, rentalsHidden: boolean) => ({ hiddenCalendarIds: [], nativeEventsHidden, rentalsHidden });
  it('por defecto se ven los dos', () => {
    expect(showInternalEvent(evento, DEFAULT_VIEW_PREFS)).toBe(true);
    expect(showInternalEvent(alquiler, DEFAULT_VIEW_PREFS)).toBe(true);
  });
  it('destildar "Eventos" oculta los comunes pero NO los alquileres', () => {
    expect(showInternalEvent(evento, prefs(true, false))).toBe(false);
    expect(showInternalEvent(alquiler, prefs(true, false))).toBe(true);
  });
  it('destildar "Alquileres" oculta solo los alquileres', () => {
    expect(showInternalEvent(evento, prefs(false, true))).toBe(true);
    expect(showInternalEvent(alquiler, prefs(false, true))).toBe(false);
  });
});
