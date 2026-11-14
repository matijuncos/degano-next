// src/utils/categoryItemGuard.ts
// Una CATEGORÍA nunca se guarda como equipo de un evento. Pasaba al tocar una
// fila de subcategoría en la tabla del medio de Equipamiento (se agregaba como
// "equipo" con código N/A y $0). La UI ya no lo hace; esto es la defensa del
// servidor (postEvent / updateEvent). Lógica pura y testeada.

// Ids de los equipos del cuerpo (para consultar cuáles son categorías)
export function equipmentIdsIn(equipment: unknown): string[] {
  if (!Array.isArray(equipment)) return [];
  const ids = equipment.map((e: any) => (e?._id != null ? String(e._id) : '')).filter(Boolean);
  return Array.from(new Set(ids));
}

export function withoutCategoryItems<T>(
  equipment: T[] | null | undefined,
  categoryIds: Set<string>
): { equipment: T[]; removed: string[] } {
  if (!Array.isArray(equipment)) return { equipment: [], removed: [] };
  const removed: string[] = [];
  const kept = equipment.filter((e: any) => {
    const isCategory = e?._id != null && categoryIds.has(String(e._id));
    if (isCategory) removed.push(e?.name ?? String(e._id));
    return !isCategory;
  });
  return { equipment: kept, removed };
}
