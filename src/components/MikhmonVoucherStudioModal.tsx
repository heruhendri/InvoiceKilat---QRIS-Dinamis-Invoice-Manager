import React, { useState, useEffect } from 'react';
import { X, Printer, Ticket, RefreshCw, Copy, Check, Sparkles, Download } from 'lucide-react';
import { MikhmonInstance, MikhmonVoucher } from '../types';
import { formatRupiah } from '../utils/formatters';

interface MikhmonVoucherStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  instance: MikhmonInstance | null;
  showNotice: (type: 'success' | 'error' | 'info', message: string) => void;
  onVouchersGenerated?: () => void;
}

export const MikhmonVoucherStudioModal: React.FC<MikhmonVoucherStudioModalProps> = ({
  isOpen,
  onClose,
  instance,
  showNotice,
  onVouchersGenerated,
}) => {
  const [qty, setQty] = useState<number>(12);
  const [prefix, setPrefix] = useState<string>('WIFI-');
  const [profile, setProfile] = useState<string>('3Jam-5k');
  const [price, setPrice] = useState<number>(5000);
  const [timeLimit, setTimeLimit] = useState<string>('3h');
  const [dataLimit, setDataLimit] = useState<string>('3GB');
  const [userMode, setUserMode] = useState<'up' | 'vc'>('up');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [vouchers, setVouchers] = useState<MikhmonVoucher[]>([]);
  const [copied, setCopied] = useState<boolean>(false);

  // Fetch existing vouchers for this instance
  useEffect(() => {
    if (isOpen && instance) {
      fetch(`/api/mikhmon/instances/${instance.id}/vouchers`)
        .then((r) => r.json())
        .then((data) => {
          if (data.success && data.vouchers) {
            setVouchers(data.vouchers);
          }
        })
        .catch((err) => console.warn('Gagal memuat voucher:', err));
    }
  }, [isOpen, instance]);

  if (!isOpen || !instance) return null;

  const handleProfileChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setProfile(val);
    if (val === '1Jam-2k') {
      setPrice(2000);
      setTimeLimit('1h');
      setDataLimit('1GB');
    } else if (val === '3Jam-5k') {
      setPrice(5000);
      setTimeLimit('3h');
      setDataLimit('3GB');
    } else if (val === '1Hari-10k') {
      setPrice(10000);
      setTimeLimit('24h');
      setDataLimit('10GB');
    } else if (val === '7Hari-35k') {
      setPrice(35000);
      setTimeLimit('7d');
      setDataLimit('Unlimited');
    } else if (val === '1Bulan-100k') {
      setPrice(100000);
      setTimeLimit('30d');
      setDataLimit('Unlimited');
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    try {
      const res = await fetch(`/api/mikhmon/instances/${instance.id}/vouchers/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qty,
          prefix,
          profile,
          price,
          timeLimit,
          dataLimit,
          userMode,
        }),
      });
      const data = await res.json();
      if (data.success && data.vouchers) {
        setVouchers((prev) => [...data.vouchers, ...prev]);
        showNotice('success', data.message || `Berhasil menerbitkan ${qty} voucher!`);
        if (onVouchersGenerated) onVouchersGenerated();
      } else {
        showNotice('error', data.message || 'Gagal generate voucher');
      }
    } catch (err: any) {
      showNotice('error', err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyAllCodes = () => {
    if (vouchers.length === 0) return;
    const text = vouchers.map((v) => `${v.code} (Rp ${v.price.toLocaleString('id-ID')} - ${v.profile})`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-3xl max-w-5xl w-full shadow-2xl flex flex-col my-auto max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                <span>Voucher Studio & Cetak Instan</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-800 text-amber-400">
                  {instance.sessionName}
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Cetak voucher hotspot siap pakai untuk tenant <strong>{instance.subdomain}</strong> ({instance.customerName}).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {/* Generation Form */}
          <form onSubmit={handleGenerate} className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Konfigurasi Penerbitan Voucher</span>
              </h4>
              <span className="text-[11px] font-mono text-slate-400">
                Router: {instance.mikrotikHost || '127.0.0.1'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  Jumlah Voucher
                </label>
                <select
                  value={qty}
                  onChange={(e) => setQty(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                >
                  <option value={6}>6 Lembar (Thermal 58mm)</option>
                  <option value={12}>12 Lembar</option>
                  <option value={24}>24 Lembar (A4 Sheet)</option>
                  <option value={50}>50 Lembar</option>
                  <option value={100}>100 Lembar (Batch Besar)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  Paket & Tarif
                </label>
                <select
                  value={profile}
                  onChange={handleProfileChange}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                >
                  <option value="1Jam-2k">1 Jam - Rp 2.000 (1 GB)</option>
                  <option value="3Jam-5k">3 Jam - Rp 5.000 (3 GB)</option>
                  <option value="1Hari-10k">24 Jam - Rp 10.000 (10 GB)</option>
                  <option value="7Hari-35k">7 Hari - Rp 35.000 (Unlimited)</option>
                  <option value="1Bulan-100k">30 Hari - Rp 100.000 (Unlimited)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  Mode Login
                </label>
                <select
                  value={userMode}
                  onChange={(e) => setUserMode(e.target.value as 'up' | 'vc')}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                >
                  <option value="up">Username = Password</option>
                  <option value="vc">Username & Password Beda</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  Prefix Kode
                </label>
                <input
                  type="text"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  placeholder="WIFI-"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="text-xs text-slate-400">
                Tarif Terpilih: <strong className="text-amber-400 font-mono text-sm">{formatRupiah(price)}</strong> &bull; Masa Aktif: <span className="text-white font-mono">{timeLimit}</span> &bull; Kuota: <span className="text-white font-mono">{dataLimit}</span>
              </div>

              <button
                type="submit"
                disabled={isGenerating}
                className="px-5 py-2.5 rounded-xl bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs transition flex items-center gap-2 active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                <span>{isGenerating ? 'Mencetak Voucher...' : 'Generate Voucher Sekarang'}</span>
              </button>
            </div>
          </form>

          {/* Vouchers Print Preview */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Pratinjau Voucher Tiket ({vouchers.length} Lembar)
                </h4>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyAllCodes}
                  disabled={vouchers.length === 0}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin Semua Kode</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handlePrint}
                  disabled={vouchers.length === 0}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak ke Printer (Ctrl+P)</span>
                </button>
              </div>
            </div>

            {vouchers.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-slate-950 border border-slate-800 text-slate-500 text-xs">
                Belum ada voucher yang diterbitkan. Silakan klik tombol di atas untuk menerbitkan voucher batch perdana.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {vouchers.map((v) => (
                  <div
                    key={v.id}
                    className="p-3.5 rounded-xl bg-white text-slate-900 border-2 border-dashed border-slate-300 font-mono flex flex-col justify-between shadow-xs"
                  >
                    <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 mb-2">
                      <span className="font-black text-xs text-amber-700">{instance.hotspotName || instance.sessionName}</span>
                      <span className="font-black text-xs text-slate-900">{formatRupiah(v.price)}</span>
                    </div>

                    <div className="text-center my-1">
                      <span className="text-[10px] text-slate-500 block">KODE LOGIN VOUCHER</span>
                      <div className="text-lg font-black text-slate-900 bg-slate-100 py-1 rounded-md tracking-wider">
                        {v.code}
                      </div>
                      {v.password && v.password !== v.code && (
                        <div className="text-xs text-slate-600 mt-0.5">
                          Pass: <strong>{v.password}</strong>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-dashed border-slate-300 pt-1.5 mt-2 text-[10px] text-slate-500 flex items-center justify-between">
                      <span>Masa: {v.timeLimit || '3h'}</span>
                      <span>Kuota: {v.dataLimit || '3GB'}</span>
                    </div>

                    <div className="text-[9px] text-slate-400 text-center mt-1">
                      Buka browser: {instance.dnsName || 'hotspot.net'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div className="text-[11px] text-slate-400 font-mono">
            {vouchers.length} voucher siap cetak &bull; Format Standar Mikhmon Thermal 58mm/80mm
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};
