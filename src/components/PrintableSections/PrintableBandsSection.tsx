import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';
import { EventModel, Band } from '@/context/types';

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 12 },
  section: { marginBottom: 12 },
  label: { fontWeight: 'bold', marginRight: 8 },
  row: { flexDirection: 'row', marginBottom: 4 },
  bandSection: { marginBottom: 16 },
  bandTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 8 },
  bandInfo: { marginLeft: 12, marginBottom: 4 }
});

interface PrintableBandsSectionProps {
  event: EventModel;
}

const PrintableBandsSection: React.FC<PrintableBandsSectionProps> = ({
  event
}) => (
  <Document>
    <Page size='A4' style={styles.page}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>
        Show en vivo
      </Text>
      <View style={styles.section}>
        {event.bands && event.bands.length > 0 ? (
          event.bands.map((band: Band, index: number) => (
            <View key={index} style={styles.bandSection}>
              <Text style={styles.bandTitle}>Banda {index + 1}</Text>
              <View style={styles.bandInfo}>
                <Text>Nombre: {band.bandName}</Text>
              </View>
              {/* {band.manager && (
                <View style={styles.bandInfo}>
                  <Text>Manager: {band.manager}</Text>
                </View>
              )}
              {band.managerPhone && (
                <View style={styles.bandInfo}>
                  <Text>Teléfono Manager: {band.managerPhone}</Text>
                </View>
              )} */}
              {band.showTime && (
                <View style={styles.bandInfo}>
                  <Text>Hora del show: {band.showTime}</Text>
                </View>
              )}
              {band.bandInfo && (
                <View style={styles.bandInfo}>
                  <Text>Información: {band.bandInfo}</Text>
                </View>
              )}
            </View>
          ))
        ) : (
          <Text>No hay bandas registradas para este evento.</Text>
        )}
      </View>
    </Page>
  </Document>
);

export default PrintableBandsSection;
