'use client';
import { useState } from 'react';
import { Text, Box, Tabs, Flex } from '@mantine/core';
import { withPageAuthRequired } from '@auth0/nextjs-auth0/client';
import StaffSidebar from '@/components/Sidebar/StaffSidebar';
import StaffContentPanel from '@/components/ContentPanel/StaffContentPanel';
import StaffCreationPanel from '@/components/CreationPanel/StaffCreationPanel';
import { useResponsive } from '@/hooks/useResponsive';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';

export default withPageAuthRequired(function StaffPage() {
  const [selectedEmployee, setselectedEmployee] = useState(null);
  const [disableCreateEquipment, setDisableCreateEquipment] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [mobileView, setMobileView] = useState<'sidebar' | 'content' | 'creation'>('sidebar');

  const { isMobile, isTablet } = useResponsive();

  const handleEdit = (item: any) => {
    setEditItem(item);
  };

  const handleCancel = (wasCancelled: boolean, updatedItem?: any) => {
    if (!wasCancelled && updatedItem) {
      setselectedEmployee(updatedItem);
      setEditItem(null);
    } else {
      setselectedEmployee(null);
      setEditItem(null);
    }
  };

  // Vista móvil/tablet: Tabs
  if (isMobile || isTablet) {
    return (
      <Box p="md">
        <Text size='xl' fw={700} mb="md">
          Empleados
        </Text>
        <Tabs value={mobileView} onChange={(value) => setMobileView(value as any)}>
          <Tabs.List>
            <Tabs.Tab value="sidebar">Lista</Tabs.Tab>
            <Tabs.Tab value="content">Detalle</Tabs.Tab>
            <Tabs.Tab value="creation">Crear</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="sidebar" pt="md">
            <StaffSidebar
              onSelect={setselectedEmployee}
              selectedEmployee={selectedEmployee}
              onEdit={handleEdit}
            />
          </Tabs.Panel>

          <Tabs.Panel value="content" pt="md">
            <StaffContentPanel
              selectedEmployee={selectedEmployee}
              setDisableCreateEquipment={setDisableCreateEquipment}
              onEdit={handleEdit}
              onCancel={handleCancel}
            />
          </Tabs.Panel>

          <Tabs.Panel value="creation" pt="md">
            <StaffCreationPanel
              selectedEmployee={selectedEmployee}
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
        Empleados
      </Text>
      <PanelGroup direction="horizontal" style={{ height: '100vh' }}>
        {/* StaffSidebar - 25% inicial */}
        <Panel defaultSize={25} minSize={10} maxSize={50}>
          <Box
            style={{
              borderRight: '1px solid rgba(255, 255, 255, 0.15)',
              height: '100vh',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <StaffSidebar
              onSelect={setselectedEmployee}
              selectedEmployee={selectedEmployee}
              onEdit={handleEdit}
            />
          </Box>
        </Panel>

        {/* Divisor arrastrable */}
        <PanelResizeHandle style={{ width: '2px', background: 'rgba(255, 255, 255, 0.15)' }} />

        {/* StaffContentPanel - 55% inicial */}
        <Panel defaultSize={55} minSize={20} maxSize={80}>
          <Box
            style={{
              borderRight: '1px solid rgba(255, 255, 255, 0.15)',
              height: '100vh',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <StaffContentPanel
              selectedEmployee={selectedEmployee}
              setDisableCreateEquipment={setDisableCreateEquipment}
              onEdit={handleEdit}
              onCancel={handleCancel}
            />
          </Box>
        </Panel>

        {/* Divisor arrastrable */}
        <PanelResizeHandle style={{ width: '2px', background: 'rgba(255, 255, 255, 0.15)' }} />

        {/* StaffCreationPanel - 20% inicial */}
        <Panel defaultSize={20} minSize={10} maxSize={50}>
          <Box
            style={{
              height: '100vh',
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'auto'
            }}
          >
            <StaffCreationPanel
              selectedEmployee={selectedEmployee}
              editItem={editItem}
              onCancel={handleCancel}
            />
          </Box>
        </Panel>
      </PanelGroup>
    </>
  );
});
