import { describe, it, expect } from 'vitest';
import {
  daysTouched,
  usedSameDay,
  rankUnitsForEvent,
  suggestReplacements,
  findBookingConflicts,
  bookingConflictMessage,
  planSet,
  resolveSetApplication
} from './equipmentSuggestions';

// Evento: sábado 07/11 21:00 → domingo 08/11 04:00 (hora AR)
const START = '2026-11-08T00:00:00.000Z';
const END = '2026-11-08T07:00:00.000Z';
// Almuerzo el mismo sábado 13:00-17:00 AR (no se superpone)
const ALMUERZO = { eventId: 'alm', eventType: 'Almuerzo', location: 'Villa Golf', startDate: '2026-11-07T16:00:00.000Z', endDate: '2026-11-07T20:00:00.000Z' };
// Otro evento que SÍ se superpone
const BODA = { eventId: 'boda', eventType: 'Boda', location: 'Casas Viejas', startDate: '2026-11-08T02:00:00.000Z', endDate: '2026-11-08T08:00:00.000Z' };

describe('daysTouched / usedSameDay', () => {
  it('un evento que cruza la medianoche toca dos días', () => {
    expect([...daysTouched(START, END)]).toEqual(['2026-11-07', '2026-11-08']);
  });
  it('detecta uso el mismo día aunque no se superponga en horario', () => {
    expect(usedSameDay([ALMUERZO], START, END)).toBe(true);
    expect(usedSameDay([{ ...ALMUERZO, startDate: '2026-11-05T16:00:00.000Z', endDate: '2026-11-05T20:00:00.000Z' }], START, END)).toBe(false);
  });
  it('ignora las reservas del propio evento', () => {
    expect(usedSameDay([{ ...ALMUERZO, eventId: 'yo' }], START, END, 'yo')).toBe(false);
  });
});

describe('rankUnitsForEvent', () => {
  it('prefiere unidades que no se usan ese día; después por código natural', () => {
    const units = [
      { code: 'PA-01', scheduledUses: [ALMUERZO] },
      { code: 'PA-02', scheduledUses: [ALMUERZO] },
      { code: 'PA-10', scheduledUses: [] },
      { code: 'PA-3', scheduledUses: [] }
    ];
    expect(rankUnitsForEvent(units, START, END).map((u) => u.code)).toEqual(['PA-3', 'PA-10', 'PA-01', 'PA-02']);
  });
  it('sin fechas: solo por código', () => {
    const units = [{ code: 'PA-2', scheduledUses: [ALMUERZO] }, { code: 'PA-1', scheduledUses: [] }];
    expect(rankUnitsForEvent(units, null, null).map((u) => u.code)).toEqual(['PA-1', 'PA-2']);
  });
});

