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
  Printer, 
  Phone, 
  Mail, 
  Building, 
  ShieldCheck, 
  ExternalLink,
  Wallet,
  Calendar,
  Link2,
  Sparkles,
  CreditCard,
  MessageCircle,
  HelpCircle,
  Receipt,
  Server,
  Activity,
  LogOut,
  ChevronRight,
  Radio,
  Sliders,
  UserCheck,
  ChevronDown,
  RefreshCw,
  Lock
} from 'lucide-react';
import { Invoice, BusinessSettings } from '../types';
import { formatRupiah, formatDateIndo, formatDateTimeIndo, getStatusDetails } from '../utils/formatters';
import { CustomerRouterPortal } from './CustomerRouterPortal';
import { CustomerLogin } from './CustomerLogin';

interface CustomerPortalProps {
  settings?: BusinessSettings | null;
  initialSearchQuery?: string;
  initialInvoiceNumber?: string;
  onBackToAdmin?: () => void;
  onSelectInvoiceForPrint?: (invoice: Invoice) => void;
  isStandalone?: boolean;
}

export const CustomerPortal: React.FC<CustomerPortalProps> = ({
  settings,
  initialSearchQuery = '',
  initialInvoiceNumber = '',
  onBackToAdmin,
  onSelectInvoiceForPrint,
  isStandalone = false,
}) => {
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [customer, setCustomer] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [business, setBusiness] = useState<any>(null);

  // Portal view mode: 'billing' (Invoices & QRIS) or 'router' (MikroTik NOC Console)
  const [portalView, setPortalView] = useState<'billing' | 'router'>('billing');

  // Selected invoice for detail view
  const [activeInvoice, setActiveInvoice] = useState<Invoice | null>(null);
  const [copiedQris, setCopiedQris] = useState(false);
  const [copiedBank, setCopiedBank] = useState(false);
  const [activeTabFilter, setActiveTabFilter] = useState<'all' | 'unpaid' | 'paid'>('all');
  const [copiedLink, setCopiedLink] = useState(false);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);

  const appName = settings?.appName || 'InvoiceKilat';
  const companyName = settings?.businessName || 'PT Cipta Media Nusantara';
  const qrisMerchantName = settings?.qrisMerchantName || business?.qrisMerchantName || 'hendr.store';
  const qrisMerchantCity = settings?.qrisMerchantCity || business?.qrisMerchantCity || 'Kab. Pemalang';
  const logoUrl = settings?.companyLogoUrl || settings?.appLogoUrl;
  const supportPhone = settings?.businessPhone || '6281298765432';

  // Check saved session on mount or handle initial queries
  useEffect(() => {
    const initSession = async () => {
      setIsLoadingSession(true);
      const token = localStorage.getItem('customer_token') || sessionStorage.getItem('customer_token');

      // 1. If explicit invoice number requested, attempt instant lookup login
      if (initialInvoiceNumber) {
        try {
          const res = await fetch('/api/portal/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              invoiceNumber: initialInvoiceNumber,
              loginMode: 'invoice',
              rememberMe: true,
            }),
          });
          const data = await res.json();
          if (data.success && data.customer) {
            setCustomer(data.customer);
            setInvoices(data.invoices || []);
            setStats(data.stats || null);
            setBusiness(data.business);
            if (data.activeInvoice) {
              setActiveInvoice(data.activeInvoice);
            } else if (data.invoices && data.invoices.length > 0) {
              setActiveInvoice(data.invoices[0]);
            }
            setIsLoadingSession(false);
            return;
          }
        } catch {}
      }

      // 2. If token exists, validate session via /api/portal/me
      if (token) {
        try {
          const res = await fetch('/api/portal/me', {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          const data = await res.json();
          if (data.success && data.customer) {
            setCustomer(data.customer);
            setInvoices(data.invoices || []);
            setStats(data.stats || null);
            setBusiness(data.business);
            if (data.invoices && data.invoices.length > 0) {
              const firstUnpaid = data.invoices.find((i: Invoice) => i.status !== 'paid');
              setActiveInvoice(firstUnpaid || data.invoices[0]);
            }
            setIsLoadingSession(false);
            return;
          } else {
            // Token expired or invalid
            localStorage.removeItem('customer_token');
            sessionStorage.removeItem('customer_token');
          }
        } catch {}
      }

      // 3. Fallback: if initialSearchQuery provided
      if (initialSearchQuery) {
        try {
          const res = await fetch('/api/portal/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              identifier: initialSearchQuery,
              password: 'client123',
              loginMode: 'account',
            }),
          });
          const data = await res.json();
          if (data.success && data.customer) {
            setCustomer(data.customer);
            setInvoices(data.invoices || []);
            setStats(data.stats || null);
            setBusiness(data.business);
            if (data.invoices && data.invoices.length > 0) {
              const firstUnpaid = data.invoices.find((i: Invoice) => i.status !== 'paid');
              setActiveInvoice(firstUnpaid || data.invoices[0]);
            }
            setIsLoadingSession(false);
            return;
          }
        } catch {}
      }

      setIsLoadingSession(false);
    };

    initSession();
  }, [initialSearchQuery, initialInvoiceNumber]);

  const handleLoginSuccess = (cust: any, invs: Invoice[], st: any, token: string) => {
    setCustomer(cust);
    setInvoices(invs);
    setStats(st);
    if (invs && invs.length > 0) {
      const firstUnpaid = invs.find((i) => i.status !== 'paid');
      setActiveInvoice(firstUnpaid || invs[0]);
    }
  };

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('customer_token') || sessionStorage.getItem('customer_token');
      if (token) {
        await fetch('/api/portal/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
        });
      }
    } catch {}

    localStorage.removeItem('customer_token');
    localStorage.removeItem('customer_profile');
    sessionStorage.removeItem('customer_token');
    sessionStorage.removeItem('customer_profile');

    setCustomer(null);
    setInvoices([]);
    setStats(null);
    setActiveInvoice(null);
  };

  const handleCopyQris = (rawQris?: string) => {
    if (!rawQris) return;
    navigator.clipboard.writeText(rawQris);
    setCopiedQris(true);
    setTimeout(() => setCopiedQris(false), 2000);
  };

  const handleCopyBankAcc = (accNumber: string) => {
    navigator.clipboard.writeText(accNumber);
    setCopiedBank(true);
    setTimeout(() => setCopiedBank(false), 2000);
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

  const handleCheckPaymentStatus = async (invoiceId: string) => {
    setIsVerifyingPayment(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`);
      const data = await res.json();
      if (data && data.status) {
        setInvoices((prev) =>
          prev.map((i) => (i.id === invoiceId ? { ...i, status: data.status, paidAmount: data.paidAmount } : i))
        );
        if (activeInvoice && activeInvoice.id === invoiceId) {
          setActiveInvoice({ ...activeInvoice, status: data.status, paidAmount: data.paidAmount });
        }
      }
    } catch {}
    finally {
      setIsVerifyingPayment(false);
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    if (activeTabFilter === 'unpaid') return inv.status !== 'paid';
    if (activeTabFilter === 'paid') return inv.status === 'paid';
    return true;
  });

  const handleCopyPortalLink = () => {
    try {
      const origin = window.location.origin;
      const shareUrl = `${origin}/#/portal`;
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(shareUrl).catch(() => {});
      }
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {}
  };

  // WhatsApp Support Link
  const cleanPhone = supportPhone.replace(/[^0-9]/g, '');
  const waSupportUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
    `Halo ${companyName}, saya (${customer?.company || customer?.name || 'Pelanggan'}) ingin menanyakan faktur melalui portal pelanggan.`
  )}`;

  // Loading session screen
  if (isLoadingSession) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-bold text-slate-700">Menghubungkan ke Portal Pelanggan...</p>
        <p className="text-xs text-slate-400">Memverifikasi kredensial dan sesi terenkripsi</p>
      </div>
    );
  }

  // ================= NOT LOGGED IN: SHOW PROFESSIONAL CUSTOMER LOGIN =================
  if (!customer) {
    return (
      <CustomerLogin
        onLoginSuccess={handleLoginSuccess}
        onGoToAdminPortal={onBackToAdmin}
        businessName={settings?.appName || settings?.businessName || 'InvoiceKilat'}
        initialInvoiceNumber={initialInvoiceNumber}
        initialQuery={initialSearchQuery}
      />
    );
  }

  // ================= LOGGED IN: SHOW FULL CUSTOMER DASHBOARD =================
  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-300 max-w-7xl mx-auto px-2 sm:px-4">
      {/* Top Banner & Customer Identity Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-6 sm:p-8 text-white shadow-2xl border border-slate-800">
        <div className="relative z-10 space-y-6">
          {/* Top Bar inside banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <div className="w-11 h-11 rounded-2xl bg-white p-1 border border-white/20 shadow-xs flex items-center justify-center shrink-0">
                  <img src={logoUrl} alt={companyName} className="max-h-full max-w-full object-contain" />
                </div>
              ) : (
                <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-lg shadow-xs shrink-0">
                  {companyName.substring(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-extrabold text-sm sm:text-base text-white tracking-tight">
                    {companyName}
                  </h2>
                  <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold border border-emerald-500/30">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    Verified QRIS Merchant
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {settings?.businessTagline || 'Portal Resmi Cek & Pembayaran Faktur Pelanggan'}
                </p>
              </div>
            </div>

            {/* Quick Actions (WhatsApp CS & Logout) */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyPortalLink}
                className="text-xs text-slate-300 hover:text-white flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-3 py-2 rounded-xl transition border border-white/10"
                title="Salin Tautan Portal"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300 font-bold">Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Link2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Salin Link</span>
                  </>
                )}
              </button>

              <a
                href={waSupportUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-white font-bold flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 px-3.5 py-2 rounded-xl transition shadow-md shadow-emerald-600/20"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Bantuan WhatsApp</span>
                <span className="sm:hidden">CS</span>
              </a>

              <button
                onClick={handleLogout}
                className="text-xs text-rose-200 hover:text-white flex items-center gap-1.5 bg-rose-500/20 hover:bg-rose-600 px-3.5 py-2 rounded-xl transition border border-rose-500/30 font-bold"
                title="Keluar dari akun portal pelanggan"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Keluar</span>
              </button>
            </div>
          </div>

          {/* Active Customer Identity & Stats Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 pt-2">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-extrabold uppercase tracking-wider">
                  <UserCheck className="w-3 h-3 text-blue-400" />
                  Sesi Pelanggan Aktif
                </span>
                {customer.customerMode === 'noc' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-extrabold border border-indigo-500/30">
                    <Server className="w-3 h-3 text-indigo-400" />
                    MikroTik NOC Ready
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {customer.company || customer.name}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-1">
                {customer.company && customer.name && (
                  <span className="flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-slate-400" />
                    PIC: <strong className="text-white">{customer.name}</strong>
                  </span>
                )}
                {customer.phone && (
                  <span className="flex items-center gap-1.5 font-mono">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    {customer.phone}
                  </span>
                )}
                {customer.email && (
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-sky-400" />
                    {customer.email}
                  </span>
                )}
              </div>
            </div>

            {/* Quick Summary Pill Counters */}
            <div className="grid grid-cols-3 gap-2.5 bg-white/5 p-3 rounded-2xl border border-white/10 backdrop-blur-md shrink-0 text-center">
              <div className="px-3 py-1">
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Total Faktur</span>
                <span className="text-lg font-black text-white">{stats?.totalInvoices ?? invoices.length}</span>
              </div>
              <div className="px-3 py-1 border-x border-white/10">
                <span className="text-[10px] text-amber-300 block font-bold uppercase">Menunggu</span>
                <span className="text-lg font-black text-amber-300">{stats?.pendingInvoices ?? 0}</span>
              </div>
              <div className="px-3 py-1">
                <span className="text-[10px] text-emerald-300 block font-bold uppercase">Lunas</span>
                <span className="text-lg font-black text-emerald-300">{stats?.paidInvoices ?? 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-blue-600/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-40 -bottom-20 w-60 h-60 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Primary View Switcher: Billing vs Router Monitoring */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-1.5 rounded-2xl bg-slate-200/80 border border-slate-300/60 shadow-xs">
        <button
          onClick={() => setPortalView('billing')}
          className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-xs sm:text-sm font-extrabold transition ${
            portalView === 'billing'
              ? 'bg-white text-slate-900 shadow-md ring-1 ring-slate-900/5'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
          }`}
        >
          <Receipt className="w-4 h-4 text-blue-600" />
          <span>Tagihan & Pembayaran Faktur</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
            portalView === 'billing' ? 'bg-blue-100 text-blue-800' : 'bg-slate-300/60 text-slate-700'
          }`}>
            {stats?.totalInvoices ?? invoices.length}
          </span>
        </button>

        <button
          onClick={() => setPortalView('router')}
          className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-xs sm:text-sm font-extrabold transition ${
            portalView === 'router'
              ? 'bg-white text-slate-900 shadow-md ring-1 ring-slate-900/5'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
          }`}
        >
          <Server className="w-4 h-4 text-emerald-600" />
          <span>Monitoring Router & NOC MikroTik</span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            LIVE
          </span>
        </button>
      </div>

      {/* ================= ROUTER MONITORING TAB ================= */}
      {portalView === 'router' && (
        <div className="animate-in fade-in duration-200">
          <CustomerRouterPortal
            customer={customer}
            onCustomerUpdated={() => {
              // Refresh customer data
              fetch('/api/portal/me', {
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('customer_token') || sessionStorage.getItem('customer_token') || ''}`,
                }
              })
                .then((r) => r.json())
                .then((d) => {
                  if (d.success && d.customer) setCustomer(d.customer);
                })
                .catch(() => {});
            }}
          />
        </div>
      )}

      {/* ================= BILLING & INVOICES TAB ================= */}
      {portalView === 'billing' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Outstanding / Total Summary Card */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Ringkasan Tagihan & Faktur Anda
                </span>
              </div>
              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full">
                {stats?.totalInvoices || invoices.length} Faktur
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Total Seluruh Faktur
                </span>
                <span className="text-xl font-black text-slate-900">
                  {formatRupiah(stats?.totalAmount || 0)}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80">
                <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block mb-1 flex items-center justify-between">
                  <span>Belum Dibayar</span>
                  <span className="text-[10px] bg-amber-200/80 text-amber-900 px-2 py-0.2 rounded-full font-extrabold">
                    {stats?.pendingInvoices || 0} Faktur
                  </span>
                </span>
                <span className="text-xl font-black text-amber-950">
                  {formatRupiah(stats?.totalUnpaid || 0)}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200/80">
                <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block mb-1 flex items-center justify-between">
                  <span>Sudah Terbayar</span>
                  <span className="text-[10px] bg-emerald-200/80 text-emerald-900 px-2 py-0.2 rounded-full font-extrabold">
                    {stats?.paidInvoices || 0} Lunas
                  </span>
                </span>
                <span className="text-xl font-black text-emerald-950">
                  {formatRupiah(stats?.totalPaid || 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Invoice Filter Pills */}
          <div className="flex items-center justify-between gap-3 overflow-x-auto pb-1">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTabFilter('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  activeTabFilter === 'all'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                Semua ({invoices.length})
              </button>
              <button
                onClick={() => setActiveTabFilter('unpaid')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTabFilter === 'unpaid'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Belum Lunas ({invoices.filter((i) => i.status !== 'paid').length})</span>
              </button>
              <button
                onClick={() => setActiveTabFilter('paid')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTabFilter === 'paid'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Lunas ({invoices.filter((i) => i.status === 'paid').length})</span>
              </button>
            </div>
          </div>

          {/* Main Grid: List of Invoices & Active Invoice QRIS Detail */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Invoices List (5 cols on lg) */}
            <div className="lg:col-span-5 space-y-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 px-1">
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>Daftar Faktur Pembayaran</span>
              </h3>

              {filteredInvoices.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 text-xs">
                  Tidak ada faktur dengan filter ini.
                </div>
              ) : (
                filteredInvoices.map((inv) => {
                  const statusInfo = getStatusDetails(inv.status);
                  const isSelected = activeInvoice?.id === inv.id;

                  return (
                    <div
                      key={inv.id}
                      onClick={() => setActiveInvoice(inv)}
                      className={`p-4 rounded-2xl border transition cursor-pointer relative group ${
                        isSelected
                          ? 'bg-blue-50/50 border-blue-500 ring-2 ring-blue-500/20 shadow-md'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-extrabold text-slate-900 group-hover:text-blue-600 transition">
                              {inv.invoiceNumber}
                            </span>
                            <span
                              className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full ${statusInfo.badgeClass}`}
                            >
                              {statusInfo.label}
                            </span>
                          </div>

                          <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                            <span>Jatuh Tempo: {formatDateIndo(inv.dueDate)}</span>
                            {inv.items?.length > 0 && (
                              <span>• {inv.items.length} Item Layanan</span>
                            )}
                          </p>
                        </div>

                        <div className="text-right">
                          <span className="text-sm font-black text-slate-900 block">
                            {formatRupiah(inv.totalAmount)}
                          </span>
                          {inv.status === 'paid' ? (
                            <span className="text-[10px] font-bold text-emerald-600 flex items-center justify-end gap-1 mt-0.5">
                              <CheckCircle2 className="w-3 h-3" />
                              Lunas
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-amber-600 flex items-center justify-end gap-1 mt-0.5">
                              <Clock className="w-3 h-3" />
                              Menunggu Bayar
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Right Column: Active Invoice QRIS & Detail (7 cols on lg) */}
            <div className="lg:col-span-7">
              {activeInvoice ? (
                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
                  {/* Invoice Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
                    <div>
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                        Detail Faktur Terpilih
                      </span>
                      <h2 className="text-xl font-black text-slate-900 flex items-center gap-2 mt-0.5">
                        <span>{activeInvoice.invoiceNumber}</span>
                        <span className={`px-2.5 py-0.5 text-xs font-extrabold rounded-full ${getStatusDetails(activeInvoice.status).badgeClass}`}>
                          {getStatusDetails(activeInvoice.status).label}
                        </span>
                      </h2>
                    </div>

                    <div className="flex items-center gap-2">
                      {onSelectInvoiceForPrint && (
                        <button
                          onClick={() => onSelectInvoiceForPrint(activeInvoice)}
                          className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5"
                          title="Cetak Faktur PDF Resmi"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Cetak / PDF</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleCheckPaymentStatus(activeInvoice.id)}
                        disabled={isVerifyingPayment}
                        className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                        title="Periksa status pembayaran langsung ke server"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isVerifyingPayment ? 'animate-spin' : ''}`} />
                        <span>Cek Status</span>
                      </button>
                    </div>
                  </div>

                  {/* QRIS Card (If not paid) */}
                  {activeInvoice.status !== 'paid' ? (
                    <div className="rounded-2xl bg-gradient-to-br from-blue-50/60 via-slate-50 to-indigo-50/60 border border-blue-200/80 p-5 space-y-4">
                      <div className="flex flex-col sm:flex-row items-center gap-6">
                        {/* QR Code Container */}
                        <div className="relative p-3 bg-white rounded-2xl border-2 border-blue-500 shadow-md flex flex-col items-center shrink-0">
                          {activeInvoice.dynamicQrisDataUrl ? (
                            <img
                              src={activeInvoice.dynamicQrisDataUrl}
                              alt="QRIS Dinamis"
                              className="w-48 h-48 object-contain rounded-lg"
                            />
                          ) : (
                            <div className="w-48 h-48 flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-lg">
                              <QrCode className="w-12 h-12 mb-2 text-slate-300" />
                              <span className="text-[11px] font-bold">QRIS Dinamis Otomatis</span>
                            </div>
                          )}

                          <div className="mt-2 text-center">
                            <span className="text-[10px] font-extrabold text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider inline-flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-blue-600" />
                              DANA BISNIS • QRIS DINAMIS
                            </span>
                            <div className="text-xs font-bold text-slate-800 mt-1">
                              {qrisMerchantName}
                            </div>
                            <div className="text-[10px] text-slate-500 font-medium">
                              {qrisMerchantCity}
                            </div>
                          </div>
                        </div>

                        {/* Nominal & Steps */}
                        <div className="space-y-3 flex-1 text-center sm:text-left">
                          <div>
                            <span className="text-xs text-slate-500 font-medium">Jumlah yang Harus Dibayar:</span>
                            <div className="text-2xl sm:text-3xl font-black text-blue-600 mt-0.5">
                              {formatRupiah(activeInvoice.totalAmount)}
                            </div>
                            <p className="text-[11px] text-slate-500 mt-1">
                              *Nominal telah dikunci presisi di dalam QRIS Dinamis. Bebas salah transfer nominal.
                            </p>
                          </div>

                          <div className="space-y-1.5 text-xs text-slate-600">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px] shrink-0">
                                1
                              </span>
                              <span>Buka BCA Mobile, Livin Mandiri, BRImo, DANA, GoPay, OVO, ShopeePay</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px] shrink-0">
                                2
                              </span>
                              <span>Pindai QR Code di samping dan pastikan nama penerima <strong>{qrisMerchantName}</strong> ({qrisMerchantCity})</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px] shrink-0">
                                3
                              </span>
                              <span>Konfirmasi pembayaran. Status otomatis terverifikasi lunas.</span>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            {activeInvoice.dynamicQrisDataUrl && (
                              <button
                                onClick={() => handleDownloadQr(activeInvoice)}
                                className="text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-1.5 transition"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>Unduh Gambar QRIS</span>
                              </button>
                            )}

                            {activeInvoice.rawQrisString && (
                              <button
                                onClick={() => handleCopyQris(activeInvoice.rawQrisString)}
                                className="text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-1.5 transition"
                              >
                                {copiedQris ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    <span className="text-emerald-700">String Tersalin!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>Salin String QRIS</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Invoice Paid Banner */
                    <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-5 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/20">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-extrabold text-emerald-950">Faktur Telah Lunas Terverifikasi</h4>
                        <p className="text-xs text-emerald-800 mt-0.5">
                          Terima kasih atas pembayaran Anda sebesar <strong>{formatRupiah(activeInvoice.totalAmount)}</strong>. Bukti pelunasan resmi dapat dicetak atau disimpan.
                        </p>
                      </div>
                      {onSelectInvoiceForPrint && (
                        <button
                          onClick={() => onSelectInvoiceForPrint(activeInvoice)}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition shrink-0"
                        >
                          Lihat Kuitansi
                        </button>
                      )}
                    </div>
                  )}

                  {/* Bank Transfer Alternatives */}
                  {settings?.bankAccounts && settings.bankAccounts.length > 0 && activeInvoice.status !== 'paid' && (
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                        <span>Alternatif Transfer Bank Manual:</span>
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {settings.bankAccounts.map((b) => (
                          <div
                            key={b.id}
                            className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-2"
                          >
                            <div>
                              <span className="text-[10px] font-extrabold text-blue-700 uppercase block">{b.bankName}</span>
                              <span className="text-xs font-mono font-bold text-slate-900">{b.accountNumber}</span>
                              <span className="text-[10px] text-slate-500 block">a/n {b.accountHolder}</span>
                            </div>
                            <button
                              onClick={() => handleCopyBankAcc(b.accountNumber)}
                              className="px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-white rounded-lg border border-slate-200 transition"
                            >
                              {copiedBank ? 'Tersalin' : 'Salin'}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Items Breakdown Table */}
                  <div className="space-y-3 pt-2">
                    <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                      Rincian Layanan & Produk
                    </h4>
                    <div className="border border-slate-200 rounded-2xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                          <tr>
                            <th className="py-2.5 px-3">Item / Layanan</th>
                            <th className="py-2.5 px-3 text-center">Qty</th>
                            <th className="py-2.5 px-3 text-right">Harga</th>
                            <th className="py-2.5 px-3 text-right">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {activeInvoice.items?.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50/50">
                              <td className="py-2.5 px-3">
                                <span className="font-bold text-slate-900 block">{item.name}</span>
                                {item.description && (
                                  <span className="text-[11px] text-slate-500">{item.description}</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-center text-slate-600 font-mono">
                                {item.quantity} {item.unit || ''}
                              </td>
                              <td className="py-2.5 px-3 text-right text-slate-600 font-mono">
                                {formatRupiah(item.price)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                                {formatRupiah(item.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {/* Calculations summary footer */}
                      <div className="p-3.5 bg-slate-50/80 border-t border-slate-200 space-y-1.5 text-xs text-slate-600">
                        <div className="flex justify-between">
                          <span>Subtotal:</span>
                          <span className="font-mono font-bold text-slate-900">{formatRupiah(activeInvoice.subtotal)}</span>
                        </div>
                        {activeInvoice.taxAmount ? (
                          <div className="flex justify-between text-slate-500">
                            <span>PPN ({activeInvoice.taxRate || 11}%):</span>
                            <span className="font-mono">{formatRupiah(activeInvoice.taxAmount)}</span>
                          </div>
                        ) : null}
                        {activeInvoice.discountAmount ? (
                          <div className="flex justify-between text-emerald-600">
                            <span>Potongan Diskon:</span>
                            <span className="font-mono">-{formatRupiah(activeInvoice.discountAmount)}</span>
                          </div>
                        ) : null}
                        <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-black text-slate-900">
                          <span>Total Akhir:</span>
                          <span className="text-blue-600 font-mono">{formatRupiah(activeInvoice.totalAmount)}</span>
                        </div>
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
        </div>
      )}

      {/* Portal Watermark Footer */}
      <footer className="mt-12 py-6 border-t border-slate-200/80 text-center text-xs text-slate-500 font-medium">
        <p>{settings?.watermarkText || 'Aplikasi ini dibuat oleh Heru Hendri • Contact Person: 08977345640'}</p>
        <p className="text-[11px] text-slate-400 mt-1">Portal Pembayaran Tagihan Resmi & Terverifikasi Otomatis</p>
      </footer>
    </div>
  );
};
