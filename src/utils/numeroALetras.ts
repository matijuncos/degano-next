// Convierte un número entero a su representación en letras (español rioplatense).
// Pensado para montos de recibos (0 hasta cientos de millones).

const UNIDADES = [
  '', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'
];
const ESPECIALES: { [k: number]: string } = {
  10: 'diez', 11: 'once', 12: 'doce', 13: 'trece', 14: 'catorce', 15: 'quince',
  16: 'dieciséis', 17: 'diecisiete', 18: 'dieciocho', 19: 'diecinueve',
  20: 'veinte', 21: 'veintiuno', 22: 'veintidós', 23: 'veintitrés',
  24: 'veinticuatro', 25: 'veinticinco', 26: 'veintiséis', 27: 'veintisiete',
  28: 'veintiocho', 29: 'veintinueve'
};
const DECENAS = [
  '', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta',
  'ochenta', 'noventa'
];
const CENTENAS = [
  '', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos',
  'seiscientos', 'setecientos', 'ochocientos', 'novecientos'
];

// 0..999 en letras
const seccionCentenas = (n: number): string => {
  if (n === 0) return '';
  if (n === 100) return 'cien';
  let str = '';
  const c = Math.floor(n / 100);
  const resto = n % 100;
  if (c > 0) str += CENTENAS[c];
  if (resto > 0) {
    if (str) str += ' ';
    if (resto < 10) str += UNIDADES[resto];
    else if (resto <= 29) str += ESPECIALES[resto];
    else {
      const d = Math.floor(resto / 10);
      const u = resto % 10;
      str += DECENAS[d];
      if (u > 0) str += ' y ' + UNIDADES[u];
    }
  }
  return str;
};

export const numeroALetras = (num: number): string => {
  const n = Math.floor(Math.abs(num || 0));
  if (n === 0) return 'cero';

  const millones = Math.floor(n / 1000000);
  const miles = Math.floor((n % 1000000) / 1000);
  const cientos = n % 1000;

  const partes: string[] = [];
  if (millones > 0) {
    partes.push(millones === 1 ? 'un millón' : `${seccionCentenas(millones)} millones`);
  }
  if (miles > 0) {
    partes.push(miles === 1 ? 'mil' : `${seccionCentenas(miles)} mil`);
  }
  if (cientos > 0) {
    partes.push(seccionCentenas(cientos));
  }

  // Apócope final: "uno" → "un", "veintiuno" → "veintiún" (ej. "veintiún pesos")
  return partes
    .join(' ')
    .trim()
    .replace(/veintiuno$/, 'veintiún')
    .replace(/\buno$/, 'un');
};
