# Cobros de STAFF — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cuenta corriente de cobros por empleado de STAFF (montos manuales por evento, extras, adelantos, pagos, imputación automática), vista admin completa, vista "Mis cobros" para el empleado y póliza de seguro en PDF.

**Architecture:** Colección nueva `staff_ledger` con los movimientos cargados por el admin. Las líneas de evento se **derivan** de `events.staff` al leer y se combinan con los montos guardados. Toda la cuenta (horas, combinación, imputación FIFO, totales, ventana del empleado) es lógica pura en `src/utils/staffLedger.ts`, testeada con Vitest y usada por los dos endpoints. Las páginas usan SWR con una request por vista.

**Tech Stack:** Next.js 14 App Router, TypeScript, MongoDB driver, Auth0 (`withAuth`), Mantine v8 (+ `@mantine/dates`), SWR, date-fns, AWS S3 (presigned), Vitest.

**Spec:** `docs/superpowers/specs/2026-10-01-staff-cobros-design.md`

## Global Constraints

- Código en inglés; comentarios, labels y mensajes en **español**. Commits en español.
- Todo lo que sea plata: **solo admin** (`withAdminAuth` en el back, `isAdmin` / `can('canEditPayments')` en el front).
- Identidad: `employeeId` = `_id` del empleado como string. Nunca el `sub` de Auth0. Resolver con `resolveEmployee(db, user)`.
- Una entrada de directorio (`isStaff === false`) **no** es STAFF: no tiene "Mis cobros".
- Ventana del empleado: 3 meses atrás, 1 mes adelante. Se recorta **en el servidor**. El empleado nunca recibe `futureTotal` ni `byMonth`.
- Zona horaria: Argentina, UTC-03:00 fijo (sin horario de verano). Los días calendario se calculan con ese offset.
- Montos: número finito, redondeado a 2 decimales. `evento` admite `>= 0` (0 = "no se paga"); `extra`, `pago` y `adelanto` exigen `> 0`.
- Formas de pago: `efectivo` · `transferencia_tercero` · `transferencia_degano`.
- Nunca reusar una `NextResponse` de módulo; en el front validar siempre `res.ok` y mostrar el error del servidor.
- MongoDB: no combinar `$set` y `$unset` sobre el mismo campo.
- Archivos: presigned PUT directo a S3 (bucket `budgets`, carpeta `staff-policies/`), nunca por body.
- Performance: sin cascadas, loaders mientras `!data`, SWR con `revalidateOnFocus: false`, `Promise.all` en el server.
- Verificación: `npm test`, `npx tsc --noEmit`, `next build` al final.

## Review Focus

1. **Usuario logueado sin registro de STAFF.** `GET /api/me` le crea una entrada de directorio (`isStaff:false`), así que `useMyEmployee` devuelve un empleado. "Mis cobros" no se tiene que mostrar, y `/api/staffLedger/me` tiene que responder `linked:false`. → Test en Task 2 (`isLedgerEligible`) y chequeo en Tasks 4 y 9.
2. **Evento con hora de llegada pero sin fecha de llegada, o con llegada después de la medianoche.** Hay que usar el día del evento en horario argentino, y que el servidor (que corre en UTC) no corra el día. → Tests en Task 1 (`computeStaffHours`).
3. **Sacan al empleado del evento, o se borra el evento, después de cargado el monto.** La línea no puede desaparecer ni romper la cuenta. → Tests en Task 1 (`buildCharges`).
4. **Adelanto mayor que lo adeudado.** Tiene que quedar "a favor" y cubrir cargos futuros, sin mostrar pendiente negativo. → Test en Task 1 (`allocate` / `summarizeAccount`).
5. **Monto ingresado como texto con coma o vacío** (`"15.000,50"`, `""`). Vacío borra la línea de evento; un texto inválido da 400 con mensaje y no guarda `NaN`. → Tests en Task 2 (`parseLedgerInput`).

---

## Mapa de archivos

| Archivo | Responsabilidad |
|---|---|
| `src/utils/staffLedger.ts` (crear) | Tipos y lógica pura de la cuenta |
| `src/utils/staffLedger.test.ts` (crear) | Tests de la lógica pura |
| `src/utils/staffLedgerInput.ts` (crear) | Validación de los bodies de la API (pura) |
| `src/utils/staffLedgerInput.test.ts` (crear) | Tests de la validación |
| `src/lib/staffLedgerServer.ts` (crear) | Acceso a Mongo: índices, carga de cuenta, resúmenes |
| `src/app/api/staffLedger/route.ts` (crear) | API admin |
| `src/app/api/staffLedger/me/route.ts` (crear) | API del empleado |
| `src/app/api/staffPolicy/route.ts` (crear) | Póliza: subir, ver, quitar |
| `src/app/api/employees/route.ts` (modificar) | Excluir `insurancePolicy` de la proyección pública |
| `src/hooks/useStaffLedger.ts` (crear) | SWR + mutaciones |
| `src/components/StaffLedger/LedgerSummaryCards.tsx` (crear) | Tarjetas de totales |
| `src/components/StaffLedger/LedgerTable.tsx` (crear) | Tabla por mes (admin editable / empleado lectura) |
| `src/components/StaffLedger/PaymentModal.tsx` (crear) | Alta y edición de pago/adelanto |
| `src/components/StaffLedger/ExtraModal.tsx` (crear) | Alta y edición de extra |
| `src/components/StaffLedger/PolicySection.tsx` (crear) | Póliza (admin y empleado) |
| `src/app/cobros-staff/page.tsx` (crear) | Pantalla admin |
| `src/app/mis-cobros/page.tsx` (crear) | Pantalla del empleado |
| `src/components/NavBar/NavBar.tsx`, `src/app/home/page.tsx` (modificar) | Accesos |
| `CLAUDE.md` (modificar) | Colección y reglas nuevas |

---

### Task 1: Lógica pura de la cuenta corriente

**Files:**
- Create: `src/utils/staffLedger.ts`
- Test: `src/utils/staffLedger.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces (exportados, los usan todas las tasks siguientes):
  - Tipos: `LedgerType`, `PaymentMethod`, `LedgerEntry`, `StaffEvent`, `Charge`, `AllocatedCharge`, `ChargeStatus`, `DisplayStatus`, `Credit`, `LedgerSummary`, `Account`.
  - Constantes: `PAYMENT_METHODS`, `PAYMENT_METHOD_LABELS`, `CREDIT_TYPE_LABELS`.
  - Funciones: `arDay(v): string | null`, `round2(n): number`, `eventLabel(ev): string`, `computeStaffHours(ev): number | null`, `buildCharges(employeeId, events, entries): Charge[]`, `toCredits(entries): Credit[]`, `allocate(charges, credits): { charges: AllocatedCharge[]; unappliedCredit: number }`, `summarizeAccount(charges, credits, unappliedCredit, now): LedgerSummary`, `buildAccount(employeeId, events, entries, now): Account`, `pendingUpTo(charges, day): number`, `employeeWindow(now): { from: Date; to: Date }`, `inWindow(date, window): boolean`, `displayStatus(charge, now): DisplayStatus`.

- [ ] **Step 1: Escribir los tests que fallan**

```ts
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
```

- [ ] **Step 2: Correr los tests y verificar que fallan**

Run: `npm test -- src/utils/staffLedger.test.ts`
Expected: FAIL ("Failed to resolve import './staffLedger'").

- [ ] **Step 3: Implementar**

```ts
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
```

- [ ] **Step 4: Correr los tests y verificar que pasan**

Run: `npm test -- src/utils/staffLedger.test.ts`
Expected: PASS (todos). Si falla alguno, corregir la implementación, no el test (salvo error evidente del test; en ese caso explicar por qué).

- [ ] **Step 5: Commit**

```bash
git add src/utils/staffLedger.ts src/utils/staffLedger.test.ts
git commit -m "feat: lógica pura de cuenta corriente de cobros de STAFF"
```

---

### Task 2: Validación de los bodies y elegibilidad

**Files:**
- Create: `src/utils/staffLedgerInput.ts`
- Test: `src/utils/staffLedgerInput.test.ts`

**Interfaces:**
- Consumes: `LedgerType`, `PaymentMethod`, `PAYMENT_METHODS`, `round2` de `./staffLedger`.
- Produces:
  - `parseAmount(raw: unknown): number | null | 'invalid'`
  - `type LedgerInput = { type: LedgerType; employeeId: string; amount: number | null; eventId?: string; date?: Date; description?: string; hours?: number; method?: PaymentMethod }`
  - `parseLedgerInput(body: any): { ok: true; value: LedgerInput } | { ok: false; error: string }`
  - `isLedgerEligible(employee: { isStaff?: boolean } | null | undefined): boolean`

- [ ] **Step 1: Escribir los tests que fallan**

```ts
// src/utils/staffLedgerInput.test.ts
import { describe, it, expect } from 'vitest';
import { parseAmount, parseLedgerInput, isLedgerEligible } from './staffLedgerInput';

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
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `npm test -- src/utils/staffLedgerInput.test.ts`
Expected: FAIL (módulo inexistente).

- [ ] **Step 3: Implementar**

