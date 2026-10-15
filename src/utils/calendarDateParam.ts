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
