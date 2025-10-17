'use client';
import { ActionIcon, Group, Text, Stack, Divider } from '@mantine/core';
import { useEffect } from 'react';
import { FaTrashAlt } from 'react-icons/fa';
import React from 'react';
import { NewEquipment } from '../equipmentStockTable/types';
import { EventModel } from '@/context/types';

type EquipmentListProps = {
  equipmentList: NewEquipment[];
  setEventEquipment: React.Dispatch<React.SetStateAction<EventModel>>;
  setTotal: React.Dispatch<React.SetStateAction<number>>;
};

export default function EquipmentList({
  equipmentList,
  setEventEquipment,
  setTotal
}: EquipmentListProps) {
  const handleRemove = (id: string) => {
    setEventEquipment((prev) => ({
      ...prev,
      equipment: prev.equipment.filter((eq) => eq._id !== id)
    }));
  };

  const total = equipmentList.reduce(
    (acc, eq) => acc + (eq.rentalPrice || 0),
    0
  );

  useEffect(() => {
    setTotal(total);
  }, [total]);

  if (!equipmentList?.length) {
    return (
      <Text size='sm' c='dimmed' ta='center'>
        No hay equipos seleccionados
      </Text>
    );
  }

  return (
    <Stack>
      {equipmentList.map((eq) => (
        <Group
          key={eq._id}
          justify='space-between'
          style={{ padding: '0 8px' }}
        >
          <Text size='sm'>{eq.name}</Text>
          <Text size='sm' c='dimmed'>
            $ {new Intl.NumberFormat('es-AR').format(eq.rentalPrice || 0)}
          </Text>
          <ActionIcon
            color='red'
            variant='subtle'
            onClick={() => handleRemove(eq._id)}
            title='Quitar equipo'
          >
            <FaTrashAlt size={12} />
          </ActionIcon>
        </Group>
      ))}
      <Divider my='xs' />

      {/* Total */}
      <Group justify='space-between' px='xs'>
        <Text fw={500}>Total:</Text>
        <Text fw={600}>$ {new Intl.NumberFormat('es-AR').format(total)}</Text>
      </Group>
    </Stack>
  );
}