```ts
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
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `npm test -- src/utils/staffLedgerInput.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/staffLedgerInput.ts src/utils/staffLedgerInput.test.ts
git commit -m "feat: validación de movimientos de cobros de STAFF"
```

---

### Task 3: Capa de datos del servidor + API admin `/api/staffLedger`

**Files:**
- Create: `src/lib/staffLedgerServer.ts`
- Create: `src/app/api/staffLedger/route.ts`

**Interfaces:**
- Consumes: `buildAccount`, `eventLabel`, `LedgerEntry`, `StaffEvent`, `Account`, `LedgerSummary` (Task 1); `parseLedgerInput`, `isLedgerEligible` (Task 2); `withAdminAuth` (`@/lib/withAuth`); `clientPromise` (`@/lib/mongodb`).
- Produces:
  - `getDb(): Promise<Db>`, `LEDGER_COLLECTION = 'staff_ledger'`, `ensureLedgerIndexes(db)`.
  - `loadAccount(db, employeeId, now): Promise<Account>`
  - `loadSummaries(db, now): Promise<EmployeeLedgerRow[]>` con `EmployeeLedgerRow = { employeeId: string; fullName: string; rol: string; summary: Omit<LedgerSummary, 'byMonth'> }`
  - HTTP (todas solo admin; las mutaciones devuelven la cuenta recalculada):
    - `GET /api/staffLedger` → `EmployeeLedgerRow[]`
    - `GET /api/staffLedger?employeeId=` → `AdminAccountResponse = Account & { employee: { _id, fullName, rol, insurancePolicy: { fileName: string; uploadedAt: string } | null } }`
    - `POST /api/staffLedger` body según `parseLedgerInput` → `AdminAccountResponse`
    - `PUT /api/staffLedger` body `{ _id, ...campos }` (solo extra/pago/adelanto) → `AdminAccountResponse`
    - `DELETE /api/staffLedger?id=` → `AdminAccountResponse`

- [ ] **Step 1: Crear la capa de datos**

```ts
// src/lib/staffLedgerServer.ts
// Acceso a Mongo para los cobros de STAFF. La cuenta en sí se calcula con la
// lógica pura de utils/staffLedger: acá solo se traen los datos.
import { Db, ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';
import { buildAccount, Account, LedgerEntry, LedgerSummary, StaffEvent } from '@/utils/staffLedger';

export const LEDGER_COLLECTION = 'staff_ledger';

export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db('degano-app');
}

// Proyección mínima de un evento para la cuenta
const EVENT_PROJECTION = {
  type: 1,
  fullName: 1,
  lugar: 1,
  date: 1,
  endDate: 1,
  staffArrivalDate: 1,
  staffArrivalTime: 1,
  'staff.employeeId': 1,
  'staff.rol': 1
};

// Una vez por proceso (createIndex es idempotente pero es un viaje a la base)
let indexesReady: Promise<void> | null = null;
export function ensureLedgerIndexes(db: Db): Promise<void> {
  if (!indexesReady) {
    indexesReady = Promise.all([
      db.collection(LEDGER_COLLECTION).createIndex({ employeeId: 1, date: 1 }, { name: 'ledger_employee_date' }),
      // Una sola línea de monto por empleado y evento
      db.collection(LEDGER_COLLECTION).createIndex(
        { employeeId: 1, eventId: 1 },
        { name: 'ledger_employee_event_unique', unique: true, partialFilterExpression: { type: 'evento' } }
      ),
      db.collection('events').createIndex({ 'staff.employeeId': 1 }, { name: 'events_staff_employee' })
    ])
      .then(() => undefined)
      .catch((error) => {
        console.error('[ensureLedgerIndexes]', error?.message || error);
        indexesReady = null;
      });
  }
  return indexesReady;
}

const toPlain = (doc: any) => ({ ...doc, _id: String(doc._id) });

const toObjectIds = (ids: string[]) =>
  ids.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));

export async function loadAccount(db: Db, employeeId: string, now: Date): Promise<Account> {
  const [entries, assigned] = await Promise.all([
    db.collection(LEDGER_COLLECTION).find({ employeeId }).toArray(),
    db.collection('events').find({ 'staff.employeeId': employeeId }, { projection: EVENT_PROJECTION }).toArray()
  ]);

  // Eventos con monto cargado donde el empleado ya no está asignado: se traen
  // aparte (es raro, así que casi nunca hay segunda consulta). Si no vienen,
  // el evento fue borrado.
  const assignedIds = new Set(assigned.map((e) => String(e._id)));
  const missing = entries
    .filter((e: any) => e.type === 'evento' && e.eventId && !assignedIds.has(e.eventId))
    .map((e: any) => e.eventId as string);
  const extra = missing.length
    ? await db.collection('events').find({ _id: { $in: toObjectIds(missing) } }, { projection: EVENT_PROJECTION }).toArray()
    : [];

  return buildAccount(
    employeeId,
    [...assigned, ...extra].map(toPlain) as StaffEvent[],
    entries.map(toPlain) as LedgerEntry[],
    now
  );
}

export type EmployeeLedgerRow = {
  employeeId: string;
  fullName: string;
  rol: string;
  summary: Omit<LedgerSummary, 'byMonth'>;
};

// Resumen de todos los empleados de STAFF en 3 consultas en paralelo (no N).
export async function loadSummaries(db: Db, now: Date): Promise<EmployeeLedgerRow[]> {
  const [employees, entries, events] = await Promise.all([
    db.collection('employees')
      .find({ isStaff: { $ne: false } }, { projection: { fullName: 1, rol: 1 } })
      .toArray(),
    db.collection(LEDGER_COLLECTION).find({}).toArray(),
    db.collection('events').find({ 'staff.0': { $exists: true } }, { projection: EVENT_PROJECTION }).toArray()
  ]);

  const entriesBy = new Map<string, LedgerEntry[]>();
  for (const e of entries) {
    const list = entriesBy.get(e.employeeId) ?? [];
    list.push(toPlain(e) as LedgerEntry);
    entriesBy.set(e.employeeId, list);
  }
  const eventsBy = new Map<string, StaffEvent[]>();
  for (const ev of events) {
    const plain = toPlain(ev) as StaffEvent;
    for (const s of plain.staff ?? []) {
      const list = eventsBy.get(s.employeeId) ?? [];
      list.push(plain);
      eventsBy.set(s.employeeId, list);
    }
  }

  return employees.map((emp) => {
    const id = String(emp._id);
    // En el resumen, una línea de un evento sin staff cuenta como "evento
    // eliminado": para los totales da igual, solo cambia la etiqueta.
    const { byMonth, ...summary } = buildAccount(id, eventsBy.get(id) ?? [], entriesBy.get(id) ?? [], now).summary;
    return { employeeId: id, fullName: emp.fullName || '', rol: emp.rol || '', summary };
  });
}
```

- [ ] **Step 2: Crear la ruta admin**

```ts
// src/app/api/staffLedger/route.ts
// Cobros de STAFF (cuenta corriente). SOLO ADMIN: es plata.
// Las mutaciones devuelven la cuenta recalculada del empleado para que el front
// actualice la caché sin otra request.
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { withAdminAuth, AuthContext } from '@/lib/withAuth';
import {
  getDb,
  ensureLedgerIndexes,
  loadAccount,
  loadSummaries,
  LEDGER_COLLECTION
} from '@/lib/staffLedgerServer';
import { parseLedgerInput, isLedgerEligible } from '@/utils/staffLedgerInput';
import { eventLabel } from '@/utils/staffLedger';

const badRequest = (error: string) => NextResponse.json({ error }, { status: 400 });
const notFound = (error: string) => NextResponse.json({ error }, { status: 404 });

async function findEmployee(db: any, employeeId: string) {
  if (!ObjectId.isValid(employeeId)) return null;
  const emp = await db
    .collection('employees')
    .findOne({ _id: new ObjectId(employeeId) }, { projection: { fullName: 1, rol: 1, isStaff: 1, insurancePolicy: 1 } });
  return isLedgerEligible(emp) ? emp : null;
}

async function accountResponse(db: any, employee: any) {
  const account = await loadAccount(db, String(employee._id), new Date());
  const policy = employee.insurancePolicy;
  return NextResponse.json({
    ...account,
    employee: {
      _id: String(employee._id),
      fullName: employee.fullName || '',
      rol: employee.rol || '',
      insurancePolicy: policy ? { fileName: policy.fileName, uploadedAt: policy.uploadedAt } : null
    }
  });
}

export const GET = withAdminAuth(async (_ctx: AuthContext, req: Request) => {
  try {
    const db = await getDb();
    await ensureLedgerIndexes(db);
    const employeeId = new URL(req.url).searchParams.get('employeeId');
    if (!employeeId) return NextResponse.json(await loadSummaries(db, new Date()));

    const employee = await findEmployee(db, employeeId);
    if (!employee) return notFound('Empleado no encontrado');
    return accountResponse(db, employee);
  } catch (error) {
    console.error('[staffLedger GET]', error);
    return NextResponse.json({ error: 'Error al obtener los cobros' }, { status: 500 });
  }
});

export const POST = withAdminAuth(async (ctx: AuthContext, req: Request) => {
  try {
    const parsed = parseLedgerInput(await req.json());
    if (!parsed.ok) return badRequest(parsed.error);
    const input = parsed.value;

    const db = await getDb();
    await ensureLedgerIndexes(db);
    const employee = await findEmployee(db, input.employeeId);
    if (!employee) return notFound('Empleado no encontrado');

    const coll = db.collection(LEDGER_COLLECTION);
    const now = new Date();

    if (input.type === 'evento') {
      const filter = { employeeId: input.employeeId, eventId: input.eventId, type: 'evento' };
      if (input.amount === null) {
        await coll.deleteOne(filter);
        return accountResponse(db, employee);
      }
      const event = ObjectId.isValid(input.eventId!)
        ? await db.collection('events').findOne(
            { _id: new ObjectId(input.eventId) },
            { projection: { date: 1, type: 1, fullName: 1 } }
          )
        : null;
      if (event) {
        // La fecha y el nombre se guardan para poder mostrar la línea si el
        // evento se borra; mientras exista, al leer manda el evento.
        await coll.updateOne(
          filter,
          {
            $set: { amount: input.amount, date: new Date(event.date), description: eventLabel(event), updatedAt: now },
            $setOnInsert: { createdAt: now, createdBy: ctx.user?.email || '' }
          },
          { upsert: true }
        );
      } else {
        // Evento borrado: solo se puede corregir el monto de una línea existente
        const res = await coll.updateOne(filter, { $set: { amount: input.amount, updatedAt: now } });
        if (res.matchedCount === 0) return notFound('Evento no encontrado');
      }
      return accountResponse(db, employee);
    }

    await coll.insertOne({ ...input, createdAt: now, updatedAt: now, createdBy: ctx.user?.email || '' });
    return accountResponse(db, employee);
  } catch (error) {
    console.error('[staffLedger POST]', error);
    return NextResponse.json({ error: 'Error al guardar el movimiento' }, { status: 500 });
  }
});

