'use client';
import { useEffect, useState } from 'react';
import { Modal, Stack, Text, Textarea, Group, Button, Select } from '@mantine/core';
import { EQUIPMENT_NOTE_MAX } from '@/utils/equipmentNotes';

export type NoteUnit = { _id: string; name: string; code?: string; note?: string };

// Editor de la nota de un equipo para UN evento. Si hay varias unidades del
// mismo equipo (ej. "Truss x 8"), se elige a cuál va la nota.
// `onApply` devuelve true si se aplicó (el modal se cierra) o false si falló.
export default function EquipmentNoteModal({
  units,
  onClose,
  onApply,
  hint = 'Se guarda junto con el evento.'
}: {
  units: NoteUnit[] | null;
  onClose: () => void;
  onApply: (unitId: string, note: string) => boolean | Promise<boolean>;
  hint?: string;
}) {
  const [unitId, setUnitId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  // Al abrir: primera unidad con nota (o la primera)
  useEffect(() => {
    if (!units?.length) return;
    const first = units.find((u) => u.note) || units[0];
    setUnitId(first._id);
    setDraft(first.note || '');
  }, [units]);

  const unit = units?.find((u) => u._id === unitId) || null;
  const many = (units?.length || 0) > 1;

  const selectUnit = (id: string | null) => {
    setUnitId(id);
    setDraft(units?.find((u) => u._id === id)?.note || '');
  };

  const apply = async (text: string) => {
    if (!unit) return;
    setSaving(true);
    try {
      if (await onApply(unit._id, text)) onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      opened={!!units?.length}
      onClose={onClose}
      centered
      title={
        <Text fw={600}>
          Nota — {units?.[0]?.name}
          {!many && unit?.code ? ` (${unit.code})` : ''}
        </Text>
      }
    >
      <Stack gap='sm'>
        <Text size='xs' c='dimmed'>
          Solo para este equipo en este evento.
        </Text>
        {many && (
          <Select
            label='Unidad'
            allowDeselect={false}
            value={unitId}
            onChange={selectUnit}
            data={(units || []).map((u) => ({
              value: u._id,
              label: `${u.code || 'Sin código'}${u.note ? ' — con nota' : ''}`
            }))}
            comboboxProps={{ withinPortal: true }}
          />
        )}
        <Textarea
          autosize
          minRows={3}
          maxRows={8}
          maxLength={EQUIPMENT_NOTE_MAX}
          placeholder='Ej: va en la cabina, llevar con funda, revisar cable…'
          value={draft}
          onChange={(e) => setDraft(e.currentTarget.value)}
          data-autofocus
        />
        <Group justify='space-between'>
          {unit?.note ? (
            <Button variant='subtle' color='red' size='xs' loading={saving} onClick={() => apply('')}>
              Quitar nota
            </Button>
          ) : (
            <span />
          )}
          <Group gap='xs'>
            <Button variant='default' size='xs' onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button size='xs' loading={saving} onClick={() => apply(draft)}>
              Guardar
            </Button>
          </Group>
        </Group>
        <Text size='11px' c='dimmed'>
          {hint}
        </Text>
      </Stack>
    </Modal>
  );
}
