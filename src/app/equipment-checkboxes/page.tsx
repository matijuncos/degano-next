import EquipmentCheckBoxes from '@/components/EquipmentCheckboxes/EquipmentCheboxes';
import { getEquipmentStock } from '@/lib/getEquipmentStock';
import { withPageAuthRequired } from '@auth0/nextjs-auth0';
import { Text } from '@mantine/core';

export default withPageAuthRequired(async function EquipmentCheckBoxesPage() {
  const data = await getEquipmentStock();
  return (
    <>
      <h2>Selecciona el equipamiento</h2>
      <Text my='14px'>
        {
          'Al seleccionar un equipo, sus equipos "hijos", se eleccionan por defecto. Puede desseleccionar lo que quieras'
        }
      </Text>
      <EquipmentCheckBoxes inputListProp={data?.equipment?.at(-1)?.equipment} />
    </>
  );
});
