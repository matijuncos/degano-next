/**
 * Choques de equipos al cambiar el RANGO de reserva de un evento (extenderlo,
 * adelantar la llegada, etc.). Lógica pura (testeada): la usa `updateEvent`
 * para devolver el 409 con candidatos y para validar/aplicar lo que el usuario
 * eligió en la ventana (`DateConflictModal`).
 *
 * Por cada equipo que choca, opciones en este orden de preferencia:
 *  1. otra unidad en ESTE evento (libre en todo el rango nuevo)
 *  2. cambiar la unidad en el OTRO evento (solo si choca con uno solo)
 *  3. tercerizar / 4. quitar de este evento
 *  5. liberar la reserva sobrante (su evento no existe o ya no tiene ese equipo)
 */
import { conflictingUses, isEquipmentUnavailable } from './equipmentAvailability';
import { rankUnitsForEvent, usedSameDay, equivalentModels } from './equipmentSuggestions';
import { PRICE_FIELDS, stripPriceFields } from './equipmentPrices';
import { arDateTimeLabel } from './reservationRange';
import type { CreateHistoryEntryParams } from '../types/equipmentHistory';

export interface CandidateUnit {
  _id: string;
  name: string;
  code: string;
  sameDay: boolean; // se usa ese día en otro evento (sin superponerse)
  isEquivalent: boolean; // otro modelo de la misma categoría
}

export interface ConflictBusy {
  eventId: string;
  eventName: string;
  eventType: string;
  location: string;
  startDate: string;
  endDate: string;
  stale: boolean; // su evento no existe o ya no tiene este equipo
  otherEventEnded: boolean;
  otherEventInProgress: boolean;
  // el otro evento empieza DESPUÉS que el actual: por logística conviene cambiar
  // la unidad allá (la del evento que sale primero ya está preparada)
  otherStartsLater: boolean;
}

export interface DateConflict {
  equipmentId: string;
  name: string;
  code: string;
  categoryId: string | null;
  busyWith: ConflictBusy[];
  hereCandidates: CandidateUnit[];
  otherCandidates: CandidateUnit[];
}

export type ConflictResolution =
  | { equipmentId: string; action: 'replaceHere'; toId: string }
  | { equipmentId: string; action: 'replaceInOther'; otherEventId: string; toId: string }
  | { equipmentId: string; action: 'outsource' }
  | { equipmentId: string; action: 'remove' }
  | { equipmentId: string; action: 'releaseOrphan'; orphanEventId: string }
  // el OTRO evento se queda sin la unidad (la terceriza o la quita); el actual la conserva
  | { equipmentId: string; action: 'outsourceInOther'; otherEventId: string }
  | { equipmentId: string; action: 'removeInOther'; otherEventId: string };

/** Acciones que cambian el OTRO evento (el actual conserva su unidad). */
export const OTHER_EVENT_ACTIONS = ['replaceInOther', 'outsourceInOther', 'removeInOther'] as const;
const isOtherAction = (a: string) => (OTHER_EVENT_ACTIONS as readonly string[]).includes(a);

/** Otro evento referenciado por una reserva que choca. Rango = reservationStart → endDate. */
export interface OtherEventInfo {
  _id: string;
  equipmentIds: string[];
  start: Date;
  end: Date;
}

export interface NoticeChange {
  fromName: string;
  fromCode: string;
  toName: string;
  toCode: string;
  kind?: 'replace' | 'outsource' | 'remove'; // sin kind = reemplazo (avisos viejos)
}

/** Texto de un cambio del aviso: "CNSL-03 → CNSL-07" / "TP-01 pasa a tercerizado". */
export function changeText(c: NoticeChange): string {
  const from = c.fromCode || c.fromName;
  if (c.kind === 'outsource') return `${from} pasa a tercerizado`;
  if (c.kind === 'remove') return `${from} se quitó del evento`;
  return `${from} → ${c.toCode || c.toName}`;
}

export interface EquipmentChangeNotice {
  id: string;
  at: string;
  byName: string;
  fromEventId: string;
  fromEventName: string;
  changes: NoticeChange[];
  seenAt?: string;
  seenByName?: string;
}

