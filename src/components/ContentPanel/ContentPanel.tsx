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
  onEdit
}: {
  selectedCategory: any;
  setDisableCreateEquipment: (val: boolean) => void;
  onEdit?: (item: any) => void;
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
          <th>Marca</th>
          <th>Modelo</th>
          <th>N° Serie</th>
          <th>Precio Renta</th>
          <th>Precio Inversión</th>
          <th>Estado</th>
        </tr>
      );
    } else if (isItem) {
      return (
        <tr>
          <th>Nombre</th>
          <th>Marca</th>
          <th>Modelo</th>
          <th>N° Serie</th>
          <th>Precio Renta</th>
          <th>Precio Inversión</th>
          <th>Estado</th>
        </tr>
      );
    }
  };

  const renderRows = () => {
    if (!selectedCategory) return null;
    if (children.length > 0) {
      return children.map((child: any, index: number) => {
        const itemsInChild = equipment.filter(
          (eq: any) => eq.categoryId === child._id
        );
        const stockTotal = itemsInChild.length;
        const availableCount = itemsInChild.filter(
          (eq: any) => !eq.outOfService?.isOut
        ).length;

        return (
          <tr
            key={child._id}
            style={{
              backgroundColor:
                index % 2 === 0 ? 'rgba(255,255,255,0.05)' : 'transparent'
            }}
          >
            <td>{child.name}</td>
            <td>{stockTotal}</td>
            <td>{availableCount}</td>
          </tr>
        );
      });
    } else if (isCategory) {
      return items.map((item: any, index: number) => {
        const stockTotal = items.length;
        const availableCount = items.filter(
          (eq: any) => !eq.outOfService?.isOut
        ).length;

        return (
          <tr
            key={item._id}
            style={{
              backgroundColor:
                index % 2 === 0 ? 'rgba(255,255,255,0.05)' : 'transparent'
            }}
          >
            <td>{item.name}</td>
            <td>{stockTotal}</td>
            <td>{availableCount}</td>
            <td>{item.brand}</td>
            <td>{item.model}</td>
            <td>{item.serialNumber}</td>
            <td>${item.rentalPrice}</td>
            <td>${item.investmentPrice}</td>
            <td>
              {item.outOfService?.isOut
                ? `Fuera (${item.outOfService.reason})`
                : 'OK'}
            </td>
          </tr>
        );
      });
    } else if (isItem) {
      const item = equipment.find((eq: any) => eq._id === selectedCategory._id);
      if (!item) return null;

      return (
        <tr style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
          <td>{item.name}</td>
          <td>{item.brand}</td>
          <td>{item.model}</td>
          <td>{item.serialNumber}</td>
          <td>${item.rentalPrice}</td>
          <td>${item.investmentPrice}</td>
          <td>
            {item.outOfService?.isOut
              ? `Fuera (${item.outOfService.reason})`
              : 'OK'}
          </td>
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
    mutate('/api/categories', undefined, { revalidate: true });
    mutate('/api/equipment', undefined, { revalidate: true });
    mutate('/api/treeData', undefined, { revalidate: true });
  };

  const renderTitle = () => {
    if (!selectedCategory) return 'Selecciona una categoría';

    return (
      <Group justify='space-between' style={{ marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
          {selectedCategory.name}
        </h2>
        <Group gap='xs'>
          <Tooltip label='Editar'>
            <ActionIcon
              variant='light'
              onClick={() => onEdit?.(selectedCategory)}
            >
              <IconPencil size={16} />
            </ActionIcon>
          </Tooltip>
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
        <Table striped highlightOnHover withColumnBorders withRowBorders>
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
