// src/utils/staffLedger.ts
// Cuenta corriente de cobros de STAFF: lógica pura (sin Mongo ni React).
//
// La usan GET /api/staffLedger (admin) y GET /api/staffLedger/me (empleado), así
// que la imputación de pagos se calcula igual en las dos vistas.
//
// Modelo: los CARGOS son lo que se le debe al empleado (eventos trabajados y
// extras laborales); los ABONOS son lo que se le dio (pagos y adelantos). Los
// abonos cubren los cargos más viejos primero (FIFO): así Juan nunca tiene que
// elegir a qué evento corresponde un pago.
import { addMonths } from 'date-fns';

export type LedgerType = 'evento' | 'extra' | 'pago' | 'adelanto';
export type PaymentMethod = 'efectivo' | 'transferencia_tercero' | 'transferencia_degano';

export const PAYMENT_METHODS: PaymentMethod[] = [
  'efectivo',
  'transferencia_tercero',
  'transferencia_degano'
];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  efectivo: 'Efectivo',
  transferencia_tercero: 'Transferencia de tercero',
  transferencia_degano: 'Transferencia cuenta Degano'
};

export const CREDIT_TYPE_LABELS: Record<'pago' | 'adelanto', string> = {
  pago: 'Pago',
  adelanto: 'Adelanto'
};

// Documento de la colección staff_ledger (ya serializado: _id como string)
export interface LedgerEntry {
  _id: string;
  employeeId: string;
  type: LedgerType;
  date: string | Date;
  amount: number;
  eventId?: string;
  description?: string;
  hours?: number;
  method?: PaymentMethod;
  createdAt?: string | Date;
}

// Lo mínimo de un evento que hace falta para armar la cuenta
export interface StaffEvent {
  _id: string;
  type?: string;
  fullName?: string;
  lugar?: string;
  date: string | Date;
  endDate?: string | Date;
  staffArrivalDate?: string | Date;
  staffArrivalTime?: string;
  staff?: { employeeId: string; employeeName?: string; rol?: string }[];
}

export interface Charge {
  key: string; // estable para React: 'evento:<eventId>' | 'extra:<entryId>'
  kind: 'evento' | 'extra';
  entryId?: string; // _id en staff_ledger (no existe si el evento todavía no tiene monto)
  eventId?: string;
  date: string; // ISO
  amount: number | null; // null = sin monto cargado
  label: string;
  venue?: string;
  rol?: string;
  hours: number | null;
  unassigned?: true; // tiene monto pero el empleado ya no está en el evento
  eventDeleted?: true; // tiene monto pero el evento ya no existe
}

export type ChargeStatus = 'pagado' | 'parcial' | 'pendiente' | 'sin_monto';
export type DisplayStatus = ChargeStatus | 'futuro';

export interface AllocatedCharge extends Charge {
  paidAmount: number;
  status: ChargeStatus;
}

export interface Credit {
  entryId: string;
  kind: 'pago' | 'adelanto';
  date: string; // ISO
  amount: number;
  method?: PaymentMethod;
  description?: string;
}

export interface LedgerSummary {
  pendingToDate: number; // impago de cargos con fecha <= hoy
  balance: number; // cargos − abonos (negativo = a favor del empleado)
  favor: number; // abonos que sobran después de cubrir todo
  futureTotal: number; // cargos con fecha > hoy
  nextMonthTotal: number; // cargos entre hoy y dentro de 1 mes
  missingAmount: number; // eventos sin monto (todos)
  missingAmountNextMonth: number; // eventos sin monto entre hoy y dentro de 1 mes
  byMonth: Record<string, { charged: number; paid: number }>; // 'YYYY-MM'
}

export interface Account {
  charges: AllocatedCharge[];
  credits: Credit[];
  summary: LedgerSummary;
}

// Argentina no tiene horario de verano: el offset es fijo.
const AR_OFFSET_MS = 3 * 60 * 60 * 1000;
const AR_OFFSET = '-03:00';

export const round2 = (n: number) => Math.round(n * 100) / 100;

const toISO = (v: string | Date) => new Date(v).toISOString();

// Día calendario argentino (YYYY-MM-DD). Un string 'YYYY-MM-DD' se respeta tal
// cual (así se guarda staffArrivalDate a veces); un instante se pasa a hora AR.
// El servidor corre en UTC, por eso no se puede usar getDate() local.
export function arDay(v: string | Date | null | undefined): string | null {
  if (!v) return null;
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const t = new Date(v).getTime();
  if (isNaN(t)) return null;
  return new Date(t - AR_OFFSET_MS).toISOString().slice(0, 10);
}

