import React, { useState, useEffect, useMemo, useRef } from 'react';
import { RouterNocConsoleModal } from './RouterNocConsoleModal';
import {
  Cpu,
  Server,
  Activity,
  Wifi,
  Users,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  FileText,
  Edit3,
  ChevronRight,
  Play,
  Pause,
  HardDrive,
  Terminal,
  Network,
  X,
  Zap,
  Copy,
  Check,
  Eye,
  Sliders,
  ShieldCheck,
  Radio,
  ArrowUpDown,
  Download,
  Plus,
  Trash2
} from 'lucide-react';
import { CustomerRecord, MikrotikConfig, PppoeActiveUser } from '../types';
import { formatRupiah, formatDateTimeIndo } from '../utils/formatters';

interface RouterFleetManagementProps {
  customers: CustomerRecord[];
  onUpdateCustomer: (id: string, data: Partial<CustomerRecord>) => Promise<boolean>;
  onCreateInvoiceForCustomer?: (customer: CustomerRecord) => void;
  onNavigateToCustomer?: (customer: CustomerRecord) => void;
  onRefreshAllData?: () => void;
}

export const RouterFleetManagement: React.FC<RouterFleetManagementProps> = ({
  customers,
  onUpdateCustomer,
  onCreateInvoiceForCustomer,
  onNavigateToCustomer,
  onRefreshAllData,
}) => {
  // Filter customers that have customerMode === 'noc' or have mikrotik config
  const routerCustomers = useMemo(() => {
    return customers.filter(
      (c) => c.customerMode === 'noc' || Boolean(c.mikrotik?.host || c.mikrotik?.routerName)
    );
  }, [customers]);

  // States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'connected' | 'error' | 'unsynced'>('all');
  const [protocolFilter, setProtocolFilter] = useState<'all' | 'rest' | 'api' | 'terminal' | 'push'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'sessions' | 'revenue' | 'cpu' | 'lastSync'>('sessions');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

  // Batch analysis state
  const [isBatchSyncing, setIsBatchSyncing] = useState(false);
  const [batchSyncResult, setBatchSyncResult] = useState<{
    summary?: {
      total: number;
      successCount: number;
      failCount: number;
      totalActivePppoe: number;
      totalNonIsolir: number;
      totalEstimatedBill: number;
    };
    message?: string;
  } | null>(null);

  // Auto-refresh states - defaulted to TRUE so MikroTik data refreshes automatically!
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('mikrotik_auto_refresh_enabled');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(30); // 30s
  const [countdownSeconds, setCountdownSeconds] = useState<number>(30);
  const [lastBatchSyncTime, setLastBatchSyncTime] = useState<Date | null>(null);

  // Single router sync in progress
  const [syncingCustomerIds, setSyncingCustomerIds] = useState<Set<string>>(new Set());

  // Modals state
  const [selectedCustomerForDetail, setSelectedCustomerForDetail] = useState<CustomerRecord | null>(null);
  const [detailActiveTab, setDetailActiveTab] = useState<'users' | 'metrics' | 'telemetry'>('users');
  const [userSearchFilter, setUserSearchFilter] = useState('');
  const [userProfileFilter, setUserProfileFilter] = useState<'all' | 'non-isolir' | 'isolir'>('all');

  // Edit router modal
  const [editingRouterCustomer, setEditingRouterCustomer] = useState<CustomerRecord | null>(null);
  const [editRouterForm, setEditRouterForm] = useState<{
    routerName: string;
    host: string;
    port: number;
    username: string;
    password?: string;
    ratePerUser: number;
    isolirProfileName: string;
    useSsl: boolean;
  }>({
    routerName: '',
    host: '',
    port: 8728,
    username: 'admin',
    password: '',
    ratePerUser: 5000,
    isolirProfileName: 'isolir',
    useSsl: false,
  });
  const [isSavingRouter, setIsSavingRouter] = useState(false);

  // Manual correction modal
  const [correctingCustomer, setCorrectingCustomer] = useState<CustomerRecord | null>(null);
  const [correctionValues, setCorrectionValues] = useState<{
    activeCount: number;
    nonIsolirCount: number;
    isolirCount: number;
    note: string;
  }>({
    activeCount: 0,
    nonIsolirCount: 0,
    isolirCount: 0,
    note: '',
  });

  // Script push modal
  const [pushScriptCustomer, setPushScriptCustomer] = useState<CustomerRecord | null>(null);
  const [generatedScript, setGeneratedScript] = useState<string>('');
  const [copiedScript, setCopiedScript] = useState(false);

  // Kick active user state
  const [kickingUserId, setKickingUserId] = useState<string | null>(null);

  // Notification / Alert banner state
  const [alertBanner, setAlertBanner] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const showAlert = (type: 'success' | 'error' | 'info', message: string) => {
    setAlertBanner({ type, message });
    setTimeout(() => {
      setAlertBanner((prev) => (prev?.message === message ? null : prev));
    }, 6000);
  };

  // Fleet Analytics Aggregates
  const fleetAnalytics = useMemo(() => {
    let totalRouters = routerCustomers.length;
    let onlineRouters = 0;
    let errorRouters = 0;
    let totalActivePppoe = 0;
    let totalNonIsolir = 0;
    let totalIsolir = 0;
    let totalMonthlyRevenue = 0;
    let cpuLoadSum = 0;
    let cpuLoadCount = 0;

    routerCustomers.forEach((c) => {
      const mk = c.mikrotik;
      if (!mk) return;

      if (mk.connectionStatus === 'connected') {
        onlineRouters++;
      } else if (mk.connectionStatus === 'error') {
        errorRouters++;
      }

      const active = mk.activePppoeCount || 0;
      const nonIso = mk.nonIsolirCount !== undefined ? mk.nonIsolirCount : active;
      const iso = mk.isolirCount || 0;
      const rate = mk.ratePerUser || 5000;

      totalActivePppoe += active;
      totalNonIsolir += nonIso;
      totalIsolir += iso;
      totalMonthlyRevenue += nonIso * rate;

      if (typeof mk.cpuLoad === 'number' && mk.cpuLoad >= 0) {
        cpuLoadSum += mk.cpuLoad;
        cpuLoadCount++;
      }
    });

    const avgCpuLoad = cpuLoadCount > 0 ? Math.round(cpuLoadSum / cpuLoadCount) : 15;

    return {
      totalRouters,
      onlineRouters,
      errorRouters,
      offlineOrUnsynced: totalRouters - onlineRouters,
      totalActivePppoe,
      totalNonIsolir,
      totalIsolir,
      totalMonthlyRevenue,
      avgCpuLoad,
    };
  }, [routerCustomers]);

  // Handle Batch Sync / Probe All
  const handleBatchSyncAll = async () => {
    if (isBatchSyncing) return;
    setIsBatchSyncing(true);
    setBatchSyncResult(null);

    try {
      const res = await fetch('/api/mikrotik/sync-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();

      if (data.success) {
        setBatchSyncResult({
          summary: data.summary,
          message: data.message,
        });
        setLastBatchSyncTime(new Date());
        showAlert('success', data.message || 'Semua router berhasil dianalisis.');
        if (onRefreshAllData) onRefreshAllData();
      } else {
        showAlert('error', data.message || 'Gagal menganalisis semua router.');
      }
    } catch (err: any) {
      showAlert('error', 'Koneksi gagal saat menganalisis semua router: ' + err.message);
    } finally {
      setIsBatchSyncing(false);
    }
  };

  // Handle Single Router Sync
  const handleSingleSync = async (customer: CustomerRecord) => {
    if (syncingCustomerIds.has(customer.id)) return;

    setSyncingCustomerIds((prev) => new Set(prev).add(customer.id));

    try {
      const res = await fetch(`/api/mikrotik/sync/${encodeURIComponent(customer.id)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();

      if (data.success) {
        showAlert(
          'success',
          `Sinkronisasi ${customer.mikrotik?.routerName || customer.name} sukses: ${data.calculation?.nonIsolirCount ?? 0} user non-isolir live.`
        );
        if (onRefreshAllData) onRefreshAllData();
        // If modal is open for this customer, update state
        if (selectedCustomerForDetail?.id === customer.id && data.customer) {
          setSelectedCustomerForDetail(data.customer);
        }
      } else {
        showAlert('error', `Gagal menyinkronkan router: ${data.message || data.error || 'Periksa koneksi'}`);
      }
    } catch (err: any) {
      showAlert('error', `Gagal koneksi ke router: ${err.message}`);
    } finally {
      setSyncingCustomerIds((prev) => {
        const next = new Set(prev);
        next.delete(customer.id);
        return next;
      });
    }
  };

  // Ref to always access fresh handleBatchSyncAll without re-triggering effect
  const batchSyncRef = useRef(handleBatchSyncAll);
  batchSyncRef.current = handleBatchSyncAll;

  // Auto-refresh timer loop (guarantees MikroTik data refreshes automatically)
  useEffect(() => {
    try {
      localStorage.setItem('mikrotik_auto_refresh_enabled', String(autoRefreshEnabled));
    } catch {}

    if (!autoRefreshEnabled) return;

    const timer = setInterval(() => {
      setCountdownSeconds((prev) => {
        if (prev <= 1) {
          batchSyncRef.current();
          return autoRefreshInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoRefreshEnabled, autoRefreshInterval]);

  // Initial automatic refresh on first load if armada exists
  useEffect(() => {
    if (routerCustomers.length > 0 && !lastBatchSyncTime) {
      const initialTimer = setTimeout(() => {
        batchSyncRef.current();
      }, 1200);
      return () => clearTimeout(initialTimer);
    }
  }, []);

  // Open Edit Router Modal
  const handleOpenEditRouter = (customer: CustomerRecord) => {
    setEditingRouterCustomer(customer);
    setEditRouterForm({
      routerName: customer.mikrotik?.routerName || `${customer.name} Router`,
      host: customer.mikrotik?.host || '',
      port: customer.mikrotik?.port || 8728,
      username: customer.mikrotik?.username || 'admin',
      password: customer.mikrotik?.password || '',
      ratePerUser: customer.mikrotik?.ratePerUser || 5000,
      isolirProfileName: customer.mikrotik?.isolirProfileName || 'isolir',
      useSsl: customer.mikrotik?.useSsl || false,
    });
  };

  // Save Router Configuration
  const handleSaveRouterConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRouterCustomer) return;

    setIsSavingRouter(true);
    try {
      const updatedMikrotik: MikrotikConfig = {
        ...(editingRouterCustomer.mikrotik || {}),
        routerName: editRouterForm.routerName.trim(),
        host: editRouterForm.host.trim(),
        port: Number(editRouterForm.port) || 8728,
        username: editRouterForm.username.trim(),
        password: editRouterForm.password ?? '',
        ratePerUser: Number(editRouterForm.ratePerUser) || 5000,
        isolirProfileName: editRouterForm.isolirProfileName.trim() || 'isolir',
        useSsl: editRouterForm.useSsl,
        connectionStatus: 'disconnected', // reset to trigger fresh probe
      };

      const success = await onUpdateCustomer(editingRouterCustomer.id, {
        customerMode: 'noc',
        mikrotik: updatedMikrotik,
      });

      if (success) {
        showAlert('success', `Konfigurasi router untuk ${editingRouterCustomer.name} berhasil diperbarui.`);
        setEditingRouterCustomer(null);
        if (onRefreshAllData) onRefreshAllData();
      } else {
        showAlert('error', 'Gagal menyimpan konfigurasi router.');
      }
    } catch (err: any) {
      showAlert('error', 'Terjadi kesalahan: ' + err.message);
    } finally {
      setIsSavingRouter(false);
    }
  };

  // Open Manual Correction Modal
  const handleOpenCorrection = (customer: CustomerRecord) => {
    setCorrectingCustomer(customer);
    const mk = customer.mikrotik;
    setCorrectionValues({
      activeCount: mk?.activePppoeCount || 0,
      nonIsolirCount: mk?.nonIsolirCount !== undefined ? mk.nonIsolirCount : mk?.activePppoeCount || 0,
      isolirCount: mk?.isolirCount || 0,
      note: 'Koreksi manual via Fleet Manager',
    });
  };

  // Save Manual Correction
  const handleSaveCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctingCustomer) return;

    const totalAct = Number(correctionValues.activeCount) || 0;
    const nonIso = Number(correctionValues.nonIsolirCount) || 0;
    const iso = Number(correctionValues.isolirCount) || 0;

    const updatedMikrotik: MikrotikConfig = {
      ...(correctingCustomer.mikrotik || {
        routerName: correctingCustomer.name,
        host: 'manual-override',
        port: 8728,
        username: 'admin',
        ratePerUser: 5000,
      }),
      activePppoeCount: totalAct,
      nonIsolirCount: nonIso,
      isolirCount: iso,
      monthlyAverageNonIsolir: nonIso,
      connectionStatus: 'connected',
      realtimeSource: 'manual_correction',
      lastSyncedAt: new Date().toISOString(),
      lastErrorMessage: undefined,
    };

    const success = await onUpdateCustomer(correctingCustomer.id, {
      mikrotik: updatedMikrotik,
      monthlyAveragePppoeCount: nonIso,
    });

    if (success) {
      showAlert('success', `Koreksi data untuk ${correctingCustomer.name} berhasil disimpan (${nonIso} user non-isolir).`);
      setCorrectingCustomer(null);
      if (onRefreshAllData) onRefreshAllData();
    } else {
      showAlert('error', 'Gagal menyimpan koreksi data.');
    }
  };

  // Open Push Script Modal
  const handleOpenPushScript = async (customer: CustomerRecord) => {
    setPushScriptCustomer(customer);
    setCopiedScript(false);
    try {
      const res = await fetch(`/api/mikrotik/script/${encodeURIComponent(customer.id)}`);
      const data = await res.json();
      if (data.script) {
        setGeneratedScript(data.script);
      } else {
        setGeneratedScript(`# Script RouterOS auto-push\n/system script add name="push-billing" source="/tool fetch url=\\"${window.location.origin}/api/mikrotik/push/${customer.id}\\" http-method=post"`);
      }
    } catch {
      setGeneratedScript(`# Script RouterOS auto-push\n/system script add name="push-billing" source="/tool fetch url=\\"${window.location.origin}/api/mikrotik/push/${customer.id}\\" http-method=post"`);
    }
  };

  // Kick active user from router
  const handleKickUser = async (customer: CustomerRecord, userIdentifier: string) => {
    if (!confirm(`Yakin ingin memutuskan sesi user PPPoE "${userIdentifier}" langsung dari router?`)) return;

    setKickingUserId(userIdentifier);
    try {
      const res = await fetch('/api/mikrotik/kick-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: customer.id,
          userIdentifier,
          config: customer.mikrotik,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showAlert('success', `Sesi user "${userIdentifier}" berhasil diputuskan.`);
        // Refresh detail
        handleSingleSync(customer);
      } else {
        showAlert('error', data.message || 'Gagal memutuskan sesi user.');
      }
    } catch (err: any) {
      showAlert('error', 'Gagal memanggil API router: ' + err.message);
    } finally {
      setKickingUserId(null);
    }
  };

  // Filtered & Sorted Customer Routers List
  const filteredRouters = useMemo(() => {
    return routerCustomers.filter((c) => {
      const mk = c.mikrotik;
      const q = searchQuery.toLowerCase().trim();

      // Search match
      const matchQuery =
        !q ||
        c.name.toLowerCase().includes(q) ||
        (c.company && c.company.toLowerCase().includes(q)) ||
        (mk?.routerName && mk.routerName.toLowerCase().includes(q)) ||
        (mk?.host && mk.host.toLowerCase().includes(q)) ||
        (mk?.boardName && mk.boardName.toLowerCase().includes(q)) ||
        (mk?.systemIdentity && mk.systemIdentity.toLowerCase().includes(q));

      if (!matchQuery) return false;

      // Status filter
      if (statusFilter === 'connected' && mk?.connectionStatus !== 'connected') return false;
      if (statusFilter === 'error' && mk?.connectionStatus !== 'error') return false;
      if (statusFilter === 'unsynced' && (mk?.connectionStatus === 'connected' || mk?.connectionStatus === 'error')) return false;

      // Protocol filter
      if (protocolFilter !== 'all') {
        const src = mk?.realtimeSource || '';
        const host = mk?.host || '';
        if (protocolFilter === 'rest' && src !== 'routeros_rest' && !host.includes(':80') && !host.includes(':443')) return false;
        if (protocolFilter === 'api' && src !== 'routeros_api' && host.includes('terminal')) return false;
        if (protocolFilter === 'terminal' && src !== 'terminal_import' && !host.includes('terminal')) return false;
        if (protocolFilter === 'push' && src !== 'push_webhook') return false;
      }

      return true;
    }).sort((a, b) => {
      const mkA = a.mikrotik;
      const mkB = b.mikrotik;

      let valA: any = 0;
      let valB: any = 0;

      if (sortBy === 'name') {
        valA = a.name.toLowerCase();
        valB = b.name.toLowerCase();
      } else if (sortBy === 'sessions') {
        valA = mkA?.nonIsolirCount ?? mkA?.activePppoeCount ?? 0;
        valB = mkB?.nonIsolirCount ?? mkB?.activePppoeCount ?? 0;
      } else if (sortBy === 'revenue') {
        const rateA = mkA?.ratePerUser || 5000;
        const rateB = mkB?.ratePerUser || 5000;
        valA = (mkA?.nonIsolirCount ?? 0) * rateA;
        valB = (mkB?.nonIsolirCount ?? 0) * rateB;
      } else if (sortBy === 'cpu') {
        valA = mkA?.cpuLoad ?? 0;
        valB = mkB?.cpuLoad ?? 0;
      } else if (sortBy === 'lastSync') {
        valA = mkA?.lastSyncedAt ? new Date(mkA.lastSyncedAt).getTime() : 0;
        valB = mkB?.lastSyncedAt ? new Date(mkB.lastSyncedAt).getTime() : 0;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [routerCustomers, searchQuery, statusFilter, protocolFilter, sortBy, sortOrder]);

  // Export CSV Report of Router Fleet
  const handleExportCsv = () => {
    const headers = [
      'Pelanggan',
      'Perusahaan',
      'Nama Router',
      'Model Board',
      'RouterOS',
      'Host IP',
      'Port',
      'Status',
      'Total PPPoE Aktif',
      'Non-Isolir (Ditagih)',
      'Isolir',
      'Tarif/User',
      'Estimasi Tagihan (Rp)',
      'CPU Load (%)',
      'Free RAM',
      'Terakhir Sinkron',
    ];

    const rows = filteredRouters.map((c) => {
      const mk = c.mikrotik;
      const active = mk?.activePppoeCount ?? 0;
      const nonIso = mk?.nonIsolirCount ?? active;
      const iso = mk?.isolirCount ?? 0;
      const rate = mk?.ratePerUser ?? 5000;
      const estBill = nonIso * rate;

      return [
        `"${c.name.replace(/"/g, '""')}"`,
        `"${(c.company || '').replace(/"/g, '""')}"`,
        `"${(mk?.routerName || '').replace(/"/g, '""')}"`,
        `"${(mk?.boardName || '').replace(/"/g, '""')}"`,
        `"${(mk?.rosVersion || '').replace(/"/g, '""')}"`,
        `"${(mk?.host || '').replace(/"/g, '""')}"`,
        mk?.port ?? 8728,
        `"${(mk?.connectionStatus || 'unsynced').replace(/"/g, '""')}"`,
        active,
        nonIso,
        iso,
        rate,
        estBill,
        mk?.cpuLoad ?? '',
        `"${(mk?.freeMemory || '').replace(/"/g, '""')}"`,
        `"${(mk?.lastSyncedAt || '').replace(/"/g, '""')}"`,
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `analisis_semua_router_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Breadcrumb & Page Header */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-xl bg-indigo-600 text-white shadow-xs">
                <Cpu className="w-5 h-5" />
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Manajemen & Analisis Router Pelanggan
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-indigo-100 text-indigo-800 border border-indigo-200">
                NOC Fleet Manager
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 max-w-3xl">
              Pusat kendali, telemetri real-time, audit kesehatan perangkat, dan verifikasi sesi PPPoE aktif seluruh router MikroTik klien untuk penagihan presisi.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Export CSV */}
            <button
              onClick={handleExportCsv}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition border border-slate-200 shadow-2xs"
              title="Unduh laporan audit semua router dalam format CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ekspor CSV</span>
            </button>

            {/* Auto-refresh controls */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => {
                  const next = !autoRefreshEnabled;
                  setAutoRefreshEnabled(next);
                  if (next) setCountdownSeconds(autoRefreshInterval);
                }}
                className={`px-2.5 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                  autoRefreshEnabled
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : 'bg-white text-slate-700 shadow-2xs'
                }`}
                title={autoRefreshEnabled ? 'Jeda penyegaran otomatis' : 'Aktifkan penyegaran otomatis'}
              >
                {autoRefreshEnabled ? (
                  <>
                    <Pause className="w-3.5 h-3.5 text-amber-600" />
                    <span>Auto ({countdownSeconds}s)</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Auto-Refresh</span>
                  </>
                )}
              </button>

              {autoRefreshEnabled && (
                <div className="flex items-center ml-1 space-x-0.5">
                  {[15, 30, 60].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => {
                        setAutoRefreshInterval(sec);
                        setCountdownSeconds(sec);
                      }}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                        autoRefreshInterval === sec ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {sec}s
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Batch Sync / Analyze All */}
            <button
              onClick={handleBatchSyncAll}
              disabled={isBatchSyncing}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 active:scale-95 text-white font-extrabold text-xs flex items-center gap-2 shadow-md shadow-indigo-500/25 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isBatchSyncing ? 'animate-spin' : ''}`} />
              <span>{isBatchSyncing ? 'Menganalisis Semua...' : '⚡ Analisis & Ping Semua Router'}</span>
            </button>
          </div>
        </div>

        {/* Global Alert Banner */}
        {alertBanner && (
          <div
            className={`mt-4 p-3 rounded-2xl text-xs font-bold flex items-center justify-between gap-3 animate-in fade-in border ${
              alertBanner.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : alertBanner.type === 'error'
                ? 'bg-rose-50 text-rose-800 border-rose-200'
                : 'bg-blue-50 text-blue-800 border-blue-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {alertBanner.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : alertBanner.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              ) : (
                <Activity className="w-4 h-4 text-blue-600 shrink-0" />
              )}
              <span>{alertBanner.message}</span>
            </div>
            <button
              onClick={() => setAlertBanner(null)}
              className="text-slate-400 hover:text-slate-700 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* ================= SECTION 1: EXECUTIVE FLEET ANALYTICS ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Metric 1: Total Router Pelanggan */}
        <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">Total Router Armada</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Server className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {fleetAnalytics.totalRouters} <span className="text-xs font-normal text-slate-400">Router</span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-[11px] font-bold">
              <span className="text-emerald-700 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {fleetAnalytics.onlineRouters} Online
              </span>
              {fleetAnalytics.errorRouters > 0 && (
                <span className="text-rose-600 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  {fleetAnalytics.errorRouters} Kendala
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Metric 2: PPPoE Sesi Aktif Live */}
        <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">Total Sesi PPPoE Live</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-blue-900 tracking-tight">
              {fleetAnalytics.totalActivePppoe.toLocaleString('id-ID')}{' '}
              <span className="text-xs font-normal text-blue-500">Sesi</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 font-medium">
              Sesi terdeteksi di seluruh router pelanggan
            </p>
          </div>
        </div>

        {/* Metric 3: User Non-Isolir (Ditagih) */}
        <div className="p-4 rounded-3xl bg-gradient-to-br from-emerald-50 to-teal-50/50 border border-emerald-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-emerald-900">User Non-Isolir (Ditagih)</span>
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-900 tracking-tight">
              {fleetAnalytics.totalNonIsolir.toLocaleString('id-ID')}{' '}
              <span className="text-xs font-normal text-emerald-700">User Aktif</span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-[11px] font-bold text-emerald-800">
              <span>{fleetAnalytics.totalIsolir} User Terisolir</span>
              <span>•</span>
              <span>
                {fleetAnalytics.totalActivePppoe > 0
                  ? Math.round((fleetAnalytics.totalNonIsolir / fleetAnalytics.totalActivePppoe) * 100)
                  : 100}
                % Billable
              </span>
            </div>
          </div>
        </div>

        {/* Metric 4: Estimasi Pendapatan Tagihan PPPoE */}
        <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">Estimasi Omset PPPoE</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight text-amber-900">
              {formatRupiah(fleetAnalytics.totalMonthlyRevenue)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1 font-medium">
              Akumulasi tarif/user non-isolir bulan ini
            </p>
          </div>
        </div>

        {/* Metric 5: Rata-rata CPU Load & Kesehatan */}
        <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">Beban CPU Rata-rata</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <div className="text-2xl font-black text-slate-900 tracking-tight">
                {fleetAnalytics.avgCpuLoad}%
              </div>
              <span
                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                  fleetAnalytics.avgCpuLoad < 50
                    ? 'bg-emerald-100 text-emerald-800'
                    : fleetAnalytics.avgCpuLoad < 80
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {fleetAnalytics.avgCpuLoad < 50 ? 'Optimal' : fleetAnalytics.avgCpuLoad < 80 ? 'Waspada' : 'Tinggi'}
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className={`h-1.5 rounded-full ${
                  fleetAnalytics.avgCpuLoad < 50
                    ? 'bg-emerald-500'
                    : fleetAnalytics.avgCpuLoad < 80
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                }`}
                style={{ width: `${Math.min(100, fleetAnalytics.avgCpuLoad)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ================= SECTION 2: FILTERS & SEARCH TOOLBAR ================= */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari pelanggan, nama router, IP host, model board..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filters & View Switches */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-2.5 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Semua Status ({routerCustomers.length})</option>
              <option value="connected">🟢 Online ({fleetAnalytics.onlineRouters})</option>
              <option value="error">🔴 Kendala ({fleetAnalytics.errorRouters})</option>
              <option value="unsynced">⚪ Belum Sync</option>
            </select>

            {/* Protocol Filter */}
            <select
              value={protocolFilter}
              onChange={(e) => setProtocolFilter(e.target.value as any)}
              className="px-2.5 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Semua Protokol</option>
              <option value="rest">🌐 REST API</option>
              <option value="api">⚡ Socket API</option>
              <option value="terminal">📋 Terminal Winbox</option>
              <option value="push">📡 Push Webhook</option>
            </select>

            {/* Sort Options */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-2.5 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="sessions">Urut: Sesi PPPoE Terbanyak</option>
              <option value="revenue">Urut: Estimasi Tagihan Tertinggi</option>
              <option value="name">Urut: Nama Pelanggan (A-Z)</option>
              <option value="cpu">Urut: Beban CPU Terberat</option>
              <option value="lastSync">Urut: Sinkronisasi Terakhir</option>
            </select>

            <button
              onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
              className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition"
              title={sortOrder === 'asc' ? 'Urutan Naik (A-Z)' : 'Urutan Turun (Z-A)'}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setViewMode('table')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  viewMode === 'table' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Tabel Rinci
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  viewMode === 'grid' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Kartu Grid
              </button>
            </div>
          </div>
        </div>

        {/* Filter Summary & Result Count */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
          <div>
            Menampilkan <b className="text-slate-800">{filteredRouters.length}</b> dari {routerCustomers.length} router pelanggan
          </div>
          {lastBatchSyncTime && (
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <Clock className="w-3 h-3" />
              <span>
                Analisis massal terakhir: {lastBatchSyncTime.toLocaleTimeString('id-ID')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ================= SECTION 3: ROUTER FLEET TABLE / GRID ================= */}
      {filteredRouters.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
            <Server className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 mb-1">Tidak ada router yang sesuai filter</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
            Coba ubah kata kunci pencarian atau ubah filter status untuk melihat armada router pelanggan Anda.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('all');
              setProtocolFilter('all');
            }}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs"
          >
            Reset Filter Pencarian
          </button>
        </div>
      ) : viewMode === 'table' ? (
        /* Detailed Table View */
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider text-[10.5px]">
                <tr>
                  <th className="py-3.5 px-4">Pelanggan & Router</th>
                  <th className="py-3.5 px-3">Koneksi & Host</th>
                  <th className="py-3.5 px-3">Status Live</th>
                  <th className="py-3.5 px-3">Hardware & CPU</th>
                  <th className="py-3.5 px-3 text-center">User PPPoE (Non-Isolir / Total)</th>
                  <th className="py-3.5 px-3 text-right">Tarif & Tagihan</th>
                  <th className="py-3.5 px-3">Waktu Sinkron</th>
                  <th className="py-3.5 px-4 text-center">Aksi Manajemen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRouters.map((customer) => {
                  const mk = customer.mikrotik;
                  const isSyncingThis = syncingCustomerIds.has(customer.id);
                  const active = mk?.activePppoeCount ?? 0;
                  const nonIso = mk?.nonIsolirCount !== undefined ? mk.nonIsolirCount : active;
                  const iso = mk?.isolirCount ?? 0;
                  const rate = mk?.ratePerUser ?? 5000;
                  const estBill = nonIso * rate;

                  return (
                    <tr key={customer.id} className="hover:bg-indigo-50/30 transition">
                      {/* Pelanggan & Router */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-start gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-2xs">
                            {customer.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-900 leading-tight">
                              {customer.name}
                            </div>
                            {customer.company && (
                              <div className="text-[11px] text-slate-500 font-medium">
                                {customer.company}
                              </div>
                            )}
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-800 font-bold text-[10px] border border-indigo-100">
                                {mk?.routerName || 'MikroTik Router'}
                              </span>
                              {mk?.boardName && (
                                <span className="text-[10px] text-slate-400">
                                  {mk.boardName}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Koneksi & Host */}
                      <td className="py-3.5 px-3">
                        <div className="font-mono text-slate-700 font-semibold text-[11px]">
                          {mk?.host || '<Host Belum Diisi>'}
                          {mk?.port ? `:${mk.port}` : ''}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          {mk?.realtimeSource === 'manual_correction' ? (
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[9.5px] font-bold">
                              ✏️ Input Manual
                            </span>
                          ) : mk?.realtimeSource === 'terminal_import' ? (
                            <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 text-[9.5px] font-bold">
                              📋 Winbox Terminal
                            </span>
                          ) : mk?.realtimeSource === 'routeros_rest' ? (
                            <span className="px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-800 text-[9.5px] font-bold">
                              🌐 REST API
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[9.5px] font-bold">
                              ⚡ RouterOS API
                            </span>
                          )}
                          {mk?.rosVersion && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              v{mk.rosVersion.split(' ')[0]}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status Live */}
                      <td className="py-3.5 px-3">
                        {isSyncingThis ? (
                          <span className="px-2 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold text-[11px] inline-flex items-center gap-1 animate-pulse border border-blue-200">
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            <span>Mengecek...</span>
                          </span>
                        ) : mk?.connectionStatus === 'connected' ? (
                          <span className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-bold text-[11px] inline-flex items-center gap-1.5 border border-emerald-200">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Online</span>
                          </span>
                        ) : mk?.connectionStatus === 'error' ? (
                          <span
                            className="px-2 py-1 rounded-lg bg-rose-50 text-rose-800 font-bold text-[11px] inline-flex items-center gap-1 border border-rose-200 cursor-help"
                            title={mk.lastErrorMessage || 'Koneksi gagal'}
                          >
                            <AlertCircle className="w-3 h-3 text-rose-600" />
                            <span>Kendala</span>
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-lg bg-slate-100 text-slate-600 font-bold text-[11px] inline-flex items-center gap-1">
                            <span>Belum Sync</span>
                          </span>
                        )}
                      </td>

                      {/* Hardware & CPU */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-700 font-bold">
                            CPU: {typeof mk?.cpuLoad === 'number' ? `${mk.cpuLoad}%` : '-'}
                          </span>
                        </div>
                        {typeof mk?.cpuLoad === 'number' && (
                          <div className="w-20 bg-slate-100 rounded-full h-1 mt-1 overflow-hidden">
                            <div
                              className={`h-1 rounded-full ${
                                mk.cpuLoad < 50 ? 'bg-emerald-500' : mk.cpuLoad < 80 ? 'bg-amber-500' : 'bg-rose-500'
                              }`}
                              style={{ width: `${Math.min(100, mk.cpuLoad)}%` }}
                            />
                          </div>
                        )}
                        {mk?.freeMemory && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            RAM: {mk.freeMemory} Free
                          </div>
                        )}
                      </td>

                      {/* User PPPoE */}
                      <td className="py-3.5 px-3 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <span className="px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-900 font-black text-xs">
                            {nonIso} Non-Isolir
                          </span>
                          <span className="text-slate-400 text-xs">/</span>
                          <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-bold text-[11px]">
                            {active} Total
                          </span>
                        </div>
                        {iso > 0 && (
                          <div className="text-[10px] text-rose-600 font-bold mt-1">
                            {iso} User Terisolir
                          </div>
                        )}
                      </td>

                      {/* Tarif & Tagihan */}
                      <td className="py-3.5 px-3 text-right">
                        <div className="font-extrabold text-slate-900 text-xs">
                          {formatRupiah(estBill)}
                        </div>
                        <div className="text-[10.5px] text-slate-400">
                          @{formatRupiah(rate)}/user
                        </div>
                      </td>

                      {/* Waktu Sinkron */}
                      <td className="py-3.5 px-3">
                        <div className="text-slate-600 font-medium text-[11px]">
                          {mk?.lastSyncedAt ? formatDateTimeIndo(mk.lastSyncedAt) : '-'}
                        </div>
                        {mk?.uptime && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            Up: {mk.uptime}
                          </div>
                        )}
                      </td>

                      {/* Aksi Manajemen */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Main NOC Management Button */}
                          <button
                            type="button"
                            onClick={() => setSelectedCustomerForDetail(customer)}
                            className="px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1 shadow-2xs transition active:scale-95"
                            title="Buka Konsol NOC (Kelola Secret, Isolir, Buka Isolir, Ping & Diagnostik)"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Kelola NOC</span>
                          </button>

                          {/* Sync single */}
                          <button
                            type="button"
                            onClick={() => handleSingleSync(customer)}
                            disabled={isSyncingThis}
                            className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition disabled:opacity-50"
                            title="Ping & Sinkronkan Sekarang"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingThis ? 'animate-spin' : ''}`} />
                          </button>

                          {/* Quick Edit Config */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditRouter(customer)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                            title="Edit Konfigurasi Host & Akun Router"
                          >
                            <Sliders className="w-3.5 h-3.5" />
                          </button>

                          {/* Manual Correction */}
                          <button
                            type="button"
                            onClick={() => handleOpenCorrection(customer)}
                            className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 transition"
                            title="Koreksi Jumlah User Manual"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Create Invoice */}
                          {onCreateInvoiceForCustomer && (
                            <button
                              type="button"
                              onClick={() => onCreateInvoiceForCustomer(customer)}
                              className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition"
                              title="Buat Invoice Langsung dari Data PPPoE"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Visual Cards Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRouters.map((customer) => {
            const mk = customer.mikrotik;
            const isSyncingThis = syncingCustomerIds.has(customer.id);
            const active = mk?.activePppoeCount ?? 0;
            const nonIso = mk?.nonIsolirCount !== undefined ? mk.nonIsolirCount : active;
            const iso = mk?.isolirCount ?? 0;
            const rate = mk?.ratePerUser ?? 5000;
            const estBill = nonIso * rate;

            return (
              <div
                key={customer.id}
                className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-2xs">
                        {customer.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-sm leading-tight">
                          {customer.name}
                        </h4>
                        <div className="text-[11px] text-slate-500">
                          {customer.company || 'Pelanggan NOC'}
                        </div>
                      </div>
                    </div>

                    {/* Status badge */}
                    <div>
                      {isSyncingThis ? (
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-extrabold text-[10px] flex items-center gap-1">
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>Syncing...</span>
                        </span>
                      ) : mk?.connectionStatus === 'connected' ? (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[10.5px] flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Online</span>
                        </span>
                      ) : mk?.connectionStatus === 'error' ? (
                        <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 font-extrabold text-[10.5px] flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 text-rose-600" />
                          <span>Kendala</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-bold text-[10.5px]">
                          Belum Sync
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Router identity banner */}
                  <div className="p-3 rounded-2xl bg-indigo-50/60 border border-indigo-100 mb-3 text-xs space-y-1">
                    <div className="flex items-center justify-between font-bold text-indigo-950">
                      <span className="truncate">{mk?.routerName || 'MikroTik Router'}</span>
                      {mk?.boardName && <span className="text-[10px] text-indigo-700 shrink-0">{mk.boardName}</span>}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-600 font-mono">
                      <span>{mk?.host || 'Host IP Belum Ada'}</span>
                      <span>Port {mk?.port || 8728}</span>
                    </div>
                  </div>

                  {/* Metrics Box */}
                  <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10.5px] text-slate-500 block">User Non-Isolir:</span>
                      <span className="text-base font-black text-emerald-800">{nonIso} User</span>
                      <span className="text-[10px] text-slate-400 block">dari {active} total aktif</span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10.5px] text-slate-500 block">Estimasi Tagihan:</span>
                      <span className="text-sm font-black text-slate-900">{formatRupiah(estBill)}</span>
                      <span className="text-[10px] text-slate-400 block">@{formatRupiah(rate)}/user</span>
                    </div>
                  </div>

                  {/* Hardware Status */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mb-4 px-1">
                    <div className="flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-slate-400" />
                      <span>CPU: {typeof mk?.cpuLoad === 'number' ? `${mk.cpuLoad}%` : '-'}</span>
                    </div>
                    {mk?.rosVersion && (
                      <span className="font-mono text-[10px] text-slate-400">
                        v{mk.rosVersion.split(' ')[0]}
                      </span>
                    )}
                    {mk?.uptime && (
                      <span className="font-mono text-[10px] text-slate-400">
                        Up: {mk.uptime.split(' ')[0]}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Action Buttons Footer */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleSingleSync(customer)}
                      disabled={isSyncingThis}
                      className="px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center gap-1 transition"
                      title="Sinkronkan router ini"
                    >
                      <RefreshCw className={`w-3 h-3 ${isSyncingThis ? 'animate-spin' : ''}`} />
                      <span>Sync</span>
                    </button>

                    <button
                      onClick={() => {
                        setSelectedCustomerForDetail(customer);
                        setDetailActiveTab('users');
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1 shadow-2xs transition active:scale-95"
                      title="Buka Konsol NOC (Kelola Secret, Isolir, Buka Isolir, Ping & Diagnostik)"
                    >
                      <ShieldCheck className="w-3 h-3" />
                      <span>Kelola NOC</span>
                    </button>

                    <button
                      onClick={() => handleOpenEditRouter(customer)}
                      className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                      title="Edit Konfigurasi"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {onCreateInvoiceForCustomer && (
                    <button
                      onClick={() => onCreateInvoiceForCustomer(customer)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-2xs transition active:scale-95"
                      title="Buat Invoice Tagihan Sekarang"
                    >
                      <FileText className="w-3 h-3" />
                      <span>Invoice</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= MODAL: NOC ROUTER MANAGEMENT & CONTROL CONSOLE ================= */}
      {selectedCustomerForDetail && (
        <RouterNocConsoleModal
          customer={selectedCustomerForDetail}
          onClose={() => setSelectedCustomerForDetail(null)}
          onRefreshCustomer={onRefreshAllData}
          showAlert={showAlert}
        />
      )}

      {/* ================= MODAL 2: QUICK EDIT ROUTER CONFIGURATION ================= */}
      {editingRouterCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-600 text-white">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Edit Konfigurasi Router MikroTik
                  </h3>
                  <p className="text-xs text-slate-500">
                    Pelanggan: <b className="text-slate-800">{editingRouterCustomer.name}</b>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingRouterCustomer(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRouterConfig} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Nama Identitas Router <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={editRouterForm.routerName}
                  onChange={(e) => setEditRouterForm({ ...editRouterForm, routerName: e.target.value })}
                  placeholder="e.g. CCR2004-16G-2S+ (ACO)"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">
                    Host / IP Address / Domain <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editRouterForm.host}
                    onChange={(e) => setEditRouterForm({ ...editRouterForm, host: e.target.value })}
                    placeholder="e.g. 103.144.xxx.xxx atau vpn.isp.id"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono font-bold focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Port API
                  </label>
                  <input
                    type="number"
                    value={editRouterForm.port}
                    onChange={(e) => setEditRouterForm({ ...editRouterForm, port: parseInt(e.target.value) || 8728 })}
                    placeholder="8728"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono font-bold focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Username API <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editRouterForm.username}
                    onChange={(e) => setEditRouterForm({ ...editRouterForm, username: e.target.value })}
                    placeholder="admin atau api_billing"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Password API
                  </label>
                  <input
                    type="password"
                    value={editRouterForm.password}
                    onChange={(e) => setEditRouterForm({ ...editRouterForm, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Tarif per User Non-Isolir (Rp) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={editRouterForm.ratePerUser}
                    onChange={(e) => setEditRouterForm({ ...editRouterForm, ratePerUser: parseInt(e.target.value) || 0 })}
                    placeholder="5000"
                    step="500"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold text-indigo-700 focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Nama Profile Isolir
                  </label>
                  <input
                    type="text"
                    value={editRouterForm.isolirProfileName}
                    onChange={(e) => setEditRouterForm({ ...editRouterForm, isolirProfileName: e.target.value })}
                    placeholder="isolir"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="modal-edit-ssl"
                  checked={editRouterForm.useSsl}
                  onChange={(e) => setEditRouterForm({ ...editRouterForm, useSsl: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="modal-edit-ssl" className="font-bold text-slate-700 cursor-pointer">
                  Gunakan Koneksi Aman SSL (Port 8729 / HTTPS)
                </label>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingRouterCustomer(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingRouter}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold shadow-sm transition disabled:opacity-50"
                >
                  {isSavingRouter ? 'Menyimpan...' : 'Simpan Konfigurasi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: MANUAL CORRECTION & AUDIT ================= */}
      {correctingCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-amber-50/70">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-600 text-white">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-amber-950 text-base">
                    Koreksi Manual User PPPoE
                  </h3>
                  <p className="text-xs text-amber-800">
                    Pelanggan: <b>{correctingCustomer.name}</b>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCorrectingCustomer(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCorrection} className="p-5 space-y-3.5 text-xs">
              <p className="text-slate-600 text-xs leading-relaxed">
                Gunakan fitur ini jika router klien berada di dalam jaringan privat / NAT dan belum dapat diakses secara publik:
              </p>

              <div>
                <label className="font-bold text-slate-800 block mb-1">
                  User Non-Isolir (User Aktif yang Ditagih) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={correctionValues.nonIsolirCount}
                  onChange={(e) => {
                    const nonIso = parseInt(e.target.value) || 0;
                    setCorrectionValues({
                      ...correctionValues,
                      nonIsolirCount: nonIso,
                      activeCount: nonIso + correctionValues.isolirCount,
                    });
                  }}
                  className="w-full px-3 py-2 text-sm font-black rounded-xl border border-slate-300 text-emerald-800 bg-emerald-50/50 focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">User Terisolir</label>
                  <input
                    type="number"
                    min="0"
                    value={correctionValues.isolirCount}
                    onChange={(e) => {
                      const iso = parseInt(e.target.value) || 0;
                      setCorrectionValues({
                        ...correctionValues,
                        isolirCount: iso,
                        activeCount: correctionValues.nonIsolirCount + iso,
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Total PPPoE Aktif</label>
                  <input
                    type="number"
                    min="0"
                    value={correctionValues.activeCount}
                    onChange={(e) =>
                      setCorrectionValues({ ...correctionValues, activeCount: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Catatan Audit / Alasan</label>
                <input
                  type="text"
                  value={correctionValues.note}
                  onChange={(e) => setCorrectionValues({ ...correctionValues, note: e.target.value })}
                  placeholder="e.g. Sesuai data export winbox manual tgl 21"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 space-y-1">
                <div className="flex justify-between font-bold">
                  <span>Estimasi Tagihan Hasil Koreksi:</span>
                  <span className="text-emerald-800">
                    {formatRupiah(
                      correctionValues.nonIsolirCount * (correctingCustomer.mikrotik?.ratePerUser || 5000)
                    )}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCorrectingCustomer(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold shadow-sm transition"
                >
                  Terapkan Koreksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
