'use client';

import ClientForm from '@/components/ClientForm/ClientForm';
import EquipmentForm from '@/components/EquipmentForm/EquipmentForm';
import EventForm from '@/components/EventForm/EventForm';
import MusicForm from '@/components/MusicForm/MusicForm';
import PaymentForm from '@/components/PaymentForm/PaymentForm';
import TimingForm from '@/components/TimingForm/TimingForm';
import FilesHandlerComponent from '@/components/FilesHandlerComponent/FilesHandlerComponent';
import { useDeganoCtx } from '@/context/DeganoContext';
import { EVENT_TABS } from '@/context/config';
import { EventModel } from '@/context/types';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { withPageAuthRequired } from '@auth0/nextjs-auth0/client';
import useLoadingCursor from '@/hooks/useLoadingCursor';
import useNotification from '@/hooks/useNotification';
import { INITIAL_EVENT_STATE } from './config';
import { Tabs, Button } from '@mantine/core';

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
  const [event, setEvent] = useState<EventModel>(INITIAL_EVENT_STATE);
  const setLoadingCursor = useLoadingCursor();
  const notify = useNotification();

  const onNextTab = (tab: number, data: EventModel) => {
    setFormState(tab);
    setEvent(data);
    setValidate(false); // Resetear validación al cambiar de pestaña
  };
  const onBackTab = (tab: number, data: EventModel) => {
    setFormState(tab);
    setEvent(data);
    setValidate(false); // Resetear validación al cambiar de pestaña
  };

  useEffect(() => {
    setFormState(EVENT_TABS.CLIENT);
  }, []);

  // Actualizar folderName cuando los campos necesarios estén disponibles
  useEffect(() => {
    if (event.date && event.type && event.lugar) {
      const folder = `${new Date(event.date).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit'
      })} - ${event.type} - ${event.lugar}`;
      setFolderName(folder);
    }
  }, [event.date, event.type, event.lugar, setFolderName]);

  // Verificar si se puede mostrar la tab de archivos
  const canShowFilesTab = () => {
    return !!(event.date && event.type && event.lugar);
  };

  const saveEvent = async (newEvent: EventModel) => {
    setLoadingCursor(true);
    notify({ loading: true });
    try {
      // agregar update del equipment
      // await fetch('/api/updateEquipmentV2', {
      //   method: 'PUT',
      //   body: JSON.stringify(newEvent.equipment),
      //   cache: 'no-store',
      //   headers: {
      //     'Content-Type': 'application/json'
      //   }
      // });
      // Se comenta porque actualmente no es necesario descontar cantidades y no hace falta el update
      // console.log('equipmentResposne ', equipmentResponse)
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
          `${new Date(newEvent.date).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit'
          })} - ${newEvent.type} - ${newEvent.lugar}`
        );
        if (data.event) {
          setAllEvents((prev: EventModel[]) => [...prev, data.event]);
          setEvent(data.event);
        }

        // Si la tab de archivos está disponible, ir a ella; si no, redirigir a upload-file
        if (canShowFilesTab()) {
          setFormState(EVENT_TABS.FILES);
          notify({ message: 'Evento guardado correctamente. Ahora puedes subir archivos.' });
        } else {
          router.push('/upload-file');
          notify();
        }
      }
    } catch (err) {
      notify({ type: 'defaultError' });
      console.error('failed to save the event ', err);
    } finally {
      setLoadingCursor(false);
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
      case EVENT_TABS.TIMING:
        return (
          <TimingForm
            onNextTab={onNextTab}
            onBackTab={onBackTab}
            event={event}
          />
        );
      case EVENT_TABS.FILES:
        return (
          <div>
            <h3>Archivos del evento</h3>
            <FilesHandlerComponent />
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                marginTop: '20px'
              }}
            >
              <Button onClick={() => onBackTab(EVENT_TABS.PAYMENT, event)}>
                Atrás
              </Button>
            </div>
          </div>
        );
      default:
        break;
    }
  };

  return (
    <div>
      {/*  TABS TO NAVIGATE BETWEEN SECTIONS */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <Tabs
          value={formState.toString()}
          onChange={(value) => setFormState(Number(value))}
          style={{ marginBottom: '2rem' }}
        >
          <Tabs.List>
            <Tabs.Tab value={EVENT_TABS.CLIENT.toString()}>Cliente</Tabs.Tab>
            <Tabs.Tab value={EVENT_TABS.EVENT.toString()}>Evento</Tabs.Tab>
            <Tabs.Tab value={EVENT_TABS.MUSIC.toString()}>Musica</Tabs.Tab>
            <Tabs.Tab value={EVENT_TABS.TIMING.toString()}>Timing</Tabs.Tab>
            <Tabs.Tab value={EVENT_TABS.EQUIPMENT.toString()}>
              Equipamiento
            </Tabs.Tab>
            <Tabs.Tab value={EVENT_TABS.PAYMENT.toString()}>Presupuesto</Tabs.Tab>
            {canShowFilesTab() && (
              <Tabs.Tab value={EVENT_TABS.FILES.toString()}>Archivos</Tabs.Tab>
            )}
          </Tabs.List>
        </Tabs>
      </div>
      {getTabContent()}
    </div>
  );
};

export default withPageAuthRequired(NewEventPage);
