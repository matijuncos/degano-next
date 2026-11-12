// src/components/DayEventsSheet/MonthCellEvents.tsx
// Vista de mes: los eventos de UN día se dibujan acá, en una lista con scroll
// propia de cada celda (debajo de las barras de los eventos de varios días, que
// sigue dibujando el calendario). Así scrollea solo ese día, no la semana.
'use client';
import { useEffect, useRef } from 'react';

function EventChip({ event, style, onSelect }: { event: any; style: React.CSSProperties; onSelect: (e: any) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  // El calendario escucha mousedown/touchstart en su contenedor para "seleccionar
  // días" (crear evento): el toque en un evento no tiene que llegar hasta ahí.
  // Tiene que ser un listener nativo (React escucha recién en la raíz).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const stop = (ev: Event) => ev.stopPropagation();
    el.addEventListener('mousedown', stop);
    el.addEventListener('touchstart', stop, { passive: true });
    return () => {
      el.removeEventListener('mousedown', stop);
      el.removeEventListener('touchstart', stop);
    };
  }, []);
  return (
    <div
      ref={ref}
      role='button'
      tabIndex={0}
      className='dg-day-event'
      title={event.title}
      style={style}
      onClick={() => onSelect(event)}
      onKeyDown={(ev) => {
        if (ev.key === 'Enter') onSelect(event);
      }}
    >
      {event.title}
    </div>
  );
}

export default function MonthCellEvents({
  events,
  styleOf,
  onSelect
}: {
  events: any[];
  styleOf: (event: any) => React.CSSProperties;
  onSelect: (event: any) => void;
}) {
  if (!events.length) return null;
  return (
    <div className='dg-day-list'>
      {events.map((e, i) => (
        <EventChip key={`${e._id ?? e.title}-${i}`} event={e} style={styleOf(e)} onSelect={onSelect} />
      ))}
    </div>
  );
}
