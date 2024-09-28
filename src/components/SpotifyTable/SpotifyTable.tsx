import { useDeganoCtx } from '@/context/DeganoContext';
import { Box, Table, Text, Button, TextInput, Group } from '@mantine/core';
import React, { useState } from 'react';
import {
  IconEdit,
  IconCheck,
  IconX,
  IconPlus,
  IconCopy
} from '@tabler/icons-react';
import useNotification from '@/hooks/useNotification';

const SpotifyTable = () => {
  const { selectedEvent, setSelectedEvent, setLoading } = useDeganoCtx();
  const playlist = selectedEvent?.playlist;
  const notify = useNotification();
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editedLabel, setEditedLabel] = useState('');
  const [editedUrl, setEditedUrl] = useState('');

  const [newLabel, setNewLabel] = useState('');
  const [newUrl, setNewUrl] = useState('');

  const updateEvent = async (event: any) => {
    setLoading(true);
    notify('', '', '', true);

    const timeStamp = new Date().toISOString();
    try {
      const response = await fetch(`/api/updateEvent?id=${timeStamp}`, {
        method: 'PUT',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
      });
      const data = await response.json();
      notify();
      setSelectedEvent(data.event);
    } catch (error) {
      notify('Operación errónea', 'Algo salio mal, vuelve a intentarlo', 'red');
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (index: number) => {
    if (playlist) {
      setEditIndex(index);
      setEditedLabel(playlist[index].label);
      setEditedUrl(playlist[index].url);
    }
  };

  const handleSave = async (index: number) => {
    const updatedPlaylist = [...(playlist ?? [])];
    updatedPlaylist[index] = { label: editedLabel, url: editedUrl };
    await updateEvent({ ...selectedEvent, playlist: updatedPlaylist });
    setEditIndex(null);
  };

  const handleCancel = () => {
    setEditIndex(null);
  };

  const handleAddNew = async () => {
    const newItem = { label: newLabel, url: newUrl };
    const updatedPlaylist = [...(playlist ?? []), newItem];
    await updateEvent({ ...selectedEvent, playlist: updatedPlaylist });

    setNewLabel('');
    setNewUrl('');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        notify('Copiar', 'Copiado exitosamente', '', false);
      },
      (err) => {
        console.error('Error al copiar: ', err);
        notify('Error', 'No se pudo copiar la URL', 'error');
      }
    );
  };

  return (
    <Box>
      {playlist && playlist.length > 0 ? (
        <Table striped highlightOnHover>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Nombre de playlist</th>
              <th style={{ textAlign: 'left' }}>Dirección</th>
              <th style={{ textAlign: 'left' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {playlist.map((item, index) => (
              <tr key={index}>
                <td>
                  {editIndex === index ? (
                    <TextInput
                      value={editedLabel}
                      onChange={(e) => setEditedLabel(e.target.value)}
                      size='xs'
                    />
                  ) : (
                    <Text size='sm' fw={500}>
                      {item.label}
                    </Text>
                  )}
                </td>
                <td>
                  {editIndex === index ? (
                    <TextInput
                      value={editedUrl}
                      onChange={(e) => setEditedUrl(e.target.value)}
                      size='xs'
                    />
                  ) : (
                    <Group gap='xs'>
                      <a
                        href={item.url}
                        target='_blank'
                        style={{ textDecoration: 'underline' }}
                        rel='noopener noreferrer'
                      >
                        {item.url}
                      </a>
                      <Button
                        size='xs'
                        variant='subtle'
                        onClick={() => copyToClipboard(item.url)}
                        title='Copiar URL'
                      >
                        <IconCopy size={16} />
                      </Button>
                    </Group>
                  )}
                </td>
                <td>
                  {editIndex === index ? (
                    <Group gap={5}>
                      <Button
                        size='xs'
                        onClick={() => handleSave(index)}
                        variant='outline'
                        color='green'
                      >
                        <IconCheck size={16} />
                      </Button>
                      <Button
                        size='xs'
                        onClick={handleCancel}
                        variant='outline'
                        color='red'
                      >
                        <IconX size={16} />
                      </Button>
                    </Group>
                  ) : (
                    <Button
                      size='xs'
                      onClick={() => handleEdit(index)}
                      variant='subtle'
                    >
                      <IconEdit size={16} />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <Box>
          <Text mb='md'>No playlist items available. Add a new item:</Text>
          <Group align='end'>
            <TextInput
              label='Nombre de playlist'
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              size='sm'
            />
            <TextInput
              label='Dirección'
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              size='sm'
            />
            <Button onClick={handleAddNew} size='sm'>
              <IconPlus size={16} />
              Agregar
            </Button>
          </Group>
        </Box>
      )}
    </Box>
  );
};

export default SpotifyTable;
