// src/components/StaffLedger/LedgerViews.tsx
// Las vistas de la cuenta de un empleado:
//  - Resumen de cuenta (por mes)   → admin y empleado
//  - Por quincena (1-15 / 16-fin)  → admin y empleado
//  - Armar el pago                 → solo admin
// Admin: tilda renglones (o un mes / una quincena) y los paga juntos. Empleado:
// solo lectura. Los pagos y pagos a cuenta aparecen en la fecha en que se hicieron.
// No hace requests propias: usa la cuenta que ya está cargada (pagar = 1 request).
'use client';
import { useEffect, useMemo, useState } from 'react';
import {
  Stack, Group, Text, SegmentedControl, Table, Checkbox, Badge, ActionIcon, Tooltip, Paper, UnstyledButton,
  Collapse, Button, Modal, Anchor, Box
} from '@mantine/core';
import { IconChevronDown, IconPencil, IconTrash, IconArrowBackUp } from '@tabler/icons-react';
import { formatPrice } from '@/utils/priceUtils';
import { useResponsive } from '@/hooks/useResponsive';
import { useConfirm } from '@/components/ConfirmModal/useConfirm';
import { AllocatedCharge, Credit, LedgerSummary, PAYMENT_METHOD_LABELS, arDay } from '@/utils/staffLedger';
import {
  PaymentGroup, groupPayments, groupTotals, isPayable, monthKey, monthLabel, quincenaKey, quincenaLabel, remainingOf
} from '@/utils/staffLedgerViews';
import { AmountCell, ConceptCell, RolCell, StatusBadge, dayLabel, isFutureCharge, paymentTitle, chargeWarning } from './ledgerParts';
import PayPanel from './PayPanel';

type View = 'cuenta' | 'quincena' | 'pago';
const VIEW_KEY = 'degano:cobrosVista';

export interface AdminHandlers {
  onAmountSave: (charge: AllocatedCharge, raw: string) => Promise<boolean>;
  onRolSave: (charge: AllocatedCharge, roleIds: string[]) => Promise<boolean>;
  onEditCredit: (credit: Credit) => void;
  onEditExtra: (charge: AllocatedCharge) => void;
  onDeleteEntry: (entryId: string) => void;
  onUndoBatch: (batchId: string) => Promise<void>;
}

type Item = { kind: 'charge'; date: string; charge: AllocatedCharge } | { kind: 'pay'; date: string; pay: PaymentGroup };

