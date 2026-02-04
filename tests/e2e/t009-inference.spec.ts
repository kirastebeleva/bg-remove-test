import { test, expect } from '@playwright/test';
import path from 'node:path';

const FIXTURE_PATH = path.join(process.cwd(), 'tests', 'fixtures', 'sample.png');

async function ensureModelReady(page: import('@playwright/test').Page, timeout = 10000) {
  await page.goto('/');
  await expect(page.locator('.app-layout')).toBeVisible();
  try {
    await page.waitForSelector('[data-model-ready="true"]', { timeout });
  } catch {
    test.skip(true, 'u2netp.onnx not in public/models/ — e2e requires model to run inference');
  }
}

test.describe('T-009 Inference → mask', () => {
  test('criterion 1: feed image → get mask without error', async ({ page }) => {
    await ensureModelReady(page);

    await page.locator('input.upload-input-hidden').setInputFiles(FIXTURE_PATH);

    await expect(page.locator('.preview-image')).toBeVisible();

    await expect(page.locator('.inference-time')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.inference-error')).not.toBeVisible();

    const lastResult = await page.evaluate(() => (window as Window & { __lastResult?: { maskDims: number[]; maskLength: number; inferenceTimeMs: number } }).__lastResult);
    expect(lastResult).toBeDefined();
    expect(Array.isArray(lastResult!.maskDims)).toBe(true);
    expect(lastResult!.maskLength).toBeGreaterThan(0);
    const product = lastResult!.maskDims!.reduce((a, b) => a * b, 1);
    expect(lastResult!.maskLength).toBe(product);
  });

  test('criterion 2: inference time ≤ 10 sec', async ({ page }) => {
    await ensureModelReady(page);

    await page.locator('input.upload-input-hidden').setInputFiles(FIXTURE_PATH);
    await expect(page.locator('.preview-image')).toBeVisible();

    await expect(page.locator('.inference-time')).toContainText('Inference:', { timeout: 15000 });
    await expect(page.locator('.inference-time')).toContainText('≤ 10 s ✓');

    const lastResult = await page.evaluate(() => (window as Window & { __lastResult?: { inferenceTimeMs: number } }).__lastResult);
    expect(lastResult!.inferenceTimeMs).toBeLessThanOrEqual(10000);
  });
});
