'use client';
import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
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
  Paper
} from '@mantine/core';
import { IconPlus, IconPencil, IconTrash, IconLayoutKanban } from '@tabler/icons-react';
import useNotification from '@/hooks/useNotification';
import { Board } from '@/types/boards';
import BoardView from './BoardView';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function BoardsPanel() {
  const notify = useNotification();
  const { data, mutate } = useSWR<{ boards: Board[] }>('/api/boards', fetcher, {
    revalidateOnFocus: true
  });
  const boards = useMemo(() => data?.boards || [], [data]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [boardModalOpen, setBoardModalOpen] = useState(false);
  const [editingBoard, setEditingBoard] = useState<Board | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
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

  const openCreate = () => {
    setEditingBoard(null);
    setName('');
    setDescription('');
    setAttempted(false);
    setBoardModalOpen(true);
  };

  const openEdit = (board: Board) => {
    setEditingBoard(board);
    setName(board.name);
    setDescription(board.description || '');
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
      const res = await fetch('/api/boards', {
        method: editingBoard ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          editingBoard
            ? { id: editingBoard._id, name, description }
            : { name, description }
        )
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Error');
      notify({ message: editingBoard ? 'Tablero actualizado' : 'Tablero creado' });
      setBoardModalOpen(false);
      await mutate();
      // Seleccionar el recién creado
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
      await fetch(`/api/boards?id=${board._id}`, { method: 'DELETE' });
      notify({ message: 'Tablero eliminado' });
      if (selectedId === board._id) setSelectedId(null);
      mutate();
    } catch (error) {
      console.error(error);
      notify({ type: 'defaultError' });
    }
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

      {boards.length === 0 ? (
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
                  <Text fw={700} size='lg'>
                    {selectedBoard.name}
                  </Text>
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
                  <Tooltip label='Eliminar tablero' withArrow>
                    <ActionIcon
                      variant='light'
                      color='red'
                      onClick={() => handleDeleteBoard(selectedBoard)}
                    >
                      <IconTrash size={18} />
                    </ActionIcon>
                  </Tooltip>
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
