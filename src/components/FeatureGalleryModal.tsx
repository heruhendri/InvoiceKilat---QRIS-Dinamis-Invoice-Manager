import React, { useState } from 'react';
import { 
  X, 
  ExternalLink, 
  Download, 
  Sparkles, 
  LayoutDashboard, 
  QrCode, 
  Zap, 
  Printer, 
  ChevronRight,
  CheckCircle2
} from 'lucide-react';

interface FeatureGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ScreenshotItem {
  id: string;
  title: string;
  category: string;
  imageSrc: string;
  icon: React.ReactNode;
  description: string;
  highlights: string[];
}

export const FeatureGalleryModal: React.FC<FeatureGalleryModalProps> = ({ isOpen, onClose }) => {
  const screenshots: ScreenshotItem[] = [
    {
      id: 'dashboard',
      title: 'Dashboard Utama & Analitik Keuangan',
      category: 'Overview & KPI',
      imageSrc: '/screenshots/dashboard.jpg',
      icon: <LayoutDashboard className="w-4 h-4 text-blue-600" />,
      description: 'Pusat kontrol metrik keuangan real-time dengan kartu KPI omset, status pembayaran live, tabel invoice komprehensif, dan tombol aksi cepat WhatsApp.',
      highlights: [
        'Kartu KPI Total Tagihan, Terbayar, Tertunggak, & Jatuh Tempo',
        'Grafik tren pendapatan harian dan bulanan terintegrasi',
        'Filter status instan (Semua, Menunggu, Lunas, Overdue)',
        'Kirim rincian invoice ke WhatsApp pelanggan dalam 1-klik',
      ],
    },
    {
      id: 'qris',
      title: 'Generator & Decoder QRIS Dinamis',
      category: 'Core Payment Engine',
      imageSrc: '/screenshots/qris-generator.jpg',
      icon: <QrCode className="w-4 h-4 text-emerald-600" />,
      description: 'Generator otomatis QRIS dinamis ber-nominal presisi dan checksum CRC16 EMVCo standar Bank Indonesia langsung dari unggahan QRIS statis DANA Bisnis.',
      highlights: [
        'Auto-decode payload TLV dari gambar QRIS statis via Canvas & jsQR',
        'Injeksi nominal tagihan otomatis (Tag 54) tanpa salah transfer',
        'Kalkulasi ulang checksum CRC16-CCITT (0xFFFF) valid m-Banking & e-Wallet',
        'Download barcode QRIS beresolusi tinggi siap cetak atau share',
      ],
    },
    {
      id: 'automation',
      title: 'Billing Automation Center',
      category: 'ISP & Recurring Engine',
      imageSrc: '/screenshots/billing-automation.jpg',
      icon: <Zap className="w-4 h-4 text-amber-500" />,
      description: 'Otomasi pembuatan invoice bulanan massal untuk penyedia internet (PPPoE / Dedicated) dengan perhitungan layanan recurring otomatis dari profil pelanggan.',
      highlights: [
        'Generate invoice bulanan massal untuk seluruh pelanggan dengan 1-klik',
        'Pilihan metode kalkulasi PPPoE: Rata-rata Bulanan vs Real-time Prorata',
        'Integrasi otomatis paket recurring (VPN Remote, Monitoring NOC, dll.)',
        'Otomasi reminder WhatsApp H-3 Jatuh Tempo, Hari-H, dan Overdue Alert',
      ],
    },
    {
      id: 'printable',
      title: 'Faktur Resmi Siap Cetak (A4 & PDF)',
      category: 'Dokumen & Kuitansi',
      imageSrc: '/screenshots/invoice-printable.jpg',
      icon: <Printer className="w-4 h-4 text-purple-600" />,
      description: 'Tata letak faktur standar profesional A4 yang ramah cetak dokumen resmi, lengkap dengan barcode QRIS dinamis, rekening bank, dan cap stempel Lunas.',
      highlights: [
        'Header bisnis kustom, logo perusahaan, nomor invoice, dan jatuh tempo',
        'Rincian tabel item jasa, subtotal, PPN 11%, dan kalkulasi sisa saldo',
        'Barcode QRIS dinamis siap scan langsung di lembar faktur',
        'Cap stempel resmi "LUNAS" atau "MENUNGGU PEMBAYARAN"',
      ],
    },
  ];

  const [activeTabId, setActiveTabId] = useState<string>('dashboard');
  const activeItem = screenshots.find((s) => s.id === activeTabId) || screenshots[0];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50/60 via-white to-indigo-50/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/25">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900">
                  Galeri Tangkapan Layar & Fitur Aplikasi
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-extrabold uppercase tracking-wider">
                  4 Tampilan Utama
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Pratinjau antarmuka visual lengkap dan arsitektur fitur InvoiceKilat
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="px-4 py-2.5 bg-slate-50/80 border-b border-slate-100 flex items-center gap-2 overflow-x-auto">
          {screenshots.map((item) => {
            const isActive = item.id === activeTabId;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTabId(item.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
                  isActive
                    ? 'bg-white text-blue-700 shadow-xs border border-blue-200 ring-1 ring-blue-100'
                    : 'text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                {item.icon}
                <span>{item.title}</span>
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {/* Main Screenshot Preview Card */}
          <div className="rounded-2xl border border-slate-200 bg-slate-900/5 p-2 overflow-hidden shadow-inner">
            <div className="relative rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center group">
              <img
                src={activeItem.imageSrc}
                alt={activeItem.title}
                className="w-full max-h-[480px] object-contain rounded-xl transition group-hover:scale-[1.01] duration-300"
                loading="eager"
              />
              
              <div className="absolute top-3 right-3 flex items-center gap-2 opacity-90 hover:opacity-100">
                <a
                  href={activeItem.imageSrc}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-900 text-white text-xs font-bold backdrop-blur-md shadow-lg transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Buka Gambar Penuh</span>
                </a>
                <a
                  href={activeItem.imageSrc}
                  download={`${activeItem.id}-screenshot.jpg`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold backdrop-blur-md shadow-lg transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh</span>
                </a>
              </div>
            </div>
          </div>

          {/* Details & Highlights */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold text-blue-600 uppercase tracking-wider bg-blue-100 px-2 py-0.5 rounded-md">
                  {activeItem.category}
                </span>
                <h4 className="text-sm font-extrabold text-slate-900">
                  {activeItem.title}
                </h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {activeItem.description}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-2">
              <h5 className="text-xs font-extrabold text-indigo-950 uppercase tracking-wider">
                Sorotan Utama:
              </h5>
              <ul className="space-y-1.5">
                {activeItem.highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-2 text-[11px] text-slate-700">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span>Daftar berkas tersimpan di:</span>
            <code className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-800 text-[11px] font-mono">
              /public/screenshots/*.jpg
            </code>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs shadow-md transition active:scale-95"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
