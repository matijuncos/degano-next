import EquipmentCheckBoxes from '@/components/EquipmentCheckboxes/EquipmentCheboxes';
import { getEquipmentStock } from '@/lib/getEquipmentStock';

export default async function EquipmentCheckBoxesPage() {
  const data = await getEquipmentStock();
  console.log(data);
  return <EquipmentCheckBoxes inputListProp={data.equipment[0].equipment} />;
}
