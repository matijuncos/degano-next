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
