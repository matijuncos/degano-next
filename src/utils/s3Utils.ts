// Abre un archivo de S3 pidiendo una URL prefirmada temporal al backend.
// Permite tener los buckets privados: el archivo no es accesible por su URL
// pública directa, solo a través de la URL firmada (válida ~60s).
// Si algo falla, cae a la URL original (compat mientras los buckets sean públicos).
export async function openS3File(
  url: string,
  opts?: { download?: boolean; fileName?: string }
): Promise<void> {
  if (!url) return;
  try {
    const res = await fetch('/api/signS3Url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        download: opts?.download,
        fileName: opts?.fileName
      })
    });
    const data = await res.json();
    window.open(data?.signedUrl || url, '_blank');
  } catch {
    window.open(url, '_blank');
  }
}
