import EquipmentCheckBoxes from '@/components/EquipmentCheckboxes/EquipmentCheboxes';
import { getEquipmentStock } from '@/lib/getEquipmentStock';

export default async function EquipmentCheckBoxesPage() {
  const data = await getEquipmentStock();
  return <EquipmentCheckBoxes inputListProp={data.equipment[0].equipment} />;
}
