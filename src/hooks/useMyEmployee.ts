'use client';
import useSWR from 'swr';
import { ResolveFailure } from '@/lib/resolveEmployee';

// Registro de STAFF del usuario logueado. Es la identidad con la que se filtran
// tableros, tareas y calendarios: `employeeId` es lo que se guarda como dueño y
// como miembro, no el sub de Auth0.
//
// `employee` puede ser null sin que sea un error: significa que ese email todavía
// no está vinculado a ningún registro de STAFF. En ese caso la persona solo ve
// lo que es público.
export interface MyEmployee {
  _id: string;
  fullName: string;
  email: string | null;
  rol: string;
  isStaff: boolean;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useMyEmployee() {
  const { data, isLoading } = useSWR<{
    employee: MyEmployee | null;
    reason?: ResolveFailure;
  }>('/api/me', fetcher, {
    revalidateOnFocus: false,
    revalidateIfStale: false
  });

  return {
    employee: data?.employee ?? null,
    employeeId: data?.employee?._id ?? null,
    reason: data?.reason,
    isLoading
  };
}
