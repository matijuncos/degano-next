// src/utils/staffLedgerInput.ts
// Validación de lo que llega a /api/staffLedger. Pura para poder testearla.
import { LedgerType, PaymentMethod, PAYMENT_METHODS, round2, isChargeKey } from './staffLedger';

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
  rol?: string;
  method?: PaymentMethod;
  chargeKey?: string;
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
    const rol = typeof body.rol === 'string' ? body.rol.trim() : '';
    return {
      ok: true,
      value: {
        type, employeeId, amount, date, description,
        ...(hours !== null ? { hours } : {}),
        ...(rol ? { rol } : {})
      }
    };
  }

  const method = body.method as PaymentMethod;
  if (!PAYMENT_METHODS.includes(method)) return fail('Forma de pago inválida');
  // Abono hecho con el tilde de una línea: queda atado a esa línea
  const hasChargeKey = body.chargeKey !== undefined && body.chargeKey !== null;
  if (hasChargeKey && !isChargeKey(body.chargeKey)) return fail('Línea a pagar inválida');
  return {
    ok: true,
    value: {
      type, employeeId, amount, date, method,
      ...(description ? { description } : {}),
      ...(hasChargeKey ? { chargeKey: body.chargeKey } : {})
    }
  };
}

// ¿Este registro de employees tiene cuenta de cobros? Las entradas de
// directorio (isStaff:false, se auto-crean en el login) no son STAFF.
export function isLedgerEligible(employee: { isStaff?: boolean } | null | undefined): boolean {
  return !!employee && employee.isStaff !== false;
}

// Lo que el cliente manda como monto/horas. El NumberInput de Mantine 8 a veces
// devuelve un string con PUNTO decimal ("1500.50"); el servidor lee formato
// argentino y borraría el punto. Se manda siempre un número (o '' = vacío).
export function amountForRequest(v: number | string): number | '' {
  if (v === '' || v === null || v === undefined) return '';
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : '';
}

const CREDIT_TYPES: LedgerType[] = ['pago', 'adelanto'];

// PUT de un movimiento: lo que no viene en el body se toma del documento actual
// (bodies parciales). El empleado no cambia. Entre pago y adelanto se puede
// cambiar (los dos son abonos); a otro tipo no.
export function mergeLedgerUpdate(
  existing: any,
  body: any
): { ok: true; merged: any } | { ok: false; error: string } {
  if (existing.type === 'evento') {
    return { ok: false, error: 'El monto de un evento se edita desde la fila del evento' };
  }
  const type = body?.type ?? existing.type;
  const canSwitch = CREDIT_TYPES.includes(type) && CREDIT_TYPES.includes(existing.type);
  if (type !== existing.type && !canSwitch) {
    return { ok: false, error: 'No se puede cambiar el tipo de movimiento' };
  }
  return { ok: true, merged: { ...existing, ...body, type, employeeId: existing.employeeId } };
}

// ¿El texto del NumberInput de la fila ("$ 1.500,50") cambia el monto actual?
// Se compara como número: "1500.50" y 1500.5 son lo mismo.
export function amountChanged(raw: string, current: number | null): boolean {
  const next = parseAmount(raw.replace(/^\$\s*/, ''));
  if (next === 'invalid') return true; // que el servidor responda el error
  return next !== current;
}

// ¿Se puede cargar el monto de este evento a este empleado? Un monto nuevo
// exige que esté asignado; una línea que ya existe se puede corregir siempre
// (aunque lo hayan sacado del evento o el evento se haya borrado).
export function eventAmountGuard(
  event: { staff?: { employeeId: string }[] } | null,
  employeeId: string,
  lineExists: boolean
): string | null {
  if (lineExists) return null;
  if (!event) return 'Evento no encontrado';
  const assigned = (event.staff ?? []).some((s) => s.employeeId === employeeId);
  return assigned ? null : 'El empleado no está asignado a este evento';
}
