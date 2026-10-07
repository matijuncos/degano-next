// src/utils/staffLedger.test.ts
import { describe, it, expect } from 'vitest';
import {
  arDay,
  computeStaffHours,
  buildCharges,
  toCredits,
  allocate,
  summarizeAccount,
  buildAccount,
  employeeWindow,
  inWindow,
  displayStatus,
  eventLabel,
  inputDay,
  LEDGER_START_DAY,
  LEDGER_START_ISO,
  groupEventsByEmployee,
  tickState,
  tickCreditType,
  quickCreditType,
  isChargeKey,
  LedgerEntry,
  StaffEvent
} from './staffLedger';

const EMP = 'emp1';
// 2026-10-10 12:00 hora argentina
const NOW = new Date('2026-10-10T15:00:00.000Z');

const ev = (over: Partial<StaffEvent> = {}): StaffEvent => ({
  _id: 'ev1',
  type: 'Casamiento',
  fullName: 'Pérez',
  lugar: 'Salón Sol',
  date: '2026-10-03T23:00:00.000Z', // 03/10 20:00 AR
  endDate: '2026-10-04T07:00:00.000Z', // 04/10 04:00 AR
  staff: [{ employeeId: EMP, employeeName: 'Ana', rol: 'Técnico' }],
  ...over
});

const entry = (over: Partial<LedgerEntry>): LedgerEntry => ({
  _id: 'l1',
  employeeId: EMP,
  type: 'evento',
  eventId: 'ev1',
  date: '2026-10-03T23:00:00.000Z',
  amount: 100,
  createdAt: '2026-10-01T00:00:00.000Z',
  ...over
});

describe('arDay', () => {
  it('toma el día calendario argentino de un instante UTC', () => {
    expect(arDay('2026-10-04T02:00:00.000Z')).toBe('2026-10-03'); // 23:00 AR del 03
    expect(arDay(new Date('2026-10-03T03:00:00.000Z'))).toBe('2026-10-03'); // medianoche AR
  });
  it('respeta un string YYYY-MM-DD sin correrlo', () => {
    expect(arDay('2026-10-03')).toBe('2026-10-03');
  });
  it('devuelve null si no hay fecha válida', () => {
    expect(arDay(undefined)).toBeNull();
    expect(arDay('cualquiera')).toBeNull();
  });
});

describe('computeStaffHours', () => {
  it('usa la llegada del staff hasta el fin del evento', () => {
    expect(
      computeStaffHours(ev({ staffArrivalDate: '2026-10-03T03:00:00.000Z', staffArrivalTime: '18:00' }))
    ).toBe(10); // 18:00 → 04:00
  });
  it('con hora de llegada pero sin fecha usa el día del evento', () => {
    expect(computeStaffHours(ev({ staffArrivalTime: '19:30' }))).toBe(8.5);
  });
  it('sin llegada usa el inicio del evento', () => {
    expect(computeStaffHours(ev())).toBe(8);
  });
  it('null si falta el fin o el fin es anterior al inicio', () => {
    expect(computeStaffHours(ev({ endDate: undefined }))).toBeNull();
    expect(computeStaffHours(ev({ endDate: '2026-10-03T20:00:00.000Z' }))).toBeNull();
  });
  it('ignora una hora de llegada mal formada', () => {
    expect(computeStaffHours(ev({ staffArrivalTime: 'tarde' }))).toBe(8);
  });
});

describe('eventLabel', () => {
  it('arma tipo · cliente', () => {
    expect(eventLabel(ev())).toBe('Casamiento · Pérez');
    expect(eventLabel(ev({ type: '', fullName: '' }))).toBe('Evento');
  });
});

