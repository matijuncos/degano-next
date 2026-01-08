import { useDeganoCtx } from '@/context/DeganoContext';
import React, { useEffect, useState } from 'react';
import useNotification from '@/hooks/useNotification';
import { isEqual } from 'lodash';
import ContentPanel from '@/components/ContentPanel/ContentPanel';
import Sidebar from '@/components/Sidebar/Sidebar';
import CreationPanel from '@/components/CreationPanel/CreationPanel';
import { Box, Modal } from '@mantine/core';
import EquipmentList from '../EquipmentForm/EquipmentList';
import { EventModel } from '@/context/types';
import { NewEquipment } from '../equipmentStockTable/types';
import { mutate } from 'swr';
import { usePermissions } from '@/hooks/usePermissions';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';

const EquipmentTable = () => {
  const { selectedEvent, setSelectedEvent, setLoading } = useDeganoCtx();
  const notify = useNotification();
  const { isAdmin } = usePermissions();

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [eventEquipment, setEventEquipment] = useState<EventModel>(
    selectedEvent!
  );
  const [total, setTotal] = useState(0);
  const [hasChanges, setHasChanges] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [modalOpened, setModalOpened] = useState(false);
  const [previousSelection, setPreviousSelection] = useState(null);

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

  const handleEdit = (item: any) => {
    setPreviousSelection(selectedCategory);
    setEditItem(item);
    setModalOpened(true);
  };

  const handleCancel = (wasCancelled: boolean, updatedItem?: any) => {
    setModalOpened(false);
    if (!wasCancelled && updatedItem) {
      setSelectedCategory(updatedItem); // mantiene selección del nuevo item creado
      setEditItem(null);
      // Incrementar refreshTrigger para forzar recarga del ContentPanel
      setRefreshTrigger(prev => prev + 1);
    } else {
      // Restaurar la selección anterior al cancelar
      setSelectedCategory(previousSelection);
      setEditItem(null);
    }
    setPreviousSelection(null);
  };

  const handleOpenModal = () => {
    setPreviousSelection(selectedCategory);
    setModalOpened(true);
  };

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
    <>
      <PanelGroup direction="horizontal" style={{ overflow: 'hidden' }}>
        {/* Sidebar - Categorías - 25% inicial */}
        <Panel defaultSize={25} minSize={10} maxSize={50}>
          <Box
            style={{
              borderRight: '1px solid rgba(255, 255, 255, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              height: '100%'
            }}
          >
            <Sidebar
              onSelect={setSelectedCategory}
              selectedCategory={selectedCategory}
              onEdit={handleEdit}
              onOpenModal={handleOpenModal}
              newEvent={true}
              eventStartDate={selectedEvent?.date}
              eventEndDate={selectedEvent?.endDate}
              disableEditOnSelect={true}
            />
          </Box>
        </Panel>

        {/* Divisor arrastrable */}
        <PanelResizeHandle style={{ width: '2px', background: 'rgba(255, 255, 255, 0.15)' }} />

        {/* ContentPanel - Lista de equipos - 55% inicial */}
        <Panel defaultSize={55} minSize={20} maxSize={80}>
          <Box
            style={{
              borderRight: '1px solid rgba(255, 255, 255, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              height: '100%'
            }}
          >
            <ContentPanel
              selectedCategory={selectedCategory}
              setDisableCreateEquipment={() => {}}
              onEdit={handleEquipmentSelection}
              onRemove={(equipmentId: string) => {
                setEventEquipment((prev) => ({
                  ...prev,
                  equipment: prev.equipment.filter((eq) => eq._id !== equipmentId)
                }));
              }}
              onCancel={handleCancel}
              newEvent={true}
              eventStartDate={selectedEvent?.date}
              eventEndDate={selectedEvent?.endDate}
              selectedEquipmentIds={eventEquipment.equipment.map((eq) => eq._id)}
              refreshTrigger={refreshTrigger}
            />
          </Box>
        </Panel>

        {/* Divisor arrastrable */}
        <PanelResizeHandle style={{ width: '2px', background: 'rgba(255, 255, 255, 0.15)' }} />

        {/* EquipmentList - Equipos agregados al evento - 20% inicial */}
        <Panel defaultSize={20} minSize={10} maxSize={50}>
          <Box
            style={{
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'auto',
              height: '100%'
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
        </Panel>
      </PanelGroup>

      {/* Modal para crear/editar equipos y categorías */}
      <Modal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        title={editItem ? 'Editar' : selectedCategory ? 'Crear equipamiento' : 'Crear categoría'}
        size="lg"
        centered
      >
        <CreationPanel
          selectedCategory={selectedCategory}
          editItem={editItem}
          onCancel={handleCancel}
        />
      </Modal>
    </>
  );
};

export default EquipmentTable;
