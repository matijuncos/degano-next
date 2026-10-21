import { describe, it, expect } from 'vitest';
import {
  rateAt,
  rolesAmount,
  rolesLabel,
  upsertRate,
  normalizeRoleIds,
  sanitizeStaffRoleIds,
  parseRoleInput,
  roleKey,
  legacyRolToRoleIds,
  StaffRole
} from './staffRoles';

const DJ = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const SON = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const NEW = 'cccccccccccccccccccccccc';
const roles = new Map<string, StaffRole>([
  [DJ, { _id: DJ, name: 'DJ', rates: [{ amount: 350000, from: '2026-10-21' }, { amount: 400000, from: '2026-12-01' }] }],
  [SON, { _id: SON, name: 'Sonidista', rates: [{ amount: 350000, from: '2026-10-21' }] }],
  [NEW, { _id: NEW, name: 'Nuevo' }] // creado sin monto
]);

describe('rateAt', () => {
  it('toma el monto vigente ese día', () => {
    const r = roles.get(DJ)!.rates;
    expect(rateAt(r, '2026-10-20')).toBeNull(); // antes del inicio
    expect(rateAt(r, '2026-10-21')).toBe(350000);
    expect(rateAt(r, '2026-11-30')).toBe(350000);
    expect(rateAt(r, '2026-12-01')).toBe(400000); // el cambio solo impacta desde su fecha
  });
  it('sin montos → null', () => {
    expect(rateAt(undefined, '2026-11-01')).toBeNull();
  });
});

describe('rolesAmount', () => {
  it('varios roles: se suman', () => {
    expect(rolesAmount([DJ, SON], roles, '2026-11-10')).toBe(700000);
  });
  it('un rol sin monto no suma; si ninguno tiene → null', () => {
    expect(rolesAmount([DJ, NEW], roles, '2026-11-10')).toBe(350000);
    expect(rolesAmount([NEW], roles, '2026-11-10')).toBeNull();
    expect(rolesAmount([], roles, '2026-11-10')).toBeNull();
    expect(rolesAmount(['ffffffffffffffffffffffff'], roles, '2026-11-10')).toBeNull();
  });
  it('antes del inicio de los montos → null', () => {
    expect(rolesAmount([DJ, SON], roles, '2026-10-15')).toBeNull();
  });
});

describe('rolesLabel / upsertRate / normalizeRoleIds', () => {
  it('nombres unidos con " / "', () => {
    expect(rolesLabel([DJ, SON], roles)).toBe('DJ / Sonidista');
    expect(rolesLabel([DJ, 'ffffffffffffffffffffffff'], roles)).toBe('DJ');
  });
  it('mismo día reemplaza, otro día agrega ordenado', () => {
    const r = upsertRate([{ amount: 1, from: '2026-11-01' }], 2, '2026-10-21');
    expect(r).toEqual([{ amount: 2, from: '2026-10-21' }, { amount: 1, from: '2026-11-01' }]);
    expect(upsertRate(r, 3, '2026-11-01')).toEqual([{ amount: 2, from: '2026-10-21' }, { amount: 3, from: '2026-11-01' }]);
  });
  it('solo ids válidos y sin repetir', () => {
    expect(normalizeRoleIds([DJ, DJ, 'x', 3, ` ${SON} `])).toEqual([DJ, SON]);
    expect(normalizeRoleIds('DJ')).toEqual([]);
  });
});

describe('parseRoleInput', () => {
  it('alta: nombre obligatorio, monto opcional con fecha de hoy', () => {
    expect(parseRoleInput({ name: '  ' }, '2026-10-21', true).ok).toBe(false);
    expect(parseRoleInput({ name: ' Ilum  Esp ' }, '2026-10-21', true)).toEqual({ ok: true, value: { name: 'Ilum Esp' } });
    expect(parseRoleInput({ name: 'DJ', amount: '350.000' }, '2026-10-21', true)).toEqual({
      ok: true,
      value: { name: 'DJ', rate: { amount: 350000, from: '2026-10-21' } }
    });
  });
  it('cambio de monto desde una fecha; datos malos se rechazan', () => {
    expect(parseRoleInput({ amount: 400000, from: '2026-12-01' }, '2026-10-21', false)).toEqual({
      ok: true,
      value: { rate: { amount: 400000, from: '2026-12-01' } }
    });
    expect(parseRoleInput({ amount: -1 }, '2026-10-21', false).ok).toBe(false);
    expect(parseRoleInput({ amount: 1, from: '1/12/2026' }, '2026-10-21', false).ok).toBe(false);
  });
});

describe('legacyRolToRoleIds (roles escritos a mano)', () => {
  const aliases: Record<string, string> = {
    dj: 'DJ',
    il: 'Ilum',
    iluminador: 'Ilum',
    ilunador: 'Ilum',
    'tecnico iluminador': 'Ilum',
    ts: 'Sonidista',
    'tecnico sonido': 'Sonidista',
    at: 'AT'
  };
  const byName = new Map([
    ['dj', 'id-dj'],
    ['ilum', 'id-ilum'],
    ['sonidista', 'id-son'],
    ['at', 'id-at']
  ]);
  it('variantes de escritura', () => {
    expect(legacyRolToRoleIds('Dj', aliases, byName)).toEqual(['id-dj']);
    expect(legacyRolToRoleIds(' Técnico Iluminador ', aliases, byName)).toEqual(['id-ilum']);
    expect(legacyRolToRoleIds('Ilunador', aliases, byName)).toEqual(['id-ilum']);
  });
  it('combinados → varios roles', () => {
    expect(legacyRolToRoleIds('IL / AT', aliases, byName)).toEqual(['id-ilum', 'id-at']);
    expect(legacyRolToRoleIds('Tecnico Sonido / Iluminador', aliases, byName)).toEqual(['id-son', 'id-ilum']);
  });
  it('sin rol o sin equivalencia → null (queda como está)', () => {
    expect(legacyRolToRoleIds('Sin rol', aliases, byName)).toBeNull();
    expect(legacyRolToRoleIds('', aliases, byName)).toBeNull();
    expect(legacyRolToRoleIds('Catering', aliases, byName)).toBeNull();
    expect(legacyRolToRoleIds('DJ / Catering', aliases, byName)).toBeNull();
  });
  it('roleKey ignora tildes y mayúsculas', () => {
    expect(roleKey(' TÉCNICO  Sonido')).toBe('tecnico sonido');
  });
});

describe('sanitizeStaffRoleIds', () => {
  it('limpia roleIds y deja el resto igual', () => {
    expect(
      sanitizeStaffRoleIds([
        { employeeId: 'e1', rol: 'DJ', roleIds: [DJ, { $ne: 1 }] },
        { employeeId: 'e2', rol: 'viejo' }
      ])
    ).toEqual([
      { employeeId: 'e1', rol: 'DJ', roleIds: [DJ] },
      { employeeId: 'e2', rol: 'viejo' }
    ]);
    expect(sanitizeStaffRoleIds(undefined)).toBeUndefined();
  });
});
