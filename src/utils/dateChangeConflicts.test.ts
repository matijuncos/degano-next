import { describe, it, expect } from 'vitest';
import {
  buildConflictReport,
  defaultResolution,
  defaultResolutions,
  hasDuplicateTargets,
  resolutionErrorMessage,
  pruneResolutions,
  reservationUpdateHistory,
  validateResolutions,
  applyLocalResolutions,
  buildChangeNotice,
  stripServerOnlyFields,
  DateConflict,
  OtherEventInfo
} from './dateChangeConflicts';

// Feria extendida: lun 23/11 13:00 → jue 26/11 20:00 (hora AR)
const START = new Date('2026-11-23T16:00:00Z');
const END = new Date('2026-11-26T23:00:00Z');
// Cumpleaños: jue 26/11 17:00 → 23:00 AR
const CUMPLE = { eventId: 'cumple', eventName: 'Cumpleaños de 50', eventType: 'Cumpleaños de 50', location: 'Villa Golf', startDate: '2026-11-26T20:00:00.000Z', endDate: '2026-11-27T02:00:00.000Z' };
const BODA = { eventId: 'boda', eventName: 'Boda', eventType: 'Boda', location: 'Casas Viejas', startDate: '2026-11-26T21:00:00.000Z', endDate: '2026-11-27T05:00:00.000Z' };
const NOW = new Date('2026-11-21T15:00:00Z');

const unit = (id: string, name: string, code: string, uses: any[] = [], extra: any = {}) => ({
  _id: id, name, code, categoryId: 'consolas', scheduledUses: uses, rentalPrice: 1000, ...extra
});

const CNSL03 = unit('c03', 'Zed 12FX', 'CNSL-03', [{ eventId: 'feria', startDate: START, endDate: '2026-11-25T23:00:00Z' }, CUMPLE]);
const CNSL07 = unit('c07', 'Zed 12FX', 'CNSL-07');
const CNSL10 = unit('c10', 'Zed 12FX', 'CNSL-10', [BODA]); // ocupada el 26
const QU16 = unit('q16', 'QU-16', 'CNSL-20');
const ROTA = unit('rota', 'Zed 12FX', 'CNSL-99', [], { outOfService: { isOut: true, reason: 'Reparación' } });

const cumpleInfo: OtherEventInfo = { _id: 'cumple', equipmentIds: ['c03', 'tp01'], start: new Date(CUMPLE.startDate), end: new Date(CUMPLE.endDate) };

const report = (over: Partial<Parameters<typeof buildConflictReport>[0]> = {}) =>
  buildConflictReport({
    eventId: 'feria',
    start: START,
    end: END,
    eventEquipmentIds: ['c03'],
    conflictingIds: ['c03'],
    pool: [CNSL03, CNSL07, CNSL10, QU16, ROTA],
    otherEvents: new Map([['cumple', cumpleInfo]]),
    now: NOW,
    ...over
  });

