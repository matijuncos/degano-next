'use client';
import EditableData from '@/components/EditableData/EditableData';
import EditablePayments from '@/components/EditablePayments/EditablePayments';
import EquipmentTable from '@/components/EquipmentTable/EquipmentTable';
import Loader from '@/components/Loader/Loader';
import PrintableEvent from '@/components/PrintableEvent/PrintableEvent';
import PDFActions from '@/components/PDFActions/PDFActions';
import useLoadingCursor from '@/hooks/useLoadingCursor';
import { useDeganoCtx } from '@/context/DeganoContext';
import { Band, EventModel } from '@/context/types';
import { withPageAuthRequired } from '@auth0/nextjs-auth0/client';
import {
  Accordion,
  Box,
  Button,
  Container,
  Grid,
  Title,
  Divider,
  Flex,
  Switch,
  Tabs
} from '@mantine/core';
import { useParams } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import FilesHandlerComponent from '@/components/FilesHandlerComponent/FilesHandlerComponent';
import SpotifyTable from '@/components/SpotifyTable/SpotifyTable';
import BandList from '@/components/BandManager/BandList';
import useNotification from '@/hooks/useNotification';

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
        <Accordion.Panel
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.02)'
          }}
        >
          <>{children}</>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
};

const MainInformation = ({
  selectedEvent
}: {
  selectedEvent: EventModel | null;
}) => {
  if (!selectedEvent) return null;
  return (
    <Grid gutter='xl'>
      <Grid.Col span={5.5}>
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
            value={new Date(selectedEvent.endDate).toLocaleDateString()}
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
      </Grid.Col>
      <Grid.Col
        span='auto'
        style={{ width: '2px', minWidth: '2px', flexGrow: 0 }}
      >
        <Divider orientation='vertical' />
      </Grid.Col>
      <Grid.Col span={5.5}>
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
        {/*    <EditableData
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
        /> */}
      </Grid.Col>
    </Grid>
  );
};
const MusicInformation = ({
  selectedEvent
}: {
  selectedEvent: EventModel | null;
}) => {
  if (!selectedEvent) return null;
  return (
    <Flex direction='column' gap='16px' mt='16px'>
      <EditableData
        type='stringArray'
        title='Canciones de ingreso'
        value={selectedEvent.welcomeSongs || []}
        property='welcomeSongs'
      />
      <EditableData
        type='stringArray'
        title='Camino de rosas'
        value={selectedEvent.walkIn || []}
        property='walkIn'
      />
      <EditableData
        type='stringArray'
        title='Vals'
        value={selectedEvent.vals || []}
        property='vals'
      />
      <EditableData
        type='stringArray'
        title='Música para ambientar'
        value={selectedEvent.ambienceMusic || []}
        property='ambienceMusic'
      />
      <EditableData
        type='chips'
        value={selectedEvent.music.forbidden}
        property='forbidden'
      />
      <EditableData
        type='chips'
        value={selectedEvent.music.required}
        property='required'
      />
      <EditableData
        type='rate'
        property='genres'
        value={selectedEvent.music.genres}
      />
      <SpotifyTable />
    </Flex>
  );
};

const EquipmentInformation = () => {
  return <EquipmentTable />;
};
const TimingInformation = () => <>Building...</>;
const MoreInfoInformation = ({
  selectedEvent
}: {
  selectedEvent: EventModel | null;
}) => {
  if (!selectedEvent) return null;
  return (
    <EditableData
      type='textarea'
      property='moreData'
      value={selectedEvent.moreData}
    />
  );
};

