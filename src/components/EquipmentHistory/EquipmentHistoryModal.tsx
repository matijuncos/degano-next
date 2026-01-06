'use client';
import { Modal, Timeline, Text, Badge, Box, Loader, Group } from '@mantine/core';
import {
  IconPlus,
  IconEdit,
  IconCalendarEvent,
  IconMapPin,
  IconAlertCircle
} from '@tabler/icons-react';
import useSWR from 'swr';
import { EquipmentHistoryEntry } from '@/types/equipmentHistory';
import { useResponsive } from '@/hooks/useResponsive';

interface EquipmentHistoryModalProps {
  opened: boolean;
  onClose: () => void;
  equipmentId: string;
  equipmentName: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function EquipmentHistoryModal({
  opened,
  onClose,
  equipmentId,
  equipmentName
}: EquipmentHistoryModalProps) {
  const { isMobile } = useResponsive();
  const { data: history, error, isLoading } = useSWR<EquipmentHistoryEntry[]>(
    opened ? `/api/equipmentHistory?equipmentId=${equipmentId}` : null,
    fetcher
  );

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'creacion':
        return <IconPlus size={16} />;
      case 'edicion':
        return <IconEdit size={16} />;
      case 'uso_evento':
        return <IconCalendarEvent size={16} />;
      case 'traslado':
        return <IconMapPin size={16} />;
      case 'cambio_estado':
        return <IconAlertCircle size={16} />;
      default:
        return null;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'creacion':
        return 'green';
      case 'edicion':
        return 'blue';
      case 'uso_evento':
        return 'violet';
      case 'traslado':
        return 'orange';
      case 'cambio_estado':
        return 'red';
      default:
        return 'gray';
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'creacion':
        return 'Creación';
      case 'edicion':
        return 'Edición';
      case 'uso_evento':
        return 'Uso en Evento';
      case 'traslado':
        return 'Traslado';
      case 'cambio_estado':
        return 'Cambio de Estado';
      default:
        return action;
    }
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderHistoryDetails = (entry: EquipmentHistoryEntry) => {
    switch (entry.action) {
      case 'creacion':
        return <Text size="sm">{entry.details}</Text>;

      case 'edicion':
        return (
          <Box>
            {entry.changes?.map((change, idx) => (
              <Text key={idx} size="sm" style={{ marginBottom: 4 }}>
                <strong>{change.field}:</strong>{' '}
                {String(change.oldValue || 'vacío')} →{' '}
                {String(change.newValue)}
              </Text>
            ))}
          </Box>
        );

      case 'uso_evento':
        return (
          <Box>
            <Text size="sm">
              <strong>Evento:</strong> {entry.eventName}
            </Text>
            <Text size="sm">
              <strong>Lugar:</strong> {entry.eventLocation}
            </Text>
            <Text size="sm">
              <strong>Fecha:</strong>{' '}
              {entry.eventDate ? formatDate(entry.eventDate) : 'N/A'}
            </Text>
          </Box>
        );

      case 'traslado':
        return (
          <Text size="sm">
            De <strong>{entry.fromValue || 'sin ubicación'}</strong> a{' '}
            <strong>{entry.toValue}</strong>
          </Text>
        );

      case 'cambio_estado':
        return (
          <Box>
            <Text size="sm">
              Estado: <strong>{entry.fromValue}</strong> →{' '}
              <strong>{entry.toValue}</strong>
            </Text>
            {entry.details && (
              <Text size="sm" c="dimmed">
                Motivo: {entry.details}
              </Text>
            )}
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={`Historial de ${equipmentName}`}
      size='lg'
      fullScreen={isMobile}
    >
      {isLoading && (
        <Box
          style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}
        >
          <Loader />
        </Box>
      )}

      {error && <Text c="red">Error al cargar el historial</Text>}

      {history && history.length === 0 && (
        <Text c="dimmed">No hay historial registrado para este equipamiento</Text>
      )}

      {history && history.length > 0 && (
        <Timeline active={history.length} bulletSize={24} lineWidth={2}>
          {history.map((entry, index) => (
            <Timeline.Item
              key={index}
              bullet={getActionIcon(entry.action)}
              title={
                <Group>
                  <Badge color={getActionColor(entry.action)}>
                    {getActionLabel(entry.action)}
                  </Badge>
                  <Text size="xs" c="dimmed">
                    {formatDate(entry.date)}
                  </Text>
                </Group>
              }
            >
              <Box style={{ marginTop: 8 }}>{renderHistoryDetails(entry)}</Box>
            </Timeline.Item>
          ))}
        </Timeline>
      )}
    </Modal>
  );
}
