import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';
import { EventModel } from '@/context/types';

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 12 },
  section: { marginBottom: 12 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  fileItem: { marginBottom: 8 },
  fileName: { fontWeight: 'bold' },
  fileUrl: { color: '#666', fontSize: 10 }
});

interface PrintableFilesSectionProps {
  event: EventModel;
}

const PrintableFilesSection: React.FC<PrintableFilesSectionProps> = ({
  event
}) => (
  <Document>
    <Page size='A4' style={styles.page}>
      <Text style={styles.title}>Archivos</Text>
      <View style={styles.section}>
        {event.playlist && event.playlist.length > 0 ? (
          event.playlist.map((file, index) => (
            <View key={index} style={styles.fileItem}>
              <Text style={styles.fileName}>{file.label}</Text>
              <Text style={styles.fileUrl}>{file.url}</Text>
            </View>
          ))
        ) : (
          <Text>No hay archivos asociados a este evento.</Text>
        )}
      </View>
    </Page>
  </Document>
);

export default PrintableFilesSection;
