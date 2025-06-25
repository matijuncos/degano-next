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
import { IconPencil, IconTrash } from '@tabler/icons-react';
import { useState } from 'react';

export default function ContentPanel({
  selectedCategory,
  setDisableCreateEquipment,
  onEdit,
  onCancel
}: {
  selectedCategory: any;
  setDisableCreateEquipment: (val: boolean) => void;
  onEdit?: (item: any) => void;
  onCancel?: (wasCancelled: boolean, updatedItem?: any) => void;
}) {
  const fetcher = (url: string) => fetch(url).then((res) => res.json());
  const { data: categories = [] } = useSWR('/api/categories', fetcher);
  const { data: equipment = [] } = useSWR('/api/equipment', fetcher);

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
          <th>Nombre</th>
          <th>Stock total</th>
          <th>Disponible</th>
          <th>Código</th>
          <th>Marca</th>
          <th>Modelo</th>
          <th>N° Serie</th>
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
          <th>Estado</th>
          <th>Motivo</th>
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
      return items.map((item: any, index: number) => {
        return (
          <tr
            key={item._id}
            style={{
              backgroundColor:
                index % 2 === 0 ? 'rgba(255,255,255,0.05)' : 'transparent',
              textAlign: 'center',
              cursor: 'pointer',
              fontWeight: 500
            }}
            onClick={() => onEdit?.(item)}
          >
            <td>{item.name}</td>
            <td>{selectedCategory?.totalStock}</td>
            <td>{selectedCategory?.availableStock}</td>
            <td>{item.code}</td>
            <td>{item.brand}</td>
            <td>{item.model}</td>
            <td>{item.serialNumber}</td>
            <td style={{ color: item.outOfService?.isOut ? 'red' : 'green' }}>
              {item.outOfService?.isOut ? 'No disponible' : 'OK'}
            </td>
          </tr>
        );
      });
    } else if (isItem) {
      const item = equipment.find((eq: any) => eq._id === selectedCategory._id);
      if (!item) return null;

      return (
        <tr style={{ backgroundColor: 'rgba(255,255,255,0.05)', textAlign: 'center' }}>
          <td>{item.name}</td>
          <td>{item.code}</td>
          <td>{item.brand}</td>
          <td>{item.model}</td>
          <td>{item.serialNumber}</td>
          <td style={{ color: item.outOfService?.isOut ? 'red' : 'green' }}>
            {item.outOfService?.isOut ? 'No disponible' : 'OK'}
          </td>
          <td>{item.outOfService?.isOut ? item.outOfService?.reason : '-'}</td>
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
    if (!selectedCategory) return 'Selecciona una categoría';

    return (
      <Group justify='space-between' style={{ marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
          {selectedCategory.name}
        </h2>
        <Group gap='xs'>
          <Tooltip label='Eliminar'>
            <ActionIcon color='red' variant='light' onClick={handleDeleteClick}>
              <IconTrash size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>
    );
  };

  return (
    <div style={{ padding: '1rem', width: '100%', overflowX: 'auto' }}>
      {renderTitle()}
      {(isCategory || isItem || children.length > 0) && (
        <Table striped highlightOnHover withColumnBorders withRowBorders style={{
      width: '100%',
      borderCollapse: 'collapse',
      minWidth: '900px'
    }}>
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
