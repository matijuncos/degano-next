  import { EventModel } from '@/context/types';
  import { Button, Input, Textarea } from '@mantine/core';
  import { DateInput, DateValue } from '@mantine/dates';
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
      'date',
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
        onNextTab(2, eventData);
      }
    };
    const back = () => {
      onBackTab(0, eventData);
    };
    const onDateChange = (name: string, value: DateValue) => {
      setEventData({
        ...eventData,
        [name]: value
      });
    };
    return (
      <>
        <h3>Datos del evento</h3>
        <div className='inputs-grid'>
          <DateInput
            placeholder='Fecha del evento *'
            name='date'
            valueFormat='DD MM YYYY'
            onChange={(value: DateValue) => onDateChange('date', value)}
          />
          <DateInput
            name='endDate'
            onChange={(value: DateValue) => onDateChange('endDate', value)}
          />
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
