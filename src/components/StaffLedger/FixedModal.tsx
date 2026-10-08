// src/components/StaffLedger/FixedModal.tsx
// Fijo mensual de un empleado (labor que se repite todos los meses).
// Modos:
// - create: alta
// - edit: corrige el fijo (cambia TODOS sus meses, también los pasados)
// - change: cambia el monto desde un mes (el anterior termina el mes previo)
// - end: da de baja desde un mes (deja de generarse)
'use client';
import 'dayjs/locale/es';
import { useEffect, useState } from 'react';
import { Modal, Stack, NumberInput, TextInput, Button, Group, Text } from '@mantine/core';
import { MonthPickerInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import { ledgerRequest } from '@/hooks/useStaffLedger';
import { amountForRequest } from '@/utils/staffLedgerInput';
import { FixedDef, arDay } from '@/utils/staffLedger';

export type FixedModalMode = 'create' | 'edit' | 'change' | 'end';

const currentMonth = () => (arDay(new Date()) as string).slice(0, 7);
// MonthPickerInput trabaja con 'YYYY-MM-DD' (día 1); guardamos 'YYYY-MM'
const toPicker = (ym: string | undefined) => (ym ? `${ym}-01` : null);
const fromPicker = (v: string | Date | null): string | null => {
  if (!v) return null;
  if (typeof v === 'string') return v.slice(0, 7);
  return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, '0')}`;
};
const monthLabel = (ym: string) => `${ym.slice(5, 7)}/${ym.slice(0, 4)}`;

const TITLES: Record<FixedModalMode, string> = {
  create: 'Agregar fijo mensual',
  edit: 'Editar fijo',
  change: 'Cambiar monto desde un mes',
  end: 'Dar de baja el fijo'
};

export default function FixedModal({
  opened,
  onClose,
  employeeId,
  mode,
  fixed
}: {
  opened: boolean;
  onClose: () => void;
  employeeId: string;
  mode: FixedModalMode;
  fixed?: FixedDef | null; // obligatorio salvo en create
}) {
  const [description, setDescription] = useState('');
  const [rol, setRol] = useState('');
  const [amount, setAmount] = useState<number | string>('');
  const [dayOfMonth, setDayOfMonth] = useState<number | string>(1);
  const [fromMonth, setFromMonth] = useState<string>(currentMonth());
  const [toMonth, setToMonth] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!opened) return;
    setDescription(fixed?.description ?? '');
    setRol(fixed?.rol ?? '');
    setAmount(mode === 'change' ? '' : fixed?.amount ?? '');
    setDayOfMonth(fixed?.dayOfMonth ?? 1);
    setFromMonth(mode === 'change' ? currentMonth() : fixed?.fromMonth ?? currentMonth());
    setToMonth(mode === 'end' ? currentMonth() : fixed?.toMonth ?? null);
  }, [opened, mode, fixed]);

  const save = async () => {
    setSaving(true);
    try {
      const fields = {
        type: 'fijo',
        employeeId,
        description,
        rol,
        amount: amountForRequest(amount),
        dayOfMonth: Number(dayOfMonth),
        fromMonth,
        toMonth: toMonth ?? ''
      };
      if (mode === 'create') {
        await ledgerRequest('POST', fields);
      } else if (mode === 'edit') {
        await ledgerRequest('PUT', { _id: fixed!.entryId, ...fields });
      } else if (mode === 'change') {
        // El nuevo hereda el fin del anterior (si tenía)
        await ledgerRequest('POST', { ...fields, toMonth: fixed!.toMonth ?? '', replacesId: fixed!.entryId });
      } else {
        await ledgerRequest('PUT', { _id: fixed!.entryId, toMonth: toMonth ?? '' });
      }
      notifications.show({
        color: 'teal',
        message: { create: 'Fijo agregado', edit: 'Fijo actualizado', change: 'Monto cambiado', end: 'Fijo dado de baja' }[mode]
      });
      onClose();
    } catch (e: any) {
      notifications.show({ color: 'red', message: e.message });
    } finally {
      setSaving(false);
    }
  };

  const monthPicker = (label: string, value: string | null, onChange: (v: string | null) => void, clearable = false) => (
    <MonthPickerInput
      label={label}
      locale='es'
      valueFormat='MM/YYYY'
      value={toPicker(value ?? undefined)}
      onChange={(v) => onChange(fromPicker(v as any))}
      clearable={clearable}
      placeholder={clearable ? 'Sin fin' : undefined}
    />
  );

  return (
    <Modal opened={opened} onClose={onClose} title={TITLES[mode]} centered>
      <Stack>
        {(mode === 'create' || mode === 'edit') && (
          <>
            {mode === 'edit' && (
              <Text size='xs' c='dimmed'>
                Esto cambia todos los meses del fijo, también los pasados. Para un aumento usá &ldquo;Cambiar monto&rdquo;.
              </Text>
            )}
            <TextInput label='Descripción' placeholder='Ej: Mantenimiento depósito' value={description} onChange={(e) => setDescription(e.currentTarget.value)} />
            <TextInput label='Rol (opcional)' placeholder='Si lo dejás vacío figura como Fijo' value={rol} onChange={(e) => setRol(e.currentTarget.value)} />
            <NumberInput label='Monto por mes' value={amount} onChange={setAmount} prefix='$ ' thousandSeparator='.' decimalSeparator=',' min={0} hideControls />
            <NumberInput
              label='Día del mes'
              description='Si el mes no tiene ese día, va el último (ej: 31 → 30 de noviembre)'
              value={dayOfMonth}
              onChange={setDayOfMonth}
              min={1}
              max={31}
              allowDecimal={false}
            />
            <Group grow>
              {monthPicker('Desde', fromMonth, (v) => v && setFromMonth(v))}
              {monthPicker('Hasta (opcional)', toMonth, setToMonth, true)}
            </Group>
          </>
        )}

        {mode === 'change' && fixed && (
          <>
            <Text size='sm'>
              {fixed.description}: hoy {fixed.amount.toLocaleString('es-AR')} por mes. Los meses anteriores no cambian.
            </Text>
            <NumberInput label='Nuevo monto por mes' value={amount} onChange={setAmount} prefix='$ ' thousandSeparator='.' decimalSeparator=',' min={0} hideControls />
            {monthPicker('Desde el mes', fromMonth, (v) => v && setFromMonth(v))}
          </>
        )}

        {mode === 'end' && fixed && (
          <>
            <Text size='sm'>
              {fixed.description} deja de generarse después del mes elegido (desde {monthLabel(fixed.fromMonth)}).
            </Text>
            {monthPicker('Último mes', toMonth, setToMonth)}
          </>
        )}

        <Group justify='flex-end'>
          <Button variant='default' onClick={onClose}>Cancelar</Button>
          <Button onClick={save} loading={saving}>Guardar</Button>
        </Group>
      </Stack>
    </Modal>
  );
}
