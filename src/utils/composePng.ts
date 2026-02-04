/**
 * T-010 — Апскейл маски и композиция в PNG.
 *
 * Definition of Done:
 * - Маска апскейлится до размеров исходного изображения
 * - Исходное изображение комбинируется с маской: область фона — прозрачная
 * - Результат экспортируется в PNG с альфа-каналом
 * - Результат можно скачать по Blob (задел под пакетное/многформатное скачивание)
 *
 * Конкретные проверки по тест-критериям:
 *
 * Критерий 1 — «Загрузить фото, выполнить пайплайн — скачать/получить PNG»:
 *   (1) Открыть приложение, дождаться загрузки модели (data-model-ready).
 *   (2) Загрузить фото (JPG/PNG/WebP) через зону загрузки.
 *   (3) Дождаться окончания обработки (исчезнет «Processing…», появится превью в зоне «после»).
 *   (4) Убедиться, что кнопка «Download» активна.
 *   (5) Нажать «Download» — должен скачаться один файл с расширением .png.
 *   (6) Проверить: файл открывается как изображение, размер соответствует исходному.
 *
 * Критерий 2 — «Открыть PNG в редакторе — фон прозрачный, объект виден»:
 *   (1) Открыть скачанный PNG в редакторе с поддержкой альфа (Photoshop, GIMP, Photopea и т.п.).
 *   (2) Включить отображение прозрачности (шашечки/сетка).
 *   (3) Убедиться: область фона — прозрачная (альфа = 0 или видна сетка).
 *   (4) Убедиться: объект (человек/предмет) виден, без обрезки по контуру.
 */

import type { MaskTensor } from '../onnx/inference';

/** Из dims модели [1, 1, H, W] или [1, H, W] возвращает высоту и ширину маски. */
export function getMaskSize(mask: MaskTensor): { width: number; height: number } {
  const d = mask.dims;
  if (d.length === 4) {
    return { width: d[3], height: d[2] };
  }
  if (d.length === 3) {
    return { width: d[2], height: d[1] };
  }
  throw new Error('Unexpected mask dims: ' + String(d));
}

/**
 * Апскейл маски до размеров целевого изображения (билинейная интерполяция).
 * Возвращает Float32Array длины targetWidth * targetHeight, значения 0–1.
 */
export function upscaleMaskToSize(
  mask: MaskTensor,
  maskWidth: number,
  maskHeight: number,
  targetWidth: number,
  targetHeight: number
): Float32Array {
  const out = new Float32Array(targetWidth * targetHeight);
  const data = mask.data;

  for (let y = 0; y < targetHeight; y++) {
    for (let x = 0; x < targetWidth; x++) {
      const sx = (x + 0.5) * (maskWidth / targetWidth) - 0.5;
      const sy = (y + 0.5) * (maskHeight / targetHeight) - 0.5;
      const x0 = Math.max(0, Math.floor(sx));
      const y0 = Math.max(0, Math.floor(sy));
      const x1 = Math.min(maskWidth - 1, x0 + 1);
      const y1 = Math.min(maskHeight - 1, y0 + 1);
      const fx = sx - x0;
      const fy = sy - y0;

      const i00 = y0 * maskWidth + x0;
      const i10 = y0 * maskWidth + x1;
      const i01 = y1 * maskWidth + x0;
      const i11 = y1 * maskWidth + x1;

      const v00 = data[i00];
      const v10 = data[i10];
      const v01 = data[i01];
      const v11 = data[i11];

      const v = (1 - fx) * (1 - fy) * v00 + fx * (1 - fy) * v10 + (1 - fx) * fy * v01 + fx * fy * v11;
      out[y * targetWidth + x] = Math.max(0, Math.min(1, v));
    }
  }
  return out;
}

/**
 * Комбинирует исходное изображение с маской: фон — прозрачный, объект — по маске.
 * Возвращает PNG Blob с альфа-каналом.
 */
export function composePngFromMask(image: HTMLImageElement, mask: MaskTensor): Promise<Blob> {
  const { width: maskWidth, height: maskHeight } = getMaskSize(mask);
  const w = image.naturalWidth;
  const h = image.naturalHeight;

  const alpha = upscaleMaskToSize(mask, maskWidth, maskHeight, w, h);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return Promise.reject(new Error('Canvas 2d context not available'));
  }

  ctx.drawImage(image, 0, 0);
  const imageData = ctx.getImageData(0, 0, w, h);
  const pixels = imageData.data;

  for (let i = 0; i < w * h; i++) {
    pixels[i * 4 + 3] = Math.round(alpha[i] * 255);
  }
  ctx.putImageData(imageData, 0, 0);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob: Blob | null) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create PNG blob'));
      },
      'image/png'
    );
  });
}
