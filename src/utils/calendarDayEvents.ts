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
