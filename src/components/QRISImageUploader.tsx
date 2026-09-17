import React, { useState, useRef } from 'react';
import { 
  Upload, 
  Image as ImageIcon, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  QrCode, 
  RefreshCw, 
  Trash2,
  Building,
  MapPin
} from 'lucide-react';
import { decodeQRFromImageFile, DecodedQRResult } from '../utils/qrisImageDecoder';

interface QRISImageUploaderProps {
  onQRISDecoded: (qrisPayload: string, meta?: { merchantName?: string; merchantCity?: string; imageUrl?: string }) => void;
  currentPayload?: string;
  label?: string;
  autoSaveToSettings?: boolean;
}

export const QRISImageUploader: React.FC<QRISImageUploaderProps> = ({
  onQRISDecoded,
  currentPayload,
  label = 'Upload Gambar / Screenshot QRIS DANA Bisnis',
  autoSaveToSettings = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<DecodedQRResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setScanResult({
        success: false,
        rawPayload: '',
        error: 'File harus berupa format gambar (PNG, JPG, JPEG, WEBP)',
      });
      return;
    }

    setIsScanning(true);
    setScanResult(null);

    try {
      const result = await decodeQRFromImageFile(file);
      setScanResult(result);

      if (result.success && result.rawPayload) {
        onQRISDecoded(result.rawPayload, {
          merchantName: result.merchantName,
          merchantCity: result.merchantCity,
          imageUrl: result.previewUrl,
        });

        if (autoSaveToSettings) {
          // Persist to server settings
          try {
            await fetch('/api/qris/save-uploaded', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                staticQris: result.rawPayload,
                imageUrl: result.previewUrl,
                merchantName: result.merchantName,
                merchantCity: result.merchantCity,
              }),
            });
          } catch (e) {
            console.error('Failed auto-saving uploaded QRIS to settings:', e);
          }
        }
      }
    } catch (err: any) {
      setScanResult({
        success: false,
        rawPayload: '',
        error: err.message || 'Gagal memproses gambar',
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const resetUpload = () => {
    setScanResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <QrCode className="w-4 h-4 text-blue-600" />
          <span>{label}</span>
        </label>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
          Auto Scan QR
        </span>
      </div>

      {/* Upload Zone (Drag-and-Drop & Click) */}
      <div
        id="qris-upload-dropzone"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-4 sm:p-5 text-center cursor-pointer transition-all duration-200 ${
          isDragging
            ? 'border-blue-500 bg-blue-50/70 scale-[1.01]'
            : 'border-slate-300 hover:border-blue-400 bg-slate-50/70 hover:bg-white'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/jpg"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="w-10 h-10 rounded-xl bg-blue-100/80 text-blue-700 flex items-center justify-center shadow-xs">
            {isScanning ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <Upload className="w-5 h-5" />
            )}
          </div>

          <div>
            <p className="text-xs font-bold text-slate-800">
              {isScanning
                ? 'Membaca & Memindai QRIS...'
                : 'Tarik & lepas gambar QRIS ke sini, atau klik untuk memilih file'}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Mendukung screenshot atau foto stiker QRIS DANA Bisnis / Merchant (PNG, JPG)
            </p>
          </div>
        </div>
      </div>

      {/* Result Card */}
      {scanResult && (
        <div
          className={`p-3.5 rounded-2xl border transition-all animate-in fade-in ${
            scanResult.success
              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          {scanResult.success ? (
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-200/80 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black">
                      QRIS Berhasil Dipindai!
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-200 text-emerald-800 uppercase">
                      Valid EMVCo
                    </span>
                  </div>

                  <div className="mt-1 space-y-0.5 text-xs text-emerald-900">
                    {scanResult.merchantName && (
                      <p className="flex items-center gap-1 font-semibold">
                        <Building className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Merchant: {scanResult.merchantName}</span>
                      </p>
                    )}
                    {scanResult.merchantCity && (
                      <p className="flex items-center gap-1 text-[11px] text-emerald-700">
                        <MapPin className="w-3 h-3 text-emerald-600" />
                        <span>Kota: {scanResult.merchantCity}</span>
                      </p>
                    )}
                  </div>

                  <p className="text-[10px] font-mono text-emerald-700/80 mt-1 break-all line-clamp-1">
                    Payload: {scanResult.rawPayload}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={resetUpload}
                className="p-1 text-emerald-600 hover:text-rose-600 hover:bg-emerald-100 rounded-lg transition"
                title="Hapus / Scan Ulang"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-bold block">Gagal Membaca QRIS</span>
                <span className="text-rose-700 text-[11px]">{scanResult.error}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
