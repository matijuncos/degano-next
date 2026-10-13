import { describe, it, expect } from 'vitest';
import { setEquipmentNote, normalizeEquipmentNote, EQUIPMENT_NOTE_MAX } from './equipmentNotes';

const list = [
  { _id: 'a', name: 'Strobe' },
  { _id: 'b', name: 'Yamaha', note: 'Llevar funda' }
];

describe('setEquipmentNote', () => {
  it('agrega una nota solo al equipo indicado', () => {
    const r = setEquipmentNote(list, 'a', '  Va en la cabina  ');
    expect(r[0]).toEqual({ _id: 'a', name: 'Strobe', note: 'Va en la cabina' });
    expect(r[1]).toBe(list[1]);
  });
  it('una nota vacía quita el campo', () => {
    const r = setEquipmentNote(list, 'b', '   ');
    expect(r[1]).toEqual({ _id: 'b', name: 'Yamaha' });
    expect('note' in r[1]).toBe(false);
  });
  it('si no cambia nada devuelve la misma lista', () => {
    expect(setEquipmentNote(list, 'b', 'Llevar funda ')).toBe(list);
    expect(setEquipmentNote(list, 'a', '')).toBe(list);
    expect(setEquipmentNote(list, 'zzz', 'x')).toBe(list);
  });
  it('recorta al largo máximo', () => {
    expect(normalizeEquipmentNote('x'.repeat(EQUIPMENT_NOTE_MAX + 50))).toHaveLength(EQUIPMENT_NOTE_MAX);
  });
});
