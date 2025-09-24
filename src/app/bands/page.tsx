'use client';
import { useState } from 'react';
import { Text, Box } from '@mantine/core';
import { withPageAuthRequired } from '@auth0/nextjs-auth0/client';
import BandsSidebar from '@/components/Sidebar/BandsSidebar';
import BandsContentPanel from '@/components/ContentPanel/BandsContentPanel';
import BandsCreationPanel from '@/components/CreationPanel/BandsCreationPanel';

export default withPageAuthRequired(function BandsPage() {
  const [selectedBand, setselectedBand] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [allData, setAllData] = useState([]);

  const handleEdit = (item: any) => {
    setEditItem(item);
  };

  const handleCancel = (wasCancelled: boolean, updatedItem?: any) => {
    if (!wasCancelled && updatedItem) {
      setselectedBand(updatedItem);
      setEditItem(null);
    } else {
      setselectedBand(null);
      setEditItem(null);
    }
  };

  return (
    <>
      <Text size='xl' fw={700}>
        Bandas
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
          <BandsSidebar
            onSelect={setselectedBand}
            selectedBand={selectedBand}
            onEdit={handleEdit}
            setAllData={setAllData}
          />
        </Box>

        {/* BandsBandsContentPanel - 60% */}
        <Box
          style={{
            width: '55%',
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

        <Box
          style={{
            width: '20%',
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
            allData={allData}
          />
        </Box>
      </div>
    </>
  );
});
