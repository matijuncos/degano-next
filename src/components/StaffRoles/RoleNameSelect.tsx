// src/components/StaffRoles/RoleNameSelect.tsx
// Rol opcional de un fijo o un extra en Cobros STAFF: se elige de la lista de
// roles, pero solo como nombre (el monto lo pone el fijo/extra, no el rol).
// Un nombre viejo escrito a mano se sigue mostrando como opción.
'use client';
import { useMemo } from 'react';
import { Select, SelectProps } from '@mantine/core';
import { useStaffRoles } from '@/hooks/useStaffRoles';

export default function RoleNameSelect({
  value,
  onChange,
  ...rest
}: Omit<SelectProps, 'value' | 'onChange' | 'data'> & { value: string; onChange: (name: string) => void }) {
  const { data: roles } = useStaffRoles();
  const data = useMemo(() => {
    const names = (roles ?? []).filter((r) => !r.archived).map((r) => r.name);
    return value && !names.includes(value) ? [value, ...names] : names;
  }, [roles, value]);

  return (
    <Select
      {...rest}
      data={data}
      value={value || null}
      onChange={(v) => onChange(v ?? '')}
      searchable
      clearable
      disabled={!roles || rest.disabled}
      placeholder={!roles ? 'Cargando roles…' : rest.placeholder}
      comboboxProps={{ withinPortal: true, ...rest.comboboxProps }}
    />
  );
}
