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
  Collapse
} from '@mantine/core';
import { IconPlus, IconPencil, IconTrash, IconCheck, IconX, IconChevronLeft, IconChevronRight, IconCalendar } from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import { useResponsive } from '@/hooks/useResponsive';

export interface AppCalendar {
  _id: string;
  name: string;
  color: string;
}

const PRESET_COLORS = [
  '#e03131', '#e8590c', '#f08c00', '#2f9e44',
  '#0c8599', '#1971c2', '#6741d9', '#9c36b5',
  '#495057', '#c2255c'
];

const NATIVE_EVENTS_COLOR = '#37b24d';

interface CalendarSidebarProps {
  calendars: AppCalendar[];
  visibleCalendarIds: Set<string>;
  onToggleVisibility: (id: string) => void;
  onCreateCalendar: (name: string, color: string) => void;
  onUpdateCalendar: (id: string, name: string, color: string) => void;
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
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [collapsed, setCollapsed] = useState(true);

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

  const handleCreate = () => {
    if (!newName.trim()) return;
    onCreateCalendar(newName.trim(), newColor);
    setNewName('');
    setNewColor(PRESET_COLORS[0]);
    setShowNewForm(false);
  };

  const startEdit = (calendar: AppCalendar) => {
    setEditingId(calendar._id);
    setEditName(calendar.name);
    setEditColor(calendar.color);
  };

  const handleUpdate = () => {
    if (!editingId || !editName.trim()) return;
    onUpdateCalendar(editingId, editName.trim(), editColor);
    setEditingId(null);
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
  const mobileOverlayStyles = isMobile ? {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    zIndex: 100,
    boxShadow: '4px 0 16px rgba(0,0,0,0.3)'
  } : {};

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
        <Collapse in={showNewForm && isAdmin}>
          <Stack gap='xs' mb='md' p='xs' style={{ border: `1px solid ${borderColor}`, borderRadius: 6 }}>
            <TextInput
              placeholder='Nombre del calendario'
              value={newName}
              onChange={(e) => setNewName(e.currentTarget.value)}
              size='xs'
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              styles={{
                input: {
                  backgroundColor: isLightTheme ? '#fff' : '#1a1b1e',
                  color: textColor,
                  borderColor
                }
              }}
            />
            {/* Color picker */}
            <Group gap='4px' wrap='wrap'>
              {PRESET_COLORS.map((color) => (
                <ColorSwatch
                  key={color}
                  color={color}
                  size={18}
                  style={{
                    cursor: 'pointer',
                    outline: newColor === color ? `2px solid ${textColor}` : 'none',
                    outlineOffset: 1
                  }}
                  onClick={() => setNewColor(color)}
                />
              ))}
            </Group>
            <Group gap='xs'>
              <Button size='xs' onClick={handleCreate} disabled={!newName.trim()}>
                Guardar
              </Button>
              <Button
                size='xs'
                variant='subtle'
                color='gray'
                onClick={() => { setShowNewForm(false); setNewName(''); }}
              >
                Cancelar
              </Button>
            </Group>
          </Stack>
        </Collapse>

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
                <Stack
                  key={calendar._id}
                  gap='xs'
                  p='xs'
                  style={{ border: `1px solid ${borderColor}`, borderRadius: 6 }}
                >
                  <TextInput
                    value={editName}
                    onChange={(e) => setEditName(e.currentTarget.value)}
                    size='xs'
                    onKeyDown={(e) => e.key === 'Enter' && handleUpdate()}
                    styles={{
                      input: {
                        backgroundColor: isLightTheme ? '#fff' : '#1a1b1e',
                        color: textColor,
                        borderColor
                      }
                    }}
                  />
                  <Group gap='4px' wrap='wrap'>
                    {PRESET_COLORS.map((color) => (
                      <ColorSwatch
                        key={color}
                        color={color}
                        size={16}
                        style={{
                          cursor: 'pointer',
                          outline: editColor === color ? `2px solid ${textColor}` : 'none',
                          outlineOffset: 1
                        }}
                        onClick={() => setEditColor(color)}
                      />
                    ))}
                  </Group>
                  <Group gap='xs'>
                    <ActionIcon size='xs' color='green' onClick={handleUpdate}>
                      <IconCheck size={12} />
                    </ActionIcon>
                    <ActionIcon size='xs' color='gray' variant='subtle' onClick={() => setEditingId(null)}>
                      <IconX size={12} />
                    </ActionIcon>
                  </Group>
                </Stack>
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
                {isAdmin && (
                  <Group gap='2px' style={{ flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                    <Tooltip label='Editar'>
                      <ActionIcon
                        size='xs'
                        variant='subtle'
                        color='blue'
                        onClick={() => startEdit(calendar)}
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
