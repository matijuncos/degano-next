// Orden alfabético en español para listas por nombre: sin distinguir
// mayúsculas ni acentos, y con números naturales ("Parlante 2" antes que
// "Parlante 10"). Devuelve una copia, no muta la lista original.
const collator = new Intl.Collator('es', { sensitivity: 'base', numeric: true });

export function sortByName<T extends { [key: string]: any }>(list: T[]): T[] {
  return [...list].sort((a, b) => collator.compare(String(a.name ?? ''), String(b.name ?? '')));
}

export type EquipmentSortKey = 'name' | 'code';
export type SortDir = 'asc' | 'desc';

/**
 * Orden de la tabla de equipamiento por columna, en orden natural ("TR 1 - 2"
 * antes que "TR 1 - 10"). Por nombre, a igual nombre desempata por código.
 * Los equipos sin código van siempre al final. Devuelve una copia.
 */
export function sortEquipment<T extends { [key: string]: any }>(
  list: T[],
  key: EquipmentSortKey,
  dir: SortDir
): T[] {
  const sign = dir === 'asc' ? 1 : -1;
  const str = (v: any) => String(v ?? '').trim();
  return [...list].sort((a, b) => {
    if (key === 'code') {
      const ca = str(a.code);
      const cb = str(b.code);
      if (!ca || !cb) return ca ? -1 : cb ? 1 : 0;
      return sign * collator.compare(ca, cb);
    }
    return (
      sign * collator.compare(str(a.name), str(b.name)) ||
      collator.compare(str(a.code), str(b.code))
    );
  });
}
