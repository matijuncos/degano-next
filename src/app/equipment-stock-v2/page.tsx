import EquipmentStockTable from '@/components/equipmentStockTable/EquipmentStockTable';
import { getEquipmentAction } from '@/lib/getEquipmentAction';
import { Box, Text } from '@mantine/core';
import React from 'react';

export default async function equipmentStock() {
  const cursor = await getEquipmentAction();
  const data = await cursor?.toArray();
  const formattedEquipment = data?.[0]?.equipment?.map(({ ...equip }) => ({
    _id: equip.toString(),
    name: equip.name,
    price: equip.price,
    totalQuantity: equip.totalQuantity,
    currentQuantity: equip.currentQuantity
  }));
  return (
    <Box>
      <Text>Lista de equipos</Text>
      <EquipmentStockTable
        id={data?.[0]._id.toString() as string}
        equipment={formattedEquipment}
      />
    </Box>
  );
}
