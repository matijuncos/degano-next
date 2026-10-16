'use client';
import { equipmentAvailabilityUrl } from '@/utils/equipmentAvailability';
import {
  Modal, Stack, Text, Group, Button, Badge,
  ScrollArea, Box, Divider, Loader, Center
} from '@mantine/core';
import { IconCheck, IconAlertTriangle, IconX } from '@tabler/icons-react';
import { useState, useEffect, useMemo } from 'react';
import { Select } from '@mantine/core';
import { useResponsive } from '@/hooks/useResponsive';
import { EquipmentSet } from '@/components/EquipmentSetsPanel/EquipmentSetsPanel';
import {
  rankUnitsForEvent,
  planSet,
  resolveSetApplication,
  MissingChoice
} from '@/utils/equipmentSuggestions';

interface ApplySetModalProps {
  opened: boolean;
  onClose: () => void;
  eventStartDate?: Date | string;
  eventEndDate?: Date | string;
  editingEventId?: string;
  selectedEquipmentIds: string[];
  // units: unidades reales a agregar · extras: "a tercerizar" (nombre + cantidad)
  onApply: (
    units: any[],
    extras: { name: string; categoryId: string | null; quantity: number }[]
  ) => void;
}

// Valor del selector de faltantes ↔ MissingChoice
const choiceToValue = (c?: MissingChoice) =>
  !c || c.kind === 'tercerizar' ? 'tercerizar' : c.kind === 'omitir' ? 'omitir' : `eq:${c.name}`;
const valueToChoice = (v: string | null): MissingChoice =>
  !v || v === 'tercerizar'
    ? { kind: 'tercerizar' }
    : v === 'omitir'
    ? { kind: 'omitir' }
    : { kind: 'equivalente', name: v.slice(3) };

