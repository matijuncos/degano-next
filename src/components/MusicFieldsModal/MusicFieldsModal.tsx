import { EventModel } from '@/context/types';
import useLoadingCursor from '@/hooks/useLoadingCursor';
import useNotification from '@/hooks/useNotification';
import { Modal, Button, Group, Text } from '@mantine/core';
import { useState, useRef } from 'react';
import MusicForm, { MusicFormRef } from '@/components/MusicForm/MusicForm';

interface MusicFieldsModalProps {
  opened: boolean;
  onClose: () => void;
  selectedEvent: EventModel | null;
  onSave: (updates: Partial<EventModel>) => Promise<void>;
}

const MusicFieldsModal = ({
  opened,
  onClose,
  selectedEvent,
  onSave
}: MusicFieldsModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = useRef<MusicFormRef>(null);
  const setLoadingCursor = useLoadingCursor();
  const notify = useNotification();

  const handleSubmit = async () => {
    if (!selectedEvent) {
      notify({
        type: 'error',
        message: 'No hay evento seleccionado'
      });
      return;
    }

    try {
      setIsSubmitting(true);
      setLoadingCursor(true);

      // Obtener datos actuales del formulario
      const formData = formRef.current?.getData();
      if (!formData) {
        notify({
          type: 'error',
          message: 'No se pudieron obtener los datos del formulario'
        });
        return;
      }

      const { musicData, spotifyLinks } = formData;

      // Extraer solo los campos de música
      const musicUpdates: Partial<EventModel> = {
        welcomeSongs: musicData.welcomeSongs,
        walkIn: musicData.walkIn,
        vals: musicData.vals,
        openingPartySongs: musicData.openingPartySongs,
        closingSongs: musicData.closingSongs,
        ceremoniaCivil: musicData.ceremoniaCivil,
        ceremoniaExtra: musicData.ceremoniaExtra,
        ambienceMusic: musicData.ambienceMusic,
        music: musicData.music,
        playlist: spotifyLinks
      };

      await onSave(musicUpdates);
      onClose();
    } catch (error) {
      console.error('Error saving music fields:', error);
      notify({
        type: 'defaultError',
        message: 'Error al guardar los campos de música'
      });
    } finally {
      setIsSubmitting(false);
      setLoadingCursor(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title='Agregar campos de música'
      size='xl'
      styles={{
        body: {
          maxHeight: '70vh',
          overflowY: 'auto'
        }
      }}
    >
      {!selectedEvent ? (
        <Text c='dimmed' ta='center' py='xl'>
          No hay evento seleccionado
        </Text>
      ) : (
        <>
          <Text size='sm' c='dimmed' mb='md'>
            Agrega o modifica los campos de música del evento. Los campos vacíos
            no se guardarán.
          </Text>

          <MusicForm
            ref={formRef}
            event={selectedEvent}
            onNextTab={() => {}}
            onBackTab={() => {}}
            hideNavigation
          />

          <Group justify='flex-end' mt='xl'>
            <Button variant='light' onClick={handleClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} loading={isSubmitting}>
              Guardar
            </Button>
          </Group>
        </>
      )}
    </Modal>
  );
};

export default MusicFieldsModal;
