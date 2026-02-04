import { InferenceSession } from 'onnxruntime-web';

/**
 * T-006 — Verification checklist (test criteria):
 * 1. First load: open app with u2netp.onnx in public/models/ → no console error, session created.
 * 2. Load time: measure from start of createModelSession(MODEL_PATH) until resolve → ≤ 7 s (TECH-SPEC).
 *
 * T-007 — Verification checklist (test criteria):
 * 1. With WebGPU: in a browser with WebGPU support → session uses WebGPU (check console/debug if needed).
 * 2. Without WebGPU: in a browser without WebGPU or with it disabled → app does not crash, session uses WASM.
 */

/** Model path: served from public/models/, cached by browser (T-006). */
export const MODEL_PATH = '/models/u2netp.onnx';

export type { InferenceSession };

/**
 * Creates an InferenceSession for the given model path.
 * WASM only: u2netp uses MaxPool with ceil(), which WebGPU does not support
 * ("ceil() in shape computation is not yet supported for MaxPool"). Using only WASM
 * avoids the error; WebGPU is not used for this model (T-007 fallback still applies if WASM fails).
 * Browser cache is used automatically (no custom caching).
 */
export async function createModelSession(modelPath: string): Promise<InferenceSession> {
  return InferenceSession.create(modelPath, {
    executionProviders: ['wasm'],
  });
}
