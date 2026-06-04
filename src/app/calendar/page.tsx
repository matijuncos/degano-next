'use client';
import {
  Calendar,
  Views,
  dateFnsLocalizer
} from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './calendar.css';
import 'moment/locale/es';
import { Drawer, Button, Flex, Badge, Switch, Select, ActionIcon, Box, LoadingOverlay } from '@mantine/core';
import { IconSearch, IconX } from '@tabler/icons-react';
import { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { useDeganoCtx } from '@/context/DeganoContext';
import DrawerContent from '@/components/DrawerContent/DrawerContent';
import { useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns/format';
import { parse } from 'date-fns/parse';
import { startOfWeek } from 'date-fns/startOfWeek';
import { getDay } from 'date-fns/getDay';
import { es } from 'date-fns/locale/es';
import { withPageAuthRequired } from '@auth0/nextjs-auth0/client';
import useSWR, { mutate } from 'swr';
import { usePermissions } from '@/hooks/usePermissions';
import CalendarSidebar, { AppCalendar } from '@/components/CalendarSidebar/CalendarSidebar';
import CalendarEventModal, { CalendarEventData } from '@/components/CalendarEventModal/CalendarEventModal';
import useNotification from '@/hooks/useNotification';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default withPageAuthRequired(function CalendarPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const notify = useNotification();
  const { isAdmin } = usePermissions();

  const [isOpen, setIsOpen] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState<string | null>(null);

  // ──── Calendarios y eventos personales (solo admin) ────
  const { data: calendars = [], mutate: mutateCalendars } = useSWR<AppCalendar[]>(
    isAdmin ? '/api/appCalendars' : null,
    fetcher
  );
  const { data: personalEvents = [], mutate: mutatePersonalEvents } = useSWR<any[]>(
    isAdmin ? '/api/calendarEvents' : null,
    fetcher
  );

  // Calendarios visibles (todos visibles por defecto)
  const [visibleCalendarIds, setVisibleCalendarIds] = useState<Set<string>>(new Set());
  const [nativeEventsVisible, setNativeEventsVisible] = useState(true);

  useEffect(() => {
    if (calendars.length > 0) {
      setVisibleCalendarIds((prev) => {
        const next = new Set(prev);
        calendars.forEach((cal) => {
          if (!next.has(cal._id)) next.add(cal._id);
        });
        return next;
      });
    }
  }, [calendars]);

  const toggleVisibility = (id: string) => {
    setVisibleCalendarIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ──── Modal de eventos personales ────
  const [eventModalOpened, setEventModalOpened] = useState(false);
  const [modalInitialData, setModalInitialData] = useState<Partial<CalendarEventData> | undefined>(undefined);

  const openCreateModal = (start: Date, end: Date) => {
    setModalInitialData({ start, end });
    setEventModalOpened(true);
  };

  const openEditModal = (event: any) => {
    setModalInitialData({
      _id: event._id?.toString(),
      title: event.title,
      start: new Date(event.start),
      end: new Date(event.end),
      allDay: event.allDay,
      calendarId: event.calendarId,
      description: event.description || ''
    });
    setEventModalOpened(true);
  };

  const handleSavePersonalEvent = async (
    data: Omit<CalendarEventData, '_id' | 'source' | 'calendarColor'>,
    id?: string
  ) => {
    notify({ loading: true });
    try {
      if (id) {
        await fetch(`/api/calendarEvents?id=${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
      } else {
        await fetch('/api/calendarEvents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
      }
      mutatePersonalEvents();
      notify();
    } catch {
      notify({ type: 'defaultError' });
    }
  };

  const handleDeletePersonalEvent = async (id: string) => {
    notify({ loading: true });
    try {
      await fetch(`/api/calendarEvents?id=${id}`, { method: 'DELETE' });
      mutatePersonalEvents();
      notify();
    } catch {
      notify({ type: 'defaultError' });
    }
  };

  // ──── CRUD de calendarios ────
  const handleCreateCalendar = async (name: string, color: string) => {
    notify({ loading: true });
    try {
      await fetch('/api/appCalendars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color })
      });
      mutateCalendars();
      notify();
    } catch {
      notify({ type: 'defaultError' });
    }
  };

  const handleUpdateCalendar = async (id: string, name: string, color: string) => {
    notify({ loading: true });
    try {
      await fetch(`/api/appCalendars?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color })
      });
      mutateCalendars();
      notify();
    } catch {
      notify({ type: 'defaultError' });
    }
  };

  const handleDeleteCalendar = async (id: string) => {
    notify({ loading: true });
    try {
      await fetch(`/api/appCalendars?id=${id}`, { method: 'DELETE' });
      mutateCalendars();
      mutatePersonalEvents();
      setVisibleCalendarIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      notify();
    } catch {
      notify({ type: 'defaultError' });
    }
  };

  // ──── Localizer y tema ────
  const locales = { es };
  const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: 1 }),
    getDay,
    locales
  });

  const { setSelectedEvent, allEvents } = useDeganoCtx();

  const [isManualTheme, setIsManualTheme] = useState(false);
  const [manualThemeValue, setManualThemeValue] = useState(true);
  const [isDaytime, setIsDaytime] = useState(() => {
    const hour = new Date().getHours();
    return hour >= 7 && hour < 20;
  });

  useEffect(() => {
    const checkTime = () => {
      const hour = new Date().getHours();
      setIsDaytime(hour >= 7 && hour < 20);
    };
    if (!isManualTheme) {
      const interval = setInterval(checkTime, 60000);
      return () => clearInterval(interval);
    }
  }, [isManualTheme]);

  const isLightTheme = isManualTheme ? manualThemeValue : isDaytime;

  useEffect(() => {
    if (isLightTheme) {
      document.body.classList.add('calendar-light-mode');
      document.body.classList.remove('calendar-dark-mode');
    } else {
      document.body.classList.add('calendar-dark-mode');
      document.body.classList.remove('calendar-light-mode');
    }
  }, [isLightTheme]);

  // ──── Vista y fecha ────
  const viewMapping: { [key: string]: string } = {
    'mes': 'month', 'semana': 'week', 'dia': 'day',
    'month': 'mes', 'week': 'semana', 'day': 'dia'
  };

  const viewParam = searchParams.get('view') as 'mes' | 'semana' | 'dia' | null;
  const dateParam = searchParams.get('date');

  const [date, setDate] = useState(() => {
    if (dateParam) return new Date(dateParam);
    return new Date();
  });

  const [view, setView] = useState(() => {
    if (viewParam && ['mes', 'semana', 'dia'].includes(viewParam)) {
      const englishView = viewMapping[viewParam];
      return Views[englishView.toUpperCase() as 'MONTH' | 'WEEK' | 'DAY'];
    }
    return Views.MONTH;
  });

  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Click en evento Degano
  const handleDeganoEventClick = (value: any) => {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
      if (value._id) {
        setNavigating(true);
        fetch(`/api/getEvent?id=${value._id}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' }
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.event) {
              setSelectedEvent(data.event);
            }
            router.push(`/event/${value._id}?from=/calendar`);
          })
          .catch(() => {
            router.push(`/event/${value._id}?from=/calendar`);
          });
      }
    } else {
      clickTimerRef.current = setTimeout(() => {
        clickTimerRef.current = null;
        setSelectedEvent({ ...value });
        setIsOpen(true);
      }, 200);
    }
  };

  // onSelectEvent diferenciado por source
  const handleSelectEvent = (value: any) => {
    if (value.source === 'personal') {
      openEditModal(value);
      return;
    }
    handleDeganoEventClick(value);
  };

  // onSelectSlot — solo admin abre modal de creación
  const handleSelectSlot = useCallback(
    ({ start, end }: { start: Date; end: Date }) => {
      if (!isAdmin) return;
      openCreateModal(start, end);
    },
    [isAdmin]
  );

  const { defaultDate } = useMemo(() => ({ defaultDate: new Date() }), []);

  // ──── Eventos Degano ────
  const internalEvents = allEvents.map((evnt) => {
    const startDate = new Date(evnt.date);
    const endDate = evnt.endDate ? new Date(evnt.endDate) : new Date(evnt.date);
    const startDay = new Date(startDate); startDay.setHours(0, 0, 0, 0);
    const endDay = new Date(endDate); endDay.setHours(0, 0, 0, 0);
    const spansMultipleDays = endDay > startDay;
    const durationHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
    let adjustedEnd = endDate;
    if (spansMultipleDays && durationHours < 20) {
      adjustedEnd = new Date(startDate);
      adjustedEnd.setHours(23, 59, 59, 999);
    }
    return {
      ...evnt,
      title: evnt?.type && evnt?.lugar ? `${evnt.type} - ${evnt.lugar}` : evnt.fullName,
      start: startDate,
      end: adjustedEnd,
      allDay: false,
      selectable: true,
      source: 'internal'
    };
  });

  // ──── Eventos personales filtrados ────
  const calendarMap = useMemo(() => {
    const map: Record<string, AppCalendar> = {};
    calendars.forEach((cal) => { map[cal._id] = cal; });
    return map;
  }, [calendars]);

  const personalCalendarEvents = useMemo(() => {
    if (!isAdmin) return [];
    return personalEvents
      .filter((ev) => visibleCalendarIds.has(ev.calendarId))
      .map((ev) => ({
        ...ev,
        _id: ev._id?.toString(),
        start: new Date(ev.start),
        end: new Date(ev.end),
        source: 'personal',
        calendarColor: calendarMap[ev.calendarId]?.color || '#4a9eed'
      }));
  }, [personalEvents, visibleCalendarIds, calendarMap, isAdmin]);

  // Merge de todos los eventos
  const allCalendarEvents = useMemo(
    () => [...(nativeEventsVisible ? internalEvents : []), ...personalCalendarEvents],
    [internalEvents, personalCalendarEvents, nativeEventsVisible]
  );

  // ──── Estilos por evento ────
  const getEventStatus = (event: any) => {
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const startDate = new Date(event.start); startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(event.end); endDate.setHours(23, 59, 59, 999);
    if (endDate < now) return 'past';
    if (startDate <= now && endDate >= now) return 'current';
    return 'future';
  };

  const eventStyleGetter = (event: any) => {
    // Eventos personales: color del calendario
    if (event.source === 'personal') {
      return {
        style: {
          backgroundColor: event.calendarColor,
          borderColor: event.calendarColor,
          color: '#ffffff',
          opacity: 0.92
        }
      };
    }

    // Eventos Degano: lógica original
    const status = getEventStatus(event);
    let backgroundColor, borderColor;
    switch (status) {
      case 'past':
        backgroundColor = '#2f3d29ff'; borderColor = '#343a40'; break;
      case 'current':
        backgroundColor = '#37b24d'; borderColor = '#2b8a3e'; break;
      case 'future':
        backgroundColor = '#237332ff'; borderColor = '#2b8a3e'; break;
      default:
        backgroundColor = '#37b24d'; borderColor = '#2b8a3e';
    }
    return { style: { backgroundColor, borderColor, color: '#ffffff' } };
  };

  const onNavigate = useCallback((newDate: any) => {
    setDate(newDate);
    updateURL(newDate, view);
  }, [view]);

  const onView = useCallback((newView: any) => {
    setView(newView);
    updateURL(date, newView);
  }, [date]);

  const updateURL = (currentDate: Date, currentView: any) => {
    const viewName = Object.keys(Views).find(
      (key) => Views[key as keyof typeof Views] === currentView
    )?.toLowerCase() || 'month';
    const spanishViewName = viewMapping[viewName] || 'mes';
    const params = new URLSearchParams();
    params.set('view', spanishViewName);
    params.set('date', currentDate.toISOString());
    router.push(`/calendar?${params.toString()}`, { scroll: false });
  };

  const searchOptions = useMemo(() => {
    const optionsMap = new Map();
    allEvents.forEach((event) => {
      if (!event._id) return;
      const clientNames = [event.fullName];
      if (event.extraClients?.length) {
        event.extraClients.forEach((client) => {
          if (client.fullName) clientNames.push(client.fullName);
        });
      }
      const label = `${event.type} - ${clientNames.join(', ')}`;
      if (!optionsMap.has(event._id)) {
        optionsMap.set(event._id, {
          value: event._id,
          label,
          searchText: `${event.type} ${clientNames.join(' ')}`.toLowerCase()
        });
      }
    });
    return Array.from(optionsMap.values()).sort((a, b) =>
      a.label.localeCompare(b.label, 'es', { sensitivity: 'base' })
    );
  }, [allEvents]);

  const handleEventSelect = (eventId: string | null) => {
    if (eventId) router.push(`/event/${eventId}?from=/calendar`);
  };

  // ──── Render ────
  return (
    <>
      <Flex
        direction='row'
        style={{ height: '100vh', backgroundColor: isLightTheme ? '#ffffff' : '#1a1b1e', position: 'relative' }}
      >
        <LoadingOverlay visible={navigating} overlayProps={{ blur: 2 }} />
        {/* Sidebar de calendarios */}
        <CalendarSidebar
          calendars={calendars}
          visibleCalendarIds={visibleCalendarIds}
          onToggleVisibility={toggleVisibility}
          onCreateCalendar={handleCreateCalendar}
          onUpdateCalendar={handleUpdateCalendar}
          onDeleteCalendar={handleDeleteCalendar}
          isLightTheme={isLightTheme}
          nativeEventsVisible={nativeEventsVisible}
          onToggleNativeEvents={() => setNativeEventsVisible((v) => !v)}
          isAdmin={isAdmin}
        />

        {/* Contenido principal */}
        <Flex
          direction='column'
          className={isLightTheme ? 'calendar-light-theme' : ''}
          style={{ flex: 1, overflow: 'hidden' }}
        >
          {/* Header con controles */}
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
            <Flex gap='md' align='center' wrap='wrap' style={{ marginLeft: '50px' }}>
              <Badge color='green' variant='filled'>
                {internalEvents.length} eventos
              </Badge>
              {isAdmin && personalCalendarEvents.length > 0 && (
                <Badge color='blue' variant='light'>
                  {personalCalendarEvents.length} personales
                </Badge>
              )}

              {/* Búsqueda de eventos Degano */}
              {!searchOpen ? (
                <ActionIcon variant='subtle' onClick={() => setSearchOpen(true)} size='lg'>
                  <IconSearch size={20} style={{ color: '#228be6' }} />
                </ActionIcon>
              ) : (
                <Flex gap='xs' align='center'>
                  <Select
                    placeholder='Buscar por tipo o cliente...'
                    data={searchOptions}
                    value={searchValue}
                    onChange={(value) => { setSearchValue(value); handleEventSelect(value); }}
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
                      option: { color: isLightTheme ? '#000000' : '#ffffff' }
                    }}
                  />
                  <ActionIcon
                    variant='subtle'
                    onClick={() => { setSearchOpen(false); setSearchValue(null); }}
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
                    setIsManualTheme(true);
                    setManualThemeValue(e.currentTarget.checked);
                  } else {
                    setManualThemeValue(e.currentTarget.checked);
                  }
                }}
                size='sm'
                color='blue'
                onDoubleClick={() => setIsManualTheme(false)}
              />
            </Flex>
          </Flex>

          {/* Calendario */}
          <Calendar
            onSelectEvent={handleSelectEvent}
            onSelectSlot={handleSelectSlot}
            localizer={localizer}
            culture='es'
            date={date}
            onNavigate={onNavigate}
            onView={onView}
            view={view}
            events={allCalendarEvents}
            defaultDate={defaultDate}
            startAccessor='start'
            endAccessor='end'
            views={['month', 'week', 'day']}
            selectable={true}
            eventPropGetter={eventStyleGetter}
            messages={{
              month: 'Mes', week: 'Semana', day: 'Día',
              today: 'Hoy', previous: 'Anterior', next: 'Siguiente',
              showMore: (total) => `+${total} más`
            }}
            style={{ height: 'calc(100vh - 80px)', width: '100%' }}
          />
        </Flex>
      </Flex>

      {/* Drawer para eventos Degano */}
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

      {/* Modal para eventos personales (solo admin) */}
      {isAdmin && (
        <CalendarEventModal
          opened={eventModalOpened}
          onClose={() => setEventModalOpened(false)}
          initialData={modalInitialData}
          calendars={calendars}
          onSave={handleSavePersonalEvent}
          onDelete={handleDeletePersonalEvent}
          isLightTheme={isLightTheme}
        />
      )}
    </>
  );
});
