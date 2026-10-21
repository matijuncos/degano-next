// src/components/StaffRoles/RolesModal.tsx
// Roles de STAFF y su monto por evento (SOLO ADMIN, es plata).
// Un cambio de monto se guarda "desde" una fecha: los eventos anteriores
// conservan el monto de antes. Los roles no se borran: se archivan.
'use client';
import { useState } from 'react';
import {
  Modal, Stack, Group, Text, Button, Paper, NumberInput, TextInput, Badge, Loader, Center, Alert, ActionIcon, Tooltip, Switch
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { IconPencil, IconCurrencyDollar, IconArchive, IconArchiveOff, IconPlus } from '@tabler/icons-react';
import { useStaffRoles, staffRolesRequest } from '@/hooks/useStaffRoles';
import { useResponsive } from '@/hooks/useResponsive';
import useNotification from '@/hooks/useNotification';
import { formatPrice } from '@/utils/priceUtils';
import { arDay, inputDay } from '@/utils/staffLedger';
import { rateAt, StaffRole } from '@/utils/staffRoles';

const today = () => arDay(new Date()) as string;
const dayLabel = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;

type Editing =
  | { kind: 'new' }
  | { kind: 'name'; role: StaffRole }
  | { kind: 'amount'; role: StaffRole };

export default function RolesModal({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const { data: roles, error } = useStaffRoles();
  const { isMobile } = useResponsive();
  const notify = useNotification();
  const [editing, setEditing] = useState<Editing | null>(null);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState<number | string>('');
  const [from, setFrom] = useState(today());
  const [saving, setSaving] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const start = (e: Editing) => {
    setEditing(e);
    setName(e.kind === 'name' ? e.role.name : '');
    setAmount(e.kind === 'amount' ? rateAt(e.role.rates, today()) ?? '' : '');
    setFrom(today());
  };

  const run = async (method: 'POST' | 'PUT', body: Record<string, unknown>, ok: string) => {
    setSaving(true);
    try {
      await staffRolesRequest(method, body);
      notify({ message: ok });
      setEditing(null);
    } catch (e: any) {
      notify({ type: 'defaultError', message: e?.message || 'No se pudo guardar' });
    } finally {
      setSaving(false);
    }
  };

  const save = () => {
    if (!editing) return;
    if (editing.kind === 'new') {
      return run('POST', { name, ...(amount !== '' ? { amount } : {}) }, `Rol "${name.trim()}" creado`);
    }
    if (editing.kind === 'name') return run('PUT', { _id: editing.role._id, name }, 'Rol renombrado');
    if (amount === '') return notify({ type: 'defaultError', message: 'Cargá el monto' });
    return run('PUT', { _id: editing.role._id, amount, from }, 'Monto actualizado');
  };

  const toggleArchived = (role: StaffRole) =>
    run('PUT', { _id: role._id, archived: !role.archived }, role.archived ? 'Rol reactivado' : 'Rol archivado');

  const visible = (roles ?? []).filter((r) => showArchived || !r.archived);
  const archivedCount = (roles ?? []).filter((r) => r.archived).length;

  return (
    <Modal opened={opened} onClose={onClose} title='Roles de STAFF' size='lg' fullScreen={isMobile} centered>
      <Stack gap='sm'>
        <Text size='sm' c='dimmed'>
          El monto de cada rol se precarga en Cobros cuando alguien trabaja con ese rol en un evento. Si tiene varios
          roles, se suman. Un cambio de monto vale desde la fecha que elijas: los eventos anteriores no cambian.
        </Text>
        <Group justify='space-between' wrap='wrap'>
          <Button leftSection={<IconPlus size={16} />} onClick={() => start({ kind: 'new' })} disabled={!roles}>
            Nuevo rol
          </Button>
          {archivedCount > 0 && (
            <Switch
              label={`Ver archivados (${archivedCount})`}
              checked={showArchived}
              onChange={(e) => setShowArchived(e.currentTarget.checked)}
            />
          )}
        </Group>

        {error ? (
          <Alert color='red'>{error.message}</Alert>
        ) : !roles ? (
          <Center py='xl'><Loader /></Center>
        ) : !visible.length ? (
          <Text c='dimmed' ta='center' py='md'>Todavía no hay roles cargados.</Text>
        ) : (
          <Stack gap='xs'>
            {visible.map((role) => {
              const current = rateAt(role.rates, today());
              const next = (role.rates ?? []).filter((r) => r.from > today());
              const past = (role.rates ?? []).filter((r) => r.from <= today()).slice(0, -1);
              return (
                <Paper key={role._id} withBorder p='sm' style={{ opacity: role.archived ? 0.6 : 1 }}>
                  <Group justify='space-between' wrap='wrap' gap='xs'>
                    <div style={{ minWidth: 0 }}>
                      <Group gap={6}>
                        <Text fw={600}>{role.name}</Text>
                        {role.archived && <Badge size='xs' color='gray'>Archivado</Badge>}
                      </Group>
                      <Text size='sm'>
                        {current != null ? `${formatPrice(current)} por evento` : <Text span c='yellow.5' size='sm'>Sin monto</Text>}
                      </Text>
                      {next.map((r) => (
                        <Text key={r.from} size='xs' c='cyan.4'>
                          Desde el {dayLabel(r.from)}: {formatPrice(r.amount)}
                        </Text>
                      ))}
                      {past.length > 0 && (
                        <Text size='xs' c='dimmed'>
                          Antes: {past.map((r) => `${formatPrice(r.amount)} desde ${dayLabel(r.from)}`).join(' · ')}
                        </Text>
                      )}
                    </div>
                    <Group gap={4} wrap='nowrap'>
                      <Button size='xs' variant='light' leftSection={<IconCurrencyDollar size={14} />} onClick={() => start({ kind: 'amount', role })}>
                        {current != null || next.length ? 'Cambiar monto' : 'Cargar monto'}
                      </Button>
                      <Tooltip label='Renombrar'>
                        <ActionIcon variant='subtle' onClick={() => start({ kind: 'name', role })} aria-label='Renombrar'>
                          <IconPencil size={16} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label={role.archived ? 'Reactivar' : 'Archivar (deja de aparecer para elegir)'}>
                        <ActionIcon
                          variant='subtle'
                          color={role.archived ? 'blue' : 'gray'}
                          onClick={() => toggleArchived(role)}
                          aria-label={role.archived ? 'Reactivar' : 'Archivar'}
                          disabled={saving}
                        >
                          {role.archived ? <IconArchiveOff size={16} /> : <IconArchive size={16} />}
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Group>
                </Paper>
              );
            })}
          </Stack>
        )}
      </Stack>

      <Modal
        opened={!!editing}
        onClose={() => setEditing(null)}
        title={
          editing?.kind === 'new'
            ? 'Nuevo rol'
            : editing?.kind === 'name'
            ? `Renombrar "${editing.role.name}"`
            : `Monto de ${editing?.role.name ?? ''}`
        }
        size='sm'
        zIndex={400}
        centered
      >
        <Stack gap='sm'>
          {editing?.kind !== 'amount' && (
            <TextInput label='Nombre' value={name} onChange={(e) => setName(e.currentTarget.value)} data-autofocus />
          )}
          {editing?.kind !== 'name' && (
            <NumberInput
              label={editing?.kind === 'new' ? 'Monto por evento (opcional)' : 'Monto por evento'}
              value={amount}
              onChange={setAmount}
              prefix='$ '
              thousandSeparator='.'
              decimalSeparator=','
              min={0}
              hideControls
            />
          )}
          {editing?.kind === 'amount' && (
            <DateInput
              label='Desde'
              description='Los eventos desde ese día toman el monto nuevo; los anteriores no cambian.'
              value={from}
              onChange={(d) => setFrom(inputDay(d) ?? from)}
              valueFormat='DD/MM/YYYY'
              popoverProps={{ zIndex: 500 }}
            />
          )}
          {editing?.kind === 'new' && <Text size='xs' c='dimmed'>El monto vale desde hoy.</Text>}
          {editing?.kind === 'name' && (
            <Text size='xs' c='dimmed'>Se actualiza el nombre en todos los eventos que lo usan.</Text>
          )}
          <Group justify='flex-end' gap='xs'>
            <Button variant='default' onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={save} loading={saving} disabled={editing?.kind !== 'amount' && !name.trim()}>
              Guardar
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Modal>
  );
}
