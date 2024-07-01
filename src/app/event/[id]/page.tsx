'use client';
import EditableData from '@/components/EditableData/EditableData';
import { useDeganoCtx } from '@/context/DeganoContext';
import { EventModel } from '@/context/types';
import {
  Accordion,
  Container,
  Table,
  TableTbody,
  TableTd,
  TableTh,
  TableThead,
  TableTr,
  Title
} from '@mantine/core';
import { IconStar, IconStarFilled } from '@tabler/icons-react';
import { useParams, useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';

const EventPage = () => {
  const { allEvents, setSelectedEvent, selectedEvent } = useDeganoCtx();
  const { id } = useParams();
  const router = useRouter();
  const [dateString, setDateString] = useState('');

  useEffect(() => {
    if (allEvents.length) {
      const selectedEvent: EventModel = allEvents.find(
        (event) => event._id === id
      )!;
      setSelectedEvent(selectedEvent);
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

  const redirect = () => {
    router.push('/home');
  };
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

  return selectedEvent ? (
    <Container size='xl'>
      <Title mb='16px'>{selectedEvent.fullName + ' - ' + dateString}</Title>
      <div>
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
      </div>
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
      </AccordionSet>
      <AccordionSet value='Más Información'>
        <p>{selectedEvent.moreData}</p>
      </AccordionSet>
      <AccordionSet value='Equipos'>
        <Table>
          <TableThead>
            <TableTh>Equipo</TableTh>
            <TableTh>Cantidad</TableTh>
          </TableThead>
          <TableTbody>
            {selectedEvent.equipment.map((eq, i) => {
              return (
                <TableTr key={i}>
                  <TableTd>{eq.name}</TableTd>
                  <TableTd>{eq.quantity}</TableTd>
                </TableTr>
              );
            })}
          </TableTbody>
        </Table>
      </AccordionSet>
    </Container>
  ) : null;
};
export default EventPage;