describe('buildCharges', () => {
  it('asignado sin monto → cargo sin monto con rol y horas', () => {
    const [c] = buildCharges(EMP, [ev()], []);
    expect(c).toMatchObject({ kind: 'evento', eventId: 'ev1', amount: null, rol: 'Técnico', hours: 8 });
    expect(c.unassigned).toBeUndefined();
  });
  it('asignado con monto guardado', () => {
    const [c] = buildCharges(EMP, [ev()], [entry({ amount: 5000 })]);
    expect(c).toMatchObject({ amount: 5000, entryId: 'l1' });
  });
  it('rol vacío → "Sin rol"', () => {
    const [c] = buildCharges(EMP, [ev({ staff: [{ employeeId: EMP, employeeName: 'Ana', rol: '  ' }] })], []);
    expect(c.rol).toBe('Sin rol');
  });
  it('monto guardado pero ya no asignado → marca unassigned', () => {
    const [c] = buildCharges(EMP, [ev({ staff: [] })], [entry({ amount: 5000 })]);
    expect(c).toMatchObject({ amount: 5000, unassigned: true });
  });
  it('monto guardado de un evento borrado → marca eventDeleted y usa la fecha guardada', () => {
    const [c] = buildCharges(EMP, [], [entry({ eventId: 'gone', amount: 700, description: 'Fiesta · López' })]);
    expect(c).toMatchObject({ eventDeleted: true, amount: 700, label: 'Fiesta · López', hours: null });
  });
  it('no incluye eventos de otros empleados ni la fecha de la línea si el evento cambió', () => {
    const other = ev({ _id: 'ev2', staff: [{ employeeId: 'otro', employeeName: 'X', rol: '' }] });
    const charges = buildCharges(EMP, [ev({ date: '2026-10-05T23:00:00.000Z' }), other], [entry({ eventId: 'ev1' })]);
    expect(charges).toHaveLength(1);
    expect(charges[0].date).toBe('2026-10-05T23:00:00.000Z');
  });
  it('incluye extras y ordena por fecha', () => {
    const charges = buildCharges(EMP, [ev()], [
      entry({ _id: 'x1', type: 'extra', eventId: undefined, date: '2026-10-01T15:00:00.000Z', amount: 300, description: 'Depósito', hours: 4 })
    ]);
    expect(charges.map((c) => c.kind)).toEqual(['extra', 'evento']);
    expect(charges[0]).toMatchObject({ label: 'Depósito', hours: 4, amount: 300 });
  });
});

describe('allocate', () => {
  const charges = buildCharges(EMP, [], [
    entry({ _id: 'a', type: 'extra', eventId: undefined, date: '2026-09-01T15:00:00.000Z', amount: 100, description: 'A' }),
    entry({ _id: 'b', type: 'extra', eventId: undefined, date: '2026-09-15T15:00:00.000Z', amount: 100, description: 'B' })
  ]);
  const pay = (amount: number, type: 'pago' | 'adelanto' = 'pago') =>
    toCredits([entry({ _id: 'p' + amount, type, eventId: undefined, amount, method: 'efectivo', date: '2026-09-20T15:00:00.000Z' })]);

  it('sin pagos todo pendiente', () => {
    const { charges: out, unappliedCredit } = allocate(charges, []);
    expect(out.map((c) => c.status)).toEqual(['pendiente', 'pendiente']);
    expect(unappliedCredit).toBe(0);
  });
  it('pago parcial cubre primero el más viejo', () => {
    const { charges: out } = allocate(charges, pay(150));
    expect(out.map((c) => [c.status, c.paidAmount])).toEqual([['pagado', 100], ['parcial', 50]]);
  });
  it('un adelanto mayor deja saldo a favor', () => {
    const { charges: out, unappliedCredit } = allocate(charges, pay(250, 'adelanto'));
    expect(out.every((c) => c.status === 'pagado')).toBe(true);
    expect(unappliedCredit).toBe(50);
  });
  it('los cargos sin monto no consumen pagos', () => {
    const withMissing = [...buildCharges(EMP, [ev({ date: '2026-08-01T23:00:00.000Z', endDate: undefined })], []), ...charges];
    const { charges: out } = allocate(withMissing, pay(100));
    expect(out.map((c) => c.status)).toEqual(['sin_monto', 'pagado', 'pendiente']);
  });
  it('un monto 0 queda pagado sin consumir', () => {
    const zero = buildCharges(EMP, [ev()], [entry({ amount: 0 })]);
    expect(allocate(zero, []).charges[0].status).toBe('pagado');
  });
});

