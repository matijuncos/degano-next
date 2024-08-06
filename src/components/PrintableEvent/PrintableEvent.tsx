'use client';
import React, { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import {
  PDFDownloadLink,
  Page,
  Text,
  View,
  Document,
  Image as PDFImage,
  StyleSheet
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

const eventDetailsLabels = {
  _id: 'ID',
  fullName: 'Nombre Completp',
  phoneNumber: 'Número de teléfono',
  email: 'Email',
  age: 'Edad',
  address: 'Dirección',
  type: 'Tipo de evento',
  guests: 'Invitados',
  eventAddress: 'Dirección de evento',
  eventCity: 'Ciudad',
  salon: 'Salón',
  date: 'Fecha',
  averageAge: 'Edad promedio',
  eventDate: 'Fecha del evento',
  civil: 'Civil',
  bandName: 'Nombre de banda',
  manager: 'Manager',
  managerPhone: 'Contacto del manager',
  moreData: 'Mas Información',
  showtime: 'Hora del show',
  music: 'Musica',
  equipment: 'Equipos',
  payment: 'Pago',
  active: 'Activo',
  playlist: 'Playlists'
};

const PrintableEvent = () => {
  const { selectedEvent } = useDeganoCtx();
  const componentRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    content: () => componentRef.current || null
  });
  const styles = StyleSheet.create({
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

  const EachPropertyField = ({
    title,
    value
  }: {
    title: keyof typeof eventDetailsLabels;
    value?: string | number;
  }) => {
    if (typeof value !== 'string' && typeof value !== 'number') return;
    return (
      <Box>
        <Text
          style={{
            fontSize: '18px',
            fontWeight: 600,
            marginRight: '4px'
          }}
        >
          {eventDetailsLabels[title]}:
        </Text>
        <Text>{value}</Text>
      </Box>
    );
  };

  const eventToArray = Object.keys(selectedEvent || {});

  console.log(typeof selectedEvent?.music);

  const MyDocument = (
    <Document>
      <Page size='A4' style={styles.page}>
        <View style={styles.logo}>
          <PDFImage src='/logo.png' />
        </View>
        <View style={styles.header}>
          <Text style={styles.title}>
            {`${selectedEvent?.fullName || ''} - ${new Date(
              selectedEvent?.date || ''
            ).toLocaleDateString()} - ${selectedEvent?.salon || ''}`}
          </Text>
        </View>
        <View>
          {eventToArray.map((key) => {
            if (
              typeof selectedEvent?.[key as keyof typeof selectedEvent] !==
                'string' &&
              typeof selectedEvent?.[key as keyof typeof selectedEvent] !==
                'number'
            ) {
              return <></>;
            }
            return (
              <View style={styles.section} key={key}>
                <Text style={styles.keyName}>{`${
                  eventDetailsLabels[key as keyof typeof eventDetailsLabels]
                }:`}</Text>
                <Text style={styles.keyValue}>
                  {(selectedEvent as { [key: string]: any })[
                    key as keyof typeof eventDetailsLabels
                  ] || ''}
                </Text>
              </View>
            );
          })}
        </View>
        {selectedEvent?.playlist?.length ? (
          <View style={styles.playlist}>
            {selectedEvent.playlist.map((playlist) => (
              <Link href={playlist.url} key={playlist.url}>
                {playlist.label}
              </Link>
            ))}
          </View>
        ) : null}
        {!!selectedEvent?.equipment.length && (
          <View style={styles.equipment} wrap={false}>
            <Text style={styles.equipmentTitle}>Equipamiento</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={styles.tableCell}>Equipo</Text>
                <Text style={styles.tableCell}>Cantidad</Text>
              </View>
              {selectedEvent?.equipment.map((equipment) => (
                <View style={styles.tableRow} key={equipment.name}>
                  <Text style={styles.tableCell}>{equipment.name}</Text>
                  <Text style={styles.tableCell}>{equipment.quantity}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
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
            {`${selectedEvent?.fullName || ''} - ${new Date(
              selectedEvent?.date || ''
            ).toLocaleDateString()} - ${selectedEvent?.salon || ''}`}
          </Text>
        </Flex>
        <Flex direction='column' gap='10px'>
          {eventToArray.map((key) => {
            return (
              <EachPropertyField
                title={key as keyof typeof eventDetailsLabels}
                key={key}
                value={(selectedEvent as { [key: string]: any })[key] || ''}
              />
            );
          })}
        </Flex>
        {selectedEvent?.playlist?.length ? (
          selectedEvent.playlist.map((playlist) => {
            return (
              <Link href={playlist.url} target='_black' key={playlist.url}>
                {playlist.label}
              </Link>
            );
          })
        ) : (
          <></>
        )}
        {!!selectedEvent?.equipment.length && (
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
                {selectedEvent?.equipment.map((equipment) => (
                  <TableTr key={equipment.name}>
                    <TableTd>{equipment.name}</TableTd>
                    <TableTd>{equipment.quantity}</TableTd>
                  </TableTr>
                ))}
              </TableTbody>
            </Table>
          </Box>
        )}
      </Flex>
      <Flex align='center' justify='flex-end' gap='24px'>
        <PDFDownloadLink
          document={MyDocument}
          fileName={`${selectedEvent?.fullName || ''} - ${new Date(
            selectedEvent?.date || ''
          ).toLocaleDateString()} - ${selectedEvent?.salon || ''}.pdf`}
        >
          {({ loading }) => (loading ? 'Cargando...' : 'Descargar PDF')}
        </PDFDownloadLink>
        <Button onClick={handlePrint}>Imprimir</Button>
      </Flex>
    </>
  );
};

export default PrintableEvent;
