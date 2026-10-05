/**
 * Utilidades para agrupar equipamiento por nombre
 */

/**
 * Agrupa equipamiento por nombre y retorna el conteo de cada uno
 * Útil para mostrar "Equipo x 3" en vistas de solo lectura
 */
export function groupEquipmentByNameCount(equipmentArray: any[]): { [name: string]: number } {
  const grouped: { [name: string]: number } = {};
  equipmentArray.forEach((eq) => {
    if (grouped[eq.name]) {
      grouped[eq.name]++;
    } else {
      grouped[eq.name] = 1;
    }
  });
  return grouped;
}

/**
 * Agrupa equipamiento por nombre y retorna los items completos
 * Útil cuando se necesita acceder a los IDs (ej: para eliminar)
 */
export function groupEquipmentByName(equipmentArray: any[]): { [name: string]: any[] } {
  const grouped: { [name: string]: any[] } = {};
  equipmentArray.forEach((eq) => {
    if (!grouped[eq.name]) {
      grouped[eq.name] = [];
    }
    grouped[eq.name].push(eq);
  });
  return grouped;
}

/**
 * Unidades reales a agregar al evento para los nombres seleccionados en la tabla agrupada.
 * Por cada nombre: la cantidad pedida (por defecto 1) con tope en lo disponible.
 * Disponible = no está fuera de servicio y no está ya en el evento (igual que la tabla).
 * Nunca genera "a tercerizar": lo que exceda el stock simplemente no se agrega.
 */
export function pickUnitsForSelection(
  items: any[],
  selectedNames: string[],
  alreadyInEventIds: string[],
  quantityByName: Record<string, number>
): { units: any[]; perName: { name: string; requested: number; added: number }[] } {
  const selected = new Set(selectedNames);
  const inEvent = new Set(alreadyInEventIds);
  const availableByName = new Map<string, any[]>();
  items.forEach((item) => {
    if (!selected.has(item.name)) return;
    if (!availableByName.has(item.name)) availableByName.set(item.name, []);
    if (!item.outOfService?.isOut && !inEvent.has(item._id)) availableByName.get(item.name)!.push(item);
  });

  const units: any[] = [];
  const perName: { name: string; requested: number; added: number }[] = [];
  availableByName.forEach((available, name) => {
    const requested = Math.max(1, Math.floor(quantityByName[name] || 1));
    const toAdd = available.slice(0, requested);
    units.push(...toAdd);
    perName.push({ name, requested, added: toAdd.length });
  });
  return { units, perName };
}