export type ResolutionError = {
  equipmentId: string;
  code: 'not_conflicting' | 'duplicate_to' | 'duplicate_resolution' | 'toId_busy' | 'other_not_allowed' | 'not_stale' | 'missing';
};

const MAX_CANDIDATES = 8;
const iso = (v: any) => new Date(v).toISOString();

/** Unidades libres en un rango, del mismo modelo primero y después equivalentes. */
function candidatesFor(
  target: { name: string; categoryId: string | null },
  pool: any[],
  exclude: Set<string>,
  start: Date,
  end: Date,
  ignoreEventId: string
): CandidateUnit[] {
  const free = pool.filter(
    (u) =>
      !exclude.has(String(u._id)) &&
      !isEquipmentUnavailable(u.outOfService) &&
      conflictingUses(start, end, u.scheduledUses, { ignoreEventId }).length === 0
  );
  const rank = (units: any[]) => rankUnitsForEvent(units, start, end, ignoreEventId);
  const same = rank(free.filter((u) => u.name === target.name));
  const equivalents = equivalentModels(target.name, target.categoryId, free, rank).flatMap((m) => m.units);
  return [...same, ...equivalents].slice(0, MAX_CANDIDATES).map((u) => ({
    _id: String(u._id),
    name: u.name || '',
    code: u.code || '',
    sameDay: usedSameDay(u.scheduledUses, start, end, ignoreEventId),
    isEquivalent: u.name !== target.name
  }));
}

export function buildConflictReport(args: {
  eventId: string;
  start: Date;
  end: Date;
  eventEquipmentIds: string[];
  conflictingIds: string[];
  pool: any[];
  otherEvents: Map<string, OtherEventInfo>;
  now: Date;
}): DateConflict[] {
  const { eventId, start, end, pool, otherEvents, now } = args;
  const poolById = new Map(pool.map((u) => [String(u._id), u]));
  const inThisEvent = new Set(args.eventEquipmentIds.map(String));

  return args.conflictingIds.flatMap((rawId) => {
    const id = String(rawId);
    const eq = poolById.get(id);
    if (!eq) return [];
    const categoryId = eq.categoryId ? String(eq.categoryId) : null;
    const busyWith: ConflictBusy[] = conflictingUses(start, end, eq.scheduledUses, { ignoreEventId: eventId }).map((u) => {
      const other = otherEvents.get(String(u.eventId));
      const stale = !other || !other.equipmentIds.map(String).includes(id);
      const oStart = other?.start ?? new Date(u.startDate);
      const oEnd = other?.end ?? new Date(u.endDate);
      return {
        eventId: String(u.eventId ?? ''),
        eventName: u.eventName || u.eventType || '',
        eventType: u.eventType || '',
        location: u.location || '',
        startDate: iso(u.startDate),
        endDate: iso(u.endDate),
        stale,
        otherEventEnded: oEnd.getTime() < now.getTime(),
        otherEventInProgress: oStart.getTime() <= now.getTime() && now.getTime() <= oEnd.getTime(),
        otherStartsLater: oStart.getTime() > start.getTime()
      };
    });
    const target = { name: eq.name || '', categoryId };
    const hereCandidates = candidatesFor(target, pool, inThisEvent, start, end, eventId);
    const only = busyWith.length === 1 ? busyWith[0] : null;
    const other = only && !only.stale && !only.otherEventEnded ? otherEvents.get(only.eventId) : undefined;
    const otherCandidates = other
      ? candidatesFor(target, pool, new Set([...other.equipmentIds.map(String), ...inThisEvent]), other.start, other.end, other._id)
      : [];
    return [{ equipmentId: id, name: eq.name || '', code: eq.code || '', categoryId, busyWith, hereCandidates, otherCandidates }];
  });
}

/**
 * La opción pre-elegida en la ventana (null = que elija el usuario).
 * Si el otro evento empieza DESPUÉS que el actual (y no está en curso), primero
 * se cambia la unidad allá: el equipo del evento que sale primero ya está
 * preparado (pedido del usuario, 21/11/2026). Si no, otra unidad en el actual.
 */
