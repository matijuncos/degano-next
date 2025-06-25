// CreationPanel.tsx
'use client';
import useSWR, { mutate } from 'swr';
import { useState, useEffect } from 'react';
import {
  Button,
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
  const [customLocation, setCustomLocation] = useState<string>('');
  const { data: locations = [] } = useSWR('/api/equipmentLocation', (url) =>
    fetch(url).then((res) => res.json())
  );

  const isCreatingCategory =
    selectedCategory?._id === '' && !selectedCategory?.parentIdOriginal;
  const isCreatingEquipment =
    selectedCategory?._id === '' && !!selectedCategory?.parentIdOriginal;

  const isEditingEquipment = !!editItem?.categoryId;
  const isEditingCategory = !!editItem && !isEditingEquipment;

  useEffect(() => {
    if (editItem) {
      if (isEditingCategory) {
        setFormData({ name: editItem.name });
      } else {
        const rawRental = Number(editItem.rentalPrice || 0);
        const rawInvestment = Number(editItem.investmentPrice || 0);
        setFormData({
          name: editItem.name,
          code: editItem.code,
          brand: editItem.brand,
          model: editItem.model,
          serialNumber: editItem.serialNumber,
          rentalPrice: editItem.rentalPrice,
          rentalPriceFormatted: `$ ${new Intl.NumberFormat('es-AR').format(
            rawRental
          )}`,
          investmentPrice: editItem.investmentPrice,
          investmentPriceFormatted: `$ ${new Intl.NumberFormat('en-US').format(
            rawInvestment
          )}`,
          weight: editItem.weight,
          location: editItem.location || '',
          isOut: editItem.outOfService?.isOut || false,
          reason: editItem.outOfService?.reason || ''
        });
      }
    } else {
      setFormData({ isOut: false });
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

    let locationValue = formData.location;
    if (customLocation && !locations.includes(customLocation)) {
      const res = await fetch('/api/equipmentLocation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: customLocation })
      });
      const result = await res.json();
      locationValue = result.name;
    }

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
            investmentPrice: formData.investmentPrice,
            weight: formData.weight,
            location: locationValue
          };

    const res = await fetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, _id: id })
    });

    setFormData({});
    setCustomLocation('');
    const updatedItem = await res.json();
    mutate('/api/categories');
    mutate('/api/equipment');
    mutate('/api/treeData');
    mutate('/api/equipmentLocation');
    onCancel?.(false, updatedItem);
  };

  const handleCancel = () => {
    setFormData({});
    setCustomLocation('');
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
          <TextInput
            label='Precio de renta (ARS)'
            value={formData.rentalPriceFormatted || ''}
            onChange={(e) => {
              const rawValue = e.currentTarget.value.replace(/\D/g, '');
              const formattedValue = rawValue
                ? `$ ${new Intl.NumberFormat('es-AR').format(Number(rawValue))}`
                : '';
              setFormData((prev: any) => ({
                ...prev,
                rentalPrice: rawValue ? Number(rawValue) : 0,
                rentalPriceFormatted: formattedValue
              }));
            }}
            placeholder='$ 0'
          />

          <TextInput
            label='Precio de inversión (USD)'
            value={formData.investmentPriceFormatted || ''}
            onChange={(e) => {
              const rawValue = e.currentTarget.value.replace(/\D/g, '');
              const formattedValue = rawValue
                ? `$ ${new Intl.NumberFormat('en-US').format(Number(rawValue))}`
                : '';
              setFormData((prev: any) => ({
                ...prev,
                investmentPrice: rawValue ? Number(rawValue) : 0,
                investmentPriceFormatted: formattedValue
              }));
            }}
            placeholder='$ 0'
          />

          <NumberInput
            label='Peso (kg)'
            value={formData.weight || 0}
            onChange={(val) =>
              handleInput('weight', Number(Number(val).toFixed(2)))
            }
            step={0.1}
          />
          <Select
            label='Localización'
            data={[...locations, 'Otra...']}
            value={String(formData.location || '')}
            onChange={(val) => {
              if (val === 'Otra...') {
                setFormData({ ...formData, location: '' });
              } else {
                setFormData({ ...formData, location: val });
              }
            }}
          />
          {formData.location === '' && (
            <TextInput
              label='Nueva localización'
              placeholder='Ej: Depósito 2'
              value={customLocation}
              onChange={(e) => setCustomLocation(e.currentTarget.value)}
            />
          )}
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
