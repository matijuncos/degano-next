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
import { Drawer, Button, Flex, Modal, Stack, Badge, Switch } from '@mantine/core';
import { useCallback, useMemo, useState, useEffect } from 'react';
import { useDeganoCtx } from '@/context/DeganoContext';
import DrawerContent from '@/components/DrawerContent/DrawerContent';
import GoogleCalendarManager, { GoogleAccount } from '@/components/GoogleCalendarManager/GoogleCalendarManager';
import { useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns/format';
import { parse } from 'date-fns/parse';
import { startOfWeek } from 'date-fns/startOfWeek';
import { getDay } from 'date-fns/getDay';
import { es } from 'date-fns/locale/es';
import { withPageAuthRequired } from '@auth0/nextjs-auth0/client';
import { IconSettings, IconCalendar } from '@tabler/icons-react';
import { initializeGapiClientAndGetToken } from '@/lib/gapi';

interface GoogleCalendar {
  id: string;
  summary: string;
  description?: string;
  backgroundColor: string;
  foregroundColor: string;
  primary: boolean;
  accessRole: string;
}

const gapiConfig = {
  apiKey: process.env.NEXT_PUBLIC_GAPICONFIG_APIKEY,
  clientId: process.env.NEXT_PUBLIC_GAPICONFIG_CLIENTID,
  discoveryDocs: [process.env.NEXT_PUBLIC_GOOGLE_DISCOVERY_DOCS],
  scope: process.env.NEXT_PUBLIC_GOOGLE_SCOPES
};

export default withPageAuthRequired(function CalendarPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedGoogleCalendars, setSelectedGoogleCalendars] = useState<string[]>([]);
  const [googleCalendarsData, setGoogleCalendarsData] = useState<GoogleCalendar[]>([]);
  const [googleAccounts, setGoogleAccounts] = useState<GoogleAccount[]>([]);
  const [googleEvents, setGoogleEvents] = useState<any[]>([]);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [showGoogleEvents, setShowGoogleEvents] = useState(true);
  const [showInternalEvents, setShowInternalEvents] = useState(true);

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
    // Solo abrir drawer para eventos internos
    if (value.source === 'internal') {
      setSelectedEvent({ ...value });
      setIsOpen(true);
    }
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

  // Función para obtener eventos de Google Calendar
  const fetchGoogleEvents = async (token: string, calendarIds: string[]) => {
    if (calendarIds.length === 0) {
      setGoogleEvents([]);
      return;
    }

    setIsLoadingEvents(true);
    try {
      const response = await fetch('/api/getGoogleCalendarEvents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          accessToken: token,
          calendarIds: calendarIds,
          timeMin: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 dias atrás
          timeMax: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() // 90 dias adelante
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }

      const data = await response.json();
      const formattedEvents = data.events.map((event: any) => {
        const calendar = googleCalendarsData.find(
          (cal) => cal.id === event.calendarId
        );
        return {
          id: event.id,
          title: event.summary || 'Sin título',
          start: new Date(event.start),
          end: new Date(event.end),
          allDay: event.isAllDay,
          source: 'google',
          calendarId: event.calendarId,
          description: event.description,
          location: event.location,
          htmlLink: event.htmlLink,
          style: {
            backgroundColor: calendar?.backgroundColor || '#9c27b0',
            borderColor: calendar?.foregroundColor || '#7b1fa2'
          }
        };
      });

      setGoogleEvents(formattedEvents);
    } catch (error) {
      console.error('Error fetching Google events:', error);
    } finally {
      setIsLoadingEvents(false);
    }
  };

  // Manejar cambio de cuentas conectadas
  const handleAccountsChange = (accounts: GoogleAccount[]) => {
    setGoogleAccounts(accounts);
    // Guardar en localStorage (incluye tokens para mantener la sesión)
    localStorage.setItem('googleAccounts', JSON.stringify(accounts));
  };

  // Manejar cambio de calendarios seleccionados
  const handleCalendarsChange = async (
    calendarIds: string[],
    calendars: GoogleCalendar[]
  ) => {
    setSelectedGoogleCalendars(calendarIds);
    setGoogleCalendarsData(calendars);

    // Guardar en localStorage
    localStorage.setItem('selectedGoogleCalendars', JSON.stringify(calendarIds));
    localStorage.setItem('googleCalendarsData', JSON.stringify(calendars));

    // Obtener token y cargar eventos
    if (calendarIds.length > 0) {
      let token = accessToken;
      if (!token) {
        token = await initializeGapiClientAndGetToken(gapiConfig);
        if (token) {
          setAccessToken(token);
        }
      }
      if (token) {
        await fetchGoogleEvents(token, calendarIds);
      }
    } else {
      setGoogleEvents([]);
    }
  };

  // Cargar configuración guardada al montar el componente
  useEffect(() => {
    const savedCalendarIds = localStorage.getItem('selectedGoogleCalendars');
    const savedCalendarsData = localStorage.getItem('googleCalendarsData');
    const savedAccounts = localStorage.getItem('googleAccounts');

    if (savedAccounts) {
      const accounts = JSON.parse(savedAccounts);
      // Las cuentas se guardan sin tokens, así que las cargamos como están
      setGoogleAccounts(accounts);
    }

    if (savedCalendarIds && savedCalendarsData) {
      const calendarIds = JSON.parse(savedCalendarIds);
      const calendarsData = JSON.parse(savedCalendarsData);
      setSelectedGoogleCalendars(calendarIds);
      setGoogleCalendarsData(calendarsData);

      // Cargar eventos si hay calendarios seleccionados
      if (calendarIds.length > 0) {
        initializeGapiClientAndGetToken(gapiConfig).then((token) => {
          if (token) {
            setAccessToken(token);
            fetchGoogleEvents(token, calendarIds);
          }
        });
      }
    }
  }, []);

  // Combinar eventos según los filtros
  const combinedEvents = useMemo(() => {
    const events = [];
    if (showInternalEvents) {
      events.push(...internalEvents);
    }
    if (showGoogleEvents) {
      events.push(...googleEvents);
    }
    return events;
  }, [internalEvents, googleEvents, showInternalEvents, showGoogleEvents]);

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
    // Solo aplicar colores según fecha a eventos internos
    if (event.source === 'internal') {
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
    }

    // Para eventos de Google, usar su estilo original
    return {
      style: event.style || {}
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

  return (
    <>
      <Flex
        direction='column'
        style={{ height: '100vh', backgroundColor: '#1a1b1e' }}
      >
        <Flex
          justify='space-between'
          align='center'
          p='md'
          style={{
            borderBottom: '1px solid #373a40',
            backgroundColor: '#25262b'
          }}
        >
          <Flex gap='md' align='center'>
            <Badge color='green' variant='filled'>
              {internalEvents.length} eventos internos
            </Badge>
            {googleEvents.length > 0 && (
              <Badge color='grape' variant='filled'>
                {googleEvents.length} eventos de Google
              </Badge>
            )}
          </Flex>
          <Flex gap='sm' align='center'>
            <Switch
              label='Eventos internos'
              checked={showInternalEvents}
              onChange={(e) => setShowInternalEvents(e.currentTarget.checked)}
              size='sm'
              color='green'
            />
            <Switch
              label='Eventos de Google'
              checked={showGoogleEvents}
              onChange={(e) => setShowGoogleEvents(e.currentTarget.checked)}
              size='sm'
              color='grape'
              disabled={googleEvents.length === 0}
            />
            <Button
              leftSection={<IconSettings size={16} />}
              onClick={() => setIsSettingsOpen(true)}
              variant='light'
              color='gray'
            >
              Configurar calendarios
            </Button>
          </Flex>
        </Flex>
        <Calendar
          onSelectEvent={(value) => handleSelectedSlot(value)}
          localizer={localizer}
          date={date}
          onNavigate={onNavigate}
          onView={onView}
          view={view}
          events={combinedEvents}
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
      <Drawer position='right' opened={isOpen} onClose={() => setIsOpen(false)}>
        <DrawerContent />
      </Drawer>
      <Modal
        opened={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title='Configurar Calendarios de Google'
        size='lg'
      >
        <GoogleCalendarManager
          onCalendarsChange={handleCalendarsChange}
          selectedCalendarIds={selectedGoogleCalendars}
          initialAccounts={googleAccounts}
          onAccountsChange={handleAccountsChange}
        />
      </Modal>
    </>
  );
});
