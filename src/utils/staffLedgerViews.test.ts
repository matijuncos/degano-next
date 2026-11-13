import { describe, it, expect } from 'vitest';
import {
  isFutureDay,
  splitGroup,
  quincenaKey,
  quincenaLabel,
  monthLabel,
  generatedByMonth,
  groupTotals,
  planBatchPayment,
  previewBatchPayment,
  groupPayments,
  paymentTitle,
  isPayable
} from './staffLedgerViews';
import { AllocatedCharge, Credit } from './staffLedger';

const ch = (key: string, date: string, amount: number | null, paidAmount = 0): AllocatedCharge => ({
  key,
  kind: 'evento',
  date,
  amount,
  label: key,
  hours: null,
  paidAmount,
  status: amount == null ? 'sin_monto' : paidAmount >= amount ? 'pagado' : paidAmount > 0 ? 'parcial' : 'pendiente'
});

describe('quincenas y meses (día argentino)', () => {
  it('1 al 15 y 16 a fin de mes', () => {
    expect(quincenaKey('2026-10-15T23:00:00.000Z')).toBe('2026-10-1'); // 15/10 20:00 AR
    expect(quincenaKey('2026-10-16T03:30:00.000Z')).toBe('2026-10-2'); // 16/10 00:30 AR
    expect(quincenaKey('2026-11-01T02:00:00.000Z')).toBe('2026-10-2'); // 31/10 23:00 AR
  });
  it('nombres', () => {
    expect(quincenaLabel('2026-10-1')).toEqual({ title: '1ª quincena de octubre 2026', range: '1 al 15 de octubre' });
    expect(quincenaLabel('2026-11-2').range).toBe('16 al 30 de noviembre');
    expect(quincenaLabel('2027-02-2').range).toBe('16 al 28 de febrero');
    expect(monthLabel('2026-10')).toBe('octubre 2026');
  });
});

describe('totales', () => {
  const charges = [
    ch('a', '2026-10-03T23:00:00Z', 200000, 200000),
    ch('b', '2026-10-31T23:00:00Z', 700000, 250000),
    ch('c', '2026-11-07T23:00:00Z', 350000),
    ch('d', '2026-11-08T23:00:00Z', null)
  ];
  it('generado por mes (lo más nuevo primero, sin los sin monto)', () => {
    expect(generatedByMonth(charges)).toEqual([['2026-11', 350000], ['2026-10', 900000]]);
  });
  it('total / pagado / falta de un grupo', () => {
    expect(groupTotals(charges.slice(0, 2))).toEqual({ total: 900000, paid: 450000, left: 450000, missing: 0 });
    expect(groupTotals(charges.slice(2)).missing).toBe(1);
  });
  it('qué se puede tildar', () => {
    expect(charges.map(isPayable)).toEqual([false, true, true, false]);
  });
});

describe('Por venir (lo que todavía no pasó)', () => {
  const NOW = new Date('2026-11-13T15:00:00.000Z'); // 13/11 12:00 AR
  const charges = [
    ch('ayer', '2026-11-12T23:00:00Z', 200000), // 12/11 AR
    ch('hoy-noche', '2026-11-14T01:00:00Z', 150000), // 13/11 22:00 AR → es HOY
    ch('pagado', '2026-11-05T23:00:00Z', 100000, 100000),
    ch('futuro', '2026-11-14T15:00:00Z', 200000), // 14/11 AR
    ch('futuro-sin-monto', '2026-11-20T15:00:00Z', null)
  ];
  it('futuro = día argentino posterior a hoy', () => {
    expect(charges.map((c) => isFutureDay(c.date, NOW))).toEqual([false, false, false, true, true]);
  });
  it('generado por mes sin lo futuro', () => {
    expect(generatedByMonth(charges, NOW)).toEqual([['2026-11', 450000]]);
    expect(generatedByMonth(charges)).toEqual([['2026-11', 650000]]); // sin now: todo (igual que antes)
  });
  it('separa lo que se debe hoy de lo por venir', () => {
    const g = splitGroup(charges, NOW);
    expect(g.due).toEqual({ total: 450000, paid: 100000, left: 350000, missing: 0 });
    expect(g.future).toEqual({ total: 200000, paid: 0, left: 200000, missing: 1 });
    expect(g.futureCount).toBe(2);
    expect(g.allFuture).toBe(false);
  });
  it('"Tildar todo" no tilda lo plegado por venir', () => {
    expect(splitGroup(charges, NOW).payableKeys).toEqual(['ayer', 'hoy-noche']);
  });
  it('grupo todo futuro: se puede tildar todo (para adelantar)', () => {
    const g = splitGroup(charges.slice(3), NOW);
    expect(g.allFuture).toBe(true);
    expect(g.payableKeys).toEqual(['futuro']);
  });
});

