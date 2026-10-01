import { describe, it, expect } from 'vitest';
import { DEFAULT_VIEW_PREFS, parseViewPrefs, pruneHiddenIds, viewPrefsKey } from './calendarViewPrefs';

describe('parseViewPrefs', () => {
  it('sin valor guardado devuelve el default (todo visible)', () => {
    expect(parseViewPrefs(null)).toEqual(DEFAULT_VIEW_PREFS);
  });

  it('JSON corrupto devuelve el default', () => {
    expect(parseViewPrefs('{no es json')).toEqual(DEFAULT_VIEW_PREFS);
  });

  it('lee ids ocultos y el estado de los eventos nativos', () => {
    const raw = JSON.stringify({ hiddenCalendarIds: ['a', 'b'], nativeEventsHidden: true });
    expect(parseViewPrefs(raw)).toEqual({ hiddenCalendarIds: ['a', 'b'], nativeEventsHidden: true });
  });

  it('descarta valores que no son string y duplicados', () => {
    const raw = JSON.stringify({ hiddenCalendarIds: ['a', 1, null, 'a'], nativeEventsHidden: 'si' });
    expect(parseViewPrefs(raw)).toEqual({ hiddenCalendarIds: ['a'], nativeEventsHidden: false });
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
