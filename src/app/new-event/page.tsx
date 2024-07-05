'use client';

import ClientForm from '@/components/ClientForm/ClientForm';
import EquipmentForm from '@/components/EquipmentForm/EquipmentForm';
import EventForm from '@/components/EventForm/EventForm';
import MusicForm from '@/components/MusicForm/MusicForm';
import PaymentForm from '@/components/PaymentForm/PaymentForm';
import { useDeganoCtx } from '@/context/DeganoContext';
import { genres } from '@/context/config';
import { EventModel } from '@/context/types';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const NewEventPage = () => {
  const { formState, selectedEvent, setFormState, validate, setValidate } =
    useDeganoCtx();
  const router = useRouter();

  const [event, setEvent] = useState<EventModel>({
    _id: selectedEvent?._id || '', // Use empty string instead of null
    fullName: selectedEvent?.fullName || '',
    phoneNumber: selectedEvent?.phoneNumber || '',
    email: selectedEvent?.email || '',
    age: selectedEvent?.age || '',
    address: selectedEvent?.address || '',
    type: selectedEvent?.type || '',
    guests: selectedEvent?.guests || '',
    eventAddress: selectedEvent?.eventAddress || '',
    eventCity: selectedEvent?.eventCity || '',
    salon: selectedEvent?.salon || '',
    date: selectedEvent?.date || new Date(), // Ensure date is always a Date object
    averageAge: selectedEvent?.averageAge || '',
    eventDate: selectedEvent?.eventDate || '',
    churchDate: selectedEvent?.churchDate,
    civil: selectedEvent?.civil || new Date().toISOString(),
    bandName: selectedEvent?.bandName || '',
    manager: selectedEvent?.manager || '',
    managerPhone: selectedEvent?.managerPhone || '',
    moreData: selectedEvent?.moreData || '',
    showtime: selectedEvent?.showtime || new Date().getTime().toString(),
    music: {
      genres: selectedEvent?.music?.genres || genres,
      required: selectedEvent?.music?.required || [],
      forbidden: selectedEvent?.music?.forbidden || []
    },
    equipment: selectedEvent?.equipment || [],
    payment: {
      upfrontAmount: selectedEvent?.payment?.upfrontAmount || '',
      totalPaymentDate: selectedEvent?.payment?.totalPaymentDate
        ? new Date(selectedEvent.payment.totalPaymentDate)
        : new Date(),
      totalToPay: selectedEvent?.payment?.totalToPay || '',
      partialPaymentDate:
        selectedEvent?.payment?.partialPaymentDate || new Date(),
      partialPayed: selectedEvent?.payment?.partialPayed || false,
      totalPayed: selectedEvent?.payment?.totalPayed || false
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
