const IMAGE_MIME_BY_EXT: Record<string, string> = {
  ".png": "image/png",
  ".gif": "image/gif",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".bmp": "image/bmp",
  ".ico": "image/x-icon",
  ".svg": "image/svg+xml",
  ".avif": "image/avif",
};

export function getExtension(filePath: string): string {
  const base = filePath.split(/[/\\]/).pop() ?? filePath;
  const dot = base.lastIndexOf(".");
  if (dot <= 0) return "";
  return base.slice(dot).toLowerCase();
}

export function getImageMimeType(filePath: string): string | null {
  return IMAGE_MIME_BY_EXT[getExtension(filePath)] ?? null;
}

export function isImageFile(filePath: string): boolean {
  return getImageMimeType(filePath) !== null;
}
