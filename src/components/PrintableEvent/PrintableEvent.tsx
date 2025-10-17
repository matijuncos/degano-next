'use client';
import React, { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import {
  Page,
  Text,
  View,
  Document,
  Image as PDFImage,
  StyleSheet,
  BlobProvider
} from '@react-pdf/renderer';
import { useDeganoCtx } from '@/context/DeganoContext';
import {
  Box,
  Button,
  Flex,
  Table,
  TableTbody,
  TableTd,
  TableTh,
  TableThead,
  TableTr
} from '@mantine/core';
import Link from 'next/link';
import logo from '../../assets/logo.png';
import Image from 'next/image';

// Constants
const EVENT_DETAILS_LABELS = {
  _id: 'ID',
  fullName: 'Nombre Completo',
  phoneNumber: 'Número de teléfono',
  email: 'Email',
  age: 'Edad',
  address: 'Dirección',
  type: 'Tipo de evento',
  guests: 'Invitados',
  eventAddress: 'Dirección de evento',
  eventCity: 'Ciudad',
  lugar: 'Lugar',
  date: 'Fecha',
  churchDate: 'Hora de la iglesia',
  civil: 'Hora del civil',
  bandName: 'Nombre de banda',
  moreData: 'Mas Información',
  showtime: 'Hora del show',
  music: 'Musica',
  equipment: 'Equipos',
  payment: 'Pago',
  active: 'Activo',
  playlist: 'Playlists'
} as const;

const EXCLUDED_FIELDS: (keyof typeof EVENT_DETAILS_LABELS)[] = [];

// Types
type EventDetailsKey = keyof typeof EVENT_DETAILS_LABELS;
type EventValue = string | number;

interface PropertyFieldProps {
  title: EventDetailsKey;
  value?: EventValue;
}

// PDF Styles
const createPDFStyles = () =>
  StyleSheet.create({
    page: {
      padding: 18,
      flexDirection: 'column',
      color: 'black'
    },
    header: {
      padding: 8,
      marginBottom: 16,
      color: 'black'
    },
    logo: {
      width: 40,
      height: 40,
      borderRadius: '100%',
      overflow: 'hidden',
      color: 'black'
    },
    title: {
      fontWeight: 700,
      fontSize: 20,
      marginBottom: 12,
      color: 'black'
    },
    section: {
      marginBottom: 10,
      flexDirection: 'row',
      alignItems: 'center',
      color: 'black'
    },
    playlist: {
      marginTop: 10,
      color: 'black'
    },
    equipment: {
      marginTop: 20,
      color: 'black'
    },
    equipmentTitle: {
      fontWeight: 700,
      fontSize: 20,
      marginBottom: 28,
      color: 'black'
    },
    table: {
      marginTop: 10,
      borderWidth: 1,
      borderColor: '#000',
      color: 'black'
    },
    tableHeader: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: '#000',
      padding: 5,
      fontWeight: 'bold',
      color: 'black'
    },
    tableRow: {
      flexDirection: 'row',
      padding: 5,
      borderBottomWidth: 1,
      borderBottomColor: '#000',
      color: 'black'
    },
    tableCell: {
      flex: 1,
      color: 'black'
    },
    keyName: {
      fontSize: 16,
      fontWeight: 700,
      color: 'black'
    },
    keyValue: {
      fontSize: 14,
      fontWeight: 400,
      color: 'black'
    }
  });

// Utility functions
const isValidEventValue = (value: unknown): value is EventValue => {
  return typeof value === 'string' || typeof value === 'number';
};

const shouldRenderField = (title: EventDetailsKey, value: unknown): boolean => {
  return (
    !EXCLUDED_FIELDS.includes(title) &&
    value != null &&
    value !== '' &&
    EVENT_DETAILS_LABELS[title] &&
    isValidEventValue(value)
  );
};

const formatEventTitle = (event: any): string => {
  const name = event?.fullName || '';
  const date = event?.date ? new Date(event.date).toLocaleDateString() : '';
  const lugar = event?.lugar || '';

  return [name, date, lugar].filter(Boolean).join(' - ');
};

