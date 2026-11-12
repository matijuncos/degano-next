// src/components/StaffLedger/ledgerParts.tsx
// Piezas comunes de las vistas de Cobros STAFF (Resumen de cuenta, Por quincena,
// Armar el pago). Lo que se edita en la fila (monto, rol) funciona igual que antes.
'use client';
import { useState } from 'react';
import { Text, Badge, NumberInput, Group, Tooltip, Loader, Modal, Stack, Button, UnstyledButton } from '@mantine/core';
import { IconAlertTriangle, IconPencil } from '@tabler/icons-react';
import { formatPrice } from '@/utils/priceUtils';
import { amountChanged } from '@/utils/staffLedgerInput';
import RoleMultiSelect from '@/components/StaffRoles/RoleMultiSelect';
import { AllocatedCharge, DisplayStatus, arDay, displayStatus } from '@/utils/staffLedger';
import { paymentTitle } from '@/utils/staffLedgerViews';

// Estados en palabras simples (los montos van en columnas, no en el estado)
export const STATUS: Record<DisplayStatus, { label: string; color: string; variant?: string }> = {
  pagado: { label: 'Pagado', color: 'teal' },
  parcial: { label: 'Parte paga', color: 'yellow' },
  pendiente: { label: 'Falta pagar', color: 'orange' },
  futuro: { label: 'Por venir', color: 'gray' },
  adelantado: { label: 'Adelantado', color: 'blue' },
  sin_monto: { label: 'Sin monto', color: 'gray', variant: 'outline' }
};

export const dayLabel = (iso: string) => {
  const d = arDay(iso) as string;
  return `${d.slice(8, 10)}/${d.slice(5, 7)}`;
};

export const isFutureCharge = (c: { date: string }, now: Date) => (arDay(c.date) as string) > (arDay(now) as string);

export function StatusBadge({ charge, now, variant }: { charge: AllocatedCharge; now: Date; variant?: 'light' | 'outline' }) {
  const s = STATUS[displayStatus(charge, now)];
  // Sin recorte: el estado se lee siempre completo
  return (
    <Badge color={s.color} variant={variant ?? (s.variant as any) ?? 'light'} tt='none' style={{ overflow: 'visible', flexShrink: 0 }} styles={{ label: { overflow: 'visible' } }}>
      {s.label}
    </Badge>
  );
}

// Concepto: nombre, lugar y aviso si ya no está en el evento / el evento se borró
export function ConceptCell({ charge }: { charge: AllocatedCharge }) {
  const warning = chargeWarning(charge);
  return (
    <Group gap={6} wrap='nowrap'>
      <div style={{ minWidth: 0 }}>
        <Text size='sm' fw={500}>{charge.label}</Text>
        {charge.venue && <Text size='xs' c='dimmed'>{charge.venue}</Text>}
      </div>
      {warning && (
        <Tooltip label={warning}>
          <IconAlertTriangle size={16} color='var(--mantine-color-yellow-6)' />
        </Tooltip>
      )}
    </Group>
  );
}

export const chargeWarning = (c: AllocatedCharge) =>
  c.unassigned ? 'Ya no está asignado a este evento' : c.eventDeleted ? 'El evento fue eliminado' : null;

// Rol: extra/fijo muestran su tipo; en eventos el admin lo edita desde la lista
export function RolCell({
  charge,
  onRolSave
}: {
  charge: AllocatedCharge;
  onRolSave?: (charge: AllocatedCharge, roleIds: string[]) => Promise<boolean>;
}) {
  if (charge.kind !== 'evento') {
    return charge.rol ? (
      <>
        <Text size='sm'>{charge.rol}</Text>
        <Text size='xs' c='dimmed'>{charge.kind === 'fijo' ? 'Fijo' : 'Extra'}</Text>
      </>
    ) : (
      <Text size='sm'>{charge.kind === 'fijo' ? 'Fijo' : 'Extra'}</Text>
    );
  }
  if (onRolSave && !charge.unassigned && !charge.eventDeleted) return <RolInput charge={charge} onSave={onRolSave} />;
  return <Text size='sm'>{charge.rol ?? '—'}</Text>;
}

