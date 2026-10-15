import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';
import { EventModel } from '@/context/types';
import { groupEquipmentByNameCount } from '@/utils/equipmentGroupUtils';
import { paginateRemitoRows, remitoDateParts, IVA_OPTIONS } from '@/utils/remitoLayout';

// Datos fiscales de Degano (de la factura de ARCA, oct/2026)
const DEGANO = {
  titular: 'Juan Tomás Degano',
  direccion: 'Sayri Tupac 7488 - Villa Quisquizacate',
  localidad: 'Córdoba',
  tel: '0351 155316512',
  iva: 'IVA RESPONSABLE INSCRIPTO',
  cuit: '20-31009890-7',
  ingBrutos: '270699715 - CV 620173975',
  inicioAct: '21/08/2007'
};

// Estilo formulario de imprenta: blanco y negro, recuadros y renglones punteados
const NEGRO = '#000000';
const GRIS = '#555555';
const ROW_H = 14; // alto fijo de renglón (ver utils/remitoLayout)

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 9, color: NEGRO, fontFamily: 'Helvetica' },
  box: { borderWidth: 1, borderColor: NEGRO, borderStyle: 'solid' },

  // ── Encabezado: [emisor] [R] [REMITO / número / fecha / fiscales]
  header: { flexDirection: 'row', marginBottom: 6 },
  emisor: { flex: 1, borderWidth: 1, borderColor: NEGRO, justifyContent: 'space-between' },
  emisorBody: { alignItems: 'center', paddingTop: 8, paddingHorizontal: 8, paddingBottom: 4 },
  logo: { width: 150, height: 42, objectFit: 'contain', marginBottom: 4 },
  emisorLine: { fontSize: 8, textAlign: 'center', lineHeight: 1.35 },
  emisorBold: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', textAlign: 'center' },
  ivaBar: {
    borderTopWidth: 1,
    borderTopColor: NEGRO,
    paddingVertical: 3,
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    letterSpacing: 0.5
  },
  letraWrap: { width: 58, alignItems: 'center', paddingTop: 10 },
  letraBox: {
    width: 42,
    height: 42,
    backgroundColor: NEGRO,
    alignItems: 'center',
    justifyContent: 'center'
  },
  letra: { color: '#FFFFFF', fontSize: 30, fontFamily: 'Helvetica-Bold' },
  datos: { flex: 1, borderWidth: 1, borderColor: NEGRO, padding: 8 },
  datosTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  remitoTitle: { fontSize: 20, fontFamily: 'Helvetica-Bold', letterSpacing: 1 },
  noValido: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', textAlign: 'center', width: 100, lineHeight: 1.2 },
  numero: { fontSize: 15, fontFamily: 'Helvetica-Bold', marginTop: 4, letterSpacing: 0.5 },
  fechaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  fechaLabel: { fontSize: 11, fontFamily: 'Helvetica-Bold', marginRight: 8 },
  fechaCirculo: {
    width: 34,
    height: 22,
    borderWidth: 1,
    borderColor: NEGRO,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6
  },
  fechaNum: { fontSize: 11 },
  fiscal: { fontSize: 7.5, marginTop: 1.5 },
  fiscalFirst: { fontSize: 7.5, marginTop: 7 },

  // ── Destinatario
  destinatario: { borderWidth: 1, borderColor: NEGRO, paddingHorizontal: 8, paddingVertical: 5, marginBottom: 0 },
  lineRow: { flexDirection: 'row', alignItems: 'flex-end', marginVertical: 2 },
  lineLabel: { fontSize: 8.5, marginRight: 4 },
  lineValue: {
    flex: 1,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    borderBottomWidth: 0.7,
    borderBottomColor: GRIS,
    borderBottomStyle: 'dotted',
    paddingBottom: 1,
    minHeight: 12
  },

  // ── IVA (casilleros) + CUIT / Ing. Brutos del destinatario
  ivaBox: { flexDirection: 'row', borderWidth: 1, borderTopWidth: 0, borderColor: NEGRO },
  ivaLetra: {
    width: 40,
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    paddingTop: 8,
    borderRightWidth: 1,
    borderRightColor: NEGRO
  },
  ivaGrid: { flex: 1.25, flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 6, paddingVertical: 4 },
  ivaOpt: { width: '33%', flexDirection: 'row', alignItems: 'center', marginVertical: 1.5 },
  ivaOptText: { fontSize: 6.5, fontFamily: 'Helvetica-Bold', marginRight: 3 },
  check: {
    width: 8,
    height: 8,
    borderWidth: 0.8,
    borderColor: NEGRO,
    alignItems: 'center',
    justifyContent: 'center'
  },
  checkFill: { width: 5, height: 5, backgroundColor: NEGRO },
  ivaRight: { flex: 1, borderLeftWidth: 1, borderLeftColor: NEGRO },
  ivaRightRow: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6 },
  ivaRightSep: { borderBottomWidth: 1, borderBottomColor: NEGRO },

  // ── Remitimos por medio de (transportista)
  remitimos: { borderWidth: 1, borderTopWidth: 0, borderColor: NEGRO, paddingHorizontal: 8, paddingVertical: 4, marginBottom: 6 },
  twoCols: { flexDirection: 'row' },

  // ── Tabla
  table: { borderWidth: 1, borderColor: NEGRO },
  thRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: NEGRO },
  th: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', textAlign: 'center', paddingVertical: 4 },
  tr: { flexDirection: 'row', height: ROW_H },
  colCant: { width: 62, borderRightWidth: 1, borderRightColor: NEGRO },
  colDesc: { flex: 1, borderRightWidth: 1, borderRightColor: NEGRO },
  colUnidad: { width: 62, borderRightWidth: 1, borderRightColor: NEGRO },
  colTotal: { width: 80 },
  cell: {
    height: ROW_H,
    borderBottomWidth: 0.6,
    borderBottomColor: GRIS,
    borderBottomStyle: 'dotted',
    justifyContent: 'flex-end',
    paddingHorizontal: 5,
    paddingBottom: 1.5
  },
  cant: { fontSize: 9, fontFamily: 'Helvetica-Bold', textAlign: 'center' },
  desc: { fontSize: 8.5 },
  descTercerizado: { fontSize: 8.5, fontFamily: 'Helvetica-Oblique' },

  // ── Pie: Transporte / Recibí conforme
  pie: { flexDirection: 'row', borderWidth: 1, borderTopWidth: 0, borderColor: NEGRO },
  pieLeft: { flex: 1.3, padding: 6, borderRightWidth: 1, borderRightColor: NEGRO },
  pieRight: { flex: 1, padding: 6, justifyContent: 'flex-end' },
  recibi: { fontSize: 9, fontFamily: 'Helvetica-Bold', marginRight: 4, lineHeight: 1.1 },
  firmaLine: { flex: 1, borderBottomWidth: 0.8, borderBottomColor: NEGRO, borderBottomStyle: 'dotted', height: 26 },
  aclaracion: { fontSize: 6.5, color: GRIS, textAlign: 'center', marginTop: 2 },

  // ── Encabezado corto (hojas 2+) y numeración de hojas
  miniHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: NEGRO,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 6
  },
  miniTitle: { fontSize: 12, fontFamily: 'Helvetica-Bold' },
  miniText: { fontSize: 8.5 },
  hoja: { position: 'absolute', bottom: 10, right: 24, fontSize: 7, color: GRIS }
});

