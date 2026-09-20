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
  ShieldCheck
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { RealtimeEvent, AdminUser, BusinessSettings } from '../types';
import { formatDateTimeIndo } from '../utils/formatters';

export type AppNavTab = 'dashboard' | 'invoices' | 'customers' | 'services' | 'automation' | 'qris' | 'spreadsheet' | 'portal';

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
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const appName = settings?.appName || 'InvoiceKilat';
  const logoUrl = settings?.appLogoUrl || settings?.companyLogoUrl;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-3 sm:px-6 lg:px-8">
        {/* Brand & Real-time status */}
        <div className="flex items-center gap-3">
          <div 
            onClick={() => onSelectTab('dashboard')} 
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            {logoUrl ? (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-slate-200 overflow-hidden shadow-xs group-hover:scale-105 transition-transform p-1">
                <img src={logoUrl} alt={appName} className="max-h-full max-w-full object-contain" />
              </div>
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                <QrCode className="h-5 w-5" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-slate-900">
                  {appName}
                </span>
                <span className="rounded-md bg-slate-900 px-1.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                  Admin
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                <span className={`inline-block h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                <span className="hidden sm:inline">{isConnected ? 'Realtime Sync Aktif' : 'Menghubungkan...'}</span>
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
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white shadow-2xl border border-slate-100 p-4 z-50 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-emerald-500 animate-pulse" />
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Notifikasi Real-Time
                    </h4>
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {notifications.length} riwayat
                  </span>
                </div>

                <div className="mt-2 max-h-72 overflow-y-auto divide-y divide-slate-100">
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
                          <div className="flex-1">
                            <p className="text-xs font-bold text-slate-900">
                              {notif.message}
                            </p>
                            <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-400">
                              <Clock className="w-3 h-3" />
                              <span>{formatDateTimeIndo(notif.timestamp)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
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
                <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white p-2 shadow-2xl ring-1 ring-black/5 z-50 animate-in fade-in zoom-in-95">
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
              )}
            </div>
          )}

          {/* New Invoice CTA Button */}
          <button
            id="create-invoice-nav-btn"
            onClick={onOpenCreateInvoice}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/25 transition active:scale-95 shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Buat Invoice</span>
            <span className="sm:hidden">Baru</span>
          </button>
        </div>
      </div>

      {/* Mobile Sub-Navigation Bar */}
      <div className="lg:hidden flex items-center justify-around border-t border-slate-100 bg-slate-50/80 px-1 py-1.5 text-xs font-medium text-slate-600 overflow-x-auto">
        <button
          onClick={() => onSelectTab('dashboard')}
          className={`flex flex-col items-center py-1 px-2 rounded-lg shrink-0 ${
            currentTab === 'dashboard' ? 'text-blue-700 font-bold bg-blue-50' : 'text-slate-600'
          }`}
        >
          <LayoutDashboard className="h-4 w-4" />
          <span className="text-[10px] mt-0.5">Dashboard</span>
        </button>

        <button
          onClick={() => onSelectTab('invoices')}
          className={`flex flex-col items-center py-1 px-2 rounded-lg shrink-0 ${
            currentTab === 'invoices' ? 'text-blue-700 font-bold bg-blue-50' : 'text-slate-600'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span className="text-[10px] mt-0.5">Invoice</span>
        </button>

        <button
          onClick={() => onSelectTab('customers')}
          className={`flex flex-col items-center py-1 px-2 rounded-lg shrink-0 ${
            currentTab === 'customers' ? 'text-blue-700 font-bold bg-blue-50' : 'text-slate-600'
          }`}
        >
          <Users className="h-4 w-4" />
          <span className="text-[10px] mt-0.5">Pelanggan</span>
        </button>

        <button
          onClick={() => onSelectTab('services')}
          className={`flex flex-col items-center py-1 px-2 rounded-lg shrink-0 ${
            currentTab === 'services' ? 'text-indigo-700 font-bold bg-indigo-50' : 'text-slate-600'
          }`}
        >
          <Package className="h-4 w-4" />
          <span className="text-[10px] mt-0.5">Jasa</span>
        </button>

        <button
          onClick={() => onSelectTab('automation')}
          className={`flex flex-col items-center py-1 px-2 rounded-lg shrink-0 ${
            currentTab === 'automation' ? 'text-amber-800 font-bold bg-amber-50' : 'text-slate-600'
          }`}
        >
          <Zap className="h-4 w-4" />
          <span className="text-[10px] mt-0.5">Otomasi</span>
        </button>

        <button
          onClick={() => onSelectTab('portal')}
          className={`flex flex-col items-center py-1 px-2 rounded-lg shrink-0 ${
            currentTab === 'portal' ? 'text-emerald-700 font-bold bg-emerald-50' : 'text-slate-600'
          }`}
        >
          <Globe className="h-4 w-4 text-emerald-600" />
          <span className="text-[10px] mt-0.5">Portal</span>
        </button>

        {onLogout && (
          <button
            onClick={() => {
              setShowLogoutConfirm(true);
            }}
            className="flex flex-col items-center py-1 px-2 rounded-lg shrink-0 text-rose-600 hover:bg-rose-50"
            title="Keluar Admin"
          >
            <LogOut className="h-4 w-4" />
            <span className="text-[10px] mt-0.5">Logout</span>
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