describe('planBatchPayment', () => {
  const charges = [
    ch('viejo', '2026-10-24T23:00:00Z', 200000),
    ch('parcial', '2026-10-31T23:00:00Z', 700000, 250000),
    ch('nuevo', '2026-11-07T23:00:00Z', 350000),
    ch('pagado', '2026-10-03T23:00:00Z', 200000, 200000)
  ];
  it('justo: cada renglón lo que le falta, sin sobrante', () => {
    const p = planBatchPayment(charges, ['nuevo', 'viejo'], 550000);
    expect(p.lines.map((l) => [l.chargeKey, l.amount])).toEqual([['viejo', 200000], ['nuevo', 350000]]);
    expect(p).toMatchObject({ leftover: 0, due: 550000 });
  });
  it('menos: cubre del más viejo al más nuevo', () => {
    const p = planBatchPayment(charges, ['viejo', 'parcial', 'nuevo'], 500000);
    expect(p.lines.map((l) => [l.chargeKey, l.amount])).toEqual([['viejo', 200000], ['parcial', 300000]]);
    expect(p.due).toBe(1000000);
  });
  it('más: lo que sobra va a cuenta', () => {
    const p = planBatchPayment(charges, ['viejo'], 250000);
    expect(p.lines).toHaveLength(1);
    expect(p.leftover).toBe(50000);
  });
  it('ignora lo ya pagado o inexistente', () => {
    const p = planBatchPayment(charges, ['pagado', 'nada'], 100000);
    expect(p).toMatchObject({ lines: [], leftover: 100000, due: 0, selectedCount: 0 });
  });
});

describe('previewBatchPayment', () => {
  const now = new Date('2026-11-12T15:00:00Z');
  const charges = [
    ch('oct', '2026-10-24T23:00:00Z', 200000),
    ch('nov', '2026-11-07T23:00:00Z', 350000),
    ch('futuro', '2026-11-21T23:00:00Z', 350000)
  ];
  const summary = { pendingToDate: 550000, favor: 0 };
  it('justo', () => {
    expect(previewBatchPayment(charges, ['oct'], 200000, summary, now)).toMatchObject({ selectionNet: 0, pendingAfter: 350000, favorAfter: 0 });
  });
  it('sobra: primero va a lo más viejo impago, después a favor', () => {
    const p = previewBatchPayment(charges, ['oct'], 600000, summary, now);
    expect(p).toMatchObject({ selectionNet: 400000, toOldest: 350000, pendingAfter: 0, favorAfter: 50000 });
  });
  it('falta', () => {
    expect(previewBatchPayment(charges, ['oct', 'nov'], 300000, summary, now)).toMatchObject({ selectionNet: -250000, pendingAfter: 250000 });
  });
  it('adelantar un evento futuro no baja lo que se debe hoy', () => {
    expect(previewBatchPayment(charges, ['futuro'], 350000, summary, now)).toMatchObject({ selectionNet: 0, pendingAfter: 550000 });
  });
});

describe('groupPayments', () => {
  const cr = (entryId: string, amount: number, extra: Partial<Credit> = {}): Credit => ({
    entryId, kind: 'pago', date: '2026-10-16T15:00:00.000Z', amount, method: 'efectivo', ...extra
  });
  it('un pago de varios renglones se ve como uno', () => {
    const g = groupPayments([
      cr('1', 200000, { batchId: 'b1', chargeKey: 'evento:a' }),
      cr('2', 610000, { batchId: 'b1', chargeKey: 'evento:b' }),
      cr('3', 50000, { batchId: 'b1' }),
      cr('4', 100000, { date: '2026-11-10T15:00:00.000Z' })
    ]);
    expect(g).toHaveLength(2);
    expect(g[0]).toMatchObject({ id: 'b1', amount: 860000, chargeKeys: ['evento:a', 'evento:b'], accountAmount: 50000, entryIds: ['1', '2', '3'] });
    expect(paymentTitle(g[0])).toBe('Pago');
    expect(paymentTitle(g[1])).toBe('Pago a cuenta');
  });
});
