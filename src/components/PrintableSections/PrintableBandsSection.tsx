import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';
import { EventModel, Band } from '@/context/types';

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
    backgroundColor: '#6aa74f',
    textTransform: 'uppercase'
  },
  section: { marginBottom: 12 },
  bandSection: { marginBottom: 12 },
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
  multilineText: {
    fontSize: 10,
    marginBottom: 2
  },
  multilineContainer: {
    flex: 1,
    borderBottom: '0.5px solid #333',
    paddingBottom: 2,
    paddingTop: 2
  }
});

interface PrintableBandsSectionProps {
  event: EventModel;
}

// Exportar contenido interno para reutilización en PrintableFullEventSection
export const PrintableBandsContent: React.FC<PrintableBandsSectionProps> = ({
  event
}) => {
  // Función para renderizar texto con saltos de línea
  const renderMultilineText = (text: string) => {
    return text.split('\n').map((line, i) => (
      <Text key={i} style={styles.multilineText}>
        {line}
      </Text>
    ));
  };

  return (
    <View style={styles.section}>
      {event.bands && event.bands.length > 0 ? (
        event.bands.map((band: Band, index: number) => (
          <View key={index} style={styles.bandSection} wrap={false}>
            <View style={styles.subsectionHeader}>
              <Text style={styles.subsectionTitle}>Banda {index + 1}</Text>
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>NOMBRE:</Text>
              <Text style={styles.fieldValue}>{band.bandName}</Text>
            </View>
            {band.showTime && (
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>HORA DEL SHOW:</Text>
                <Text style={styles.fieldValue}>{band.showTime}</Text>
              </View>
            )}
            {band.bandInfo && (
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>INFORMACIÓN:</Text>
                <View style={styles.multilineContainer}>
                  {renderMultilineText(band.bandInfo)}
                </View>
              </View>
            )}
          </View>
        ))
      ) : (
        <Text style={{ fontStyle: 'italic', color: '#666' }}>
          No hay bandas registradas para este evento.
        </Text>
      )}
    </View>
  );
};

// Componente principal con logo y header verde
const PrintableBandsSection: React.FC<PrintableBandsSectionProps> = ({
  event
}) => (
  <Document>
    <Page size='A4' style={styles.page}>
      <View style={styles.header}>
        <Image src="/degano-logo-imp.png" style={styles.logo} />
      </View>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Show en vivo</Text>
      </View>
      <PrintableBandsContent event={event} />
    </Page>
  </Document>
);

export default PrintableBandsSection;
