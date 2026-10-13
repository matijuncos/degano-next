// src/components/StaffLedger/LedgerSummaryCards.tsx
'use client';
import { Group, Paper, Text, Badge, Tooltip } from '@mantine/core';
import { formatPrice } from '@/utils/priceUtils';

// Sin monto: los de hoy/pasados (amarillo, hay que cargarlos) y los próximos (celeste, informativo)
type MissingCounts = { missingAmountToDate: number; missingAmountFuture: number };
type AdminSummary = MissingCounts & { pendingToDate: number; favor: number; futureTotal: number; balance: number };
type EmployeeSummary = MissingCounts & { pendingToDate: number; favor: number; nextMonthTotal: number };

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
  const { missingAmountToDate: toDate, missingAmountFuture: future } = summary;
  const missing = (toDate > 0 || future > 0) && (
    <>
      {toDate > 0 && (
        <Tooltip label='Eventos de hoy o pasados que todavía no tienen monto cargado'>
          <Badge color='yellow' variant='light' size='lg'>
            {toDate} {toDate === 1 ? 'evento sin monto' : 'eventos sin monto'}
          </Badge>
        </Tooltip>
      )}
      {future > 0 && (
        <Tooltip label='Eventos que todavía no ocurrieron y no tienen monto (informativo)'>
          <Badge color='cyan' variant='light' size='lg'>
            {future} {future === 1 ? 'próximo sin monto' : 'próximos sin monto'}
          </Badge>
        </Tooltip>
      )}
    </>
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
      {missing && <Group align='center' gap='xs'>{missing}</Group>}
    </Group>
  );
}
