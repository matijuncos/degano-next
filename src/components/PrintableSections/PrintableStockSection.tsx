import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';
import {
  StockRow,
  StockSummaryRow,
  paginateStockLines,
  STOCK_LINE_HEIGHTS as H,
  StockLine
} from '@/utils/stockExport';
import { formatPrice } from '@/utils/priceUtils';

// Listado de stock para imprimir: A4 horizontal, agrupado por categoría.
// PERF: las hojas se arman a mano (paginateStockLines) con renglones de alto
// fijo; así react-pdf no tiene que partir un listado de miles de filas (que
// tardaba ~65 s con 2500 unidades).
const NEGRO = '#111111';
const GRIS = '#666666';
const LINEA = '#d0d0d0';

// A4 horizontal: 595 pt de alto. Útil = alto − márgenes (70 arriba, 36 abajo)
// = 489. Medido renderizando: bordes y totales ocupan un poco más de lo
// nominal → 470 deja margen y ninguna hoja se parte sola (verificado con el
// stock real: hojas calculadas = hojas del PDF).
const PAGE_BUDGET = 470;
const TOTALS_HEIGHT = 40; // bloque de totales de la primera hoja
const CONTENT_WIDTH = 842 - 56; // ancho útil en pt
const CHAR_W = 3.9; // ancho promedio de un carácter (Helvetica 7.5)

const styles = StyleSheet.create({
  page: { paddingTop: 70, paddingBottom: 36, paddingHorizontal: 28, fontSize: 7.5, color: NEGRO, fontFamily: 'Helvetica' },
  header: {
    position: 'absolute',
    top: 20,
    left: 28,
    right: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: NEGRO,
    paddingBottom: 6
  },
  logo: { width: 110, height: 30, objectFit: 'contain' },
  title: { fontSize: 14, fontFamily: 'Helvetica-Bold', textAlign: 'right' },
  subtitle: { fontSize: 8, color: GRIS, textAlign: 'right', marginTop: 2 },
  footer: { position: 'absolute', bottom: 16, left: 28, right: 28, flexDirection: 'row', justifyContent: 'space-between', fontSize: 7, color: GRIS },

  totals: { flexDirection: 'row', height: TOTALS_HEIGHT, alignItems: 'flex-start' },
  totalBox: { borderWidth: 1, borderColor: LINEA, paddingVertical: 3, paddingHorizontal: 8, marginRight: 6 },
  totalNum: { fontSize: 11, fontFamily: 'Helvetica-Bold' },
  totalLabel: { fontSize: 7, color: GRIS },

  cat: { height: H.cat, fontSize: 9.5, fontFamily: 'Helvetica-Bold', backgroundColor: '#ececec', paddingTop: 4, paddingHorizontal: 6 },
  sub: { height: H.sub, fontSize: 8.5, fontFamily: 'Helvetica-Bold', paddingTop: 3, paddingHorizontal: 6, color: '#333333' },
  thRow: { height: H.th, flexDirection: 'row', borderBottomWidth: 0.8, borderBottomColor: NEGRO, alignItems: 'flex-end', paddingBottom: 2 },
  th: { fontFamily: 'Helvetica-Bold', fontSize: 7.5, paddingHorizontal: 3 },
  tr: { height: H.row, flexDirection: 'row', borderBottomWidth: 0.4, borderBottomColor: LINEA, alignItems: 'center' },
  td: { paddingHorizontal: 3 },
  fuera: { color: '#b00000' }
});

type Col<T> = { label: string; pct: number; get: (r: T) => string; align?: 'left' | 'right' | 'center' };

// Un renglón de alto fijo: el texto que no entra se corta con "…"
// (los saltos de línea, ej. en un motivo de baja, se aplanan a un espacio)
const fit = (raw: string, pct: number) => {
  const text = raw.replace(/\s+/g, ' ').trim();
  const max = Math.max(4, Math.floor((CONTENT_WIDTH * pct) / 100 / CHAR_W) - 1);
  return text.length > max ? text.slice(0, max - 1) + '…' : text;
};

function Lines<T>({ lines, cols, isFuera }: { lines: StockLine<T>[]; cols: Col<T>[]; isFuera?: (r: T) => boolean }) {
  return (
    <>
      {lines.map((l, i) => {
        if (l.kind === 'cat') return <Text key={i} style={styles.cat}>{l.text}</Text>;
        if (l.kind === 'sub') return <Text key={i} style={styles.sub}>{l.text}</Text>;
        if (l.kind === 'th')
          return (
            <View key={i} style={styles.thRow}>
              {cols.map((c) => (
                <Text key={c.label} style={[styles.th, { width: `${c.pct}%`, textAlign: c.align || 'left' }]}>
                  {c.label}
                </Text>
              ))}
            </View>
          );
        const r = l.row;
        const red = isFuera?.(r);
        return (
          <View key={i} style={styles.tr}>
            {cols.map((c) => (
              <Text
                key={c.label}
                style={[styles.td, { width: `${c.pct}%`, textAlign: c.align || 'left' }, ...(red ? [styles.fuera] : [])]}
              >
                {fit(c.get(r), c.pct)}
              </Text>
            ))}
          </View>
        );
      })}
    </>
  );
}

