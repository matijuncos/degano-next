import { describe, it, expect } from 'vitest';
import { rangeFromDays, summarizeAvailability } from './availabilityView';

describe('rangeFromDays: días completos en hora argentina', () => {
  it('del 00:00 del primer día al 23:59:59.999 del último', () => {
    const r = rangeFromDays(new Date(2026, 10, 20), new Date(2026, 10, 22)); // 20/11 → 22/11 (fecha local del selector)
    expect(r).toEqual({ start: '2026-11-20T03:00:00.000Z', end: '2026-11-23T02:59:59.999Z' });
  });
  it('acepta el texto "YYYY-MM-DD" que devuelve Mantine 8', () => {
    expect(rangeFromDays('2026-11-20', '2026-11-22')).toEqual({ start: '2026-11-20T03:00:00.000Z', end: '2026-11-23T02:59:59.999Z' });
    expect(rangeFromDays('2026-11-22', '2026-11-20')).toBeNull(); // al revés
  });
  it('un solo día', () => {
    expect(rangeFromDays(new Date(2026, 10, 20), new Date(2026, 10, 20))!.end).toBe('2026-11-21T02:59:59.999Z');
  });
  it('rango incompleto o inválido: null', () => {
    expect(rangeFromDays(new Date(2026, 10, 20), null)).toBeNull();
    expect(rangeFromDays(null, null)).toBeNull();
  });
});

describe('summarizeAvailability: por equipo (nombre), con categoría y sus subcategorías', () => {
  const categories = [
    { _id: 'son', name: 'SONIDO' },
    { _id: 'cd', name: 'CD Players', parentId: 'son' },
    { _id: 'ilu', name: 'ILUMINACION' }
  ];
  const busy = (eventId: string, eventType: string) => ({ eventId, eventType, location: 'L', clientName: 'C', startDate: 'a', endDate: 'b' });
  const equipment = [
    { _id: '1', name: 'CD Gemini', categoryId: 'cd', outOfService: { isOut: false } },
    { _id: '2', name: 'CD Gemini', categoryId: 'cd', outOfService: { isOut: true, reason: 'En Evento' }, busyWith: [busy('ev1', 'Boda')] },
    { _id: '3', name: 'CD Gemini', categoryId: 'cd', outOfService: { isOut: true, reason: 'Reparación' } },
    { _id: '4', name: 'CD Sony', categoryId: 'cd', outOfService: { isOut: true, reason: 'En Evento' }, busyWith: [busy('ev1', 'Boda')] },
    { _id: '5', name: 'Cabezal', categoryId: 'ilu', outOfService: { isOut: false } }
  ];

  it('cuenta total / disponibles / ocupados / fuera de servicio por equipo', () => {
    const rows = summarizeAvailability(equipment, categories, { scopeCategoryId: 'son' });
    expect(rows.map((r) => [r.name, r.total, r.available, r.busy, r.outOfService])).toEqual([
      ['CD Gemini', 3, 1, 1, 1],
      ['CD Sony', 1, 0, 1, 0]
    ]);
    expect(rows[0].path).toBe('SONIDO › CD Players');
  });
  it('agrupa los eventos que ocupan (sin repetir) con cuántas unidades', () => {
    const rows = summarizeAvailability(equipment, categories, { scopeCategoryId: 'cd' });
    expect(rows[0].events).toEqual([{ ...busy('ev1', 'Boda'), units: 1 }]);
  });
  it('sin categoría elegida: todo el stock', () => {
    expect(summarizeAvailability(equipment, categories, {}).map((r) => r.name)).toEqual(['Cabezal', 'CD Gemini', 'CD Sony']);
  });
  it('buscador por nombre (sin mayúsculas ni acentos)', () => {
    expect(summarizeAvailability(equipment, categories, { search: 'sony' }).map((r) => r.name)).toEqual(['CD Sony']);
    expect(summarizeAvailability([{ _id: 'x', name: 'Cañón Láser', categoryId: 'ilu' }], categories, { search: 'canon laser' }).length).toBe(1);
  });
  it('tolera datos incompletos', () => {
    expect(summarizeAvailability(undefined as any, categories, {})).toEqual([]);
  });
});

