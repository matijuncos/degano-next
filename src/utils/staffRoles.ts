// src/utils/staffRoles.ts
// Roles de STAFF (DJ, Ilum, AT…) con su monto por evento. Lógica pura (testeada).
//
// Cada rol guarda un historial de montos con fecha "desde": el monto de un
// evento es el que tenía el rol ESE día. Así, cambiar el monto impacta solo en
// los eventos desde la fecha del cambio; lo anterior no se mueve.
// En los eventos, cada persona lleva `roleIds` (uno o varios) y `rol` (los
// nombres unidos con " / ", para mostrar). El monto precargado en Cobros es la
// suma de sus roles; si Juan carga uno a mano, gana el manual.

export const STAFF_ROLES_COLLECTION = 'staff_roles';

// Día desde el que valen los montos iniciales de los roles (decidido con Juan:
// desde el día en que se cargan, no hacia atrás)
export const ROLE_RATES_START = '2026-10-21';

export interface RoleRate {
  amount: number;
  from: string; // 'YYYY-MM-DD' (día argentino)
}

export interface StaffRole {
  _id: string;
  name: string;
  rates?: RoleRate[]; // solo llega al admin
  archived?: boolean;
}

const isDay = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

// Monto del rol en un día: el último cambio con fecha "desde" <= ese día
export function rateAt(rates: RoleRate[] | undefined, day: string): number | null {
  let best: RoleRate | null = null;
  for (const r of rates ?? []) {
    if (r.from <= day && (!best || r.from >= best.from)) best = r;
  }
  return best ? best.amount : null;
}

// Monto precargado de una persona con uno o varios roles: la suma de los que
// tienen monto ese día. Ninguno con monto → null (queda "sin monto").
export function rolesAmount(
  roleIds: string[] | undefined,
  rolesById: Map<string, StaffRole>,
  day: string
): number | null {
  let total: number | null = null;
  for (const id of roleIds ?? []) {
    const amount = rateAt(rolesById.get(id)?.rates, day);
    if (amount != null) total = (total ?? 0) + amount;
  }
  return total == null ? null : Math.round(total * 100) / 100;
}

// "DJ / Sonidista": nombres actuales de los roles (los que ya no existen se omiten)
export function rolesLabel(roleIds: string[] | undefined, rolesById: Map<string, StaffRole>): string {
  return (roleIds ?? [])
    .map((id) => rolesById.get(id)?.name)
    .filter(Boolean)
    .join(' / ');
}

// Agrega (o reemplaza, si ya hay uno con esa fecha) un cambio de monto
export function upsertRate(rates: RoleRate[] | undefined, amount: number, from: string): RoleRate[] {
  return [...(rates ?? []).filter((r) => r.from !== from), { amount, from }].sort((a, b) =>
    a.from.localeCompare(b.from)
  );
}

// Nombre de rol: sin espacios de más
export function normalizeRoleName(raw: unknown): string {
  return typeof raw === 'string' ? raw.replace(/\s+/g, ' ').trim().slice(0, 60) : '';
}

// Para comparar nombres: sin mayúsculas ni tildes ("Técnico" = "tecnico")
export function roleKey(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// roleIds que llegan del cliente: strings únicos, sin basura
export function normalizeRoleIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const v of raw) {
    if (typeof v !== 'string') continue;
    const id = v.trim();
    if (/^[a-f0-9]{24}$/i.test(id) && !out.includes(id)) out.push(id);
  }
  return out.slice(0, 10);
}

// Staff de un evento tal como llega a postEvent/updateEvent: los roleIds se
// limpian (solo ids válidos). El resto de cada persona queda igual.
export function sanitizeStaffRoleIds(staff: unknown): unknown {
  if (!Array.isArray(staff)) return staff;
  return staff.map((m) =>
    m && typeof m === 'object' && 'roleIds' in m ? { ...m, roleIds: normalizeRoleIds((m as any).roleIds) } : m
  );
}

// Monto de un rol desde el formulario ("350.000", 350000, ''): número >= 0 o null
function parseRateAmount(raw: unknown): number | null | 'invalid' {
  if (raw === null || raw === undefined || raw === '') return null;
  const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw.replace(/\./g, '').replace(',', '.')) : NaN;
  if (!Number.isFinite(n) || n < 0) return 'invalid';
  return Math.round(n * 100) / 100;
}

type RoleInputResult =
  | { ok: true; value: { name?: string; rate?: RoleRate; archived?: boolean } }
  | { ok: false; error: string };

// Alta / edición de un rol (solo admin). `requireName` en el alta.
// El monto va con su fecha "desde" (sin fecha = `today`).
export function parseRoleInput(body: any, today: string, requireName: boolean): RoleInputResult {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Datos inválidos' };
  const value: { name?: string; rate?: RoleRate; archived?: boolean } = {};

  if (requireName || body.name !== undefined) {
    const name = normalizeRoleName(body.name);
    if (!name) return { ok: false, error: 'Falta el nombre del rol' };
    value.name = name;
  }

  const amount = parseRateAmount(body.amount);
  if (amount === 'invalid') return { ok: false, error: 'Monto inválido' };
  if (amount !== null) {
    const from = body.from === undefined || body.from === null || body.from === '' ? today : body.from;
    if (!isDay(from)) return { ok: false, error: 'Fecha "desde" inválida' };
    value.rate = { amount, from };
  }

  if (body.archived !== undefined) value.archived = body.archived === true;
  return { ok: true, value };
}

// Rol escrito a mano (datos viejos) → roles del catálogo. Separa los combinados
// ("IL / AT") y busca cada parte en la tabla de equivalencias. Si alguna parte
// no tiene equivalencia devuelve null (queda el texto como está).
export function legacyRolToRoleIds(
  rol: string | undefined,
  aliases: Record<string, string>, // roleKey(texto viejo) → nombre del rol
  rolesByName: Map<string, string> // roleKey(nombre) → _id
): string[] | null {
  const text = (rol ?? '').trim();
  if (!text || roleKey(text) === 'sin rol') return null;
  const ids: string[] = [];
  for (const part of text.split('/')) {
    const key = roleKey(part);
    if (!key) continue;
    const name = aliases[key] ?? part;
    const id = rolesByName.get(roleKey(name));
    if (!id) return null;
    if (!ids.includes(id)) ids.push(id);
  }
  return ids.length ? ids : null;
}
