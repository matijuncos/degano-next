import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';
import { EventModel } from '@/context/types';

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 12 },
  section: { marginBottom: 16 },
  label: { fontWeight: 'bold', marginRight: 8 },
  row: { flexDirection: 'row', marginBottom: 4 },
  subsection: { marginBottom: 12 },
  subsectionTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 8 },
  chip: {
    backgroundColor: '#f0f0f0',
    padding: '4px 8px',
    margin: '2px',
    borderRadius: 4
  },
  genreRow: { flexDirection: 'row', marginBottom: 4, alignItems: 'center' },
  genreName: { flex: 1 },
  genreRating: { marginLeft: 8 }
});

interface PrintableMusicSectionProps {
  event: EventModel;
}

const PrintableMusicSection: React.FC<PrintableMusicSectionProps> = ({
  event
}) => (
  <Document>
    <Page size='A4' style={styles.page}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>
        Música
      </Text>

      <View style={styles.section}>
        <View style={styles.subsection}>
          <Text style={styles.subsectionTitle}>Géneros Musicales</Text>
          {event.music.genres && event.music.genres.length > 0 ? (
            event.music.genres.map((genre, index) => (
              <View key={index} style={styles.genreRow}>
                <Text style={styles.genreName}>{genre.genre}</Text>
                <Text style={styles.genreRating}>Rating: {genre.value}/5</Text>
              </View>
            ))
          ) : (
            <Text>No hay géneros especificados.</Text>
          )}
        </View>

        <View style={styles.subsection}>
          <Text style={styles.subsectionTitle}>Canciones Prohibidas</Text>
          {event.music.forbidden && event.music.forbidden.length > 0 ? (
            event.music.forbidden.map((song, index) => (
              <Text key={index} style={styles.chip}>
                {song}
              </Text>
            ))
          ) : (
            <Text>No hay canciones prohibidas.</Text>
          )}
        </View>

        <View style={styles.subsection}>
          <Text style={styles.subsectionTitle}>Canciones Requeridas</Text>
          {event.music.required && event.music.required.length > 0 ? (
            event.music.required.map((song, index) => (
              <Text key={index} style={styles.chip}>
                {song}
              </Text>
            ))
          ) : (
            <Text>No hay canciones requeridas.</Text>
          )}
        </View>
      </View>
    </Page>
  </Document>
);

export default PrintableMusicSection;
