/**
 * T-008 — Preprocessing: image → tensor for U²-Net input.
 *
 * Verification checklist (test criteria):
 *
 * 1. Feed a test image → output tensor has correct shape and type:
 *    - Call imageToTensor(image) with ImageBitmap or HTMLImageElement (e.g. from a loaded <img> or createImageBitmap(file)).
 *    - Check: result.dims is [1, 3, H, W] with H and W in [320, 480].
 *    - Check: result.data is instanceof Float32Array.
 *    - Check: result.data.length === 1 * 3 * H * W (e.g. 307200 for 320×320).
 *    - Check: every value in result.data is in [0, 1] (normalized).
 *
 * 2. Input size is within 320–480:
 *    - Check: result.dims[2] >= 320 && result.dims[2] <= 480.
 *    - Check: result.dims[3] >= 320 && result.dims[3] <= 480.
 */

/** Target spatial size for model input (TECH-SPEC: 320–480). */
const TARGET_SIZE = 320;

/** Tensor output: NCHW [1, 3, H, W], float32, values 0–1. */
export type PreprocessTensor = {
  data: Float32Array;
  dims: [number, number, number, number];
};

/** Image source: ImageBitmap or HTMLImageElement (DoD). */
export type PreprocessImageSource = ImageBitmap | HTMLImageElement;

/**
 * Resizes image to fit within TARGET_SIZE×TARGET_SIZE (preserve aspect ratio),
 * pads to square, normalizes 0–255 → 0–1, returns NCHW float32 tensor.
 * Output shape: [1, 3, TARGET_SIZE, TARGET_SIZE].
 */
export function imageToTensor(image: PreprocessImageSource): PreprocessTensor {
  const w = 'naturalWidth' in image ? image.naturalWidth : image.width;
  const h = 'naturalHeight' in image ? image.naturalHeight : image.height;

  if (w <= 0 || h <= 0) {
    throw new Error('Invalid image dimensions');
  }

  const size = TARGET_SIZE;
  const scale = Math.min(size / w, size / h);
  const drawW = Math.round(w * scale);
  const drawH = Math.round(h * scale);
  const dx = (size - drawW) / 2;
  const dy = (size - drawH) / 2;

  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2d context not available');
  }

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(image, dx, dy, drawW, drawH);

  const imageData = ctx.getImageData(0, 0, size, size);
  const pixels = imageData.data;
  const len = size * size;

  const data = new Float32Array(1 * 3 * len);
  for (let i = 0; i < len; i++) {
    const j = i * 4;
    data[i] = pixels[j] / 255;
    data[len + i] = pixels[j + 1] / 255;
    data[2 * len + i] = pixels[j + 2] / 255;
  }

  return {
    data,
    dims: [1, 3, size, size],
  };
}
