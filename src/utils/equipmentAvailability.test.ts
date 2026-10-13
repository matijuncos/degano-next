import { describe, it, expect } from 'vitest';
import {
  rangesOverlap,
  hasScheduleConflict,
  isEquipmentUnavailable,
  getUnavailabilityReason,
  ghostEventIdToIgnore,
  equipmentAvailabilityUrl,
  conflictingUses,
  usesInProgress,
  formatUseRange
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

describe('ghostEventIdToIgnore', () => {
  const saved = new Set(['eqA']);
  it('sin evento no ignora nada', () => {
    expect(ghostEventIdToIgnore('eqB', undefined, saved)).toBeUndefined();
  });
  it('equipo guardado en el evento: no se ignora su reserva', () => {
    expect(ghostEventIdToIgnore('eqA', 'ev1', saved)).toBeUndefined();
  });
  it('equipo que no está en el evento: se ignora la reserva fantasma', () => {
    expect(ghostEventIdToIgnore('eqB', 'ev1', saved)).toBe('ev1');
  });
  it('combinado con hasScheduleConflict: la fantasma no bloquea, otro evento sí', () => {
    const uses = [
      { eventId: 'ev1', startDate: '2026-11-07T21:30:00Z', endDate: '2026-11-08T07:00:00Z' }
    ];
    const ignore = ghostEventIdToIgnore('eqB', 'ev1', saved);
    expect(hasScheduleConflict('2026-11-07T21:30:00Z', '2026-11-08T07:00:00Z', uses, { ignoreEventId: ignore })).toBe(false);
    const other = [...uses, { eventId: 'ev2', startDate: '2026-11-08T00:00:00Z', endDate: '2026-11-08T05:00:00Z' }];
    expect(hasScheduleConflict('2026-11-07T21:30:00Z', '2026-11-08T07:00:00Z', other, { ignoreEventId: ignore })).toBe(true);
  });
});

describe('equipmentAvailabilityUrl', () => {
  it('sin fechas devuelve la URL general', () => {
    expect(equipmentAvailabilityUrl(undefined, '2026-11-08T07:00:00Z', 'ev1')).toBe('/api/equipment');
  });
  it('con fechas y sin evento: igual que antes', () => {
    expect(equipmentAvailabilityUrl('2026-11-07T21:30:00Z', '2026-11-08T07:00:00Z')).toBe(
      '/api/equipment?eventStartDate=2026-11-07T21:30:00.000Z&eventEndDate=2026-11-08T07:00:00.000Z'
    );
  });
  it('con evento agrega excludeEventId', () => {
    expect(equipmentAvailabilityUrl('2026-11-07T21:30:00Z', '2026-11-08T07:00:00Z', 'ev1')).toBe(
      '/api/equipment?eventStartDate=2026-11-07T21:30:00.000Z&eventEndDate=2026-11-08T07:00:00.000Z&excludeEventId=ev1'
    );
  });
});

describe('conflictingUses', () => {
  const uses = [
    { eventId: 'a', startDate: '2026-11-07T00:00:00Z', endDate: '2026-11-07T08:00:00Z' },
    { eventId: 'b', startDate: '2026-11-07T21:30:00Z', endDate: '2026-11-08T07:00:00Z' },
    { eventId: 'c', startDate: '2026-11-08T16:00:00Z', endDate: '2026-11-08T21:00:00Z' }
  ];
  it('devuelve solo las reservas que se solapan', () => {
    expect(conflictingUses('2026-11-07T20:00:00Z', '2026-11-08T05:00:00Z', uses).map((u) => u.eventId)).toEqual(['b']);
  });
  it('respeta ignoreEventId igual que hasScheduleConflict', () => {
    expect(conflictingUses('2026-11-07T20:00:00Z', '2026-11-08T05:00:00Z', uses, { ignoreEventId: 'b' })).toEqual([]);
    expect(hasScheduleConflict('2026-11-07T20:00:00Z', '2026-11-08T05:00:00Z', uses, { ignoreEventId: 'b' })).toBe(false);
  });
});

describe('usesInProgress', () => {
  const uses = [
    { eventId: 'a', startDate: '2026-11-07T00:00:00Z', endDate: '2026-11-07T08:00:00Z' },
    { eventId: 'b', startDate: '2026-11-07T21:30:00Z', endDate: '2026-11-08T07:00:00Z' }
  ];
  it('devuelve la reserva en curso', () => {
    expect(usesInProgress(uses, d('2026-11-07T03:00:00Z')).map((u) => u.eventId)).toEqual(['a']);
  });
  it('sin reservas en curso devuelve vacío', () => {
    expect(usesInProgress(uses, d('2026-11-07T12:00:00Z'))).toEqual([]);
    expect(usesInProgress(undefined)).toEqual([]);
  });
});

describe('formatUseRange', () => {
  it('muestra el rango en hora argentina cruzando la medianoche', () => {
    expect(formatUseRange('2026-11-07T21:30:00Z', '2026-11-08T07:00:00Z')).toBe('sáb 07/11 18:30 → dom 08/11 04:00');
  });
  it('si termina el mismo día no repite la fecha', () => {
    expect(formatUseRange('2026-11-08T16:00:00Z', '2026-11-08T21:00:00Z')).toBe('dom 08/11 13:00 → 18:00');
  });
});
