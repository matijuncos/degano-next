// ContentPanel.tsx
'use client';
import useSWR, { mutate } from 'swr';
import {
  Table,
  ActionIcon,
  Group,
  Tooltip,
  Modal,
  Button
} from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import { IconPlus } from '@tabler/icons-react';
import { useState } from 'react';

export default function ContentPanel({
  selectedCategory,
  setDisableCreateEquipment,
  onEdit,
  onRemove,
  onCancel,
  newEvent,
  eventStartDate,
  eventEndDate,
  selectedEquipmentIds = []
}: {
  selectedCategory: any;
  setDisableCreateEquipment: (val: boolean) => void;
  onEdit?: (item: any) => void;
  onRemove?: (equipmentId: string) => void;
  onCancel?: (wasCancelled: boolean, updatedItem?: any) => void;
  newEvent: boolean;
  eventStartDate?: Date | string;
  eventEndDate?: Date | string;
  selectedEquipmentIds?: string[];
}) {
  const fetcher = (url: string) => fetch(url).then((res) => res.json());
  const { data: categories = [] } = useSWR('/api/categories', fetcher);

  // Función para determinar el estado del equipamiento
  const getEquipmentStatus = (item: any) => {
    // No Disponible: fuera de servicio (pero no en evento)
    if (item.outOfService?.isOut && item.outOfService?.reason !== 'En Evento') {
      return { label: 'No Disponible', color: 'red' };
    }

    // En Uso: en evento o location diferente de "Deposito"
    if (
      (item.outOfService?.isOut && item.outOfService?.reason === 'En Evento') ||
      (item.location && item.location !== 'Deposito')
    ) {
      return { label: 'En Uso', color: '#fbbf24' }; // amarillo tipo warning
    }

    // Disponible: en "Deposito" y no fuera de servicio
    return { label: 'Disponible', color: 'green' };
  };

  // Construir URL con parámetros de fecha si están presentes
  const equipmentUrl = eventStartDate && eventEndDate
    ? `/api/equipment?eventStartDate=${new Date(eventStartDate).toISOString()}&eventEndDate=${new Date(eventEndDate).toISOString()}`
    : '/api/equipment';

  const { data: equipment = [] } = useSWR(equipmentUrl, fetcher);

  const [showDeleteModal, setShowDeleteModal] = useState(false);

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
            <td>{child.totalStock ?? '-'}</td>
            <td>{child.availableStock ?? '-'}</td>
          </tr>
        );
      });
    } else if (isCategory) {
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
              whiteSpace: 'nowrap'
            }}
          >
            {newEvent && (
              <td style={{ padding: '0 5px' }}>
                {isSelected ? (
                  <ActionIcon
                    size='md'
                    color='red'
                    variant='light'
                    onClick={() => onRemove?.(item._id)}
                  >
                    <span style={{ fontSize: '18px', fontWeight: 'bold' }}>−</span>
                  </ActionIcon>
                ) : (
                  <ActionIcon
                    size='md'
                    color='green'
                    variant='light'
                    onClick={() => onEdit?.(item)}
                    disabled={item.outOfService?.isOut}
                  >
                    <span style={{ fontSize: '18px', fontWeight: 'bold' }}>+</span>
                  </ActionIcon>
                )}
              </td>
            )}
            <td style={{ padding: '0 5px' }}>{item.name}</td>
            <td style={{ padding: '0 5px' }}>{selectedCategory?.totalStock}</td>
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
          </tr>
        );
      });
    } else if (isItem) {
      const item = equipment.find((eq: any) => eq._id === selectedCategory._id);
      if (!item) return null;

      return (
        <tr
          style={{
            backgroundColor: 'rgba(255,255,255,0.05)',
            textAlign: 'center',
            whiteSpace: 'nowrap'
          }}
        >
          <td style={{ padding: '0 5px' }}>{item.name}</td>
          <td style={{ padding: '0 5px' }}>{item.code}</td>
          <td style={{ padding: '0 5px' }}>{item.brand}</td>
          <td style={{ padding: '0 5px' }}>{item.model}</td>
          <td style={{ padding: '0 5px' }}>{item.serialNumber}</td>
          <td style={{ padding: '0 5px' }}>{item.propiedad || 'Degano'}</td>
          <td
            style={{
              color: getEquipmentStatus(item).color,
              padding: '0 5px'
            }}
          >
            {getEquipmentStatus(item).label}
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
    if (!selectedCategory) return;

    const isCategoryToDelete = categories.some(
      (cat: any) => cat._id === selectedCategory._id
    );
    const endpoint = isCategoryToDelete ? '/api/categories' : '/api/equipment';

    await fetch(`${endpoint}?id=${selectedCategory._id}`, {
      method: 'DELETE'
    });

    setShowDeleteModal(false);
    mutate('/api/categories');
    mutate('/api/equipment');
    mutate('/api/treeData');
    onCancel?.(true);
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
              <Tooltip label='Agregar al evento'>
                <ActionIcon
                  color='green'
                  variant='light'
                  onClick={() => onEdit?.(selectedCategory)}
                  style={{ width: '8rem' }}
                >
                  <p style={{ marginRight: '15px' }}>Agregar</p>
                  <IconPlus size={16} />
                </ActionIcon>
              </Tooltip>
            </Group>
          )
        )}
      </Group>
    );
  };

  return (
    <div style={{ padding: '1rem', width: '100%', overflowX: 'auto' }}>
      {renderTitle()}
      {(isCategory || isItem || children.length > 0) && (
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
      )}

      <Modal
        opened={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title={`¿Seguro que querés eliminar este ${
          isItem ? 'equipamiento' : 'carpeta'
        }?`}
        centered
      >
        <p>
          {isItem
            ? 'Esta acción eliminará el equipamiento permanentemente.'
            : 'Esto eliminará la carpeta y todo su contenido.'}
        </p>
        <Group justify='flex-end' mt='md'>
          <Button variant='default' onClick={() => setShowDeleteModal(false)}>
            Cancelar
          </Button>
          <Button color='red' onClick={confirmDelete}>
            Eliminar
          </Button>
        </Group>
      </Modal>
    </div>
  );
}
