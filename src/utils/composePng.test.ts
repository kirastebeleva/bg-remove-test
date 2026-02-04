/**
 * T-010 — Апскейл маски и композиция в PNG.
 * Unit checks: getMaskSize, upscaleMaskToSize (DoD: маска апскейлится до размеров исходного).
 */
import { describe, it, expect } from 'vitest';
import { getMaskSize, upscaleMaskToSize } from './composePng';
import type { MaskTensor } from '../onnx/inference';

describe('T-010 composePng', () => {
  describe('getMaskSize', () => {
    it('parses dims [1, 1, H, W]', () => {
      const mask: MaskTensor = { data: new Float32Array(0), dims: [1, 1, 320, 320] };
      expect(getMaskSize(mask)).toEqual({ width: 320, height: 320 });
    });

    it('parses dims [1, H, W]', () => {
      const mask: MaskTensor = { data: new Float32Array(0), dims: [1, 100, 200] };
      expect(getMaskSize(mask)).toEqual({ width: 200, height: 100 });
    });
  });

  describe('upscaleMaskToSize', () => {
    it('output length = targetWidth * targetHeight, values in [0,1]', () => {
      const data = new Float32Array(4);
      data[0] = 0;
      data[1] = 0.5;
      data[2] = 0.5;
      data[3] = 1;
      const mask: MaskTensor = { data, dims: [1, 1, 2, 2] };
      const out = upscaleMaskToSize(mask, 2, 2, 10, 10);
      expect(out.length).toBe(10 * 10);
      for (let i = 0; i < out.length; i++) {
        expect(out[i]).toBeGreaterThanOrEqual(0);
        expect(out[i]).toBeLessThanOrEqual(1);
      }
    });

    it('upscales mask to image dimensions (DoD: маска апскейлится до размеров исходного)', () => {
      const mask: MaskTensor = {
        data: new Float32Array(320 * 320).fill(0.5),
        dims: [1, 1, 320, 320],
      };
      const out = upscaleMaskToSize(mask, 320, 320, 640, 480);
      expect(out.length).toBe(640 * 480);
    });
  });
});
