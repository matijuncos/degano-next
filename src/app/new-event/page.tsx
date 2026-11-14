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
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { withPageAuthRequired, useUser } from '@auth0/nextjs-auth0/client';
import useLoadingCursor from '@/hooks/useLoadingCursor';
import useNotification from '@/hooks/useNotification';
import { INITIAL_EVENT_STATE } from './config';
import { isValidMapsUrl } from '@/utils/mapsUtils';
import { Tabs, Button, Text, Center, Alert, Group, CloseButton, Badge } from '@mantine/core';
import { IconDeviceFloppy } from '@tabler/icons-react';
import { nanoid } from 'nanoid';
import { mutate } from 'swr';
import { usePermissions } from '@/hooks/usePermissions';
import { useEventDraft } from '@/hooks/useEventDraft';
import { draftAgeLabel, hasDraftContent } from '@/utils/eventDraft';
import { useConfirm } from '@/components/ConfirmModal/useConfirm';
import EventKindChooser from '@/components/EventKindChooser/EventKindChooser';
import RentalBadge from '@/components/EventKindChooser/RentalBadge';
import { fileInFolder } from '@/utils/eventScope';
import {
  EventKind,
  canChangeKind,
  deleteOwnFiles,
  eventKindOf,
  hasRentalHiddenData,
  needsKindChoice,
  resolveTab,
  restoreTab,
  stripRentalFields,
  withKind
} from '@/utils/eventKind';

// El servidor no duplica eventos (reconoce el reintento), así que se puede
// volver a apretar Finalizar con seguridad.
const RETRY_SAFE_MSG =
  'No se pudo confirmar la creación del evento. Volvé a apretar Finalizar: si ya se había creado, no se va a duplicar.';

