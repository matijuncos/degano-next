'use client';
import {
  Box, Button, Group, Text, Stack, ActionIcon, Modal,
  TextInput, NumberInput, Select, Divider, Badge, Tooltip
} from '@mantine/core';
import { IconPlus, IconPencil, IconTrash, IconX, IconChevronRight } from '@tabler/icons-react';
import { useCallback, useMemo, useState } from 'react';
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

// Selector en cascada: Categoría → Subcategoría → ... → Equipo
function CascadingEquipmentSelect({
  categories,
  allEquipment,
  equipmentStockMap,
  value,
  onChange,
  label,
  usedNames
}: {
  categories: any[];
  allEquipment: any[];
  equipmentStockMap: Record<string, number>;
  value: string;
  onChange: (equipmentName: string) => void;
  label?: string;
  usedNames: Set<string>;
}) {
  const [selectedPath, setSelectedPath] = useState<string[]>([]);
  const [isChanging, setIsChanging] = useState(false);

  // Subcategorías de un parentId dado
  const getChildren = useCallback((parentId: string | null) => {
    return categories.filter((c: any) => {
      const pid = c.parentId || null;
      return pid === parentId;
    });
  }, [categories]);

  // Equipos directos de una categoría (por categoryId)
  const getEquipmentInCategory = useCallback((categoryId: string) => {
    const names = new Set<string>();
    allEquipment.forEach((e: any) => {
      if (e.categoryId === categoryId) {
        names.add(e.name);
      }
    });
    return Array.from(names).sort();
  }, [allEquipment]);

  // Equipos sin categoría
  const uncategorizedEquipment = useMemo(() => {
    const names = new Set<string>();
    allEquipment.forEach((e: any) => {
      if (!e.categoryId) names.add(e.name);
    });
    return Array.from(names).sort();
  }, [allEquipment]);

  // Construir niveles de selects según el path seleccionado
  const levels: { parentId: string | null; selectedId: string | null }[] = [];
  levels.push({ parentId: null, selectedId: selectedPath[0] || null });
  for (let i = 0; i < selectedPath.length; i++) {
    const children = getChildren(selectedPath[i]);
    if (children.length > 0) {
      levels.push({ parentId: selectedPath[i], selectedId: selectedPath[i + 1] || null });
    }
  }

  // Equipos disponibles en la última categoría seleccionada (siempre, tenga o no subcategorías)
  const lastSelectedCatId = selectedPath[selectedPath.length - 1] || null;
  const equipmentInSelected = lastSelectedCatId
    ? getEquipmentInCategory(lastSelectedCatId)
    : [];

  const handleCategoryChange = (levelIndex: number, catId: string | null) => {
    if (!catId) {
      setSelectedPath((prev) => prev.slice(0, levelIndex));
    } else {
      setSelectedPath((prev) => {
        const newPath = prev.slice(0, levelIndex);
        newPath.push(catId);
        return newPath;
      });
    }
    onChange('');
  };

  const handleEquipmentChange = (equipmentName: string | null) => {
    onChange(equipmentName || '');
  };

  // Si ya hay un value y no estamos cambiando, mostrar el badge resuelto
  const showResolved = !!value && !isChanging;

  // Opciones raíz: categorías + "Sin categoría" si hay equipos sin asignar
  const rootOptions = useMemo(() => {
    const opts = getChildren(null).map((c: any) => ({
      value: c._id.toString(),
      label: c.name
    }));
    if (uncategorizedEquipment.length > 0) {
      opts.push({ value: '__uncategorized__', label: 'Sin categoría' });
    }
    return opts;
  }, [getChildren, uncategorizedEquipment]);

  // Equipos a mostrar: de la categoría seleccionada o sin categoría
  const equipmentOptions = lastSelectedCatId === '__uncategorized__'
    ? uncategorizedEquipment
    : equipmentInSelected;

  return (
    <Stack gap='4px' style={{ flex: 1 }}>
      {label && <Text size='sm' fw={500}>{label}</Text>}

      {showResolved ? (
        <Group gap='xs'>
          <Badge variant='light' color='green' size='lg' style={{ flex: 1 }}>
            {value} ({equipmentStockMap[value] || 0})
          </Badge>
          <ActionIcon
            size='xs'
            variant='subtle'
            color='gray'
            onClick={() => {
              setIsChanging(true);
              setSelectedPath([]);
              onChange('');
            }}
            title='Cambiar equipo'
          >
            <IconPencil size={12} />
          </ActionIcon>
        </Group>
      ) : (
        <Stack gap='4px'>
          {/* Selectores de categoría en cascada */}
          <Group gap='4px' align='center' wrap='wrap'>
            {levels.map((level, idx) => {
              const isRoot = idx === 0;
              const options = isRoot
                ? rootOptions
                : getChildren(level.parentId).map((c: any) => ({
                    value: c._id.toString(),
                    label: c.name
                  }));
              if (options.length === 0) return null;

              return (
                <Group key={idx} gap='4px' align='center' style={{ flex: 1, minWidth: 120 }}>
                  {idx > 0 && <IconChevronRight size={12} color='gray' style={{ flexShrink: 0 }} />}
                  <Select
                    placeholder={idx === 0 ? 'Categoría...' : 'Subcategoría...'}
                    data={options}
                    value={level.selectedId}
                    onChange={(val) => handleCategoryChange(idx, val)}
                    searchable
                    size='xs'
                    style={{ flex: 1, minWidth: 100 }}
                    clearable
                  />
                </Group>
              );
            })}
          </Group>

          {/* Selector de equipo: siempre visible si la categoría seleccionada tiene equipos directos */}
          {lastSelectedCatId && equipmentOptions.length > 0 && (
            <Group gap='4px' align='center'>
              <IconChevronRight size={12} color='gray' style={{ flexShrink: 0 }} />
              <Select
                placeholder='Equipo...'
                data={equipmentOptions.map((name) => ({
                  value: name,
                  label: `${name} (stock: ${equipmentStockMap[name] || 0})`,
                  disabled: usedNames.has(name) && name !== value
                }))}
                value={value || null}
                onChange={(val) => {
                  handleEquipmentChange(val);
                  if (val) setIsChanging(false);
                }}
                searchable
                size='xs'
                style={{ flex: 1 }}
                clearable
              />
            </Group>
          )}

          {/* Mensaje si no hay equipos en esta categoría */}
          {lastSelectedCatId && lastSelectedCatId !== '__uncategorized__' && equipmentOptions.length === 0 && getChildren(lastSelectedCatId).length === 0 && (
            <Text size='xs' c='dimmed' fs='italic' ml='md'>
              Sin equipos en esta categoría
            </Text>
          )}
        </Stack>
      )}
    </Stack>
  );
}

