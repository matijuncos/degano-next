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
  twoColumns: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 6
  },
  column: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center'
  }
});

interface PrintableMainSectionProps {
  event: EventModel;
}

// Exportar contenido interno para reutilización en PrintableFullEventSection
export const PrintableMainContent: React.FC<PrintableMainSectionProps> = ({
  event
}) => {
  const formatDate = (date: any) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatTime = (date: any) => {
    if (!date) return '';
    return new Date(date).toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <View style={styles.section}>
      {/* SUBSECCIÓN: DATOS DEL EVENTO */}
      <View style={styles.subsectionHeader}>
        <Text style={styles.subsectionTitle}>Datos del evento</Text>
      </View>

      {/* Fechas en 2 columnas */}
      <View style={styles.twoColumns}>
        <View style={styles.column}>
          <Text style={styles.fieldLabel}>FECHA DE EVENTO:</Text>
          <Text style={styles.fieldValue}>{formatDate(event.date)}</Text>
        </View>
        {event.endDate && (
          <View style={styles.column}>
            <Text style={styles.fieldLabel}>FECHA FINALIZACIÓN:</Text>
            <Text style={styles.fieldValue}>{formatDate(event.endDate)}</Text>
          </View>
        )}
      </View>

      {/* Horarios en 2 columnas */}
      <View style={styles.twoColumns}>
        <View style={styles.column}>
          <Text style={styles.fieldLabel}>HORA DE INICIO:</Text>
          <Text style={styles.fieldValue}>{formatTime(event.date)}</Text>
        </View>
        {event.endDate && (
          <View style={styles.column}>
            <Text style={styles.fieldLabel}>HORA DE FINALIZACIÓN:</Text>
            <Text style={styles.fieldValue}>{formatTime(event.endDate)}</Text>
          </View>
        )}
      </View>

      {/* Iglesia y Civil en 2 columnas si existen */}
      {(event.churchDate || event.civil) && (
        <View style={styles.twoColumns}>
          {event.churchDate && (
            <View style={styles.column}>
              <Text style={styles.fieldLabel}>HORA DE IGLESIA:</Text>
              <Text style={styles.fieldValue}>{event.churchDate}</Text>
            </View>
          )}
          {event.civil && (
            <View style={styles.column}>
              <Text style={styles.fieldLabel}>HORA DEL CIVIL:</Text>
              <Text style={styles.fieldValue}>{event.civil}</Text>
            </View>
          )}
        </View>
      )}

      {/* Tipo de evento */}
      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>TIPO DE EVENTO:</Text>
        <Text style={styles.fieldValue}>{event.type}</Text>
      </View>

      {/* Empresa si existe */}
      {event.company && (
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>EMPRESA:</Text>
          <Text style={styles.fieldValue}>{event.company}</Text>
        </View>
      )}

      {/* Cantidad de Invitados si existe */}
      {event.guests && (
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>CANTIDAD DE INVITADOS:</Text>
          <Text style={styles.fieldValue}>{event.guests}</Text>
        </View>
      )}

      {/* SUBSECCIÓN: UBICACIÓN */}
      <View style={styles.subsectionHeader}>
        <Text style={styles.subsectionTitle}>Ubicación</Text>
      </View>

      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>LUGAR:</Text>
        <Text style={styles.fieldValue}>{event.lugar}</Text>
      </View>

      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>LOCALIDAD:</Text>
        <Text style={styles.fieldValue}>{event.eventCity}</Text>
      </View>

      {event.eventAddress && (
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>DIRECCIÓN:</Text>
          <Text style={styles.fieldValue}>{event.eventAddress}</Text>
        </View>
      )}

      {event.venueContactName && (
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>NOMBRE CONTACTO DEL LUGAR:</Text>
          <Text style={styles.fieldValue}>{event.venueContactName}</Text>
        </View>
      )}

      {(event.venueContactPhone || event.venueContact) && (
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>TELÉFONO DE CONTACTO:</Text>
          <Text style={styles.fieldValue}>
            {event.venueContactPhone || event.venueContact}
          </Text>
        </View>
      )}

      {/* SUBSECCIÓN: CLIENTE */}
      <View style={styles.subsectionHeader}>
        <Text style={styles.subsectionTitle}>Cliente</Text>
      </View>

      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>NOMBRE CLIENTE:</Text>
        <Text style={styles.fieldValue}>{event.fullName}</Text>
      </View>

      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>TELÉFONO:</Text>
        <Text style={styles.fieldValue}>{event.phoneNumber}</Text>
      </View>

      {event.email && (
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>EMAIL:</Text>
          <Text style={styles.fieldValue}>{event.email}</Text>
        </View>
      )}

      {event.rol && (
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>ROL EN EL EVENTO:</Text>
          <Text style={styles.fieldValue}>{event.rol}</Text>
        </View>
      )}

      {event.age && (
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>EDAD:</Text>
          <Text style={styles.fieldValue}>{event.age}</Text>
        </View>
      )}

      {event.address && (
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>DIRECCIÓN:</Text>
          <Text style={styles.fieldValue}>{event.address}</Text>
        </View>
      )}

      {/* Clientes Extras */}
      {event.extraClients && event.extraClients.length > 0 && (
        <>
          {event.extraClients.map((client, index) => (
            <View key={`extra-client-${index}`}>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>
                  NOMBRE CLIENTE EXTRA {index + 1}:
                </Text>
                <Text style={styles.fieldValue}>{client.fullName}</Text>
              </View>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>
                  TELÉFONO CLIENTE EXTRA {index + 1}:
                </Text>
                <Text style={styles.fieldValue}>{client.phoneNumber}</Text>
              </View>
              {client.email && (
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>
                    EMAIL CLIENTE EXTRA {index + 1}:
                  </Text>
                  <Text style={styles.fieldValue}>{client.email}</Text>
                </View>
              )}
              {client.rol && (
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>
                    ROL CLIENTE EXTRA {index + 1}:
                  </Text>
                  <Text style={styles.fieldValue}>{client.rol}</Text>
                </View>
              )}
              {client.age && (
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>
                    EDAD CLIENTE EXTRA {index + 1}:
                  </Text>
                  <Text style={styles.fieldValue}>{client.age}</Text>
                </View>
              )}
              {client.address && (
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>
                    DIRECCIÓN CLIENTE EXTRA {index + 1}:
                  </Text>
                  <Text style={styles.fieldValue}>{client.address}</Text>
                </View>
              )}
            </View>
          ))}
        </>
      )}

      {/* SUBSECCIÓN: STAFF */}
      {((event.staff && event.staff.length > 0) ||
        event.staffArrivalDate ||
        event.equipmentArrivalDate ||
        event.staffArrivalTime ||
        event.equipmentArrivalTime) && (
        <>
          <View style={styles.subsectionHeader}>
            <Text style={styles.subsectionTitle}>Staff</Text>
          </View>

          {event.staff &&
            event.staff.length > 0 &&
            event.staff.map((staffMember, index) => (
              <View key={`staff-${index}`} style={styles.twoColumns}>
                <View style={styles.column}>
                  <Text style={styles.fieldLabel}>
                    MIEMBRO STAFF {index + 1}:
                  </Text>
                  <Text style={styles.fieldValue}>
                    {staffMember.employeeName}
                  </Text>
                </View>
                <View style={styles.column}>
                  <Text style={styles.fieldLabel}>ROL MIEMBRO STAFF {index + 1}:</Text>
                  <Text style={styles.fieldValue}>{staffMember.rol}</Text>
                </View>
              </View>
            ))}

          {(event.staffArrivalDate || event.equipmentArrivalDate) && (
            <View style={styles.twoColumns}>
              {event.staffArrivalDate && (
                <View style={styles.column}>
                  <Text style={styles.fieldLabel}>FECHA LLEGADA STAFF:</Text>
                  <Text style={styles.fieldValue}>{formatDate(event.staffArrivalDate)}</Text>
                </View>
              )}
              {event.equipmentArrivalDate && (
                <View style={styles.column}>
                  <Text style={styles.fieldLabel}>
                    FECHA LLEGADA EQUIPAMIENTO:
                  </Text>
                  <Text style={styles.fieldValue}>
                    {formatDate(event.equipmentArrivalDate)}
                  </Text>
                </View>
              )}
            </View>
          )}

          {(event.staffArrivalTime || event.equipmentArrivalTime) && (
            <View style={styles.twoColumns}>
              {event.staffArrivalTime && (
                <View style={styles.column}>
                  <Text style={styles.fieldLabel}>HORARIO LLEGADA STAFF:</Text>
                  <Text style={styles.fieldValue}>{event.staffArrivalTime}</Text>
                </View>
              )}
              {event.equipmentArrivalTime && (
                <View style={styles.column}>
                  <Text style={styles.fieldLabel}>
                    HORARIO LLEGADA EQUIPAMIENTO:
                  </Text>
                  <Text style={styles.fieldValue}>
                    {event.equipmentArrivalTime}
                  </Text>
                </View>
              )}
            </View>
          )}
        </>
      )}
    </View>
  );
};

// Componente principal con logo y header verde
const PrintableMainSection: React.FC<PrintableMainSectionProps> = ({
  event
}) => (
  <Document>
    <Page size='A4' style={styles.page}>
      <View style={styles.header}>
        <Image src="/degano-logo-imp.png" style={styles.logo} />
      </View>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Información Principal</Text>
      </View>
      <PrintableMainContent event={event} />
    </Page>
  </Document>
);

export default PrintableMainSection;
