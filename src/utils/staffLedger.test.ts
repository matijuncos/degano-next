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
  pendingUpTo,
  employeeWindow,
  inWindow,
  displayStatus,
  eventLabel,
  inputDay,
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

describe('pendingUpTo', () => {
  it('suma lo impago hasta el día indicado inclusive', () => {
    const { charges } = buildAccount(EMP, [], [
      entry({ _id: 'a', type: 'extra', eventId: undefined, date: '2026-10-01T15:00:00.000Z', amount: 100, description: 'A' }),
      entry({ _id: 'b', type: 'extra', eventId: undefined, date: '2026-10-16T02:00:00.000Z', amount: 200, description: 'B' }), // 15/10 23:00 AR
      entry({ _id: 'c', type: 'extra', eventId: undefined, date: '2026-10-20T15:00:00.000Z', amount: 400, description: 'C' }),
      entry({ _id: 'p', type: 'pago', eventId: undefined, date: '2026-10-02T15:00:00.000Z', amount: 50, method: 'efectivo' })
    ], NOW);
    expect(pendingUpTo(charges, '2026-10-15')).toBe(250);
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
