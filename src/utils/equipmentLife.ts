// src/utils/equipmentLife.ts
// Historial permanente de un equipo ("la vida del equipo"). Lógica pura (testeada).
//
// El historial (colección equipmentHistory) NO se edita ni se borra: solo se
// agregan registros. Las notas que se escriben a mano son registros 'nota'.
// La mayoría de los registros son movimientos automáticos (reservas que se
// liberan solas, etc.): por defecto se muestran solo los importantes.

export type HistoryKind =
  | 'alta' // equipo creado
  | 'evento' // asignado / programado para un evento
  | 'quitado' // lo sacaron de un evento
  | 'estado' // fuera de servicio ↔ disponible (a mano)
  | 'traslado'
  | 'edicion'
  | 'nota'
  | 'baja' // equipo eliminado
  | 'auto'; // movimiento automático (liberado al terminar el evento, etc.)

export interface HistoryEntryLike {
  action: string;
  date: string | Date;
  details?: string;
  fromValue?: string;
  toValue?: string;
  changes?: { field: string; oldValue: any; newValue: any }[];
  eventId?: string;
  eventDate?: string | Date;
}

// Nombre para mostrar de cada campo editado
export const HISTORY_FIELD_LABELS: Record<string, string> = {
  name: 'Nombre',
  code: 'Código',
  brand: 'Marca',
  model: 'Modelo',
  serialNumber: 'N° de serie',
  rentalPrice: 'Precio de alquiler',
  investmentPrice: 'Precio de inversión',
  weight: 'Peso',
  location: 'Ubicación',
  propiedad: 'Propiedad',
  history: 'Notas (texto anterior)',
  imageUrl: 'Imagen',
  pdfUrl: 'Manual / PDF',
  'outOfService.isOut': 'Fuera de servicio',
  'outOfService.reason': 'Motivo'
};

export const HISTORY_PRICE_FIELDS = ['rentalPrice', 'investmentPrice'];

const isBlank = (v: any) => v === undefined || v === null || v === '';

// Campo con el que se registra el renombre del lugar de un evento
export const VENUE_RENAME_FIELD = 'lugar del evento';

// Cambios reales de una edición: el sistema viejo registraba como cambio pasar
// de "sin dato" a "vacío" (ej. Imagen: vacío → vacío). Esos no se muestran.
export function meaningfulChanges(changes: HistoryEntryLike['changes']) {
  return (changes ?? []).filter((c) => !(isBlank(c.oldValue) && isBlank(c.newValue)) && c.oldValue !== c.newValue);
}

export function classifyHistoryEntry(e: HistoryEntryLike): HistoryKind {
  switch (e.action) {
    case 'creacion':
      return 'alta';
    case 'uso_evento':
      return 'evento';
    case 'nota':
      return 'nota';
    case 'eliminacion':
      return 'baja';
    case 'edicion': {
      // Una edición que solo tenía "vacío → vacío" no cambió nada
      if (e.changes?.length && !meaningfulChanges(e.changes).length) return 'auto';
      // Se renombró el lugar de un evento (panel de Lugares): no es un cambio
      // del equipo, lo hace el sistema en todas sus reservas
      if (e.changes?.length && e.changes.every((c) => c.field === VENUE_RENAME_FIELD)) return 'auto';
      return 'edicion';
    }
    case 'traslado':
      // "Trasladado de sin ubicación a " (sin destino): ruido de datos viejos
      return e.toValue && e.toValue.trim() ? 'traslado' : 'auto';
    case 'cambio_estado': {
      const details = e.details ?? '';
      if (/^Removido de /i.test(details)) return 'quitado';
      // Liberaciones automáticas y cambios entre eventos: lo hace el sistema
      if (e.fromValue === 'En Evento' || /autom[aá]tic/i.test(details)) return 'auto';
      if (e.fromValue === e.toValue) return 'auto';
      return 'estado';
    }
    default:
      return 'auto';
  }
}