export const PUT = withAdminAuth(async (_ctx: AuthContext, req: Request) => {
  try {
    const body = await req.json();
    if (!body?._id || !ObjectId.isValid(String(body._id))) return badRequest('Falta el movimiento');

    const db = await getDb();
    const coll = db.collection(LEDGER_COLLECTION);
    const existing = await coll.findOne({ _id: new ObjectId(String(body._id)) });
    if (!existing) return notFound('Movimiento no encontrado');
    if (existing.type === 'evento') return badRequest('El monto de un evento se edita desde la fila del evento');

    // Body parcial: lo que no viene se toma del documento actual. Tipo y
    // empleado no se pueden cambiar.
    const merged = { ...existing, ...body, type: existing.type, employeeId: existing.employeeId };
    const parsed = parseLedgerInput(merged);
    if (!parsed.ok) return badRequest(parsed.error);

    const { type, employeeId, ...fields } = parsed.value;
    const unset: Record<string, ''> = {};
    // Campos opcionales borrados → se sacan (nunca en $set y $unset a la vez)
    if (type === 'extra' && fields.hours === undefined) unset.hours = '';
    if (type !== 'extra' && fields.description === undefined) unset.description = '';
    await coll.updateOne(
      { _id: existing._id },
      { $set: { ...fields, updatedAt: new Date() }, ...(Object.keys(unset).length ? { $unset: unset } : {}) }
    );

    const employee = await findEmployee(db, employeeId);
    if (!employee) return notFound('Empleado no encontrado');
    return accountResponse(db, employee);
  } catch (error) {
    console.error('[staffLedger PUT]', error);
    return NextResponse.json({ error: 'Error al actualizar el movimiento' }, { status: 500 });
  }
});

export const DELETE = withAdminAuth(async (_ctx: AuthContext, req: Request) => {
  try {
    const id = new URL(req.url).searchParams.get('id');
    if (!id || !ObjectId.isValid(id)) return badRequest('Falta el movimiento');
    const db = await getDb();
    const coll = db.collection(LEDGER_COLLECTION);
    const existing = await coll.findOne({ _id: new ObjectId(id) });
    if (!existing) return notFound('Movimiento no encontrado');
    await coll.deleteOne({ _id: existing._id });

    const employee = await findEmployee(db, existing.employeeId);
    if (!employee) return notFound('Empleado no encontrado');
    return accountResponse(db, employee);
  } catch (error) {
    console.error('[staffLedger DELETE]', error);
    return NextResponse.json({ error: 'Error al borrar el movimiento' }, { status: 500 });
  }
});
```

Nota sobre PUT: si el body trae `hours: ''` o `description: ''`, `parseLedgerInput` lo deja fuera y el `$unset` lo borra. Como `merged` arranca del documento existente, un body que no trae la clave conserva el valor.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: sin errores nuevos en los archivos creados.

- [ ] **Step 4: Tests (no regresiones)**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/staffLedgerServer.ts src/app/api/staffLedger/route.ts
git commit -m "feat: API admin de cobros de STAFF"
```

---

### Task 4: API del empleado `/api/staffLedger/me`

**Files:**
- Create: `src/app/api/staffLedger/me/route.ts`

**Interfaces:**
- Consumes: `getDb`, `ensureLedgerIndexes`, `loadAccount` (Task 3); `employeeWindow`, `inWindow` (Task 1); `isLedgerEligible` (Task 2); `resolveEmployee`, `RESOLVE_MESSAGES` (`@/lib/resolveEmployee`); `withAuth`.
- Produces: `GET /api/staffLedger/me` →
  - No vinculado: `{ linked: false, message: string }`
  - Vinculado: `MyLedgerResponse = { linked: true; fullName: string; charges: AllocatedCharge[]; credits: Credit[]; summary: { pendingToDate; favor; nextMonthTotal; missingAmount }; window: { from: string; to: string }; policy: { fileName: string } | null; employeeId: string }`

- [ ] **Step 1: Crear la ruta**

```ts
// src/app/api/staffLedger/me/route.ts
// "Mis cobros": la cuenta del empleado logueado, resuelto por email.
// Nunca acepta un employeeId del cliente. La imputación se calcula sobre toda
// la historia (si no, el estado de cada línea sería incorrecto) y DESPUÉS se
// recorta a la ventana: 3 meses atrás, 1 mes adelante. El total futuro y el
// histórico completo son solo para admin.
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/withAuth';
import { resolveEmployee, RESOLVE_MESSAGES } from '@/lib/resolveEmployee';
import { getDb, ensureLedgerIndexes, loadAccount } from '@/lib/staffLedgerServer';
import { employeeWindow, inWindow } from '@/utils/staffLedger';
import { isLedgerEligible } from '@/utils/staffLedgerInput';

export const GET = withAuth(async (ctx: AuthContext) => {
  try {
    const db = await getDb();
    const result = await resolveEmployee(db, ctx.user);
    if (!result.ok) {
      return NextResponse.json({ linked: false, message: RESOLVE_MESSAGES[result.reason] });
    }
    // Entrada de directorio (isStaff:false): entró a la app pero no es STAFF
    if (!isLedgerEligible(result.employee)) {
      return NextResponse.json({ linked: false, message: RESOLVE_MESSAGES.not_linked });
    }

    await ensureLedgerIndexes(db);
    const employee: any = result.employee;
    const employeeId = String(employee._id);
    const now = new Date();
    const account = await loadAccount(db, employeeId, now);
    const window = employeeWindow(now);
    const charges = account.charges.filter((c) => inWindow(c.date, window));

    return NextResponse.json({
      linked: true,
      employeeId,
      fullName: employee.fullName || '',
      charges,
      credits: account.credits.filter((c) => inWindow(c.date, window)),
      summary: {
        // Lo pendiente es SU plata: incluye deudas viejas fuera de la ventana
        pendingToDate: account.summary.pendingToDate,
        favor: account.summary.favor,
        nextMonthTotal: account.summary.nextMonthTotal,
        missingAmount: charges.filter((c) => c.amount == null).length
      },
      window: { from: window.from.toISOString(), to: window.to.toISOString() },
      policy: employee.insurancePolicy ? { fileName: employee.insurancePolicy.fileName } : null
    });
  } catch (error) {
    console.error('[staffLedger/me GET]', error);
    return NextResponse.json({ error: 'Error al obtener tus cobros' }, { status: 500 });
  }
});
```

- [ ] **Step 2: Verificar que la respuesta no filtra datos de admin**

Revisar a mano: la respuesta no incluye `futureTotal`, `byMonth`, `balance`, ni `insurancePolicy.key`. Si hace falta, ajustar.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: sin errores nuevos.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/staffLedger/me/route.ts
git commit -m "feat: endpoint Mis cobros con ventana de 3 meses atrás y 1 adelante"
```

---

### Task 5: Póliza de seguro (API + proyección de employees)

**Files:**
- Create: `src/app/api/staffPolicy/route.ts`
- Modify: `src/app/api/employees/route.ts` (constante `PUBLIC_PROJECTION`)

**Interfaces:**
- Consumes: `withAuth`, `withAdminAuth`, `resolveEmployee`, `getDb` (Task 3). Flujo existente `POST /api/uploadToS3` con `{ fileName, fileType, bucket: 'budgets', folder: 'staff-policies' }` → `{ signedUrl, url }`.
- Produces:
  - `GET /api/staffPolicy?employeeId=` (admin o el propio empleado) → `{ signedUrl: string }` (60 s, inline)
  - `POST /api/staffPolicy` (admin) body `{ employeeId, url, fileName }` → `{ insurancePolicy: { fileName, uploadedAt } }`
  - `DELETE /api/staffPolicy?employeeId=` (admin) → `{ insurancePolicy: null }`

- [ ] **Step 1: Excluir la póliza de la proyección pública de employees**

En `src/app/api/employees/route.ts`, reemplazar:

```ts
// Datos internos del vínculo con el login: no salen de la API
const PUBLIC_PROJECTION = { authSub: 0, lastLoginAt: 0 };
```

por:

```ts
// Datos internos del vínculo con el login y la póliza de seguro (la ve solo el
// admin o el propio empleado, por /api/staffPolicy): no salen de esta API
const PUBLIC_PROJECTION = { authSub: 0, lastLoginAt: 0, insurancePolicy: 0 };
```

Verificar que el `PUT` de employees no toque `insurancePolicy`: el body sale de `GET /api/employees`, que ya no lo trae, y `$set` solo pisa las claves presentes.

- [ ] **Step 2: Crear la ruta de la póliza**

```ts
// src/app/api/staffPolicy/route.ts
// Póliza de seguro de cada empleado de STAFF (PDF en S3).
// - Subir / quitar: SOLO admin.
// - Ver: el admin o el propio empleado. Para cualquier otro → 404.
// El archivo se sube directo del browser con presigned PUT (/api/uploadToS3,
// bucket 'budgets', carpeta 'staff-policies'); acá solo se registra.
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { S3Client, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { withAuth, withAdminAuth, AuthContext } from '@/lib/withAuth';
import { resolveEmployee } from '@/lib/resolveEmployee';
import { getDb } from '@/lib/staffLedgerServer';

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
});
const BUCKET = process.env.AWS_S3_BUDGETS_BUCKET_NAME!;
const FOLDER = 'staff-policies/';

const notFound = () => NextResponse.json({ error: 'Póliza no encontrada' }, { status: 404 });
const badRequest = (error: string) => NextResponse.json({ error }, { status: 400 });

const employeeFilter = (id: string | null) =>
  id && ObjectId.isValid(id) ? { _id: new ObjectId(id) } : null;