export default function PrintableStockSection({
  mode,
  rows,
  summary,
  scopeLabel,
  includeOutOfService,
  withPrices
}: {
  mode: 'detalle' | 'resumen';
  rows: StockRow[];
  summary: StockSummaryRow[];
  scopeLabel: string; // "Todo el stock" o el nombre de la categoría
  includeOutOfService: boolean;
  withPrices: boolean;
}) {
  const fecha = new Date().toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Argentina/Buenos_Aires'
  });
  const disponibles = rows.filter((r) => r.estado === 'Disponible').length;
  const enUso = rows.filter((r) => r.estado === 'En uso').length;
  const fuera = rows.filter((r) => r.estado === 'Fuera de servicio').length;

  const detailCols: Col<StockRow>[] = [
    { label: 'Código', pct: 9, get: (r) => r.codigo },
    { label: 'Nombre', pct: withPrices ? 21 : 25, get: (r) => r.nombre },
    { label: 'Marca', pct: 10, get: (r) => r.marca },
    { label: 'Modelo', pct: 11, get: (r) => r.modelo },
    { label: 'N° serie', pct: 11, get: (r) => r.serie },
    { label: 'Propiedad', pct: 7, get: (r) => r.propiedad },
    { label: 'Ubicación', pct: 10, get: (r) => r.ubicacion },
    { label: 'Estado', pct: withPrices ? 11 : 17, get: (r) => (r.motivo ? `${r.estado} (${r.motivo})` : r.estado) },
    ...(withPrices
      ? [
          { label: 'Renta', pct: 5, align: 'right' as const, get: (r: StockRow) => (r.rentalPrice != null ? formatPrice(r.rentalPrice) : '') },
          { label: 'Inversión', pct: 5, align: 'right' as const, get: (r: StockRow) => (r.investmentPrice != null ? `US$ ${r.investmentPrice}` : '') }
        ]
      : [])
  ];
  const summaryCols: Col<StockSummaryRow>[] = [
    { label: 'Equipo', pct: 52, get: (r) => r.nombre },
    { label: 'Total', pct: 12, align: 'center', get: (r) => String(r.total) },
    { label: 'Disponibles', pct: 12, align: 'center', get: (r) => String(r.disponibles) },
    { label: 'En uso', pct: 12, align: 'center', get: (r) => String(r.enUso) },
    { label: 'Fuera de servicio', pct: 12, align: 'center', get: (r) => (r.fueraDeServicio ? String(r.fueraDeServicio) : '') }
  ];

  const pages =
    mode === 'detalle'
      ? paginateStockLines(rows, { budget: PAGE_BUDGET, firstBudget: PAGE_BUDGET - TOTALS_HEIGHT })
      : paginateStockLines(summary, { budget: PAGE_BUDGET, firstBudget: PAGE_BUDGET - TOTALS_HEIGHT });
  const total = pages.length;

  return (
    <Document title={`Stock Degano - ${scopeLabel}`}>
      {pages.map((lines, pi) => (
        <Page key={pi} size='A4' orientation='landscape' style={styles.page}>
          <View style={styles.header}>
            <Image src='/degano-logo-imp.png' style={styles.logo} />
            <View>
              <Text style={styles.title}>
                Stock de equipamiento — {mode === 'detalle' ? 'detalle por unidad' : 'resumen por equipo'}
              </Text>
              <Text style={styles.subtitle}>
                {scopeLabel} · {fecha}
                {includeOutOfService ? '' : ' · sin equipos fuera de servicio'}
              </Text>
            </View>
          </View>
          <View style={styles.footer}>
            <Text>Degano Sonido e Iluminación</Text>
            <Text>
              Hoja {pi + 1} de {total}
            </Text>
          </View>

          {pi === 0 && (
            <View style={styles.totals}>
              {[
                [rows.length, 'unidades'],
                [disponibles, 'disponibles'],
                [enUso, 'en uso'],
                [fuera, 'fuera de servicio']
              ].map(([n, l]) => (
                <View key={String(l)} style={styles.totalBox}>
                  <Text style={styles.totalNum}>{n}</Text>
                  <Text style={styles.totalLabel}>{l}</Text>
                </View>
              ))}
            </View>
          )}
          {pi === 0 && lines.length === 0 && <Text>No hay equipos para mostrar.</Text>}

          {mode === 'detalle' ? (
            <Lines lines={lines as StockLine<StockRow>[]} cols={detailCols} isFuera={(r) => r.estado === 'Fuera de servicio'} />
          ) : (
            <Lines lines={lines as StockLine<StockSummaryRow>[]} cols={summaryCols} />
          )}
        </Page>
      ))}
    </Document>
  );
}
