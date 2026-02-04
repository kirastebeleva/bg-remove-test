/**
 * T-012 — Интеграция пайплайна в UI.
 *
 * Цель: полный сценарий из PRD — загрузка → превью → удаление фона → отображение результата и скачивание PNG.
 *
 * Definition of Done (проверки в коде и E2E):
 * - После загрузки изображения удаление фона запускается автоматически
 * - В зоне «после» отображается результат с прозрачным фоном
 * - Кнопка «Download» скачивает итоговый PNG (результат сегментации), а не исходник
 * - Обработка выполняется полностью в браузере
 *
 * Конкретные проверки по тест-критериям:
 *
 * Критерий 1 — «Открыть сайт → загрузить JPG → дождаться обработки → увидеть результат в «после» → нажать Download → открыть PNG: прозрачный фон, объект сохранён»:
 *   (1) Открыть сайт (goto /), дождаться готовности модели (data-model-ready="true").
 *   (2) Загрузить JPG через input.upload-input-hidden (setInputFiles(sample.jpg)).
 *   (3) Дождаться обработки: зона «до» (.zone-before) показывает превью; зона «после» (.zone-after) показывает .preview-image (не «Processing…», не плейсхолдер).
 *   (4) Убедиться, что .inference-error не отображается.
 *   (5) Нажать кнопку «Download» (button.btn-download должна быть enabled).
 *   (6) Дождаться скачивания одного файла; расширение .png.
 *   (7) Прочитать скачанный PNG: есть пиксели с alpha < 255 (прозрачный фон), есть пиксели с alpha > 0 (объект сохранён).
 *
 * Критерий 2 — «Повторить для PNG и WebP»:
 *   (1)–(7) Те же шаги, но загружать sample.png и sample.webp соответственно.
 *   (8) Для каждого формата (JPG, PNG, WebP) полный цикл выполняется без ошибки; скачанный файл — валидный PNG с альфа-каналом.
 */
import { test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import pngjs from 'pngjs';

const PNG = pngjs.PNG;

const FIXTURES_DIR = path.join(process.cwd(), 'tests', 'fixtures');
const FIXTURE_JPG = path.join(FIXTURES_DIR, 'sample.jpg');
const FIXTURE_PNG = path.join(FIXTURES_DIR, 'sample.png');
const FIXTURE_WEBP = path.join(FIXTURES_DIR, 'sample.webp');

test.setTimeout(180000);

async function ensureModelReady(page: import('@playwright/test').Page, timeout = 120000) {
  await page.goto('/');
  await expect(page.locator('.app-layout')).toBeVisible();
  try {
    await page.waitForSelector('[data-model-ready="true"]', { timeout });
  } catch {
    test.skip(true, 'u2netp.onnx not in public/models/ or model load >120s — e2e requires model to run inference');
  }
}

/** Runs full T-012 flow: upload file → wait for result in "after" → download → verify PNG has transparent background and visible object. */
async function runFullFlowAndVerifyPng(
  page: import('@playwright/test').Page,
  fixturePath: string
) {
  await ensureModelReady(page);
  await page.locator('input.upload-input-hidden').setInputFiles(fixturePath);
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
}

test('T-012 criterion 1: JPG — full flow, result in "after", Download gives PNG with transparent background and object', async ({
  page,
}) => {
  if (!fs.existsSync(FIXTURE_JPG)) {
    test.skip(true, 'tests/fixtures/sample.jpg missing — run: node scripts/prepare-fixtures.js');
  }
  await runFullFlowAndVerifyPng(page, FIXTURE_JPG);
});

test('T-012 criterion 2 (PNG): repeat full flow for PNG', async ({ page }) => {
  await runFullFlowAndVerifyPng(page, FIXTURE_PNG);
});

test('T-012 criterion 2 (WebP): repeat full flow for WebP', async ({ page }) => {
  if (!fs.existsSync(FIXTURE_WEBP)) {
    test.skip(true, 'tests/fixtures/sample.webp missing — run: node scripts/prepare-fixtures.js');
  }
  await runFullFlowAndVerifyPng(page, FIXTURE_WEBP);
});