describe('buildConflictReport', () => {
  it('ofrece acá unidades del mismo modelo libres en todo el rango nuevo, mejor primero', () => {
    const [c] = report();
    expect(c.code).toBe('CNSL-03');
    expect(c.busyWith).toHaveLength(1);
    expect(c.busyWith[0]).toMatchObject({ eventId: 'cumple', eventName: 'Cumpleaños de 50', stale: false });
    expect(c.hereCandidates[0]).toMatchObject({ _id: 'c07', code: 'CNSL-07', isEquivalent: false });
    expect(c.hereCandidates.map((u) => u._id)).not.toContain('c10');
  });

  it('agrega equivalentes de la misma categoría después del mismo modelo', () => {
    const [c] = report();
    expect(c.hereCandidates.map((u) => u.code)).toEqual(['CNSL-07', 'CNSL-20']);
    expect(c.hereCandidates[1].isEquivalent).toBe(true);
  });

  it('nunca propone unidades dadas de baja ni las que ya están en este evento', () => {
    const [c] = report({ eventEquipmentIds: ['c03', 'c07'] });
    const ids = c.hereCandidates.map((u) => u._id);
    expect(ids).not.toContain('rota');
    expect(ids).not.toContain('c07');
  });

  it('otherCandidates: libres en el rango del OTRO evento y que no estén ya en él', () => {
    const [c] = report({ otherEvents: new Map([['cumple', { ...cumpleInfo, equipmentIds: ['c03', 'c07'] }]]) });
    const ids = c.otherCandidates.map((u) => u._id);
    expect(ids).not.toContain('c07');
    expect(ids).not.toContain('c10'); // la boda la ocupa en el horario del cumple
    expect(ids).toContain('q16');
  });

  it('sin otherCandidates si choca con dos eventos', () => {
    const doble = { ...CNSL03, scheduledUses: [...CNSL03.scheduledUses, BODA] };
    const [c] = report({
      pool: [doble, CNSL07, QU16],
      otherEvents: new Map([
        ['cumple', cumpleInfo],
        ['boda', { _id: 'boda', equipmentIds: ['c03'], start: new Date(BODA.startDate), end: new Date(BODA.endDate) }]
      ])
    });
    expect(c.busyWith).toHaveLength(2);
    expect(c.otherCandidates).toEqual([]);
    expect(c.hereCandidates.length).toBeGreaterThan(0);
  });

  it('marca stale si el evento no existe o el equipo ya no está en su lista', () => {
    const [sinEvento] = report({ otherEvents: new Map() });
    expect(sinEvento.busyWith[0].stale).toBe(true);
    expect(sinEvento.otherCandidates).toEqual([]);
    const [sinEquipo] = report({ otherEvents: new Map([['cumple', { ...cumpleInfo, equipmentIds: ['tp01'] }]]) });
    expect(sinEquipo.busyWith[0].stale).toBe(true);
  });

  it('marca otherEventInProgress cuando now está dentro del rango del otro', () => {
    const [c] = report({ now: new Date('2026-11-26T22:00:00Z') });
    expect(c.busyWith[0].otherEventInProgress).toBe(true);
    expect(c.busyWith[0].otherEventEnded).toBe(false);
  });
});

const conflict = (over: Partial<DateConflict> = {}): DateConflict => ({
  equipmentId: 'c03', name: 'Zed 12FX', code: 'CNSL-03', categoryId: 'consolas',
  busyWith: [{ eventId: 'cumple', eventName: 'Cumpleaños de 50', eventType: 'Cumpleaños de 50', location: 'Villa Golf', startDate: CUMPLE.startDate, endDate: CUMPLE.endDate, stale: false, otherEventEnded: false, otherEventInProgress: false }],
  hereCandidates: [{ _id: 'c07', name: 'Zed 12FX', code: 'CNSL-07', sameDay: false, isEquivalent: false }],
  otherCandidates: [{ _id: 'q16', name: 'QU-16', code: 'CNSL-20', sameDay: false, isEquivalent: true }],
  ...over
});

describe('defaultResolution', () => {
  it('reserva sobrante → liberarla', () => {
    const c = conflict({ busyWith: [{ ...conflict().busyWith[0], stale: true }] });
    expect(defaultResolution(c)).toEqual({ equipmentId: 'c03', action: 'releaseOrphan', orphanEventId: 'cumple' });
  });
  it('con unidad libre acá → reemplazar acá con la primera', () => {
    expect(defaultResolution(conflict())).toEqual({ equipmentId: 'c03', action: 'replaceHere', toId: 'c07' });
  });
  it('sin unidad acá y con otro evento no en curso → cambiar en el otro', () => {
    expect(defaultResolution(conflict({ hereCandidates: [] }))).toEqual({ equipmentId: 'c03', action: 'replaceInOther', otherEventId: 'cumple', toId: 'q16' });
  });
  it('otro evento en curso y sin unidad acá → que elija el usuario', () => {
    const c = conflict({ hereCandidates: [], busyWith: [{ ...conflict().busyWith[0], otherEventInProgress: true }] });
    expect(defaultResolution(c)).toBeNull();
  });
  it('sin candidatos → null', () => {
    expect(defaultResolution(conflict({ hereCandidates: [], otherCandidates: [] }))).toBeNull();
  });
});

