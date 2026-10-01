// src/utils/staffLedgerInput.test.ts
import { describe, it, expect } from 'vitest';
import { parseAmount, parseLedgerInput, isLedgerEligible, amountForRequest, mergeLedgerUpdate } from './staffLedgerInput';

describe('parseAmount', () => {
  it('acepta números y strings en formato argentino', () => {
    expect(parseAmount(1500)).toBe(1500);
    expect(parseAmount('15.000,50')).toBe(15000.5);
    expect(parseAmount('2500')).toBe(2500);
    expect(parseAmount(10.006)).toBe(10.01);
  });
  it('vacío → null', () => {
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('  ')).toBeNull();
    expect(parseAmount(null)).toBeNull();
    expect(parseAmount(undefined)).toBeNull();
  });
  it('basura o negativos → invalid', () => {
    expect(parseAmount('abc')).toBe('invalid');
    expect(parseAmount(NaN)).toBe('invalid');
    expect(parseAmount(Infinity)).toBe('invalid');
    expect(parseAmount(-5)).toBe('invalid');
  });
});

describe('parseLedgerInput', () => {
  const base = { employeeId: 'emp1' };

  it('evento: monto vacío significa borrar la línea', () => {
    const r = parseLedgerInput({ ...base, type: 'evento', eventId: 'ev1', amount: '' });
    expect(r).toEqual({ ok: true, value: { type: 'evento', employeeId: 'emp1', eventId: 'ev1', amount: null } });
  });
  it('evento: acepta 0 y exige eventId', () => {
    expect(parseLedgerInput({ ...base, type: 'evento', eventId: 'ev1', amount: 0 }).ok).toBe(true);
    expect(parseLedgerInput({ ...base, type: 'evento', amount: 100 })).toEqual({ ok: false, error: 'Falta el evento' });
  });
  it('extra: exige fecha, descripción y monto > 0', () => {
    const ok = parseLedgerInput({ ...base, type: 'extra', date: '2026-10-01', amount: 300, description: ' Depósito ', hours: 4 });
    expect(ok).toMatchObject({ ok: true, value: { description: 'Depósito', hours: 4, amount: 300 } });
    expect(parseLedgerInput({ ...base, type: 'extra', date: '2026-10-01', amount: 300 }).ok).toBe(false);
    expect(parseLedgerInput({ ...base, type: 'extra', date: '2026-10-01', amount: 0, description: 'x' }).ok).toBe(false);
    expect(parseLedgerInput({ ...base, type: 'extra', amount: 10, description: 'x' }).ok).toBe(false);
  });
  it('pago/adelanto: exige método válido y monto > 0', () => {
    expect(parseLedgerInput({ ...base, type: 'pago', date: '2026-10-01', amount: 100, method: 'efectivo' }).ok).toBe(true);
    expect(parseLedgerInput({ ...base, type: 'adelanto', date: '2026-10-01', amount: 100, method: 'cheque' })).toEqual({
      ok: false,
      error: 'Forma de pago inválida'
    });
    expect(parseLedgerInput({ ...base, type: 'pago', date: '2026-10-01', amount: '', method: 'efectivo' }).ok).toBe(false);
  });
  it('monto inválido → error claro', () => {
    expect(parseLedgerInput({ ...base, type: 'pago', date: '2026-10-01', amount: 'abc', method: 'efectivo' })).toEqual({
      ok: false,
      error: 'Monto inválido'
    });
  });
  it('rechaza tipo o empleado faltante', () => {
    expect(parseLedgerInput({ type: 'pago' }).ok).toBe(false);
    expect(parseLedgerInput({ ...base, type: 'otro' }).ok).toBe(false);
  });
  it('fecha: guarda el mediodía AR para no correr el día', () => {
    const r = parseLedgerInput({ ...base, type: 'pago', date: '2026-10-01', amount: 1, method: 'efectivo' });
    expect(r.ok && r.value.date?.toISOString()).toBe('2026-10-01T15:00:00.000Z');
  });
});

describe('isLedgerEligible', () => {
  it('solo personal de STAFF (isStaff distinto de false)', () => {
    expect(isLedgerEligible({ isStaff: true })).toBe(true);
    expect(isLedgerEligible({})).toBe(true); // legacy
    expect(isLedgerEligible({ isStaff: false })).toBe(false); // entrada de directorio
    expect(isLedgerEligible(null)).toBe(false);
  });
});

describe('amountForRequest', () => {
  // NumberInput de Mantine 8 devuelve un string con PUNTO decimal cuando el
  // valor termina en 0 ("1500.50"); el servidor lee formato argentino y
  // borraría el punto (150050). El cliente tiene que mandar un número.
  it('string con punto decimal de NumberInput → número', () => {
    expect(amountForRequest('1500.50')).toBe(1500.5);
    expect(amountForRequest('2.0')).toBe(2);
    expect(parseAmount(amountForRequest('1500.50'))).toBe(1500.5);
  });
  it('número → mismo número; vacío → ""', () => {
    expect(amountForRequest(1500)).toBe(1500);
    expect(amountForRequest('')).toBe('');
  });
});

describe('mergeLedgerUpdate', () => {
  const pago = { _id: 'p', type: 'pago', employeeId: 'emp1', amount: 100, method: 'efectivo', date: new Date('2026-10-01T15:00:00Z') };
  it('permite cambiar entre pago y adelanto', () => {
    const r = mergeLedgerUpdate(pago, { type: 'adelanto', amount: 200 });
    expect(r).toMatchObject({ ok: true, merged: { type: 'adelanto', amount: 200, employeeId: 'emp1' } });
  });
  it('sin type en el body conserva el actual; el empleado no se cambia', () => {
    const r = mergeLedgerUpdate(pago, { employeeId: 'otro' });
    expect(r).toMatchObject({ ok: true, merged: { type: 'pago', employeeId: 'emp1' } });
  });
  it('rechaza cambiar un abono a cargo', () => {
    expect(mergeLedgerUpdate(pago, { type: 'extra' })).toEqual({ ok: false, error: 'No se puede cambiar el tipo de movimiento' });
  });
  it('una línea de evento no se edita por acá', () => {
    expect(mergeLedgerUpdate({ ...pago, type: 'evento' }, { amount: 5 }).ok).toBe(false);
  });
});
