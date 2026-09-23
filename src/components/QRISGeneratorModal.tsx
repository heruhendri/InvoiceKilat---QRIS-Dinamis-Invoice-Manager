import React, { useState, useEffect } from 'react';
import { 
  QrCode, 
  Copy, 
  Check, 
  Download, 
  Sparkles, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  Building,
  MapPin,
  Tag,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';
import { convertStaticToDynamicQris, renderQrCodeDataUrl, calculateCRC16, validateQris, parseQris, QrisParsed } from '../utils/qrisClient';
import { formatRupiah } from '../utils/formatters';
import { QRISImageUploader } from './QRISImageUploader';
import { BusinessSettings } from '../types';

interface QRISGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultStaticQris: string;
  settings?: BusinessSettings | null;
}

export const QRISGeneratorModal: React.FC<QRISGeneratorModalProps> = ({
  isOpen,
  onClose,
  defaultStaticQris,
  settings,
}) => {
  const getSettingsQris = () => (defaultStaticQris || settings?.defaultStaticQris || '').trim();

  const [staticPayload, setStaticPayload] = useState<string>(getSettingsQris());
  const [amount, setAmount] = useState<number>(150000);
  const [invoiceRef, setInvoiceRef] = useState<string>('INV-2026-DEMO');
  
  const [dynamicPayload, setDynamicPayload] = useState<string>('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [validationResult, setValidationResult] = useState<{ valid: boolean; message: string; details?: any }>({ valid: true, message: '' });
  const [parsedData, setParsedData] = useState<QrisParsed | null>(null);

  // Sync with defaultStaticQris / settings whenever modal is opened or settings change
  useEffect(() => {
    if (isOpen) {
      const qrisFromSettings = getSettingsQris();
      if (qrisFromSettings) {
        setStaticPayload(qrisFromSettings);
      }
    }
  }, [isOpen, defaultStaticQris, settings?.defaultStaticQris]);

  // Generate dynamic QRIS
  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const activePayload = (staticPayload || getSettingsQris()).trim();
      const overrideName = settings?.qrisMerchantName;
      const overrideCity = settings?.qrisMerchantCity;

      const generated = convertStaticToDynamicQris(
        activePayload, 
        amount, 
        invoiceRef,
        overrideName,
        overrideCity
      );
      setDynamicPayload(generated);
      
      const v = validateQris(generated);
      setValidationResult(v);
      const p = parseQris(generated);
      setParsedData(p);

      const url = await renderQrCodeDataUrl(generated);
      setQrDataUrl(url);
    } catch (e: any) {
      console.error(e);
      setValidationResult({ valid: false, message: e.message || 'Gagal memproses QRIS' });
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      handleGenerate();
    }
  }, [isOpen, staticPayload, amount, invoiceRef]);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (dynamicPayload) {
      navigator.clipboard.writeText(dynamicPayload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `QRIS_Dinamis_${amount}_${invoiceRef}.png`;
    a.click();
  };

  const presetAmounts = [25000, 50000, 100000, 150000, 250000, 500000];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-4xl rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-900 to-indigo-900 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/10 text-blue-300">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold flex items-center gap-2">
                <span>Mesin Generator QRIS Dinamis Otomatis</span>
                <span className="rounded-md bg-blue-500/30 text-blue-200 text-[10px] font-bold px-2 py-0.5 uppercase">
                  DANA Bisnis / All E-Wallet
                </span>
              </h3>
              <p className="text-xs text-blue-200/80 mt-0.5">
                Konversi QRIS Bisnis Statis menjadi QRIS Dinamis dengan nominal presisi & CRC-16 EMVCo standar Bank Indonesia.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-y-auto flex-1">
          {/* Left Form: Inputs */}
          <div className="lg:col-span-7 space-y-4">
            <div className="rounded-2xl bg-blue-50/60 p-4 border border-blue-100">
              <h4 className="text-xs font-bold text-blue-950 flex items-center gap-1.5 mb-1">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>Bagaimana Cara Kerjanya?</span>
              </h4>
              <p className="text-[11px] text-blue-800 leading-relaxed">
                Anda cukup mengupload gambar QRIS DANA Bisnis atau menempelkan payload teksnya. Sistem otomatis mengubah tag inisiasi menjadi dinamis (<code className="bg-blue-100 px-1 rounded font-mono">010212</code>), menyuntikkan nominal tag 54 (<code className="bg-blue-100 px-1 rounded font-mono">540...</code>), dan mengkalkulasi ulang checksum CRC-16/CCITT standar EMVCo secara real-time!
              </p>
            </div>

            {/* Active DANA QRIS from Settings Banner */}
            <div className="rounded-2xl bg-emerald-50/90 border border-emerald-200 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-xl bg-emerald-600 text-white shrink-0 shadow-2xs">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-emerald-950 uppercase tracking-wide">
                      QRIS DANA Bisnis Aktif (Pengaturan)
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-emerald-200/70 text-emerald-800 text-[10px] font-bold">
                      Tersimpan
                    </span>
                  </div>
                  <p className="text-xs text-emerald-800 font-bold truncate mt-0.5">
                    {settings?.qrisMerchantName || parsedData?.merchantName || 'hendr.store'} • {settings?.qrisMerchantCity || parsedData?.merchantCity || 'Kab. Pemalang'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const sQris = getSettingsQris();
                  if (sQris) {
                    setStaticPayload(sQris);
                  }
                }}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-emerald-300 hover:bg-emerald-100 text-emerald-900 text-xs font-bold shadow-2xs transition active:scale-95 shrink-0"
                title="Muat ulang payload QRIS yang tersimpan di Pengaturan"
              >
                <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
                <span>Pakai QRIS Pengaturan</span>
              </button>
            </div>

            <QRISImageUploader
              label="Upload Screenshot QRIS DANA Bisnis Baru"
              currentPayload={staticPayload}
              onQRISDecoded={(payload) => {
                setStaticPayload(payload);
              }}
            />

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">
                  String QRIS Bisnis Statis (EMVCo Payload)
                </label>
                {staticPayload && (
                  <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    Tag 59: {parseQris(staticPayload).merchantName || settings?.qrisMerchantName || 'hendr.store'}
                  </span>
                )}
              </div>
              <textarea
                rows={3}
                value={staticPayload}
                onChange={(e) => setStaticPayload(e.target.value)}
                placeholder="0002010102112658..."
                className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Nominal Pembayaran (Rp)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="flex-1 px-3.5 py-2.5 text-sm font-bold font-mono rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              {/* Quick Presets */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {presetAmounts.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setAmount(p)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                      amount === p
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {formatRupiah(p)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Referensi / Nomor Invoice (Tag 62)
              </label>
              <input
                type="text"
                value={invoiceRef}
                onChange={(e) => setInvoiceRef(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Akan disematkan ke subtag 01 (Invoice Reference)
              </span>
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white py-3 text-xs font-bold shadow-md shadow-blue-500/20 transition active:scale-98"
            >
              <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>Generate Ulang QRIS Dinamis</span>
            </button>
          </div>

          {/* Right: Preview & Live Output */}
          <div className="lg:col-span-5 flex flex-col items-center justify-start p-6 rounded-3xl bg-slate-50 border border-slate-200 text-center">
            {/* Validation Badge */}
            <div className={`w-full mb-3 px-3 py-2 rounded-xl text-left flex items-start gap-2 border text-xs font-medium ${
              validationResult.valid 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              {validationResult.valid ? (
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div>
                <span className="font-bold block">
                  {validationResult.valid ? 'EMVCo Standar Bank Indonesia Valid' : 'Format QRIS Bermasalah'}
                </span>
                <span className="text-[11px] opacity-90 leading-tight block">
                  {validationResult.message || 'QRIS siap dipindai oleh semua aplikasi bank & e-wallet'}
                </span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-xl border border-slate-200/80 mb-4 w-full flex flex-col items-center">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="QRIS Dinamis Hasil Generate"
                  className="w-52 h-52 object-contain"
                />
              ) : (
                <div className="w-52 h-52 flex items-center justify-center text-slate-400 text-xs">
                  Membuat QR Code...
                </div>
              )}
              <div className="mt-3 text-center border-t border-slate-100 pt-2 w-full">
                <span className="text-sm font-extrabold text-blue-700 block">
                  {formatRupiah(amount)}
                </span>
                <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-700 mt-1 font-semibold">
                  <Building className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="text-slate-900 font-bold">{parsedData?.merchantName || settings?.qrisMerchantName || 'hendr.store'}</span>
                  <span className="text-slate-300">•</span>
                  <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="text-slate-700">{parsedData?.merchantCity || settings?.qrisMerchantCity || 'Kab. Pemalang'}</span>
                </div>
                <div className="mt-1.5 inline-flex items-center justify-center gap-1 text-[10px] text-emerald-800 font-bold bg-emerald-100/80 border border-emerald-300 rounded-lg py-0.5 px-2">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Sesuai QRIS DANA Bisnis Pengaturan</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono block mt-1">
                  Ref: {invoiceRef}
                </span>
              </div>
            </div>

            <div className="w-full space-y-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-700 shadow-2xs transition active:scale-95"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Disalin!' : 'Salin Payload'}</span>
                </button>

                <button
                  onClick={handleDownload}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-xs transition active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh QR</span>
                </button>
              </div>

              {/* Raw payload snippet */}
              <div className="text-left mt-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  EMVCo Dynamic Payload:
                </span>
                <div className="p-2.5 rounded-xl bg-slate-900 text-emerald-400 font-mono text-[10px] break-all leading-tight max-h-24 overflow-y-auto">
                  {dynamicPayload}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

