/**
 * Loads image from URL, draws to canvas, exports as PNG and triggers download.
 */
export function downloadAsPng(imageUrl: string, filename: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas 2d context not available'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to create PNG blob'));
            return;
          }
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename.endsWith('.png') ? filename : `${filename.replace(/\.[^.]+$/, '')}.png`;
          a.click();
          URL.revokeObjectURL(url);
          resolve();
        },
        'image/png'
      );
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageUrl;
  });
}
