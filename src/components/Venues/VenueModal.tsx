// src/components/Venues/VenueModal.tsx
// Alta / edición de un lugar desde el panel de Lugares. Al editar, el cambio se
// aplica a los eventos de HOY EN ADELANTE (el servidor lo hace en la misma request).
'use client';
import { useEffect, useState } from 'react';
import { Modal, Stack, TextInput, Group, Button, Alert, SimpleGrid } from '@mantine/core';
import { useResponsive } from '@/hooks/useResponsive';
import useNotification from '@/hooks/useNotification';
import { Salon } from '@/utils/venues';

const EMPTY = { name: '', address: '', city: '', province: '', contactName: '', contactPhone: '', mapsUrl: '' };

export default function VenueModal({
  salon,
  upcoming,
  onClose,
  onSaved
}: {
  salon: Partial<Salon> | null; // null = cerrado; sin _id = nuevo
  upcoming: number; // eventos de hoy en adelante en este lugar
  onClose: () => void;
  onSaved: () => void;
}) {
  const { isMobile } = useResponsive();
  const notify = useNotification();
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const isNew = !salon?._id;

  useEffect(() => {
    if (salon) setForm({ ...EMPTY, ...Object.fromEntries(Object.entries(salon).filter(([, v]) => typeof v === 'string')) });
  }, [salon]);

  const field = (key: keyof typeof EMPTY) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.currentTarget.value;
      setForm((f) => ({ ...f, [key]: value }));
    }
  });

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/salons', {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isNew ? { ...form, strict: true } : { ...form, _id: salon!._id, propagate: true })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'No se pudo guardar el lugar');
      const n = data.eventsUpdated ?? 0;
      notify({
        message: isNew
          ? `Lugar "${form.name.trim()}" creado`
          : n > 0
          ? `Lugar actualizado en ${n} evento${n === 1 ? '' : 's'} de hoy en adelante`
          : 'Lugar actualizado'
      });
      onSaved();
      onClose();
    } catch (e: any) {
      notify({ type: 'defaultError', message: e?.message || 'No se pudo guardar el lugar' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      opened={!!salon}
      onClose={onClose}
      title={isNew ? 'Nuevo lugar' : `Editar ${salon?.name ?? ''}`}
      size='lg'
      fullScreen={isMobile}
      centered
    >
      <Stack gap='sm'>
        <TextInput label='Nombre' required {...field('name')} data-autofocus />
        <TextInput label='Dirección' {...field('address')} />
        <SimpleGrid cols={{ base: 1, xs: 2 }} spacing='sm'>
          <TextInput label='Ciudad' {...field('city')} />
          <TextInput label='Provincia' {...field('province')} />
          <TextInput label='Contacto' placeholder='Nombre' {...field('contactName')} />
          <TextInput label='Teléfono del contacto' {...field('contactPhone')} />
        </SimpleGrid>
        <TextInput label='Link de Google Maps' placeholder='https://maps.app.goo.gl/...' {...field('mapsUrl')} />

        {!isNew && (
          <Alert color={upcoming > 0 ? 'blue' : 'gray'} variant='light'>
            {upcoming > 0
              ? `Se actualizan ${upcoming} evento${upcoming === 1 ? '' : 's'} de hoy en adelante en este lugar. Los eventos pasados no cambian.`
              : 'No hay eventos de hoy en adelante en este lugar: solo cambia la ficha. Los eventos pasados no cambian.'}
          </Alert>
        )}

        <Group justify='flex-end' gap='xs' mb={isMobile ? 70 : 0}>
          <Button variant='default' onClick={onClose}>Cancelar</Button>
          <Button onClick={save} loading={saving} disabled={!form.name.trim()}>
            {isNew ? 'Crear lugar' : 'Guardar'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
