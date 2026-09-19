import React, { useState, useEffect } from 'react';
import { 
  Search, 
  FileText, 
  QrCode, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Download, 
  Copy, 
  Check, 
  Share2, 
  ArrowLeft, 
  Printer, 
  Phone, 
  Mail, 
  Building, 
  ShieldCheck, 
  ExternalLink,
  Wallet,
  Calendar,
  Lock,
  Link2
} from 'lucide-react';
import { Invoice } from '../types';
import { formatRupiah, formatDateIndo, formatDateTimeIndo, getStatusDetails } from '../utils/formatters';

interface CustomerPortalProps {
  initialSearchQuery?: string;
  initialInvoiceNumber?: string;
  onBackToAdmin?: () => void;
  onSelectInvoiceForPrint?: (invoice: Invoice) => void;
  isStandalone?: boolean;
}

export const CustomerPortal: React.FC<CustomerPortalProps> = ({
  initialSearchQuery = '',
  initialInvoiceNumber = '',
  onBackToAdmin,
  onSelectInvoiceForPrint,
  isStandalone = false,
}) => {
  const [query, setQuery] = useState(initialSearchQuery);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Data retrieved
  const [customer, setCustomer] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [business, setBusiness] = useState<any>(null);

  // Selected invoice for detail view
  const [activeInvoice, setActiveInvoice] = useState<Invoice | null>(null);
  const [copiedQris, setCopiedQris] = useState(false);
  const [activeTabFilter, setActiveTabFilter] = useState<'all' | 'unpaid' | 'paid'>('all');

  const executeSearch = async (searchParam: string) => {
    const trimmed = searchParam.trim();
    if (!trimmed) {
      setErrorMessage('Silakan masukkan nomor WhatsApp, No. Invoice, atau Email Anda.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setHasSearched(true);
    setActiveInvoice(null);

    try {
      // 1. If it looks like an invoice number (starts with INV or contains dash)
      if (trimmed.toUpperCase().startsWith('INV-')) {
        const invRes = await fetch(`/api/portal/invoice/${encodeURIComponent(trimmed)}`);
        const invData = await invRes.json();
        if (invData.success && invData.invoice) {
          setActiveInvoice(invData.invoice);
          setInvoices([invData.invoice]);
          setCustomer(invData.invoice.customer);
          setBusiness(invData.business);
          setStats({
            totalInvoices: 1,
            paidInvoices: invData.invoice.status === 'paid' ? 1 : 0,
            pendingInvoices: invData.invoice.status !== 'paid' ? 1 : 0,
            totalAmount: invData.invoice.totalAmount,
            totalPaid: invData.invoice.paidAmount || 0,
            totalUnpaid: Math.max(0, invData.invoice.totalAmount - (invData.invoice.paidAmount || 0)),
          });
          setIsLoading(false);
          return;
        }
      }

      // 2. Search by phone or email
      const res = await fetch(`/api/portal/search?q=${encodeURIComponent(trimmed)}`);
      const data = await res.json();

      if (data.success && data.found) {
        setCustomer(data.customer);
        setStats(data.stats);
        setInvoices(data.invoices || []);
        setBusiness(data.business);

        // If specific invoice number was provided, set it as active
        if (initialInvoiceNumber) {
          const matched = (data.invoices || []).find((i: Invoice) => i.invoiceNumber === initialInvoiceNumber);
          if (matched) setActiveInvoice(matched);
        }
      } else {
        setCustomer(null);
        setInvoices([]);
        setStats(null);
        setErrorMessage(
          data.message || 
          'Tidak ditemukan tagihan dengan nomor WhatsApp atau email tersebut. Pastikan nomor/email sesuai dengan yang didaftarkan pada tagihan.'
        );
      }
    } catch (err: any) {
      setErrorMessage('Terjadi kendala jaringan saat menghubungi server: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialSearchQuery) {
      executeSearch(initialSearchQuery);
    } else if (initialInvoiceNumber) {
      executeSearch(initialInvoiceNumber);
    }
  }, [initialSearchQuery, initialInvoiceNumber]);

  const handleCopyQris = (rawQris?: string) => {
    if (!rawQris) return;
    navigator.clipboard.writeText(rawQris);
    setCopiedQris(true);
    setTimeout(() => setCopiedQris(false), 2000);
  };

  const handleDownloadQr = (inv: Invoice) => {
    if (!inv.dynamicQrisDataUrl) return;
    const link = document.createElement('a');
    link.href = inv.dynamicQrisDataUrl;
    link.download = `QRIS_${inv.invoiceNumber}_Rp${inv.totalAmount}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredInvoices = invoices.filter((inv) => {
    if (activeTabFilter === 'unpaid') return inv.status !== 'paid';
    if (activeTabFilter === 'paid') return inv.status === 'paid';
    return true;
  });

  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyPortalLink = () => {
    const origin = window.location.origin;
    const shareUrl = `${origin}/#/portal${query ? `?q=${encodeURIComponent(query)}` : ''}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-300">
      {/* Top Banner & Search Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-950 p-6 sm:p-8 text-white shadow-2xl border border-emerald-900/30">
        <div className="relative z-10 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Portal Khusus Pelanggan
            </span>

            <button
              onClick={handleCopyPortalLink}
              className="text-xs text-slate-300 hover:text-white flex items-center gap-1 bg-white/10 hover:bg-white/20 px-3 py-1 rounded-full transition"
              title="Salin Tautan Portal Ini untuk Dibagikan"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">Tautan Tersalin!</span>
                </>
              ) : (
                <>
                  <Link2 className="w-3.5 h-3.5" />
                  <span>Salin Tautan Portal</span>
                </>
              )}
            </button>

            {onBackToAdmin && (
              <button
                onClick={onBackToAdmin}
                className="text-xs text-slate-300 hover:text-white flex items-center gap-1 ml-auto bg-white/10 hover:bg-white/20 px-3 py-1 rounded-full transition"
              >
                <Lock className="w-3.5 h-3.5 text-blue-400" />
                <span>Kembali ke Portal Admin</span>
              </button>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Cek & Bayar Tagihan Anda
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
            Periksa status faktur, rincian pembayaran, dan bayar seketika dengan pemindaian <strong>QRIS Dinamis</strong> (nominal sudah otomatis terisi dan terkunci).
          </p>

          {/* Search Bar Input */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              executeSearch(query);
            }} 
            className="mt-6 flex flex-col sm:flex-row gap-2"
          >
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                id="portal-search-input"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ketik No. WhatsApp (contoh: 08123456789) atau No. Invoice..."
                className="w-full pl-11 pr-4 py-3 text-xs sm:text-sm rounded-2xl border border-white/20 bg-white/10 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 backdrop-blur-md"
              />
            </div>
            <button
              id="portal-search-submit-btn"
              type="submit"
              disabled={isLoading}
              className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-500/30 transition active:scale-95 disabled:opacity-50 shrink-0 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Mencari...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Lihat Tagihan</span>
                </>
              )}
            </button>
          </form>

          {/* Quick hint buttons */}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
            <span>Contoh pencarian:</span>
            <button
              type="button"
              onClick={() => {
                setQuery('081234567890');
                executeSearch('081234567890');
              }}
              className="underline hover:text-white"
            >
              081234567890 (Andi)
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => {
                setQuery('081398761234');
                executeSearch('081398761234');
              }}
              className="underline hover:text-white"
            >
              081398761234 (Siti)
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => {
                setQuery('INV-2026-001');
                executeSearch('INV-2026-001');
              }}
              className="underline hover:text-white"
            >
              INV-2026-001
            </button>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Error / Not Found Alert */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3 text-xs sm:text-sm animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Pencarian Tidak Ditemukan</p>
            <p className="mt-0.5 text-rose-700">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Customer Header & Financial Dashboard if found */}
      {customer && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Customer Profile Box */}
          <div className="md:col-span-1 rounded-3xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-base shadow-sm">
                  {customer.name?.slice(0, 2).toUpperCase() || 'PL'}
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Pelanggan Terverifikasi
                  </span>
                  <h2 className="text-base font-extrabold text-slate-900">
                    {customer.name}
                  </h2>
                  {customer.company && (
                    <p className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                      <Building className="w-3 h-3 text-slate-400" />
                      <span>{customer.company}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                {customer.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="font-mono">{customer.phone}</span>
                  </div>
                )}
                {customer.email && (
                  <div className="flex items-center gap-2 truncate">
                    <Mail className="w-3.5 h-3.5 text-blue-600" />
                    <span className="truncate">{customer.email}</span>
                  </div>
                )}
              </div>
            </div>

            {business && (
              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
                Diterbitkan oleh: <strong className="text-slate-700">{business.name}</strong>
              </div>
            )}
          </div>

          {/* Outstanding / Total Summary Card */}
          <div className="md:col-span-2 rounded-3xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Ringkasan Tagihan Anda
                </span>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                {stats?.totalInvoices || 0} Faktur
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 my-4">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  Total Tagihan
                </span>
                <span className="text-sm sm:text-base font-extrabold text-slate-900 font-mono block mt-0.5">
                  {formatRupiah(stats?.totalAmount || 0)}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-100">
                <span className="text-[10px] font-bold uppercase text-emerald-600 block">
                  Sudah Dibayar (Lunas)
                </span>
                <span className="text-sm sm:text-base font-extrabold text-emerald-700 font-mono block mt-0.5">
                  {formatRupiah(stats?.totalPaid || 0)}
                </span>
              </div>

              <div className="col-span-2 sm:col-span-1 p-3 rounded-2xl bg-amber-50/80 border border-amber-200">
                <span className="text-[10px] font-bold uppercase text-amber-700 block">
                  Sisa Tertunggak
                </span>
                <span className="text-sm sm:text-base font-extrabold text-amber-800 font-mono block mt-0.5">
                  {formatRupiah(stats?.totalUnpaid || 0)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500">Filter status:</span>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setActiveTabFilter('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                    activeTabFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Semua ({invoices.length})
                </button>
                <button
                  onClick={() => setActiveTabFilter('unpaid')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                    activeTabFilter === 'unpaid' ? 'bg-white text-amber-800 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Belum Lunas ({stats?.pendingInvoices || 0})
                </button>
                <button
                  onClick={() => setActiveTabFilter('paid')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                    activeTabFilter === 'paid' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Lunas ({stats?.paidInvoices || 0})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: List of Invoices & Active Invoice QRIS Detail */}
      {customer && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Invoices List (5 cols on lg) */}
          <div className="lg:col-span-5 space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 px-1">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>Daftar Faktur Pembayaran</span>
            </h3>

            {filteredInvoices.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 text-xs">
                Tidak ada faktur dengan filter terpilih.
              </div>
            ) : (
              filteredInvoices.map((inv) => {
                const isSelected = activeInvoice?.id === inv.id;
                const statusInfo = getStatusDetails(inv.status);
                const isPaid = inv.status === 'paid';

                return (
                  <div
                    key={inv.id}
                    onClick={() => setActiveInvoice(inv)}
                    className={`p-4 rounded-3xl border transition cursor-pointer flex flex-col justify-between gap-3 ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/50 shadow-md ring-2 ring-blue-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-extrabold text-slate-900 font-mono">
                            {inv.invoiceNumber}
                          </span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusInfo.badgeClass}`}>
                            {statusInfo.label}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 block mt-0.5">
                          Jatuh Tempo: <strong>{formatDateIndo(inv.dueDate)}</strong>
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-extrabold text-slate-900 font-mono block">
                          {formatRupiah(inv.totalAmount)}
                        </span>
                        {inv.paidAmount > 0 && inv.paidAmount < inv.totalAmount && (
                          <span className="text-[10px] text-emerald-600 block">
                            Dibayar: {formatRupiah(inv.paidAmount)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                      <span className="text-slate-400">
                        {inv.items?.length || 0} Layanan / Item
                      </span>

                      <div className="flex items-center gap-1.5 font-bold text-blue-600">
                        <span>{isPaid ? 'Lihat Bukti Bayar' : 'Bayar Sekarang'}</span>
                        <QrCode className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right Column: QRIS Dinamis & Invoice Breakdown (7 cols on lg) */}
          <div className="lg:col-span-7">
            {activeInvoice ? (
              <div className="rounded-3xl border border-slate-200 bg-white shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
                {/* Header of Active Invoice */}
                <div className="p-6 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-extrabold text-slate-900 font-mono">
                        {activeInvoice.invoiceNumber}
                      </h4>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusDetails(activeInvoice.status).badgeClass}`}>
                        {getStatusDetails(activeInvoice.status).label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Diterbitkan pada {formatDateIndo(activeInvoice.date)} • Jatuh tempo: {formatDateIndo(activeInvoice.dueDate)}
                    </p>
                  </div>

                  {onSelectInvoiceForPrint && (
                    <button
                      onClick={() => onSelectInvoiceForPrint(activeInvoice)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-100 transition shadow-2xs"
                      title="Cetak Faktur Resmi"
                    >
                      <Printer className="w-3.5 h-3.5 text-blue-600" />
                      <span className="hidden sm:inline">Cetak PDF</span>
                    </button>
                  )}
                </div>

                <div className="p-6 space-y-6">
                  {/* QRIS Dinamis Showcase Box (If not paid) */}
                  {activeInvoice.status !== 'paid' ? (
                    <div className="p-6 rounded-3xl bg-gradient-to-b from-blue-50/60 to-indigo-50/40 border border-blue-200 text-center flex flex-col items-center">
                      <span className="px-3 py-1 rounded-full bg-blue-600 text-white text-[11px] font-extrabold uppercase tracking-wider mb-2 flex items-center gap-1.5 shadow-sm">
                        <QrCode className="w-3.5 h-3.5" />
                        Pindai QRIS Dinamis (Auto-Nominal)
                      </span>

                      <h5 className="text-lg font-black text-slate-900">
                        Total Tagihan: {formatRupiah(activeInvoice.totalAmount)}
                      </h5>
                      <p className="text-xs text-slate-600 max-w-sm mt-1">
                        Buka aplikasi perbankan (BCA, Mandiri, BRI, BNI) atau e-wallet (DANA, GoPay, OVO, ShopeePay). Pindai QR di bawah, nominal otomatis terisi presisi.
                      </p>

                      {/* QR Image */}
                      <div className="mt-4 p-4 rounded-3xl bg-white border-2 border-blue-600/30 shadow-md inline-block">
                        {activeInvoice.dynamicQrisDataUrl ? (
                          <img
                            src={activeInvoice.dynamicQrisDataUrl}
                            alt={`QRIS Dinamis ${activeInvoice.invoiceNumber}`}
                            className="w-56 h-56 object-contain rounded-xl mx-auto"
                          />
                        ) : (
                          <div className="w-56 h-56 flex items-center justify-center text-slate-400 text-xs">
                            QRIS sedang di-generate...
                          </div>
                        )}
                        <span className="block mt-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          STANDAR QRIS BANK INDONESIA (CRC16 VALID)
                        </span>
                      </div>

                      {/* Action buttons for QR */}
                      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                        <button
                          onClick={() => handleDownloadQr(activeInvoice)}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition active:scale-95"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Unduh Gambar QRIS</span>
                        </button>

                        <button
                          onClick={() => handleCopyQris(activeInvoice.dynamicQris)}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition active:scale-95"
                        >
                          {copiedQris ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Payload Tersalin</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Salin String QRIS</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* LUNAS Certificate / Verified Notice */
                    <div className="p-6 rounded-3xl bg-emerald-50 border border-emerald-200 text-center flex flex-col items-center">
                      <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs mb-3">
                        <CheckCircle2 className="w-8 h-8" />
                      </div>
                      <span className="px-3 py-1 rounded-full bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider">
                        Tagihan Lunas Terverifikasi ✅
                      </span>
                      <h5 className="text-xl font-black text-slate-900 mt-2 font-mono">
                        {formatRupiah(activeInvoice.totalAmount)}
                      </h5>
                      <p className="text-xs text-slate-600 max-w-sm mt-1">
                        Terima kasih! Pembayaran untuk faktur ini telah kami terima dan diverifikasi oleh sistem keuangan.
                      </p>

                      {activeInvoice.transactions && activeInvoice.transactions.length > 0 && (
                        <div className="mt-4 p-3 rounded-2xl bg-white border border-emerald-200 w-full max-w-md text-xs text-left">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                            Rincian Transaksi
                          </span>
                          <div className="flex justify-between font-mono">
                            <span className="text-slate-600">Nomor Referensi:</span>
                            <span className="font-bold text-slate-900">{activeInvoice.transactions[0].referenceNumber}</span>
                          </div>
                          <div className="flex justify-between mt-1">
                            <span className="text-slate-600">Metode Bayar:</span>
                            <span className="font-bold text-emerald-700 uppercase">{activeInvoice.transactions[0].paymentMethod.replace('_', ' ')}</span>
                          </div>
                          <div className="flex justify-between mt-1">
                            <span className="text-slate-600">Waktu Verifikasi:</span>
                            <span className="font-bold text-slate-900">{formatDateTimeIndo(activeInvoice.transactions[0].verifiedAt)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Items breakdown list */}
                  <div>
                    <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                      Rincian Layanan / Produk
                    </h5>
                    <div className="rounded-2xl border border-slate-100 overflow-hidden divide-y divide-slate-100 text-xs">
                      {activeInvoice.items?.map((item, idx) => (
                        <div key={idx} className="p-3 bg-white flex items-center justify-between">
                          <div>
                            <p className="font-bold text-slate-900">{item.description}</p>
                            <span className="text-[11px] text-slate-500">
                              {item.quantity} × {formatRupiah(item.price)}
                            </span>
                          </div>
                          <span className="font-extrabold text-slate-900 font-mono">
                            {formatRupiah(item.total)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Subtotal, Tax, and Total Summary */}
                    <div className="mt-3 p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5 text-xs">
                      <div className="flex justify-between text-slate-600">
                        <span>Subtotal:</span>
                        <span className="font-mono font-semibold">{formatRupiah(activeInvoice.subtotal)}</span>
                      </div>

                      {activeInvoice.discountAmount > 0 && (
                        <div className="flex justify-between text-emerald-600">
                          <span>Diskon:</span>
                          <span className="font-mono font-semibold">- {formatRupiah(activeInvoice.discountAmount)}</span>
                        </div>
                      )}

                      {activeInvoice.taxAmount > 0 && (
                        <div className="flex justify-between text-slate-600">
                          <span>PPN ({activeInvoice.taxPercent}%):</span>
                          <span className="font-mono font-semibold">+ {formatRupiah(activeInvoice.taxAmount)}</span>
                        </div>
                      )}

                      <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-extrabold text-slate-900">
                        <span>Total Akhir:</span>
                        <span className="font-mono text-blue-700">{formatRupiah(activeInvoice.totalAmount)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Notes / Instructions */}
                  {activeInvoice.notes && (
                    <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-100 text-xs text-slate-600">
                      <strong className="block text-slate-900 mb-0.5">Catatan Faktur:</strong>
                      <p>{activeInvoice.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-400">
                <QrCode className="w-12 h-12 mx-auto mb-2 opacity-40 text-blue-600" />
                <p className="text-sm font-bold text-slate-700">Pilih salah satu faktur di sebelah kiri</p>
                <p className="text-xs text-slate-500 mt-1">
                  Pilih faktur untuk menampilkan kode QRIS Dinamis dan rincian item tagihan.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Initial Landing State before searching */}
      {!hasSearched && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
          <div className="p-5 rounded-3xl border border-slate-200 bg-white shadow-xs">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold mb-3">
              <Search className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-slate-900">1. Cari Tagihan</h4>
            <p className="text-xs text-slate-500 mt-1">
              Cukup masukkan nomor WhatsApp yang Anda gunakan saat pemesanan atau nomor faktur.
            </p>
          </div>

          <div className="p-5 rounded-3xl border border-slate-200 bg-white shadow-xs">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold mb-3">
              <QrCode className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-slate-900">2. Pindai QRIS</h4>
            <p className="text-xs text-slate-500 mt-1">
              Pindai QRIS Dinamis dengan BCA, Mandiri, BRI, DANA, GoPay, atau OVO. Nominal otomatis terisi.
            </p>
          </div>

          <div className="p-5 rounded-3xl border border-slate-200 bg-white shadow-xs">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold mb-3">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-slate-900">3. Unduh Bukti Lunas</h4>
            <p className="text-xs text-slate-500 mt-1">
              Faktur terverifikasi langsung dapat dicetak atau disimpan dalam bentuk PDF resmi.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
