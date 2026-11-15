import { describe, it, expect } from 'vitest';
import {
  MAX_ARRIVAL_LEAD_DAYS,
  NEAR_EVENT_HOURS,
  arrivalStart,
  arrivalConfirmKey,
  needsArrivalConfirm,
  reservationStart,
  reservationStartIso,
  arDateTimeLabel,
  nearUses
} from './reservationRange';

// Evento: lunes 7/12/2026 19:00 AR (22:00 UTC) → 8/12 04:00 AR
const ev = (over: any = {}) => ({
  date: '2026-12-07T22:00:00.000Z',
  endDate: '2026-12-08T07:00:00.000Z',
  ...over
});
const iso = (d: Date | null) => (d ? d.toISOString() : null);

describe('arrivalStart: fecha + hora de llegada del equipamiento (hora argentina)', () => {
  it('fecha "YYYY-MM-DD" + hora "HH:mm"', () => {
    expect(iso(arrivalStart(ev({ equipmentArrivalDate: '2026-12-07', equipmentArrivalTime: '16:30' })))).toBe('2026-12-07T19:30:00.000Z');
  });
  it('sin hora: desde las 00:00 de ese día (lo más conservador)', () => {
    expect(iso(arrivalStart(ev({ equipmentArrivalDate: '2026-12-06' })))).toBe('2026-12-06T03:00:00.000Z');
  });
  it('fecha guardada como Date (medianoche AR) también sirve', () => {
    expect(iso(arrivalStart(ev({ equipmentArrivalDate: new Date('2026-12-06T03:00:00.000Z'), equipmentArrivalTime: '18:00' })))).toBe('2026-12-06T21:00:00.000Z');
  });
  it('sin fecha o fecha rota: null', () => {
    expect(arrivalStart(ev())).toBeNull();
    expect(arrivalStart(ev({ equipmentArrivalDate: 'basura' }))).toBeNull();
    expect(arrivalStart(ev({ equipmentArrivalDate: '' }))).toBeNull();
  });
});

describe('reservationStart: la reserva arranca con la llegada del equipamiento', () => {
  it('llegada unas horas antes: arranca en la llegada', () => {
    expect(iso(reservationStart(ev({ equipmentArrivalDate: '2026-12-07', equipmentArrivalTime: '16:30' })))).toBe('2026-12-07T19:30:00.000Z');
  });
  it('sin llegada: arranca con el evento (como siempre)', () => {
    expect(iso(reservationStart(ev()))).toBe('2026-12-07T22:00:00.000Z');
  });
  it('llegada DESPUÉS del inicio (error): arranca con el evento', () => {
    expect(iso(reservationStart(ev({ equipmentArrivalDate: '2026-12-07', equipmentArrivalTime: '20:00' })))).toBe('2026-12-07T22:00:00.000Z');
  });
  it(`tope: hasta ${MAX_ARRIVAL_LEAD_DAYS} días antes se usa directo`, () => {
    expect(MAX_ARRIVAL_LEAD_DAYS).toBe(3);
    expect(iso(reservationStart(ev({ equipmentArrivalDate: '2026-12-04', equipmentArrivalTime: '19:00' })))).toBe('2026-12-04T22:00:00.000Z');
  });
  it('más de 3 días antes SIN confirmar (ej. error de tipeo): arranca con el evento', () => {
    const kinder = ev({ equipmentArrivalDate: '2026-11-07', equipmentArrivalTime: '15:00' });
    expect(needsArrivalConfirm(kinder)).toBe(true);
    expect(iso(reservationStart(kinder))).toBe('2026-12-07T22:00:00.000Z');
  });
  it('más de 3 días antes CONFIRMADO para esas fechas: arranca en la llegada', () => {
    const base = ev({ equipmentArrivalDate: '2026-11-30', equipmentArrivalTime: '09:00' });
    const ok = { ...base, equipmentArrivalConfirmedFor: arrivalConfirmKey(base) };
    expect(needsArrivalConfirm(ok)).toBe(false);
    expect(iso(reservationStart(ok))).toBe('2026-11-30T12:00:00.000Z');
  });
  it('la confirmación deja de valer si cambia la llegada o la fecha del evento', () => {
    const base = ev({ equipmentArrivalDate: '2026-11-30', equipmentArrivalTime: '09:00' });
    const key = arrivalConfirmKey(base);
    expect(needsArrivalConfirm({ ...base, equipmentArrivalTime: '08:00', equipmentArrivalConfirmedFor: key })).toBe(true);
    expect(needsArrivalConfirm({ ...base, date: '2026-12-08T22:00:00.000Z', equipmentArrivalConfirmedFor: key })).toBe(true);
  });
  it('dentro del tope no hace falta confirmar', () => {
    expect(needsArrivalConfirm(ev({ equipmentArrivalDate: '2026-12-07', equipmentArrivalTime: '10:00' }))).toBe(false);
    expect(needsArrivalConfirm(ev())).toBe(false);
  });
});

