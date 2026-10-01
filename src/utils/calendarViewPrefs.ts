// Preferencias de vista del calendario (qué calendarios están destildados).
// Se guardan en localStorage por usuario: es una preferencia del navegador,
// no hace falta un viaje al servidor por cada click.
// Se guardan los OCULTOS para que un calendario nuevo aparezca tildado.

export interface CalendarViewPrefs {
  hiddenCalendarIds: string[];
  nativeEventsHidden: boolean;
}

export const DEFAULT_VIEW_PREFS: CalendarViewPrefs = {
  hiddenCalendarIds: [],
  nativeEventsHidden: false
};

export function viewPrefsKey(userId?: string | null): string {
  return `degano:calendarView:${userId || 'anon'}`;
}

// Tolera valores corruptos o de otra versión: ante cualquier duda, default
export function parseViewPrefs(raw: string | null): CalendarViewPrefs {
  if (!raw) return DEFAULT_VIEW_PREFS;
  try {
    const parsed = JSON.parse(raw);
    const ids = Array.isArray(parsed?.hiddenCalendarIds)
      ? parsed.hiddenCalendarIds.filter((id: unknown) => typeof id === 'string')
      : [];
    return {
      hiddenCalendarIds: Array.from(new Set<string>(ids)),
      nativeEventsHidden: parsed?.nativeEventsHidden === true
    };
  } catch {
    return DEFAULT_VIEW_PREFS;
  }
}

// Quita los ids de calendarios que ya no existen (o a los que se perdió acceso)
export function pruneHiddenIds(hiddenIds: string[], existingIds: string[]): string[] {
  const existing = new Set(existingIds);
  return hiddenIds.filter((id) => existing.has(id));
}

export function loadViewPrefs(key: string): CalendarViewPrefs {
  try {
    return parseViewPrefs(window.localStorage.getItem(key));
  } catch {
    return DEFAULT_VIEW_PREFS;
  }
}

export function saveViewPrefs(key: string, prefs: CalendarViewPrefs): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(prefs));
  } catch {
    // Modo privado / storage bloqueado: la preferencia vale solo para esta visita
  }
}
