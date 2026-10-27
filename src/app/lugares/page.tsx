// src/app/lugares/page.tsx
// Panel de Lugares (salones / venues). Editar un lugar actualiza sus datos en
// los eventos de HOY EN ADELANTE; los pasados conservan lo que figuraba.
// Requests: 1 al entrar (/api/salons?withUsage=1: lugares + cuántos eventos
// tiene cada uno). Guardar = 1 request y se recarga la lista.
'use client';
import { useMemo, useState } from 'react';
import useSWR, { mutate } from 'swr';
import { withPageAuthRequired } from '@auth0/nextjs-auth0/client';
import {
  Box, Text, Group, Stack, Button, TextInput, Table, Badge, ActionIcon, Tooltip, Paper, Skeleton, Alert, Center, Loader
} from '@mantine/core';
import { IconSearch, IconPencil, IconArrowMerge, IconPlus, IconMapPin, IconAlertTriangle } from '@tabler/icons-react';
import { usePermissions } from '@/hooks/usePermissions';
import { useResponsive } from '@/hooks/useResponsive';
import VenueModal from '@/components/Venues/VenueModal';
import MergeVenueModal from '@/components/Venues/MergeVenueModal';
import { Salon, VenueUsage } from '@/utils/venues';
import { normalizeMapsUrl } from '@/utils/mapsUtils';

const VENUES_KEY = '/api/salons?withUsage=1';

type VenuesResponse = {
  salons: Salon[];
  usage: Record<string, VenueUsage>;
  orphans: ({ name: string } & VenueUsage)[];
  duplicates: string[];
};

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'Error al cargar los lugares');
  return data;
};

const collator = new Intl.Collator('es', { sensitivity: 'base', numeric: true });
const searchKey = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function UsageText({ u }: { u?: VenueUsage }) {
  if (!u?.total) return <Text size='sm' c='dimmed'>Sin eventos</Text>;
  return (
    <Text size='sm'>
      {u.upcoming > 0 ? <b>{u.upcoming} {u.upcoming === 1 ? 'próximo' : 'próximos'}</b> : 'Ninguno próximo'}
      <Text span size='xs' c='dimmed'> · {u.total} en total</Text>
    </Text>
  );
}

