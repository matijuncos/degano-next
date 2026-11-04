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

/** ¿El archivo (URL de S3) está en la carpeta de este evento? */
export function fileInFolder(url: unknown, folderId: unknown): boolean {
  if (typeof url !== 'string' || typeof folderId !== 'string' || !folderId) return false;
  return url.includes(`/${folderId}/`);
}

/**
 * Archivos con los que se CREA un evento: solo los de su propia carpeta. Si por
 * cualquier motivo llegara un archivo de otro evento, no se adjunta.
 */
export function ownFiles<T extends { url?: string }>(files: unknown, folderId: unknown): T[] {
  if (!Array.isArray(files)) return [];
  return files.filter((f: any) => f && fileInFolder(f.url, folderId)) as T[];
}
