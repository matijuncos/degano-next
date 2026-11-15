import { describe, it, expect } from 'vitest';
import { SUGGESTED_ARRIVAL_HOURS_BEFORE, suggestedArrival, nextArrival } from './arrivalSuggestion';

describe('suggestedArrival: llegada sugerida = 2 h antes del inicio (hora argentina)', () => {
  it('evento 19:00 → mismo día 17:00', () => {
    expect(SUGGESTED_ARRIVAL_HOURS_BEFORE).toBe(2);
    expect(suggestedArrival('2026-12-07T22:00:00.000Z')).toEqual({ day: '2026-12-07', time: '17:00' });
  });
  it('evento 01:00 → 23:00 del día anterior (2 h antes manda)', () => {
    expect(suggestedArrival('2026-12-08T04:00:00.000Z')).toEqual({ day: '2026-12-07', time: '23:00' });
  });
  it('sin fecha válida: null', () => {
    expect(suggestedArrival(null)).toBeNull();
    expect(suggestedArrival('basura')).toBeNull();
  });
});

describe('nextArrival: cuándo completar / actualizar la sugerencia', () => {
  const S1 = '2026-12-07T22:00:00.000Z'; // 19:00 → sugerido 17:00
  const S2 = '2026-12-07T23:30:00.000Z'; // 20:30 → sugerido 18:30
  it('llegada vacía: se completa con la sugerencia', () => {
    expect(nextArrival({ day: null, time: '' }, null, S1)).toEqual({ day: '2026-12-07', time: '17:00' });
  });
  it('si sigue con el valor sugerido y cambia el horario del evento: se actualiza', () => {
    expect(nextArrival({ day: '2026-12-07', time: '17:00' }, S1, S2)).toEqual({ day: '2026-12-07', time: '18:30' });
  });
  it('si la cambiaron a mano: NO se toca', () => {
    expect(nextArrival({ day: '2026-12-07', time: '15:00' }, S1, S2)).toBeNull();
    expect(nextArrival({ day: '2026-12-06', time: '17:00' }, S1, S2)).toBeNull();
  });
  it('con valor cargado y sin horario anterior (ej. borrador o evento guardado): NO se toca', () => {
    expect(nextArrival({ day: '2026-12-07', time: '16:00' }, null, S1)).toBeNull();
  });
  it('si ya está en la sugerencia nueva no hace nada (evita escrituras de más)', () => {
    expect(nextArrival({ day: '2026-12-07', time: '17:00' }, null, S1)).toBeNull();
  });
  it('solo día cargado (sin hora): se considera a mano, no se toca', () => {
    expect(nextArrival({ day: '2026-12-07', time: '' }, S1, S2)).toBeNull();
  });
});
