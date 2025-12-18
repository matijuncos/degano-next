import { EVENT_TABS } from '@/context/config';
import { useEffect, useState } from 'react';
import { Band, EventModel } from '@/context/types';
import { Button } from '@mantine/core';
import BandList from '../BandManager/BandList';

const ShowForm = ({
  event,
  onNextTab,
  onBackTab,
  updateEvent
}: {
  event: EventModel;
  onNextTab: Function;
  onBackTab: Function;
  updateEvent?: Function;
}) => {
  const [eventData, setEventData] = useState<EventModel>(event);

  // Sincronizar estado local con el prop event cuando el usuario navega
  useEffect(() => {
    if (event) {
      setEventData(event);
    }
  }, [event]);

  const next = () => {
    if (updateEvent) {
      updateEvent(eventData);
    }
    onNextTab(EVENT_TABS.MUSIC, eventData);
  };

  const back = () => {
    if (updateEvent) {
      updateEvent(eventData);
    }
    onBackTab(EVENT_TABS.EVENT, eventData);
  };

  const handleBandsChange = (bands: Band[]) => {
    setEventData((prev) => ({ ...prev, bands }));
  };

  return (
    <>
      <BandList
        bands={eventData.bands || []}
        onBandsChange={handleBandsChange}
      />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          marginTop: '20px'
        }}
      >
        <Button onClick={back}>Atrás</Button>
        <Button onClick={next}>Siguiente</Button>
      </div>
    </>
  );
};

export default ShowForm;
