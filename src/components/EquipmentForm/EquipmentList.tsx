'use client';
import { ActionIcon, Group, Text, Stack, Divider, Button, Box } from '@mantine/core';
import { useEffect, useState } from 'react';
import { FaTrashAlt } from 'react-icons/fa';
import React from 'react';
import { NewEquipment } from '@/types/equipment';
import { EventModel } from '@/context/types';
import { formatPrice } from '@/utils/priceUtils';
import { findMainCategorySync } from '@/utils/categoryUtils';
import { usePermissions } from '@/hooks/usePermissions';

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
  const { can } = usePermissions();
  const canViewPrices = can('canViewEquipmentPrices');
  const [categories, setCategories] = useState<any[]>([]);

  // Cargar categorías
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/categories');
        const data = await response.json();
        setCategories(data);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    fetchCategories();
  }, []);

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

  // Group equipment by main category
  const groupedEquipment = equipmentList.reduce((acc: any, eq: any) => {
    let mainCategoryName = eq.mainCategoryName;

    // Si no tiene mainCategoryName, calcularlo usando la función recursiva
    if (!mainCategoryName && eq.categoryId && categories.length > 0) {
      const mainCategory = findMainCategorySync(eq.categoryId, categories);
      mainCategoryName = mainCategory?.name || 'Sin categoría';
    }

    // Fallback si aún no hay nombre
    if (!mainCategoryName) {
      mainCategoryName = 'Sin categoría';
    }

    if (!acc[mainCategoryName]) {
      acc[mainCategoryName] = [];
    }
    acc[mainCategoryName].push(eq);
    return acc;
  }, {});

  if (!equipmentList?.length) {
    return (
      <Text size='sm' c='dimmed' ta='center'>
        No hay equipos seleccionados
      </Text>
    );
  }

  return (
    <Stack gap='md'>
      {Object.keys(groupedEquipment).map((categoryName) => (
        <Box key={categoryName}>
          <Text
            size='sm'
            fw={700}
            tt='uppercase'
            mb='xs'
            style={{
              color: 'rgba(64, 192, 87, 0.9)',
              letterSpacing: '0.5px',
              marginLeft: '10px'
            }}
          >
            {categoryName}
          </Text>
          <Stack gap='xs' pl='xs'>
            {groupedEquipment[categoryName].map((eq: any) => (
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
                    {canViewPrices && (
                      <Text size='xs' c='green' fw={600}>
                        {formatPrice(eq.rentalPrice || 0)}
                      </Text>
                    )}
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
          </Stack>
        </Box>
      ))}

      <Divider my='xs' />

      {/* Total */}
      {canViewPrices && (
        <Group justify='space-between' px='xs'>
          <Text fw={500}>Total:</Text>
          <Text fw={600}>{formatPrice(total)}</Text>
        </Group>
      )}
      {allowSave && (
        <Group justify='center' px='xs' onClick={onSave}>
          <Button>Guardar Cambios</Button>
        </Group>
      )}
    </Stack>
  );
}
