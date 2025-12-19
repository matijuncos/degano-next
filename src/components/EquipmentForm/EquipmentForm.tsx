import ContentPanel from '@/components/ContentPanel/ContentPanel';
import Sidebar from '@/components/Sidebar/Sidebar';
import CreationPanel from '@/components/CreationPanel/CreationPanel';
import { EVENT_TABS } from '@/context/config';
import { EventModel } from '@/context/types';
import { Box, Button, Modal } from '@mantine/core';
import { useEffect, useState } from 'react';
import { NewEquipment } from '../equipmentStockTable/types';
import EquipmentList from './EquipmentList';
import { findMainCategorySync } from '@/utils/categoryUtils';

const EquipmentForm = ({
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

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [eventEquipment, setEventEquipment] = useState<EventModel>(event);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<any[]>([]);
  const [modalOpened, setModalOpened] = useState(false);
  const [previousSelection, setPreviousSelection] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Cargar categorías al montar el componente
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/categories');
        const data = await response.json();
        setCategories(data);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    fetchCategories();
  }, []);

  // Sincronizar estado local con el prop event cuando el usuario navega
  useEffect(() => {
    if (event) {
      setEventEquipment(event);
    }
  }, [event]);

  // Estilos para ocultar scrollbar pero mantener funcionalidad
  const scrollContainerStyle = {
    scrollbarWidth: 'none' as const,
    msOverflowStyle: 'none' as const,
  };

  const next = () => {
    if (updateEvent) {
      updateEvent(eventEquipment);
    }
    onNextTab(EVENT_TABS.STAFF, eventEquipment);
  };
  const back = () => {
    if (updateEvent) {
      updateEvent(eventEquipment);
    }
    onBackTab(EVENT_TABS.MORE_INFO, eventEquipment);
  };

  useEffect(() => {
    setEventEquipment((prev) => ({ ...prev, equipmentPrice: total }));
  }, [total]);

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

      // Calcular mainCategoryId y mainCategoryName
      let mainCategoryId = '';
      let mainCategoryName = 'Sin categoría';

      if (equipmentSelected.categoryId && categories.length > 0) {
        const mainCategory = findMainCategorySync(
          equipmentSelected.categoryId,
          categories
        );
        if (mainCategory) {
          mainCategoryId = mainCategory.id;
          mainCategoryName = mainCategory.name;
        }
      }

      return {
        ...prev,
        equipment: [
          ...prev.equipment,
          {
            ...equipmentSelected,
            lastUsedStartDate: prev.date,
            lastUsedEndDate: prev.endDate,
            mainCategoryId,
            mainCategoryName
          }
        ],
        equipmentPrice: total
      };
    });
  };

  return (
    <div>
      <style jsx>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      <div
        className='flex'
        style={{ height: '75vh', minHeight: '75vh' }}
      >
        {/* Sidebar - Categorías */}
        <Box
          className='hide-scrollbar'
          style={{
            width: '25%',
            borderRight: '1px solid rgba(255, 255, 255, 0.15)',
            height: '75vh',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            ...scrollContainerStyle
          }}
        >
          <Sidebar
            onSelect={setSelectedCategory}
            selectedCategory={selectedCategory}
            onEdit={handleEdit}
            onOpenModal={handleOpenModal}
            newEvent={true}
            eventStartDate={eventEquipment.date}
            eventEndDate={eventEquipment.endDate}
            disableEditOnSelect={true}
          />
        </Box>

        {/* ContentPanel - Lista de equipos */}
        <Box
          className='hide-scrollbar'
          style={{
            width: '55%',
            borderRight: '1px solid rgba(255, 255, 255, 0.15)',
            height: '75vh',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            ...scrollContainerStyle
          }}
        >
          <ContentPanel
            selectedCategory={selectedCategory}
            setDisableCreateEquipment={() => {}}
            onSelect={setSelectedCategory}
            onEdit={handleEquipmentSelection}
            onRemove={(equipmentId: string) => {
              setEventEquipment((prev) => ({
                ...prev,
                equipment: prev.equipment.filter((eq) => eq._id !== equipmentId)
              }));
            }}
            onCancel={handleCancel}
            newEvent={true}
            eventStartDate={eventEquipment.date}
            eventEndDate={eventEquipment.endDate}
            selectedEquipmentIds={eventEquipment.equipment.map((eq) => eq._id)}
            refreshTrigger={refreshTrigger}
          />
        </Box>

        {/* EquipmentList - Equipos agregados al evento */}
        <Box
          className='hide-scrollbar'
          style={{
            width: '20%',
            height: '75vh',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            ...scrollContainerStyle
          }}
        >
          <EquipmentList
            equipmentList={eventEquipment.equipment}
            setEventEquipment={setEventEquipment}
            setTotal={setTotal}
          />
        </Box>
      </div>

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
