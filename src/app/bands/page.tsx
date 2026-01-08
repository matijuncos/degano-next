'use client';
import { useState } from 'react';
import { Text, Box, Tabs, Flex } from '@mantine/core';
import { withPageAuthRequired } from '@auth0/nextjs-auth0/client';
import BandsSidebar from '@/components/Sidebar/BandsSidebar';
import BandsContentPanel from '@/components/ContentPanel/BandsContentPanel';
import BandsCreationPanel from '@/components/CreationPanel/BandsCreationPanel';
import { useResponsive } from '@/hooks/useResponsive';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';

export default withPageAuthRequired(function BandsPage() {
  const [selectedBand, setselectedBand] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [mobileView, setMobileView] = useState<'sidebar' | 'content' | 'creation'>('sidebar');

  const { isMobile, isTablet } = useResponsive();

  const handleEdit = (item: any) => {
    setEditItem(item);
  };

  const handleCancel = (wasCancelled: boolean, updatedItem?: any) => {
    if (!wasCancelled && updatedItem) {
      setselectedBand(updatedItem);
      setEditItem(updatedItem);
    } else {
      setselectedBand(null);
      setEditItem(null);
    }
  };

  // Vista móvil/tablet: Tabs
  if (isMobile || isTablet) {
    return (
      <Box p="md">
        <Text size='xl' fw={700} mb="md">
          Bandas
        </Text>
        <Tabs value={mobileView} onChange={(value) => setMobileView(value as any)}>
          <Tabs.List>
            <Tabs.Tab value="sidebar">Lista</Tabs.Tab>
            <Tabs.Tab value="content">Detalle</Tabs.Tab>
            <Tabs.Tab value="creation">Crear</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="sidebar" pt="md">
            <BandsSidebar
              onSelect={setselectedBand}
              selectedBand={selectedBand}
              onEdit={handleEdit}
            />
          </Tabs.Panel>

          <Tabs.Panel value="content" pt="md">
            <BandsContentPanel
              selectedBand={selectedBand}
              onEdit={handleEdit}
              onCancel={handleCancel}
            />
          </Tabs.Panel>

          <Tabs.Panel value="creation" pt="md">
            <BandsCreationPanel
              selectedBand={selectedBand}
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
    <>
      <Text size='xl' fw={700}>
        Bandas
      </Text>
      <PanelGroup direction="horizontal" style={{ height: '100vh' }}>
        {/* BandsSidebar - 25% inicial */}
        <Panel defaultSize={25} minSize={10} maxSize={50}>
          <Box
            style={{
              borderRight: '1px solid rgba(255, 255, 255, 0.15)',
              height: '100vh',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <BandsSidebar
              onSelect={setselectedBand}
              selectedBand={selectedBand}
              onEdit={handleEdit}
            />
          </Box>
        </Panel>

        {/* Divisor arrastrable */}
        <PanelResizeHandle style={{ width: '2px', background: 'rgba(255, 255, 255, 0.15)' }} />

        {/* BandsContentPanel - 55% inicial */}
        <Panel defaultSize={55} minSize={20} maxSize={80}>
          <Box
            style={{
              borderRight: '1px solid rgba(255, 255, 255, 0.15)',
              height: '100vh',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <BandsContentPanel
              selectedBand={selectedBand}
              onEdit={handleEdit}
              onCancel={handleCancel}
            />
          </Box>
        </Panel>

        {/* Divisor arrastrable */}
        <PanelResizeHandle style={{ width: '2px', background: 'rgba(255, 255, 255, 0.15)' }} />

        {/* BandsCreationPanel - 20% inicial */}
        <Panel defaultSize={20} minSize={10} maxSize={50}>
          <Box
            style={{
              height: '100vh',
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'auto'
            }}
          >
            <BandsCreationPanel
              selectedBand={selectedBand}
              editItem={editItem}
              onCancel={handleCancel}
            />
          </Box>
        </Panel>
      </PanelGroup>
    </>
  );
});
