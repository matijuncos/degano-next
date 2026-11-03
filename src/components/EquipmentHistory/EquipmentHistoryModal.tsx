'use client';
// Historial PERMANENTE de un equipo ("la vida del equipo").
// - Resumen arriba (desde cuándo está, eventos, último evento, fuera de servicio).
// - Notas: se agregan y quedan para siempre (no se editan ni se borran).
// - Línea de tiempo por mes. Los movimientos automáticos (reservas que se
//   liberan solas, etc.) van ocultos por defecto: son la mayoría y tapan lo importante.
// Requests: 1 al abrir (historial + resumen juntos). Agregar una nota: 1 más.
import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Modal, Timeline, Text, Badge, Box, Loader, Group, Stack, Paper, SimpleGrid, Textarea, Button, Chip, Switch,
  Alert, Center, Anchor, Divider
} from '@mantine/core';
import {
  IconPlus, IconEdit, IconCalendarEvent, IconMapPin, IconAlertCircle, IconNote, IconTrash, IconRobot, IconCalendarMinus
} from '@tabler/icons-react';
import useSWR, { mutate } from 'swr';
import { EquipmentHistoryEntry } from '@/types/equipmentHistory';
import { useResponsive } from '@/hooks/useResponsive';
import { usePermissions } from '@/hooks/usePermissions';
import useNotification from '@/hooks/useNotification';
import {
  classifyHistoryEntry,
  filterHistory,
  groupHistoryByMonth,
  HISTORY_FIELD_LABELS,
  HistoryFilter,
  HistoryKind,
  LifeSummary,
  meaningfulChanges
} from '@/utils/equipmentLife';

interface EquipmentHistoryModalProps {
  opened: boolean;
  onClose: () => void;
  equipmentId: string;
  equipmentName: string;
}

type Entry = EquipmentHistoryEntry & { _id: string };
type HistoryResponse = {
  equipment: { _id: string; name: string; code: string; deleted: boolean; legacyNotes: string };
  summary: LifeSummary;
  entries: Entry[];
};

const historyKey = (id: string) => `/api/equipmentHistory?equipmentId=${id}`;

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'Error al cargar el historial');
  return data;
};

const KIND: Record<HistoryKind, { label: string; color: string; icon: JSX.Element }> = {
  alta: { label: 'Alta', color: 'green', icon: <IconPlus size={14} /> },
  evento: { label: 'Evento', color: 'violet', icon: <IconCalendarEvent size={14} /> },
  quitado: { label: 'Quitado de evento', color: 'grape', icon: <IconCalendarMinus size={14} /> },
  estado: { label: 'Estado', color: 'red', icon: <IconAlertCircle size={14} /> },
  traslado: { label: 'Traslado', color: 'orange', icon: <IconMapPin size={14} /> },
  edicion: { label: 'Edición', color: 'blue', icon: <IconEdit size={14} /> },
  nota: { label: 'Nota', color: 'yellow', icon: <IconNote size={14} /> },
  baja: { label: 'Eliminado', color: 'gray', icon: <IconTrash size={14} /> },
  auto: { label: 'Automático', color: 'gray', icon: <IconRobot size={14} /> }
};

const FILTER_LABELS: Record<HistoryFilter, string> = {
  todo: 'Todo',
  eventos: 'Eventos',
  estado: 'Estado',
  traslados: 'Traslados',
  cambios: 'Cambios',
  notas: 'Notas'
};

const PAGE = 60;

const AR = 'America/Argentina/Buenos_Aires';
const formatDateTime = (date: string | Date) =>
  new Date(date).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: AR
  });
const formatDay = (date: string | Date) =>
  new Date(date).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: AR });

const formatValue = (v: any) =>
  v === undefined || v === null || v === '' ? 'vacío' : typeof v === 'boolean' ? (v ? 'Sí' : 'No') : String(v);

