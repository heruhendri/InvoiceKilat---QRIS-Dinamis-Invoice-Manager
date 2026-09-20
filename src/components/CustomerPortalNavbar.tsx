import React from 'react';
import { QrCode, ShieldCheck, ArrowRight, Lock } from 'lucide-react';
import { BusinessSettings } from '../types';

interface CustomerPortalNavbarProps {
  settings?: BusinessSettings | null;
  businessName?: string;
  onSwitchToAdmin: () => void;
}

export const CustomerPortalNavbar: React.FC<CustomerPortalNavbarProps> = ({
  settings,
  businessName,
  onSwitchToAdmin,
}) => {
  const displayTitle = settings?.appName || businessName || settings?.businessName || 'InvoiceKilat';
  const logoUrl = settings?.appLogoUrl || settings?.companyLogoUrl;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md shadow-2xs">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-3 sm:px-6 lg:px-8">
        {/* Brand & Customer Portal Tag */}
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-slate-200 overflow-hidden shadow-xs p-1">
              <img src={logoUrl} alt={displayTitle} className="max-h-full max-w-full object-contain" />
            </div>
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-700 text-white shadow-md shadow-emerald-600/20">
              <QrCode className="h-5 w-5" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-slate-900">
                {displayTitle}
              </span>
              <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider border border-emerald-200">
                Portal Pelanggan
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
              {settings?.businessName ? `Layanan Resmi ${settings.businessName}` : 'Pengecekan Tagihan & Pembayaran QRIS Resmi Terverifikasi'}
            </p>
          </div>
        </div>

        {/* Right Switcher / Admin Login Link */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-[11px] text-slate-600 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Koneksi Aman SSL</span>
          </div>

          <button
            id="switch-to-admin-portal-btn"
            onClick={onSwitchToAdmin}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 shadow-2xs transition active:scale-95"
            title="Masuk ke Dashboard Pengelola / Pemilik Usaha"
          >
            <Lock className="w-3.5 h-3.5 text-blue-600" />
            <span>Portal Admin</span>
            <ArrowRight className="w-3 h-3 text-slate-400 hidden sm:inline" />
          </button>
        </div>
      </div>
    </header>
  );
};
