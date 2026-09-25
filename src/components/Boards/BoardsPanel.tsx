'use client';
import { useEffect, useMemo, useState } from 'react';
import useSWR, { mutate as globalMutate } from 'swr';
import {
  Box,
  Group,
  Title,
  Button,
  Text,
  Modal,
  TextInput,
  Textarea,
  Stack,
  ActionIcon,
  Tooltip,
  ScrollArea,
  Paper,
  Select,
  MultiSelect,
  Badge,
  Loader,
  Center
} from '@mantine/core';
import {
  IconPlus,
  IconPencil,
  IconTrash,
  IconLayoutKanban,
  IconLock,
  IconWorld,
  IconUsers
} from '@tabler/icons-react';
import useNotification from '@/hooks/useNotification';
import { usePermissions } from '@/hooks/usePermissions';
import { useMyEmployee } from '@/hooks/useMyEmployee';
import { EmployeeModel } from '@/context/types';
import { Board } from '@/types/boards';
import BoardView from './BoardView';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type VisibilityPreset = 'all' | 'private' | 'selected';

// Deriva el preset de visibilidad a partir del tablero guardado
function presetOf(board: Board): VisibilityPreset {
  if (board.visibility !== 'restricted') return 'all';
  // El dueño va siempre en memberIds: "Solo yo" = ningún otro miembro. (Un
  // tablero viejo sin dueño con 1 miembro es 'selected', no privado.)
  const others = (board.memberIds || []).filter((id) => id !== board.ownerId);
  return others.length === 0 ? 'private' : 'selected';
}