// Monto: el admin lo edita en la fila de un evento (igual que antes)
export function AmountCell({
  charge,
  onAmountSave,
  readOnlyLabel = '—'
}: {
  charge: AllocatedCharge;
  onAmountSave?: (charge: AllocatedCharge, raw: string) => Promise<boolean>;
  readOnlyLabel?: string;
}) {
  const [saving, setSaving] = useState(false);
  const [rev, setRev] = useState(0);
  if (onAmountSave && charge.kind === 'evento') {
    return (
      <>
        {/* key con el monto: si el servidor devuelve otro valor, el input se re-monta */}
        <NumberInput
          key={`${charge.key}:${charge.amount ?? ''}:${charge.amountFromRoles ? 'rol' : ''}:${rev}`}
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
          aria-label='Monto'
          onBlur={async (e) => {
            const raw = e.currentTarget.value.replace(/^\$\s*/, '');
            if (!amountChanged(raw, charge.amount)) return;
            setSaving(true);
            await onAmountSave(charge, raw);
            setSaving(false);
            // Siempre se re-monta con el valor del servidor (si falló, vuelve al
            // anterior; si se borró y quedó el de los roles, se vuelve a ver)
            setRev((r) => r + 1);
          }}
        />
        <RoleAmountHint charge={charge} />
      </>
    );
  }
  return charge.amount != null ? (
    <Text size='sm' className='ledger-num'>{formatPrice(charge.amount)}</Text>
  ) : (
    <Text size='sm' c='dimmed'>{readOnlyLabel}</Text>
  );
}

// De dónde sale el monto de una línea de evento: de los roles o cargado a mano
export function RoleAmountHint({ charge }: { charge: AllocatedCharge }) {
  if (charge.amountFromRoles) return <Text size='xs' c='dimmed'>Monto del rol</Text>;
  if (charge.entryId && charge.roleAmount != null && charge.roleAmount !== charge.amount) {
    return (
      <Tooltip label='Borrá el monto para volver al de los roles'>
        <Text size='xs' c='dimmed'>Rol: {formatPrice(charge.roleAmount)}</Text>
      </Tooltip>
    );
  }
  return null;
}

// Roles del empleado en el evento (admin). En la fila se ven como etiquetas
// chicas con un lápiz; al tocarlo se abre un cuadro para elegirlos (así la fila
// no lleva un selector gigante). Se guarda con "Guardar".
export function RolInput({
  charge,
  onSave
}: {
  charge: AllocatedCharge;
  onSave: (charge: AllocatedCharge, roleIds: string[]) => Promise<boolean>;
}) {
  const current = charge.roleIds ?? [];
  const [opened, setOpened] = useState(false);
  const [ids, setIds] = useState<string[]>(current);
  const [saving, setSaving] = useState(false);
  const names = (charge.rol ?? '').split(' / ').map((n) => n.trim()).filter((n) => n && n !== 'Sin rol');

  const open = () => {
    setIds(current);
    setOpened(true);
  };
  const save = async () => {
    if (ids.join(',') === current.join(',')) return setOpened(false);
    setSaving(true);
    const ok = await onSave(charge, ids);
    setSaving(false);
    if (ok) setOpened(false);
  };

  return (
    <>
      <UnstyledButton onClick={open} aria-label='Cambiar rol' style={{ maxWidth: 200 }}>
        <Group gap={4} wrap='nowrap'>
          {names.length ? (
            names.map((n) => (
              <Badge key={n} size='sm' variant='light' color='gray' tt='none'>{n}</Badge>
            ))
          ) : (
            <Text size='xs' c='dimmed'>Sin rol</Text>
          )}
          <IconPencil size={13} style={{ opacity: 0.6 }} />
        </Group>
      </UnstyledButton>
      <Modal opened={opened} onClose={() => setOpened(false)} title={`Rol en ${charge.label}`} size='sm' centered>
        <Stack gap='sm'>
          <RoleMultiSelect
            label='Roles en este evento'
            description='Uno o varios. Definen el monto si no se cargó a mano.'
            value={ids}
            legacyText={charge.rol}
            onChange={(next) => setIds(next)}
          />
          <Group justify='flex-end' gap='xs'>
            <Button variant='default' onClick={() => setOpened(false)}>Cancelar</Button>
            <Button onClick={save} loading={saving}>Guardar</Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}

export { paymentTitle };
