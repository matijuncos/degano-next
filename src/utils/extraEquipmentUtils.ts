/**
 * Utilidades para reconciliar el equipamiento "a tercerizar" (extraEquipment)
 * contra el stock real disponible.
 *
 * Contexto: `extraEquipment` es una foto del momento en que se cargó (no había
 * stock suficiente). Pero el stock puede aparecer después: otro evento liberó
 * equipos, se compró más, el otro evento cambió de fecha o se eliminó. Estas
 * funciones detectan esa situación para poder convertir tercerizados en
 * equipamiento real.
 */

export interface ExtraItem {
  name: string;
  categoryId?: string;
  mainCategoryName?: string;
  quantity: number;
}

export interface InventoryUnit {
  _id: any;
  name: string;
  outOfService?: { isOut?: boolean } | null;
  [key: string]: any;
}

export interface ConvertibleExtra {
  extra: ExtraItem;
  /** Unidades reales concretas que cubren (parcial o totalmente) el tercerizado */
  units: InventoryUnit[];
  /** Cuántas unidades se pueden convertir (nunca más que extra.quantity) */
  convertible: number;
}

const sameExtra = (a: ExtraItem, b: ExtraItem) =>
  a.name === b.name &&
  (a.mainCategoryName || '') === (b.mainCategoryName || '');

/**
 * Cruza los tercerizados contra el inventario disponible para las fechas del
 * evento y devuelve qué se puede convertir.
 *
 * - Excluye unidades fuera de servicio y las ya asignadas al evento.
 * - Nunca asigna la misma unidad a dos entradas (Set `used`).
 * - Nunca convierte más de lo que estaba tercerizado.
 */
export function computeConvertibleExtras(args: {
  extraEquipment?: ExtraItem[] | null;
  /** Inventario ya filtrado por fechas del evento (marca isOut si hay conflicto) */
  availableEquipment?: InventoryUnit[] | null;
  /** Equipos ya asignados a este evento */
  assignedEquipment?: { _id: any }[] | null;
}): ConvertibleExtra[] {
  const { extraEquipment, availableEquipment, assignedEquipment } = args;

  const assignedIds = new Set(
    (assignedEquipment || []).map((e) => String(e._id))
  );
  const used = new Set<string>();

  return (extraEquipment || [])
    .map((extra) => {
      const wanted = Math.max(0, extra?.quantity || 0);
      const freeUnits = (availableEquipment || []).filter(
        (eq) =>
          eq &&
          eq.name === extra.name &&
          !eq.outOfService?.isOut &&
          !assignedIds.has(String(eq._id)) &&
          !used.has(String(eq._id))
      );
      const units = freeUnits.slice(0, wanted);
      units.forEach((u) => used.add(String(u._id)));
      return { extra, units, convertible: units.length };
    })
    .filter((c) => c.convertible > 0);
}

/**
 * Descuenta de `extraEquipment` lo que se convirtió. Las entradas que llegan a
 * 0 se eliminan.
 */
export function removeConvertedExtras(
  extraEquipment: ExtraItem[] | null | undefined,
  conversions: ConvertibleExtra[]
): ExtraItem[] {
  let result = [...(extraEquipment || [])];
  conversions.forEach(({ extra, convertible }) => {
    result = result
      .map((e) =>
        sameExtra(e, extra)
          ? { ...e, quantity: e.quantity - convertible }
          : e
      )
      .filter((e) => e.quantity > 0);
  });
  return result;
}
