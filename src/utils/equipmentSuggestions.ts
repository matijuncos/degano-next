/**
 * Selección "inteligente" de unidades de equipamiento y sugerencias de
 * reemplazo. Lógica pura (testeada); la disponibilidad sigue siendo la de
 * siempre (solapamiento de fechas contra `scheduledUses`, ver
 * equipmentAvailability), esto solo decide CUÁL unidad conviene.
 */
import { conflictingUses, ScheduledUse } from './equipmentAvailability';

// Día calendario en hora argentina (UTC-03:00 fijo, como el resto de la app)
const AR_OFFSET_MS = -3 * 60 * 60 * 1000;
const arDay = (v: Date | string) => new Date(new Date(v).getTime() + AR_OFFSET_MS).toISOString().slice(0, 10);
const DAY_MS = 24 * 60 * 60 * 1000;
const collator = new Intl.Collator('es', { sensitivity: 'base', numeric: true });

/** Días (AR, 'AAAA-MM-DD') que toca un rango. Tope de 31 por seguridad. */
export function daysTouched(start: Date | string, end: Date | string): Set<string> {
  const out = new Set<string>();
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (isNaN(s) || isNaN(e)) return out;
  out.add(arDay(new Date(s)));
  for (let t = s + DAY_MS, i = 0; t < e && i < 31; t += DAY_MS, i++) out.add(arDay(new Date(t)));
  out.add(arDay(new Date(e)));
  return out;
}

/**
 * ¿La unidad tiene otra reserva el MISMO día (aunque no se superponga en
 * horario)? Ej. almuerzo 13-17 y fiesta 21-04: está "libre", pero conviene
 * no usarla porque ese día ya se mueve de un evento a otro.
 */
export function usedSameDay(
  uses: ScheduledUse[] | null | undefined,
  start: Date | string,
  end: Date | string,
  ignoreEventId?: string | null
): boolean {
  const days = daysTouched(start, end);
  return (uses || []).some((u) => {
    if (!u || (ignoreEventId && String(u.eventId) === String(ignoreEventId))) return false;
    for (const d of daysTouched(u.startDate, u.endDate)) if (days.has(d)) return true;
    return false;
  });
}

/**
 * Ordena unidades YA disponibles por conveniencia: primero las que no se usan
 * ese día, después por código (orden natural: 2 antes que 10). Sin fechas,
 * solo por código. Devuelve una copia.
 */
export function rankUnitsForEvent<T extends { code?: string; scheduledUses?: ScheduledUse[] }>(
  units: T[],
  start?: Date | string | null,
  end?: Date | string | null,
  ignoreEventId?: string | null
): T[] {
  const busy = (u: T) => (start && end && usedSameDay(u.scheduledUses, start, end, ignoreEventId) ? 1 : 0);
  return [...units]
    .map((u) => ({ u, b: busy(u) }))
    .sort((a, b) => a.b - b.b || collator.compare(String(a.u.code ?? ''), String(b.u.code ?? '')))
    .map((x) => x.u);
}

export type UnitProblem =
  | { kind: 'baja'; reason: string }
  | { kind: 'ocupado'; busyWith: ScheduledUse[] };

export interface ReplacementSuggestion {
  problem: UnitProblem;
  replacement: any | null; // unidad del mismo equipo sugerida (null = no hay)
  // Todas las unidades libres del mismo equipo (para elegir otra), ordenadas
  // igual que la sugerencia. sameDay = se usa ese día en otro evento.
  alternatives: { unit: any; sameDay: boolean }[];
  // Otros modelos de la misma categoría con unidades libres: la mejor unidad
  // de cada uno (para reemplazar por un equivalente)
  equivalents: { name: string; unit: any; sameDay: boolean; freeCount: number }[];
}

/**
 * Para cada unidad del evento con problema (dada de baja/en reparación, u
 * ocupada en OTRO evento en esas fechas) sugiere otra unidad del MISMO equipo
 * que esté libre. Cada unidad libre se sugiere una sola vez.
 *  - pool: equipos con `scheduledUses` (la lista de /api/equipment)
 *  - liveUnavailableReason(id): motivo de baja/reparación actual o null
 */
