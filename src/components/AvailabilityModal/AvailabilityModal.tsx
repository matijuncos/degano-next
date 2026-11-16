// src/components/AvailabilityModal/AvailabilityModal.tsx
// Equipamiento → "Disponibilidad": elegís un rango de fechas (se puede cambiar
// cuando quieras) y vas mirando por categoría qué hay libre, qué está ocupado
// (y en qué evento) y qué está fuera de servicio.
// PERF: 1 request por rango (misma disponibilidad que al cargar un evento, con
// caché SWR); cambiar de categoría o buscar no hace requests.
'use client';
import 'dayjs/locale/es';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import {
  Modal, Stack, Group, Text, Select, TextInput, Table, Badge, Loader, Center, Anchor, Paper, UnstyledButton, Alert
} from '@mantine/core';
import { DatePickerInput, DatesRangeValue } from '@mantine/dates';
import { IconSearch, IconChevronDown, IconExternalLink, IconCalendar } from '@tabler/icons-react';
import { EQUIPMENT_SWR_OPTS } from '@/hooks/useEquipmentStatusMap';
import { useResponsive } from '@/hooks/useResponsive';
import { equipmentAvailabilityUrl, formatUseRange } from '@/utils/equipmentAvailability';
import { categoryPaths } from '@/utils/stockExport';
import { rangeFromDays, summarizeAvailability } from '@/utils/availabilityView';

const fetcher = (url: string) =>
  fetch(url, { cache: 'no-store' }).then((r) => {
    if (!r.ok) throw new Error('No se pudo cargar la disponibilidad');
    return r.json();
  });

const today = () => new Date(new Date().setHours(0, 0, 0, 0));

