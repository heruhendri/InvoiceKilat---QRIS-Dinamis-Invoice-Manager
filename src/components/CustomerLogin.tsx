import React, { useState, useEffect } from 'react';
import { 
  User, 
  Building, 
  Phone, 
  Mail, 
  KeyRound, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ShieldCheck, 
  AlertCircle, 
  FileText, 
  Server, 
  Sparkles, 
  CheckCircle2, 
  Lock, 
  Layers, 
  HelpCircle,
  QrCode,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { Customer, Invoice } from '../types';

interface DemoAccount {
  id: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  customerMode?: string;
  badge: string;
  defaultPassword?: string;
  defaultPin?: string;
  hasRouter?: boolean;
  routerName?: string;
}

interface CustomerLoginProps {
  onLoginSuccess: (customer: Customer, invoices: Invoice[], stats: any, token: string) => void;
  onGoToAdminPortal?: () => void;
  businessName?: string;
  initialInvoiceNumber?: string;
  initialQuery?: string;
}

export const CustomerLogin: React.FC<CustomerLoginProps> = ({
  onLoginSuccess,
  onGoToAdminPortal,
  businessName = 'InvoiceKilat',
  initialInvoiceNumber = '',
  initialQuery = ''
}) => {
  // Login modes: 'account' (Perusahaan / WhatsApp / Email + Password/PIN) OR 'invoice' (No. Faktur + Kontak)
  const [loginMode, setLoginMode] = useState<'account' | 'invoice'>(
    initialInvoiceNumber ? 'invoice' : 'account'
  );

  // Account mode states
  const [identifier, setIdentifier] = useState(initialQuery || '');
  const [password, setPassword] = useState('client123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Invoice mode states
  const [invoiceNumber, setInvoiceNumber] = useState(initialInvoiceNumber || '');
  const [verificationContact, setVerificationContact] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [demoAccounts, setDemoAccounts] = useState<DemoAccount[]>([]);
  const [isLoadingDemo, setIsLoadingDemo] = useState(false);

  // Fetch demo accounts for quick pick
  useEffect(() => {
    setIsLoadingDemo(true);
    fetch('/api/portal/demo-accounts')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.accounts)) {
          setDemoAccounts(data.accounts);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoadingDemo(false));
  }, []);

  const handleAccountLogin = async (overrideIdentifier?: string, overridePass?: string) => {
    const activeId = (overrideIdentifier ?? identifier).trim();
    const activePass = (overridePass ?? password).trim();

    if (!activeId) {
      setErrorMessage('Silakan masukkan Nama Perusahaan, Nomor WhatsApp, atau Alamat Email Anda.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/portal/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: activeId,
          password: activePass || 'client123',
          rememberMe,
          loginMode: 'account',
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Login gagal. Periksa kembali identitas akun dan kata sandi Anda.');
      }

      // Store customer session
      if (rememberMe) {
        localStorage.setItem('customer_token', data.token);
        localStorage.setItem('customer_profile', JSON.stringify(data.customer));
      } else {
        sessionStorage.setItem('customer_token', data.token);
        sessionStorage.setItem('customer_profile', JSON.stringify(data.customer));
      }

      onLoginSuccess(data.customer, data.invoices || [], data.stats || null, data.token);
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal terhubung ke server autentikasi.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvoiceLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const inv = invoiceNumber.trim();
    if (!inv) {
      setErrorMessage('Silakan masukkan Nomor Faktur (contoh: INV-2026-001).');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/portal/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceNumber: inv,
          verificationContact: verificationContact.trim(),
          loginMode: 'invoice',
          rememberMe,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Faktur tidak ditemukan atau verifikasi kontak tidak sesuai.');
      }

      // Store customer session
      if (rememberMe) {
        localStorage.setItem('customer_token', data.token);
        localStorage.setItem('customer_profile', JSON.stringify(data.customer));
      } else {
        sessionStorage.setItem('customer_token', data.token);
        sessionStorage.setItem('customer_profile', JSON.stringify(data.customer));
      }

      onLoginSuccess(data.customer, data.invoices || [], data.stats || null, data.token);
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal memverifikasi faktur.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickSelect = (acc: DemoAccount) => {
    setIdentifier(acc.company || acc.name);
    setPassword(acc.defaultPassword || 'client123');
    setLoginMode('account');
    handleAccountLogin(acc.id || acc.company, acc.defaultPassword || 'client123');
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-10 px-4 sm:px-6">
      <div className="w-full max-w-xl space-y-6">
        {/* Brand & Security Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-sky-500 text-white shadow-lg shadow-blue-500/25 ring-4 ring-blue-50">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div className="pt-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-blue-100/80 border border-blue-200 text-blue-800 text-[11px] font-extrabold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              Portal Mandiri Pelanggan & NOC
            </span>
            <h1 className="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              Masuk Portal Pelanggan
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-md mx-auto">
              Akses tagihan resmi, pembayaran QRIS instan, dan pantau router MikroTik Anda secara mandiri di {businessName}
            </p>
          </div>
        </div>

        {/* Login Container */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/60 border border-slate-200/80 space-y-5">
          {/* Dual Login Mode Tabs */}
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-slate-100 border border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setLoginMode('account');
                setErrorMessage('');
              }}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl transition ${
                loginMode === 'account'
                  ? 'bg-white text-slate-900 shadow-xs font-extrabold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Building className="w-3.5 h-3.5 text-blue-600" />
              <span>Akun Pelanggan</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setLoginMode('invoice');
                setErrorMessage('');
              }}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl transition ${
                loginMode === 'invoice'
                  ? 'bg-white text-slate-900 shadow-xs font-extrabold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-indigo-600" />
              <span>Akses via No. Faktur</span>
            </button>
          </div>

          {/* Error Notice */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-800 text-xs animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="font-medium leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {/* ================= MODE 1: ACCOUNT LOGIN ================= */}
          {loginMode === 'account' && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAccountLogin();
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nama Perusahaan / No. WhatsApp / Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Contoh: PT Bintang Network / 081234567890"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition bg-slate-50/50 hover:bg-white font-medium"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Kata Sandi atau PIN Akses Portal
                  </label>
                  <span className="text-[11px] text-blue-600 font-semibold">
                    Default demo: client123
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan kata sandi atau PIN (opsional)"
                    className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition bg-slate-50/50 hover:bg-white font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span className="text-xs text-slate-600 font-medium">
                    Ingat sesi pelanggan (30 hari)
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.99] text-white font-bold text-sm shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Memverifikasi Akses Akun...</span>
                  </>
                ) : (
                  <>
                    <span>Masuk ke Portal Pelanggan</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* ================= MODE 2: INVOICE LOOKUP ================= */}
          {loginMode === 'invoice' && (
            <form onSubmit={handleInvoiceLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nomor Faktur / Invoice
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <FileText className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value.toUpperCase())}
                    placeholder="Contoh: INV-2026-001"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition bg-slate-50/50 hover:bg-white font-mono font-bold tracking-wide uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Verifikasi Kontak (Opsional untuk keamanan tambahan)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={verificationContact}
                    onChange={(e) => setVerificationContact(e.target.value)}
                    placeholder="Nomor WhatsApp atau Email pada faktur..."
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition bg-slate-50/50 hover:bg-white font-medium"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <span className="text-xs text-slate-600 font-medium">
                    Ingat sesi pelanggan di perangkat ini
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 active:scale-[0.99] text-white font-bold text-sm shadow-md shadow-indigo-500/25 flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Memuat Faktur & Pembayaran...</span>
                  </>
                ) : (
                  <>
                    <span>Buka Faktur & Bayar QRIS</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Quick Demo Accounts Selection */}
          <div className="pt-3 border-t border-slate-100 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                Pilih Akun Cepat (Akses 1-Klik):
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Tanpa Ketik Manual</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {demoAccounts.slice(0, 4).map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => handleQuickSelect(acc)}
                  className="p-2.5 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:bg-blue-50/60 hover:border-blue-300 text-left transition group flex items-start justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 group-hover:text-blue-700 truncate">
                      {acc.company || acc.name}
                    </p>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                      {acc.customerMode === 'noc' ? (
                        <span className="inline-flex items-center gap-1 text-blue-700 font-bold">
                          <Server className="w-2.5 h-2.5" />
                          MikroTik CCR
                        </span>
                      ) : (
                        <span>{acc.phone || acc.email}</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 shrink-0 mt-1 transition" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center text-xs">
          {onGoToAdminPortal && (
            <button
              onClick={onGoToAdminPortal}
              className="inline-flex items-center gap-2 font-semibold text-slate-600 hover:text-blue-700 bg-white/90 hover:bg-white px-4 py-2 rounded-full border border-slate-200 shadow-2xs transition active:scale-95 mx-auto"
            >
              <Lock className="w-3.5 h-3.5 text-blue-600" />
              <span>Pengelola Usaha? <strong>Masuk ke Portal Admin</strong></span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </button>
          )}

          <div className="text-[11px] text-slate-400 flex items-center justify-center gap-2 mx-auto">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Enkripsi TLS 256-bit • Portal Mandiri Aman</span>
          </div>
        </div>
      </div>
    </div>
  );
};
