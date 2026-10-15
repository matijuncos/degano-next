import { describe, it, expect } from 'vitest';
import { sanitizeEventForRole } from './sanitizeEvent';

const event = {
  _id: 'e1',
  fullName: 'Ana',
  phoneNumber: '3511111111',
  extraClients: [{ fullName: 'Juan', phoneNumber: '3512222222' }],
  bands: [{ name: 'Banda', contacts: [{ name: 'Mánager', phone: '3513333333' }] }],
  payment: { totalToPay: 1000000, upfrontAmount: 300000 },
  equipment: [{ _id: 'q1', name: 'Strobe', rentalPrice: 25000, investmentPrice: 300, note: 'cabina' }],
  equipmentPrice: 25000
};

describe('sanitizeEventForRole', () => {
  it('admin ve todo tal cual', () => {
    const r: any = sanitizeEventForRole(event, 'admin');
    expect(r.payment).toEqual(event.payment);
    expect(r.phoneNumber).toBe('3511111111');
    expect(r.equipment[0].rentalPrice).toBe(25000);
    expect(r.equipmentPrice).toBe(25000);
  });

  it('manager: sin pagos, sin precios, sin teléfono de cliente; sí teléfono de shows', () => {
    const r: any = sanitizeEventForRole(event, 'manager');
    expect(r.payment).toBeNull();
    expect(r.equipmentPrice).toBeUndefined();
    expect(r.equipment[0]).toEqual({ _id: 'q1', name: 'Strobe', note: 'cabina' });
    expect(r.phoneNumber).toBe('****');
    expect(r.extraClients[0].phoneNumber).toBe('****');
    expect(r.bands[0].contacts[0].phone).toBe('3513333333');
  });

  it('viewer: tampoco ve teléfonos de shows', () => {
    const r: any = sanitizeEventForRole(event, 'viewer');
    expect(r.payment).toBeNull();
    expect(r.equipment[0].rentalPrice).toBeUndefined();
    expect(r.bands[0].contacts[0].phone).toBe('****');
  });

  it('admin con presupuesto null en la base recibe uno vacío (no rompe la pantalla)', () => {
    const r: any = sanitizeEventForRole({ ...event, payment: null }, 'admin');
    expect(r.payment).toMatchObject({ totalToPay: '', subsequentPayments: [], annexes: [], budgetFiles: [] });
    const m: any = sanitizeEventForRole({ ...event, payment: null }, 'manager');
    expect(m.payment).toBeNull();
  });

  it('no muta el evento original y tolera null', () => {
    sanitizeEventForRole(event, 'viewer');
    expect(event.equipment[0].rentalPrice).toBe(25000);
    expect(sanitizeEventForRole(null, 'viewer')).toBeNull();
  });
});
