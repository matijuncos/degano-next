// src/utils/venues.ts
// Panel de Lugares (colección `salons`). Lógica pura (testeada).
//
// Los eventos guardan el lugar POR NOMBRE (`lugar`) y una COPIA de sus datos
// (dirección, ciudad, provincia, contacto, Maps). Editar un lugar desde el panel
// actualiza esa copia en los eventos de HOY EN ADELANTE (decidido con Juan): los
// pasados conservan lo que figuraba en su momento.

export interface Salon {
  _id: string;
  name: string;
  city?: string;
  province?: string;
  address?: string;
  contactName?: string;
  contactPhone?: string;
  mapsUrl?: string;
}

// Campo del lugar → campo copiado en el evento
export const SALON_TO_EVENT_FIELD = {
  name: 'lugar',
  address: 'eventAddress',
  city: 'eventCity',
  province: 'eventProvince',
  contactName: 'venueContactName',
  contactPhone: 'venueContactPhone',
  mapsUrl: 'venueMapsUrl'
} as const;

export type SalonField = keyof typeof SALON_TO_EVENT_FIELD;
export const SALON_FIELDS = Object.keys(SALON_TO_EVENT_FIELD) as SalonField[];

// Sin espacios de más (adentro tampoco)
export function normalizeVenueText(raw: unknown, max = 200): string {
  return typeof raw === 'string' ? raw.replace(/\s+/g, ' ').trim().slice(0, max) : '';
}

// Cómo se comparan los nombres de lugar con el `lugar` de los eventos: sin
// mayúsculas ni espacios de más (mismo criterio que la consulta a Mongo)
export function venueMatchKey(name: string | undefined | null): string {
  return normalizeVenueText(name ?? '').toLowerCase();
}

// Para detectar posibles duplicados: además sin tildes ("Salón" = "salon")
export function venueLooseKey(name: string | undefined | null): string {
  return venueMatchKey(name).normalize('NFD').replace(/[̀-ͯ]/g, '');
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Filtro de Mongo para los eventos de un lugar: mismo nombre sin importar
// mayúsculas ni espacios al principio/fin o repetidos en el medio
export function venueNameFilter(name: string): { $regex: string; $options: string } {
  const words = normalizeVenueText(name).split(' ').filter(Boolean).map(escapeRegex);
  return { $regex: `^\\s*${words.join('\\s+')}\\s*$`, $options: 'i' };
}

// Medianoche argentina de hoy (Argentina: UTC-03:00 fijo, sin horario de verano)
export function arTodayStart(now: Date): Date {
  const arMs = now.getTime() - 3 * 60 * 60 * 1000;
  const day = new Date(arMs).toISOString().slice(0, 10);
  return new Date(`${day}T03:00:00.000Z`);
}

// Eventos de hoy en adelante. `date` se guarda como string ISO y en eventos
// viejos como Date: Mongo compara por tipo, así que se cubren los dos.
export function fromTodayFilter(now: Date) {
  const start = arTodayStart(now);
  return { $or: [{ date: { $gte: start.toISOString() } }, { date: { $gte: start } }] };
}

type SalonInput = Record<SalonField, string>;

// Datos de un lugar desde el formulario: todo texto normalizado. El link de
// Maps se valida aparte (normalizeMapsUrl). `name` obligatorio.
export function parseSalonInput(body: any): { ok: true; value: Omit<SalonInput, 'mapsUrl'> } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Datos inválidos' };
  const name = normalizeVenueText(body.name, 120);
  if (!name) return { ok: false, error: 'Falta el nombre del lugar' };
  return {
    ok: true,
    value: {
      name,
      address: normalizeVenueText(body.address),
      city: normalizeVenueText(body.city, 100),
      province: normalizeVenueText(body.province, 100),
      contactName: normalizeVenueText(body.contactName, 120),
      contactPhone: normalizeVenueText(body.contactPhone, 60)
    }
  };
}

// Qué hay que cambiar en los eventos: solo los campos del lugar que cambiaron
// (así no se pisa un dato que alguien ajustó a mano en un evento puntual y que
// el cambio no toca)
export function eventSetFromSalonChange(prev: Partial<Salon>, next: Partial<Salon>): Record<string, string> {
  const set: Record<string, string> = {};
  for (const f of SALON_FIELDS) {
    if (!(f in next)) continue;
    const before = (prev[f] ?? '').trim();
    const after = (next[f] ?? '').trim();
    if (before !== after) set[SALON_TO_EVENT_FIELD[f]] = after;
  }
  return set;
}

// Todos los datos del lugar como campos del evento (al unir dos lugares, los
// eventos del que se va toman todo el destino)
export function eventSetFromSalon(salon: Partial<Salon>): Record<string, string> {
  const set: Record<string, string> = {};
  for (const f of SALON_FIELDS) set[SALON_TO_EVENT_FIELD[f]] = (salon[f] ?? '').trim();
  return set;
}

export interface VenueUsage {
  total: number;
  upcoming: number; // de hoy en adelante
}

export interface UsageRow {
  lugar: string | null;
  total: number;
  upcoming: number;
}

// Cuántos eventos tiene cada lugar (por _id del salón) y qué nombres de lugar
// usados en eventos no tienen ficha (para crearla)
export function summarizeVenueUsage(rows: UsageRow[], salons: Pick<Salon, '_id' | 'name'>[]) {
  const byKey = new Map(salons.map((s) => [venueMatchKey(s.name), s._id]));
  const usage: Record<string, VenueUsage> = {};
  const orphans = new Map<string, { name: string } & VenueUsage>();
  for (const r of rows) {
    const key = venueMatchKey(r.lugar);
    if (!key) continue;
    const id = byKey.get(key);
    if (id) {
      const u = (usage[id] ??= { total: 0, upcoming: 0 });
      u.total += r.total;
      u.upcoming += r.upcoming;
    } else {
      const o = orphans.get(key) ?? { name: normalizeVenueText(r.lugar), total: 0, upcoming: 0 };
      o.total += r.total;
      o.upcoming += r.upcoming;
      orphans.set(key, o);
    }
  }
  return { usage, orphans: [...orphans.values()].sort((a, b) => b.total - a.total) };
}

// Lugares que parecen el mismo (mismo nombre sin tildes/mayúsculas): ids agrupados
export function possibleDuplicates(salons: Pick<Salon, '_id' | 'name'>[]): Set<string> {
  const groups = new Map<string, string[]>();
  for (const s of salons) {
    const k = venueLooseKey(s.name);
    groups.set(k, [...(groups.get(k) ?? []), s._id]);
  }
  return new Set([...groups.values()].filter((g) => g.length > 1).flat());
}
