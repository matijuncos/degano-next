// src/lib/staffLedgerServer.ts
// Acceso a Mongo para los cobros de STAFF. La cuenta en sí se calcula con la
// lógica pura de utils/staffLedger: acá solo se traen los datos.
import { Db, ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';
import {
  buildAccount,
  groupEventsByEmployee,
  LEDGER_START_DAY,
  LEDGER_START_ISO,
  Account,
  LedgerEntry,
  LedgerSummary,
  StaffEvent
} from '@/utils/staffLedger';

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

// Eventos desde la fecha de inicio de cobros. `date` se guarda como string ISO
// (viene del JSON del formulario), pero puede haber eventos viejos con Date:
// Mongo compara por tipo, así que se cubren los dos.
const sinceLedgerStart = {
  $or: [{ date: { $gte: LEDGER_START_ISO } }, { date: { $gte: new Date(LEDGER_START_ISO) } }]
};

// Eventos con monto cargado que no vinieron en la consulta principal (el
// empleado ya no está asignado, o es anterior a la fecha de inicio). Se traen
// aparte; casi nunca hay. Si no existen, el evento fue borrado.
async function loadReferencedEvents(db: Db, entries: any[], loadedIds: Set<string>) {
  const missing = [
    ...new Set(
      entries
        .filter((e) => e.type === 'evento' && e.eventId && !loadedIds.has(e.eventId))
        .map((e) => e.eventId as string)
    )
  ];
  if (!missing.length) return [];
  return db
    .collection('events')
    .find({ _id: { $in: toObjectIds(missing) } }, { projection: EVENT_PROJECTION })
    .toArray();
}

export async function loadAccount(db: Db, employeeId: string, now: Date): Promise<Account> {
  const [entries, assigned] = await Promise.all([
    db.collection(LEDGER_COLLECTION).find({ employeeId }).toArray(),
    db
      .collection('events')
      .find({ 'staff.employeeId': employeeId, ...sinceLedgerStart }, { projection: EVENT_PROJECTION })
      .toArray()
  ]);
  const extra = await loadReferencedEvents(db, entries, new Set(assigned.map((e) => String(e._id))));

  return buildAccount(
    employeeId,
    [...assigned, ...extra].map(toPlain) as StaffEvent[],
    entries.map(toPlain) as LedgerEntry[],
    now,
    LEDGER_START_DAY
  );
}

export type EmployeeLedgerRow = {
  employeeId: string;
  fullName: string;
  rol: string;
  summary: Omit<LedgerSummary, 'byMonth'>;
};

// Resumen de todos los empleados de STAFF: 3 consultas en paralelo (no N) y,
// solo si hace falta, una más por los eventos referenciados por montos.
export async function loadSummaries(db: Db, now: Date): Promise<EmployeeLedgerRow[]> {
  const [employees, entries, events] = await Promise.all([
    db.collection('employees')
      .find({ isStaff: { $ne: false } }, { projection: { fullName: 1, rol: 1 } })
      .toArray(),
    db.collection(LEDGER_COLLECTION).find({}).toArray(),
    db
      .collection('events')
      .find({ 'staff.0': { $exists: true }, ...sinceLedgerStart }, { projection: EVENT_PROJECTION })
      .toArray()
  ]);
  const extra = await loadReferencedEvents(db, entries, new Set(events.map((e) => String(e._id))));

  const plainEntries = entries.map(toPlain) as LedgerEntry[];
  const entriesBy = new Map<string, LedgerEntry[]>();
  for (const e of plainEntries) entriesBy.set(e.employeeId, [...(entriesBy.get(e.employeeId) ?? []), e]);
  // Asignados + los que tienen monto aunque ya no esté asignado: misma base
  // que el detalle, así los números coinciden
  const eventsBy = groupEventsByEmployee([...events, ...extra].map(toPlain) as StaffEvent[], plainEntries);

  return employees.map((emp) => {
    const id = String(emp._id);
    const { byMonth, ...summary } = buildAccount(
      id,
      eventsBy.get(id) ?? [],
      entriesBy.get(id) ?? [],
      now,
      LEDGER_START_DAY
    ).summary;
    return { employeeId: id, fullName: emp.fullName || '', rol: emp.rol || '', summary };
  });
}
