// src/components/StaffLedger/LedgerSummaryCards.tsx
// Encabezado de la cuenta: UNA cifra principal (lo que hay que pagar / cobrar
// hoy, o lo que tiene a favor) y el total generado por mes. Más los avisos de
// eventos sin monto.
'use client';
import { Group, Paper, Text, Badge, Tooltip, Stack } from '@mantine/core';
import { formatPrice } from '@/utils/priceUtils';
import { AllocatedCharge } from '@/utils/staffLedger';
import { generatedByMonth, monthLabel } from '@/utils/staffLedgerViews';

type Summary = {
  pendingToDate: number;
  favor: number;
  missingAmountToDate: number;
  missingAmountFuture: number;
};

const MAX_MONTHS = 6;

export default function LedgerSummaryCards({
  mode,
  summary,
  charges
}: {
  mode: 'admin' | 'employee';
  summary: Summary;
  charges: AllocatedCharge[];
}) {
  // Solo hasta hoy: lo que todavía no pasó no está generado (va como "Por venir")
  const months = generatedByMonth(charges, new Date());
  const shown = months.slice(0, MAX_MONTHS);
  const { missingAmountToDate: toDate, missingAmountFuture: future } = summary;

  const main =
    summary.pendingToDate > 0 ? (
      <>
        <Text size='xs' c='dimmed' tt='uppercase'>{mode === 'admin' ? 'Saldo a pagar hoy' : 'Pendiente de cobro'}</Text>
        <Text fz={28} fw={700} c='orange' className='ledger-num'>{formatPrice(summary.pendingToDate)}</Text>
      </>
    ) : summary.favor > 0 ? (
      <>
        <Text size='xs' c='dimmed' tt='uppercase'>{mode === 'admin' ? 'A favor del empleado' : 'A tu favor'}</Text>
        <Text fz={28} fw={700} c='blue' className='ledger-num'>{formatPrice(summary.favor)}</Text>
        <Text size='xs' c='dimmed'>Se descuenta de lo próximo cuando llega su fecha</Text>
      </>
    ) : (
      <>
        <Text size='xs' c='dimmed' tt='uppercase'>{mode === 'admin' ? 'Saldo a pagar hoy' : 'Pendiente de cobro'}</Text>
        <Text fz={28} fw={700} c='teal' className='ledger-num'>{formatPrice(0)} · al día</Text>
      </>
    );

  return (
    <Paper withBorder radius='md' p='md'>
      <Group align='flex-start' justify='space-between' wrap='wrap' gap='lg'>
        <Stack gap={0}>{main}</Stack>
        <Stack gap={6} style={{ flex: '1 1 260px', maxWidth: 560 }}>
          <Text size='xs' c='dimmed' tt='uppercase'>Total generado por mes</Text>
          {shown.length ? (
            <Group gap='xs' wrap='wrap'>
              {shown.map(([ym, total]) => (
                <Paper key={ym} withBorder radius='sm' px='sm' py={4}>
                  <Text size='xs' c='dimmed' tt='capitalize'>{monthLabel(ym)}</Text>
                  <Text size='sm' fw={600} className='ledger-num'>{formatPrice(total)}</Text>
                </Paper>
              ))}
              {months.length > MAX_MONTHS && <Text size='xs' c='dimmed'>+{months.length - MAX_MONTHS} meses</Text>}
            </Group>
          ) : (
            <Text size='sm' c='dimmed'>Todavía no hay montos cargados.</Text>
          )}
        </Stack>
      </Group>
      {(toDate > 0 || future > 0) && (
        <Group gap='xs' mt='sm'>
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
        </Group>
      )}
    </Paper>
  );
}
