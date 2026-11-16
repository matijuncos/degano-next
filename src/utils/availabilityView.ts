// src/utils/availabilityView.ts
// Visualizador de disponibilidad por fechas (Equipamiento → "Disponibilidad").
// Toma la respuesta de GET /api/equipment?eventStartDate&eventEndDate (la misma
// regla de choques que al cargar un evento: ver equipmentAvailability) y la
// resume por equipo (nombre): total, disponibles, ocupados, fuera de servicio,
// y en qué eventos están los ocupados. Lógica pura y testeada.
import { categoryPaths, categoryWithDescendants, stockStatus } from './stockExport';
import { pickerDay } from './arrivalSuggestion';

const AR = '-03:00'; // Argentina: UTC-03:00 fijo

// Fecha del selector: Date (medianoche local) o texto 'YYYY-MM-DD' (Mantine 8)
const localDay = pickerDay;

/** Rango de días completos (00:00 del primero → 23:59:59.999 del último, hora AR), o null. */
export function rangeFromDays(from: Date | string | null | undefined, to: Date | string | null | undefined): { start: string; end: string } | null {
  const a = localDay(from);
  const b = localDay(to);
  if (!a || !b) return null;
  const start = new Date(`${a}T00:00:00.000${AR}`);
  const end = new Date(`${b}T23:59:59.999${AR}`);
  if (end.getTime() < start.getTime()) return null;
  return { start: start.toISOString(), end: end.toISOString() };
}

export interface BusyEvent {
  eventId: string;
  eventType?: string;
  clientName?: string;
  location?: string;
  startDate: string;
  endDate: string;
  units: number; // cuántas unidades de este equipo ocupa ese evento
}

export interface AvailabilityRow {
  name: string;
  path: string; // "SONIDO › CD Players"
  total: number;
  available: number;
  busy: number;
  outOfService: number;
  events: BusyEvent[];
}

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
const collator = new Intl.Collator('es', { sensitivity: 'base', numeric: true });

export function summarizeAvailability(
  equipment: any[] | null | undefined,
  categories: { _id: any; name: string; parentId?: any }[],
  { scopeCategoryId = null, search = '' }: { scopeCategoryId?: string | null; search?: string }
): AvailabilityRow[] {
  if (!Array.isArray(equipment)) return [];
  const paths = categoryPaths(categories || []);
  const scope = scopeCategoryId ? categoryWithDescendants(categories || [], scopeCategoryId) : null;
  const q = norm(search || '');
  const byKey = new Map<string, AvailabilityRow & { _ev: Map<string, BusyEvent> }>();

  for (const eq of equipment) {
    const catId = eq?.categoryId ? String(eq.categoryId) : '';
    if (scope && !scope.has(catId)) continue;
    const name = String(eq?.name || 'Sin nombre');
    if (q && !norm(name).includes(q)) continue;
    const path = (paths.get(catId) || ['Sin categoría']).join(' › ');
    const key = `${path}\u0000${name}`;
    let row = byKey.get(key);
    if (!row) {
      row = { name, path, total: 0, available: 0, busy: 0, outOfService: 0, events: [], _ev: new Map() };
      byKey.set(key, row);
    }
    row.total++;
    const status = stockStatus(eq);
    if (status === 'Disponible') row.available++;
    else if (status === 'En uso') {
      row.busy++;
      for (const u of eq.busyWith || []) {
        const id = String(u.eventId);
        const prev = row._ev.get(id);
        if (prev) prev.units++;
        else row._ev.set(id, { ...u, eventId: id, units: 1 });
      }
    } else row.outOfService++;
  }

  return Array.from(byKey.values())
    .map(({ _ev, ...r }) => ({ ...r, events: Array.from(_ev.values()) }))
    .sort((a, b) => collator.compare(a.path, b.path) || collator.compare(a.name, b.name));
}

