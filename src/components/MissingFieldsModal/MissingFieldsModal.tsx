import { EventModel } from '@/context/types';
import useLoadingCursor from '@/hooks/useLoadingCursor';
import useNotification from '@/hooks/useNotification';
import {
  Modal,
  Stack,
  Text,
  Input,
  Button,
  Group,
  Divider
} from '@mantine/core';
import { TimePicker } from '@mantine/dates';
import { useState } from 'react';
import {
  detectMissingFields,
  groupFieldsBySection,
  SECTION_LABELS,
  FieldConfig
} from '@/utils/fieldUtils';

interface MissingFieldsModalProps {
  opened: boolean;
  onClose: () => void;
  selectedEvent: EventModel | null;
  onSave: (updates: Partial<EventModel>) => Promise<void>;
}

const MissingFieldsModal = ({
  opened,
  onClose,
  selectedEvent,
  onSave
}: MissingFieldsModalProps) => {
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const setLoadingCursor = useLoadingCursor();
  const notify = useNotification();

  // Detectar campos faltantes
  const missingFields = detectMissingFields(selectedEvent);
  const groupedFields = groupFieldsBySection(missingFields);

  const handleInputChange = (key: string, value: string) => {
    setFormValues((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSubmit = async () => {
    // Verificar si hay al menos un campo con valor
    const hasValues = Object.values(formValues).some(
      (value) => value && value.trim() !== ''
    );

    if (!hasValues) {
      notify({
        type: 'error',
        message: 'Por favor completa al menos un campo'
      });
      return;
    }

    try {
      setIsSubmitting(true);
      setLoadingCursor(true);

      // Filtrar solo los campos que tienen valor
      const updates = Object.entries(formValues).reduce(
        (acc, [key, value]) => {
          if (value && value.trim() !== '') {
            acc[key as keyof EventModel] = value as any;
          }
          return acc;
        },
        {} as Partial<EventModel>
      );

      await onSave(updates);

      // Limpiar formulario y cerrar modal
      setFormValues({});
      onClose();
    } catch (error) {
      console.error('Error saving missing fields:', error);
      // El error ya es manejado por updateEventData
    } finally {
      setIsSubmitting(false);
      setLoadingCursor(false);
    }
  };

  const handleClose = () => {
    setFormValues({});
    onClose();
  };

  const renderField = (field: FieldConfig) => {
    const value = formValues[field.key] || '';

    if (field.type === 'time') {
      return (
        <div key={field.key}>
          <Text size='sm' fw={500} mb={4}>
            {field.label}
          </Text>
          <TimePicker
            value={value}
            onChange={(val) => handleInputChange(field.key, val || '')}
          />
        </div>
      );
    }

    return (
      <Input.Wrapper key={field.key} label={field.label}>
        <Input
          value={value}
          onChange={(e) => handleInputChange(field.key, e.target.value)}
          placeholder={field.placeholder}
        />
      </Input.Wrapper>
    );
  };

  const sections: Array<FieldConfig['section']> = [
    'event',
    'location',
    'schedule',
    'client'
  ];

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title='Agregar campos faltantes'
      size='lg'
    >
      {missingFields.length === 0 ? (
        <Text c='dimmed' ta='center' py='xl'>
          ¡Todos los campos opcionales están completos!
        </Text>
      ) : (
        <>
          <Text size='sm' c='dimmed' mb='md'>
            Completa los campos que desees agregar al evento. No es necesario
            completar todos.
          </Text>

          <Stack gap='md'>
            {sections.map((section) => {
              const fields = groupedFields[section];
              if (!fields || fields.length === 0) return null;

              return (
                <div key={section}>
                  <Text size='md' fw={700} mb='sm'>
                    {SECTION_LABELS[section]}
                  </Text>
                  <Stack gap='sm'>
                    {fields.map((field) => renderField(field))}
                  </Stack>
                  <Divider my='md' />
                </div>
              );
            })}
          </Stack>

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

export default MissingFieldsModal;
