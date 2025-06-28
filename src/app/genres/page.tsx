'use client';

import {
  ActionIcon,
  Box,
  Button,
  Card,
  Container,
  Flex,
  Group,
  Input,
  Modal,
  Stack,
  Text,
  Title,
  Textarea
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconEdit, IconPlus, IconTrash } from '@tabler/icons-react';
import React, { useEffect, useState } from 'react';

interface Genre {
  _id: string;
  name: string;
}

const GenresPage = () => {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(false);
  const [newGenres, setNewGenres] = useState('');
  const [editingGenre, setEditingGenre] = useState<Genre | null>(null);
  const [editName, setEditName] = useState('');
  const [opened, { open, close }] = useDisclosure(false);
  const [editOpened, { open: openEdit, close: closeEdit }] =
    useDisclosure(false);

  // Fetch genres
  const fetchGenres = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/genres');
      const data = await response.json();
      setGenres(data.genres || []);
    } catch (error) {
      console.error('Error fetching genres:', error);
    } finally {
      setLoading(false);
    }
  };

  // Create genres
  const createGenres = async () => {
    if (!newGenres.trim()) return;

    try {
      setLoading(true);
      const genresList = newGenres
        .split('\n')
        .filter((g) => g.trim())
        .map((g) => g.trim());

      const response = await fetch('/api/genres', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ genres: genresList })
      });

      if (response.ok) {
        setNewGenres('');
        close();
        fetchGenres();
      }
    } catch (error) {
      console.error('Error creating genres:', error);
    } finally {
      setLoading(false);
    }
  };

  // Update genre
  const updateGenre = async () => {
    if (!editingGenre || !editName.trim()) return;

    try {
      setLoading(true);
      const response = await fetch('/api/genres', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingGenre._id,
          name: editName.trim()
        })
      });

      if (response.ok) {
        closeEdit();
        setEditingGenre(null);
        setEditName('');
        fetchGenres();
      }
    } catch (error) {
      console.error('Error updating genre:', error);
    } finally {
      setLoading(false);
    }
  };

  // Delete genre
  const deleteGenre = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este género?')) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/genres?id=${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchGenres();
      }
    } catch (error) {
      console.error('Error deleting genre:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle edit click
  const handleEdit = (genre: Genre) => {
    setEditingGenre(genre);
    setEditName(genre.name);
    openEdit();
  };

  useEffect(() => {
    fetchGenres();
  }, []);

  return (
    <Container size='md' py='xl'>
      <Stack gap='xl'>
        {/* Header */}
        <Flex justify='space-between' align='center'>
          <Title order={1}>Gestión de Géneros</Title>
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={open}
            loading={loading}
          >
            Agregar Géneros
          </Button>
        </Flex>

        {/* Genres Grid */}
        <Box>
          {loading && genres.length === 0 ? (
            <Text ta='center' c='dimmed'>
              Cargando géneros...
            </Text>
          ) : genres.length === 0 ? (
            <Card p='xl'>
              <Text ta='center' c='dimmed'>
                No se encontraron géneros. ¡Crea tu primer género!
              </Text>
            </Card>
          ) : (
            <Stack gap='sm'>
              {genres.map((genre) => (
                <Card key={genre._id} p='md' withBorder>
                  <Flex justify='space-between' align='center'>
                    <Text fw={500} size='lg'>
                      {genre.name}
                    </Text>
                    <Group gap='xs'>
                      <ActionIcon
                        variant='subtle'
                        color='blue'
                        onClick={() => handleEdit(genre)}
                        disabled={loading}
                      >
                        <IconEdit size={16} />
                      </ActionIcon>
                      <ActionIcon
                        variant='subtle'
                        color='red'
                        onClick={() => deleteGenre(genre._id)}
                        disabled={loading}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Group>
                  </Flex>
                </Card>
              ))}
            </Stack>
          )}
        </Box>

        {/* Create Modal */}
        <Modal
          opened={opened}
          onClose={close}
          title='Agregar Nuevos Géneros'
          size='md'
        >
          <Stack gap='md'>
            <Text size='sm' c='dimmed'>
              Ingresa los géneros, uno por línea:
            </Text>
            <Textarea
              placeholder='Rock&#10;Pop&#10;Jazz&#10;Clásica'
              value={newGenres}
              onChange={(e) => setNewGenres(e.target.value)}
              minRows={4}
              maxRows={8}
            />
            <Group justify='flex-end'>
              <Button variant='subtle' onClick={close} disabled={loading}>
                Cancelar
              </Button>
              <Button onClick={createGenres} loading={loading}>
                Crear Géneros
              </Button>
            </Group>
          </Stack>
        </Modal>

        {/* Edit Modal */}
        <Modal
          opened={editOpened}
          onClose={closeEdit}
          title='Editar Género'
          size='sm'
        >
          <Stack gap='md'>
            <Input
              placeholder='Nombre del género'
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
            <Group justify='flex-end'>
              <Button variant='subtle' onClick={closeEdit} disabled={loading}>
                Cancelar
              </Button>
              <Button onClick={updateGenre} loading={loading}>
                Actualizar Género
              </Button>
            </Group>
          </Stack>
        </Modal>
      </Stack>
    </Container>
  );
};

export default GenresPage;
