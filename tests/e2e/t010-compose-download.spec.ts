/**
 * T-010 — Апскейл маски и композиция в PNG.
 * E2E: pipeline → download PNG → verify file and alpha (criteria 1 & 2).
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

/** Criterion 1: upload photo, run pipeline, download one .png, file is valid image, size matches original. */
test('T-010 criterion 1: upload photo, pipeline, download PNG', async ({ page }) => {
  await ensureModelReady(page);

  await page.locator('input.upload-input-hidden').setInputFiles(FIXTURE_PATH);
  await expect(page.locator('.zone-before .preview-image')).toBeVisible();

  await expect(page.locator('.zone-after .preview-image')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('.inference-error')).not.toBeVisible();

  const downloadButton = page.locator('button.btn-download');
  await expect(downloadButton).toBeEnabled();

  const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
  await downloadButton.click();
  const download = await downloadPromise;

  expect(download.suggestedFilename().toLowerCase()).toMatch(/\.png$/);
  const downloadPath = await download.path();
  expect(downloadPath).toBeTruthy();
  const buffer = fs.readFileSync(downloadPath!);
  const png = PNG.sync.read(buffer);
  expect(png.width).toBeGreaterThan(0);
  expect(png.height).toBeGreaterThan(0);

  const origSize = await page
    .locator('.zone-before .preview-image')
    .evaluate((img: HTMLImageElement) => ({ w: img.naturalWidth, h: img.naturalHeight }));
  expect(png.width).toBe(origSize.w);
  expect(png.height).toBe(origSize.h);
});

/** Criterion 2: downloaded PNG has transparent background (some alpha < 255) and visible object (some alpha > 0). */
test('T-010 criterion 2: PNG has transparent background and visible object (alpha channel)', async ({ page }) => {
  await ensureModelReady(page);

  await page.locator('input.upload-input-hidden').setInputFiles(FIXTURE_PATH);
  await expect(page.locator('.zone-after .preview-image')).toBeVisible({ timeout: 20000 });

  const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
  await page.locator('button.btn-download').click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  const buffer = fs.readFileSync(downloadPath!);
  const png = PNG.sync.read(buffer);

  const data = png.data;
  let hasTransparent = false;
  let hasOpaque = false;
  for (let i = 3; i < data.length; i += 4) {
    const a = data[i];
    if (a < 255) hasTransparent = true;
    if (a > 0) hasOpaque = true;
    if (hasTransparent && hasOpaque) break;
  }
  expect(hasTransparent).toBe(true);
  expect(hasOpaque).toBe(true);
});
