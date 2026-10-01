// src/hooks/useStaffLedger.ts
'use client';
import useSWR, { mutate } from 'swr';
import type { Account, AllocatedCharge, Credit } from '@/utils/staffLedger';
import type { EmployeeLedgerRow } from '@/lib/staffLedgerServer';

export type { EmployeeLedgerRow };

export type AdminAccountResponse = Account & {
  employee: {
    _id: string;
    fullName: string;
    rol: string;
    insurancePolicy: { fileName: string; uploadedAt: string } | null;
  };
};

export type MyLedgerResponse =
  | { linked: false; message: string }
  | {
      linked: true;
      employeeId: string;
      fullName: string;
      charges: AllocatedCharge[];
      credits: Credit[];
      summary: { pendingToDate: number; favor: number; nextMonthTotal: number; missingAmount: number };
      window: { from: string; to: string };
      policy: { fileName: string } | null;
    };

export const SUMMARIES_KEY = '/api/staffLedger';
export const accountKey = (id: string) => `/api/staffLedger?employeeId=${id}`;
export const MY_LEDGER_KEY = '/api/staffLedger/me';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'Error al cargar los cobros');
  return data;
};

const SWR_OPTS = { revalidateOnFocus: false, dedupingInterval: 30_000 };

export const useLedgerSummaries = () => useSWR<EmployeeLedgerRow[]>(SUMMARIES_KEY, fetcher, SWR_OPTS);
export const useEmployeeAccount = (id: string | null) =>
  useSWR<AdminAccountResponse>(id ? accountKey(id) : null, fetcher, SWR_OPTS);
export const useMyLedger = () => useSWR<MyLedgerResponse>(MY_LEDGER_KEY, fetcher, SWR_OPTS);

// Mutación admin. El servidor devuelve la cuenta recalculada: se pisa la caché
// del detalle y la fila del resumen sin pedir nada más (regla de performance).
export async function ledgerRequest(
  method: 'POST' | 'PUT' | 'DELETE',
  body?: any,
  query = ''
): Promise<AdminAccountResponse> {
  const res = await fetch(`/api/staffLedger${query}`, {
    method,
    ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {})
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'No se pudo guardar');

  const account = data as AdminAccountResponse;
  const id = account.employee._id;
  await mutate(accountKey(id), account, { revalidate: false });
  await mutate(
    SUMMARIES_KEY,
    (rows?: EmployeeLedgerRow[]) =>
      rows?.map((r) => {
        if (r.employeeId !== id) return r;
        const { byMonth, ...summary } = account.summary;
        return { ...r, summary };
      }),
    { revalidate: false }
  );
  return account;
}
