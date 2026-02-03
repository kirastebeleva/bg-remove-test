import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PreprocessTensor } from './preprocess';

const MASK_SIZE = 320 * 320;
const maskData = new Float32Array(MASK_SIZE);
const maskDims: number[] = [1, 1, 320, 320];

vi.mock('onnxruntime-web', () => ({
  Tensor: class {
    constructor(
      public type: string,
      public data: Float32Array,
      public dims: number[],
    ) {}
  },
  InferenceSession: {},
}));

const { runInference } = await import('./inference');

describe('T-009 runInference', () => {
  const inputTensor: PreprocessTensor = {
    data: new Float32Array(1 * 3 * 320 * 320),
    dims: [1, 3, 320, 320],
  };

  const mockSession = {
    inputNames: ['input.1'],
    outputNames: ['out'],
    run: vi.fn().mockResolvedValue({
      out: {
        getData: () => Promise.resolve(maskData),
        dims: maskDims,
      },
    }),
  };

  beforeEach(() => {
    vi.mocked(mockSession.run).mockClear();
  });

  it('returns mask without error (criterion 1)', async () => {
    const result = await runInference(mockSession as never, inputTensor);

    expect(result.mask).toBeDefined();
    expect(result.mask.data).toBeInstanceOf(Float32Array);
    expect(result.mask.data).toBe(maskData);
    expect(result.mask.dims).toEqual(maskDims);
    const product = result.mask.dims.reduce((a, b) => a * b, 1);
    expect(result.mask.data.length).toBe(product);
    expect(mockSession.run).toHaveBeenCalledTimes(1);
  });

  it('returns inferenceTimeMs as number (criterion 2)', async () => {
    const result = await runInference(mockSession as never, inputTensor);

    expect(typeof result.inferenceTimeMs).toBe('number');
    expect(result.inferenceTimeMs).toBeGreaterThanOrEqual(0);
  });
});
