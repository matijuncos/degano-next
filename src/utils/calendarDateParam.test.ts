import { describe, it, expect } from 'vitest';
import { parseCalendarDateParam, formatCalendarDateParam, monthStartFromPicker, pickerValueFromDate } from './calendarDateParam';

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

describe('ir a mes (selector)', () => {
  it('va al día 1 del mes elegido, en hora local', () => {
    expect(ymd(monthStartFromPicker('2019-03-01')!)).toEqual([2019, 3, 1]);
    expect(ymd(monthStartFromPicker('2031-12-15')!)).toEqual([2031, 12, 1]);
    expect(ymd(monthStartFromPicker(new Date(2025, 6, 20))!)).toEqual([2025, 7, 1]);
  });
  it('vacío o inválido → null', () => {
    expect(monthStartFromPicker(null)).toBeNull();
    expect(monthStartFromPicker('basura')).toBeNull();
    expect(monthStartFromPicker(new Date('x'))).toBeNull();
  });
  it('el selector muestra el mes visible', () => {
    expect(pickerValueFromDate(new Date(2026, 9, 26))).toBe('2026-10-01');
  });
});
