export async function generateThumbnail(base64: string, mimeType: string, size = 72): Promise<string> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const s = Math.min(img.width, img.height);
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(''); return; }
        ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.5));
      } catch {
        resolve('');
      }
    };
    img.onerror = () => resolve('');
    img.src = `data:${mimeType};base64,${base64}`;
  });
}
