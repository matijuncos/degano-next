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

  const handleCancel = (wasCancelled: boolean, updatedItem?: any) => {
    if (!wasCancelled && updatedItem) {
      setSelectedCategory(updatedItem); // mantiene selección
      setEditItem(null);
    } else {
      setSelectedCategory(null); // se deselecciona
      setEditItem(null);
    }
  };

  return (
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
        <Sidebar
          onSelect={setSelectedCategory}
          selectedCategory={selectedCategory}
          onEdit={handleEdit}
        />
      </Box>

      {/* ContentPanel - 60% */}
      <Box
        style={{
          width: '55%',
          borderRight: '1px solid rgba(255, 255, 255, 0.15)',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <ContentPanel
          selectedCategory={selectedCategory}
          setDisableCreateEquipment={setDisableCreateEquipment}
          onEdit={handleEdit}
          onCancel={handleCancel}
        />
      </Box>

      {/* CreationPanel - 20% */}
      <Box
        style={{
          width: '20%',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          overflowY: 'auto'
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
