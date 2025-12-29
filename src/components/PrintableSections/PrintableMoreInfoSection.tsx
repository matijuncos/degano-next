import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';
import { EventModel } from '@/context/types';

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
    backgroundColor: '#6aa74f',
    textTransform: 'uppercase'
  },
  section: { marginBottom: 12 },
  content: {
    fontSize: 10,
    lineHeight: 1.5,
    borderBottom: '0.5px solid #333',
    paddingBottom: 4
  },
  noDataText: {
    fontStyle: 'italic',
    color: '#666',
    fontSize: 10
  }
});

interface PrintableMoreInfoSectionProps {
  event: EventModel;
}

// Exportar contenido interno para reutilización en PrintableFullEventSection
export const PrintableMoreInfoContent: React.FC<PrintableMoreInfoSectionProps> = ({
  event
}) => (
  <View style={styles.section}>
    {event.moreData ? (
      <Text style={styles.content}>{event.moreData}</Text>
    ) : (
      <Text style={styles.noDataText}>
        No hay información adicional disponible.
      </Text>
    )}
  </View>
);

// Componente principal con logo y header verde
const PrintableMoreInfoSection: React.FC<PrintableMoreInfoSectionProps> = ({
  event
}) => (
  <Document>
    <Page size='A4' style={styles.page}>
      <View style={styles.header}>
        <Image src="/degano-logo-imp.png" style={styles.logo} />
      </View>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Más Información</Text>
      </View>
      <PrintableMoreInfoContent event={event} />
    </Page>
  </Document>
);

export default PrintableMoreInfoSection;
