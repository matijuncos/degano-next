// StaffTreeView.tsx
'use client';
import useSWR from 'swr';
import { useState } from 'react';
import { Button, Divider } from '@mantine/core';
import {
  IconFolder,
  IconFolderPlus,
  IconPlus,
  IconChevronRight,
  IconDeviceFloppy
} from '@tabler/icons-react';

export type StaffNode = {
  _id: string;
  fullName: string;
  cardId: string | null;
  rol?: string | null;
  license?: string;
  licenseType?: string;
};

function TreeNode({
  node,
  onSelect,
  selectedId,
  staffData,
  level = 0,
  onEdit
}: {
  node: StaffNode;
  onSelect: (node: StaffNode | null) => void;
  selectedId?: string;
  staffData: any[];
  level?: number;
  onEdit?: (item: any) => void;
}) {
  const [open, setOpen] = useState(false);
  const isSelected = selectedId === node._id;

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen(!open);
  };
  console.log(staffData);
  const handleSelect = () => {
    if (isSelected) {
      onSelect(null);
    } else {
      if (node._id) {
        const fullItem = staffData.find((eq: any) => eq._id === node._id);
        onSelect(fullItem || node);
        onEdit?.(fullItem || node);
      } else {
        onSelect(node);
        onEdit?.(node);
      }
      // if (!open && node.children && node.children.length > 0) {
      //   setOpen(true);
      // }
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
          position: 'relative',
          paddingLeft: 4 * level,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          minHeight: '24px',
          maxWidth: '100%'
        }}
      >
        {node && (
          <span
            onClick={toggleExpand}
            style={{
              display: 'flex',
              zIndex: 1,
              transition: 'transform 0.25s ease',
              transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
              minWidth: 14
            }}
          >
            <IconChevronRight size={14} />
          </span>
        )}
        <span
          onClick={handleSelect}
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            paddingRight: '10px'
          }}
        >
          {node.fullName}
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateRows: open ? '1fr' : '0fr',
          transition: 'grid-template-rows 0.3s ease',
          overflow: 'hidden'
        }}
      >
        {/* <div style={{ overflow: 'hidden' }}>
          {Array.isArray(node) && node.length > 0 && (
            <div style={{ position: 'relative' }}>
              {node.map((child) => (
                <div key={child._id} style={{ display: 'flex' }}>
                  <div
                    style={{
                      width: 16,
                      display: 'flex',
                      justifyContent: 'center',
                      position: 'relative'
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        left: '50%',
                        borderLeft: '1px dashed rgba(255,255,255,0.3)'
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: '12px',
                        left: '50%',
                        width: 13,
                        borderTop: '1px dashed rgba(255,255,255,0.3)'
                      }}
                    />
                  </div>
                  <div style={{ display: 'block', width: '100%' }}>
                    <TreeNode
                      node={child}
                      onSelect={onSelect}
                      selectedId={selectedId}
                      equipmentData={equipmentData}
                      level={level + 1}
                      onEdit={onEdit}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div> */}
      </div>
    </div>
  );
}

export default function StaffTreeView({
  onSelect,
  selectedEmployee,
  onEdit
}: {
  onSelect?: (n: StaffNode | null) => void;
  selectedEmployee?: StaffNode | null;
  onEdit?: (item: any) => void;
}) {
  const fetcher = (url: string) => fetch(url).then((r) => r.json());

  const { data: staffData = [] } = useSWR('/api/employees', fetcher);

  const handleCreateCategory = () => {
    onSelect?.({
      _id: '',
      fullName: '',
      cardId: '',
      rol: '',
      license: '',
      licenseType: ''
    });
  };

  // const handleCreateEquipment = () => {
  //   const isValidSelection =
  //     selectedEmployee &&
  //     selectedEmployee._id !== '' &&
  //     !selectedEmployee.categoryId; // No debe ser un item

  //   const parentId = isValidSelection ? selectedEmployee._id : null;
  //   onSelect?.({
  //     _id: '',
  //     name: '',
  //     parentId,
  //     parentIdOriginal: parentId
  //   });
  //   onEdit?.(null);
  // };

  // const disableCreateEquipment =
  //   !selectedEmployee || !!selectedEmployee?.categoryId;

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
          onClick={handleCreateCategory}
        >
          Cargar empleado
        </Button>
      </div>
      <Divider my='sm' />
      <div
        style={{
          overflowY: 'auto',
          overflowX: 'auto',
          paddingBottom: '10px'
        }}
      >
        <div style={{ minWidth: 'max-content' }}>
          {staffData.map((node: StaffNode) => (
            <TreeNode
              key={node._id}
              node={node}
              onSelect={(n) => onSelect?.(n)}
              selectedId={selectedEmployee?._id}
              staffData={staffData}
              onEdit={onEdit}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
