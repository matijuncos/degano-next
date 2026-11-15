// src/utils/equipmentRelease.ts
// ¿Qué equipos marcados "En Evento" se pueden devolver a Depósito?
// REGLA: JAMÁS mostrar disponible algo que está en uso. Ante la duda, NO se
// libera (que diga "en uso" sin estarlo es molesto; lo contrario es grave).
// Se libera SOLO si se cumple todo:
//  - no tiene una reserva en curso,
//  - no tiene una reserva de HOY (día argentino) que todavía no terminó,
//  - su último uso tiene fecha válida y ya terminó,
//  - no figura en ningún evento real en curso o de las próximas 24 h (`busyIds`,
//    `liveEventEquipmentIds` sobre la colección events: red de seguridad por si
//    scheduledUses quedara mal).
// Lógica pura y testeada. La usa la limpieza de /api/equipment.

const AR_OFFSET_MS = 3 * 60 * 60 * 1000; // Argentina: UTC-03:00 fijo

export interface ReleaseCandidate {
  _id: unknown;
  lastUsedEndDate?: unknown;
  scheduledUses?: { startDate?: unknown; endDate?: unknown }[] | null;
}

const toTime = (v: unknown): number => {
  if (v == null || v === '') return NaN;
  return new Date(v as any).getTime();
};

// Último milisegundo del día argentino de `now`
export function endOfArgentineDay(now: Date): Date {
  const day = new Date(now.getTime() - AR_OFFSET_MS).toISOString().slice(0, 10);
  return new Date(`${day}T23:59:59.999-03:00`);
}

export function pickReleasable<T extends ReleaseCandidate>(candidates: T[], busyIds: Set<string>, now: Date): T[] {
  const t = now.getTime();
  const endOfToday = endOfArgentineDay(now).getTime();
  return candidates.filter((eq) => {
    if (busyIds.has(String(eq._id))) return false;

    const lastEnd = toTime(eq.lastUsedEndDate);
    if (!Number.isFinite(lastEnd) || lastEnd >= t) return false;

    for (const u of eq.scheduledUses ?? []) {
      const start = toTime(u?.startDate);
      const end = toTime(u?.endDate);
      // Fechas rotas: no se puede asegurar nada → no se libera
      if (!Number.isFinite(start) || !Number.isFinite(end)) return false;
      // En curso, o de hoy y todavía sin terminar
      if (start <= endOfToday && end >= t) return false;
    }
    return true;
  });
}

const DAY_MS = 24 * 60 * 60 * 1000;

// Equipos de eventos reales en curso o que empiezan en las próximas 24 h (red de
// seguridad contra scheduledUses mal cargados). Fechas Date o texto; un evento
// con fechas rotas cuenta como ocupado, por las dudas.
export function liveEventEquipmentIds(
  events: { date?: unknown; endDate?: unknown; equipment?: { _id?: unknown }[] | null }[],
  now: Date
): Set<string> {
  const t = now.getTime();
  const horizon = t + DAY_MS;
  const busy = new Set<string>();
  for (const ev of events) {
    const start = toTime(ev.date);
    const end = toTime(ev.endDate ?? ev.date);
    const live = !Number.isFinite(start) || !Number.isFinite(end) || (start <= horizon && end >= t);
    if (!live) continue;
    for (const e of ev.equipment ?? []) if (e?._id != null) busy.add(String(e._id));
  }
  return busy;
}

export interface ActivationCandidate {
  _id: unknown;
  lastUsedStartDate?: unknown;
  lastUsedEndDate?: unknown;
  outOfService?: { isOut?: boolean; reason?: string | null } | null;
  scheduledUses?: { eventId?: unknown; eventName?: string; location?: string; startDate?: unknown; endDate?: unknown }[] | null;
}

/**
 * Cuando una reserva EMPIEZA, el equipo pasa a "En uso" (igual que lo marca
 * postEvent si el evento es de hoy). Sin esto, un evento cargado con
 * anticipación mostraba sus equipos "Disponible" mientras ocurría.
 * - Un equipo dado de baja a mano (reparación, etc.) NUNCA se pisa.
 * - Si ya figura "En uso" con ESE evento, no se toca (no repite historial).
 * - Si figura "En uso" de otro evento (ej. trabado de uno viejo), se actualiza.
 */
export function pickActivations<T extends ActivationCandidate>(candidates: T[], now: Date) {
  const t = now.getTime();
  const out: { _id: T['_id']; set: Record<string, unknown>; use: NonNullable<T['scheduledUses']>[number] }[] = [];
  for (const eq of candidates) {
    const oos = eq.outOfService;
    if (oos?.isOut && oos.reason !== 'En Evento') continue; // baja manual: no se toca
    const current = (eq.scheduledUses ?? [])
      .filter((u) => {
        const s = toTime(u?.startDate);
        const e = toTime(u?.endDate);
        return Number.isFinite(s) && Number.isFinite(e) && s <= t && e >= t;
      })
      .sort((a, b) => toTime(a.startDate) - toTime(b.startDate))[0];
    if (!current) continue;
    const start = toTime(current.startDate);
    const end = toTime(current.endDate);
    const alreadyThis =
      oos?.isOut && oos.reason === 'En Evento' && toTime(eq.lastUsedStartDate) === start && toTime(eq.lastUsedEndDate) === end;
    if (alreadyThis) continue;
    out.push({
      _id: eq._id,
      set: {
        location: current.location,
        lastUsedStartDate: new Date(start),
        lastUsedEndDate: new Date(end),
        outOfService: {
          isOut: true,
          reason: 'En Evento',
          details: [current.eventName, current.location].filter(Boolean).join(' - ')
        }
      },
      use: current
    });
  }
  return out;
}
