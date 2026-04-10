'use client';
import {
  Modal, Stack, Text, Group, Button, Badge,
  ScrollArea, Box, Divider, Loader, Center
} from '@mantine/core';
import { IconCheck, IconAlertTriangle, IconX } from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import { EquipmentSet } from '@/components/EquipmentSetsPanel/EquipmentSetsPanel';

interface StockCheck {
  equipmentName: string;
  required: number;
  available: number;
  itemsToAdd: any[];
}

interface ApplySetModalProps {
  opened: boolean;
  onClose: () => void;
  eventStartDate?: Date | string;
  eventEndDate?: Date | string;
  selectedEquipmentIds: string[];
  onApply: (items: any[]) => void;
}

export default function ApplySetModal({
  opened,
  onClose,
  eventStartDate,
  eventEndDate,
  selectedEquipmentIds,
  onApply
}: ApplySetModalProps) {
  const [sets, setSets] = useState<EquipmentSet[]>([]);
  const [allEquipment, setAllEquipment] = useState<any[]>([]);
  const [loadingSets, setLoadingSets] = useState(false);
  const [selectedSet, setSelectedSet] = useState<EquipmentSet | null>(null);
  const [stockChecks, setStockChecks] = useState<StockCheck[]>([]);

  // Cargar sets y equipamiento al abrir
  useEffect(() => {
    if (!opened) return;
    setSelectedSet(null);
    setStockChecks([]);

    const load = async () => {
      setLoadingSets(true);
      try {
        const [setsRes, eqRes] = await Promise.all([
          fetch('/api/equipmentSets').then((r) => r.json()),
          fetch(
            eventStartDate && eventEndDate
              ? `/api/equipment?eventStartDate=${new Date(eventStartDate).toISOString()}&eventEndDate=${new Date(eventEndDate).toISOString()}`
              : '/api/equipment'
          ).then((r) => r.json())
        ]);
        setSets(setsRes);
        setAllEquipment(Array.isArray(eqRes) ? eqRes : []);
      } finally {
        setLoadingSets(false);
      }
    };
    load();
  }, [opened, eventStartDate, eventEndDate]);

  const handleSelectSet = (set: EquipmentSet) => {
    setSelectedSet(set);

    // Calcular disponibilidad por ítem
    const checks: StockCheck[] = set.items.map((item) => {
      const available = allEquipment.filter(
        (e) =>
          e.name === item.equipmentName &&
          !e.outOfService?.isOut &&
          !selectedEquipmentIds.includes(e._id?.toString())
      );
      return {
        equipmentName: item.equipmentName,
        required: item.quantity,
        available: available.length,
        itemsToAdd: available.slice(0, item.quantity)
      };
    });
    setStockChecks(checks);
  };

  const allAvailable = stockChecks.every((c) => c.available >= c.required);
  const someAvailable = stockChecks.some((c) => c.available > 0);
  const itemsToApply = stockChecks.flatMap((c) => c.itemsToAdd);
  const itemsToApplyPartial = stockChecks.flatMap((c) =>
    c.available > 0 ? c.itemsToAdd : []
  );

  const handleApply = (partial = false) => {
    const items = partial ? itemsToApplyPartial : itemsToApply;
    if (items.length > 0) onApply(items);
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title='Aplicar Set de Equipamiento'
      size='lg'
      centered
    >
      {loadingSets ? (
        <Center py='xl'><Loader /></Center>
      ) : (
        <Group align='flex-start' gap='md' style={{ minHeight: 300 }}>
          {/* Lista de sets */}
          <Box style={{ width: '45%', borderRight: '1px solid rgba(255,255,255,0.1)', paddingRight: 12 }}>
            <Text size='xs' c='dimmed' mb='xs' fw={600} tt='uppercase'>Sets disponibles</Text>
            {sets.length === 0 ? (
              <Text size='sm' c='dimmed'>No hay sets creados.</Text>
            ) : (
              <ScrollArea h={260}>
                <Stack gap='xs'>
                  {sets.map((set) => (
                    <Box
                      key={set._id}
                      p='xs'
                      style={{
                        borderRadius: 6,
                        cursor: 'pointer',
                        border: selectedSet?._id === set._id
                          ? '1px solid #40c057'
                          : '1px solid rgba(255,255,255,0.08)',
                        backgroundColor: selectedSet?._id === set._id
                          ? 'rgba(64,192,87,0.08)'
                          : 'rgba(255,255,255,0.03)'
                      }}
                      onClick={() => handleSelectSet(set)}
                    >
                      <Text size='sm' fw={600}>{set.name}</Text>
                      <Text size='xs' c='dimmed'>
                        {set.items.map((i) => `${i.quantity}× ${i.equipmentName}`).join(', ')}
                      </Text>
                    </Box>
                  ))}
                </Stack>
              </ScrollArea>
            )}
          </Box>

          {/* Detalle de stock */}
          <Box style={{ flex: 1 }}>
            {!selectedSet ? (
              <Text size='sm' c='dimmed' mt='md'>Seleccioná un set para ver disponibilidad.</Text>
            ) : (
              <Stack gap='sm'>
                <Text size='xs' c='dimmed' fw={600} tt='uppercase'>Disponibilidad</Text>
                <ScrollArea h={230}>
                  <Stack gap='xs'>
                    {stockChecks.map((check, i) => {
                      const ok = check.available >= check.required;
                      const partial = !ok && check.available > 0;
                      const none = check.available === 0;
                      return (
                        <Group key={i} gap='xs' justify='space-between' wrap='nowrap'>
                          <Text size='sm' style={{ flex: 1 }} truncate>{check.equipmentName}</Text>
                          <Group gap='4px' wrap='nowrap'>
                            {ok && (
                              <Badge color='green' variant='light' size='sm' leftSection={<IconCheck size={10} />}>
                                {check.required}/{check.required}
                              </Badge>
                            )}
                            {partial && (
                              <Badge color='yellow' variant='light' size='sm' leftSection={<IconAlertTriangle size={10} />}>
                                {check.available}/{check.required}
                              </Badge>
                            )}
                            {none && (
                              <Badge color='red' variant='light' size='sm' leftSection={<IconX size={10} />}>
                                0/{check.required}
                              </Badge>
                            )}
                          </Group>
                        </Group>
                      );
                    })}
                  </Stack>
                </ScrollArea>
              </Stack>
            )}
          </Box>
        </Group>
      )}

      {selectedSet && (
        <>
          <Divider my='sm' />
          <Group justify='flex-end' gap='xs'>
            <Button variant='default' onClick={onClose}>Cancelar</Button>
            {!allAvailable && someAvailable && (
              <Button
                color='yellow'
                variant='light'
                onClick={() => handleApply(true)}
              >
                Aplicar lo disponible
              </Button>
            )}
            <Button
              color='green'
              onClick={() => handleApply(false)}
              disabled={!someAvailable}
            >
              {allAvailable ? 'Aplicar set completo' : 'Sin stock disponible'}
            </Button>
          </Group>
        </>
      )}
    </Modal>
  );
}
