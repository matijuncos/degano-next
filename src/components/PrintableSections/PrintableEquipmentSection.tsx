import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';
import { EventModel } from '@/context/types';

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 12 },
  section: { marginBottom: 12 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  table: {
    borderWidth: 1,
    borderColor: '#000',
    marginTop: 10
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    padding: 5,
    fontWeight: 'bold',
    backgroundColor: '#f0f0f0'
  },
  tableRow: {
    flexDirection: 'row',
    padding: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#000'
  },
  tableCell: {
    flex: 1,
    padding: 4
  }
});

interface PrintableEquipmentSectionProps {
  event: EventModel;
}

const PrintableEquipmentSection: React.FC<PrintableEquipmentSectionProps> = ({
  event
}) => (
  <Document>
    <Page size='A4' style={styles.page}>
      <Text style={styles.title}>Equipos</Text>
      <View style={styles.section}>
        {event.equipment && event.equipment.length > 0 ? (
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.tableCell}>Equipo</Text>
              <Text style={styles.tableCell}>Cantidad</Text>
              <Text style={styles.tableCell}>Precio</Text>
            </View>
            {event.equipment.map((equipment, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={styles.tableCell}>{equipment.name}</Text>
                {/* <Text style={styles.tableCell}>
                  {equipment.selectedQuantity || equipment.totalQuantity}
                </Text> */}
                {/* <Text style={styles.tableCell}>${equipment.price}</Text> */}
              </View>
            ))}
          </View>
        ) : (
          <Text>No hay equipos registrados para este evento.</Text>
        )}
      </View>
    </Page>
  </Document>
);

export default PrintableEquipmentSection;