export default function LedgerViews({
  mode,
  employeeId,
  charges,
  credits,
  summary,
  now,
  admin
}: {
  mode: 'admin' | 'employee';
  employeeId: string;
  charges: AllocatedCharge[];
  credits: Credit[];
  summary: Pick<LedgerSummary, 'pendingToDate' | 'favor'>;
  now: Date;
  admin?: AdminHandlers;
}) {
  const isAdmin = mode === 'admin' && !!admin;
  const { isMobile } = useResponsive();
  const [view, setView] = useState<View>('cuenta');
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [payOpen, setPayOpen] = useState(false);
  const [confirm, confirmModal] = useConfirm();

  // Vista recordada (por navegador). Resumen de cuenta por defecto.
  useEffect(() => {
    try {
      const v = localStorage.getItem(VIEW_KEY) as View | null;
      if (v === 'quincena' || (v === 'pago' && isAdmin) || v === 'cuenta') setView(v);
    } catch {
      /* sin storage */
    }
  }, [isAdmin]);
  const changeView = (v: View) => {
    setView(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      /* sin storage */
    }
  };

  // Al cambiar la cuenta (pago registrado, etc.) se descarta lo que ya no se puede pagar
  useEffect(() => {
    setSelected((prev) => {
      const payable = new Set(charges.filter(isPayable).map((c) => c.key));
      const next = new Set([...prev].filter((k) => payable.has(k)));
      return next.size === prev.size ? prev : next;
    });
  }, [charges]);

  const payments = useMemo(() => groupPayments(credits), [credits]);
  const chargeByKey = useMemo(() => new Map(charges.map((c) => [c.key, c])), [charges]);
  const creditById = useMemo(() => new Map(credits.map((c) => [c.entryId, c])), [credits]);

  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const toggleMany = (keys: string[]) =>
    setSelected((prev) => {
      const next = new Set(prev);
      const all = keys.every((k) => next.has(k));
      keys.forEach((k) => (all ? next.delete(k) : next.add(k)));
      return next;
    });

  const selectedDue = [...selected].reduce((s, k) => s + remainingOf(chargeByKey.get(k) ?? { amount: 0, paidAmount: 0 }), 0);

  // ── Piezas comunes ──
  const describePay = (g: PaymentGroup) => {
    const covered = g.chargeKeys.map((k) => chargeByKey.get(k)).filter(Boolean) as AllocatedCharge[];
    const what =
      covered.length === 0
        ? ''
        : covered.length <= 2
        ? covered.map((c) => `${c.label} ${dayLabel(c.date)}`).join(', ')
        : `${covered.length} renglones`;
    return [
      g.method ? PAYMENT_METHOD_LABELS[g.method] : '',
      what,
      // Pago a cuenta: se descuenta solo de lo más viejo impago (como siempre)
      covered.length === 0 && !g.chargeKeys.length ? 'Se aplica a lo más viejo que falta pagar' : '',
      covered.length && g.accountAmount > 0 ? `${formatPrice(g.accountAmount)} a cuenta` : '',
      g.description || ''
    ]
      .filter(Boolean)
      .join(' · ');
  };

  const payActions = (g: PaymentGroup) => {
    if (!isAdmin) return null;
    if (g.batchId) {
      return (
        <Tooltip label='Deshacer este pago'>
          <ActionIcon
            variant='subtle'
            color='red'
            aria-label='Deshacer pago'
            onClick={async () => {
              const ok = await confirm({
                title: '¿Deshacer este pago?',
                message: `Se borra el pago de ${formatPrice(g.amount)} del ${dayLabel(g.date)} y lo que cubrió vuelve a quedar impago.`,
                confirmLabel: 'Deshacer'
              });
              if (ok) await admin!.onUndoBatch(g.batchId!);
            }}
          >
            <IconArrowBackUp size={16} />
          </ActionIcon>
        </Tooltip>
      );
    }
    const credit = creditById.get(g.entryIds[0]);
    return (
      <Group gap={4} wrap='nowrap'>
        {credit && !credit.chargeKey && (
          <ActionIcon variant='subtle' onClick={() => admin!.onEditCredit(credit)} aria-label='Editar'>
            <IconPencil size={16} />
          </ActionIcon>
        )}
        <ActionIcon variant='subtle' color='red' onClick={() => admin!.onDeleteEntry(g.entryIds[0])} aria-label='Borrar'>
          <IconTrash size={16} />
        </ActionIcon>
      </Group>
    );
  };

  const chargeActions = (c: AllocatedCharge) => {
    if (!isAdmin) return null;
    if (c.kind === 'extra' && c.entryId) {
      return (
        <Group gap={4} wrap='nowrap'>
          <ActionIcon variant='subtle' onClick={() => admin!.onEditExtra(c)} aria-label='Editar'>
            <IconPencil size={16} />
          </ActionIcon>
          <ActionIcon variant='subtle' color='red' onClick={() => admin!.onDeleteEntry(c.entryId!)} aria-label='Borrar'>
            <IconTrash size={16} />
          </ActionIcon>
        </Group>
      );
    }
    if (c.kind === 'evento' && chargeWarning(c) && c.entryId) {
      return (
        <ActionIcon variant='subtle' color='red' onClick={() => admin!.onDeleteEntry(c.entryId!)} aria-label='Borrar línea'>
          <IconTrash size={16} />
        </ActionIcon>
      );
    }
    return null;
  };

  const leftCell = (c: AllocatedCharge) => {
    const left = remainingOf(c);
    if (c.amount == null || left === 0) return <Text size='sm' c='dimmed'>—</Text>;
    return (
      <Text size='sm' className='ledger-num' c={isFutureCharge(c, now) ? 'dimmed' : 'orange'}>
        {formatPrice(left)}
      </Text>
    );
  };

  const box = (c: AllocatedCharge) =>
    isAdmin ? (
      isPayable(c) ? (
        <Checkbox checked={selected.has(c.key)} onChange={() => toggle(c.key)} aria-label={`Tildar ${c.label}`} />
      ) : null
    ) : undefined;

  // Renglones de un grupo (mes o quincena) en orden de fecha, con los pagos en su fecha
  const itemsFor = (cs: AllocatedCharge[], ps: PaymentGroup[]): Item[] =>
    [
      ...cs.map((c) => ({ kind: 'charge' as const, date: c.date, charge: c })),
      ...ps.map((p) => ({ kind: 'pay' as const, date: p.date, pay: p }))
    ].sort((a, b) => (arDay(a.date) as string).localeCompare(arDay(b.date) as string) || (a.kind === 'charge' ? -1 : 1));

  const groupBy = (keyOf: (iso: string) => string) => {
    const map = new Map<string, { charges: AllocatedCharge[]; pays: PaymentGroup[] }>();
    const get = (k: string) => map.get(k) ?? (map.set(k, { charges: [], pays: [] }), map.get(k)!);
    charges.forEach((c) => get(keyOf(c.date)).charges.push(c));
    payments.forEach((p) => get(keyOf(p.date)).pays.push(p));
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0])); // más nuevo arriba
  };

  const currentMonth = (arDay(now) as string).slice(0, 7);
  const currentQuincena = quincenaKey(now.toISOString());

  // ── Tabla de renglones (Resumen y Quincena usan la misma) ──
  const showHours = isAdmin;
  const table = (items: Item[], footer: React.ReactNode, editable: boolean) => (
    <Table.ScrollContainer minWidth={isAdmin ? 760 : 560}>
      <Table striped withTableBorder verticalSpacing={6}>
        <Table.Thead>
          <Table.Tr>
            {isAdmin && <Table.Th w={36} />}
            <Table.Th>Fecha</Table.Th>
            <Table.Th>Concepto</Table.Th>
            <Table.Th>Rol</Table.Th>
            {showHours && <Table.Th>Horas</Table.Th>}
            <Table.Th>Monto</Table.Th>
            <Table.Th>Falta</Table.Th>
            <Table.Th miw={120}>Estado</Table.Th>
            {isAdmin && <Table.Th />}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {items.map((it) =>
            it.kind === 'charge' ? (
              <Table.Tr key={it.charge.key} style={isFutureCharge(it.charge, now) ? { opacity: 0.7 } : undefined}>
                {isAdmin && <Table.Td>{box(it.charge)}</Table.Td>}
                <Table.Td className='ledger-num'>{dayLabel(it.charge.date)}</Table.Td>
                <Table.Td><ConceptCell charge={it.charge} /></Table.Td>
                <Table.Td><RolCell charge={it.charge} onRolSave={editable && isAdmin ? admin!.onRolSave : undefined} /></Table.Td>
                {showHours && <Table.Td>{it.charge.hours != null ? `${it.charge.hours} h` : '—'}</Table.Td>}
                <Table.Td>
                  <AmountCell
                    charge={it.charge}
                    onAmountSave={editable && isAdmin ? admin!.onAmountSave : undefined}
                    readOnlyLabel={isAdmin ? '—' : 'A definir'}
                  />
                </Table.Td>
                <Table.Td>{leftCell(it.charge)}</Table.Td>
                <Table.Td style={{ whiteSpace: 'nowrap' }}><StatusBadge charge={it.charge} now={now} /></Table.Td>
                {isAdmin && <Table.Td>{chargeActions(it.charge)}</Table.Td>}
              </Table.Tr>
            ) : (
              <Table.Tr key={it.pay.id} style={{ background: 'var(--mantine-color-blue-light)' }}>
                {isAdmin && <Table.Td />}
                <Table.Td className='ledger-num'>{dayLabel(it.pay.date)}</Table.Td>
                <Table.Td colSpan={showHours ? 3 : 2}>
                  <Text size='sm' fw={600}>{paymentTitle(it.pay)}</Text>
                  <Text size='xs' c='dimmed'>{describePay(it.pay)}</Text>
                </Table.Td>
                <Table.Td>
                  <Text size='sm' fw={600} className='ledger-num' c='blue'>− {formatPrice(it.pay.amount)}</Text>
                </Table.Td>
                <Table.Td />
                <Table.Td />
                {isAdmin && <Table.Td>{payActions(it.pay)}</Table.Td>}
              </Table.Tr>
            )
          )}
          <Table.Tr>
            <Table.Td colSpan={(isAdmin ? 1 : 0) + (showHours ? 1 : 0) + 6 + (isAdmin ? 1 : 0)} style={{ background: 'var(--mantine-color-dark-6)' }}>
              {footer}
            </Table.Td>
          </Table.Tr>
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );

  const [toggled, setToggled] = useState<Set<string>>(() => new Set());
  const isOpen = (key: string, byDefault: boolean) => byDefault !== toggled.has(key);
  const flip = (key: string) =>
    setToggled((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const groupHeader = (key: string, open: boolean, title: string, subtitle: string | null, right: React.ReactNode, payableKeys: string[]) => (
    <Group justify='space-between' wrap='wrap' gap='xs' mb={4}>
      <UnstyledButton onClick={() => flip(key)} aria-expanded={open}>
        <Group gap={6} wrap='nowrap'>
          <IconChevronDown size={18} style={{ transform: open ? undefined : 'rotate(-90deg)', transition: 'transform 150ms' }} />
          <Text fw={700}>{title}</Text>
          {subtitle && <Text size='xs' c='dimmed'>{subtitle}</Text>}
        </Group>
      </UnstyledButton>
      <Group gap='sm' wrap='wrap'>
        {right}
        {isAdmin && payableKeys.length > 0 && (
          <Anchor component='button' type='button' size='sm' onClick={() => toggleMany(payableKeys)}>
            {payableKeys.every((k) => selected.has(k)) ? 'Destildar' : 'Tildar todo'}
          </Anchor>
        )}
      </Group>
    </Group>
  );

  // ── 1. Resumen de cuenta (por mes) ──
  const accountView = () => {
    const months = groupBy(monthKey);
    if (!months.length) return <Text c='dimmed' ta='center' py='lg'>No hay movimientos en este período.</Text>;
    return (
      <Stack gap='lg'>
        {months.map(([ym, g]) => {
          const t = groupTotals(g.charges);
          const payable = g.charges.filter(isPayable).map((c) => c.key);
          const dueNow = g.charges.some((c) => isPayable(c) && !isFutureCharge(c, now));
          const open = isOpen('m:' + ym, ym === currentMonth || dueNow);
          return (
            <div key={ym}>
              {groupHeader(
                'm:' + ym,
                open,
                monthLabel(ym).replace(/^./, (ch) => ch.toUpperCase()),
                open ? null : `(${g.charges.length + g.pays.length} movimientos)`,
                <Text size='sm' c='dimmed'>
                  Generado <b>{formatPrice(t.total)}</b>
                  {t.left > 0 ? <> · Falta <b>{formatPrice(t.left)}</b></> : ' · al día'}
                </Text>,
                payable
              )}
              {/* PERF: lo plegado no se dibuja (ni sus selectores de rol) */}
              <Collapse in={open}>
                {open && table(
                  itemsFor(g.charges, g.pays),
                  <Group gap='lg' wrap='wrap'>
                    <Text size='sm'>Generado en el mes <b className='ledger-num'>{formatPrice(t.total)}</b></Text>
                    <Text size='sm' c={t.left > 0 ? 'orange' : 'dimmed'}>Falta pagar <b className='ledger-num'>{formatPrice(t.left)}</b></Text>
                    {t.missing > 0 && <Badge color='yellow' variant='light'>{t.missing} sin monto</Badge>}
                  </Group>,
                  true
                )}
              </Collapse>
            </div>
          );
        })}
      </Stack>
    );
  };

  // ── 2. Por quincena ──
  const quincenaView = () => {
    const qs = groupBy(quincenaKey);
    if (!qs.length) return <Text c='dimmed' ta='center' py='lg'>No hay movimientos en este período.</Text>;
    return (
      <Stack gap='md'>
        {qs.map(([qk, g]) => {
          const t = groupTotals(g.charges);
          const { title, range } = quincenaLabel(qk);
          const payable = g.charges.filter(isPayable).map((c) => c.key);
          const future = g.charges.length > 0 && g.charges.every((c) => isFutureCharge(c, now));
          const [st, color] =
            !g.charges.length ? ['Sin cargos', 'gray'] : t.left === 0 && !t.missing ? ['Saldada', 'teal'] : t.paid > 0 ? ['Parte paga', 'yellow'] : future ? ['Por venir', 'gray'] : ['Falta pagar', 'orange'];
          const open = isOpen('q:' + qk, qk >= currentQuincena || payable.length > 0);
          return (
            <Paper key={qk} withBorder radius='md' p='sm'>
              {groupHeader('q:' + qk, open, title, range, <Badge color={color} variant='light'>{st}</Badge>, payable)}
              <Collapse in={open}>
                {open && table(
                  itemsFor(g.charges, g.pays),
                  <Group justify='space-between' wrap='wrap' gap='sm'>
                    <Group gap='lg' wrap='wrap'>
                      <Text size='sm'>Total <b className='ledger-num'>{formatPrice(t.total)}</b></Text>
                      <Text size='sm' c='teal'>Pagado <b className='ledger-num'>{formatPrice(t.paid)}</b></Text>
                      <Text size='sm' c={t.left > 0 ? 'orange' : 'dimmed'}>Falta <b className='ledger-num'>{formatPrice(t.left)}</b></Text>
                      {t.missing > 0 && <Badge color='yellow' variant='light'>{t.missing} sin monto</Badge>}
                    </Group>
                    {isAdmin && payable.length > 0 && (
                      <Button
                        size='xs'
                        onClick={() => {
                          setSelected(new Set(payable));
                          setPayOpen(true);
                        }}
                      >
                        {future ? 'Adelantar quincena' : 'Cerrar quincena'}
                      </Button>
                    )}
                  </Group>,
                  true
                )}
              </Collapse>
            </Paper>
          );
        })}
      </Stack>
    );
  };

  // ── 3. Armar el pago (admin) ──
  // Tarjeta por quincena con lo que falta pagar y, en su fecha, los pagos de esa
  // quincena. Al costado, el pago en vivo.
  const payView = () => {
    const open = charges.filter(isPayable);
    const byQ = new Map<string, { charges: AllocatedCharge[]; pays: PaymentGroup[] }>();
    const get = (k: string) => byQ.get(k) ?? (byQ.set(k, { charges: [], pays: [] }), byQ.get(k)!);
    open.forEach((c) => get(quincenaKey(c.date)).charges.push(c));
    // Pagos en su fecha, dentro de las quincenas que tienen algo por pagar
    payments.forEach((p) => {
      const k = quincenaKey(p.date);
      if (byQ.has(k)) byQ.get(k)!.pays.push(p);
    });
    const qs = [...byQ.entries()].sort((a, b) => a[0].localeCompare(b[0])); // lo más viejo primero
    const rowStyle = { borderTop: '1px solid var(--mantine-color-dark-4)' };
    return (
      // Lista ancha + panel de pago angosto (en celular, uno debajo del otro)
      <Box style={{ display: 'grid', gap: 'var(--mantine-spacing-md)', alignItems: 'start', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) 340px' }}>
        <Stack gap='md'>
          {!qs.length && <Text c='dimmed'>No hay nada por pagar: la cuenta está al día.</Text>}
          {qs.map(([qk, g]) => {
            const keys = g.charges.map((c) => c.key);
            const all = keys.every((k) => selected.has(k));
            const left = g.charges.reduce((s, c) => s + remainingOf(c), 0);
            return (
              <Paper key={qk} withBorder radius='md' style={{ overflow: 'hidden' }}>
                <Group justify='space-between' wrap='wrap' gap='xs' px='md' py='sm'>
                  <div>
                    <Text fw={700} size='lg'>{quincenaLabel(qk).title.replace(/ \d{4}$/, '')}</Text>
                    <Text size='sm' c='dimmed'>Falta <span className='ledger-num'>{formatPrice(left)}</span></Text>
                  </div>
                  <Anchor component='button' type='button' onClick={() => toggleMany(keys)}>
                    {all ? 'Destildar' : 'Tildar toda la quincena'}
                  </Anchor>
                </Group>
                {itemsFor(g.charges, g.pays).map((it) =>
                  it.kind === 'charge' ? (
                    <Group
                      key={it.charge.key}
                      wrap='nowrap'
                      gap='md'
                      px='md'
                      py='sm'
                      style={{ ...rowStyle, cursor: 'pointer', background: selected.has(it.charge.key) ? 'var(--mantine-color-teal-light)' : undefined }}
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest('input')) return;
                        toggle(it.charge.key);
                      }}
                    >
                      <Checkbox checked={selected.has(it.charge.key)} onChange={() => toggle(it.charge.key)} aria-label={`Tildar ${it.charge.label}`} />
                      <Text c='dimmed' className='ledger-num' w={48} visibleFrom='xs'>{dayLabel(it.charge.date)}</Text>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Text fw={600}>{it.charge.label}</Text>
                        <Text size='sm' c='dimmed'>
                          {[dayLabel(it.charge.date), it.charge.venue, it.charge.rol].filter(Boolean).join(' · ')}
                        </Text>
                      </div>
                      <StatusBadge charge={it.charge} now={now} variant='outline' />
                      <Box ta='right' miw={96}>
                        <Text fw={600} className='ledger-num' c={isFutureCharge(it.charge, now) ? 'dimmed' : undefined}>
                          {formatPrice(remainingOf(it.charge))}
                        </Text>
                        {it.charge.paidAmount > 0 && (
                          <Text size='xs' c='dimmed' className='ledger-num'>de {formatPrice(it.charge.amount ?? 0)}</Text>
                        )}
                      </Box>
                    </Group>
                  ) : (
                    <Group key={it.pay.id} wrap='nowrap' gap='md' px='md' py='sm' style={{ ...rowStyle, background: 'var(--mantine-color-blue-light)' }}>
                      <Box w={20} />
                      <Text c='dimmed' className='ledger-num' w={48} visibleFrom='xs'>{dayLabel(it.pay.date)}</Text>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Text fw={600}>{paymentTitle(it.pay)}</Text>
                        <Text size='sm' c='dimmed'>{[dayLabel(it.pay.date), describePay(it.pay)].filter(Boolean).join(' · ')}</Text>
                      </div>
                      <Text fw={600} c='blue' className='ledger-num'>− {formatPrice(it.pay.amount)}</Text>
                      {payActions(it.pay)}
                    </Group>
                  )
                )}
              </Paper>
            );
          })}
        </Stack>
        <Paper withBorder radius='md' p='md' style={isMobile ? undefined : { position: 'sticky', top: 12 }}>
          <Text fw={700} mb='sm'>Pago de hoy</Text>
          <PayPanel
            employeeId={employeeId}
            charges={charges}
            selected={[...selected]}
            summary={summary}
            now={now}
            onDone={() => setSelected(new Set())}
          />
        </Paper>
      </Box>
    );
  };

  const views = [
    { value: 'cuenta', label: isMobile ? 'Cuenta' : 'Resumen de cuenta' },
    { value: 'quincena', label: isMobile ? 'Quincenas' : 'Por quincena' },
    ...(isAdmin ? [{ value: 'pago', label: isMobile ? 'Pagar' : 'Armar el pago' }] : [])
  ];

  return (
    <Stack gap='md' pb={isAdmin && selected.size > 0 && view !== 'pago' ? 80 : 0}>
      {confirmModal}
      <SegmentedControl value={view} onChange={(v) => changeView(v as View)} data={views} fullWidth={isMobile} />
      {view === 'cuenta' ? accountView() : view === 'quincena' ? quincenaView() : payView()}

      {/* Barra de lo tildado (Resumen / Quincena): se va sumando y se paga junto */}
      {isAdmin && selected.size > 0 && view !== 'pago' && (
        <Paper
          withBorder
          shadow='md'
          p='sm'
          style={{ position: 'fixed', left: isMobile ? 0 : 80, right: 0, bottom: isMobile ? 66 : 0, zIndex: 150, borderRadius: 0 }}
        >
          <Group justify='space-between' wrap='wrap' gap='xs' maw={1200} mx='auto'>
            <Text>
              <b>{selected.size}</b> {selected.size === 1 ? 'renglón tildado' : 'renglones tildados'} · <b className='ledger-num'>{formatPrice(selectedDue)}</b>
            </Text>
            <Group gap='xs'>
              <Button variant='default' onClick={() => setSelected(new Set())}>Limpiar</Button>
              <Button onClick={() => setPayOpen(true)}>Pagar selección</Button>
            </Group>
          </Group>
        </Paper>
      )}

      {isAdmin && (
        <Modal opened={payOpen} onClose={() => setPayOpen(false)} title='Pagar lo tildado' centered fullScreen={isMobile}>
          <PayPanel
            employeeId={employeeId}
            charges={charges}
            selected={[...selected]}
            summary={summary}
            now={now}
            onDone={() => {
              setSelected(new Set());
              setPayOpen(false);
            }}
            onCancel={() => setPayOpen(false)}
          />
        </Modal>
      )}
    </Stack>
  );
}