// https://<bucket>.s3.<region>.amazonaws.com/<key> → key, solo si es nuestra carpeta
function keyFromUrl(url: unknown): string | null {
  if (typeof url !== 'string') return null;
  try {
    const parsed = new URL(url);
    if (parsed.hostname.split('.s3.')[0] !== BUCKET) return null;
    const key = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
    return key.startsWith(FOLDER) && key.toLowerCase().endsWith('.pdf') ? key : null;
  } catch {
    return null;
  }
}

async function deleteObject(key: string) {
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  } catch (error) {
    // No bloquea: el registro ya no apunta al archivo
    console.error('[staffPolicy] no se pudo borrar de S3:', key, error);
  }
}

export const GET = withAuth(async (ctx: AuthContext, req: Request) => {
  try {
    const employeeId = new URL(req.url).searchParams.get('employeeId');
    const filter = employeeFilter(employeeId);
    if (!filter) return notFound();
    const db = await getDb();

    if (ctx.role !== 'admin') {
      const me = await resolveEmployee(db, ctx.user);
      if (!me.ok || String(me.employee._id) !== employeeId) return notFound();
    }

    const emp = await db.collection('employees').findOne(filter, { projection: { insurancePolicy: 1 } });
    const policy = emp?.insurancePolicy;
    if (!policy?.key) return notFound();

    const signedUrl = await getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: BUCKET,
        Key: policy.key,
        ResponseContentType: 'application/pdf',
        ResponseContentDisposition: `inline; filename="${String(policy.fileName).replace(/"/g, '')}"`
      }),
      { expiresIn: 60 }
    );
    return NextResponse.json({ signedUrl });
  } catch (error) {
    console.error('[staffPolicy GET]', error);
    return NextResponse.json({ error: 'Error al obtener la póliza' }, { status: 500 });
  }
});

export const POST = withAdminAuth(async (_ctx: AuthContext, req: Request) => {
  try {
    const { employeeId, url, fileName } = await req.json();
    const filter = employeeFilter(employeeId);
    if (!filter) return badRequest('Falta el empleado');
    const key = keyFromUrl(url);
    if (!key) return badRequest('Archivo inválido: tiene que ser un PDF subido para pólizas');
    const name = typeof fileName === 'string' && fileName.trim() ? fileName.trim() : 'poliza.pdf';

    const db = await getDb();
    const emp = await db.collection('employees').findOne(filter, { projection: { insurancePolicy: 1 } });
    if (!emp) return NextResponse.json({ error: 'Empleado no encontrado' }, { status: 404 });

    const insurancePolicy = { key, fileName: name, uploadedAt: new Date() };
    await db.collection('employees').updateOne(filter, { $set: { insurancePolicy } });
    if (emp.insurancePolicy?.key && emp.insurancePolicy.key !== key) await deleteObject(emp.insurancePolicy.key);

    return NextResponse.json({ insurancePolicy: { fileName: name, uploadedAt: insurancePolicy.uploadedAt } });
  } catch (error) {
    console.error('[staffPolicy POST]', error);
    return NextResponse.json({ error: 'Error al guardar la póliza' }, { status: 500 });
  }
});

export const DELETE = withAdminAuth(async (_ctx: AuthContext, req: Request) => {
  try {
    const filter = employeeFilter(new URL(req.url).searchParams.get('employeeId'));
    if (!filter) return badRequest('Falta el empleado');
    const db = await getDb();
    const emp = await db.collection('employees').findOne(filter, { projection: { insurancePolicy: 1 } });
    if (!emp?.insurancePolicy) return notFound();
    await db.collection('employees').updateOne(filter, { $unset: { insurancePolicy: '' } });
    if (emp.insurancePolicy.key) await deleteObject(emp.insurancePolicy.key);
    return NextResponse.json({ insurancePolicy: null });
  } catch (error) {
    console.error('[staffPolicy DELETE]', error);
    return NextResponse.json({ error: 'Error al quitar la póliza' }, { status: 500 });
  }
});
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: sin errores nuevos.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/staffPolicy/route.ts src/app/api/employees/route.ts
git commit -m "feat: póliza de seguro de STAFF (PDF en S3, solo admin la carga)"
```

---

### Task 6: Hook SWR y componentes compartidos

**Files:**
- Create: `src/hooks/useStaffLedger.ts`
- Create: `src/components/StaffLedger/LedgerSummaryCards.tsx`
- Create: `src/components/StaffLedger/LedgerTable.tsx`

**Interfaces:**
- Consumes: tipos y `displayStatus`, `arDay`, `PAYMENT_METHOD_LABELS`, `CREDIT_TYPE_LABELS` (Task 1); `formatPrice` (`@/utils/priceUtils`); contratos HTTP de las Tasks 3 y 4.
- Produces:
  - `SUMMARIES_KEY = '/api/staffLedger'`, `accountKey(id: string) = '/api/staffLedger?employeeId=' + id`, `MY_LEDGER_KEY = '/api/staffLedger/me'`.
  - `useLedgerSummaries()`, `useEmployeeAccount(id: string | null)`, `useMyLedger()` → `{ data, error, isLoading }`.
  - `type AdminAccountResponse`, `type MyLedgerResponse`, `type EmployeeLedgerRow` (re-export del contrato).
  - `ledgerRequest(method: 'POST' | 'PUT' | 'DELETE', body?: any, query?: string): Promise<AdminAccountResponse>`: tira `Error` con el mensaje del servidor si `!res.ok`, y si sale bien actualiza las cachés de la cuenta y del resumen sin otra request.
  - `<LedgerSummaryCards mode='admin' | 'employee' summary={...} />`
  - `<LedgerTable charges credits now editable? onAmountSave?(charge, raw) onEditCredit?(credit) onEditExtra?(charge) onDeleteEntry?(entryId) />`

- [ ] **Step 1: Hook**

```ts
// src/hooks/useStaffLedger.ts
'use client';
import useSWR, { mutate } from 'swr';
import type { Account, AllocatedCharge, Credit } from '@/utils/staffLedger';
import type { EmployeeLedgerRow } from '@/lib/staffLedgerServer';

export type { EmployeeLedgerRow };

export type AdminAccountResponse = Account & {
  employee: {
    _id: string;
    fullName: string;
    rol: string;
    insurancePolicy: { fileName: string; uploadedAt: string } | null;
  };
};

export type MyLedgerResponse =
  | { linked: false; message: string }
  | {
      linked: true;
      employeeId: string;
      fullName: string;
      charges: AllocatedCharge[];
      credits: Credit[];
      summary: { pendingToDate: number; favor: number; nextMonthTotal: number; missingAmount: number };
      window: { from: string; to: string };
      policy: { fileName: string } | null;
    };

export const SUMMARIES_KEY = '/api/staffLedger';
export const accountKey = (id: string) => `/api/staffLedger?employeeId=${id}`;
export const MY_LEDGER_KEY = '/api/staffLedger/me';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'Error al cargar los cobros');
  return data;
};

const SWR_OPTS = { revalidateOnFocus: false, dedupingInterval: 30_000 };

export const useLedgerSummaries = () => useSWR<EmployeeLedgerRow[]>(SUMMARIES_KEY, fetcher, SWR_OPTS);
export const useEmployeeAccount = (id: string | null) =>
  useSWR<AdminAccountResponse>(id ? accountKey(id) : null, fetcher, SWR_OPTS);
export const useMyLedger = () => useSWR<MyLedgerResponse>(MY_LEDGER_KEY, fetcher, SWR_OPTS);

// Mutación admin. El servidor devuelve la cuenta recalculada: se pisa la caché
// del detalle y la fila del resumen sin pedir nada más (regla de performance).
export async function ledgerRequest(
  method: 'POST' | 'PUT' | 'DELETE',
  body?: any,
  query = ''
): Promise<AdminAccountResponse> {
  const res = await fetch(`/api/staffLedger${query}`, {
    method,
    ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {})
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'No se pudo guardar');

  const account = data as AdminAccountResponse;
  const id = account.employee._id;
  await mutate(accountKey(id), account, { revalidate: false });
  await mutate(
    SUMMARIES_KEY,
    (rows?: EmployeeLedgerRow[]) =>
      rows?.map((r) => {
        if (r.employeeId !== id) return r;
        const { byMonth, ...summary } = account.summary;
        return { ...r, summary };
      }),
    { revalidate: false }
  );
  return account;
}
```

Si `import type` desde `@/lib/staffLedgerServer` arrastra `mongodb` al bundle del cliente (no debería, porque es solo de tipos), mover `EmployeeLedgerRow` a `src/utils/staffLedger.ts` y re-exportarlo desde los dos lados.

- [ ] **Step 2: Tarjetas de totales**

```tsx
// src/components/StaffLedger/LedgerSummaryCards.tsx
'use client';
import { Group, Paper, Text, Badge } from '@mantine/core';
import { formatPrice } from '@/utils/priceUtils';

type AdminSummary = { pendingToDate: number; favor: number; futureTotal: number; missingAmount: number; balance: number };
type EmployeeSummary = { pendingToDate: number; favor: number; nextMonthTotal: number; missingAmount: number };

function Card({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <Paper withBorder p='sm' radius='md' style={{ minWidth: 160, flex: 1 }}>
      <Text size='xs' c='dimmed'>{label}</Text>
      <Text size='xl' fw={700} c={color}>{value}</Text>
    </Paper>
  );
}

