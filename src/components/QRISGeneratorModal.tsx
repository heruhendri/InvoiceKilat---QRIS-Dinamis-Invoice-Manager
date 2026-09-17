import React, { useState } from 'react';
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
  ShieldCheck
} from 'lucide-react';
import { convertStaticToDynamicQris, renderQrCodeDataUrl, calculateCRC16 } from '../utils/qrisClient';
import { formatRupiah } from '../utils/formatters';
import { QRISImageUploader } from './QRISImageUploader';

interface QRISGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultStaticQris: string;
}

export const QRISGeneratorModal: React.FC<QRISGeneratorModalProps> = ({
  isOpen,
  onClose,
  defaultStaticQris,
}) => {
  const [staticPayload, setStaticPayload] = useState<string>(defaultStaticQris || '');
  const [amount, setAmount] = useState<number>(150000);
  const [invoiceRef, setInvoiceRef] = useState<string>('INV-2026-DEMO');
  
  const [dynamicPayload, setDynamicPayload] = useState<string>('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Generate dynamic QRIS
  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const generated = convertStaticToDynamicQris(staticPayload, amount, invoiceRef);
      setDynamicPayload(generated);
      const url = await renderQrCodeDataUrl(generated);
      setQrDataUrl(url);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  React.useEffect(() => {
    if (isOpen) {
      handleGenerate();
    }
  }, [isOpen]);

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

            <QRISImageUploader
              label="Upload Screenshot QRIS DANA Bisnis"
              currentPayload={staticPayload}
              onQRISDecoded={(payload) => {
                setStaticPayload(payload);
              }}
            />

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                String QRIS Bisnis Statis (Dari DANA Bisnis / Merchant)
              </label>
              <textarea
                rows={3}
                value={staticPayload}
                onChange={(e) => setStaticPayload(e.target.value)}
                placeholder="00020101021126590014ID.DANA.WWW..."
                className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Nominal Pembayaran (Rp)
                </label>
                <input
                  type="number"
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 text-sm font-bold font-mono rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-[11px] text-emerald-600 font-bold mt-1 block">
                  {formatRupiah(amount)}
                </span>
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
                  Akan disematkan ke subtag 01
                </span>
              </div>
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
          <div className="lg:col-span-5 flex flex-col items-center justify-center p-6 rounded-3xl bg-slate-50 border border-slate-200 text-center">
            <div className="bg-white p-4 rounded-2xl shadow-xl border border-slate-200/80 mb-4">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="QRIS Dinamis Hasil Generate"
                  className="w-56 h-56 object-contain"
                />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center text-slate-400 text-xs">
                  Membuat QR Code...
                </div>
              )}
              <div className="mt-2 text-center">
                <span className="text-xs font-extrabold text-blue-700 block">
                  {formatRupiah(amount)}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {invoiceRef}
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
