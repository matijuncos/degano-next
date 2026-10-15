/**
 * Precios de equipamiento: SOLO admin (`canViewEquipmentPrices`).
 *
 * Defensa en 2 capas (igual que los teléfonos ofuscados):
 *  1. Lectura: a quien no tiene permiso no le llegan los campos de precio.
 *  2. Escritura: lo que manda alguien sin permiso NUNCA pisa precios. Al
 *     guardar un evento, cada equipo conserva el precio que ya tenía en el
 *     evento, y uno recién agregado toma el precio actual de la base.
 */

export const PRICE_FIELDS = [
  'rentalPrice',
  'investmentPrice',
  'rentalPriceFormatted',
  'investmentPriceFormatted'
] as const;

type AnyItem = Record<string, any>;

/** Copia del equipo sin ningún campo de precio. */
export function stripPriceFields<T extends AnyItem>(item: T): T {
  const out: AnyItem = { ...item };
  for (const f of PRICE_FIELDS) delete out[f];
  return out as T;
}

export function stripEquipmentPrices<T extends AnyItem>(items: T[] | null | undefined): T[] {
  return (items || []).map(stripPriceFields);
}

function pickPrices(source: AnyItem | undefined | null): AnyItem {
  const out: AnyItem = {};
  if (!source) return out;
  for (const f of PRICE_FIELDS) if (source[f] !== undefined) out[f] = source[f];
  return out;
}

/**
 * Equipos de un evento que manda alguien SIN permiso de precios: se descartan
 * los precios que vengan en el body y se ponen los reales.
 *  - Equipo que ya estaba en el evento → el precio guardado en el evento.
 *  - Equipo nuevo → el precio actual del equipo en la base.
 */
export function restoreEquipmentPrices<T extends AnyItem>(
  incoming: T[],
  previous: AnyItem[] | null | undefined,
  dbById: Map<string, AnyItem>
): T[] {
  const prevById = new Map((previous || []).map((p) => [String(p._id), p]));
  return (incoming || []).map((item) => {
    const id = String(item._id);
    const source = prevById.get(id) ?? dbById.get(id);
    return { ...stripPriceFields(item), ...pickPrices(source) } as T;
  });
}

/** Total de alquiler (lo que el front guarda como `equipmentPrice`). */
export function sumRentalPrice(items: AnyItem[] | null | undefined): number {
  return (items || []).reduce((s, it) => s + (Number(it.rentalPrice) || 0), 0);
}
