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
            $set: { amount: input.amount, date: new Date(event.date), description: eventLabel(event as any), updatedAt: now },
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