describe(`nearUses: otro evento a menos de ${NEAR_EVENT_HOURS} h (aviso, no bloqueo)`, () => {
  // Reserva de este evento: 7/12 19:30Z → 8/12 07:00Z
  const START = '2026-12-07T19:30:00.000Z';
  const END = '2026-12-08T07:00:00.000Z';
  const u = (id: string, s: string, e: string) => ({ eventId: id, eventName: id, location: 'L', startDate: s, endDate: e });
  it('detecta el que termina poco antes y el que empieza poco después, con las horas de margen', () => {
    const r = nearUses(
      [
        u('antes', '2026-12-07T08:00:00.000Z', '2026-12-07T16:30:00.000Z'), // termina 3 h antes
        u('despues', '2026-12-08T09:00:00.000Z', '2026-12-08T20:00:00.000Z'), // empieza 2 h después
        u('lejos', '2026-12-09T09:00:00.000Z', '2026-12-09T20:00:00.000Z'),
        u('choca', '2026-12-07T23:00:00.000Z', '2026-12-08T02:00:00.000Z') // se superpone: eso es choque, no aviso
      ],
      START,
      END
    );
    expect(r.map((x) => `${x.use.eventId}:${x.side}:${x.gapHours}`)).toEqual(['antes:antes:3', 'despues:despues:2']);
  });
  it('justo 6 h de margen no avisa; 5,5 h sí', () => {
    expect(nearUses([u('a', '2026-12-07T08:00:00.000Z', '2026-12-07T13:30:00.000Z')], START, END)).toEqual([]);
    expect(nearUses([u('a', '2026-12-07T08:00:00.000Z', '2026-12-07T14:00:00.000Z')], START, END).length).toBe(1);
  });
  it('ignora las reservas del propio evento y las fechas rotas', () => {
    expect(nearUses([u('yo', '2026-12-07T08:00:00.000Z', '2026-12-07T16:30:00.000Z')], START, END, 'yo')).toEqual([]);
    expect(nearUses([u('x', 'nada', 'nada')], START, END)).toEqual([]);
  });
});

describe('reservationStartIso (para la UI)', () => {
  it('fechas inválidas o sin fecha: undefined (no rompe la pantalla)', () => {
    expect(reservationStartIso(null)).toBeUndefined();
    expect(reservationStartIso({ date: '' })).toBeUndefined();
    expect(reservationStartIso({ date: 'basura' })).toBeUndefined();
    expect(reservationStartIso(ev({ equipmentArrivalDate: '2026-12-07', equipmentArrivalTime: '16:30' }))).toBe('2026-12-07T19:30:00.000Z');
  });
});

describe('arDateTimeLabel', () => {
  it('fecha y hora en hora argentina, ej. "dom 01/11 15:00"', () => {
    expect(arDateTimeLabel(new Date('2026-11-01T18:00:00.000Z'))).toBe('dom 01/11 15:00');
    expect(arDateTimeLabel('2026-12-07T22:00:00.000Z')).toBe('lun 07/12 19:00');
    expect(arDateTimeLabel('basura')).toBe('');
  });
});
