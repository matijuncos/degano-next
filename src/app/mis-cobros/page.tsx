// src/app/mis-cobros/page.tsx
'use client';
import { useMemo } from 'react';
import { withPageAuthRequired } from '@auth0/nextjs-auth0/client';
import { Box, Text, Stack, Center, Loader, Alert } from '@mantine/core';
import { useMyLedger } from '@/hooks/useStaffLedger';
import LedgerSummaryCards from '@/components/StaffLedger/LedgerSummaryCards';
import LedgerTable from '@/components/StaffLedger/LedgerTable';
import PolicySection from '@/components/StaffLedger/PolicySection';

// Lo que el empleado ve de su cuenta: 3 meses atrás y 1 adelante (lo recorta el
// servidor). Solo lectura.
export default withPageAuthRequired(function MisCobrosPage() {
  const { data, error } = useMyLedger();
  const now = useMemo(() => new Date(), [data]);

  if (error) return <Box p='md'><Alert color='red'>{error.message}</Alert></Box>;
  if (!data) return <Center h='60vh'><Loader /></Center>;
  if (!data.linked) return <Center h='60vh' p='md'><Text ta='center'>{data.message}</Text></Center>;

  return (
    <Box p='md'>
      <Stack>
        <div>
          <Text size='xl' fw={700}>Mis cobros</Text>
          <Text size='sm' c='dimmed'>Últimos 3 meses y próximo mes</Text>
        </div>
        <LedgerSummaryCards mode='employee' summary={data.summary} />
        <PolicySection employeeId={data.employeeId} policy={data.policy} canManage={false} />
        <LedgerTable charges={data.charges} credits={data.credits} now={now} />
      </Stack>
    </Box>
  );
});
