'use client';
import { ActionIcon, Group, Text, Stack, Divider, Button, Box, Badge, Tooltip } from '@mantine/core';
import { useEffect, useState } from 'react';
import { FaTrashAlt, FaChevronDown, FaChevronRight, FaGripVertical } from 'react-icons/fa';
import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { NewEquipment } from '../equipmentStockTable/types';
import { EventModel } from '@/context/types';
import { formatPrice } from '@/utils/priceUtils';
import { findMainCategorySync } from '@/utils/categoryUtils';
import { groupEquipmentByName } from '@/utils/equipmentGroupUtils';
import { usePermissions } from '@/hooks/usePermissions';
import { useEquipmentStatusMap } from '@/hooks/useEquipmentStatusMap';
import {
  isEquipmentUnavailable,
  getUnavailabilityReason,
  LiveEquipmentStatus
} from '@/utils/equipmentAvailability';

type CategoryItemProps = {
  categoryName: string;
  groupedEquipment: { [key: string]: any[] };
  expandedGroups: Set<string>;
  toggleGroup: (key: string) => void;
  handleRemove: (id: string) => void;
  canViewPrices: boolean;
  statusMap: Map<string, LiveEquipmentStatus>;
  isDragOverlay?: boolean;
  // Negativos (a tercerizar) de esta categoría, y cómo quitarlos
  extraForCategory?: { name: string; quantity: number; mainCategoryName?: string }[];
  handleRemoveNegative?: (name: string, mainCategoryName: string) => void;
  // Orden de equipos (por nombre) dentro de esta categoría + callback al reordenar
  itemOrder?: string[];
  onReorderItems?: (categoryName: string, newNames: string[]) => void;
};

// Fila de un grupo de equipo (por nombre) arrastrable dentro de la categoría
function SortableNameGroup({
  id,
  disabled = false,
  children
}: {
  id: string;
  disabled?: boolean;
  children: (dragHandleProps: Record<string, any>) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id, disabled });
  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    position: 'relative',
    zIndex: isDragging ? 1 : 0
  };
  return (
    <div ref={setNodeRef} style={style}>
      {children(disabled ? {} : { ...attributes, ...listeners })}
    </div>
  );
}

function SortableCategoryItem(props: CategoryItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: props.categoryName });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    marginBottom: '12px',
    opacity: isDragging ? 0.4 : 1,
    position: 'relative' as const,
    zIndex: isDragging ? 1 : 0
  };

  return (
    <div ref={setNodeRef} style={style}>
      <CategoryContent {...props} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  );
}

