import EquipmentCheckBoxes from '@/components/EquipmentCheckboxes/EquipmentCheboxes';
import { getEquipmentStock } from '@/lib/getEquipmentStock';
import { withPageAuthRequired } from '@auth0/nextjs-auth0';

export default withPageAuthRequired(async function EquipmentCheckBoxesPage() {
  const data = await getEquipmentStock();
  return <EquipmentCheckBoxes inputListProp={data.equipment[0].equipment} />;
});
