import React from 'react';
import { QrCode, ShieldCheck, ArrowRight, Lock, Sun, Moon } from 'lucide-react';
import { BusinessSettings } from '../types';
import { useTheme } from '../utils/theme';

interface CustomerPortalNavbarProps {
  settings?: BusinessSettings | null;
  businessName?: string;
  onSwitchToAdmin: () => void;
  isDark?: boolean;
  onToggleTheme?: () => void;
}

export const CustomerPortalNavbar: React.FC<CustomerPortalNavbarProps> = ({
  settings,
  businessName,
  onSwitchToAdmin,
  isDark: propIsDark,
  onToggleTheme,
}) => {
  const themeHook = useTheme();
  const isDark = propIsDark !== undefined ? propIsDark : themeHook.isDark;
  const toggleTheme = onToggleTheme || themeHook.toggleTheme;
  const displayTitle = settings?.appName || businessName || settings?.businessName || 'InvoiceKilat';
  const logoUrl = settings?.appLogoUrl || settings?.companyLogoUrl;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md shadow-2xs transition-colors duration-200">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-3 sm:px-6 lg:px-8">
        {/* Brand & Customer Portal Tag */}
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs p-1">
              <img src={logoUrl} alt={displayTitle} className="max-h-full max-w-full object-contain" />
            </div>
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-700 text-white shadow-md shadow-emerald-600/20">
              <QrCode className="h-5 w-5" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
                {displayTitle}
              </span>
              <span className="rounded-md bg-emerald-100 dark:bg-emerald-950/70 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider border border-emerald-200 dark:border-emerald-800/60">
                Portal Pelanggan
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium hidden sm:block">
              {settings?.businessName ? `Layanan Resmi ${settings.businessName}` : 'Pengecekan Tagihan & Pembayaran QRIS Resmi Terverifikasi'}
            </p>
          </div>
        </div>

        {/* Right Switcher / Admin Login Link */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-900 text-[11px] text-slate-600 dark:text-slate-300 font-medium border border-transparent dark:border-slate-800">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Koneksi Aman SSL</span>
          </div>

          {/* Theme Toggle Button */}
          <button
            id="portal-theme-toggle-btn"
            onClick={toggleTheme}
            className="p-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition active:scale-95 shadow-2xs"
            title={isDark ? "Ganti ke Mode Terang (Light Mode)" : "Ganti ke Mode Gelap (Dark Mode)"}
            aria-label="Toggle Theme"
          >
            {isDark ? (
              <Sun className="h-4 w-4 text-amber-400 animate-in spin-in-90 duration-300" />
            ) : (
              <Moon className="h-4 w-4 text-slate-700 dark:text-slate-300 animate-in spin-in-90 duration-300" />
            )}
          </button>

          <button
            id="switch-to-admin-portal-btn"
            onClick={onSwitchToAdmin}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white shadow-2xs transition active:scale-95"
            title="Masuk ke Dashboard Pengelola / Pemilik Usaha"
          >
            <Lock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Portal Admin</span>
            <ArrowRight className="w-3 h-3 text-slate-400 hidden sm:inline" />
          </button>
        </div>
      </div>
    </header>
  );
};