export function defaultResolution(c: DateConflict): ConflictResolution | null {
  const only = c.busyWith.length === 1 ? c.busyWith[0] : null;
  if (only?.stale) return { equipmentId: c.equipmentId, action: 'releaseOrphan', orphanEventId: only.eventId };
  const inOther = (): ConflictResolution | null =>
    only && !only.otherEventInProgress && c.otherCandidates[0]
      ? { equipmentId: c.equipmentId, action: 'replaceInOther', otherEventId: only.eventId, toId: c.otherCandidates[0]._id }
      : null;
  if (only?.otherStartsLater && inOther()) return inOther();
  if (c.hereCandidates[0]) return { equipmentId: c.equipmentId, action: 'replaceHere', toId: c.hereCandidates[0]._id };
  return inOther();
}

/**
 * Pre-elegidas de TODOS los choques en una pasada: una unidad que ya se
 * pre-eligió para un equipo no se repite en otro (si no, el servidor rechaza
 * con `duplicate_to`). Sin unidad libre acá cae al otro evento, o null.
 */
export function defaultResolutions(conflicts: DateConflict[]): Map<string, ConflictResolution | null> {
  const taken = new Set<string>();
  const out = new Map<string, ConflictResolution | null>();
  for (const c of conflicts) {
    const free = (list: CandidateUnit[]) => list.filter((u) => !taken.has(u._id));
    const r = defaultResolution({ ...c, hereCandidates: free(c.hereCandidates), otherCandidates: free(c.otherCandidates) });
    if (r && 'toId' in r) taken.add(r.toId);
    out.set(c.equipmentId, r);
  }
  return out;
}

/** ¿La misma unidad elegida para dos equipos? */
export function hasDuplicateTargets(resolutions: ConflictResolution[]): boolean {
  const ids = resolutions.flatMap((r) => ('toId' in r ? [String(r.toId)] : []));
  return new Set(ids).size !== ids.length;
}

/** Mensaje del 409 cuando lo elegido no vale. */
export function resolutionErrorMessage(errors: ResolutionError[]): string {
  return errors.some((e) => e.code === 'duplicate_to')
    ? 'Elegiste la misma unidad para dos equipos. Elegí otra para uno de ellos.'
    : 'Los equipos cambiaron mientras elegías. Revisá de nuevo.';
}

/** Descarta lo elegido para equipos que ya no chocan (ej. movieron el otro evento mientras se elegía). */
export function pruneResolutions(report: DateConflict[], resolutions: ConflictResolution[]): ConflictResolution[] {
  const ids = new Set(report.map((c) => c.equipmentId));
  return resolutions.filter((r) => ids.has(String(r.equipmentId)));
}

/** Historial "Reserva actualizada" de equipos cuya reserva cambió de fechas (regla 1). */
export function reservationUpdateHistory(
  rows: { _id: any; name?: string; code?: string }[],
  info: { eventId: string; type?: string; lugar?: string; fullName?: string; start: Date; end: Date; userId?: string; reason: string }
): CreateHistoryEntryParams[] {
  return rows.map((eq) => ({
    equipmentId: String(eq._id),
    equipmentName: eq.name || '',
    equipmentCode: eq.code,
    action: 'uso_evento' as const,
    userId: info.userId,
    eventId: String(info.eventId),
    eventName: info.type,
    eventDate: info.start,
    eventEndDate: info.end,
    eventLocation: info.lugar,
    eventClientName: info.fullName,
    details: `Reserva actualizada (${info.reason}): ${arDateTimeLabel(info.start)} a ${arDateTimeLabel(info.end)} - ${info.type || ''} - ${info.lugar || ''}`
  }));
}

/** Lo elegido en la ventana para un equipo (antes de armar la resolución). */
export type ConflictChoice = { action: ConflictResolution['action']; toId?: string; otherEventId?: string };

/**
 * ¿Lo elegido sigue valiendo con los choques (re)calculados? Una opción sobre el
 * OTRO evento vale solo para ESE evento: si ahora choca con otro, se descarta
 * (nunca se aplica en silencio a un evento que el usuario no eligió).
 */
