import { useDeganoCtx } from '@/context/DeganoContext';
import React, { useEffect, useState } from 'react';
import useNotification from '@/hooks/useNotification';
import { isEqual } from 'lodash';
import ContentPanel from '@/components/ContentPanel/ContentPanel';
import Sidebar from '@/components/Sidebar/Sidebar';
import CreationPanel from '@/components/CreationPanel/CreationPanel';
import ApplySetModal from '@/components/ApplySetModal/ApplySetModal';
import { Box, Modal, Tabs, Button, Group, Alert } from '@mantine/core';
import EquipmentList from '../EquipmentForm/EquipmentList';
import { EventModel } from '@/context/types';
import { NewEquipment } from '../equipmentStockTable/types';
import { mutate } from 'swr';
import { usePermissions } from '@/hooks/usePermissions';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useResponsive } from '@/hooks/useResponsive';
import { IconLayersLinked, IconAlertTriangle } from '@tabler/icons-react';
import { findMainCategorySync } from '@/utils/categoryUtils';
import { useEquipmentStatusMap } from '@/hooks/useEquipmentStatusMap';
import { isEquipmentUnavailable } from '@/utils/equipmentAvailability';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const EquipmentTable = () => {
  const { selectedEvent, setSelectedEvent, setLoading, updateEventInList } = useDeganoCtx();
  const notify = useNotification();
  const { isAdmin } = usePermissions();
  const { isMobile, isTablet } = useResponsive();
  const { data: categories = [] } = useSWR<any[]>('/api/categories', fetcher);
  const statusMap = useEquipmentStatusMap();

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [eventEquipment, setEventEquipment] = useState<EventModel>(
    selectedEvent!
  );
  const [total, setTotal] = useState(0);
  const [hasChanges, setHasChanges] = useState(false);
  const [applySetModalOpen, setApplySetModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [modalOpened, setModalOpened] = useState(false);
  const [previousSelection, setPreviousSelection] = useState(null);
  const [mobileView, setMobileView] = useState<'categories' | 'equipment' | 'selected'>('categories');

  useEffect(() => {
    setEventEquipment((prev) => ({ ...prev, equipmentPrice: total }));
  }, [total]);

  useEffect(() => {
    if (!selectedEvent) return;
    const equipChanged = !isEqual(
      selectedEvent.equipment || [],
      eventEquipment.equipment || []
    );
    const extraChanged = !isEqual(
      selectedEvent.extraEquipment || [],
      eventEquipment.extraEquipment || []
    );
    setHasChanges(equipChanged || extraChanged);
  }, [eventEquipment.equipment, eventEquipment.extraEquipment, selectedEvent?.equipment, selectedEvent?.extraEquipment]);

  // Detectar cuando cambian las fechas del evento y forzar refresh
  useEffect(() => {
    if (!selectedEvent) return;
    setRefreshTrigger(prev => prev + 1);
  }, [selectedEvent?.date, selectedEvent?.endDate]);

  // Equipos del evento que HOY están dados de baja / en reparación (estado vivo).
  // Se recalcula solo: si el equipo vuelve a estar disponible, desaparece del aviso.
  const unavailableInEvent = (eventEquipment.equipment || []).filter((eq) =>
    isEquipmentUnavailable(statusMap.get(String(eq._id)))
  );

  const unavailableBanner = unavailableInEvent.length > 0 && (
    <Alert
      color='red'
      variant='light'
      icon={<IconAlertTriangle size={18} />}
      title={`${unavailableInEvent.length} equipo(s) de este evento no están disponibles`}
      mb='sm'
      py='8px'
    >
      {unavailableInEvent.map((eq) => (
        <span key={eq._id} style={{ display: 'block' }}>
          • {eq.name}{eq.code ? ` (${eq.code})` : ''}
        </span>
      ))}
    </Alert>
  );

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
          let mainCategoryId = item.mainCategoryId || '';
          let mainCategoryName = item.mainCategoryName || 'Sin categoría';
          if (!item.mainCategoryName && item.categoryId && categories.length > 0) {
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

  // Agregar N unidades "negativas" (a tercerizar) para un nombre de equipo.
  // Van a un array separado (extraEquipment): NO tocan el inventario real ni
  // los scheduledUses, así que no afectan la disponibilidad.
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

  // Guardar orden de categorías en background (sin loading, sin notificación)
  const saveCategoryOrder = async (newOrder: string[]) => {
    if (!selectedEvent?._id) return;
    // Actualizar selectedEvent en contexto para que el print refleje el nuevo orden
    setSelectedEvent((prev: any) => prev ? { ...prev, equipmentCategoryOrder: newOrder } : prev);
    try {
      await fetch('/api/updateEvent', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: selectedEvent._id,
          equipmentCategoryOrder: newOrder
        })
      });
    } catch (error) {
      console.error('[saveCategoryOrder] Error:', error);
    }
  };

  // Guardar orden de items (dentro de categorías) en background
  const saveItemOrder = async (newItemOrder: { [categoryName: string]: string[] }) => {
    if (!selectedEvent?._id) return;
    setSelectedEvent((prev: any) => prev ? { ...prev, equipmentItemOrder: newItemOrder } : prev);
    try {
      await fetch('/api/updateEvent', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: selectedEvent._id,
          equipmentItemOrder: newItemOrder
        })
      });
    } catch (error) {
      console.error('[saveItemOrder] Error:', error);
    }
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

      if (!response.ok) {
        throw new Error(data.error || 'Error al actualizar el evento');
      }

      // Actualizar el estado del evento
      const updatedEvent = data.event || eventEquipment;
      setSelectedEvent(updatedEvent);
      setEventEquipment(updatedEvent);
      updateEventInList(updatedEvent);

      notify({ message: 'Se actualizo el evento correctamente' });

      // Revalidar caches en background (no bloquea ni muestra error si falla)
      Promise.all([
        fetch('/api/revalidate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paths: ['/equipment', '/api/equipment'] })
        }),
        mutate('/api/equipment'),
        mutate('/api/equipment?eventStartDate=' + new Date(selectedEvent?.date || '').toISOString() + '&eventEndDate=' + new Date(selectedEvent?.endDate || '').toISOString()),
        mutate('/api/categories'),
        mutate('/api/categoryTreeData'),
        mutate('/api/treeData'),
        mutate('/api/equipmentLocation')
      ]).catch(() => {});

      // Incrementar refresh trigger para forzar recarga de equipamiento
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      notify({ type: 'defaultError' });
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  // Vista móvil/tablet: Tabs
  if (isMobile || isTablet) {
    return (
      <>
        {unavailableInEvent.length > 0 && <Box px='md' pt='md'>{unavailableBanner}</Box>}
        {hasChanges && (
          <Alert
            color='yellow'
            variant='light'
            icon={<IconAlertTriangle size={18} />}
            m='md'
            mb='0'
            py='6px'
          >
            Tenés cambios sin guardar.
          </Alert>
        )}
        <Box p="md">
          <Tabs value={mobileView} onChange={(value) => setMobileView(value as any)}>
            <Tabs.List>
              <Tabs.Tab value="categories">Categorías</Tabs.Tab>
              <Tabs.Tab value="equipment">Equipos</Tabs.Tab>
              <Tabs.Tab value="selected">Seleccionados</Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="categories" pt="md">
              <Sidebar
                onSelect={setSelectedCategory}
                selectedCategory={selectedCategory}
                onEdit={handleEdit}
                onOpenModal={handleOpenModal}
                newEvent={true}
                eventStartDate={selectedEvent?.date}
                eventEndDate={selectedEvent?.endDate}
                disableEditOnSelect={true}
                onApplySet={() => setApplySetModalOpen(true)}
              />
            </Tabs.Panel>

            <Tabs.Panel value="equipment" pt="md">
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
                onRemoveMultiple={(ids: string[]) => {
                  setEventEquipment((prev) => ({
                    ...prev,
                    equipment: prev.equipment.filter((eq) => !ids.includes(eq._id))
                  }));
                }}
                onCancel={handleCancel}
                newEvent={true}
                eventStartDate={selectedEvent?.date}
                eventEndDate={selectedEvent?.endDate}
                selectedEquipmentIds={eventEquipment.equipment.map((eq) => eq._id)}
                refreshTrigger={refreshTrigger}
                onAddNegative={handleAddNegative}
                onRemoveNegative={handleRemoveNegativeByName}
                extraEquipment={eventEquipment.extraEquipment}
              />
            </Tabs.Panel>

            <Tabs.Panel value="selected" pt="md">
              <EquipmentList
                equipmentList={eventEquipment.equipment}
                setEventEquipment={setEventEquipment}
                setTotal={setTotal}
                equipmentCategoryOrder={eventEquipment.equipmentCategoryOrder}
                extraEquipment={eventEquipment.extraEquipment}
                equipmentItemOrder={eventEquipment.equipmentItemOrder}
                onReorderItems={saveItemOrder}
                allowSave={hasChanges}
                onSave={updateEvent}
              />
            </Tabs.Panel>
          </Tabs>
        </Box>

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
  }

  // Vista desktop: 3 columnas resizables
  return (
    <>
      {unavailableBanner}
      {hasChanges && (
        <Alert
          color='yellow'
          variant='light'
          icon={<IconAlertTriangle size={18} />}
          mb='sm'
          py='6px'
        >
          Tenés cambios sin guardar.
        </Alert>
      )}
      <PanelGroup direction="horizontal" style={{ overflow: 'visible' }}>
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
              onApplySet={() => setApplySetModalOpen(true)}
            />
          </Box>
        </Panel>

        {/* Divisor arrastrable */}
        <PanelResizeHandle style={{ width: '2px', background: 'rgba(255, 255, 255, 0.15)' }} />

        {/* ContentPanel - Lista de equipos - 55% inicial */}
        {/* overflow:visible sobrescribe el overflow:hidden que el Panel setea
            por defecto, para que el sticky del contenido no quede atrapado. */}
        <Panel defaultSize={55} minSize={20} maxSize={80} style={{ overflow: 'visible' }}>
          {/* Box sticky de alto-contenido (SIN height:100%). Su bloque
              contenedor es el Panel, que se estira a la columna más larga
              (categorías), así el sticky tiene recorrido y acompaña el
              scroll de la página. */}
          <Box
            style={{
              borderRight: '1px solid rgba(255, 255, 255, 0.15)',
              position: 'sticky',
              top: 8
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
              onRemoveMultiple={(ids: string[]) => {
                setEventEquipment((prev) => ({
                  ...prev,
                  equipment: prev.equipment.filter((eq) => !ids.includes(eq._id))
                }));
              }}
              onCancel={handleCancel}
              newEvent={true}
              eventStartDate={selectedEvent?.date}
              eventEndDate={selectedEvent?.endDate}
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
            style={{
              display: 'flex',
              flexDirection: 'column',
              height: '100%'
            }}
          >
            <EquipmentList
              equipmentList={eventEquipment.equipment}
              setEventEquipment={setEventEquipment}
              setTotal={setTotal}
              equipmentCategoryOrder={eventEquipment.equipmentCategoryOrder}
              extraEquipment={eventEquipment.extraEquipment}
              equipmentItemOrder={eventEquipment.equipmentItemOrder}
              onReorderItems={saveItemOrder}
              allowSave={hasChanges}
              onSave={updateEvent}
              onReorder={saveCategoryOrder}
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

      <ApplySetModal
        opened={applySetModalOpen}
        onClose={() => setApplySetModalOpen(false)}
        eventStartDate={selectedEvent?.date}
        eventEndDate={selectedEvent?.endDate}
        selectedEquipmentIds={eventEquipment.equipment.map((eq) => eq._id)}
        onApply={(items) => handleEquipmentSelection(items)}
      />
    </>
  );
};

export default EquipmentTable;
