import jsQR from 'jsqr';
import { parseQris } from './qrisClient';

export interface DecodedQRResult {
  success: boolean;
  rawPayload: string;
  merchantName?: string;
  merchantCity?: string;
  previewUrl?: string;
  error?: string;
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
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d', { willReadFrequently: true });

          if (!ctx) {
            resolve({
              success: false,
              rawPayload: '',
              error: 'Gagal menginisialisasi canvas untuk membaca gambar',
            });
            return;
          }

          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0, img.width, img.height);

          const imageData = ctx.getImageData(0, 0, img.width, img.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'attemptBoth',
          });

          if (!code || !code.data) {
            resolve({
              success: false,
              rawPayload: '',
              previewUrl: event.target?.result as string,
              error: 'QR Code tidak terdeteksi pada gambar. Pastikan gambar QRIS jelas dan tidak blur.',
            });
            return;
          }

          const rawPayload = code.data.trim();
          
          // Verify EMVCo validity
          if (!rawPayload.startsWith('000201') && !rawPayload.includes('000201')) {
            resolve({
              success: false,
              rawPayload,
              previewUrl: event.target?.result as string,
              error: 'QR Code terdeteksi tetapi bukan format standar QRIS / EMVCo Bank Indonesia.',
            });
            return;
          }

          // Parse metadata
          const parsed = parseQris(rawPayload);

          resolve({
            success: true,
            rawPayload,
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
