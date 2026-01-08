// EquipmentPage.tsx
'use client';
import { useState } from 'react';
import Sidebar from '@/components/Sidebar/Sidebar';
import ContentPanel from '@/components/ContentPanel/ContentPanel';
import CreationPanel from '@/components/CreationPanel/CreationPanel';
import { Box, Tabs, Flex } from '@mantine/core';
import { useResponsive } from '@/hooks/useResponsive';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';

export default function EquipmentPage() {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [disableCreateEquipment, setDisableCreateEquipment] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [mobileView, setMobileView] = useState<'sidebar' | 'content' | 'creation'>('sidebar');

  const { isMobile, isTablet } = useResponsive();

  const handleEdit = (item: any) => {
    setEditItem(item);
  };

  const handleCancel = (wasCancelled: boolean, updatedItem?: any) => {
    // Siempre limpiar el editItem
    setEditItem(null);

    if (!wasCancelled && updatedItem) {
      // Incrementar refreshTrigger para forzar actualización
      setRefreshTrigger(prev => prev + 1);

      // Si es una eliminación, deseleccionar en lugar de seleccionar el item
      if (updatedItem._deleted) {
        setSelectedCategory(null);
      } else {
        // Mantener o actualizar la selección
        setSelectedCategory(updatedItem);
      }
    } else {
      // Si fue cancelado, deseleccionar
      setSelectedCategory(null);
    }
  };

  // Vista móvil/tablet: Tabs
  if (isMobile || isTablet) {
    return (
      <Box p="md">
        <Tabs value={mobileView} onChange={(value) => setMobileView(value as any)}>
          <Tabs.List>
            <Tabs.Tab value="sidebar">Categorías</Tabs.Tab>
            <Tabs.Tab value="content">Equipos</Tabs.Tab>
            <Tabs.Tab value="creation">Crear</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="sidebar" pt="md">
            <Sidebar
              onSelect={setSelectedCategory}
              selectedCategory={selectedCategory}
              onEdit={handleEdit}
              newEvent={false}
            />
          </Tabs.Panel>

          <Tabs.Panel value="content" pt="md">
            <ContentPanel
              selectedCategory={selectedCategory}
              setDisableCreateEquipment={setDisableCreateEquipment}
              onSelect={setSelectedCategory}
              onEdit={handleEdit}
              onCancel={handleCancel}
              newEvent={false}
              refreshTrigger={refreshTrigger}
            />
          </Tabs.Panel>

          <Tabs.Panel value="creation" pt="md">
            <CreationPanel
              selectedCategory={selectedCategory}
              editItem={editItem}
              onCancel={handleCancel}
            />
          </Tabs.Panel>
        </Tabs>
      </Box>
    );
  }

  // Vista desktop: 3 columnas resizables
  return (
    <PanelGroup direction="horizontal" style={{ height: '100vh' }}>
      {/* Sidebar - 25% inicial */}
      <Panel defaultSize={25} minSize={10} maxSize={50}>
        <Box
          style={{
            borderRight: '1px solid rgba(255, 255, 255, 0.15)',
            height: '100vh',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <Sidebar
            onSelect={setSelectedCategory}
            selectedCategory={selectedCategory}
            onEdit={handleEdit}
            newEvent={false}
          />
        </Box>
      </Panel>

      {/* Divisor arrastrable */}
      <PanelResizeHandle style={{ width: '2px', background: 'rgba(255,255,255,0.15)' }} />

      {/* ContentPanel - 55% inicial */}
      <Panel defaultSize={55} minSize={20} maxSize={80}>
        <Box
          style={{
            borderRight: '1px solid rgba(255, 255, 255, 0.15)',
            height: '100vh',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <ContentPanel
            selectedCategory={selectedCategory}
            setDisableCreateEquipment={setDisableCreateEquipment}
            onSelect={setSelectedCategory}
            onEdit={handleEdit}
            onCancel={handleCancel}
            newEvent={false}
            refreshTrigger={refreshTrigger}
          />
        </Box>
      </Panel>

      {/* Divisor arrastrable */}
      <PanelResizeHandle style={{ width: '2px', background: 'rgba(255,255,255,0.15)', }}/>

      {/* CreationPanel - 20% inicial */}
      <Panel defaultSize={20} minSize={10} maxSize={50}>
        <Box
          style={{
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto'
          }}
        >
          <CreationPanel
            selectedCategory={selectedCategory}
            editItem={editItem}
            onCancel={handleCancel}
          />
        </Box>
      </Panel>
    </PanelGroup>
  );
}
