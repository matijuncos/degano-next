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
  page: {
    padding: 30,
    fontSize: 11,
    paddingBottom: 40 // Reducido de 60 a 40 para aprovechar mejor el espacio
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15 // Reducido de 20 a 15
  },
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
    marginBottom: 12, // Reducido de 16 a 12
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

  const PageHeader = () => (
    <View style={styles.header}>
      <Image src="/degano-logo-imp.png" style={styles.logo} />
    </View>
  );

  // Funciones para verificar si existen datos en cada sección
  const hasBands = event.bands && event.bands.length > 0;
  const hasMusic = !!(
    event.welcomeSongs?.length ||
    event.ceremoniaCivil ||
    event.ceremoniaExtra ||
    event.openingPartySongs?.length ||
    event.closingSongs?.length ||
    event.customMoments?.length ||
    event.ambienceMusic?.length ||
    (event.music?.genres && event.music.genres.length > 0) ||
    event.playlist?.length
  );
  const hasTiming = event.timing && event.timing.length > 0;
  const hasMoreData = event.moreData && Object.keys(event.moreData).length > 0;
  const hasEquipment = event.equipment && event.equipment.length > 0;

  return (
    <Document>
      {/* Página 1: Información Principal - SIEMPRE se incluye */}
      <Page size='A4' style={styles.page}>
        <PageHeader />
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Información Principal</Text>
        </View>
        <PrintableMainContent event={event} />
      </Page>

      {/* Página 2: Shows - Solo si hay bandas */}
      {hasBands && (
        <Page size='A4' style={styles.page}>
          <PageHeader />
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Show en vivo</Text>
          </View>
          <PrintableBandsContent event={event} />
        </Page>
      )}

      {/* Página 3: Música - Solo si hay información de música */}
      {hasMusic && (
        <Page size='A4' style={styles.page}>
          <PageHeader />
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Música</Text>
          </View>
          <PrintableMusicContent event={event} />
        </Page>
      )}

      {/* Página 4: Timing - Solo si hay cronograma */}
      {hasTiming && (
        <Page size='A4' style={styles.page}>
          <PageHeader />
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Cronograma del Evento</Text>
          </View>
          <PrintableTimingContent event={event} />
        </Page>
      )}

      {/* Página 5: Más Información - Solo si hay datos adicionales */}
      {hasMoreData && (
        <Page size='A4' style={styles.page}>
          <PageHeader />
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Más Información</Text>
          </View>
          <PrintableMoreInfoContent event={event} />
        </Page>
      )}

      {/* Página 6: Equipos - Solo si hay equipos */}
      {hasEquipment && (
        <Page size='A4' style={styles.page}>
          <PageHeader />
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Equipos</Text>
          </View>
          <PrintableEquipmentContent event={event} />
        </Page>
      )}
    </Document>
  );
};

export default PrintableFullEventSection;
