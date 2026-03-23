/**
 * Client-side image utility: converts any image (including HEIC/HEIF from iPhone)
 * to a resized JPEG and returns a base64 string.
 */

const MAX_WIDTH = 1600;
const JPEG_QUALITY = 0.85;

function isHeic(file: File): boolean {
  return (
    file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    file.name.toLowerCase().endsWith('.heic') ||
    file.name.toLowerCase().endsWith('.heif')
  );
}

export async function resizeAndConvert(file: File): Promise<string> {
  let processedFile = file;

  if (isHeic(file)) {
    const heic2any = (await import('heic2any')).default;
    const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: JPEG_QUALITY });
    processedFile = new File(
      [converted as Blob],
      file.name.replace(/\.(heic|heif)$/i, '.jpg'),
      { type: 'image/jpeg' }
    );
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(processedFile);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      if (width > MAX_WIDTH) {
        height = Math.round((height * MAX_WIDTH) / width);
        width = MAX_WIDTH;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY).replace(/^data:image\/jpeg;base64,/, ''));
    };
    img.onerror = reject;
    img.src = url;
  });
}
