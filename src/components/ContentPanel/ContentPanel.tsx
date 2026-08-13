// ContentPanel.tsx
'use client';
import useSWR, { mutate } from 'swr';
import {
  Table,
  ActionIcon,
  Group,
  Tooltip,
  Modal,
  Button,
  Box,
  Loader,
  Center,
  NumberInput,
  Stack,
  Text
} from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import { IconPlus } from '@tabler/icons-react';
import { useState, useEffect } from 'react';

export default function ContentPanel({
  selectedCategory,
  setDisableCreateEquipment,
  onSelect,
  onEdit,
  onRemove,
  onRemoveMultiple,
  onCancel,
  newEvent,
  eventStartDate,
  eventEndDate,
  selectedEquipmentIds = [],
  refreshTrigger = 0,
  onAddNegative,
  onRemoveNegative,
  extraEquipment = []
}: {
  selectedCategory: any;
  setDisableCreateEquipment: (val: boolean) => void;
  onSelect?: (item: any) => void;
  onEdit?: (item: any) => void;
  onRemove?: (equipmentId: string) => void;
  onRemoveMultiple?: (ids: string[]) => void;
  onCancel?: (wasCancelled: boolean, updatedItem?: any) => void;
  newEvent: boolean;
  eventStartDate?: Date | string;
  eventEndDate?: Date | string;
  selectedEquipmentIds?: string[];
  refreshTrigger?: number;
  // Agrega N unidades "negativas" (a tercerizar) para un nombre de equipo.
  onAddNegative?: (name: string, categoryId: string, qty: number) => void;
  // Quita todos los "a tercerizar" cargados para ese nombre.
  onRemoveNegative?: (name: string) => void;
  extraEquipment?: { name: string; quantity: number }[];
}) {
  const { data: categories = [] } = useSWR('/api/categories', async (url: string) => {
    const response = await fetch(url, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
    });
    return response.json();
  }, { revalidateOnMount: true });

  const getEquipmentStatus = (item: any) => {
    if (item.outOfService?.isOut && item.outOfService?.reason === 'En Evento') {
      return { label: 'En Uso', color: '#fbbf24' };
    }
    if (item.outOfService?.isOut) {
      return { label: 'No Disponible', color: 'red' };
    }
    return { label: 'Disponible', color: 'green' };
  };

  const [equipment, setEquipment] = useState<any[]>([]);
  const [isLoadingEquipment, setIsLoadingEquipment] = useState(false);
  const [equipmentUrl, setEquipmentUrl] = useState<string>('');

  // Mapa de cantidades por nombre de equipo (para el selector de cantidad en newEvent)
  const [quantityMap, setQuantityMap] = useState<Record<string, number>>({});

  // Resetear cantidades al cambiar de categoría
  useEffect(() => {
    setQuantityMap({});
  }, [selectedCategory?._id]);

  useEffect(() => {
    const url = eventStartDate && eventEndDate
      ? `/api/equipment?eventStartDate=${new Date(eventStartDate).toISOString()}&eventEndDate=${new Date(eventEndDate).toISOString()}`
      : '/api/equipment';
    setEquipmentUrl(url);
  }, [eventStartDate, eventEndDate]);

  useEffect(() => {
    if (!equipmentUrl) return;
    const fetchEquipment = async () => {
      setIsLoadingEquipment(true);
      try {
        const response = await fetch(equipmentUrl, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
        });
        const data = await response.json();
        setEquipment(data);
      } catch (error) {
        console.error('Error fetching equipment:', error);
      } finally {
        setIsLoadingEquipment(false);
      }
    };
    fetchEquipment();
  }, [equipmentUrl, refreshTrigger]);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [equipmentToDelete, setEquipmentToDelete] = useState<any>(null);

  const children = categories.filter((cat: any) => cat.parentId === selectedCategory?._id);
  const items = equipment.filter((eq: any) => eq.categoryId === selectedCategory?._id);
  const isCategory = categories.some((cat: any) => cat._id === selectedCategory?._id);
  const isItem = equipment.some((eq: any) => eq._id === selectedCategory?._id);

  if (selectedCategory) {
    setDisableCreateEquipment(isItem);
  }

  const handleEquipmentClick = (item: any) => {
    if (item.categoryId) {
      const isCurrentlySelected = selectedCategory?._id === item._id;
      if (!isCurrentlySelected) {
        onSelect?.(item);
        if (!newEvent) onEdit?.(item);
      }
    }
  };

  // ──── Headers ────

  const renderHeader = () => {
    if (!selectedCategory) return null;

    if (children.length > 0) {
      return (
        <tr>
          <th>Nombre</th>
          <th>Stock total</th>
          <th>Disponible</th>
        </tr>
      );
    } else if (isCategory) {
      if (newEvent) {
        // Header agrupado por nombre para selección con cantidad
        return (
          <tr>
            <th style={{ textAlign: 'left', padding: '6px 8px' }}>Nombre</th>
            <th style={{ textAlign: 'center' }}>Total</th>
            <th style={{ textAlign: 'center' }}>Disponible</th>
            <th style={{ textAlign: 'center' }}>Cantidad</th>
            <th style={{ textAlign: 'center' }}>Acción</th>
          </tr>
        );
      }
      return (
        <tr>
          <th>Nombre</th>
          <th>Stock total</th>
          <th>Disponible</th>
          <th>Código</th>
          <th>Marca</th>
          <th>Modelo</th>
          <th>N° Serie</th>
          <th>Propiedad</th>
          <th>Ubicación</th>
          <th>Estado</th>
          {!newEvent && <th>Acciones</th>}
        </tr>
      );
    } else if (isItem) {
      return (
        <tr>
          <th>Nombre</th>
          <th>Código</th>
          <th>Marca</th>
          <th>Modelo</th>
          <th>N° Serie</th>
          <th>Propiedad</th>
          <th>Ubicación</th>
          <th>Estado</th>
        </tr>
      );
    }
  };

  // ──── Rows para newEvent agrupados por nombre ────

  const renderGroupedRows = () => {
    // Agrupar por nombre
    const itemsByName: Record<string, any[]> = {};
    items.forEach((item: any) => {
      if (!itemsByName[item.name]) itemsByName[item.name] = [];
      itemsByName[item.name].push(item);
    });

    return Object.entries(itemsByName).map(([name, nameItems], index) => {
      const totalCount = nameItems.length;
      const availableItems = nameItems.filter(
        (i) => !i.outOfService?.isOut && !selectedEquipmentIds.includes(i._id)
      );
      const availableCount = availableItems.length;
      const selectedCount = nameItems.filter((i) => selectedEquipmentIds.includes(i._id)).length;
      const currentQty = quantityMap[name] || 1;
      // Negativos (a tercerizar) ya cargados para este nombre
      const negativeCount = (extraEquipment || [])
        .filter((e) => e.name === name)
        .reduce((sum, e) => sum + (e.quantity || 0), 0);

      return (
        <tr
          key={name}
          style={{
            backgroundColor: index % 2 === 0 ? 'rgba(255,255,255,0.05)' : 'transparent',
            fontWeight: 500
          }}
        >
          {/* Nombre */}
          <td style={{ padding: '6px 8px' }}>{name}</td>

          {/* Total */}
          <td style={{ padding: '6px 8px', textAlign: 'center' }}>{totalCount}</td>

          {/* Disponible */}
          <td style={{ padding: '6px 8px', textAlign: 'center', color: availableCount > 0 ? '#40c057' : '#fa5252' }}>
            {availableCount}
          </td>

          {/* Cantidad (siempre editable: sirve para reales y para negativos) */}
          <td style={{ padding: '6px 8px', textAlign: 'center' }}>
            <NumberInput
              value={currentQty}
              onChange={(val) =>
                setQuantityMap((prev) => ({ ...prev, [name]: Number(val) || 1 }))
              }
              min={1}
              size='xs'
              style={{ width: '72px', margin: '0 auto' }}
              allowDecimal={false}
              hideControls={false}
              // Rojo cuando la cantidad excede el stock disponible (esos van "a tercerizar")
              styles={{
                input:
                  currentQty > availableCount
                    ? { color: '#fa5252', fontWeight: 700, borderColor: '#fa5252' }
                    : undefined
              }}
            />
          </td>

          {/* Acción */}
          <td style={{ padding: '6px 8px', textAlign: 'center' }}>
            <Stack gap='4px' align='center'>
              {/* Botón único con auto-split: agrega hasta lo disponible como
                  reales y el excedente automáticamente como "a tercerizar". */}
              <Tooltip
                label={
                  currentQty <= availableCount
                    ? `Agregar ${currentQty}`
                    : `Agregar ${availableCount} disponible(s) + ${currentQty - availableCount} a tercerizar`
                }
              >
                <ActionIcon
                  size='md'
                  color='green'
                  variant='light'
                  disabled={currentQty < 1}
                  onClick={(e) => {
                    e.stopPropagation();
                    const realToAdd = availableItems.slice(0, currentQty);
                    const negToAdd = Math.max(0, currentQty - availableCount);
                    if (realToAdd.length > 0) onEdit?.(realToAdd);
                    if (negToAdd > 0) {
                      onAddNegative?.(
                        name,
                        nameItems[0]?.categoryId || selectedCategory?._id || '',
                        negToAdd
                      );
                    }
                  }}
                >
                  <span style={{ fontSize: '18px', fontWeight: 'bold', lineHeight: 1 }}>+</span>
                </ActionIcon>
              </Tooltip>

              {/* Indicadores: reales seleccionados + negativos cargados */}
              {(selectedCount > 0 || negativeCount > 0) && (
                <Group gap='10px' wrap='nowrap' align='center'>
                  {selectedCount > 0 && (
                    <Group gap='2px' wrap='nowrap' align='center'>
                      <Text size='xs' c='yellow.5' fw={600}>
                        {selectedCount}✓
                      </Text>
                      <Tooltip label='Quitar reales del evento'>
                        <ActionIcon
                          size='xs'
                          color='red'
                          variant='subtle'
                          onClick={(e) => {
                            e.stopPropagation();
                            const idsToRemove = nameItems
                              .filter((i) => selectedEquipmentIds.includes(i._id))
                              .map((i) => i._id);
                            onRemoveMultiple?.(idsToRemove);
                          }}
                        >
                          <span style={{ fontSize: '14px', lineHeight: 1 }}>×</span>
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  )}
                  {negativeCount > 0 && (
                    <Group gap='2px' wrap='nowrap' align='center'>
                      <Text size='xs' c='red' fw={700} style={{ whiteSpace: 'nowrap' }}>
                        {negativeCount} a tercerizar
                      </Text>
                      {onRemoveNegative && (
                        <Tooltip label='Quitar los "a tercerizar"'>
                          <ActionIcon
                            size='xs'
                            color='red'
                            variant='subtle'
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveNegative(name);
                            }}
                          >
                            <span style={{ fontSize: '14px', lineHeight: 1 }}>×</span>
                          </ActionIcon>
                        </Tooltip>
                      )}
                    </Group>
                  )}
                </Group>
              )}
            </Stack>
          </td>
        </tr>
      );
    });
  };

  // ──── Rows ────

  const renderRows = () => {
    if (!selectedCategory) return null;

    if (children.length > 0) {
      return children.map((child: any, index: number) => {
        const childEquipment = equipment.filter((eq: any) => eq.categoryId === child._id);
        const childTotalStock = childEquipment.length;
        const childAvailableStock = childEquipment.filter((eq: any) => !eq.outOfService?.isOut).length;
        return (
          <tr
            key={child._id}
            style={{
              backgroundColor: index % 2 === 0 ? 'rgba(255,255,255,0.05)' : 'transparent',
              cursor: 'pointer',
              fontWeight: 500,
              textAlign: 'center'
            }}
            onClick={() => onEdit?.(child)}
          >
            <td>{child.name}</td>
            <td>{childTotalStock}</td>
            <td>{childAvailableStock}</td>
          </tr>
        );
      });
    } else if (isCategory) {
      // Vista agrupada para newEvent
      if (newEvent) return renderGroupedRows();

      // Vista individual para gestión de equipamiento
      const dynamicTotalStock = items.length;
      const dynamicAvailableStock = items.filter((item: any) => !item.outOfService?.isOut).length;

      return items.map((item: any, index: number) => {
        const isSelected = selectedEquipmentIds.includes(item._id);
        const status = getEquipmentStatus(item);
        return (
          <tr
            key={item._id}
            style={{
              backgroundColor: index % 2 === 0 ? 'rgba(255,255,255,0.05)' : 'transparent',
              textAlign: 'center',
              fontWeight: 500,
              whiteSpace: 'nowrap',
              cursor: 'pointer'
            }}
            onClick={() => handleEquipmentClick(item)}
          >
            <td style={{ padding: '0 5px' }}>{item.name}</td>
            <td style={{ padding: '0 5px' }}>{dynamicTotalStock}</td>
            <td style={{ padding: '0 5px' }}>{dynamicAvailableStock}</td>
            <td style={{ padding: '0 5px' }}>{item.code}</td>
            <td style={{ padding: '0 5px' }}>{item.brand}</td>
            <td style={{ padding: '0 5px' }}>{item.model}</td>
            <td style={{ padding: '0 5px' }}>{item.serialNumber}</td>
            <td style={{ padding: '0 5px' }}>{item.propiedad || 'Degano'}</td>
            <td style={{ padding: '0 5px' }}>{item.location || '-'}</td>
            <td style={{ color: status.color, padding: '0 5px' }}>{status.label}</td>
            <td style={{ padding: '0 5px', textAlign: 'center' }}>
              {item.propiedad === 'Alquilado' && (
                <Tooltip label='Eliminar equipo alquilado'>
                  <ActionIcon
                    size='sm'
                    color='red'
                    variant='subtle'
                    onClick={(e) => {
                      e.stopPropagation();
                      setEquipmentToDelete(item);
                      setShowDeleteModal(true);
                    }}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Tooltip>
              )}
            </td>
          </tr>
        );
      });
    } else if (isItem) {
      const item = equipment.find((eq: any) => eq._id === selectedCategory._id);
      if (!item) return null;
      const status = getEquipmentStatus(item);
      return (
        <tr style={{ backgroundColor: 'rgba(255,255,255,0.05)', textAlign: 'center', whiteSpace: 'nowrap', cursor: 'pointer' }}>
          <td style={{ padding: '0 5px' }}>{item.name}</td>
          <td style={{ padding: '0 5px' }}>{item.code}</td>
          <td style={{ padding: '0 5px' }}>{item.brand}</td>
          <td style={{ padding: '0 5px' }}>{item.model}</td>
          <td style={{ padding: '0 5px' }}>{item.serialNumber}</td>
          <td style={{ padding: '0 5px' }}>{item.propiedad || 'Degano'}</td>
          <td style={{ padding: '0 5px' }}>{item.location || '-'}</td>
          <td style={{ color: status.color, padding: '0 5px' }}>{status.label}</td>
        </tr>
      );
    }
  };

  const handleDeleteClick = () => setShowDeleteModal(true);

  const confirmDelete = async () => {
    let wasEquipmentDeleted = false;
    if (equipmentToDelete) {
      await fetch(`/api/equipment?id=${equipmentToDelete._id}`, { method: 'DELETE' });
      wasEquipmentDeleted = true;
      setEquipmentToDelete(null);
    } else if (selectedCategory) {
      const isCategoryToDelete = categories.some((cat: any) => cat._id === selectedCategory._id);
      const endpoint = isCategoryToDelete ? '/api/categories' : '/api/equipment';
      await fetch(`${endpoint}?id=${selectedCategory._id}`, { method: 'DELETE' });
      if (!isCategoryToDelete) wasEquipmentDeleted = true;
    }
    setShowDeleteModal(false);
    mutate('/api/categories');
    mutate('/api/equipment');
    mutate('/api/treeData');
    mutate('/api/categoryTreeData');
    if (wasEquipmentDeleted) {
      onCancel?.(false, { _deleted: true });
    } else {
      onCancel?.(true);
    }
  };

  const renderTitle = () => {
    if (!!newEvent && !selectedCategory) return 'Selecciona un equipamiento';
    if (!selectedCategory) return 'Selecciona una categoría';

    return (
      <Group justify='space-between' style={{ marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{selectedCategory.name}</h2>
        {!newEvent ? (
          <Group gap='xs'>
            <Tooltip label='Eliminar'>
              <ActionIcon color='red' variant='light' onClick={handleDeleteClick}>
                <IconTrash size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
        ) : (
          !!newEvent && selectedCategory.categoryId && (
            <Group>
              {selectedEquipmentIds.includes(selectedCategory._id) ? (
                <Tooltip label='Quitar del evento'>
                  <ActionIcon color='red' variant='light' onClick={() => onRemove?.(selectedCategory._id)} style={{ width: '8rem' }}>
                    <p style={{ marginRight: '15px' }}>Quitar</p>
                    <span style={{ fontSize: '18px', fontWeight: 'bold' }}>−</span>
                  </ActionIcon>
                </Tooltip>
              ) : (
                <Tooltip label={selectedCategory.outOfService?.isOut ? 'No disponible' : 'Agregar al evento'}>
                  <ActionIcon
                    color='green'
                    variant='light'
                    onClick={() => onEdit?.(selectedCategory)}
                    style={{ width: '8rem' }}
                    disabled={selectedCategory.outOfService?.isOut}
                  >
                    <p style={{ marginRight: '15px' }}>Agregar</p>
                    <IconPlus size={16} />
                  </ActionIcon>
                </Tooltip>
              )}
            </Group>
          )
        )}
      </Group>
    );
  };

  if (isLoadingEquipment) {
    return (
      <Box p='md' w='100%'>
        <Center py='xl'><Loader size='lg' /></Center>
      </Box>
    );
  }

  return (
    <Box p='md' w='100%'>
      {renderTitle()}
      {(isCategory || isItem || children.length > 0) && (
        <Box style={{ overflow: 'auto', maxHeight: '100vh', width: '100%', paddingBottom: '70px' }}>
          <Table
            striped
            highlightOnHover
            withColumnBorders
            withRowBorders
            style={{ width: '100%', borderCollapse: 'collapse', minWidth: newEvent && isCategory ? '400px' : '600px' }}
          >
            <thead style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
              {renderHeader()}
            </thead>
            <tbody>{renderRows()}</tbody>
          </Table>
        </Box>
      )}

      <Modal
        opened={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setEquipmentToDelete(null); }}
        title={`¿Seguro que querés eliminar este ${equipmentToDelete ? 'equipo alquilado' : isItem ? 'equipamiento' : 'carpeta'}?`}
        centered
      >
        <p>
          {equipmentToDelete ? (
            <>Vas a eliminar el equipo: <strong>{equipmentToDelete.name}</strong><br />Esta acción eliminará el equipamiento permanentemente de la base de datos.</>
          ) : isItem ? (
            'Esta acción eliminará el equipamiento permanentemente.'
          ) : (
            'Esto eliminará la carpeta y todo su contenido.'
          )}
        </p>
        <Group justify='flex-end' mt='md'>
          <Button variant='default' onClick={() => { setShowDeleteModal(false); setEquipmentToDelete(null); }}>
            Cancelar
          </Button>
          <Button color='red' onClick={confirmDelete}>Eliminar</Button>
        </Group>
      </Modal>
    </Box>
  );
}