export function isChoiceValid(c: DateConflict, ch: ConflictChoice | undefined): boolean {
  if (!ch) return false;
  const only = c.busyWith.length === 1 ? c.busyWith[0] : null;
  if (isOtherAction(ch.action)) {
    if (!only || only.stale || only.otherEventEnded || only.eventId !== ch.otherEventId) return false;
    return ch.action !== 'replaceInOther' || c.otherCandidates.some((u) => u._id === ch.toId);
  }
  if (ch.action === 'replaceHere') return c.hereCandidates.some((u) => u._id === ch.toId);
  if (ch.action === 'releaseOrphan') return !!only?.stale;
  return true;
}

/**
 * Choques que SIGUEN después de aplicar lo elegido: no cuenta una reserva del
 * evento al que se le cambia/terceriza/quita la unidad, ni una sobrante que se
 * libera. Se chequea ANTES de tocar otros eventos (si algo sigue chocando, no
 * se escribe nada).
 */
export function unresolvedAfter(conflicts: DateConflict[], resolutions: ConflictResolution[]): DateConflict[] {
  const byId = new Map(resolutions.map((r) => [String(r.equipmentId), r]));
  return conflicts.filter((c) => {
    const r = byId.get(c.equipmentId);
    const releasedEvent =
      r && isOtherAction(r.action) ? String((r as any).otherEventId) : r?.action === 'releaseOrphan' ? String(r.orphanEventId) : null;
    return c.busyWith.some((b) => b.eventId !== releasedEvent);
  });
}

/** Valida lo elegido contra los choques recalculados en el servidor. [] = todo bien. */
export function validateResolutions(report: DateConflict[], resolutions: ConflictResolution[]): ResolutionError[] {
  const byId = new Map(report.map((c) => [c.equipmentId, c]));
  const errors: ResolutionError[] = [];
  const usedTo = new Set<string>();
  const resolved = new Set<string>();

  for (const r of resolutions) {
    const c = byId.get(String(r.equipmentId));
    if (!c) {
      errors.push({ equipmentId: r.equipmentId, code: 'not_conflicting' });
      continue;
    }
    if (resolved.has(c.equipmentId)) {
      // Dos resoluciones para el mismo equipo: se aplicarían las dos (ej. reserva fantasma)
      errors.push({ equipmentId: c.equipmentId, code: 'duplicate_resolution' });
      continue;
    }
    resolved.add(c.equipmentId);
    const only = c.busyWith.length === 1 ? c.busyWith[0] : null;
    if (isOtherAction(r.action)) {
      const otherId = 'otherEventId' in r ? String(r.otherEventId) : '';
      if (!only || only.stale || only.otherEventEnded || only.eventId !== otherId) {
        errors.push({ equipmentId: c.equipmentId, code: 'other_not_allowed' });
        continue;
      }
    }
    if (r.action === 'replaceHere' || r.action === 'replaceInOther') {
      const list = r.action === 'replaceHere' ? c.hereCandidates : c.otherCandidates;
      if (!list.some((u) => u._id === String(r.toId))) {
        errors.push({ equipmentId: c.equipmentId, code: 'toId_busy' });
        continue;
      }
      if (usedTo.has(String(r.toId))) {
        errors.push({ equipmentId: c.equipmentId, code: 'duplicate_to' });
        continue;
      }
      usedTo.add(String(r.toId));
    } else if (r.action === 'releaseOrphan') {
      if (!only || !only.stale || only.eventId !== String(r.orphanEventId)) {
        errors.push({ equipmentId: c.equipmentId, code: 'not_stale' });
      }
    }
  }
  for (const c of report) if (!resolved.has(c.equipmentId)) errors.push({ equipmentId: c.equipmentId, code: 'missing' });
  return errors;
}

// Campos del documento del equipo que no van en el renglón del evento
const VOLATILE_FIELDS = ['scheduledUses', 'busyWith', 'nearWith', 'history', 'outOfService'];

/** Renglón del evento para la unidad nueva: hereda categoría y nota del anterior; precio real de la base. */
export function replacementRow(old: any, unit: any): any {
  const fresh: any = stripPriceFields({ ...unit });
  for (const f of VOLATILE_FIELDS) delete fresh[f];
  for (const f of PRICE_FIELDS) if (unit[f] !== undefined) fresh[f] = unit[f];
  return {
    ...fresh,
    _id: String(unit._id),
    mainCategoryId: old.mainCategoryId,
    mainCategoryName: old.mainCategoryName,
    ...(old.note ? { note: old.note } : {})
  };
}

