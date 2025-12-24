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
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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
          newEvent={false}
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
          onSelect={setSelectedCategory}
          onEdit={handleEdit}
          onCancel={handleCancel}
          newEvent={false}
          refreshTrigger={refreshTrigger}
        />
      </Box>

      {/* CreationPanel - 20% */}
      <Box
        style={{
          width: '20%',
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
    </div>
  );
}
