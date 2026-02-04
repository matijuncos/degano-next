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
