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
  fileItem: { marginBottom: 12 },
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
  },
  noDataText: {
    fontStyle: 'italic',
    color: '#666',
    fontSize: 10
  }
});

interface PrintableFilesSectionProps {
  event: EventModel;
}

// Exportar contenido interno para reutilización en PrintableFullEventSection
export const PrintableFilesContent: React.FC<PrintableFilesSectionProps> = ({
  event
}) => (
  <View style={styles.section}>
    {event.playlist && event.playlist.length > 0 ? (
      event.playlist.map((file, index) => (
        <View key={index} style={styles.fileItem}>
          <View style={styles.subsectionHeader}>
            <Text style={styles.subsectionTitle}>Archivo {index + 1}</Text>
          </View>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>NOMBRE:</Text>
            <Text style={styles.fieldValue}>{file.label}</Text>
          </View>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>URL:</Text>
            <Text style={styles.fieldValue}>{file.url}</Text>
          </View>
        </View>
      ))
    ) : (
      <Text style={styles.noDataText}>
        No hay archivos asociados a este evento.
      </Text>
    )}
  </View>
);

// Componente principal con logo y header verde
const PrintableFilesSection: React.FC<PrintableFilesSectionProps> = ({
  event
}) => (
  <Document>
    <Page size='A4' style={styles.page}>
      <View style={styles.header}>
        <Image src="/degano-logo-imp.png" style={styles.logo} />
      </View>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Archivos</Text>
      </View>
      <PrintableFilesContent event={event} />
    </Page>
  </Document>
);

export default PrintableFilesSection;