export default function LedgerSummaryCards(
  props: { mode: 'admin'; summary: AdminSummary } | { mode: 'employee'; summary: EmployeeSummary }
) {
  const { summary } = props;
  // El pendiente se resalta: es lo que hay que pagar / cobrar ya
  const pendingColor = summary.pendingToDate > 0 ? 'orange' : 'teal';
  const missing = summary.missingAmount > 0 && (
    <Badge color='yellow' variant='light' size='lg'>
      {summary.missingAmount} {summary.missingAmount === 1 ? 'evento sin monto' : 'eventos sin monto'}
    </Badge>
  );

  return (
    <Group gap='sm' align='stretch' wrap='wrap'>
      <Card
        label={props.mode === 'admin' ? 'Pendiente a hoy' : 'Pendiente de cobro'}
        value={formatPrice(summary.pendingToDate)}
        color={pendingColor}
      />
      {summary.favor > 0 && <Card label='A favor (adelantado)' value={formatPrice(summary.favor)} color='blue' />}
      {props.mode === 'admin' ? (
        <Card label='Total futuro' value={formatPrice(props.summary.futureTotal)} />
      ) : (
        <Card label='Estimado próximo mes' value={formatPrice(props.summary.nextMonthTotal)} />
      )}
      {missing && <Group align='center'>{missing}</Group>}
    </Group>
  );
}
```

- [ ] **Step 3: Tabla por mes**

```tsx
// src/components/StaffLedger/LedgerTable.tsx
'use client';
import { useMemo } from 'react';
import { Table, Text, Badge, NumberInput, Group, ActionIcon, Tooltip, Stack } from '@mantine/core';
import { IconPencil, IconTrash, IconAlertTriangle } from '@tabler/icons-react';
import { formatPrice } from '@/utils/priceUtils';
import {
  AllocatedCharge,
  Credit,
  DisplayStatus,
  arDay,
  displayStatus,
  PAYMENT_METHOD_LABELS,
  CREDIT_TYPE_LABELS
} from '@/utils/staffLedger';

const STATUS: Record<DisplayStatus, { label: string; color: string; variant?: string }> = {
  pagado: { label: 'Pagado', color: 'teal' },
  parcial: { label: 'Parcial', color: 'yellow' },
  pendiente: { label: 'A pagar', color: 'orange' },
  futuro: { label: 'Futuro', color: 'gray' },
  sin_monto: { label: 'Sin monto', color: 'gray', variant: 'outline' }
};

const MONTHS = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const monthTitle = (ym: string) => {
  const [y, m] = ym.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
};
const dayLabel = (iso: string) => {
  const d = arDay(iso) as string;
  return `${d.slice(8, 10)}/${d.slice(5, 7)}`;
};

type Row =
  | { kind: 'charge'; date: string; charge: AllocatedCharge }
  | { kind: 'credit'; date: string; credit: Credit };

export default function LedgerTable({
  charges,
  credits,
  now,
  editable = false,
  onAmountSave,
  onEditCredit,
  onEditExtra,
  onDeleteEntry
}: {
  charges: AllocatedCharge[];
  credits: Credit[];
  now: Date;
  editable?: boolean;
  onAmountSave?: (charge: AllocatedCharge, raw: string | number) => void;
  onEditCredit?: (credit: Credit) => void;
  onEditExtra?: (charge: AllocatedCharge) => void;
  onDeleteEntry?: (entryId: string) => void;
}) {
  // Agrupado por mes, más nuevo arriba. Subtotal = lo generado en el mes.
  const months = useMemo(() => {
    const rows: Row[] = [
      ...charges.map((c) => ({ kind: 'charge' as const, date: c.date, charge: c })),
      ...credits.map((c) => ({ kind: 'credit' as const, date: c.date, credit: c }))
    ].sort((a, b) => b.date.localeCompare(a.date));
    const map = new Map<string, Row[]>();
    for (const r of rows) {
      const m = (arDay(r.date) as string).slice(0, 7);
      map.set(m, [...(map.get(m) ?? []), r]);
    }
    return [...map.entries()];
  }, [charges, credits]);

  if (!months.length) {
    return <Text c='dimmed' ta='center' py='lg'>No hay movimientos en este período.</Text>;
  }

  return (
    <Stack gap='lg'>
      {months.map(([ym, rows]) => {
        const generated = rows.reduce(
          (s, r) => (r.kind === 'charge' && r.charge.amount != null ? s + r.charge.amount : s),
          0
        );
        return (
          <div key={ym}>
            <Group justify='space-between' mb={4}>
              <Text fw={700} tt='capitalize'>{monthTitle(ym)}</Text>
              <Text size='sm' c='dimmed'>Generado: {formatPrice(generated)}</Text>
            </Group>
            <Table.ScrollContainer minWidth={640}>
              <Table striped withTableBorder>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Fecha</Table.Th>
                    <Table.Th>Concepto</Table.Th>
                    <Table.Th>Rol</Table.Th>
                    <Table.Th>Horas</Table.Th>
                    <Table.Th>Monto</Table.Th>
                    <Table.Th>Estado</Table.Th>
                    {editable && <Table.Th />}
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {rows.map((r) =>
                    r.kind === 'charge' ? (
                      <ChargeRow
                        key={r.charge.key}
                        charge={r.charge}
                        now={now}
                        editable={editable}
                        onAmountSave={onAmountSave}
                        onEditExtra={onEditExtra}
                        onDeleteEntry={onDeleteEntry}
                      />
                    ) : (
                      <Table.Tr key={r.credit.entryId} style={{ background: 'var(--mantine-color-blue-light)' }}>
                        <Table.Td>{dayLabel(r.credit.date)}</Table.Td>
                        <Table.Td>
                          <Text size='sm' fw={500}>{CREDIT_TYPE_LABELS[r.credit.kind]}</Text>
                          <Text size='xs' c='dimmed'>
                            {r.credit.method ? PAYMENT_METHOD_LABELS[r.credit.method] : ''}
                            {r.credit.description ? ` · ${r.credit.description}` : ''}
                          </Text>
                        </Table.Td>
                        <Table.Td />
                        <Table.Td />
                        <Table.Td>− {formatPrice(r.credit.amount)}</Table.Td>
                        <Table.Td />
                        {editable && (
                          <Table.Td>
                            <Group gap={4} wrap='nowrap'>
                              <ActionIcon variant='subtle' onClick={() => onEditCredit?.(r.credit)} aria-label='Editar'>
                                <IconPencil size={16} />
                              </ActionIcon>
                              <ActionIcon variant='subtle' color='red' onClick={() => onDeleteEntry?.(r.credit.entryId)} aria-label='Borrar'>
                                <IconTrash size={16} />
                              </ActionIcon>
                            </Group>
                          </Table.Td>
                        )}
                      </Table.Tr>
                    )
                  )}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          </div>
        );
      })}
    </Stack>
  );
}

function ChargeRow({
  charge,
  now,
  editable,
  onAmountSave,
  onEditExtra,
  onDeleteEntry
}: {
  charge: AllocatedCharge;
  now: Date;
  editable: boolean;
  onAmountSave?: (charge: AllocatedCharge, raw: string | number) => void;
  onEditExtra?: (charge: AllocatedCharge) => void;
  onDeleteEntry?: (entryId: string) => void;
}) {
  const status = STATUS[displayStatus(charge, now)];
  const warning = charge.unassigned
    ? 'Ya no está asignado a este evento'
    : charge.eventDeleted
    ? 'El evento fue eliminado'
    : null;

  return (
    <Table.Tr>
      <Table.Td>{dayLabel(charge.date)}</Table.Td>
      <Table.Td>
        <Group gap={6} wrap='nowrap'>
          <div>
            <Text size='sm' fw={500}>{charge.label}</Text>
            {charge.venue && <Text size='xs' c='dimmed'>{charge.venue}</Text>}
          </div>
          {warning && (
            <Tooltip label={warning}>
              <IconAlertTriangle size={16} color='var(--mantine-color-yellow-6)' />
            </Tooltip>
          )}
        </Group>
      </Table.Td>
      <Table.Td>{charge.kind === 'extra' ? 'Extra' : charge.rol ?? '—'}</Table.Td>
      <Table.Td>{charge.hours != null ? `${charge.hours} h` : '—'}</Table.Td>
      <Table.Td>
        {editable && charge.kind === 'evento' ? (
          // key con el monto: si el servidor devuelve otro valor, el input se re-monta
          <NumberInput
            key={`${charge.key}:${charge.amount ?? ''}`}
            defaultValue={charge.amount ?? ''}
            placeholder='Cargar monto'
            prefix='$ '
            thousandSeparator='.'
            decimalSeparator=','
            min={0}
            hideControls
            size='xs'
            w={130}
            onBlur={(e) => {
              const raw = e.currentTarget.value.replace(/^\$\s*/, '');
              const current = charge.amount == null ? '' : String(charge.amount);
              const normalized = raw.replace(/\./g, '').replace(',', '.');
              if (normalized !== current) onAmountSave?.(charge, raw);
            }}
          />
        ) : charge.amount != null ? (
          formatPrice(charge.amount)
        ) : (
          <Text size='sm' c='dimmed'>{editable ? '—' : 'A definir'}</Text>
        )}
      </Table.Td>
      <Table.Td>
        <Badge color={status.color} variant={(status.variant as any) ?? 'light'}>{status.label}</Badge>
      </Table.Td>
      {editable && (
        <Table.Td>
          {charge.kind === 'extra' && charge.entryId && (
            <Group gap={4} wrap='nowrap'>
              <ActionIcon variant='subtle' onClick={() => onEditExtra?.(charge)} aria-label='Editar'>
                <IconPencil size={16} />
              </ActionIcon>
              <ActionIcon variant='subtle' color='red' onClick={() => onDeleteEntry?.(charge.entryId!)} aria-label='Borrar'>
                <IconTrash size={16} />
              </ActionIcon>
            </Group>
          )}
          {charge.kind === 'evento' && warning && charge.entryId && (
            <ActionIcon variant='subtle' color='red' onClick={() => onDeleteEntry?.(charge.entryId!)} aria-label='Borrar línea'>
              <IconTrash size={16} />
            </ActionIcon>
          )}
        </Table.Td>
      )}
    </Table.Tr>
  );
}
```

El texto "No hay movimientos en este período." está bien acá: la tabla solo se renderiza cuando `data` ya llegó. Los padres muestran el loader mientras tanto.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: sin errores nuevos.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useStaffLedger.ts src/components/StaffLedger/LedgerSummaryCards.tsx src/components/StaffLedger/LedgerTable.tsx
git commit -m "feat: hook SWR, tarjetas y tabla de cobros de STAFF"
```

---

