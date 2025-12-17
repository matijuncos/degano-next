import { EVENT_TABS } from '@/context/config';
import { EventModel } from '@/context/types';
import { Button, Input, Textarea, Flex, Text, Box, Card, Group, Title } from '@mantine/core';
import { TimePicker } from '@mantine/dates';
import { IconPlus } from '@tabler/icons-react';
import { useState, useEffect } from 'react';

const TimingForm = ({
  event,
  onNextTab,
  onBackTab
}: {
  event: EventModel;
  onNextTab: Function;
  onBackTab: Function;
}) => {
  const [eventData, setEventData] = useState<EventModel>(event);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingItem, setEditingItem] = useState<{
    time: string;
    title: string;
    details: string;
  } | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newItem, setNewItem] = useState({ time: '', title: '', details: '' });

  // Sincronizar estado local con el prop event cuando el usuario navega
  useEffect(() => {
    if (event) {
      setEventData(event);
    }
  }, [event]);

  const next = () => {
    onNextTab(EVENT_TABS.EQUIPMENT, eventData);
  };

  const back = () => {
    onBackTab(EVENT_TABS.MUSIC, eventData);
  };

  const handleAddTiming = () => {
    const updatedTiming = [...(eventData.timing || []), newItem];
    setEventData((prev) => ({ ...prev, timing: updatedTiming }));
    setNewItem({ time: '', title: '', details: '' });
    setIsAdding(false);
  };

  const handleEditTiming = (index: number) => {
    if (!eventData?.timing) return;
    setEditingIndex(index);
    setEditingItem({ ...eventData.timing[index] });
  };

  const handleSaveEdit = () => {
    if (editingIndex === null || !editingItem) return;
    const updatedTiming = eventData.timing?.map((item, i) =>
      i === editingIndex ? editingItem : item
    );
    setEventData((prev) => ({ ...prev, timing: updatedTiming }));
    setEditingIndex(null);
    setEditingItem(null);
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditingItem(null);
  };

  const handleDeleteTiming = (index: number) => {
    const updatedTiming = eventData.timing?.filter((_, i) => i !== index);
    setEventData((prev) => ({ ...prev, timing: updatedTiming }));
  };

  return (
    <Flex direction='column' gap='md'>
      {/* Título con botón de agregar */}
      <Flex justify='space-between' align='center' mb='md'>
        <Title order={3}>Cronograma del Evento</Title>
        {!isAdding && (
          <Button
            leftSection={<IconPlus size={16} />}
            variant='outline'
            onClick={() => setIsAdding(true)}
          >
            Agregar Evento al Cronograma
          </Button>
        )}
      </Flex>

      {/* Formulario de agregar nuevo timing */}
      {isAdding && (
        <Card withBorder padding='md' mb='md'>
          <Text fw={500} mb='sm'>Nuevo Evento al Cronograma</Text>
          <Flex gap='sm' mb='sm' align='flex-end'>
            <TimePicker
              label='Hora'
              value={newItem.time}
              onChange={(value) => setNewItem({ ...newItem, time: value })}
              style={{ flex: 1 }}
            />
            <Box style={{ flex: 2 }}>
              <Text size='sm' fw={500} mb='4px'>Título</Text>
              <Input
                placeholder='Título del evento'
                value={newItem.title}
                onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
              />
            </Box>
          </Flex>
          <Textarea
            placeholder='Detalles adicionales'
            value={newItem.details}
            onChange={(e) => setNewItem({ ...newItem, details: e.target.value })}
            minRows={2}
            mb='sm'
          />
          <Group gap='xs'>
            <Button onClick={handleAddTiming} color='green' size='xs'>
              Guardar
            </Button>
            <Button
              onClick={() => {
                setIsAdding(false);
                setNewItem({ time: '', title: '', details: '' });
              }}
              variant='light'
              color='gray'
              size='xs'
            >
              Cancelar
            </Button>
          </Group>
        </Card>
      )}

      {/* Lista de timing */}
      {eventData.timing && eventData.timing.length > 0 ? (
        <Flex direction='column' gap='xs'>
          {eventData.timing.map((item, index) => (
            <Card key={index} withBorder padding='sm'>
              {editingIndex === index ? (
                // Modo edición
                <Box>
                  <Text fw={500} mb='sm' c='dimmed'>#{index + 1}</Text>
                  <Flex gap='sm' mb='sm' align='flex-end'>
                    <TimePicker
                      label='Hora'
                      value={editingItem?.time || ''}
                      onChange={(value) =>
                        setEditingItem({ ...editingItem!, time: value })
                      }
                      style={{ flex: 1 }}
                    />
                    <Box style={{ flex: 2 }}>
                      <Text size='sm' fw={500} mb='4px'>Título</Text>
                      <Input
                        placeholder='Título del evento'
                        value={editingItem?.title || ''}
                        onChange={(e) =>
                          setEditingItem({ ...editingItem!, title: e.target.value })
                        }
                      />
                    </Box>
                  </Flex>
                  <Textarea
                    placeholder='Detalles adicionales'
                    value={editingItem?.details || ''}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem!, details: e.target.value })
                    }
                    minRows={2}
                    mb='sm'
                  />
                  <Group gap='xs'>
                    <Button onClick={handleSaveEdit} color='green' size='xs'>
                      Guardar
                    </Button>
                    <Button
                      onClick={handleCancelEdit}
                      variant='light'
                      color='gray'
                      size='xs'
                    >
                      Cancelar
                    </Button>
                  </Group>
                </Box>
              ) : (
                // Modo visualización
                <Flex justify='space-between' align='center' gap='md'>
                  <Flex gap='md' align='center' style={{ flex: 1 }}>
                    <Text fw={600} c='dimmed' style={{ minWidth: '30px' }}>
                      #{index + 1}
                    </Text>
                    <Text fw={600} style={{ minWidth: '60px' }}>
                      {item.time}hs
                    </Text>
                    <Text fw={500} style={{ flex: 1 }}>
                      {item.title}
                    </Text>
                    {item.details && (
                      <Text size='sm' c='dimmed' style={{ flex: 2 }}>
                        {item.details}
                      </Text>
                    )}
                  </Flex>
                  <Group gap='xs'>
                    <Button
                      size='xs'
                      variant='light'
                      color='blue'
                      onClick={() => handleEditTiming(index)}
                    >
                      Editar
                    </Button>
                    <Button
                      size='xs'
                      variant='light'
                      color='red'
                      onClick={() => handleDeleteTiming(index)}
                    >
                      Eliminar
                    </Button>
                  </Group>
                </Flex>
              )}
            </Card>
          ))}
        </Flex>
      ) : (
        !isAdding && (
          <Text c='dimmed' fs='italic'>
            No hay cronograma definido
          </Text>
        )
      )}

      {/* Botones de navegación */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          marginTop: '20px'
        }}
      >
        <Button onClick={back}>Atrás</Button>
        <Button onClick={next}>Siguiente</Button>
      </div>
    </Flex>
  );
};

export default TimingForm;
