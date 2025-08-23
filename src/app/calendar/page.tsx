'use client';
import {
  Calendar,
  Views,
  dateFnsLocalizer,
  momentLocalizer
} from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'moment/locale/es';
import { Drawer } from '@mantine/core';
import { useCallback, useMemo, useState } from 'react';
import { useDeganoCtx } from '@/context/DeganoContext';
import DrawerContent from '@/components/DrawerContent/DrawerContent';
import { format } from 'date-fns/format';
import { parse } from 'date-fns/parse';
import { startOfWeek } from 'date-fns/startOfWeek';
import { getDay } from 'date-fns/getDay';
import { es } from 'date-fns/locale/es';
import { withPageAuthRequired } from '@auth0/nextjs-auth0/client';
export default withPageAuthRequired(function CalendarPage() {
  const [isOpen, setIsOpen] = useState(false);

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
    setSelectedEvent({ ...value });
    setIsOpen(true);
  };
  const { defaultDate } = useMemo(
    () => ({
      defaultDate: new Date()
    }),
    []
  );
  const events = allEvents.map((evnt) => {
    return {
      ...evnt,
      title:
        evnt?.type && evnt?.lugar
          ? `${evnt.type} - ${evnt.lugar}`
          : evnt.fullName,
      start: new Date(evnt.date),
      end: evnt.endDate ? new Date(evnt.endDate) : new Date(evnt.date),
      allDay: false,
      selectable: true
    };
  });

  const onNavigate = useCallback(
    (newDate: any) => {
      setDate(newDate);
    },
    [setDate]
  );
  const onView = useCallback((newView: any) => setView(newView), [setView]);

  return (
    <>
      <Calendar
        onSelectEvent={(value) => handleSelectedSlot(value)}
        localizer={localizer}
        date={date}
        onNavigate={onNavigate}
        onView={onView}
        view={view}
        events={events}
        defaultDate={defaultDate}
        startAccessor='start'
        endAccessor='end'
        views={['month', 'week', 'day']}
        selectable={true}
        style={{
          height: 'calc(100vh - 40px)',
          backgroundColor: 'white',
          color: 'green',
          width: '100%'
        }}
      />
      <Drawer position='right' opened={isOpen} onClose={() => setIsOpen(false)}>
        <DrawerContent />
      </Drawer>
    </>
  );
});