describe('validateResolutions', () => {
  const two = [conflict(), conflict({ equipmentId: 'tp01', code: 'TP-01', hereCandidates: [{ _id: 'c07', name: 'x', code: 'CNSL-07', sameDay: false, isEquivalent: false }] })];

  it('acepta resoluciones válidas', () => {
    expect(validateResolutions([conflict()], [{ equipmentId: 'c03', action: 'replaceHere', toId: 'c07' }])).toEqual([]);
  });
  it('rechaza toId repetido', () => {
    const errs = validateResolutions(two, [
      { equipmentId: 'c03', action: 'replaceHere', toId: 'c07' },
      { equipmentId: 'tp01', action: 'replaceHere', toId: 'c07' }
    ]);
    expect(errs).toContainEqual({ equipmentId: 'tp01', code: 'duplicate_to' });
  });
  it('rechaza toId que no está entre los candidatos', () => {
    expect(validateResolutions([conflict()], [{ equipmentId: 'c03', action: 'replaceHere', toId: 'c10' }])).toEqual([{ equipmentId: 'c03', code: 'toId_busy' }]);
    expect(validateResolutions([conflict()], [{ equipmentId: 'c03', action: 'replaceInOther', otherEventId: 'cumple', toId: 'c07' }])).toEqual([{ equipmentId: 'c03', code: 'toId_busy' }]);
  });
  it('rechaza replaceInOther si hay más de un evento o es stale', () => {
    const b = conflict().busyWith[0];
    const doble = conflict({ busyWith: [b, { ...b, eventId: 'boda' }] });
    expect(validateResolutions([doble], [{ equipmentId: 'c03', action: 'replaceInOther', otherEventId: 'cumple', toId: 'q16' }])).toEqual([{ equipmentId: 'c03', code: 'other_not_allowed' }]);
    const stale = conflict({ busyWith: [{ ...b, stale: true }] });
    expect(validateResolutions([stale], [{ equipmentId: 'c03', action: 'replaceInOther', otherEventId: 'cumple', toId: 'q16' }])).toEqual([{ equipmentId: 'c03', code: 'other_not_allowed' }]);
    expect(validateResolutions([conflict()], [{ equipmentId: 'c03', action: 'replaceInOther', otherEventId: 'otro', toId: 'q16' }])).toEqual([{ equipmentId: 'c03', code: 'other_not_allowed' }]);
  });
  it('rechaza releaseOrphan sobre una reserva real', () => {
    expect(validateResolutions([conflict()], [{ equipmentId: 'c03', action: 'releaseOrphan', orphanEventId: 'cumple' }])).toEqual([{ equipmentId: 'c03', code: 'not_stale' }]);
  });
  it('pide resolución para cada choque', () => {
    expect(validateResolutions(two, [{ equipmentId: 'c03', action: 'remove' }])).toEqual([{ equipmentId: 'tp01', code: 'missing' }]);
  });
  it('rechaza resoluciones de equipos que no chocan', () => {
    expect(validateResolutions([conflict()], [{ equipmentId: 'c03', action: 'remove' }, { equipmentId: 'zz', action: 'remove' }])).toEqual([{ equipmentId: 'zz', code: 'not_conflicting' }]);
  });
});