export default function BoardsPanel() {
  const notify = useNotification();
  const { isAdmin } = usePermissions();
  // Mi registro de STAFF: es la identidad con la que se guarda dueño y miembros.
  const { employeeId: myEmployeeId } = useMyEmployee();

  const { data, mutate } = useSWR<{
    boards: Board[];
    firstBoardTasks?: { boardId: string; tasks: any[] };
  }>('/api/boards?withTasks=1', fetcher, {
    revalidateOnFocus: true,
    // Las tareas del primer tablero vienen en la misma respuesta: se cargan en
    // la caché de SWR de ese tablero para que BoardView las muestre sin esperar
    onSuccess: (res) => {
      if (res?.firstBoardTasks) {
        const { boardId, tasks } = res.firstBoardTasks;
        globalMutate(`/api/tasks?boardId=${boardId}`, { tasks }, { revalidate: false });
      }
    }
  });
  const boards = useMemo(() => data?.boards || [], [data]);

  // Directorio completo (solo lo necesita el admin para el selector de miembros).
  // directory=true incluye a quienes entran a la app sin ser personal de eventos.
  const { data: directoryData } = useSWR<(EmployeeModel & { _id: string })[]>(
    isAdmin ? '/api/employees?directory=true' : null,
    fetcher
  );
  const directory = useMemo(
    () => (Array.isArray(directoryData) ? directoryData : []),
    [directoryData]
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [boardModalOpen, setBoardModalOpen] = useState(false);
  const [editingBoard, setEditingBoard] = useState<Board | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<VisibilityPreset>('all');
  const [members, setMembers] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [attempted, setAttempted] = useState(false);

  // Seleccionar el primer tablero por defecto / al borrar el activo
  useEffect(() => {
    if (boards.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !boards.some((b) => b._id === selectedId)) {
      setSelectedId(boards[0]._id);
    }
  }, [boards, selectedId]);

  const selectedBoard = boards.find((b) => b._id === selectedId) || null;

  // Dueño del tablero en edición (o yo, si estoy creando). Va siempre incluido.
  const ownerId = editingBoard ? editingBoard.ownerId || null : myEmployeeId;

  // Opciones del multiselect: todos menos el dueño (que está fijo)
  const memberOptions = directory
    .filter((emp) => emp._id && String(emp._id) !== ownerId)
    .map((emp) => ({
      value: String(emp._id),
      label: emp.fullName || emp.email || String(emp._id)
    }));

  const openCreate = () => {
    setEditingBoard(null);
    setName('');
    setDescription('');
    setVisibility('all');
    setMembers([]);
    setAttempted(false);
    setBoardModalOpen(true);
  };

  const openEdit = (board: Board) => {
    setEditingBoard(board);
    setName(board.name);
    setDescription(board.description || '');
    setVisibility(presetOf(board));
    setMembers((board.memberIds || []).filter((id) => id !== board.ownerId));
    setAttempted(false);
    setBoardModalOpen(true);
  };

  const handleSaveBoard = async () => {
    if (!name.trim()) {
      setAttempted(true);
      return;
    }
    setSaving(true);
    notify({ loading: true });
    try {
      const payload: any = editingBoard
        ? { id: editingBoard._id, name, description }
        : { name, description };

      // La visibilidad SOLO la manda el admin (el backend igual la ignora si no lo es)
      if (isAdmin) {
        if (visibility === 'all') {
          payload.visibility = 'all';
        } else if (visibility === 'private') {
          payload.visibility = 'restricted';
          payload.memberIds = [];
        } else {
          payload.visibility = 'restricted';
          payload.memberIds = members;
        }
      }

      const res = await fetch('/api/boards', {
        method: editingBoard ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Error');
      notify({ message: editingBoard ? 'Tablero actualizado' : 'Tablero creado' });
      setBoardModalOpen(false);
      await mutate();
      if (!editingBoard && result.board?._id) {
        setSelectedId(result.board._id);
      }
    } catch (error) {
      console.error(error);
      notify({ type: 'defaultError' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBoard = async (board: Board) => {
    if (
      !window.confirm(
        `¿Eliminar el tablero "${board.name}" y todas sus tareas? Esta acción no se puede deshacer.`
      )
    )
      return;
    notify({ loading: true });
    try {
      const res = await fetch(`/api/boards?id=${board._id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error');
      notify({ message: 'Tablero eliminado' });
      if (selectedId === board._id) setSelectedId(null);
      mutate();
    } catch (error) {
      console.error(error);
      notify({ type: 'defaultError' });
    }
  };

  // Indicador de visibilidad para el header del tablero
  const visibilityBadge = (board: Board) => {
    if (board.visibility !== 'restricted') {
      return (
        <Badge color='gray' variant='light' size='sm' leftSection={<IconWorld size={12} />}>
          Todos
        </Badge>
      );
    }
    // Mismo criterio que presetOf: el dueño no cuenta como "otro"
    const count = (board.memberIds || []).length;
    const others = (board.memberIds || []).filter((id) => id !== board.ownerId);
    if (others.length === 0) {
      return (
        <Badge color='grape' variant='light' size='sm' leftSection={<IconLock size={12} />}>
          Privado
        </Badge>
      );
    }
    return (
      <Badge color='grape' variant='light' size='sm' leftSection={<IconUsers size={12} />}>
        {count} personas
      </Badge>
    );
  };

  return (
    <Box p='md'>
      <Group justify='space-between' mb='md' wrap='wrap' gap='sm'>
        <Group gap='xs'>
          <IconLayoutKanban size={26} />
          <Title order={2}>Comunicación interna</Title>
        </Group>
        <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>
          Nuevo tablero
        </Button>
      </Group>

      {!data ? (
        <Center py='xl'>
          <Stack align='center' gap='xs'>
            <Loader size='md' />
            <Text size='sm' c='dimmed'>
              Cargando tableros...
            </Text>
          </Stack>
        </Center>
      ) : boards.length === 0 ? (
        <Paper withBorder p='xl' radius='md' ta='center'>
          <Text c='dimmed' mb='md'>
            No hay tableros todavía. Creá el primero para empezar a organizar tareas del equipo.
          </Text>
          <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>
            Crear tablero
          </Button>
        </Paper>
      ) : (
        <>
          {/* Selector de tableros */}
          <ScrollArea type='auto' offsetScrollbars mb='md'>
            <Group gap='xs' wrap='nowrap' style={{ minWidth: 'min-content' }}>
              {boards.map((board) => (
                <Button
                  key={board._id}
                  variant={board._id === selectedId ? 'filled' : 'light'}
                  color={board._id === selectedId ? 'blue' : 'gray'}
                  onClick={() => setSelectedId(board._id)}
                  style={{ flexShrink: 0 }}
                  leftSection={
                    board.visibility === 'restricted' ? <IconLock size={13} /> : undefined
                  }
                >
                  {board.name}
                </Button>
              ))}
            </Group>
          </ScrollArea>

          {selectedBoard && (
            <>
              <Group justify='space-between' mb='sm'>
                <Box>
                  <Group gap='xs' align='center'>
                    <Text fw={700} size='lg'>
                      {selectedBoard.name}
                    </Text>
                    {visibilityBadge(selectedBoard)}
                  </Group>
                  {selectedBoard.description && (
                    <Text size='sm' c='dimmed'>
                      {selectedBoard.description}
                    </Text>
                  )}
                </Box>
                <Group gap='xs'>
                  <Tooltip label='Editar tablero' withArrow>
                    <ActionIcon variant='light' color='blue' onClick={() => openEdit(selectedBoard)}>
                      <IconPencil size={18} />
                    </ActionIcon>
                  </Tooltip>
                  {/* Eliminar: solo admin */}
                  {isAdmin && (
                    <Tooltip label='Eliminar tablero' withArrow>
                      <ActionIcon
                        variant='light'
                        color='red'
                        onClick={() => handleDeleteBoard(selectedBoard)}
                      >
                        <IconTrash size={18} />
                      </ActionIcon>
                    </Tooltip>
                  )}
                </Group>
              </Group>

              <BoardView board={selectedBoard} />
            </>
          )}
        </>
      )}

      {/* Modal crear/editar tablero */}
      <Modal
        opened={boardModalOpen}
        onClose={() => setBoardModalOpen(false)}
        title={editingBoard ? 'Editar tablero' : 'Nuevo tablero'}
        centered
      >
        <Stack gap='sm'>
          <TextInput
            label='Nombre'
            placeholder='Ej: Evento Boda García'
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            error={attempted && !name.trim() ? 'El nombre es obligatorio' : undefined}
            required
            data-autofocus
          />
          <Textarea
            label='Descripción'
            placeholder='Opcional'
            value={description}
            onChange={(e) => setDescription(e.currentTarget.value)}
            autosize
            minRows={2}
            maxRows={5}
          />

          {/* Visibilidad: SOLO admin */}
          {isAdmin && (
            <>
              <Select
                label='Visibilidad'
                description='Quién puede ver este tablero'
                data={[
                  { value: 'all', label: 'Todos' },
                  { value: 'private', label: 'Solo yo' },
                  { value: 'selected', label: 'Usuarios seleccionados' }
                ]}
                value={visibility}
                onChange={(v) => v && setVisibility(v as VisibilityPreset)}
                allowDeselect={false}
              />
              {visibility === 'selected' && (
                <MultiSelect
                  label='Usuarios con acceso'
                  description='El dueño siempre tiene acceso. Agregá a quién más puede verlo.'
                  placeholder={memberOptions.length ? 'Elegí usuarios' : 'No hay otros usuarios registrados'}
                  data={memberOptions}
                  value={members}
                  onChange={setMembers}
                  searchable
                  clearable
                  nothingFoundMessage='Sin resultados'
                />
              )}
            </>
          )}

          <Group justify='flex-end' mt='sm'>
            <Button variant='light' color='gray' onClick={() => setBoardModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveBoard} loading={saving}>
              {editingBoard ? 'Guardar' : 'Crear'}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