export function eventLabel(ev: Pick<StaffEvent, 'type' | 'fullName'>): string {
  return [ev.type, ev.fullName].map((s) => (s || '').trim()).filter(Boolean).join(' · ') || 'Evento';
}

// Horas del staff: desde la llegada del staff hasta el fin del evento. Si no hay
// hora de llegada se usa el inicio del evento. Solo informativo (redondeado a
// la media hora): el monto lo carga Juan a mano.
export function computeStaffHours(ev: StaffEvent): number | null {
  if (!ev.endDate) return null;
  const end = new Date(ev.endDate).getTime();

  const time = (ev.staffArrivalTime || '').trim();
  const validTime = /^\d{1,2}:\d{2}$/.test(time) ? time.padStart(5, '0') : null;
  const day = arDay(ev.staffArrivalDate) || arDay(ev.date);

  const start = validTime && day
    ? new Date(`${day}T${validTime}:00${AR_OFFSET}`).getTime()
    : new Date(ev.date).getTime();

  if (isNaN(start) || isNaN(end) || end <= start) return null;
  return Math.round(((end - start) / 3_600_000) * 2) / 2;
}

const byDate = (a: { date: string; key?: string }, b: { date: string; key?: string }) =>
  a.date.localeCompare(b.date) || String(a.key ?? '').localeCompare(String(b.key ?? ''));

// Combina los eventos donde está (o estuvo) el empleado con los montos guardados.
// `events` tiene que incluir los eventos asignados Y los referenciados por líneas
// guardadas (aunque ya no esté asignado). Un evento referenciado que no vino es
// un evento borrado.
export function buildCharges(employeeId: string, events: StaffEvent[], entries: LedgerEntry[]): Charge[] {
  const eventLines = new Map(
    entries.filter((e) => e.type === 'evento' && e.eventId).map((e) => [String(e.eventId), e])
  );
  const eventIds = new Set(events.map((e) => String(e._id)));
  const charges: Charge[] = [];

  for (const ev of events) {
    const id = String(ev._id);
    const member = ev.staff?.find((s) => s.employeeId === employeeId);
    const line = eventLines.get(id);
    if (!member && !line) continue;
    charges.push({
      key: `evento:${id}`,
      kind: 'evento',
      ...(line ? { entryId: String(line._id) } : {}),
      eventId: id,
      date: toISO(ev.date), // manda la fecha del evento (puede haber cambiado)
      amount: line ? line.amount : null,
      label: eventLabel(ev),
      ...(ev.lugar ? { venue: ev.lugar } : {}),
      ...(member ? { rol: member.rol?.trim() || 'Sin rol' } : {}),
      hours: computeStaffHours(ev),
      ...(member ? {} : { unassigned: true as const })
    });
  }

  for (const [eventId, line] of eventLines) {
    if (eventIds.has(eventId)) continue;
    charges.push({
      key: `evento:${eventId}`,
      kind: 'evento',
      entryId: String(line._id),
      eventId,
      date: toISO(line.date),
      amount: line.amount,
      label: line.description || 'Evento eliminado',
      hours: null,
      eventDeleted: true
    });
  }

  for (const e of entries) {
    if (e.type !== 'extra') continue;
    charges.push({
      key: `extra:${e._id}`,
      kind: 'extra',
      entryId: String(e._id),
      date: toISO(e.date),
      amount: e.amount,
      label: e.description || 'Extra',
      hours: typeof e.hours === 'number' ? e.hours : null
    });
  }

  return charges.sort(byDate);
}