describe('applyLocalResolutions', () => {
  const row = (id: string, name: string, code: string, extra: any = {}) => ({ _id: id, name, code, rentalPrice: 500, mainCategoryId: 'm', mainCategoryName: 'Sonido', ...extra });
  const units = new Map<string, any>([['c07', { ...CNSL07, rentalPrice: 1500, investmentPrice: 9 }]]);

  it('replaceHere cambia el renglón por la unidad nueva con su precio real, en la misma posición', () => {
    const eq = [row('a', 'A', 'A-1'), row('c03', 'Zed 12FX', 'CNSL-03', { note: 'ojo', rentalPrice: 1 }), row('b', 'B', 'B-1')];
    const out = applyLocalResolutions(eq, [], [{ equipmentId: 'c03', action: 'replaceHere', toId: 'c07' }], units);
    expect(out.equipment.map((e) => e._id)).toEqual(['a', 'c07', 'b']);
    expect(out.equipment[1]).toMatchObject({ code: 'CNSL-07', rentalPrice: 1500, investmentPrice: 9, mainCategoryName: 'Sonido', note: 'ojo' });
    expect(out.equipment[1].scheduledUses).toBeUndefined();
  });
  it('outsource quita el renglón y suma 1 al tercerizado del mismo modelo', () => {
    const eq = [row('c03', 'Zed 12FX', 'CNSL-03', { categoryId: 'consolas' })];
    const a = applyLocalResolutions(eq, [{ name: 'Zed 12FX', quantity: 2 }], [{ equipmentId: 'c03', action: 'outsource' }], units);
    expect(a.equipment).toEqual([]);
    expect(a.extraEquipment).toEqual([{ name: 'Zed 12FX', quantity: 3 }]);
    const b = applyLocalResolutions(eq, [], [{ equipmentId: 'c03', action: 'outsource' }], units);
    expect(b.extraEquipment).toEqual([{ name: 'Zed 12FX', categoryId: 'consolas', mainCategoryName: 'Sonido', quantity: 1 }]);
  });
  it('remove quita el renglón; replaceInOther y releaseOrphan no tocan este evento', () => {
    const eq = [row('c03', 'Zed 12FX', 'CNSL-03'), row('tp01', 'Tripode', 'TP-01'), row('x', 'X', 'X')];
    const out = applyLocalResolutions(eq, [], [
      { equipmentId: 'c03', action: 'remove' },
      { equipmentId: 'tp01', action: 'replaceInOther', otherEventId: 'cumple', toId: 'tp02' },
      { equipmentId: 'x', action: 'releaseOrphan', orphanEventId: 'viejo' }
    ], units);
    expect(out.equipment.map((e) => e._id)).toEqual(['tp01', 'x']);
  });
  it('cuerpo parcial: con el equipo guardado completo solo cambian los renglones resueltos', () => {
    const eq = Array.from({ length: 59 }, (_, i) => row(`e${i}`, 'N', `N-${i}`));
    eq[10] = row('c03', 'Zed 12FX', 'CNSL-03');
    const out = applyLocalResolutions(eq, [], [{ equipmentId: 'c03', action: 'replaceHere', toId: 'c07' }], units);
    expect(out.equipment).toHaveLength(59);
    expect(out.equipment[10]._id).toBe('c07');
    expect(out.equipment.filter((_, i) => i !== 10)).toEqual(eq.filter((_, i) => i !== 10));
  });
});

describe('buildChangeNotice / stripServerOnlyFields', () => {
  it('arma el aviso sin precios', () => {
    const n = buildChangeNotice({ byName: 'Juan', fromEventId: 'feria', fromEventName: 'Feria de Ciencias', now: NOW, changes: [{ fromName: 'Zed 12FX', fromCode: 'CNSL-03', toName: 'Zed 12FX', toCode: 'CNSL-07' }] });
    expect(n.id).toBeTruthy();
    expect(n.at).toBe(NOW.toISOString());
    expect(n).toMatchObject({ byName: 'Juan', fromEventId: 'feria', fromEventName: 'Feria de Ciencias' });
    expect(JSON.stringify(n)).not.toMatch(/price/i);
  });
  it('ignora los avisos que manda el cliente', () => {
    expect(stripServerOnlyFields({ _id: 'x', endDate: 'y', equipmentChangeNotices: [] })).toEqual({ _id: 'x', endDate: 'y' });
  });
});

