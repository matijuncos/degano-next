// src/components/StaffLedger/LedgerSummaryCards.tsx
'use client';
import { Group, Paper, Text, Badge } from '@mantine/core';
import { formatPrice } from '@/utils/priceUtils';

type AdminSummary = { pendingToDate: number; favor: number; futureTotal: number; missingAmount: number; balance: number };
type EmployeeSummary = { pendingToDate: number; favor: number; nextMonthTotal: number; missingAmount: number };

function Card({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <Paper withBorder p='sm' radius='md' style={{ minWidth: 160, flex: 1 }}>
      <Text size='xs' c='dimmed'>{label}</Text>
      <Text size='xl' fw={700} c={color}>{value}</Text>
    </Paper>
  );
}

export default function LedgerSummaryCards(
  props: { mode: 'admin'; summary: AdminSummary } | { mode: 'employee'; summary: EmployeeSummary }
) {
  const { summary } = props;
  // El pendiente se resalta: es lo que hay que pagar / cobrar ya
  const pendingColor = summary.pendingToDate > 0 ? 'orange' : 'teal';
  const missing = summary.missingAmount > 0 && (
    <Badge color='yellow' variant='light' size='lg'>
      {summary.missingAmount} {summary.missingAmount === 1 ? 'evento sin monto' : 'eventos sin monto'}
    </Badge>
  );

  return (
    <Group gap='sm' align='stretch' wrap='wrap'>
      <Card
        label={props.mode === 'admin' ? 'Pendiente a hoy' : 'Pendiente de cobro'}
        value={formatPrice(summary.pendingToDate)}
        color={pendingColor}
      />
      {summary.favor > 0 && <Card label='Saldo a favor' value={formatPrice(summary.favor)} color='blue' />}
      {props.mode === 'admin' ? (
        <Card label='Total futuro' value={formatPrice(props.summary.futureTotal)} />
      ) : (
        <Card label='Estimado próximo mes' value={formatPrice(props.summary.nextMonthTotal)} />
      )}
      {missing && <Group align='center'>{missing}</Group>}
    </Group>
  );
}
