import { put } from '@vercel/blob';

/**
 * Upload a base64-encoded JPEG to Vercel Blob.
 * Returns { url, storageKey } on success, or null if BLOB_READ_WRITE_TOKEN is not set.
 * In dev without the token, we skip upload and fall back to base64 storage.
 */
export async function uploadPhotoToBlob(
  base64Data: string,
  filename: string
): Promise<{ url: string; storageKey: string } | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;

  const buffer = Buffer.from(base64Data, 'base64');
  const blob = await put(`photos/${filename}`, buffer, {
    access: 'public',
    contentType: 'image/jpeg',
  });

  return { url: blob.url, storageKey: blob.pathname };
}

/**
 * Resolve the display URL for a WorkPhoto.
 * If storageMode is 'blob', use storageKey as a Vercel Blob URL.
 * Falls back to data URI for legacy base64 photos.
 */
export function resolvePhotoUrl(photo: {
  storageMode: string;
  storageKey: string | null;
  base64Data: string | null;
}): string {
  if (photo.storageMode === 'blob' && photo.storageKey) {
    // storageKey holds the full Vercel Blob URL
    return photo.storageKey;
  }
  if (photo.base64Data) {
    return `data:image/jpeg;base64,${photo.base64Data}`;
  }
  return '';
}
