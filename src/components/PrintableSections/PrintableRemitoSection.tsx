import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';
import { EventModel } from '@/context/types';
import { groupEquipmentByNameCount } from '@/utils/equipmentGroupUtils';

// Datos fiscales de Degano (del remito en papel)
const DEGANO = {
  razonSocial: 'DEGANO SONIDO / ILUMINACIÓN',
  titular: 'Juan Tomás Degano',
  direccion: 'El Yunque 1088 - Bº La Herradura - Villa Allende (5105) - Córdoba',
  tel: '0351 - 155316512',
  iva: 'Responsable Monotributo',
  cuit: '20-31009890-7',
  ingBrutos: '270699715',
  inicioAct: '15/08/2007'
};

const VERDE = '#6aa74f';

const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 10, color: '#222', fontFamily: 'Helvetica' },

  // Encabezado
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottom: `2px solid ${VERDE}`,
    paddingBottom: 10,
    marginBottom: 12
  },
  logo: { width: 180, height: 50, objectFit: 'contain' },
  fiscalBox: { maxWidth: 250, textAlign: 'right' },
  razonSocial: { fontSize: 12, fontWeight: 'bold', color: VERDE, marginBottom: 2 },
  fiscalLine: { fontSize: 8, color: '#444', lineHeight: 1.3 },

  // Barra de título REMITO
  titleBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: VERDE,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 4
  },
  titleText: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF', letterSpacing: 2 },
  numeroText: { fontSize: 11, fontWeight: 'bold', color: '#FFFFFF' },

  noValida: {
    fontSize: 8,
    color: '#c92a2a',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12
  },

  // Datos del destinatario
  destinatarioBox: {
    border: '1px solid #d0d0d0',
    borderRadius: 4,
    padding: 8,
    marginBottom: 12
  },
  row: { flexDirection: 'row', marginBottom: 3 },
  label: { fontSize: 9, fontWeight: 'bold', color: '#555', width: 90 },
  value: { fontSize: 9, color: '#222', flex: 1 },
  // Fila con línea vacía para completar a mano
  rowFill: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 6 },
  fillLine: { flex: 1, borderBottom: '0.7px solid #999', height: 12 },
  // Campos inline (CUIT / Ing. Brutos / IVA) en una sola línea
  inlineRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 3 },
  labelInline: { fontSize: 9, fontWeight: 'bold', color: '#555', marginRight: 3 },
  valueInline: { fontSize: 9, color: '#222', flex: 1, marginRight: 10 },
  fillLineSm: {
    flex: 1,
    borderBottom: '0.7px solid #999',
    height: 12,
    marginRight: 10
  },

  // Equipamiento (columnas compactas)
  table: { marginBottom: 16 },
  sectionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: VERDE,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 6
  },
  sectionBarText: { fontSize: 10, fontWeight: 'bold', color: '#FFFFFF', letterSpacing: 1 },
  sectionBarHint: { fontSize: 8, color: '#eaf5e4' },
  columnsWrap: { flexDirection: 'row' },
  column: { flex: 1, paddingRight: 12 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 1.5,
    borderBottom: '0.5px solid #eeeeee'
  },
  itemCant: {
    width: 20,
    fontSize: 8,
    fontWeight: 'bold',
    textAlign: 'right',
    marginRight: 6,
    color: VERDE
  },
  itemDesc: { flex: 1, fontSize: 8 },
  tercerizado: { color: '#c92a2a' },

  // Pie: Recibí Conforme + línea punteada
  footer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 45
  },
  reciboConforme: { fontSize: 10, fontWeight: 'bold', color: '#222', marginRight: 8 },
  dottedLine: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#555',
    borderBottomStyle: 'dotted',
    height: 16
  }
});