describe('summarizeAccount / buildAccount', () => {
  const entries: LedgerEntry[] = [
    entry({ _id: 'past', eventId: 'ev1', amount: 1000 }), // 03/10, pasado
    entry({ _id: 'x', type: 'extra', eventId: undefined, date: '2026-09-20T15:00:00.000Z', amount: 500, description: 'Depósito' }),
    entry({ _id: 'p', type: 'adelanto', eventId: undefined, date: '2026-10-05T15:00:00.000Z', amount: 600, method: 'efectivo' })
  ];
  const events = [
    ev(),
    ev({ _id: 'fut1', date: '2026-10-25T23:00:00.000Z', endDate: '2026-10-26T05:00:00.000Z' }), // próximo mes, sin monto
    ev({ _id: 'fut2', date: '2026-12-20T23:00:00.000Z', endDate: '2026-12-21T05:00:00.000Z' }) // más allá de 1 mes
  ];
  const withFutureAmounts = [
    ...entries,
    entry({ _id: 'f1', eventId: 'fut1', date: '2026-10-25T23:00:00.000Z', amount: 2000 }),
    entry({ _id: 'f2', eventId: 'fut2', date: '2026-12-20T23:00:00.000Z', amount: 3000 })
  ];

  it('separa pendiente a hoy, futuro y próximo mes', () => {
    const { summary } = buildAccount(EMP, events, withFutureAmounts, NOW);
    expect(summary.pendingToDate).toBe(900); // 1500 − 600
    expect(summary.futureTotal).toBe(5000);
    expect(summary.nextMonthTotal).toBe(2000);
    expect(summary.balance).toBe(5900);
    expect(summary.favor).toBe(0);
    expect(summary.missingAmount).toBe(0);
  });
  it('cuenta los eventos sin monto', () => {
    const { summary } = buildAccount(EMP, events, entries, NOW);
    expect(summary.missingAmount).toBe(2);
    expect(summary.missingAmountNextMonth).toBe(1);
  });
  it('agrupa por mes lo generado y lo pagado', () => {
    const { summary } = buildAccount(EMP, events, withFutureAmounts, NOW);
    expect(summary.byMonth['2026-09']).toEqual({ charged: 500, paid: 0 });
    expect(summary.byMonth['2026-10']).toEqual({ charged: 3000, paid: 600 });
    expect(summary.byMonth['2026-12']).toEqual({ charged: 3000, paid: 0 });
  });
  it('saldo a favor cuando los abonos superan los cargos', () => {
    const { summary } = buildAccount(EMP, [], [
      entry({ _id: 'a', type: 'adelanto', eventId: undefined, amount: 800, method: 'efectivo', date: '2026-10-01T15:00:00.000Z' }),
      entry({ _id: 'x', type: 'extra', eventId: undefined, amount: 300, description: 'Dep', date: '2026-10-02T15:00:00.000Z' })
    ], NOW);
    expect(summary.pendingToDate).toBe(0);
    expect(summary.favor).toBe(500);
    expect(summary.balance).toBe(-500);
  });
});

describe('ventana del empleado', () => {
  it('3 meses atrás y 1 adelante', () => {
    const w = employeeWindow(NOW);
    expect(inWindow('2026-07-11T15:00:00.000Z', w)).toBe(true);
    expect(inWindow('2026-07-09T15:00:00.000Z', w)).toBe(false);
    expect(inWindow('2026-11-09T15:00:00.000Z', w)).toBe(true);
    expect(inWindow('2026-11-11T15:00:00.000Z', w)).toBe(false);
  });
});

describe('displayStatus', () => {
  it('un cargo futuro impago se ve como futuro', () => {
    const { charges } = buildAccount(EMP, [], [
      entry({ _id: 'f', type: 'extra', eventId: undefined, date: '2026-10-20T15:00:00.000Z', amount: 100, description: 'F' })
    ], NOW);
    expect(displayStatus(charges[0], NOW)).toBe('futuro');
  });
  it('un cargo pasado impago se ve pendiente', () => {
    const { charges } = buildAccount(EMP, [], [
      entry({ _id: 'p', type: 'extra', eventId: undefined, date: '2026-10-01T15:00:00.000Z', amount: 100, description: 'P' })
    ], NOW);
    expect(displayStatus(charges[0], NOW)).toBe('pendiente');
  });
});

describe('inputDay', () => {
  it('respeta el string YYYY-MM-DD que devuelve DateInput (sin correr el día)', () => {
    expect(inputDay('2026-10-01')).toBe('2026-10-01');
  });
  it('un Date toma el día local del navegador', () => {
    expect(inputDay(new Date(2026, 9, 1, 0, 30))).toBe('2026-10-01');
  });
  it('vacío → null', () => {
    expect(inputDay(null)).toBeNull();
    expect(inputDay('')).toBeNull();
  });
});

