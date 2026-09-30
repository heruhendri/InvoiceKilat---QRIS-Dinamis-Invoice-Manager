import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  LayoutDashboard, 
  QrCode, 
  Settings, 
  TableProperties, 
  Plus, 
  Bell, 
  CheckCircle2, 
  Radio, 
  RefreshCw,
  Clock,
  Users,
  Package,
  Zap,
  Globe,
  ExternalLink,
  LogOut,
  User,
  ChevronDown,
  ShieldCheck,
  Sparkles,
  Cpu,
  BellOff,
  Volume2,
  VolumeX,
  X,
  Github,
  Sun,
  Moon,
  Layers,
  Network
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { RealtimeEvent, AdminUser, BusinessSettings } from '../types';
import { formatDateTimeIndo } from '../utils/formatters';
import { useTheme } from '../utils/theme';

export type AppNavTab = 'dashboard' | 'invoices' | 'customers' | 'routers' | 'mikhmon' | 'services' | 'automation' | 'qris' | 'spreadsheet' | 'portal';

interface NavbarProps {

  settings?: BusinessSettings | null;
  currentTab: AppNavTab;
  onSelectTab: (tab: AppNavTab) => void;
  onOpenCreateInvoice: () => void;
  onOpenSettings: (initialTab?: 'app' | 'company' | 'template' | 'qris' | 'backup' | 'notification') => void;
  isConnected: boolean;
  notifications: RealtimeEvent[];
  unreadCount: number;
  onClearUnread: () => void;
  onSelectInvoice: (id: string) => void;
  onTriggerSync: () => void;
  isSyncing: boolean;
  adminUser?: AdminUser | null;
  onLogout?: () => void;
  onOpenGallery?: () => void;
  onOpenAppUpdate?: () => void;
  isDark?: boolean;
  onToggleTheme?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  settings,
  currentTab,
  onSelectTab,
  onOpenCreateInvoice,
  onOpenSettings,
  isConnected,
  notifications,
  unreadCount,
  onClearUnread,
  onSelectInvoice,
  onTriggerSync,
  isSyncing,
  adminUser,
  onLogout,
  onOpenGallery,
  onOpenAppUpdate,
  isDark: propIsDark,
  onToggleTheme,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showServicesMenu, setShowServicesMenu] = useState(false);
  const [showMobileServicesSheet, setShowMobileServicesSheet] = useState(false);

  // Dark Mode Theme Management
  const themeHook = useTheme();
  const isDark = propIsDark !== undefined ? propIsDark : themeHook.isDark;
  const toggleDarkMode = onToggleTheme || themeHook.toggleTheme;

  const isServiceTabActive = ['routers', 'mikhmon', 'services', 'automation', 'portal', 'spreadsheet', 'qris'].includes(currentTab);

  const getActiveServiceInfo = () => {
    switch (currentTab) {
      case 'routers':
        return { label: 'Router NOC', icon: Cpu, badge: 'NOC' };
      case 'mikhmon':
        return { label: 'Mikhmon', icon: Radio, badge: 'Billing' };
      case 'services':
        return { label: 'Daftar Jasa', icon: Package, badge: 'Paket' };
      case 'automation':
        return { label: 'Otomasi', icon: Zap, badge: 'Auto' };
      case 'portal':
        return { label: 'Portal', icon: Globe, badge: 'Publik' };
      case 'spreadsheet':
        return { label: 'Google Sheets', icon: TableProperties, badge: 'Sync' };
      case 'qris':
        return { label: 'QRIS Dinamis', icon: QrCode, badge: 'QRIS' };
      default:
        return { label: 'Layanan & NOC', icon: Layers, badge: null };
    }
  };

  // User notification preferences (stored locally so user doesn't get disturbed)
  const [toastsMuted, setToastsMuted] = useState<boolean>(() => {
    try {
      return localStorage.getItem('notification_toasts_muted') === 'true';
    } catch {
      return false;
    }
  });

  const [soundMuted, setSoundMuted] = useState<boolean>(() => {
    try {
      return localStorage.getItem('notification_sound_muted') === 'true';
    } catch {
      return false;
    }
  });

  const toggleMuteToasts = () => {
    const nextVal = !toastsMuted;
    setToastsMuted(nextVal);
    try {
      localStorage.setItem('notification_toasts_muted', String(nextVal));
    } catch {}
  };

  const toggleMuteSound = () => {
    const nextVal = !soundMuted;
    setSoundMuted(nextVal);
    try {
      localStorage.setItem('notification_sound_muted', String(nextVal));
    } catch {}
  };

  const appName = settings?.appName || 'InvoiceKilat';
  const logoUrl = settings?.appLogoUrl || settings?.companyLogoUrl;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md transition-colors duration-200">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-2.5 sm:px-6 lg:px-8">
        {/* Brand & Real-time status */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div 
            onClick={() => onSelectTab('dashboard')} 
            className="flex items-center gap-2 sm:gap-2.5 cursor-pointer group min-w-0"
          >
            {logoUrl ? (
              <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs group-hover:scale-105 transition-transform p-1 shrink-0">
                <img src={logoUrl} alt={appName} className="max-h-full max-w-full object-contain" />
              </div>
            ) : (
              <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform shrink-0">
                <QrCode className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1 sm:gap-1.5">
                <span className="font-extrabold text-sm sm:text-base tracking-tight text-slate-900 dark:text-white truncate max-w-[105px] xs:max-w-[145px] sm:max-w-none">
                  {appName}
                </span>
                <span className="rounded-md bg-slate-900 dark:bg-blue-600 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold text-white uppercase tracking-wider shrink-0">
                  Admin
                </span>
              </div>
              <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                <span className={`inline-block h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full shrink-0 ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                <span className="hidden xs:inline truncate">{isConnected ? 'Online' : 'Menghubungkan...'}</span>
              </div>
            </div>
          </div>

          {/* Desktop Navigation Tabs - Combined & Futuristic */}
          <nav className="hidden lg:flex items-center gap-1.5 ml-4 border-l border-slate-200 dark:border-slate-800 pl-4">
            <button
              id="tab-dashboard-btn"
              onClick={() => onSelectTab('dashboard')}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition active:scale-95 ${
                currentTab === 'dashboard'
                  ? 'bg-blue-600 text-white shadow-xs shadow-blue-500/30'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              <span>Dashboard</span>
            </button>

            <button
              id="tab-invoices-btn"
              onClick={() => onSelectTab('invoices')}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition active:scale-95 ${
                currentTab === 'invoices'
                  ? 'bg-blue-600 text-white shadow-xs shadow-blue-500/30'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Invoice</span>
            </button>

            <button
              id="tab-customers-btn"
              onClick={() => onSelectTab('customers')}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition active:scale-95 ${
                currentTab === 'customers'
                  ? 'bg-blue-600 text-white shadow-xs shadow-blue-500/30'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>Pelanggan</span>
            </button>

            {/* Combined Mega-Dropdown for Network & Services */}
            <div className="relative">
              <button
                id="tab-services-group-btn"
                onClick={() => setShowServicesMenu(!showServicesMenu)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition active:scale-95 ${
                  isServiceTabActive
                    ? 'bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-600 text-white shadow-xs shadow-indigo-500/30'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Layanan Jaringan, Router NOC, Mikhmon, Jasa, Otomasi & Portal"
              >
                {(() => {
                  const activeInfo = getActiveServiceInfo();
                  const ActiveIcon = isServiceTabActive ? activeInfo.icon : Layers;
                  return (
                    <>
                      <ActiveIcon className="h-3.5 w-3.5" />
                      <span>{isServiceTabActive ? activeInfo.label : 'Layanan & NOC'}</span>
                      {activeInfo.badge && (
                        <span className="px-1.5 py-0.2 text-[9px] font-mono rounded bg-white/20 text-white font-bold">
                          {activeInfo.badge}
                        </span>
                      )}
                      <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${showServicesMenu ? 'rotate-180' : ''}`} />
                    </>
                  );
                })()}
              </button>

              {showServicesMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowServicesMenu(false)} />
                  <div className="absolute left-0 mt-2 w-80 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200/90 dark:border-slate-800 p-2.5 z-50 animate-in fade-in zoom-in-95 backdrop-blur-xl max-h-[85vh] overflow-y-auto">
                    <div className="px-2.5 py-1.5 mb-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        Ekosistem Jaringan & Layanan
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-200/50 dark:border-indigo-800/50">
                        NOC Suite
                      </span>
                    </div>

                    <div className="space-y-1">
                      {/* Router NOC */}
                      <button
                        onClick={() => {
                          setShowServicesMenu(false);
                          onSelectTab('routers');
                        }}
                        className={`w-full text-left p-2 rounded-xl flex items-center gap-3 transition ${
                          currentTab === 'routers'
                            ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-bold'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 shrink-0">
                          <Cpu className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold truncate">Router NOC MikroTik</span>
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold">NOC</span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">Monitoring MikroTik, Traffic & Hotspot</p>
                        </div>
                      </button>

                      {/* Mikhmon Online */}
                      <button
                        onClick={() => {
                          setShowServicesMenu(false);
                          onSelectTab('mikhmon');
                        }}
                        className={`w-full text-left p-2 rounded-xl flex items-center gap-3 transition ${
                          currentTab === 'mikhmon'
                            ? 'bg-orange-50 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300 font-bold'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400 shrink-0">
                          <Radio className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold truncate">Mikhmon Online</span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-orange-100 dark:bg-orange-900/60 text-orange-700 dark:text-orange-300 font-bold">Billing</span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">Hotspot & Cetak Voucher Kilat</p>
                        </div>
                      </button>

                      {/* Daftar Jasa & Paket */}
                      <button
                        onClick={() => {
                          setShowServicesMenu(false);
                          onSelectTab('services');
                        }}
                        className={`w-full text-left p-2 rounded-xl flex items-center gap-3 transition ${
                          currentTab === 'services'
                            ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-bold'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 shrink-0">
                          <Package className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold truncate">Daftar Jasa & Paket</span>
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold">Katalog</span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">Katalog Layanan & Internet</p>
                        </div>
                      </button>

                      {/* Otomasi Tagihan */}
                      <button
                        onClick={() => {
                          setShowServicesMenu(false);
                          onSelectTab('automation');
                        }}
                        className={`w-full text-left p-2 rounded-xl flex items-center gap-3 transition ${
                          currentTab === 'automation'
                            ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 font-bold'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 shrink-0">
                          <Zap className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold truncate">Otomasi Tagihan</span>
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold">Engine</span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">Pengingat WhatsApp & Cron Logs</p>
                        </div>
                      </button>

                      {/* Generator QRIS Dinamis */}
                      <button
                        onClick={() => {
                          setShowServicesMenu(false);
                          onSelectTab('qris');
                        }}
                        className={`w-full text-left p-2 rounded-xl flex items-center gap-3 transition ${
                          currentTab === 'qris'
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-bold'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 shrink-0">
                          <QrCode className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold truncate">Generator QRIS Dinamis</span>
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">QRIS</span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">Konversi QRIS Statis ke Dinamis</p>
                        </div>
                      </button>

                      {/* Google Sheets Sync */}
                      <button
                        onClick={() => {
                          setShowServicesMenu(false);
                          onSelectTab('spreadsheet');
                        }}
                        className={`w-full text-left p-2 rounded-xl flex items-center gap-3 transition ${
                          currentTab === 'spreadsheet'
                            ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 font-bold'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="p-2 rounded-lg bg-teal-100 dark:bg-teal-900/50 text-teal-600 dark:text-teal-400 shrink-0">
                          <TableProperties className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold truncate">Google Sheets Sync</span>
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-bold">Sync</span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">Tabel & Sinkronisasi Spreadsheet</p>
                        </div>
                      </button>

                      {/* Portal Pelanggan */}
                      <button
                        onClick={() => {
                          setShowServicesMenu(false);
                          onSelectTab('portal');
                        }}
                        className={`w-full text-left p-2 rounded-xl flex items-center gap-3 transition ${
                          currentTab === 'portal'
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-bold'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 shrink-0">
                          <Globe className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold truncate">Portal Pelanggan</span>
                            <ExternalLink className="w-3 h-3 text-emerald-500" />
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">Halaman Cek Tagihan Publik</p>
                        </div>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </nav>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* PWA Install Button */}
          <PWAInstallButton />

          {/* Dark Mode Toggle Button */}
          <button
            id="theme-toggle-btn"
            onClick={toggleDarkMode}
            className="relative p-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/80 text-slate-700 dark:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition active:scale-95 shadow-2xs shrink-0"
            title={isDark ? "Beralih ke Mode Terang (Light Mode)" : "Beralih ke Mode Gelap (Dark Mode)"}
            aria-label="Ganti Tema"
          >
            {isDark ? (
              <Sun className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-amber-400 animate-in spin-in-90 duration-300" />
            ) : (
              <Moon className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-slate-700 dark:text-slate-300 animate-in spin-in-90 duration-300" />
            )}
          </button>

          {/* Quick Sync Button */}
          <button
            id="sync-btn"
            onClick={onTriggerSync}
            disabled={isSyncing}
            className="hidden sm:flex items-center gap-1.5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-2xs active:scale-95"
            title={isSyncing ? "Sedang menyinkronkan data invoice dengan Google Sheets..." : "Sinkronkan data dengan Google Sheets"}
            aria-label="Sinkronkan Google Sheets"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-blue-600 dark:text-blue-400 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Menyinkronkan...' : 'Sync Sheets'}</span>
          </button>

          {/* GitHub App Update Button */}
          {onOpenAppUpdate && (
            <button
              id="app-github-update-btn"
              onClick={onOpenAppUpdate}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition shadow-2xs"
              title="Update Aplikasi dari GitHub"
            >
              <Github className="h-3.5 w-3.5 text-slate-900 dark:text-white" />
              <span className="hidden xl:inline">Update dari GitHub</span>
              <span className="inline xl:hidden">Update</span>
            </button>
          )}

          {/* Notification Bell Dropdown */}
          <div className="relative">
            <button
              id="notifications-bell-btn"
              onClick={() => {
                setShowNotifications(!showNotifications);
                if (!showNotifications) onClearUnread();
              }}
              className="relative p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
              aria-label="Lihat Notifikasi"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white ring-2 ring-white animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <>
                {/* Backdrop for mobile & outside click dismiss */}
                <div
                  className="fixed inset-0 z-40 bg-slate-900/20 sm:bg-transparent"
                  onClick={() => setShowNotifications(false)}
                />

                <div className="fixed inset-x-2.5 top-16 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 w-auto sm:w-96 max-w-sm sm:max-w-none mx-auto sm:mx-0 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-100 dark:border-slate-800 p-3.5 sm:p-4 z-50 animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 min-w-0">
                      <Radio className="w-4 h-4 text-emerald-500 animate-pulse shrink-0" />
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider truncate">
                        Notifikasi Real-Time
                      </h4>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] text-slate-400 font-medium">
                        {notifications.length} riwayat
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowNotifications(false)}
                        className="sm:hidden p-1 -mr-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Tutup"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Notification Controls: Mute floating popups and Mute chime sound */}
                  <div className="py-2 px-2.5 my-2.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2 text-xs">
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 shrink-0">Kendali:</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Toggle Popup Toast */}
                      <button
                        type="button"
                        onClick={toggleMuteToasts}
                        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition shadow-2xs ${
                          toastsMuted
                            ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60'
                            : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                        }`}
                        title={toastsMuted ? 'Popup diheningkan (tidak mengganggu)' : 'Popup aktif'}
                      >
                        {toastsMuted ? <BellOff className="w-3 h-3" /> : <Bell className="w-3 h-3" />}
                        <span>{toastsMuted ? 'Popup Hening' : 'Popup Aktif'}</span>
                      </button>

                      {/* Toggle Sound */}
                      <button
                        type="button"
                        onClick={toggleMuteSound}
                        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition shadow-2xs ${
                          soundMuted
                            ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                            : 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300'
                        }`}
                        title={soundMuted ? 'Suara senyap' : 'Suara aktif'}
                      >
                        {soundMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                        <span>{soundMuted ? 'Senyap' : 'Suara'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="mt-2 max-h-64 sm:max-h-72 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-400">
                        Belum ada notifikasi pembayaran masuk
                      </div>
                    ) : (
                      notifications.map((notif, idx) => (
                        <div
                          key={idx}
                          onClick={() => {
                            if (notif.invoiceId) {
                              onSelectInvoice(notif.invoiceId);
                              setShowNotifications(false);
                            }
                          }}
                          className="py-2.5 px-1 hover:bg-slate-50 transition cursor-pointer rounded-lg"
                        >
                          <div className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-slate-900 leading-snug">
                                {notif.message}
                              </p>
                              <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-400">
                                <Clock className="w-3 h-3 shrink-0" />
                                <span>{formatDateTimeIndo(notif.timestamp)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>


          {/* Quick Switch to Customer Portal */}
          <button
            id="nav-open-customer-portal-btn"
            onClick={() => onSelectTab('portal')}
            className="hidden xl:flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/80 px-2.5 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition"
            title="Buka Portal Mandiri Pelanggan (Tampilan Klien)"
          >
            <ExternalLink className="h-3.5 w-3.5 text-emerald-600" />
            <span>Portal Pelanggan</span>
          </button>

          {/* Settings Button */}
          <button
            id="settings-modal-btn"
            onClick={() => onOpenSettings('app')}
            className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
            title="Pengaturan Profil Bisnis & QRIS"
            aria-label="Pengaturan"
          >
            <Settings className="h-5 w-5" />
          </button>

          {/* Admin User Profile Dropdown */}
          {adminUser && (
            <div className="relative">
              <button
                id="admin-user-menu-btn"
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2 pl-2 pr-2.5 py-1 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50/80 hover:bg-slate-100 transition text-left"
                title="Akun Pengelola"
              >
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                  {adminUser.avatarUrl ? (
                    <img src={adminUser.avatarUrl} alt={adminUser.name} className="w-full h-full rounded-lg object-cover" />
                  ) : (
                    <span>{adminUser.name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="hidden md:block">
                  <div className="text-xs font-bold text-slate-800 leading-none truncate max-w-[110px]">
                    {adminUser.name}
                  </div>
                  <div className="text-[10px] text-blue-600 font-semibold leading-none mt-1 flex items-center gap-1">
                    <ShieldCheck className="w-2.5 h-2.5" />
                    <span>Admin</span>
                  </div>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showUserDropdown ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {showUserDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-40 bg-slate-900/10 sm:bg-transparent"
                    onClick={() => setShowUserDropdown(false)}
                  />
                  <div className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-1.5rem)] rounded-2xl bg-white dark:bg-slate-900 p-2 shadow-2xl border border-slate-200/90 dark:border-slate-800 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-3 py-2.5 border-b border-slate-100 dark:border-slate-800">
                    <div className="text-xs font-bold text-slate-900 dark:text-white">{adminUser.name}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{adminUser.email}</div>
                    <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[10px] font-bold uppercase tracking-wider border border-blue-100 dark:border-blue-900/50">
                      <ShieldCheck className="w-3 h-3" />
                      <span>{adminUser.role === 'superadmin' ? 'Super Administrator' : 'Staff Keuangan'}</span>
                    </div>
                  </div>

                  <div className="py-1 space-y-0.5">
                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        onOpenSettings('app');
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl flex items-center gap-2 transition"
                    >
                      <Settings className="w-4 h-4 text-slate-400" />
                      <span>Pengaturan Bisnis & Akun</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        onOpenSettings('backup');
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-medium text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/50 rounded-xl flex items-center gap-2 transition"
                    >
                      <TableProperties className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                      <span>Google Sheets & Backup Data</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        onSelectTab('mikhmon');
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-medium text-orange-700 dark:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-950/50 rounded-xl flex items-center gap-2 transition"
                    >
                      <Radio className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                      <span>Billing Mikhmon Online</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        onSelectTab('portal');
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-xl flex items-center gap-2 transition"
                    >
                      <Globe className="w-4 h-4 text-emerald-500" />
                      <span>Lihat Portal Pelanggan</span>
                    </button>

                    {onOpenGallery && (
                      <button
                        onClick={() => {
                          setShowUserDropdown(false);
                          onOpenGallery();
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-xl flex items-center gap-2 transition"
                      >
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <span>Galeri Screenshot Fitur</span>
                      </button>
                    )}

                    {onOpenAppUpdate && (
                      <button
                        onClick={() => {
                          setShowUserDropdown(false);
                          onOpenAppUpdate();
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl flex items-center justify-between transition"
                      >
                        <div className="flex items-center gap-2">
                          <Github className="w-4 h-4 text-slate-900 dark:text-white" />
                          <span>Update Aplikasi (GitHub)</span>
                        </div>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold border border-blue-100 dark:border-blue-900/50">
                          {settings?.appVersion || 'v3.2.0'}
                        </span>
                      </button>
                    )}
                  </div>

                  {onLogout && (
                    <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                      <button
                        id="admin-logout-btn"
                        onClick={() => {
                          setShowUserDropdown(false);
                          setShowLogoutConfirm(true);
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl flex items-center gap-2 transition"
                      >
                        <LogOut className="w-4 h-4 text-rose-500" />
                        <span>Keluar (Logout)</span>
                      </button>
                    </div>
                  )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* New Invoice CTA Button - Responsive and Mobile-Friendly */}
          <button
            id="create-invoice-nav-btn"
            onClick={onOpenCreateInvoice}
            className="flex items-center gap-1 sm:gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-xs font-bold text-white shadow-xs sm:shadow-md shadow-blue-500/25 transition active:scale-95 shrink-0"
            title="Buat Invoice Baru"
          >
            <Plus className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Buat Invoice</span>
            <span className="sm:hidden font-bold">Invoice</span>
          </button>
        </div>
      </div>

      {/* Mobile & Tablet Sub-Navigation Bar - Combined & Futuristic Dock */}
      <div className="lg:hidden flex items-center gap-1.5 sm:gap-2 border-t border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md px-2.5 sm:px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 overflow-x-auto no-scrollbar shadow-xs">
        {/* Core Tabs */}
        <button
          onClick={() => onSelectTab('dashboard')}
          className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl shrink-0 whitespace-nowrap text-xs font-bold transition active:scale-95 ${
            currentTab === 'dashboard'
              ? 'text-white bg-blue-600 shadow-2xs shadow-blue-500/30'
              : 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          <LayoutDashboard className="h-3.5 w-3.5" />
          <span>Dashboard</span>
        </button>

        <button
          onClick={() => onSelectTab('invoices')}
          className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl shrink-0 whitespace-nowrap text-xs font-bold transition active:scale-95 ${
            currentTab === 'invoices'
              ? 'text-white bg-blue-600 shadow-2xs shadow-blue-500/30'
              : 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          <FileText className="h-3.5 w-3.5" />
          <span>Invoice</span>
        </button>

        <button
          onClick={() => onSelectTab('customers')}
          className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl shrink-0 whitespace-nowrap text-xs font-bold transition active:scale-95 ${
            currentTab === 'customers'
              ? 'text-white bg-blue-600 shadow-2xs shadow-blue-500/30'
              : 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          <span>Pelanggan</span>
        </button>

        {/* Combined Services & NOC Button */}
        {(() => {
          const activeInfo = getActiveServiceInfo();
          const ActiveMobileIcon = isServiceTabActive ? activeInfo.icon : Layers;
          return (
            <button
              id="mobile-nav-services-menu-btn"
              onClick={() => setShowMobileServicesSheet(true)}
              className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl shrink-0 whitespace-nowrap text-xs font-bold transition active:scale-95 border ${
                isServiceTabActive
                  ? 'text-white bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-600 border-indigo-500 shadow-xs shadow-indigo-500/30'
                  : 'text-indigo-600 dark:text-indigo-400 bg-indigo-50/90 dark:bg-indigo-950/70 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 border-indigo-200/60 dark:border-indigo-800/60 shadow-2xs'
              }`}
              title="Buka menu lengkap Layanan, NOC MikroTik, Mikhmon & Integrasi"
              aria-label="Menu Layanan dan NOC"
            >
              <ActiveMobileIcon className="h-3.5 w-3.5 shrink-0" />
              <span>{isServiceTabActive ? activeInfo.label : 'Layanan & NOC'}</span>
              {isServiceTabActive && activeInfo.badge && (
                <span className="px-1.5 py-0.2 text-[9px] font-mono rounded bg-white/20 text-white font-bold leading-none">
                  {activeInfo.badge}
                </span>
              )}
              <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${showMobileServicesSheet ? 'rotate-180' : ''}`} />
            </button>
          );
        })()}

        {/* Quick Dark Mode Pill for Mobile */}
        <button
          onClick={toggleDarkMode}
          className="flex items-center gap-1.5 py-1.5 px-2.5 rounded-xl shrink-0 whitespace-nowrap text-xs font-bold text-slate-700 dark:text-amber-400 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 transition active:scale-95 border border-slate-200/50 dark:border-slate-800"
          title="Ganti Mode Tampilan"
        >
          {isDark ? <Sun className="h-3.5 w-3.5 text-amber-400" /> : <Moon className="h-3.5 w-3.5 text-slate-700 dark:text-slate-300" />}
          <span>{isDark ? 'Light' : 'Dark'}</span>
        </button>

        {/* Quick Sync Button */}
        <button
          onClick={onTriggerSync}
          disabled={isSyncing}
          className="flex items-center gap-1.5 py-1.5 px-2.5 rounded-xl shrink-0 whitespace-nowrap text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          title={isSyncing ? "Sedang menyinkronkan data..." : "Sinkronkan Google Sheets"}
          aria-label="Sinkronkan Google Sheets"
        >
          <RefreshCw className={`h-3.5 w-3.5 text-blue-600 dark:text-blue-400 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Syncing...' : 'Sync'}</span>
        </button>

        {onOpenAppUpdate && (
          <button
            onClick={onOpenAppUpdate}
            className="flex items-center gap-1.5 py-1.5 px-2.5 rounded-xl shrink-0 whitespace-nowrap text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 transition active:scale-95"
            title="Update Aplikasi dari GitHub"
          >
            <Github className="h-3.5 w-3.5 text-slate-900 dark:text-white" />
            <span>Update</span>
          </button>
        )}

        {onLogout && (
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="flex items-center gap-1.5 py-1.5 px-2.5 rounded-xl shrink-0 whitespace-nowrap text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition active:scale-95"
            title="Keluar Admin"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Logout</span>
          </button>
        )}
      </div>

      {/* Mobile Services & NOC Bottom Sheet Modal */}
      {showMobileServicesSheet && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
          <div 
            className="fixed inset-0" 
            onClick={() => setShowMobileServicesSheet(false)} 
          />
          <div className="relative w-full max-w-lg rounded-t-3xl sm:rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-2xl border border-slate-200 dark:border-slate-800 z-10 animate-in slide-in-from-bottom duration-200 max-h-[88vh] flex flex-col">
            {/* Grab handle for bottom sheet on mobile */}
            <div className="w-12 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-3 shrink-0 sm:hidden" />

            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-xs">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white leading-tight">
                    Ekosistem Jaringan & Layanan
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Akses cepat modul sistem, billing & integrasi
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowMobileServicesSheet(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                aria-label="Tutup Menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="overflow-y-auto pr-1 space-y-3.5 flex-1 overscroll-contain">
              {/* Group 1: Jaringan & Billing Hotspot */}
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1 mb-1.5 flex items-center justify-between">
                  <span>Infrastruktur ISP & Router</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-200/50 dark:border-indigo-800/50">
                    NOC Suite
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-1.5">
                  {/* Router NOC */}
                  <button
                    onClick={() => {
                      setShowMobileServicesSheet(false);
                      onSelectTab('routers');
                    }}
                    className={`w-full text-left p-2.5 rounded-xl flex items-center gap-3 transition ${
                      currentTab === 'routers'
                        ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800/60'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 border border-transparent'
                    }`}
                  >
                    <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 shrink-0">
                      <Cpu className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">Router NOC MikroTik</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-100/70 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-semibold">MikroTik</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Monitoring MikroTik, Traffic & Hotspot Aktif</p>
                    </div>
                  </button>

                  {/* Mikhmon Online */}
                  <button
                    onClick={() => {
                      setShowMobileServicesSheet(false);
                      onSelectTab('mikhmon');
                    }}
                    className={`w-full text-left p-2.5 rounded-xl flex items-center gap-3 transition ${
                      currentTab === 'mikhmon'
                        ? 'bg-orange-50 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300 font-bold border border-orange-200 dark:border-orange-800/60'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 border border-transparent'
                    }`}
                  >
                    <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400 shrink-0">
                      <Radio className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">Mikhmon Online</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-orange-100/70 dark:bg-orange-950 text-orange-700 dark:text-orange-300 font-bold">Billing</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Manajemen Hotspot, Voucher & Webserver</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Group 2: Katalog Jasa, Otomasi & QRIS */}
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1 mb-1.5 flex items-center justify-between">
                  <span>Finansial & Penagihan</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 font-bold border border-blue-200/50 dark:border-blue-800/50">
                    Billing Hub
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-1.5">
                  {/* Daftar Jasa & Paket */}
                  <button
                    onClick={() => {
                      setShowMobileServicesSheet(false);
                      onSelectTab('services');
                    }}
                    className={`w-full text-left p-2.5 rounded-xl flex items-center gap-3 transition ${
                      currentTab === 'services'
                        ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800/60'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 border border-transparent'
                    }`}
                  >
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 shrink-0">
                      <Package className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">Daftar Jasa & Paket</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-100/70 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-semibold">Katalog</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Katalog Layanan Internet & Recurring Add-on</p>
                    </div>
                  </button>

                  {/* Otomasi Tagihan */}
                  <button
                    onClick={() => {
                      setShowMobileServicesSheet(false);
                      onSelectTab('automation');
                    }}
                    className={`w-full text-left p-2.5 rounded-xl flex items-center gap-3 transition ${
                      currentTab === 'automation'
                        ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-800/60'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 border border-transparent'
                    }`}
                  >
                    <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 shrink-0">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">Otomasi Tagihan</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-100/70 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold">Engine</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Pengingat WhatsApp Otomatis & Cron Runner</p>
                    </div>
                  </button>

                  {/* Generator QRIS Dinamis */}
                  <button
                    onClick={() => {
                      setShowMobileServicesSheet(false);
                      onSelectTab('qris');
                    }}
                    className={`w-full text-left p-2.5 rounded-xl flex items-center gap-3 transition ${
                      currentTab === 'qris'
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800/60'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 border border-transparent'
                    }`}
                  >
                    <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 shrink-0">
                      <QrCode className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">Generator QRIS Dinamis</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-100/70 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">DANA QRIS</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Konversi QRIS Statis ke Dinamis + Tes Nominal</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Group 3: Sinkronisasi & Integrasi */}
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1 mb-1.5 flex items-center justify-between">
                  <span>Sinkronisasi & Portal</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-teal-50 dark:bg-teal-950/70 text-teal-600 dark:text-teal-400 font-bold border border-teal-200/50 dark:border-teal-800/50">
                    Sync & Cloud
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-1.5">
                  {/* Google Sheets Sync */}
                  <button
                    onClick={() => {
                      setShowMobileServicesSheet(false);
                      onSelectTab('spreadsheet');
                    }}
                    className={`w-full text-left p-2.5 rounded-xl flex items-center gap-3 transition ${
                      currentTab === 'spreadsheet'
                        ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 font-bold border border-teal-200 dark:border-teal-800/60'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 border border-transparent'
                    }`}
                  >
                    <div className="p-2 rounded-lg bg-teal-100 dark:bg-teal-900/50 text-teal-600 dark:text-teal-400 shrink-0">
                      <TableProperties className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">Google Sheets Sync</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-teal-100/70 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-semibold">Spreadsheet</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Sinkronisasi Invoice & Rekapitulasi Data</p>
                    </div>
                  </button>

                  {/* Portal Pelanggan */}
                  <button
                    onClick={() => {
                      setShowMobileServicesSheet(false);
                      onSelectTab('portal');
                    }}
                    className={`w-full text-left p-2.5 rounded-xl flex items-center gap-3 transition ${
                      currentTab === 'portal'
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800/60'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 border border-transparent'
                    }`}
                  >
                    <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 shrink-0">
                      <Globe className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">Portal Mandiri Pelanggan</span>
                        <ExternalLink className="w-3.5 h-3.5 text-emerald-500" />
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Halaman Publik Pelanggan Cek Tagihan & QRIS</p>
                    </div>
                  </button>

                  {/* Telegram Backup Setting */}
                  <button
                    onClick={() => {
                      setShowMobileServicesSheet(false);
                      onOpenSettings('backup');
                    }}
                    className="w-full text-left p-2.5 rounded-xl flex items-center gap-3 transition text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 border border-transparent"
                  >
                    <div className="p-2 rounded-lg bg-sky-100 dark:bg-sky-900/50 text-sky-600 dark:text-sky-400 shrink-0">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">Backup Otomatis Telegram</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-100/70 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-semibold">WIB</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Jadwal Cadangan Database JSON & Excel</p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && onLogout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
              <LogOut className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Keluar Akun Admin?
            </h3>
            <p className="text-xs text-slate-600 mb-5 leading-relaxed">
              Anda akan keluar dari sesi admin saat ini. Anda dapat masuk kembali kapan saja dengan kredensial admin Anda.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  onLogout();
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-xs transition active:scale-95"
              >
                Ya, Keluar
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
