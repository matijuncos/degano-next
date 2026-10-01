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
import PolicySection from '@/components/StaffLedger/PolicySection';
import { formatPrice } from '@/utils/priceUtils';
import { AllocatedCharge, Credit } from '@/utils/staffLedger';

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
  const now = useMemo(() => new Date(), [data]);

  if (error) return <Alert color='red'>{error.message}</Alert>;
  if (!data) return <Center h={300}><Loader /></Center>;

  const saveAmount = async (charge: AllocatedCharge, raw: string) => {
    try {
      await ledgerRequest('POST', { type: 'evento', employeeId, eventId: charge.eventId, amount: raw });
      return true;
    } catch (e: any) {
      notifications.show({ color: 'red', message: e.message });
      return false;
    }
  };

  const deleteEntry = async (entryId: string) => {
    if (!confirm('¿Borrar este movimiento?')) return;
    try {
      await ledgerRequest('DELETE', undefined, `?id=${entryId}`);
    } catch (e: any) {
      notifications.show({ color: 'red', message: e.message });
    }
  };

  const setPolicy = (policy: { fileName: string } | null) =>
    mutate<AdminAccountResponse>(
      accountKey(employeeId),
      (d) => d && { ...d, employee: { ...d.employee, insurancePolicy: policy ? { fileName: policy.fileName, uploadedAt: new Date().toISOString() } : null } },
      { revalidate: false }
    );

  return (
    <Stack>
      <Group justify='space-between' wrap='wrap'>
        <div>
          <Text size='xl' fw={700}>{data.employee.fullName}</Text>
          {data.employee.rol && <Text c='dimmed' size='sm'>{data.employee.rol}</Text>}
        </div>
        <Group>
          <Button variant='default' onClick={() => { setEditingExtra(null); setExtraOpen(true); }}>Agregar extra</Button>
          <Button onClick={() => { setEditingCredit(null); setPaymentOpen(true); }}>Registrar pago</Button>
        </Group>
      </Group>

      <LedgerSummaryCards mode='admin' summary={data.summary} />
      <PolicySection employeeId={employeeId} policy={data.employee.insurancePolicy} canManage onChange={setPolicy} />

      <LedgerTable
        charges={data.charges}
        credits={data.credits}
        now={now}
        editable
        onAmountSave={saveAmount}
        onEditCredit={(c) => { setEditingCredit(c); setPaymentOpen(true); }}
        onEditExtra={(c) => { setEditingExtra(c); setExtraOpen(true); }}
        onDeleteEntry={deleteEntry}
      />

      <PaymentModal opened={paymentOpen} onClose={() => setPaymentOpen(false)} employeeId={employeeId} charges={data.charges} credit={editingCredit} />
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