describe('suggestReplacements', () => {
  const pool = [
    { _id: 'p1', name: 'Parlante', code: 'PA-01', scheduledUses: [{ ...BODA }] }, // ocupado en otra boda
    { _id: 'p2', name: 'Parlante', code: 'PA-02', scheduledUses: [] }, // en reparación
    { _id: 'p3', name: 'Parlante', code: 'PA-03', scheduledUses: [ALMUERZO] }, // libre pero mismo día
    { _id: 'p4', name: 'Parlante', code: 'PA-04', scheduledUses: [] }, // libre
    { _id: 's1', name: 'Strobe', code: 'ST-01', scheduledUses: [] }
  ];
  const reasons: Record<string, string> = { p2: 'Reparación' };
  const opts = { start: START, end: END, eventId: 'yo', liveUnavailableReason: (id: string) => reasons[id] ?? null };

  it('unidad ocupada en otro evento → sugiere la mejor libre del mismo equipo', () => {
    const r = suggestReplacements([{ _id: 'p1', name: 'Parlante' }], pool, opts);
    const s = r.get('p1')!;
    expect(s.problem.kind).toBe('ocupado');
    expect((s.problem as any).busyWith[0].eventId).toBe('boda');
    expect(s.replacement._id).toBe('p4'); // PA-04 antes que PA-03 (que se usa ese día)
  });
  it('dos unidades con problema no reciben la misma sugerencia', () => {
    const r = suggestReplacements([{ _id: 'p1', name: 'Parlante' }, { _id: 'p2', name: 'Parlante' }], pool, opts);
    expect(r.get('p1')!.replacement._id).toBe('p4');
    expect(r.get('p2')!.problem).toEqual({ kind: 'baja', reason: 'Reparación' });
    expect(r.get('p2')!.replacement._id).toBe('p3');
  });
  it('no sugiere unidades que ya están en el evento ni de otro equipo', () => {
    const r = suggestReplacements(
      [{ _id: 'p1', name: 'Parlante' }, { _id: 'p4', name: 'Parlante' }, { _id: 'p3', name: 'Parlante' }],
      pool,
      opts
    );
    expect(r.get('p1')!.replacement).toBeNull();
    expect(r.has('p4')).toBe(false); // sin problema
  });
  it('trae todas las alternativas libres (para elegir otra), marcando las del mismo día', () => {
    const r = suggestReplacements([{ _id: 'p1', name: 'Parlante' }], pool, opts);
    const alts = r.get('p1')!.alternatives.map((a) => `${a.unit.code}${a.sameDay ? '*' : ''}`);
    expect(alts).toEqual(['PA-04', 'PA-03*']); // PA-02 en reparación no aparece
  });
  it('las alternativas incluyen la sugerida para otra unidad (se puede elegir igual)', () => {
    const r = suggestReplacements([{ _id: 'p1', name: 'Parlante' }, { _id: 'p2', name: 'Parlante' }], pool, opts);
    expect(r.get('p2')!.alternatives.map((a) => a.unit.code)).toEqual(['PA-04', 'PA-03']);
  });
  it('ofrece equivalentes de otro modelo de la misma categoría, aunque no haya del mismo equipo', () => {
    const pool2 = [
      { _id: 'a1', name: 'Parlante A', code: 'A-01', categoryId: 'parl', scheduledUses: [BODA] },
      { _id: 'b1', name: 'Parlante B', code: 'B-01', categoryId: 'parl', scheduledUses: [] },
      { _id: 'b2', name: 'Parlante B', code: 'B-02', categoryId: 'parl', scheduledUses: [] },
      { _id: 'c1', name: 'Consola', code: 'C-01', categoryId: 'cons', scheduledUses: [] }
    ];
    const r = suggestReplacements([{ _id: 'a1', name: 'Parlante A' }], pool2, opts).get('a1')!;
    expect(r.replacement).toBeNull();
    expect(r.equivalents.map((e) => `${e.name}:${e.unit.code}:${e.freeCount}`)).toEqual(['Parlante B:B-01:2']);
  });
  it('la reserva del propio evento no es un problema', () => {
    const own = [{ _id: 'x', name: 'Strobe', code: 'ST-09', scheduledUses: [{ ...BODA, eventId: 'yo' }] }];
    expect(suggestReplacements([{ _id: 'x', name: 'Strobe' }], own, opts).size).toBe(0);
  });
});

describe('findBookingConflicts / bookingConflictMessage', () => {
  const docs = [
    { _id: 'p1', name: 'Parlante', code: 'PA-01', scheduledUses: [BODA] },
    { _id: 'p3', name: 'Parlante', code: 'PA-03', scheduledUses: [ALMUERZO] },
    { _id: 'p5', name: 'Parlante', code: 'PA-05', scheduledUses: [{ ...BODA, eventId: 'yo' }] }
  ];
  it('solo cuenta superposición real con OTROS eventos', () => {
    const c = findBookingConflicts(docs, START, END, 'yo');
    expect(c.map((x) => x.code)).toEqual(['PA-01']);
    expect(bookingConflictMessage(c)).toContain('Parlante (PA-01) → Boda - Casas Viejas');
  });
});

