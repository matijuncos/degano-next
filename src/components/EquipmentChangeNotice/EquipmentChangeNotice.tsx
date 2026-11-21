'use client';
import React, { useState } from 'react';
import { Box, Button, Group, Stack, Text } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import { usePermissions } from '@/hooks/usePermissions';
import useNotification from '@/hooks/useNotification';
import { arDateTimeLabel } from '@/utils/reservationRange';
import type { EquipmentChangeNotice as Notice } from '@/utils/dateChangeConflicts';
import { useEventSave } from '@/components/DateConflictModal/DateConflictProvider';

// Colores fijos: se ve igual en el tema oscuro de la app y en el claro de /calendar
const BOX_STYLE: React.CSSProperties = {
  background: '#fff3cd',
  border: '1px solid #ffe08a',
  color: '#5c4400',
  borderRadius: 8,
  padding: '10px 12px'
};

/**
 * Aviso de que a ESTE evento le cambiaron equipos al resolver un choque de
 * fechas de otro evento (ver utils/dateChangeConflicts). Si alguien imprimió la
 * lista, quedó vieja. "Visto" lo oculta (el registro queda en el evento).
 * Recibe el evento por props (regla 10: nunca selectedEvent a ciegas).
 */
export default function EquipmentChangeNotice({
  event,
  onEventUpdated
}: {
  event: { _id?: any; equipmentChangeNotices?: Notice[] } | null | undefined;
  onEventUpdated: (event: any) => void;
}) {
  const { can } = usePermissions();
  const saveEvent = useEventSave();
  const notify = useNotification();
  const [saving, setSaving] = useState<string | null>(null);
  const pending = (event?.equipmentChangeNotices || []).filter((n) => !n.seenAt);
  if (!event?._id || !pending.length) return null;

  const markSeen = async (id: string) => {
    setSaving(id);
    try {
      const result = await saveEvent({ _id: String(event._id), markNoticeSeen: id });
      if (!result.ok) {
        notify({ type: 'defaultError', message: result.error });
        return;
      }
      onEventUpdated(result.event);
    } finally {
      setSaving(null);
    }
  };

  return (
    <Stack gap={8} mb='md'>
      {pending.map((n) => (
        <Box key={n.id} style={BOX_STYLE}>
          <Group gap={8} align='flex-start' wrap='nowrap'>
            <IconAlertTriangle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
            <Box style={{ flex: 1, minWidth: 0 }}>
              <Text size='sm' fw={600} c='inherit'>
                Se cambiaron equipos de este evento
              </Text>
              <Text size='sm' c='inherit'>
                El {arDateTimeLabel(n.at)}
                {n.byName ? ` (${n.byName})` : ''}, al cambiar las fechas de <strong>{n.fromEventName}</strong>:{' '}
                {n.changes.map((c) => `${c.fromCode || c.fromName} → ${c.toCode || c.toName}`).join(', ')}.
              </Text>
              <Text size='sm' c='inherit'>
                Si imprimiste la lista de equipos, volvé a imprimirla.
              </Text>
            </Box>
            {can('canEditEvents') && (
              <Button
                size='xs'
                variant='white'
                color='dark'
                loading={saving === n.id}
                onClick={() => markSeen(n.id)}
                style={{ flexShrink: 0 }}
              >
                Visto
              </Button>
            )}
          </Group>
        </Box>
      ))}
    </Stack>
  );
}
