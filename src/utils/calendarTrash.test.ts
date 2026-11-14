import { describe, it, expect } from 'vitest';
import { UNDO_SECONDS, TRASH_RETENTION_DAYS, TRASH_TTL_SECONDS, toTrash, fromTrash } from './calendarTrash';

describe('calendarTrash: papelera de eventos de calendarios extras', () => {
  const now = new Date('2026-11-14T15:00:00.000Z');
  const ev = {
    _id: 'evt1',
    title: 'Gastos Diarios',
    start: new Date('2026-11-14T12:00:00.000Z'),
    end: new Date('2026-11-14T13:00:00.000Z'),
    allDay: false,
    calendarId: 'cal1',
    description: 'Nafta $20.000',
    staff: [{ employeeId: 'e1', employeeName: 'Ana', rol: 'AT' }]
  };

  it('el deshacer dura 30 segundos', () => {
    expect(UNDO_SECONDS).toBe(30);
  });
  it('la papelera se limpia sola a los 15 días (índice TTL de MongoDB)', () => {
    expect(TRASH_RETENTION_DAYS).toBe(15);
    expect(TRASH_TTL_SECONDS).toBe(15 * 24 * 60 * 60);
  });
  it('a la papelera va una copia completa, con quién y cuándo', () => {
    expect(toTrash(ev, { deletedBy: 'juan@degano.com', now })).toEqual({
      originalId: 'evt1',
      calendarId: 'cal1',
      event: ev,
      deletedAt: now,
      deletedBy: 'juan@degano.com'
    });
  });
  it('restaurar devuelve el evento igual, con el MISMO _id (así se relinkean sus cobros)', () => {
    const trash = { _id: 'trash1', ...toTrash(ev, { deletedBy: 'x', now }) };
    expect(fromTrash(trash)).toEqual(ev);
  });
  it('no se pierde nada aunque el evento tenga campos que no conocemos', () => {
    const raro = { ...ev, colorExtra: 'x', algo: { a: 1 } };
    expect(fromTrash({ ...toTrash(raro, { deletedBy: 'x', now }) })).toEqual(raro);
  });
});
