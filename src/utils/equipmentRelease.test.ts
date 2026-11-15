import { describe, it, expect } from 'vitest';
import { endOfArgentineDay, pickReleasable, liveEventEquipmentIds, pickActivations, ReleaseCandidate } from './equipmentRelease';

// Domingo 15/11/2026 15:00 hora argentina
const NOW = new Date('2026-11-15T18:00:00.000Z');
const END_OF_TODAY = endOfArgentineDay(NOW);

const eq = (over: Partial<ReleaseCandidate> = {}): ReleaseCandidate => ({
  _id: 'eq1',
  lastUsedEndDate: '2026-10-25T06:00:00.000Z',
  scheduledUses: [],
  ...over
});
const use = (start: string, end: string) => ({ startDate: start, endDate: end });
const ids = (list: ReleaseCandidate[], busy: string[] = []) => pickReleasable(list, new Set(busy), NOW).map((e) => e._id);

describe('endOfArgentineDay', () => {
  it('fin del día argentino (UTC-3)', () => {
    expect(END_OF_TODAY.toISOString()).toBe('2026-11-16T02:59:59.999Z');
    // 23:30 AR del 15 sigue siendo el 15
    expect(endOfArgentineDay(new Date('2026-11-16T02:30:00.000Z')).toISOString()).toBe('2026-11-16T02:59:59.999Z');
  });
});

describe('pickReleasable: SE LIBERA solo con certeza', () => {
  it('caso Truss: evento terminado hace semanas + solo una reserva FUTURA → se libera', () => {
    const truss = eq({ scheduledUses: [use('2026-11-16T11:30:00.000Z', '2026-11-23T11:30:00.000Z')] });
    expect(ids([truss])).toEqual(['eq1']);
  });
  it('evento terminado y sin reservas → se libera', () => {
    expect(ids([eq()])).toEqual(['eq1']);
  });
  it('acepta fechas como Date o como texto ISO', () => {
    expect(ids([eq({ lastUsedEndDate: new Date('2026-10-25T06:00:00.000Z') })])).toEqual(['eq1']);
  });
});

describe('pickReleasable: ANTE LA DUDA, sigue "En uso"', () => {
  it('reserva EN CURSO → no se libera', () => {
    expect(ids([eq({ scheduledUses: [use('2026-11-15T12:00:00.000Z', '2026-11-16T06:00:00.000Z')] })])).toEqual([]);
  });
  it('evento de HOY que todavía no empezó → no se libera', () => {
    expect(ids([eq({ scheduledUses: [use('2026-11-15T23:00:00.000Z', '2026-11-16T05:00:00.000Z')] })])).toEqual([]);
  });
  it('reserva de mañana temprano (no es hoy) no impide liberar', () => {
    expect(ids([eq({ scheduledUses: [use('2026-11-16T12:00:00.000Z', '2026-11-16T20:00:00.000Z')] })])).toEqual(['eq1']);
  });
  it('último uso que todavía no terminó → no se libera', () => {
    expect(ids([eq({ lastUsedEndDate: '2026-11-15T20:00:00.000Z' })])).toEqual([]);
  });
  it('sin fecha de último uso (marcado a mano u origen desconocido) → no se libera', () => {
    expect(ids([eq({ lastUsedEndDate: null })])).toEqual([]);
    expect(ids([eq({ lastUsedEndDate: undefined })])).toEqual([]);
    expect(ids([eq({ lastUsedEndDate: 'basura' })])).toEqual([]);
  });
  it('reserva con fechas rotas → no se libera', () => {
    expect(ids([eq({ scheduledUses: [use('nada', 'nada')] })])).toEqual([]);
  });
  it('figura en un EVENTO real en curso o de hoy (aunque scheduledUses diga otra cosa) → no se libera', () => {
    expect(ids([eq()], ['eq1'])).toEqual([]);
  });
  it('mezcla: libera solo los seguros', () => {
    const list = [
      eq({ _id: 'libre' }),
      eq({ _id: 'enCurso', scheduledUses: [use('2026-11-15T12:00:00.000Z', '2026-11-16T06:00:00.000Z')] }),
      eq({ _id: 'sinFecha', lastUsedEndDate: null }),
      eq({ _id: 'enEvento' })
    ];
    expect(ids(list, ['enEvento'])).toEqual(['libre']);
  });
});

