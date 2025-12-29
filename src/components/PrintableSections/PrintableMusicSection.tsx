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
    textTransform: 'uppercase'
  },
  section: { marginBottom: 12 },
  subsection: { marginBottom: 12 },
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
  songItem: {
    marginBottom: 4,
    fontSize: 10
  },
  genreTable: {
    marginTop: 8
  },
  genreTableHeader: {
    flexDirection: 'row',
    marginBottom: 8,
    borderBottom: '2px solid #4CAF50',
    paddingBottom: 4
  },
  genreTableHeaderCell: {
    flex: 1,
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase'
  },
  genreTableRow: {
    flexDirection: 'row',
    marginBottom: 4
  },
  genreTableCell: {
    flex: 1,
    fontSize: 10
  }
});

interface PrintableMusicSectionProps {
  event: EventModel;
}

// Función para mapear el valor numérico a texto
const getGenreLabel = (value: number): string => {
  const labels: { [key: number]: string } = {
    4: 'Mucho',
    3: 'Normal',
    2: 'Poco',
    1: 'Nada'
  };
  return labels[value] || 'Sin especificar';
};

// Exportar contenido interno para reutilización en PrintableFullEventSection
export const PrintableMusicContent: React.FC<PrintableMusicSectionProps> = ({
  event
}) => (
  <View style={styles.section}>
    {/* Canciones de Ingreso */}
    {event.welcomeSongs && event.welcomeSongs.length > 0 && (
      <View style={styles.subsection} wrap={false}>
        <View style={styles.subsectionHeader}>
          <Text style={styles.subsectionTitle}>Canciones de Ingreso</Text>
        </View>
        {event.welcomeSongs.map((song, index) => (
          <View key={index} style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>TEMA {index + 1}:</Text>
            <Text style={styles.fieldValue}>{song}</Text>
          </View>
        ))}
      </View>
    )}

    {/* Canción de Rosas */}
    {event.walkIn && event.walkIn.length > 0 && (
      <View style={styles.subsection}>
        <View style={styles.subsectionHeader}>
          <Text style={styles.subsectionTitle}>Canción de Rosas</Text>
        </View>
        {event.walkIn.map((song, index) => (
          <View key={index} style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>TEMA {index + 1}:</Text>
            <Text style={styles.fieldValue}>{song}</Text>
          </View>
        ))}
      </View>
    )}

    {/* Ceremonia Civil */}
    {event.ceremoniaCivil &&
     (event.ceremoniaCivil.ingreso ||
      event.ceremoniaCivil.firmas ||
      event.ceremoniaCivil.salida ||
      (event.ceremoniaCivil.otros && event.ceremoniaCivil.otros.length > 0)) && (
      <View style={styles.subsection} wrap={false}>
        <View style={styles.subsectionHeader}>
          <Text style={styles.subsectionTitle}>Ceremonia Civil</Text>
        </View>
        {event.ceremoniaCivil.ingreso && (
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>INGRESO:</Text>
            <Text style={styles.fieldValue}>{event.ceremoniaCivil.ingreso}</Text>
          </View>
        )}
        {event.ceremoniaCivil.firmas && (
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>FIRMAS:</Text>
            <Text style={styles.fieldValue}>{event.ceremoniaCivil.firmas}</Text>
          </View>
        )}
        {event.ceremoniaCivil.salida && (
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>SALIDA:</Text>
            <Text style={styles.fieldValue}>{event.ceremoniaCivil.salida}</Text>
          </View>
        )}
        {event.ceremoniaCivil.otros && event.ceremoniaCivil.otros.length > 0 && (
          <>
            {event.ceremoniaCivil.otros.map((momento, index) => (
              <View key={index} style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>{momento.titulo.toUpperCase()}:</Text>
                <Text style={styles.fieldValue}>{momento.cancion}</Text>
              </View>
            ))}
          </>
        )}
      </View>
    )}

    {/* Ceremonia Extra */}
    {event.ceremoniaExtra &&
     (event.ceremoniaExtra.ingreso ||
      event.ceremoniaExtra.firmas ||
      event.ceremoniaExtra.salida ||
      (event.ceremoniaExtra.otros && event.ceremoniaExtra.otros.length > 0)) && (
      <View style={styles.subsection}>
        <View style={styles.subsectionHeader}>
          <Text style={styles.subsectionTitle}>Ceremonia Extra</Text>
        </View>
        {event.ceremoniaExtra.ingreso && (
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>INGRESO:</Text>
            <Text style={styles.fieldValue}>{event.ceremoniaExtra.ingreso}</Text>
          </View>
        )}
        {event.ceremoniaExtra.firmas && (
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>FIRMAS:</Text>
            <Text style={styles.fieldValue}>{event.ceremoniaExtra.firmas}</Text>
          </View>
        )}
        {event.ceremoniaExtra.salida && (
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>SALIDA:</Text>
            <Text style={styles.fieldValue}>{event.ceremoniaExtra.salida}</Text>
          </View>
        )}
        {event.ceremoniaExtra.otros && event.ceremoniaExtra.otros.length > 0 && (
          <>
            {event.ceremoniaExtra.otros.map((momento, index) => (
              <View key={index} style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>{momento.titulo.toUpperCase()}:</Text>
                <Text style={styles.fieldValue}>{momento.cancion}</Text>
              </View>
            ))}
          </>
        )}
      </View>
    )}

    {/* Vals */}
    {event.vals && event.vals.length > 0 && (
      <View style={styles.subsection}>
        <View style={styles.subsectionHeader}>
          <Text style={styles.subsectionTitle}>Vals</Text>
        </View>
        {event.vals.map((song, index) => (
          <View key={index} style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>TEMA {index + 1}:</Text>
            <Text style={styles.fieldValue}>{song}</Text>
          </View>
        ))}
      </View>
    )}

    {/* Apertura de Pista */}
    {event.openingPartySongs && event.openingPartySongs.length > 0 && (
      <View style={styles.subsection}>
        <View style={styles.subsectionHeader}>
          <Text style={styles.subsectionTitle}>Apertura de Pista</Text>
        </View>
        {event.openingPartySongs.map((item, index) => (
          <View key={index} style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>{item.titulo.toUpperCase()}:</Text>
            <Text style={styles.fieldValue}>{item.cancion}</Text>
          </View>
        ))}
      </View>
    )}

    {/* Canciones de Cierre */}
    {event.closingSongs && event.closingSongs.length > 0 && (
      <View style={styles.subsection}>
        <View style={styles.subsectionHeader}>
          <Text style={styles.subsectionTitle}>Canciones de Cierre</Text>
        </View>
        {event.closingSongs.map((song, index) => (
          <View key={index} style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>TEMA {index + 1}:</Text>
            <Text style={styles.fieldValue}>{song}</Text>
          </View>
        ))}
      </View>
    )}

    {/* Momentos Personalizados */}
    {event.customMoments && event.customMoments.length > 0 && (
      <View style={styles.subsection}>
        <View style={styles.subsectionHeader}>
          <Text style={styles.subsectionTitle}>Momentos Personalizados</Text>
        </View>
        {event.customMoments.map((item, index) => (
          <View key={index} style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>{item.titulo.toUpperCase()}:</Text>
            <Text style={styles.fieldValue}>{item.cancion}</Text>
          </View>
        ))}
      </View>
    )}

    {/* Música para Ambientar */}
    {event.ambienceMusic && event.ambienceMusic.length > 0 && (
      <View style={styles.subsection}>
        <View style={styles.subsectionHeader}>
          <Text style={styles.subsectionTitle}>Música para Ambientar</Text>
        </View>
        {event.ambienceMusic.map((item, index) => (
          <View key={index} style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>{item.descripcion.toUpperCase()}:</Text>
            <Text style={styles.fieldValue}>{item.generos.join(', ')}</Text>
          </View>
        ))}
      </View>
    )}

    {/* Géneros Musicales */}
    {event.music.genres && event.music.genres.length > 0 && (
      <View style={styles.subsection} wrap={false}>
        <View style={styles.subsectionHeader}>
          <Text style={styles.subsectionTitle}>Géneros Musicales</Text>
        </View>
        <View style={styles.genreTable}>
          {/* Header de la tabla */}
          <View style={styles.genreTableHeader}>
            <Text style={styles.genreTableHeaderCell}>Ritmo</Text>
            <Text style={styles.genreTableHeaderCell}>Preferencia</Text>
            <Text style={styles.genreTableHeaderCell}>Ritmo</Text>
            <Text style={styles.genreTableHeaderCell}>Preferencia</Text>
          </View>
          {/* Filas de la tabla - 2 géneros por fila */}
          {event.music.genres.reduce((rows: any[], genre, index) => {
            if (index % 2 === 0) {
              rows.push([genre]);
            } else {
              rows[rows.length - 1].push(genre);
            }
            return rows;
          }, []).map((row, rowIndex) => (
            <View key={rowIndex} style={styles.genreTableRow}>
              <Text style={styles.genreTableCell}>{row[0].genre}</Text>
              <Text style={styles.genreTableCell}>{getGenreLabel(row[0].value)}</Text>
              {row[1] ? (
                <>
                  <Text style={styles.genreTableCell}>{row[1].genre}</Text>
                  <Text style={styles.genreTableCell}>{getGenreLabel(row[1].value)}</Text>
                </>
              ) : (
                <>
                  <Text style={styles.genreTableCell}></Text>
                  <Text style={styles.genreTableCell}></Text>
                </>
              )}
            </View>
          ))}
        </View>
      </View>
    )}

    {/* Canciones Prohibidas */}
    {event.music.forbidden && event.music.forbidden.length > 0 && (
      <View style={styles.subsection} wrap={false}>
        <View style={styles.subsectionHeader}>
          <Text style={styles.subsectionTitle}>Prohibidos</Text>
        </View>
        {event.music.forbidden.map((song, index) => (
          <Text key={index} style={styles.songItem}>• {song}</Text>
        ))}
      </View>
    )}

    {/* Canciones Requeridas */}
    {event.music.required && event.music.required.length > 0 && (
      <View style={styles.subsection} wrap={false}>
        <View style={styles.subsectionHeader}>
          <Text style={styles.subsectionTitle}>Requeridos</Text>
        </View>
        {event.music.required.map((song, index) => (
          <Text key={index} style={styles.songItem}>• {song}</Text>
        ))}
      </View>
    )}

    {/* Playlists de Spotify */}
    {event.playlist && event.playlist.length > 0 && (
      <View style={styles.subsection}>
        <View style={styles.subsectionHeader}>
          <Text style={styles.subsectionTitle}>Playlists de Spotify</Text>
        </View>
        {event.playlist.map((item, index) => (
          <View key={index} style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>{item.label.toUpperCase()}:</Text>
            <Text style={styles.fieldValue}>{item.url}</Text>
          </View>
        ))}
      </View>
    )}
  </View>
);

// Componente principal con logo y header verde
const PrintableMusicSection: React.FC<PrintableMusicSectionProps> = ({
  event
}) => (
  <Document>
    <Page size='A4' style={styles.page}>
      <View style={styles.header}>
        <Image src="/degano-logo-imp.png" style={styles.logo} />
      </View>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Música</Text>
      </View>
      <PrintableMusicContent event={event} />
    </Page>
  </Document>
);

export default PrintableMusicSection;