const PrintableEvent = () => {
  const { selectedEvent } = useDeganoCtx();
  const componentRef = useRef<HTMLDivElement>(null);
  const pdfStyles = createPDFStyles();

  const handlePrint = useReactToPrint({
    content: () => componentRef.current || null
  });

  const PropertyField = ({ title, value }: PropertyFieldProps) => {
    if (!shouldRenderField(title, value)) return null;

    return (
      <Box>
        <Text
          style={{
            fontSize: '18px',
            fontWeight: 600,
            marginRight: '4px'
          }}
        >
          {EVENT_DETAILS_LABELS[title]}:
        </Text>
        <Text>{value}</Text>
      </Box>
    );
  };

  const renderEventFields = () => {
    if (!selectedEvent) return null;

    return Object.keys(selectedEvent).map((key) => {
      const eventKey = key as EventDetailsKey;
      const value = (selectedEvent as Record<string, any>)[key];

      return <PropertyField title={eventKey} key={key} value={value} />;
    });
  };

  const renderPlaylists = () => {
    if (!selectedEvent?.playlist?.length) return null;

    return selectedEvent.playlist.map((playlist) => (
      <Link href={playlist.url} target='_blank' key={playlist.url}>
        {playlist.label}
      </Link>
    ));
  };

  const renderEquipmentTable = () => {
    if (!selectedEvent?.equipment?.length) return null;

    return (
      <Box my='20px'>
        <Text
          style={{
            fontWeight: 700,
            fontSize: '26px',
            marginBottom: '28px'
          }}
        >
          Equipamiento
        </Text>
        <Table>
          <TableThead>
            <TableTh>Equipo</TableTh>
            <TableTh>Cantidad</TableTh>
          </TableThead>
          <TableTbody>
            {selectedEvent.equipment.map((equipment) => (
              <TableTr key={equipment.name}>
                <TableTd>{equipment.name}</TableTd>
                {/* <TableTd>{equipment.selectedQuantity}</TableTd> */}
              </TableTr>
            ))}
          </TableTbody>
        </Table>
      </Box>
    );
  };

  const renderPDFEquipment = () => {
    if (!selectedEvent?.equipment?.length) return null;

    return (
      <View style={pdfStyles.equipment} wrap={false}>
        <Text style={pdfStyles.equipmentTitle}>Equipamiento</Text>
        <View style={pdfStyles.table}>
          <View style={pdfStyles.tableHeader}>
            <Text style={pdfStyles.tableCell}>Equipo</Text>
            <Text style={pdfStyles.tableCell}>Cantidad</Text>
          </View>
          {selectedEvent.equipment.map((equipment) => (
            <View style={pdfStyles.tableRow} key={equipment.name}>
              <Text style={pdfStyles.tableCell}>{equipment.name}</Text>
              {/* <Text style={pdfStyles.tableCell}>
                {equipment.selectedQuantity}
              </Text> */}
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderPDFPlaylists = () => {
    if (!selectedEvent?.playlist?.length) return null;

    return (
      <View style={pdfStyles.playlist}>
        {selectedEvent.playlist.map((playlist) => (
          <Link href={playlist.url} key={playlist.url}>
            {playlist.label}
          </Link>
        ))}
      </View>
    );
  };

  const renderPDFEventFields = () => {
    if (!selectedEvent) return null;

    return Object.keys(selectedEvent).map((key) => {
      const eventKey = key as EventDetailsKey;
      const value = (selectedEvent as Record<string, any>)[key];

      if (!shouldRenderField(eventKey, value)) return null;

      return (
        <View style={pdfStyles.section} key={key}>
          <Text style={pdfStyles.keyName}>
            {`${EVENT_DETAILS_LABELS[eventKey]}:`}
          </Text>
          <Text style={pdfStyles.keyValue}>{value as EventValue}</Text>
        </View>
      );
    });
  };

  const eventTitle = formatEventTitle(selectedEvent);

  const MyDocument = (
    <Document>
      <Page size='A4' style={pdfStyles.page}>
        <View style={pdfStyles.logo}>
          <PDFImage src='/logo.png' />
        </View>
        <View style={pdfStyles.header}>
          <Text style={pdfStyles.title}>{eventTitle}</Text>
        </View>
        <View>{renderPDFEventFields()}</View>
        {renderPDFPlaylists()}
        {renderPDFEquipment()}
      </Page>
    </Document>
  );

  return (
    <>
      <Flex p='18px' direction='column' ref={componentRef}>
        <Flex
          align='center'
          direction='row-reverse'
          justify='space-between'
          style={{
            border: 'solid 1px white',
            padding: '8px',
            marginBottom: '16px'
          }}
        >
          <Box
            style={{
              width: '70px',
              height: '70px',
              overflow: 'hidden',
              borderRadius: '100%'
            }}
          >
            <Image width={70} height={70} alt='logo' src={logo} />
          </Box>
          <Text
            style={{ fontWeight: 700, fontSize: '26px', marginBottom: '12px' }}
          >
            {eventTitle}
          </Text>
        </Flex>

        <Flex direction='column' gap='10px'>
          {renderEventFields()}
        </Flex>

        {renderPlaylists()}
        {renderEquipmentTable()}
      </Flex>

      <Flex align='center' justify='flex-end' gap='24px'>
        <BlobProvider document={MyDocument}>
          {({ url, loading }) =>
            loading ? (
              <Button variant='outline' size='xs' disabled>
                Cargando...
              </Button>
            ) : (
              url && (
                <a href={url} download={`${eventTitle}.pdf`}>
                  <Button variant='outline' size='xs'>
                    Descargar PDF
                  </Button>
                </a>
              )
            )
          }
        </BlobProvider>
        <Button onClick={handlePrint}>Imprimir</Button>
      </Flex>
    </>
  );
};

export default PrintableEvent;