export function toCredits(entries: LedgerEntry[]): Credit[] {
  return entries
    .filter((e) => e.type === 'pago' || e.type === 'adelanto')
    .map((e) => ({
      entryId: String(e._id),
      kind: e.type as 'pago' | 'adelanto',
      date: toISO(e.date),
      amount: e.amount,
      ...(e.method ? { method: e.method } : {}),
      ...(e.description ? { description: e.description } : {})
    }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.entryId.localeCompare(b.entryId));
}

// Imputación FIFO: el total abonado va cubriendo los cargos del más viejo al
// más nuevo. Los cargos sin monto no participan. Lo que sobra queda a favor.
export function allocate(charges: Charge[], credits: Credit[]) {
  let pool = round2(credits.reduce((s, c) => s + c.amount, 0));
  const out: AllocatedCharge[] = [...charges].sort(byDate).map((c) => {
    if (c.amount == null) return { ...c, paidAmount: 0, status: 'sin_monto' as const };
    const paid = round2(Math.min(pool, c.amount));
    pool = round2(pool - paid);
    const status: ChargeStatus = paid >= c.amount ? 'pagado' : paid > 0 ? 'parcial' : 'pendiente';
    return { ...c, paidAmount: paid, status };
  });
  return { charges: out, unappliedCredit: pool };
}

export function summarizeAccount(
  charges: AllocatedCharge[],
  credits: Credit[],
  unappliedCredit: number,
  now: Date
): LedgerSummary {
  const nowMs = now.getTime();
  const nextMonthMs = addMonths(now, 1).getTime();
  const byMonth: LedgerSummary['byMonth'] = {};
  const month = (iso: string) => (arDay(iso) as string).slice(0, 7);
  const bucket = (m: string) => (byMonth[m] ??= { charged: 0, paid: 0 });

  let pendingToDate = 0, futureTotal = 0, nextMonthTotal = 0, totalCharged = 0;
  let missingAmount = 0, missingAmountNextMonth = 0;

  for (const c of charges) {
    const t = new Date(c.date).getTime();
    const isNextMonth = t > nowMs && t <= nextMonthMs;
    if (c.amount == null) {
      missingAmount++;
      if (isNextMonth) missingAmountNextMonth++;
      continue;
    }
    totalCharged += c.amount;
    bucket(month(c.date)).charged = round2(bucket(month(c.date)).charged + c.amount);
    if (t <= nowMs) pendingToDate += c.amount - c.paidAmount;
    else futureTotal += c.amount;
    if (isNextMonth) nextMonthTotal += c.amount;
  }

  let totalCredited = 0;
  for (const cr of credits) {
    totalCredited += cr.amount;
    bucket(month(cr.date)).paid = round2(bucket(month(cr.date)).paid + cr.amount);
  }

  return {
    pendingToDate: round2(pendingToDate),
    balance: round2(totalCharged - totalCredited),
    favor: round2(unappliedCredit),
    futureTotal: round2(futureTotal),
    nextMonthTotal: round2(nextMonthTotal),
    missingAmount,
    missingAmountNextMonth,
    byMonth
  };
}

export function buildAccount(
  employeeId: string,
  events: StaffEvent[],
  entries: LedgerEntry[],
  now: Date
): Account {
  const credits = toCredits(entries);
  const { charges, unappliedCredit } = allocate(buildCharges(employeeId, events, entries), credits);
  return { charges, credits, summary: summarizeAccount(charges, credits, unappliedCredit, now) };
}

// Lo impago hasta un día (YYYY-MM-DD, inclusive). Precarga el monto de
// "pagar hasta tal fecha" en el modal de pago.
export function pendingUpTo(charges: AllocatedCharge[], day: string): number {
  return round2(
    charges
      .filter((c) => c.amount != null && (arDay(c.date) as string) <= day)
      .reduce((s, c) => s + ((c.amount as number) - c.paidAmount), 0)
  );
}

// Lo que el empleado puede ver: 3 meses hacia atrás y 1 hacia adelante.
export function employeeWindow(now: Date) {
  return { from: addMonths(now, -3), to: addMonths(now, 1) };
}

export function inWindow(date: string | Date, w: { from: Date; to: Date }) {
  const t = new Date(date).getTime();
  return t >= w.from.getTime() && t <= w.to.getTime();
}

// Estado para mostrar: un cargo impago con fecha futura todavía no está "pendiente".
export function displayStatus(c: AllocatedCharge, now: Date): DisplayStatus {
  if ((c.status === 'pendiente' || c.status === 'parcial') && new Date(c.date).getTime() > now.getTime()) {
    return 'futuro';
  }
  return c.status;
}

// Valor de un DateInput (Mantine v8 devuelve 'YYYY-MM-DD'; un Date se toma con
// el día local del navegador) → 'YYYY-MM-DD'. Nunca pasar un 'YYYY-MM-DD' por
// new Date(): lo interpreta en UTC y en Argentina corre el día.
export function inputDay(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  if (typeof d === 'string') {
    const m = d.match(/^(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : null;
  }
  if (isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
