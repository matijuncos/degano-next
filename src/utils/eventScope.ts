// src/utils/eventScope.ts
// El "evento seleccionado" de la app (DeganoContext) es GLOBAL: es el último
// evento que se abrió. Usarlo sin chequear hizo que, al crear un evento nuevo,
// se mostraran y borraran archivos de OTRO evento. Reglas (testeadas):

/** El evento de una página solo si es ESE (mismo id); si no, null. */
export function eventForPage<T extends { _id?: any }>(selected: T | null | undefined, pageId: unknown): T | null {
  if (!selected?._id || pageId === undefined || pageId === null) return null;
  return String(selected._id) === String(pageId) ? selected : null;
}

/**
 * Cuerpo para guardar los archivos de un evento: SOLO el id y lo que cambia.
 * Nunca el evento entero (una copia vieja en memoria pisaba el resto).
 */
export function filesUpdateBody(eventId: unknown, files: unknown[], folderId?: string) {
  if (!eventId) throw new Error('Falta el evento');
  return { _id: String(eventId), files, ...(folderId ? { folderId } : {}) };
}
