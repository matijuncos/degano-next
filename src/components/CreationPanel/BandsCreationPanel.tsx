'use client';
import useSWR from 'swr';
import { mutate } from 'swr';
import { useState, useEffect } from 'react';
import { IconTrash, IconFile, IconFileTypePdf } from '@tabler/icons-react';
import {
  Button,
  TextInput,
  Group,
  Textarea,
  Select,
  Modal,
  FileButton,
  Card,
  Image,
  Box,
  Text
} from '@mantine/core';
import useNotification from '@/hooks/useNotification';
import { Band, ExtraContact } from '@/context/types';
import { getCleanFileName, getFileViewerUrl } from '@/utils/fileUtils';

type BandNode = Band | ExtraContact;

export default function BandsCreationPanel({
  selectedBand,
  editItem,
  onCancel
}: {
  selectedBand: BandNode | null;
  editItem: BandNode | null;
  onCancel?: (wasCancelled: boolean, updatedItem?: any) => void;
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
  const [waitingAws, setWaitingAws] = useState(false);

  const [formData, setFormData] = useState<any>({});
  const newEntity = formData?._id === '';

  useEffect(() => {
    if (editItem) {
      // Combinar fileUrl singular (legacy) con fileUrls array
      const allFiles = [
        ...((editItem as any).fileUrl ? [(editItem as any).fileUrl] : []),
        ...((editItem as any).fileUrls || [])
      ];
      // Remover duplicados
      const uniqueFiles = [...new Set(allFiles)];

      setFormData({
        ...editItem,
        fileUrls: uniqueFiles
      });
    } else if (selectedBand) {
      // inicializar vacío según type
      if (selectedBand.type === 'band') {
        setFormData({
          _id: '',
          type: 'band',
          bandName: '',
          bandInfo: '',
          contacts: [],
          fileUrls: []
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
      await mutate('/api/bands');

      notify({ message: 'Contacto eliminado' });
      setFormData(updatedBand);
    } catch (error) {
      console.error(error);
      notify({ type: 'defaultError' });
    }
  };

  const handleUpload = async (file: File | null) => {
    if (!file) return;
    setWaitingAws(true);
    try {
      const res = await fetch('/api/uploadToS3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          bucket: 'bands'
        })
      });
      const { signedUrl, url } = await res.json();

      await fetch(signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file
      });

      setFormData((prev: Band) => ({ ...prev, fileUrls: [...(prev.fileUrls || []), url] }));
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setWaitingAws(false);
    }
  };

  const handleDeleteFile = async (fileUrl: string) => {
    if (!fileUrl) return;
    setWaitingAws(true);
    notify({ loading: true });
    try {
      // Eliminar de S3
      await fetch('/api/deleteFromS3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: fileUrl, bucket: 'bands' })
      });

      // Actualizar el array de archivos
      const updatedFileUrls = (formData.fileUrls || []).filter((url: string) => url !== fileUrl);

      // Actualizar el estado local
      setFormData((prev: Band) => ({
        ...prev,
        fileUrls: updatedFileUrls
      }));

      // IMPORTANTE: Actualizar en la base de datos si la banda ya existe
      if (formData._id && formData.type === 'band') {
        const res = await fetch('/api/bands', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            fileUrls: updatedFileUrls
          })
        });
        if (!res.ok) throw new Error('Error updating band in database');
        await mutate('/api/bands');
      }

      notify({ message: 'Archivo eliminado correctamente' });
    } catch (error) {
      console.error('Delete error:', error);
      notify({ type: 'defaultError' });
    } finally {
      setWaitingAws(false);
    }
  };

  const getFilePreview = (fileUrl: string) => {
    if (!fileUrl) return null;

    const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(fileUrl);
    const isPdf = /\.pdf$/i.test(fileUrl);
    const cleanName = getCleanFileName(fileUrl);

    return (
      <Box
        key={fileUrl}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          position: 'relative',
          maxWidth: '120px'
        }}
      >
        <Card
          withBorder
          padding="xs"
          style={{
            width: '100px',
            height: '100px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          onClick={() => window.open(getFileViewerUrl(fileUrl), '_blank')}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '';
          }}
        >
          {isImage ? (
            <Image
              src={fileUrl}
              alt="Band file"
              fit="cover"
              style={{ width: '100%', height: '100%', borderRadius: '4px' }}
            />
          ) : isPdf ? (
            <IconFileTypePdf size={48} color="#FF0000" />
          ) : (
            <IconFile size={48} color="#888888" />
          )}
        </Card>
        <Text
          size="xs"
          style={{
            textAlign: 'center',
            wordBreak: 'break-word',
            maxWidth: '100%'
          }}
        >
          {cleanName}
        </Text>
        <Button
          color='red'
          variant='light'
          loading={waitingAws}
          onClick={() => handleDeleteFile(fileUrl)}
          size='xs'
          style={{ marginTop: '4px' }}
        >
          <IconTrash size={14} />
        </Button>
      </Box>
    );
  };

  if (!newEntity && !editItem) return null;
  return (
    <div style={{ padding: '1rem', height: '100vh' }}>
      <h3 style={{ fontWeight: 600, marginBottom: '1rem' }}>
        {!formData?._id
          ? formData?.type === 'band'
            ? 'Crear nueva banda'
            : 'Crear nuevo contacto'
          : formData?._id && formData?.type === 'band'
          ? 'Editar banda'
          : 'Editar contacto'}
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {formData.type === 'band' && (
          <>
            <TextInput
              label='Nombre de la banda'
              value={formData.bandName || ''}
              onChange={(e) => handleInput('bandName', e.currentTarget.value)}
            />
            <Textarea
              label='Info de la banda'
              value={formData.bandInfo || ''}
              onChange={(e) => handleInput('bandInfo', e.currentTarget.value)}
            />
            <div style={{ margin: 'auto' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'center', marginBottom: '16px' }}>
                {formData.fileUrls && formData.fileUrls.length > 0 &&
                  formData.fileUrls.map((fileUrl: string) =>
                    getFilePreview(fileUrl)
                  )
                }
              </div>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <FileButton
                  onChange={handleUpload}
                  accept='image/*,.pdf,.doc,.docx'
                >
                  {(props) => (
                    <Button {...props} loading={waitingAws} variant='outline'>
                      {formData.fileUrls && formData.fileUrls.length > 0 ? 'Agregar otro archivo' : 'Subir archivo'}
                    </Button>
                  )}
                </FileButton>
              </div>
            </div>
            {formData.contacts && formData.contacts.length > 0 && (
              <div style={{ marginTop: '1rem', overflowX: 'auto' }}>
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
            {formData._id && (
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
            )}
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
              label='Rol'
              value={formData.rol || ''}
              onChange={(e) => handleInput('rol', e.currentTarget.value)}
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
          </>
        )}
      </div>

      <Group
        mt='md'
        style={{ paddingBottom: 10, justifyContent: 'space-around' }}
      >
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
          ¿Seguro que querés eliminar <b>{contactToDelete?.name}</b> de la
          banda?
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
