import { describe, it, expect } from 'vitest';
import { normalizeEmail, resolveEmployee } from './resolveEmployee';

// Stub mínimo de Mongo: solo lo que usa resolveEmployee (find → limit → toArray)
const dbWith = (matches: any[]) =>
  ({
    collection: () => ({
      find: () => ({
        limit: () => ({
          toArray: async () => matches
        })
      })
    })
  }) as any;

describe('normalizeEmail', () => {
  it('pasa a minúsculas y recorta espacios', () => {
    expect(normalizeEmail('  Juan@Degano.COM ')).toBe('juan@degano.com');
  });

  it('devuelve vacío si no es string', () => {
    expect(normalizeEmail(undefined)).toBe('');
    expect(normalizeEmail(null)).toBe('');
    expect(normalizeEmail(42)).toBe('');
  });
});

describe('resolveEmployee', () => {
  it('corta si no hay usuario logueado', async () => {
    const result = await resolveEmployee(dbWith([]), null);
    expect(result).toEqual({ ok: false, reason: 'no_session' });
  });

  it('corta si la sesión no trae email', async () => {
    const result = await resolveEmployee(dbWith([]), { sub: 'auth0|1' });
    expect(result).toEqual({ ok: false, reason: 'no_email' });
  });

  it('corta si ningún empleado tiene ese email', async () => {
    const result = await resolveEmployee(dbWith([]), {
      sub: 'auth0|1',
      email: 'nadie@degano.com'
    });
    expect(result).toEqual({ ok: false, reason: 'not_linked' });
  });

  it('resuelve el empleado cuando hay exactamente uno', async () => {
    const employee = { _id: 'emp1', fullName: 'Martín Gómez' };
    const result = await resolveEmployee(dbWith([employee]), {
      sub: 'auth0|1',
      email: 'Martin@Degano.com'
    });
    expect(result).toEqual({ ok: true, employee });
  });

  // El caso que justifica no usar findOne: con dos registros iguales, elegir uno
  // mostraría los datos de otra persona sin que nadie se entere.
  it('NO elige si hay más de un empleado con el mismo email', async () => {
    const result = await resolveEmployee(
      dbWith([{ _id: 'emp1' }, { _id: 'emp2' }]),
      { sub: 'auth0|1', email: 'repetido@degano.com' }
    );
    expect(result).toEqual({ ok: false, reason: 'ambiguous' });
  });
});
