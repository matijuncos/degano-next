// src/utils/staffLedgerInput.ts
// Validación de lo que llega a /api/staffLedger. Pura para poder testearla.
import { LedgerType, PaymentMethod, PAYMENT_METHODS, round2 } from './staffLedger';

const TYPES: LedgerType[] = ['evento', 'extra', 'pago', 'adelanto'];

// Monto: número o string ("15.000,50"). Vacío → null (en una línea de evento
// significa "borrar el monto"). Cualquier otra cosa no numérica → 'invalid'.
export function parseAmount(raw: unknown): number | null | 'invalid' {
  if (raw === null || raw === undefined) return null;
  let n: number;
  if (typeof raw === 'number') n = raw;
  else if (typeof raw === 'string') {
    const s = raw.trim();
    if (!s) return null;
    n = Number(s.replace(/\./g, '').replace(',', '.'));
  } else return 'invalid';
  if (!Number.isFinite(n) || n < 0) return 'invalid';
  return round2(n);
}

// 'YYYY-MM-DD' (o ISO) → mediodía en Argentina, así el día no se corre en
// ningún huso horario al mostrarlo.
function parseDay(raw: unknown): Date | null {
  if (typeof raw !== 'string' && !(raw instanceof Date)) return null;
  const s = raw instanceof Date ? raw.toISOString() : raw;
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (!m) return null;
  const d = new Date(`${m[1]}T12:00:00-03:00`);
  return isNaN(d.getTime()) ? null : d;
}

export type LedgerInput = {
  type: LedgerType;
  employeeId: string;
  amount: number | null;
  eventId?: string;
  date?: Date;
  description?: string;
  hours?: number;
  method?: PaymentMethod;
};

type Result = { ok: true; value: LedgerInput } | { ok: false; error: string };
const fail = (error: string): Result => ({ ok: false, error });

export function parseLedgerInput(body: any): Result {
  if (!body || typeof body !== 'object') return fail('Datos inválidos');
  const type = body.type as LedgerType;
  if (!TYPES.includes(type)) return fail('Tipo de movimiento inválido');
  const employeeId = typeof body.employeeId === 'string' ? body.employeeId.trim() : '';
  if (!employeeId) return fail('Falta el empleado');

  const amount = parseAmount(body.amount);
  if (amount === 'invalid') return fail('Monto inválido');

  if (type === 'evento') {
    const eventId = typeof body.eventId === 'string' ? body.eventId.trim() : '';
    if (!eventId) return fail('Falta el evento');
    return { ok: true, value: { type, employeeId, eventId, amount } };
  }

  if (amount === null || amount <= 0) return fail('El monto tiene que ser mayor a 0');
  const date = parseDay(body.date);
  if (!date) return fail('Falta la fecha');
  const description = typeof body.description === 'string' ? body.description.trim() : '';

  if (type === 'extra') {
    if (!description) return fail('Falta la descripción del extra');
    const hours = parseAmount(body.hours);
    if (hours === 'invalid') return fail('Horas inválidas');
    return {
      ok: true,
      value: { type, employeeId, amount, date, description, ...(hours !== null ? { hours } : {}) }
    };
  }

  const method = body.method as PaymentMethod;
  if (!PAYMENT_METHODS.includes(method)) return fail('Forma de pago inválida');
  return {
    ok: true,
    value: { type, employeeId, amount, date, method, ...(description ? { description } : {}) }
  };
}

// ¿Este registro de employees tiene cuenta de cobros? Las entradas de
// directorio (isStaff:false, se auto-crean en el login) no son STAFF.
export function isLedgerEligible(employee: { isStaff?: boolean } | null | undefined): boolean {
  return !!employee && employee.isStaff !== false;
}