describe('criterio de "hoy" en día argentino', () => {
  // NOW = 10/10 12:00 AR. Un cargo de HOY a las 22:00 AR ya es "de hoy":
  // entra en el pendiente (igual que en "pagar hasta hoy") y no se ve futuro.
  const today22 = '2026-10-11T01:00:00.000Z';
  const acc = () =>
    buildAccount(EMP, [], [
      entry({ _id: 'h', type: 'extra', eventId: undefined, date: today22, amount: 100, description: 'Hoy' })
    ], NOW);
  it('cuenta en pendiente a hoy y no en futuro', () => {
    const { summary } = acc();
    expect(summary.pendingToDate).toBe(100);
    expect(summary.futureTotal).toBe(0);
    expect(summary.nextMonthTotal).toBe(0);
  });
  it('se ve pendiente y el tilde lo registra como pago', () => {
    const { charges } = acc();
    expect(displayStatus(charges[0], NOW)).toBe('pendiente');
    expect(tickCreditType(charges[0], NOW)).toBe('pago');
  });
});

describe('fecha de inicio de cobros', () => {
  it('es el 1/10/2026 y su instante es la medianoche argentina', () => {
    expect(LEDGER_START_DAY).toBe('2026-10-01');
    expect(LEDGER_START_ISO).toBe('2026-10-01T03:00:00.000Z');
  });
  it('excluye eventos anteriores sin monto, conserva los que tienen monto', () => {
    const old = ev({ _id: 'old', date: '2026-09-30T23:00:00.000Z' }); // 30/09 20:00 AR
    const oldPaid = ev({ _id: 'oldPaid', date: '2026-09-20T23:00:00.000Z' });
    const day1 = ev({ _id: 'day1', date: '2026-10-01T03:00:00.000Z' }); // 01/10 00:00 AR
    const charges = buildCharges(EMP, [old, oldPaid, day1], [entry({ _id: 'l', eventId: 'oldPaid', amount: 50 })], LEDGER_START_DAY);
    expect(charges.map((c) => c.eventId)).toEqual(['oldPaid', 'day1']);
  });
  it('sin fecha de inicio no excluye nada', () => {
    expect(buildCharges(EMP, [ev({ date: '2025-01-01T23:00:00.000Z' })], [])).toHaveLength(1);
  });
  it('buildAccount pasa la fecha de inicio', () => {
    const { summary } = buildAccount(EMP, [ev({ date: '2026-09-01T23:00:00.000Z' })], [], NOW, LEDGER_START_DAY);
    expect(summary.missingAmount).toBe(0);
  });
});

describe('groupEventsByEmployee', () => {
  it('incluye los asignados y los referenciados por una línea con monto', () => {
    const a = ev({ _id: 'a', staff: [{ employeeId: 'e1', rol: '' }] });
    const b = ev({ _id: 'b', staff: [] }); // e1 tiene monto pero ya no está asignado
    const map = groupEventsByEmployee([a, b], [entry({ _id: 'l', employeeId: 'e1', eventId: 'b' })]);
    expect(map.get('e1')!.map((e) => e._id).sort()).toEqual(['a', 'b']);
  });
  it('no duplica un evento asignado que además tiene línea', () => {
    const a = ev({ _id: 'a', staff: [{ employeeId: 'e1', rol: '' }] });
    const map = groupEventsByEmployee([a], [entry({ _id: 'l', employeeId: 'e1', eventId: 'a' })]);
    expect(map.get('e1')).toHaveLength(1);
  });
});

describe('pagos atados a una línea (tilde)', () => {
  const charges = buildCharges(EMP, [], [
    entry({ _id: 'a', type: 'extra', eventId: undefined, date: '2026-09-01T15:00:00.000Z', amount: 100, description: 'A' }),
    entry({ _id: 'b', type: 'extra', eventId: undefined, date: '2026-09-15T15:00:00.000Z', amount: 100, description: 'B' })
  ]);
  const credit = (id: string, amount: number, chargeKey?: string) =>
    entry({ _id: id, type: 'pago', eventId: undefined, amount, method: 'efectivo', date: '2026-09-20T15:00:00.000Z', ...(chargeKey ? { chargeKey } : {}) });

  it('el pago del tilde cubre SU línea, no la más vieja', () => {
    const { charges: out } = allocate(charges, toCredits([credit('t', 100, 'extra:b')]));
    expect(out.map((c) => [c.key, c.status])).toEqual([['extra:a', 'pendiente'], ['extra:b', 'pagado']]);
    expect(out[1].linkedCreditIds).toEqual(['t']);
    expect(out[0].linkedCreditIds).toBeUndefined();
  });
  it('los pagos sueltos van por FIFO a lo que queda', () => {
    const { charges: out } = allocate(charges, toCredits([credit('t', 100, 'extra:b'), credit('s', 60)]));
    expect(out.map((c) => [c.status, c.paidAmount])).toEqual([['parcial', 60], ['pagado', 100]]);
  });
  it('si subió el monto, la línea tildada queda parcial', () => {
    const { charges: out } = allocate(charges, toCredits([credit('t', 80, 'extra:b')]));
    expect(out[1].status).toBe('parcial');
    expect(out[1].paidAmount).toBe(80);
  });
  it('si bajó el monto, lo que sobra del tilde pasa a FIFO', () => {
    const { charges: out } = allocate(charges, toCredits([credit('t', 150, 'extra:b')]));
    expect(out.map((c) => [c.status, c.paidAmount])).toEqual([['parcial', 50], ['pagado', 100]]);
  });
  it('tilde de una línea que ya no existe → todo a FIFO', () => {
    const { charges: out, unappliedCredit } = allocate(charges, toCredits([credit('t', 250, 'extra:zz')]));
    expect(out.every((c) => c.status === 'pagado')).toBe(true);
    expect(unappliedCredit).toBe(50);
  });
  it('tilde de una línea que quedó sin monto → a FIFO', () => {
    const withMissing = [...buildCharges(EMP, [ev({ date: '2026-08-01T23:00:00.000Z', endDate: undefined })], []), ...charges];
    const { charges: out } = allocate(withMissing, toCredits([credit('t', 100, 'evento:ev1')]));
    expect(out.map((c) => c.status)).toEqual(['sin_monto', 'pagado', 'pendiente']);
  });
});

