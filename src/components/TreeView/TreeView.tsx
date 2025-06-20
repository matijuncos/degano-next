// TreeView.tsx
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

export type CategoryNode = {
  _id: string;
  name: string;
  parentId: string | null;
  parentIdOriginal?: string | null;
  categoryId?: string;
  children?: CategoryNode[];
};

function TreeNode({
  node,
  onSelect,
  selectedId,
  equipmentData,
  level = 0
}: {
  node: CategoryNode;
  onSelect: (node: CategoryNode | null) => void;
  selectedId?: string;
  equipmentData: any[];
  level?: number;
}) {
  const [open, setOpen] = useState(false);
  const isSelected = selectedId === node._id;

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen(!open);
  };

  const handleSelect = () => {
    if (isSelected) {
      onSelect(null);
    } else {
      if (node.categoryId) {
        const fullItem = equipmentData.find((eq: any) => eq._id === node._id);
        onSelect(fullItem || node);
      } else {
        onSelect(node);
      }
      if (!open && node.children && node.children.length > 0) {
        setOpen(true);
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
          position: 'relative',
          paddingLeft: 4 * level
        }}
      >
        {node.children?.length ? (
          <span
            onClick={toggleExpand}
            style={{
              display: 'flex',
              zIndex: 1,
              transition: 'transform 0.25s ease',
              transform: open ? 'rotate(90deg)' : 'rotate(0deg)'
            }}
          >
            <IconChevronRight size={14} />
          </span>
        ) : (
          <span style={{ width: 14 }} />
        )}
        {node.categoryId ? (
          <IconDeviceFloppy size={16} />
        ) : (
          <IconFolder size={16} />
        )}
        <span onClick={handleSelect}>{node.name}</span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateRows: open ? '1fr' : '0fr',
          transition: 'grid-template-rows 0.3s ease',
          overflow: 'hidden'
        }}
      >
        <div style={{ overflow: 'hidden' }}>
          {Array.isArray(node.children) && node.children.length > 0 && (
            <div style={{ position: 'relative' }}>
              {node.children.map((child) => (
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
                  <div style={{ flex: 1 }}>
                    <TreeNode
                      node={child}
                      onSelect={onSelect}
                      selectedId={selectedId}
                      equipmentData={equipmentData}
                      level={level + 1}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TreeView({
  onSelect,
  selectedCategory
}: {
  onSelect?: (n: CategoryNode | null) => void;
  selectedCategory?: CategoryNode | null;
}) {
  const fetcher = (url: string) => fetch(url).then((r) => r.json());
  const { data: treeNodes = [] } = useSWR<CategoryNode[]>('/api/treeData', fetcher);
  const { data: equipmentFullData = [] } = useSWR('/api/equipment', fetcher);

  const buildTree = (
    nodes: CategoryNode[],
    parentId: string | null = null
  ): CategoryNode[] => {
    return nodes
      .filter((n) => n.parentId === parentId)
      .map((n) => ({
        ...n,
        children: buildTree(nodes, n._id)
      }));
  };

  const tree = buildTree(treeNodes);

  const handleCreateCategory = () => {
    const isValidSelection =
      selectedCategory &&
      selectedCategory._id !== '' &&
      selectedCategory.parentId !== 'equipment';
    const parentId = isValidSelection ? selectedCategory._id : null;
    onSelect?.({ _id: '', name: '', parentId });
  };

  const handleCreateEquipment = () => {
    const isValidSelection =
      selectedCategory &&
      selectedCategory._id !== '' &&
      !selectedCategory.categoryId; // No debe ser un item

    const parentId = isValidSelection ? selectedCategory._id : null;

    onSelect?.({
      _id: '',
      name: '',
      parentId,
      parentIdOriginal: parentId
    });
  };

  const disableCreateEquipment = !selectedCategory || !!selectedCategory?.categoryId;

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
          Crear categoría
        </Button>
        <Button
          variant='light'
          size='xs'
          leftSection={<IconPlus size={16} />}
          onClick={handleCreateEquipment}
          disabled={disableCreateEquipment}
        >
          Cargar equipamiento
        </Button>
      </div>
      <Divider my='sm' />
      <div style={{ overflowY: 'auto' }}>
        {tree.map((node) => (
          <TreeNode
            key={node._id}
            node={node}
            onSelect={(n) => onSelect?.(n)}
            selectedId={selectedCategory?._id}
            equipmentData={equipmentFullData}
          />
        ))}
      </div>
    </div>
  );
}