function EntryBody({ entry, kind }: { entry: Entry; kind: HistoryKind }) {
  switch (kind) {
    case 'nota':
      return <Text size='sm' style={{ whiteSpace: 'pre-line' }}>{entry.note}</Text>;
    case 'evento':
      return (
        <Stack gap={2}>
          <Text size='sm'>
            {entry.eventName || 'Evento'}
            {entry.eventDate ? ` · ${formatDay(entry.eventDate)}` : ''}
          </Text>
          {(entry.eventLocation || entry.eventClientName) && (
            <Text size='xs' c='dimmed'>{[entry.eventLocation, entry.eventClientName].filter(Boolean).join(' · ')}</Text>
          )}
          {entry.eventId && (
            <Anchor component={Link} href={`/event/${entry.eventId}`} size='xs'>Ver evento</Anchor>
          )}
        </Stack>
      );
    case 'traslado':
      return (
        <Text size='sm'>
          De <b>{entry.fromValue || 'sin ubicación'}</b> a <b>{entry.toValue}</b>
        </Text>
      );
    case 'estado':
      return (
        <Stack gap={2}>
          <Text size='sm'><b>{entry.fromValue}</b> → <b>{entry.toValue}</b></Text>
          {entry.details && entry.details !== 'Sin motivo especificado' && (
            <Text size='xs' c='dimmed'>Motivo: {entry.details}</Text>
          )}
        </Stack>
      );
    case 'edicion':
      return (
        <Stack gap={2}>
          {meaningfulChanges(entry.changes).map((c, i) => (
            <Text key={i} size='sm'>
              <b>{HISTORY_FIELD_LABELS[c.field] ?? c.field}:</b> {formatValue(c.oldValue)} → {formatValue(c.newValue)}
            </Text>
          ))}
          {!entry.changes?.length && entry.details && <Text size='sm'>{entry.details}</Text>}
        </Stack>
      );
    case 'alta':
      return <Text size='sm'>Alta en el stock</Text>;
    default:
      return entry.details ? (
        <Text size='sm'>{entry.details}</Text>
      ) : entry.fromValue || entry.toValue ? (
        <Text size='sm'>{formatValue(entry.fromValue)} → {formatValue(entry.toValue)}</Text>
      ) : null;
  }
}

function SummaryCard({ label, value, hint }: { label: string; value: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <Paper withBorder p='xs'>
      <Text size='xs' c='dimmed'>{label}</Text>
      <Text fw={700} size='sm'>{value}</Text>
      {hint && <Text size='xs' c='dimmed'>{hint}</Text>}
    </Paper>
  );
}

