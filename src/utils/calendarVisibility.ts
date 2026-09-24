// Visibilidad de calendarios extras (app_calendars).
// - 'all'        → todos los usuarios logueados (solo lectura para no-admin)
// - 'admins'     → solo admins. Es el comportamiento de los calendarios viejos
//                  (sin campo visibility), así que se mantiene como default legacy.
// - 'restricted' → solo el dueño + los empleados de STAFF en memberIds.
//                  "Solo yo" = restricted con memberIds vacío.
// Un empleado se vincula con su login por email: quien inicia sesión con el email
// cargado en STAFF ve los calendarios donde ese empleado es miembro.
// Igual que en tableros: un calendario restringido es privado incluso para otros admins.
import { Db, ObjectId } from 'mongodb';
import { resolveEmployee } from '@/lib/resolveEmployee';
import { CalendarVisibility } from '@/types/calendars';

export const CALENDAR_VISIBILITIES: CalendarVisibility[] = ['all', 'admins', 'restricted'];

const uniq = (arr: string[]) => Array.from(new Set(arr.filter(Boolean)));

// Id del registro de STAFF del usuario logueado. Delega en el helper compartido
// (mismo criterio que tableros): resuelve por email normalizado y NO elige si hay
// más de un registro con ese email.
export async function currentEmployeeId(
  db: Db,
  user: any
): Promise<string | null> {
  const resolved = await resolveEmployee(db, user);
  return resolved.ok ? String(resolved.employee._id) : null;
}

// Filtro Mongo de los calendarios que puede ver un usuario.
// Dueño y miembros se guardan con el _id del empleado, igual que en tableros:
// el sub de Auth0 no se usa como identidad en ningún lado.
export async function visibleCalendarsFilter(db: Db, user: any, role: string) {
  const employeeId = await currentEmployeeId(db, user);
  const or: Record<string, unknown>[] = [{ visibility: 'all' }];
  if (employeeId) {
    or.push({ ownerId: employeeId }, { memberIds: employeeId });
  }
  if (role === 'admin') {
    or.push({ visibility: 'admins' }, { visibility: { $exists: false } });
  }
  return { $or: or };
}

// Normaliza visibilidad + miembros (ids de empleados) del body. El dueño tiene
// acceso por ownerId, no hace falta en memberIds. Devuelve null si el body no
// trae una visibilidad válida.
export function normalizeCalendarVisibility(
  body: any
): { visibility: CalendarVisibility; memberIds: string[] } | null {
  if (!CALENDAR_VISIBILITIES.includes(body?.visibility)) return null;
  if (body.visibility !== 'restricted') {
    return { visibility: body.visibility, memberIds: [] };
  }
  const requested: string[] = Array.isArray(body.memberIds) ? body.memberIds.map(String) : [];
  return { visibility: 'restricted', memberIds: uniq(requested.filter((id) => ObjectId.isValid(id))) };
}
