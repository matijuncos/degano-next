import { useState, useEffect } from 'react';
import { EventModel } from '@/context/types';
import { Button, Textarea } from '@mantine/core';
import { EVENT_TABS } from '@/context/config';

const MoreInfoForm = ({
  event,
  onNextTab,
  onBackTab
}: {
  event: EventModel;
  onNextTab: Function;
  onBackTab: Function;
}) => {
  const [eventData, setEventData] = useState<EventModel>(event);

  useEffect(() => {
    if (event) {
      setEventData(event);
    }
  }, [event]);

  const next = () => {
    onNextTab(EVENT_TABS.EQUIPMENT, eventData);
  };

  const back = () => {
    onBackTab(EVENT_TABS.TIMING, eventData);
  };

  return (
    <>
      <Textarea
        placeholder="Información adicional del evento"
        value={eventData.moreData || ''}
        onChange={(e) => setEventData((prev) => ({ ...prev, moreData: e.target.value }))}
        minRows={10}
        autosize
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '20px' }}>
        <Button onClick={back}>Atrás</Button>
        <Button onClick={next}>Siguiente</Button>
      </div>
    </>
  );
};

export default MoreInfoForm;
