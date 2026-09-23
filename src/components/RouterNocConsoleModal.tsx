import React, { useState, useEffect, useMemo } from 'react';
import {
  Cpu,
  Server,
  Activity,
  Users,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  HardDrive,
  Terminal,
  Network,
  X,
  Zap,
  Copy,
  Check,
  Eye,
  EyeOff,
  Sliders,
  ShieldCheck,
  ShieldAlert,
  ArrowUpDown,
  Plus,
  Trash2,
  Ban,
  Lock,
  Unlock,
  Power,
  Radio,
  Layers,
  FileText,
  Send,
  Wifi,
  ChevronRight
} from 'lucide-react';
import {
  CustomerRecord,
  MikrotikConfig,
  PppoeSecretRecord,
  PppoeProfileRecord,
  RouterInterfaceRecord,
  RouterLogRecord,
  RouterPingResult
} from '../types';
import { formatRupiah } from '../utils/formatters';

interface RouterNocConsoleModalProps {
  customer: CustomerRecord;
  onClose: () => void;
  onRefreshCustomer?: () => void;
  showAlert: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const RouterNocConsoleModal: React.FC<RouterNocConsoleModalProps> = ({
  customer,
  onClose,
  onRefreshCustomer,
  showAlert,
}) => {
  const mk = customer.mikrotik;
  const [activeTab, setActiveTab] = useState<'secrets' | 'actives' | 'profiles' | 'diagnostics' | 'hardware'>('secrets');

  // Secrets & Profiles State
  const [secrets, setSecrets] = useState<PppoeSecretRecord[]>([]);
  const [profiles, setProfiles] = useState<PppoeProfileRecord[]>([]);
  const [isLoadingSecrets, setIsLoadingSecrets] = useState(false);
  const [secretsSearch, setSecretsSearch] = useState('');
  const [secretsFilter, setSecretsFilter] = useState<'all' | 'normal' | 'isolir' | 'online' | 'disabled'>('all');
  const [selectedUsernames, setSelectedUsernames] = useState<Set<string>>(new Set());
  const [showPasswords, setShowPasswords] = useState(false);

  // Action Processing
  const [processingUser, setProcessingUser] = useState<string | null>(null);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);

  // Modal: Isolate Confirmation
  const [isolateTargetUser, setIsolateTargetUser] = useState<PppoeSecretRecord | null>(null);
  const [isolateNote, setIsolateNote] = useState('Tunggakan tagihan bulanan');
  const [isolateProfileChoice, setIsolateProfileChoice] = useState(mk?.isolirProfileName || 'isolir');

  // Modal: Unisolate Confirmation
  const [unisolateTargetUser, setUnisolateTargetUser] = useState<PppoeSecretRecord | null>(null);
  const [unisolateProfileChoice, setUnisolateProfileChoice] = useState('default');

  // Modal: Add Secret
  const [isAddSecretOpen, setIsAddSecretOpen] = useState(false);
  const [addSecretForm, setAddSecretForm] = useState({
    name: '',
    password: '',
    profile: 'default',
    service: 'pppoe',
    comment: '',
    remoteAddress: '',
  });
  const [isSavingSecret, setIsSavingSecret] = useState(false);

  // Modal: Reboot Confirmation
  const [isRebootConfirmOpen, setIsRebootConfirmOpen] = useState(false);
  const [isRebooting, setIsRebooting] = useState(false);

  // Diagnostics State (Ping, Interfaces, Logs)
  const [pingHost, setPingHost] = useState('8.8.8.8');
  const [pingCount, setPingCount] = useState(4);
  const [isPinging, setIsPinging] = useState(false);
  const [pingResult, setPingResult] = useState<RouterPingResult | null>(null);

  const [interfaces, setInterfaces] = useState<RouterInterfaceRecord[]>([]);
  const [isLoadingInterfaces, setIsLoadingInterfaces] = useState(false);

  const [logs, setLogs] = useState<RouterLogRecord[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // Fetch Secrets and Profiles
  const loadSecretsAndProfiles = async () => {
    setIsLoadingSecrets(true);
    try {
      const res = await fetch(`/api/mikrotik/manage/${encodeURIComponent(customer.id)}/secrets`);
      const data = await res.json();
      if (data.success) {
        setSecrets(data.secrets || []);
        setProfiles(data.profiles || []);
      } else {
        showAlert('error', data.message || 'Gagal memuat daftar secret router.');
      }
    } catch (err: any) {
      showAlert('error', 'Gagal terhubung ke API router: ' + err.message);
    } finally {
      setIsLoadingSecrets(false);
    }
  };

  useEffect(() => {
    loadSecretsAndProfiles();
  }, [customer.id]);

  // Handle Isolate User
  const handleConfirmIsolate = async () => {
    if (!isolateTargetUser) return;
    const username = isolateTargetUser.name;
    setProcessingUser(username);

    try {
      const res = await fetch(`/api/mikrotik/manage/${encodeURIComponent(customer.id)}/isolate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          isolirProfileName: isolateProfileChoice,
          note: isolateNote,
          config: customer.mikrotik,
        }),
      });
      const data = await res.json();

      if (data.success) {
        showAlert('success', data.message);
        setIsolateTargetUser(null);
        loadSecretsAndProfiles();
        if (onRefreshCustomer) onRefreshCustomer();
      } else {
        showAlert('error', data.message || 'Gagal mengisolir user');
      }
    } catch (err: any) {
      showAlert('error', 'Terjadi kesalahan: ' + err.message);
    } finally {
      setProcessingUser(null);
    }
  };

  // Handle Unisolate User
  const handleConfirmUnisolate = async () => {
    if (!unisolateTargetUser) return;
    const username = unisolateTargetUser.name;
    setProcessingUser(username);

    try {
      const res = await fetch(`/api/mikrotik/manage/${encodeURIComponent(customer.id)}/unisolate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          targetProfileName: unisolateProfileChoice,
          config: customer.mikrotik,
        }),
      });
      const data = await res.json();

