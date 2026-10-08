// src/utils/civilCeremony.ts
// Ceremonia civil: el ingreso se desglosa en Novios (entran juntos), Novio y
// Novia (entran por separado). Los eventos viejos tienen un único `ingreso`:
// se lee como "Ingreso novios" y al guardar queda en el campo nuevo (sin
// migrar la base). La ceremonia extra sigue con un solo `ingreso`.
import { CivilCeremonyMusic } from '@/context/types';

export type CivilIngresoField = 'ingresoNovios' | 'ingresoNovio' | 'ingresoNovia';

export const CIVIL_INGRESO_FIELDS: { key: CivilIngresoField; label: string }[] = [
  { key: 'ingresoNovios', label: 'Ingreso novios' },
  { key: 'ingresoNovio', label: 'Ingreso novio' },
  { key: 'ingresoNovia', label: 'Ingreso novia' }
];

export function normalizeCivil(c: Partial<CivilCeremonyMusic> | null | undefined): CivilCeremonyMusic {
  return {
    // El viejo se vacía: su valor ya vive en ingresoNovios
    ingreso: '',
    ingresoNovios: c?.ingresoNovios ?? c?.ingreso ?? '',
    ingresoNovio: c?.ingresoNovio ?? '',
    ingresoNovia: c?.ingresoNovia ?? '',
    firmas: c?.firmas ?? '',
    salida: c?.salida ?? '',
    otros: Array.isArray(c?.otros) ? c!.otros : []
  };
}

export function hasCivilContent(c: Partial<CivilCeremonyMusic> | null | undefined): boolean {
  if (!c) return false;
  const n = normalizeCivil(c);
  return !!(n.ingresoNovios || n.ingresoNovio || n.ingresoNovia || n.firmas || n.salida || n.otros?.length);
}
