'use client';
import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { Modal, Stack, Text, Group, Button, SegmentedControl, Switch, Loader, Center, Divider, Alert, SimpleGrid } from '@mantine/core';
import { IconPrinter, IconDownload, IconFileSpreadsheet, IconFileTypeCsv } from '@tabler/icons-react';
import { usePermissions } from '@/hooks/usePermissions';
import { EQUIPMENT_SWR_OPTS } from '@/hooks/useEquipmentStatusMap';
import useNotification from '@/hooks/useNotification';
import { saveBlob, savePdfBlob } from '@/utils/savePdfBlob';
import {
  buildStockRows,
  summarizeStock,
  stockColumns,
  toCsv,
  stockFileName,
  StockRow
} from '@/utils/stockExport';

const fetcher = (url: string) => fetch(url, { cache: 'no-store' }).then((r) => r.json());

/**
 * Imprimir (PDF) y exportar (Excel / CSV) el stock de equipamiento.
 * PERF: usa las mismas claves SWR que la pantalla de Equipamiento (ya cargadas
 * → 0 requests extra) y carga las librerías de PDF/Excel recién al hacer click.
 */
export default function StockExportModal({
  opened,
  onClose,
  selectedCategory
}: {
  opened: boolean;
  onClose: () => void;
  selectedCategory?: { _id: string; name: string; categoryId?: string } | null;
}) {
  const { can } = usePermissions();
  const withPrices = can('canViewEquipmentPrices');
  const notify = useNotification();
  const { data: equipment } = useSWR<any[]>(opened ? '/api/equipment' : null, fetcher, EQUIPMENT_SWR_OPTS);
  const { data: categories } = useSWR<any[]>(opened ? '/api/categories' : null, fetcher, EQUIPMENT_SWR_OPTS);

  // Solo se puede acotar a una CATEGORÍA (no a un equipo suelto)
  const scopeCategory = selectedCategory && !selectedCategory.categoryId ? selectedCategory : null;
  const [scope, setScope] = useState<'todo' | 'categoria'>('todo');
  const [includeOut, setIncludeOut] = useState(true);
  const [mode, setMode] = useState<'detalle' | 'resumen'>('resumen');
  const [busy, setBusy] = useState<string | null>(null);
  // PDF ya generado, por si el navegador bloqueó la pestaña nueva
  const [readyPdfUrl, setReadyPdfUrl] = useState<string | null>(null);

  // Liberar la URL del PDF al cerrar o al generar otro
  useEffect(() => {
    if (!opened && readyPdfUrl) {
      URL.revokeObjectURL(readyPdfUrl);
      setReadyPdfUrl(null);
    }
  }, [opened, readyPdfUrl]);

  const useCategory = scope === 'categoria' && !!scopeCategory;
  const scopeLabel = useCategory ? scopeCategory!.name : 'Todo el stock';

  const rows: StockRow[] = useMemo(
    () =>
      Array.isArray(equipment) && Array.isArray(categories)
        ? buildStockRows(equipment, categories, {
            scopeCategoryId: useCategory ? String(scopeCategory!._id) : null,
            includeOutOfService: includeOut
          })
        : [],
    [equipment, categories, useCategory, scopeCategory, includeOut]
  );
  const summary = useMemo(() => summarizeStock(rows), [rows]);
  const loading = !Array.isArray(equipment) || !Array.isArray(categories);
  const fileName = stockFileName(useCategory ? scopeCategory!.name : null);

  const run = async (key: string, fn: () => Promise<void>) => {
    try {
      setBusy(key);
      await fn();
    } catch (e: any) {
      console.error('[StockExport]', e);
      notify({ type: 'defaultError', message: 'No se pudo generar el archivo. Probá de nuevo.' });
    } finally {
      setBusy(null);
    }
  };

  const buildPdf = async () => {
    const [{ pdf }, { default: PrintableStockSection }] = await Promise.all([
      import('@react-pdf/renderer'),
      import('@/components/PrintableSections/PrintableStockSection')
    ]);
    return pdf(
      <PrintableStockSection
        mode={mode}
        rows={rows}
        summary={summary}
        scopeLabel={scopeLabel}
        includeOutOfService={includeOut}
        withPrices={withPrices}
      />
    ).toBlob();
  };

  // Ver / imprimir: se genera PRIMERO (con esta pestaña en primer plano) y
  // después se abre. Si se abría la pestaña antes, esta quedaba en segundo
  // plano, Chrome la frenaba y el PDF no terminaba nunca (pestaña en blanco y
  // los demás botones trabados). Si el navegador bloquea la ventana nueva
  // (pasaron unos segundos desde el click), queda el botón "Abrir PDF".
  const viewPdf = () =>
    run('ver', async () => {
      if (readyPdfUrl) URL.revokeObjectURL(readyPdfUrl);
      setReadyPdfUrl(null);
      const url = URL.createObjectURL(await buildPdf());
      setReadyPdfUrl(url);
      window.open(url, '_blank');
    });

  const downloadPdf = () => run('pdf', async () => savePdfBlob(await buildPdf(), `${fileName} - ${mode}`));

  const downloadExcel = () =>
    run('xlsx', async () => {
      const { default: writeExcelFile } = await import('write-excel-file/universal');
      const cols = stockColumns(withPrices);
      const header = (labels: string[]) => labels.map((value) => ({ value, fontWeight: 'bold' as const }));
      const detail = [
        header(cols.map((c) => c.label)),
        ...rows.map((r) =>
          cols.map((c) => {
            const v = r[c.key];
            return typeof v === 'number' ? { value: v, type: Number, format: '#,##0' } : { value: v ? String(v) : '' };
          })
        )
      ];
      const resumen = [
        header(['Categoría', 'Subcategoría', 'Equipo', 'Total', 'Disponibles', 'En uso', 'Fuera de servicio']),
        ...summary.map((s) => [
          { value: s.categoria },
          { value: s.subcategoria },
          { value: s.nombre },
          { value: s.total, type: Number },
          { value: s.disponibles, type: Number },
          { value: s.enUso, type: Number },
          { value: s.fueraDeServicio, type: Number }
        ])
      ];
      const widths = (ws: number[]) => ws.map((width) => ({ width }));
      const blob = await writeExcelFile([
        {
          data: resumen as any,
          sheet: 'Resumen',
          columns: widths([16, 22, 36, 8, 12, 9, 16]),
          stickyRowsCount: 1
        },
        {
          data: detail as any,
          sheet: 'Detalle',
          columns: widths(cols.map((c) => (c.key === 'nombre' ? 34 : c.key === 'subcategoria' ? 22 : c.key === 'motivo' ? 26 : 14))),
          stickyRowsCount: 1
        }
      ]).toBlob();
      await saveBlob(blob, fileName, '.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    });

  const downloadCsv = () =>
    run('csv', async () => {
      const csv = toCsv(rows as any, stockColumns(withPrices));
      await saveBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), fileName, '.csv', 'text/csv');
    });

  return (
    <Modal opened={opened} onClose={onClose} title='Imprimir / exportar stock' centered size='md'>
      {loading ? (
        <Center py='xl'>
          <Loader />
        </Center>
      ) : (
        <Stack gap='sm'>
          <Text size='xs' fw={600} c='dimmed' tt='uppercase'>Qué incluir</Text>
          <SegmentedControl
            fullWidth
            value={useCategory ? 'categoria' : 'todo'}
            onChange={(v) => setScope(v as 'todo' | 'categoria')}
            data={[
              { value: 'todo', label: 'Todo el stock' },
              {
                value: 'categoria',
                label: scopeCategory ? `Solo ${scopeCategory.name}` : 'Solo una categoría',
                disabled: !scopeCategory
              }
            ]}
          />
          {!scopeCategory && (
            <Text size='xs' c='dimmed'>
              Para exportar una sola categoría, seleccionala en el árbol antes de abrir esta ventana.
            </Text>
          )}
          <Switch
            label='Incluir equipos fuera de servicio (baja / reparación)'
            checked={includeOut}
            onChange={(e) => setIncludeOut(e.currentTarget.checked)}
          />
          <Text size='sm'>
            <b>{rows.length}</b> unidades · <b>{summary.length}</b> equipos distintos
            {withPrices ? ' · con precios' : ''}
          </Text>

          <Divider label='Imprimir (PDF)' labelPosition='left' />
          <Text size='xs' c='dimmed'>Esta opción cambia solo el PDF (el Excel trae las dos hojas).</Text>
          <SegmentedControl
            fullWidth
            value={mode}
            onChange={(v) => setMode(v as 'detalle' | 'resumen')}
            data={[
              { value: 'resumen', label: 'Resumen por equipo' },
              { value: 'detalle', label: 'Detalle por unidad' }
            ]}
          />
          <SimpleGrid cols={{ base: 1, xs: 2 }} spacing='xs'>
            <Button
              leftSection={<IconPrinter size={16} />}
              onClick={viewPdf}
              loading={busy === 'ver'}
              disabled={!rows.length || !!busy}
            >
              Ver / imprimir
            </Button>
            <Button
              variant='light'
              leftSection={<IconDownload size={16} />}
              onClick={downloadPdf}
              loading={busy === 'pdf'}
              disabled={!rows.length || !!busy}
            >
              Descargar PDF
            </Button>
          </SimpleGrid>
          {/* Aviso ANTES de generar: el detalle de muchas unidades tarda */}
          {mode === 'detalle' && rows.length > 800 && !busy && (
            <Text size='xs' c='yellow.5'>
              Son {rows.length} unidades: el PDF puede tardar unos segundos.
            </Text>
          )}
          {(busy === 'ver' || busy === 'pdf') && (
            <Group gap='xs'>
              <Loader size='xs' />
              <Text size='xs' c='dimmed'>Generando el PDF…</Text>
            </Group>
          )}
          {!busy && readyPdfUrl && (
            <Alert color='blue' variant='light' p='xs'>
              <Group justify='space-between' gap='xs'>
                <Text size='xs'>El PDF está listo. Si no se abrió solo:</Text>
                <Button component='a' href={readyPdfUrl} target='_blank' rel='noopener' size='compact-xs'>
                  Abrir PDF
                </Button>
              </Group>
            </Alert>
          )}

          <Divider label='Exportar' labelPosition='left' />
          <SimpleGrid cols={{ base: 1, xs: 2 }} spacing='xs'>
            <Button
              variant='light'
              color='green'
              leftSection={<IconFileSpreadsheet size={16} />}
              onClick={downloadExcel}
              loading={busy === 'xlsx'}
              disabled={!rows.length || !!busy}
            >
              Excel (.xlsx)
            </Button>
            <Button
              variant='default'
              leftSection={<IconFileTypeCsv size={16} />}
              onClick={downloadCsv}
              loading={busy === 'csv'}
              disabled={!rows.length || !!busy}
            >
              CSV
            </Button>
          </SimpleGrid>
          <Text size='xs' c='dimmed'>
            El Excel trae dos hojas: Resumen (por equipo) y Detalle (por unidad).
          </Text>
        </Stack>
      )}
    </Modal>
  );
}
