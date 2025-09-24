import { useState, useEffect } from 'react';
import { Input, Button, Select } from '@mantine/core';
import { ExtraContact } from '@/context/types';

const EditableContact = ({
  contact,
  onSave,
  onCancel,
  allContacts,
}: {
  contact?: ExtraContact;
  onSave: (contact: ExtraContact) => void;
  onCancel: () => void;
  allContacts: ExtraContact[];
}) => {
  const [contactData, setContactData] = useState<ExtraContact>({
    _id: '',
    name: '',
    phone: '',
    rol: '',
    type: 'contact',
  });

  useEffect(() => {
    if (contact) setContactData(contact);
  }, [contact]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setContactData({ ...contactData, [e.target.name]: e.target.value });
  };

  const handleSave = () => {
    if (!contactData.name || !contactData.phone) return; // validar
    onSave(contactData);
    setContactData({ _id: '', name: '', phone: '', rol: '', type: 'contact' });
  };

  return (
    <div style={{ marginTop: '12px', width: '50%', margin: 'auto' }}>
      <h2 style={{ textAlign: 'center' }}>Nuevo Contacto</h2>
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
        value={contactData._id}
        onChange={(val) => {
          const selected = allContacts?.find((c) => c._id === val);
          if (selected) {
            setContactData((prev) => ({
              ...prev,
              _id: selected._id,
              name: selected.name,
              phone: selected.phone
            }));
          }
        }}
      />
      <Input
        type='text'
        name='name'
        placeholder='Nombre'
        value={contactData.name}
        onChange={handleChange}
        autoComplete='off'
        style={{ marginTop: '8px', marginBottom: '8px' }}
      />
      <Input
        type='text'
        name='phone'
        placeholder='Teléfono'
        value={contactData.phone}
        onChange={handleChange}
        autoComplete='off'
        style={{ marginBottom: '8px' }}
      />
        <Input
        type='text'
        name='rol'
        placeholder='Rol'
        value={contactData.rol}
        onChange={handleChange}
        autoComplete='off'
        style={{ marginBottom: '12px' }}
      />
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
        <Button color='red' onClick={onCancel}>
          Cancelar
        </Button>
        <Button color='green' onClick={handleSave}>
          Confirmar
        </Button>
      </div>
    </div>
  );
};

export default EditableContact;
