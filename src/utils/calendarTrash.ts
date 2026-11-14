// src/utils/calendarTrash.ts
// Papelera de eventos de calendarios extras (Gastos, Ingresos, Reuniones…).
// Al borrar se guarda una copia completa en `calendar_events_deleted`; durante
// UNDO_SECONDS se ofrece "Deshacer", y después se puede recuperar a mano.
// Restaurar vuelve a insertar el evento con el MISMO _id (así sus líneas de
// Cobros de STAFF, que lo referencian, vuelven a estar enlazadas).
// Lógica pura y testeada.

export const UNDO_SECONDS = 30;

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
