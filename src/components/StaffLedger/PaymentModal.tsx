// src/components/StaffLedger/PaymentModal.tsx
'use client';
import { useEffect, useState } from 'react';
import { Modal, Stack, SegmentedControl, NumberInput, Select, TextInput, Button, Group, Text, Anchor } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import { ledgerRequest } from '@/hooks/useStaffLedger';
import { amountForRequest } from '@/utils/staffLedgerInput';
import { Credit, LedgerSummary, PAYMENT_METHODS, PAYMENT_METHOD_LABELS, arDay, inputDay, quickCreditType } from '@/utils/staffLedger';
import { formatPrice } from '@/utils/priceUtils';

const todayDay = () => arDay(new Date()) as string;

export default function PaymentModal({
  opened,
  onClose,
  employeeId,
  summary,
  credit
}: {
  opened: boolean;
  onClose: () => void;
  employeeId: string;
  summary: Pick<LedgerSummary, 'pendingToDate'>;
  credit?: Credit | null; // si viene, es edición
}) {
  // Alta = "pago a cuenta" (plata que no corresponde a un evento puntual; los
  // eventos se pagan con el tilde de la tabla). El tipo sale solo: si se debe
  // algo a hoy es un pago, si no un adelanto. La fecha es hoy salvo que la cambie.
  const [type, setType] = useState<'pago' | 'adelanto'>('pago');
  const [date, setDate] = useState<string>(todayDay());
  const [showDate, setShowDate] = useState(false);
  const [amount, setAmount] = useState<number | string>('');
  const [method, setMethod] = useState<string | null>('efectivo');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!opened) return;
    if (credit) {
      setType(credit.kind);
      setDate(arDay(credit.date) as string);
      setAmount(credit.amount);
      setMethod(credit.method ?? 'efectivo');
      setDescription(credit.description ?? '');
    } else {
      setDate(todayDay());
      setShowDate(false);
      setAmount('');
      setMethod('efectivo');
      setDescription('');
    }
    // summary afuera a propósito: no resetear el formulario si la cuenta se
    // actualiza con el modal abierto
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, credit]);

  const save = async () => {
    setSaving(true);
    try {
      const kind = credit ? type : quickCreditType(summary);
      const body = { type: kind, employeeId, date, amount: amountForRequest(amount), method, description };
      if (credit) await ledgerRequest('PUT', { _id: credit.entryId, ...body });
      else await ledgerRequest('POST', body);
      notifications.show({ color: 'teal', message: credit ? 'Movimiento actualizado' : `${kind === 'pago' ? 'Pago' : 'Adelanto'} registrado` });
      onClose();
    } catch (e: any) {
      notifications.show({ color: 'red', message: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title={credit ? 'Editar pago' : 'Pago a cuenta'} centered>
      <Stack>
        {credit ? (
          <>
            <SegmentedControl
              value={type}
              onChange={(v) => setType(v as 'pago' | 'adelanto')}
              data={[{ value: 'pago', label: 'Pago' }, { value: 'adelanto', label: 'Adelanto' }]}
            />
            <DateInput label='Fecha del pago' value={date} onChange={(d) => setDate(inputDay(d) ?? date)} valueFormat='DD/MM/YYYY' />
          </>
        ) : (
          <Text size='sm' c='dimmed'>
            Para pagar un evento puntual usá la casilla &ldquo;Pagado&rdquo; de la tabla. Esto es para plata a cuenta:
            cubre lo más viejo que esté impago{summary.pendingToDate > 0 ? ` (pendiente a hoy: ${formatPrice(summary.pendingToDate)})` : ' y, si no se debe nada, queda como adelanto'}.
          </Text>
        )}
        <NumberInput
          label='Monto'
          value={amount}
          onChange={setAmount}
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
        />
        <TextInput label='Nota (opcional)' value={description} onChange={(e) => setDescription(e.currentTarget.value)} />
        {!credit &&
          (showDate ? (
            <DateInput label='Fecha del pago' value={date} onChange={(d) => setDate(inputDay(d) ?? date)} valueFormat='DD/MM/YYYY' />
          ) : (
            <Text size='xs' c='dimmed'>
              Fecha: hoy ·{' '}
              <Anchor component='button' type='button' size='xs' onClick={() => setShowDate(true)}>cambiar fecha</Anchor>
            </Text>
          ))}
        <Group justify='flex-end'>
          <Button variant='default' onClick={onClose}>Cancelar</Button>
          <Button onClick={save} loading={saving}>Guardar</Button>
        </Group>
      </Stack>
    </Modal>
  );
}
