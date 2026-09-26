import { describe, it, expect } from 'vitest';
import { nextTaskStatus, prevTaskStatus } from './boards';

describe('nextTaskStatus', () => {
  it('avanza un paso en el flujo', () => {
    expect(nextTaskStatus('pending')).toBe('in_progress');
    expect(nextTaskStatus('in_progress')).toBe('done');
  });
  it('no avanza desde Finalizada', () => {
    expect(nextTaskStatus('done')).toBeNull();
  });
});

describe('prevTaskStatus', () => {
  it('vuelve siempre al estado anterior', () => {
    expect(prevTaskStatus('done')).toBe('in_progress');
    expect(prevTaskStatus('in_progress')).toBe('pending');
  });
  it('no retrocede desde Pendiente', () => {
    expect(prevTaskStatus('pending')).toBeNull();
  });
});
