'use client';
import {
  Stack,
  Text,
  Group,
  ActionIcon,
  ColorSwatch,
  Checkbox,
  TextInput,
  Button,
  Tooltip,
  Box,
  Select,
  MultiSelect
} from '@mantine/core';
import {
  IconPlus,
  IconPencil,
  IconTrash,
  IconChevronLeft,
  IconCalendar,
  IconLock,
  IconShieldLock
} from '@tabler/icons-react';
import { useState, useEffect, useMemo } from 'react';
import useSWR from 'swr';
import { useResponsive } from '@/hooks/useResponsive';
import { AppCalendar, CalendarFormValues } from '@/types/calendars';
import { EmployeeModel } from '@/context/types';

export type { AppCalendar, CalendarFormValues } from '@/types/calendars';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// Presets del selector. 'private' y 'selected' se guardan como 'restricted'.
type VisibilityPreset = 'all' | 'admins' | 'private' | 'selected';

const VISIBILITY_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'admins', label: 'Solo admins' },
  { value: 'private', label: 'Solo yo' },
  { value: 'selected', label: 'Empleados seleccionados' }
];

// Deriva el preset a partir del calendario guardado (sin visibility = legacy 'admins').
// En 'restricted' el dueño accede por ownerId: sin miembros = "Solo yo".
function presetOf(calendar: AppCalendar): VisibilityPreset {
  if (calendar.visibility === 'all') return 'all';
  if (calendar.visibility !== 'restricted') return 'admins';
  return (calendar.memberIds || []).length === 0 ? 'private' : 'selected';
}

const PRESET_COLORS = [
  '#e03131',
  '#e8590c',
  '#f08c00',
  '#2f9e44',
  '#0c8599',
  '#1971c2',
  '#6741d9',
  '#9c36b5',
  '#495057',
  '#c2255c'
];

const NATIVE_EVENTS_COLOR = '#37b24d';

interface CalendarSidebarProps {
  calendars: AppCalendar[];
  visibleCalendarIds: Set<string>;
  onToggleVisibility: (id: string) => void;
  onCreateCalendar: (values: CalendarFormValues) => void;
  onUpdateCalendar: (id: string, values: CalendarFormValues) => void;
  onDeleteCalendar: (id: string) => void;
  isLightTheme: boolean;
  nativeEventsVisible: boolean;
  onToggleNativeEvents: () => void;
  isAdmin: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export default function CalendarSidebar({
  calendars,
  visibleCalendarIds,
  onToggleVisibility,
  onCreateCalendar,
  onUpdateCalendar,
  onDeleteCalendar,
  isLightTheme,
  nativeEventsVisible,
  onToggleNativeEvents,
  isAdmin,
  onCollapsedChange
}: CalendarSidebarProps) {
  const { isMobile } = useResponsive();
  const [showNewForm, setShowNewForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(true);

  // Empleados de STAFF para el selector de visibilidad (solo admin)
  const { data: employeesData } = useSWR<(EmployeeModel & { _id: string })[]>(
    // directory=true: incluye también a quienes entran a la app sin ser personal
    // de eventos, para poder sumarlos a un calendario restringido.
    isAdmin ? '/api/employees?directory=true' : null,
    fetcher
  );
  const employees = useMemo(
    () => (Array.isArray(employeesData) ? employeesData : []),
    [employeesData]
  );

  const updateCollapsed = (value: boolean) => {
    setCollapsed(value);
    onCollapsedChange?.(value);
  };

  // Colapsar automáticamente cuando cambia a mobile
  useEffect(() => {
    if (isMobile) updateCollapsed(true);
  }, [isMobile]);

  const borderColor = isLightTheme ? '#dee2e6' : '#373a40';
  const textColor = isLightTheme ? '#1a1b1e' : '#c1c2c5';
  const mutedColor = isLightTheme ? '#868e96' : '#5c5f66';

  const formProps = { employees, isLightTheme, textColor, borderColor };

  // Indicador de visibilidad al lado del nombre (solo lo ve el admin)
  const visibilityIcon = (calendar: AppCalendar) => {
    const preset = presetOf(calendar);
    if (preset === 'all') return null;
    const label =
      preset === 'admins'
        ? 'Solo admins'
        : preset === 'private'
          ? 'Solo vos'
          : `${(calendar.memberIds || []).length} empleados`;
    return (
      <Tooltip label={label}>
        <Box style={{ display: 'flex', color: mutedColor, flexShrink: 0 }}>
          {preset === 'admins' ? (
            <IconShieldLock size={12} />
          ) : (
            <IconLock size={12} />
          )}
        </Box>
      </Tooltip>
    );
  };

  // --- Estado colapsado: botón flotante en mobile y desktop ---
  if (collapsed) {
    return (
      <Tooltip label='Calendarios' position='right'>
        <ActionIcon
          size='lg'
          variant='filled'
          color='blue'
          onClick={() => updateCollapsed(false)}
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            zIndex: 100,
            borderRadius: '50%',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
          }}
        >
          <IconCalendar size={18} />
        </ActionIcon>
      </Tooltip>
    );
  }