/**
 * Lo que cambia en ESTE evento (equipos y tercerizados). `unitsById` = las
 * unidades `toId` leídas de la base (con precios). `replaceInOther` y
 * `releaseOrphan` no tocan este evento.
 */
export function applyLocalResolutions(
  equipment: any[],
  extraEquipment: any[],
  resolutions: ConflictResolution[],
  unitsById: Map<string, any>
): { equipment: any[]; extraEquipment: any[] } {
  const byId = new Map(resolutions.map((r) => [String(r.equipmentId), r]));
  let extra = [...(extraEquipment || [])];
  const out: any[] = [];
  for (const row of equipment || []) {
    const r = byId.get(String(row._id));
    if (!r || isOtherAction(r.action) || r.action === 'releaseOrphan') {
      out.push(row);
    } else if (r.action === 'replaceHere') {
      const unit = unitsById.get(String(r.toId));
      out.push(unit ? replacementRow(row, unit) : row);
    } else if (r.action === 'outsource') {
      const i = extra.findIndex(
        (x) => x.name === row.name && (!x.mainCategoryName || x.mainCategoryName === row.mainCategoryName)
      );
      if (i >= 0) {
        extra = extra.map((x, j) => (j === i ? { ...x, quantity: (Number(x.quantity) || 0) + 1 } : x));
      } else {
        extra.push({ name: row.name, categoryId: row.categoryId, mainCategoryName: row.mainCategoryName, quantity: 1 });
      }
    }
    // 'remove': no se agrega
  }
  return { equipment: out, extraEquipment: extra };
}

export function buildChangeNotice(args: {
  byName: string;
  fromEventId: string;
  fromEventName: string;
  now: Date;
  changes: EquipmentChangeNotice['changes'];
}): EquipmentChangeNotice {
  const id =
    globalThis.crypto?.randomUUID?.() ?? `${args.now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return {
    id,
    at: args.now.toISOString(),
    byName: args.byName,
    fromEventId: String(args.fromEventId),
    fromEventName: args.fromEventName,
    changes: args.changes.map(({ fromName, fromCode, toName, toCode, kind }) => ({
      fromName,
      fromCode,
      toName,
      toCode,
      ...(kind ? { kind } : {})
    }))
  };
}

/** Lo que se cambió en otros eventos (viene en la respuesta como `applied`). */
export type AppliedChange = NoticeChange & { otherEventId: string; otherEventName: string };

/** "En Cumpleaños de 50: CNSL-03 → CNSL-07, TP-01 pasa a tercerizado" (un tramo por evento). */
export function appliedSummary(applied: AppliedChange[]): string {
  const byEvent = new Map<string, AppliedChange[]>();
  for (const a of applied) byEvent.set(a.otherEventName, [...(byEvent.get(a.otherEventName) || []), a]);
  return Array.from(byEvent.entries())
    .map(([name, list]) => `En ${name || 'el otro evento'}: ${list.map(changeText).join(', ')}`)
    .join('. ');
}

export type OtherEventOp = { fromId: string; kind: 'replace' | 'outsource' | 'remove'; toId?: string };

/** Cambios en OTROS eventos, agrupados por evento (UN aviso por evento). */
export function otherEventOps(resolutions: ConflictResolution[]): Map<string, OtherEventOp[]> {
  const out = new Map<string, OtherEventOp[]>();
  for (const r of resolutions) {
    let op: OtherEventOp | null = null;
    if (r.action === 'replaceInOther') op = { fromId: String(r.equipmentId), kind: 'replace', toId: String(r.toId) };
    else if (r.action === 'outsourceInOther') op = { fromId: String(r.equipmentId), kind: 'outsource' };
    else if (r.action === 'removeInOther') op = { fromId: String(r.equipmentId), kind: 'remove' };
    if (!op) continue;
    const id = String((r as any).otherEventId);
    out.set(id, [...(out.get(id) || []), op]);
  }
  return out;
}

/** Campos que solo escribe el servidor: nunca se toman del cuerpo del cliente. */
export function stripServerOnlyFields<T extends Record<string, any>>(body: T): T {
  const { equipmentChangeNotices: _n, ...rest } = body;
  return rest as T;
}
