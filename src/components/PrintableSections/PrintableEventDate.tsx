import React from 'react';
import { Text, View, StyleSheet } from '@react-pdf/renderer';
import { EventModel } from '@/context/types';

// Fecha del evento en negrita, para el espacio entre la barra verde del título
// de sección y el primer bloque de contenido. Se usa en todas las hojas.
// marginTop negativo para pegar la fecha al título verde (que trae
// marginBottom: 16), dejando apenas un margen blanco arriba y abajo.
const styles = StyleSheet.create({
  wrap: { marginTop: -10, marginBottom: 4 },
  text: { fontSize: 12, fontWeight: 'bold', color: '#333' }
});

function formatDate(date: any): string {
  if (!date) return '';
  return new Date(date).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

const PrintableEventDate: React.FC<{ event: EventModel }> = ({ event }) => {
  if (!event?.date) return null;
  return (
    <View style={styles.wrap}>
      <Text style={styles.text}>FECHA DEL EVENTO: {formatDate(event.date)}</Text>
    </View>
  );
};

export default PrintableEventDate;
