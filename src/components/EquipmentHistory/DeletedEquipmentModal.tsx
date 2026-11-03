'use client';
// Equipos eliminados: el equipo ya no está en el stock, pero su historial
// queda para siempre. Desde acá se abre la vida completa de cada uno.
// Requests: 1 al abrir la lista; abrir un equipo = 1 más (su historial).
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { Modal, Stack, TextInput, Text, Paper, Group, Badge, Loader, Center, Alert, UnstyledButton } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { useResponsive } from '@/hooks/useResponsive';
import EquipmentHistoryModal from './EquipmentHistoryModal';

type DeletedRow = { _id: string; name: string; code: string; lastDate: string; entries: number };

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'Error al cargar los equipos eliminados');
  return data;
};

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function DeletedEquipmentModal({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const { isMobile } = useResponsive();
  const { data, error } = useSWR<DeletedRow[]>(opened ? '/api/equipmentHistory?deleted=1' : null, fetcher, {
    revalidateOnFocus: false
  });
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<DeletedRow | null>(null);

  const rows = useMemo(() => {
    const q = norm(search.trim());
    return (data ?? []).filter((r) => !q || norm(`${r.name} ${r.code}`).includes(q));
  }, [data, search]);

  return (
    <>
      <Modal opened={opened} onClose={onClose} title='Equipos eliminados' size='lg' fullScreen={isMobile}>
        <Stack gap='sm' pb={isMobile ? 70 : 0}>
          <Text size='sm' c='dimmed'>
            Ya no están en el stock, pero su historial se conserva. Tocá uno para ver su vida completa.
          </Text>
          <TextInput
            placeholder='Buscar por nombre o código'
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
          />
          {error ? (
            <Alert color='red'>{error.message}</Alert>
          ) : !data ? (
            <Center py='xl'><Loader /></Center>
          ) : !rows.length ? (
            <Text c='dimmed' ta='center' py='md'>{search ? 'Ningún equipo coincide.' : 'No hay equipos eliminados.'}</Text>
          ) : (
            <Stack gap={6}>
              {rows.map((r) => (
                <UnstyledButton key={r._id} onClick={() => setSelected(r)}>
                  <Paper withBorder p='xs'>
                    <Group justify='space-between' wrap='nowrap' gap='xs'>
                      <div style={{ minWidth: 0 }}>
                        <Text size='sm' fw={600} truncate>{r.name}</Text>
                        <Text size='xs' c='dimmed'>
                          {[r.code, `último registro ${new Date(r.lastDate).toLocaleDateString('es-AR')}`].filter(Boolean).join(' · ')}
                        </Text>
                      </div>
                      <Badge variant='light' color='gray'>{r.entries} {r.entries === 1 ? 'registro' : 'registros'}</Badge>
                    </Group>
                  </Paper>
                </UnstyledButton>
              ))}
            </Stack>
          )}
        </Stack>
      </Modal>
      <EquipmentHistoryModal
        opened={!!selected}
        onClose={() => setSelected(null)}
        equipmentId={selected?._id ?? ''}
        equipmentName={selected?.name ?? ''}
      />
    </>
  );
}
