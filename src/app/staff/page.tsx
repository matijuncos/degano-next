'use client';
import { useState } from 'react';
import { Text, Box, Tabs, Flex } from '@mantine/core';
import { withPageAuthRequired } from '@auth0/nextjs-auth0/client';
import StaffSidebar from '@/components/Sidebar/StaffSidebar';
import StaffContentPanel from '@/components/ContentPanel/StaffContentPanel';
import StaffCreationPanel from '@/components/CreationPanel/StaffCreationPanel';
import { useResponsive } from '@/hooks/useResponsive';

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

  // Vista desktop: 3 columnas
  return (
    <>
      <Text size='xl' fw={700}>
        Empleados
      </Text>
      <Flex style={{ height: '100vh', overflow: 'hidden' }}>
        <Box
          w={{ md: '30%', lg: '25%' }}
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

        <Box
          w={{ md: '70%', lg: '55%' }}
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

        <Box
          w="20%"
          display={{ md: 'none', lg: 'flex' }}
          style={{
            height: '100vh',
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
      </Flex>
    </>
  );
});