describe('liveEventEquipmentIds: equipos de eventos en curso o de HOY (día argentino)', () => {
  const ev = (date: any, endDate: any, ids: any[]) => ({ date, endDate, equipment: ids.map((_id) => ({ _id })) });
  it('en curso y los de HOY que todavía no terminaron cuentan como ocupados; mañana NO', () => {
    const r = liveEventEquipmentIds(
      [
        ev('2026-11-15T12:00:00.000Z', '2026-11-16T06:00:00.000Z', ['enCurso']),
        ev('2026-11-15T23:00:00.000Z', '2026-11-16T05:00:00.000Z', ['estaNoche']), // hoy 20:00 AR
        ev('2026-11-16T11:30:00.000Z', '2026-11-23T11:30:00.000Z', ['mañana']), // caso Alquiler UF PRO: hoy están disponibles
        ev('2026-11-20T12:00:00.000Z', '2026-11-21T06:00:00.000Z', ['laSemanaQueViene']),
        ev('2026-10-23T12:00:00.000Z', '2026-10-25T06:00:00.000Z', ['terminado'])
      ],
      NOW
    );
    expect([...r].sort()).toEqual(['enCurso', 'estaNoche']);
  });
  it('fechas como texto o Date; ids como texto u ObjectId', () => {
    const oid = { toString: () => 'oid1' };
    const r = liveEventEquipmentIds([ev(new Date('2026-11-15T12:00:00.000Z'), '2026-11-16T06:00:00.000Z', [oid])], NOW);
    expect([...r]).toEqual(['oid1']);
  });
  it('evento con fechas rotas: por las dudas sus equipos cuentan como ocupados', () => {
    expect([...liveEventEquipmentIds([ev('nada', null, ['x'])], NOW)]).toEqual(['x']);
  });
});

describe('pickActivations: cuando una reserva EMPIEZA, el equipo pasa a "En uso"', () => {
  const alquiler = {
    eventId: 'alq1',
    eventName: 'Alquiler',
    location: 'UF PRO',
    startDate: '2026-11-15T11:30:00.000Z', // empezó hoy a la mañana
    endDate: '2026-11-23T11:30:00.000Z'
  };
  const item = (over: any = {}) => ({ _id: 'eq1', outOfService: { isOut: false, reason: null }, scheduledUses: [alquiler], ...over });
  const act = (list: any[]) => pickActivations(list, NOW);

  it('disponible con una reserva en curso → se marca "En uso" con los datos de ese evento', () => {
    expect(act([item()])).toEqual([
      {
        _id: 'eq1',
        set: {
          location: 'UF PRO',
          lastUsedStartDate: new Date(alquiler.startDate),
          lastUsedEndDate: new Date(alquiler.endDate),
          outOfService: { isOut: true, reason: 'En Evento', details: 'Alquiler - UF PRO' }
        },
        use: alquiler
      }
    ]);
  });
  it('caso Truss: trabado "En uso" de OTRO evento viejo → se actualiza al evento en curso', () => {
    const truss = item({
      location: 'Colonia del Banco Provincia',
      lastUsedStartDate: '2026-10-23T12:00:00.000Z',
      lastUsedEndDate: '2026-10-25T06:00:00.000Z',
      outOfService: { isOut: true, reason: 'En Evento', details: 'Evento Recreativo - Colonia del Banco Provincia' }
    });
    expect(act([truss]).map((a) => a.set.location)).toEqual(['UF PRO']);
  });
  it('ya marcado con ESE mismo evento → no se toca (no repite historial)', () => {
    const ya = item({ lastUsedStartDate: alquiler.startDate, lastUsedEndDate: new Date(alquiler.endDate), outOfService: { isOut: true, reason: 'En Evento' } });
    expect(act([ya])).toEqual([]);
  });
  it('dado de baja a mano (reparación, etc.) → NUNCA se pisa', () => {
    expect(act([item({ outOfService: { isOut: true, reason: 'Reparación' } })])).toEqual([]);
  });
  it('sin reserva en curso (futura o pasada) → no se marca', () => {
    expect(act([item({ scheduledUses: [{ ...alquiler, startDate: '2026-11-16T11:30:00.000Z' }] })])).toEqual([]);
    expect(act([item({ scheduledUses: [{ ...alquiler, endDate: '2026-11-15T12:00:00.000Z' }] })])).toEqual([]);
  });
  it('dos reservas en curso (no debería pasar): toma la que empezó primero', () => {
    const otra = { ...alquiler, eventId: 'ev2', eventName: 'Boda', location: 'Casas Viejas', startDate: '2026-11-15T09:00:00.000Z' };
    expect(act([item({ scheduledUses: [alquiler, otra] })])[0].set.location).toBe('Casas Viejas');
  });
  it('reserva con fechas rotas se ignora (no activa nada por error)', () => {
    expect(act([item({ scheduledUses: [{ ...alquiler, startDate: 'nada' }] })])).toEqual([]);
  });
});