export default function EquipmentHistoryModal({ opened, onClose, equipmentId, equipmentName }: EquipmentHistoryModalProps) {
  const { isMobile } = useResponsive();
  const { can } = usePermissions();
  const notify = useNotification();
  const { data, error } = useSWR<HistoryResponse>(opened && equipmentId ? historyKey(equipmentId) : null, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30_000
  });
  const [filter, setFilter] = useState<HistoryFilter>('todo');
  const [showAuto, setShowAuto] = useState(false);
  const [shown, setShown] = useState(PAGE);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const entries = data?.entries ?? [];
  const autoCount = useMemo(() => entries.filter((e) => classifyHistoryEntry(e) === 'auto').length, [entries]);
  const visible = useMemo(() => filterHistory(entries, filter, showAuto), [entries, filter, showAuto]);
  const groups = useMemo(() => groupHistoryByMonth(visible.slice(0, shown)), [visible, shown]);

  const canAddNote = can('canEditEquipment') && !!data && !data.equipment.deleted;
  const title = data?.equipment.name ?? equipmentName;
  const s = data?.summary;

  const addNote = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/equipmentHistory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ equipmentId, text: note })
      });
      const entry = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(entry?.error || 'No se pudo guardar la nota');
      // Se agrega a la caché sin pedir todo de nuevo
      await mutate(
        historyKey(equipmentId),
        (prev?: HistoryResponse) =>
          prev && { ...prev, entries: [entry, ...prev.entries], summary: { ...prev.summary, notes: prev.summary.notes + 1 } },
        { revalidate: false }
      );
      setNote('');
      notify({ message: 'Nota agregada' });
    } catch (e: any) {
      notify({ type: 'defaultError', message: e?.message || 'No se pudo guardar la nota' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap='xs'>
          <Text fw={600}>Historial · {title}</Text>
          {data?.equipment.code && <Text size='sm' c='dimmed'>{data.equipment.code}</Text>}
          {data?.equipment.deleted && <Badge color='gray' size='sm'>Eliminado</Badge>}
        </Group>
      }
      size='xl'
      fullScreen={isMobile}
    >
      {error ? (
        <Alert color='red'>{error.message}</Alert>
      ) : !data ? (
        <Center py='xl'><Loader /></Center>
      ) : (
        <Stack gap='md' pb={isMobile ? 70 : 0}>
          {/* Resumen de la vida del equipo */}
          <SimpleGrid cols={{ base: 2, sm: 4 }} spacing='xs'>
            <SummaryCard label='En el stock desde' value={s?.since ? formatDay(s.since) : '—'} />
            <SummaryCard
              label='Eventos'
              value={s?.eventsDone ?? 0}
              hint={s?.eventsUpcoming ? `${s.eventsUpcoming} próximo${s.eventsUpcoming === 1 ? '' : 's'}` : undefined}
            />
            <SummaryCard
              label='Último evento'
              value={s?.lastEvent ? formatDay(s.lastEvent.date) : '—'}
              hint={
                s?.lastEvent ? (
                  <Anchor component={Link} href={`/event/${s.lastEvent._id}`} size='xs'>{s.lastEvent.label}</Anchor>
                ) : undefined
              }
            />
            <SummaryCard
              label='Fuera de servicio'
              value={`${s?.outOfServiceTimes ?? 0} ${s?.outOfServiceTimes === 1 ? 'vez' : 'veces'}`}
              hint={s?.moves ? `${s.moves} traslado${s.moves === 1 ? '' : 's'}` : undefined}
            />
          </SimpleGrid>

          {/* Notas: solo se agregan */}
          {canAddNote && (
            <Paper withBorder p='sm'>
              <Stack gap='xs'>
                <Textarea
                  placeholder='Agregar una nota: reparación, falla, observación...'
                  value={note}
                  onChange={(e) => setNote(e.currentTarget.value)}
                  autosize
                  minRows={2}
                  maxRows={6}
                />
                <Group justify='space-between' wrap='wrap' gap='xs'>
                  <Text size='xs' c='dimmed'>Las notas quedan guardadas para siempre: no se pueden editar ni borrar.</Text>
                  <Button size='xs' onClick={addNote} loading={saving} disabled={!note.trim()}>
                    Agregar nota
                  </Button>
                </Group>
              </Stack>
            </Paper>
          )}

          {data.equipment.legacyNotes && (
            <Paper withBorder p='sm'>
              <Text size='xs' c='dimmed' mb={4}>Notas anteriores (escritas antes del historial)</Text>
              <Text size='sm' style={{ whiteSpace: 'pre-line' }}>{data.equipment.legacyNotes}</Text>
            </Paper>
          )}

          {/* Filtros */}
          <Group justify='space-between' wrap='wrap' gap='xs'>
            <Chip.Group
              value={filter}
              onChange={(v) => {
                setFilter(v as HistoryFilter);
                setShown(PAGE);
              }}
            >
              <Group gap={6}>
                {(Object.keys(FILTER_LABELS) as HistoryFilter[]).map((f) => (
                  <Chip key={f} value={f} size='xs'>{FILTER_LABELS[f]}</Chip>
                ))}
              </Group>
            </Chip.Group>
            {autoCount > 0 && filter === 'todo' && (
              <Switch
                size='xs'
                label={`Movimientos automáticos (${autoCount})`}
                checked={showAuto}
                onChange={(e) => setShowAuto(e.currentTarget.checked)}
              />
            )}
          </Group>

          {/* Línea de tiempo por mes */}
          {!visible.length ? (
            <Text c='dimmed' ta='center' py='md'>
              {entries.length ? 'No hay registros de este tipo.' : 'Todavía no hay registros para este equipo.'}
            </Text>
          ) : (
            <Box>
              {groups.map((g) => (
                <Box key={g.key} mb='md'>
                  <Divider label={g.label} labelPosition='left' mb='sm' />
                  <Timeline bulletSize={24} lineWidth={2}>
                    {g.entries.map((entry) => {
                      const kind = classifyHistoryEntry(entry);
                      const k = KIND[kind];
                      return (
                        <Timeline.Item
                          key={entry._id}
                          bullet={k.icon}
                          color={k.color}
                          title={
                            <Group gap='xs' wrap='wrap'>
                              <Badge color={k.color} variant='light' size='sm'>{k.label}</Badge>
                              <Text size='xs' c='dimmed'>
                                {formatDateTime(entry.date)}
                                {entry.userName ? ` · ${entry.userName}` : ''}
                              </Text>
                            </Group>
                          }
                        >
                          <Box mt={4}><EntryBody entry={entry} kind={kind} /></Box>
                        </Timeline.Item>
                      );
                    })}
                  </Timeline>
                </Box>
              ))}
              {visible.length > shown && (
                <Center>
                  <Button variant='subtle' size='xs' onClick={() => setShown((n) => n + PAGE)}>
                    Ver más ({visible.length - shown})
                  </Button>
                </Center>
              )}
            </Box>
          )}
        </Stack>
      )}
    </Modal>
  );
}
