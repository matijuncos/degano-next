// src/components/DayEventsSheet/DayEventsSheet.tsx
// Lista de todos los eventos de un día del calendario. Se abre al tocar el
// número del día (y en celular, un día vacío): reemplaza la vista "Día".
// Celular: sube desde abajo. Escritorio: modal. Tema claro y oscuro (el
// calendario tiene su propio tema claro). No hace requests: usa los eventos ya cargados.
'use client';
import { Drawer, Modal, Stack, Group, Text, UnstyledButton, Button, Box, ScrollArea } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { eventsForDay, dayEventTime } from '@/utils/calendarDayEvents';

const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const dayTitle = (d: Date) => `${WEEKDAYS[d.getDay()]} ${d.getDate()} de ${MONTHS[d.getMonth()]}`;

export default function DayEventsSheet({
  day,
  events,
  colorOf,
  isMobile,
  isLightTheme,
  canCreate,
  onClose,
  onSelect,
  onCreate
}: {
  day: Date | null; // null = cerrado
  events: any[]; // eventos del calendario (los mismos que dibuja la grilla)
  colorOf: (event: any) => string;
  isMobile: boolean;
  isLightTheme: boolean;
  canCreate: boolean;
  onClose: () => void;
  onSelect: (event: any) => void;
  onCreate: (day: Date) => void;
}) {
  const list = day ? eventsForDay(events, day) : [];
  const fg = isLightTheme ? '#1a1b1e' : '#c1c2c5';
  const dim = isLightTheme ? '#868e96' : '#909296';
  const bg = isLightTheme ? '#ffffff' : '#25262b';
  const line = isLightTheme ? '#e9ecef' : '#373a40';
  const hover = isLightTheme ? '#f1f3f5' : '#2c2e33';

  const title = day ? (
    <Stack gap={0}>
      <Text fw={700} style={{ color: fg }}>{dayTitle(day)}</Text>
      <Text size='xs' style={{ color: dim }}>
        {list.length ? `${list.length} ${list.length === 1 ? 'evento' : 'eventos'}` : 'Sin eventos'}
      </Text>
    </Stack>
  ) : null;

  const body = (
    <Stack gap={0}>
      {!list.length && (
        <Text size='sm' py='md' style={{ color: dim }}>No hay eventos este día.</Text>
      )}
      {list.map((e, i) => (
        <UnstyledButton
          key={`${e._id ?? e.title}-${i}`}
          onClick={() => onSelect(e)}
          style={{ borderTop: i ? `1px solid ${line}` : undefined, borderRadius: 6 }}
          onMouseEnter={(ev) => (ev.currentTarget.style.background = hover)}
          onMouseLeave={(ev) => (ev.currentTarget.style.background = 'transparent')}
        >
          <Group wrap='nowrap' gap='sm' py='sm' px={4} align='flex-start'>
            <Box mt={5} w={10} h={10} style={{ borderRadius: 3, background: colorOf(e), flexShrink: 0 }} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <Text size='sm' fw={600} style={{ color: fg }}>{e.title}</Text>
              {/* Horario REAL: la grilla recorta a las 23:59 los eventos que terminan
                  de madrugada (para no ocupar dos días); acá se muestra el fin verdadero */}
              <Text size='xs' style={{ color: dim }}>
                {dayEventTime({ ...e, end: e.endDate ? new Date(e.endDate) : e.end }, day!)}
              </Text>
            </div>
          </Group>
        </UnstyledButton>
      ))}
      {canCreate && day && (
        <Button
          variant='light'
          leftSection={<IconPlus size={16} />}
          mt='md'
          onClick={() => onCreate(day)}
          fullWidth={isMobile}
          // Tema claro del calendario: colores explícitos (si no, sale apagado)
          styles={isLightTheme ? { root: { backgroundColor: '#e7f5ff', color: '#1c7ed6' } } : undefined}
        >
          Nuevo evento este día
        </Button>
      )}
    </Stack>
  );

  const styles = {
    content: { backgroundColor: bg },
    header: { backgroundColor: bg },
    close: { color: fg }
  };

  return isMobile ? (
    <Drawer
      opened={!!day}
      onClose={onClose}
      position='bottom'
      size='75%'
      title={title}
      styles={{ ...styles, content: { ...styles.content, borderTopLeftRadius: 12, borderTopRightRadius: 12 } }}
      zIndex={1100}
    >
      {/* Margen abajo: la barra de navegación del celular */}
      <ScrollArea.Autosize mah='calc(75vh - 90px)' pb={70}>{body}</ScrollArea.Autosize>
    </Drawer>
  ) : (
    <Modal opened={!!day} onClose={onClose} title={title} centered size='md' styles={styles}>
      <ScrollArea.Autosize mah='60vh'>{body}</ScrollArea.Autosize>
    </Modal>
  );
}
