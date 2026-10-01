// Nombres de archivo de la póliza de seguro.

const stripAccents = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// Nombre para la key de S3: sin acentos ni caracteres que rompen la URL
// (%, #, ?, &…). El nombre original se guarda aparte para mostrarlo.
export function safeS3FileName(name: string): string {
  const base = stripAccents(name || '').replace(/\.pdf$/i, '');
  const clean = base.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^[-.]+|[-.]+$/g, '');
  return clean ? `${clean}.pdf` : 'poliza.pdf';
}

// Content-Disposition con fallback ASCII y el nombre real en UTF-8 (RFC 6266),
// así un nombre con acentos se descarga bien.
export function contentDisposition(name: string): string {
  const ascii = stripAccents(name).replace(/["\\]/g, '').replace(/[^\x20-\x7e]/g, '');
  return `inline; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}
