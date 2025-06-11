// EquipmentPage.tsx
'use client';
import { useState } from 'react';
import Sidebar from '@/components/Sidebar/Sidebar';
import ContentPanel from '@/components/ContentPanel/ContentPanel';
import CreationPanel from '@/components/CreationPanel/CreationPanel';
import { Box } from '@mantine/core';

export default function EquipmentPage() {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [disableCreateEquipment, setDisableCreateEquipment] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const handleEdit = (item: any) => {
    setEditItem(item);
  };

  const handleCancel = () => {
    setEditItem(null);
    setSelectedCategory(null);
  };

  return (
    <div
      className='flex'
      style={{ height: '100vh', minHeight: '100vh', overflow: 'hidden' }}
    >
      {/* Sidebar - 20% */}
      <Box
        style={{
          width: '20%',
          borderRight: '1px solid rgba(255, 255, 255, 0.15)',
          paddingRight: '0.5rem',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <Sidebar
          onSelect={setSelectedCategory}
          selectedCategory={selectedCategory}
        />
      </Box>

      {/* ContentPanel - 60% */}
      <Box
        style={{
          width: '60%',
          borderRight: '1px solid rgba(255, 255, 255, 0.15)',
          paddingRight: '0.5rem',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <ContentPanel
          selectedCategory={selectedCategory}
          setDisableCreateEquipment={setDisableCreateEquipment}
          onEdit={handleEdit}
        />
      </Box>

      {/* CreationPanel - 20% */}
      <Box
        style={{
          width: '20%',
          paddingRight: '0.5rem',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <CreationPanel
          selectedCategory={selectedCategory}
          editItem={editItem}
          onCancel={handleCancel}
        />
      </Box>
    </div>
  );
}
