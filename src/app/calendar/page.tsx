'use client';
import {
  Calendar,
  Views,
  dateFnsLocalizer,
  momentLocalizer
} from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'moment/locale/es';
import { Drawer, Button, Flex, Modal, Stack, Badge, Switch } from '@mantine/core';
import { useCallback, useMemo, useState, useEffect } from 'react';
import { useDeganoCtx } from '@/context/DeganoContext';
import DrawerContent from '@/components/DrawerContent/DrawerContent';
import GoogleCalendarManager, { GoogleAccount } from '@/components/GoogleCalendarManager/GoogleCalendarManager';
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
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState(Views.MONTH);

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
        backgroundColor: '#228be6',
        borderColor: '#1c7ed6'
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
          timeMin: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 días atrás
          timeMax: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() // 90 días adelante
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

  // Función para aplicar estilos a los eventos
  const eventStyleGetter = (event: any) => {
    return {
      style: event.style || {}
    };
  };

  const onNavigate = useCallback(
    (newDate: any) => {
      setDate(newDate);
    },
    [setDate]
  );
  const onView = useCallback((newView: any) => setView(newView), [setView]);

  return (
    <>
      <Flex
        direction='column'
        style={{ height: '100vh', backgroundColor: 'white' }}
      >
        <Flex
          justify='space-between'
          align='center'
          p='md'
          style={{ borderBottom: '1px solid #e0e0e0' }}
        >
          <Flex gap='md' align='center'>
            <Badge color='blue' variant='filled'>
              {internalEvents.length} eventos internos
            </Badge>
            {googleEvents.length > 0 && (
              <Badge color='purple' variant='filled'>
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
            />
            <Switch
              label='Eventos de Google'
              checked={showGoogleEvents}
              onChange={(e) => setShowGoogleEvents(e.currentTarget.checked)}
              size='sm'
              disabled={googleEvents.length === 0}
            />
            <Button
              leftSection={<IconSettings size={16} />}
              onClick={() => setIsSettingsOpen(true)}
              variant='light'
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
          style={{
            height: 'calc(100vh - 100px)',
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