interface PrintableRemitoSectionProps {
  event: EventModel;
  remitoNumber?: string;
  // Destinatario (editable antes de generar; vacío → renglón para completar a mano)
  domicilio?: string;
  localidad?: string;
  destinatarioIva?: string; // una de IVA_OPTIONS
  destinatarioCuit?: string;
  destinatarioIngBrutos?: string;
  // Transportista ("Remitimos a Uds. por medio de")
  transportista?: string;
  transportistaDomicilio?: string;
  transportistaCuit?: string;
  transportistaIngBrutos?: string;
}

// Renglones: equipamiento real agrupado por nombre + los "a tercerizar".
// Sin precios (decisión de negocio): Unidad / Precio total quedan vacías.
const buildRows = (event: EventModel) => {
  const rows: { cant: number; desc: string; tercerizado?: boolean }[] = [];
  const byName = groupEquipmentByNameCount(event.equipment || []);
  Object.entries(byName).forEach(([name, cant]) => rows.push({ cant, desc: name }));
  (event.extraEquipment || []).forEach((e) =>
    rows.push({ cant: e.quantity, desc: `${e.name} (tercerizado)`, tercerizado: true })
  );
  return rows;
};

const pad2 = (n: number) => String(n).padStart(2, '0');

// Etiquetas del recuadro IVA (cortas, como el formulario de imprenta)
const IVA_SHORT: Record<string, string> = {
  'Resp. Inscripto': 'RESP. INSC.',
  'Consumidor Final': 'CONSUMIDOR FINAL',
  Monotributo: 'MONOTRIBUTO',
  Exento: 'EXENTO',
  'Resp. No Inscripto': 'RESP. NO INSC.',
  'No Responsable': 'NO RESP.',
  'Sujeto No Categorizado': 'SUJ. NO CATEGOR.'
};

