'use client';
import { ActionIcon, Group, Text, Stack, Divider, Button } from '@mantine/core';
import { useEffect } from 'react';
import { FaTrashAlt } from 'react-icons/fa';
import React from 'react';
import { NewEquipment } from '../equipmentStockTable/types';
import { EventModel } from '@/context/types';
import { formatPrice } from '@/utils/priceUtils';

type EquipmentListProps = {
  equipmentList: NewEquipment[];
  setEventEquipment: React.Dispatch<React.SetStateAction<EventModel>>;
  setTotal: React.Dispatch<React.SetStateAction<number>>;
  allowSave?: boolean;
  onSave?: () => void;
};

export default function EquipmentList({
  equipmentList,
  setEventEquipment,
  setTotal,
  allowSave = false,
  onSave
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
    <Stack gap='xs'>
      {equipmentList.map((eq) => (
        <Stack
          key={eq._id}
          gap='2px'
          style={{
            padding: '6px 8px',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            borderRadius: '4px',
            borderLeft: '2px solid rgba(64, 192, 87, 0.5)'
          }}
        >
          <Group justify='space-between' gap='xs'>
            <Stack gap='2px' style={{ flex: 1, minWidth: 0 }}>
              <Text size='sm' fw={500} truncate>
                {eq.name}
              </Text>
              <Text size='10px' c='dimmed'>
                Código: {eq.code || 'N/A'}
              </Text>
            </Stack>
            <Group gap='4px' style={{ flexShrink: 0 }}>
              <Text size='xs' c='green' fw={600}>
                {formatPrice(eq.rentalPrice || 0)}
              </Text>
              <ActionIcon
                size='xs'
                color='red'
                variant='subtle'
                onClick={() => handleRemove(eq._id)}
                title='Quitar equipo'
              >
                <FaTrashAlt size={10} />
              </ActionIcon>
            </Group>
          </Group>
        </Stack>
      ))}
      <Divider my='xs' />

      {/* Total */}
      <Group justify='space-between' px='xs'>
        <Text fw={500}>Total:</Text>
        <Text fw={600}>{formatPrice(total)}</Text>
      </Group>
      {allowSave && (
        <Group justify='center' px='xs' onClick={onSave}>
          <Button>Guardar Cambios</Button>
        </Group>
      )}
    </Stack>
  );
}