describe('revisión final', () => {
  const sameModel = (id: string, code: string) =>
    conflict({ equipmentId: id, code, hereCandidates: [
      { _id: 'c07', name: 'Zed 12FX', code: 'CNSL-07', sameDay: false, isEquivalent: false },
      { _id: 'c08', name: 'Zed 12FX', code: 'CNSL-08', sameDay: false, isEquivalent: false }
    ] });

  it('defaultResolutions no pre-elige la misma unidad para dos choques', () => {
    const out = defaultResolutions([sameModel('c03', 'CNSL-03'), sameModel('c04', 'CNSL-04')]);
    expect(out.get('c03')).toEqual({ equipmentId: 'c03', action: 'replaceHere', toId: 'c07' });
    expect(out.get('c04')).toEqual({ equipmentId: 'c04', action: 'replaceHere', toId: 'c08' });
  });

  it('defaultResolutions: si no queda unidad acá, cae al otro evento o a null', () => {
    const one = (id: string) => conflict({ equipmentId: id, hereCandidates: [{ _id: 'c07', name: 'Zed 12FX', code: 'CNSL-07', sameDay: false, isEquivalent: false }], otherCandidates: [] });
    const out = defaultResolutions([one('c03'), one('c04')]);
    expect(out.get('c03')).toMatchObject({ toId: 'c07' });
    expect(out.get('c04')).toBeNull();
  });

  it('hasDuplicateTargets detecta la misma unidad elegida dos veces', () => {
    expect(hasDuplicateTargets([{ equipmentId: 'a', action: 'replaceHere', toId: 'x' }, { equipmentId: 'b', action: 'replaceInOther', otherEventId: 'o', toId: 'x' }])).toBe(true);
    expect(hasDuplicateTargets([{ equipmentId: 'a', action: 'replaceHere', toId: 'x' }, { equipmentId: 'b', action: 'remove' }])).toBe(false);
  });

  it('resolutionErrorMessage distingue la unidad repetida de un cambio de datos', () => {
    expect(resolutionErrorMessage([{ equipmentId: 'a', code: 'duplicate_to' }])).toBe('Elegiste la misma unidad para dos equipos. Elegí otra para uno de ellos.');
    expect(resolutionErrorMessage([{ equipmentId: 'a', code: 'toId_busy' }])).toBe('Los equipos cambiaron mientras elegías. Revisá de nuevo.');
  });

  it('pruneResolutions descarta lo elegido para equipos que ya no chocan', () => {
    const r = [{ equipmentId: 'c03', action: 'remove' as const }, { equipmentId: 'zz', action: 'remove' as const }];
    expect(pruneResolutions([conflict()], r)).toEqual([{ equipmentId: 'c03', action: 'remove' }]);
    expect(pruneResolutions([], r)).toEqual([]);
  });

  it('reservationUpdateHistory arma una entrada uso_evento por equipo con el rango nuevo', () => {
    const entries = reservationUpdateHistory(
      [{ _id: 'a', name: 'A', code: 'A-1' }],
      { eventId: 'feria', type: 'Feria de Ciencias', lugar: 'Hotel Luz y Fuerza', fullName: 'Lucas', start: START, end: END, userId: 'u1', reason: 'cambio de fechas' }
    );
    expect(entries).toEqual([expect.objectContaining({
      equipmentId: 'a', equipmentName: 'A', equipmentCode: 'A-1', action: 'uso_evento', userId: 'u1',
      eventId: 'feria', eventName: 'Feria de Ciencias', eventDate: START, eventEndDate: END, eventLocation: 'Hotel Luz y Fuerza', eventClientName: 'Lucas'
    })]);
    expect(entries[0].details).toMatch(/^Reserva actualizada \(cambio de fechas\): /);
  });
});