// Renglón de alto fijo: una descripción muy larga se corta para no pisar el
// renglón de abajo (~80 caracteres entran en la columna).
const DESC_MAX = 80;
const oneLine = (s: string) => (s.length > DESC_MAX ? s.slice(0, DESC_MAX - 1) + '…' : s);

// "Etiqueta: ......valor......" (valor vacío → renglón punteado para completar)
const Line = ({ label, value, flex }: { label: string; value?: string; flex?: number }) => (
  <View style={flex ? [styles.lineRow, { flex }] : styles.lineRow}>
    <Text style={styles.lineLabel}>{label}</Text>
    <Text style={styles.lineValue}>{value?.trim() || ' '}</Text>
  </View>
);

const Check = ({ checked }: { checked: boolean }) => (
  <View style={styles.check}>{checked ? <View style={styles.checkFill} /> : null}</View>
);

const TableHeader = () => (
  <View style={styles.thRow}>
    <Text style={[styles.th, styles.colCant]}>CANTIDAD</Text>
    <Text style={[styles.th, styles.colDesc]}>DESCRIPCIÓN</Text>
    <Text style={[styles.th, styles.colUnidad]}>UNIDAD</Text>
    <Text style={[styles.th, styles.colTotal]}>PRECIO TOTAL</Text>
  </View>
);

