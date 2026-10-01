// Orden alfabético en español para listas por nombre: sin distinguir
// mayúsculas ni acentos, y con números naturales ("Parlante 2" antes que
// "Parlante 10"). Devuelve una copia, no muta la lista original.
const collator = new Intl.Collator('es', { sensitivity: 'base', numeric: true });

export function sortByName<T extends { [key: string]: any }>(list: T[]): T[] {
  return [...list].sort((a, b) => collator.compare(String(a.name ?? ''), String(b.name ?? '')));
}
