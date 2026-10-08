// src/app/cobros-staff/page.tsx
'use client';
import { useMemo, useState } from 'react';
import { mutate } from 'swr';
import { withPageAuthRequired } from '@auth0/nextjs-auth0/client';
import {
  Box, Text, Group, Stack, Button, Loader, Center, NavLink, Badge, ScrollArea, Tabs, Skeleton, Alert
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { usePermissions } from '@/hooks/usePermissions';
import { useResponsive } from '@/hooks/useResponsive';
import { useLedgerSummaries, useEmployeeAccount, ledgerRequest, accountKey, AdminAccountResponse } from '@/hooks/useStaffLedger';
import LedgerSummaryCards from '@/components/StaffLedger/LedgerSummaryCards';
import LedgerTable from '@/components/StaffLedger/LedgerTable';
import PaymentModal from '@/components/StaffLedger/PaymentModal';
import ExtraModal from '@/components/StaffLedger/ExtraModal';
import FixedModal, { FixedModalMode } from '@/components/StaffLedger/FixedModal';
import FixedList from '@/components/StaffLedger/FixedList';
import { formatPrice } from '@/utils/priceUtils';
import { useConfirm } from '@/components/ConfirmModal/useConfirm';
import { AllocatedCharge, Credit, FixedDef, PaymentMethod, tickCreditType, arDay, round2 } from '@/utils/staffLedger';

const collator = new Intl.Collator('es', { sensitivity: 'base', numeric: true });

function EmployeeList({ selected, onSelect }: { selected: string | null; onSelect: (id: string) => void }) {
  const { data, error } = useLedgerSummaries();
  // Más pendiente primero, después alfabético
  const rows = useMemo(
    () =>
      [...(data ?? [])].sort(
        (a, b) => b.summary.pendingToDate - a.summary.pendingToDate || collator.compare(a.fullName, b.fullName)
      ),
    [data]
  );
  if (error) return <Alert color='red'>{error.message}</Alert>;
  if (!data) return <Stack gap='xs'>{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} h={44} />)}</Stack>;
  if (!rows.length) return <Text c='dimmed' ta='center'>No hay empleados de STAFF cargados.</Text>;

  return (
    <Stack gap={2}>
      {rows.map((r) => (
        <NavLink
          key={r.employeeId}
          active={selected === r.employeeId}
          onClick={() => onSelect(r.employeeId)}
          label={r.fullName || 'Sin nombre'}
          description={r.rol || undefined}
          rightSection={
            <Group gap={4} wrap='nowrap'>
              {r.summary.missingAmount > 0 && <Badge size='xs' color='yellow' variant='light'>{r.summary.missingAmount} sin monto</Badge>}
              {r.summary.pendingToDate > 0 ? (
                <Badge color='orange' variant='light'>{formatPrice(r.summary.pendingToDate)}</Badge>
              ) : r.summary.favor > 0 ? (
                <Badge color='blue' variant='light'>A favor</Badge>
              ) : null}
            </Group>
          }
        />
      ))}
    </Stack>
  );
}

