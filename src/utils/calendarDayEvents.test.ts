import { describe, it, expect } from 'vitest';
import { eventsForDay, dayEventTime, isMultiDayEvent, singleDayEventsByDay, dayKey } from './calendarDayEvents';

const d = (y: number, m: number, day: number, h = 0, min = 0) => new Date(y, m - 1, day, h, min);

describe('eventsForDay', () => {
  const day = d(2026, 11, 14);
  const events = [
    { id: 'tarde', start: d(2026, 11, 14, 20), end: d(2026, 11, 15, 4) },
    { id: 'maniana', start: d(2026, 11, 14, 9), end: d(2026, 11, 14, 12) },
    { id: 'varios', start: d(2026, 11, 12, 9), end: d(2026, 11, 16, 18) },
    { id: 'todoElDia', start: d(2026, 11, 14), end: d(2026, 11, 15), allDay: true },
    { id: 'otroDia', start: d(2026, 11, 15, 9), end: d(2026, 11, 15, 10) },
    { id: 'todoElDiaAnterior', start: d(2026, 11, 13), end: d(2026, 11, 14), allDay: true }
  ];
  it('incluye lo que pasa ese día (también los de varios días) y nada más', () => {
    expect(eventsForDay(events, day).map((e) => e.id)).toEqual(['todoElDia', 'varios', 'maniana', 'tarde']);
  });
  it('un evento que termina de madrugada también es del día siguiente', () => {
    expect(eventsForDay(events, d(2026, 11, 15)).map((e) => e.id)).toContain('tarde');
  });
});

describe('dayEventTime', () => {
  const day = d(2026, 11, 14);
  it('horarios relativos al día', () => {
    expect(dayEventTime({ start: d(2026, 11, 14, 9), end: d(2026, 11, 14, 12) }, day)).toBe('09:00 – 12:00');
    expect(dayEventTime({ start: d(2026, 11, 14, 20), end: d(2026, 11, 15, 4) }, day)).toBe('20:00 – 04:00 (+1)');
    expect(dayEventTime({ start: d(2026, 11, 12, 9), end: d(2026, 11, 16, 18) }, day)).toBe('Desde el 12/11 – hasta el 16/11');
    expect(dayEventTime({ start: d(2026, 11, 14), end: d(2026, 11, 15), allDay: true }, day)).toBe('Todo el día');
  });
});

describe('eventos de un día vs varios días (grilla del mes)', () => {
  it('clasifica', () => {
    expect(isMultiDayEvent({ start: d(2026, 11, 12, 9), end: d(2026, 11, 16, 18) })).toBe(true);
    expect(isMultiDayEvent({ start: d(2026, 11, 14, 9), end: d(2026, 11, 14, 12) })).toBe(false);
    // Todo el día de un solo día (termina 00:00 del siguiente)
    expect(isMultiDayEvent({ start: d(2026, 11, 14), end: d(2026, 11, 15), allDay: true })).toBe(false);
    expect(isMultiDayEvent({ start: d(2026, 11, 14), end: d(2026, 11, 16), allDay: true })).toBe(true);
  });
  it('agrupa por día solo los de un día, ordenados', () => {
    const map = singleDayEventsByDay([
      { id: 'b', start: d(2026, 11, 14, 20), end: d(2026, 11, 14, 23) },
      { id: 'a', start: d(2026, 11, 14, 9), end: d(2026, 11, 14, 12) },
      { id: 'largo', start: d(2026, 11, 12, 9), end: d(2026, 11, 16, 18) }
    ]);
    expect(map.get(dayKey(d(2026, 11, 14)))!.map((e) => e.id)).toEqual(['a', 'b']);
    expect([...map.values()].flat().some((e) => e.id === 'largo')).toBe(false);
  });
});