const NewEventPage = () => {
  const {
    formState,
    setFormState,
    validate,
    setValidate,
    setFolderName,
    addEventToList
  } = useDeganoCtx();
  const router = useRouter();
  // folderId único para los archivos del evento en S3, generado una sola vez
  // al iniciar el formulario. Se persiste con el evento al crearlo.
  const [event, setEvent] = useState<EventModel>(() => ({
    ...INITIAL_EVENT_STATE,
    folderId: `evt-${nanoid()}`
  }));
  const setLoadingCursor = useLoadingCursor();
  const notify = useNotification();
  const { can, isLoading } = usePermissions();

  // Ref para mantener los datos del formulario actual sin causar re-renders
  const currentFormDataRef = useRef<EventModel>(event);

  // ── Borrador: si se vuelve atrás / se cierra la pestaña por error, no se
  // pierde lo cargado. Se guarda TODO en el navegador (por usuario) con refs,
  // sin re-renders. Ver hooks/useEventDraft.
  const { user } = useUser();
  const draft = useEventDraft(user?.sub);
  const [confirm, confirmModal] = useConfirm();
  const [draftReady, setDraftReady] = useState(false); // ya se intentó recuperar
  const [restoredAt, setRestoredAt] = useState<number | null>(null);
  const [formKey, setFormKey] = useState(0); // remonta los formularios al empezar de cero
  // Tipo: Evento o Alquiler. Se elige primero (pantalla de elección) y se puede
  // cambiar mientras se crea; una vez creado queda fijo. Ver utils/eventKind.
  const [kind, setKind] = useState<EventKind>('evento');
  const [kindPicker, setKindPicker] = useState<'first' | 'change' | null>(null);
  const formStateRef = useRef(formState);
  formStateRef.current = formState;
  // Solo se guarda cuando hay algo cargado: un formulario recién abierto (igual
  // al estado inicial) no genera borrador. Una vez que hubo un cambio, no se
  // vuelve a comparar (barato).
  const pristineRef = useRef<EventModel>(event);
  const dirtyRef = useRef(false);
  const saveDraft = useCallback(
    (data: EventModel, tab: number) => {
      if (!dirtyRef.current) {
        if (!hasDraftContent(data, pristineRef.current)) return;
        dirtyRef.current = true;
      }
      draft.schedule(data, tab);
    },
    [draft.schedule]
  );

  const updateEvent = useCallback((data: EventModel) => {
    setEvent(data);
  }, []);

  // Callback para que los formularios actualicen la ref (sin causar re-render)
  const onFormDataChange = useCallback(
    (data: EventModel) => {
      currentFormDataRef.current = data;
      saveDraft(data, formStateRef.current);
    },
    [saveDraft]
  );

  // Al entrar: recuperar el borrador vigente (y la tab donde estaban)
  useEffect(() => {
    if (!user?.sub || draftReady) return;
    const saved = draft.load();
    if (saved) {
      setEvent(saved.event);
      currentFormDataRef.current = saved.event;
      // Borrador viejo sin tipo = evento
      const savedKind = eventKindOf(saved.event);
      setKind(savedKind);
      const restorable = saved.tab >= EVENT_TABS.CLIENT && saved.tab <= EVENT_TABS.PAYMENT;
      setFormState(restoreTab(restorable ? saved.tab : EVENT_TABS.CLIENT, savedKind));
      setRestoredAt(saved.savedAt);
      dirtyRef.current = true;
    } else {
      setFormState(EVENT_TABS.CLIENT);
    }
    if (needsKindChoice(saved)) setKindPicker('first');
    setDraftReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.sub]);

  // Cambio de tab: guardar también en qué tab están
  useEffect(() => {
    if (draftReady) saveDraft(currentFormDataRef.current, formState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formState, draftReady]);

  const startOver = async () => {
    const ok = await confirm({
      title: '¿Empezar de cero?',
      message: 'Se borra todo lo cargado en este evento nuevo. No se puede deshacer.',
      confirmLabel: 'Empezar de cero'
    });
    if (!ok) return;
    draft.clear();
    const fresh: EventModel = { ...INITIAL_EVENT_STATE, folderId: `evt-${nanoid()}` };
    currentFormDataRef.current = fresh;
    pristineRef.current = fresh;
    dirtyRef.current = false;
    setEvent(fresh);
    setFormState(EVENT_TABS.CLIENT);
    setValidate(false);
    setRestoredAt(null);
    setKind('evento');
    setKindPicker('first');
    setFormKey((k) => k + 1);
  };

  const handleTabChange = (value: string | null) => {
    if (value !== null) {
      // Guardar datos del formulario actual antes de cambiar de tab
      if (currentFormDataRef.current) {
        setEvent(currentFormDataRef.current);
      }
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
    // Opcional, pero si se cargó tiene que ser un link de Google Maps
    // (se puede llegar acá salteando el "Siguiente" de la tab Evento)
    if (!isValidMapsUrl(event.venueMapsUrl)) {
      errors.push('Link de Google Maps inválido en tab Evento (es opcional: corregilo o borralo)');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  };

  // Los formularios piden una pestaña fija (ej. Evento → Show): en un alquiler se
  // salta a la siguiente que exista
  const onNextTab = (tab: number, data: EventModel) => {
    setFormState(resolveTab(tab, formStateRef.current, kind));
    setEvent(data);
    setValidate(false); // Resetear validación al cambiar de pestaña
  };
  const onBackTab = (tab: number, data: EventModel) => {
    setFormState(resolveTab(tab, formStateRef.current, kind));
    setEvent(data);
    setValidate(false); // Resetear validación al cambiar de pestaña
  };

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

  // Elegir / cambiar el tipo. Pasar a Alquiler con algo cargado en Show, Música,
  // Timing o Archivos: se avisa (no se va a guardar) y los archivos ya subidos
  // (carpeta propia del formulario) se borran para no dejarlos huérfanos.
  const chooseKind = async (next: EventKind) => {
    const data = currentFormDataRef.current;
    // Una vez creado, el tipo queda fijo (y sus archivos ya son del evento)
    if (!canChangeKind(event) || !canChangeKind(data)) return;
    let base: EventModel = data;
    if (next === 'alquiler' && kind !== 'alquiler') {
      const hidden = hasRentalHiddenData(data as any);
      if (hidden.any) {
        const ownCount = hidden.files.filter((f) => fileInFolder(f.url, data.folderId)).length;
        const ok = await confirm({
          title: '¿Pasar a alquiler?',
          message:
            'Lo cargado en Show, Música, Timing, Archivos y los horarios de iglesia / civil no se va a guardar en un alquiler.' +
            (ownCount ? ` Los ${ownCount} archivos subidos se borran.` : ''),
          confirmLabel: 'Pasar a alquiler'
        });
        if (!ok) return;
        const { deleted, failed } = await deleteOwnFiles(hidden.files, data.folderId, (url) =>
          fetch('/api/deleteFromS3', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, bucket: 'events' })
          })
        );
        const remaining = (data.files || []).filter((f: any) => !deleted.includes(f.url));
        if (failed.length) {
          // No se cambia el tipo: quedan los archivos que no se pudieron borrar
          const kept: EventModel = { ...data, files: remaining };
          currentFormDataRef.current = kept;
          setEvent(kept);
          onFormDataChange(kept);
          notify({
            type: 'defaultError',
            message: `No se pudieron borrar ${failed.length} archivos. Probá de nuevo o borralos desde Archivos.`
          });
          return;
        }
        base = { ...data, files: remaining };
      }
    }
    const updated: EventModel = withKind(base, next);
    // Elegir el tipo solo no es "algo cargado": no genera borrador
    if (kindPicker === 'first' && !dirtyRef.current) pristineRef.current = updated;
    currentFormDataRef.current = updated;
    setEvent(updated);
    setKind(next);
    setFormState(restoreTab(kindPicker === 'first' ? EVENT_TABS.CLIENT : formStateRef.current, next));
    setKindPicker(null);
    setFormKey((k) => k + 1); // los formularios arrancan con el tipo nuevo
    onFormDataChange(updated);
  };

  const saveEvent = async (formEvent: EventModel) => {
    // El tipo lo fija esta página; un alquiler no manda Show/Música/Timing/Archivos
    const newEvent: EventModel =
      kind === 'alquiler'
        ? { ...stripRentalFields(formEvent), eventKind: 'alquiler' }
        : { ...formEvent, eventKind: 'evento' };
    setLoadingCursor(true);
    notify({ loading: true });
    try {
      // Si la request se corta (timeout / error del servidor / red) el evento
      // pudo haber quedado creado: se reintenta UNA vez. Es seguro: el servidor
      // reconoce el reintento por el folderId y devuelve el mismo evento (no
      // duplica) completando lo que haya quedado a medias.
      const post = () =>
        fetch('/api/postEvent', {
          method: 'POST',
          cache: 'no-store',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newEvent)
        });
      let response: Response | null = null;
      try {
        response = await post();
      } catch {
        response = null; // error de red
      }
      if (!response || response.status >= 500) {
        await new Promise((r) => setTimeout(r, 1500));
        response = await post().catch(() => null);
      }
      if (!response) {
        throw new Error(RETRY_SAFE_MSG);
      }

      const data = await response.json().catch(() => ({}));

      // Si el server no confirma la creación, es un error real (y se muestra
      // su motivo, ej. un equipo que ya está reservado en esas fechas)
      if (!response.ok) {
        throw new Error(
          response.status >= 500 ? RETRY_SAFE_MSG : data?.error || `postEvent respondió con status ${response.status}`
        );
      }

      if (!data?.event) {
        throw new Error('postEvent no devolvió el evento creado');
      }

      // A partir de acá el evento YA está creado en el server.
      // El resto son operaciones de cliente: si alguna falla NO debe
      // mostrarse un falso error, porque el evento sí se guardó.
      setFolderName(
        `${new Date(newEvent.date).toLocaleDateString('es-ES', {
          day: '2-digit',
          month: '2-digit',
          year: '2-digit'
        })} - ${newEvent.type} - ${newEvent.lugar}`
      );
      // Creado: el borrador ya no hace falta
      draft.finish();
      setRestoredAt(null);
      addEventToList(data.event);
      setEvent(data.event);

      // Alquiler: no tiene Archivos → a la página del alquiler.
      // Evento: si la tab de archivos está disponible, ir a ella; si no, a upload-file
      if (kind === 'alquiler') {
        notify({ message: 'Alquiler guardado correctamente.' });
        router.push(`/event/${data.event._id}`);
      } else if (canShowFilesTab()) {
        notify({
          message:
          'Evento guardado correctamente. Ahora puedes subir archivos.'
        });
        setFormState(EVENT_TABS.FILES);
      } else {
        notify();
        router.push('/upload-file');
      }

      // Invalidar caché SWR. Fire-and-forget: una revalidación fallida
      // no debe afectar el éxito (el evento ya está creado en el server).
      // - getEvents: revalida la lista que alimenta calendario y listado,
      //   para que el evento nuevo aparezca sin necesidad de recargar.
      // - el resto: cachés de equipamiento (cambian los scheduledUses).
      Promise.all([
        mutate('/api/getEvents'),
        mutate('/api/equipment'),
        mutate('/api/categories'),
        mutate('/api/categoryTreeData'),
        mutate('/api/treeData'),
        mutate('/api/equipmentLocation')
      ]).catch((err) => {
        console.error('failed to revalidate SWR cache ', err);
      });
    } catch (err) {
      notify({ type: 'defaultError', message: (err as any)?.message?.startsWith('postEvent') ? undefined : (err as any)?.message });
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
            onFormDataChange={onFormDataChange}
          />
        );
      case EVENT_TABS.EVENT:
        return (
          <EventForm
            isRental={kind === 'alquiler'}
            onNextTab={onNextTab}
            onBackTab={onBackTab}
            event={event}
            validate={validate}
            setValidate={setValidate}
            updateEvent={updateEvent}
            onFormDataChange={onFormDataChange}
          />
        );
      case EVENT_TABS.SHOW:
        return (
          <ShowForm
            onNextTab={onNextTab}
            onBackTab={onBackTab}
            event={event}
            updateEvent={updateEvent}
            onFormDataChange={onFormDataChange}
          />
        );
      case EVENT_TABS.MUSIC:
        return (
          <MusicForm
            onNextTab={onNextTab}
            onBackTab={onBackTab}
            event={event}
            updateEvent={updateEvent}
            onFormDataChange={onFormDataChange}
          />
        );
      case EVENT_TABS.TIMING:
        return (
          <TimingForm
            onNextTab={onNextTab}
            onBackTab={onBackTab}
            event={event}
            updateEvent={updateEvent}
            onFormDataChange={onFormDataChange}
          />
        );
      case EVENT_TABS.MORE_INFO:
        return (
          <MoreInfoForm
            onNextTab={onNextTab}
            onBackTab={onBackTab}
            event={event}
            updateEvent={updateEvent}
            onFormDataChange={onFormDataChange}
          />
        );
      case EVENT_TABS.EQUIPMENT:
        return (
          <EquipmentForm
            onNextTab={onNextTab}
            onBackTab={onBackTab}
            event={event}
            updateEvent={updateEvent}
            onFormDataChange={onFormDataChange}
          />
        );
      case EVENT_TABS.STAFF:
        return (
          <StaffForm
            onNextTab={onNextTab}
            onBackTab={onBackTab}
            event={event}
            updateEvent={updateEvent}
            onFormDataChange={onFormDataChange}
            goToFiles={kind === 'evento' && canShowFilesTab()}
          />
        );
      case EVENT_TABS.FILES:
        return (
          <div>
            <h3>Archivos del evento</h3>
            {/* Los archivos son SIEMPRE de este evento (nunca del "seleccionado"
                de la app, que puede ser otro). Antes de finalizar se suben a su
                carpeta y quedan en el formulario (y en el borrador). */}
            <FilesHandlerComponent
              event={event}
              onEventUpdated={(ev) => {
                setEvent(ev);
                onFormDataChange(ev);
              }}
            />
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
            onFormDataChange={onFormDataChange}
            validateAllRequiredFields={validateAllRequiredFields}
          />
        );
      default:
        break;
    }
  };

  // Verificar permisos (y esperar a recuperar el borrador antes de montar los
  // formularios, para que arranquen ya con lo guardado)
  if (isLoading || (can('canCreateEvents') && !draftReady)) {
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

  // Primer paso (o "Cambiar" mientras se crea): Evento o Alquiler
  if (kindPicker) {
    return (
      <div>
        {confirmModal}
        <EventKindChooser onChoose={chooseKind} current={kindPicker === 'change' ? kind : undefined} />
        {kindPicker === 'change' && (
          <Center>
            <Button variant='default' onClick={() => setKindPicker(null)}>Volver sin cambiar</Button>
          </Center>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Tipo elegido (se puede cambiar hasta crearlo) */}
      <Group gap='xs' mb='sm'>
        {kind === 'alquiler' ? <RentalBadge size='lg' /> : <Badge size='lg' variant='light' color='green' tt='none'>Evento</Badge>}
        {/* Una vez creado, el tipo queda fijo */}
        {canChangeKind(event) && (
        <Button
          size='compact-sm'
          variant='subtle'
          onClick={() => {
            // Lo que el formulario actual tiene sin pasar al estado
            setEvent(currentFormDataRef.current);
            setKindPicker('change');
          }}
        >
          Cambiar
        </Button>
        )}
      </Group>
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
            {/* Un alquiler no tiene Show, Música, Timing ni Archivos */}
            {kind === 'evento' && (
              <>
                <Tabs.Tab value={EVENT_TABS.SHOW.toString()}>Show</Tabs.Tab>
                <Tabs.Tab value={EVENT_TABS.MUSIC.toString()}>Musica</Tabs.Tab>
                <Tabs.Tab value={EVENT_TABS.TIMING.toString()}>Timing</Tabs.Tab>
              </>
            )}
            <Tabs.Tab value={EVENT_TABS.MORE_INFO.toString()}>
              Más Información
            </Tabs.Tab>
            <Tabs.Tab value={EVENT_TABS.EQUIPMENT.toString()}>
              Equipamiento
            </Tabs.Tab>
            <Tabs.Tab value={EVENT_TABS.STAFF.toString()}>Staff</Tabs.Tab>
            {kind === 'evento' && canShowFilesTab() && (
              <Tabs.Tab value={EVENT_TABS.FILES.toString()}>Archivos</Tabs.Tab>
            )}
            <Tabs.Tab value={EVENT_TABS.PAYMENT.toString()}>
              Presupuesto
            </Tabs.Tab>
          </Tabs.List>
        </Tabs>
      </div>
      {confirmModal}
      {restoredAt && (
        <Alert
          color='blue'
          variant='light'
          icon={<IconDeviceFloppy size={18} />}
          mb='md'
          styles={{ body: { justifyContent: 'center' } }}
        >
          {/* El cerrar va en la misma fila que el botón (el withCloseButton de
              Mantine queda fijo arriba y se desfasa) */}
          <Group justify='space-between' align='center' gap='xs' wrap='nowrap'>
            <Text size='sm'>
              Se recuperó lo que estabas cargando ({draftAgeLabel(restoredAt, Date.now())}).
            </Text>
            <Group gap={6} align='center' wrap='nowrap'>
              <Button size='xs' variant='light' color='red' onClick={startOver}>
                Empezar de cero
              </Button>
              <CloseButton
                size='sm'
                aria-label='Cerrar aviso'
                onClick={() => setRestoredAt(null)}
              />
            </Group>
          </Group>
        </Alert>
      )}
      <div key={formKey}>{getTabContent()}</div>
    </div>
  );
};

export default withPageAuthRequired(NewEventPage);
