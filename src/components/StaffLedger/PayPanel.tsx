// src/components/StaffLedger/PayPanel.tsx
// Pago de lo tildado (las 3 vistas). Muestra el total, deja cambiar el monto y,
// antes de confirmar, dice cómo queda: justo, pendiente o lo que sobra (que se
// aplica solo a lo más viejo impago y recién después queda a favor, como hoy).
// 1 request al confirmar (devuelve la cuenta recalculada).
'use client';
import { useEffect, useMemo, useState } from 'react';
import { Stack, Group, Text, NumberInput, Select, Button, Alert, ScrollArea, Anchor, Divider } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import { formatPrice } from '@/utils/priceUtils';
import { ledgerRequest } from '@/hooks/useStaffLedger';
import { amountForRequest } from '@/utils/staffLedgerInput';
import { AllocatedCharge, LedgerSummary, PAYMENT_METHODS, PAYMENT_METHOD_LABELS, arDay, inputDay } from '@/utils/staffLedger';
import { previewBatchPayment, remainingOf } from '@/utils/staffLedgerViews';
import { dayLabel } from './ledgerParts';

export default function PayPanel({
  employeeId,
  charges,
  selected,
  summary,
  now,
  onDone,
  onCancel
}: {
  employeeId: string;
  charges: AllocatedCharge[];
  selected: string[];
  summary: Pick<LedgerSummary, 'pendingToDate' | 'favor'>;
  now: Date;
  onDone: () => void; // pago registrado (limpiar la selección)
  onCancel?: () => void;
}) {
  const lines = useMemo(
    () => charges.filter((c) => selected.includes(c.key) && remainingOf(c) > 0).sort((a, b) => a.date.localeCompare(b.date)),
    [charges, selected]
  );
  const due = lines.reduce((s, c) => s + remainingOf(c), 0);
  // El monto sugerido sigue a la selección hasta que el usuario lo cambia
  const [amount, setAmount] = useState<number | string>(due);
  const [touched, setTouched] = useState(false);
  const [method, setMethod] = useState<string | null>('efectivo');
  const [date, setDate] = useState<string>(arDay(new Date()) as string);
  const [showDate, setShowDate] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!touched) setAmount(due);
  }, [due, touched]);
  // Cambió lo tildado: vuelve al monto sugerido
  const selKey = lines.map((c) => c.key).join(',');
  useEffect(() => {
    setTouched(false);
  }, [selKey]);

  const value = typeof amount === 'number' ? amount : Number(amount) || 0;
  const pv = previewBatchPayment(charges, selected, value, summary, now);

  const pay = async () => {
    setSaving(true);
    try {
      await ledgerRequest('POST', {
        action: 'payLines',
        employeeId,
        chargeKeys: lines.map((c) => c.key),
        amount: amountForRequest(amount),
        method,
        date
      });
      notifications.show({ color: 'teal', message: `Pago de ${formatPrice(value)} registrado` });
      setTouched(false);
      onDone();
    } catch (e: any) {
      notifications.show({ color: 'red', message: e.message });
    } finally {
      setSaving(false);
    }
  };

  if (!lines.length) {
    return <Text size='sm' c='dimmed'>Tildá lo que vas a pagar: se va sumando acá.</Text>;
  }

  const result =
    pv.selectionNet === 0 ? (
      <Alert color='teal' variant='light' p='xs'>Cubre justo lo tildado.</Alert>
    ) : pv.selectionNet < 0 ? (
      <Alert color='orange' variant='light' p='xs'>
        Queda pendiente de lo tildado: <b>{formatPrice(-pv.selectionNet)}</b>. Se cubre primero lo más viejo.
      </Alert>
    ) : (
      <Alert color='blue' variant='light' p='xs'>
        Sobran <b>{formatPrice(pv.selectionNet)}</b>
        {pv.toOldest > 0 ? `: ${formatPrice(pv.toOldest)} van a lo más viejo que falta pagar` : ''}
        {pv.selectionNet - pv.toOldest > 0
          ? `${pv.toOldest > 0 ? ' y ' : ': '}${formatPrice(pv.selectionNet - pv.toOldest)} quedan a favor`
          : ''}
        .
      </Alert>
    );

  return (
    <Stack gap='xs'>
      <ScrollArea.Autosize mah={180}>
        <Stack gap={4}>
          {lines.map((c) => (
            <Group key={c.key} justify='space-between' wrap='nowrap' gap='xs'>
              <Text size='sm' truncate>{dayLabel(c.date)} · {c.label}</Text>
              <Text size='sm' className='ledger-num'>{formatPrice(remainingOf(c))}</Text>
            </Group>
          ))}
        </Stack>
      </ScrollArea.Autosize>
      <Divider />
      <Group justify='space-between'>
        <Text fw={600}>Total tildado</Text>
        <Text fw={700} className='ledger-num'>{formatPrice(due)}</Text>
      </Group>
      <NumberInput
        label='Monto que se paga (se puede cambiar)'
        value={amount}
        onChange={(v) => {
          setTouched(true);
          setAmount(v);
        }}
        prefix='$ '
        thousandSeparator='.'
        decimalSeparator=','
        min={0}
        hideControls
      />
      <Select
        label='Forma de pago'
        data={PAYMENT_METHODS.map((m) => ({ value: m, label: PAYMENT_METHOD_LABELS[m] }))}
        value={method}
        onChange={setMethod}
        allowDeselect={false}
        comboboxProps={{ withinPortal: true }}
      />
      {showDate ? (
        <DateInput label='Fecha del pago' value={date} onChange={(d) => setDate(inputDay(d) ?? date)} valueFormat='DD/MM/YYYY' />
      ) : (
        <Text size='xs' c='dimmed'>
          Fecha: hoy ·{' '}
          <Anchor component='button' type='button' size='xs' onClick={() => setShowDate(true)}>cambiar fecha</Anchor>
        </Text>
      )}
      {result}
      <Text size='xs' c='dimmed'>
        Después de este pago: saldo a pagar hoy <b>{formatPrice(pv.pendingAfter)}</b>
        {pv.favorAfter > 0 ? <> · a favor <b>{formatPrice(pv.favorAfter)}</b></> : null}
      </Text>
      <Group justify='flex-end' gap='xs'>
        {onCancel && <Button variant='default' onClick={onCancel}>Cancelar</Button>}
        <Button onClick={pay} loading={saving} disabled={value <= 0}>Registrar pago</Button>
      </Group>
    </Stack>
  );
}
