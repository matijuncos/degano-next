// src/components/StaffLedger/LedgerTable.tsx
'use client';
import { useMemo, useState } from 'react';
import { Table, Text, Badge, NumberInput, Group, ActionIcon, Tooltip, Stack, Loader } from '@mantine/core';
import { IconPencil, IconTrash, IconAlertTriangle } from '@tabler/icons-react';
import { formatPrice } from '@/utils/priceUtils';
import { amountChanged } from '@/utils/staffLedgerInput';
import {
  AllocatedCharge,
  Credit,
  DisplayStatus,
  arDay,
  displayStatus,
  PAYMENT_METHOD_LABELS,
  CREDIT_TYPE_LABELS
} from '@/utils/staffLedger';

const STATUS: Record<DisplayStatus, { label: string; color: string; variant?: string }> = {
  pagado: { label: 'Pagado', color: 'teal' },
  parcial: { label: 'Parcial', color: 'yellow' },
  pendiente: { label: 'A pagar', color: 'orange' },
  futuro: { label: 'Futuro', color: 'gray' },
  sin_monto: { label: 'Sin monto', color: 'gray', variant: 'outline' }
};

const MONTHS = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const monthTitle = (ym: string) => {
  const [y, m] = ym.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
};
const dayLabel = (iso: string) => {
  const d = arDay(iso) as string;
  return `${d.slice(8, 10)}/${d.slice(5, 7)}`;
};

type Row =
  | { kind: 'charge'; date: string; charge: AllocatedCharge }
  | { kind: 'credit'; date: string; credit: Credit };

export default function LedgerTable({
  charges,
  credits,
  now,
  editable = false,
  onAmountSave,
  onEditCredit,
  onEditExtra,
  onDeleteEntry
}: {
  charges: AllocatedCharge[];
  credits: Credit[];
  now: Date;
  editable?: boolean;
  // Devuelve si se guardó; si no, la fila vuelve a mostrar el valor del servidor
  onAmountSave?: (charge: AllocatedCharge, raw: string) => Promise<boolean>;
  onEditCredit?: (credit: Credit) => void;
  onEditExtra?: (charge: AllocatedCharge) => void;
  onDeleteEntry?: (entryId: string) => void;
}) {
  // Agrupado por mes, más nuevo arriba. Subtotal = lo generado en el mes.
  const months = useMemo(() => {
    const rows: Row[] = [
      ...charges.map((c) => ({ kind: 'charge' as const, date: c.date, charge: c })),
      ...credits.map((c) => ({ kind: 'credit' as const, date: c.date, credit: c }))
    ].sort((a, b) => b.date.localeCompare(a.date));
    const map = new Map<string, Row[]>();
    for (const r of rows) {
      const m = (arDay(r.date) as string).slice(0, 7);
      map.set(m, [...(map.get(m) ?? []), r]);
    }
    return [...map.entries()];
  }, [charges, credits]);

  if (!months.length) {
    return <Text c='dimmed' ta='center' py='lg'>No hay movimientos en este período.</Text>;
  }

  return (
    <Stack gap='lg'>
      {months.map(([ym, rows]) => {
        const generated = rows.reduce(
          (s, r) => (r.kind === 'charge' && r.charge.amount != null ? s + r.charge.amount : s),
          0
        );
        return (
          <div key={ym}>
            <Group justify='space-between' mb={4}>
              <Text fw={700} tt='capitalize'>{monthTitle(ym)}</Text>
              <Text size='sm' c='dimmed'>Generado: {formatPrice(generated)}</Text>
            </Group>
            <Table.ScrollContainer minWidth={640}>
              <Table striped withTableBorder>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Fecha</Table.Th>
                    <Table.Th>Concepto</Table.Th>
                    <Table.Th>Rol</Table.Th>
                    <Table.Th>Horas</Table.Th>
                    <Table.Th>Monto</Table.Th>
                    <Table.Th>Estado</Table.Th>
                    {editable && <Table.Th />}
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {rows.map((r) =>
                    r.kind === 'charge' ? (
                      <ChargeRow
                        key={r.charge.key}
                        charge={r.charge}
                        now={now}
                        editable={editable}
                        onAmountSave={onAmountSave}
                        onEditExtra={onEditExtra}
                        onDeleteEntry={onDeleteEntry}
                      />
                    ) : (
                      <Table.Tr key={r.credit.entryId} style={{ background: 'var(--mantine-color-blue-light)' }}>
                        <Table.Td>{dayLabel(r.credit.date)}</Table.Td>
                        <Table.Td>
                          <Text size='sm' fw={500}>{CREDIT_TYPE_LABELS[r.credit.kind]}</Text>
                          <Text size='xs' c='dimmed'>
                            {r.credit.method ? PAYMENT_METHOD_LABELS[r.credit.method] : ''}
                            {r.credit.description ? ` · ${r.credit.description}` : ''}
                          </Text>
                        </Table.Td>
                        <Table.Td />
                        <Table.Td />
                        <Table.Td>− {formatPrice(r.credit.amount)}</Table.Td>
                        <Table.Td />
                        {editable && (
                          <Table.Td>
                            <Group gap={4} wrap='nowrap'>
                              <ActionIcon variant='subtle' onClick={() => onEditCredit?.(r.credit)} aria-label='Editar'>
                                <IconPencil size={16} />
                              </ActionIcon>
                              <ActionIcon variant='subtle' color='red' onClick={() => onDeleteEntry?.(r.credit.entryId)} aria-label='Borrar'>
                                <IconTrash size={16} />
                              </ActionIcon>
                            </Group>
                          </Table.Td>
                        )}
                      </Table.Tr>
                    )
                  )}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          </div>
        );
      })}
    </Stack>
  );
}

