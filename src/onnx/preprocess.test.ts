/**
 * T-008 — Preprocessing: image → tensor.
 * Test criteria: correct shape/type; size in 320–480; normalized [0, 1].
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { imageToTensor } from './preprocess';

const TARGET = 320;
const LEN = TARGET * TARGET;

function createMockOffscreenCanvas() {
  const pixels = new Uint8ClampedArray(LEN * 4);
  for (let i = 0; i < LEN; i++) {
    const j = i * 4;
    pixels[j] = 100;
    pixels[j + 1] = 120;
    pixels[j + 2] = 140;
    pixels[j + 3] = 255;
  }
  vi.stubGlobal(
    'OffscreenCanvas',
    class OffscreenCanvas {
      constructor(public width: number, public height: number) {}
      getContext() {
        return {
          fillStyle: '',
          fillRect: () => {},
          drawImage: () => {},
          getImageData: () => ({ data: pixels }),
        };
      }
    },
  );
}

/** Fake image source (ImageBitmap/HTMLImageElement-like). */
function fakeImage(w: number, h: number) {
  return { naturalWidth: w, naturalHeight: h, width: w, height: h };
}

describe('T-008 imageToTensor', () => {
  beforeEach(() => {
    createMockOffscreenCanvas();
  });

  it('output tensor has correct shape and type (criterion 1)', () => {
    const image = fakeImage(320, 320);
    const result = imageToTensor(image as never);

    expect(result.dims).toEqual([1, 3, TARGET, TARGET]);
    expect(result.data).toBeInstanceOf(Float32Array);
    expect(result.data.length).toBe(1 * 3 * LEN);
    const inRange = Array.from(result.data).every((v) => v >= 0 && v <= 1);
    expect(inRange).toBe(true);
  });

  it('input size is within 320–480 (criterion 2)', () => {
    const image = fakeImage(320, 320);
    const result = imageToTensor(image as never);

    expect(result.dims[2]).toBeGreaterThanOrEqual(320);
    expect(result.dims[2]).toBeLessThanOrEqual(480);
    expect(result.dims[3]).toBeGreaterThanOrEqual(320);
    expect(result.dims[3]).toBeLessThanOrEqual(480);
  });
});
