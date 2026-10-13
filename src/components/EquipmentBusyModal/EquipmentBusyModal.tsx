'use client';
import { Modal, Stack, Paper, Text, Group, Button, Badge } from '@mantine/core';
import { IconExternalLink, IconCalendarEvent, IconMapPin } from '@tabler/icons-react';
import { BusyUse, formatUseRange } from '@/utils/equipmentAvailability';

// Modal "¿Dónde está en uso?": lista las reservas que ocupan un equipo.
// Los datos vienen ya en el equipo (`busyWith`, del GET /api/equipment), así
// que abre al instante sin hacer requests.
export default function EquipmentBusyModal({
  item,
  onClose
}: {
  item: any | null;
  onClose: () => void;
}) {
  const uses: BusyUse[] = item?.busyWith || [];

  return (
    <Modal
      opened={!!item}
      onClose={onClose}
      centered
      title={
        <Text fw={600}>
          ¿Dónde está en uso? — {item?.name}
          {item?.code ? ` (${item.code})` : ''}
        </Text>
      }
    >
      {uses.length === 0 ? (
        <Stack gap='xs'>
          <Text size='sm'>No se encontró una reserva en curso para este equipo.</Text>
          {item?.outOfService?.details && (
            <Text size='sm' c='dimmed'>
              Último registro: {item.outOfService.details}
            </Text>
          )}
        </Stack>
      ) : (
        <Stack gap='sm'>
          {uses.map((u) => (
            <Paper key={`${u.eventId}-${u.startDate}`} withBorder p='sm' radius='md'>
              <Group justify='space-between' align='flex-start' wrap='nowrap'>
                <Stack gap={4}>
                  <Group gap={6}>
                    <Badge color='yellow' variant='light'>
                      {u.eventType || 'Evento'}
                    </Badge>
                    {u.clientName && <Text fw={600}>{u.clientName}</Text>}
                  </Group>
                  <Group gap={6}>
                    <IconCalendarEvent size={16} />
                    <Text size='sm'>{formatUseRange(u.startDate, u.endDate)}</Text>
                  </Group>
                  {u.location && (
                    <Group gap={6}>
                      <IconMapPin size={16} />
                      <Text size='sm'>{u.location}</Text>
                    </Group>
                  )}
                </Stack>
                {/* Pestaña nueva: no se pierde lo que se está editando */}
                <Button
                  component='a'
                  href={`/event/${u.eventId}`}
                  target='_blank'
                  rel='noopener noreferrer'
                  size='xs'
                  variant='light'
                  rightSection={<IconExternalLink size={14} />}
                >
                  Ver evento
                </Button>
              </Group>
            </Paper>
          ))}
        </Stack>
      )}
    </Modal>
  );
}
