'use client';

import ClientForm from '@/components/ClientForm/ClientForm';
import EquipmentForm from '@/components/EquipmentForm/EquipmentForm';
import EventForm from '@/components/EventForm/EventForm';
import ShowForm from '@/components/ShowForm/ShowForm';
import MusicForm from '@/components/MusicForm/MusicForm';
import PaymentForm from '@/components/PaymentForm/PaymentForm';
import TimingForm from '@/components/TimingForm/TimingForm';
import MoreInfoForm from '@/components/MoreInfoForm/MoreInfoForm';
import StaffForm from '@/components/StaffForm/StaffForm';
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
import { Tabs, Button, Text, Center } from '@mantine/core';
import { mutate } from 'swr';
import { usePermissions } from '@/hooks/usePermissions';

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
  const { can, isLoading } = usePermissions();

  const updateEvent = (data: EventModel) => {
    setEvent(data);
  };

  const handleTabChange = (value: string | null) => {
    if (value !== null) {
      setFormState(Number(value));
      setValidate(false);
    }
  };

  // Validar todos los campos requeridos del evento
  const validateAllRequiredFields = () => {
    const errors: string[] = [];

    // Validar campos de cliente
    if (!event.fullName || !event.fullName.trim()) {
      errors.push('Nombre del cliente');
    }
    if (!event.phoneNumber || !event.phoneNumber.trim()) {
      errors.push('Teléfono del cliente');
    }
    if (!event.rol || !event.rol.trim()) {
      errors.push('Rol del cliente');
    }

    // Validar campos de evento
    if (
      !event.date ||
      !(event.date instanceof Date) ||
      isNaN(event.date.getTime())
    ) {
      errors.push('Fecha de inicio');
    }
    if (
      !event.endDate ||
      !(event.endDate instanceof Date) ||
      isNaN(event.endDate.getTime())
    ) {
      errors.push('Fecha de finalización');
    }
    if (!event.type || !event.type.trim()) {
      errors.push('Tipo de evento');
    }
    if (!event.eventCity || !event.eventCity.trim()) {
      errors.push('Localidad');
    }
    if (!event.lugar || !event.lugar.trim()) {
      errors.push('Lugar');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  };

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

        // Invalidar TODO el cache de SWR relacionado con equipment
        await Promise.all([
          mutate('/api/equipment'),
          mutate('/api/categories'),
          mutate('/api/categoryTreeData'),
          mutate('/api/treeData'),
          mutate('/api/equipmentLocation')
        ]);

        // Si la tab de archivos está disponible, ir a ella; si no, redirigir a upload-file
        if (canShowFilesTab()) {
          notify({
            message:
            'Evento guardado correctamente. Ahora puedes subir archivos.'
          });
          setFormState(EVENT_TABS.FILES);
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
            updateEvent={updateEvent}
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
            updateEvent={updateEvent}
          />
        );
      case EVENT_TABS.SHOW:
        return (
          <ShowForm
            onNextTab={onNextTab}
            onBackTab={onBackTab}
            event={event}
            updateEvent={updateEvent}
          />
        );
      case EVENT_TABS.MUSIC:
        return (
          <MusicForm
            onNextTab={onNextTab}
            onBackTab={onBackTab}
            event={event}
            updateEvent={updateEvent}
          />
        );
      case EVENT_TABS.TIMING:
        return (
          <TimingForm
            onNextTab={onNextTab}
            onBackTab={onBackTab}
            event={event}
            updateEvent={updateEvent}
          />
        );
      case EVENT_TABS.MORE_INFO:
        return (
          <MoreInfoForm
            onNextTab={onNextTab}
            onBackTab={onBackTab}
            event={event}
            updateEvent={updateEvent}
          />
        );
      case EVENT_TABS.EQUIPMENT:
        return (
          <EquipmentForm
            onNextTab={onNextTab}
            onBackTab={onBackTab}
            event={event}
            updateEvent={updateEvent}
          />
        );
      case EVENT_TABS.STAFF:
        return (
          <StaffForm
            onNextTab={onNextTab}
            onBackTab={onBackTab}
            event={event}
            updateEvent={updateEvent}
                        goToFiles={canShowFilesTab()}
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
              <Button onClick={() => onBackTab(EVENT_TABS.STAFF, event)}>
                Atrás
              </Button>
              <Button
                variant='brand'
                onClick={() => onNextTab(EVENT_TABS.PAYMENT, event)}
              >
                Siguiente
              </Button>
            </div>
          </div>
        );
      case EVENT_TABS.PAYMENT:
        return (
          <PaymentForm
            onBackTab={onBackTab}
            event={event}
            onFinish={saveEvent}
            updateEvent={updateEvent}
            validateAllRequiredFields={validateAllRequiredFields}
          />
        );
      default:
        break;
    }
  };

  // Verificar permisos
  if (isLoading) {
    return <Center h="100vh"><Text>Cargando...</Text></Center>;
  }

  if (!can('canCreateEvents')) {
    return (
      <Center h="100vh">
        <div style={{ textAlign: 'center' }}>
          <Text size="xl" fw={700} mb="md">No tienes acceso</Text>
          <Text mb="xl">No tienes permisos para crear eventos</Text>
          <Button onClick={() => router.push('/home')}>Volver al inicio</Button>
        </div>
      </Center>
    );
  }

  return (
    <div>
      {/*  TABS TO NAVIGATE BETWEEN SECTIONS */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <Tabs
          value={formState.toString()}
          onChange={handleTabChange}
          style={{ marginBottom: '2rem' }}
        >
          <Tabs.List>
            <Tabs.Tab value={EVENT_TABS.CLIENT.toString()}>Cliente</Tabs.Tab>
            <Tabs.Tab value={EVENT_TABS.EVENT.toString()}>Evento</Tabs.Tab>
            <Tabs.Tab value={EVENT_TABS.SHOW.toString()}>Show</Tabs.Tab>
            <Tabs.Tab value={EVENT_TABS.MUSIC.toString()}>Musica</Tabs.Tab>
            <Tabs.Tab value={EVENT_TABS.TIMING.toString()}>Timing</Tabs.Tab>
            <Tabs.Tab value={EVENT_TABS.MORE_INFO.toString()}>
              Más Información
            </Tabs.Tab>
            <Tabs.Tab value={EVENT_TABS.EQUIPMENT.toString()}>
              Equipamiento
            </Tabs.Tab>
            <Tabs.Tab value={EVENT_TABS.STAFF.toString()}>Staff</Tabs.Tab>
            {canShowFilesTab() && (
              <Tabs.Tab value={EVENT_TABS.FILES.toString()}>Archivos</Tabs.Tab>
            )}
            <Tabs.Tab value={EVENT_TABS.PAYMENT.toString()}>
              Presupuesto
            </Tabs.Tab>
          </Tabs.List>
        </Tabs>
      </div>
      {getTabContent()}
    </div>
  );
};

export default withPageAuthRequired(NewEventPage);
