import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';
import { EventModel } from '@/context/types';
import { PrintableMainContent } from './PrintableMainSection';
import { PrintableBandsContent } from './PrintableBandsSection';
import { PrintableMusicContent } from './PrintableMusicSection';
import { PrintableTimingContent } from './PrintableTimingSection';
import { PrintableMoreInfoContent } from './PrintableMoreInfoSection';
import { PrintableEquipmentContent } from './PrintableEquipmentSection';

const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 11, paddingBottom: 60 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  logo: { width: 220, height: 60 },
  eventTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333'
  },
  sectionWrapper: {
    marginTop: 16
  },
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
  }
});

interface PrintableFullEventSectionProps {
  event: EventModel;
}

const PrintableFullEventSection: React.FC<PrintableFullEventSectionProps> = ({
  event
}) => {
  const eventTitle = `${new Date(event.date).toLocaleDateString()} - ${event.type} - ${event.lugar}`;

  return (
    <Document>
      <Page size='A4' style={styles.page}>
        {/* Header con logo y título del evento */}
        <View style={styles.header}>
          <Image src="/degano-logo-imp.png" style={styles.logo} />
          {/* <Text style={styles.eventTitle}>{eventTitle}</Text> */}
        </View>

        {/* Información Principal */}
        <View wrap={false}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Información Principal</Text>
          </View>
          <PrintableMainContent event={event} />
        </View>

        {/* Shows - solo si tiene bandas */}
        {event.bands && event.bands.length > 0 && (
          <View wrap={false} style={styles.sectionWrapper}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Show en vivo</Text>
            </View>
            <PrintableBandsContent event={event} />
          </View>
        )}

        {/* Música - solo si tiene datos de música */}
        {event.music && (
          <View wrap={false} style={styles.sectionWrapper}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Música</Text>
            </View>
            <PrintableMusicContent event={event} />
          </View>
        )}

        {/* Timing - solo si tiene cronograma */}
        {event.timing && event.timing.length > 0 && (
          <View wrap={false} style={styles.sectionWrapper}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Cronograma del Evento</Text>
            </View>
            <PrintableTimingContent event={event} />
          </View>
        )}

        {/* Más Información - solo si tiene datos */}
        {event.moreData && (
          <View wrap={false} style={styles.sectionWrapper}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Más Información</Text>
            </View>
            <PrintableMoreInfoContent event={event} />
          </View>
        )}

        {/* Equipos - solo si tiene equipos */}
        {event.equipment && event.equipment.length > 0 && (
          <View wrap={false} style={styles.sectionWrapper}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Equipos</Text>
            </View>
            <PrintableEquipmentContent event={event} />
          </View>
        )}
      </Page>
    </Document>
  );
};

export default PrintableFullEventSection;