export default withPageAuthRequired(function LugaresPage() {
  // Lo ven admin y manager; SOLO el admin modifica (editar, crear, unir)
  const { isAdmin, isManager, isLoading } = usePermissions();
  const { isMobile } = useResponsive();
  const canView = isAdmin || isManager;
  const { data, error } = useSWR<VenuesResponse>(canView ? VENUES_KEY : null, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30_000
  });
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Partial<Salon> | null>(null);
  const [merging, setMerging] = useState<Salon | null>(null);

  const salons = useMemo(() => {
    const q = searchKey(search.trim());
    return [...(data?.salons ?? [])]
      .filter((s) => !q || searchKey([s.name, s.city, s.address].filter(Boolean).join(' ')).includes(q))
      .sort((a, b) => collator.compare(a.name, b.name));
  }, [data, search]);
  const duplicates = useMemo(() => new Set(data?.duplicates ?? []), [data]);

  if (isLoading) return <Center h='60vh'><Loader /></Center>;
  if (!canView) return <Center h='60vh'><Text>No tenés permisos para ver esta sección.</Text></Center>;

  // Tras guardar o unir: se recarga la lista y la de eventos (calendario, listas)
  const refresh = () => {
    mutate(VENUES_KEY);
    mutate('/api/getEvents');
  };

  const actions = (s: Salon) =>
    isAdmin ? (
      <Group gap={4} wrap='nowrap'>
        <Tooltip label='Editar'>
          <ActionIcon variant='subtle' onClick={() => setEditing(s)} aria-label='Editar'>
            <IconPencil size={16} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label='Unir con otro lugar (si es el mismo)'>
          <ActionIcon variant='subtle' color='gray' onClick={() => setMerging(s)} aria-label='Unir'>
            <IconArrowMerge size={16} />
          </ActionIcon>
        </Tooltip>
      </Group>
    ) : null;

  // El link se valida también al mostrarlo (https + Google Maps): una ficha
  // vieja, cargada antes de que el servidor validara, no puede inyectar otra cosa
  const nameCell = (s: Salon) => {
    const mapsHref = s.mapsUrl ? normalizeMapsUrl(s.mapsUrl) : null;
    return (
    <Group gap={6} wrap='nowrap'>
      <Text fw={600} size='sm'>{s.name}</Text>
      {mapsHref && (
        <Tooltip label='Ver en Google Maps'>
          <ActionIcon component='a' href={mapsHref} target='_blank' rel='noopener noreferrer' variant='subtle' size='sm' aria-label='Maps'>
            <IconMapPin size={14} />
          </ActionIcon>
        </Tooltip>
      )}
      {duplicates.has(s._id) && (
        <Tooltip label='Hay otro lugar con el mismo nombre. Si es el mismo, unilos.'>
          <Badge size='xs' color='yellow' variant='light' leftSection={<IconAlertTriangle size={10} />}>Duplicado</Badge>
        </Tooltip>
      )}
    </Group>
    );
  };

  const place = (s: Salon) => [s.city, s.province].filter(Boolean).join(', ');
  const contact = (s: Salon) => [s.contactName, s.contactPhone].filter(Boolean).join(' · ');

  return (
    <Box p='md'>
      <Group justify='space-between' mb='xs' wrap='wrap'>
        <Text size='xl' fw={700}>Lugares</Text>
        {isAdmin && (
          <Button leftSection={<IconPlus size={16} />} onClick={() => setEditing({})} disabled={!data}>
            Nuevo lugar
          </Button>
        )}
      </Group>
      <Text size='sm' c='dimmed' mb='md'>
        {isAdmin
          ? 'Los cambios se aplican a los eventos de hoy en adelante. Los eventos pasados conservan los datos que tenían.'
          : 'Solo lectura: los cambios los hace un administrador.'}
      </Text>
      <TextInput
        placeholder='Buscar por nombre, ciudad o dirección'
        leftSection={<IconSearch size={16} />}
        value={search}
        onChange={(e) => setSearch(e.currentTarget.value)}
        mb='md'
        maw={isMobile ? undefined : 420}
      />

      {error ? (
        <Alert color='red'>{error.message}</Alert>
      ) : !data ? (
        <Stack gap='xs'>{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} h={isMobile ? 90 : 40} />)}</Stack>
      ) : !salons.length ? (
        <Text c='dimmed' ta='center' py='xl'>{search ? 'Ningún lugar coincide con la búsqueda.' : 'No hay lugares cargados.'}</Text>
      ) : isMobile ? (
        <Stack gap='xs'>
          {salons.map((s) => (
            <Paper key={s._id} withBorder p='sm'>
              <Group justify='space-between' align='flex-start' wrap='nowrap'>
                <Stack gap={2} style={{ minWidth: 0 }}>
                  {nameCell(s)}
                  {place(s) && <Text size='xs' c='dimmed'>{place(s)}</Text>}
                  {s.address && <Text size='xs'>{s.address}</Text>}
                  {contact(s) && <Text size='xs'>{contact(s)}</Text>}
                  <UsageText u={data.usage[s._id]} />
                </Stack>
                {actions(s)}
              </Group>
            </Paper>
          ))}
        </Stack>
      ) : (
        <Table.ScrollContainer minWidth={760}>
          <Table striped highlightOnHover verticalSpacing='xs'>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Lugar</Table.Th>
                <Table.Th>Ciudad</Table.Th>
                <Table.Th>Dirección</Table.Th>
                <Table.Th>Contacto</Table.Th>
                <Table.Th>Eventos</Table.Th>
                {isAdmin && <Table.Th />}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {salons.map((s) => (
                <Table.Tr key={s._id}>
                  <Table.Td>{nameCell(s)}</Table.Td>
                  <Table.Td><Text size='sm'>{place(s) || '—'}</Text></Table.Td>
                  <Table.Td><Text size='sm'>{s.address || '—'}</Text></Table.Td>
                  <Table.Td><Text size='sm'>{contact(s) || '—'}</Text></Table.Td>
                  <Table.Td><UsageText u={data.usage[s._id]} /></Table.Td>
                  {isAdmin && <Table.Td>{actions(s)}</Table.Td>}
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}

      {/* Nombres de lugar usados en eventos que no tienen ficha */}
      {data && data.orphans.length > 0 && (
        <Paper withBorder p='sm' mt='lg'>
          <Text fw={600} size='sm'>Usados en eventos, sin ficha de lugar</Text>
          <Text size='xs' c='dimmed' mb='xs'>
            Están escritos en algún evento pero no hay un lugar cargado con ese nombre.
            {isAdmin ? ' Creá la ficha, o si es un lugar que ya existe escrito distinto, corregilo en el evento.' : ''}
          </Text>
          <Stack gap={6}>
            {data.orphans.map((o) => (
              <Group key={o.name} justify='space-between' wrap='nowrap'>
                <div style={{ minWidth: 0 }}>
                  <Text size='sm' truncate>{o.name}</Text>
                  <UsageText u={o} />
                </div>
                {isAdmin && (
                  <Button size='xs' variant='light' onClick={() => setEditing({ name: o.name })}>Crear ficha</Button>
                )}
              </Group>
            ))}
          </Stack>
        </Paper>
      )}

      <VenueModal
        salon={editing}
        upcoming={editing?._id ? data?.usage[editing._id]?.upcoming ?? 0 : 0}
        onClose={() => setEditing(null)}
        onSaved={refresh}
      />
      <MergeVenueModal
        source={merging}
        salons={data?.salons ?? []}
        usage={data?.usage ?? {}}
        onClose={() => setMerging(null)}
        onMerged={refresh}
      />
    </Box>
  );
});