### Task 7: Modales de pago y extra + sección de póliza

**Files:**
- Create: `src/components/StaffLedger/PaymentModal.tsx`
- Create: `src/components/StaffLedger/ExtraModal.tsx`
- Create: `src/components/StaffLedger/PolicySection.tsx`

**Interfaces:**
- Consumes: `ledgerRequest`, `AdminAccountResponse` (Task 6); `pendingUpTo`, `arDay`, `PAYMENT_METHODS`, `PAYMENT_METHOD_LABELS`, `AllocatedCharge`, `Credit` (Task 1); endpoints de Task 5; `notifications` de `@mantine/notifications` (verificar que esté instalado con `grep '@mantine/notifications' package.json`; si no está, usar el patrón de avisos que use `PaymentForm.tsx`).
- Produces:
  - `<PaymentModal opened onClose employeeId charges credit?: Credit | null />`
  - `<ExtraModal opened onClose employeeId extra?: AllocatedCharge | null />`
  - `<PolicySection employeeId policy: { fileName: string } | null canManage: boolean onChange?(policy) />`

- [ ] **Step 1: PaymentModal**

```tsx
// src/components/StaffLedger/PaymentModal.tsx
'use client';
import { useEffect, useState } from 'react';
import { Modal, Stack, SegmentedControl, NumberInput, Select, TextInput, Button, Group, Text } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import { ledgerRequest } from '@/hooks/useStaffLedger';
import { AllocatedCharge, Credit, PAYMENT_METHODS, PAYMENT_METHOD_LABELS, pendingUpTo, arDay } from '@/utils/staffLedger';
import { formatPrice } from '@/utils/priceUtils';

const todayDay = () => arDay(new Date()) as string;
const dayToDate = (d: string) => new Date(`${d}T12:00:00`);
const dateToDay = (d: Date | string | null) => {
  if (!d) return null;
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};

export default function PaymentModal({
  opened,
  onClose,
  employeeId,
  charges,
  credit
}: {
  opened: boolean;
  onClose: () => void;
  employeeId: string;
  charges: AllocatedCharge[];
  credit?: Credit | null; // si viene, es edición
}) {
  const [type, setType] = useState<'pago' | 'adelanto'>('pago');
  const [date, setDate] = useState<string>(todayDay());
  const [upTo, setUpTo] = useState<string>(todayDay());
  const [amount, setAmount] = useState<number | string>('');
  const [method, setMethod] = useState<string | null>('efectivo');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!opened) return;
    if (credit) {
      setType(credit.kind);
      setDate(arDay(credit.date) as string);
      setAmount(credit.amount);
      setMethod(credit.method ?? 'efectivo');
      setDescription(credit.description ?? '');
    } else {
      const today = todayDay();
      setType('pago');
      setDate(today);
      setUpTo(today);
      setAmount(pendingUpTo(charges, today) || '');
      setMethod('efectivo');
      setDescription('');
    }
  }, [opened, credit, charges]);

  // "Pagar hasta": precarga el monto con lo impago hasta ese día (editable)
  const upToPending = pendingUpTo(charges, upTo);

  const save = async () => {
    setSaving(true);
    try {
      const body = { type, employeeId, date, amount, method, description };
      if (credit) await ledgerRequest('PUT', { _id: credit.entryId, ...body });
      else await ledgerRequest('POST', body);
      notifications.show({ color: 'teal', message: credit ? 'Movimiento actualizado' : `${type === 'pago' ? 'Pago' : 'Adelanto'} registrado` });
      onClose();
    } catch (e: any) {
      notifications.show({ color: 'red', message: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title={credit ? 'Editar pago' : 'Registrar pago'} centered>
      <Stack>
        <SegmentedControl
          value={type}
          onChange={(v) => setType(v as 'pago' | 'adelanto')}
          data={[{ value: 'pago', label: 'Pago' }, { value: 'adelanto', label: 'Adelanto' }]}
        />
        <DateInput label='Fecha del pago' value={dayToDate(date)} onChange={(d) => setDate(dateToDay(d) ?? date)} valueFormat='DD/MM/YYYY' />
        {!credit && type === 'pago' && (
          <Group align='end' wrap='nowrap'>
            <DateInput
              label='Pagar lo pendiente hasta'
              value={dayToDate(upTo)}
              onChange={(d) => {
                const day = dateToDay(d);
                if (!day) return;
                setUpTo(day);
                setAmount(pendingUpTo(charges, day) || '');
              }}
              valueFormat='DD/MM/YYYY'
              style={{ flex: 1 }}
            />
            <Text size='sm' c='dimmed' pb={8}>{formatPrice(upToPending)}</Text>
          </Group>
        )}
        <NumberInput
          label='Monto'
          value={amount}
          onChange={setAmount}
          prefix='$ '
          thousandSeparator='.'
          decimalSeparator=','
          min={0}
          hideControls
        />
        <Select
          label='Forma de pago'
          data={PAYMENT_METHODS.map((m) => ({ value: m, label: PAYMENT_METHOD_LABELS[m] }))}
          value={method}
          onChange={setMethod}
          allowDeselect={false}
        />
        <TextInput label='Nota (opcional)' value={description} onChange={(e) => setDescription(e.currentTarget.value)} />
        <Group justify='flex-end'>
          <Button variant='default' onClick={onClose}>Cancelar</Button>
          <Button onClick={save} loading={saving}>Guardar</Button>
        </Group>
      </Stack>
    </Modal>
  );
}
```

- [ ] **Step 2: ExtraModal**

```tsx
// src/components/StaffLedger/ExtraModal.tsx
'use client';
import { useEffect, useState } from 'react';
import { Modal, Stack, NumberInput, TextInput, Button, Group } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import { ledgerRequest } from '@/hooks/useStaffLedger';
import { AllocatedCharge, arDay } from '@/utils/staffLedger';

const todayDay = () => arDay(new Date()) as string;
const dayToDate = (d: string) => new Date(`${d}T12:00:00`);
const dateToDay = (d: Date | string | null) => {
  if (!d) return null;
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};

// Extra laboral que no es de un evento (ej. "Depósito")
export default function ExtraModal({
  opened,
  onClose,
  employeeId,
  extra
}: {
  opened: boolean;
  onClose: () => void;
  employeeId: string;
  extra?: AllocatedCharge | null;
}) {
  const [date, setDate] = useState(todayDay());
  const [description, setDescription] = useState('');
  const [hours, setHours] = useState<number | string>('');
  const [amount, setAmount] = useState<number | string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!opened) return;
    setDate(extra ? (arDay(extra.date) as string) : todayDay());
    setDescription(extra?.label ?? '');
    setHours(extra?.hours ?? '');
    setAmount(extra?.amount ?? '');
  }, [opened, extra]);

  const save = async () => {
    setSaving(true);
    try {
      const body = { type: 'extra', employeeId, date, description, hours, amount };
      if (extra?.entryId) await ledgerRequest('PUT', { _id: extra.entryId, ...body });
      else await ledgerRequest('POST', body);
      notifications.show({ color: 'teal', message: extra ? 'Extra actualizado' : 'Extra agregado' });
      onClose();
    } catch (e: any) {
      notifications.show({ color: 'red', message: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title={extra ? 'Editar extra' : 'Agregar extra laboral'} centered>
      <Stack>
        <DateInput label='Fecha' value={dayToDate(date)} onChange={(d) => setDate(dateToDay(d) ?? date)} valueFormat='DD/MM/YYYY' />
        <TextInput label='Descripción' placeholder='Ej: Depósito' value={description} onChange={(e) => setDescription(e.currentTarget.value)} />
        <NumberInput label='Horas (opcional)' value={hours} onChange={setHours} min={0} decimalScale={1} hideControls />
        <NumberInput label='Monto' value={amount} onChange={setAmount} prefix='$ ' thousandSeparator='.' decimalSeparator=',' min={0} hideControls />
        <Group justify='flex-end'>
          <Button variant='default' onClick={onClose}>Cancelar</Button>
          <Button onClick={save} loading={saving}>Guardar</Button>
        </Group>
      </Stack>
    </Modal>
  );
}
```

`dayToDate`, `dateToDay` y `todayDay` están duplicados en los dos modales. Si molesta, moverlos a `src/utils/staffLedger.ts` como `todayArDay()` y sumar un test. En el plan quedan duplicados para que cada task se pueda leer sola.

- [ ] **Step 3: PolicySection**

