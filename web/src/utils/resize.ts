export async function resizeImageForUpload(
  base64: string,
  mimeType: string,
  maxWidth = 1200,
  quality = 0.7,
): Promise<{ base64: string; mimeType: string }> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      try {
        let { width, height } = img;
        if (width === 0 || height === 0) { resolve({ base64, mimeType }); return; }
        if (width > maxWidth) {
          height = Math.round(height * (maxWidth / width));
          width = maxWidth;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve({ base64, mimeType }); return; }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve({ base64: dataUrl.split(',')[1], mimeType: 'image/jpeg' });
      } catch {
        resolve({ base64, mimeType });
      }
    };
    img.onerror = () => resolve({ base64, mimeType });
    img.src = `data:${mimeType};base64,${base64}`;
  });
}
