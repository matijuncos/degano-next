import { EVENT_TABS } from '@/context/config';
import { EventModel } from '@/context/types';
import { Button, Input, Textarea, Flex, Text, Box } from '@mantine/core';
import { IconPlus, IconX } from '@tabler/icons-react';
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

  const addTimingItem = () => {
    const newTiming = {
      time: '',
      title: '',
      details: ''
    };
    setEventData((prev) => ({
      ...prev,
      timing: [...(prev.timing || []), newTiming]
    }));
  };

  const removeTimingItem = (index: number) => {
    setEventData((prev) => ({
      ...prev,
      timing: prev.timing?.filter((_, i) => i !== index) || []
    }));
  };

  const updateTimingItem = (index: number, field: string, value: string) => {
    setEventData((prev) => ({
      ...prev,
      timing:
        prev.timing?.map((item, i) =>
          i === index ? { ...item, [field]: value } : item
        ) || []
    }));
  };

  return (
    <Box>
      <Text size='xl' fw={600} mb='md'>
        Timing del Evento
      </Text>

      <Flex direction='column' gap='md'>
        {eventData.timing?.map((item, index) => (
          <Box
            key={index}
            p='md'
            style={{ border: '1px solid #e9ecef', borderRadius: '8px' }}
          >
            <Flex justify='space-between' align='center' mb='sm'>
              <Text fw={500}>#{index + 1}</Text>
              <IconX
                size={20}
                color='red'
                style={{ cursor: 'pointer' }}
                onClick={() => removeTimingItem(index)}
              />
            </Flex>
            <Flex direction='column' gap='sm'>
              <Flex gap='sm'>
                <Input
                  placeholder='Hora (ej: 20:00)'
                  style={{ flexGrow: 1 }}
                  value={item.time}
                  onChange={(e) =>
                    updateTimingItem(index, 'time', e.target.value)
                  }
                />
                <Input
                  placeholder='Título del evento'
                  style={{ flexGrow: 1 }}
                  value={item.title}
                  onChange={(e) =>
                    updateTimingItem(index, 'title', e.target.value)
                  }
                />
              </Flex>
              <Textarea
                placeholder='Detalles adicionales'
                value={item.details}
                onChange={(e) =>
                  updateTimingItem(index, 'details', e.target.value)
                }
                minRows={2}
              />
            </Flex>
          </Box>
        ))}

        <Button
          leftSection={<IconPlus size={16} />}
          variant='outline'
          onClick={addTimingItem}
        >
          Agregar Evento al Cronograma
        </Button>
      </Flex>

      <Flex gap='sm' mt='xl'>
        <Button onClick={back}>Atrás</Button>
        <Button onClick={next}>Siguiente</Button>
      </Flex>
    </Box>
  );
};

export default TimingForm;
