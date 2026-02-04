# Technical Specification

## 1. Архитектура
- Frontend-only SPA
- Хостинг: Cloudflare Pages
- Без backend

## 2. ML / Inference
- Модель: U²-Net (`u2netp.onnx`)
- Runtime: `onnxruntime-web`
- Execution providers:
  - WebGPU (основной)
  - WASM (fallback)

## 3. Pipeline обработки
1. Загрузка изображения
2. Проверка размера и разрешения
3. Resize до фиксированного размера (320–480)
4. Inference → маска
5. Upscale маски
6. Post-processing (blur / feather)
7. Композиция → PNG

## 4. Производительность
- Загрузка модели: ≤ 7 сек (первый запуск)
- Inference: ≤ 10 сек (WASM; WebGPU не используется для u2net из‑за MaxPool ceil)
- Обработка фото ≤ 15 сек (после загрузки модели)

## 5. Хранение модели
- `/public/models/u2netp.onnx`
- Кэшируется браузером
