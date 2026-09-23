import jsQR from 'jsqr';
import { parseQris, validateQris } from './qrisClient';

export interface DecodedQRResult {
  success: boolean;
  rawPayload: string;
  merchantName?: string;
  merchantCity?: string;
  previewUrl?: string;
  error?: string;
}

/**
 * Scan an image element with multi-pass strategies:
 * 1. Native resolution
 * 2. Downscaled to 1200px max
 * 3. Downscaled to 800px max
 * 4. High-contrast / Grayscale thresholding
 */
function scanCanvasMultiPass(img: HTMLImageElement): string | null {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  // Pass 1: Scaled to max 1200px for optimal QR pattern detection
  const scales = [
    Math.min(1, 1200 / Math.max(img.width, img.height)),
    1.0, // native
    Math.min(1, 750 / Math.max(img.width, img.height)),
  ];

  for (const scale of scales) {
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(img, 0, 0, w, h);

    const imgData = ctx.getImageData(0, 0, w, h);
    const code = jsQR(imgData.data, w, h, { inversionAttempts: 'attemptBoth' });
    if (code && code.data && code.data.trim()) {
      return code.data.trim();
    }
  }

  // Pass 4: High-contrast binarization / grayscale
  try {
    const scale = Math.min(1, 900 / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(img, 0, 0, w, h);

    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      // Grayscale luminance
      const avg = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      // Adaptive contrast threshold
      const val = avg > 128 ? 255 : 0;
      data[i] = val;
      data[i + 1] = val;
      data[i + 2] = val;
    }
    ctx.putImageData(imgData, 0, 0);

    const code = jsQR(imgData.data, w, h, { inversionAttempts: 'attemptBoth' });
    if (code && code.data && code.data.trim()) {
      return code.data.trim();
    }
  } catch {
    // Ignore and proceed
  }

  return null;
}

/**
 * Decodes a QR code directly from an uploaded File or Blob using HTML5 Canvas & jsQR
 */
export async function decodeQRFromImageFile(file: File): Promise<DecodedQRResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        try {
          const rawCode = scanCanvasMultiPass(img);

          if (!rawCode) {
            resolve({
              success: false,
              rawPayload: '',
              previewUrl: event.target?.result as string,
              error: 'QR Code tidak terdeteksi pada gambar. Pastikan gambar QRIS jelas, tidak terlalu blur, dan pola QR terlihat utuh.',
            });
            return;
          }

          let payload = rawCode.trim();

          // Extract standard EMVCo sequence starting at 000201
          const startIdx = payload.indexOf('000201');
          if (startIdx !== -1) {
            payload = payload.substring(startIdx);
            // If tag 6304 is present, trim up to CRC end (8 chars after 6304 start)
            const crcIdx = payload.lastIndexOf('6304');
            if (crcIdx !== -1 && crcIdx + 8 <= payload.length) {
              payload = payload.substring(0, crcIdx + 8);
            }
          } else {
            resolve({
              success: false,
              rawPayload: payload,
              previewUrl: event.target?.result as string,
              error: 'QR Code terdeteksi, namun bukan format standar QRIS / EMVCo Bank Indonesia (harus memuat tag 000201).',
            });
            return;
          }

          // Parse metadata and validate
          const parsed = parseQris(payload);
          const validation = validateQris(payload);

          resolve({
            success: true,
            rawPayload: payload,
            merchantName: parsed.merchantName || 'Merchant QRIS',
            merchantCity: parsed.merchantCity || 'Indonesia',
            previewUrl: event.target?.result as string,
          });
        } catch (err: any) {
          resolve({
            success: false,
            rawPayload: '',
            error: err.message || 'Terjadi kesalahan saat memproses gambar QRIS',
          });
        }
      };

      img.onerror = () => {
        resolve({
          success: false,
          rawPayload: '',
          error: 'Format gambar tidak didukung atau file rusak',
        });
      };

      img.src = event.target?.result as string;
    };

    reader.onerror = () => {
      resolve({
        success: false,
        rawPayload: '',
        error: 'Gagal membaca file gambar',
      });
    };

    reader.readAsDataURL(file);
  });
}

