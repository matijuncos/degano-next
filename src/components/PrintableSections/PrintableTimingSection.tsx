import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';
import { EventModel } from '@/context/types';

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 12 },
  section: { marginBottom: 12 },
  label: { fontWeight: 'bold', marginRight: 8 },
  row: { flexDirection: 'row', marginBottom: 4 },
  timingItem: {
    marginBottom: 16,
    padding: 12,
    border: '1px solid #e9ecef',
    borderRadius: 4
  },
  timingHeader: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'center'
  },
  timeText: {
    fontWeight: 'bold',
    marginRight: 12,
    minWidth: 60
  },
  titleText: {
    fontWeight: 'bold',
    flex: 1
  },
  detailsText: {
    marginTop: 4,
    lineHeight: 1.4
  },
  noDataText: {
    fontStyle: 'italic',
    color: '#666'
  }
});

interface PrintableTimingSectionProps {
  event: EventModel;
}

const PrintableTimingSection: React.FC<PrintableTimingSectionProps> = ({
  event
}) => (
  <Document>
    <Page size='A4' style={styles.page}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>
        Cronograma del Evento
      </Text>
      <View style={styles.section}>
        {event.timing && event.timing.length > 0 ? (
          event.timing.map((item, index) => (
            <View key={index} style={styles.timingItem}>
              <Text style={{ fontWeight: 'bold', marginBottom: 8 }}>
                #{index + 1}
              </Text>
              <View style={styles.timingHeader}>
                <Text style={styles.timeText}>
                  {item.time ? `${item.time}hs` : 'Sin hora'}
                </Text>
                <Text style={styles.titleText}>
                  {item.title || 'Sin título'}
                </Text>
              </View>
              {item.details && (
                <Text style={styles.detailsText}>{item.details}</Text>
              )}
            </View>
          ))
        ) : (
          <Text style={styles.noDataText}>
            No hay cronograma definido para este evento
          </Text>
        )}
      </View>
    </Page>
  </Document>
);

export default PrintableTimingSection;
