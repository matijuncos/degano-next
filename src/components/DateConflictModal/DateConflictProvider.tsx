'use client';
import React, { createContext, useCallback, useContext, useState } from 'react';
import { notifications } from '@mantine/notifications';
import { IconCheck } from '@tabler/icons-react';
import type { ConflictResolution, DateConflict } from '@/utils/dateChangeConflicts';
import DateConflictModal from './DateConflictModal';

/**
 * Guardado de un evento que, si el cambio de fechas choca con otro evento
 * (409 con `conflicts`), abre la ventana para resolverlo y reenvía el MISMO
 * guardado con lo elegido. Abrir la ventana: 0 requests; aplicar: 1.
 * Fuera del proveedor, `useEventSave` hace el PUT simple.
 */

export type AppliedChange = { otherEventId: string; otherEventName: string; fromCode: string; toCode: string };
export type EventSaveResult =
  | { ok: true; event: any; applied?: AppliedChange[] }
  | { ok: false; error: string; cancelled?: boolean };
type EventSave = (body: { _id: string } & Record<string, any>) => Promise<EventSaveResult>;

async function putEventUpdate(body: Record<string, any>) {
  const res = await fetch(`/api/updateEvent?id=${new Date().toISOString()}`, {
    method: 'PUT',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

const plainSave: EventSave = async (body) => {
  const r = await putEventUpdate(body);
  return r.ok
    ? { ok: true, event: r.data.event, applied: r.data.applied }
    : { ok: false, error: r.data.error || 'Algo salió mal, vuelve a intentarlo' };
};

const hasConflicts = (data: any): boolean =>
  Array.isArray(data?.conflicts) && data.conflicts.length > 0;

/** "Se cambió CNSL-03 → CNSL-07 en Cumpleaños de 50" (un renglón por evento). */
export function appliedSummary(applied: AppliedChange[]): string {
  const byEvent = new Map<string, AppliedChange[]>();
  for (const a of applied) byEvent.set(a.otherEventName, [...(byEvent.get(a.otherEventName) || []), a]);
  return Array.from(byEvent.entries())
    .map(([name, list]) => `Se cambió ${list.map((a) => `${a.fromCode} → ${a.toCode}`).join(', ')} en ${name || 'el otro evento'}`)
    .join('. ');
}

const SaveCtx = createContext<EventSave | null>(null);

type Pending = {
  conflicts: DateConflict[];
  body: Record<string, any>;
  applied: AppliedChange[];
  resolve: (r: EventSaveResult) => void;
};

export function DateConflictProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = useCallback<EventSave>(async (body) => {
    const r = await putEventUpdate(body);
    if (r.ok) return { ok: true, event: r.data.event, applied: r.data.applied };
    if (r.status === 409 && hasConflicts(r.data)) {
      // El "Cargando..." del que guardó queda tapado por la ventana. Y el cursor
      // de carga (body.loading → pointer-events: none en TODO, globals.css) se
      // saca: si no, la ventana no recibe clics mientras espera la elección.
      // Mientras se aplica, el botón "Guardar cambios" muestra su propio loader.
      notifications.hide('notify-notification');
      document.body.classList.remove('loading');
      setError(null);
      return new Promise<EventSaveResult>((resolve) =>
        setPending({ conflicts: r.data.conflicts, body, applied: r.data.applied || [], resolve })
      );
    }
    return { ok: false, error: r.data.error || 'Algo salió mal, vuelve a intentarlo' };
  }, []);

  const submit = async (conflictResolutions: ConflictResolution[]) => {
    if (!pending) return;
    setSubmitting(true);
    setError(null);
    try {
      const r = await putEventUpdate({ ...pending.body, conflictResolutions });
      const applied = [...pending.applied, ...((r.data?.applied as AppliedChange[]) || [])];
      if (r.ok) {
        if (applied.length) {
          notifications.show({
            id: 'date-conflicts-applied',
            title: 'Cambios guardados',
            message: `${appliedSummary(applied)}. Quedó un aviso en ese evento.`,
            color: 'teal',
            icon: <IconCheck />,
            autoClose: 8000
          });
        }
        pending.resolve({ ok: true, event: r.data.event, applied });
        setPending(null);
      } else if (r.status === 409 && hasConflicts(r.data)) {
        // Alguien reservó entremedio: se refresca con los datos nuevos
        setPending({ ...pending, conflicts: r.data.conflicts, applied });
        setError(r.data.error || 'Los equipos cambiaron mientras elegías. Revisá de nuevo.');
      } else {
        setPending({ ...pending, applied });
        setError(r.data?.error || 'Algo salió mal, vuelve a intentarlo');
      }
    } catch {
      setError('No se pudo guardar. Revisá la conexión y volvé a intentar.');
    } finally {
      setSubmitting(false);
    }
  };

  const cancel = () => {
    if (!pending || submitting) return;
    const applied = pending.applied;
    pending.resolve({
      ok: false,
      cancelled: true,
      error: applied.length
        ? `No se cambiaron las fechas. Ya se había aplicado: ${appliedSummary(applied)}.`
        : 'Cancelado'
    });
    setPending(null);
  };

  return (
    <SaveCtx.Provider value={save}>
      {children}
      <DateConflictModal
        opened={!!pending}
        conflicts={pending?.conflicts || []}
        submitting={submitting}
        error={error}
        onSubmit={submit}
        onCancel={cancel}
      />
    </SaveCtx.Provider>
  );
}

/** Guardar un evento (cuerpo parcial: `_id` + lo que cambia). */
export function useEventSave(): EventSave {
  return useContext(SaveCtx) ?? plainSave;
}
