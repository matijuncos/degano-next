/**
 * Notas por equipo y por evento: se guardan en el snapshot del equipo dentro
 * del evento (`events.equipment[].note`), así cada nota es única para ese
 * equipo en ese evento y desaparece si se lo quita del evento.
 */

export const EQUIPMENT_NOTE_MAX = 500;

/** Normaliza el texto de una nota: sin espacios de más y con largo máximo. */
export function normalizeEquipmentNote(raw: string | null | undefined): string {
  return (raw || '').trim().slice(0, EQUIPMENT_NOTE_MAX);
}

/**
 * Devuelve la lista con la nota del equipo `id` actualizada. Una nota vacía
 * quita el campo (no se guarda `note: ''`). Si nada cambia devuelve la MISMA
 * lista, para no marcar "cambios sin guardar" de más.
 */
export function setEquipmentNote<T extends { _id: string; note?: string }>(
  equipment: T[],
  id: string,
  raw: string | null | undefined
): T[] {
  const note = normalizeEquipmentNote(raw);
  const current = equipment.find((eq) => String(eq._id) === String(id));
  if (!current || (current.note || '') === note) return equipment;
  return equipment.map((eq) => {
    if (String(eq._id) !== String(id)) return eq;
    const { note: _old, ...rest } = eq;
    return (note ? { ...rest, note } : rest) as T;
  });
}
