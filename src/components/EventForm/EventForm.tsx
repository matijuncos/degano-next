import 'dayjs/locale/es';
import { EVENT_TABS } from '@/context/config';
import { useEffect, useState } from 'react';
import { EventModel } from '@/context/types';
import { Button, Input, Divider, Text, Select, ComboboxItem } from '@mantine/core';
import { DatePickerInput, DateValue, TimePicker } from '@mantine/dates';
import { combineDateAndTime, toTimeString } from '@/utils/dateUtils';

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
  const [dateOnly, setDateOnly] = useState<DateValue>(
    event.date ? new Date(event.date) : null
  );
  const [timeOnly, setTimeOnly] = useState<string>(
    event.date ? toTimeString(new Date(event.date)) : ''
  );
  const [endDateOnly, setEndDateOnly] = useState<DateValue>(
    event.endDate ? new Date(event.endDate) : null
  );
  const [endTimeOnly, setEndTimeOnly] = useState<string>(
    event.endDate ? toTimeString(new Date(event.endDate)) : ''
  );
  const [salons, setSalons] = useState<string[]>([]);
  const [loadingSalons, setLoadingSalons] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  // Fetch salons from API
  useEffect(() => {
    const fetchSalons = async () => {
      setLoadingSalons(true);
      try {
        const response = await fetch('/api/salons');
        const data = await response.json();
        if (data.salons) {
          setSalons(data.salons.map((s: any) => s.name));
        }
      } catch (error) {
        console.error('Error fetching salons:', error);
      } finally {
        setLoadingSalons(false);
      }
    };
    fetchSalons();
  }, []);

  // Sincronizar estado local con el prop event cuando el usuario navega
  useEffect(() => {
    if (event) {
      const updatedEvent: EventModel = {
        ...event,
        churchDate: typeof event.churchDate === 'string' ? event.churchDate : '',
        civil: typeof event.civil === 'string' ? event.civil : ''
      };
      setEventData(updatedEvent);

      // Actualizar fechas y horas
      if (event.date) {
        setDateOnly(new Date(event.date));
        setTimeOnly(toTimeString(new Date(event.date)));
      }
      if (event.endDate) {
        setEndDateOnly(new Date(event.endDate));
        setEndTimeOnly(toTimeString(new Date(event.endDate)));
      }
    }
  }, [event]);

  useEffect(() => {
    const combined = combineDateAndTime(dateOnly, timeOnly);
    if (combined) {
      setEventData((prev) => ({ ...prev, date: combined }));
    }
  }, [dateOnly, timeOnly]);

  useEffect(() => {
    const combined = combineDateAndTime(endDateOnly, endTimeOnly);
    if (combined) {
      setEventData((prev) => ({ ...prev, endDate: combined }));
    }
  }, [endDateOnly, endTimeOnly]);

  const requiredFields: (keyof EventModel)[] = [
    'date',
    'endDate',
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

  const validateTimes = () => {
    const timeValid = timeOnly && timeOnly.trim() !== '';
    const endTimeValid = endTimeOnly && endTimeOnly.trim() !== '';
    return timeValid && endTimeValid;
  };

  const validateRequiredFields = () => {
    setValidate(true);
    const isValid: boolean = requiredFields.every((field: keyof EventModel) => {
      const value = eventData[field as keyof EventModel];
      if (field === 'date' || field === 'endDate') {
        return value instanceof Date && !isNaN(value.getTime());
      }
      return value && String(value).trim() !== '';
    });
    return isValid;
  };
  const saveSalonIfNew = async () => {
    // Si el salón no está en la lista, guardarlo en la BD
    if (eventData.lugar && !salons.includes(eventData.lugar)) {
      try {
        await fetch('/api/salons', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: eventData.lugar,
            city: eventData.eventCity || '',
            address: eventData.eventAddress || '',
            contact: eventData.venueContact || ''
          })
        });
      } catch (error) {
        console.error('Error saving salon:', error);
      }
    }
  };

  const next = async () => {
    const baseValid = validateRequiredFields();
    const timesValid = validateTimes();

    if (baseValid && timesValid) {
      setValidate(false);
      await saveSalonIfNew();
      onNextTab(EVENT_TABS.SHOW, eventData);
    }
  };
  const back = () => {
    onBackTab(EVENT_TABS.CLIENT, eventData);
  };

  return (
    <>
      {/* SECCIÓN: DATOS DEL EVENTO */}
      <Text size='lg' fw={700} mb='md'>Datos del evento</Text>
      <div className='inputs-grid'>
        <DatePickerInput
          placeholder='Fecha de evento *'
          name='dateOnly'
          locale='es'
          valueFormat='DD/MM/YYYY'
          value={dateOnly}
          onChange={setDateOnly}
          error={validate && !dateOnly}
        />
        <DatePickerInput
          placeholder='Fecha finalización del evento *'
          name='endDateOnly'
          locale='es'
          valueFormat='DD/MM/YYYY'
          value={endDateOnly}
          onChange={setEndDateOnly}
          error={validate && !endDateOnly}
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
          placeholder='Empresa'
          name='company'
          onChange={handleInputChange}
          autoComplete='off'
          value={eventData.company || ''}
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

      <Divider my='xl' />

      {/* SECCIÓN: UBICACIÓN */}
      <Text size='lg' fw={700} mb='md'>Ubicación</Text>
      <div className='inputs-grid'>
        <Select
          placeholder='Lugar *'
          name='lugar'
          data={salons}
          value={eventData.lugar}
          onChange={(value) =>
            setEventData((prev) => ({ ...prev, lugar: value || '' }))
          }
          searchable
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          nothingFoundMessage={
            <Button
              variant='light'
              size='xs'
              fullWidth
              onClick={() => {
                if (searchValue.trim()) {
                  setSalons((current) => [...current, searchValue.trim()]);
                  setEventData((prev) => ({ ...prev, lugar: searchValue.trim() }));
                  setSearchValue('');
                }
              }}
            >
              + Crear {searchValue}
            </Button>
          }
          error={validate && !eventData.lugar}
          disabled={loadingSalons}
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
        <Input
          type='text'
          placeholder='Contacto de lugar'
          name='venueContact'
          value={eventData.venueContact || ''}
          onChange={handleInputChange}
          autoComplete='off'
        />
      </div>

      <Divider my='xl' />

      {/* SECCIÓN: HORARIOS */}
      <Text size='lg' fw={700} mb='md'>Horarios</Text>
      <div className='inputs-grid'>
        <TimePicker
          label='Hora de inicio *'
          name='timeOnly'
          value={timeOnly}
          onChange={(value: string) => setTimeOnly(value)}
          error={validate && !timeOnly}
        />

        <TimePicker
          label='Hora de Finalización *'
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
            setEventData((prev) => ({ ...prev, churchDate: value }))
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

        <TimePicker
          label='Horario llegada staff'
          name='staffArrivalTime'
          value={eventData.staffArrivalTime || ''}
          onChange={(value: string) =>
            setEventData((prev) => ({ ...prev, staffArrivalTime: value }))
          }
        />

        <TimePicker
          label='Horario llegada equipamiento'
          name='equipmentArrivalTime'
          value={eventData.equipmentArrivalTime || ''}
          onChange={(value: string) =>
            setEventData((prev) => ({ ...prev, equipmentArrivalTime: value }))
          }
        />
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          marginTop: '20px'
        }}
      >
        <Button onClick={back}>Atrás</Button>
        <Button onClick={next}>Siguiente</Button>
      </div>
    </>
  );
};
export default EventForm;
