import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';
import { EventModel } from '@/context/types';

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 12 },
  section: { marginBottom: 12 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  content: { lineHeight: 1.5 }
});

interface PrintableMoreInfoSectionProps {
  event: EventModel;
}

const PrintableMoreInfoSection: React.FC<PrintableMoreInfoSectionProps> = ({
  event
}) => (
  <Document>
    <Page size='A4' style={styles.page}>
      <Text style={styles.title}>Más Información</Text>
      <View style={styles.section}>
        {event.moreData ? (
          <Text style={styles.content}>{event.moreData}</Text>
        ) : (
          <Text>No hay información adicional disponible.</Text>
        )}
      </View>
    </Page>
  </Document>
);

export default PrintableMoreInfoSection;
