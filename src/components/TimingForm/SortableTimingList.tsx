'use client';
import React from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export interface TimingItem {
  time: string;
  title: string;
  details: string;
}

type DragHandleProps = Record<string, any>;

function SortableTimingItem({
  id,
  children
}: {
  id: string;
  children: (dragHandleProps: DragHandleProps) => React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    position: 'relative',
    zIndex: isDragging ? 1 : 0
  };

  return (
    <div ref={setNodeRef} style={style}>
      {children({ ...attributes, ...listeners })}
    </div>
  );
}

/**
 * Lista de items de cronograma reordenable por drag & drop.
 * El orden es la posición en el array; al soltar se llama a onReorder con
 * el nuevo array. Reutilizable en creación (new-event) y edición (event/[id]).
 *
 * - `disabled`: renderiza plano sin drag (sin permisos, o mientras se edita).
 * - `renderItem`: cada padre dibuja su propia Card; recibe los props del
 *   handle para engancharlos al ícono de arrastre.
 */
export default function SortableTimingList({
  items,
  onReorder,
  disabled = false,
  renderItem
}: {
  items: TimingItem[];
  onReorder: (newItems: TimingItem[]) => void;
  disabled?: boolean;
  renderItem: (
    item: TimingItem,
    index: number,
    dragHandleProps: DragHandleProps
  ) => React.ReactNode;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  if (disabled) {
    return <>{items.map((item, index) => renderItem(item, index, {}))}</>;
  }

  // El id de cada item es su índice: estable durante el drag porque el
  // reorden se aplica recién al soltar (onDragEnd).
  const ids = items.map((_, i) => String(i));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = Number(active.id);
    const newIndex = Number(over.id);
    if (Number.isNaN(oldIndex) || Number.isNaN(newIndex)) return;
    onReorder(arrayMove(items, oldIndex, newIndex));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {items.map((item, index) => (
          <SortableTimingItem key={index} id={String(index)}>
            {(dragHandleProps) => renderItem(item, index, dragHandleProps)}
          </SortableTimingItem>
        ))}
      </SortableContext>
    </DndContext>
  );
}
