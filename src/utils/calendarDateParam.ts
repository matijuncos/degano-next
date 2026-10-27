/**
 * Parámetro `date` de la URL del calendario. Un 'AAAA-MM-DD' se lee como ese
 * día LOCAL (new Date('2026-11-06') lo toma como medianoche UTC, que en
 * Argentina es el 05/11 a las 21:00 → abría el día anterior). Los links viejos
 * con fecha ISO completa se siguen leyendo igual. Inválido → hoy.
 */
export function parseCalendarDateParam(param: string | null | undefined, now: Date = new Date()): Date {
  if (!param) return now;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(param);
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(param);
  return isNaN(d.getTime()) ? now : d;
}

/** Fecha → 'AAAA-MM-DD' (día local), para escribir en la URL. */
export function formatCalendarDateParam(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

/**
 * "Ir a mes" del calendario: el selector de mes (Mantine 8) devuelve
 * 'AAAA-MM-DD' (o un Date). Se va al día 1 de ese mes, en hora local (mismo
 * cuidado que arriba: nunca pasar 'AAAA-MM-DD' por new Date()). Inválido → null.
 */
export function monthStartFromPicker(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : new Date(value.getFullYear(), value.getMonth(), 1);
  }
  const m = /^(\d{4})-(\d{2})/.exec(value);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, 1) : null;
}

/** Fecha que se muestra en el selector: el mes visible, como 'AAAA-MM-01'. */
export function pickerValueFromDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
}
