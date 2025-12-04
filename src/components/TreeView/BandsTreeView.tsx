// BandsTreeView.tsx
'use client';
import useSWR from 'swr';
import { useEffect, useState } from 'react';
import { Button, Divider, Input, CloseButton } from '@mantine/core';
import {
  IconFolderPlus,
  IconChevronRight,
  IconUser,
  IconSearch
} from '@tabler/icons-react';
import { Band, ExtraContact } from '@/context/types';

type BandNode = Band | ExtraContact;

function TreeNode({
  node,
  onSelect,
  selectedId,
  level = 0,
  onEdit,
  bandsData,
  forceExpanded = false
}: {
  node: Band | ExtraContact;
  onSelect: (node: BandNode | null) => void;
  selectedId?: string;
  level?: number;
  onEdit?: (item: BandNode) => void;
  bandsData: Band[];
  forceExpanded?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const isBand = (n: any): n is Band => 'bandName' in n;
  const isSelected = selectedId === node._id;

  // Auto-expandir cuando hay búsqueda, pero permitir cerrar manualmente
  useEffect(() => {
    if (forceExpanded) {
      setOpen(true);
    }
  }, [forceExpanded]);

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen(!open);
  };

  const handleSelect = () => {
    if (isSelected) {
      onSelect(null);
    } else {
      if (isBand(node)) {
        const fullItem = bandsData.find((b) => b._id === node._id);
        onSelect(fullItem || node);
        onEdit?.(fullItem || node);
      } else {
        onSelect(node);
        onEdit?.(node);
      }
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <div
        style={{
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          fontWeight: isSelected ? 'bold' : 'normal',
          gap: '0.35rem',
          paddingLeft: 12 * level,
          minHeight: '24px',
          maxWidth: '100%'
        }}
      >
          <span
            onClick={toggleExpand}
            style={{
              display: 'flex',
              transition: 'transform 0.25s ease',
              transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
              minWidth: 14
            }}
          >
            <IconChevronRight size={14} />
          </span>

        {isBand(node) ? (
          <span onClick={handleSelect}>{node.bandName}</span>
        ) : (
          <span
            onClick={handleSelect}
            style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
          >
            <IconUser size={14} /> {node.rol && `${node.rol} -`} {node.name} 
          </span>
        )}
      </div>

      {isBand(node) && (
        <div
          style={{
            display: 'grid',
            gridTemplateRows: open ? '1fr' : '0fr',
            transition: 'grid-template-rows 0.3s ease',
            overflow: 'hidden'
          }}
        >
          <div style={{ overflow: 'hidden' }}>
            {node.contacts?.map((contact: any) => (
              <TreeNode
                key={contact._id}
                node={{...contact, bandId: node._id}}
                onSelect={onSelect}
                selectedId={selectedId}
                level={level + 1}
                onEdit={onEdit}
                bandsData={bandsData}
                forceExpanded={forceExpanded}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function BandsTreeView({
  onSelect,
  selectedBand,
  onEdit,
}: {
  onSelect?: (n: BandNode | null) => void;
  selectedBand?: Band | null;
  onEdit?: (item: BandNode | null) => void;
}) {
  const fetcher = (url: string) => fetch(url).then((r) => r.json());
  const [searchTerm, setSearchTerm] = useState('');
  const { data: bandsData = [] } = useSWR<Band[]>('/api/bands', fetcher);

  const filterBands = (bands: Band[], term: string): Band[] => {
    if (!term.trim()) return bands;

    const lowerTerm = term.toLowerCase();

    return bands.reduce<Band[]>((acc, band) => {
      const bandMatches = band.bandName.toLowerCase().includes(lowerTerm);
      const contactsMatch = band.contacts?.filter(contact =>
        contact.name.toLowerCase().includes(lowerTerm)
      ) || [];

      if (bandMatches || contactsMatch.length > 0) {
        acc.push({
          ...band,
          contacts: bandMatches ? band.contacts : contactsMatch
        });
      }
      return acc;
    }, []);
  };

  const filteredBands = filterBands(bandsData, searchTerm);

  const handleCreateBand = () => {
    onSelect?.({
      _id: '',
      bandName: '',
      showTime: '',
      testTime: '',
      bandInfo: '',
      contacts: [] as ExtraContact[],
      fileUrl: '',
      type: 'band'
    });
    onEdit?.(null);
  };

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          margin: '0 0.75rem'
        }}
      >
        <Button
          variant='light'
          size='xs'
          leftSection={<IconFolderPlus size={16} />}
          onClick={handleCreateBand}
        >
          Cargar banda
        </Button>
      </div>
      <Divider my='sm' />
      <Input
        placeholder="Buscar banda o contacto..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.currentTarget.value)}
        leftSection={<IconSearch size={16} />}
        rightSection={
          searchTerm && (
            <CloseButton
              size="sm"
              onClick={() => setSearchTerm('')}
              aria-label="Limpiar búsqueda"
            />
          )
        }
        rightSectionPointerEvents="auto"
        mb="sm"
        mx="0.75rem"
      />
      <div
        style={{
          overflowY: 'auto',
          overflowX: 'auto',
          paddingBottom: '10px'
        }}
      >
        <div style={{ minWidth: 'max-content' }}>
          {filteredBands.map((band: Band) => (
            <TreeNode
              key={band._id}
              node={band}
              onSelect={(n) => onSelect?.(n)}
              selectedId={selectedBand?._id}
              bandsData={bandsData}
              onEdit={onEdit}
              forceExpanded={!!searchTerm.trim()}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
