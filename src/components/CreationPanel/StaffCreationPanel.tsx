// StaffCreationPanel.tsx
'use client';
import 'dayjs/locale/es';
import { mutate } from 'swr';
import { useState, useEffect } from 'react';
import { Button, TextInput, Select, Group, Textarea } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import useNotification from '@/hooks/useNotification';
import { usePermissions } from '@/hooks/usePermissions';

const initialFormState = {
  fullName: '',
  cardId: '',
  rol: '',
  license: 'NO',
  licenseType: '',
  observations: '',
  birthDate: null
};

export default function StaffCreationPanel({
  selectedEmployee,
  editItem,
  onCancel
}: {
  selectedEmployee: any;
  editItem: any;
  onCancel?: (wasCancelled: boolean, updatedItem?: any) => void;
}) {
  const [formData, setFormData] = useState<any>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const notify = useNotification();
  const { can } = usePermissions();
  const newEmployee = selectedEmployee?._id === '';
  const editingEmployee = editItem && editItem?._id;

  // Limpiar formulario cuando se selecciona "nuevo empleado"
  useEffect(() => {
    if (selectedEmployee?._id === '' && !editItem) {
      setFormData(initialFormState);
    }
  }, [selectedEmployee, editItem]);

  // Cargar datos cuando se edita un empleado existente
  useEffect(() => {
    if (editItem && editItem._id) {
      setFormData({
        _id: editItem._id,
        fullName: editItem.fullName || '',
        cardId: editItem.cardId || '',
        rol: editItem.rol || '',
        license: editItem.license || 'NO',
        licenseType: editItem.licenseType || '',
        observations: editItem.observations || '',
        birthDate: editItem.birthDate ? new Date(editItem.birthDate) : null
      });
    }
  }, [editItem]);

  const handleInput = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    notify({ loading: true });

    const dataToSend = { ...formData };
    if (dataToSend.license === 'NO') {
      delete dataToSend.licenseType;
    }

    const isCreating = !formData._id;

    try {
      const res = await fetch('/api/employees', {
        method: isCreating ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend)
      });

      if (!res.ok) throw new Error('Error en la operación');

      const updated = await res.json();
      await mutate('/api/employees', updated, { revalidate: false });

      notify({
        message: isCreating ? 'Empleado creado' : 'Empleado actualizado'
      });

      // Limpiar formulario después de crear/actualizar exitosamente
      setFormData(initialFormState);
      onCancel?.(false);
    } catch (error) {
      console.error(error);
      notify({ type: 'defaultError' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setFormData(initialFormState);
    onCancel?.(true);
  };
  if (!newEmployee && !editingEmployee && !editItem) return null;

  return (
    <div style={{ padding: '1rem', height: '100vh' }}>
      <h3 style={{ fontWeight: 600, marginBottom: '1rem' }}>
        {newEmployee
          ? 'Crear nuevo empleado'
          : editingEmployee && 'Editar empleado'}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <TextInput
          label='Nombre completo'
          value={formData.fullName || ''}
          onChange={(e) => handleInput('fullName', e.currentTarget.value)}
        />
        <TextInput
          label='DNI'
          value={formData.cardId || ''}
          onChange={(e) => handleInput('cardId', e.currentTarget.value)}
        />
        <DateInput
          label='Fecha de nacimiento'
          placeholder='Seleccionar fecha'
          value={formData.birthDate}
          onChange={(date) => handleInput('birthDate', date)}
          valueFormat='DD/MM/YYYY'
          locale='es'
          clearable
        />
        <TextInput
          label='Rol'
          value={formData.rol || ''}
          onChange={(e) => handleInput('rol', e.currentTarget.value)}
        />
        <Select
          label='Tiene carnet?'
          data={['SI', 'NO']}
          value={String(formData.license || 'NO')}
          onChange={(val) => setFormData({ ...formData, license: val })}
        />
        {formData.license === 'SI' && (
          <TextInput
            label='Tipo de carnet'
            value={formData.licenseType || ''}
            onChange={(e) => handleInput('licenseType', e.currentTarget.value)}
          />
        )}
        <Textarea
          label='Observaciones'
          placeholder='Notas internas del empleado…'
          autosize
          minRows={3}
          maxRows={8}
          value={formData.observations || ''}
          onChange={(e) => handleInput('observations', e.currentTarget.value)}
        />
      </div>
      <Group mt='md' style={{ paddingBottom: 10 }}>
        {can('canEditEmployees') && (
          <Button onClick={handleSubmit} loading={isSubmitting} disabled={isSubmitting}>
            {newEmployee ? 'Finalizar carga' : 'Actualizar'}
          </Button>
        )}
        <Button variant='default' color='gray' onClick={handleCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
      </Group>
    </div>
  );
}
