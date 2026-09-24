// Vínculo entre la cuenta de login (Auth0) y el registro de STAFF.
//
// `employees` es el directorio único: no hay colección de usuarios aparte. El
// puente es el email, normalizado en las dos puntas.
//
// REGLA: esta resolución NUNCA adivina. Si el email no está en ningún empleado,
// o está en más de uno, corta. Elegir uno "al azar" mostraría la plata de otra
// persona sin que nadie se entere, que es exactamente lo que hay que evitar.
import { Db, ObjectId } from 'mongodb';
import { EmployeeModel } from '@/context/types';

export type ResolveFailure =
  | 'no_session' // no hay usuario logueado
  | 'no_email' // la sesión no trae email
  | 'not_linked' // ningún empleado tiene ese email
  | 'ambiguous'; // más de un empleado con ese email (no debería pasar: hay índice único)

export type ResolveResult =
  | { ok: true; employee: EmployeeModel & { _id: ObjectId } }
  | { ok: false; reason: ResolveFailure };

// Mensajes para el usuario final. No exponen detalle interno.
export const RESOLVE_MESSAGES: Record<ResolveFailure, string> = {
  no_session: 'Iniciá sesión para continuar.',
  no_email: 'Tu cuenta no tiene un email asociado. Contactá al administrador.',
  not_linked:
    'Tu usuario todavía no está vinculado a un registro de STAFF. Pedile al administrador que cargue tu email.',
  ambiguous:
    'Hay más de un registro de STAFF con tu email. Contactá al administrador para que lo corrija.'
};

// Único lugar donde se normaliza un email en todo el módulo.
export function normalizeEmail(raw: unknown): string {
  return typeof raw === 'string' ? raw.trim().toLowerCase() : '';
}

// Índice único sobre el email. Se aplica solo a los documentos que tienen un
// email string (partialFilterExpression), así que los registros viejos sin email
// no chocan entre sí. Es lo que impide que dos empleados compartan email y que
// la resolución tenga que elegir uno.
//
// Se corre una vez por proceso: createIndex es idempotente pero igual es un
// viaje a la base. Si ya hay duplicados cargados, el índice no se puede crear:
// se loguea y se sigue (resolveEmployee igual corta con 'ambiguous').
let indexesReady: Promise<void> | null = null;

export function ensureEmployeeIndexes(db: Db): Promise<void> {
  if (!indexesReady) {
    indexesReady = db
      .collection('employees')
      .createIndex(
        { email: 1 },
        {
          unique: true,
          name: 'employees_email_unique',
          partialFilterExpression: { email: { $type: 'string' } }
        }
      )
      .then(() => undefined)
      .catch((error) => {
        console.error(
          '[ensureEmployeeIndexes] no se pudo crear el índice único de email ' +
            '(¿hay emails duplicados en employees?):',
          error?.message || error
        );
        // Se reintenta en el próximo arranque, no se cachea el fallo.
        indexesReady = null;
      });
  }
  return indexesReady;
}

// Resuelve el empleado del usuario logueado. `user` es session.user de Auth0.
export async function resolveEmployee(db: Db, user: any): Promise<ResolveResult> {
  if (!user) return { ok: false, reason: 'no_session' };

  const email = normalizeEmail(user.email);
  if (!email) return { ok: false, reason: 'no_email' };

  // find + toArray (no findOne) a propósito: necesitamos detectar el duplicado
  // en vez de que la base elija uno por nosotros.
  const matches = await db
    .collection('employees')
    .find({ email })
    .limit(2)
    .toArray();

  if (matches.length === 0) return { ok: false, reason: 'not_linked' };
  if (matches.length > 1) {
    console.error('[resolveEmployee] email duplicado en employees:', email);
    return { ok: false, reason: 'ambiguous' };
  }

  return { ok: true, employee: matches[0] as any };
}

// Alta/estampado en el login. Reemplaza al viejo POST /api/users.
//
// - Si el email ya está en un empleado → estampa authSub y lastLoginAt.
// - Si no está en ninguno → crea una entrada de directorio con isStaff:false.
//   NO es un empleado de STAFF: no aparece en la lista ni en los selectores.
//   Existe solo para poder sumar a esa persona a un tablero o calendario.
export async function registerLogin(db: Db, user: any): Promise<void> {
  const email = normalizeEmail(user?.email);
  const sub = typeof user?.sub === 'string' ? user.sub : null;
  if (!email || !sub) return;

  const now = new Date();
  const existing = await db.collection('employees').findOne({ email });

  if (existing) {
    await db
      .collection('employees')
      .updateOne(
        { _id: existing._id },
        { $set: { authSub: sub, lastLoginAt: now } }
      );
    return;
  }

  // upsert sobre el email: si dos pestañas entran a la vez, una sola inserta.
  await db.collection('employees').updateOne(
    { email },
    {
      $set: { authSub: sub, lastLoginAt: now },
      $setOnInsert: {
        email,
        fullName: user?.name || user?.nickname || email,
        isStaff: false,
        cardId: '',
        rol: '',
        license: '',
        createdAt: now
      }
    },
    { upsert: true }
  );
}

// Filtro de los empleados que SÍ son personal de eventos. Los registros previos
// no tienen el campo, así que ausente = true (mismo criterio legacy que usan
// tableros con `visibility`).
export const STAFF_ONLY_FILTER = { isStaff: { $ne: false } };
