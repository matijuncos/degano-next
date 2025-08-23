import 'dayjs/locale/es';
import { EVENT_TABS } from '@/context/config';
import { useEffect } from 'react';
import { Band, EventModel } from '@/context/types';
import { Button, Input, InputLabel } from '@mantine/core';
import {
  DatePickerInput,
  DateValue,
  TimePicker
} from '@mantine/dates';
import { useState } from 'react';
import BandList from '../BandManager/BandList';

const pad2 = (n: number) => String(n).padStart(2, '0');
const toTimeString = (d: Date | null): string =>
  d ? `${pad2(d.getHours())}:${pad2(d.getMinutes())}` : '';

function combineDateAndTime(dateOnly: string | null, timeHHmm: string | null) {
  if (!dateOnly || !timeHHmm) return null;
  const [h, m] = timeHHmm.split(':').map(Number);
  const d = new Date(dateOnly);
  console.log('d??? ', d)
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

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
  const initialEvent: EventModel = {
    ...event,
    churchDate: typeof event.churchDate === 'string' ? event.churchDate : '',
    civil: typeof event.civil === 'string' ? event.civil : ''
  };
  const [eventData, setEventData] = useState<EventModel>(initialEvent);
  const [dateOnly, setDateOnly] = useState<string | null>(null);
  const [timeOnly, setTimeOnly] = useState<string>(
    event.date ? toTimeString(new Date(event.date)) : ''
  );
  const [endDateOnly, setEndDateOnly] = useState<string | null>(null);
  const [endTimeOnly, setEndTimeOnly] = useState<string>(
    event.endDate ? toTimeString(new Date(event.endDate)) : ''
  );

  useEffect(() => {
    const combined = combineDateAndTime(dateOnly, timeOnly);
    setEventData((prev) => ({ ...prev, date: combined ?? prev.date ?? '' }));
  }, [dateOnly, timeOnly]);

  useEffect(() => {
    const combined = combineDateAndTime(endDateOnly, endTimeOnly);
    setEventData((prev) => ({
      ...prev,
      endDate: combined ?? prev.endDate ?? ''
    }));
  }, [endDateOnly, endTimeOnly]);

  const requiredFields: (keyof EventModel)[] = [
    'date',
    'type',
    'eventCity',
    'lugar'
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
    const combined = combineDateAndTime(dateOnly, timeOnly);
    if (combined) setEventData((prev) => ({ ...prev, date: combined }));
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
          <DatePickerInput<"default">
            type='default'
            placeholder='Fecha de evento *'
            name='dateOnly'
            locale='es'
            valueFormat='DD/MM/YYYY'
            value={dateOnly}
            onChange={setDateOnly} 
            error={validate && !dateOnly}
          />
          <DatePickerInput
            placeholder='Fecha finalización del evento'
            name='endDateOnly'
            locale='es'
            valueFormat='DD/MM/YYYY'
            value={endDateOnly}
            onChange={setEndDateOnly}
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
          type='text'
          name='lugar'
          value={eventData.lugar}
          onChange={handleInputChange}
          placeholder='Lugar *'
          autoComplete='off'
          error={validate && !eventData.lugar}
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
          placeholder='Dirección'
          name='eventAddress'
          value={eventData.eventAddress}
          onChange={handleInputChange}
          autoComplete='off'
        />

          <TimePicker
            label='Hora de inicio HH:mm *'
            name='timeOnly'
            value={timeOnly}
            onChange={(value: string) => setTimeOnly(value)}
            error={validate && !timeOnly}
          />

          <TimePicker
            label='Hora de Finalización HH:mm *'
            name='endTimeOnly'
            value={endTimeOnly}
            onChange={(value: string) => setEndTimeOnly(value)}
            error={validate && !endTimeOnly}
          />


        <TimePicker
          label='Hora de iglesia'
          name='churchDate'
          value={eventData.churchDate || ''}
          onChange={(value: string) =>
            setEventData((prev) => ({
              ...prev,
              churchDate: value
            }))
          }
        />
        <TimePicker
          label='Hora del civil'
          name='civil'
          value={eventData.civil || ''}
          onChange={(value: string) =>
            setEventData((prev) => ({ ...prev, civil: value }))
          }
        />
                <Input
          placeholder='Cantidad de Invitados'
          type='text'
          name='guests'
          onChange={handleInputChange}
          autoComplete='off'
          value={eventData.guests}
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