      if (data.success) {
        showAlert('success', data.message);
        setUnisolateTargetUser(null);
        loadSecretsAndProfiles();
        if (onRefreshCustomer) onRefreshCustomer();
      } else {
        showAlert('error', data.message || 'Gagal membuka isolir');
      }
    } catch (err: any) {
      showAlert('error', 'Terjadi kesalahan: ' + err.message);
    } finally {
      setProcessingUser(null);
    }
  };

  // Handle Toggle Disabled Secret
  const handleToggleDisabled = async (secret: PppoeSecretRecord) => {
    const newDisabled = !secret.disabled;
    setProcessingUser(secret.name);

    try {
      const res = await fetch(`/api/mikrotik/manage/${encodeURIComponent(customer.id)}/toggle-secret`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: secret.name,
          disabled: newDisabled,
          config: customer.mikrotik,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showAlert('success', data.message);
        loadSecretsAndProfiles();
      } else {
        showAlert('error', data.message || 'Gagal mengubah status secret');
      }
    } catch (err: any) {
      showAlert('error', 'Error: ' + err.message);
    } finally {
      setProcessingUser(null);
    }
  };

  // Handle Kick Active Session
  const handleKickSession = async (username: string) => {
    if (!confirm(`Putuskan sesi user "${username}" sekarang dari router?`)) return;
    setProcessingUser(username);

    try {
      const res = await fetch('/api/mikrotik/kick-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: customer.id,
          userIdentifier: username,
          config: customer.mikrotik,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showAlert('success', `Sesi user "${username}" berhasil diputuskan.`);
        loadSecretsAndProfiles();
      } else {
        showAlert('error', data.message || 'Gagal memutuskan sesi');
      }
    } catch (err: any) {
      showAlert('error', 'Error: ' + err.message);
    } finally {
      setProcessingUser(null);
    }
  };

  // Handle Delete Secret
  const handleDeleteSecret = async (username: string) => {
    if (!confirm(`Hapus permanen user PPPoE Secret "${username}" dari router MikroTik?`)) return;
    setProcessingUser(username);

    try {
      const res = await fetch(`/api/mikrotik/manage/${encodeURIComponent(customer.id)}/secret/${encodeURIComponent(username)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        showAlert('success', data.message);
        loadSecretsAndProfiles();
        if (onRefreshCustomer) onRefreshCustomer();
      } else {
        showAlert('error', data.message || 'Gagal menghapus user');
      }
    } catch (err: any) {
      showAlert('error', 'Error: ' + err.message);
    } finally {
      setProcessingUser(null);
    }
  };

  // Handle Add New Secret
  const handleCreateSecret = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addSecretForm.name.trim()) {
      showAlert('error', 'Nama user secret wajib diisi');
      return;
    }

    setIsSavingSecret(true);
    try {
      const res = await fetch(`/api/mikrotik/manage/${encodeURIComponent(customer.id)}/secret`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...addSecretForm,
          config: customer.mikrotik,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showAlert('success', data.message);
        setIsAddSecretOpen(false);
        setAddSecretForm({
          name: '',
          password: '',
          profile: 'default',
          service: 'pppoe',
          comment: '',
          remoteAddress: '',
        });
        loadSecretsAndProfiles();
        if (onRefreshCustomer) onRefreshCustomer();
      } else {
        showAlert('error', data.message || 'Gagal membuat user secret');
      }
    } catch (err: any) {
      showAlert('error', 'Error: ' + err.message);
    } finally {
      setIsSavingSecret(false);
    }
  };

  // Batch Isolate or Unisolate
  const handleBatchAction = async (action: 'isolate' | 'unisolate') => {
    if (selectedUsernames.size === 0) return;
    const usernames = Array.from(selectedUsernames);
    const actionName = action === 'isolate' ? 'ISOLIR (Blokir)' : 'BUKA ISOLIR';

    if (!confirm(`Yakin ingin ${actionName} untuk ${usernames.length} user terpilih sekaligus?`)) return;

    setIsProcessingBatch(true);
    try {
      const res = await fetch(`/api/mikrotik/manage/${encodeURIComponent(customer.id)}/batch-isolate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usernames,
          action,
          isolirProfileName: mk?.isolirProfileName || 'isolir',
          config: customer.mikrotik,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showAlert('success', data.message);
        setSelectedUsernames(new Set());
        loadSecretsAndProfiles();
        if (onRefreshCustomer) onRefreshCustomer();
      } else {
        showAlert('error', data.message || 'Gagal menjalankan aksi massal');
      }
    } catch (err: any) {
      showAlert('error', 'Error: ' + err.message);
    } finally {
      setIsProcessingBatch(false);
    }
  };

  // Handle Reboot Router
  const handleRebootRouter = async () => {
    setIsRebooting(true);
    try {
      const res = await fetch(`/api/mikrotik/manage/${encodeURIComponent(customer.id)}/reboot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: customer.mikrotik }),
      });
      const data = await res.json();
      if (data.success) {
        showAlert('success', data.message);
        setIsRebootConfirmOpen(false);
      } else {
        showAlert('error', data.message || 'Gagal mengirim perintah reboot');
      }
    } catch (err: any) {
      showAlert('error', 'Error: ' + err.message);
    } finally {
      setIsRebooting(false);
    }
  };

  // Handle Ping Test
  const handleRunPing = async () => {
    setIsPinging(true);
    setPingResult(null);
    try {
      const res = await fetch(`/api/mikrotik/manage/${encodeURIComponent(customer.id)}/ping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: pingHost,
          count: pingCount,
          config: customer.mikrotik,
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setPingResult(data.data);
      } else {
        showAlert('error', data.message || 'Gagal ping dari router');
      }
    } catch (err: any) {
      showAlert('error', 'Error ping: ' + err.message);
    } finally {
      setIsPinging(false);
    }
  };

  // Load Interfaces
  const handleLoadInterfaces = async () => {
    setIsLoadingInterfaces(true);
    try {
      const res = await fetch(`/api/mikrotik/manage/${encodeURIComponent(customer.id)}/interfaces`);
      const data = await res.json();
      if (data.success) {
        setInterfaces(data.interfaces || []);
      }
    } catch (err: any) {
      showAlert('error', 'Gagal memuat interfaces: ' + err.message);
    } finally {
      setIsLoadingInterfaces(false);
    }
  };

  // Load Logs
  const handleLoadLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const res = await fetch(`/api/mikrotik/manage/${encodeURIComponent(customer.id)}/logs?count=40`);
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs || []);
      }
    } catch (err: any) {
      showAlert('error', 'Gagal memuat log router: ' + err.message);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  // Filtered Secrets
  const filteredSecrets = useMemo(() => {
    return secrets.filter((s) => {
      if (secretsFilter === 'normal' && s.isIsolir) return false;
      if (secretsFilter === 'isolir' && !s.isIsolir) return false;
      if (secretsFilter === 'online' && !s.isOnline) return false;
      if (secretsFilter === 'disabled' && !s.disabled) return false;

      if (!secretsSearch.trim()) return true;
      const q = secretsSearch.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        (s.profile && s.profile.toLowerCase().includes(q)) ||
        (s.comment && s.comment.toLowerCase().includes(q)) ||
        (s.activeIp && s.activeIp.includes(q)) ||
        (s.callerId && s.callerId.toLowerCase().includes(q))
      );
    });
  }, [secrets, secretsFilter, secretsSearch]);

  // Statistics
  const stats = useMemo(() => {
    const total = secrets.length;
    const online = secrets.filter((s) => s.isOnline).length;
    const isolir = secrets.filter((s) => s.isIsolir).length;
    const normal = Math.max(0, total - isolir);
    const disabled = secrets.filter((s) => s.disabled).length;
    return { total, online, isolir, normal, disabled };
  }, [secrets]);

  // Toggle selection
  const toggleSelectUser = (name: string) => {
    setSelectedUsernames((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedUsernames.size === filteredSecrets.length) {
      setSelectedUsernames(new Set());
    } else {
      setSelectedUsernames(new Set(filteredSecrets.map((s) => s.name)));
    }
  };

  // Helper when opening isolate modal
  const openIsolateModal = (secret: PppoeSecretRecord) => {
    setIsolateTargetUser(secret);
    setIsolateNote('Tunggakan tagihan bulanan');
    setIsolateProfileChoice(mk?.isolirProfileName || 'isolir');
  };

  // Helper when opening unisolate modal
  const openUnisolateModal = (secret: PppoeSecretRecord) => {
    setUnisolateTargetUser(secret);
    // Parse previous profile from comment if present
    const match = secret.comment?.match(/\[PREV:([^\]]+)\]/i);
    const prevProf = match ? match[1] : profiles.find((p) => p.name !== 'isolir' && p.name !== 'expired')?.name || 'default';
    setUnisolateProfileChoice(prevProf);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto">
        
        {/* ================= MODAL HEADER & NOC BANNER ================= */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-indigo-600/90 text-white shadow-lg border border-indigo-400/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight">
                  {mk?.routerName || customer.name}
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/30 border border-indigo-400/30 text-indigo-200 font-extrabold text-[10px] tracking-wider uppercase">
                  NOC Console
                </span>
                {mk?.connectionStatus === 'connected' ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-bold text-[10.5px] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>Online</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-400/40 text-rose-300 font-bold text-[10.5px]">
                    Offline
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-300 mt-1 font-mono">
                <span className="text-white font-semibold">{customer.name}</span>
                <span>•</span>
                <span>{mk?.host || 'Host'}:{mk?.port || 8728}</span>
                <span>•</span>
                <span className="text-indigo-300 font-sans font-bold">{mk?.boardName || 'RouterBOARD'}</span>
                {mk?.rosVersion && (
                  <>
                    <span>•</span>
                    <span className="text-slate-400">ROS v{mk.rosVersion.split(' ')[0]}</span>
                  </>
                )}
                {mk?.uptime && (
                  <>
                    <span>•</span>
                    <span className="text-slate-400">Up: {mk.uptime}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Quick NOC Header Controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                loadSecretsAndProfiles();
                if (activeTab === 'diagnostics') {
                  handleLoadInterfaces();
                  handleLoadLogs();
                }
              }}
              disabled={isLoadingSecrets}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 font-bold text-xs flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50"
              title="Segarkan Data Router"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSecrets ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Sync</span>
            </button>

            <button
              type="button"
              onClick={() => setIsRebootConfirmOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-bold text-xs flex items-center gap-1.5 transition active:scale-95"
              title="Reboot Router MikroTik Dari Jauh"
            >
              <Power className="w-3.5 h-3.5" />
              <span>Reboot</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Tutup Konsol NOC"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Hardware Status Strip */}
        <div className="bg-slate-850 px-5 py-2.5 bg-slate-900/95 border-b border-slate-800 text-xs text-slate-300 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              <span>CPU: <b className="text-white">{typeof mk?.cpuLoad === 'number' ? `${mk.cpuLoad}%` : '-'}</b></span>
            </div>
            <div className="flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-blue-400" />
              <span>Free RAM: <b className="text-white">{mk?.freeMemory || '-'}</b> / {mk?.totalMemory || '-'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-emerald-400" />
              <span>Arch: <b className="text-white">{mk?.architectureName || 'mipsbe/arm'}</b></span>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
            <span>Tarif Tagihan: <b className="text-emerald-400 font-sans">{formatRupiah(mk?.ratePerUser || 5000)}/user</b></span>
            <span>•</span>
            <span>Profil Isolir: <b className="text-rose-400 font-sans">{mk?.isolirProfileName || 'isolir'}</b></span>
          </div>
        </div>

        {/* ================= MODAL TABS NAVIGATION ================= */}
        <div className="flex items-center px-4 sm:px-6 pt-3 border-b border-slate-200 bg-white overflow-x-auto gap-1 text-xs font-bold scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('secrets')}
            className={`pb-3 px-3 border-b-2 flex items-center gap-2 whitespace-nowrap transition ${
              activeTab === 'secrets'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Manajemen Secret & Isolir ({stats.total})</span>
            {stats.isolir > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-700 text-[10px] font-extrabold">
                {stats.isolir} Isolir
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('actives')}
            className={`pb-3 px-3 border-b-2 flex items-center gap-2 whitespace-nowrap transition ${
              activeTab === 'actives'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Sesi Aktif Live ({stats.online})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('profiles')}
            className={`pb-3 px-3 border-b-2 flex items-center gap-2 whitespace-nowrap transition ${
              activeTab === 'profiles'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Paket Profil PPP ({profiles.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('diagnostics');
              if (interfaces.length === 0) handleLoadInterfaces();
              if (logs.length === 0) handleLoadLogs();
            }}
            className={`pb-3 px-3 border-b-2 flex items-center gap-2 whitespace-nowrap transition ${
              activeTab === 'diagnostics'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>Diagnostik NOC (Ping, Traffic, Log)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('hardware')}
            className={`pb-3 px-3 border-b-2 flex items-center gap-2 whitespace-nowrap transition ${
              activeTab === 'hardware'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Hardware & Riwayat Sampel</span>
          </button>
        </div>

        {/* ================= MODAL BODY ================= */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 bg-slate-50/40">
          
          {/* TAB 1: PPPOE SECRETS & ISOLIR MANAGEMENT */}
          {activeTab === 'secrets' && (
            <div className="space-y-4">
              {/* Stat Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-[11px] text-slate-500 font-bold block">Total PPPoE Secrets</span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-xl font-black text-slate-900">{stats.total}</span>
                    <span className="text-[10.5px] text-slate-400">user</span>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-2xl border border-emerald-200 bg-emerald-50/30 shadow-2xs">
                  <span className="text-[11px] text-emerald-700 font-bold block">Normal (Ditagih)</span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-xl font-black text-emerald-800">{stats.normal}</span>
                    <span className="text-[10.5px] text-emerald-600 font-semibold">user</span>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-2xl border border-rose-200 bg-rose-50/40 shadow-2xs">
                  <span className="text-[11px] text-rose-700 font-bold block">Terisolir (Blokir)</span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-xl font-black text-rose-800">{stats.isolir}</span>
                    <span className="text-[10.5px] text-rose-600 font-semibold">user</span>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-2xl border border-blue-200 bg-blue-50/30 shadow-2xs">
                  <span className="text-[11px] text-blue-700 font-bold block">Sesi Online Live</span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-xl font-black text-blue-800">{stats.online}</span>
                    <span className="text-[10.5px] text-blue-600 font-semibold">terhubung</span>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-[11px] text-slate-500 font-bold block">Nonaktif (Disabled)</span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-xl font-black text-slate-700">{stats.disabled}</span>
                    <span className="text-[10.5px] text-slate-400">akun</span>
                  </div>
                </div>
              </div>

              {/* Action & Filter Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
                {/* Search & Password Toggle */}
                <div className="flex items-center gap-2 flex-1 max-w-md">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={secretsSearch}
                      onChange={(e) => setSecretsSearch(e.target.value)}
                      placeholder="Cari user PPPoE, profil, catatan, IP..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowPasswords((prev) => !prev)}
                    className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1"
                    title={showPasswords ? 'Sembunyikan Password' : 'Lihat Password'}
                  >
                    {showPasswords ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span className="hidden sm:inline">{showPasswords ? 'Sembunyikan' : 'Password'}</span>
                  </button>
                </div>

                {/* Filter Chips & Add User Button */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSecretsFilter('all')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                      secretsFilter === 'all'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Semua ({stats.total})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSecretsFilter('normal')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                      secretsFilter === 'normal'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                    }`}
                  >
                    Normal ({stats.normal})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSecretsFilter('isolir')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                      secretsFilter === 'isolir'
                        ? 'bg-rose-600 text-white'
                        : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
                    }`}
                  >
                    Terisolir ({stats.isolir})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSecretsFilter('online')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                      secretsFilter === 'online'
                        ? 'bg-blue-600 text-white'
                        : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
                    }`}
                  >
                    Online ({stats.online})
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsAddSecretOpen(true)}
                    className="ml-1 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Tambah Secret</span>
                  </button>
                </div>
              </div>

              {/* Batch Action Floating Bar when users are selected */}
              {selectedUsernames.size > 0 && (
                <div className="p-3 bg-indigo-900 text-white rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-lg animate-in fade-in">
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <span className="w-6 h-6 rounded-full bg-indigo-700 flex items-center justify-center text-xs">
                      {selectedUsernames.size}
                    </span>
                    <span>user PPPoE terpilih untuk aksi massal:</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleBatchAction('isolate')}
                      disabled={isProcessingBatch}
                      className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition disabled:opacity-50"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>🚫 Isolir Terpilih ({selectedUsernames.size})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleBatchAction('unisolate')}
                      disabled={isProcessingBatch}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition disabled:opacity-50"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      <span>✅ Buka Isolir Terpilih ({selectedUsernames.size})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedUsernames(new Set())}
                      className="px-2.5 py-1.5 rounded-xl bg-indigo-800 hover:bg-indigo-700 text-slate-200 text-xs font-semibold"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              )}

              {/* Secrets Table */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="max-h-[480px] overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 font-bold text-slate-600 text-[11px] z-10">
                      <tr>
                        <th className="py-3 px-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={filteredSecrets.length > 0 && selectedUsernames.size === filteredSecrets.length}
                            onChange={toggleSelectAll}
                            className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                        </th>
                        <th className="py-3 px-3">Username PPPoE</th>
                        <th className="py-3 px-3">Profil Paket</th>
                        <th className="py-3 px-3">Status Sesi Live</th>
                        <th className="py-3 px-3">Status Akun</th>
                        <th className="py-3 px-3">Catatan / Komentar</th>
                        <th className="py-3 px-3 text-center">Aksi Manajemen NOC</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredSecrets.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-10 text-center text-slate-400">
                            {isLoadingSecrets ? (
                              <div className="flex items-center justify-center gap-2 text-indigo-600">
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                <span>Mengambil data PPPoE Secrets dari router MikroTik...</span>
                              </div>
                            ) : (
                              'Tidak ada data user PPPoE Secret yang sesuai filter.'
                            )}
                          </td>
                        </tr>
                      ) : (
                        filteredSecrets.map((secret, idx) => {
                          const isProcessingThis = processingUser === secret.name;
                          const isChecked = selectedUsernames.has(secret.name);

                          return (
                            <tr
                              key={idx}
                              className={`hover:bg-slate-50/80 transition ${
                                secret.isIsolir ? 'bg-rose-50/30' : ''
                              } ${isChecked ? 'bg-indigo-50/40' : ''}`}
                            >
                              {/* Checkbox */}
                              <td className="py-3 px-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleSelectUser(secret.name)}
                                  className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                />
                              </td>

                              {/* Username */}
                              <td className="py-3 px-3 font-mono font-bold text-slate-900">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`w-2 h-2 rounded-full shrink-0 ${
                                      secret.isOnline ? 'bg-emerald-500' : 'bg-slate-300'
                                    }`}
                                    title={secret.isOnline ? 'Online Live' : 'Offline'}
                                  />
                                  <span>{secret.name}</span>
                                  {showPasswords && secret.password && (
                                    <span className="text-[10.5px] font-normal text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                      pwd: {secret.password}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Profile */}
                              <td className="py-3 px-3">
                                {secret.isIsolir ? (
                                  <div className="flex items-center gap-1.5">
                                    <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-extrabold text-[10px] flex items-center gap-1">
                                      <Ban className="w-3 h-3" />
                                      <span>ISOLIR ({secret.profile})</span>
                                    </span>
                                  </div>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10.5px]">
                                    {secret.profile || 'default'}
                                  </span>
                                )}
                              </td>

                              {/* Sesi Live */}
                              <td className="py-3 px-3">
                                {secret.isOnline ? (
                                  <div>
                                    <div className="font-mono text-indigo-700 font-semibold text-[11px] flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                      <span>{secret.activeIp || 'IP Live'}</span>
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-mono">
                                      Up: {secret.uptime || 'active'}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-[10.5px] text-slate-400 font-mono">
                                    {secret.lastLoggedOut ? `Off: ${secret.lastLoggedOut}` : 'Offline'}
                                  </div>
                                )}
                              </td>

                              {/* Status Akun */}
                              <td className="py-3 px-3">
                                <button
                                  type="button"
                                  onClick={() => handleToggleDisabled(secret)}
                                  disabled={isProcessingThis}
                                  className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold transition flex items-center gap-1 ${
                                    secret.disabled
                                      ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                                      : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                  }`}
                                  title="Klik untuk ubah Enabled/Disabled"
                                >
                                  {secret.disabled ? <Lock className="w-2.5 h-2.5" /> : <Unlock className="w-2.5 h-2.5" />}
                                  <span>{secret.disabled ? 'Disabled' : 'Enabled'}</span>
                                </button>
                              </td>

                              {/* Comment */}
                              <td className="py-3 px-3 text-slate-600 max-w-[200px] truncate text-[11px]">
                                {secret.comment || '-'}
                              </td>

                              {/* Action Buttons */}
                              <td className="py-3 px-3 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  {/* Isolir vs Buka Isolir Button */}
                                  {secret.isIsolir ? (
                                    <button
                                      type="button"
                                      onClick={() => openUnisolateModal(secret)}
                                      disabled={isProcessingThis}
                                      className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-2xs transition active:scale-95 disabled:opacity-50"
                                      title="Buka Isolir: Kembalikan ke paket normal"
                                    >
                                      <CheckCircle2 className="w-3 h-3" />
                                      <span>Buka Isolir</span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => openIsolateModal(secret)}
                                      disabled={isProcessingThis}
                                      className="px-2.5 py-1 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-2xs transition active:scale-95 disabled:opacity-50"
                                      title="Isolir Pelanggan: Ubah ke profil isolir & putuskan sesi aktif"
                                    >
                                      <Ban className="w-3 h-3" />
                                      <span>Isolir</span>
                                    </button>
                                  )}

                                  {/* Kick if Online */}
                                  {secret.isOnline && (
                                    <button
                                      type="button"
                                      onClick={() => handleKickSession(secret.name)}
                                      disabled={isProcessingThis}
                                      className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-[10.5px] transition"
                                      title="Putuskan koneksi (Kick Sesi)"
                                    >
                                      Kick
                                    </button>
                                  )}

                                  {/* Delete Secret */}
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSecret(secret.name)}
                                    disabled={isProcessingThis}
                                    className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                                    title="Hapus Secret"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ACTIVE LIVE SESSIONS */}
          {activeTab === 'actives' && (
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 rounded-2xl text-xs flex items-center justify-between">
                <div>
                  Menampilkan user PPPoE yang sedang dial-in terhubung ke MikroTik secara live. Total aktif: <b>{mk?.activePppoeCount || secrets.filter((s) => s.isOnline).length}</b> sesi.
                </div>
                <button
                  type="button"
                  onClick={loadSecretsAndProfiles}
                  className="px-2.5 py-1 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Segarkan Sesi</span>
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="max-h-[480px] overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 font-bold text-slate-600 text-[11px]">
                      <tr>
                        <th className="py-3 px-3">Username</th>
                        <th className="py-3 px-3">IP Address</th>
                        <th className="py-3 px-3">Uptime</th>
                        <th className="py-3 px-3">Profile</th>
                        <th className="py-3 px-3">Caller-ID (MAC)</th>
                        <th className="py-3 px-3 text-center">Aksi Cepat</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {secrets.filter((s) => s.isOnline).length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-10 text-center font-sans text-slate-400">
                            Tidak ada sesi PPPoE aktif saat ini.
                          </td>
                        </tr>
                      ) : (
                        secrets
                          .filter((s) => s.isOnline)
                          .map((act, i) => (
                            <tr key={i} className="hover:bg-slate-50 transition">
                              <td className="py-2.5 px-3 font-bold text-slate-900">
                                {act.name}
                              </td>
                              <td className="py-2.5 px-3 text-indigo-600 font-semibold">
                                {act.activeIp || '-'}
                              </td>
                              <td className="py-2.5 px-3 text-slate-500 font-sans text-xs">
                                {act.uptime || '-'}
                              </td>
                              <td className="py-2.5 px-3 font-sans">
                                {act.isIsolir ? (
                                  <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px]">
                                    Isolir ({act.profile})
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                    {act.profile || 'default'}
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                                {act.callerId || '-'}
                              </td>
                              <td className="py-2.5 px-3 text-center font-sans">
                                <div className="flex items-center justify-center gap-1.5">
                                  {act.isIsolir ? (
                                    <button
                                      type="button"
                                      onClick={() => openUnisolateModal(act)}
                                      className="px-2 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[10.5px]"
                                    >
                                      Buka Isolir
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => openIsolateModal(act)}
                                      className="px-2 py-1 rounded-lg bg-rose-600 text-white font-bold text-[10.5px]"
                                    >
                                      Isolir & Kick
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleKickSession(act.name)}
                                    className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10.5px]"
                                  >
                                    Kick
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PPP PROFILES */}
          {activeTab === 'profiles' && (
            <div className="space-y-3">
              <div className="p-3 bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-2xl text-xs">
                Daftar profil paket bandwidth PPP (`/ppp/profile`) yang terkonfigurasi di MikroTik. Profil ini digunakan saat mengembalikan paket pelanggan setelah isolir dibuka.
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Nama Profile</th>
                      <th className="py-3 px-4">Rate Limit (Bandwidth)</th>
                      <th className="py-3 px-4">Local Address</th>
                      <th className="py-3 px-4">Remote Address (Pool)</th>
                      <th className="py-3 px-4">Keterangan</th>
                      <th className="py-3 px-4 text-center">Status NOC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {profiles.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center font-sans text-slate-400">
                          Memuat data profil router...
                        </td>
                      </tr>
                    ) : (
                      profiles.map((p, idx) => {
                        const isIsolir = p.name.toLowerCase().includes('isolir') || p.name.toLowerCase().includes('expired');
                        return (
                          <tr key={idx} className="hover:bg-slate-50 transition">
                            <td className="py-3 px-4 font-bold text-slate-900">
                              {p.name}
                            </td>
                            <td className="py-3 px-4 text-emerald-600 font-semibold">
                              {p.rateLimit || '-'}
                            </td>
                            <td className="py-3 px-4 text-slate-600">
                              {p.localAddress || '-'}
                            </td>
                            <td className="py-3 px-4 text-slate-600">
                              {p.remoteAddress || '-'}
                            </td>
                            <td className="py-3 px-4 font-sans text-slate-500">
                              {p.comment || (p.default ? 'Default Profile' : '-')}
                            </td>
                            <td className="py-3 px-4 text-center font-sans">
                              {isIsolir ? (
                                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-extrabold text-[10px]">
                                  Profil Isolir
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                  Paket Normal
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: NOC DIAGNOSTICS (PING, TRAFFIC, LOGS) */}
          {activeTab === 'diagnostics' && (
            <div className="space-y-5">
              {/* Tool 1: Interactive Router Ping */}
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-indigo-600" />
                    <h4 className="text-sm font-black text-slate-900">Uji Ping Langsung dari Router</h4>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Eksekusi perintah: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">/ping address={pingHost}</code>
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={pingHost}
                    onChange={(e) => setPingHost(e.target.value)}
                    placeholder="Target IP atau Domain (cth: 8.8.8.8, 1.1.1.1, IP Pelanggan)"
                    className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 flex-1 max-w-sm font-mono focus:ring-2 focus:ring-indigo-500"
                  />

                  <select
                    value={pingCount}
                    onChange={(e) => setPingCount(Number(e.target.value))}
                    className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 font-semibold"
                  >
                    <option value={4}>4 Paket</option>
                    <option value={5}>5 Paket</option>
                    <option value={8}>8 Paket</option>
                  </select>

                  <button
                    type="button"
                    onClick={handleRunPing}
                    disabled={isPinging}
                    className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition disabled:opacity-50"
                  >
                    <Send className={`w-3.5 h-3.5 ${isPinging ? 'animate-spin' : ''}`} />
                    <span>{isPinging ? 'Mengirim Ping...' : 'Mulai Ping'}</span>
                  </button>
                </div>

                {pingResult && (
                  <div className="p-3.5 bg-slate-900 text-white rounded-xl font-mono text-xs space-y-2 animate-in fade-in">
                    <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-2 text-[11px] text-slate-300">
                      <span>Target: <b className="text-white">{pingResult.host}</b></span>
                      <span>Terkirim: <b className="text-emerald-400">{pingResult.sent}</b>, Diterima: <b className="text-emerald-400">{pingResult.received}</b></span>
                      <span>Packet Loss: <b className={pingResult.packetLoss > 0 ? 'text-rose-400' : 'text-emerald-400'}>{pingResult.packetLoss}%</b></span>
                      <span>Min/Avg/Max: <b className="text-indigo-300">{pingResult.minRtt}/{pingResult.avgRtt}/{pingResult.maxRtt} ms</b></span>
                    </div>
                    <div className="space-y-1 max-h-36 overflow-y-auto">
                      {pingResult.results.map((r, idx) => (
                        <div key={idx} className="flex items-center gap-3 text-[11px]">
                          <span className="text-slate-500">#{r.seq}</span>
                          <span className="text-slate-300">{r.host}</span>
                          <span className="text-emerald-400">{r.size} bytes</span>
                          <span className="text-indigo-300 font-bold">{r.timeMs} ms</span>
                          <span className="text-slate-400">ttl={r.ttl}</span>
                          <span className="text-slate-500">{r.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Tool 2: Interfaces & Traffic */}
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Network className="w-4 h-4 text-blue-600" />
                    <h4 className="text-sm font-black text-slate-900">Traffic & Status Interface Router</h4>
                  </div>
                  <button
                    type="button"
                    onClick={handleLoadInterfaces}
                    disabled={isLoadingInterfaces}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoadingInterfaces ? 'animate-spin' : ''}`} />
                    <span>Segarkan Interface</span>
                  </button>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 text-[10.5px]">
                      <tr>
                        <th className="py-2.5 px-3">Nama Interface</th>
                        <th className="py-2.5 px-3">Tipe</th>
                        <th className="py-2.5 px-3">Status Link</th>
                        <th className="py-2.5 px-3">MTU</th>
                        <th className="py-2.5 px-3">Rx (Download)</th>
                        <th className="py-2.5 px-3">Tx (Upload)</th>
                        <th className="py-2.5 px-3">Keterangan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {interfaces.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-6 text-center font-sans text-slate-400">
                            {isLoadingInterfaces ? 'Membaca daftar interface...' : 'Klik Segarkan Interface untuk melihat.'}
                          </td>
                        </tr>
                      ) : (
                        interfaces.map((intf, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 font-bold text-slate-900">
                              {intf.name}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500 font-sans text-[11px]">
                              {intf.type}
                            </td>
                            <td className="py-2.5 px-3 font-sans">
                              {intf.running ? (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                  R (Running)
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold text-[10px]">
                                  Down
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                              {intf.mtu}
                            </td>
                            <td className="py-2.5 px-3 text-emerald-600 font-bold text-[11px]">
                              {intf.rxBytes ? `${(intf.rxBytes / (1024 * 1024)).toFixed(1)} MB` : '-'}
                            </td>
                            <td className="py-2.5 px-3 text-blue-600 font-bold text-[11px]">
                              {intf.txBytes ? `${(intf.txBytes / (1024 * 1024)).toFixed(1)} MB` : '-'}
                            </td>
                            <td className="py-2.5 px-3 font-sans text-slate-500 text-[11px]">
                              {intf.comment || '-'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Tool 3: Router Logs */}
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    <h4 className="text-sm font-black text-slate-900">Log Sistem MikroTik Terbaru</h4>
                  </div>
                  <button
                    type="button"
                    onClick={handleLoadLogs}
                    disabled={isLoadingLogs}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoadingLogs ? 'animate-spin' : ''}`} />
                    <span>Tarik Log Baru</span>
                  </button>
                </div>

                <div className="bg-slate-900 text-slate-200 p-3.5 rounded-xl font-mono text-xs max-h-56 overflow-y-auto space-y-1.5">
                  {logs.length === 0 ? (
                    <div className="text-center py-4 text-slate-500 font-sans">
                      {isLoadingLogs ? 'Memuat log dari router...' : 'Klik Tarik Log Baru untuk troubleshooting.'}
                    </div>
                  ) : (
                    logs.map((log, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-[11px] leading-relaxed">
                        <span className="text-slate-500 shrink-0 font-bold">{log.time || 'now'}</span>
                        <span className="px-1.5 py-0.2 rounded bg-slate-800 text-indigo-300 text-[10px] shrink-0">
                          {log.topics || 'system'}
                        </span>
                        <span className="text-slate-200 break-words">{log.message}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: HARDWARE & TELEMETRY */}
          {activeTab === 'hardware' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                  <span className="text-[11px] text-slate-500 font-bold block">CPU Load Saat Ini</span>
                  <span className="text-2xl font-black text-slate-900">
                    {typeof mk?.cpuLoad === 'number' ? `${mk.cpuLoad}%` : '-'}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                  <span className="text-[11px] text-slate-500 font-bold block">Memori RAM Bebas</span>
                  <span className="text-sm font-black text-slate-900">
                    {mk?.freeMemory || '-'}
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    dari {mk?.totalMemory || '-'}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                  <span className="text-[11px] text-slate-500 font-bold block">Penyimpanan HDD/NAND</span>
                  <span className="text-sm font-black text-slate-900">
                    {mk?.freeHdd || '-'}
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    dari {mk?.totalHdd || '-'}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                  <span className="text-[11px] text-slate-500 font-bold block">Arsitektur & Chip</span>
                  <span className="text-sm font-black text-slate-900 font-mono">
                    {mk?.architectureName || 'mipsbe/arm'}
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    Model: {mk?.boardName || 'RouterBOARD'}
                  </span>
                </div>
              </div>

              {/* Sample telemetry table */}
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <h4 className="text-sm font-black text-slate-900">Riwayat Sampel Sesi PPPoE Bulanan</h4>
                {mk?.samples && mk.samples.length > 0 ? (
                  <div className="max-h-48 overflow-y-auto border border-slate-100 rounded-xl">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-slate-50 border-b border-slate-200 font-sans font-bold text-slate-600 text-[10.5px]">
                        <tr>
                          <th className="py-2 px-3">Waktu Sampel</th>
                          <th className="py-2 px-3">Total Aktif</th>
                          <th className="py-2 px-3">Non-Isolir</th>
                          <th className="py-2 px-3">Isolir</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {mk.samples.slice(-15).reverse().map((s, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-2 px-3 text-slate-500">
                              {new Date(s.timestamp).toLocaleString('id-ID')}
                            </td>
                            <td className="py-2 px-3 font-bold text-slate-900">{s.activeCount}</td>
                            <td className="py-2 px-3 font-bold text-emerald-600">{s.nonIsolirCount}</td>
                            <td className="py-2 px-3 font-bold text-rose-600">{s.isolirCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">Belum ada data sampel telemetri tersimpan.</p>
                )}
              </div>
            </div>
          )}

        </div>

        {/* ================= MODAL FOOTER ================= */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>NOC MikroTik Management System Active</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs transition"
            >
              Tutup Konsol
            </button>
          </div>
        </div>

      </div>

      {/* ================= SUB-MODAL 1: KONFIRMASI ISOLIR ================= */}
      {isolateTargetUser && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md p-5 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-rose-100 text-rose-700">
                <Ban className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Konfirmasi Isolir Pelanggan</h3>
                <p className="text-xs text-slate-500">User: <b className="text-slate-800 font-mono">{isolateTargetUser.name}</b></p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Tindakan ini akan mengubah profil PPPoE Secret pelanggan ke profil <b>{isolateProfileChoice}</b> dan <b>secara otomatis memutuskan sesi aktif saat ini (kick)</b> agar pelanggan dial-in ulang dan langsung terisolir (mendapatkan IP isolir).
            </p>

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Pilih Profil Isolir Tujuan
                </label>
                <select
                  value={isolateProfileChoice}
                  onChange={(e) => setIsolateProfileChoice(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-semibold"
                >
                  <option value="isolir">isolir (Default)</option>
                  <option value="expired">expired</option>
                  {profiles
                    .filter((p) => p.name.toLowerCase().includes('isolir') || p.name.toLowerCase().includes('expired'))
                    .map((p, i) => (
                      <option key={i} value={p.name}>{p.name}</option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Catatan Alasan Isolir (Akan Ditag ke Komentar Secret)
                </label>
                <input
                  type="text"
                  value={isolateNote}
                  onChange={(e) => setIsolateNote(e.target.value)}
                  placeholder="Misal: Telat bayar invoice periode September"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsolateTargetUser(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmIsolate}
                disabled={processingUser === isolateTargetUser.name}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition disabled:opacity-50"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>{processingUser === isolateTargetUser.name ? 'Memproses Isolir...' : 'Eksekusi Isolir Sekarang'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= SUB-MODAL 2: KONFIRMASI BUKA ISOLIR ================= */}
      {unisolateTargetUser && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md p-5 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Buka Isolir Pelanggan</h3>
                <p className="text-xs text-slate-500">User: <b className="text-slate-800 font-mono">{unisolateTargetUser.name}</b></p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Pelanggan telah melunasi tagihan. Tindakan ini akan mengembalikan profil user ke paket normal dan me-refresh koneksi sehingga internet kembali lancar normal.
            </p>

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Pilih Profil Paket Pemulihan
                </label>
                <select
                  value={unisolateProfileChoice}
                  onChange={(e) => setUnisolateProfileChoice(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-semibold"
                >
                  {profiles
                    .filter((p) => !p.name.toLowerCase().includes('isolir') && !p.name.toLowerCase().includes('expired'))
                    .map((p, i) => (
                      <option key={i} value={p.name}>{p.name} {p.rateLimit ? `(${p.rateLimit})` : ''}</option>
                    ))}
                  <option value="default">default</option>
                  <option value="10M-Home">10M-Home</option>
                  <option value="20M-Family">20M-Family</option>
                  <option value="50M-Gamer">50M-Gamer</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setUnisolateTargetUser(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmUnisolate}
                disabled={processingUser === unisolateTargetUser.name}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition disabled:opacity-50"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>{processingUser === unisolateTargetUser.name ? 'Membuka Isolir...' : 'Buka Isolir Sekarang'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= SUB-MODAL 3: TAMBAH USER PPPOE SECRET BARU ================= */}
      {isAddSecretOpen && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg p-5 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-600 text-white">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Tambah User PPPoE Secret Baru</h3>
                  <p className="text-xs text-slate-500">Router: {mk?.routerName || customer.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddSecretOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSecret} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Username PPPoE *</label>
                <input
                  type="text"
                  required
                  value={addSecretForm.name}
                  onChange={(e) => setAddSecretForm({ ...addSecretForm, name: e.target.value })}
                  placeholder="Contoh: agus_blokb_12"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Password PPPoE</label>
                  <input
                    type="text"
                    value={addSecretForm.password}
                    onChange={(e) => setAddSecretForm({ ...addSecretForm, password: e.target.value })}
                    placeholder="123456"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Paket Profil *</label>
                  <select
                    value={addSecretForm.profile}
                    onChange={(e) => setAddSecretForm({ ...addSecretForm, profile: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-semibold"
                  >
                    {profiles.map((p, i) => (
                      <option key={i} value={p.name}>{p.name} {p.rateLimit ? `(${p.rateLimit})` : ''}</option>
                    ))}
                    <option value="default">default</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Service Type</label>
                  <select
                    value={addSecretForm.service}
                    onChange={(e) => setAddSecretForm({ ...addSecretForm, service: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-semibold"
                  >
                    <option value="pppoe">pppoe (Default)</option>
                    <option value="any">any</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Remote IP Statis (Opsional)</label>
                  <input
                    type="text"
                    value={addSecretForm.remoteAddress}
                    onChange={(e) => setAddSecretForm({ ...addSecretForm, remoteAddress: e.target.value })}
                    placeholder="Kosongkan jika IP pool dinamis"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Komentar / Lokasi Rumah Pelanggan</label>
                <input
                  type="text"
                  value={addSecretForm.comment}
                  onChange={(e) => setAddSecretForm({ ...addSecretForm, comment: e.target.value })}
                  placeholder="Contoh: Rumah Bpk Agus - Blok B12 RT 04"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddSecretOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingSecret}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isSavingSecret ? 'Menyimpan ke Router...' : 'Buat Secret di MikroTik'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= SUB-MODAL 4: KONFIRMASI REBOOT ROUTER ================= */}
      {isRebootConfirmOpen && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md p-5 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-rose-100 text-rose-700">
                <Power className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Reboot Router MikroTik?</h3>
                <p className="text-xs text-slate-500">{mk?.routerName || customer.name} ({mk?.host})</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Perintah ini akan menjalankan <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-800">/system reboot</code> pada router MikroTik. 
              Semua sesi pelanggan akan terputus sementara selama router memulai ulang (sekitar 30-60 detik).
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsRebootConfirmOpen(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleRebootRouter}
                disabled={isRebooting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition disabled:opacity-50"
              >
                <Power className="w-3.5 h-3.5" />
                <span>{isRebooting ? 'Mengirim Perintah...' : 'Ya, Reboot Sekarang'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
