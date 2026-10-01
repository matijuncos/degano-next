// src/components/StaffLedger/ExtraModal.tsx
'use client';
import { useEffect, useState } from 'react';
import { Modal, Stack, NumberInput, TextInput, Button, Group } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import { ledgerRequest } from '@/hooks/useStaffLedger';
import { AllocatedCharge, arDay, inputDay } from '@/utils/staffLedger';

const todayDay = () => arDay(new Date()) as string;

// Extra laboral que no es de un evento (ej. "Depósito")
export default function ExtraModal({
  opened,
  onClose,
  employeeId,
  extra
}: {
  opened: boolean;
  onClose: () => void;
  employeeId: string;
  extra?: AllocatedCharge | null;
}) {
  const [date, setDate] = useState(todayDay());
  const [description, setDescription] = useState('');
  const [hours, setHours] = useState<number | string>('');
  const [amount, setAmount] = useState<number | string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!opened) return;
    setDate(extra ? (arDay(extra.date) as string) : todayDay());
    setDescription(extra?.label ?? '');
    setHours(extra?.hours ?? '');
    setAmount(extra?.amount ?? '');
  }, [opened, extra]);

  const save = async () => {
    setSaving(true);
    try {
      const body = { type: 'extra', employeeId, date, description, hours, amount };
      if (extra?.entryId) await ledgerRequest('PUT', { _id: extra.entryId, ...body });
      else await ledgerRequest('POST', body);
      notifications.show({ color: 'teal', message: extra ? 'Extra actualizado' : 'Extra agregado' });
      onClose();
    } catch (e: any) {
      notifications.show({ color: 'red', message: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title={extra ? 'Editar extra' : 'Agregar extra laboral'} centered>
      <Stack>
        <DateInput label='Fecha' value={date} onChange={(d) => setDate(inputDay(d) ?? date)} valueFormat='DD/MM/YYYY' />
        <TextInput label='Descripción' placeholder='Ej: Depósito' value={description} onChange={(e) => setDescription(e.currentTarget.value)} />
        <NumberInput label='Horas (opcional)' value={hours} onChange={setHours} min={0} decimalScale={1} hideControls />
        <NumberInput label='Monto' value={amount} onChange={setAmount} prefix='$ ' thousandSeparator='.' decimalSeparator=',' min={0} hideControls />
        <Group justify='flex-end'>
          <Button variant='default' onClick={onClose}>Cancelar</Button>
          <Button onClick={save} loading={saving}>Guardar</Button>
        </Group>
      </Stack>
    </Modal>
  );
}
