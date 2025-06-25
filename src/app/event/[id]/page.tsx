'use client';
import EditableData from '@/components/EditableData/EditableData';
import EditablePayments from '@/components/EditablePayments/EditablePayments';
import EquipmentTable from '@/components/EquipmentTable/EquipmentTable';
import Loader from '@/components/Loader/Loader';
import PrintableEvent from '@/components/PrintableEvent/PrintableEvent';
import PDFActions from '@/components/PDFActions/PDFActions';
import useLoadingCursor from '@/hooks/useLoadingCursor';
import { useDeganoCtx } from '@/context/DeganoContext';
import { EventModel } from '@/context/types';
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

const MainInformation = ({ selectedEvent }: { selectedEvent: EventModel }) => {
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
      </Grid.Col>
    </Grid>
  );
};
const ClientInformation = ({
  selectedEvent
}: {
  selectedEvent: EventModel;
}) => {
  return (
    <Flex direction='column' gap='16px' mt='16px'>
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
const TimingInformation = () => <>Timing</>;
const MoreInfoInformation = ({
  selectedEvent
}: {
  selectedEvent: EventModel;
}) => {
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
  const [activeTab, setActiveTab] = useState('main');

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

  const printEventDetails = () => {
    setShowPrintableComponent((prev) => !prev);
  };

  const AllAccordions = () => {
    if (!selectedEvent) return null;
    return (
      <Flex direction='column' gap='8px'>
        <AccordionSet value='Información Principal'>
          <PDFActions
            sectionKey='main'
            eventTitle={`${dateString} - ${selectedEvent.type} - ${selectedEvent.salon}`}
          >
            <MainInformation selectedEvent={selectedEvent} />
          </PDFActions>
        </AccordionSet>
        <AccordionSet value='Música'>
          <PDFActions
            sectionKey='client'
            eventTitle={`${dateString} - ${selectedEvent.type} - ${selectedEvent.salon}`}
          >
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
          </PDFActions>
        </AccordionSet>
        <AccordionSet value='Más Información'>
          <PDFActions
            sectionKey='moreInfo'
            eventTitle={`${dateString} - ${selectedEvent.type} - ${selectedEvent.salon}`}
          >
            <EditableData
              type='textarea'
              property='moreData'
              value={selectedEvent.moreData}
            />
          </PDFActions>
        </AccordionSet>
        <AccordionSet value='Equipos'>
          <PDFActions
            sectionKey='equipment'
            eventTitle={`${dateString} - ${selectedEvent.type} - ${selectedEvent.salon}`}
          >
            <EquipmentTable />
          </PDFActions>
        </AccordionSet>
        <AccordionSet value='Archivos'>
          <PDFActions
            sectionKey='files'
            eventTitle={`${dateString} - ${selectedEvent.type} - ${selectedEvent.salon}`}
          >
            <FilesHandlerComponent />
          </PDFActions>
        </AccordionSet>
        {isAdmin && (
          <AccordionSet value='Historial de pagos'>
            <PDFActions
              sectionKey='payments'
              eventTitle={`${dateString} - ${selectedEvent.type} - ${selectedEvent.salon}`}
            >
              <EditablePayments />
            </PDFActions>
          </AccordionSet>
        )}
      </Flex>
    );
  };

  const tabContent = {
    main: selectedEvent ? (
      <PDFActions
        sectionKey='main'
        eventTitle={`${dateString} - ${selectedEvent.type} - ${selectedEvent.salon}`}
      >
        <MainInformation selectedEvent={selectedEvent} />
      </PDFActions>
    ) : null,
    client: selectedEvent ? (
      <PDFActions
        sectionKey='client'
        eventTitle={`${dateString} - ${selectedEvent.type} - ${selectedEvent.salon}`}
      >
        <ClientInformation selectedEvent={selectedEvent} />
      </PDFActions>
    ) : null,
    equipment: selectedEvent ? (
      <PDFActions
        sectionKey='equipment'
        eventTitle={`${dateString} - ${selectedEvent.type} - ${selectedEvent.salon}`}
      >
        <EquipmentInformation />
      </PDFActions>
    ) : null,
    timing: (
      <PDFActions
        sectionKey='timing'
        eventTitle={`${dateString} - ${selectedEvent?.type} - ${selectedEvent?.salon}`}
      >
        <TimingInformation />
      </PDFActions>
    ),
    moreInfo: selectedEvent ? (
      <PDFActions
        sectionKey='moreInfo'
        eventTitle={`${dateString} - ${selectedEvent.type} - ${selectedEvent.salon}`}
      >
        <MoreInfoInformation selectedEvent={selectedEvent} />
      </PDFActions>
    ) : null,
    files: <FilesHandlerComponent />,
    payments: (
      <PDFActions
        sectionKey='payments'
        eventTitle={`${dateString} - ${selectedEvent?.type} - ${selectedEvent?.salon}`}
      >
        <EditablePayments />
      </PDFActions>
    )
  };

  const ShowTabsVarsion = () => {
    return (
      <>
        <Tabs
          value={activeTab}
          onChange={(value) => setActiveTab(value || 'all')}
        >
          <Tabs.List>
            <Tabs.Tab value='main'>Información Principal</Tabs.Tab>
            <Tabs.Tab value='client'>Música</Tabs.Tab>
            <Tabs.Tab value='equipment'>Equipos</Tabs.Tab>
            <Tabs.Tab value='timing'>Timing</Tabs.Tab>
            <Tabs.Tab value='moreInfo'>Más Información</Tabs.Tab>
            <Tabs.Tab value='files'>Archivos</Tabs.Tab>
            {isAdmin && (
              <Tabs.Tab value='payments'>Historial de pagos</Tabs.Tab>
            )}
          </Tabs.List>
        </Tabs>
        {tabContent[activeTab as keyof typeof tabContent]}
      </>
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
              <Flex justify='space-between' align='center'>
                <Title mb='16px'>
                  {`${dateString} - ${selectedEvent.type} -  ${selectedEvent.salon}`}
                </Title>
                <Switch
                  checked={showTabsVersion}
                  onChange={() => setShowTabsVersion(!showTabsVersion)}
                />
              </Flex>
              {showTabsVersion ? <ShowTabsVarsion /> : <AllAccordions />}
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