export function suggestReplacements(
  eventUnits: { _id: string; name: string }[],
  pool: any[],
  opts: {
    start?: Date | string | null;
    end?: Date | string | null;
    eventId?: string | null;
    liveUnavailableReason: (id: string) => string | null;
  }
): Map<string, ReplacementSuggestion> {
  const { start, end, eventId, liveUnavailableReason } = opts;
  const poolById = new Map(pool.map((p) => [String(p._id), p]));
  const inEvent = new Set(eventUnits.map((u) => String(u._id)));
  const taken = new Set<string>();
  const hasDates = !!(start && end);
  const conflictsOf = (p: any) =>
    hasDates ? conflictingUses(start!, end!, p?.scheduledUses, { ignoreEventId: eventId || undefined }) : [];
  const isFree = (p: any) => !liveUnavailableReason(String(p._id)) && conflictsOf(p).length === 0;

  const out = new Map<string, ReplacementSuggestion>();
  for (const unit of eventUnits) {
    const id = String(unit._id);
    const reason = liveUnavailableReason(id);
    const busyWith = reason ? [] : conflictsOf(poolById.get(id));
    if (!reason && busyWith.length === 0) continue;
    const problem: UnitProblem = reason ? { kind: 'baja', reason } : { kind: 'ocupado', busyWith };

    // Libres del mismo equipo que no están en el evento
    const free = rankUnitsForEvent(
      pool.filter((p) => p.name === unit.name && !inEvent.has(String(p._id)) && isFree(p)),
      start,
      end,
      eventId
    );
    // Sugerencia: la mejor que no se haya sugerido ya para otra unidad
    const replacement = free.find((p) => !taken.has(String(p._id))) ?? null;
    if (replacement) taken.add(String(replacement._id));
    const sameDayOf = (p: any) => (hasDates ? usedSameDay(p.scheduledUses, start!, end!, eventId) : false);
    const alternatives = free.map((p) => ({ unit: p, sameDay: sameDayOf(p) }));
    const categoryId = poolById.get(id)?.categoryId ?? (unit as any).categoryId;
    const equivalents = equivalentModels(
      unit.name,
      categoryId,
      pool.filter((p) => !inEvent.has(String(p._id)) && isFree(p)),
      (units) => rankUnitsForEvent(units, start, end, eventId)
    ).map((m) => ({ name: m.name, unit: m.units[0], sameDay: sameDayOf(m.units[0]), freeCount: m.units.length }));
    out.set(id, { problem, replacement, alternatives, equivalents });
  }
  return out;
}

/**
 * Validación del SERVIDOR: equipos que ya están reservados por otro evento en
 * esas fechas. Se usa al guardar para que nunca quede un equipo asignado dos
 * veces (aunque la pantalla esté desactualizada o dos personas guarden a la vez).
 */
export function findBookingConflicts(
  docs: { _id: any; name?: string; code?: string; scheduledUses?: ScheduledUse[] }[],
  start: Date | string,
  end: Date | string,
  eventId?: string | null
): { name: string; code: string; busyWith: ScheduledUse[] }[] {
  return docs
    .map((d) => ({
      name: d.name || 'Equipo',
      code: d.code || '',
      busyWith: conflictingUses(start, end, d.scheduledUses, { ignoreEventId: eventId || undefined })
    }))
    .filter((c) => c.busyWith.length > 0);
}

/** Mensaje legible para el 409 del servidor. */
export function bookingConflictMessage(conflicts: { name: string; code: string; busyWith: ScheduledUse[] }[]): string {
  const lines = conflicts.slice(0, 5).map((c) => {
    const u = c.busyWith[0];
    const where = [u?.eventType || u?.eventName, u?.location].filter(Boolean).join(' - ');
    return `${c.name}${c.code ? ` (${c.code})` : ''}${where ? ` → ${where}` : ''}`;
  });
  const more = conflicts.length > 5 ? ` y ${conflicts.length - 5} más` : '';
  return `Estos equipos ya están reservados para otro evento en esas fechas: ${lines.join('; ')}${more}. Actualizá la página y elegí otra unidad.`;
}

// ─────────────────────────────────────────────────────────────────────────
// Equivalentes y aplicación de sets con faltantes
// ─────────────────────────────────────────────────────────────────────────

/**
 * Otros modelos de la MISMA categoría con unidades libres (sin las ya
 * tomadas). Cada modelo con sus unidades libres ya ordenadas (mejor primero).
 * Orden: más unidades libres primero, después por nombre.
 */
