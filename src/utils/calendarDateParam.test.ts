import { describe, it, expect } from 'vitest';
import { parseCalendarDateParam, formatCalendarDateParam } from './calendarDateParam';

const ymd = (d: Date) => [d.getFullYear(), d.getMonth() + 1, d.getDate()];

describe('parseCalendarDateParam', () => {
  it('AAAA-MM-DD es ese día local (no el anterior)', () => {
    expect(ymd(parseCalendarDateParam('2026-11-06'))).toEqual([2026, 11, 6]);
  });
  it('sigue leyendo links viejos con ISO completo', () => {
    const d = parseCalendarDateParam('2026-11-07T03:00:00.000Z');
    expect(d.getTime()).toBe(Date.parse('2026-11-07T03:00:00.000Z'));
  });
  it('vacío o inválido → hoy', () => {
    const now = new Date(2026, 9, 15);
    expect(parseCalendarDateParam(null, now)).toBe(now);
    expect(parseCalendarDateParam('cualquier-cosa', now)).toBe(now);
  });
});

describe('formatCalendarDateParam', () => {
  it('escribe el día local y es reversible', () => {
    const d = new Date(2026, 10, 6, 23, 30);
    expect(formatCalendarDateParam(d)).toBe('2026-11-06');
    expect(ymd(parseCalendarDateParam(formatCalendarDateParam(d)))).toEqual([2026, 11, 6]);
  });
});