export default function AvailabilityModal({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const { isMobile } = useResponsive();
  // El rango y la categoría quedan mientras se navega (y al reabrir el modal)
  const [range, setRange] = useState<DatesRangeValue>([today(), today()]);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<Set<string>>(() => new Set());

  const r = rangeFromDays(range[0] as any, range[1] as any);
  // Dato REAL: solo las reservas por fechas (la misma regla que al cargar un evento)
  const url = opened && r ? equipmentAvailabilityUrl(r.start, r.end) : null;
  const { data: equipment, error } = useSWR<any[]>(url, fetcher, EQUIPMENT_SWR_OPTS);
  const { data: categories } = useSWR<any[]>(opened ? '/api/categories' : null, fetcher, EQUIPMENT_SWR_OPTS);

  const categoryOptions = useMemo(() => {
    const paths = categoryPaths(categories || []);
    return (categories || [])
      .map((c) => ({ value: String(c._id), label: (paths.get(String(c._id)) || [c.name]).join(' › ') }))
      .sort((a, b) => a.label.localeCompare(b.label, 'es', { numeric: true }));
  }, [categories]);

  const rows = useMemo(
    () => summarizeAvailability(equipment, categories || [], { scopeCategoryId: categoryId, search }),
    [equipment, categories, categoryId, search]
  );
  const totals = rows.reduce((t, x) => ({ available: t.available + x.available, busy: t.busy + x.busy }), { available: 0, busy: 0 });

  const toggle = (key: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const loading = !!url && !equipment && !error;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={<Text fw={700}>Disponibilidad de equipamiento</Text>}
      size='90%'
      fullScreen={isMobile}
    >
      <Stack gap='sm'>
        <Group align='flex-end' gap='sm' wrap='wrap'>
          <DatePickerInput
            type='range'
            label='Fechas'
            locale='es'
            valueFormat='DD/MM/YYYY'
            leftSection={<IconCalendar size={16} />}
            value={range}
            onChange={setRange}
            allowSingleDateInRange
            style={{ flex: '1 1 240px' }}
          />
          <Select
            label='Categoría'
            placeholder='Todo el stock'
            data={categoryOptions}
            value={categoryId}
            onChange={setCategoryId}
            searchable
            clearable
            nothingFoundMessage='Sin resultados'
            style={{ flex: '1 1 260px' }}
          />
          <TextInput
            label='Equipo'
            placeholder='Buscar por nombre'
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            style={{ flex: '1 1 200px' }}
          />
        </Group>

        {!r ? (
          <Text size='sm' c='dimmed'>Elegí el día de inicio y el de fin.</Text>
        ) : (
          <Text size='xs' c='dimmed'>
            Disponible = libre durante TODO el rango (días completos). Ocupado = tiene una reserva que se superpone, aunque sea un rato.
          </Text>
        )}

        {error && <Alert color='red'>{error.message}</Alert>}
        {loading ? (
          <Center h={200}><Loader /></Center>
        ) : r && equipment && !rows.length ? (
          <Text c='dimmed' ta='center' py='lg'>No hay equipos con ese filtro.</Text>
        ) : r && equipment ? (
          <>
            <Group gap='md'>
              <Text size='sm'>Disponibles <b>{totals.available}</b></Text>
              <Text size='sm' c='orange'>Ocupados <b>{totals.busy}</b></Text>
            </Group>
            {/* Celular: solo Equipo / Disp. / Ocup. (el resto va debajo del nombre) */}
            <Table.ScrollContainer minWidth={isMobile ? 0 : 560}>
              <Table striped highlightOnHover verticalSpacing={6}>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Equipo</Table.Th>
                    {!isMobile && <Table.Th ta='center'>Total</Table.Th>}
                    <Table.Th ta='center'>{isMobile ? 'Disp.' : 'Disponibles'}</Table.Th>
                    <Table.Th ta='center'>{isMobile ? 'Ocup.' : 'Ocupados'}</Table.Th>
                    {!isMobile && <Table.Th ta='center'>Fuera de servicio</Table.Th>}
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {rows.map((row) => {
                    const key = `${row.path}|${row.name}`;
                    const expanded = open.has(key);
                    return [
                      <Table.Tr key={key}>
                        <Table.Td>
                          <Text size='sm' fw={500}>{row.name}</Text>
                          <Text size='xs' c='dimmed'>{row.path}</Text>
                          {isMobile && (
                            <Text size='xs' c='dimmed'>
                              Total {row.total}
                              {row.outOfService ? ` · ${row.outOfService} fuera de servicio` : ''}
                            </Text>
                          )}
                        </Table.Td>
                        {!isMobile && <Table.Td ta='center'>{row.total}</Table.Td>}
                        <Table.Td ta='center'>
                          <Badge color={row.available ? 'green' : 'gray'} variant='light'>{row.available}</Badge>
                        </Table.Td>
                        <Table.Td ta='center'>
                          {row.busy ? (
                            <UnstyledButton onClick={() => toggle(key)} aria-expanded={expanded}>
                              <Badge
                                color='orange'
                                variant='light'
                                rightSection={<IconChevronDown size={12} style={{ transform: expanded ? 'rotate(180deg)' : undefined }} />}
                              >
                                {row.busy}
                              </Badge>
                            </UnstyledButton>
                          ) : (
                            <Text size='sm' c='dimmed'>0</Text>
                          )}
                        </Table.Td>
                        {!isMobile && (
                          <Table.Td ta='center'>
                            <Text size='sm' c={row.outOfService ? 'red' : 'dimmed'}>{row.outOfService}</Text>
                          </Table.Td>
                        )}
                      </Table.Tr>,
                      expanded && (
                        <Table.Tr key={`${key}-ev`}>
                          <Table.Td colSpan={isMobile ? 3 : 5}>
                            <Stack gap={6}>
                              {row.events.map((ev) => (
                                <Paper key={ev.eventId} withBorder p='xs' radius='sm'>
                                  <Group justify='space-between' wrap='wrap' gap='xs'>
                                    <div>
                                      <Text size='sm' fw={600}>
                                        {[ev.eventType, ev.clientName].filter(Boolean).join(' · ')}
                                        <Text span size='xs' c='dimmed'> ({ev.units} {ev.units === 1 ? 'unidad' : 'unidades'})</Text>
                                      </Text>
                                      <Text size='xs' c='dimmed'>
                                        {[ev.location, formatUseRange(ev.startDate, ev.endDate)].filter(Boolean).join(' · ')}
                                      </Text>
                                    </div>
                                    {/* Pestaña nueva: no se pierde lo que se está mirando */}
                                    <Anchor href={`/event/${ev.eventId}`} target='_blank' rel='noopener noreferrer' size='xs'>
                                      Ver evento <IconExternalLink size={12} />
                                    </Anchor>
                                  </Group>
                                </Paper>
                              ))}
                            </Stack>
                          </Table.Td>
                        </Table.Tr>
                      )
                    ];
                  })}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          </>
        ) : null}
      </Stack>
    </Modal>
  );
}
