import ContentPanel from '@/components/ContentPanel/ContentPanel';
import Sidebar from '@/components/Sidebar/Sidebar';
import CreationPanel from '@/components/CreationPanel/CreationPanel';
import ApplySetModal from '@/components/ApplySetModal/ApplySetModal';
import { EVENT_TABS } from '@/context/config';
import { EventModel } from '@/context/types';
import { Box, Button, Modal, Group } from '@mantine/core';
import { useEffect, useState } from 'react';
import { NewEquipment } from '../equipmentStockTable/types';
import EquipmentList from './EquipmentList';
import { findMainCategorySync } from '@/utils/categoryUtils';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { IconLayersLinked } from '@tabler/icons-react';

const EquipmentForm = ({
  event,
  onNextTab,
  onBackTab,
  updateEvent,
  onFormDataChange
}: {
  event: EventModel;
  onNextTab: Function;
  onBackTab: Function;
  updateEvent?: Function;
  onFormDataChange?: (data: EventModel) => void;
}) => {

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [eventEquipment, setEventEquipment] = useState<EventModel>(event);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<any[]>([]);
  const [modalOpened, setModalOpened] = useState(false);
  const [previousSelection, setPreviousSelection] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [applySetModalOpen, setApplySetModalOpen] = useState(false);

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

  // Notificar al padre cuando cambian los datos (para persistir al cambiar de tab)
  useEffect(() => {
    if (onFormDataChange) {
      onFormDataChange(eventEquipment);
    }
  }, [eventEquipment, onFormDataChange]);

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

  const handleEquipmentSelection = (equipmentSelected: NewEquipment | NewEquipment[]) => {
    const itemsToAdd = Array.isArray(equipmentSelected) ? equipmentSelected : [equipmentSelected];
    const validItems = itemsToAdd.filter((item) => !item.outOfService?.isOut);
    if (validItems.length === 0) return;

    setEventEquipment((prev) => {
      const newItems = validItems
        .filter((item) => !prev.equipment.some((eq) => eq._id === item._id))
        .map((item) => {
          let mainCategoryId = '';
          let mainCategoryName = 'Sin categoría';
          if (item.categoryId && categories.length > 0) {
            const mainCategory = findMainCategorySync(item.categoryId, categories);
            if (mainCategory) {
              mainCategoryId = mainCategory.id;
              mainCategoryName = mainCategory.name;
            }
          }
          return {
            ...item,
            lastUsedStartDate: prev.date,
            lastUsedEndDate: prev.endDate,
            mainCategoryId,
            mainCategoryName
          };
        });

      if (newItems.length === 0) return prev;

      return {
        ...prev,
        equipment: [...prev.equipment, ...newItems],
        equipmentPrice: total
      };
    });
  };

  // Agregar N "negativos" (a tercerizar) para un nombre. Array separado: no toca
  // el inventario real ni la disponibilidad.
  const handleAddNegative = (name: string, categoryId: string, qty: number) => {
    if (!name || !qty || qty < 1) return;
    let mainCategoryName = 'Sin categoría';
    if (categoryId && categories.length > 0) {
      const mc = findMainCategorySync(categoryId, categories);
      if (mc) mainCategoryName = mc.name;
    }
    setEventEquipment((prev) => {
      const existing = prev.extraEquipment || [];
      const idx = existing.findIndex(
        (e) => e.name === name && (e.mainCategoryName || 'Sin categoría') === mainCategoryName
      );
      const next =
        idx >= 0
          ? existing.map((e, i) => (i === idx ? { ...e, quantity: e.quantity + qty } : e))
          : [...existing, { name, categoryId, mainCategoryName, quantity: qty }];
      return { ...prev, extraEquipment: next };
    });
  };

  // Quitar todos los "a tercerizar" cargados para un nombre.
  const handleRemoveNegativeByName = (name: string) => {
    setEventEquipment((prev) => ({
      ...prev,
      extraEquipment: (prev.extraEquipment || []).filter((e) => e.name !== name)
    }));
  };

  return (
    <div>
      <style jsx>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      <PanelGroup direction="horizontal" style={{ height: '75vh', minHeight: '75vh' }}>
        {/* Sidebar - Categorías - 25% inicial */}
        <Panel defaultSize={25} minSize={10} maxSize={50}>
          <Box
            className='hide-scrollbar'
            style={{
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
              onApplySet={() => setApplySetModalOpen(true)}
            />
          </Box>
        </Panel>

        {/* Divisor arrastrable */}
        <PanelResizeHandle style={{ width: '2px', background: 'rgba(255, 255, 255, 0.15)' }} />

        {/* ContentPanel - Lista de equipos - 55% inicial */}
        <Panel defaultSize={55} minSize={20} maxSize={80}>
          <Box
            className='hide-scrollbar'
            style={{
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
              onRemoveMultiple={(ids: string[]) => {
                setEventEquipment((prev) => ({
                  ...prev,
                  equipment: prev.equipment.filter((eq) => !ids.includes(eq._id))
                }));
              }}
              onCancel={handleCancel}
              newEvent={true}
              eventStartDate={eventEquipment.date}
              eventEndDate={eventEquipment.endDate}
              selectedEquipmentIds={eventEquipment.equipment.map((eq) => eq._id)}
              refreshTrigger={refreshTrigger}
              onAddNegative={handleAddNegative}
              onRemoveNegative={handleRemoveNegativeByName}
              extraEquipment={eventEquipment.extraEquipment}
            />
          </Box>
        </Panel>

        {/* Divisor arrastrable */}
        <PanelResizeHandle style={{ width: '2px', background: 'rgba(255, 255, 255, 0.15)' }} />

        {/* EquipmentList - Equipos agregados al evento - 20% inicial */}
        <Panel defaultSize={20} minSize={10} maxSize={50}>
          <Box
            className='hide-scrollbar'
            style={{
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
              equipmentCategoryOrder={eventEquipment.equipmentCategoryOrder}
              extraEquipment={eventEquipment.extraEquipment}
              equipmentItemOrder={eventEquipment.equipmentItemOrder}
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

      <ApplySetModal
        opened={applySetModalOpen}
        onClose={() => setApplySetModalOpen(false)}
        eventStartDate={eventEquipment.date}
        eventEndDate={eventEquipment.endDate}
        selectedEquipmentIds={eventEquipment.equipment.map((eq) => eq._id)}
        onApply={(items) => handleEquipmentSelection(items)}
      />
    </div>
  );
};
export default EquipmentForm;
