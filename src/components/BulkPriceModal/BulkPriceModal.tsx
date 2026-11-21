// src/components/BulkPriceModal/BulkPriceModal.tsx
// Equipamiento → "Aumentar precios" (SOLO admin). Paso 1: a qué equipos, qué
// precio y cuánto (porcentaje o monto fijo, exacto, sin redondeos). Paso 2:
// vista previa agrupada por equipo con el precio nuevo EDITABLE (gana lo
// tipeado). Aplicar = 1 request; deja historial por equipo y se puede deshacer.
'use client';
import { useMemo, useState } from 'react';
import useSWR, { mutate } from 'swr';
import {
  Modal, Stack, Group, Text, MultiSelect, Checkbox, SegmentedControl, NumberInput, Button, Table, Alert, Badge, Center, Loader
} from '@mantine/core';
import { IconArrowBackUp } from '@tabler/icons-react';
import { EQUIPMENT_SWR_OPTS } from '@/hooks/useEquipmentStatusMap';
import { useResponsive } from '@/hooks/useResponsive';
import useNotification from '@/hooks/useNotification';
import { useConfirm } from '@/components/ConfirmModal/useConfirm';
import { formatPrice } from '@/utils/priceUtils';
import { categoryPaths } from '@/utils/stockExport';
import { previewGroups, buildChanges, overrideKey, IncreaseMode, PriceField } from '@/utils/bulkPrice';

const fetcher = (url: string) =>
  fetch(url, { cache: 'no-store' }).then(async (r) => {
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data?.error || 'Error al cargar');
    return data;
  });

const FIELD_LABEL: Record<PriceField, string> = { rentalPrice: 'Alquiler', investmentPrice: 'Inversión' };

