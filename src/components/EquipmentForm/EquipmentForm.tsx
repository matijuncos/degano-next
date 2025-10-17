import ContentPanel from '@/components/ContentPanel/ContentPanel';
import Sidebar from '@/components/Sidebar/Sidebar';
import { EVENT_TABS } from '@/context/config';
import { EventModel } from '@/context/types';
import { Box, Button } from '@mantine/core';
import { useEffect, useState } from 'react';
import { NewEquipment } from '../equipmentStockTable/types';
import EquipmentList from './EquipmentList';

const EquipmentForm = ({
  event,
  onNextTab,
  onBackTab
}: {
  event: EventModel;
  onNextTab: Function;
  onBackTab: Function;
}) => {

  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [eventEquipment, setEventEquipment] = useState<EventModel>(event);
  const [total, setTotal] = useState(0);

  const next = () => {
    onNextTab(4, eventEquipment);
  };
  const back = () => {
    onBackTab(EVENT_TABS.MUSIC, eventEquipment);
  };

  useEffect(() => {
    setEventEquipment((prev) => ({ ...prev, equipmentPrice: total }));
  }, [total]);

  const handleEquipmentSelection = (equipmentSelected: NewEquipment) => {
    if (equipmentSelected.outOfService.isOut) return;
    setEventEquipment((prev) => {
      const alreadyAdded = prev.equipment.some(
        (eq) => eq._id === equipmentSelected._id
      );
      if (alreadyAdded) return prev;
      return {
        ...prev,
        equipment: [...prev.equipment, {...equipmentSelected, lastUsedStartDate: prev.date,
            lastUsedEndDate: prev.endDate}],
        equipmentPrice: total
      };
    });
  };

  return (
    <div>
      <div
        className='flex'
        style={{ height: '75vh', minHeight: '75vh', overflow: 'hidden' }}
      >
        <Box
          style={{
            width: '25%',
            borderRight: '1px solid rgba(255, 255, 255, 0.15)',
            height: '75vh',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <Sidebar
            onSelect={setSelectedEquipment}
            selectedCategory={{}}
            onEdit={() => {}}
            newEvent={true}
          />
        </Box>

        <Box
          style={{
            width: '55%',
            borderRight: '1px solid rgba(255, 255, 255, 0.15)',
            height: '75vh',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <ContentPanel
            selectedCategory={selectedEquipment}
            setDisableCreateEquipment={() => {}}
            onEdit={handleEquipmentSelection}
            onCancel={() => {}}
            newEvent={true}
          />
        </Box>

        <Box
          style={{
            width: '20%',
            height: '75vh',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto'
          }}
        >
          <EquipmentList
            equipmentList={eventEquipment.equipment}
            setEventEquipment={setEventEquipment}
            setTotal={setTotal}
          />
        </Box>
      </div>
      <div
        style={{
          display: 'flex',
          gap: '12px',
          flexDirection: 'column',
          marginTop: '16px'
        }}
      >
        <Button variant='brand' onClick={back}>
          Atrás
        </Button>
        <Button variant='brand' onClick={next}>
          Siguiente
        </Button>
      </div>
    </div>
  );
};
export default EquipmentForm;