const EventPage = () => {
  const { allEvents, setSelectedEvent, selectedEvent, loading, setFolderName } =
    useDeganoCtx();
  const { user } = useUser();

  const isAdmin = user?.role === 'admin';

  const { id } = useParams();
  const setLoadingCursor = useLoadingCursor();
  const [dateString, setDateString] = useState('');
  const [showPrintableComponent, setShowPrintableComponent] = useState(false);
  const [showTabsVersion, setShowTabsVersion] = useState(true);
  const [activeTab, setActiveTab] = useState<string | null>('main');
  const notify = useNotification();

  useEffect(() => {
    if (allEvents.length) {
      const selectedEvent: EventModel = allEvents.find(
        (event) => event._id === id
      )!;
      setSelectedEvent(selectedEvent);
      setFolderName(
        `${new Date(selectedEvent.date).toLocaleDateString('es-ES', {
          day: '2-digit',
          month: '2-digit',
          year: '2-digit'
        })} - ${selectedEvent.type} - ${selectedEvent.salon}`
      );
    }
  }, [allEvents, id]);

  useEffect(() => {
    if (selectedEvent?.date) {
      const date = new Date(selectedEvent.date).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit'
      });
      setDateString(date);
    }
  }, [selectedEvent?.date]);

  useEffect(() => {
    setLoadingCursor(false);
  }, []);

  const handleBandsChange = async (bands: Band[]) => {
    setLoadingCursor(true);
    notify({ loading: true });
    const editedEvent = {
      ...selectedEvent,
      bands
    };
    try {
      const response = await fetch('/api/updateBands', {
        method: 'PUT',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editedEvent)
      });
      const { event } = await response.json();
      setSelectedEvent(event);
      notify();
    } catch (err) {
      notify({ type: 'defaultError' });
      console.log(err);
    } finally {
      setLoadingCursor(false);
    }
  };

  const tabContent = {
    main: (
      <PDFActions
        sectionKey='main'
        eventTitle={
          dateString
            ? `${dateString} - ${selectedEvent?.type} - ${selectedEvent?.salon}`
            : undefined
        }
      >
        <MainInformation selectedEvent={selectedEvent} />
      </PDFActions>
    ),
    bands: (
      <PDFActions
        sectionKey='bands'
        eventTitle={
          dateString
            ? `${dateString} - ${selectedEvent?.type} - ${selectedEvent?.salon}`
            : undefined
        }
      >
        <BandList
          bands={selectedEvent?.bands || []}
          onBandsChange={handleBandsChange}
          editing={true}
        />
      </PDFActions>
    ),
    music: (
      <PDFActions
        sectionKey='music'
        eventTitle={
          dateString
            ? `${dateString} - ${selectedEvent?.type} - ${selectedEvent?.salon}`
            : undefined
        }
      >
        <MusicInformation selectedEvent={selectedEvent} />
      </PDFActions>
    ),
    timing: (
      <PDFActions sectionKey='timing'>
        <TimingInformation />
      </PDFActions>
    ),
    moreInfo: (
      <PDFActions
        sectionKey='moreInfo'
        eventTitle={
          dateString
            ? `${dateString} - ${selectedEvent?.type} - ${selectedEvent?.salon}`
            : undefined
        }
      >
        <MoreInfoInformation selectedEvent={selectedEvent} />
      </PDFActions>
    ),
    equipment: (
      <PDFActions
        sectionKey='equipment'
        eventTitle={
          dateString
            ? `${dateString} - ${selectedEvent?.type} - ${selectedEvent?.salon}`
            : undefined
        }
      >
        <EquipmentInformation />
      </PDFActions>
    ),
    files: <FilesHandlerComponent />,
    payments: (
      <PDFActions
        sectionKey='payments'
        eventTitle={
          dateString
            ? `${dateString} - ${selectedEvent?.type} - ${selectedEvent?.salon}`
            : undefined
        }
      >
        <EditablePayments />
      </PDFActions>
    )
  };

  const TabsVersion = () => {
    return (
      <>
        <EventTabs />
        {tabContent[activeTab as keyof typeof tabContent]}
      </>
    );
  };

  const AllAccordions = () => {
    if (!selectedEvent) return null;
    return (
      <>
        <Flex direction='column' gap='8px'>
          <AccordionSet value='Información Principal'>
            <Grid gutter='xl'>
              <Grid.Col span={5.5}>
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
                    value={new Date(selectedEvent.endDate).toLocaleDateString()}
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
              </Grid.Col>
              <Grid.Col
                span='auto'
                style={{ width: '2px', minWidth: '2px', flexGrow: 0 }}
              >
                <Divider orientation='vertical' />
              </Grid.Col>
              <Grid.Col span={5.5}>
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
                  property='guests'
                  title='Invitados'
                  value={selectedEvent.guests}
                />
              </Grid.Col>
            </Grid>
          </AccordionSet>
          <AccordionSet value='Banda en vivo'>
            <BandList
              bands={selectedEvent?.bands || []}
              onBandsChange={handleBandsChange}
              editing={true}
            />
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
        </Flex>
      </>
    );
  };

  const printEventDetails = () => {
    setShowPrintableComponent((prev) => !prev);
  };

  const EventTabs = () => {
    return (
      <Tabs
        value={activeTab}
        onChange={(value: string | null) => setActiveTab(value)}
      >
        <Tabs.List>
          <Tabs.Tab value='main'>Información Principal</Tabs.Tab>
          <Tabs.Tab value='bands'>Banda en vivo</Tabs.Tab>
          <Tabs.Tab value='music'>Música</Tabs.Tab>
          <Tabs.Tab value='timing'>Timing</Tabs.Tab>
          <Tabs.Tab value='moreInfo'>Más Información</Tabs.Tab>
          <Tabs.Tab value='equipment'>Equipos</Tabs.Tab>
          <Tabs.Tab value='files'>Archivos</Tabs.Tab>
          {isAdmin && <Tabs.Tab value='payments'>Pagos</Tabs.Tab>}
        </Tabs.List>
      </Tabs>
    );
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
            <Box>
              <Title mb='16px'>
                {`${dateString} - ${selectedEvent.type} -  ${selectedEvent.salon}`}
              </Title>
              {/*  <Flex direction='column' gap='8px'>
                <AccordionSet value='Información Principal'>
                  <Grid gutter='xl'>
                    <Grid.Col span={5.5}>
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
                        value={new Date(
                          selectedEvent.date
                        ).toLocaleDateString()}
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
                    </Grid.Col>
                    <Grid.Col
                      span='auto'
                      style={{ width: '2px', minWidth: '2px', flexGrow: 0 }}
                    >
                      <Divider orientation='vertical' />
                    </Grid.Col>
                    <Grid.Col span={5.5}>
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
                        property='guests'
                        title='Invitados'
                        value={selectedEvent.guests}
                      />
                    </Grid.Col>
                  </Grid>
                </AccordionSet>
                <AccordionSet value='Banda en vivo'>
                  <BandList
                    bands={selectedEvent?.bands || []}
                    onBandsChange={handleBandsChange}
                    editing={true}
                  />
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
              </Flex> */}
              {showTabsVersion ? <TabsVersion /> : <AllAccordions />}
            </Box>
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