export default function BulkPriceModal({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const { isMobile } = useResponsive();
  const notify = useNotification();
  const [confirm, confirmModal] = useConfirm();
  // Mismas claves SWR que Equipamiento (ya cargadas): abrir no hace requests
  const { data: equipment } = useSWR<any[]>(opened ? '/api/equipment' : null, fetcher, EQUIPMENT_SWR_OPTS);
  const { data: categories } = useSWR<any[]>(opened ? '/api/categories' : null, fetcher, EQUIPMENT_SWR_OPTS);
  const { data: lastData } = useSWR<{ last: any }>(opened ? '/api/equipment/bulkPrice' : null, fetcher, EQUIPMENT_SWR_OPTS);

  const [step, setStep] = useState<1 | 2>(1);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [fields, setFields] = useState<PriceField[]>(['rentalPrice']);
  const [mode, setMode] = useState<IncreaseMode>('percent');
  const [value, setValue] = useState<number | string>('');
  const [overrides, setOverrides] = useState<Record<string, number | null>>({});
  const [busy, setBusy] = useState(false);
  // La vista previa trabaja sobre una FOTO de los precios recién pedidos: si SWR
  // revalida mientras se edita, no cambian los grupos ni se pierde lo tipeado.
  // El servidor igual rechaza (409) si un precio cambió desde esta foto.
  const [snapshot, setSnapshot] = useState<any[] | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const categoryOptions = useMemo(() => {
    const paths = categoryPaths(categories || []);
    return (categories || [])
      .map((c) => ({ value: String(c._id), label: (paths.get(String(c._id)) || [c.name]).join(' › ') }))
      .sort((a, b) => a.label.localeCompare(b.label, 'es', { numeric: true }));
  }, [categories]);

  const numValue = typeof value === 'number' ? value : Number(value);
  const groups = useMemo(
    () =>
      step === 2 && snapshot && Number.isFinite(numValue)
        ? previewGroups(snapshot, categories || [], { categoryIds, fields, mode, value: numValue })
        : [],
    [step, snapshot, categories, categoryIds, fields, mode, numValue]
  );
  const changes = useMemo(() => buildChanges(groups, overrides), [groups, overrides]);

  const canPreview = fields.length > 0 && value !== '' && Number.isFinite(numValue) && numValue !== 0;
  const close = () => {
    setStep(1);
    setOverrides({});
    setSnapshot(null);
    onClose();
  };

  // 1 request: precios frescos para que la vista previa no parta de la caché
  const openPreview = async () => {
    setLoadingPreview(true);
    try {
      const fresh = await mutate<any[]>('/api/equipment');
      setSnapshot(Array.isArray(fresh) ? fresh : equipment || []);
      setOverrides({});
      setStep(2);
    } catch (e: any) {
      notify({ type: 'defaultError', message: e?.message || 'No se pudieron cargar los precios' });
    } finally {
      setLoadingPreview(false);
    }
  };

  const apply = async () => {
    const ok = await confirm({
      title: '¿Aplicar el aumento?',
      message: `Se van a actualizar los precios de ${changes.length} ${changes.length === 1 ? 'equipo' : 'equipos'}. Queda en el historial de cada uno y lo podés deshacer.`,
      confirmLabel: 'Aplicar'
    });
    if (!ok) return;
    setBusy(true);
    notify({ loading: true });
    try {
      const desc =
        mode === 'percent' ? `Aumento masivo de precios: ${numValue}%` : `Aumento masivo de precios: ${numValue > 0 ? '+' : ''}${formatPrice(numValue)}`;
      const r = await fetch('/api/equipment/bulkPrice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'apply', changes, description: desc })
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        // Pudo haber escrito una parte (o cambiaron precios): refrescar igual y volver al paso 1
        await Promise.all([mutate('/api/equipment'), mutate('/api/equipment/bulkPrice')]).catch(() => {});
        setStep(1);
        throw new Error(data?.error || 'No se pudo aplicar el aumento');
      }
      await Promise.all([mutate('/api/equipment'), mutate('/api/equipment/bulkPrice')]);
      notify({ title: 'Precios actualizados', message: `${data.count} equipos con precio nuevo` });
      close();
    } catch (e: any) {
      notify({ type: 'defaultError', message: e?.message });
    } finally {
      setBusy(false);
    }
  };

  const last = lastData?.last;
  const undo = async () => {
    const ok = await confirm({
      title: '¿Deshacer el último aumento?',
      message: `${last.description} (${last.count} equipos). Los que se editaron a mano después no se tocan.`,
      confirmLabel: 'Deshacer'
    });
    if (!ok) return;
    setBusy(true);
    notify({ loading: true });
    try {
      const r = await fetch('/api/equipment/bulkPrice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'undo' })
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        await mutate('/api/equipment/bulkPrice').catch(() => {});
        throw new Error(data?.error || 'No se pudo deshacer');
      }
      await Promise.all([mutate('/api/equipment'), mutate('/api/equipment/bulkPrice')]);
      notify({
        title: 'Aumento deshecho',
        message: `${data.restored} equipos volvieron al precio anterior${data.skipped ? `; ${data.skipped} no se tocaron (se editaron después)` : ''}`
      });
    } catch (e: any) {
      notify({ type: 'defaultError', message: e?.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    // Paso 1 es un formulario corto: modal angosto. Paso 2 (tabla): más ancho.
    <Modal opened={opened} onClose={close} title={<Text fw={700}>Aumentar precios</Text>} size={step === 2 ? 'xl' : 'lg'} fullScreen={isMobile}>
      {confirmModal}
      {!equipment || !categories ? (
        <Center h={200}><Loader /></Center>
      ) : step === 1 ? (
        <Stack gap='md'>
          {last && !last.undoneAt && (
            <Alert color='gray' variant='light'>
              <Group justify='space-between' wrap='wrap' gap='xs'>
                <Text size='sm'>
                  Último: {last.description} · {last.count} equipos · {new Date(last.createdAt).toLocaleDateString('es-AR')}
                </Text>
                <Button size='compact-sm' variant='light' color='red' leftSection={<IconArrowBackUp size={14} />} onClick={undo} loading={busy}>
                  Deshacer último aumento
                </Button>
              </Group>
            </Alert>
          )}
          <MultiSelect
            label='Equipos'
            description='Elegí categorías enteras (incluye sus subcategorías). Vacío = todo el stock.'
            // Mantine deja el placeholder al lado de lo elegido: solo con el campo vacío
            placeholder={categoryIds.length ? undefined : 'Todo el stock'}
            data={categoryOptions}
            value={categoryIds}
            onChange={setCategoryIds}
            searchable
            clearable
          />
          <Checkbox.Group label='Qué precio' value={fields} onChange={(v) => setFields(v as PriceField[])}>
            <Group mt={6}>
              <Checkbox value='rentalPrice' label='Alquiler' />
              <Checkbox value='investmentPrice' label='Inversión' />
            </Group>
          </Checkbox.Group>
          <Stack gap={6}>
            <Text size='sm' fw={500}>Cuánto</Text>
            <Group align='flex-end' wrap='wrap'>
              <SegmentedControl
                value={mode}
                onChange={(v) => setMode(v as IncreaseMode)}
                data={[
                  { value: 'percent', label: 'Porcentaje' },
                  { value: 'fixed', label: 'Monto fijo' }
                ]}
              />
              <NumberInput
                value={value}
                onChange={setValue}
                placeholder={mode === 'percent' ? 'Ej. 15' : 'Ej. 5000'}
                suffix={mode === 'percent' ? ' %' : undefined}
                prefix={mode === 'fixed' ? '$ ' : undefined}
                thousandSeparator='.'
                decimalSeparator=','
                allowDecimal
                w={160}
              />
            </Group>
            <Text size='xs' c='dimmed'>Exacto, sin redondeos. En el paso siguiente podés escribir otro precio en cualquier equipo.</Text>
          </Stack>
          <Group>
            <Button disabled={!canPreview} loading={loadingPreview} onClick={openPreview}>
              Ver vista previa
            </Button>
          </Group>
        </Stack>
      ) : (
        <Stack gap='sm'>
          <Group justify='space-between' wrap='wrap'>
            <Text size='sm'>
              <b>{changes.length}</b> {changes.length === 1 ? 'equipo cambia' : 'equipos cambian'} ·{' '}
              {mode === 'percent' ? `${numValue}%` : `${numValue > 0 ? '+' : ''}${formatPrice(numValue)}`} ·{' '}
              {fields.map((f) => FIELD_LABEL[f]).join(' y ')}
            </Text>
            <Group gap='xs'>
              <Button variant='default' onClick={() => setStep(1)}>Volver</Button>
              <Button onClick={apply} disabled={!changes.length} loading={busy}>Aplicar aumento</Button>
            </Group>
          </Group>
          {!groups.length ? (
            <Text c='dimmed' ta='center' py='lg'>Ningún equipo de esa selección tiene ese precio cargado.</Text>
          ) : (
            <Table.ScrollContainer minWidth={isMobile ? 0 : 640}>
              <Table striped verticalSpacing={6}>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Equipo</Table.Th>
                    {fields.map((f) => (
                      <Table.Th key={f}>{FIELD_LABEL[f]}: actual → nuevo</Table.Th>
                    ))}
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {groups.map((g) => (
                    <Table.Tr key={g.key}>
                      <Table.Td>
                        <Text size='sm' fw={500} component='div'>
                          {g.name} <Badge size='xs' variant='light' color='gray'>{g.ids.length} u.</Badge>
                        </Text>
                        <Text size='xs' c='dimmed'>{g.path}</Text>
                      </Table.Td>
                      {fields.map((f) => {
                        const p = g.prices[f];
                        if (!p) return <Table.Td key={f}><Text size='xs' c='dimmed'>Sin precio</Text></Table.Td>;
                        const k = overrideKey(g.key, f);
                        const typed = overrides[k];
                        return (
                          <Table.Td key={f}>
                            <Group gap={6} wrap='nowrap'>
                              <Text size='sm' c='dimmed' className='ledger-num'>{formatPrice(p.old)}</Text>
                              <Text size='sm'>→</Text>
                              <NumberInput
                                size='xs'
                                w={130}
                                value={typed ?? p.new}
                                onChange={(v) => setOverrides((prev) => ({ ...prev, [k]: typeof v === 'number' ? v : null }))}
                                prefix='$ '
                                thousandSeparator='.'
                                decimalSeparator=','
                                allowDecimal
                                allowNegative={false}
                                aria-label={`Precio nuevo de ${FIELD_LABEL[f]} para ${g.name}`}
                              />
                            </Group>
                          </Table.Td>
                        );
                      })}
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          )}
        </Stack>
      )}
    </Modal>
  );
}
