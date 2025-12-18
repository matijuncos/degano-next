import { useDeganoCtx } from '@/context/DeganoContext';
import React, { useEffect, useState } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import useNotification from '@/hooks/useNotification';
import { isEqual } from 'lodash';
import ContentPanel from '@/components/ContentPanel/ContentPanel';
import Sidebar from '@/components/Sidebar/Sidebar';
import { Box } from '@mantine/core';
import EquipmentList from '../EquipmentForm/EquipmentList';
import { EventModel } from '@/context/types';
import { NewEquipment } from '../equipmentStockTable/types';
import { mutate } from 'swr';

const EquipmentTable = () => {
  const { selectedEvent, setSelectedEvent, setLoading } = useDeganoCtx();
  const notify = useNotification();
  const { user } = useUser();
  const isAdmin = user?.role === 'admin';

  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [eventEquipment, setEventEquipment] = useState<EventModel>(
    selectedEvent!
  );
  const [total, setTotal] = useState(0);
  const [hasChanges, setHasChanges] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    setEventEquipment((prev) => ({ ...prev, equipmentPrice: total }));
  }, [total]);

  useEffect(() => {
    if (!selectedEvent) return;
    const oldEquip = selectedEvent.equipment || [];
    const newEquip = eventEquipment.equipment || [];
    const changed = !isEqual(oldEquip, newEquip);
    setHasChanges(changed);
  }, [eventEquipment, selectedEvent]);

  // Detectar cuando cambian las fechas del evento y forzar refresh
  useEffect(() => {
    if (!selectedEvent) return;
    setRefreshTrigger(prev => prev + 1);
  }, [selectedEvent?.date, selectedEvent?.endDate]);

  const handleEquipmentSelection = (equipmentSelected: NewEquipment) => {
    if (equipmentSelected.outOfService.isOut) return;
    setEventEquipment((prev) => {
      const alreadyAdded = prev.equipment.some(
        (eq) => eq._id === equipmentSelected._id
      );
      if (alreadyAdded) return prev;
      return {
        ...prev,
        equipment: [
          ...prev.equipment,
          {
            ...equipmentSelected,
            lastUsedStartDate: prev.date,
            lastUsedEndDate: prev.endDate
          }
        ],
        equipmentPrice: total
      };
    });
  };

  const updateEvent = async () => {
    setLoading(true);
    notify({ loading: true });
    try {
      const response = await fetch(`/api/updateEvent`, {
        method: 'PUT',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventEquipment)
      });
      const data = await response.json();

      // Actualizar el estado del evento
      setSelectedEvent(data.event);
      setEventEquipment(data.event);

      // Revalidar paths de Next.js y cache de SWR
      await Promise.all([
        // Revalidar paths de Next.js
        fetch('/api/revalidate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paths: ['/equipment', '/api/equipment'] })
        }),
        // Invalidar cache de SWR
        mutate('/api/equipment'),
        mutate('/api/equipment?eventStartDate=' + new Date(selectedEvent?.date || '').toISOString() + '&eventEndDate=' + new Date(selectedEvent?.endDate || '').toISOString()),
        mutate('/api/categories'),
        mutate('/api/categoryTreeData'),
        mutate('/api/treeData'),
        mutate('/api/equipmentLocation')
      ]);

      // Incrementar refresh trigger para forzar recarga de equipamiento
      setRefreshTrigger(prev => prev + 1);

      notify({ message: 'Se actualizo el evento correctamente' });
    } catch (error) {
      notify({ type: 'defaultError' });
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='flex' style={{ overflow: 'hidden' }}>
      <Box
        style={{
          width: '25%',
          borderRight: '1px solid rgba(255, 255, 255, 0.15)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <Sidebar
          onSelect={setSelectedEquipment}
          selectedCategory={{}}
          onEdit={() => {}}
          newEvent={true}
          eventStartDate={selectedEvent?.date}
          eventEndDate={selectedEvent?.endDate}
        />
      </Box>

      <Box
        style={{
          width: '55%',
          borderRight: '1px solid rgba(255, 255, 255, 0.15)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <ContentPanel
          selectedCategory={selectedEquipment}
          setDisableCreateEquipment={() => {}}
          onEdit={handleEquipmentSelection}
          onRemove={(equipmentId: string) => {
            setEventEquipment((prev) => ({
              ...prev,
              equipment: prev.equipment.filter((eq) => eq._id !== equipmentId)
            }));
          }}
          onCancel={() => {}}
          newEvent={true}
          eventStartDate={selectedEvent?.date}
          eventEndDate={selectedEvent?.endDate}
          selectedEquipmentIds={eventEquipment.equipment.map((eq) => eq._id)}
          refreshTrigger={refreshTrigger}
        />
      </Box>

      <Box
        style={{
          width: '20%',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto'
        }}
      >
        <EquipmentList
          equipmentList={eventEquipment.equipment}
          setEventEquipment={setEventEquipment}
          setTotal={setTotal}
          allowSave={hasChanges}
          onSave={updateEvent}
        />
      </Box>
    </div>
  );
};

export default EquipmentTable;
