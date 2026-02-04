/**
 * T-011 — Постобработка маски (feather / blur).
 * Unit checks: featherAlpha output size, values in [0,1], edge smoothing.
 */
import { describe, it, expect } from 'vitest';
import { featherAlpha } from './featherMask';

describe('T-011 featherMask', () => {
  describe('featherAlpha', () => {
    it('output length equals width * height, values in [0, 1]', () => {
      const w = 10;
      const h = 8;
      const alpha = new Float32Array(w * h);
      for (let i = 0; i < alpha.length; i++) alpha[i] = i % 2 === 0 ? 0.2 : 0.8;
      const out = featherAlpha(alpha, w, h, 1);
      expect(out.length).toBe(w * h);
      for (let i = 0; i < out.length; i++) {
        expect(out[i]).toBeGreaterThanOrEqual(0);
        expect(out[i]).toBeLessThanOrEqual(1);
      }
    });

    it('radius 0 returns equivalent alpha (no smoothing)', () => {
      const w = 5;
      const h = 5;
      const alpha = new Float32Array(w * h);
      for (let i = 0; i < alpha.length; i++) alpha[i] = i / alpha.length;
      const out = featherAlpha(alpha, w, h, 0);
      expect(out.length).toBe(alpha.length);
      for (let i = 0; i < alpha.length; i++) {
        expect(out[i]).toBe(alpha[i]);
      }
    });

    it('step edge gets intermediate values at boundary (DoD: сглаживание границ)', () => {
      const w = 20;
      const h = 10;
      const alpha = new Float32Array(w * h);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          alpha[y * w + x] = x < 10 ? 0 : 1;
        }
      }
      const out = featherAlpha(alpha, w, h, 2);
      let hasIntermediate = false;
      for (let i = 0; i < out.length; i++) {
        if (out[i] > 0 && out[i] < 1) {
          hasIntermediate = true;
          break;
        }
      }
      expect(hasIntermediate).toBe(true);
    });

    it('T-011 criterion 1: with feather more semi-transparent pixels than without', () => {
      const w = 30;
      const h = 20;
      const alpha = new Float32Array(w * h);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          alpha[y * w + x] = x < 15 ? 0 : 1;
        }
      }
      const out0 = featherAlpha(alpha, w, h, 0);
      const out2 = featherAlpha(alpha, w, h, 2);
      const countSemi = (arr: Float32Array) => {
        let n = 0;
        for (let i = 0; i < arr.length; i++) if (arr[i] > 0 && arr[i] < 1) n += 1;
        return n;
      };
      expect(countSemi(out2)).toBeGreaterThan(countSemi(out0));
    });
  });
});
