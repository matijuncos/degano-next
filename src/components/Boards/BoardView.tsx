'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';
import {
  Box,
  Group,
  Text,
  Paper,
  Stack,
  Badge,
  ActionIcon,
  Button,
  Tooltip,
  ScrollArea,
  Select
} from '@mantine/core';
import {
  IconPlus,
  IconPencil,
  IconTrash,
  IconCheck,
  IconArrowBackUp,
  IconUser,
  IconFilter
} from '@tabler/icons-react';
import { useUser } from '@auth0/nextjs-auth0/client';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  DragStartEvent,
  DragEndEvent,
  useDroppable
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import useNotification from '@/hooks/useNotification';
import {
  Board,
  Task,
  TaskStatus,
  TASK_STATUSES,
  TASK_STATUS_LABELS
} from '@/types/boards';
import TaskModal from './TaskModal';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const COLUMN_COLORS: Record<TaskStatus, string> = {
  pending: '#fa5252',
  in_progress: '#fab005',
  done: '#40c057'
};

// Iniciales para el avatar del responsable
function initials(name?: string | null) {
  if (!name) return '';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join('');
}

// ----- Card de tarea (sortable) -----
function TaskCard({
  task,
  onEdit,
  onDelete,
  onToggleDone,
  dragging = false
}: {
  task: Task;
  onEdit?: (t: Task) => void;
  onDelete?: (t: Task) => void;
  onToggleDone?: (t: Task) => void;
  dragging?: boolean;
}) {
  const isDone = task.status === 'done';
  return (
    <Paper
      withBorder
      p='xs'
      radius='md'
      style={{
        backgroundColor: 'var(--mantine-color-dark-6)',
        borderLeft: `3px solid ${COLUMN_COLORS[task.status]}`,
        boxShadow: dragging ? '0 8px 24px rgba(0,0,0,0.4)' : undefined
      }}
    >
      <Group justify='space-between' gap='xs' wrap='nowrap' align='flex-start'>
        <Text
          size='sm'
          fw={600}
          style={{
            flex: 1,
            minWidth: 0,
            textDecoration: isDone ? 'line-through' : undefined,
            opacity: isDone ? 0.7 : 1
          }}
        >
          {task.title}
        </Text>
        <Group gap={2} wrap='nowrap' style={{ flexShrink: 0 }}>
          <Tooltip label={isDone ? 'Reabrir' : 'Marcar finalizada'} withArrow>
            <ActionIcon
              size='sm'
              variant='subtle'
              color={isDone ? 'gray' : 'green'}
              onClick={() => onToggleDone?.(task)}
            >
              {isDone ? <IconArrowBackUp size={15} /> : <IconCheck size={15} />}
            </ActionIcon>
          </Tooltip>
          <Tooltip label='Editar' withArrow>
            <ActionIcon size='sm' variant='subtle' color='blue' onClick={() => onEdit?.(task)}>
              <IconPencil size={15} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label='Eliminar' withArrow>
            <ActionIcon size='sm' variant='subtle' color='red' onClick={() => onDelete?.(task)}>
              <IconTrash size={15} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>

      {task.description && (
        <Text size='xs' c='dimmed' mt={4} lineClamp={3}>
          {task.description}
        </Text>
      )}

      {task.assigneeName && (
        <Group gap={6} mt={8} wrap='nowrap'>
          <Badge
            size='sm'
            variant='light'
            color='grape'
            leftSection={<IconUser size={11} />}
          >
            {task.assigneeName}
          </Badge>
        </Group>
      )}
    </Paper>
  );
}

function SortableTaskCard({
  task,
  onEdit,
  onDelete,
  onToggleDone,
  disabled = false
}: {
  task: Task;
  onEdit: (t: Task) => void;
  onDelete: (t: Task) => void;
  onToggleDone: (t: Task) => void;
  disabled?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task._id, disabled });
  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    cursor: disabled ? 'default' : 'grab',
    touchAction: 'none'
  };
  return (
    <div ref={setNodeRef} style={style} {...(disabled ? {} : { ...attributes, ...listeners })}>
      <TaskCard task={task} onEdit={onEdit} onDelete={onDelete} onToggleDone={onToggleDone} />
    </div>
  );
}

// ----- Columna (droppable) -----
function Column({
  status,
  tasks,
  onAdd,
  children
}: {
  status: TaskStatus;
  tasks: Task[];
  onAdd: (status: TaskStatus) => void;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <Box
      style={{
        flex: 1,
        minWidth: 260,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--mantine-color-dark-8)',
        borderRadius: 12,
        padding: 10,
        outline: isOver ? `2px dashed ${COLUMN_COLORS[status]}` : '2px solid transparent'
      }}
    >
      <Group justify='space-between' mb='xs'>
        <Group gap={6}>
          <Box w={10} h={10} style={{ borderRadius: '50%', background: COLUMN_COLORS[status] }} />
          <Text fw={700} size='sm' tt='uppercase'>
            {TASK_STATUS_LABELS[status]}
          </Text>
          <Badge size='sm' variant='light' color='gray'>
            {tasks.length}
          </Badge>
        </Group>
        <Tooltip label='Agregar tarea' withArrow>
          <ActionIcon size='sm' variant='subtle' onClick={() => onAdd(status)}>
            <IconPlus size={16} />
          </ActionIcon>
        </Tooltip>
      </Group>
      <Box ref={setNodeRef} style={{ flex: 1, minHeight: 60 }}>
        <Stack gap='xs'>{children}</Stack>
      </Box>
    </Box>
  );
}

