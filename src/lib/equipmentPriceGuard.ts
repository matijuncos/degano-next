import { Db, ObjectId } from 'mongodb';
import { restoreEquipmentPrices, sumRentalPrice, PRICE_FIELDS } from '@/utils/equipmentPrices';

/**
 * Para quien NO puede ver precios: los equipos que manda no traen precio (o
 * traen basura), así que se completan con los reales antes de guardar.
 * Una sola consulta, y solo por los equipos que no estaban en el evento.
 * Devuelve los equipos con precio y el total de alquiler (`equipmentPrice`).
 */
export async function withRealEquipmentPrices(
  db: Db,
  incoming: any[],
  previous: any[] | null | undefined
): Promise<{ equipment: any[]; equipmentPrice: number }> {
  const prevIds = new Set((previous || []).map((p) => String(p._id)));
  const newIds = Array.from(
    new Set(
      (incoming || [])
        .map((e) => String(e._id))
        .filter((id) => !prevIds.has(id) && ObjectId.isValid(id))
    )
  );
  const projection = Object.fromEntries(PRICE_FIELDS.map((f) => [f, 1]));
  const dbItems = newIds.length
    ? await db
        .collection('equipment')
        .find({ _id: { $in: newIds.map((id) => new ObjectId(id)) } }, { projection })
        .toArray()
    : [];
  const equipment = restoreEquipmentPrices(
    incoming,
    previous,
    new Map(dbItems.map((d) => [String(d._id), d]))
  );
  return { equipment, equipmentPrice: sumRentalPrice(equipment) };
}