function ChargeRow({
  charge,
  now,
  editable,
  onAmountSave,
  onEditExtra,
  onDeleteEntry
}: {
  charge: AllocatedCharge;
  now: Date;
  editable: boolean;
  onAmountSave?: (charge: AllocatedCharge, raw: string) => Promise<boolean>;
  onEditExtra?: (charge: AllocatedCharge) => void;
  onDeleteEntry?: (entryId: string) => void;
}) {
  const status = STATUS[displayStatus(charge, now)];
  // Estado local de la fila: indicador de guardado y, si falla, re-montar solo
  // este input para que vuelva al valor del servidor (sin tocar las demás filas)
  const [saving, setSaving] = useState(false);
  const [rev, setRev] = useState(0);
  const warning = charge.unassigned
    ? 'Ya no está asignado a este evento'
    : charge.eventDeleted
    ? 'El evento fue eliminado'
    : null;

  return (
    <Table.Tr>
      <Table.Td>{dayLabel(charge.date)}</Table.Td>
      <Table.Td>
        <Group gap={6} wrap='nowrap'>
          <div>
            <Text size='sm' fw={500}>{charge.label}</Text>
            {charge.venue && <Text size='xs' c='dimmed'>{charge.venue}</Text>}
          </div>
          {warning && (
            <Tooltip label={warning}>
              <IconAlertTriangle size={16} color='var(--mantine-color-yellow-6)' />
            </Tooltip>
          )}
        </Group>
      </Table.Td>
      <Table.Td>{charge.kind === 'extra' ? 'Extra' : charge.rol ?? '—'}</Table.Td>
      <Table.Td>{charge.hours != null ? `${charge.hours} h` : '—'}</Table.Td>
      <Table.Td>
        {editable && charge.kind === 'evento' ? (
          // key con el monto: si el servidor devuelve otro valor, el input se re-monta
          <NumberInput
            key={`${charge.key}:${charge.amount ?? ''}:${rev}`}
            defaultValue={charge.amount ?? ''}
            placeholder='Cargar monto'
            prefix='$ '
            thousandSeparator='.'
            decimalSeparator=','
            min={0}
            hideControls
            size='xs'
            w={130}
            disabled={saving}
            rightSection={saving ? <Loader size={12} /> : null}
            onBlur={async (e) => {
              const raw = e.currentTarget.value.replace(/^\$\s*/, '');
              if (!onAmountSave || !amountChanged(raw, charge.amount)) return;
              setSaving(true);
              const ok = await onAmountSave(charge, raw);
              setSaving(false);
              if (!ok) setRev((r) => r + 1);
            }}
          />
        ) : charge.amount != null ? (
          formatPrice(charge.amount)
        ) : (
          <Text size='sm' c='dimmed'>{editable ? '—' : 'A definir'}</Text>
        )}
      </Table.Td>
      <Table.Td>
        <Badge color={status.color} variant={(status.variant as any) ?? 'light'}>{status.label}</Badge>
      </Table.Td>
      {editable && (
        <Table.Td>
          {charge.kind === 'extra' && charge.entryId && (
            <Group gap={4} wrap='nowrap'>
              <ActionIcon variant='subtle' onClick={() => onEditExtra?.(charge)} aria-label='Editar'>
                <IconPencil size={16} />
              </ActionIcon>
              <ActionIcon variant='subtle' color='red' onClick={() => onDeleteEntry?.(charge.entryId!)} aria-label='Borrar'>
                <IconTrash size={16} />
              </ActionIcon>
            </Group>
          )}
          {charge.kind === 'evento' && warning && charge.entryId && (
            <ActionIcon variant='subtle' color='red' onClick={() => onDeleteEntry?.(charge.entryId!)} aria-label='Borrar línea'>
              <IconTrash size={16} />
            </ActionIcon>
          )}
        </Table.Td>
      )}
    </Table.Tr>
  );
}