// Agrupa una lista de tareas por columna (estado), ordenadas por `order`
function groupByStatus(list: Task[]): Record<TaskStatus, Task[]> {
  const map: Record<TaskStatus, Task[]> = { pending: [], in_progress: [], done: [] };
  list.forEach((t) => {
    (map[t.status] || map.pending).push(t);
  });
  (Object.keys(map) as TaskStatus[]).forEach((s) => map[s].sort((a, b) => a.order - b.order));
  return map;
}

export default function BoardView({ board }: { board: Board }) {
  const notify = useNotification();
  const { user } = useUser();
  const myName = (user?.name || '').trim().toLowerCase();
  const swrKey = `/api/tasks?boardId=${board._id}`;
  const { data, mutate } = useSWR<{ tasks: Task[] }>(swrKey, fetcher, {
    refreshInterval: 12000,
    revalidateOnFocus: true
  });

  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [createStatus, setCreateStatus] = useState<TaskStatus>('pending');
  // Filtro de vista por responsable: 'all' | 'mine' | 'unassigned' | assigneeId
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const isDraggingRef = useRef(false);

  // Sincronizar el estado local con el servidor, salvo mientras se arrastra
  useEffect(() => {
    if (isDraggingRef.current) return;
    if (data?.tasks) setTasks(data.tasks);
  }, [data]);

  // Resetear el filtro al cambiar de tablero
  useEffect(() => {
    setAssigneeFilter('all');
  }, [board._id]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const filtering = assigneeFilter !== 'all';

  // ¿La tarea es "mía"? Se matchea por nombre del responsable vs el del usuario
  // logueado (no hay vínculo formal empleado↔usuario Auth0).
  const isMine = (t: Task) =>
    !!myName && (t.assigneeName || '').trim().toLowerCase() === myName;

  const matchesFilter = (t: Task) => {
    if (assigneeFilter === 'all') return true;
    if (assigneeFilter === 'mine') return isMine(t);
    if (assigneeFilter === 'unassigned') return !t.assigneeId;
    return t.assigneeId === assigneeFilter;
  };

  // Opciones del filtro: Todos / Mías / cada responsable presente / Sin asignar
  const filterOptions = useMemo(() => {
    const byId = new Map<string, string>();
    let hasUnassigned = false;
    tasks.forEach((t) => {
      if (t.assigneeId && t.assigneeName) byId.set(t.assigneeId, t.assigneeName);
      else if (!t.assigneeId) hasUnassigned = true;
    });
    const opts = [
      { value: 'all', label: 'Todas' },
      { value: 'mine', label: 'Mías' }
    ];
    Array.from(byId.entries())
      .sort((a, b) => a[1].localeCompare(b[1]))
      .forEach(([id, label]) => opts.push({ value: id, label }));
    if (hasUnassigned) opts.push({ value: 'unassigned', label: 'Sin asignar' });
    return opts;
  }, [tasks]);

  // Columnas completas (para el drag&drop) y columnas de vista (filtradas)
  const columns = useMemo(() => groupByStatus(tasks), [tasks]);
  const viewColumns = useMemo(
    () => groupByStatus(tasks.filter(matchesFilter)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tasks, assigneeFilter, myName]
  );

  const activeTask = activeId ? tasks.find((t) => t._id === activeId) : null;

  // Persistir el orden/estado completo del tablero tras un cambio
  const persist = async (next: Task[]) => {
    try {
      await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reorder: next.map((t) => ({ id: t._id, status: t.status, order: t.order }))
        })
      });
      mutate();
    } catch (error) {
      console.error(error);
      // Surface el error (el hook usa update sobre un id, necesita el show previo)
      notify({ loading: true });
      notify({ type: 'defaultError' });
      mutate();
    }
  };

  // Recalcular order dentro de cada columna y devolver lista plana
  const reindex = (byColumn: Record<TaskStatus, Task[]>): Task[] => {
    const flat: Task[] = [];
    (Object.keys(byColumn) as TaskStatus[]).forEach((status) => {
      byColumn[status].forEach((t, idx) => {
        flat.push({ ...t, status, order: idx });
      });
    });
    return flat;
  };

  const handleDragStart = (event: DragStartEvent) => {
    isDraggingRef.current = true;
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    isDraggingRef.current = false;
    const { active, over } = event;
    setActiveId(null);
    if (filtering) return; // con filtro activo el tablero es de solo lectura
    if (!over) return;

    const activeTaskItem = tasks.find((t) => t._id === active.id);
    if (!activeTaskItem) return;

    const sourceStatus = activeTaskItem.status;
    const overId = String(over.id);

    // Destino: columna directa o la columna de la tarea sobre la que se soltó
    let destStatus: TaskStatus;
    if ((TASK_STATUSES as string[]).includes(overId)) {
      destStatus = overId as TaskStatus;
    } else {
      const overTask = tasks.find((t) => t._id === overId);
      destStatus = overTask ? overTask.status : sourceStatus;
    }

    // Copia mutable de columnas
    const byColumn: Record<TaskStatus, Task[]> = {
      pending: [...columns.pending],
      in_progress: [...columns.in_progress],
      done: [...columns.done]
    };

    // Sacar de la columna origen
    const fromIdx = byColumn[sourceStatus].findIndex((t) => t._id === active.id);
    if (fromIdx === -1) return;
    const [moved] = byColumn[sourceStatus].splice(fromIdx, 1);

    // Insertar en el destino
    if ((TASK_STATUSES as string[]).includes(overId)) {
      byColumn[destStatus].push(moved); // soltó en zona vacía de la columna
    } else {
      const overIdx = byColumn[destStatus].findIndex((t) => t._id === overId);
      byColumn[destStatus].splice(overIdx === -1 ? byColumn[destStatus].length : overIdx, 0, moved);
    }

    const next = reindex(byColumn);
    setTasks(next); // optimista
    persist(next);
  };

  // Marcar finalizada / reabrir (append al final de la columna destino)
  const toggleDone = (task: Task) => {
    const target: TaskStatus = task.status === 'done' ? 'pending' : 'done';
    const byColumn: Record<TaskStatus, Task[]> = {
      pending: [...columns.pending],
      in_progress: [...columns.in_progress],
      done: [...columns.done]
    };
    byColumn[task.status] = byColumn[task.status].filter((t) => t._id !== task._id);
    byColumn[target].push({ ...task, status: target });
    const next = reindex(byColumn);
    setTasks(next);
    persist(next);
  };

  const handleDelete = async (task: Task) => {
    if (!window.confirm(`¿Eliminar la tarea "${task.title}"?`)) return;
    setTasks((prev) => prev.filter((t) => t._id !== task._id)); // optimista
    notify({ loading: true });
    try {
      await fetch(`/api/tasks?id=${task._id}`, { method: 'DELETE' });
      notify({ message: 'Tarea eliminada' });
      mutate();
    } catch (error) {
      console.error(error);
      notify({ type: 'defaultError' });
      mutate();
    }
  };

  const openCreate = (status: TaskStatus) => {
    setEditingTask(null);
    setCreateStatus(status);
    setModalOpen(true);
  };

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setModalOpen(true);
  };

  return (
    <>
      {/* Filtro por responsable */}
      <Group mb='sm' gap='xs' wrap='wrap'>
        <Select
          leftSection={<IconFilter size={15} />}
          data={filterOptions}
          value={assigneeFilter}
          onChange={(v) => setAssigneeFilter(v || 'all')}
          allowDeselect={false}
          size='xs'
          w={220}
          aria-label='Filtrar por responsable'
        />
        {filtering && (
          <Text size='xs' c='dimmed'>
            Vista filtrada (solo lectura). Poné “Todas” para reordenar.
          </Text>
        )}
      </Group>

      <ScrollArea type='auto' offsetScrollbars>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <Group align='stretch' gap='md' wrap='nowrap' style={{ minWidth: 'min-content' }}>
            {TASK_STATUSES.map((status) => (
              <Column key={status} status={status} tasks={viewColumns[status]} onAdd={openCreate}>
                <SortableContext
                  items={viewColumns[status].map((t) => t._id)}
                  strategy={verticalListSortingStrategy}
                >
                  {viewColumns[status].length === 0 ? (
                    <Text size='xs' c='dimmed' ta='center' py='md'>
                      Sin tareas
                    </Text>
                  ) : (
                    viewColumns[status].map((task) => (
                      <SortableTaskCard
                        key={task._id}
                        task={task}
                        onEdit={openEdit}
                        onDelete={handleDelete}
                        onToggleDone={toggleDone}
                        disabled={filtering}
                      />
                    ))
                  )}
                </SortableContext>
              </Column>
            ))}
          </Group>

          <DragOverlay>
            {activeTask ? <TaskCard task={activeTask} dragging /> : null}
          </DragOverlay>
        </DndContext>
      </ScrollArea>

      <Button
        variant='light'
        leftSection={<IconPlus size={16} />}
        mt='md'
        onClick={() => openCreate('pending')}
      >
        Nueva tarea
      </Button>

      <TaskModal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        boardId={board._id}
        task={editingTask}
        initialStatus={createStatus}
        onSaved={() => mutate()}
      />
    </>
  );
}