const formatDate = (date: Date | string | undefined) => {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

interface PrintableRemitoSectionProps {
  event: EventModel;
  remitoNumber?: string;
  // Campos editables antes de generar. Si vienen vacíos → línea para completar a mano.
  domicilio?: string;
  localidad?: string;
  transportista?: string;
  transportistaDomicilio?: string;
  cuit?: string;
  ingBrutos?: string;
  iva?: string;
}

// Filas del remito: equipamiento real (Cant. + Descripción) + los "a tercerizar"
// marcados en rojo. Sin precios (decisión de negocio).
const buildRows = (event: EventModel) => {
  const rows: { cant: number; desc: string; tercerizado?: boolean }[] = [];
  const byName = groupEquipmentByNameCount(event.equipment || []);
  Object.entries(byName).forEach(([name, cant]) =>
    rows.push({ cant, desc: name })
  );
  (event.extraEquipment || []).forEach((e) =>
    rows.push({ cant: e.quantity, desc: `${e.name} (tercerizado)`, tercerizado: true })
  );
  return rows;
};

// Fila "Label: valor" o, si el valor está vacío, línea para completar a mano.
const FieldRow = ({ label, value }: { label: string; value?: string }) => {
  const v = value && value.trim();
  return (
    <View style={v ? styles.row : styles.rowFill}>
      <Text style={styles.label}>{label}</Text>
      {v ? <Text style={styles.value}>{v}</Text> : <View style={styles.fillLine} />}
    </View>
  );
};

// Campo inline (CUIT / Ing. Brutos / IVA): valor o línea corta.
const InlineField = ({ label, value }: { label: string; value?: string }) => {
  const v = value && value.trim();
  return (
    <>
      <Text style={styles.labelInline}>{label}</Text>
      {v ? (
        <Text style={styles.valueInline}>{v}</Text>
      ) : (
        <View style={styles.fillLineSm} />
      )}
    </>
  );
};

const PrintableRemitoSection: React.FC<PrintableRemitoSectionProps> = ({
  event,
  remitoNumber,
  domicilio,
  localidad,
  transportista,
  transportistaDomicilio,
  cuit,
  ingBrutos,
  iva
}) => {
  const rows = buildRows(event);

  // Reparte el equipamiento en columnas para que entre siempre en UNA hoja.
  // 1 col hasta ~38 ítems, 2 col hasta ~76, 3 col para más (rinde ~120).
  const colCount = rows.length > 76 ? 3 : rows.length > 38 ? 2 : 1;
  const perCol = Math.ceil(rows.length / colCount) || 1;
  const columns = Array.from({ length: colCount }, (_, c) =>
    rows.slice(c * perCol, (c + 1) * perCol)
  );

  // Nombre del PDF: "REMITO - CLIENTE - EVENTO"
  const docTitle = [
    'REMITO',
    event.fullName || 'Cliente',
    event.type || 'Evento'
  ]
    .filter(Boolean)
    .join(' - ');

  return (
    <Document title={docTitle}>
      <Page size='A4' style={styles.page}>
        {/* Encabezado: logo + datos fiscales */}
        <View style={styles.header}>
          <Image src='/degano-logo-imp.png' style={styles.logo} />
          <View style={styles.fiscalBox}>
            <Text style={styles.razonSocial}>{DEGANO.razonSocial}</Text>
            <Text style={styles.fiscalLine}>de {DEGANO.titular}</Text>
            <Text style={styles.fiscalLine}>{DEGANO.direccion}</Text>
            <Text style={styles.fiscalLine}>Tel: {DEGANO.tel}</Text>
            <Text style={styles.fiscalLine}>IVA: {DEGANO.iva}</Text>
            <Text style={styles.fiscalLine}>
              CUIT: {DEGANO.cuit} · Ing. Brutos: {DEGANO.ingBrutos}
            </Text>
            <Text style={styles.fiscalLine}>Inicio Act.: {DEGANO.inicioAct}</Text>
          </View>
        </View>

        {/* Título REMITO + número + fecha (siempre la de hoy) */}
        <View style={styles.titleBar}>
          <Text style={styles.titleText}>REMITO</Text>
          <Text style={styles.numeroText}>
            Nº {remitoNumber || '—'}   ·   Fecha: {formatDate(new Date())}
          </Text>
        </View>
        <Text style={styles.noValida}>DOCUMENTO NO VÁLIDO COMO FACTURA</Text>

        {/* Destinatario */}
        <View style={styles.destinatarioBox}>
          <View style={styles.row}>
            <Text style={styles.label}>Destinatario:</Text>
            <Text style={styles.value}>
              {event.company ? `${event.company} — ` : ''}
              {event.fullName || '—'}
            </Text>
          </View>
          <FieldRow label='Domicilio:' value={domicilio} />
          <FieldRow label='Localidad:' value={localidad} />
          <View style={styles.row}>
            <Text style={styles.label}>Evento / Lugar:</Text>
            <Text style={styles.value}>
              {[event.type, event.lugar].filter(Boolean).join(' — ') || '—'}
            </Text>
          </View>
        </View>

        {/* Transportista (editable antes de generar; vacío → línea a mano) */}
        <View style={styles.destinatarioBox}>
          <FieldRow label='Transportista:' value={transportista} />
          <FieldRow label='Domicilio:' value={transportistaDomicilio} />
          <View style={styles.inlineRow}>
            <InlineField label='CUIT:' value={cuit} />
            <InlineField label='Ing. Brutos:' value={ingBrutos} />
            <InlineField label='IVA:' value={iva} />
          </View>
        </View>

        {/* Equipamiento — columnas adaptativas para entrar en una sola hoja */}
        <View style={styles.table}>
          <View style={styles.sectionBar}>
            <Text style={styles.sectionBarText}>EQUIPAMIENTO</Text>
            <Text style={styles.sectionBarHint}>Cant. · Descripción</Text>
          </View>
          {rows.length > 0 ? (
            <View style={styles.columnsWrap}>
              {columns.map((col, ci) => (
                <View key={ci} style={styles.column}>
                  {col.map((r, i) => (
                    <View key={i} style={styles.itemRow} wrap={false}>
                      <Text style={styles.itemCant}>{r.cant}</Text>
                      <Text
                        style={[
                          styles.itemDesc,
                          ...(r.tercerizado ? [styles.tercerizado] : [])
                        ]}
                      >
                        {r.desc}
                      </Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.itemDesc}>Sin equipamiento cargado.</Text>
          )}
        </View>

        {/* Pie: Recibí Conforme + línea punteada (como el remito de papel) */}
        <View style={styles.footer}>
          <Text style={styles.reciboConforme}>Recibí Conforme:</Text>
          <View style={styles.dottedLine} />
        </View>
      </Page>
    </Document>
  );
};

export default PrintableRemitoSection;
