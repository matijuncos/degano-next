// src/utils/calendarTrash.ts
// Papelera de eventos de calendarios extras (Gastos, Ingresos, Reuniones…).
// Al borrar se guarda una copia completa en `calendar_events_deleted`; durante
// UNDO_SECONDS se ofrece "Deshacer", y después se puede recuperar a mano hasta
// que se limpia sola (TRASH_RETENTION_DAYS).
// Restaurar vuelve a insertar el evento con el MISMO _id (así sus líneas de
// Cobros de STAFF, que lo referencian, vuelven a estar enlazadas).
// Lógica pura y testeada.

export const UNDO_SECONDS = 30;

// La papelera se limpia sola: un índice TTL de MongoDB sobre `deletedAt` borra
// cada copia a los 15 días (lo hace la base, sin cron ni requests)
export const TRASH_RETENTION_DAYS = 15;
export const TRASH_TTL_SECONDS = TRASH_RETENTION_DAYS * 24 * 60 * 60;

export interface TrashEntry<T> {
  originalId: unknown;
  calendarId: unknown;
  event: T;
  deletedAt: Date;
  deletedBy: string;
}

export function toTrash<T extends { _id: unknown; calendarId?: unknown }>(
  event: T,
  { deletedBy, now }: { deletedBy: string; now: Date }
): TrashEntry<T> {
  return { originalId: event._id, calendarId: event.calendarId, event, deletedAt: now, deletedBy };
}

export const fromTrash = <T>(entry: Pick<TrashEntry<T>, 'event'>): T => entry.event;