export function equivalentModels(
  name: string,
  categoryId: string | null | undefined,
  freePool: any[],
  rank: (units: any[]) => any[] = (u) => u
): { name: string; units: any[] }[] {
  if (!categoryId) return [];
  const byName = new Map<string, any[]>();
  for (const u of freePool) {
    if (u.name === name || String(u.categoryId) !== String(categoryId)) continue;
    byName.set(u.name, [...(byName.get(u.name) || []), u]);
  }
  return Array.from(byName.entries())
    .map(([n, units]) => ({ name: n, units: rank(units) }))
    .sort((a, b) => b.units.length - a.units.length || collator.compare(a.name, b.name));
}

export type MissingChoice =
  | { kind: 'tercerizar' }
  | { kind: 'omitir' }
  | { kind: 'equivalente'; name: string };

export interface SetItemPlan {
  name: string;
  categoryId: string | null;
  required: number;
  chosen: any[]; // unidades del mismo equipo
  missing: number; // lo que falta después de las del mismo equipo
  equivalents: { name: string; units: any[] }[]; // opciones para lo que falta
}

/**
 * Plan de un set: para cada ítem, las mejores unidades libres del mismo
 * equipo y, si faltan, los modelos equivalentes disponibles. Primero se
 * reparten las unidades "propias" de TODOS los ítems y recién después se
 * ofrecen equivalentes (así un ítem no le saca unidades a otro del set).
 *  - freePool: unidades libres para las fechas (ya sin las que están en el evento)
 */
export function planSet(
  items: { equipmentName: string; quantity: number }[],
  freePool: any[],
  rank: (units: any[]) => any[] = (u) => u,
  // Categoría de un equipo aunque NO tenga unidades libres (todas ocupadas):
  // justo el caso en el que más hacen falta los equivalentes
  categoryIdOf?: (name: string) => string | null
): SetItemPlan[] {
  const taken = new Set<string>();
  const categoryOf = (n: string) =>
    categoryIdOf?.(n) ?? freePool.find((u) => u.name === n)?.categoryId ?? null;
  const base = items.map((item) => {
    const own = rank(freePool.filter((u) => u.name === item.equipmentName && !taken.has(String(u._id))));
    const chosen = own.slice(0, Math.max(0, item.quantity));
    chosen.forEach((u) => taken.add(String(u._id)));
    return { item, chosen };
  });
  const rest = freePool.filter((u) => !taken.has(String(u._id)));
  return base.map(({ item, chosen }) => {
    const missing = Math.max(0, item.quantity - chosen.length);
    const categoryId = categoryOf(item.equipmentName);
    return {
      name: item.equipmentName,
      categoryId,
      required: item.quantity,
      chosen,
      missing,
      equivalents: missing > 0 ? equivalentModels(item.equipmentName, categoryId, rest, rank) : []
    };
  });
}

/**
 * Resultado final de aplicar el set según lo elegido para cada faltante:
 * unidades reales a agregar + "a tercerizar". Un equivalente que no alcanza
 * completa el resto como tercerizado (nunca queda nada afuera sin querer).
 * `categoryIdOf` resuelve la categoría de un ítem sin unidades en el pool.
 */
export function resolveSetApplication(
  plans: SetItemPlan[],
  choices: Record<string, MissingChoice | undefined>,
  categoryIdOf: (name: string) => string | null = () => null
): { units: any[]; extras: { name: string; categoryId: string | null; quantity: number }[] } {
  const units: any[] = [];
  const extras: { name: string; categoryId: string | null; quantity: number }[] = [];
  const takenEq = new Set<string>();
  for (const p of plans) {
    units.push(...p.chosen);
    if (p.missing === 0) continue;
    const choice = choices[p.name] ?? { kind: 'tercerizar' };
    if (choice.kind === 'omitir') continue;
    let left = p.missing;
    if (choice.kind === 'equivalente') {
      const eq = p.equivalents.find((e) => e.name === choice.name);
      const pick = (eq?.units || []).filter((u) => !takenEq.has(String(u._id))).slice(0, left);
      pick.forEach((u) => takenEq.add(String(u._id)));
      units.push(...pick);
      left -= pick.length;
    }
    if (left > 0) extras.push({ name: p.name, categoryId: p.categoryId ?? categoryIdOf(p.name), quantity: left });
  }
  return { units, extras };
}
