/**
 * T-009 — Inference → mask.
 *
 * Список проверок по тест-критериям T-009:
 *
 * Критерий 1 — «Подать изображение — получить маску без ошибки»:
 *   (1) Открыть приложение, дождаться загрузки модели (индикатор data-model-ready).
 *   (2) Загрузить изображение (JPG/PNG/WebP) через зону загрузки.
 *   (3) Нажать кнопку «Run inference».
 *   (4) Проверить: ошибка не отображается; в UI выводится «Inference: XXX ms».
 *   (5) В консоли: лог «T-009 inference» с maskDims, maskLength — маска получена.
 *   (6) Проверить: result.mask.data — Float32Array; result.mask.dims — массив [1, 1, H, W] или [1, H, W]; data.length === произведение dims.
 *
 * Критерий 2 — «Замерить время inference — ≤ 2 сек»:
 *   (1) После успешного inference прочитать значение «Inference: XXX ms» на экране (или result.inferenceTimeMs из консоли).
 *   (2) Проверить: XXX ≤ 2000 (в UI отображается «≤ 2 s ✓» при выполнении).
 *   (3) При необходимости повторить на том же или другом изображении — время стабильно ≤ 2 сек.
 */

import { InferenceSession, Tensor } from 'onnxruntime-web';
import type { PreprocessTensor } from './preprocess';

/** Mask tensor: output of U²-Net, suitable for upscale and composition (T-010). */
export type MaskTensor = {
  data: Float32Array;
  dims: number[];
};

/** Result of runInference: mask and timing for verification. */
export type RunInferenceResult = {
  mask: MaskTensor;
  inferenceTimeMs: number;
};

/**
 * Runs one inference: input tensor → model → mask.
 * Uses session.inputNames[0] and session.outputNames[0] (no hardcoded names).
 * Returns mask and inference time (DoD: inference ≤ 2 sec).
 */
export async function runInference(
  session: InferenceSession,
  tensor: PreprocessTensor,
): Promise<RunInferenceResult> {
  const inputName = session.inputNames[0];
  const outputName = session.outputNames[0];

  const inputTensor = new Tensor('float32', tensor.data, tensor.dims);
  const feeds = { [inputName]: inputTensor };

  const start = performance.now();
  const results = await session.run(feeds);
  const inferenceTimeMs = performance.now() - start;

  const outputTensor = results[outputName];
  if (!outputTensor || typeof outputTensor.getData !== 'function') {
    throw new Error('Model did not return a valid output tensor');
  }
  const data = (await outputTensor.getData()) as Float32Array;
  const dims = [...outputTensor.dims];

  return {
    mask: { data, dims },
    inferenceTimeMs,
  };
}
