import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';
import { numeroALetras } from '@/utils/numeroALetras';

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
  'septiembre', 'octubre', 'noviembre', 'diciembre'
];

const toDate = (d: Date | string | undefined): Date | null => {
  if (!d) return null;
  const date = typeof d === 'string' ? new Date(d) : d;
  return isNaN(date.getTime()) ? null : date;
};

// "Córdoba 14, de octubre del 2025"
const fechaEmisionTexto = (d: Date | string | undefined) => {
  const date = toDate(d) || new Date();
  return `Córdoba ${date.getDate()}, de ${MESES[date.getMonth()]} del ${date.getFullYear()}`;
};

// "08 de noviembre del 2025"
const fechaEventoTexto = (d: Date | string | undefined) => {
  const date = toDate(d);
  if (!date) return '—';
  const dd = String(date.getDate()).padStart(2, '0');
  return `${dd} de ${MESES[date.getMonth()]} del ${date.getFullYear()}`;
};

const styles = StyleSheet.create({
  page: { fontSize: 11, color: '#222', fontFamily: 'Helvetica' },

  // Membrete de página completa (header + footer) como fondo
  bg: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },

  // Cuerpo, con padding para no pisar header (arriba) ni footer (abajo)
  content: { paddingTop: 135, paddingBottom: 120, paddingHorizontal: 48 },

  fecha: { fontSize: 11, marginBottom: 18 },
  parrafo: { fontSize: 11, lineHeight: 1.5, textAlign: 'justify', marginBottom: 10 },
  bold: { fontWeight: 'bold' },
  itemsBox: { marginVertical: 6, paddingLeft: 14 },
  item: { fontSize: 11, lineHeight: 1.5, marginBottom: 2 },

  // Firma
  firmaBox: {
    marginTop: 40,
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginRight: 50
  },
  firma: { width: 120, height: 119, objectFit: 'contain', marginBottom: -6 },
  firmaNombre: { fontSize: 11, fontWeight: 'bold' },
  firmaDni: { fontSize: 11 }
});

interface PrintableReciboSectionProps {
  cliente: string;
  fechaEmision?: Date | string;
  monto: number;
  concepto: string;
  items: string[];
  lugar: string;
  localidad: string;
  provincia?: string;
  fechaEvento?: Date | string;
}

const PrintableReciboSection: React.FC<PrintableReciboSectionProps> = ({
  cliente,
  fechaEmision,
  monto,
  concepto,
  items,
  lugar,
  localidad,
  provincia,
  fechaEvento
}) => {
  const montoNum = Number(monto) || 0;
  const montoTexto = numeroALetras(montoNum);
  const montoFmt = montoNum.toLocaleString('es-AR');

  const docTitle = `RECIBO - ${cliente || 'Cliente'}`;

  return (
    <Document title={docTitle}>
      <Page size='A4' style={styles.page}>
        {/* Membrete (header negro + footer verde) como fondo full-page */}
        <Image src='/recibo-membrete.jpg' fixed style={styles.bg} />

        <View style={styles.content}>
          <Text style={styles.fecha}>{fechaEmisionTexto(fechaEmision)}.</Text>

          <Text style={styles.parrafo}>
            Recibí de <Text style={styles.bold}>{cliente || '—'}</Text> la suma de{' '}
            {montoTexto} pesos (${montoFmt}), en concepto de {concepto} de los
            siguientes ítems:
          </Text>

          <View style={styles.itemsBox}>
            {items
              .filter((it) => it && it.trim())
              .map((it, i) => (
                <Text key={i} style={styles.item}>
                  •  {it.trim()}
                </Text>
              ))}
          </View>

          <Text style={styles.parrafo}>
            El evento se realizará el día {fechaEventoTexto(fechaEvento)} en{' '}
            {lugar || '—'}, salón ubicado en la localidad de {localidad || '—'},
            {' '}{provincia || 'Córdoba'}.
          </Text>

          {/* Firma */}
          <View style={styles.firmaBox}>
            <Image src='/firma-degano.png' style={styles.firma} />
            <Text style={styles.firmaNombre}>Juan Tomás Degano</Text>
            <Text style={styles.firmaDni}>D.N.I.: 31.009.890</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default PrintableReciboSection;
