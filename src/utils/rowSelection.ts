// Lógica pura de la selección por arrastre de filas (tipo explorador de archivos).
// La usa el hook useDragSelect y el resumen del ContentPanel.

// Ids entre `fromId` y `toId` (inclusive) según el orden de las filas.
// Funciona para arriba y para abajo. Si alguno no está, devuelve solo el que exista.
export function rangeIds(orderedIds: string[], fromId: string, toId: string): string[] {
  const from = orderedIds.indexOf(fromId);
  const to = orderedIds.indexOf(toId);
  if (from === -1 && to === -1) return [];
  if (from === -1) return [toId];
  if (to === -1) return [fromId];
  const [start, end] = from <= to ? [from, to] : [to, from];
  return orderedIds.slice(start, end + 1);
}

// Agrega o quita un id (Cmd/Ctrl + click).
export function toggleId(selected: string[], id: string): string[] {
  return selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
}

// Unión sin duplicados, respetando el orden de aparición.
export function unionIds(a: string[], b: string[]): string[] {
  return Array.from(new Set([...a, ...b]));
}

export type SelectableEntry = {
  id: string;
  name: string;
  // Unidades que representa la fila (1 en la vista por unidad, el total en la agrupada)
  count: number;
  available: number;
};

export type SelectionSummary = {
  rows: { name: string; count: number; available: number }[];
  totalCount: number;
  totalAvailable: number;
};

// Cuenta lo seleccionado agrupado por nombre, en el orden de la lista.
export function summarizeSelection(entries: SelectableEntry[], selectedIds: string[]): SelectionSummary {
  const selected = new Set(selectedIds);
  const byName = new Map<string, { name: string; count: number; available: number }>();
  let totalCount = 0;
  let totalAvailable = 0;
  for (const entry of entries) {
    if (!selected.has(entry.id)) continue;
    const row = byName.get(entry.name) ?? { name: entry.name, count: 0, available: 0 };
    row.count += entry.count;
    row.available += entry.available;
    byName.set(entry.name, row);
    totalCount += entry.count;
    totalAvailable += entry.available;
  }
  return { rows: Array.from(byName.values()), totalCount, totalAvailable };
}

export type Box = { top: number; bottom: number; left: number; right: number };

// Rectángulo normalizado entre dos puntos (el arrastre puede ir en cualquier dirección).
export function boxFromPoints(x1: number, y1: number, x2: number, y2: number): Box {
  return {
    top: Math.min(y1, y2),
    bottom: Math.max(y1, y2),
    left: Math.min(x1, x2),
    right: Math.max(x1, x2)
  };
}

// Ids de las filas que toca el rectángulo de selección (alcanza con rozarlas).
export function idsInBox(rows: ({ id: string } & Box)[], box: Box): string[] {
  return rows
    .filter((r) => r.top < box.bottom && r.bottom > box.top && r.left < box.right && r.right > box.left)
    .map((r) => r.id);
}
