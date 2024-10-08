import EquipmentStockTable from '@/components/equipmentStockTable/EquipmentStockTable';
import { getEquipmentAction } from '@/lib/getEquipmentAction';
import { getSession, Session, withPageAuthRequired } from '@auth0/nextjs-auth0';
import { Box, Text } from '@mantine/core';
import React from 'react';

export default withPageAuthRequired(async function equipmentStock() {
  const session = await getSession();
  const { collectionId, equipment } = (await getEquipmentAction(
    session as Session
  )) ?? { collectionId: null, equipment: null };
  const formattedEquipment = equipment?.map(({ ...equip }) => ({
    _id: equip._id.toString(),
    name: equip.name,
    price: equip.price,
    totalQuantity: equip.totalQuantity,
    currentQuantity: equip.currentQuantity,
    brand: equip.brand,
    codeNumber: equip.codeNumber
  }));
  return (
    <Box>
      <Text>Lista de equipos</Text>
      <EquipmentStockTable
        id={collectionId?.toString() as string}
        equipment={formattedEquipment}
      />
    </Box>
  );
});
