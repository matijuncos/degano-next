'use client';
import { useDeganoCtx } from '@/context/DeganoContext';
import { EventModel } from '@/context/types';
import { Accordion, Container, Title } from '@mantine/core';
import { IconStar, IconStarFilled, IconStarOff } from '@tabler/icons-react';
import { useParams, useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';

const EventPage = () => {
  const { allEvents } = useDeganoCtx();
  const { id } = useParams();
  const router = useRouter();
  const [dateString, setDateString] = useState('');
  const selectedEvent: EventModel = allEvents.find(
    (event) => event._id === id
  )!;
  useEffect(() => {
    const date = new Date(selectedEvent?.date).toLocaleString('en-US', {
      timeZone: 'UTC'
    });
    setDateString(date);
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
        <p style={{ marginBottom: '12px' }}>
          <strong>Tipo de evento: </strong>
          {selectedEvent.type}
        </p>
        <p style={{ marginBottom: '12px' }}>
          <strong>Salon: </strong>
          {selectedEvent.salon}
        </p>
        <p style={{ marginBottom: '12px' }}>
          <strong>Direccion: </strong>
          {selectedEvent.eventAddress}
        </p>
        <p style={{ marginBottom: '12px' }}>
          <strong>Localidad:</strong> {selectedEvent.eventCity}
        </p>
        <p style={{ marginBottom: '12px' }}>
          <strong>Cantidad de invitados: </strong>
          {selectedEvent.guests}
        </p>
      </div>
      <AccordionSet value='Música'>
        <AccordionSet value='Géneros'>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}
          >
            {selectedEvent.music.genres.map((genre, idx) => {
              return (
                <div
                  key={`i${idx}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 0',
                    borderBottom: 'solid 1px grey'
                  }}
                >
                  <div style={{ minWidth: '80px' }}>
                    <p
                      style={{
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {genre.genre}
                    </p>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    {Array.from({ length: genre.value }, (_, idx) => (
                      <div
                        key={`filled-${genre.genre}-${idx}`}
                        style={{ display: 'flex' }}
                      >
                        <IconStarFilled color='gold' />
                      </div>
                    ))}
                    {Array.from({ length: 5 - genre.value }, (_, idx) => (
                      <div key={genre.genre + idx} style={{ display: 'flex' }}>
                        <IconStar color='gold' />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </AccordionSet>
        <AccordionSet value='Prohibidos'>
          {selectedEvent.music?.forbidden?.map((item, index) => {
            return <p key={item + index}>{item}</p>;
          })}
        </AccordionSet>
        <AccordionSet value='Requeridos'>
          {selectedEvent.music?.required?.map((item, index) => {
            return <p key={item + index}>{item}</p>;
          })}
        </AccordionSet>
      </AccordionSet>
      <AccordionSet value='Más Información'>
        <p>{selectedEvent.moreData}</p>
      </AccordionSet>
    </Container>
  ) : (
    redirect()
  );
};
export default EventPage;
