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
import { parseLedgerInput, isLedgerEligible, mergeLedgerUpdate, eventAmountGuard, parseEventRolInput } from '@/utils/staffLedgerInput';
import { eventLabel, isChargeKey } from '@/utils/staffLedger';

// 'YYYY-MM' → mes anterior
function previousMonth(ym: string) {
  const [y, m] = ym.split('-').map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
}

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
    const body = await req.json();

    // Rol del empleado en un evento: se guarda en el EVENTO (events.staff[].rol),
    // el mismo dato que se edita en la vista del evento y en el calendario
    if (body?.action === 'eventRol') {
      const rolInput = parseEventRolInput(body);
      if (!rolInput.ok) return badRequest(rolInput.error);
      const { employeeId, eventId, rol } = rolInput.value;
      if (!ObjectId.isValid(eventId)) return badRequest('Evento inválido');
      const db = await getDb();
      const employee = await findEmployee(db, employeeId);
      if (!employee) return notFound('Empleado no encontrado');
      // Evento de calendario extra (Logística Técnica, etc.) → calendar_events
      const eventsColl = body.source === 'calendar' ? 'calendar_events' : 'events';
      const result = await db
        .collection(eventsColl)
        .updateOne({ _id: new ObjectId(eventId), 'staff.employeeId': employeeId }, { $set: { 'staff.$.rol': rol } });
      if (result.matchedCount === 0) return notFound('El empleado ya no está asignado a ese evento');
      return accountResponse(db, employee);
    }

    const parsed = parseLedgerInput(body);
    if (!parsed.ok) return badRequest(parsed.error);
    const input = parsed.value;

    const db = await getDb();
    await ensureLedgerIndexes(db);
    const employee = await findEmployee(db, input.employeeId);
    if (!employee) return notFound('Empleado no encontrado');

    const coll = db.collection(LEDGER_COLLECTION);
    const now = new Date();

    if (input.type === 'evento') {
      const isCalendar = body.source === 'calendar';
      const filter = { employeeId: input.employeeId, eventId: input.eventId, type: 'evento' };
      if (input.amount === null) {
        await coll.deleteOne(filter);
        return accountResponse(db, employee);
      }
      const [found, existingLine] = await Promise.all([
        !ObjectId.isValid(input.eventId!)
          ? null
          : isCalendar
          ? db.collection('calendar_events').findOne(
              { _id: new ObjectId(input.eventId) },
              { projection: { start: 1, title: 1, 'staff.employeeId': 1 } }
            )
          : db.collection('events').findOne(
              { _id: new ObjectId(input.eventId) },
              { projection: { date: 1, type: 1, fullName: 1, 'staff.employeeId': 1 } }
            ),
        coll.findOne(filter, { projection: { _id: 1 } })
      ]);
      // Un evento de calendario se guarda igual que uno normal (fecha + nombre)
      const event: any = found && isCalendar ? { ...found, date: found.start, type: found.title } : found;
      const guardError = eventAmountGuard(event as any, input.employeeId, !!existingLine);
      if (guardError) return event ? badRequest(guardError) : notFound(guardError);

      // La fecha y el nombre se guardan para poder mostrar la línea si el evento
      // se borra; mientras exista, al leer manda el evento. Evento borrado: solo
      // se corrige el monto de la línea que ya existe.
      const update = event
        ? {
            $set: {
              amount: input.amount,
              date: new Date(event.date),
              description: eventLabel(event as any),
              ...(isCalendar ? { source: 'calendar' } : {}),
              updatedAt: now
            },
            $setOnInsert: { createdAt: now, createdBy: ctx.user?.email || '' }
          }
        : { $set: { amount: input.amount, updatedAt: now } };
      try {
        await coll.updateOne(filter, update, { upsert: !!event });
      } catch (error: any) {
        // Dos guardados casi simultáneos de la misma fila: el segundo upsert
        // choca con el índice único. La línea ya existe → se actualiza.
        if (error?.code !== 11000) throw error;
        await coll.updateOne(filter, { $set: update.$set });
      }
      return accountResponse(db, employee);
    }

    // Cambio de monto de un fijo desde un mes: el viejo termina el mes anterior
    // y el nuevo arranca ese mes (lo ya generado no cambia)
    if (input.type === 'fijo' && body.replacesId) {
      if (!ObjectId.isValid(String(body.replacesId))) return badRequest('Fijo inválido');
      const old = await coll.findOne({
        _id: new ObjectId(String(body.replacesId)),
        employeeId: input.employeeId,
        type: 'fijo'
      });
      if (!old) return notFound('Fijo no encontrado');
      const prevMonth = previousMonth(input.fromMonth!);
      if (prevMonth < old.fromMonth) return badRequest('El cambio tiene que ser posterior al mes de inicio del fijo');
      if (old.toMonth && input.fromMonth! > old.toMonth) return badRequest('Ese fijo ya terminó antes de ese mes');
      await coll.updateOne({ _id: old._id }, { $set: { toMonth: prevMonth, updatedAt: now } });
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
    // Body parcial: lo que no viene se toma del documento actual. El empleado no
    // cambia; el tipo solo entre pago y adelanto.
    const merge = mergeLedgerUpdate(existing, body);
    if (!merge.ok) return badRequest(merge.error);
    const parsed = parseLedgerInput(merge.merged);
    if (!parsed.ok) return badRequest(parsed.error);

    const { type, employeeId, ...fields } = parsed.value;
    const unset: Record<string, ''> = {};
    // Campos opcionales borrados → se sacan (nunca en $set y $unset a la vez)
    if (type === 'extra' && fields.hours === undefined) unset.hours = '';
    if ((type === 'extra' || type === 'fijo') && fields.rol === undefined) unset.rol = '';
    if (type === 'fijo' && fields.toMonth === undefined) unset.toMonth = '';
    if (type !== 'extra' && fields.description === undefined) unset.description = '';
    await coll.updateOne(
      { _id: existing._id },
      { $set: { ...fields, type, updatedAt: new Date() }, ...(Object.keys(unset).length ? { $unset: unset } : {}) }
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
    const params = new URL(req.url).searchParams;
    const db = await getDb();
    const coll = db.collection(LEDGER_COLLECTION);

    // Destildar una línea: se borran los abonos hechos con su tilde
    const chargeKey = params.get('chargeKey');
    if (chargeKey !== null) {
      const employeeId = params.get('employeeId') || '';
      if (!isChargeKey(chargeKey) || !employeeId) return badRequest('Falta la línea a destildar');
      const employee = await findEmployee(db, employeeId);
      if (!employee) return notFound('Empleado no encontrado');
      await coll.deleteMany({ employeeId, chargeKey, type: { $in: ['pago', 'adelanto'] } });
      return accountResponse(db, employee);
    }

    const id = params.get('id');
    if (!id || !ObjectId.isValid(id)) return badRequest('Falta el movimiento');
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
