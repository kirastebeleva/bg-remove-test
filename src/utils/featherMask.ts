/**
 * T-011 — Постобработка маски (feather / blur).
 *
 * Definition of Done:
 * - К границам маски применяется размытие или feather (по TECH-SPEC)
 * - В итоговом PNG нет явных ступенчатых артефактов по контуру
 *
 * Конкретные проверки по тест-критериям:
 *
 * Критерий 1 — «Сравнить результат на одном и том же портрете до/после постобработки — края визуально мягче»:
 *   (1) Выполнить пайплайн на одном портрете с постобработкой (текущая реализация).
 *   (2) Скачать PNG, открыть в редакторе с поддержкой альфа.
 *   (3) Убедиться: контур объекта (волосы, плечи) — без жёсткой «ступеньки», переход в прозрачность плавный.
 *   (4) Для сравнения при необходимости временно отключить feather (radius 0) и повторить — без постобработки края жёстче.
 *
 * Критерий 2 — «Acceptance: «фон удалён без явных дефектов» (PRD) выполняется»:
 *   (1) Загрузить портрет или карточку товара.
 *   (2) Дождаться обработки, скачать PNG.
 *   (3) Проверить: фон прозрачный, объект не обрезан, по контуру нет заметных артефактов (зубчатость, ореолы).
 *   (4) Результат приемлем для сценариев PRD (документы, маркетплейсы).
 */

const DEFAULT_FEATHER_RADIUS = 2;

/**
 * Сглаживает альфа-канал маски (feather/blur) для уменьшения ступенчатых краёв.
 * Применяется separable box blur по альфе; значения остаются в [0, 1].
 *
 * @param alpha — массив альфы (0–1), длина width * height
 * @param width — ширина маски в пикселях
 * @param height — высота маски в пикселях
 * @param radius — радиус размытия в пикселях (по умолчанию 2); 0 — без сглаживания
 * @returns новый Float32Array той же длины, значения 0–1
 */
export function featherAlpha(
  alpha: Float32Array,
  width: number,
  height: number,
  radius: number = DEFAULT_FEATHER_RADIUS
): Float32Array {
  if (alpha.length !== width * height) {
    throw new Error(`featherAlpha: alpha.length ${alpha.length} !== width*height ${width * height}`);
  }
  if (radius <= 0) {
    const out = new Float32Array(alpha.length);
    out.set(alpha);
    return out;
  }

  const r = Math.floor(radius);
  const temp = new Float32Array(alpha.length);

  // Horizontal pass: blur each row
  for (let y = 0; y < height; y++) {
    const rowStart = y * width;
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let count = 0;
      const x0 = Math.max(0, x - r);
      const x1 = Math.min(width - 1, x + r);
      for (let xx = x0; xx <= x1; xx++) {
        sum += alpha[rowStart + xx];
        count += 1;
      }
      temp[rowStart + x] = count > 0 ? sum / count : alpha[rowStart + x];
    }
  }

  // Vertical pass: blur each column, write to output
  const out = new Float32Array(alpha.length);
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      let sum = 0;
      let count = 0;
      const y0 = Math.max(0, y - r);
      const y1 = Math.min(height - 1, y + r);
      for (let yy = y0; yy <= y1; yy++) {
        sum += temp[yy * width + x];
        count += 1;
      }
      const v = count > 0 ? sum / count : temp[y * width + x];
      out[y * width + x] = Math.max(0, Math.min(1, v));
    }
  }
  return out;
}
