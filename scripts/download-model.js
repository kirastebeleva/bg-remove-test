#!/usr/bin/env node
/**
 * Downloads u2netp.onnx into public/models/.
 * Required for app inference and e2e tests (npm run test:e2e).
 * Source: Hugging Face (martintomov/comfy, rembg).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const MODEL_DIR = path.join(ROOT, 'public', 'models');
const MODEL_PATH = path.join(MODEL_DIR, 'u2netp.onnx');
const URL =
  'https://huggingface.co/martintomov/comfy/resolve/1b0c3477e152d8a2dea8e4e418a6dba32de56fda/rembg/u2netp.onnx';

async function main() {
  fs.mkdirSync(MODEL_DIR, { recursive: true });
  console.log('Downloading u2netp.onnx...');
  const res = await fetch(URL);
  if (!res.ok) {
    throw new Error(`Download failed: ${res.status} ${res.statusText}`);
  }
  const buf = await res.arrayBuffer();
  fs.writeFileSync(MODEL_PATH, new Uint8Array(buf));
  console.log(`Saved to ${MODEL_PATH} (${(buf.byteLength / 1024 / 1024).toFixed(2)} MB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
