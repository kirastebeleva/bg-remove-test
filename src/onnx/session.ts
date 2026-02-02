import { InferenceSession } from 'onnxruntime-web';

/**
 * Creates an InferenceSession for the given model path.
 * Used for U²-Net background removal (T-006+).
 */
export async function createModelSession(modelPath: string): Promise<InferenceSession> {
  return InferenceSession.create(modelPath);
}
