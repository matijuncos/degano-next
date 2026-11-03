// src/components/Venues/MergeVenueModal.tsx
// Unir dos lugares que son el mismo (SOLO ADMIN). Los eventos de hoy en
// adelante del que se va pasan al que queda; se borra la ficha duplicada.
'use client';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Stack, Select, Group, Button, Alert, Text } from '@mantine/core';
import useNotification from '@/hooks/useNotification';
import { Salon, VenueUsage, venueLooseKey } from '@/utils/venues';

export default function MergeVenueModal({
  source,
  salons,
  usage,
  onClose,
  onMerged
}: {
  source: Salon | null;
  salons: Salon[];
  usage: Record<string, VenueUsage>;
  onClose: () => void;
  onMerged: () => void;
}) {
  const notify = useNotification();
  const [targetId, setTargetId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Si hay uno con el mismo nombre (sin tildes/mayúsculas), se propone ese
  // Solo al abrir (cambia el lugar a unir): si la lista se recarga con el modal
  // abierto, no se pierde lo que eligió el usuario
  useEffect(() => {
    if (!source) return setTargetId(null);
    const twin = salons.find((s) => s._id !== source._id && venueLooseKey(s.name) === venueLooseKey(source.name));
    setTargetId(twin?._id ?? null);
  }, [source?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  const options = useMemo(
    () =>
      salons
        .filter((s) => s._id !== source?._id)
        .map((s) => ({ value: s._id, label: [s.name, s.city].filter(Boolean).join(' · ') })),
    [salons, source]
  );
  const target = salons.find((s) => s._id === targetId);
  const upcoming = source ? usage[source._id]?.upcoming ?? 0 : 0;

  const merge = async () => {
    if (!source || !targetId) return;
    setSaving(true);
    try {
      const res = await fetch('/api/salons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'merge', sourceId: source._id, targetId })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'No se pudieron unir los lugares');
      notify({ message: `"${source.name}" se unió a "${target?.name}"` });
      onMerged();
      onClose();
    } catch (e: any) {
      notify({ type: 'defaultError', message: e?.message || 'No se pudieron unir los lugares' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal opened={!!source} onClose={onClose} title={`Unir "${source?.name ?? ''}" con otro lugar`} centered>
      <Stack gap='sm'>
        <Text size='sm'>Usalo cuando el mismo lugar quedó cargado dos veces (por ejemplo, escrito distinto).</Text>
        <Select
          label='Queda este lugar'
          placeholder='Elegí el lugar que queda'
          data={options}
          value={targetId}
          onChange={setTargetId}
          searchable
          comboboxProps={{ withinPortal: true }}
        />
        {target && (
          <Alert color='yellow' variant='light'>
            {upcoming > 0
              ? `${upcoming} evento${upcoming === 1 ? '' : 's'} de hoy en adelante pasan a "${target.name}" con sus datos. `
              : 'No hay eventos de hoy en adelante para pasar. '}
            Se borra la ficha de &quot;{source?.name}&quot;. Los eventos pasados conservan el nombre que tenían.
          </Alert>
        )}
        <Group justify='flex-end' gap='xs'>
          <Button variant='default' onClick={onClose}>Cancelar</Button>
          <Button color='yellow' onClick={merge} loading={saving} disabled={!targetId}>Unir</Button>
        </Group>
      </Stack>
    </Modal>
  );
}