  // --- Estado expandido ---
  // En mobile: overlay sobre el calendario
  const mobileOverlayStyles = isMobile
    ? {
        position: 'absolute' as const,
        top: 0,
        left: 0,
        zIndex: 100,
        boxShadow: '4px 0 16px rgba(0,0,0,0.3)'
      }
    : {};

  return (
    <>
      {/* Backdrop para cerrar en mobile */}
      {isMobile && (
        <Box
          onClick={() => updateCollapsed(true)}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 99,
            backgroundColor: 'rgba(0,0,0,0.4)'
          }}
        />
      )}
      <Box
        style={{
          width: '220px',
          minWidth: '220px',
          height: '100vh',
          borderRight: `1px solid ${borderColor}`,
          overflowY: 'auto',
          padding: '16px 12px',
          backgroundColor: isLightTheme ? '#f8f9fa' : '#25262b',
          ...mobileOverlayStyles
        }}
      >
        {/* Header */}
        <Group justify='space-between' mb='md'>
          <Text fw={600} size='sm' style={{ color: textColor }}>
            Calendarios
          </Text>
          <Group gap='4px'>
            {isAdmin && (
              <Tooltip label='Nuevo calendario'>
                <ActionIcon
                  size='sm'
                  variant='subtle'
                  color='blue'
                  onClick={() => setShowNewForm((v) => !v)}
                >
                  <IconPlus size={14} />
                </ActionIcon>
              </Tooltip>
            )}
            <Tooltip label='Colapsar'>
              <ActionIcon
                size='sm'
                variant='light'
                color='dark'
                onClick={() => updateCollapsed(true)}
              >
                <IconChevronLeft size={14} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>

        {/* Formulario nuevo calendario */}
        {showNewForm && isAdmin && (
          <Box mb='md'>
            <CalendarForm
              {...formProps}
              submitLabel='Guardar'
              onSubmit={(values) => {
                onCreateCalendar(values);
                setShowNewForm(false);
              }}
              onCancel={() => setShowNewForm(false)}
            />
          </Box>
        )}

        {/* Lista de calendarios */}
        <Stack gap='4px'>
          {/* Calendario nativo "Eventos" */}
          <Group
            gap='xs'
            py='4px'
            style={{
              borderRadius: 6,
              cursor: 'pointer',
              userSelect: 'none'
            }}
            className='calendar-sidebar-item'
            onClick={onToggleNativeEvents}
          >
            <Checkbox
              checked={nativeEventsVisible}
              onChange={onToggleNativeEvents}
              size='xs'
              color={NATIVE_EVENTS_COLOR}
              styles={{
                input: {
                  cursor: 'pointer',
                  ...(!nativeEventsVisible && {
                    backgroundColor: NATIVE_EVENTS_COLOR,
                    opacity: 0.3,
                    borderColor: NATIVE_EVENTS_COLOR
                  })
                }
              }}
              onClick={(e) => e.stopPropagation()}
            />
            <Text
              size='xs'
              style={{
                flex: 1,
                color: nativeEventsVisible ? textColor : mutedColor,
                transition: 'color 0.15s'
              }}
              truncate
            >
              Eventos
            </Text>
          </Group>

          {/* Calendarios personalizados */}
          {calendars.map((calendar) => {
            const isVisible = visibleCalendarIds.has(calendar._id);
            const isEditing = editingId === calendar._id;

            if (isEditing) {
              return (
                <CalendarForm
                  key={calendar._id}
                  {...formProps}
                  calendar={calendar}
                  submitLabel='Guardar'
                  onSubmit={(values) => {
                    onUpdateCalendar(calendar._id, values);
                    setEditingId(null);
                  }}
                  onCancel={() => setEditingId(null)}
                />
              );
            }

            return (
              <Group
                key={calendar._id}
                gap='xs'
                py='4px'
                style={{
                  borderRadius: 6,
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
                className='calendar-sidebar-item'
                onClick={() => onToggleVisibility(calendar._id)}
              >
                <Checkbox
                  checked={isVisible}
                  onChange={() => onToggleVisibility(calendar._id)}
                  size='xs'
                  color={calendar.color}
                  styles={{
                    input: {
                      cursor: 'pointer',
                      ...(!isVisible && {
                        backgroundColor: calendar.color,
                        opacity: 0.3,
                        borderColor: calendar.color
                      })
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
                <Text
                  size='xs'
                  style={{
                    flex: 1,
                    color: isVisible ? textColor : mutedColor,
                    transition: 'color 0.15s'
                  }}
                  truncate
                >
                  {calendar.name}
                </Text>
                {isAdmin && visibilityIcon(calendar)}
                {isAdmin && (
                  <Group
                    gap='2px'
                    style={{ flexShrink: 0 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Tooltip label='Editar'>
                      <ActionIcon
                        size='xs'
                        variant='subtle'
                        color='blue'
                        onClick={() => setEditingId(calendar._id)}
                      >
                        <IconPencil size={12} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label='Eliminar'>
                      <ActionIcon
                        size='xs'
                        variant='subtle'
                        color='red'
                        onClick={() => onDeleteCalendar(calendar._id)}
                      >
                        <IconTrash size={12} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                )}
              </Group>
            );
          })}

          {calendars.length === 0 && !showNewForm && isAdmin && (
            <Text size='xs' style={{ color: mutedColor }} ta='center' mt='xs'>
              Creá calendarios extras con el +
            </Text>
          )}
        </Stack>
      </Box>
    </>
  );
}

interface CalendarFormProps {
  calendar?: AppCalendar; // si viene, es edición
  employees: (EmployeeModel & { _id: string })[];
  submitLabel: string;
  onSubmit: (values: CalendarFormValues) => void;
  onCancel: () => void;
  isLightTheme: boolean;
  textColor: string;
  borderColor: string;
}

// Formulario de crear/editar calendario: nombre, color y visibilidad
function CalendarForm({
  calendar,
  employees,
  submitLabel,
  onSubmit,
  onCancel,
  isLightTheme,
  textColor,
  borderColor
}: CalendarFormProps) {
  const [name, setName] = useState(calendar?.name || '');
  const [color, setColor] = useState(calendar?.color || PRESET_COLORS[0]);
  const [visibility, setVisibility] = useState<VisibilityPreset>(
    calendar ? presetOf(calendar) : 'admins'
  );
  const [members, setMembers] = useState<string[]>(calendar?.memberIds || []);

  // Opciones del multiselect: empleados de STAFF. Se pueden elegir aunque no
  // tengan email; el aviso recuerda que sin email todavía no ven el calendario.
  const memberOptions = employees
    .map((emp) => ({
      value: String(emp._id),
      label: emp.email ? emp.fullName : `${emp.fullName} (sin email)`
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
  const employeeIds = new Set(memberOptions.map((opt) => opt.value));
  // Ignora miembros que ya no existen en STAFF (empleados borrados)
  const validMembers = members.filter((id) => employeeIds.has(id));

  const canSubmit =
    !!name.trim() && (visibility !== 'selected' || validMembers.length > 0);

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      name: name.trim(),
      color,
      visibility:
        visibility === 'private' || visibility === 'selected'
          ? 'restricted'
          : visibility,
      memberIds: visibility === 'selected' ? validMembers : []
    });
  };

  const inputStyles = {
    input: {
      backgroundColor: isLightTheme ? '#fff' : '#1a1b1e',
      color: textColor,
      borderColor
    },
    label: { color: textColor },
    // En tema claro el dropdown y los pills tienen que acompañar (la app es dark)
    dropdown: {
      backgroundColor: isLightTheme ? '#fff' : '#25262b',
      borderColor
    },
    option: { color: textColor },
    pill: isLightTheme
      ? { backgroundColor: '#e9ecef', color: '#1a1b1e' }
      : undefined
  };
  const dropdownClassNames = {
    dropdown: isLightTheme ? 'calendar-light-dropdown' : undefined
  };

  return (
    <Stack
      gap='xs'
      p='xs'
      style={{ border: `1px solid ${borderColor}`, borderRadius: 6 }}
    >
      <TextInput
        placeholder='Nombre del calendario'
        value={name}
        onChange={(e) => setName(e.currentTarget.value)}
        size='xs'
        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        styles={inputStyles}
      />
      {/* Color picker */}
      <Group gap='4px' wrap='wrap'>
        {PRESET_COLORS.map((c) => (
          <ColorSwatch
            key={c}
            color={c}
            size={18}
            style={{
              cursor: 'pointer',
              outline: color === c ? `2px solid ${textColor}` : 'none',
              outlineOffset: 1
            }}
            onClick={() => setColor(c)}
          />
        ))}
      </Group>
      {/* Visibilidad */}
      <Select
        label='Quién lo ve'
        size='xs'
        data={VISIBILITY_OPTIONS}
        value={visibility}
        onChange={(v) => v && setVisibility(v as VisibilityPreset)}
        allowDeselect={false}
        styles={inputStyles}
        classNames={dropdownClassNames}
        comboboxProps={{ withinPortal: true }}
      />
      {visibility === 'selected' && (
        <MultiSelect
          size='xs'
          placeholder={
            memberOptions.length
              ? 'Elegí empleados'
              : 'No hay empleados cargados en STAFF'
          }
          data={memberOptions}
          value={validMembers}
          onChange={setMembers}
          searchable
          clearable
          nothingFoundMessage='Sin resultados'
          styles={inputStyles}
          classNames={dropdownClassNames}
          comboboxProps={{ withinPortal: true }}
        />
      )}
      <Group gap='xs'>
        <Button
          size='xs'
          onClick={handleSubmit}
          disabled={!canSubmit}
          styles={
            isLightTheme && !canSubmit
              ? { root: { backgroundColor: '#e9ecef', color: '#adb5bd' } }
              : undefined
          }
        >
          {submitLabel}
        </Button>
        <Button
          size='xs'
          variant='default'
          onClick={onCancel}
          styles={{
            root: {
              backgroundColor: isLightTheme ? '#fff' : 'transparent',
              color: textColor,
              borderColor: isLightTheme ? '#ced4da' : '#5c5f66'
            }
          }}
        >
          Cancelar
        </Button>
      </Group>
    </Stack>
  );
}
