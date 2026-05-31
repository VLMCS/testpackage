// Client-side image pipeline: take an uploaded file, square-crop + downscale to a
// small icon/avatar, and return a compressed data URL small enough to store
// directly in a Firestore document (avoiding Firebase Storage / billing).

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_RAW_BYTES = 6 * 1024 * 1024; // reject huge source files before decoding

export interface ProcessImageOptions {
  maxDim?: number; // output is maxDim x maxDim
  maxBytes?: number; // hard cap on the resulting data URL payload
}

export async function processImageToDataUrl(
  file: File,
  options: ProcessImageOptions = {},
): Promise<string> {
  const maxDim = options.maxDim ?? 128;
  const maxBytes = options.maxBytes ?? 50 * 1024;

  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Please choose a PNG, JPG, or WebP image.');
  }
  if (file.size > MAX_RAW_BYTES) {
    throw new Error('That image is too large. Pick one under 6 MB.');
  }

  const source = await loadImage(file);
  const canvas = document.createElement('canvas');
  canvas.width = maxDim;
  canvas.height = maxDim;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not process the image on this device.');

  // Center square-crop, then scale to fill the square canvas.
  const side = Math.min(source.width, source.height);
  const sx = (source.width - side) / 2;
  const sy = (source.height - side) / 2;
  ctx.drawImage(source, sx, sy, side, side, 0, 0, maxDim, maxDim);

  let dataUrl = canvas.toDataURL('image/png');
  if (dataUrlBytes(dataUrl) > maxBytes) {
    for (const quality of [0.92, 0.85, 0.75, 0.65, 0.55, 0.45]) {
      dataUrl = canvas.toDataURL('image/webp', quality);
      if (dataUrlBytes(dataUrl) <= maxBytes) break;
    }
  }
  if (dataUrlBytes(dataUrl) > maxBytes) {
    throw new Error('Could not compress that image small enough — try a simpler one.');
  }
  return dataUrl;
}

export function dataUrlBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(',');
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  return Math.floor((b64.length * 3) / 4);
}

function loadImage(file: File): Promise<CanvasImageSource & { width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read that image file.'));
    };
    img.src = url;
  });
}
