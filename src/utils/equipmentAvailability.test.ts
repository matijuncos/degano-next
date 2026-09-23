import { describe, it, expect } from 'vitest';
import {
  rangesOverlap,
  hasScheduleConflict,
  isEquipmentUnavailable,
  getUnavailabilityReason
} from './equipmentAvailability';

// Helper: fechas legibles
const d = (s: string) => new Date(s);

describe('rangesOverlap', () => {
  it('detecta solapamiento parcial (B empieza durante A)', () => {
    expect(
      rangesOverlap('2026-05-10T10:00', '2026-05-10T20:00', '2026-05-10T18:00', '2026-05-11T02:00')
    ).toBe(true);
  });

  it('detecta cuando un rango contiene al otro', () => {
    expect(
      rangesOverlap('2026-05-10T08:00', '2026-05-12T08:00', '2026-05-11T00:00', '2026-05-11T06:00')
    ).toBe(true);
  });

  it('es simétrico (no importa el orden de los argumentos)', () => {
    const a: [string, string] = ['2026-05-10T10:00', '2026-05-10T20:00'];
    const b: [string, string] = ['2026-05-10T18:00', '2026-05-11T02:00'];
    expect(rangesOverlap(...a, ...b)).toBe(rangesOverlap(...b, ...a));
  });

  it('NO solapa cuando son días distintos', () => {
    expect(
      rangesOverlap('2026-05-10T10:00', '2026-05-10T20:00', '2026-05-15T10:00', '2026-05-15T20:00')
    ).toBe(false);
  });

  it('NO solapa cuando se tocan en el borde (fin == inicio)', () => {
    // Un evento puede empezar justo cuando termina el anterior
    expect(
      rangesOverlap('2026-05-10T10:00', '2026-05-10T20:00', '2026-05-10T20:00', '2026-05-11T02:00')
    ).toBe(false);
  });

  it('acepta objetos Date además de strings', () => {
    expect(
      rangesOverlap(d('2026-05-10T10:00'), d('2026-05-10T20:00'), d('2026-05-10T15:00'), d('2026-05-10T22:00'))
    ).toBe(true);
  });

  it('devuelve false ante fechas inválidas (no bloquea de más)', () => {
    expect(rangesOverlap('no-es-fecha', '2026-05-10', '2026-05-10', '2026-05-11')).toBe(false);
  });
});

describe('hasScheduleConflict', () => {
  const uses = [
    { eventId: 'evento-A', startDate: '2026-05-10T10:00', endDate: '2026-05-10T23:00' },
    { eventId: 'evento-B', startDate: '2026-06-01T10:00', endDate: '2026-06-01T23:00' }
  ];

  it('hay conflicto si el rango pisa alguna reserva', () => {
    expect(hasScheduleConflict('2026-05-10T20:00', '2026-05-11T04:00', uses)).toBe(true);
  });

  it('no hay conflicto si el rango está libre', () => {
    expect(hasScheduleConflict('2026-07-01T10:00', '2026-07-01T23:00', uses)).toBe(false);
  });

  it('equipo sin reservas nunca tiene conflicto', () => {
    expect(hasScheduleConflict('2026-05-10T10:00', '2026-05-10T23:00', [])).toBe(false);
    expect(hasScheduleConflict('2026-05-10T10:00', '2026-05-10T23:00', null)).toBe(false);
    expect(hasScheduleConflict('2026-05-10T10:00', '2026-05-10T23:00', undefined)).toBe(false);
  });

  it('ignora las reservas del propio evento que se está editando', () => {
    // Sin ignorar: el equipo choca con su propia reserva
    expect(hasScheduleConflict('2026-05-10T10:00', '2026-05-10T23:00', uses)).toBe(true);
    // Ignorando el evento A: queda libre
    expect(
      hasScheduleConflict('2026-05-10T10:00', '2026-05-10T23:00', uses, {
        ignoreEventId: 'evento-A'
      })
    ).toBe(false);
  });

  it('ignorar un evento NO libera el conflicto con otro evento', () => {
    expect(
      hasScheduleConflict('2026-06-01T12:00', '2026-06-01T20:00', uses, {
        ignoreEventId: 'evento-A'
      })
    ).toBe(true);
  });
});

describe('isEquipmentUnavailable / getUnavailabilityReason', () => {
  it('un equipo en reparación NO está disponible', () => {
    expect(isEquipmentUnavailable({ isOut: true, reason: 'Reparación' })).toBe(true);
    expect(getUnavailabilityReason({ isOut: true, reason: 'Reparación' })).toBe('Reparación');
  });

  it("'En Evento' NO cuenta como baja (es una reserva, no una falla)", () => {
    expect(isEquipmentUnavailable({ isOut: true, reason: 'En Evento' })).toBe(false);
    expect(getUnavailabilityReason({ isOut: true, reason: 'En Evento' })).toBe('');
  });

  it('equipo sano está disponible', () => {
    expect(isEquipmentUnavailable({ isOut: false })).toBe(false);
    expect(isEquipmentUnavailable(null)).toBe(false);
    expect(isEquipmentUnavailable(undefined)).toBe(false);
  });
});
