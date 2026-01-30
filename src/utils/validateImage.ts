const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
const MAX_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB
const MAX_DIMENSION = 5000;

export type ValidateImageOk = { ok: true; file: File };
export type ValidateImageError = { ok: false; error: string };
export type ValidateImageResult = ValidateImageOk | ValidateImageError;

export function validateImage(file: File): Promise<ValidateImageResult> {
  if (!ACCEPTED_TYPES.includes(file.type as (typeof ACCEPTED_TYPES)[number])) {
    return Promise.resolve({
      ok: false,
      error: 'Неподдерживаемый формат. Используйте JPG, PNG или WebP.',
    });
  }

  if (file.size > MAX_SIZE_BYTES) {
    return Promise.resolve({
      ok: false,
      error: 'Файл слишком большой. Максимум 15 МБ.',
    });
  }

  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      const { naturalWidth, naturalHeight } = img;
      if (naturalWidth > MAX_DIMENSION || naturalHeight > MAX_DIMENSION) {
        resolve({
          ok: false,
          error: `Разрешение слишком большое. Максимум ${MAX_DIMENSION}×${MAX_DIMENSION} px.`,
        });
      } else {
        resolve({ ok: true, file });
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({
        ok: false,
        error: 'Не удалось загрузить изображение.',
      });
    };

    img.src = url;
  });
}