```tsx
// src/components/StaffLedger/PolicySection.tsx
'use client';
import { useRef, useState } from 'react';
import { Group, Button, Text, Paper } from '@mantine/core';
import { IconFileTypePdf } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

// Póliza de seguro. El admin la sube/reemplaza/quita; el empleado solo la ve.
export default function PolicySection({
  employeeId,
  policy,
  canManage,
  onChange
}: {
  employeeId: string;
  policy: { fileName: string } | null;
  canManage: boolean;
  onChange?: (policy: { fileName: string } | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<'view' | 'upload' | 'delete' | null>(null);

  const fail = (message: string) => notifications.show({ color: 'red', message });

  const view = async () => {
    // Se abre la pestaña antes del await para que el browser no la bloquee
    const win = window.open('', '_blank');
    setBusy('view');
    try {
      const res = await fetch(`/api/staffPolicy?employeeId=${employeeId}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'No se pudo abrir la póliza');
      if (win) win.location.href = data.signedUrl;
      else window.location.href = data.signedUrl;
    } catch (e: any) {
      win?.close();
      fail(e.message);
    } finally {
      setBusy(null);
    }
  };

  const upload = async (file: File) => {
    if (file.type !== 'application/pdf') return fail('La póliza tiene que ser un PDF');
    setBusy('upload');
    try {
      const signRes = await fetch('/api/uploadToS3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, fileType: file.type, bucket: 'budgets', folder: 'staff-policies' })
      });
      const sign = await signRes.json().catch(() => ({}));
      if (!signRes.ok) throw new Error(sign?.error || 'No se pudo preparar la subida');

      const put = await fetch(sign.signedUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
      if (!put.ok) throw new Error('No se pudo subir el archivo');

      const res = await fetch('/api/staffPolicy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, url: sign.url, fileName: file.name })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'No se pudo guardar la póliza');
      onChange?.({ fileName: data.insurancePolicy.fileName });
      notifications.show({ color: 'teal', message: 'Póliza cargada' });
    } catch (e: any) {
      fail(e.message);
    } finally {
      setBusy(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const remove = async () => {
    if (!confirm('¿Quitar la póliza de este empleado?')) return;
    setBusy('delete');
    try {
      const res = await fetch(`/api/staffPolicy?employeeId=${employeeId}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'No se pudo quitar la póliza');
      onChange?.(null);
    } catch (e: any) {
      fail(e.message);
    } finally {
      setBusy(null);
    }
  };

  if (!policy && !canManage) return null;

  return (
    <Paper withBorder p='sm' radius='md'>
      <Group justify='space-between' wrap='wrap'>
        <Group gap='xs'>
          <IconFileTypePdf size={20} />
          <Text size='sm' fw={500}>Póliza de seguro</Text>
          <Text size='sm' c='dimmed'>{policy ? policy.fileName : 'Sin cargar'}</Text>
        </Group>
        <Group gap='xs'>
          {policy && <Button size='xs' variant='light' onClick={view} loading={busy === 'view'}>Ver póliza</Button>}
          {canManage && (
            <>
              <input ref={inputRef} type='file' accept='application/pdf' hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
              <Button size='xs' variant='default' onClick={() => inputRef.current?.click()} loading={busy === 'upload'}>
                {policy ? 'Reemplazar' : 'Subir PDF'}
              </Button>
              {policy && <Button size='xs' variant='subtle' color='red' onClick={remove} loading={busy === 'delete'}>Quitar</Button>}
            </>
          )}
        </Group>
      </Group>
    </Paper>
  );
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: sin errores nuevos. Revisar la firma de `onChange` de `DateInput` en Mantine v8: recibe `string | null` (`'YYYY-MM-DD'`). `dateToDay` acepta string y Date. Si el valor es un string `YYYY-MM-DD`, `new Date(str)` lo interpreta como UTC y en AR corre el día, así que hay que cubrirlo: si `typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)` devolver `d` directo. Agregar esa línea en los dos `dateToDay`.

- [ ] **Step 5: Commit**

```bash
git add src/components/StaffLedger/PaymentModal.tsx src/components/StaffLedger/ExtraModal.tsx src/components/StaffLedger/PolicySection.tsx
git commit -m "feat: modales de pago/extra y sección de póliza de STAFF"
```

---

### Task 8: Pantalla admin `/cobros-staff`

**Files:**
- Create: `src/app/cobros-staff/page.tsx`

**Interfaces:**
- Consumes: `useLedgerSummaries`, `useEmployeeAccount`, `ledgerRequest`, `accountKey` (Task 6); `LedgerSummaryCards`, `LedgerTable` (Task 6); `PaymentModal`, `ExtraModal`, `PolicySection` (Task 7); `usePermissions`, `useResponsive`; `withPageAuthRequired`.
- Produces: la página. Requests: 1 al montar (resumen) + 1 por empleado elegido; las mutaciones son 1 request cada una y no revalidan nada.

- [ ] **Step 1: Página**

```tsx
// src/app/cobros-staff/page.tsx
'use client';
import { useMemo, useState } from 'react';
import { mutate } from 'swr';
import { withPageAuthRequired } from '@auth0/nextjs-auth0/client';
import {
  Box, Text, Group, Stack, Button, Loader, Center, NavLink, Badge, ScrollArea, Tabs, Skeleton, Alert
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { usePermissions } from '@/hooks/usePermissions';
import { useResponsive } from '@/hooks/useResponsive';
import { useLedgerSummaries, useEmployeeAccount, ledgerRequest, accountKey, AdminAccountResponse } from '@/hooks/useStaffLedger';
import LedgerSummaryCards from '@/components/StaffLedger/LedgerSummaryCards';
import LedgerTable from '@/components/StaffLedger/LedgerTable';
import PaymentModal from '@/components/StaffLedger/PaymentModal';
import ExtraModal from '@/components/StaffLedger/ExtraModal';
import PolicySection from '@/components/StaffLedger/PolicySection';
import { formatPrice } from '@/utils/priceUtils';
import { AllocatedCharge, Credit } from '@/utils/staffLedger';

const collator = new Intl.Collator('es', { sensitivity: 'base', numeric: true });

function EmployeeList({ selected, onSelect }: { selected: string | null; onSelect: (id: string) => void }) {
  const { data, error } = useLedgerSummaries();
  // Más pendiente primero, después alfabético
  const rows = useMemo(
    () =>
      [...(data ?? [])].sort(
        (a, b) => b.summary.pendingToDate - a.summary.pendingToDate || collator.compare(a.fullName, b.fullName)
      ),
    [data]
  );
  if (error) return <Alert color='red'>{error.message}</Alert>;
  if (!data) return <Stack gap='xs'>{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} h={44} />)}</Stack>;
  if (!rows.length) return <Text c='dimmed' ta='center'>No hay empleados de STAFF cargados.</Text>;

  return (
    <Stack gap={2}>
      {rows.map((r) => (
        <NavLink
          key={r.employeeId}
          active={selected === r.employeeId}
          onClick={() => onSelect(r.employeeId)}
          label={r.fullName || 'Sin nombre'}
          description={r.rol || undefined}
          rightSection={
            <Group gap={4} wrap='nowrap'>
              {r.summary.missingAmount > 0 && <Badge size='xs' color='yellow' variant='light'>{r.summary.missingAmount} sin monto</Badge>}
              {r.summary.pendingToDate > 0 ? (
                <Badge color='orange' variant='light'>{formatPrice(r.summary.pendingToDate)}</Badge>
              ) : r.summary.favor > 0 ? (
                <Badge color='blue' variant='light'>A favor</Badge>
              ) : null}
            </Group>
          }
        />
      ))}
    </Stack>
  );
}

function AccountDetail({ employeeId }: { employeeId: string }) {
  const { data, error } = useEmployeeAccount(employeeId);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [editingCredit, setEditingCredit] = useState<Credit | null>(null);
  const [extraOpen, setExtraOpen] = useState(false);
  const [editingExtra, setEditingExtra] = useState<AllocatedCharge | null>(null);
  // Los montos de la tabla son inputs no controlados: si falla un guardado se
  // re-monta la tabla para que vuelva a mostrar el valor del servidor
  const [tableRev, setTableRev] = useState(0);
  const now = useMemo(() => new Date(), [data]);

  if (error) return <Alert color='red'>{error.message}</Alert>;
  if (!data) return <Center h={300}><Loader /></Center>;

  const saveAmount = async (charge: AllocatedCharge, raw: string | number) => {
    try {
      await ledgerRequest('POST', { type: 'evento', employeeId, eventId: charge.eventId, amount: raw });
    } catch (e: any) {
      notifications.show({ color: 'red', message: e.message });
      setTableRev((r) => r + 1);
    }
  };

  const deleteEntry = async (entryId: string) => {
    if (!confirm('¿Borrar este movimiento?')) return;
    try {
      await ledgerRequest('DELETE', undefined, `?id=${entryId}`);
    } catch (e: any) {
      notifications.show({ color: 'red', message: e.message });
    }
  };

  const setPolicy = (policy: { fileName: string } | null) =>
    mutate<AdminAccountResponse>(
      accountKey(employeeId),
      (d) => d && { ...d, employee: { ...d.employee, insurancePolicy: policy ? { fileName: policy.fileName, uploadedAt: new Date().toISOString() } : null } },
      { revalidate: false }
    );

  return (
    <Stack>
      <Group justify='space-between' wrap='wrap'>
        <div>
          <Text size='xl' fw={700}>{data.employee.fullName}</Text>
          {data.employee.rol && <Text c='dimmed' size='sm'>{data.employee.rol}</Text>}
        </div>
        <Group>
          <Button variant='default' onClick={() => { setEditingExtra(null); setExtraOpen(true); }}>Agregar extra</Button>
          <Button onClick={() => { setEditingCredit(null); setPaymentOpen(true); }}>Registrar pago</Button>
        </Group>
      </Group>

      <LedgerSummaryCards mode='admin' summary={data.summary} />
      <PolicySection employeeId={employeeId} policy={data.employee.insurancePolicy} canManage onChange={setPolicy} />

      <LedgerTable
        key={tableRev}
        charges={data.charges}
        credits={data.credits}
        now={now}
        editable
        onAmountSave={saveAmount}
        onEditCredit={(c) => { setEditingCredit(c); setPaymentOpen(true); }}
        onEditExtra={(c) => { setEditingExtra(c); setExtraOpen(true); }}
        onDeleteEntry={deleteEntry}
      />

      <PaymentModal opened={paymentOpen} onClose={() => setPaymentOpen(false)} employeeId={employeeId} charges={data.charges} credit={editingCredit} />
      <ExtraModal opened={extraOpen} onClose={() => setExtraOpen(false)} employeeId={employeeId} extra={editingExtra} />
    </Stack>
  );
}

export default withPageAuthRequired(function CobrosStaffPage() {
  const { isAdmin, isLoading } = usePermissions() as any;
  const { isMobile, isTablet } = useResponsive();
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<string | null>('list');

  if (isLoading) return <Center h='60vh'><Loader /></Center>;
  if (!isAdmin) return <Center h='60vh'><Text>No tenés permisos para ver esta sección.</Text></Center>;

  const select = (id: string) => { setSelected(id); setTab('detail'); };

  if (isMobile || isTablet) {
    return (
      <Box p='md'>
        <Text size='xl' fw={700} mb='md'>Cobros STAFF</Text>
        <Tabs value={tab} onChange={setTab}>
          <Tabs.List>
            <Tabs.Tab value='list'>Empleados</Tabs.Tab>
            <Tabs.Tab value='detail' disabled={!selected}>Detalle</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value='list' pt='md'><EmployeeList selected={selected} onSelect={select} /></Tabs.Panel>
          <Tabs.Panel value='detail' pt='md'>{selected && <AccountDetail employeeId={selected} />}</Tabs.Panel>
        </Tabs>
      </Box>
    );
  }

  return (
    <Box p='md'>
      <Text size='xl' fw={700} mb='md'>Cobros STAFF</Text>
      <Group align='flex-start' wrap='nowrap' gap='lg'>
        <ScrollArea h='calc(100vh - 120px)' w={320} style={{ flexShrink: 0 }}>
          <EmployeeList selected={selected} onSelect={select} />
        </ScrollArea>
        <Box style={{ flex: 1, minWidth: 0 }}>
          {selected ? (
            <AccountDetail key={selected} employeeId={selected} />
          ) : (
            <Center h={300}><Text c='dimmed'>Elegí un empleado para ver su cuenta.</Text></Center>
          )}
        </Box>
      </Group>
    </Box>
  );
});
```

Antes de escribir, verificar qué devuelve `usePermissions()`: si no expone `isLoading`, usar `useUser()` de `@auth0/nextjs-auth0/client` para el estado de carga y no adivinar nombres. Sacar el `as any` una vez confirmado.

- [ ] **Step 2: Typecheck + tests**

Run: `npx tsc --noEmit && npm test`
Expected: sin errores; PASS.

- [ ] **Step 3: Commit**

```bash
git add src/app/cobros-staff/page.tsx
git commit -m "feat: pantalla admin de cobros de STAFF"
```

---

### Task 9: Pantalla del empleado `/mis-cobros` + accesos

**Files:**
- Create: `src/app/mis-cobros/page.tsx`
- Modify: `src/components/NavBar/NavBar.tsx` (array `linksList` y filtro `filteredLinksList`)
- Modify: `src/app/home/page.tsx` (array `tiles`)

**Interfaces:**
- Consumes: `useMyLedger` (Task 6); `LedgerSummaryCards`, `LedgerTable` (Task 6); `PolicySection` (Task 7); `useMyEmployee` (`@/hooks/useMyEmployee`, su `employee.isStaff`); `usePermissions`.
- Produces: la página (1 request) y los accesos.

- [ ] **Step 1: Página del empleado**

```tsx
// src/app/mis-cobros/page.tsx
'use client';
import { useMemo } from 'react';
import { withPageAuthRequired } from '@auth0/nextjs-auth0/client';
import { Box, Text, Stack, Center, Loader, Alert } from '@mantine/core';
import { useMyLedger } from '@/hooks/useStaffLedger';
import LedgerSummaryCards from '@/components/StaffLedger/LedgerSummaryCards';
import LedgerTable from '@/components/StaffLedger/LedgerTable';
import PolicySection from '@/components/StaffLedger/PolicySection';

// Lo que el empleado ve de su cuenta: 3 meses atrás y 1 adelante (lo recorta el
// servidor). Solo lectura.
export default withPageAuthRequired(function MisCobrosPage() {
  const { data, error } = useMyLedger();
  const now = useMemo(() => new Date(), [data]);

  if (error) return <Box p='md'><Alert color='red'>{error.message}</Alert></Box>;
  if (!data) return <Center h='60vh'><Loader /></Center>;
  if (!data.linked) return <Center h='60vh' p='md'><Text ta='center'>{data.message}</Text></Center>;

  return (
    <Box p='md'>
      <Stack>
        <div>
          <Text size='xl' fw={700}>Mis cobros</Text>
          <Text size='sm' c='dimmed'>Últimos 3 meses y próximo mes</Text>
        </div>
        <LedgerSummaryCards mode='employee' summary={data.summary} />
        <PolicySection employeeId={data.employeeId} policy={data.policy} canManage={false} />
        <LedgerTable charges={data.charges} credits={data.credits} now={now} />
      </Stack>
    </Box>
  );
});
```

- [ ] **Step 2: NavBar**

En `src/components/NavBar/NavBar.tsx`:
- Importar `IconCash` y `IconReceipt` de `@tabler/icons-react`, y `useMyEmployee` de `@/hooks/useMyEmployee`.
- Agregar a `linksList`:

```ts
  { icon: IconCash, label: 'Cobros STAFF', path: '/cobros-staff' },
  { icon: IconReceipt, label: 'Mis cobros', path: '/mis-cobros' }
```

- Dentro del componente, junto a `can`: `const { employee } = useMyEmployee();`
- En `filteredLinksList`, antes del `return true`:

```ts
    // Plata: solo admin
    if (link.path === '/cobros-staff') {
      return can('canEditPayments');
    }
    // Solo quien está vinculado a un registro de STAFF (no una entrada de directorio)
    if (link.path === '/mis-cobros') {
      return !!employee && employee.isStaff;
    }
```

`useMyEmployee` usa la key SWR `/api/me`, la misma que ya piden otras vistas: no suma requests nuevas (deduping).

- [ ] **Step 3: Home**

En `src/app/home/page.tsx`:
- Importar `IconCash`, `IconReceipt` y `useMyEmployee`.
- Dentro de `Home`: `const { employee } = useMyEmployee();`
- Agregar al final del array `tiles`:

```ts
    ...(isAdmin ? [{ label: 'Cobros STAFF', path: '/cobros-staff', Icon: IconCash }] : []),
    ...(employee?.isStaff ? [{ label: 'Mis cobros', path: '/mis-cobros', Icon: IconReceipt }] : [])
```

- [ ] **Step 4: Typecheck + tests**

Run: `npx tsc --noEmit && npm test`
Expected: sin errores; PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/mis-cobros/page.tsx src/components/NavBar/NavBar.tsx src/app/home/page.tsx
git commit -m "feat: vista Mis cobros y accesos a cobros de STAFF"
```

---

### Task 10: Documentación y verificación final

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Actualizar CLAUDE.md**

- En la tabla de permisos, agregar las filas:
  - `| Cargar montos, extras, pagos y adelantos de STAFF | ✅ | ❌ | ❌ |`
  - `| Ver sus propios cobros (si está vinculado a STAFF) | ✅ | ✅ | ✅ |`
  - `| Subir/quitar póliza de seguro | ✅ | ❌ | ❌ |`
- En la tabla de colecciones: `| \`staff_ledger\` | Cuenta corriente de cobros de STAFF: montos por evento, extras, pagos y adelantos (ver regla 7) |`
- En la estructura de API: `staffLedger/ # Cobros de STAFF (admin) + /me (empleado)` y `staffPolicy/ # Póliza de seguro (PDF S3)`
- Nueva sección **"### 7. Cobros de STAFF (CRÍTICO)"**:

```markdown
### 7. Cobros de STAFF (CRÍTICO)

Cuenta corriente por empleado en `staff_ledger`. Lógica pura en `/src/utils/staffLedger.ts` (testeada).

- **Cargos** = `evento` (monto manual por evento) + `extra`. **Abonos** = `pago` + `adelanto`.
- Las líneas de evento se **derivan** de `events.staff` al leer: solo se guarda el monto. No tocar `postEvent`/`updateEvent` para esto.
- Imputación **FIFO**: los abonos cubren los cargos más viejos. Lo que sobra es saldo a favor.
- Si sacan al empleado de un evento con monto, o se borra el evento, la línea queda marcada; nunca se borra sola.
- Todo es **solo admin**. El empleado ve `/mis-cobros` solo si `isStaff !== false`, con ventana **3 meses atrás / 1 adelante recortada en el servidor**; nunca recibe el total futuro.
- Póliza: `employees.insurancePolicy` (excluida de `GET /api/employees`). Se ve por `/api/staffPolicy` (admin o el propio empleado).
- Fechas en hora argentina (UTC-03:00 fijo): usar `arDay()`, nunca `getDate()` en el servidor.
```

- [ ] **Step 2: Verificación completa**

Run: `npm test && npx tsc --noEmit && npx next build`
Expected: todo en verde. Si `next build` falla por algo preexistente y ajeno, anotarlo y no tocarlo.

- [ ] **Step 3: Prueba manual en el navegador (`npm run dev`)**

Como admin:
1. `/cobros-staff` muestra skeleton y después la lista. Elegir un empleado con eventos.
2. Cargar el monto de un evento pasado → la fila pasa a "A pagar" y el pendiente sube. Borrar el monto → vuelve a "Sin monto".
3. Registrar un pago parcial con "pagar hasta" → se precarga el monto; el evento más viejo queda "Pagado" y el siguiente "Parcial".
4. Registrar un adelanto mayor que lo adeudado → aparece "A favor".
5. Agregar el extra "Depósito" → aparece en su mes y suma al subtotal.
6. Subir una póliza PDF → "Ver póliza" abre el archivo. Reemplazarla y quitarla.
7. Sacar al empleado de un evento con monto (desde el evento) → en cobros aparece la advertencia "Ya no está asignado".

Como usuario vinculado no admin (viewer o manager con email en STAFF):
8. Ve "Mis cobros" en NavBar y Home. No ve "Cobros STAFF".
9. Ve solo 3 meses atrás y 1 adelante, sin total futuro. Puede abrir su póliza.
10. `GET /api/staffLedger` y `GET /api/staffPolicy?employeeId=<otro>` → 403 y 404.

Como usuario sin registro de STAFF:
11. No ve "Mis cobros". Si entra a `/mis-cobros` por URL ve el mensaje de "no vinculado".

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: reglas de cobros de STAFF en CLAUDE.md"
```

---

## Requests y loaders (para el resumen de entrega)

| Vista | Requests | Mientras carga |
|---|---|---|
| `/cobros-staff` | 1 al montar + 1 por empleado elegido | Skeleton en la lista, spinner en el detalle |
| Guardar monto, pago, extra o borrar | 1 por acción, sin revalidación (la respuesta trae la cuenta) | Botón en loading |
| `/mis-cobros` | 1 | Spinner |
| Ver póliza | 1 (URL firmada) | Botón en loading |
