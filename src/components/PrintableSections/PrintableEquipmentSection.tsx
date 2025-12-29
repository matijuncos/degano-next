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
  equipmentTable: {
    marginTop: 8
  },
  equipmentTableHeader: {
    flexDirection: 'row',
    marginBottom: 8,
    backgroundColor: '#7dc55eab',
    padding: '4px 0px'
  },
  equipmentTableHeaderCell: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase'
  },
  equipmentNameHeader: {
    flex: 3
  },
  equipmentCheckboxHeader: {
    flex: 1,
    textAlign: 'center'
  },
  equipmentTableRow: {
    flexDirection: 'row',
    marginBottom: 6,
    alignItems: 'center'
  },
  equipmentNameCell: {
    flex: 3,
    fontSize: 10
  },
  equipmentCheckboxCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row'
  },
  checkbox: {
    width: 12,
    height: 12,
    border: '1.5px solid #333',
    backgroundColor: '#ffffff'
  },
  noDataText: {
    fontStyle: 'italic',
    color: '#666',
    fontSize: 10
  }
});

interface PrintableEquipmentSectionProps {
  event: EventModel;
}

// Exportar contenido interno para reutilización en PrintableFullEventSection
export const PrintableEquipmentContent: React.FC<PrintableEquipmentSectionProps> = ({
  event
}) => (
  <View style={styles.section}>
    {event.equipment && event.equipment.length > 0 ? (
      <View style={styles.equipmentTable}>
        {/* Header de la tabla */}
        <View style={styles.equipmentTableHeader}>
          <Text style={[styles.equipmentTableHeaderCell, styles.equipmentNameHeader]}>
            Nombre Equipamiento
          </Text>
          <Text style={[styles.equipmentTableHeaderCell, styles.equipmentCheckboxHeader]}>
            Controlado
          </Text>
          <Text style={[styles.equipmentTableHeaderCell, styles.equipmentCheckboxHeader]}>
            Listo
          </Text>
          <Text style={[styles.equipmentTableHeaderCell, styles.equipmentCheckboxHeader]}>
            Salida
          </Text>
          <Text style={[styles.equipmentTableHeaderCell, styles.equipmentCheckboxHeader]}>
            Regreso
          </Text>
        </View>
        {/* Filas de equipos */}
        {event.equipment.map((equipment, index) => (
          <View key={index} style={styles.equipmentTableRow} wrap={false}>
            <Text style={styles.equipmentNameCell}>{equipment.name}</Text>
            <View style={styles.equipmentCheckboxCell}>
              <View style={styles.checkbox} />
            </View>
            <View style={styles.equipmentCheckboxCell}>
              <View style={styles.checkbox} />
            </View>
            <View style={styles.equipmentCheckboxCell}>
              <View style={styles.checkbox} />
            </View>
            <View style={styles.equipmentCheckboxCell}>
              <View style={styles.checkbox} />
            </View>
          </View>
        ))}
      </View>
    ) : (
      <Text style={styles.noDataText}>
        No hay equipos registrados para este evento.
      </Text>
    )}
  </View>
);

// Componente principal con logo y header verde
const PrintableEquipmentSection: React.FC<PrintableEquipmentSectionProps> = ({
  event
}) => (
  <Document>
    <Page size='A4' style={styles.page}>
      <View style={styles.header}>
        <Image src="/degano-logo-imp.png" style={styles.logo} />
      </View>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Equipos</Text>
      </View>
      <PrintableEquipmentContent event={event} />
    </Page>
  </Document>
);

export default PrintableEquipmentSection;
