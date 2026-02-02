import { InferenceSession } from 'onnxruntime-web';

/**
 * T-006 — Verification checklist (test criteria):
 * 1. First load: open app with u2netp.onnx in public/models/ → no console error, session created.
 * 2. Load time: measure from start of createModelSession(MODEL_PATH) until resolve → ≤ 7 s (TECH-SPEC).
 */

/** Model path: served from public/models/, cached by browser (T-006). */
export const MODEL_PATH = '/models/u2netp.onnx';

export type { InferenceSession };

/**
 * Creates an InferenceSession for the given model path.
 * Used for U²-Net background removal (T-006+).
 * Browser cache is used automatically (no custom caching).
 */
export async function createModelSession(modelPath: string): Promise<InferenceSession> {
  return InferenceSession.create(modelPath);
}
