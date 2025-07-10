function getCloudinaryPublicId(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const parts = urlObj.pathname.split('/');
    const filename = parts[parts.length - 1];
    const publicId = filename.substring(0, filename.lastIndexOf('.'));
    return publicId;
  } catch {
    return null;
  }
}