function CategoryContent({
  categoryName,
  groupedEquipment,
  expandedGroups,
  toggleGroup,
  handleRemove,
  canViewPrices,
  statusMap,
  isDragOverlay = false,
  dragHandleProps,
  extraForCategory = [],
  handleRemoveNegative,
  itemOrder = [],
  onReorderItems
}: CategoryItemProps & { dragHandleProps?: Record<string, any> }) {
  const itemSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const categoryEquipment = groupedEquipment[categoryName] || [];
  // La categoría puede tener solo negativos (sin equipos reales)
  if (categoryEquipment.length === 0 && extraForCategory.length === 0) return null;
  const groupedByName = groupEquipmentByName(categoryEquipment);

  // Badge rojo "No disponible" para un equipo dado de baja / en reparación
  const unavailableBadge = (eq: any) => {
    const live = statusMap.get(String(eq._id));
    if (!isEquipmentUnavailable(live)) return null;
    const reason = getUnavailabilityReason(live);
    return (
      <Tooltip label={`No disponible: ${reason}`} withArrow>
        <Badge color='red' variant='filled' size='xs' style={{ flexShrink: 0 }}>
          No disponible{reason ? ` · ${reason}` : ''}
        </Badge>
      </Tooltip>
    );
  };

  // Orden de los grupos por nombre: respetar itemOrder guardado, y los nombres
  // nuevos (recién agregados) van al final.
  const currentNames = Object.keys(groupedByName);
  const orderedNames = [
    ...itemOrder.filter((n) => currentNames.includes(n)),
    ...currentNames.filter((n) => !itemOrder.includes(n))
  ];

  const handleItemDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = orderedNames.indexOf(active.id as string);
    const newIndex = orderedNames.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;
    onReorderItems?.(categoryName, arrayMove(orderedNames, oldIndex, newIndex));
  };

  // Renderiza un grupo de equipo (por nombre). `grip` son los props del handle
  // de arrastre (vacío en el overlay o si no se puede reordenar).
  const renderNameGroup = (equipmentName: string, grip: Record<string, any>) => {
    const equipmentGroup = groupedByName[equipmentName];
    if (!equipmentGroup) return null;
    const groupKey = `${categoryName}-${equipmentName}`;
    const isExpanded = expandedGroups.has(groupKey);
    const totalPrice = equipmentGroup.reduce(
      (sum: number, eq: any) => sum + (eq.rentalPrice || 0),
      0
    );
    const quantity = equipmentGroup.length;

    const gripBtn = (
      <ActionIcon
        size='xs'
        variant='transparent'
        style={{
          cursor: 'grab',
          color: 'rgba(255,255,255,0.3)',
          flexShrink: 0,
          touchAction: 'none'
        }}
        title='Arrastrar para reordenar'
        onClick={(e) => e.stopPropagation()}
        {...grip}
      >
        <FaGripVertical size={9} />
      </ActionIcon>
    );

    if (quantity === 1) {
      const eq = equipmentGroup[0];
      const isUnavailable = isEquipmentUnavailable(statusMap.get(String(eq._id)));
      return (
        <Stack
          key={eq._id}
          gap='2px'
          style={{
            padding: '6px 8px',
            backgroundColor: isUnavailable
              ? 'rgba(250, 82, 82, 0.08)'
              : 'rgba(255, 255, 255, 0.05)',
            borderRadius: '4px',
            borderLeft: isUnavailable
              ? '3px solid rgba(250, 82, 82, 0.8)'
              : '3px solid rgba(64, 192, 87, 0.7)'
          }}
        >
          <Group justify='space-between' gap='xs'>
            <Group gap='4px' style={{ flex: 1, minWidth: 0 }}>
              {gripBtn}
              <Stack gap='2px' style={{ flex: 1, minWidth: 0 }}>
                <Group gap='6px' wrap='nowrap'>
                  <Text size='sm' fw={600} truncate>
                    {eq.name}
                  </Text>
                  {unavailableBadge(eq)}
                </Group>
                <Text size='10px' c='dimmed'>
                  Código: {eq.code || 'N/A'}
                </Text>
              </Stack>
            </Group>
            <Group gap='4px' style={{ flexShrink: 0 }}>
              {canViewPrices && (
                <Text size='xs' c='green' fw={700}>
                  {formatPrice(eq.rentalPrice || 0)}
                </Text>
              )}
              <ActionIcon
                size='xs'
                color='red'
                variant='subtle'
                onClick={() => handleRemove(eq._id)}
                title='Quitar equipo'
              >
                <FaTrashAlt size={10} />
              </ActionIcon>
            </Group>
          </Group>
        </Stack>
      );
    }

    const unavailableCount = equipmentGroup.filter((eq: any) =>
      isEquipmentUnavailable(statusMap.get(String(eq._id)))
    ).length;

    return (
      <Box key={groupKey}>
        <Stack
          gap='2px'
          style={{
            padding: '6px 8px',
            backgroundColor: unavailableCount > 0
              ? 'rgba(250, 82, 82, 0.08)'
              : 'rgba(255, 255, 255, 0.05)',
            borderRadius: '4px',
            borderLeft: unavailableCount > 0
              ? '3px solid rgba(250, 82, 82, 0.8)'
              : '3px solid rgba(64, 192, 87, 0.7)',
            cursor: 'pointer'
          }}
          onClick={() => toggleGroup(groupKey)}
        >
          <Group justify='space-between' gap='xs'>
            <Group gap='xs' style={{ flex: 1, minWidth: 0 }}>
              {gripBtn}
              <ActionIcon size='xs' variant='subtle' color='gray'>
                {isExpanded ? (
                  <FaChevronDown size={10} />
                ) : (
                  <FaChevronRight size={10} />
                )}
              </ActionIcon>
              <Stack gap='2px' style={{ flex: 1, minWidth: 0 }}>
                <Group gap='6px' wrap='nowrap'>
                  <Text size='sm' fw={600} truncate>
                    {equipmentName} x {quantity}
                  </Text>
                  {unavailableCount > 0 && (
                    <Tooltip
                      label={`${unavailableCount} no disponible(s) por baja/reparación`}
                      withArrow
                    >
                      <Badge color='red' variant='filled' size='xs' style={{ flexShrink: 0 }}>
                        {unavailableCount} no disp.
                      </Badge>
                    </Tooltip>
                  )}
                </Group>
              </Stack>
            </Group>
            <Group gap='4px' style={{ flexShrink: 0 }}>
              {canViewPrices && (
                <Text size='xs' c='green' fw={700}>
                  {formatPrice(totalPrice)}
                </Text>
              )}
            </Group>
          </Group>
        </Stack>

        {isExpanded && (
          <Stack gap='xs' pl='md' mt='xs'>
            {equipmentGroup.map((eq: any) => {
              const isUnavailable = isEquipmentUnavailable(
                statusMap.get(String(eq._id))
              );
              return (
              <Stack
                key={eq._id}
                gap='2px'
                style={{
                  padding: '6px 8px',
                  backgroundColor: isUnavailable
                    ? 'rgba(250, 82, 82, 0.06)'
                    : 'rgba(255, 255, 255, 0.02)',
                  borderRadius: '4px',
                  borderLeft: isUnavailable
                    ? '2px solid rgba(250, 82, 82, 0.6)'
                    : '2px solid rgba(64, 192, 87, 0.3)'
                }}
              >
                <Group justify='space-between' gap='xs'>
                  <Stack gap='2px' style={{ flex: 1, minWidth: 0 }}>
                    <Group gap='6px' wrap='nowrap'>
                      <Text size='sm' fw={500} truncate>
                        {eq.name}
                      </Text>
                      {unavailableBadge(eq)}
                    </Group>
                    <Text size='10px' c='dimmed'>
                      Código: {eq.code || 'N/A'}
                    </Text>
                  </Stack>
                  <Group gap='4px' style={{ flexShrink: 0 }}>
                    {canViewPrices && (
                      <Text size='xs' c='green' fw={600}>
                        {formatPrice(eq.rentalPrice || 0)}
                      </Text>
                    )}
                    <ActionIcon
                      size='xs'
                      color='red'
                      variant='subtle'
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(eq._id);
                      }}
                      title='Quitar equipo'
                    >
                      <FaTrashAlt size={10} />
                    </ActionIcon>
                  </Group>
                </Group>
              </Stack>
              );
            })}
          </Stack>
        )}
      </Box>
    );
  };

  return (
    <Box
      style={
        isDragOverlay
          ? {
              backgroundColor: 'var(--mantine-color-dark-7)',
              borderRadius: '8px',
              padding: '8px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              border: '1px solid rgba(64, 192, 87, 0.4)'
            }
          : undefined
      }
    >
      <Group gap='4px' mb='xs' style={{ userSelect: 'none' }}>
        <ActionIcon
          size='xs'
          variant='transparent'
          style={{
            cursor: 'grab',
            color: 'rgba(255,255,255,0.3)',
            flexShrink: 0,
            touchAction: 'none'
          }}
          title='Arrastrar para reordenar'
          {...(dragHandleProps || {})}
        >
          <FaGripVertical size={10} />
        </ActionIcon>
        <Text
          size='sm'
          fw={700}
          tt='uppercase'
          style={{
            color: 'rgba(64, 192, 87, 0.9)',
            letterSpacing: '0.5px',
            marginLeft: '2px'
          }}
        >
          {categoryName}
        </Text>
      </Group>

      <Stack gap='xs' pl='xs'>
        {isDragOverlay || !onReorderItems ? (
          orderedNames.map((equipmentName) => renderNameGroup(equipmentName, {}))
        ) : (
          <DndContext
            sensors={itemSensors}
            collisionDetection={closestCenter}
            onDragEnd={handleItemDragEnd}
          >
            <SortableContext items={orderedNames} strategy={verticalListSortingStrategy}>
              {orderedNames.map((equipmentName) => (
                <SortableNameGroup key={equipmentName} id={equipmentName}>
                  {(grip) => renderNameGroup(equipmentName, grip)}
                </SortableNameGroup>
              ))}
            </SortableContext>
          </DndContext>
        )}

        {/* Negativos / a tercerizar (en rojo) */}
        {extraForCategory.map((neg) => (
          <Stack
            key={`neg-${neg.name}`}
            gap='2px'
            style={{
              padding: '6px 8px',
              backgroundColor: 'rgba(250, 82, 82, 0.08)',
              borderRadius: '4px',
              borderLeft: '3px solid rgba(250, 82, 82, 0.8)'
            }}
          >
            <Group justify='space-between' gap='xs'>
              <Stack gap='2px' style={{ flex: 1, minWidth: 0 }}>
                <Text size='sm' fw={600} c='red' truncate>
                  {neg.name} x {neg.quantity}
                </Text>
                <Text size='10px' c='red' style={{ opacity: 0.85 }}>
                  A tercerizar (excede stock)
                </Text>
              </Stack>
              {!isDragOverlay && handleRemoveNegative && (
                <ActionIcon
                  size='xs'
                  color='red'
                  variant='subtle'
                  onClick={() => handleRemoveNegative(neg.name, neg.mainCategoryName || categoryName)}
                  title='Quitar a tercerizar'
                >
                  <FaTrashAlt size={10} />
                </ActionIcon>
              )}
            </Group>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}

type EquipmentListProps = {
  equipmentList: NewEquipment[];
  setEventEquipment: React.Dispatch<React.SetStateAction<EventModel>>;
  setTotal: React.Dispatch<React.SetStateAction<number>>;
  equipmentCategoryOrder?: string[];
  allowSave?: boolean;
  onSave?: () => void;
  onReorder?: (newOrder: string[]) => void;
  extraEquipment?: { name: string; quantity: number; mainCategoryName?: string; categoryId?: string }[];
  equipmentItemOrder?: { [categoryName: string]: string[] };
  onReorderItems?: (newItemOrder: { [categoryName: string]: string[] }) => void;
};

export default function EquipmentList({
  equipmentList,
  setEventEquipment,
  setTotal,
  equipmentCategoryOrder,
  allowSave = false,
  onSave,
  onReorder,
  extraEquipment = [],
  equipmentItemOrder = {},
  onReorderItems
}: EquipmentListProps) {
  const { can } = usePermissions();
  const canViewPrices = can('canViewEquipmentPrices');
  const statusMap = useEquipmentStatusMap();
  const [categories, setCategories] = useState<any[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [categoryOrder, setCategoryOrder] = useState<string[]>(equipmentCategoryOrder || []);
  const categoryOrderRef = React.useRef<string[]>(equipmentCategoryOrder || []);
  // savedOrderRef preserva el orden del DB/drag y NO se actualiza por el sync effect.
  // Esto evita que renders intermedios (antes de cargar categorías) corrompan el orden.
  const savedOrderRef = React.useRef<string[]>(equipmentCategoryOrder || []);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const isDraggingRef = React.useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Cargar categorías
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/categories');
        const data = await response.json();
        setCategories(data);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    fetchCategories();
  }, []);

  const handleRemove = (id: string) => {
    setEventEquipment((prev) => ({
      ...prev,
      equipment: prev.equipment.filter((eq) => eq._id !== id)
    }));
  };

  // Quitar un negativo (a tercerizar) por nombre + categoría
  const handleRemoveNegative = (name: string, mainCategoryName: string) => {
    setEventEquipment((prev) => ({
      ...prev,
      extraEquipment: (prev.extraEquipment || []).filter(
        (e) => !(e.name === name && (e.mainCategoryName || 'Sin categoría') === mainCategoryName)
      )
    }));
  };

  // Reordenar equipos dentro de una categoría → actualiza el mapa y persiste
  const handleReorderItems = (categoryName: string, newNames: string[]) => {
    const newItemOrder = { ...(equipmentItemOrder || {}), [categoryName]: newNames };
    setEventEquipment((prev) => ({ ...prev, equipmentItemOrder: newItemOrder }));
    onReorderItems?.(newItemOrder);
  };

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey);
      } else {
        newSet.add(groupKey);
      }
      return newSet;
    });
  };

  const total = equipmentList.reduce(
    (acc, eq) => acc + (eq.rentalPrice || 0),
    0
  );

  useEffect(() => {
    setTotal(total);
  }, [total]);

  // Agrupar equipos por categoría principal
  const groupedEquipment = equipmentList.reduce((acc: any, eq: any) => {
    let mainCategoryName = eq.mainCategoryName;

    if (!mainCategoryName && eq.categoryId && categories.length > 0) {
      const mainCategory = findMainCategorySync(eq.categoryId, categories);
      mainCategoryName = mainCategory?.name || 'Sin categoría';
    }

    if (!mainCategoryName) {
      mainCategoryName = 'Sin categoría';
    }

    if (!acc[mainCategoryName]) {
      acc[mainCategoryName] = [];
    }
    acc[mainCategoryName].push(eq);
    return acc;
  }, {});

  // Agrupar negativos (a tercerizar) por categoría principal
  const extraByCategory = (extraEquipment || []).reduce(
    (acc: { [cat: string]: typeof extraEquipment }, item) => {
      let cat = item.mainCategoryName;
      if (!cat && item.categoryId && categories.length > 0) {
        cat = findMainCategorySync(item.categoryId, categories)?.name;
      }
      if (!cat) cat = 'Sin categoría';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    },
    {}
  );

  // Categorías presentes = reales + las que solo tienen negativos
  const currentCategories = Array.from(
    new Set([...Object.keys(groupedEquipment), ...Object.keys(extraByCategory)])
  );

  // Orden final: respetar categoryOrder para las presentes, resto al final
  const orderedCategories = [
    ...categoryOrder.filter((cat) => currentCategories.includes(cat)),
    ...currentCategories.filter((cat) => !categoryOrder.includes(cat))
  ];
  const orderedCategoriesRef = React.useRef(orderedCategories);
  orderedCategoriesRef.current = orderedCategories;

  // Sincronizar categoryOrder cuando cambian los items (NO durante drag)
  useEffect(() => {
    if (isDraggingRef.current) return;

    // Usar savedOrderRef (orden del DB o último drag) como base, no categoryOrderRef
    // que puede haberse corrompido por renders intermedios con categorías incompletas
    const saved = savedOrderRef.current;
    const filtered = saved.filter((cat) => currentCategories.includes(cat));
    const newOnes = currentCategories.filter((cat) => !saved.includes(cat));
    const merged = [...filtered, ...newOnes];
    const prev = categoryOrderRef.current;

    const changed =
      merged.length !== prev.length ||
      merged.some((v, i) => v !== prev[i]);

    if (changed) {
      categoryOrderRef.current = merged;
      setCategoryOrder(merged);
      setEventEquipment((prevEvent) => ({ ...prevEvent, equipmentCategoryOrder: merged }));
    }
  }, [currentCategories.join(',')]);

  const handleDragStart = (event: DragStartEvent) => {
    isDraggingRef.current = true;
    setActiveDragId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    isDraggingRef.current = false;
    setActiveDragId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const current = orderedCategoriesRef.current;
    const oldIndex = current.indexOf(active.id as string);
    const newIndex = current.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;
    const newOrder = arrayMove(current, oldIndex, newIndex);

    savedOrderRef.current = newOrder;
    categoryOrderRef.current = newOrder;
    setCategoryOrder(newOrder);
    setEventEquipment((prev) => ({ ...prev, equipmentCategoryOrder: newOrder }));
    onReorder?.(newOrder);
  };

  if (!equipmentList?.length && !extraEquipment?.length) {
    return (
      <Text size='sm' c='dimmed' ta='center'>
        No hay equipos seleccionados
      </Text>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <Stack gap={0} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box style={{ flex: 1, overflowY: 'auto', padding: '0 4px' }}>
          <Stack gap='md'>
            <SortableContext
              items={orderedCategories}
              strategy={verticalListSortingStrategy}
            >
              {orderedCategories.map((categoryName) => (
                <SortableCategoryItem
                  key={categoryName}
                  categoryName={categoryName}
                  groupedEquipment={groupedEquipment}
                  expandedGroups={expandedGroups}
                  toggleGroup={toggleGroup}
                  handleRemove={handleRemove}
                  canViewPrices={canViewPrices}
                  statusMap={statusMap}
                  extraForCategory={extraByCategory[categoryName] || []}
                  handleRemoveNegative={handleRemoveNegative}
                  itemOrder={equipmentItemOrder[categoryName] || []}
                  onReorderItems={handleReorderItems}
                />
              ))}
            </SortableContext>
          </Stack>
        </Box>

        <Box style={{ flexShrink: 0, padding: '8px 4px' }}>
          <Divider my='xs' />

          {canViewPrices && (
            <Group justify='space-between' px='xs'>
              <Text fw={500}>Total:</Text>
              <Text fw={600}>{formatPrice(total)}</Text>
            </Group>
          )}
          {allowSave && (
            <Group justify='center' px='xs' onClick={onSave}>
              <Button>Guardar Cambios</Button>
            </Group>
          )}
        </Box>
      </Stack>

      <DragOverlay>
        {activeDragId ? (
          <CategoryContent
            categoryName={activeDragId}
            groupedEquipment={groupedEquipment}
            expandedGroups={expandedGroups}
            toggleGroup={() => {}}
            handleRemove={() => {}}
            canViewPrices={canViewPrices}
            statusMap={statusMap}
            extraForCategory={extraByCategory[activeDragId] || []}
            itemOrder={equipmentItemOrder[activeDragId] || []}
            isDragOverlay
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
