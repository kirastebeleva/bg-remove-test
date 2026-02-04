/**
 * Generates sample.jpg and sample.webp from tests/fixtures/sample.png
 * for E2E tests (T-012: upload JPG / PNG / WebP).
 * Run: node scripts/prepare-fixtures.js
 */
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, '..', 'tests', 'fixtures');
const pngPath = path.join(fixturesDir, 'sample.png');

async function main() {
  let sharp;
  try {
    sharp = (await import('sharp')).default;
  } catch {
    console.error('Run: npm install');
    process.exit(1);
  }
  if (!fs.existsSync(pngPath)) {
    console.error('Missing tests/fixtures/sample.png');
    process.exit(1);
  }
  const buffer = fs.readFileSync(pngPath);
  await sharp(buffer).jpeg({ quality: 90 }).toFile(path.join(fixturesDir, 'sample.jpg'));
  await sharp(buffer).webp({ quality: 90 }).toFile(path.join(fixturesDir, 'sample.webp'));
  console.log('Created sample.jpg and sample.webp in tests/fixtures/');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
