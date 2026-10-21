// src/components/StaffRoles/RoleMultiSelect.tsx
// Selector de roles de STAFF (uno o varios) desde el catálogo. Lo usan el
// formulario del evento, el drawer del calendario, los calendarios de cobros,
// el perfil del empleado y Cobros STAFF.
// - Todos eligen de la lista. Solo el admin ve "+ Crear rol" (y le puede poner
//   monto en el momento); el manager no crea roles.
// - Un rol escrito a mano antes del catálogo se muestra como "Antes: …" hasta
//   que se eligen roles de la lista.
'use client';
import { useMemo, useState } from 'react';
import { MultiSelect, MultiSelectProps, Modal, Stack, TextInput, NumberInput, Group, Button, Text } from '@mantine/core';
import { usePermissions } from '@/hooks/usePermissions';
import { useStaffRoles, staffRolesRequest } from '@/hooks/useStaffRoles';
import useNotification from '@/hooks/useNotification';
import { roleKey, rolesLabel, StaffRole } from '@/utils/staffRoles';

const CREATE = '__create__';

type Props = Omit<MultiSelectProps, 'value' | 'onChange' | 'data'> & {
  value: string[];
  // ids elegidos + el texto para mostrar ("DJ / Sonidista")
  onChange: (roleIds: string[], label: string) => void;
  legacyText?: string; // rol escrito a mano (datos de antes del catálogo)
};

export default function RoleMultiSelect({ value, onChange, legacyText, description, placeholder, ...rest }: Props) {
  const { data: roles, error } = useStaffRoles();
  const { isAdmin } = usePermissions();
  const notify = useNotification();
  const [search, setSearch] = useState('');
  const [createName, setCreateName] = useState<string | null>(null);
  const [createAmount, setCreateAmount] = useState<number | string>('');
  const [creating, setCreating] = useState(false);

  const byId = useMemo(() => new Map((roles ?? []).map((r) => [r._id, r])), [roles]);

  const data = useMemo(() => {
    // Archivados: no se ofrecen, salvo que ya estén elegidos
    const options = (roles ?? [])
      .filter((r) => !r.archived || value.includes(r._id))
      .map((r) => ({ value: r._id, label: r.archived ? `${r.name} (archivado)` : r.name }));
    const typed = search.trim();
    if (isAdmin && typed && !(roles ?? []).some((r) => roleKey(r.name) === roleKey(typed))) {
      options.push({ value: CREATE, label: `+ Crear rol "${typed}"` });
    }
    return options;
  }, [roles, value, search, isAdmin]);

  const emit = (ids: string[], list: Map<string, StaffRole> = byId) => onChange(ids, rolesLabel(ids, list));

  const handleChange = (ids: string[]) => {
    if (ids.includes(CREATE)) {
      setCreateName(search.trim());
      setCreateAmount('');
      return;
    }
    setSearch('');
    emit(ids);
  };

  const create = async () => {
    const name = (createName ?? '').trim();
    if (!name) return;
    setCreating(true);
    try {
      const { roles: list, createdId } = await staffRolesRequest('POST', {
        name,
        ...(createAmount !== '' ? { amount: createAmount } : {})
      });
      const map = new Map(list.map((r) => [r._id, r]));
      if (createdId) emit([...value, createdId], map);
      setSearch('');
      setCreateName(null);
      notify({ message: `Rol "${name}" creado` });
    } catch (e: any) {
      notify({ type: 'defaultError', message: e?.message || 'No se pudo crear el rol' });
    } finally {
      setCreating(false);
    }
  };

  const legacy = !value.length && legacyText?.trim() && legacyText.trim() !== 'Sin rol' ? legacyText.trim() : null;

  return (
    <>
      <MultiSelect
        {...rest}
        data={data}
        value={value}
        onChange={handleChange}
        searchable
        searchValue={search}
        onSearchChange={setSearch}
        hidePickedOptions
        clearable
        disabled={!roles || rest.disabled}
        placeholder={!roles ? (error ? 'No se pudieron cargar los roles' : 'Cargando roles…') : value.length ? undefined : placeholder ?? 'Sin rol'}
        nothingFoundMessage={isAdmin ? 'Escribí el nombre para crearlo' : 'No hay roles con ese nombre'}
        description={legacy ? `Antes: "${legacy}". Elegí el rol de la lista.` : description}
        comboboxProps={{ withinPortal: true, ...rest.comboboxProps }}
      />

      {isAdmin && (
        <Modal
          opened={createName !== null}
          onClose={() => setCreateName(null)}
          title='Nuevo rol'
          size='sm'
          zIndex={400}
          centered
        >
          <Stack gap='sm'>
            <TextInput
              label='Nombre'
              value={createName ?? ''}
              onChange={(e) => setCreateName(e.currentTarget.value)}
              data-autofocus
            />
            <NumberInput
              label='Monto por evento (opcional)'
              description='Vale desde hoy. Se puede cargar o cambiar después en Cobros STAFF → Roles.'
              value={createAmount}
              onChange={setCreateAmount}
              prefix='$ '
              thousandSeparator='.'
              decimalSeparator=','
              min={0}
              hideControls
            />
            <Text size='xs' c='dimmed'>Queda guardado en la lista para todos los eventos.</Text>
            <Group justify='flex-end' gap='xs'>
              <Button variant='default' onClick={() => setCreateName(null)}>Cancelar</Button>
              <Button onClick={create} loading={creating} disabled={!(createName ?? '').trim()}>
                Crear rol
              </Button>
            </Group>
          </Stack>
        </Modal>
      )}
    </>
  );
}