describe('planSet / resolveSetApplication', () => {
  const pool = [
    { _id: 'y1', name: 'Yamaha 15', code: 'PA-07', categoryId: 'parl' },
    { _id: 'j1', name: 'JBL 15', code: 'JB-01', categoryId: 'parl' },
    { _id: 'j2', name: 'JBL 15', code: 'JB-02', categoryId: 'parl' },
    { _id: 'k1', name: 'Karray', code: 'K-01', categoryId: 'parl' },
    { _id: 't1', name: 'Trípode', code: 'TP-04', categoryId: 'acc' }
  ];
  const items = [{ equipmentName: 'Yamaha 15', quantity: 3 }, { equipmentName: 'Trípode', quantity: 1 }];

  it('usa las propias y ofrece equivalentes de la misma categoría para lo que falta', () => {
    const plans = planSet(items, pool);
    expect(plans[0].chosen.map((u) => u.code)).toEqual(['PA-07']);
    expect(plans[0].missing).toBe(2);
    expect(plans[0].equivalents.map((e) => `${e.name}:${e.units.length}`)).toEqual(['JBL 15:2', 'Karray:1']);
    expect(plans[1].missing).toBe(0);
    expect(plans[1].equivalents).toEqual([]);
  });
  it('por defecto lo que falta se terceriza', () => {
    const r = resolveSetApplication(planSet(items, pool), {});
    expect(r.units.map((u) => u.code)).toEqual(['PA-07', 'TP-04']);
    expect(r.extras).toEqual([{ name: 'Yamaha 15', categoryId: 'parl', quantity: 2 }]);
  });
  it('equivalente que alcanza: sin tercerizar', () => {
    const r = resolveSetApplication(planSet(items, pool), { 'Yamaha 15': { kind: 'equivalente', name: 'JBL 15' } });
    expect(r.units.map((u) => u.code)).toEqual(['PA-07', 'JB-01', 'JB-02', 'TP-04']);
    expect(r.extras).toEqual([]);
  });
  it('equivalente que no alcanza: el resto se terceriza solo', () => {
    const r = resolveSetApplication(planSet(items, pool), { 'Yamaha 15': { kind: 'equivalente', name: 'Karray' } });
    expect(r.units.map((u) => u.code)).toEqual(['PA-07', 'K-01', 'TP-04']);
    expect(r.extras).toEqual([{ name: 'Yamaha 15', categoryId: 'parl', quantity: 1 }]);
  });
  it('omitir: no agrega nada para lo que falta', () => {
    const r = resolveSetApplication(planSet(items, pool), { 'Yamaha 15': { kind: 'omitir' } });
    expect(r.extras).toEqual([]);
    expect(r.units).toHaveLength(2);
  });
  it('un ítem del set no le saca unidades a otro ítem del set', () => {
    const plans = planSet([{ equipmentName: 'Yamaha 15', quantity: 2 }, { equipmentName: 'JBL 15', quantity: 2 }], pool);
    // JBL es del set: sus 2 unidades son de ese ítem, no equivalentes del Yamaha
    expect(plans[0].equivalents.map((e) => e.name)).toEqual(['Karray']);
    expect(plans[1].chosen).toHaveLength(2);
  });
  it('todas las unidades del modelo ocupadas: igual ofrece equivalentes (categoría desde la lista completa)', () => {
    const plans = planSet([{ equipmentName: 'Mackie', quantity: 2 }], pool, (u) => u, (n) => (n === 'Mackie' ? 'parl' : null));
    expect(plans[0].missing).toBe(2);
    expect(plans[0].equivalents.map((e) => e.name)).toEqual(['JBL 15', 'Karray', 'Yamaha 15']);
  });
  it('ítem sin ninguna unidad en el pool: categoría por fallback', () => {
    const plans = planSet([{ equipmentName: 'Inexistente', quantity: 1 }], pool);
    const r = resolveSetApplication(plans, {}, () => 'cat-x');
    expect(r.extras).toEqual([{ name: 'Inexistente', categoryId: 'cat-x', quantity: 1 }]);
  });
});
