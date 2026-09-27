// Utilidades para el link de Google Maps del lugar/salón.
// Se usan en el formulario (validación), en las APIs (normalización antes de
// persistir) y en la vista del evento (botón "Abrir en Google Maps").

// Hosts aceptados como link de Google Maps (incluye los links cortos de "Compartir").
const isGoogleMapsHost = (host: string, path: string): boolean => {
  if (host === 'maps.app.goo.gl') return true;
  if (host === 'goo.gl') return path.startsWith('/maps');
  if (/^maps\.google\.[a-z.]+$/.test(host)) return true;
  if (/^(www\.)?google\.[a-z.]+$/.test(host)) return path.startsWith('/maps');
  return false;
};

/**
 * Normaliza un link de Google Maps pegado por el usuario.
 * - '' / solo espacios → '' (campo vacío, válido)
 * - link válido → link con https:// y sin espacios
 * - cualquier otra cosa → null (inválido)
 */
export const normalizeMapsUrl = (input: unknown): string | null => {
  if (input === undefined || input === null) return '';
  if (typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed) return '';

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(withProtocol);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  if (!isGoogleMapsHost(host, url.pathname)) return null;

  url.protocol = 'https:';
  return url.toString();
};

export const isValidMapsUrl = (input: unknown): boolean =>
  normalizeMapsUrl(input) !== null;

export const MAPS_URL_ERROR =
  'Pegá un link de Google Maps (ej. https://maps.app.goo.gl/...)';
