'use client';
import EditableData from '@/components/EditableData/EditableData';
import EditablePayments from '@/components/EditablePayments/EditablePayments';
import EquipmentTable from '@/components/EquipmentTable/EquipmentTable';
import Loader from '@/components/Loader/Loader';
import PrintableEvent from '@/components/PrintableEvent/PrintableEvent';
import useLoadingCursor from '@/hooks/useLoadingCursor';
import { useDeganoCtx } from '@/context/DeganoContext';
import { EventModel } from '@/context/types';
import { withPageAuthRequired } from '@auth0/nextjs-auth0/client';
import { Accordion, Box, Button, Container, Title } from '@mantine/core';
import { useParams } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import FilesHandlerComponent from '@/components/FilesHandlerComponent/FilesHandlerComponent';
import SpotifyTable from '@/components/SpotifyTable/SpotifyTable';

const EventPage = () => {
  const { allEvents, setSelectedEvent, selectedEvent, loading, setFolderName } =
    useDeganoCtx();
  const { user } = useUser();

  const isAdmin = user?.role === 'admin';

  const { id } = useParams();
  const setLoadingCursor = useLoadingCursor();
  const [dateString, setDateString] = useState('');
  const [showPrintableComponent, setShowPrintableComponent] = useState(false);

  useEffect(() => {
    if (allEvents.length) {
      const selectedEvent: EventModel = allEvents.find(
        (event) => event._id === id
      )!;
      setSelectedEvent(selectedEvent);
      setFolderName(
        `${selectedEvent.fullName} - ${selectedEvent.salon} - ${new Date(
          selectedEvent.date
        ).toLocaleDateString('es-ES', {
          day: '2-digit',
          month: '2-digit',
          year: '2-digit'
        })}`
      );
    }
  }, [allEvents, id]);

  useEffect(() => {
    if (selectedEvent?.date) {
      const date = new Date(selectedEvent.date).toLocaleString('en-US', {
        timeZone: 'UTC'
      });
      setDateString(date);
    }
  }, [selectedEvent?.date]);

  useEffect(() => {
    setLoadingCursor(false);
  }, []);

  const AccordionSet = ({
    children,
    value
  }: {
    children: JSX.Element | JSX.Element[];
    value: string;
  }) => {
    return (
      <Accordion>
        <Accordion.Item value={value}>
          <Accordion.Control>{value}</Accordion.Control>
          <Accordion.Panel>
            <>{children}</>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    );
  };

  const printEventDetails = () => {
    setShowPrintableComponent((prev) => !prev);
  };

  return selectedEvent ? (
    <Container size='xl'>
      {loading ? (
        <Loader />
      ) : (
        <>
          {showPrintableComponent ? (
            <PrintableEvent />
          ) : (
            <>
              <Title mb='16px'>
                {`${selectedEvent.fullName} - ${dateString} - ${selectedEvent.salon}`}
              </Title>
              <AccordionSet value='Información Principal'>
                <Box>
                  <EditableData
                    type='text'
                    property='phoneNumber'
                    title='Teléfono'
                    value={selectedEvent.phoneNumber}
                  />
                  <EditableData
                    type='text'
                    property='type'
                    title='Tipo de evento'
                    value={selectedEvent.type}
                  />
                  <EditableData
                    type='text'
                    property='type'
                    title='Fecha'
                    value={new Date(selectedEvent.date).toLocaleDateString()}
                  />
                  {selectedEvent.endDate ? (
                    <EditableData
                      type='text'
                      property='type'
                      title='Fecha Finalizacion'
                      value={new Date(
                        selectedEvent.endDate
                      ).toLocaleDateString()}
                    />
                  ) : (
                    <></>
                  )}

                  <EditableData
                    type='text'
                    property='salon'
                    title='Salon'
                    value={selectedEvent.salon}
                  />
                  <EditableData
                    type='text'
                    property='eventAddress'
                    title='Dirección'
                    value={selectedEvent.eventAddress}
                  />
                  <EditableData
                    type='text'
                    property='eventCity'
                    title='Localidad'
                    value={selectedEvent.eventCity}
                  />
                  <EditableData
                    type='text'
                    property='guests'
                    title='Cantidad de invitados'
                    value={selectedEvent.guests}
                  />
                  <EditableData
                    type='text'
                    property='age'
                    title='Edad'
                    value={selectedEvent.age}
                  />
                  <EditableData
                    type='text'
                    property='averageAge'
                    title='Edad Promedio'
                    value={selectedEvent.averageAge}
                  />
                  <EditableData
                    type='text'
                    property='email'
                    title='Email'
                    value={selectedEvent.email}
                  />

                  <EditableData
                    type='text'
                    property='bandName'
                    title='Banda'
                    value={selectedEvent.bandName}
                  />

                  <EditableData
                    type='text'
                    property='guests'
                    title='Invitados'
                    value={selectedEvent.guests}
                  />
                  <EditableData
                    type='text'
                    property='manager'
                    title='Manager'
                    value={selectedEvent.manager}
                  />
                  <EditableData
                    type='text'
                    property='managerPhone'
                    title='Teléfono Manager'
                    value={selectedEvent.managerPhone}
                  />
                </Box>
              </AccordionSet>
              <AccordionSet value='Música'>
                <AccordionSet value='Prohibidos'>
                  <EditableData
                    type='chips'
                    value={selectedEvent.music.forbidden}
                    property='forbidden'
                  />
                </AccordionSet>
                <AccordionSet value='Requeridos'>
                  <EditableData
                    type='chips'
                    value={selectedEvent.music.required}
                    property='required'
                  />
                </AccordionSet>
                <AccordionSet value='Géneros'>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px'
                    }}
                  >
                    <EditableData
                      type='rate'
                      property='genres'
                      value={selectedEvent.music.genres}
                    />
                  </div>
                </AccordionSet>
                <AccordionSet value='Playlist'>
                  <SpotifyTable />
                </AccordionSet>
              </AccordionSet>
              <AccordionSet value='Más Información'>
                <EditableData
                  type='textarea'
                  property='moreData'
                  value={selectedEvent.moreData}
                />
              </AccordionSet>
              <AccordionSet value='Equipos'>
                <EquipmentTable />
              </AccordionSet>
              <AccordionSet value='Archivos'>
                <FilesHandlerComponent />
              </AccordionSet>
              {isAdmin && (
                <AccordionSet value='Historial de pagos'>
                  <EditablePayments />
                </AccordionSet>
              )}
            </>
          )}
        </>
      )}
      <Box mt='24px'>
        <Button onClick={printEventDetails}>
          {showPrintableComponent ? 'Volver' : 'Imprimir'}
        </Button>
      </Box>
    </Container>
  ) : null;
};

export default withPageAuthRequired(EventPage);
