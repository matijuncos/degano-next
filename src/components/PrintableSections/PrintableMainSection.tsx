import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';
import { EventModel } from '@/context/types';

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 12 },
  section: { marginBottom: 12 },
  label: { fontWeight: 'bold', marginRight: 8 },
  row: { flexDirection: 'row', marginBottom: 4 }
});

interface PrintableMainSectionProps {
  event: EventModel;
}

const PrintableMainSection: React.FC<PrintableMainSectionProps> = ({
  event
}) => (
  <Document>
    <Page size='A4' style={styles.page}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>
        Información Principal
      </Text>
      <View style={styles.section}>
        <View style={styles.row}>
          <Text style={styles.label}>Teléfono:</Text>
          <Text>{event.phoneNumber}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Tipo de evento:</Text>
          <Text>{event.type}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Fecha:</Text>
          <Text>{new Date(event.date).toLocaleDateString()}</Text>
        </View>
        {event.endDate && (
          <View style={styles.row}>
            <Text style={styles.label}>Fecha Finalización:</Text>
            <Text>{new Date(event.endDate).toLocaleDateString()}</Text>
          </View>
        )}
        <View style={styles.row}>
          <Text style={styles.label}>Salón:</Text>
          <Text>{event.salon}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Dirección:</Text>
          <Text>{event.eventAddress}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Localidad:</Text>
          <Text>{event.eventCity}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Cantidad de invitados:</Text>
          <Text>{event.guests}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Edad:</Text>
          <Text>{event.age}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Edad Promedio:</Text>
          <Text>{event.averageAge}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Email:</Text>
          <Text>{event.email}</Text>
        </View>
      </View>
    </Page>
  </Document>
);

export default PrintableMainSection;
