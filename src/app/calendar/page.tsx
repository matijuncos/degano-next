'use client';
import {
  Calendar,
  Views,
  dateFnsLocalizer,
  momentLocalizer
} from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './calendar.css';
import 'moment/locale/es';
import { Drawer, Button, Flex, Badge, Switch, Select, ActionIcon, Box } from '@mantine/core';
import { IconSearch, IconX } from '@tabler/icons-react';
import { useCallback, useMemo, useState, useEffect } from 'react';
import { useDeganoCtx } from '@/context/DeganoContext';
import DrawerContent from '@/components/DrawerContent/DrawerContent';
import { useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns/format';
import { parse } from 'date-fns/parse';
import { startOfWeek } from 'date-fns/startOfWeek';
import { getDay } from 'date-fns/getDay';
import { es } from 'date-fns/locale/es';
import { withPageAuthRequired } from '@auth0/nextjs-auth0/client';

export default withPageAuthRequired(function CalendarPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState<string | null>(null);

  const locales = {
    es
  };

  const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales
  });

  const { setSelectedEvent, allEvents } = useDeganoCtx();

  // Hook para detectar si es día o noche
  const [isManualTheme, setIsManualTheme] = useState(false);
  const [manualThemeValue, setManualThemeValue] = useState(true); // true = claro, false = oscuro
  const [isDaytime, setIsDaytime] = useState(() => {
    const hour = new Date().getHours();
    return hour >= 7 && hour < 20; // 7 AM - 8 PM es día
  });

  useEffect(() => {
    const checkTime = () => {
      const hour = new Date().getHours();
      setIsDaytime(hour >= 7 && hour < 20);
    };

    // Solo verificar automáticamente si no está en modo manual
    if (!isManualTheme) {
      const interval = setInterval(checkTime, 60000);
      return () => clearInterval(interval);
    }
  }, [isManualTheme]);

  // Determinar qué tema usar (manual tiene prioridad sobre automático)
  const isLightTheme = isManualTheme ? manualThemeValue : isDaytime;

  // Aplicar clase al body para controlar el tema globalmente
  useEffect(() => {
    if (isLightTheme) {
      document.body.classList.add('calendar-light-mode');
      document.body.classList.remove('calendar-dark-mode');
    } else {
      document.body.classList.add('calendar-dark-mode');
      document.body.classList.remove('calendar-light-mode');
    }
  }, [isLightTheme]);

  // Mapeo de vistas español <-> inglés
  const viewMapping: { [key: string]: string } = {
    'mes': 'month',
    'semana': 'week',
    'dia': 'day',
    'month': 'mes',
    'week': 'semana',
    'day': 'dia'
  };

  // Inicializar vista y fecha desde URL si existen
  const viewParam = searchParams.get('view') as 'mes' | 'semana' | 'dia' | null;
  const dateParam = searchParams.get('date');

  const [date, setDate] = useState(() => {
    if (dateParam) {
      return new Date(dateParam);
    }
    return new Date();
  });

  const [view, setView] = useState(() => {
    if (viewParam && ['mes', 'semana', 'dia'].includes(viewParam)) {
      const englishView = viewMapping[viewParam];
      return Views[englishView.toUpperCase() as 'MONTH' | 'WEEK' | 'DAY'];
    }
    return Views.MONTH;
  });

  const handleSelectedSlot = (value: any) => {
    setSelectedEvent({ ...value });
    setIsOpen(true);
  };

  const { defaultDate } = useMemo(
    () => ({
      defaultDate: new Date()
    }),
    []
  );

  // Eventos internos de la aplicación
  const internalEvents = allEvents.map((evnt) => {
    return {
      ...evnt,
      title:
        evnt?.type && evnt?.lugar
          ? `${evnt.type} - ${evnt.lugar}`
          : evnt.fullName,
      start: new Date(evnt.date),
      end: evnt.endDate ? new Date(evnt.endDate) : new Date(evnt.date),
      allDay: false,
      selectable: true,
      source: 'internal',
      style: {
        backgroundColor: '#37b24d',
        borderColor: '#2b8a3e'
      }
    };
  });

  // Función para determinar el estado temporal del evento
  const getEventStatus = (event: any) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Normalizar a medianoche para comparar solo fechas

    const startDate = new Date(event.start);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(event.end);
    endDate.setHours(23, 59, 59, 999);

    // Evento pasado: terminó antes de hoy
    if (endDate < now) {
      return 'past';
    }

    // Evento actual: está sucediendo hoy
    if (startDate <= now && endDate >= now) {
      return 'current';
    }

    // Evento futuro: comienza después de hoy
    return 'future';
  };

  // Función para aplicar estilos a los eventos
  const eventStyleGetter = (event: any) => {
    const status = getEventStatus(event);

    let backgroundColor, borderColor;

    switch (status) {
      case 'past':
        // Gris apagado para eventos pasados
        backgroundColor = '#2f3d29ff';
        borderColor = '#343a40';
        break;
      case 'current':
        // Verde brillante para evento actual
        backgroundColor = '#37b24d';
        borderColor = '#2b8a3e';
        break;
      case 'future':
        // Verde más oscuro/pastel para eventos futuros
        backgroundColor = '#237332ff';
        borderColor = '#2b8a3e';
        break;
      default:
        backgroundColor = '#37b24d';
        borderColor = '#2b8a3e';
    }

    return {
      style: {
        backgroundColor,
        borderColor,
        color: '#ffffff'
      }
    };
  };

  const onNavigate = useCallback(
    (newDate: any) => {
      setDate(newDate);
      // Actualizar URL con la nueva fecha
      updateURL(newDate, view);
    },
    [view]
  );

  const onView = useCallback(
    (newView: any) => {
      setView(newView);
      // Actualizar URL con la nueva vista
      updateURL(date, newView);
    },
    [date]
  );

  // Función para actualizar la URL con vista y fecha
  const updateURL = (currentDate: Date, currentView: any) => {
    const viewName = Object.keys(Views).find(
      (key) => Views[key as keyof typeof Views] === currentView
    )?.toLowerCase() || 'month';

    // Convertir a español para la URL
    const spanishViewName = viewMapping[viewName] || 'mes';

    const params = new URLSearchParams();
    params.set('view', spanishViewName);
    params.set('date', currentDate.toISOString());

    router.push(`/calendar?${params.toString()}`, { scroll: false });
  };

  // Crear opciones de búsqueda
  const searchOptions = useMemo(() => {
    // Usar un Map para evitar duplicados
    const optionsMap = new Map();

    allEvents.forEach(event => {
      // Solo agregar eventos con _id válido
      if (!event._id) return;

      // Crear lista de nombres de clientes
      const clientNames = [event.fullName];
      if (event.extraClients && event.extraClients.length > 0) {
        event.extraClients.forEach(client => {
          if (client.fullName) {
            clientNames.push(client.fullName);
          }
        });
      }

      // Formato: "Type - FullName, cliente extra fullName"
      const label = `${event.type} - ${clientNames.join(', ')}`;

      // Solo agregar si no existe ya (evita duplicados)
      if (!optionsMap.has(event._id)) {
        optionsMap.set(event._id, {
          value: event._id,
          label: label,
          searchText: `${event.type} ${clientNames.join(' ')}`.toLowerCase()
        });
      }
    });

    // Convertir el Map a array y ordenar alfabéticamente por label
    return Array.from(optionsMap.values()).sort((a, b) =>
      a.label.localeCompare(b.label, 'es', { sensitivity: 'base' })
    );
  }, [allEvents]);

  // Función para navegar al evento seleccionado
  const handleEventSelect = (eventId: string | null) => {
    if (eventId) {
      router.push(`/event/${eventId}?from=/calendar`);
    }
  };

  return (
    <>
      <Flex
        direction='column'
        className={isLightTheme ? 'calendar-light-theme' : ''}
        style={{
          height: '100vh',
          backgroundColor: isLightTheme ? '#ffffff' : '#1a1b1e'
        }}
      >
        <Flex
          direction={{ base: 'column', sm: 'row' }}
          justify='space-between'
          align={{ base: 'stretch', sm: 'center' }}
          gap='md'
          p='md'
          style={{
            borderBottom: isLightTheme ? '1px solid #dee2e6' : '1px solid #373a40',
            backgroundColor: isLightTheme ? '#f8f9fa' : '#25262b'
          }}
        >
          <Flex gap='md' align='center' wrap='wrap'>
            <Badge color='green' variant='filled'>
              {internalEvents.length} eventos
            </Badge>

            {/* Búsqueda de eventos */}
            {!searchOpen ? (
              <ActionIcon
                variant='subtle'
                onClick={() => setSearchOpen(true)}
                size='lg'
              >
                <IconSearch size={20} style={{color: '#228be6'}}/>
              </ActionIcon>
            ) : (
              <Flex gap='xs' align='center'>
                <Select
                  placeholder='Buscar por tipo o cliente...'
                  data={searchOptions}
                  value={searchValue}
                  onChange={(value) => {
                    setSearchValue(value);
                    handleEventSelect(value);
                  }}
                  searchable
                  clearable
                  nothingFoundMessage='No se encontraron eventos'
                  style={{ minWidth: '300px' }}
                  size='sm'
                  comboboxProps={{ withinPortal: false }}
                  styles={{
                    input: {
                      backgroundColor: isLightTheme ? '#ffffff' : '#25262b',
                      borderColor: isLightTheme ? '#dee2e6' : '#373a40',
                      color: isLightTheme ? '#000000' : '#ffffff'
                    },
                    dropdown: {
                      backgroundColor: isLightTheme ? '#ffffff' : '#25262b',
                      borderColor: isLightTheme ? '#dee2e6' : '#373a40'
                    },
                    option: {
                      color: isLightTheme ? '#000000' : '#ffffff'
                    }
                  }}
                />
                <ActionIcon
                  variant='subtle'
                  onClick={() => {
                    setSearchOpen(false);
                    setSearchValue(null);
                  }}
                  size='lg'
                >
                  <IconX size={20} />
                </ActionIcon>
              </Flex>
            )}
          </Flex>
          <Flex gap='sm' align='center'>
            <Switch
              label={isManualTheme ? (manualThemeValue ? 'Tema claro' : 'Tema oscuro') : 'Tema automático'}
              checked={isManualTheme ? manualThemeValue : isLightTheme}
              onChange={(e) => {
                if (!isManualTheme) {
                  // Primera vez que hace clic, activar modo manual con el estado actual
                  setIsManualTheme(true);
                  setManualThemeValue(e.currentTarget.checked);
                } else {
                  // Ya está en modo manual, solo cambiar el valor
                  setManualThemeValue(e.currentTarget.checked);
                }
              }}
              size='sm'
              color='blue'
              onDoubleClick={() => {
                // Doble clic para volver a modo automático
                setIsManualTheme(false);
              }}
            />
          </Flex>
        </Flex>
        <Calendar
          onSelectEvent={(value) => handleSelectedSlot(value)}
          localizer={localizer}
          date={date}
          onNavigate={onNavigate}
          onView={onView}
          view={view}
          events={internalEvents}
          defaultDate={defaultDate}
          startAccessor='start'
          endAccessor='end'
          views={['month', 'week', 'day']}
          selectable={true}
          eventPropGetter={eventStyleGetter}
          messages={{
            month: 'Mes',
            week: 'Semana',
            day: 'Día',
            today: 'Hoy',
            previous: 'Anterior',
            next: 'Siguiente',
            showMore: (total) => `+${total} más`
          }}
          style={{
            height: 'calc(100vh - 80px)',
            width: '100%'
          }}
        />
      </Flex>
      <Drawer
        position='right'
        opened={isOpen}
        onClose={() => setIsOpen(false)}
        styles={{
          close: {
            position: 'fixed',
            zIndex: 1001,
            backgroundColor: '#1a1b1e',
            right: '16px',
            left: 'auto'
          }
        }}
      >
        <DrawerContent />
      </Drawer>
    </>
  );
});
