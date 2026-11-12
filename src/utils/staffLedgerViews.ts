// src/utils/staffLedgerViews.ts
// Vistas nuevas de Cobros STAFF (Resumen de cuenta por mes, Por quincena,
// Armar el pago). Lógica pura y testeada. NO cambia cómo se calcula la cuenta
// (eso es utils/staffLedger): acá solo se agrupa, se resume y se arma un pago.
//
// Pagar varios renglones de una vez = un abono por renglón (con su chargeKey,
// como el tilde de siempre) + lo que sobre como pago a cuenta. Todos llevan el
// mismo batchId: se muestran como UN pago y se deshacen juntos.
import { AllocatedCharge, Credit, arDay, round2 } from './staffLedger';

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export const monthKey = (iso: string) => (arDay(iso) as string).slice(0, 7);
export function monthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

// Quincenas: 1 al 15 y 16 a fin de mes (día argentino). Clave 'YYYY-MM-1' | 'YYYY-MM-2'
export function quincenaKey(iso: string): string {
  const d = arDay(iso) as string;
  return `${d.slice(0, 7)}-${Number(d.slice(8, 10)) <= 15 ? 1 : 2}`;
}
export function quincenaLabel(key: string): { title: string; range: string } {
  const [y, m, half] = key.split('-').map(Number);
  const month = MONTHS[m - 1];
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return half === 1
    ? { title: `1ª quincena de ${month} ${y}`, range: `1 al 15 de ${month}` }
    : { title: `2ª quincena de ${month} ${y}`, range: `16 al ${lastDay} de ${month}` };
}

export const remainingOf = (c: Pick<AllocatedCharge, 'amount' | 'paidAmount'>) =>
  c.amount == null ? 0 : round2(Math.max(0, c.amount - c.paidAmount));

// ¿Se puede tildar para pagar? Con monto cargado y algo por pagar
export const isPayable = (c: AllocatedCharge) => c.amount != null && c.amount > 0 && remainingOf(c) > 0;

// Total generado por mes (lo que se le cargó: eventos, extras y fijos con monto)
export function generatedByMonth(charges: Pick<AllocatedCharge, 'date' | 'amount'>[]): [string, number][] {
  const map = new Map<string, number>();
  for (const c of charges) {
    if (c.amount == null) continue;
    const k = monthKey(c.date);
    map.set(k, round2((map.get(k) ?? 0) + c.amount));
  }
  return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
}

// Resumen de un grupo de renglones (mes o quincena)
export function groupTotals(charges: AllocatedCharge[]) {
  let total = 0, paid = 0, missing = 0;
  for (const c of charges) {
    if (c.amount == null) { missing++; continue; }
    total += c.amount;
    paid += Math.min(c.paidAmount, c.amount);
  }
  return { total: round2(total), paid: round2(paid), left: round2(total - paid), missing };
}

/**
 * Reparte un pago entre los renglones tildados: del más viejo al más nuevo,
 * cada uno hasta lo que le falta. Lo que sobra va como pago a cuenta.
 */
export function planBatchPayment(charges: AllocatedCharge[], keys: string[], amount: number) {
  const wanted = new Set(keys);
  const selected = charges
    .filter((c) => wanted.has(c.key) && isPayable(c))
    .sort((a, b) => a.date.localeCompare(b.date) || a.key.localeCompare(b.key));
  let left = round2(Math.max(0, amount));
  const lines: { chargeKey: string; amount: number; date: string }[] = [];
  for (const c of selected) {
    const take = round2(Math.min(remainingOf(c), left));
    if (take <= 0) continue;
    lines.push({ chargeKey: c.key, amount: take, date: c.date });
    left = round2(left - take);
  }
  const due = round2(selected.reduce((s, c) => s + remainingOf(c), 0));
  return { lines, leftover: left, due, selectedCount: selected.length };
}

/**
 * Qué pasa si se paga `amount` por lo tildado. Respeta cómo funciona la cuenta:
 * lo que sobre se aplica solo a lo más viejo impago a hoy, y recién después
 * queda a favor.
 */
export function previewBatchPayment(
  charges: AllocatedCharge[],
  keys: string[],
  amount: number,
  summary: { pendingToDate: number; favor: number },
  now: Date
) {
  const today = arDay(now) as string;
  const { lines, leftover, due } = planBatchPayment(charges, keys, amount);
  const byKey = new Map(charges.map((c) => [c.key, c]));
  const coveredToDate = round2(
    lines.filter((l) => (arDay(byKey.get(l.chargeKey)!.date) as string) <= today).reduce((s, l) => s + l.amount, 0)
  );
  const pendingRest = round2(Math.max(0, summary.pendingToDate - coveredToDate));
  const toOldest = round2(Math.min(leftover, pendingRest));
  const pendingAfter = round2(pendingRest - toOldest);
  const favorAfter = round2(summary.favor + leftover - toOldest);
  return {
    due, // lo que falta de lo tildado
    selectionNet: round2(amount - due), // 0 justo, < 0 queda pendiente de lo tildado, > 0 sobra
    toOldest, // de lo que sobra, lo que se aplica a lo más viejo impago
    pendingAfter, // saldo a pagar hoy después de este pago
    favorAfter // a favor después de este pago
  };
}

// ¿Este abono es pago a cuenta? (no está atado a un renglón)
export const isAccountCredit = (c: Pick<Credit, 'chargeKey'>) => !c.chargeKey;

export interface PaymentGroup {
  id: string; // batchId o el id del abono suelto
  batchId?: string;
  entryIds: string[];
  date: string;
  method?: Credit['method'];
  amount: number;
  chargeKeys: string[]; // renglones que pagó
  accountAmount: number; // parte que fue a cuenta
  description?: string;
}

// Abonos agrupados como pagos (un pago de varios renglones = un grupo)
export function groupPayments(credits: Credit[]): PaymentGroup[] {
  const groups = new Map<string, PaymentGroup>();
  for (const c of credits) {
    const id = c.batchId || c.entryId;
    const g =
      groups.get(id) ??
      ({ id, ...(c.batchId ? { batchId: c.batchId } : {}), entryIds: [], date: c.date, method: c.method, amount: 0, chargeKeys: [], accountAmount: 0, ...(c.description ? { description: c.description } : {}) } as PaymentGroup);
    g.entryIds.push(c.entryId);
    g.amount = round2(g.amount + c.amount);
    if (c.chargeKey) g.chargeKeys.push(c.chargeKey);
    else g.accountAmount = round2(g.accountAmount + c.amount);
    if (c.date < g.date) g.date = c.date;
    groups.set(id, g);
  }
  return [...groups.values()].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}

// Nombre del pago para mostrar: atado a renglones = "Pago"; sin renglones = "Pago a cuenta"
export const paymentTitle = (g: Pick<PaymentGroup, 'chargeKeys'>) => (g.chargeKeys.length ? 'Pago' : 'Pago a cuenta');
