import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';
import { EventModel } from '@/context/types';

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 12 },
  section: { marginBottom: 12 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  row: { flexDirection: 'row', marginBottom: 4 },
  label: { fontWeight: 'bold', marginRight: 8 },
  table: {
    borderWidth: 1,
    borderColor: '#000',
    marginTop: 10
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    padding: 5,
    fontWeight: 'bold',
    backgroundColor: '#f0f0f0'
  },
  tableRow: {
    flexDirection: 'row',
    padding: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#000'
  },
  tableCell: {
    flex: 1,
    padding: 4
  }
});

interface PrintablePaymentsSectionProps {
  event: EventModel;
}

const PrintablePaymentsSection: React.FC<PrintablePaymentsSectionProps> = ({
  event
}) => (
  <Document>
    <Page size='A4' style={styles.page}>
      <Text style={styles.title}>Historial de Pagos</Text>
      <View style={styles.section}>
        <View style={styles.row}>
          <Text style={styles.label}>Monto inicial:</Text>
          <Text>${event.payment.upfrontAmount}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Total a pagar:</Text>
          <Text>${event.payment.totalToPay}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Pago parcial realizado:</Text>
          <Text>{event.payment.partialPayed ? 'Sí' : 'No'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Pago total realizado:</Text>
          <Text>{event.payment.totalPayed ? 'Sí' : 'No'}</Text>
        </View>
        {event.payment.partialPaymentDate && (
          <View style={styles.row}>
            <Text style={styles.label}>Fecha pago parcial:</Text>
            <Text>
              {new Date(event.payment.partialPaymentDate).toLocaleDateString()}
            </Text>
          </View>
        )}
        {event.payment.totalPaymentDate && (
          <View style={styles.row}>
            <Text style={styles.label}>Fecha pago total:</Text>
            <Text>
              {new Date(event.payment.totalPaymentDate).toLocaleDateString()}
            </Text>
          </View>
        )}

        {event.payment.subsequentPayments &&
          event.payment.subsequentPayments.length > 0 && (
            <View style={{ marginTop: 16 }}>
              <Text style={{ fontWeight: 'bold', marginBottom: 8 }}>
                Pagos posteriores:
              </Text>
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={styles.tableCell}>Fecha</Text>
                  <Text style={styles.tableCell}>Monto</Text>
                  <Text style={styles.tableCell}>Descripción</Text>
                </View>
                {event.payment.subsequentPayments.map(
                  (payment: any, index: number) => (
                    <View key={index} style={styles.tableRow}>
                      <Text style={styles.tableCell}>
                        {payment.date
                          ? new Date(payment.date).toLocaleDateString()
                          : '-'}
                      </Text>
                      <Text style={styles.tableCell}>
                        ${payment.amount || '-'}
                      </Text>
                      <Text style={styles.tableCell}>
                        {payment.description || '-'}
                      </Text>
                    </View>
                  )
                )}
              </View>
            </View>
          )}
      </View>
    </Page>
  </Document>
);

export default PrintablePaymentsSection;
