import 'dayjs/locale/es';
import { EVENT_TABS } from '@/context/config';
import { Band, EventModel } from '@/context/types';
import { Button, Input, InputLabel } from '@mantine/core';
import {
  DateInput,
  DatePicker,
  DateValue,
  DateTimePicker
} from '@mantine/dates';
import { useState } from 'react';
import BandList from '../BandManager/BandList';
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
    const isValid: boolean = requiredFields.every((field: keyof EventModel) => {
      const value = eventData[field];
      if (field === 'date') {
        const dateIsValid = value instanceof Date && value.toISOString();
        return dateIsValid;
      }
      return value && String(value).trim() !== '';
    });
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
  const onDateChange = (name: string, value: DateValue) => {
    setEventData({
      ...eventData,
      [name]: value
    });
  };

  const handleBandsChange = (bands: Band[]) => {
    setEventData((prev) => ({ ...prev, bands: bands }));
  };

  return (
    <>
      <h3>Datos del evento</h3>
      <div className='inputs-grid'>
        <InputLabel>
          Fecha del evento
          <DateTimePicker
            placeholder='Fecha y hora del evento *'
            name='date'
            locale='es'
            valueFormat='DD/MM/YYYY HH:mm'
            value={eventData.date ? new Date(eventData.date) : null}
            onChange={(value: DateValue) => onDateChange('date', value)}
            error={validate && !eventData.date}
          />
        </InputLabel>
        <InputLabel>
          Fecha de finalización del evento (opcional)
          <DateTimePicker
            placeholder='Fecha y hora de finalizaciòn del evento'
            name='endDate'
            locale='es'
            valueFormat='DD/MM/YYYY HH:mm'
            value={eventData.endDate ? new Date(eventData.endDate) : null}
            onChange={(value: DateValue) => onDateChange('endDate', value)}
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
          placeholder='Dirección'
          name='eventAddress'
          value={eventData.eventAddress}
          onChange={handleInputChange}
          autoComplete='off'
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
        <DateInput
          locale='es'
          valueFormat='DD/MM/YYYY HH:mm'
          placeholder='Fecha y hora de iglesia'
          name='churchDate'
          value={eventData.churchDate ? new Date(eventData.churchDate) : null}
          onChange={(value: DateValue) => onDateChange('churchDate', value)}
          autoComplete='off'
        />
        <DateTimePicker
          locale='es'
          valueFormat='DD/MM/YYYY HH:mm'
          placeholder='Fecha y hora de civil'
          name='civil'
          value={eventData.civil ? new Date(eventData.civil) : null}
          onChange={(value: DateValue) => onDateChange('civil', value)}
        />
      </div>
      <BandList
        bands={eventData.bands || []}
        onBandsChange={handleBandsChange}
      />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          marginTop: '10px'
        }}
      >
        <Button onClick={back}>Atrás</Button>
        <Button onClick={next}>Siguiente</Button>
      </div>
    </>
  );
};
export default EventForm;
