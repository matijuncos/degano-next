'use client';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  DRAFT_VERSION,
  DraftMeta,
  draftKeys,
  encodeDraft,
  decodeDraft,
  splitEventForDraft,
  isDraftUsable
} from '@/utils/eventDraft';

const SAVE_DELAY_MS = 300;

/**
 * Guarda el borrador de Nuevo Evento en localStorage (por usuario).
 * PERFORMANCE: todo con refs, sin estado de React → nunca provoca re-renders.
 * Las escrituras se agrupan (máx. una cada 300 ms) y los equipos (lo pesado)
 * solo se reescriben cuando cambia la lista. Al salir de la página se guarda
 * al instante (pagehide / pestaña oculta / desmontaje por navegación).
 */
export function useEventDraft(userId: string | null | undefined) {
  const keys = useMemo(() => (userId ? draftKeys(userId) : null), [userId]);
  const pending = useRef<{ event: any; tab: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastEquipment = useRef<unknown>(undefined);
  const disabled = useRef(false);

  const flush = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const p = pending.current;
    pending.current = null;
    if (!p || !keys || disabled.current) return;
    try {
      const { rest, equipment } = splitEventForDraft(p.event);
      if (equipment !== lastEquipment.current) {
        try {
          localStorage.setItem(keys.equipment, encodeDraft(equipment));
        } catch {
          // Sin espacio: último recurso, guardar los equipos sin sus reservas
          // copiadas (se pueden recalcular; lo cargado por el usuario queda)
          localStorage.setItem(
            keys.equipment,
            encodeDraft((equipment as any[]).map(({ scheduledUses, busyWith, ...eq }: any) => eq))
          );
        }
        lastEquipment.current = equipment;
      }
      localStorage.setItem(keys.event, encodeDraft(rest));
      const meta: DraftMeta = { v: DRAFT_VERSION, savedAt: Date.now(), tab: p.tab };
      localStorage.setItem(keys.meta, JSON.stringify(meta));
    } catch (error) {
      console.warn('[useEventDraft] no se pudo guardar el borrador', error);
    }
  }, [keys]);

  /** Programa un guardado (agrupa cambios seguidos; latencia máx. 300 ms). */
  const schedule = useCallback(
    (event: any, tab: number) => {
      if (disabled.current || !keys) return;
      pending.current = { event, tab };
      if (!timer.current) timer.current = setTimeout(flush, SAVE_DELAY_MS);
    },
    [flush, keys]
  );

  /** Lee el borrador vigente (o null). Uno vencido se borra. */
  const load = useCallback((): { event: any; tab: number; savedAt: number } | null => {
    if (!keys) return null;
    try {
      const metaRaw = localStorage.getItem(keys.meta);
      const meta: DraftMeta | null = metaRaw ? JSON.parse(metaRaw) : null;
      const eventRaw = localStorage.getItem(keys.event);
      if (!isDraftUsable(meta, Date.now()) || !eventRaw) {
        if (meta || eventRaw) clearKeys(keys);
        return null;
      }
      const rest = decodeDraft(eventRaw);
      const equipmentRaw = localStorage.getItem(keys.equipment);
      const equipment = equipmentRaw ? decodeDraft(equipmentRaw) : [];
      lastEquipment.current = equipment;
      return { event: { ...rest, equipment }, tab: meta!.tab, savedAt: meta!.savedAt };
    } catch (error) {
      console.warn('[useEventDraft] borrador ilegible, se descarta', error);
      clearKeys(keys);
      return null;
    }
  }, [keys]);

  /** Borra el borrador (se puede seguir guardando uno nuevo). */
  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    pending.current = null;
    lastEquipment.current = undefined;
    if (keys) clearKeys(keys);
  }, [keys]);

  /** Evento creado: borra el borrador y deja de guardar. */
  const finish = useCallback(() => {
    disabled.current = true;
    clear();
  }, [clear]);

  // Guardar al instante al salir (cerrar pestaña, cambiar de app, navegar)
  useEffect(() => {
    const onHide = () => flush();
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', onHide);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', onHide);
      document.removeEventListener('visibilitychange', onVisibility);
      flush(); // desmontaje: ej. botón "atrás" dentro de la app
    };
  }, [flush]);

  return { schedule, load, clear, finish, flush };
}

function clearKeys(keys: ReturnType<typeof draftKeys>) {
  try {
    localStorage.removeItem(keys.meta);
    localStorage.removeItem(keys.event);
    localStorage.removeItem(keys.equipment);
  } catch {
    /* sin acceso a storage: nada que borrar */
  }
}
