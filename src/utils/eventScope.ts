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
  return listUpdateBody(eventId, 'files', files, folderId);
}

/** Listas de archivos de un evento: Archivos (`files`) y los de Música (`musicFiles`). */
export type FileListField = 'files' | 'musicFiles';

/** Cuerpo de updateEvent con SOLO esa lista (y el folderId si se generó). */
export function listUpdateBody(eventId: unknown, field: FileListField, list: unknown[], folderId?: string) {
  if (!eventId) throw new Error('Falta el evento');
  return { _id: String(eventId), [field]: list, ...(folderId ? { folderId } : {}) };
}

/** Cambia solo el nombre visible de un archivo. Nombre vacío / igual / inexistente → la MISMA lista. */
export function renameFile<T extends { url: string; name: string }>(list: T[], url: string, newName: string): T[] {
  let name = newName.trim();
  const i = list.findIndex((f) => f.url === url);
  if (!name || i < 0) return list;
  // Sin extensión: conserva la del archivo (si no, se descarga sin ".mp3")
  const ext = list[i].name.match(/\.[a-z0-9]{1,5}$/i)?.[0];
  if (ext && !/\.[a-z0-9]{1,5}$/i.test(name)) name += ext;
  if (list[i].name === name) return list;
  return list.map((f, j) => (j === i ? { ...f, name } : f));
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
