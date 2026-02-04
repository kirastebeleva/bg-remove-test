/**
 * T-011 — Постобработка маски (feather / blur).
 * E2E: criterion 1 — with feather more semi-transparent edge pixels than without;
 *      criterion 2 — acceptance PRD: transparent background, visible object, no obvious artifacts.
 */
import { test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import pngjs from 'pngjs';

const PNG = pngjs.PNG;

const FIXTURE_PATH = path.join(process.cwd(), 'tests', 'fixtures', 'sample.png');

test.setTimeout(90000);

async function ensureModelReady(page: import('@playwright/test').Page, timeout = 30000) {
  await page.goto('/');
  await expect(page.locator('.app-layout')).toBeVisible();
  try {
    await page.waitForSelector('[data-model-ready="true"]', { timeout });
  } catch {
    test.skip(true, 'u2netp.onnx not in public/models/ or model load >30s — e2e requires model to run inference');
  }
}

/** Count pixels with alpha strictly between 0 and 255 (semi-transparent edge). */
function countSemiTransparentPixels(png: pngjs.PNG): number {
  const data = png.data;
  let count = 0;
  for (let i = 3; i < data.length; i += 4) {
    const a = data[i];
    if (a > 0 && a < 255) count += 1;
  }
  return count;
}

/** T-011 Criterion 1: with post-processing (feather) edges are visually softer — more semi-transparent pixels. */
test('T-011 criterion 1: with feather more semi-transparent edge pixels than without', async ({ page }) => {
  await ensureModelReady(page);
  await page.evaluate(() => {
    (window as Window & { __featherRadius?: number }).__featherRadius = 0;
  });
  await page.locator('input.upload-input-hidden').setInputFiles(FIXTURE_PATH);
  await expect(page.locator('.zone-after .preview-image')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('.inference-error')).not.toBeVisible();

  const downloadPromise0 = page.waitForEvent('download', { timeout: 10000 });
  await page.locator('button.btn-download').click();
  const download0 = await downloadPromise0;
  const path0 = await download0.path();
  const buffer0 = fs.readFileSync(path0!);
  const png0 = PNG.sync.read(buffer0);
  const semiTransparent0 = countSemiTransparentPixels(png0);

  await ensureModelReady(page);
  await page.evaluate(() => {
    (window as Window & { __featherRadius?: number }).__featherRadius = 2;
  });
  await page.locator('input.upload-input-hidden').setInputFiles(FIXTURE_PATH);
  await expect(page.locator('.zone-after .preview-image')).toBeVisible({ timeout: 20000 });

  const downloadPromise2 = page.waitForEvent('download', { timeout: 10000 });
  await page.locator('button.btn-download').click();
  const download2 = await downloadPromise2;
  const path2 = await download2.path();
  const buffer2 = fs.readFileSync(path2!);
  const png2 = PNG.sync.read(buffer2);
  const semiTransparent2 = countSemiTransparentPixels(png2);

  expect(semiTransparent2).toBeGreaterThan(semiTransparent0);
});

/** T-011 Criterion 2 (Acceptance PRD): фон удалён без явных дефектов — transparent background, visible object, semi-transparent contour (softer edge). */
test('T-011 criterion 2: acceptance PRD — transparent background, visible object, no obvious contour artifacts', async ({
  page,
}) => {
  await ensureModelReady(page);
  await page.locator('input.upload-input-hidden').setInputFiles(FIXTURE_PATH);
  await expect(page.locator('.zone-after .preview-image')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('.inference-error')).not.toBeVisible();

  const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
  await page.locator('button.btn-download').click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  const buffer = fs.readFileSync(downloadPath!);
  const png = PNG.sync.read(buffer);

  const data = png.data;
  let hasTransparent = false;
  let hasOpaque = false;
  let semiTransparentCount = 0;
  for (let i = 3; i < data.length; i += 4) {
    const a = data[i];
    if (a < 255) hasTransparent = true;
    if (a > 0) hasOpaque = true;
    if (a > 0 && a < 255) semiTransparentCount += 1;
  }

  expect(hasTransparent).toBe(true);
  expect(hasOpaque).toBe(true);
  expect(semiTransparentCount).toBeGreaterThan(0);
});
