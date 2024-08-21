'use client';

import ClientForm from '@/components/ClientForm/ClientForm';
import EquipmentForm from '@/components/EquipmentForm/EquipmentForm';
import EventForm from '@/components/EventForm/EventForm';
import MusicForm from '@/components/MusicForm/MusicForm';
import PaymentForm from '@/components/PaymentForm/PaymentForm';
import { useDeganoCtx } from '@/context/DeganoContext';
import { genres } from '@/context/config';
import { EventModel } from '@/context/types';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
const NewEventPage = () => {
  const { formState, setFormState, validate, setValidate } = useDeganoCtx();
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
    eventDate: '',
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
      totalPaymentDate: new Date(),
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
    setFormState(3);
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
      router.push('/home');
    } catch (err) {
      console.error('failed to save the event ', err);
    }
  };

  const getTabContent = () => {
    switch (formState) {
      case 0:
        return (
          <ClientForm
            onNextTab={onNextTab}
            onBackTab={onBackTab}
            event={event}
            validate={validate}
            setValidate={setValidate}
          />
        );
      case 1:
        return (
          <EventForm
            onNextTab={onNextTab}
            onBackTab={onBackTab}
            event={event}
            validate={validate}
            setValidate={setValidate}
          />
        );
      case 2:
        return (
          <MusicForm
            onNextTab={onNextTab}
            onBackTab={onBackTab}
            event={event}
          />
        );
      case 3:
        return (
          <EquipmentForm
            onNextTab={onNextTab}
            onBackTab={onBackTab}
            event={event}
          />
        );
      case 4:
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

export default NewEventPage;