describe('estado de la casilla', () => {
  const base = buildCharges(EMP, [], [
    entry({ _id: 'a', type: 'extra', eventId: undefined, date: '2026-09-01T15:00:00.000Z', amount: 100, description: 'A' }),
    entry({ _id: 'b', type: 'extra', eventId: undefined, date: '2026-09-15T15:00:00.000Z', amount: 100, description: 'B' })
  ]);
  const credit = (id: string, amount: number, chargeKey?: string) =>
    entry({ _id: id, type: 'pago', eventId: undefined, amount, method: 'efectivo', date: '2026-09-20T15:00:00.000Z', ...(chargeKey ? { chargeKey } : {}) });

  it('tildada por su pago → checked; cubierta por pago a cuenta → locked; impaga → unchecked', () => {
    const { charges: out } = allocate(base, toCredits([credit('s', 100), credit('t', 100, 'extra:b')]));
    expect(out.map(tickState)).toEqual(['locked', 'checked']);
    expect(allocate(base, []).charges.map(tickState)).toEqual(['unchecked', 'unchecked']);
  });
  it('parcial → unchecked; sin monto o monto 0 → none', () => {
    const { charges: out } = allocate(base, toCredits([credit('t', 50, 'extra:a')]));
    expect(tickState(out[0])).toBe('unchecked');
    expect(tickState(allocate(buildCharges(EMP, [ev()], []), []).charges[0])).toBe('none');
    expect(tickState(allocate(buildCharges(EMP, [ev()], [entry({ amount: 0 })]), []).charges[0])).toBe('none');
  });
});

describe('tipo automático del abono', () => {
  it('tilde: evento pasado o de hoy → pago; futuro → adelanto', () => {
    const [past] = allocate(buildCharges(EMP, [ev()], [entry({})]), []).charges;
    const [today] = allocate(buildCharges(EMP, [ev({ date: '2026-10-11T01:00:00.000Z' })], [entry({})]), []).charges; // 10/10 22:00 AR
    const [future] = allocate(buildCharges(EMP, [ev({ date: '2026-10-11T15:00:00.000Z' })], [entry({})]), []).charges;
    expect(tickCreditType(past, NOW)).toBe('pago');
    expect(tickCreditType(today, NOW)).toBe('pago');
    expect(tickCreditType(future, NOW)).toBe('adelanto');
  });
  it('pago a cuenta: con pendiente a hoy → pago; sin pendiente → adelanto', () => {
    expect(quickCreditType({ pendingToDate: 10 })).toBe('pago');
    expect(quickCreditType({ pendingToDate: 0 })).toBe('adelanto');
  });
  it('isChargeKey valida el formato', () => {
    expect(isChargeKey('evento:6a97528ee467e1e8d8cb1508')).toBe(true);
    expect(isChargeKey('extra:abc123')).toBe(true);
    expect(isChargeKey('pago:abc')).toBe(false);
    expect(isChargeKey('evento:')).toBe(false);
    expect(isChargeKey({ $ne: 1 })).toBe(false);
  });
});

