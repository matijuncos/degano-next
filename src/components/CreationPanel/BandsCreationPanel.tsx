'use client';
import useSWR from 'swr';
import { mutate } from 'swr';
import { useState, useEffect } from 'react';
import { IconTrash } from '@tabler/icons-react';
import {
  Button,
  TextInput,
  Group,
  Textarea,
  Select,
  Modal
} from '@mantine/core';
import useNotification from '@/hooks/useNotification';
import { Band, ExtraContact } from '@/context/types';

type BandNode = Band | ExtraContact;

export default function BandsCreationPanel({
  selectedBand,
  editItem,
  onCancel,
  allData
}: {
  selectedBand: BandNode | null;
  editItem: BandNode | null;
  onCancel?: (wasCancelled: boolean, updatedItem?: any) => void;
  allData: Band[];
}) {
  const notify = useNotification();
  const fetcher = (url: string) => fetch(url).then((r) => r.json());
  const { data: allContacts = [] } = useSWR<ExtraContact[]>(
    '/api/contacts',
    fetcher
  );
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<ExtraContact | null>(
    null
  );

  const newEntity = selectedBand?._id === '';
  const editingEntity = selectedBand && selectedBand?._id !== '';

  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    if (editItem) {
      setFormData(editItem);
    } else if (selectedBand) {
      // inicializar vacío según type
      if (selectedBand.type === 'band') {
        setFormData({
          _id: '',
          type: 'band',
          bandName: '',
          showTime: '',
          testTime: '',
          manager: '',
          managerPhone: '',
          bandInfo: '',
          contacts: [],
          fileUrl: ''
        });
      } else if (selectedBand.type === 'contact') {
        setFormData({
          _id: '',
          type: 'contact',
          name: '',
          phone: '',
          rol: ''
        });
      }
    }
  }, [editItem, selectedBand]);

  const handleInput = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    notify({ loading: true });
    try {
      if (formData.type === 'band') {
        const method = formData._id ? 'PUT' : 'POST';
        const res = await fetch('/api/bands', {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        if (!res.ok) throw new Error('Error saving band');
        const updated = await res.json();
        await mutate('/api/bands');
        onCancel?.(false, updated);
        notify({
          message: formData._id ? 'Banda actualizada' : 'Banda creada'
        });
      } else if (formData.type === 'contact') {
        const method = formData._id ? 'PUT' : 'POST';
        const res = await fetch('/api/contacts', {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        if (!res.ok) throw new Error('Error saving contact');
        const saved = await res.json();

        const patchRes = await fetch('/api/bands', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bandId: formData.bandId,
            contact: saved
          })
        });
        if (!patchRes.ok) throw new Error('Error updating band with contact');
        const updatedBand = await patchRes.json();

        await mutate('/api/bands');
        onCancel?.(false, updatedBand);
        notify({
          message: formData._id ? 'Contacto actualizado' : 'Contacto creado'
        });
      }
    } catch (error) {
      console.error(error);
      notify({ type: 'defaultError' });
    }
  };

  const handleCancel = () => {
    setFormData({});
    onCancel?.(true);
  };

  const handleDeleteContact = async (contact: any) => {
    try {
      const res = await fetch('/api/contacts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _id: contact._id })
      });
      if (!res.ok) throw new Error('Error deleting contact');

      const patchRes = await fetch('/api/bands', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bandId: contact.bandId,
          removeContactId: contact._id
        })
      });
      if (!patchRes.ok) throw new Error('Error updating band contacts');

      const updatedBand = await patchRes.json();
      console.log('updatedBand ', updatedBand);
      await mutate('/api/bands');

      notify({ message: 'Contacto eliminado' });

      setFormData(updatedBand);
    } catch (error) {
      console.error(error);
      notify({ type: 'defaultError' });
    }
  };

  if (!newEntity && !editItem) return null;

  return (
    <div style={{ padding: '1rem', height: '100vh' }}>
      <h3 style={{ fontWeight: 600, marginBottom: '1rem' }}>
        {newEntity
          ? selectedBand?.type === 'band'
            ? 'Crear nueva banda'
            : 'Crear nuevo contacto'
          : editingEntity && selectedBand?.type === 'band'
          ? 'Editar banda'
          : 'Editar contacto'}
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {formData.type === 'band' && (
          <>
            {newEntity && formData.type === 'band' && (
              <Select
                label='Seleccionar banda existente'
                placeholder='Buscar...'
                searchable
                clearable
                data={
                  allData
                    ?.filter((b) => b._id !== formData._id)
                    .map((b) => ({
                      value: b._id,
                      label: b.bandName
                    })) || []
                }
                value={formData._id || ''}
                onChange={(val) => {
                  const selected = allData?.find((b) => b._id === val);
                  if (selected) {
                    setFormData({
                      ...selected
                    });
                  }
                }}
              />
            )}
            <TextInput
              label='Nombre de la banda'
              value={formData.bandName || ''}
              onChange={(e) => handleInput('bandName', e.currentTarget.value)}
            />
            <TextInput
              label='Horario show'
              value={formData.showTime || ''}
              onChange={(e) => handleInput('showTime', e.currentTarget.value)}
            />
            <TextInput
              label='Horario prueba'
              value={formData.testTime || ''}
              onChange={(e) => handleInput('testTime', e.currentTarget.value)}
            />
            <TextInput
              label='Manager'
              value={formData.manager || ''}
              onChange={(e) => handleInput('manager', e.currentTarget.value)}
            />
            <TextInput
              label='Teléfono manager'
              value={formData.managerPhone || ''}
              onChange={(e) =>
                handleInput('managerPhone', e.currentTarget.value)
              }
            />
            <Textarea
              label='Info de la banda'
              value={formData.bandInfo || ''}
              onChange={(e) => handleInput('bandInfo', e.currentTarget.value)}
            />
            {formData.contacts && formData.contacts.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <h4>Contactos</h4>
                {formData.contacts.map((c: ExtraContact) => (
                  <div
                    key={c._id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '1rem',
                      padding: '4px 0',
                      borderBottom: '1px solid rgba(255,255,255,0.1)',
                      cursor: 'pointer'
                    }}
                    onClick={() => {
                      // 👇 pasa el formulario a modo edición de contacto
                      setFormData(c);
                    }}
                  >
                    <span>{c.name}</span>
                    <span>{c.phone}</span>
                    <span>{c.rol || '-'}</span>
                  </div>
                ))}
              </div>
            )}
            <Button
              variant='light'
              onClick={() => {
                setFormData((prev: Band) => ({
                  _id: '',
                  bandId: prev._id,
                  type: 'contact',
                  name: '',
                  phone: '',
                  rol: ''
                }));
              }}
            >
              Agregar contacto
            </Button>
          </>
        )}

        {formData.type === 'contact' && (
          <>
            <Select
              label='Seleccionar contacto existente'
              placeholder='Buscar...'
              searchable
              clearable
              data={
                allContacts?.map((c: ExtraContact) => ({
                  value: c._id,
                  label: c.name
                })) || []
              }
              value={formData._id}
              onChange={(val) => {
                const selected = allContacts?.find(
                  (c: ExtraContact) => c._id === val
                );
                if (selected) {
                  setFormData((prev: any) => ({
                    ...prev,
                    _id: selected._id,
                    name: selected.name,
                    phone: selected.phone,
                    rol: selected.rol
                  }));
                }
              }}
            />

            <TextInput
              label='Nombre del contacto'
              value={formData.name || ''}
              onChange={(e) => handleInput('name', e.currentTarget.value)}
            />
            <TextInput
              label='Teléfono'
              value={formData.phone || ''}
              onChange={(e) => handleInput('phone', e.currentTarget.value)}
            />
            <TextInput
              label='Rol'
              value={formData.rol || ''}
              onChange={(e) => handleInput('rol', e.currentTarget.value)}
            />
          </>
        )}
      </div>

      <Group mt='md' style={{ paddingBottom: 10 }}>
        <Button onClick={handleSubmit}>
          {newEntity ? 'Finalizar carga' : 'Actualizar'}
        </Button>
        <Button variant='default' color='gray' onClick={handleCancel}>
          Cancelar
        </Button>
        <Button
          color='red'
          variant='light'
          onClick={() => {
            setContactToDelete(formData);
            setDeleteModalOpen(true);
          }}
        >
          <IconTrash size={16} />
        </Button>
      </Group>
      <Modal
        opened={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title='Confirmar eliminación'
        centered
      >
        <p>
          ¿Seguro que querés eliminar <b>{contactToDelete?.name}</b> de la banda?
        </p>
        <Group justify='flex-end' mt='md'>
          <Button variant='default' onClick={() => setDeleteModalOpen(false)}>
            Cancelar
          </Button>
          <Button
            color='red'
            onClick={() => {
              if (contactToDelete) {
                handleDeleteContact(contactToDelete);
              }
              setDeleteModalOpen(false);
              setContactToDelete(null);
            }}
          >
            Eliminar
          </Button>
        </Group>
      </Modal>
    </div>
  );
}
