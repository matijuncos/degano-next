'use client';
import {
  Modal,
  TextInput,
  Textarea,
  Select,
  Button,
  Group,
  Stack,
  Switch,
  Text,
  ColorSwatch,
  Divider,
  ActionIcon
} from '@mantine/core';
import { DateTimePicker, DatePickerInput } from '@mantine/dates';
import { useState, useEffect, useMemo } from 'react';
import useSWR from 'swr';
import { IconTrash } from '@tabler/icons-react';
import { AppCalendar } from '@/types/calendars';
import 'dayjs/locale/es';

export interface CalendarEventData {
  _id?: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  calendarId: string;
  description: string;
  source?: string;
  calendarColor?: string;
  // Staff + rol: solo en calendarios que cuentan para Cobros de STAFF
  staff?: CalendarEventStaff[];
}

export interface CalendarEventStaff {
  employeeId: string;
  employeeName: string;
  rol: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface CalendarEventModalProps {
  opened: boolean;
  onClose: () => void;
  initialData?: Partial<CalendarEventData>;
  calendars: AppCalendar[];
  onSave: (
    data: Omit<CalendarEventData, '_id' | 'source' | 'calendarColor'>,
    id?: string
  ) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  isLightTheme: boolean;
  readOnly?: boolean; // no-admin: solo ve el detalle del evento
}

export default function CalendarEventModal({
  opened,
  onClose,
  initialData,
  calendars,
  onSave,
  onDelete,
  isLightTheme,
  readOnly = false
}: CalendarEventModalProps) {
  const isEditing = !!initialData?._id;

  const defaultCalendarId = calendars[0]?._id || '';

  const [title, setTitle] = useState('');
  const [start, setStart] = useState<Date | null>(null);
  const [end, setEnd] = useState<Date | null>(null);
  const [allDay, setAllDay] = useState(false);
  const [calendarId, setCalendarId] = useState(defaultCalendarId);
  const [description, setDescription] = useState('');
  const [staff, setStaff] = useState<CalendarEventStaff[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Inicializar / resetear al abrir
  useEffect(() => {
    if (opened) {
      const baseStart = initialData?.start
        ? new Date(initialData.start)
        : new Date();
      setTitle(initialData?.title || '');
      setStart(baseStart);
      // Al editar se respeta el fin guardado; al crear, el fin sugerido es
      // el mismo día que el inicio + 1 hora (no el día siguiente).
      setEnd(
        isEditing && initialData?.end
          ? new Date(initialData.end)
          : new Date(baseStart.getTime() + 60 * 60 * 1000)
      );
      setAllDay(initialData?.allDay || false);
      setCalendarId(initialData?.calendarId || defaultCalendarId);
      setDescription(initialData?.description || '');
      setStaff(initialData?.staff || []);
    }
  }, [opened, initialData, defaultCalendarId, isEditing]);

  // Al cambiar el inicio, el fin se auto-ajusta a inicio + 1 hora (mismo día).
  // Sigue siendo editable: el usuario puede modificar el fin después.
  const handleStartChange = (val: any) => {
    const newStart = val ? new Date(val) : null;
    setStart(newStart);
    if (newStart) {
      setEnd(new Date(newStart.getTime() + 60 * 60 * 1000));
    }
  };

  const canSave = !!title.trim() && !!start && !!calendarId;

  const handleSave = async () => {
    if (readOnly || !canSave || !start) return;
    setSaving(true);
    try {
      await onSave(
        {
          title: title.trim(),
          start,
          end: end || start,
          allDay,
          calendarId,
          description,
          // Calendario que no cuenta para cobros → sin staff
          staff: staffPayable ? staff : []
        },
        initialData?._id
      );
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!initialData?._id || !onDelete) return;
    setDeleting(true);
    try {
      await onDelete(initialData._id);
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  const inputStyles = {
    input: {
      backgroundColor: isLightTheme ? '#fff' : '#1a1b1e',
      color: isLightTheme ? '#1a1b1e' : '#c1c2c5',
      borderColor: isLightTheme ? '#dee2e6' : '#373a40'
    },
    label: { color: isLightTheme ? '#1a1b1e' : '#c1c2c5' },
    dropdown: {
      backgroundColor: isLightTheme ? '#ffffff' : '#25262b',
      borderColor: isLightTheme ? '#dee2e6' : '#373a40'
    },
    option: { color: isLightTheme ? '#000000' : '#ffffff' }
  };

  // Opciones del select con color swatch
  const calendarOptions = calendars.map((cal) => ({
    value: cal._id,
    label: cal.name
  }));

  const selectedCalendar = calendars.find((c) => c._id === calendarId);
  const staffPayable = !!selectedCalendar?.staffPayable;

  // Empleados de STAFF para el selector (misma key que la barra lateral: SWR
  // la reutiliza, no hay request extra). Solo admin edita.
  const { data: employeesData } = useSWR<any[]>(
    staffPayable && !readOnly ? '/api/employees?directory=true' : null,
    fetcher
  );
  const staffOptions = useMemo(
    () =>
      (Array.isArray(employeesData) ? employeesData : [])
        .filter((emp) => emp.isStaff !== false && !staff.some((m) => m.employeeId === String(emp._id)))
        .map((emp) => ({ value: String(emp._id), label: emp.fullName }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [employeesData, staff]
  );

  const addStaff = (employeeId: string | null) => {
    const emp = (employeesData || []).find((e: any) => String(e._id) === employeeId);
    if (!emp) return;
    setStaff((prev) => [...prev, { employeeId: String(emp._id), employeeName: emp.fullName, rol: emp.rol || '' }]);
  };
  const setStaffRol = (index: number, rol: string) =>
    setStaff((prev) => prev.map((m, i) => (i === index ? { ...m, rol } : m)));
  const removeStaff = (index: number) => setStaff((prev) => prev.filter((_, i) => i !== index));
  const textColor = isLightTheme ? '#1a1b1e' : '#c1c2c5';

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <TextInput
          placeholder='Agregar título del evento...'
          value={title}
          onChange={(e) => setTitle(e.currentTarget.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          readOnly={readOnly}
          variant='unstyled'
          size='sm'
          styles={{
            input: {
              color: isLightTheme ? '#1a1b1e' : '#c1c2c5',
              fontWeight: 600,
              fontSize: '1rem',
              padding: '0 0 4px 0',
              marginBottom: '8px',
              borderBottom: `1px solid ${isLightTheme ? '#dee2e6' : '#373a40'}`,
              borderRadius: 0,
              height: 'auto',
              minHeight: 'unset',
              lineHeight: 1.3,
              '&::placeholder': {
                color: isLightTheme ? '#adb5bd' : '#5c5f66'
              }
            }
          }}
          style={{ flex: 1 }}
        />
      }
      centered
      size='md'
      styles={{
        content: { backgroundColor: isLightTheme ? '#fff' : '#25262b' },
        header: {
          backgroundColor: isLightTheme ? '#fff' : '#25262b',
          paddingBottom: 0
        },
        title: { flex: 1 }
      }}
    >
      {/* fieldset disabled: deja todos los campos en solo lectura para no-admin */}
      <fieldset
        disabled={readOnly}
        style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
      >
        <Stack gap='md'>
          <Switch
            label='Todo el día'
            checked={allDay}
            onChange={(e) => setAllDay(e.currentTarget.checked)}
            color='blue'
          />

          {allDay ? (
            <Group grow>
              <DatePickerInput
                label='Fecha inicio'
                value={start}
                onChange={handleStartChange}
                locale='es'
                styles={inputStyles}
              />
              <DatePickerInput
                label='Fecha fin'
                value={end}
                onChange={(val: any) => setEnd(val ? new Date(val) : null)}
                locale='es'
                minDate={start || undefined}
                styles={inputStyles}
              />
            </Group>
          ) : (
            <Group grow>
              <DateTimePicker
                label='Inicio'
                value={start}
                onChange={handleStartChange}
                locale='es'
                styles={inputStyles}
              />
              <DateTimePicker
                label='Fin'
                value={end}
                onChange={(val: any) => setEnd(val ? new Date(val) : null)}
                locale='es'
                minDate={start || undefined}
                styles={inputStyles}
              />
            </Group>
          )}

          {/* Selector de calendario con swatch de color */}
          <Stack gap='4px'>
            <Text
              size='sm'
              fw={500}
              style={{ color: isLightTheme ? '#1a1b1e' : '#c1c2c5' }}
            >
              Calendario
            </Text>
            <Group gap='xs' align='center'>
              {selectedCalendar && (
                <ColorSwatch color={selectedCalendar.color} size={14} />
              )}
              <Select
                data={calendarOptions}
                value={calendarId}
                onChange={(val) => val && setCalendarId(val)}
                style={{ flex: 1 }}
                styles={inputStyles}
                comboboxProps={{ withinPortal: true }}
              />
            </Group>
          </Stack>

          {/* Staff + rol: entra en Cobros de STAFF */}
          {staffPayable && (
            <Stack gap='xs'>
              <Divider label='Staff (cuenta para Cobros)' labelPosition='left' color={isLightTheme ? '#dee2e6' : '#373a40'} styles={{ label: { color: textColor } }} />
              {!readOnly && (
                <Select
                  placeholder={employeesData ? 'Agregar persona del staff' : 'Cargando staff...'}
                  data={staffOptions}
                  value={null}
                  onChange={addStaff}
                  searchable
                  disabled={!employeesData}
                  nothingFoundMessage='Sin resultados'
                  styles={inputStyles}
                  classNames={{ dropdown: isLightTheme ? 'calendar-light-dropdown' : undefined }}
                  comboboxProps={{ withinPortal: true }}
                />
              )}
              {staff.length === 0 && (
                <Text size='xs' style={{ color: isLightTheme ? '#868e96' : '#909296' }}>
                  Sin staff asignado
                </Text>
              )}
              {staff.map((m, index) => (
                <Group key={m.employeeId} gap='xs' wrap='nowrap'>
                  <Text size='sm' style={{ color: textColor, flex: 1, minWidth: 0 }} truncate>
                    {m.employeeName}
                  </Text>
                  {readOnly ? (
                    <Text size='sm' style={{ color: isLightTheme ? '#868e96' : '#909296' }}>
                      {m.rol || 'Sin rol'}
                    </Text>
                  ) : (
                    <>
                      <TextInput
                        placeholder='Rol (ej: DJ, Sonido)'
                        value={m.rol}
                        onChange={(e) => setStaffRol(index, e.currentTarget.value)}
                        size='xs'
                        w={170}
                        styles={inputStyles}
                      />
                      <ActionIcon
                        color='red'
                        variant='subtle'
                        aria-label='Quitar'
                        onClick={() => removeStaff(index)}
                      >
                        <IconTrash size={14} />
                      </ActionIcon>
                    </>
                  )}
                </Group>
              ))}
            </Stack>
          )}

          <Textarea
            label='Descripción / Comentarios'
            placeholder='Agregar descripción...'
            value={description}
            onChange={(e) => setDescription(e.currentTarget.value)}
            minRows={2}
            autosize
            styles={inputStyles}
          />

          {!readOnly && (
            <Group justify={isEditing ? 'space-between' : 'flex-end'}>
              {isEditing && onDelete && (
                <Button
                  // variant='subtle'
                  color='red'
                  leftSection={<IconTrash size={14} />}
                  loading={deleting}
                  onClick={handleDelete}
                >
                  Eliminar
                </Button>
              )}
              <Group gap='xs'>
                <Button variant='default' onClick={onClose}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleSave}
                  loading={saving}
                  disabled={!canSave}
                >
                  {isEditing ? 'Guardar cambios' : 'Crear evento'}
                </Button>
              </Group>
            </Group>
          )}
        </Stack>
      </fieldset>
    </Modal>
  );
}