describe('rol de un extra', () => {
  it('con rol lo muestra; sin rol queda sin rol (la tabla dice "Extra")', () => {
    const charges = buildCharges(EMP, [], [
      entry({ _id: 'a', type: 'extra', eventId: undefined, amount: 100, description: 'Depósito', rol: '  Técnico ' }),
      entry({ _id: 'b', type: 'extra', eventId: undefined, amount: 100, description: 'Traslado', date: '2026-10-04T15:00:00.000Z' })
    ]);
    expect(charges.map((c) => c.rol)).toEqual(['Técnico', undefined]);
  });
});

describe('total futuro', () => {
  it('no cuenta lo futuro que ya está pagado', () => {
    const { summary } = buildAccount(EMP, [], [
      entry({ _id: 'a', type: 'extra', eventId: undefined, date: '2026-10-02T15:00:00.000Z', amount: 100, description: 'A' }),
      entry({ _id: 'b', type: 'extra', eventId: undefined, date: '2026-10-11T15:00:00.000Z', amount: 100, description: 'B' }),
      entry({ _id: 'c', type: 'extra', eventId: undefined, date: '2026-10-31T15:00:00.000Z', amount: 100, description: 'C' }),
      entry({ _id: 'p', type: 'pago', eventId: undefined, date: '2026-10-06T15:00:00.000Z', amount: 200, method: 'efectivo' })
    ], NOW);
    // Pagó 200 a cuenta debiendo 100 a hoy: cubre lo de hoy, 100 a favor y lo
    // futuro sigue impago (se cubre con el saldo cuando llegue su fecha)
    expect(summary.pendingToDate).toBe(0);
    expect(summary.favor).toBe(100);
    expect(summary.futureTotal).toBe(200);
  });
});

describe('pago a cuenta no cubre lo futuro', () => {
  const entries = [
    entry({ _id: 'a', type: 'extra', eventId: undefined, date: '2026-10-02T15:00:00.000Z', amount: 100, description: 'A' }),
    entry({ _id: 'b', type: 'extra', eventId: undefined, date: '2026-10-07T15:00:00.000Z', amount: 100, description: 'B' }),
    entry({ _id: 'c', type: 'extra', eventId: undefined, date: '2026-10-31T15:00:00.000Z', amount: 100, description: 'C' }),
    entry({ _id: 'p', type: 'pago', eventId: undefined, date: '2026-10-06T15:00:00.000Z', amount: 200, method: 'efectivo' })
  ];
  it('caso Julieta: 200 cubren los dos de 100 ya vencidos, sin saldo a favor', () => {
    const { charges, summary } = buildAccount(EMP, [], entries, NOW);
    expect(charges.map((c) => c.status)).toEqual(['pagado', 'pagado', 'pendiente']);
    expect(summary.favor).toBe(0);
    expect(summary.futureTotal).toBe(100);
    expect(displayStatus(charges[2], NOW)).toBe('futuro');
  });
  it('50 más a cuenta sin nada vencido → saldo a favor, el futuro sigue impago', () => {
    const extra = entry({ _id: 'q', type: 'adelanto', eventId: undefined, date: '2026-10-10T15:00:00.000Z', amount: 50, method: 'efectivo' });
    const { charges, summary } = buildAccount(EMP, [], [...entries, extra], NOW);
    expect(summary.favor).toBe(50);
    expect(charges[2].status).toBe('pendiente');
  });
  it('cuando llega la fecha, el saldo a favor cubre el cargo solo', () => {
    const extra = entry({ _id: 'q', type: 'adelanto', eventId: undefined, date: '2026-10-10T15:00:00.000Z', amount: 50, method: 'efectivo' });
    const { charges, summary } = buildAccount(EMP, [], [...entries, extra], new Date('2026-11-01T15:00:00.000Z'));
    expect(charges[2].status).toBe('parcial');
    expect(charges[2].paidAmount).toBe(50);
    expect(summary.favor).toBe(0);
    expect(summary.pendingToDate).toBe(50);
  });
  it('tilde en un futuro → pagado y se muestra "adelantado"', () => {
    const tick = entry({ _id: 't', type: 'adelanto', eventId: undefined, date: '2026-10-10T15:00:00.000Z', amount: 100, method: 'efectivo', chargeKey: 'extra:c' });
    const { charges, summary } = buildAccount(EMP, [], [...entries, tick], NOW);
    expect(charges[2].status).toBe('pagado');
    expect(displayStatus(charges[2], NOW)).toBe('adelantado');
    expect(summary.favor).toBe(0);
    expect(summary.futureTotal).toBe(0);
  });
});
