// TreeView.tsx
'use client';
import useSWR from 'swr';
import { useState, useEffect } from 'react';
import { Button, Divider, Input, CloseButton } from '@mantine/core';
import {
  IconFolder,
  IconFolderPlus,
  IconPlus,
  IconChevronRight,
  IconDeviceFloppy,
  IconSearch
} from '@tabler/icons-react';

export type CategoryNode = {
  _id: string;
  name: string;
  parentId: string | null;
  parentIdOriginal?: string | null;
  categoryId?: string;
  totalStock?: number;
  availableStock?: number;
  children?: CategoryNode[];
};

function TreeNode({
  node,
  onSelect,
  selectedId,
  equipmentData,
  level = 0,
  onEdit,
  forceExpanded = false,
  disableEditOnSelect = false
}: {
  node: CategoryNode;
  onSelect: (node: CategoryNode | null) => void;
  selectedId?: string;
  equipmentData: any[];
  level?: number;
  onEdit?: (item: any) => void;
  forceExpanded?: boolean;
  disableEditOnSelect?: boolean;
}) {
  const [open, setOpen] = useState(false);
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
      if (node.categoryId) {
        const fullItem = equipmentData.find((eq: any) => eq._id === node._id);
        onSelect(fullItem || node);
        // Solo llamar onEdit si no está deshabilitado (para equipment/page.tsx)
        if (!disableEditOnSelect) {
          onEdit?.(fullItem || node);
        }
      } else {
        onSelect(node);
        // Solo llamar onEdit si no está deshabilitado (para equipment/page.tsx)
        if (!disableEditOnSelect) {
          onEdit?.(node);
        }
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
          paddingLeft: 4 * level,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          minHeight: '24px',
          maxWidth: '100%'
        }}
      >
        {node.children?.length ? (
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
        ) : (
          <span style={{ width: 14 }} />
        )}
        {node.categoryId ? (
          <IconDeviceFloppy size={16} />
        ) : (
          <IconFolder size={16} />
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
          {node.name}
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
                  <div style={{ display: 'block', width: '100%' }}>
                    <TreeNode
                      node={child}
                      onSelect={onSelect}
                      selectedId={selectedId}
                      equipmentData={equipmentData}
                      level={level + 1}
                      onEdit={onEdit}
                      forceExpanded={forceExpanded}
                      disableEditOnSelect={disableEditOnSelect}
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
  selectedCategory,
  onEdit,
  onOpenModal,
  newEvent,
  eventStartDate,
  eventEndDate,
  disableEditOnSelect = false
}: {
  onSelect?: (n: CategoryNode | null) => void;
  selectedCategory?: CategoryNode | null;
  onEdit?: (item: any) => void;
  onOpenModal?: () => void;
  newEvent: boolean;
  eventStartDate?: Date | string;
  eventEndDate?: Date | string;
  disableEditOnSelect?: boolean;
}) {
  const fetcher = (url: string) => fetch(url).then((r) => r.json());
  const [searchTerm, setSearchTerm] = useState('');
  const { data: treeNodes = [] } = useSWR<CategoryNode[]>(
    '/api/categoryTreeData',
    fetcher
  );

  // Construir URL con parámetros de fecha si están presentes
  const equipmentUrl = eventStartDate && eventEndDate
    ? `/api/equipment?eventStartDate=${new Date(eventStartDate).toISOString()}&eventEndDate=${new Date(eventEndDate).toISOString()}`
    : '/api/equipment';

  const { data: equipmentFullData = [] } = useSWR(equipmentUrl, fetcher);

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

  const filterTree = (nodes: CategoryNode[], term: string): CategoryNode[] => {
    if (!term.trim()) return nodes;

    return nodes.reduce<CategoryNode[]>((acc, node) => {
      const nodeMatches = node.name.toLowerCase().includes(term.toLowerCase());
      const filteredChildren = node.children ? filterTree(node.children, term) : [];

      if (nodeMatches || filteredChildren.length > 0) {
        acc.push({
          ...node,
          children: nodeMatches ? node.children : filteredChildren
        });
      }
      return acc;
    }, []);
  };

  const tree = buildTree(treeNodes);
  const filteredTree = filterTree(tree, searchTerm);

  const handleCreateCategory = () => {
    const isValidSelection =
      selectedCategory &&
      selectedCategory._id !== '' &&
      selectedCategory.parentId !== 'equipment';
    const parentId = isValidSelection ? selectedCategory._id : null;
    onSelect?.({ _id: '', name: '', parentId });

    if (newEvent && onOpenModal) {
      // Para new-event, abrir modal
      onOpenModal();
    } else {
      // Para /equipment, mantener comportamiento original
      onEdit?.(null);
    }
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

    if (newEvent && onOpenModal) {
      // Para new-event, abrir modal
      onOpenModal();
    } else {
      // Para /equipment, mantener comportamiento original
      onEdit?.(null);
    }
  };

  const disableCreateEquipment =
    !selectedCategory || !!selectedCategory?.categoryId;

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
      <Input
        placeholder="Buscar equipamiento..."
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
          {filteredTree.map((node) => (
            <TreeNode
              key={node._id}
              node={node}
              onSelect={(n) => onSelect?.(n)}
              selectedId={selectedCategory?._id}
              equipmentData={equipmentFullData}
              onEdit={onEdit}
              forceExpanded={!!searchTerm.trim()}
              disableEditOnSelect={disableEditOnSelect}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
