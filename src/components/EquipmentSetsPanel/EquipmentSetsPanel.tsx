'use client';
import {
  Box, Button, Group, Text, Stack, ActionIcon, Modal,
  TextInput, NumberInput, Select, Divider, Badge, Tooltip
} from '@mantine/core';
import { IconPlus, IconPencil, IconTrash, IconX } from '@tabler/icons-react';
import { useState } from 'react';
import useSWR from 'swr';
import useNotification from '@/hooks/useNotification';
import { usePermissions } from '@/hooks/usePermissions';

export interface EquipmentSetItem {
  equipmentName: string;
  quantity: number;
}

export interface EquipmentSet {
  _id: string;
  name: string;
  items: EquipmentSetItem[];
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function EquipmentSetsPanel() {
  const notify = useNotification();
  const { can, isAdmin, isManager } = usePermissions();
  const canWrite = isAdmin || isManager;

  const { data: sets = [], mutate: mutateSets } = useSWR<EquipmentSet[]>('/api/equipmentSets', fetcher);
  const { data: allEquipment = [] } = useSWR<any[]>('/api/equipment', fetcher);

  // Stock total por nombre de equipamiento
  const equipmentStockMap: Record<string, number> = {};
  allEquipment.forEach((e: any) => {
    const name = e.name as string;
    equipmentStockMap[name] = (equipmentStockMap[name] || 0) + (e.quantity || 1);
  });

  // Nombres únicos de equipamiento para el selector
  const equipmentNames: string[] = Object.keys(equipmentStockMap).sort();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingSet, setEditingSet] = useState<EquipmentSet | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formItems, setFormItems] = useState<EquipmentSetItem[]>([]);
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditingSet(null);
    setFormName('');
    setFormItems([{ equipmentName: '', quantity: 1 }]);
    setModalOpen(true);
  };

  const openEdit = (set: EquipmentSet) => {
    setEditingSet(set);
    setFormName(set.name);
    setFormItems(set.items.map((i) => ({ ...i })));
    setModalOpen(true);
  };

  const addFormItem = () => {
    setFormItems((prev) => [...prev, { equipmentName: '', quantity: 1 }]);
  };

  const removeFormItem = (index: number) => {
    setFormItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateFormItem = (index: number, field: keyof EquipmentSetItem, value: any) => {
    setFormItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const handleSave = async () => {
    if (!formName.trim() || formItems.some((i) => !i.equipmentName)) return;
    setSaving(true);
    try {
      const body = { name: formName.trim(), items: formItems.filter((i) => i.equipmentName) };
      if (editingSet) {
        await fetch(`/api/equipmentSets?id=${editingSet._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
      } else {
        await fetch('/api/equipmentSets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
      }
      mutateSets();
      setModalOpen(false);
      notify();
    } catch {
      notify({ type: 'defaultError' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/equipmentSets?id=${id}`, { method: 'DELETE' });
      mutateSets();
      setDeleteConfirmId(null);
      notify();
    } catch {
      notify({ type: 'defaultError' });
    }
  };

  const canSave =
    formName.trim().length > 0 &&
    formItems.length > 0 &&
    formItems.every((i) => i.equipmentName && i.quantity >= 1);

  return (
    <Box p='md'>
      <Group justify='space-between' mb='lg'>
        <Text fw={700} size='lg'>Sets de Equipamiento</Text>
        {canWrite && (
          <Button leftSection={<IconPlus size={14} />} size='sm' onClick={openCreate}>
            Nuevo Set
          </Button>
        )}
      </Group>

      {sets.length === 0 ? (
        <Text c='dimmed' ta='center' mt='xl'>
          No hay sets creados todavía.
        </Text>
      ) : (
        <Stack gap='sm'>
          {sets.map((set) => (
            <Box
              key={set._id}
              p='md'
              style={{
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                backgroundColor: 'rgba(255,255,255,0.03)'
              }}
            >
              <Group justify='space-between' mb='xs'>
                <Group gap='sm'>
                  <Text fw={600}>{set.name}</Text>
                  <Badge variant='light' color='green' size='sm'>
                    {set.items.length} {set.items.length === 1 ? 'ítem' : 'ítems'}
                  </Badge>
                </Group>
                {canWrite && (
                  <Group gap='xs'>
                    <Tooltip label='Editar'>
                      <ActionIcon variant='subtle' color='blue' onClick={() => openEdit(set)}>
                        <IconPencil size={14} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label='Eliminar'>
                      <ActionIcon variant='subtle' color='red' onClick={() => setDeleteConfirmId(set._id)}>
                        <IconTrash size={14} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                )}
              </Group>
              <Group gap='xs' wrap='wrap'>
                {set.items.map((item, i) => (
                  <Badge key={i} variant='outline' color='gray' size='sm'>
                    {item.quantity}× {item.equipmentName}
                  </Badge>
                ))}
              </Group>
            </Box>
          ))}
        </Stack>
      )}

      {/* Modal crear/editar */}
      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingSet ? 'Editar Set' : 'Nuevo Set'}
        size='md'
        centered
      >
        <Stack gap='md'>
          <TextInput
            label='Nombre del set'
            placeholder='Ej: Básico Sonido'
            value={formName}
            onChange={(e) => setFormName(e.currentTarget.value)}
            required
          />

          <Divider label='Ítems del set' labelPosition='left' />

          <Stack gap='xs'>
            {formItems.map((item, index) => (
              <Group key={index} gap='xs' align='flex-end'>
                <Select
                  label={index === 0 ? 'Equipamiento' : undefined}
                  placeholder='Seleccionar...'
                  data={equipmentNames.map((n) => ({
                    value: n,
                    label: `${n} (${equipmentStockMap[n] || 0})`
                  }))}
                  value={item.equipmentName || null}
                  onChange={(val) => {
                    updateFormItem(index, 'equipmentName', val || '');
                    if (val) {
                      const max = equipmentStockMap[val] || 1;
                      if (item.quantity > max) updateFormItem(index, 'quantity', max);
                    }
                  }}
                  searchable
                  style={{ flex: 1 }}
                  comboboxProps={{ withinPortal: false }}
                />
                <NumberInput
                  label={index === 0 ? 'Cant.' : undefined}
                  value={item.quantity}
                  onChange={(val) => updateFormItem(index, 'quantity', Number(val) || 1)}
                  min={1}
                  max={equipmentStockMap[item.equipmentName] || 1}
                  style={{ width: '80px' }}
                  allowDecimal={false}
                />
                <ActionIcon
                  color='red'
                  variant='subtle'
                  mb={index === 0 ? '1px' : undefined}
                  onClick={() => removeFormItem(index)}
                  disabled={formItems.length === 1}
                >
                  <IconX size={14} />
                </ActionIcon>
              </Group>
            ))}
          </Stack>

          <Button
            variant='subtle'
            leftSection={<IconPlus size={14} />}
            onClick={addFormItem}
            size='sm'
          >
            Agregar ítem
          </Button>

          <Divider />

          <Group justify='flex-end' gap='xs'>
            <Button variant='default' onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} loading={saving} disabled={!canSave}>
              {editingSet ? 'Guardar cambios' : 'Crear set'}
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Modal confirmación eliminar */}
      <Modal
        opened={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title='¿Eliminar set?'
        size='sm'
        centered
      >
        <Text size='sm' mb='md'>Esta acción no se puede deshacer.</Text>
        <Group justify='flex-end' gap='xs'>
          <Button variant='default' onClick={() => setDeleteConfirmId(null)}>Cancelar</Button>
          <Button color='red' onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}>
            Eliminar
          </Button>
        </Group>
      </Modal>
    </Box>
  );
}
