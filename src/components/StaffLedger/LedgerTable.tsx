// src/components/StaffLedger/LedgerTable.tsx
'use client';
import { useMemo, useState } from 'react';
import { Table, Text, Badge, NumberInput, TextInput, Group, ActionIcon, Tooltip, Stack, Loader, Checkbox, Popover, Button, Collapse, UnstyledButton } from '@mantine/core';
import { IconPencil, IconTrash, IconAlertTriangle, IconChevronDown } from '@tabler/icons-react';
import { formatPrice } from '@/utils/priceUtils';
import { useConfirm } from '@/components/ConfirmModal/useConfirm';
import { amountChanged } from '@/utils/staffLedgerInput';
import {
  AllocatedCharge,
  Credit,
  DisplayStatus,
  arDay,
  displayStatus,
  tickState,
  round2,
  PaymentMethod,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  CREDIT_TYPE_LABELS
} from '@/utils/staffLedger';

// Etiquetas cortas para el mini menú del tilde
const METHOD_SHORT: Record<PaymentMethod, string> = {
  efectivo: 'Efectivo',
  transferencia_tercero: 'Transf. tercero',
  transferencia_degano: 'Transf. Degano'
};

const STATUS: Record<DisplayStatus, { label: string; color: string; variant?: string }> = {
  pagado: { label: 'Pagado', color: 'teal' },
  parcial: { label: 'Parcial', color: 'yellow' },
  pendiente: { label: 'A pagar', color: 'orange' },
  futuro: { label: 'Futuro', color: 'gray' },
  adelantado: { label: 'Adelantado', color: 'blue' },
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

type ConfirmFn = ReturnType<typeof useConfirm>[0];

type Row =
  | { kind: 'charge'; date: string; charge: AllocatedCharge }
  | { kind: 'credit'; date: string; credit: Credit };

export default function LedgerTable({
  charges,
  credits,
  now,
  editable = false,
  onAmountSave,
  onRolSave,
  onEditCredit,
  onEditExtra,
  onDeleteEntry,
  onTick,
  onUntick
}: {
  charges: AllocatedCharge[];
  credits: Credit[];
  now: Date;
  editable?: boolean;
  // Devuelve si se guardó; si no, la fila vuelve a mostrar el valor del servidor
  onAmountSave?: (charge: AllocatedCharge, raw: string) => Promise<boolean>;
  // Rol en el evento (se guarda en el evento). Devuelve si se guardó.
  onRolSave?: (charge: AllocatedCharge, rol: string) => Promise<boolean>;
  onEditCredit?: (credit: Credit) => void;
  onEditExtra?: (charge: AllocatedCharge) => void;
  onDeleteEntry?: (entryId: string) => void;
  onTick?: (charge: AllocatedCharge, method: PaymentMethod) => Promise<boolean>;
  onUntick?: (charge: AllocatedCharge) => Promise<boolean>;
}) {
  // Un solo modal de confirmación para toda la tabla
  const [confirm, confirmModal] = useConfirm();

  // Por defecto solo el mes actual (día argentino) está abierto; `toggled`
  // guarda los meses que el usuario abrió o cerró a mano
  const currentMonth = (arDay(now) as string).slice(0, 7);
  const [toggled, setToggled] = useState<Set<string>>(() => new Set());
  const toggleMonth = (ym: string) =>
    setToggled((prev) => {
      const next = new Set(prev);
      if (next.has(ym)) next.delete(ym);
      else next.add(ym);
      return next;
    });

  // Para mostrar en cada abono del tilde qué línea pagó
  const labelByKey = useMemo(() => new Map(charges.map((c) => [c.key, c.label])), [charges]);

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
      {confirmModal}
      {months.map(([ym, rows]) => {
        const generated = rows.reduce(
          (s, r) => (r.kind === 'charge' && r.charge.amount != null ? s + r.charge.amount : s),
          0
        );
        const open = (ym === currentMonth) !== toggled.has(ym);
        return (
          <div key={ym}>
            <UnstyledButton onClick={() => toggleMonth(ym)} w='100%' mb={4} aria-expanded={open}>
              <Group justify='space-between'>
                <Group gap={6}>
                  <IconChevronDown
                    size={18}
                    style={{ transform: open ? undefined : 'rotate(-90deg)', transition: 'transform 150ms' }}
                  />
                  <Text fw={700} tt='capitalize'>{monthTitle(ym)}</Text>
                  {!open && <Text size='xs' c='dimmed'>({rows.length} {rows.length === 1 ? 'movimiento' : 'movimientos'})</Text>}
                </Group>
                <Text size='sm' c='dimmed'>Generado: {formatPrice(generated)}</Text>
              </Group>
            </UnstyledButton>
            <Collapse in={open}>
            <Table.ScrollContainer minWidth={640}>
              <Table striped withTableBorder>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Fecha</Table.Th>
                    <Table.Th>Concepto</Table.Th>
                    <Table.Th>Rol</Table.Th>
                    <Table.Th>Horas</Table.Th>
                    <Table.Th>Monto</Table.Th>
                    {editable && <Table.Th>Pagado</Table.Th>}
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
                        onRolSave={onRolSave}
                        onEditExtra={onEditExtra}
                        onDeleteEntry={onDeleteEntry}
                        onTick={onTick}
                        onUntick={onUntick}
                        confirm={confirm}
                      />
                    ) : (
                      <Table.Tr key={r.credit.entryId} style={{ background: 'var(--mantine-color-blue-light)' }}>
                        <Table.Td>{dayLabel(r.credit.date)}</Table.Td>
                        <Table.Td>
                          <Text size='sm' fw={500}>{CREDIT_TYPE_LABELS[r.credit.kind]}</Text>
                          <Text size='xs' c='dimmed'>
                            {r.credit.method ? PAYMENT_METHOD_LABELS[r.credit.method] : ''}
                            {r.credit.chargeKey ? ` · ${labelByKey.get(r.credit.chargeKey) ?? 'línea'}` : ''}
                            {r.credit.description ? ` · ${r.credit.description}` : ''}
                          </Text>
                        </Table.Td>
                        <Table.Td />
                        <Table.Td />
                        <Table.Td>− {formatPrice(r.credit.amount)}</Table.Td>
                        {editable && <Table.Td />}
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
            </Collapse>
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
  onRolSave,
  onEditExtra,
  onDeleteEntry,
  onTick,
  onUntick,
  confirm
}: {
  charge: AllocatedCharge;
  now: Date;
  editable: boolean;
  confirm: ConfirmFn;
  onAmountSave?: (charge: AllocatedCharge, raw: string) => Promise<boolean>;
  onRolSave?: (charge: AllocatedCharge, rol: string) => Promise<boolean>;
  onEditExtra?: (charge: AllocatedCharge) => void;
  onDeleteEntry?: (entryId: string) => void;
  onTick?: (charge: AllocatedCharge, method: PaymentMethod) => Promise<boolean>;
  onUntick?: (charge: AllocatedCharge) => Promise<boolean>;
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
      <Table.Td>
        {charge.kind !== 'evento' ? (
          // Extra / fijo: el rol si lo tiene, con el tipo abajo; si no, el tipo
          charge.rol ? (
            <>
              <Text size='sm'>{charge.rol}</Text>
              <Text size='xs' c='dimmed'>{charge.kind === 'fijo' ? 'Fijo' : 'Extra'}</Text>
            </>
          ) : charge.kind === 'fijo' ? (
            'Fijo'
          ) : (
            'Extra'
          )
        ) : editable && onRolSave && !charge.unassigned && !charge.eventDeleted ? (
          <RolInput charge={charge} onSave={onRolSave} />
        ) : (
          charge.rol ?? '—'
        )}
      </Table.Td>
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
      {editable && (
        <Table.Td>
          <TickCell charge={charge} onTick={onTick} onUntick={onUntick} confirm={confirm} />
        </Table.Td>
      )}
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

// Casilla "Pagado": tildar abre un mini menú con la forma de pago y registra el
// pago de lo que falta de la línea; destildar borra los pagos de ese tilde.
// Se marca al instante (optimista) y vuelve atrás si el servidor falla.
function TickCell({
  charge,
  onTick,
  onUntick,
  confirm
}: {
  charge: AllocatedCharge;
  confirm: ConfirmFn;
  onTick?: (charge: AllocatedCharge, method: PaymentMethod) => Promise<boolean>;
  onUntick?: (charge: AllocatedCharge) => Promise<boolean>;
}) {
  const state = tickState(charge);
  const [menuOpen, setMenuOpen] = useState(false);
  const [optimistic, setOptimistic] = useState<boolean | null>(null);

  if (state === 'none') return null;
  if (state === 'locked') {
    return (
      <Tooltip label='Cubierto por un pago a cuenta'>
        <span><Checkbox checked readOnly disabled aria-label='Pagado' /></span>
      </Tooltip>
    );
  }

  const checked = optimistic ?? state === 'checked';
  const busy = optimistic !== null;

  const run = async (target: boolean, action: () => Promise<boolean> | undefined) => {
    setOptimistic(target);
    await action();
    // Con éxito llega la cuenta nueva y la casilla toma el estado real; si
    // falló, vuelve al de antes (el aviso lo muestra la página)
    setOptimistic(null);
  };

  const pay = (method: PaymentMethod) => {
    setMenuOpen(false);
    run(true, () => onTick?.(charge, method));
  };

  const unpay = async () => {
    const ok = await confirm({
      title: '¿Destildar este pago?',
      message: `Se borra el pago registrado con el tilde de "${charge.label}" y vuelve a quedar impago.`,
      confirmLabel: 'Destildar'
    });
    if (ok) run(false, () => onUntick?.(charge));
  };

  return (
    <Popover opened={menuOpen} onChange={setMenuOpen} position='left' withArrow shadow='md' trapFocus>
      <Popover.Target>
        <Group gap={6} wrap='nowrap'>
          <Tooltip label={checked ? 'Destildar (borra este pago)' : 'Marcar como pagado'} disabled={menuOpen}>
            <Checkbox
              checked={checked}
              disabled={busy}
              aria-label='Pagado'
              // La impaga lleva texto: una casilla vacía en tema oscuro casi no se ve
              label={checked ? undefined : 'Pagar'}
              styles={{ input: { cursor: 'pointer' }, label: { cursor: 'pointer' } }}
              onChange={() => (checked ? unpay() : setMenuOpen(true))}
            />
          </Tooltip>
          {busy && <Loader size={12} />}
        </Group>
      </Popover.Target>
      <Popover.Dropdown p='xs'>
        <Stack gap={6}>
          <Text size='xs' c='dimmed'>
            Pagar {formatPrice(round2((charge.amount ?? 0) - charge.paidAmount))} con:
          </Text>
          {PAYMENT_METHODS.map((m) => (
            <Button key={m} size='xs' variant='light' onClick={() => pay(m)}>
              {METHOD_SHORT[m]}
            </Button>
          ))}
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}

// Rol del empleado en el evento, editable en la fila (admin). Guarda al salir
// del campo o con Enter; si falla, vuelve al valor del servidor.
function RolInput({
  charge,
  onSave
}: {
  charge: AllocatedCharge;
  onSave: (charge: AllocatedCharge, rol: string) => Promise<boolean>;
}) {
  const current = charge.rol === 'Sin rol' ? '' : charge.rol ?? '';
  const [saving, setSaving] = useState(false);
  const [rev, setRev] = useState(0);

  const commit = async (value: string) => {
    if (value.trim() === current) return;
    setSaving(true);
    const ok = await onSave(charge, value);
    setSaving(false);
    if (!ok) setRev((r) => r + 1);
  };

  return (
    <TextInput
      key={`${charge.key}:${current}:${rev}`}
      defaultValue={current}
      placeholder='Sin rol'
      size='xs'
      w={130}
      disabled={saving}
      rightSection={saving ? <Loader size={12} /> : null}
      aria-label='Rol en el evento'
      onBlur={(e) => commit(e.currentTarget.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
      }}
    />
  );
}
