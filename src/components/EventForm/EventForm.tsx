import 'dayjs/locale/es';
import { EVENT_TABS } from '@/context/config';
import { useEffect, useState } from 'react';
import { Band, EventModel } from '@/context/types';
import { Button, Input } from '@mantine/core';
import { DatePickerInput, DateValue, TimePicker } from '@mantine/dates';
import { combineDateAndTime, toTimeString } from '@/utils/dateUtils';
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
  const initialEvent: EventModel = {
    ...event,
    churchDate: typeof event.churchDate === 'string' ? event.churchDate : '',
    civil: typeof event.civil === 'string' ? event.civil : ''
  };
  const [eventData, setEventData] = useState<EventModel>(initialEvent);
  const [dateOnly, setDateOnly] = useState<DateValue>(event.date ? new Date(event.date) : null);
  const [timeOnly, setTimeOnly] = useState<string>(
    event.date ? toTimeString(new Date(event.date)) : ''
  );
  const [endDateOnly, setEndDateOnly] = useState<DateValue>(event.endDate ? new Date(event.endDate) : null);
  const [endTimeOnly, setEndTimeOnly] = useState<string>(
    event.endDate ? toTimeString(new Date(event.endDate)) : ''
  );

  useEffect(() => {
    const combined = combineDateAndTime(dateOnly, timeOnly);
    if (combined) {
      setEventData(prev => ({ ...prev, date: combined }));
    }
  }, [dateOnly, timeOnly]);

  useEffect(() => {
    const combined = combineDateAndTime(endDateOnly, endTimeOnly);
    if (combined) {
      setEventData(prev => ({ ...prev, endDate: combined }));
    }
  }, [endDateOnly, endTimeOnly]);

  const requiredFields: (keyof EventModel)[] = ['date', 'endDate', 'type', 'eventCity', 'lugar'];
  const handleInputChange = (e: any) => {
    setEventData({
      ...eventData,
      [e.target.name]: e.target.value
    });
  };
  console.log(eventData);
  const validateRequiredFields = () => {
    setValidate(true);
    const isValid: boolean = requiredFields.every((field: keyof EventModel) => {
      const value = eventData[field];
      if (field === 'date' || field === 'endDate') {
        return value instanceof Date && !isNaN(value.getTime());
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

  const handleBandsChange = (bands: Band[]) => {
    setEventData(prev => ({ ...prev, bands }));
  };

  return (
    <>
      <h3>Datos del evento</h3>
      <div className="inputs-grid">
        <DatePickerInput
          placeholder="Fecha de evento *"
          name="dateOnly"
          locale="es"
          valueFormat="DD/MM/YYYY"
          value={dateOnly}
          onChange={setDateOnly}
          error={validate && !dateOnly}
        />
        <DatePickerInput
          placeholder="Fecha finalización del evento *"
          name="endDateOnly"
          locale="es"
          valueFormat="DD/MM/YYYY"
          value={endDateOnly}
          onChange={setEndDateOnly}
        />
        <Input
          type="text"
          placeholder="Tipo de evento *"
          name="type"
          onChange={handleInputChange}
          autoComplete="off"
          value={eventData.type}
          error={validate && !eventData.type}
        />
        <Input
          type="text"
          name="lugar"
          value={eventData.lugar}
          onChange={handleInputChange}
          placeholder="Lugar *"
          autoComplete="off"
          error={validate && !eventData.lugar}
        />
        <Input
          type="text"
          placeholder="Localidad *"
          name="eventCity"
          value={eventData.eventCity}
          onChange={handleInputChange}
          autoComplete="off"
          error={validate && !eventData.eventCity}
        />
        <Input
          type="text"
          placeholder="Dirección"
          name="eventAddress"
          value={eventData.eventAddress}
          onChange={handleInputChange}
          autoComplete="off"
        />

        <TimePicker
          label="Hora de inicio HH:mm *"
          name="timeOnly"
          value={timeOnly}
          onChange={(value: string) => setTimeOnly(value)}
          error={validate && !timeOnly}
        />

        <TimePicker
          label="Hora de Finalización HH:mm *"
          name="endTimeOnly"
          value={endTimeOnly}
          onChange={(value: string) => setEndTimeOnly(value)}
          error={validate && !endTimeOnly}
        />

        <TimePicker
          label="Hora de iglesia"
          name="churchDate"
          value={eventData.churchDate || ''}
          onChange={(value: string) =>
            setEventData(prev => ({ ...prev, churchDate: value }))
          }
        />
        <TimePicker
          label="Hora del civil"
          name="civil"
          value={eventData.civil || ''}
          onChange={(value: string) =>
            setEventData(prev => ({ ...prev, civil: value }))
          }
        />
        <Input
          placeholder="Cantidad de Invitados"
          type="text"
          name="guests"
          onChange={handleInputChange}
          autoComplete="off"
          value={eventData.guests}
        />
      </div>
      <BandList bands={eventData.bands || []} onBandsChange={handleBandsChange} />
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
