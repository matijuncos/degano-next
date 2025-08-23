'use client';
import { useState } from 'react';
import { Text, Box } from '@mantine/core';
import { withPageAuthRequired } from '@auth0/nextjs-auth0/client';
import StaffSidebar from '@/components/Sidebar/StaffSidebar';
import StaffContentPanel from '@/components/ContentPanel/StaffContentPanel';
import StaffCreationPanel from '@/components/CreationPanel/StaffCreationPanel';

export default withPageAuthRequired(function StaffPage() {
  const [selectedEmployee, setselectedEmployee] = useState(null);
  const [disableCreateEquipment, setDisableCreateEquipment] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const handleEdit = (item: any) => {
    setEditItem(item);
  };

  const handleCancel = (wasCancelled: boolean, updatedItem?: any) => {
    if (!wasCancelled && updatedItem) {
      setselectedEmployee(updatedItem); // mantiene selección
      setEditItem(null);
    } else {
      setselectedEmployee(null); // se deselecciona
      setEditItem(null);
    }
  };

  return (
    <>
      <Text size='xl' fw={700}>
        Empleados
      </Text>
      <div
        className='flex'
        style={{ height: '100vh', minHeight: '100vh', overflow: 'hidden' }}
      >
        {/* Sidebar - 20% */}
        <Box
          style={{
            width: '25%',
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

        {/* StaffStaffContentPanel - 60% */}
        <Box
          style={{
            width: '55%',
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

        {/* StaffCreationPanel - 20% */}
        <Box
          style={{
            width: '20%',
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
      </div>
    </>
  );
});
