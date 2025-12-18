import 'dayjs/locale/es';
import { EVENT_TABS } from '@/context/config';
import { useEffect, useState, useRef } from 'react';
import { EventModel } from '@/context/types';
import { Button, Input, Divider, Text, Select, ComboboxItem } from '@mantine/core';
import { DatePickerInput, DateValue, TimePicker } from '@mantine/dates';
import { combineDateAndTime, toTimeString } from '@/utils/dateUtils';

const EventForm = ({
  event,
  onNextTab,
  onBackTab,
  validate,
  setValidate,
  updateEvent
}: {
  event: EventModel;
  onNextTab: Function;
  onBackTab: Function;
  validate: boolean;
  setValidate: Function;
  updateEvent?: Function;
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
  const [salonObjects, setSalonObjects] = useState<any[]>([]); // Objetos completos de salones
  const [originalSalons, setOriginalSalons] = useState<string[]>([]); // Lista original de la BD
  const [loadingSalons, setLoadingSalons] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const skipSyncRef = useRef(false); // Para evitar sincronización cuando actualizamos nosotros

  // Fetch salons from API
  useEffect(() => {
    const fetchSalons = async () => {
      setLoadingSalons(true);
      try {
        const response = await fetch('/api/salons');
        const data = await response.json();
        if (data.salons) {
          setSalonObjects(data.salons); // Guardar objetos completos
          const salonNames = data.salons.map((s: any) => s.name);
          setSalons(salonNames);
          setOriginalSalons(salonNames); // Guardar lista original
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
    // Si acabamos de actualizar nosotros mismos, no sincronizar
    if (skipSyncRef.current) {
      skipSyncRef.current = false;
      return;
    }

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
      const updatedData = { ...eventData, date: combined };
      setEventData(updatedData);

      // Guardar para que persista al cambiar de tab
      if (updateEvent) {
        skipSyncRef.current = true;
        updateEvent(updatedData);
      }
    }
  }, [dateOnly, timeOnly]);

  useEffect(() => {
    const combined = combineDateAndTime(endDateOnly, endTimeOnly);
    if (combined) {
      const updatedData = { ...eventData, endDate: combined };
      setEventData(updatedData);

      // Guardar para que persista al cambiar de tab
      if (updateEvent) {
        skipSyncRef.current = true;
        updateEvent(updatedData);
      }
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
    const updatedData = {
      ...eventData,
      [e.target.name]: e.target.value
    };
    setEventData(updatedData);

    // Guardar inmediatamente para que persista al cambiar de tab
    if (updateEvent && ['eventCity', 'eventAddress', 'venueContact', 'venueContactName', 'venueContactPhone', 'type', 'company', 'guests'].includes(e.target.name)) {
      skipSyncRef.current = true;
      updateEvent(updatedData);
    }
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
    if (!eventData.lugar) return;

    // Buscar si el salón existe en la BD
    const existingSalon = salonObjects.find(s => s.name === eventData.lugar);

    try {
      if (existingSalon) {
        // Si existe, hacer PUT para actualizar (solo si hay cambios)
        const hasChanges =
          existingSalon.city !== eventData.eventCity ||
          existingSalon.address !== eventData.eventAddress ||
          existingSalon.contactName !== eventData.venueContactName ||
          existingSalon.contactPhone !== eventData.venueContactPhone ||
          // Retrocompatibilidad: comparar con venueContact si los nuevos campos no existen
          (!eventData.venueContactName && !eventData.venueContactPhone && existingSalon.contact !== eventData.venueContact);

        if (hasChanges) {
          const response = await fetch('/api/salons', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              _id: existingSalon._id,
              name: eventData.lugar,
              city: eventData.eventCity || '',
              address: eventData.eventAddress || '',
              contactName: eventData.venueContactName || '',
              contactPhone: eventData.venueContactPhone || eventData.venueContact || ''
            })
          });

          if (!response.ok) {
            const errorData = await response.json();
            console.error('Error updating salon:', errorData);
          } else {
            console.log('Salón actualizado exitosamente:', eventData.lugar);
          }
        }
      } else if (!originalSalons.includes(eventData.lugar)) {
        // Si no existe, hacer POST para crear
        const response = await fetch('/api/salons', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: eventData.lugar,
            city: eventData.eventCity || '',
            address: eventData.eventAddress || '',
            contactName: eventData.venueContactName || '',
            contactPhone: eventData.venueContactPhone || eventData.venueContact || ''
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Error saving salon:', errorData);
        } else {
          console.log('Salón guardado exitosamente:', eventData.lugar);
          // Agregar a la lista original para que no se intente guardar de nuevo
          setOriginalSalons((prev) => [...prev, eventData.lugar]);
        }
      }
    } catch (error) {
      console.error('Error saving salon:', error);
    }
  };

  const next = async () => {
    const baseValid = validateRequiredFields();
    const timesValid = validateTimes();

    if (baseValid && timesValid) {
      setValidate(false);
      await saveSalonIfNew();
      if (updateEvent) {
        updateEvent(eventData);
      }
      onNextTab(EVENT_TABS.SHOW, eventData);
    }
  };
  const back = () => {
    if (updateEvent) {
      updateEvent(eventData);
    }
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
          defaultDate={dateOnly ? new Date(dateOnly) : undefined}
          key={dateOnly ? dateOnly.toString() : 'no-date'}
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
          onChange={(value) => {
            // Buscar si el salón seleccionado existe en la BD
            const selectedSalon = salonObjects.find(s => s.name === value);

            let updatedData = { ...eventData, lugar: value || '' };

            // Si es un salón existente, autocompletar los campos con los datos del salón
            // Si el salón no tiene esos datos, blanquearlos
            if (selectedSalon) {
              updatedData = {
                ...updatedData,
                eventCity: selectedSalon.city || '',
                eventAddress: selectedSalon.address || '',
                // Siempre usar los datos del salón (aunque sean vacíos)
                venueContactName: selectedSalon.contactName || '',
                venueContactPhone: selectedSalon.contactPhone || selectedSalon.contact || ''
              };
            } else {
              // Si no es un salón existente (nuevo), limpiar los campos
              updatedData = {
                ...updatedData,
                eventCity: '',
                eventAddress: '',
                venueContactName: '',
                venueContactPhone: ''
              };
            }

            setEventData(updatedData);
            setSearchValue('');
            // Guardar en el padre inmediatamente
            if (updateEvent) {
              skipSyncRef.current = true;
              updateEvent(updatedData);
            }
          }}
          searchable
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && searchValue.trim() && !salons.includes(searchValue.trim())) {
              // Agregar el nuevo salón a la lista local
              setSalons((current) => [...current, searchValue.trim()]);
              const updatedData = { ...eventData, lugar: searchValue.trim() };
              setEventData(updatedData);
              setSearchValue('');
              // Guardar en el padre inmediatamente
              if (updateEvent) {
                skipSyncRef.current = true;
                updateEvent(updatedData);
              }
            }
          }}
          onBlur={() => {
            // Si hay un valor escrito que no está en la lista, agregarlo
            if (searchValue.trim() && !salons.includes(searchValue.trim())) {
              setSalons((current) => [...current, searchValue.trim()]);
              const updatedData = { ...eventData, lugar: searchValue.trim() };
              setEventData(updatedData);
              setSearchValue('');
              // Guardar en el padre inmediatamente
              if (updateEvent) {
                skipSyncRef.current = true;
                updateEvent(updatedData);
              }
            }
          }}
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
          placeholder='Nombre contacto del lugar'
          name='venueContactName'
          value={eventData.venueContactName || ''}
          onChange={handleInputChange}
          autoComplete='off'
        />
        <Input
          type='text'
          placeholder='Teléfono de contacto'
          name='venueContactPhone'
          value={eventData.venueContactPhone || ''}
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
