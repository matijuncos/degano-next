// src/hooks/useStaffRoles.ts
// Catálogo de roles de STAFF. Una sola clave SWR para todos los selectores
// (evento, drawer, calendarios, perfil, cobros): se pide una vez y se comparte.
'use client';
import useSWR, { mutate, preload } from 'swr';
import type { StaffRole } from '@/utils/staffRoles';

export const STAFF_ROLES_KEY = '/api/staffRoles';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'Error al cargar los roles');
  return data;
};

const SWR_OPTS = { revalidateOnFocus: false, dedupingInterval: 60_000 };

export const useStaffRoles = () => useSWR<StaffRole[]>(STAFF_ROLES_KEY, fetcher, SWR_OPTS);

// Para pedirlo al montar una vista, antes de abrir el modal que lo usa
export const preloadStaffRoles = () => preload(STAFF_ROLES_KEY, fetcher);

// Alta / edición (solo admin). El servidor devuelve la lista completa: se pisa
// la caché sin otra request. Un cambio de monto mueve los cobros → se
// revalidan las cuentas que estén en caché.
export async function staffRolesRequest(
  method: 'POST' | 'PUT',
  body: Record<string, unknown>
): Promise<{ roles: StaffRole[]; createdId?: string }> {
  const res = await fetch(STAFF_ROLES_KEY, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'No se pudo guardar el rol');
  await mutate(STAFF_ROLES_KEY, data.roles, { revalidate: false });
  if ('amount' in body || 'name' in body) {
    mutate((key) => typeof key === 'string' && key.startsWith('/api/staffLedger'));
  }
  return data;
}
