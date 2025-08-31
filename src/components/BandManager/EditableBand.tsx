import useSWR from 'swr';
import { useState, useEffect } from 'react';
import { Select } from '@mantine/core';
import { Input, Button, FileButton } from '@mantine/core';
import { Band, ExtraContact } from '@/context/types';
import { TimePicker } from '@mantine/dates';
import {
  IconEdit,
  IconTrash,
  IconSquareRoundedPlus,
  IconFile
} from '@tabler/icons-react';
import EditableContact from './EditableContact';

const EditableBand = ({
  band,
  onSave,
  onCancel
}: {
  band?: Band;
  onSave: (band: Band) => void;
  onCancel: () => void;
}) => {
  const [selectedContactId, setSelectedContactId] = useState<string | null>(
    null
  );
  const fetcher = (url: string) => fetch(url).then((res) => res.json());
  const { data: allContacts, mutate: refetchContacts } = useSWR<ExtraContact[]>(
    '/api/contacts',
    fetcher
  );

  useEffect(() => {
    if (band) {
      setBandData(band);
    } else {
      setBandData({
        bandName: '',
        showTime: '',
        testTime: '',
        manager: '',
        managerPhone: '',
        bandInfo: '',
        contacts: [],
        fileUrl: ''
      });
    }
  }, [band]);

  const [bandData, setBandData] = useState<Band>(
    band || {
      bandName: '',
      showTime: '',
      testTime: '',
      manager: '',
      managerPhone: '',
      bandInfo: '',
      contacts: [],
      fileUrl: ''
    }
  );
  const [showEditableContact, setShowEditableContact] = useState(false);
  const [selectedContact, setSelectedContact] = useState<ExtraContact | null>(
    null
  );
  const [uploading, setUploading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBandData({ ...bandData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    onSave(bandData);
    await handleSaveOrEditContact(
      {
        _id: bandData?.managerId || '',
        name: bandData.manager,
        phone: bandData.managerPhone
      },
      true
    );
    setBandData({
      bandName: '',
      showTime: '',
      testTime: '',
      managerId: '',
      manager: '',
      managerPhone: '',
      bandInfo: '',
      contacts: [],
      fileUrl: ''
    });
    setSelectedContactId(null);
  };

  const handleSaveOrEditContact = async (
    contact: ExtraContact,
    isManager: boolean
  ) => {
    const isNew = !contact?._id;
    if (isNew) delete (contact as Partial<ExtraContact>)._id;
    try {
      const res = await fetch('/api/contacts', {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contact)
      });
      if (!res.ok) throw new Error('Error saving contact');
      const saved = await res.json();
      await refetchContacts();
      setBandData((prev) => {
        if (isNew) {
          // si es nuevo y no es manager lo agregamos
          return isManager
            ? prev
            : { ...prev, contacts: [...prev.contacts, saved] };
        } else {
          // si es edición reemplazamos
          return {
            ...prev,
            contacts: prev.contacts.map((c) =>
              c._id === saved._id ? saved : c
            )
          };
        }
      });
    } catch (error) {
      console.error('handleSaveOrEditContact error', error);
    }
  };

  const handleSaveContact = (contact: ExtraContact) => {
    setBandData((prev) => ({
      ...prev,
      contacts: selectedContact
        ? prev.contacts.map((c) =>
            c.name === selectedContact.name ? contact : c
          )
        : [...prev.contacts, contact]
    }));
    setShowEditableContact(false);
    setSelectedContact(null);
  };

  const handleEditContact = (contact: ExtraContact) => {
    setSelectedContact(contact);
    setShowEditableContact(true);
  };

  const handleDeleteContact = (index: number) => {
    setBandData((prev) => ({
      ...prev,
      contacts: prev.contacts.filter((_, i) => i !== index)
    }));
  };

  const handleUpload = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    try {
      const res = await fetch('/api/uploadToS3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, fileType: file.type })
      });
      const { signedUrl, url } = await res.json();

      await fetch(signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file
      });

      setBandData((prev) => ({ ...prev, fileUrl: url }));
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async () => {
    if (!bandData.fileUrl) return;
    try {
      await fetch('/api/deleteFromS3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: bandData.fileUrl })
      });
      setBandData((prev) => ({ ...prev, fileUrl: '' }));
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  return (
    <>
      <div className='band-inputs'>
        <div className='inputs-cointainer' style={{ alignItems: 'flex-end' }}>
          <Input
            type='text'
            name='bandName'
            onChange={handleChange}
            placeholder='Banda'
            value={bandData.bandName}
            autoComplete='off'
            style={{ flex: 1 }}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-around',
              flex: 1,
              whiteSpace: 'nowrap'
            }}
          >
            <TimePicker
              name='showTime'
              label='Hora de presentación'
              value={bandData.showTime}
              onChange={(value) =>
                setBandData({ ...bandData, showTime: value })
              }
              style={{ width: '30%' }}
            />
            <TimePicker
              name='testTime'
              label='Hora prueba de sonido'
              value={bandData.testTime}
              onChange={(value) =>
                setBandData({ ...bandData, testTime: value })
              }
              style={{ width: '30%' }}
            />
          </div>
        </div>
        <div className='inputs-cointainer' style={{ alignItems: 'flex-end' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              flex: 1
            }}
          >
            <Select
              label='Seleccionar contacto existente'
              placeholder='Buscar...'
              searchable
              clearable
              data={
                allContacts?.map((c) => ({
                  value: c._id,
                  label: c.name
                })) || []
              }
              value={selectedContactId}
              onChange={(val) => {
                const selected = allContacts?.find((c) => c._id === val);
                if (selected) {
                  setBandData((prev) => ({
                    ...prev,
                    managerId: selected._id,
                    manager: selected.name,
                    managerPhone: selected.phone
                  }));
                }
              }}
            />

            <Input
              type='text'
              name='manager'
              onChange={handleChange}
              placeholder='Manager'
              value={bandData.manager}
              autoComplete='off'
            />
            <Input
              type='text'
              name='managerPhone'
              onChange={handleChange}
              placeholder='Contacto del manager'
              value={bandData.managerPhone}
              autoComplete='off'
            />
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              flex: 1
            }}
          >
            <Input
              type='text'
              name='bandInfo'
              onChange={handleChange}
              placeholder='Otros datos'
              value={bandData.bandInfo}
              autoComplete='off'
              style={{ width: '70%'}}
            />
            <div style={{ marginTop: '16px' }}>
              {!bandData.fileUrl ? (
                <FileButton
                  onChange={handleUpload}
                  accept='image/*,.pdf,.doc,.docx'
                >
                  {(props) => (
                    <Button {...props} loading={uploading} variant='outline'>
                      Subir archivo
                    </Button>
                  )}
                </FileButton>
              ) : (
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '12px' }}
                >
                  <a
                    href={bandData.fileUrl}
                    target='_blank'
                    rel='noopener noreferrer'
                  >
                    <Button
                      variant='light'
                      leftSection={<IconFile size={16} />}
                    >
                      Ver archivo
                    </Button>
                  </a>
                  <Button
                    color='red'
                    variant='light'
                    onClick={handleDeleteFile}
                    leftSection={<IconTrash size={16} />}
                  >
                    Eliminar
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '16px',
          marginTop: '16px'
        }}
      >
        <Button style={{ width: '20%' }} onClick={onCancel} color='red'>
          Cancelar
        </Button>
        <Button style={{ width: '20%' }} onClick={handleSave} color='green'>
          Guardar
        </Button>
      </div>
      <div style={{ marginTop: '16px' }}>
        {!showEditableContact && (
          <div
            style={{ display: 'flex', cursor: 'pointer' }}
            onClick={() => setShowEditableContact(true)}
          >
            <p style={{ marginRight: '8px' }}>Agregar Contacto</p>
            <IconSquareRoundedPlus size={26} color='green' cursor='pointer' />
          </div>
        )}
        {showEditableContact && (
          <EditableContact
            contact={selectedContact || undefined}
            onSave={handleSaveContact}
            onCancel={() => {
              setShowEditableContact(false);
              setSelectedContact(null);
            }}
            allContacts={allContacts || []}
            handleSaveOrEditContact={handleSaveOrEditContact}
          />
        )}
      </div>
      {bandData.contacts.length > 0 && (
        <div style={{ marginTop: '16px' }}>
          <h4>Contactos:</h4>
          <ul>
            {bandData.contacts.map((c, index) => (
              <li
                key={index}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px'
                }}
              >
                <span>
                  <strong>{c.name}</strong> - {c.phone}
                </span>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <IconEdit
                    cursor='pointer'
                    size={20}
                    color='#1971c2'
                    onClick={() => handleEditContact(c)}
                  />
                  <IconTrash
                    cursor='pointer'
                    size={20}
                    color='red'
                    onClick={() => handleDeleteContact(index)}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
};

export default EditableBand;
