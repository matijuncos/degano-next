// Descarga/guarda un PDF (Blob) de forma robusta en desktop y mobile.
//
// Problema: en mobile (iOS Safari sobre todo) el patrón clásico <a download>
// con una URL blob: NO descarga — ignora el atributo `download` y abre el PDF
// como previsualización. La solución en mobile es la Web Share API (nivel 2),
// que abre la hoja nativa de compartir con "Guardar en Archivos" / apps.
//
// Estrategia:
//  - Mobile con Web Share de archivos disponible → navigator.share({ files })
//  - Desktop / navegadores sin share → <a download> (que ahí sí funciona)
export async function savePdfBlob(blob: Blob, filename: string): Promise<void> {
  const name = filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`;

  // Dispositivo táctil (mobile/tablet): ahí el <a download> con blob no baja.
  const isTouchDevice =
    typeof window !== 'undefined' &&
    (window.matchMedia?.('(pointer: coarse)')?.matches ||
      /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || ''));

  if (isTouchDevice && typeof navigator !== 'undefined' && (navigator as any).canShare) {
    try {
      const file = new File([blob], name, { type: 'application/pdf' });
      const nav = navigator as any;
      if (nav.canShare({ files: [file] })) {
        await nav.share({ files: [file], title: name });
        return; // compartido/guardado correctamente
      }
    } catch (e: any) {
      // El usuario canceló la hoja de compartir → no forzar la descarga
      if (e?.name === 'AbortError') return;
      // Cualquier otro error (share no permitido, etc.) → caemos al fallback
    }
  }

  // Fallback clásico: <a download> (desktop y navegadores sin Web Share)
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
