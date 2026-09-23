import React, { useState } from 'react';
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
  X
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { RealtimeEvent, AdminUser, BusinessSettings } from '../types';
import { formatDateTimeIndo } from '../utils/formatters';

export type AppNavTab = 'dashboard' | 'invoices' | 'customers' | 'routers' | 'services' | 'automation' | 'qris' | 'spreadsheet' | 'portal';

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
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

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
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-2.5 sm:px-6 lg:px-8">
        {/* Brand & Real-time status */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div 
            onClick={() => onSelectTab('dashboard')} 
            className="flex items-center gap-2 sm:gap-2.5 cursor-pointer group min-w-0"
          >
            {logoUrl ? (
              <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-white border border-slate-200 overflow-hidden shadow-xs group-hover:scale-105 transition-transform p-1 shrink-0">
                <img src={logoUrl} alt={appName} className="max-h-full max-w-full object-contain" />
              </div>
            ) : (
              <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform shrink-0">
                <QrCode className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1 sm:gap-1.5">
                <span className="font-extrabold text-sm sm:text-base tracking-tight text-slate-900 truncate max-w-[105px] xs:max-w-[145px] sm:max-w-none">
                  {appName}
                </span>
                <span className="rounded-md bg-slate-900 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold text-white uppercase tracking-wider shrink-0">
                  Admin
                </span>
              </div>
              <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-slate-500 font-medium">
                <span className={`inline-block h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full shrink-0 ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                <span className="hidden xs:inline truncate">{isConnected ? 'Online' : 'Menghubungkan...'}</span>
              </div>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden lg:flex items-center gap-1 ml-4 border-l border-slate-200 pl-4">
            <button
              id="tab-dashboard-btn"
              onClick={() => onSelectTab('dashboard')}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                currentTab === 'dashboard'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              <span>Dashboard</span>
            </button>

            <button
              id="tab-invoices-btn"
              onClick={() => onSelectTab('invoices')}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                currentTab === 'invoices'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Invoice</span>
            </button>

            <button
              id="tab-customers-btn"
              onClick={() => onSelectTab('customers')}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                currentTab === 'customers'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Users className="h-3.5 w-3.5 text-blue-600" />
              <span>Pelanggan</span>
            </button>

            <button
              id="tab-routers-btn"
              onClick={() => onSelectTab('routers')}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                currentTab === 'routers'
                  ? 'bg-indigo-50 text-indigo-700 font-bold shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Cpu className="h-3.5 w-3.5 text-indigo-600" />
              <span>Router NOC</span>
            </button>

            <button
              id="tab-services-btn"
              onClick={() => onSelectTab('services')}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                currentTab === 'services'
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Package className="h-3.5 w-3.5 text-indigo-600" />
              <span>Daftar Jasa</span>
            </button>

            <button
              id="tab-automation-btn"
              onClick={() => onSelectTab('automation')}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                currentTab === 'automation'
                  ? 'bg-amber-50 text-amber-800'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Zap className="h-3.5 w-3.5 text-amber-500" />
              <span>Otomasi Tagihan</span>
            </button>

            <button
              id="tab-portal-btn"
              onClick={() => onSelectTab('portal')}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                currentTab === 'portal'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Globe className="h-3.5 w-3.5 text-emerald-600" />
              <span>Portal Pelanggan</span>
            </button>
          </nav>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* PWA Install Button */}
          <PWAInstallButton />

          {/* Quick Sync Button */}
          <button
            id="sync-btn"
            onClick={onTriggerSync}
            disabled={isSyncing}
            className="hidden sm:flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition"
            title="Sinkronkan dengan Google Sheets"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-blue-600 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>Sync Sheets</span>
          </button>

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

                <div className="fixed inset-x-2.5 top-16 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 w-auto sm:w-96 max-w-sm sm:max-w-none mx-auto sm:mx-0 rounded-2xl bg-white shadow-2xl border border-slate-100 p-3.5 sm:p-4 z-50 animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2 min-w-0">
                      <Radio className="w-4 h-4 text-emerald-500 animate-pulse shrink-0" />
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider truncate">
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
                        className="sm:hidden p-1 -mr-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                        title="Tutup"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Notification Controls: Mute floating popups and Mute chime sound */}
                  <div className="py-2 px-2.5 my-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between gap-2 text-xs">
                    <span className="text-[11px] font-semibold text-slate-600 shrink-0">Kendali:</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Toggle Popup Toast */}
                      <button
                        type="button"
                        onClick={toggleMuteToasts}
                        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition shadow-2xs ${
                          toastsMuted
                            ? 'bg-rose-100 text-rose-700 border border-rose-200'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
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
                            ? 'bg-slate-200 text-slate-700'
                            : 'bg-blue-100 text-blue-800'
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
                  <div className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-1.5rem)] rounded-2xl bg-white p-2 shadow-2xl ring-1 ring-black/5 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-3 py-2.5 border-b border-slate-100">
                    <div className="text-xs font-bold text-slate-900">{adminUser.name}</div>
                    <div className="text-[11px] text-slate-500 truncate">{adminUser.email}</div>
                    <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wider border border-blue-100">
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
                      className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-xl flex items-center gap-2 transition"
                    >
                      <Settings className="w-4 h-4 text-slate-400" />
                      <span>Pengaturan Bisnis & Akun</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        onOpenSettings('backup');
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-medium text-teal-700 hover:bg-teal-50 rounded-xl flex items-center gap-2 transition"
                    >
                      <TableProperties className="w-4 h-4 text-teal-600" />
                      <span>Google Sheets & Backup Data</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        onSelectTab('portal');
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50 rounded-xl flex items-center gap-2 transition"
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
                        className="w-full text-left px-3 py-2 text-xs font-medium text-blue-700 hover:bg-blue-50 rounded-xl flex items-center gap-2 transition"
                      >
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <span>Galeri Screenshot Fitur</span>
                      </button>
                    )}
                  </div>

                  {onLogout && (
                    <div className="pt-1 border-t border-slate-100">
                      <button
                        id="admin-logout-btn"
                        onClick={() => {
                          setShowUserDropdown(false);
                          setShowLogoutConfirm(true);
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl flex items-center gap-2 transition"
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

      {/* Mobile Sub-Navigation Bar - Smooth Horizontal Pill Scroll */}
      <div className="lg:hidden flex items-center gap-1.5 border-t border-slate-200/80 bg-white/95 backdrop-blur-md px-2.5 py-2 text-xs font-medium text-slate-600 overflow-x-auto no-scrollbar shadow-xs">
        <button
          onClick={() => onSelectTab('dashboard')}
          className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl shrink-0 whitespace-nowrap text-xs font-bold transition active:scale-95 ${
            currentTab === 'dashboard'
              ? 'text-white bg-blue-600 shadow-2xs shadow-blue-500/30'
              : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
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
              : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
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
              : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          <span>Pelanggan</span>
        </button>

        <button
          onClick={() => onSelectTab('routers')}
          className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl shrink-0 whitespace-nowrap text-xs font-bold transition active:scale-95 ${
            currentTab === 'routers'
              ? 'text-white bg-indigo-600 shadow-2xs shadow-indigo-500/30'
              : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
          }`}
        >
          <Cpu className="h-3.5 w-3.5" />
          <span>Router NOC</span>
        </button>

        <button
          onClick={() => onSelectTab('services')}
          className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl shrink-0 whitespace-nowrap text-xs font-bold transition active:scale-95 ${
            currentTab === 'services'
              ? 'text-white bg-indigo-600 shadow-2xs shadow-indigo-500/30'
              : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
          }`}
        >
          <Package className="h-3.5 w-3.5" />
          <span>Jasa</span>
        </button>

        <button
          onClick={() => onSelectTab('automation')}
          className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl shrink-0 whitespace-nowrap text-xs font-bold transition active:scale-95 ${
            currentTab === 'automation'
              ? 'text-white bg-amber-600 shadow-2xs shadow-amber-500/30'
              : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
          }`}
        >
          <Zap className="h-3.5 w-3.5" />
          <span>Otomasi</span>
        </button>

        <button
          onClick={() => onSelectTab('portal')}
          className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl shrink-0 whitespace-nowrap text-xs font-bold transition active:scale-95 ${
            currentTab === 'portal'
              ? 'text-white bg-emerald-600 shadow-2xs shadow-emerald-500/30'
              : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
          }`}
        >
          <Globe className="h-3.5 w-3.5" />
          <span>Portal</span>
        </button>

        {onLogout && (
          <button
            onClick={() => {
              setShowLogoutConfirm(true);
            }}
            className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl shrink-0 whitespace-nowrap text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 transition active:scale-95"
            title="Keluar Admin"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Logout</span>
          </button>
        )}
      </div>

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