export default function EquipmentSetsPanel() {
  const notify = useNotification();
  const { can, isAdmin, isManager } = usePermissions();
  const canWrite = isAdmin || isManager;

  const { data: sets = [], mutate: mutateSets } = useSWR<EquipmentSet[]>('/api/equipmentSets', fetcher);
  const { data: allEquipment = [] } = useSWR<any[]>('/api/equipment', fetcher);
  const { data: categories = [] } = useSWR<any[]>('/api/categories', fetcher);

  // Stock total por nombre de equipamiento
  const equipmentStockMap = useMemo(() => {
    const stockMap: Record<string, number> = {};
    allEquipment.forEach((e: any) => {
      const name = e.name as string;
      stockMap[name] = (stockMap[name] || 0) + (e.quantity || 1);
    });
    return stockMap;
  }, [allEquipment]);

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
    const validItems = formItems.filter((i) => i.equipmentName);
    if (!formName.trim() || validItems.length === 0) return;
    setSaving(true);
    try {
      const body = { name: formName.trim(), items: validItems };
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

  // Permitir guardar si hay nombre y al menos un ítem con equipo seleccionado
  // (filas vacías se ignoran al guardar)
  const hasValidItems = formItems.some((i) => i.equipmentName && i.quantity >= 1);
  const canSave = formName.trim().length > 0 && hasValidItems;

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
        size='lg'
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

          <Stack gap='sm'>
            {formItems.map((item, index) => {
              // Nombres ya usados por otros ítems (no el actual)
              const usedNames = new Set(
                formItems
                  .filter((_, i) => i !== index)
                  .map((i) => i.equipmentName)
                  .filter(Boolean)
              );
              return (
                <Box
                  key={index}
                  p='xs'
                  style={{
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 6,
                    backgroundColor: 'rgba(255,255,255,0.02)'
                  }}
                >
                  <Group gap='xs' align='flex-start'>
                    <CascadingEquipmentSelect
                      categories={categories}
                      allEquipment={allEquipment}
                      equipmentStockMap={equipmentStockMap}
                      value={item.equipmentName}
                      onChange={(val) => updateFormItem(index, 'equipmentName', val)}
                      label={index === 0 ? 'Equipamiento' : undefined}
                      usedNames={usedNames}
                    />
                    <Stack gap='4px' style={{ flexShrink: 0 }}>
                      {index === 0 && <Text size='sm' fw={500}>Cant.</Text>}
                      <Group gap='4px'>
                        <NumberInput
                          value={item.quantity}
                          onChange={(val) => updateFormItem(index, 'quantity', Number(val) || 1)}
                          min={1}
                          style={{ width: '70px' }}
                          size='xs'
                          allowDecimal={false}
                        />
                        <ActionIcon
                          color='red'
                          variant='subtle'
                          onClick={() => removeFormItem(index)}
                          disabled={formItems.length === 1}
                          size='sm'
                        >
                          <IconX size={14} />
                        </ActionIcon>
                      </Group>
                    </Stack>
                  </Group>
                </Box>
              );
            })}
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