const PrintableRemitoSection: React.FC<PrintableRemitoSectionProps> = ({
  event,
  remitoNumber,
  domicilio,
  localidad,
  destinatarioIva,
  destinatarioCuit,
  destinatarioIngBrutos,
  transportista,
  transportistaDomicilio,
  transportistaCuit,
  transportistaIngBrutos
}) => {
  const rows = buildRows(event);
  const pages = paginateRemitoRows(rows.length);
  const [dd, mm, aa] = remitoDateParts(new Date()); // siempre la fecha de hoy
  const numero = (remitoNumber || '—').replace(/\s*-\s*/, '-');
  const destinatario = [event.company, event.fullName].filter(Boolean).join(' — ');
  const domicilioCompleto = [domicilio, localidad].map((s) => s?.trim()).filter(Boolean).join(' - ');
  const eventoLinea = [event.type, event.lugar].filter(Boolean).join(' — ');

  const docTitle = ['REMITO', event.fullName || 'Cliente', event.type || 'Evento'].join(' - ');

  return (
    <Document title={docTitle}>
      {pages.map((pg, pi) => {
        const pageRows = rows.slice(pg.from, pg.from + pg.count);
        return (
          <Page key={pi} size='A4' style={styles.page}>
            {pi === 0 ? (
              <>
                {/* Encabezado: emisor · letra · datos del comprobante */}
                <View style={styles.header}>
                  <View style={styles.emisor}>
                    <View style={styles.emisorBody}>
                      <Image src='/degano-logo-imp.png' style={styles.logo} />
                      <Text style={styles.emisorBold}>de {DEGANO.titular}</Text>
                      <Text style={styles.emisorLine}>Celular: {DEGANO.tel}</Text>
                      <Text style={styles.emisorLine}>{DEGANO.direccion}</Text>
                      <Text style={styles.emisorLine}>{DEGANO.localidad}</Text>
                    </View>
                    <Text style={styles.ivaBar}>{DEGANO.iva}</Text>
                  </View>

                  <View style={styles.letraWrap}>
                    <View style={styles.letraBox}>
                      <Text style={styles.letra}>R</Text>
                    </View>
                  </View>

                  <View style={styles.datos}>
                    <View style={styles.datosTop}>
                      <Text style={styles.remitoTitle}>REMITO</Text>
                      <Text style={styles.noValido}>Documento No Válido{'\n'}como Factura</Text>
                    </View>
                    <Text style={styles.numero}>N° {numero}</Text>
                    <View style={styles.fechaRow}>
                      <Text style={styles.fechaLabel}>FECHA</Text>
                      {[dd, mm, aa].map((v, i) => (
                        <View key={i} style={styles.fechaCirculo}>
                          <Text style={styles.fechaNum}>{v}</Text>
                        </View>
                      ))}
                    </View>
                    <Text style={styles.fiscalFirst}>C.U.I.T.: {DEGANO.cuit}</Text>
                    <Text style={styles.fiscal}>ING. BRUTOS: {DEGANO.ingBrutos}</Text>
                    <Text style={styles.fiscal}>INICIO DE ACTIVIDADES: {DEGANO.inicioAct}</Text>
                  </View>
                </View>

                {/* Destinatario */}
                <View style={styles.destinatario}>
                  <Line label='Señor/es:' value={destinatario} />
                  <Line label='Domicilio:' value={domicilioCompleto} />
                  <Line label='Evento:' value={eventoLinea} />
                </View>

                {/* IVA del destinatario + CUIT / Ing. Brutos */}
                <View style={styles.ivaBox}>
                  <Text style={styles.ivaLetra}>IVA</Text>
                  <View style={styles.ivaGrid}>
                    {IVA_OPTIONS.map((opt) => (
                      <View key={opt} style={styles.ivaOpt}>
                        <Text style={styles.ivaOptText}>{IVA_SHORT[opt] ?? opt.toUpperCase()}</Text>
                        <Check checked={destinatarioIva === opt} />
                      </View>
                    ))}
                  </View>
                  <View style={styles.ivaRight}>
                    <View style={[styles.ivaRightRow, styles.ivaRightSep]}>
                      <Line label='CUIT:' value={destinatarioCuit} flex={1} />
                    </View>
                    <View style={styles.ivaRightRow}>
                      <Line label='ING. BRUTOS:' value={destinatarioIngBrutos} flex={1} />
                    </View>
                  </View>
                </View>

                {/* Transportista */}
                <View style={styles.remitimos}>
                  <View style={styles.twoCols}>
                    <Line label='Remitimos a Uds. por medio de' value={transportista} flex={1.6} />
                    <Line label='CUIT N°' value={transportistaCuit} flex={1} />
                  </View>
                  <View style={styles.twoCols}>
                    <Line label='Domicilio:' value={transportistaDomicilio} flex={1.6} />
                    <Line label='Ing. Brutos:' value={transportistaIngBrutos} flex={1} />
                  </View>
                </View>
              </>
            ) : (
              <View style={styles.miniHeader}>
                <Text style={styles.miniTitle}>REMITO N° {numero}</Text>
                <Text style={styles.miniText}>
                  {destinatario || '—'} · {dd}/{mm}/{aa} · continuación
                </Text>
              </View>
            )}

            {/* Tabla: Cantidad / Descripción / Unidad / Precio total */}
            <View style={styles.table}>
              <TableHeader />
              {pageRows.map((r, i) => (
                <View key={i} style={styles.tr}>
                  <View style={[styles.cell, styles.colCant]}>
                    <Text style={styles.cant}>{pad2(r.cant)}</Text>
                  </View>
                  <View style={[styles.cell, styles.colDesc]}>
                    <Text style={r.tercerizado ? styles.descTercerizado : styles.desc}>
                      {oneLine(r.desc)}
                    </Text>
                  </View>
                  <View style={[styles.cell, styles.colUnidad]} />
                  <View style={[styles.cell, styles.colTotal]} />
                </View>
              ))}
              {Array.from({ length: pg.blanks }).map((_, i) => (
                <View key={`b${i}`} style={styles.tr}>
                  <View style={[styles.cell, styles.colCant]} />
                  <View style={[styles.cell, styles.colDesc]} />
                  <View style={[styles.cell, styles.colUnidad]} />
                  <View style={[styles.cell, styles.colTotal]} />
                </View>
              ))}
            </View>

            {/* Pie (solo en la última hoja): transporte + recibí conforme */}
            {pg.isLast && (
              <View style={styles.pie}>
                <View style={styles.pieLeft}>
                  <Line label='Transporte:' value={transportista} />
                  <Line label='Domicilio:' value={transportistaDomicilio} />
                  <Line label='Cuit:' value={transportistaCuit} />
                </View>
                <View style={styles.pieRight}>
                  <View style={styles.lineRow}>
                    <Text style={styles.recibi}>RECIBÍ{'\n'}CONFORME:</Text>
                    <View style={styles.firmaLine} />
                  </View>
                  <Text style={styles.aclaracion}>Firma y aclaración</Text>
                </View>
              </View>
            )}

            {pages.length > 1 && (
              <Text style={styles.hoja}>
                Hoja {pi + 1} de {pages.length}
              </Text>
            )}
          </Page>
        );
      })}
    </Document>
  );
};

export default PrintableRemitoSection;
