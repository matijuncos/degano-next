/**
 * Armado del remito (estilo formulario de imprenta, blanco y negro).
 * Los renglones de la tabla tienen alto fijo, así que se reparten en hojas:
 *  - Hoja 1: encabezado completo + tabla.
 *  - Hojas siguientes: encabezado corto + tabla.
 *  - La última hoja lleva además el pie (Transporte / Recibí conforme), y la
 *    tabla se completa con renglones vacíos hasta el final, como el papel.
 */

// Renglones por hoja. Medidos renderizando el PDF (máximo que entra sin que
// react-pdf corte la tabla: 31 / 34 / 47 / 51) menos 1 de margen, por si un
// nombre largo de cliente ocupa dos renglones en el encabezado.
export const REMITO_ROWS = {
  firstWithFooter: 30, // hoja única
  firstWithoutFooter: 33,
  nextWithFooter: 46,
  nextWithoutFooter: 50
};

// Renglones con datos que pasan, como mínimo, a la última hoja
export const MIN_LAST_ROWS = 5;

export interface RemitoPage {
  from: number; // índice del primer renglón con datos
  count: number; // renglones con datos en esta hoja
  blanks: number; // renglones vacíos para completar la tabla
  isLast: boolean;
}

export function paginateRemitoRows(total: number, rows = REMITO_ROWS): RemitoPage[] {
  if (total <= rows.firstWithFooter) {
    return [{ from: 0, count: total, blanks: rows.firstWithFooter - total, isLast: true }];
  }
  // No entra con el pie en la hoja 1: hojas sin pie hasta que lo que queda
  // entre en una última hoja CON pie (puede quedar solo con renglones vacíos).
  const pages: RemitoPage[] = [];
  let from = 0;
  let cap = rows.firstWithoutFooter;
  for (;;) {
    const left = total - from;
    if (pages.length > 0 && left <= rows.nextWithFooter) {
      pages.push({ from, count: left, blanks: rows.nextWithFooter - left, isLast: true });
      return pages;
    }
    // Si llenando esta hoja a la última le quedarían menos de MIN_LAST_ROWS
    // renglones (o ninguno), se le pasan los últimos: la hoja final nunca
    // queda solo con el pie ni con 1-2 renglones sueltos.
    const rest = left - Math.min(cap, left);
    const take = rest < MIN_LAST_ROWS ? left - Math.min(MIN_LAST_ROWS, left) : cap;
    pages.push({ from, count: take, blanks: 0, isLast: false });
    from += take;
    cap = rows.nextWithoutFooter;
  }
}

/** Fecha en los tres casilleros del formulario: DD / MM / AA (hora argentina). */
export function remitoDateParts(date: Date): [string, string, string] {
  const ar = new Date(date.getTime() - 3 * 60 * 60 * 1000);
  const p = (n: number) => String(n).padStart(2, '0');
  return [p(ar.getUTCDate()), p(ar.getUTCMonth() + 1), p(ar.getUTCFullYear() % 100)];
}

/** Condiciones frente al IVA, en el orden del formulario. */
export const IVA_OPTIONS = [
  'Resp. Inscripto',
  'Consumidor Final',
  'Monotributo',
  'Exento',
  'Resp. No Inscripto',
  'No Responsable',
  'Sujeto No Categorizado'
] as const;