export default function ApplySetModal({
  opened,
  onClose,
  eventStartDate,
  eventEndDate,
  editingEventId,
  selectedEquipmentIds,
  onApply
}: ApplySetModalProps) {
  const [sets, setSets] = useState<EquipmentSet[]>([]);
  const [allEquipment, setAllEquipment] = useState<any[]>([]);
  const [loadingSets, setLoadingSets] = useState(false);
  const [selectedSet, setSelectedSet] = useState<EquipmentSet | null>(null);
  // Qué hacer con lo que falta de cada ítem (por defecto: tercerizar)
  const [choices, setChoices] = useState<Record<string, MissingChoice>>({});
  // Celular: pantalla completa y todo en una columna (en 2 columnas no entraba)
  const { isMobile } = useResponsive();

  // Cargar sets y equipamiento al abrir
  useEffect(() => {
    if (!opened) return;
    setSelectedSet(null);
    setChoices({});

    const load = async () => {
      setLoadingSets(true);
      try {
        const [setsRes, eqRes] = await Promise.all([
          fetch('/api/equipmentSets').then((r) => r.json()),
          fetch(equipmentAvailabilityUrl(eventStartDate, eventEndDate, editingEventId)).then((r) => r.json())
        ]);
        setSets(setsRes);
        setAllEquipment(Array.isArray(eqRes) ? eqRes : []);
      } finally {
        setLoadingSets(false);
      }
    };
    load();
  }, [opened, eventStartDate, eventEndDate, editingEventId]);

  const handleSelectSet = (set: EquipmentSet) => {
    setSelectedSet(set);
    setChoices({});
  };

  // Plan del set: unidades libres del mismo equipo (selección inteligente:
  // primero las que no se usan ese día) y, si faltan, equivalentes de la
  // misma categoría. La disponibilidad viene de la lista para las fechas.
  const plans = useMemo(() => {
    if (!selectedSet) return [];
    const inEvent = new Set(selectedEquipmentIds.map(String));
    const freePool = allEquipment.filter((e) => !e.outOfService?.isOut && !inEvent.has(String(e._id)));
    const categoryIdOf = (name: string) => allEquipment.find((e) => e.name === name)?.categoryId ?? null;
    return planSet(
      selectedSet.items,
      freePool,
      (units) => rankUnitsForEvent(units, eventStartDate, eventEndDate, editingEventId),
      categoryIdOf
    );
  }, [selectedSet, allEquipment, selectedEquipmentIds, eventStartDate, eventEndDate, editingEventId]);

  const result = useMemo(
    () =>
      resolveSetApplication(plans, choices, (name) => allEquipment.find((e) => e.name === name)?.categoryId ?? null),
    [plans, choices, allEquipment]
  );
  const extrasCount = result.extras.reduce((s, e) => s + e.quantity, 0);
  const missingCount = plans.reduce((s, p) => s + p.missing, 0);
  const nothingToAdd = result.units.length === 0 && extrasCount === 0;

  const handleApply = () => {
    if (!nothingToAdd) onApply(result.units, result.extras);
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title='Aplicar Set de Equipamiento'
      size='lg'
      fullScreen={isMobile}
      centered
    >
      {loadingSets ? (
        <Center py='xl'><Loader /></Center>
      ) : (
        <Group
          align='flex-start'
          gap='md'
          style={{ minHeight: 300, flexDirection: isMobile ? 'column' : 'row', flexWrap: 'nowrap' }}
        >
          {/* Lista de sets */}
          <Box
            style={
              isMobile
                ? { width: '100%' }
                : { width: '45%', borderRight: '1px solid rgba(255,255,255,0.1)', paddingRight: 12 }
            }
          >
            <Text size='xs' c='dimmed' mb='xs' fw={600} tt='uppercase'>Sets disponibles</Text>
            {sets.length === 0 ? (
              <Text size='sm' c='dimmed'>No hay sets creados.</Text>
            ) : (
              <ScrollArea h={isMobile ? 170 : 260}>
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
          <Box style={{ flex: 1, minWidth: 0, width: isMobile ? '100%' : undefined }}>
            {!selectedSet ? (
              <Text size='sm' c='dimmed' mt='md'>Seleccioná un set para ver disponibilidad.</Text>
            ) : (
              <Stack gap='sm'>
                <Text size='xs' c='dimmed' fw={600} tt='uppercase'>Disponibilidad</Text>
                {!(eventStartDate && eventEndDate) && (
                  <Text size='xs' c='yellow.5'>
                    El evento todavía no tiene fechas: no se puede saber qué equipos están
                    ocupados. Cargá las fechas en la pestaña Evento antes de aplicar el set.
                  </Text>
                )}
                <ScrollArea h={isMobile ? 'calc(100dvh - 470px)' : 230} mih={180}>
                  <Stack gap='xs'>
                    {plans.map((p) => {
                      const have = p.chosen.length;
                      const ok = p.missing === 0;
                      return (
                        <Box key={p.name}>
                          <Group gap='xs' justify='space-between' wrap='nowrap'>
                            <Box style={{ flex: 1, minWidth: 0 }}>
                              <Text size='sm' truncate>{p.name}</Text>
                              {p.chosen.some((u) => u.code) && (
                                <Text size='10px' c='dimmed' truncate>
                                  Usa: {p.chosen.map((u) => u.code).filter(Boolean).join(', ')}
                                </Text>
                              )}
                            </Box>
                            <Badge
                              color={ok ? 'green' : have > 0 ? 'yellow' : 'red'}
                              variant='light'
                              size='sm'
                              leftSection={ok ? <IconCheck size={10} /> : have > 0 ? <IconAlertTriangle size={10} /> : <IconX size={10} />}
                            >
                              {have}/{p.required}
                            </Badge>
                          </Group>
                          {/* Lo que falta: equivalente (misma categoría), tercerizar o no agregar */}
                          {p.missing > 0 && (
                            <Group gap={6} mt={4} wrap='nowrap' align='center'>
                              <Text size='xs' c='yellow.5' style={{ whiteSpace: 'nowrap' }}>
                                Falta{p.missing === 1 ? '' : 'n'} {p.missing} →
                              </Text>
                              <Select
                                size='xs'
                                style={{ flex: 1 }}
                                allowDeselect={false}
                                comboboxProps={{ withinPortal: true }}
                                value={choiceToValue(choices[p.name])}
                                onChange={(v) => setChoices((prev) => ({ ...prev, [p.name]: valueToChoice(v) }))}
                                data={[
                                  { value: 'tercerizar', label: 'Tercerizar' },
                                  ...p.equivalents.map((e) => ({
                                    value: `eq:${e.name}`,
                                    label: `Equivalente: ${e.name} (${e.units.length} libre${e.units.length === 1 ? '' : 's'}${
                                      e.units.length < p.missing ? ', el resto se terceriza' : ''
                                    })`
                                  })),
                                  { value: 'omitir', label: 'No agregar' }
                                ]}
                              />
                            </Group>
                          )}
                        </Box>
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
          {missingCount > 0 && (
            <Group gap='xs' mb='xs' wrap='nowrap'>
              <IconAlertTriangle size={14} color='#f08c00' />
              <Text size='xs' c='yellow'>
                Faltan {missingCount} unidad{missingCount === 1 ? '' : 'es'}. Elegí para cada ítem un
                equivalente, tercerizar o no agregar. Lo tercerizado avisa solo cuando se libere stock.
              </Text>
            </Group>
          )}
          <Group
            justify='flex-end'
            gap='xs'
            mb={isMobile ? 70 : 0}
            style={isMobile ? { flexDirection: 'column-reverse', alignItems: 'stretch' } : undefined}
          >
            <Button variant='default' onClick={onClose}>Cancelar</Button>
            <Button color='green' onClick={handleApply} disabled={nothingToAdd}>
              {nothingToAdd
                ? 'Nada para agregar'
                : `Aplicar set (${result.units.length} equipo${result.units.length === 1 ? '' : 's'}${
                    extrasCount ? ` + ${extrasCount} a tercerizar` : ''
                  })`}
            </Button>
          </Group>
        </>
      )}
    </Modal>
  );
}
