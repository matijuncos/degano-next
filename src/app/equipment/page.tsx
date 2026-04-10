// EquipmentPage.tsx
'use client';
import { useState } from 'react';
import Sidebar from '@/components/Sidebar/Sidebar';
import ContentPanel from '@/components/ContentPanel/ContentPanel';
import CreationPanel from '@/components/CreationPanel/CreationPanel';
import EquipmentSetsPanel from '@/components/EquipmentSetsPanel/EquipmentSetsPanel';
import { Box, Tabs, Flex, SegmentedControl } from '@mantine/core';
import { useResponsive } from '@/hooks/useResponsive';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { usePermissions } from '@/hooks/usePermissions';

export default function EquipmentPage() {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [disableCreateEquipment, setDisableCreateEquipment] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [mobileView, setMobileView] = useState<'sidebar' | 'content' | 'creation'>('sidebar');
  const [section, setSection] = useState<'equipment' | 'sets'>('equipment');

  const { isMobile, isTablet } = useResponsive();
  const { can } = usePermissions();
  const canViewEquipment = can('canViewEquipment');

  const handleEdit = (item: any) => { setEditItem(item); };

  const handleCancel = (wasCancelled: boolean, updatedItem?: any) => {
    setEditItem(null);
    if (!wasCancelled && updatedItem) {
      setRefreshTrigger(prev => prev + 1);
      if (updatedItem._deleted) {
        setSelectedCategory(null);
      } else {
        setSelectedCategory(updatedItem);
      }
    } else {
      setSelectedCategory(null);
    }
  };

  const SectionToggle = () => (
    <Box p='sm' style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
      <SegmentedControl
        value={section}
        onChange={(val) => setSection(val as 'equipment' | 'sets')}
        data={[
          { label: 'Equipamiento', value: 'equipment' },
          { label: 'Sets', value: 'sets' }
        ]}
        size='sm'
        fullWidth
      />
    </Box>
  );

  // Vista móvil/tablet
  if (isMobile || isTablet) {
    return (
      <Box>
        <SectionToggle />
        {section === 'sets' ? (
          <EquipmentSetsPanel />
        ) : (
          <Box p='md'>
            <Tabs value={mobileView} onChange={(value) => setMobileView(value as any)}>
              <Tabs.List>
                <Tabs.Tab value='sidebar'>Categorías</Tabs.Tab>
                <Tabs.Tab value='content'>Equipos</Tabs.Tab>
                <Tabs.Tab value='creation'>Crear</Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value='sidebar' pt='md'>
                <Sidebar
                  onSelect={setSelectedCategory}
                  selectedCategory={selectedCategory}
                  onEdit={handleEdit}
                  newEvent={false}
                />
              </Tabs.Panel>

              <Tabs.Panel value='content' pt='md'>
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

              <Tabs.Panel value='creation' pt='md'>
                <CreationPanel
                  selectedCategory={selectedCategory}
                  editItem={editItem}
                  onCancel={handleCancel}
                />
              </Tabs.Panel>
            </Tabs>
          </Box>
        )}
      </Box>
    );
  }

  // Vista desktop
  if (section === 'sets') {
    return (
      <Box style={{ height: '100vh', overflowY: 'auto' }}>
        <SectionToggle />
        <EquipmentSetsPanel />
      </Box>
    );
  }

  return (
    <Box style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <SectionToggle />
      <PanelGroup direction='horizontal' style={{ flex: 1 }}>
        {/* Sidebar */}
        <Panel defaultSize={25} minSize={10} maxSize={50}>
          <Box style={{ borderRight: '1px solid rgba(255,255,255,0.15)', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Sidebar
              onSelect={setSelectedCategory}
              selectedCategory={selectedCategory}
              onEdit={handleEdit}
              newEvent={false}
            />
          </Box>
        </Panel>

        <PanelResizeHandle style={{ width: '2px', background: 'rgba(255,255,255,0.15)' }} />

        {/* ContentPanel */}
        <Panel defaultSize={55} minSize={20} maxSize={80}>
          <Box style={{ borderRight: '1px solid rgba(255,255,255,0.15)', height: '100%', display: 'flex', flexDirection: 'column' }}>
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

        <PanelResizeHandle style={{ width: '2px', background: 'rgba(255,255,255,0.15)' }} />

        {/* CreationPanel */}
        <Panel defaultSize={20} minSize={10} maxSize={50}>
          <Box style={{ height: '100%', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
            <CreationPanel
              selectedCategory={selectedCategory}
              editItem={editItem}
              onCancel={handleCancel}
            />
          </Box>
        </Panel>
      </PanelGroup>
    </Box>
  );
}
