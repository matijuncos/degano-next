'use client';
import { useMemo } from 'react';
import useSWR from 'swr';
import { LiveEquipmentStatus } from '@/utils/equipmentAvailability';

const fetcher = (url: string) =>
  fetch(url, { cache: 'no-store' }).then((r) => r.json());

/**
 * Devuelve un Map<_id, outOfService> con el estado ACTUAL de todos los equipos.
 * Se usa para cruzar el equipamiento congelado de un evento contra el estado
 * vivo del inventario y detectar equipos dados de baja / en reparación.
 *
 * Usa el endpoint SIN fechas a propósito: nos interesa el estado actual real
 * del equipo (baja/reparación), no la disponibilidad para un rango de fechas.
 */
export function useEquipmentStatusMap(): Map<string, LiveEquipmentStatus> {
  const { data } = useSWR<any[]>('/api/equipment', fetcher, {
    revalidateOnFocus: false
  });

  return useMemo(() => {
    const map = new Map<string, LiveEquipmentStatus>();
    (data || []).forEach((eq: any) => {
      map.set(String(eq._id), eq.outOfService || { isOut: false });
    });
    return map;
  }, [data]);
}
