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
  Box
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
  onCancel,
  newEvent,
  eventStartDate,
  eventEndDate,
  selectedEquipmentIds = [],
  refreshTrigger = 0
}: {
  selectedCategory: any;
  setDisableCreateEquipment: (val: boolean) => void;
  onSelect?: (item: any) => void;
  onEdit?: (item: any) => void;
  onRemove?: (equipmentId: string) => void;
  onCancel?: (wasCancelled: boolean, updatedItem?: any) => void;
  newEvent: boolean;
  eventStartDate?: Date | string;
  eventEndDate?: Date | string;
  selectedEquipmentIds?: string[];
  refreshTrigger?: number;
}) {
  const { data: categories = [] } = useSWR('/api/categories', async (url: string) => {
    const response = await fetch(url, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    return response.json();
  }, {
    dedupingInterval: 0,
    revalidateOnMount: true
  });

  // Función para determinar el estado del equipamiento
  const getEquipmentStatus = (item: any) => {
    // Primero verificar si está en un evento (tiene prioridad)
    if (item.outOfService?.isOut && item.outOfService?.reason === 'En Evento') {
      return { label: 'En Uso', color: '#fbbf24' };
    }

    // Luego verificar si está fuera de servicio por otros motivos (roto, mantenimiento, etc.)
    if (item.outOfService?.isOut) {
      return { label: 'No Disponible', color: 'red' };
    }

    // Disponible: no está fuera de servicio
    return { label: 'Disponible', color: 'green' };
  };

  // Estado local para equipamiento - NO usar SWR para evitar caché
  const [equipment, setEquipment] = useState<any[]>([]);
  const [isLoadingEquipment, setIsLoadingEquipment] = useState(false);
  const [equipmentUrl, setEquipmentUrl] = useState<string>('');

  // Construir URL solo cuando cambian las fechas
  useEffect(() => {
    const url = eventStartDate && eventEndDate
      ? `/api/equipment?eventStartDate=${new Date(eventStartDate).toISOString()}&eventEndDate=${new Date(eventEndDate).toISOString()}`
      : '/api/equipment';
    setEquipmentUrl(url);
  }, [eventStartDate, eventEndDate]);

  // Fetch directo sin caché solo cuando cambia la URL o refreshTrigger
  useEffect(() => {
    if (!equipmentUrl) return;

    const fetchEquipment = async () => {
      setIsLoadingEquipment(true);
      try {
        // Agregar timestamp para evitar caché del navegador
        const cacheBuster = `${equipmentUrl}${equipmentUrl.includes('?') ? '&' : '?'}_t=${Date.now()}`;
        const response = await fetch(cacheBuster, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
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

  const children = categories.filter(
    (cat: any) => cat.parentId === selectedCategory?._id
  );
  const items = equipment.filter(
    (eq: any) => eq.categoryId === selectedCategory?._id
  );

  const isCategory = categories.some(
    (cat: any) => cat._id === selectedCategory?._id
  );
  const isItem = equipment.some((eq: any) => eq._id === selectedCategory?._id);

  if (selectedCategory) {
    setDisableCreateEquipment(isItem);
  }

  // Función para manejar el click en equipos (similar a TreeView handleSelect)
  const handleEquipmentClick = (item: any) => {
    // Si es un equipo (tiene categoryId), seleccionarlo
    if (item.categoryId) {
      // Verificar si ya está seleccionado
      const isCurrentlySelected = selectedCategory?._id === item._id;

      if (!isCurrentlySelected) {
        // Solo seleccionar si no está seleccionado
        // No deseleccionamos equipos individuales porque vaciaría el ContentPanel
        onSelect?.(item);
        // En el caso de newEvent, NO llamamos a onEdit aquí porque
        // el onEdit se usa para agregar al evento (botón +)
        // En el caso de equipment page, onEdit se llama para editar
        if (!newEvent) {
          onEdit?.(item);
        }
      }
      // Si ya está seleccionado, no hacemos nada (no deseleccionamos)
    }
  };

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
      return (
        <tr>
          {newEvent && <th>Acción</th>}
          <th>Nombre</th>
          <th>Stock total</th>
          <th>Disponible</th>
          <th>Código</th>
          <th>Marca</th>
          <th>Modelo</th>
          <th>N° Serie</th>
          <th>Propiedad</th>
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
          <th>Estado</th>
          <th>Locación</th>
        </tr>
      );
    }
  };

  const renderRows = () => {
    if (!selectedCategory) return null;
    if (children.length > 0) {
      return children.map((child: any, index: number) => {
        // Calcular stock dinámicamente para cada subcategoría
        const childEquipment = equipment.filter((eq: any) => eq.categoryId === child._id);
        const childTotalStock = childEquipment.length;
        const childAvailableStock = childEquipment.filter((eq: any) => !eq.outOfService?.isOut).length;

        return (
          <tr
            key={child._id}
            style={{
              backgroundColor:
                index % 2 === 0 ? 'rgba(255,255,255,0.05)' : 'transparent',
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
      // Calcular stock dinámicamente basado en los equipos reales
      const dynamicTotalStock = items.length;
      const dynamicAvailableStock = items.filter(
        (item: any) => !item.outOfService?.isOut
      ).length;
      return items.map((item: any, index: number) => {
        const isSelected = selectedEquipmentIds.includes(item._id);
        const status = getEquipmentStatus(item);
        const displayStatus = newEvent && isSelected ? 'RESERVADO' : status.label;
        const displayColor = newEvent && isSelected ? '#fbbf24' : status.color;

        return (
          <tr
            key={item._id}
            style={{
              backgroundColor:
                index % 2 === 0 ? 'rgba(255,255,255,0.05)' : 'transparent',
              textAlign: 'center',
              fontWeight: 500,
              whiteSpace: 'nowrap',
              cursor: 'pointer'
            }}
            onClick={() => handleEquipmentClick(item)}
          >
            {newEvent && (
              <td style={{ padding: '0 5px' }}>
                <Group gap='xs' wrap='nowrap'>
                  {isSelected ? (
                    <ActionIcon
                      size='md'
                      color='red'
                      variant='light'
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemove?.(item._id);
                      }}
                    >
                      <span style={{ fontSize: '18px', fontWeight: 'bold' }}>−</span>
                    </ActionIcon>
                  ) : (
                    <ActionIcon
                      size='md'
                      color='green'
                      variant='light'
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit?.(item);
                      }}
                      disabled={item.outOfService?.isOut}
                    >
                      <span style={{ fontSize: '18px', fontWeight: 'bold' }}>+</span>
                    </ActionIcon>
                  )}
                  {item.propiedad === 'Alquilado' && (
                    <Tooltip label="Eliminar equipo alquilado">
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
                </Group>
              </td>
            )}
            <td style={{ padding: '0 5px' }}>{item.name}</td>
            <td style={{ padding: '0 5px' }}>{dynamicTotalStock}</td>
            <td style={{ padding: '0 5px' }}>{dynamicAvailableStock}</td>
            <td style={{ padding: '0 5px' }}>{item.code}</td>
            <td style={{ padding: '0 5px' }}>{item.brand}</td>
            <td style={{ padding: '0 5px' }}>{item.model}</td>
            <td style={{ padding: '0 5px' }}>{item.serialNumber}</td>
            <td style={{ padding: '0 5px' }}>{item.propiedad || 'Degano'}</td>
            <td
              style={{
                color: displayColor,
                padding: '0 5px'
              }}
            >
              {displayStatus}
            </td>
            {!newEvent && (
              <td style={{ padding: '0 5px', textAlign: 'center' }}>
                {item.propiedad === 'Alquilado' && (
                  <Tooltip label="Eliminar equipo alquilado">
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
            )}
          </tr>
        );
      });
    } else if (isItem) {
      const item = equipment.find((eq: any) => eq._id === selectedCategory._id);
      if (!item) return null;

      const isSelected = selectedEquipmentIds.includes(item._id);
      const status = getEquipmentStatus(item);
      const displayStatus = newEvent && isSelected ? 'RESERVADO' : status.label;
      const displayColor = newEvent && isSelected ? '#fbbf24' : status.color;

      return (
        <tr
          style={{
            backgroundColor: 'rgba(255,255,255,0.05)',
            textAlign: 'center',
            whiteSpace: 'nowrap',
            cursor: 'pointer'
          }}
          onClick={() => handleEquipmentClick(item)}
        >
          <td style={{ padding: '0 5px' }}>{item.name}</td>
          <td style={{ padding: '0 5px' }}>{item.code}</td>
          <td style={{ padding: '0 5px' }}>{item.brand}</td>
          <td style={{ padding: '0 5px' }}>{item.model}</td>
          <td style={{ padding: '0 5px' }}>{item.serialNumber}</td>
          <td style={{ padding: '0 5px' }}>{item.propiedad || 'Degano'}</td>
          <td
            style={{
              color: displayColor,
              padding: '0 5px'
            }}
          >
            {displayStatus}
          </td>
          <td style={{ padding: '0 5px' }}>{item.location}</td>
        </tr>
      );
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    let wasEquipmentDeleted = false;

    // Si hay un equipo específico para eliminar (desde botón en fila)
    if (equipmentToDelete) {
      await fetch(`/api/equipment?id=${equipmentToDelete._id}`, {
        method: 'DELETE'
      });
      wasEquipmentDeleted = true;
      setEquipmentToDelete(null);
    }
    // Si no, usar el selectedCategory (eliminación desde botón superior)
    else if (selectedCategory) {
      const isCategoryToDelete = categories.some(
        (cat: any) => cat._id === selectedCategory._id
      );
      const endpoint = isCategoryToDelete ? '/api/categories' : '/api/equipment';

      await fetch(`${endpoint}?id=${selectedCategory._id}`, {
        method: 'DELETE'
      });

      // Si se eliminó un equipo (no una categoría), marcar para refetch
      if (!isCategoryToDelete) {
        wasEquipmentDeleted = true;
      }
    }

    setShowDeleteModal(false);
    mutate('/api/categories');
    mutate('/api/equipment');
    mutate('/api/treeData');
    mutate('/api/categoryTreeData');

    // Si se eliminó equipo, pasar false para que se incremente refreshTrigger
    // Esto fuerza un refetch completo de los datos
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
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
          {selectedCategory.name}
        </h2>
        {!newEvent ? (
          <Group gap='xs'>
            <Tooltip label='Eliminar'>
              <ActionIcon
                color='red'
                variant='light'
                onClick={handleDeleteClick}
              >
                <IconTrash size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
        ) : (
          !!newEvent &&
          selectedCategory.categoryId && (
            <Group>
              {selectedEquipmentIds.includes(selectedCategory._id) ? (
                <Tooltip label='Quitar del evento'>
                  <ActionIcon
                    color='red'
                    variant='light'
                    onClick={() => onRemove?.(selectedCategory._id)}
                    style={{ width: '8rem' }}
                  >
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

  return (
    <Box p="md" w="100%">
      {renderTitle()}
      {(isCategory || isItem || children.length > 0) && (
        <Box style={{ overflowX: 'auto', width: '100%' }}>
          <Table
            striped
            highlightOnHover
            withColumnBorders
            withRowBorders
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              minWidth: '600px'
            }}
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
        onClose={() => {
          setShowDeleteModal(false);
          setEquipmentToDelete(null);
        }}
        title={`¿Seguro que querés eliminar este ${
          equipmentToDelete ? 'equipo alquilado' : isItem ? 'equipamiento' : 'carpeta'
        }?`}
        centered
      >
        <p>
          {equipmentToDelete ? (
            <>
              Vas a eliminar el equipo: <strong>{equipmentToDelete.name}</strong>
              <br />
              Esta acción eliminará el equipamiento permanentemente de la base de datos.
            </>
          ) : isItem ? (
            'Esta acción eliminará el equipamiento permanentemente.'
          ) : (
            'Esto eliminará la carpeta y todo su contenido.'
          )}
        </p>
        <Group justify='flex-end' mt='md'>
          <Button
            variant='default'
            onClick={() => {
              setShowDeleteModal(false);
              setEquipmentToDelete(null);
            }}
          >
            Cancelar
          </Button>
          <Button color='red' onClick={confirmDelete}>
            Eliminar
          </Button>
        </Group>
      </Modal>
    </Box>
  );
}