function AccountDetail({ employeeId }: { employeeId: string }) {
  const { data, error } = useEmployeeAccount(employeeId);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [editingCredit, setEditingCredit] = useState<Credit | null>(null);
  const [extraOpen, setExtraOpen] = useState(false);
  const [editingExtra, setEditingExtra] = useState<AllocatedCharge | null>(null);
  const [fixedModal, setFixedModal] = useState<{ mode: FixedModalMode; fixed: FixedDef | null } | null>(null);
  const now = useMemo(() => new Date(), [data]);
  const [confirm, confirmModal] = useConfirm();

  if (error) return <Alert color='red'>{error.message}</Alert>;
  if (!data) return <Center h={300}><Loader /></Center>;

  const saveAmount = async (charge: AllocatedCharge, raw: string) => {
    try {
      await ledgerRequest('POST', { type: 'evento', employeeId, eventId: charge.eventId, amount: raw, source: charge.source });
      return true;
    } catch (e: any) {
      notifications.show({ color: 'red', message: e.message });
      return false;
    }
  };

  // Rol en el evento: se guarda en el evento (lo ven la vista del evento y el calendario)
  const saveRol = async (charge: AllocatedCharge, rol: string) => {
    try {
      await ledgerRequest('POST', { action: 'eventRol', employeeId, eventId: charge.eventId, rol, source: charge.source });
      return true;
    } catch (e: any) {
      notifications.show({ color: 'red', message: e.message });
      return false;
    }
  };

  // Tilde: paga lo que falta de esa línea, con fecha de hoy. Evento futuro → adelanto.
  const tick = async (charge: AllocatedCharge, method: PaymentMethod) => {
    try {
      await ledgerRequest('POST', {
        type: tickCreditType(charge, new Date()),
        employeeId,
        // Día argentino: un ISO en UTC a la noche ya es el día siguiente
        date: arDay(new Date()),
        amount: round2((charge.amount ?? 0) - charge.paidAmount),
        method,
        chargeKey: charge.key
      });
      return true;
    } catch (e: any) {
      notifications.show({ color: 'red', message: e.message });
      return false;
    }
  };

  const untick = async (charge: AllocatedCharge) => {
    try {
      await ledgerRequest('DELETE', undefined, `?employeeId=${employeeId}&chargeKey=${encodeURIComponent(charge.key)}`);
      return true;
    } catch (e: any) {
      notifications.show({ color: 'red', message: e.message });
      return false;
    }
  };

  const deleteEntry = async (entryId: string) => {
    const ok = await confirm({
      title: '¿Borrar este movimiento?',
      message: 'Se recalcula la cuenta del empleado. No se puede deshacer.',
      confirmLabel: 'Borrar'
    });
    if (!ok) return;
    try {
      await ledgerRequest('DELETE', undefined, `?id=${entryId}`);
    } catch (e: any) {
      notifications.show({ color: 'red', message: e.message });
    }
  };

  return (
    <Stack>
      <Group justify='space-between' wrap='wrap'>
        <div>
          <Text size='xl' fw={700}>{data.employee.fullName}</Text>
          {data.employee.rol && <Text c='dimmed' size='sm'>{data.employee.rol}</Text>}
        </div>
        <Group>
          <Button variant='default' onClick={() => setFixedModal({ mode: 'create', fixed: null })}>Agregar fijo</Button>
          <Button variant='default' onClick={() => { setEditingExtra(null); setExtraOpen(true); }}>Agregar extra</Button>
          <Button onClick={() => { setEditingCredit(null); setPaymentOpen(true); }}>Pago a cuenta</Button>
        </Group>
      </Group>

      <LedgerSummaryCards mode='admin' summary={data.summary} />

      <FixedList
        fixed={data.fixed ?? []}
        onAction={(mode, fixed) => setFixedModal({ mode, fixed })}
        onDelete={async (fixed) => {
          const ok = await confirm({
            title: '¿Borrar este fijo?',
            message: `Se borran TODOS los meses de "${fixed.description}", también los pasados. Si solo querés que deje de generarse, usá "Dar de baja".`,
            confirmLabel: 'Borrar'
          });
          if (!ok) return;
          try {
            await ledgerRequest('DELETE', undefined, `?id=${fixed.entryId}`);
          } catch (e: any) {
            notifications.show({ color: 'red', message: e.message });
          }
        }}
      />

      <LedgerTable
        charges={data.charges}
        credits={data.credits}
        now={now}
        editable
        onAmountSave={saveAmount}
        onRolSave={saveRol}
        onEditCredit={(c) => { setEditingCredit(c); setPaymentOpen(true); }}
        onEditExtra={(c) => { setEditingExtra(c); setExtraOpen(true); }}
        onDeleteEntry={deleteEntry}
        onTick={tick}
        onUntick={untick}
      />

      <PaymentModal opened={paymentOpen} onClose={() => setPaymentOpen(false)} employeeId={employeeId} summary={data.summary} credit={editingCredit} />
      {confirmModal}
      <FixedModal
        opened={!!fixedModal}
        onClose={() => setFixedModal(null)}
        employeeId={employeeId}
        mode={fixedModal?.mode ?? 'create'}
        fixed={fixedModal?.fixed}
      />
      <ExtraModal opened={extraOpen} onClose={() => setExtraOpen(false)} employeeId={employeeId} extra={editingExtra} />
    </Stack>
  );
}

export default withPageAuthRequired(function CobrosStaffPage() {
  const { isAdmin, isLoading } = usePermissions();
  const { isMobile, isTablet } = useResponsive();
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<string | null>('list');

  if (isLoading) return <Center h='60vh'><Loader /></Center>;
  if (!isAdmin) return <Center h='60vh'><Text>No tenés permisos para ver esta sección.</Text></Center>;

  const select = (id: string) => { setSelected(id); setTab('detail'); };

  if (isMobile || isTablet) {
    return (
      <Box p='md'>
        <Text size='xl' fw={700} mb='md'>Cobros STAFF</Text>
        <Tabs value={tab} onChange={setTab}>
          <Tabs.List>
            <Tabs.Tab value='list'>Empleados</Tabs.Tab>
            <Tabs.Tab value='detail' disabled={!selected}>Detalle</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value='list' pt='md'><EmployeeList selected={selected} onSelect={select} /></Tabs.Panel>
          <Tabs.Panel value='detail' pt='md'>{selected && <AccountDetail key={selected} employeeId={selected} />}</Tabs.Panel>
        </Tabs>
      </Box>
    );
  }

  return (
    <Box p='md'>
      <Text size='xl' fw={700} mb='md'>Cobros STAFF</Text>
      <Group align='flex-start' wrap='nowrap' gap='lg'>
        <ScrollArea h='calc(100vh - 120px)' w={320} style={{ flexShrink: 0 }}>
          <EmployeeList selected={selected} onSelect={select} />
        </ScrollArea>
        <Box style={{ flex: 1, minWidth: 0 }}>
          {selected ? (
            <AccountDetail key={selected} employeeId={selected} />
          ) : (
            <Center h={300}><Text c='dimmed'>Elegí un empleado para ver su cuenta.</Text></Center>
          )}
        </Box>
      </Group>
    </Box>
  );
});
