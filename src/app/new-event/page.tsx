'use client';

import ClientForm from '@/components/ClientForm/ClientForm';
import EquipmentForm from '@/components/EquipmentForm/EquipmentForm';
import EventForm from '@/components/EventForm/EventForm';
import MusicForm from '@/components/MusicForm/MusicForm';
import PaymentForm from '@/components/PaymentForm/PaymentForm';
import { useDeganoCtx } from '@/context/DeganoContext';
import { EVENT_TABS, genres } from '@/context/config';
import { EventModel } from '@/context/types';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { withPageAuthRequired } from '@auth0/nextjs-auth0/client';
const NewEventPage = () => {
  const {
    formState,
    setFormState,
    validate,
    setValidate,
    setFolderName,
    setAllEvents
  } = useDeganoCtx();
  const router = useRouter();
  const [event, setEvent] = useState<EventModel>({
    _id: '', // Use empty string instead of null
    fullName: '',
    phoneNumber: '',
    email: '',
    age: '',
    address: '',
    type: '',
    guests: '',
    eventAddress: '',
    eventCity: '',
    salon: '',
    date: new Date(),
    averageAge: '',
    churchDate: '',
    civil: new Date().toISOString(),
    bandName: '',
    manager: '',
    managerPhone: '',
    moreData: '',
    showtime: new Date().getTime().toString(),
    music: {
      genres: genres,
      required: [],
      forbidden: []
    },
    equipment: [],
    payment: {
      upfrontAmount: '',
      totalToPay: '',
      partialPaymentDate: new Date(),
      partialPayed: false,
      totalPayed: false
    },
    active: true,
    playlist: []
  });

  const onNextTab = (tab: number, data: EventModel) => {
    setFormState(tab);
    setEvent(data);
  };
  const onBackTab = (tab: number, data: EventModel) => {
    setFormState(tab);
    setEvent(data);
  };

  useEffect(() => {
    setFormState(EVENT_TABS.CLIENT);
  }, []);

  const saveEvent = async (newEvent: EventModel) => {
    try {
      const response = await fetch('/api/postEvent', {
        method: 'POST',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newEvent)
      });
      const data = await response.json();
      if (data) {
        setFolderName(
          `${newEvent.fullName} - ${newEvent.salon} - ${new Date(
            newEvent.date
          ).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit'
          })}`
        );
        if (data.event)
          setAllEvents((prev: EventModel[]) => [...prev, data.event]);
        router.push('/upload-file');
      }
    } catch (err) {
      console.error('failed to save the event ', err);
    }
  };

  const getTabContent = () => {
    switch (formState) {
      case EVENT_TABS.CLIENT:
        return (
          <ClientForm
            onNextTab={onNextTab}
            onBackTab={onBackTab}
            event={event}
            validate={validate}
            setValidate={setValidate}
          />
        );
      case EVENT_TABS.EVENT:
        return (
          <EventForm
            onNextTab={onNextTab}
            onBackTab={onBackTab}
            event={event}
            validate={validate}
            setValidate={setValidate}
          />
        );
      case EVENT_TABS.MUSIC:
        return (
          <MusicForm
            onNextTab={onNextTab}
            onBackTab={onBackTab}
            event={event}
          />
        );
      case EVENT_TABS.EQUIPMENT:
        return (
          <EquipmentForm
            onNextTab={onNextTab}
            onBackTab={onBackTab}
            event={event}
          />
        );
      case EVENT_TABS.PAYMENT:
        return (
          <PaymentForm
            onBackTab={onBackTab}
            event={event}
            onFinish={saveEvent}
          />
        );
      default:
        break;
    }
  };

  return <div>{getTabContent()}</div>;
};

export default withPageAuthRequired(NewEventPage);
