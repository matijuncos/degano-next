// src/app/api/employees/route.ts
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { withAuth, withAdminAuth, AuthContext } from '@/lib/withAuth';

export const dynamic = 'force-dynamic';

// El email se guarda normalizado: se compara contra el email del login.
// Vacío → se saca del body para que quede sin el campo (el índice único solo
// indexa emails string, así que varios registros sin email no chocan).
function normalizeEmail(body: any) {
  if (typeof body.email === 'string') {
    const email = body.email.trim().toLowerCase();
    if (email) body.email = email;
    else delete body.email;
  }
  return body;
}

// ¿Ese email ya está cargado en OTRO empleado? Es lo que evita que dos registros
// compartan email y que la resolución de identidad tenga que elegir uno.
async function findEmailOwner(db: any, email: string, excludeId?: string) {
  if (!email) return null;
  const query: any = { email };
  if (excludeId) query._id = { $ne: new ObjectId(String(excludeId)) };
  return db.collection('employees').findOne(query);
}

function duplicateEmailResponse(owner: any) {
  return NextResponse.json(
    {
      error: `Ese email ya está cargado en el empleado "${owner.fullName || 'sin nombre'}". Cada persona debe tener un email distinto.`
    },
    { status: 409 }
  );
}

// Una "entrada de directorio" es la que se auto-crea cuando alguien entra a la
// app sin tener registro de STAFF. No tiene datos cargados: solo el vínculo con
// su cuenta (authSub/lastLoginAt). No es un conflicto real, es la misma persona.
const isDirectoryEntry = (doc: any) => doc?.isStaff === false;

async function listAllEmployees(directory = false) {
  const client = await clientPromise;
  const db = client.db('degano-app');
  // Por defecto solo el personal de eventos. Las entradas de directorio que se
  // auto-crean en el login (isStaff:false) quedan fuera de la lista de STAFF y
  // de todos los selectores. Con ?directory=true se piden también esas, para los
  // selectores de miembros de tableros y calendarios.
  const filter = directory ? {} : { isStaff: { $ne: false } };
  return db.collection('employees').find(filter).toArray();
}

export const GET = withAuth(async (context: AuthContext, req: Request) => {
  try {
    const { searchParams } = new URL(req.url);
    const directory = searchParams.get('directory') === 'true';
    const employees = await listAllEmployees(directory);
    return NextResponse.json(employees);
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al obtener empleados' },
      { status: 500 }
    );
  }
});

export const POST = withAdminAuth(async (context: AuthContext, req: Request) => {
  try {
    const client = await clientPromise;
    const db = client.db('degano-app');
    const body = normalizeEmail(await req.json());

    if (body.email) {
      const owner = await findEmailOwner(db, body.email);
      // Si esa persona ya entró a la app antes de que le crearan el registro de
      // STAFF, existe su entrada de directorio: se la asciende en vez de crear
      // un segundo documento, así conserva el vínculo con su cuenta.
      if (owner && isDirectoryEntry(owner)) {
        await db
          .collection('employees')
          .updateOne({ _id: owner._id }, { $set: { ...body, isStaff: true } });
        return NextResponse.json(await listAllEmployees(), { status: 201 });
      }
      if (owner) return duplicateEmailResponse(owner);
    }

    // Lo que se crea desde STAFF es personal de eventos: aparece en la lista y
    // en los selectores. (Las entradas de directorio las crea el login.)
    await db.collection('employees').insertOne({ ...body, isStaff: true });
    const employees = await listAllEmployees();
    return NextResponse.json(employees, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al crear empleado' },
      { status: 500 }
    );
  }
});

export const PUT = withAdminAuth(async (context: AuthContext, req: Request) => {
  try {
    const client = await clientPromise;
    const db = client.db('degano-app');
    const raw = await req.json();
    // Solo se toca el email si el body lo trae. Un body parcial (sin la clave)
    // no debe borrar el vínculo con la cuenta de login.
    const emailProvided = 'email' in raw;
    const body = normalizeEmail(raw);
    const { _id, ...rest } = body;

    if (rest.email) {
      const owner = await findEmailOwner(db, rest.email, _id);
      // Misma situación que en el alta: la persona ya entró a la app y quedó su
      // entrada de directorio. Se absorbe el vínculo con su cuenta y se elimina
      // la entrada, que no tiene ningún dato propio.
      if (owner && isDirectoryEntry(owner)) {
        if (owner.authSub) rest.authSub = owner.authSub;
        if (owner.lastLoginAt) rest.lastLoginAt = owner.lastLoginAt;
        await db.collection('employees').deleteOne({ _id: owner._id });
      } else if (owner) {
        return duplicateEmailResponse(owner);
      }
    }

    // Tipo de carnet vacío → solo se borra. No puede ir también en $set:
    // Mongo rechaza $set y $unset sobre el mismo campo (conflicto).
    if (!rest.licenseType) delete rest.licenseType;
    const updateQuery: any = { $set: rest };
    const unset: Record<string, ''> = {};

    if (!rest.licenseType) unset.licenseType = '';
    // Email borrado → se saca el campo, para no dejar '' indexado ni un vínculo
    // de login colgado apuntando a una cuenta que ya no corresponde.
    if (emailProvided && !rest.email) {
      unset.email = '';
      unset.authSub = '';
    }
    if (Object.keys(unset).length) updateQuery.$unset = unset;

    const result = await db
      .collection('employees')
      .updateOne({ _id: new ObjectId(String(_id)) }, updateQuery);

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Empleado no encontrado' },
        { status: 404 }
      );
    }

    const employees = await listAllEmployees();
    return NextResponse.json(employees);
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al actualizar empleado' },
      { status: 500 }
    );
  }
});

export const DELETE = withAdminAuth(async (context: AuthContext, req: Request) => {
  const client = await clientPromise;
  const db = client.db('degano-app');
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { error: 'Falta el ID del empleado' },
      { status: 400 }
    );
  }

  try {
    const result = await db
      .collection('employees')
      .deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Empleado no encontrado' },
        { status: 404 }
      );
    }

    const employees = await listAllEmployees();
    return NextResponse.json(employees);
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al eliminar empleado' },
      { status: 500 }
    );
  }
});
