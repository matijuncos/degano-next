// utils/dateUtils.ts
import { DateValue } from '@mantine/dates';

export function isDateBetweenInclusive(
  target: Date,
  start?: Date | null,
  end?: Date | null
): boolean {
  if (!start || !end) return false;

  // Convertimos a fechas sin hora (00:00:00)
  const t = new Date(target);
  const s = new Date(start);
  const e = new Date(end);

  t.setHours(0, 0, 0, 0);
  s.setHours(0, 0, 0, 0);
  e.setHours(0, 0, 0, 0);

  return t >= s && t <= e;
}

export function combineDateAndTime(date: DateValue | null, timeStr: string): Date | null {
  if (!date || !timeStr) return null;

  let d: Date | null = null;

  if (date instanceof Date) {
    d = date;
  } else if (typeof date === 'string') {
    // Soporta tanto "DD/MM/YYYY" como "YYYY-MM-DD"
    if (date.includes('/')) {
      const [day, month, year] = date.split('/').map(Number);
      d = new Date(year, month - 1, day);
    } else if (date.includes('-')) {
      const [year, month, day] = date.split('-').map(Number);
      d = new Date(year, month - 1, day);
    }
  }

  if (!d || isNaN(d.getTime())) return null; // <-- seguridad total

  const [hours, minutes] = timeStr.split(':').map(Number);
  const combined = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hours, minutes, 0, 0);

  return isNaN(combined.getTime()) ? null : combined;
}

const pad2 = (n: number) => String(n).padStart(2, '0');

export function toTimeString(d: Date | null): string {
  return d ? `${pad2(d.getHours())}:${pad2(d.getMinutes())}` : '';
};