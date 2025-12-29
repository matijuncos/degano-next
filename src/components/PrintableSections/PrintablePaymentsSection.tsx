import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';
import { EventModel } from '@/context/types';
import { formatPrice } from '@/utils/priceUtils';

const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 11 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  logo: { width: 220, height: 60 },
  sectionHeader: {
    backgroundColor: '#6aa74f',
    paddingHorizontal: 10,
    paddingVertical: 2,
    marginBottom: 16,
    borderRadius: 4
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textTransform: 'uppercase'
  },
  subsectionHeader: {
    backgroundColor: '#6aa74f',
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 3
  },
  subsectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textTransform: 'uppercase'
  },
  section: { marginBottom: 12 },
  paymentItem: { marginBottom: 12 },
  fieldRow: {
    flexDirection: 'row',
    marginBottom: 6,
    alignItems: 'center'
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    marginRight: 4,
    textTransform: 'uppercase'
  },
  fieldValue: {
    fontSize: 10,
    borderBottom: '0.5px solid #333',
    paddingBottom: 1,
    flex: 1
  }
});

interface PrintablePaymentsSectionProps {
  event: EventModel;
}

// Exportar contenido interno para reutilización en PrintableFullEventSection
export const PrintablePaymentsContent: React.FC<PrintablePaymentsSectionProps> = ({
  event
}) => (
  <View style={styles.section}>
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>MONTO INICIAL:</Text>
      <Text style={styles.fieldValue}>
        {event.payment.upfrontAmount ? formatPrice(Number(event.payment.upfrontAmount)) : '$0'}
      </Text>
    </View>
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>TOTAL A PAGAR:</Text>
      <Text style={styles.fieldValue}>
        {event.payment.totalToPay ? formatPrice(Number(event.payment.totalToPay)) : '$0'}
      </Text>
    </View>
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>PAGO PARCIAL REALIZADO:</Text>
      <Text style={styles.fieldValue}>{event.payment.partialPayed ? 'Sí' : 'No'}</Text>
    </View>
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>PAGO TOTAL REALIZADO:</Text>
      <Text style={styles.fieldValue}>{event.payment.totalPayed ? 'Sí' : 'No'}</Text>
    </View>
    {event.payment.partialPaymentDate && (
      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>FECHA PAGO PARCIAL:</Text>
        <Text style={styles.fieldValue}>
          {new Date(event.payment.partialPaymentDate).toLocaleDateString()}
        </Text>
      </View>
    )}
    {event.payment.totalPaymentDate && (
      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>FECHA PAGO TOTAL:</Text>
        <Text style={styles.fieldValue}>
          {new Date(event.payment.totalPaymentDate).toLocaleDateString()}
        </Text>
      </View>
    )}

    {event.payment.subsequentPayments &&
      event.payment.subsequentPayments.length > 0 && (
        <>
          <View style={styles.subsectionHeader}>
            <Text style={styles.subsectionTitle}>Pagos posteriores</Text>
          </View>
          {event.payment.subsequentPayments.map(
            (payment: any, index: number) => (
              <View key={index} style={styles.paymentItem}>
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>FECHA:</Text>
                  <Text style={styles.fieldValue}>
                    {payment.date
                      ? new Date(payment.date).toLocaleDateString()
                      : '-'}
                  </Text>
                </View>
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>MONTO:</Text>
                  <Text style={styles.fieldValue}>
                    {payment.amount ? formatPrice(Number(payment.amount)) : '-'}
                  </Text>
                </View>
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>DESCRIPCIÓN:</Text>
                  <Text style={styles.fieldValue}>
                    {payment.description || '-'}
                  </Text>
                </View>
              </View>
            )
          )}
        </>
      )}
  </View>
);

// Componente principal con logo y header verde
const PrintablePaymentsSection: React.FC<PrintablePaymentsSectionProps> = ({
  event
}) => (
  <Document>
    <Page size='A4' style={styles.page}>
      <View style={styles.header}>
        <Image src="/degano-logo-imp.png" style={styles.logo} />
      </View>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Historial de Pagos</Text>
      </View>
      <PrintablePaymentsContent event={event} />
    </Page>
  </Document>
);

export default PrintablePaymentsSection;
