import { describe, it, expect } from 'vitest';
import {
  classifyHistoryEntry,
  meaningfulChanges,
  filterHistory,
  stripHistoryPrices,
  groupHistoryByMonth,
  arMonthKey,
  monthLabel,
  summarizeLife,
  parseHistoryNote
} from './equipmentLife';

const d = (iso: string) => iso;

describe('classifyHistoryEntry', () => {
  it('tipos principales', () => {
    expect(classifyHistoryEntry({ action: 'creacion', date: d('2026-01-08') })).toBe('alta');
    expect(classifyHistoryEntry({ action: 'uso_evento', date: d('2026-01-08') })).toBe('evento');
    expect(classifyHistoryEntry({ action: 'nota', date: d('2026-01-08') })).toBe('nota');
    expect(classifyHistoryEntry({ action: 'eliminacion', date: d('2026-01-08') })).toBe('baja');
  });
  it('cambios de estado: a mano vs automáticos', () => {
    expect(classifyHistoryEntry({ action: 'cambio_estado', date: '', fromValue: 'Disponible', toValue: 'Fuera de servicio' })).toBe('estado');
    expect(classifyHistoryEntry({ action: 'cambio_estado', date: '', fromValue: 'En Evento', toValue: 'Disponible', details: 'Liberado automáticamente - evento finalizado' })).toBe('auto');
    expect(classifyHistoryEntry({ action: 'cambio_estado', date: '', fromValue: 'En Evento', toValue: 'Disponible', details: 'Removido de Boda - Casas Viejas' })).toBe('quitado');
    expect(classifyHistoryEntry({ action: 'cambio_estado', date: '', fromValue: 'Disponible', toValue: 'Disponible' })).toBe('auto');
  });
  it('traslado sin destino es ruido', () => {
    expect(classifyHistoryEntry({ action: 'traslado', date: '', toValue: '' })).toBe('auto');
    expect(classifyHistoryEntry({ action: 'traslado', date: '', toValue: 'Depósito' })).toBe('traslado');
  });
});

describe('filterHistory', () => {
  const entries = [
    { action: 'uso_evento', date: '2026-10-01' },
    { action: 'cambio_estado', date: '2026-10-02', fromValue: 'En Evento', toValue: 'Disponible' },
    { action: 'nota', date: '2026-10-03' },
    { action: 'traslado', date: '2026-10-04', toValue: 'Depósito' }
  ];
  it('por defecto oculta los automáticos', () => {
    expect(filterHistory(entries, 'todo', false)).toHaveLength(3);
    expect(filterHistory(entries, 'todo', true)).toHaveLength(4);
  });
  it('filtros por tipo (los automáticos nunca entran en un filtro)', () => {
    expect(filterHistory(entries, 'notas', true).map((e) => e.action)).toEqual(['nota']);
    expect(filterHistory(entries, 'eventos', true).map((e) => e.action)).toEqual(['uso_evento']);
  });
});

describe('stripHistoryPrices', () => {
  it('saca los cambios de precio y las ediciones que solo eran precio', () => {
    const out = stripHistoryPrices([
      { action: 'edicion', date: '', changes: [{ field: 'rentalPrice', oldValue: 1, newValue: 2 }] },
      { action: 'edicion', date: '', changes: [{ field: 'investmentPrice', oldValue: 1, newValue: 2 }, { field: 'name', oldValue: 'a', newValue: 'b' }] },
      { action: 'nota', date: '' }
    ]);
    expect(out).toHaveLength(2);
    expect(out[0].changes).toEqual([{ field: 'name', oldValue: 'a', newValue: 'b' }]);
  });
});

describe('agrupado por mes (hora argentina)', () => {
  it('clave y nombre del mes', () => {
    // 1/11 01:00 UTC = 31/10 22:00 en Argentina
    expect(arMonthKey('2026-11-01T01:00:00Z')).toBe('2026-10');
    expect(monthLabel('2026-10')).toBe('Octubre 2026');
  });
  it('del más nuevo al más viejo', () => {
    const g = groupHistoryByMonth([
      { action: 'nota', date: '2026-09-15T12:00:00Z' },
      { action: 'nota', date: '2026-10-20T12:00:00Z' },
      { action: 'nota', date: '2026-10-02T12:00:00Z' }
    ]);
    expect(g.map((x) => [x.label, x.entries.length])).toEqual([['Octubre 2026', 2], ['Septiembre 2026', 1]]);
    expect(g[0].entries[0].date).toBe('2026-10-20T12:00:00Z');
  });
});

describe('summarizeLife', () => {
  const now = new Date('2026-11-02T15:00:00Z');
  it('eventos hechos y próximos, último evento, estados y notas', () => {
    const s = summarizeLife(
      [
        { action: 'creacion', date: '2026-01-08T19:07:13Z' },
        { action: 'cambio_estado', date: '2026-03-01', fromValue: 'Disponible', toValue: 'Fuera de servicio' },
        { action: 'cambio_estado', date: '2026-03-10', fromValue: 'Fuera de servicio', toValue: 'Disponible' },
        { action: 'cambio_estado', date: '2026-04-01', fromValue: 'En Evento', toValue: 'Disponible', details: 'Liberado automáticamente' },
        { action: 'traslado', date: '2026-05-01', toValue: 'Depósito' },
        { action: 'nota', date: '2026-06-01' }
      ],
      [
        { _id: 'a', date: '2026-10-10T23:00:00Z', type: 'Boda', lugar: 'Villa Golf' },
        { _id: 'b', date: '2026-09-01T23:00:00Z', type: 'Fiesta' },
        { _id: 'c', date: '2026-12-01T23:00:00Z', type: 'Boda' }
      ],
      now
    );
    expect(s).toEqual({
      since: '2026-01-08T19:07:13.000Z',
      eventsDone: 2,
      eventsUpcoming: 1,
      lastEvent: { _id: 'a', date: '2026-10-10T23:00:00.000Z', label: 'Boda - Villa Golf' },
      outOfServiceTimes: 1,
      moves: 1,
      notes: 1
    });
  });
  it('sin datos', () => {
    expect(summarizeLife([], [], now)).toMatchObject({ since: null, eventsDone: 0, lastEvent: null });
  });
});

describe('parseHistoryNote', () => {
  it('texto válido o null', () => {
    expect(parseHistoryNote('  Cambio de potenciómetro \r\n ok ')).toBe('Cambio de potenciómetro \n ok');
    expect(parseHistoryNote('   ')).toBeNull();
    expect(parseHistoryNote({ $ne: 1 })).toBeNull();
    expect(parseHistoryNote('x'.repeat(3000))!.length).toBe(2000);
  });
});

describe('ediciones sin cambios reales', () => {
  it('vacío → vacío no es un cambio', () => {
    const changes = [
      { field: 'code', oldValue: 'XLR 009', newValue: '' },
      { field: 'imageUrl', oldValue: undefined, newValue: '' },
      { field: 'pdfUrl', oldValue: null, newValue: '' }
    ];
    expect(meaningfulChanges(changes).map((c) => c.field)).toEqual(['code']);
    expect(classifyHistoryEntry({ action: 'edicion', date: '', changes })).toBe('edicion');
    expect(classifyHistoryEntry({ action: 'edicion', date: '', changes: changes.slice(1) })).toBe('auto');
  });
});

describe('renombre de lugar propagado', () => {
  it('es automático', () => {
    expect(
      classifyHistoryEntry({ action: 'edicion', date: '', changes: [{ field: 'lugar del evento', oldValue: 'A', newValue: 'B' }] })
    ).toBe('auto');
  });
});
