import { EventModel } from '@/context/types';
import { Button, Input } from '@mantine/core';
import { useState } from 'react';

const ClientForm = ({
  event,
  onNextTab,
  onBackTab,
  validate,
  setValidate
}: {
  event: EventModel;
  onNextTab: Function;
  onBackTab: Function;
  validate: boolean;
  setValidate: Function;
}) => {
  const [clientData, setClientData] = useState<EventModel>(event);
  const requiredFields: (keyof EventModel)[] = ['fullName', 'phoneNumber', 'email'];
  const handleInputChange = (e: any) => {
    setClientData({
      ...clientData,
      [e.target.name]: e.target.value
    });
  };
  const validateRequiredFields = () => {
    setValidate(true);
    const isValid: boolean = requiredFields.every((field: keyof EventModel) => clientData[field] && String(clientData[field]).trim() !== '');
    return isValid;
  }
  const next = () => {
    if (validateRequiredFields()) {
      setValidate(false);
      onNextTab(1, clientData);
    }
  };
  return (
    <div className='flex directionColumn'>
      <div className='inputs-grid'>
        <Input
          placeholder='Nombre y Apellido *'
          name='fullName'
          onChange={handleInputChange}
          autoComplete='off'
          error={validate && !clientData.fullName}
          value={clientData.fullName && clientData.fullName}
        />
        <Input
          placeholder='Teléfono *'
          name='phoneNumber'
          onChange={handleInputChange}
          autoComplete='off'
          error={validate && !clientData.phoneNumber}
          value={clientData.phoneNumber && clientData.phoneNumber}
        />
        <Input
          placeholder='Dirección de email *'
          name='email'
          onChange={handleInputChange}
          autoComplete='off'
          error={validate && !clientData.email}
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
        <Button mt='16px' onClick={next}>
          Siguiente
        </Button>
      </div>
    </div>
  );
};

export default ClientForm;
