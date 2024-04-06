'use client';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import moment from 'moment';
import 'moment/locale/es';
import { Drawer } from '@mantine/core';
import { useState } from 'react';
import { useDeganoCtx } from '@/context/DeganoContext';
import DrawerContent from '@/components/DrawerContent/DrawerContent';
import { mockedEvents } from '@/mockedData/event';
export default function Home() {
  const [isOpen, setIsOpen] = useState(false);
  const localizer = momentLocalizer(moment);
  const { setSelectedEvent } = useDeganoCtx();

  const handleSelectedSlot = (value: any) => {
    setSelectedEvent({ ...value });
    console.log(value);
    setIsOpen(true);
  };

  const events = mockedEvents.map((evnt) => {
    return {
      ...evnt,
      title: evnt.fullName,
      start: new Date(evnt.date),
      end: new Date(evnt.date),
      allDay: false,
      selectable: true
    };
  });

  return (
    <>
      <Calendar
        onSelectEvent={(value) => handleSelectedSlot(value)}
        localizer={localizer}
        popup
        events={events}
        defaultDate={new Date()}
        startAccessor='start'
        endAccessor='end'
        views={['month']}
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
}
