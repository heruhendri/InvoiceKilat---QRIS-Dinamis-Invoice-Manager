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
  Zap
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { RealtimeEvent } from '../types';
import { formatDateTimeIndo } from '../utils/formatters';

export type AppNavTab = 'dashboard' | 'invoices' | 'customers' | 'services' | 'automation' | 'qris' | 'spreadsheet';

interface NavbarProps {
  currentTab: AppNavTab;
  onSelectTab: (tab: AppNavTab) => void;
  onOpenCreateInvoice: () => void;
  onOpenSettings: () => void;
  isConnected: boolean;
  notifications: RealtimeEvent[];
  unreadCount: number;
  onClearUnread: () => void;
  onSelectInvoice: (id: string) => void;
  onTriggerSync: () => void;
  isSyncing: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
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
}) => {
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-3 sm:px-6 lg:px-8">
        {/* Brand & Real-time status */}
        <div className="flex items-center gap-3">
          <div 
            onClick={() => onSelectTab('dashboard')} 
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-slate-900">
                  Invoice<span className="text-blue-600">Kilat</span>
                </span>
                <span className="rounded-md bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 uppercase">
                  QRIS Dinamis
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
              id="tab-spreadsheet-btn"
              onClick={() => onSelectTab('spreadsheet')}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                currentTab === 'spreadsheet'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <TableProperties className="h-3.5 w-3.5" />
              <span>Spreadsheet</span>
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

          {/* Settings Button */}
          <button
            id="settings-modal-btn"
            onClick={onOpenSettings}
            className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
            title="Pengaturan Profil Bisnis & QRIS"
            aria-label="Pengaturan"
          >
            <Settings className="h-5 w-5" />
          </button>

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
          onClick={() => onSelectTab('spreadsheet')}
          className={`flex flex-col items-center py-1 px-2 rounded-lg shrink-0 ${
            currentTab === 'spreadsheet' ? 'text-blue-700 font-bold bg-blue-50' : 'text-slate-600'
          }`}
        >
          <TableProperties className="h-4 w-4" />
          <span className="text-[10px] mt-0.5">Sheets</span>
        </button>
      </div>
    </header>
  );
};
