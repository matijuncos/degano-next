// src/app/api/staffRoles/route.ts
// Catálogo de roles de STAFF (DJ, Ilum, AT…) con su monto por evento.
// - GET: todos los logueados (para elegir el rol en los eventos). Los montos
//   son plata → solo los recibe el admin; el resto, solo nombres.
// - POST / PUT: SOLO ADMIN. Los roles no se borran (hay eventos que los usan):
//   se archivan y dejan de aparecer en los selectores.
// Las mutaciones devuelven la lista completa para actualizar la caché sin otra request.
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { Db, ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';
import { withAuth, withAdminAuth, AuthContext } from '@/lib/withAuth';
import { arDay } from '@/utils/staffLedger';
import {
  STAFF_ROLES_COLLECTION,
  StaffRole,
  parseRoleInput,
  roleKey,
  rolesLabel,
  upsertRate
} from '@/utils/staffRoles';

const badRequest = (error: string) => NextResponse.json({ error }, { status: 400 });

async function getDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db('degano-app');
}

const collator = new Intl.Collator('es', { sensitivity: 'base', numeric: true });

async function listRoles(db: Db, isAdmin: boolean): Promise<StaffRole[]> {
  const projection = isAdmin ? { name: 1, rates: 1, archived: 1 } : { name: 1, archived: 1 };
  const docs = await db.collection(STAFF_ROLES_COLLECTION).find({}, { projection }).toArray();
  return docs
    .map((d: any) => ({ ...d, _id: String(d._id) }) as StaffRole)
    .sort((a, b) => collator.compare(a.name, b.name));
}

// ¿Ya hay otro rol con ese nombre? (sin mayúsculas ni tildes: "Técnico" = "tecnico")
function nameTaken(roles: StaffRole[], name: string, exceptId?: string) {
  const key = roleKey(name);
  return roles.find((r) => r._id !== exceptId && roleKey(r.name) === key);
}

// Al renombrar un rol, el texto que se muestra en eventos, calendarios y
// perfiles ("DJ / Sonidista") se rearma con los nombres nuevos
async function refreshRoleLabels(db: Db, roleId: string) {
  const roles = new Map((await listRoles(db, false)).map((r) => [r._id, r]));
  for (const coll of ['events', 'calendar_events']) {
    const docs = await db
      .collection(coll)
      .find({ 'staff.roleIds': roleId }, { projection: { 'staff.employeeId': 1, 'staff.roleIds': 1 } })
      .toArray();
    const ops = docs.flatMap((doc: any) =>
      (doc.staff ?? [])
        .filter((m: any) => Array.isArray(m.roleIds) && m.roleIds.includes(roleId))
        .map((m: any) => ({
          updateOne: {
            filter: { _id: doc._id },
            update: { $set: { 'staff.$[m].rol': rolesLabel(m.roleIds, roles) } },
            arrayFilters: [{ 'm.employeeId': m.employeeId }]
          }
        }))
    );
    if (ops.length) await db.collection(coll).bulkWrite(ops);
  }
  const employees = await db
    .collection('employees')
    .find({ roleIds: roleId }, { projection: { roleIds: 1 } })
    .toArray();
  if (employees.length) {
    await db.collection('employees').bulkWrite(
      employees.map((e: any) => ({
        updateOne: { filter: { _id: e._id }, update: { $set: { rol: rolesLabel(e.roleIds, roles) } } }
      }))
    );
  }
}

export const GET = withAuth(async (context: AuthContext) => {
  try {
    const db = await getDb();
    return NextResponse.json(await listRoles(db, context.role === 'admin'));
  } catch (error) {
    console.error('[staffRoles GET]', error);
    return NextResponse.json({ error: 'Error al obtener los roles' }, { status: 500 });
  }
});

export const POST = withAdminAuth(async (ctx: AuthContext, req: Request) => {
  try {
    const parsed = parseRoleInput(await req.json(), arDay(new Date()) as string, true);
    if (!parsed.ok) return badRequest(parsed.error);
    const { name, rate } = parsed.value;

    const db = await getDb();
    const existing = await listRoles(db, true);
    const taken = nameTaken(existing, name!);
    if (taken) {
      return NextResponse.json({ error: `Ya existe el rol "${taken.name}"` }, { status: 409 });
    }
    const now = new Date();
    const { insertedId } = await db.collection(STAFF_ROLES_COLLECTION).insertOne({
      name,
      rates: rate ? [rate] : [],
      createdAt: now,
      updatedAt: now,
      createdBy: ctx.user?.email || ''
    });
    return NextResponse.json({ roles: await listRoles(db, true), createdId: String(insertedId) }, { status: 201 });
  } catch (error) {
    console.error('[staffRoles POST]', error);
    return NextResponse.json({ error: 'Error al crear el rol' }, { status: 500 });
  }
});

// Body parcial: { _id, name?, amount? + from?, archived? }. Un monto nuevo se
// agrega al historial desde esa fecha (no pisa lo anterior).
export const PUT = withAdminAuth(async (_ctx: AuthContext, req: Request) => {
  try {
    const body = await req.json();
    if (!body?._id || !ObjectId.isValid(String(body._id))) return badRequest('Falta el rol');
    const parsed = parseRoleInput(body, arDay(new Date()) as string, false);
    if (!parsed.ok) return badRequest(parsed.error);
    const { name, rate, archived } = parsed.value;

    const db = await getDb();
    const roles = await listRoles(db, true);
    const role = roles.find((r) => r._id === String(body._id));
    if (!role) return NextResponse.json({ error: 'Rol no encontrado' }, { status: 404 });
    if (name) {
      const taken = nameTaken(roles, name, role._id);
      if (taken) return NextResponse.json({ error: `Ya existe el rol "${taken.name}"` }, { status: 409 });
    }

    const set: Record<string, unknown> = { updatedAt: new Date() };
    if (name) set.name = name;
    if (rate) set.rates = upsertRate(role.rates, rate.amount, rate.from);
    if (archived !== undefined) set.archived = archived;
    await db.collection(STAFF_ROLES_COLLECTION).updateOne({ _id: new ObjectId(role._id) }, { $set: set });

    if (name && name !== role.name) await refreshRoleLabels(db, role._id);
    return NextResponse.json({ roles: await listRoles(db, true) });
  } catch (error) {
    console.error('[staffRoles PUT]', error);
    return NextResponse.json({ error: 'Error al actualizar el rol' }, { status: 500 });
  }
});
