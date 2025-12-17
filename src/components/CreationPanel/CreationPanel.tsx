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
import { IconUpload, IconFile, IconHistory } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import { formatPrice } from '@/utils/priceUtils';
import EquipmentHistoryModal from '@/components/EquipmentHistory/EquipmentHistoryModal';

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
  const [
    historyModalOpened,
    { open: openHistory, close: closeHistory }
  ] = useDisclosure(false);

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
          rentalPriceFormatted: formatPrice(
            rawRental
          ),
          investmentPrice: editItem.investmentPrice,
          investmentPriceFormatted: formatPrice(
            rawInvestment
          ),
          weight: editItem.weight,
          location: editItem.location || '',
          propiedad: editItem.propiedad || 'Degano',
          isOut: editItem.outOfService?.isOut || false,
          reason: editItem.outOfService?.reason || '',
          history: editItem.history || '',
          imageUrl: editItem.imageUrl || '',
          pdfUrl: editItem.pdfUrl || '',
          pdfFileName: editItem.pdfFileName || null
        });
      }
    } else {
      setFormData({ isOut: false });
    }
  }, [editItem]);

  const handleInput = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const deleteFromS3 = async (url: string) => {
    if (!url) return;
    await fetch('/api/deleteFromS3', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, bucket: 'equipment' })
    });
  };

  const uploadToS3 = async (file: File): Promise<string> => {
    const res = await fetch('/api/uploadToS3', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: file.name,
        fileType: file.type,
        bucket: 'equipment'
      })
    });
    const { signedUrl, url } = await res.json();

    await fetch(signedUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type
      },
      body: file
    });

    return url; // URL pública para guardar en Mongo
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

    let imageUrl = formData.imageUrl;
    if (formData.imageFile instanceof File) {
      imageUrl = await uploadToS3(formData.imageFile);
    }

    let pdfUrl = formData.pdfUrl;
    if (formData.pdfFile instanceof File) {
      pdfUrl = await uploadToS3(formData.pdfFile);
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
            history: formData.history || '',
            brand: formData.brand,
            model: formData.model,
            serialNumber: formData.serialNumber,
            rentalPrice: formData.rentalPrice,
            investmentPrice: formData.investmentPrice,
            weight: formData.weight,
            location: locationValue,
            propiedad: formData.propiedad || 'Degano',
            imageUrl,
            pdfUrl,
            pdfFileName:
              formData.pdfFile?.name || `${formData.name} ${formData.model}.pdf`
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
                ? formatPrice(Number(rawValue))
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
            label='Propiedad'
            data={['Degano', 'Alquilado']}
            value={formData.propiedad || 'Degano'}
            onChange={(val) => handleInput('propiedad', val)}
          />
          <Select
            label='Estado'
            data={['Disponible', 'En Uso', 'Fuera de servicio']}
            value={
              formData.isOut && formData.reason === 'En Evento'
                ? 'En Uso'
                : formData.isOut
                ? 'Fuera de servicio'
                : 'Disponible'
            }
            onChange={(val) => {
              if (val === 'Disponible') {
                handleInput('isOut', false);
                handleInput('reason', '');
              } else if (val === 'En Uso') {
                handleInput('isOut', true);
                handleInput('reason', 'En Evento');
              } else if (val === 'Fuera de servicio') {
                handleInput('isOut', true);
                handleInput('reason', '');
              }
            }}
            disabled={formData.isOut && formData.reason === 'En Evento'}
          />
          {formData.isOut && formData.reason !== 'En Evento' && (
            <Textarea
              label='Motivo de fuera de servicio'
              value={formData.reason || ''}
              onChange={(e) => handleInput('reason', e.currentTarget.value)}
            />
          )}
          {formData.isOut && formData.reason === 'En Evento' && (
            <div
              style={{
                padding: '8px 12px',
                backgroundColor: 'rgba(251, 191, 36, 0.1)',
                borderRadius: '4px',
                border: '1px solid rgba(251, 191, 36, 0.3)'
              }}
            >
              <span style={{ fontSize: '14px', color: '#fbbf24' }}>
                ⚠️ Este equipamiento está asignado a un evento. Para cambiar su estado, primero debes quitarlo del evento correspondiente.
              </span>
            </div>
          )}
          <Textarea
            label='Historial'
            placeholder='Escribí cambios, reparaciones, observaciones...'
            minRows={4}
            autosize
            value={formData.history || ''}
            onChange={(e) => handleInput('history', e.currentTarget.value)}
          />
          <div>
            <label>Imagen del equipo (máx. 10MB)</label>
            <div
              style={{
                marginTop: 6,
                display: 'flex',
                flexDirection: 'column',
                gap: 4
              }}
            >
              <Button
                variant='outline'
                leftSection={<IconUpload size={16} />}
                onClick={() => document.getElementById('imageInput')?.click()}
              >
                Seleccionar imagen
              </Button>
              <span style={{ fontSize: 12, color: '#666' }}>
                {formData.imageFile?.name}
              </span>
              <input
                id='imageInput'
                type='file'
                accept='image/*'
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file && file.size > 10 * 1024 * 1024) {
                    alert('La imagen debe ser menor a 10MB');
                    return;
                  }
                  handleInput('imageFile', file);
                }}
              />
            </div>
          </div>
          {/* Previsualización de imagen */}
          {formData.imageFile || formData.imageUrl ? (
            <div>
              <label>Vista previa de imagen</label>
              <div style={{ marginTop: 8 }}>
                <a
                  href={formData.imageUrl}
                  target='_blank'
                  rel='noopener noreferrer'
                  title='Abrir imagen en pestaña nueva'
                  style={{ cursor: 'pointer' }}
                >
                  <img
                    src={
                      formData.imageFile
                        ? URL.createObjectURL(formData.imageFile)
                        : formData.imageUrl || ''
                    }
                    alt='Preview'
                    style={{
                      maxWidth: 100,
                      maxHeight: 100,
                      objectFit: 'contain'
                    }}
                  />
                </a>
              </div>
              <Button
                variant='light'
                color='red'
                onClick={async () => {
                  if (formData.imageUrl) await deleteFromS3(formData.imageUrl);
                  setFormData((prev: any) => ({
                    ...prev,
                    imageFile: null,
                    imageUrl: ''
                  }));
                }}
              >
                Quitar imagen
              </Button>
            </div>
          ) : null}
          <div>
            <label>Ficha técnica (PDF, máx. 12MB)</label>
            <div
              style={{
                marginTop: 6,
                display: 'flex',
                flexDirection: 'column',
                gap: 4
              }}
            >
              <Button
                variant='outline'
                leftSection={<IconFile size={16} />}
                onClick={() => document.getElementById('pdfInput')?.click()}
              >
                Seleccionar PDF
              </Button>
              <span style={{ fontSize: 12, color: '#666' }}>
                {formData.pdfFile?.name}
              </span>
              <input
                id='pdfInput'
                type='file'
                accept='application/pdf'
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file && file.size > 12 * 1024 * 1024) {
                    alert('El archivo PDF debe ser menor a 12MB');
                    return;
                  }
                  handleInput('pdfFile', file);
                  handleInput('pdfFileName', file?.name);
                }}
              />
            </div>
          </div>
          {/* Link al PDF */}
          {formData.pdfFile && (
            <Button
              variant='light'
              size='xs'
              style={{ marginBottom: 5 }}
              onClick={() => {}}
            >
              {formData.pdfFileName}
            </Button>
          )}
          {formData.pdfUrl ? (
            <div style={{ marginTop: 16 }}>
              <div>
                <Button
                  variant='light'
                  size='xs'
                  style={{ marginBottom: 5 }}
                  onClick={() => {
                    window.open(formData.pdfUrl, '_blank');
                  }}
                >
                  Ver {formData.pdfFileName || 'manual'}
                </Button>
              </div>
              <Button
                variant='light'
                color='red'
                onClick={async () => {
                  if (formData.pdfUrl) await deleteFromS3(formData.pdfUrl);
                  setFormData((prev: any) => ({
                    ...prev,
                    pdfFile: null,
                    pdfUrl: '',
                    pdfFileName: ''
                  }));
                }}
              >
                Quitar PDF
              </Button>
            </div>
          ) : null}
        </div>
      )}

      <Group mt='md' style={{ paddingBottom: 10 }}>
        <Button onClick={handleSubmit}>
          {isCreatingCategory || isCreatingEquipment
            ? 'Finalizar carga'
            : 'Actualizar'}
        </Button>
        <Button variant='default' color='gray' onClick={handleCancel}>
          Cancelar
        </Button>
      </Group>

      {/* Botón Ver Historial */}
      {isEditingEquipment && editItem?._id && (
        <>
          <Button
            variant='light'
            color='gray'
            leftSection={<IconHistory size={16} />}
            onClick={openHistory}
            mt='md'
            fullWidth
          >
            Ver Historial
          </Button>

          <EquipmentHistoryModal
            opened={historyModalOpened}
            onClose={closeHistory}
            equipmentId={editItem._id}
            equipmentName={editItem.name}
          />
        </>
      )}
    </div>
  );
}
