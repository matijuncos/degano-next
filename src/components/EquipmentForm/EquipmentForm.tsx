import ContentPanel from '@/components/ContentPanel/ContentPanel';
import Sidebar from '@/components/Sidebar/Sidebar';
import { EVENT_TABS } from '@/context/config';
import { EventModel } from '@/context/types';
import { Box, Button } from '@mantine/core';
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

  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [eventEquipment, setEventEquipment] = useState<EventModel>(event);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<any[]>([]);

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
            onSelect={setSelectedEquipment}
            selectedCategory={{}}
            onEdit={() => {}}
            newEvent={true}
            eventStartDate={eventEquipment.date}
            eventEndDate={eventEquipment.endDate}
          />
        </Box>

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
            eventStartDate={eventEquipment.date}
            eventEndDate={eventEquipment.endDate}
            selectedEquipmentIds={eventEquipment.equipment.map((eq) => eq._id)}
          />
        </Box>

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
