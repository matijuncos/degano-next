// src/utils/reciboName.ts
// "A nombre de" del recibo: nombre libre (el cliente puede pedirlo a nombre de
// otra persona o de una empresa), con los clientes del evento como sugerencias.

// Sugerencias según lo escrito. Con un nombre de la lista ya elegido se
// muestran todas (si no, la lista quedaría filtrada a ese solo nombre).
export function filterNameSuggestions(names: string[], search: string): string[] {
  const q = search.trim().toLowerCase();
  if (!q || names.some((n) => n.toLowerCase() === q)) return names;
  return names.filter((n) => n.toLowerCase().includes(q));
}

// Parte del nombre del archivo en S3: sin "/" ni caracteres prohibidos y en
// forma NFC (una ñ "descompuesta" hacía que después el archivo no se encontrara)
export function safeReciboName(cliente: string | undefined | null): string {
  const clean = (cliente || '')
    .normalize('NFC')
    .replace(/[\/\\:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
  return clean || 'Cliente';
}
