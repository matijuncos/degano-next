// CreationPanel.tsx
'use client';
import useSWR, { mutate } from 'swr';
import { useState, useEffect } from 'react';
import {
  Button,
  Divider,
  TextInput,
  NumberInput,
  Select,
  Textarea,
  Group
} from '@mantine/core';

export default function CreationPanel({
  selectedCategory,
  editItem,
  onCancel
}: {
  selectedCategory: any;
  editItem: any;
  onCancel?: (wasCancelled: boolean, updatedItem?: any) => void;
}) {
  const [formData, setFormData] = useState<any>({ isOut: false });

  const isCreatingCategory =
    selectedCategory?._id === '' && !selectedCategory?.parentIdOriginal;
  const isCreatingEquipment =
    selectedCategory?._id === '' && !!selectedCategory?.parentIdOriginal;

  const isEditingEquipment = !!editItem?.categoryId;
  const isEditingCategory = !!editItem && !isEditingEquipment;

  useEffect(() => {
    if (editItem) {
      setFormData(
        isEditingCategory
          ? { name: editItem.name }
          : {
              name: editItem.name,
              code: editItem.code,
              brand: editItem.brand,
              model: editItem.model,
              serialNumber: editItem.serialNumber,
              rentalPrice: editItem.rentalPrice,
              investmentPrice: editItem.investmentPrice,
              isOut: editItem.outOfService?.isOut || false,
              reason: editItem.outOfService?.reason || ''
            }
      );
    }
  }, [editItem]);

  const handleInput = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = async () => {
    const isEdit = !!editItem;
    const endpoint =
      isCreatingCategory || isEditingCategory
        ? '/api/categories'
        : '/api/equipment';
    const method = isEdit ? 'PUT' : 'POST';
    const id = editItem?._id;

    const payload =
      isCreatingCategory || isEditingCategory
        ? {
            name: formData.name,
            parentId: editItem?.parentId || selectedCategory.parentId
          }
        : {
            name: formData.name,
            code: formData.code,
            categoryId:
              editItem?.categoryId || selectedCategory.parentIdOriginal,
            outOfService: {
              isOut: formData.isOut,
              reason: formData.reason || ''
            },
            brand: formData.brand,
            model: formData.model,
            serialNumber: formData.serialNumber,
            rentalPrice: formData.rentalPrice,
            investmentPrice: formData.investmentPrice
          };

    const res = await fetch(`${endpoint}${isEdit ? '' : ''}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, _id: id })
    });

    setFormData({});
    const updatedItem = await res.json();
    mutate('/api/categories');
    mutate('/api/equipment');
    mutate('/api/treeData');
    onCancel?.(false, updatedItem);
  };

  const handleCancel = () => {
    setFormData({});
    onCancel?.(true);
  };

  if (!isCreatingCategory && !isCreatingEquipment && !editItem) return null;

  return (
    <div style={{ padding: '1rem', height: '100vh' }}>
      <h3 style={{ fontWeight: 600, marginBottom: '1rem' }}>
        {isCreatingCategory
          ? 'Crear nueva categoría'
          : isCreatingEquipment
          ? 'Cargar nuevo equipamiento'
          : isEditingCategory
          ? 'Editar categoría'
          : 'Editar equipamiento'}
      </h3>

      {isCreatingCategory || isEditingCategory ? (
        <TextInput
          label='Nombre de la categoría'
          placeholder='Ej: Monitores de sonido'
          value={formData.name || ''}
          onChange={(e) => handleInput('name', e.currentTarget.value)}
        />
      ) : (
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
        >
          <TextInput
            label='Nombre del equipo'
            value={formData.name || ''}
            onChange={(e) => handleInput('name', e.currentTarget.value)}
          />
          <TextInput
            label='Código interno'
            value={formData.code || ''}
            onChange={(e) => handleInput('code', e.currentTarget.value)}
          />
          <TextInput
            label='Marca'
            value={formData.brand || ''}
            onChange={(e) => handleInput('brand', e.currentTarget.value)}
          />
          <TextInput
            label='Modelo'
            value={formData.model || ''}
            onChange={(e) => handleInput('model', e.currentTarget.value)}
          />
          <TextInput
            label='N° de serie'
            value={formData.serialNumber || ''}
            onChange={(e) => handleInput('serialNumber', e.currentTarget.value)}
          />
          <NumberInput
            label='Precio de renta'
            value={formData.rentalPrice || 0}
            onChange={(val) => handleInput('rentalPrice', val)}
          />
          <NumberInput
            label='Precio de inversión'
            value={formData.investmentPrice || 0}
            onChange={(val) => handleInput('investmentPrice', val)}
          />
          <Select
            label='Estado'
            data={['Disponible', 'Fuera de servicio']}
            value={formData.isOut ? 'Fuera de servicio' : 'Disponible'}
            onChange={(val) =>
              handleInput('isOut', val === 'Fuera de servicio')
            }
          />
          {formData.isOut && (
            <Textarea
              label='Motivo de fuera de servicio'
              value={formData.reason || ''}
              onChange={(e) => handleInput('reason', e.currentTarget.value)}
            />
          )}
        </div>
      )}

      <Group mt='md'>
        <Button onClick={handleSubmit}>
          {isCreatingCategory || isCreatingEquipment
            ? 'Finalizar carga'
            : 'Actualizar'}
        </Button>
        <Button variant='default' color='gray' onClick={handleCancel}>
          Cancelar
        </Button>
      </Group>
    </div>
  );
}
