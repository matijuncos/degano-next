import { EventModel } from '@/context/types';
import { Button, Input } from '@mantine/core';
import { useState } from 'react';

const ClientForm = ({
  event,
  onNextTab,
  onBackTab
}: {
  event: EventModel;
  onNextTab: Function;
  onBackTab: Function;
}) => {
  const formDisabled = () => {
    return (
      clientData.fullName === '' ||
      clientData.phoneNumber === '' ||
      clientData.age === '' ||
      clientData.email === '' ||
      clientData.address === ''
    );
  };
  const [clientData, setClientData] = useState(event);
  const handleInputChange = (e: any) => {
    setClientData({
      ...clientData,
      [e.target.name]: e.target.value
    });
  };

  const next = () => {
    onNextTab(1, clientData);
  };
  return (
    <div className='flex'>
      <div className='inputs-grid'>
        <Input
          placeholder='Nombre y Apellido'
          name='fullName'
          onChange={handleInputChange}
          autoComplete='off'
          value={clientData.fullName && clientData.fullName}
        />
        <Input
          placeholder='Teléfono'
          name='phoneNumber'
          onChange={handleInputChange}
          autoComplete='off'
          value={clientData.phoneNumber && clientData.phoneNumber}
        />
        <Input
          placeholder='Dirección de email'
          name='email'
          onChange={handleInputChange}
          autoComplete='off'
          value={clientData.email && clientData.email}
        />
        <Input
          placeholder='Edad'
          name='age'
          onChange={handleInputChange}
          autoComplete='off'
          value={clientData.age && clientData.age}
        />
        <Input
          placeholder='Dirección'
          name='address'
          onChange={handleInputChange}
          autoComplete='off'
          value={clientData.address && clientData.address}
        />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <Button mt='16px' disabled={formDisabled()} onClick={next}>
          Siguiente
        </Button>
      </div>
    </div>
  );
};

export default ClientForm;
