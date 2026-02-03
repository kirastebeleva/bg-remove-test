# Background Remover

SPA for removing image background in the browser (React + Vite + TypeScript). Uses U²-Net (u2netp) via ONNX Runtime Web. Deployed on [Cloudflare Pages](https://bg-remove-test.pages.dev/).

## Prerequisites

- Node.js 18+
- For e2e tests: Playwright browsers (`npx playwright install chromium`)

## Setup

```bash
npm install
```

The ML model is not in the repo. Download it once before running the app or e2e tests:

```bash
npm run download-model
```

This fetches `u2netp.onnx` (~4.5 MB) from Hugging Face into `public/models/`. Alternatively, place a `u2netp.onnx` file manually in `public/models/` (see [docs](docs/) for sources).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | TypeScript + Vite build |
| `npm run preview` | Preview production build |
| `npm run test` | Unit tests (Vitest) |
| `npm run test:e2e` | E2E tests (Playwright); requires model in `public/models/` |
| `npm run download-model` | Download u2netp.onnx to `public/models/` |
| `npm run lint` | ESLint |

## Docs

- [PRD](docs/00-PRD.md) · [Tech Spec](docs/01-TECH-SPEC.md) · [Tasks](docs/02-TASKS.md) · [Status](docs/05-STATUS.md)
