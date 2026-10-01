// src/components/StaffLedger/PaymentModal.tsx
'use client';
import { useEffect, useState } from 'react';
import { Modal, Stack, SegmentedControl, NumberInput, Select, TextInput, Button, Group, Text } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import { ledgerRequest } from '@/hooks/useStaffLedger';
import { AllocatedCharge, Credit, PAYMENT_METHODS, PAYMENT_METHOD_LABELS, pendingUpTo, arDay, inputDay } from '@/utils/staffLedger';
import { formatPrice } from '@/utils/priceUtils';

const todayDay = () => arDay(new Date()) as string;

export default function PaymentModal({
  opened,
  onClose,
  employeeId,
  charges,
  credit
}: {
  opened: boolean;
  onClose: () => void;
  employeeId: string;
  charges: AllocatedCharge[];
  credit?: Credit | null; // si viene, es edición
}) {
  const [type, setType] = useState<'pago' | 'adelanto'>('pago');
  const [date, setDate] = useState<string>(todayDay());
  const [upTo, setUpTo] = useState<string>(todayDay());
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
      const today = todayDay();
      setType('pago');
      setDate(today);
      setUpTo(today);
      setAmount(pendingUpTo(charges, today) || '');
      setMethod('efectivo');
      setDescription('');
    }
  }, [opened, credit, charges]);

  // "Pagar hasta": precarga el monto con lo impago hasta ese día (editable)
  const upToPending = pendingUpTo(charges, upTo);

  const save = async () => {
    setSaving(true);
    try {
      const body = { type, employeeId, date, amount, method, description };
      if (credit) await ledgerRequest('PUT', { _id: credit.entryId, ...body });
      else await ledgerRequest('POST', body);
      notifications.show({ color: 'teal', message: credit ? 'Movimiento actualizado' : `${type === 'pago' ? 'Pago' : 'Adelanto'} registrado` });
      onClose();
    } catch (e: any) {
      notifications.show({ color: 'red', message: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title={credit ? 'Editar pago' : 'Registrar pago'} centered>
      <Stack>
        <SegmentedControl
          value={type}
          onChange={(v) => setType(v as 'pago' | 'adelanto')}
          data={[{ value: 'pago', label: 'Pago' }, { value: 'adelanto', label: 'Adelanto' }]}
        />
        <DateInput label='Fecha del pago' value={date} onChange={(d) => setDate(inputDay(d) ?? date)} valueFormat='DD/MM/YYYY' />
        {!credit && type === 'pago' && (
          <Group align='end' wrap='nowrap'>
            <DateInput
              label='Pagar lo pendiente hasta'
              value={upTo}
              onChange={(d) => {
                const day = inputDay(d);
                if (!day) return;
                setUpTo(day);
                setAmount(pendingUpTo(charges, day) || '');
              }}
              valueFormat='DD/MM/YYYY'
              style={{ flex: 1 }}
            />
            <Text size='sm' c='dimmed' pb={8}>{formatPrice(upToPending)}</Text>
          </Group>
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
        <Group justify='flex-end'>
          <Button variant='default' onClick={onClose}>Cancelar</Button>
          <Button onClick={save} loading={saving}>Guardar</Button>
        </Group>
      </Stack>
    </Modal>
  );
}
