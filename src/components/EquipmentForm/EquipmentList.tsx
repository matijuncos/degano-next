'use client';
import { ActionIcon, Group, Text, Stack, Divider, Button, Box } from '@mantine/core';
import { useEffect, useState } from 'react';
import { FaTrashAlt, FaChevronDown, FaChevronRight } from 'react-icons/fa';
import React from 'react';
import { NewEquipment } from '../equipmentStockTable/types';
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
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

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

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey);
      } else {
        newSet.add(groupKey);
      }
      return newSet;
    });
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

  // Function to group equipment by name within each category
  const groupByName = (equipmentArray: any[]) => {
    const grouped: { [key: string]: any[] } = {};
    equipmentArray.forEach((eq) => {
      if (!grouped[eq.name]) {
        grouped[eq.name] = [];
      }
      grouped[eq.name].push(eq);
    });
    return grouped;
  };

  if (!equipmentList?.length) {
    return (
      <Text size='sm' c='dimmed' ta='center'>
        No hay equipos seleccionados
      </Text>
    );
  }

  return (
    <Stack gap='md'>
      {Object.keys(groupedEquipment).map((categoryName) => {
        const categoryEquipment = groupedEquipment[categoryName];
        const groupedByName = groupByName(categoryEquipment);

        return (
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
              {Object.keys(groupedByName).map((equipmentName) => {
                const equipmentGroup = groupedByName[equipmentName];
                const groupKey = `${categoryName}-${equipmentName}`;
                const isExpanded = expandedGroups.has(groupKey);
                const totalPrice = equipmentGroup.reduce(
                  (sum, eq) => sum + (eq.rentalPrice || 0),
                  0
                );
                const quantity = equipmentGroup.length;

                // Si solo hay uno, mostrarlo directamente sin agrupación
                if (quantity === 1) {
                  const eq = equipmentGroup[0];
                  return (
                    <Stack
                      key={eq._id}
                      gap='2px'
                      style={{
                        padding: '6px 8px',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '4px',
                        borderLeft: '3px solid rgba(64, 192, 87, 0.7)'
                      }}
                    >
                      <Group justify='space-between' gap='xs'>
                        <Stack gap='2px' style={{ flex: 1, minWidth: 0 }}>
                          <Text size='sm' fw={600} truncate>
                            {eq.name}
                          </Text>
                          <Text size='10px' c='dimmed'>
                            Código: {eq.code || 'N/A'}
                          </Text>
                        </Stack>
                        <Group gap='4px' style={{ flexShrink: 0 }}>
                          {canViewPrices && (
                            <Text size='xs' c='green' fw={700}>
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
                  );
                }

                // Si hay más de uno, mostrar agrupado
                return (
                  <Box key={groupKey}>
                    {/* Fila del grupo */}
                    <Stack
                      gap='2px'
                      style={{
                        padding: '6px 8px',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '4px',
                        borderLeft: '3px solid rgba(64, 192, 87, 0.7)',
                        cursor: 'pointer'
                      }}
                      onClick={() => toggleGroup(groupKey)}
                    >
                      <Group justify='space-between' gap='xs'>
                        <Group gap='xs' style={{ flex: 1, minWidth: 0 }}>
                          <ActionIcon
                            size='xs'
                            variant='subtle'
                            color='gray'
                          >
                            {isExpanded ? (
                              <FaChevronDown size={10} />
                            ) : (
                              <FaChevronRight size={10} />
                            )}
                          </ActionIcon>
                          <Stack gap='2px' style={{ flex: 1, minWidth: 0 }}>
                            <Text size='sm' fw={600} truncate>
                              {equipmentName} x {quantity}
                            </Text>
                          </Stack>
                        </Group>
                        <Group gap='4px' style={{ flexShrink: 0 }}>
                          {canViewPrices && (
                            <Text size='xs' c='green' fw={700}>
                              {formatPrice(totalPrice)}
                            </Text>
                          )}
                        </Group>
                      </Group>
                    </Stack>

                    {/* Items individuales expandidos */}
                    {isExpanded && (
                      <Stack gap='xs' pl='md' mt='xs'>
                        {equipmentGroup.map((eq: any) => (
                          <Stack
                            key={eq._id}
                            gap='2px'
                            style={{
                              padding: '6px 8px',
                              backgroundColor: 'rgba(255, 255, 255, 0.02)',
                              borderRadius: '4px',
                              borderLeft: '2px solid rgba(64, 192, 87, 0.3)'
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
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemove(eq._id);
                                  }}
                                  title='Quitar equipo'
                                >
                                  <FaTrashAlt size={10} />
                                </ActionIcon>
                              </Group>
                            </Group>
                          </Stack>
                        ))}
                      </Stack>
                    )}
                  </Box>
                );
              })}
            </Stack>
          </Box>
        );
      })}

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
