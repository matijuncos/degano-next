// src/utils/calendarDayEvents.ts
// Eventos de un día del calendario (lista que se abre al tocar un día).
// Cuenta todo lo que pasa ese día, incluidos los que empiezan antes o terminan
// después (eventos de varios días). Día local del navegador, como la grilla.

export interface DayEventLike {
  start: Date;
  end: Date;
  allDay?: boolean;
}

export function dayBounds(day: Date): { from: Date; to: Date } {
  const from = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0, 0);
  const to = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59, 999);
  return { from, to };
}

export function eventsForDay<T extends DayEventLike>(events: T[], day: Date): T[] {
  const { from, to } = dayBounds(day);
  return events
    .filter((e) => {
      const start = new Date(e.start);
      // Sin fin o fin igual al inicio → evento de un instante
      const end = e.end ? new Date(e.end) : start;
      // Un evento de "todo el día" termina a las 00:00 del día siguiente: no cuenta ese día
      const effectiveEnd = e.allDay && end > start && end.getHours() === 0 && end.getMinutes() === 0 ? new Date(end.getTime() - 1) : end;
      return start <= to && effectiveEnd >= from;
    })
    .sort((a, b) => Number(!!b.allDay) - Number(!!a.allDay) || new Date(a.start).getTime() - new Date(b.start).getTime());
}

// "20:00 – 04:00", "Todo el día", "Desde el 10/11", etc. (relativo al día mirado)
export function dayEventTime(e: DayEventLike, day: Date): string {
  if (e.allDay) return 'Todo el día';
  const { from, to } = dayBounds(day);
  const start = new Date(e.start);
  const end = e.end ? new Date(e.end) : start;
  const hm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const dm = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  const startTxt = start < from ? `Desde el ${dm(start)}` : hm(start);
  const endTxt = end > to ? (end.getTime() - to.getTime() < 12 * 3600 * 1000 ? `${hm(end)} (+1)` : `hasta el ${dm(end)}`) : hm(end);
  return start.getTime() === end.getTime() ? startTxt : `${startTxt} – ${endTxt}`;
}

// Clave de día local ('YYYY-M-D') para agrupar eventos por celda
export const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

// ¿Ocupa más de un día en la grilla? (los de "todo el día" terminan a las 00:00
// del día siguiente: ese día no cuenta). Se usa con el `end` que dibuja la
// grilla, que ya recorta a las 23:59 los eventos cortos que pasan la medianoche.
export function isMultiDayEvent(e: DayEventLike): boolean {
  const start = new Date(e.start);
  let end = e.end ? new Date(e.end) : start;
  if (e.allDay && end > start && end.getHours() === 0 && end.getMinutes() === 0) end = new Date(end.getTime() - 1);
  return dayKey(start) !== dayKey(end) && end > start;
}

// Eventos de un solo día agrupados por día (para la lista con scroll de cada celda)
export function singleDayEventsByDay<T extends DayEventLike>(events: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const e of events) {
    if (isMultiDayEvent(e)) continue;
    const k = dayKey(new Date(e.start));
    map.set(k, [...(map.get(k) ?? []), e]);
  }
  for (const list of map.values()) {
    list.sort((a, b) => Number(!!b.allDay) - Number(!!a.allDay) || new Date(a.start).getTime() - new Date(b.start).getTime());
  }
  return map;
}
