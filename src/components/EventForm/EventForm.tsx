import { EVENT_TABS } from '@/context/config';
import { EventModel } from '@/context/types';
import { Button, Input, InputLabel, Textarea } from '@mantine/core';
import { useState } from 'react';

const EventForm = ({
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
  const [eventData, setEventData] = useState<EventModel>(event);
  const requiredFields: (keyof EventModel)[] = [
    'type',
    'eventAddress',
    'eventCity',
    'salon'
  ];
  const handleInputChange = (e: any) => {
    setEventData({
      ...eventData,
      [e.target.name]: e.target.value
    });
  };
  const validateRequiredFields = () => {
    setValidate(true);
    const isValid: boolean = requiredFields.every(
      (field: keyof EventModel) =>
        eventData[field] && String(eventData[field]).trim() !== ''
    );
    return isValid;
  };
  const next = () => {
    if (validateRequiredFields()) {
      setValidate(false);
      onNextTab(EVENT_TABS.MUSIC, eventData);
    }
  };
  const back = () => {
    onBackTab(EVENT_TABS.CLIENT, eventData);
  };
  const onDateChange = (name: string, value: string) => {
    setEventData({
      ...eventData,
      [name]: value
    });
  };
  return (
    <>
      <h3>Datos del evento</h3>
      <div className='inputs-grid'>
        <InputLabel>
          Fecha del evento
          <Input
            type='datetime-local'
            name='date'
            placeholder='Fecha del evento'
            onChange={(e) => onDateChange('date', e.target.value)}
          />
        </InputLabel>
        <InputLabel>
          Fecha de finalización del evento (opcional)
          <Input
            type='datetime-local'
            name='endDate'
            placeholder='Fecha de finalizaciòn del evento'
            onChange={(e) => onDateChange('endDate', e.target.value)}
          />
        </InputLabel>
        <Input
          type='text'
          placeholder='Tipo de evento *'
          name='type'
          onChange={handleInputChange}
          autoComplete='off'
          value={eventData.type}
          error={validate && !eventData.type}
        />
        <Input
          placeholder='Invitados'
          type='text'
          name='guests'
          onChange={handleInputChange}
          autoComplete='off'
          value={eventData.guests}
        />
        <Input
          type='text'
          placeholder='Direccion *'
          name='eventAddress'
          value={eventData.eventAddress}
          onChange={handleInputChange}
          autoComplete='off'
          error={validate && !eventData.eventAddress}
        />
        <Input
          type='text'
          placeholder='Localidad *'
          name='eventCity'
          value={eventData.eventCity}
          onChange={handleInputChange}
          autoComplete='off'
          error={validate && !eventData.eventCity}
        />
        <Input
          type='text'
          name='salon'
          value={eventData.salon}
          onChange={handleInputChange}
          placeholder='Salón *'
          autoComplete='off'
          error={validate && !eventData.salon}
        />
        <Input
          type='text'
          placeholder='Edad de invitados'
          name='averageAge'
          value={eventData.averageAge}
          onChange={handleInputChange}
          autoComplete='off'
        />
      </div>

      <h3>Banda en vivo</h3>
      <div className='inputs-grid'>
        <Input
          type='text'
          name='bandName'
          onChange={handleInputChange}
          placeholder='Banda'
          value={eventData.bandName}
          autoComplete='off'
        />
        <Input
          type='text'
          placeholder='Manager'
          value={eventData.manager}
          name='manager'
          onChange={handleInputChange}
          autoComplete='off'
        />
        <Input
          type='text'
          name='managerPhone'
          onChange={handleInputChange}
          placeholder='Telefono del mánager'
          value={eventData.managerPhone}
          autoComplete='off'
        />
      </div>
      <Textarea
        my='16px'
        value={eventData.moreData}
        name='moreData'
        style={{ width: '100%' }}
        onChange={handleInputChange}
        placeholder='Otros datos'
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <Button onClick={back}>Atrás</Button>
        <Button onClick={next}>Siguiente</Button>
      </div>
    </>
  );
};
export default EventForm;
