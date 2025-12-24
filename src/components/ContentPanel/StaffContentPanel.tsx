// StaffContentPanel.tsx
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
import { useState } from 'react';
import useNotification from '@/hooks/useNotification';

export default function StaffContentPanel({
  selectedEmployee,
  setDisableCreateEquipment,
  onEdit,
  onCancel
}: {
  selectedEmployee: any;
  setDisableCreateEquipment: (val: boolean) => void;
  onEdit?: (item: any) => void;
  onCancel?: (wasCancelled: boolean, updatedItem?: any) => void;
}) {
  const notify = useNotification();
  // const fetcher = (url: string) => fetch(url).then((res) => res.json());
  // const { data: categories = [] } = useSWR('/api/categories', fetcher);
  // const { data: equipment = [] } = useSWR('/api/equipment', fetcher);

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // const children = categories.filter(
  //   (cat: any) => cat.parentId === selectedEmployee?._id
  // );
  // const items = equipment.filter(
  //   (eq: any) => eq.categoryId === selectedEmployee?._id
  // );

  // const isCategory = categories.some(
  //   (cat: any) => cat._id === selectedEmployee?._id
  // );
  // const isItem = equipment.some((eq: any) => eq._id === selectedEmployee?._id);
  const renderHeader = () => {
    return (
      <tr>
        <th>DNI</th>
        <th>Fecha de nacimiento</th>
        <th>Rol</th>
        <th>Carnet</th>
        {selectedEmployee.licenseType && <th>Tipo de carnet</th>}
      </tr>
    );
  };

  const formatBirthDate = (date: string | Date | null | undefined) => {
    if (!date) return '-';
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  };

  const renderRows = () => {
    const item = selectedEmployee;
    return (
      <tr
        style={{
          backgroundColor: 'rgba(255,255,255,0.05)',
          textAlign: 'center'
        }}
      >
        <td>{item.cardId}</td>
        <td>{formatBirthDate(item.birthDate)}</td>
        <td>{item.rol}</td>
        <td style={{ color: item.license === 'NO' ? 'red' : 'green' }}>
          {item.license}
        </td>
        {item.licenseType && <td>{item.licenseType}</td>}
      </tr>
    );
  };

  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedEmployee) return;
    try {
      const res = await fetch(`/api/employees?id=${selectedEmployee._id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) throw new Error('Error en la operación');
      const updated = await res.json();
      await mutate('/api/employees', updated, { revalidate: false });
      notify({ message: 'Se elimino el empleado correctamente' });
      setShowDeleteModal(false);
    } catch (error) {
      notify({ type: 'defaultError' });
    }
    onCancel?.(true);
  };

  const renderTitle = () => {
    if (!selectedEmployee) return 'Empleado';

    return (
      <Group justify='space-between' style={{ marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
          {selectedEmployee.fullName}
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
      {selectedEmployee && selectedEmployee._id && (
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
        title={`¿Seguro que querés eliminar este empleado?`}
        centered
      >
        <p>Esta acción eliminará el empleado permanentemente.</p>
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
