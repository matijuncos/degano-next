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
  timingItem: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'center'
  },
  timingNumber: {
    fontSize: 10,
    marginRight: 4
  },
  timingField: {
    fontSize: 10,
    borderBottom: '0.5px solid #333',
    paddingBottom: 2,
    marginHorizontal: 4
  },
  timingTime: {
    minWidth: 60
  },
  timingTitle: {
    flex: 1
  },
  noDataText: {
    fontStyle: 'italic',
    color: '#666',
    fontSize: 10
  }
});

interface PrintableTimingSectionProps {
  event: EventModel;
}

// Exportar contenido interno para reutilización en PrintableFullEventSection
export const PrintableTimingContent: React.FC<PrintableTimingSectionProps> = ({
  event
}) => (
  <View style={styles.section}>
    {event.timing && event.timing.length > 0 ? (
      event.timing.map((item, index) => {
        const timeStr = item.time ? `${item.time}hs` : 'Sin hora';
        const titleStr = item.title || 'Sin título';
        const fullTitle = item.details ? `${titleStr} - ${item.details}` : titleStr;

        return (
          <View key={index} style={styles.timingItem} wrap={false}>
            <Text style={styles.timingNumber}>#{index + 1}</Text>
            <Text style={[styles.timingField, styles.timingTime]}>{timeStr}</Text>
            <Text style={[styles.timingField, styles.timingTitle]}>{fullTitle}</Text>
          </View>
        );
      })
    ) : (
      <Text style={styles.noDataText}>
        No hay cronograma definido para este evento
      </Text>
    )}
  </View>
);

// Componente principal con logo y header verde
const PrintableTimingSection: React.FC<PrintableTimingSectionProps> = ({
  event
}) => (
  <Document>
    <Page size='A4' style={styles.page}>
      <View style={styles.header}>
        <Image src="/degano-logo-imp.png" style={styles.logo} />
      </View>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Cronograma del Evento</Text>
      </View>
      <PrintableTimingContent event={event} />
    </Page>
  </Document>
);

export default PrintableTimingSection;
