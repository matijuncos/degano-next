/**
 * Extrae el nombre limpio de un archivo desde una URL de Amazon S3
 *
 * Amazon S3 agrega un ID único al inicio del nombre del archivo (separado por guion)
 * Ejemplo: "QHMv6n3n2Li4lI57I_6LO-CHIPOTE%20RIDER%20TECNICO.pdf"
 * Resultado: "CHIPOTE RIDER TECNICO"
 *
 * @param fileUrl - URL completa del archivo en S3
 * @returns El nombre limpio del archivo sin el ID y sin extensión
 */
export function getCleanFileName(fileUrl: string): string {
  if (!fileUrl) return '';

  try {
    // Extraer solo el nombre del archivo de la URL
    const urlParts = fileUrl.split('/');
    const fileNameWithParams = urlParts[urlParts.length - 1];

    // Eliminar parámetros de query si existen
    const fileName = fileNameWithParams.split('?')[0];

    // Decodificar caracteres URL-encoded (como %20)
    const decodedFileName = decodeURIComponent(fileName);

    // Eliminar extensión del archivo
    const nameWithoutExtension = decodedFileName.replace(/\.[^.]+$/, '');

    // El patrón de Amazon S3 puede tener múltiples guiones:
    // Ejemplos:
    // "QHMv6n3n2Li4lI57I_6LO-CHIPOTE RIDER TECNICO" → "CHIPOTE RIDER TECNICO"
    // "PzRExoPmPbAtu2BqQ8rLn-_RaXh3eE173O_gDWFzLWz-RIDER DIGAME LICENCIADO (2)" → "RIDER DIGAME LICENCIADO (2)"
    // "RaXh3eE173O_gDWFzLWz-RIDER DIGAME LICENCIADO" → "RIDER DIGAME LICENCIADO"

    // Dividir por guiones
    const parts = nameWithoutExtension.split('-');

    if (parts.length === 1) {
      // Si no hay guiones, devolver el nombre completo
      return nameWithoutExtension.trim();
    }

    // Buscar el segmento que parece ser el nombre real del archivo
    // El nombre real generalmente:
    // - Tiene espacios (muy probable)
    // - Tiene palabras legibles (no IDs aleatorios)
    // - Los IDs de Amazon suelen tener: mezcla de mayús/minús, guiones bajos, más de 15 caracteres

    // Función helper para detectar si un segmento parece un ID de Amazon
    const looksLikeAmazonId = (segment: string): boolean => {
      // IDs de Amazon suelen tener:
      // - Más de 15 caracteres
      // - Mezcla de mayúsculas y minúsculas
      // - Pueden tener números y guiones bajos

      if (segment.length < 16) return false;

      const hasUpperCase = /[A-Z]/.test(segment);
      const hasLowerCase = /[a-z]/.test(segment);
      const hasNumbers = /[0-9]/.test(segment);

      // Si tiene mezcla de mayúsculas y minúsculas, es muy probable que sea un ID
      if (hasUpperCase && hasLowerCase) {
        return true;
      }

      // Si es muy largo y solo alfanumérico, probablemente sea un ID
      if (segment.length > 20 && /^[a-zA-Z0-9_]+$/.test(segment)) {
        return true;
      }

      return false;
    };

    // Primero, buscar segmentos con espacios (muy probablemente el nombre real)
    for (let i = parts.length - 1; i >= 0; i--) {
      const part = parts[i].trim();
      if (part && part.includes(' ')) {
        return part.replace(/^[_-]+/, '').trim();
      }
    }

    // Si no hay segmentos con espacios, filtrar los que parecen IDs
    const nonIdParts = parts.filter(part => {
      const trimmed = part.trim();
      return trimmed && !looksLikeAmazonId(trimmed) && trimmed !== '_';
    });

    if (nonIdParts.length > 0) {
      // Si hay múltiples partes que no son IDs, unirlas con guiones
      // Esto maneja casos como "rick-sanchez"
      return nonIdParts.join('-').replace(/^[_-]+/, '').trim();
    }

    // Si todo parece ser IDs, tomar el último segmento
    const lastPart = parts[parts.length - 1].trim();
    return lastPart.replace(/^[_-]+/, '').trim();
  } catch (error) {
    console.error('Error cleaning file name:', error);
    return fileUrl;
  }
}

/**
 * Obtiene la URL apropiada para visualizar un archivo según su tipo
 *
 * - PDFs: Se abren directamente en el navegador
 * - Imágenes: Se abren directamente en el navegador
 * - Documentos (.doc, .docx): Se abren con Google Docs Viewer
 * - Otros: Se abren directamente
 *
 * @param fileUrl - URL del archivo
 * @returns URL para visualizar el archivo
 */
export function getFileViewerUrl(fileUrl: string): string {
  if (!fileUrl) return '';

  const isDoc = /\.(doc|docx)$/i.test(fileUrl);

  if (isDoc) {
    // Usar Google Docs Viewer para archivos .doc/.docx
    return `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`;
  }

  // Para PDFs, imágenes y otros, abrir directamente
  return fileUrl;
}

/**
 * Determina si un archivo debe abrirse en un viewer externo
 *
 * @param fileUrl - URL del archivo
 * @returns true si necesita viewer externo, false si se puede abrir directamente
 */
export function needsExternalViewer(fileUrl: string): boolean {
  return /\.(doc|docx)$/i.test(fileUrl);
}