// Filtros del modal
export const HISTORY_FILTERS = {
  todo: null,
  eventos: ['evento', 'quitado'],
  estado: ['estado', 'baja'],
  traslados: ['traslado'],
  cambios: ['alta', 'edicion'],
  notas: ['nota']
} as const satisfies Record<string, readonly HistoryKind[] | null>;

export type HistoryFilter = keyof typeof HISTORY_FILTERS;

export function filterHistory<T extends HistoryEntryLike>(
  entries: T[],
  filter: HistoryFilter,
  showAuto: boolean
): T[] {
  const kinds = HISTORY_FILTERS[filter] as readonly HistoryKind[] | null;
  return entries.filter((e) => {
    const k = classifyHistoryEntry(e);
    if (k === 'auto') return showAuto && !kinds;
    return !kinds || kinds.includes(k);
  });
}

// Los precios son solo para admin (también en el historial): sin permiso se
// sacan los cambios de precio; una edición que solo cambió precios no se muestra.
export function stripHistoryPrices<T extends HistoryEntryLike>(entries: T[]): T[] {
  const out: T[] = [];
  for (const e of entries) {
    if (e.action !== 'edicion' || !e.changes?.length) {
      out.push(e);
      continue;
    }
    const changes = e.changes.filter((c) => !HISTORY_PRICE_FIELDS.includes(c.field));
    if (changes.length) out.push({ ...e, changes });
  }
  return out;
}

// Mes argentino de un registro ('YYYY-MM') y su nombre ("Octubre 2026")
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
export function arMonthKey(date: string | Date): string {
  return new Date(new Date(date).getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 7);
}
export function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

// Del más nuevo al más viejo, agrupado por mes
export function groupHistoryByMonth<T extends HistoryEntryLike>(entries: T[]) {
  const sorted = [...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const groups: { key: string; label: string; entries: T[] }[] = [];
  for (const e of sorted) {
    const key = arMonthKey(e.date);
    const last = groups[groups.length - 1];
    if (last?.key === key) last.entries.push(e);
    else groups.push({ key, label: monthLabel(key), entries: [e] });
  }
  return groups;
}

export interface LifeEvent {
  _id: string;
  date: string | Date;
  type?: string;
  lugar?: string;
}

export interface LifeSummary {
  since: string | null; // alta (o primer registro)
  eventsDone: number; // eventos (que existen) en los que está, hasta hoy
  eventsUpcoming: number; // eventos futuros en los que está
  lastEvent: { _id: string; date: string; label: string } | null;
  outOfServiceTimes: number; // veces que se lo puso fuera de servicio
  moves: number; // traslados
  notes: number;
}

// Resumen de la vida del equipo. Los eventos salen de la colección events
// (los que existen hoy y lo tienen asignado): es el dato real, el historial
// también guarda reservas que después se quitaron.
export function summarizeLife(entries: HistoryEntryLike[], events: LifeEvent[], now: Date): LifeSummary {
  const t = now.getTime();
  const done = events.filter((e) => new Date(e.date).getTime() <= t);
  const last = done.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  const created = entries.find((e) => e.action === 'creacion');
  const first = [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
  const sinceDate = created?.date ?? first?.date;
  let outOfServiceTimes = 0, moves = 0, notes = 0;
  for (const e of entries) {
    const k = classifyHistoryEntry(e);
    if (k === 'estado' && e.toValue === 'Fuera de servicio') outOfServiceTimes++;
    else if (k === 'traslado') moves++;
    else if (k === 'nota') notes++;
  }
  return {
    since: sinceDate ? new Date(sinceDate).toISOString() : null,
    eventsDone: done.length,
    eventsUpcoming: events.length - done.length,
    lastEvent: last
      ? {
          _id: String(last._id),
          date: new Date(last.date).toISOString(),
          label: [last.type, last.lugar].filter(Boolean).join(' - ') || 'Evento'
        }
      : null,
    outOfServiceTimes,
    moves,
    notes
  };
}

// Texto de una nota: sin espacios de más al principio/fin, largo razonable
export function parseHistoryNote(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const text = raw.replace(/\r\n/g, '\n').trim().slice(0, 2000);
  return text || null;
}
