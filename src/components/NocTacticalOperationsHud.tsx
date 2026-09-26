import React, { useState } from 'react';
import {
  Activity,
  Terminal,
  Zap,
  ShieldCheck,
  RefreshCw,
  Globe,
  Copy,
  Check,
  Wifi,
  Volume2,
  VolumeX,
  Server,
  CornerDownLeft,
  Download,
  Trash2,
  Network,
  ShieldAlert,
  Search,
  Plus,
  X,
  Clock,
  Radio,
  Sparkles,
  Phone,
  Sliders,
  CheckCheck
} from 'lucide-react';
import { formatRupiah } from '../utils/formatters';

export interface CustomerRouterItem {
  id: string;
  customerName: string;
  customerId: string;
  phone: string;
  email: string;
  routerName: string;
  host: string;
  port: number;
  username: string;
  status: 'connected' | 'error' | 'disconnected';
  rosVersion: string;
  boardName: string;
  systemIdentity: string;
  uptime: string;
  cpuLoad: number;
  freeMemory: string;
  totalMemory: string;
  voltage: string;
  temp: string;
  ratePerUser: number;
  invoicesCount: number;
  overdueCount: number;
  activePppoeCount: number;
  nonIsolirCount: number;
  isolirCount: number;
}

export interface ClientSessionItem {
  id: string;
  routerId: string;
  routerName?: string;
  customerName?: string;
  name: string;
  username: string;
  ip: string;
  mac: string;
  profile: string;
  uptime: string;
  rxTx: string;
  isOverdue: boolean;
  isIsolated: boolean;
  invoiceNumber: string;
  amount: number;
}

interface NocTacticalOperationsHudProps {
  customerRouters: CustomerRouterItem[];
  selectedRouterId: string;
  setSelectedRouterId: (id: string) => void;
  currentRouter: CustomerRouterItem | null;
  nocClientSessions: ClientSessionItem[];
  displayedClientSessions: ClientSessionItem[];
  onToggleClientIsolir: (client: ClientSessionItem) => void;
  onKickPppoeSession: (client: ClientSessionItem) => void;
  kickedSessionId: string | null;
  onEnforceMassIsolir: () => void;
  onResetAllIsolir: () => void;
  onSimulateQrisAutoUnisolir: () => void;
  onTestCustomerRouter: (router: CustomerRouterItem) => void;
  isTestingRouter: boolean;
  onSyncCustomerRouter: (router: CustomerRouterItem) => void;
  isSyncingRouter: boolean;
  isDiagnosing: boolean;
  diagnosticStep: number;
  onRunDiagnostics: () => void;
  measuredPing: number;
  liveClock: string;
  soundEnabled: boolean;
  setSoundEnabled: (val: boolean) => void;
  playCyberSynth: (freq: number, type?: OscillatorType, duration?: number) => void;
  liveNocAlert: string | null;
  setLiveNocAlert: (val: string | null) => void;
  telemetryLogsList: Array<{
    id: string;
    timestamp: string;
    category: 'qris' | 'noc' | 'dispatcher' | 'database' | 'system' | 'pppoe' | 'isolir' | 'firewall' | 'billing';
    level: 'INFO' | 'OK' | 'WARN' | 'LIVE';
    text: string;
    hash?: string;
  }>;
  setTelemetryLogsList: React.Dispatch<React.SetStateAction<any[]>>;
  onExportTelemetryLogs: () => void;
  onExecuteCli: (cmd?: string) => void;
  cliInput: string;
  setCliInput: (val: string) => void;
  onAddNewSecret: (e: React.FormEvent) => void;
  newSecretForm: {
    username: string;
    password: string;
    profile: string;
    remoteAddress: string;
    comment: string;
  };
  setNewSecretForm: React.Dispatch<React.SetStateAction<{
    username: string;
    password: string;
    profile: string;
    remoteAddress: string;
    comment: string;
  }>>;
  isAddSecretOpen: boolean;
  setIsAddSecretOpen: (val: boolean) => void;
}

export const NocTacticalOperationsHud: React.FC<NocTacticalOperationsHudProps> = ({
  customerRouters,
  selectedRouterId,
  setSelectedRouterId,
  currentRouter,
  nocClientSessions,
  displayedClientSessions,
  onToggleClientIsolir,
  onKickPppoeSession,
  kickedSessionId,
  onEnforceMassIsolir,
  onResetAllIsolir,
  onSimulateQrisAutoUnisolir,
  onTestCustomerRouter,
  isTestingRouter,
  onSyncCustomerRouter,
  isSyncingRouter,
  isDiagnosing,
  diagnosticStep,
  onRunDiagnostics,
  measuredPing,
  liveClock,
  soundEnabled,
  setSoundEnabled,
  playCyberSynth,
  liveNocAlert,
  setLiveNocAlert,
  telemetryLogsList,
  setTelemetryLogsList,
  onExportTelemetryLogs,
  onExecuteCli,
  cliInput,
  setCliInput,
  onAddNewSecret,
  newSecretForm,
  setNewSecretForm,
  isAddSecretOpen,
  setIsAddSecretOpen,
}) => {
  const [activeNocTab, setActiveNocTab] = useState<'sessions' | 'isolir' | 'diagnostics' | 'firewall'>('sessions');
  const [nocSearchTerm, setNocSearchTerm] = useState('');
  const [selectedTopologyNode, setSelectedTopologyNode] = useState<'wan' | 'core' | 'olt' | 'wireless' | 'billing'>('core');
  const [activeInterface, setActiveInterface] = useState<'ether1' | 'ether2' | 'sfp1'>('ether1');
  const [pingTarget, setPingTarget] = useState('192.168.88.1');
  const [pingPacketSize, setPingPacketSize] = useState<number>(64);
  const [isPingingTarget, setIsPingingTarget] = useState(false);
  const [firewallDropCount, setFirewallDropCount] = useState(2841);
  const [telemetryFilter, setTelemetryFilter] = useState<'all' | 'noc' | 'pppoe' | 'isolir' | 'firewall' | 'system'>('all');
  const [copiedLogId, setCopiedLogId] = useState<string | null>(null);

  const [pingPacketsList, setPingPacketsList] = useState<Array<{ seq: number; bytes: number; ttl: number; time: number; status: 'OK' | 'TIMEOUT' }>>([
    { seq: 1, bytes: 64, ttl: 64, time: 12.4, status: 'OK' },
    { seq: 2, bytes: 64, ttl: 64, time: 14.1, status: 'OK' },
    { seq: 3, bytes: 64, ttl: 64, time: 13.8, status: 'OK' },
    { seq: 4, bytes: 64, ttl: 64, time: 15.2, status: 'OK' },
  ]);

  const handleRunPingSuite = () => {
    if (isPingingTarget) return;
    setIsPingingTarget(true);
    playCyberSynth(900, 'sine', 0.08);

    setTimeout(() => {
      const packets: Array<{ seq: number; bytes: number; ttl: number; time: number; status: 'OK' | 'TIMEOUT' }> = [];
      const baseLat = pingTarget.includes('88.1') ? 8 : pingTarget.includes('8.8.8.8') ? 16 : 22;
      for (let i = 1; i <= 4; i++) {
        const t = parseFloat((baseLat + (Math.random() * 4 - 2) + (pingPacketSize > 1000 ? 5 : 0)).toFixed(1));
        packets.push({ seq: i, bytes: pingPacketSize, ttl: 64, time: t, status: 'OK' });
      }
      setPingPacketsList(packets);
      setIsPingingTarget(false);
      playCyberSynth(1250, 'triangle', 0.1);

      const avg = (packets.reduce((acc, p) => acc + p.time, 0) / packets.length).toFixed(1);
      const time = new Date().toLocaleTimeString('id-ID', { hour12: false });
      setTelemetryLogsList(prev => [
        ...prev,
        {
          id: `icmp-${Date.now()}`,
          timestamp: time,
          category: 'noc',
          level: 'OK',
          text: `ICMP Echo to ${pingTarget} (${pingPacketSize}B): 4 transmitted, 4 received, 0% loss, avg=${avg}ms.`,
          hash: `ICMP_${pingTarget}_${avg}MS`
        }
      ]);
    }, 700);
  };

  const handleCopyHash = (text: string, id: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedLogId(id);
      playCyberSynth(1350, 'sine', 0.06);
      setTimeout(() => setCopiedLogId(null), 2000);
    } catch {}
  };

  // Fleet Totals
  const fleetTotals = {
    totalRouters: customerRouters.length,
    totalSessions: customerRouters.reduce((acc, r) => acc + r.activePppoeCount, 0),
    totalIsolir: customerRouters.reduce((acc, r) => acc + r.isolirCount, 0),
    totalOverdue: customerRouters.reduce((acc, r) => acc + r.overdueCount, 0),
    avgCpu: Math.round(customerRouters.reduce((acc, r) => acc + r.cpuLoad, 0) / (customerRouters.length || 1)),
  };

  return (
    <div className="rounded-3xl border border-cyan-500/40 bg-gradient-to-br from-[#020612] via-[#050e24] to-[#01040d] p-5 sm:p-8 text-white shadow-[0_0_60px_rgba(6,182,212,0.2)] relative overflow-hidden ring-1 ring-cyan-400/30 space-y-6 backdrop-blur-2xl">
      {/* Laser-Etched Cyber Corner Brackets */}
      <div className="absolute top-2.5 left-2.5 w-4 h-4 border-t-2 border-l-2 border-cyan-400 shadow-[0_0_12px_#22d3ee] pointer-events-none" />
      <div className="absolute top-2.5 right-2.5 w-4 h-4 border-t-2 border-r-2 border-cyan-400 shadow-[0_0_12px_#22d3ee] pointer-events-none" />
      <div className="absolute bottom-2.5 left-2.5 w-4 h-4 border-b-2 border-l-2 border-cyan-400 shadow-[0_0_12px_#22d3ee] pointer-events-none" />
      <div className="absolute bottom-2.5 right-2.5 w-4 h-4 border-b-2 border-r-2 border-cyan-400 shadow-[0_0_12px_#22d3ee] pointer-events-none" />

      {/* Ambient Animated Cyber Scanline */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-400/5 to-transparent pointer-events-none animate-[cyberScan_8s_linear_infinite]" />

      {/* Top Header HUD Bar */}
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5 pb-5 border-b border-cyan-900/50">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-400/50 text-cyan-300 text-xs font-mono font-black tracking-wider shadow-[0_0_14px_rgba(6,182,212,0.35)]">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>NOC TACTICAL MATRIX v5.4</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-mono font-bold shadow-[0_0_10px_rgba(16,185,129,0.2)]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>
                {currentRouter
                  ? `ROUTER PELANGGAN: ${currentRouter.customerName} [API ONLINE]`
                  : `FLEET NOC: ${customerRouters.length} ROUTER PELANGGAN ONLINE`}
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-mono font-bold">
              <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span>{measuredPing}ms SOCKET RTT</span>
            </span>
            {liveClock && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-700/80 text-slate-300 text-xs font-mono font-bold">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>{liveClock}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 shadow-[0_0_20px_rgba(6,182,212,0.3)] shrink-0">
              <Network className="w-6 h-6 text-cyan-300" />
            </span>
            <div>
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <span>
                  {currentRouter
                    ? `MIKROTIK PELANGGAN · ${currentRouter.customerName.toUpperCase()}`
                    : `MIKROTIK NOC OPERATIONS HUD · FLEET ROUTER PELANGGAN`}
                </span>
                <Sparkles className="w-5 h-5 text-amber-400" />
              </h3>
              <p className="text-xs text-slate-400 max-w-2xl font-mono">
                {currentRouter
                  ? `Router: ${currentRouter.routerName} (${currentRouter.boardName}) · IP: ${currentRouter.host}:${currentRouter.port} · Identity: ${currentRouter.systemIdentity} · ROS: ${currentRouter.rosVersion}`
                  : `Pusat Kendali Operasi NOC Multi-Router Pelanggan: Manajemen Sesi PPPoE, Isolir Otomatis Tagihan Overdue, Monitoring CPU/RAM Real-Time, & Diagnostik Ping.`}
              </p>
            </div>
          </div>
        </div>

        {/* Right Action Hub */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              if (!soundEnabled) playCyberSynth(1080, 'sine', 0.1);
            }}
            className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center gap-1.5 text-xs font-mono font-bold ${
              soundEnabled
                ? 'bg-cyan-500/15 border-cyan-400/40 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                : 'bg-slate-900/80 border-slate-700 text-slate-500'
            }`}
            title={soundEnabled ? 'Suara HUD Aktif' : 'Mute'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">{soundEnabled ? 'SFX ON' : 'SFX OFF'}</span>
          </button>

          <button
            onClick={onRunDiagnostics}
            disabled={isDiagnosing}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-lg shadow-cyan-500/25 transition active:scale-95 disabled:opacity-50 border border-cyan-400/40 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isDiagnosing ? 'animate-spin' : ''}`} />
            <span>{isDiagnosing ? `Audit (${diagnosticStep}/4)...` : '⚡ Audit NOC'}</span>
          </button>

          <button
            onClick={() => setIsAddSecretOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-400/50 text-xs font-bold text-cyan-200 transition active:scale-95 cursor-pointer shadow-lg shadow-cyan-500/20"
            title="Tambah PPPoE Secret ke Router Pelanggan"
          >
            <Plus className="w-3.5 h-3.5 text-cyan-400" />
            <span>+ Secret PPPoE</span>
          </button>

          {currentRouter && (
            <button
              onClick={() => onTestCustomerRouter(currentRouter)}
              disabled={isTestingRouter}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-400/50 text-xs font-bold text-indigo-200 transition active:scale-95 cursor-pointer shadow-lg shadow-indigo-500/20 disabled:opacity-50"
              title="Uji Koneksi Socket API Port 8728 ke Router Pelanggan Ini"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTestingRouter ? 'animate-spin' : ''}`} />
              <span>{isTestingRouter ? 'Testing API...' : '⚡ Tes Socket'}</span>
            </button>
          )}

          <button
            onClick={onEnforceMassIsolir}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600/30 hover:bg-rose-600/50 border border-rose-500/40 text-xs font-bold text-rose-200 transition active:scale-95 cursor-pointer shadow-lg shadow-rose-500/20"
            title="Eksekusi isolir firewall MikroTik untuk pelanggan jatuh tempo"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span>Isolir Overdue ({nocClientSessions.filter(c => c.isOverdue).length})</span>
          </button>

          <button
            onClick={onSimulateQrisAutoUnisolir}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-400/40 text-xs font-bold text-emerald-200 transition active:scale-95 cursor-pointer shadow-lg shadow-emerald-500/20"
            title="Simulasikan pembayaran QRIS dan un-isolir real-time"
          >
            <Zap className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
            <span>Bayar QRIS & Unisolir</span>
          </button>
        </div>
      </div>

      {/* Live NOC Alert Banner */}
      {liveNocAlert && (
        <div className="relative z-10 p-3.5 rounded-2xl bg-cyan-950/80 border border-cyan-400/50 text-cyan-200 flex items-center justify-between text-xs font-mono shadow-[0_0_20px_rgba(6,182,212,0.25)] animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
            <span className="font-bold">{liveNocAlert}</span>
          </div>
          <button
            onClick={() => setLiveNocAlert(null)}
            className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 hover:text-white transition cursor-pointer text-[11px]"
          >
            Tutup
          </button>
        </div>
      )}

      {/* ================= 1. FLEET ROUTER MIKROTIK PELANGGAN SELECTOR & CAROUSEL ================= */}
      <div className="relative z-10 p-4 sm:p-5 rounded-2xl bg-slate-950/90 border border-cyan-500/30 space-y-3 font-mono">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              FLEET ROUTER MIKROTIK PELANGGAN TERHUBUNG (NOC MESH)
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
            <span>Routers: <strong className="text-cyan-400">{fleetTotals.totalRouters}</strong></span>
            <span>Total Sesi: <strong className="text-white">{fleetTotals.totalSessions}</strong></span>
            <span>Terisolir: <strong className="text-rose-400">{fleetTotals.totalIsolir}</strong></span>
            <span>Overdue: <strong className="text-amber-400">{fleetTotals.totalOverdue}</strong></span>
            <span>Avg CPU: <strong className="text-emerald-400">{fleetTotals.avgCpu}%</strong></span>
          </div>
        </div>

        {/* Carousel / Switcher Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-1">
          {/* Option All */}
          <div
            onClick={() => {
              setSelectedRouterId('all');
              playCyberSynth(900, 'sine', 0.05);
            }}
            className={`p-3 rounded-xl border transition cursor-pointer space-y-1.5 ${
              selectedRouterId === 'all'
                ? 'bg-cyan-950/70 border-cyan-400 ring-1 ring-cyan-400/50 shadow-[0_0_15px_rgba(6,182,212,0.35)]'
                : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-cyan-400 font-bold uppercase">GLOBAL VIEW</span>
              <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
            </div>
            <div className="font-bold text-white text-xs truncate">🌐 Semua Router Pelanggan</div>
            <div className="text-[10px] text-slate-400">
              {fleetTotals.totalRouters} Router · {fleetTotals.totalSessions} Sesi PPPoE
            </div>
          </div>

          {/* Individual Customer Routers */}
          {customerRouters.map((router) => {
            const isSelected = selectedRouterId === router.id;
            return (
              <div
                key={router.id}
                onClick={() => {
                  setSelectedRouterId(router.id);
                  setPingTarget(router.host);
                  playCyberSynth(960, 'sine', 0.06);
                }}
                className={`p-3 rounded-xl border transition cursor-pointer space-y-1.5 ${
                  isSelected
                    ? 'bg-indigo-950/70 border-indigo-400 ring-1 ring-indigo-400/50 shadow-[0_0_15px_rgba(99,102,241,0.35)]'
                    : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400 truncate max-w-[120px]">{router.boardName}</span>
                  <span className="inline-flex items-center gap-1 text-emerald-400 font-bold text-[9px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    ONLINE
                  </span>
                </div>
                <div className="font-bold text-white text-xs truncate" title={router.customerName}>
                  {router.customerName}
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                  <span className="text-cyan-300 font-mono">{router.host}</span>
                  <span className="text-slate-300 font-bold">{router.activePppoeCount} Sesi</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Expanded Active Customer Router Telemetry Bar */}
        {currentRouter && (
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-cyan-800/50 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs text-slate-300 animate-in fade-in">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-white font-bold text-sm">
                  {currentRouter.customerName} ({currentRouter.routerName})
                </span>
                <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] border border-indigo-400/30">
                  {currentRouter.boardName}
                </span>
                <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-mono border border-cyan-400/30">
                  Socket: {currentRouter.host}:{currentRouter.port}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                ROS: <b className="text-white">{currentRouter.rosVersion}</b> · Uptime: <b className="text-white">{currentRouter.uptime}</b> · CPU: <b className="text-cyan-400">{currentRouter.cpuLoad}%</b> · RAM: <b className="text-emerald-400">{currentRouter.freeMemory} / {currentRouter.totalMemory}</b> · Tarif: <b className="text-amber-300">{formatRupiah(currentRouter.ratePerUser)}/user</b>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <a
                href={`https://wa.me/${currentRouter.phone.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 text-xs font-bold border border-emerald-400/40 transition"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>WA Pelanggan</span>
              </a>

              <button
                onClick={() => onTestCustomerRouter(currentRouter)}
                disabled={isTestingRouter}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 text-xs font-bold border border-indigo-400/40 transition disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isTestingRouter ? 'animate-spin' : ''}`} />
                <span>Tes Socket API</span>
              </button>

              <button
                onClick={() => onSyncCustomerRouter(currentRouter)}
                disabled={isSyncingRouter}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-200 text-xs font-bold border border-cyan-400/40 transition disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncingRouter ? 'animate-spin' : ''}`} />
                <span>Sync Ulang Telemetri</span>
              </button>

              <button
                onClick={() => {
                  setPingTarget(currentRouter.host);
                  setActiveNocTab('diagnostics');
                  playCyberSynth(900, 'sine', 0.05);
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition cursor-pointer"
              >
                <Wifi className="w-3 h-3 text-cyan-400" />
                <span>Ping Host</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ================= 2. LIVE TOPOLOGY RADAR & INTERFACE OSCILLOSCOPE ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 relative z-10 font-mono">
        {/* Left: Interactive Topology Mesh (7 Cols) */}
        <div className="lg:col-span-7 p-4 sm:p-5 rounded-2xl bg-slate-950/90 border border-cyan-500/30 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-cyan-300 flex items-center gap-2">
              <Globe className="w-4 h-4 text-cyan-400" />
              <span>TOPOLOGI DISTRIBUSI NOC & ROUTER PELANGGAN</span>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-400/30">
              Pilih Node Inspeksi
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
            {/* Node 1: WAN */}
            <div
              onClick={() => {
                setSelectedTopologyNode('wan');
                playCyberSynth(880, 'sine', 0.06);
              }}
              className={`p-3 rounded-xl border transition cursor-pointer space-y-1.5 ${
                selectedTopologyNode === 'wan'
                  ? 'bg-cyan-950/60 border-cyan-400 ring-1 ring-cyan-400/40 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                  : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-slate-400">UPLINK WAN</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
              </div>
              <div className="font-bold text-white text-[11px] truncate">1 Gbps Metro-E</div>
              <div className="text-[10px] text-cyan-300">Rx: 342.8M · Tx: 48.2M</div>
            </div>

            {/* Node 2: Core Router or Selected Customer Router */}
            <div
              onClick={() => {
                setSelectedTopologyNode('core');
                playCyberSynth(940, 'sine', 0.06);
              }}
              className={`p-3 rounded-xl border transition cursor-pointer space-y-1.5 ${
                selectedTopologyNode === 'core'
                  ? 'bg-indigo-950/60 border-indigo-400 ring-1 ring-indigo-400/40 shadow-[0_0_15px_rgba(99,102,241,0.3)]'
                  : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-slate-400">
                  {currentRouter ? 'ROUTER PELANGGAN' : 'CORE FLEET'}
                </span>
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#22d3ee]" />
              </div>
              <div className="font-bold text-white text-[11px] truncate">
                {currentRouter ? currentRouter.routerName : 'RB4011 Core Gateway'}
              </div>
              <div className="text-[10px] text-indigo-300">
                {currentRouter ? `${currentRouter.host}:${currentRouter.port}` : '192.168.88.1:8728'}
              </div>
            </div>

            {/* Node 3: OLT GPON */}
            <div
              onClick={() => {
                setSelectedTopologyNode('olt');
                playCyberSynth(1000, 'sine', 0.06);
              }}
              className={`p-3 rounded-xl border transition cursor-pointer space-y-1.5 ${
                selectedTopologyNode === 'olt'
                  ? 'bg-emerald-950/60 border-emerald-400 ring-1 ring-emerald-400/40 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                  : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-slate-400">DISTRIBUSI GPON</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
              </div>
              <div className="font-bold text-white text-[11px] truncate">OLT 16-Port PON</div>
              <div className="text-[10px] text-emerald-300">116 ONT Fiber Optik</div>
            </div>

            {/* Node 4: Wireless */}
            <div
              onClick={() => {
                setSelectedTopologyNode('wireless');
                playCyberSynth(1060, 'sine', 0.06);
              }}
              className={`p-3 rounded-xl border transition cursor-pointer space-y-1.5 ${
                selectedTopologyNode === 'wireless'
                  ? 'bg-amber-950/60 border-amber-400 ring-1 ring-amber-400/40 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                  : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-slate-400">WIRELESS CPE</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
              </div>
              <div className="font-bold text-white text-[11px] truncate">5GHz AC Sektor</div>
              <div className="text-[10px] text-amber-300">62 Klien Wireless</div>
            </div>

            {/* Node 5: Billing & QRIS */}
            <div
              onClick={() => {
                setSelectedTopologyNode('billing');
                playCyberSynth(1120, 'sine', 0.06);
              }}
              className={`p-3 rounded-xl border transition cursor-pointer space-y-1.5 col-span-2 sm:col-span-2 ${
                selectedTopologyNode === 'billing'
                  ? 'bg-purple-950/60 border-purple-400 ring-1 ring-purple-400/40 shadow-[0_0_15px_rgba(192,132,252,0.3)]'
                  : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-slate-400">BILLING & AUTO-ISOLIR DAEMON</span>
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse shadow-[0_0_8px_#c084fc]" />
              </div>
              <div className="font-bold text-white text-[11px]">InvoiceKilat MikroTik API Engine</div>
              <div className="text-[10px] text-purple-300">Sinkronisasi Otomatis 2-Arah (&lt; 0.4s Unisolir QRIS)</div>
            </div>
          </div>

          {/* Node detail message */}
          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-slate-300">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Telemetri Node Terpilih:</span>
              <span className="text-white font-bold">
                {selectedTopologyNode === 'wan' && 'Uplink Metro-E Fiber 1 Gbps · Gateway ISP: 103.144.20.1 · Link: UP (0 CRC)'}
                {selectedTopologyNode === 'core' && (currentRouter ? `${currentRouter.customerName} · ${currentRouter.routerName} (${currentRouter.boardName}) · Socket ${currentRouter.host}:${currentRouter.port} Aktif` : 'MikroTik RB4011 Core Router · Socket 8728 Aktif')}
                {selectedTopologyNode === 'olt' && 'OLT GPON Core 16-Port · Rata-rata RX Optik: -18.4 dBm · Redaman Normal'}
                {selectedTopologyNode === 'wireless' && 'Base Station 5GHz AC MIMO 2x2 · CCQ: 98% · Noise Floor: -99 dBm'}
                {selectedTopologyNode === 'billing' && 'Billing Auto-Isolir Daemon · Address-List: "ISOLIR" · Webhook QRIS Siap'}
              </span>
            </div>
            <span className="px-2.5 py-1 rounded bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-400/30 text-[10px] shrink-0">
              STATUS: OPTIMAL
            </span>
          </div>
        </div>

        {/* Right: Interface Oscilloscope (5 Cols) */}
        <div className="lg:col-span-5 p-4 sm:p-5 rounded-2xl bg-slate-950/90 border border-cyan-500/30 space-y-3 font-mono">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>TRAFFIC OSCILLOSCOPE</span>
            </span>

            <div className="flex items-center gap-1 text-[10px]">
              {(['ether1', 'ether2', 'sfp1'] as const).map((iface) => (
                <button
                  key={iface}
                  onClick={() => {
                    setActiveInterface(iface);
                    playCyberSynth(900, 'sine', 0.05);
                  }}
                  className={`px-2 py-0.5 rounded font-bold transition uppercase cursor-pointer ${
                    activeInterface === iface
                      ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-400/40'
                      : 'bg-slate-900 text-slate-400 border border-slate-800'
                  }`}
                >
                  {iface}
                </button>
              ))}
            </div>
          </div>

          {/* Animated Sine Waveform Path */}
          <div className="h-28 rounded-xl bg-slate-950 border border-slate-800/80 p-2 relative overflow-hidden flex items-center justify-center">
            <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:12px_12px] opacity-40 pointer-events-none" />
            <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 300 80">
              <path
                d={
                  activeInterface === 'ether1'
                    ? "M 0 40 Q 30 10, 60 40 T 120 40 T 180 40 T 240 40 T 300 40"
                    : activeInterface === 'ether2'
                    ? "M 0 40 Q 25 15, 50 40 T 100 40 T 150 40 T 200 40 T 250 40 T 300 40"
                    : "M 0 40 Q 40 20, 80 40 T 160 40 T 240 40 T 300 40"
                }
                fill="none"
                stroke="#22d3ee"
                strokeWidth="2.5"
                className="animate-pulse"
              />
              <path
                d={
                  activeInterface === 'ether1'
                    ? "M 0 40 Q 30 65, 60 40 T 120 40 T 180 40 T 240 40 T 300 40"
                    : activeInterface === 'ether2'
                    ? "M 0 40 Q 25 60, 50 40 T 100 40 T 150 40 T 200 40 T 250 40 T 300 40"
                    : "M 0 40 Q 40 55, 80 40 T 160 40 T 240 40 T 300 40"
                }
                fill="none"
                stroke="#818cf8"
                strokeWidth="1.5"
                strokeDasharray="4 2"
              />
            </svg>

            <div className="absolute top-2 left-2 text-[10px] text-cyan-400 font-bold bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
              RX: {activeInterface === 'ether1' ? '342.8 Mbps' : activeInterface === 'ether2' ? '46.5 Mbps' : '12.4 Mbps'}
            </div>
            <div className="absolute top-2 right-2 text-[10px] text-indigo-400 font-bold bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
              TX: {activeInterface === 'ether1' ? '48.2 Mbps' : activeInterface === 'ether2' ? '328.4 Mbps' : '184.2 Mbps'}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-500 block">PACKET RATE</span>
              <span className="text-white font-bold">42.1 kpps</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-500 block">CRC ERRORS</span>
              <span className="text-emerald-400 font-bold">0 ERROR</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-500 block">LINK STATE</span>
              <span className="text-emerald-400 font-bold">FULL 1G</span>
            </div>
          </div>
        </div>
      </div>

      {/* ================= 3. NOC FUNCTIONAL WORKSTATIONS (TABS) ================= */}
      <div className="relative z-10 rounded-2xl bg-slate-950/90 border border-cyan-500/30 p-5 sm:p-6 shadow-xl space-y-4">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/90">
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono font-bold">
            <button
              onClick={() => {
                setActiveNocTab('sessions');
                playCyberSynth(900, 'sine', 0.05);
              }}
              className={`px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center gap-2 ${
                activeNocTab === 'sessions'
                  ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-400/50 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Server className="w-3.5 h-3.5" />
              <span>👥 Sesi PPPoE & Akun Klien ({displayedClientSessions.length})</span>
            </button>

            <button
              onClick={() => {
                setActiveNocTab('isolir');
                playCyberSynth(950, 'sine', 0.05);
              }}
              className={`px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center gap-2 ${
                activeNocTab === 'isolir'
                  ? 'bg-rose-500/25 text-rose-300 border border-rose-400/50 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              <span>🛡️ Otomasi Isolir Tagihan ({displayedClientSessions.filter(c => c.isIsolated).length})</span>
            </button>

            <button
              onClick={() => {
                setActiveNocTab('diagnostics');
                playCyberSynth(1000, 'sine', 0.05);
              }}
              className={`px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center gap-2 ${
                activeNocTab === 'diagnostics'
                  ? 'bg-indigo-500/25 text-indigo-300 border border-indigo-400/50 shadow-[0_0_12px_rgba(99,102,241,0.3)]'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Wifi className="w-3.5 h-3.5" />
              <span>🌐 Diagnostik ICMP Ping</span>
            </button>

            <button
              onClick={() => {
                setActiveNocTab('firewall');
                playCyberSynth(1050, 'sine', 0.05);
              }}
              className={`px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center gap-2 ${
                activeNocTab === 'firewall'
                  ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-400/50 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>🔒 Firewall & Security Shield</span>
            </button>
          </div>

          <span className="text-[11px] font-mono text-cyan-400 hidden sm:inline">
            NOC WORKSTATION ONLINE
          </span>
        </div>

        {/* TAB 1: Sesi PPPoE & Akun Klien Pelanggan */}
        {activeNocTab === 'sessions' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={nocSearchTerm}
                  onChange={(e) => setNocSearchTerm(e.target.value)}
                  placeholder="Cari klien, username, IP, nama router pelanggan..."
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 py-1.5 pl-9 pr-3 text-xs font-mono text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                <button
                  onClick={() => setIsAddSecretOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah User PPPoE</span>
                </button>
                <span className="text-slate-400">Total:</span>
                <span className="font-bold text-white">{displayedClientSessions.length} Klien</span>
                <span className="text-slate-500">|</span>
                <span className="text-emerald-400 font-bold">
                  {displayedClientSessions.filter(c => !c.isIsolated).length} Aktif
                </span>
                <span className="text-slate-500">|</span>
                <span className="text-rose-400 font-bold">
                  {displayedClientSessions.filter(c => c.isIsolated).length} Terisolir
                </span>
              </div>
            </div>

            {/* Sessions Table */}
            <div className="rounded-xl border border-slate-800 overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 text-[11px]">
                  <tr>
                    <th className="p-3">Pelanggan / Username PPPoE</th>
                    <th className="p-3">Router Pelanggan</th>
                    <th className="p-3">Alamat IP & MAC</th>
                    <th className="p-3">Paket / Profil</th>
                    <th className="p-3">Uptime & Throughput</th>
                    <th className="p-3">Status Tagihan / Isolir</th>
                    <th className="p-3 text-right">Aksi Operator NOC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {displayedClientSessions
                    .filter(c => {
                      if (!nocSearchTerm) return true;
                      const term = nocSearchTerm.toLowerCase();
                      return (
                        c.name.toLowerCase().includes(term) ||
                        c.username.toLowerCase().includes(term) ||
                        c.ip.toLowerCase().includes(term) ||
                        (c.customerName && c.customerName.toLowerCase().includes(term)) ||
                        (c.routerName && c.routerName.toLowerCase().includes(term))
                      );
                    })
                    .map((client) => (
                      <tr key={client.id} className="hover:bg-slate-900/60 transition">
                        <td className="p-3">
                          <div className="font-bold text-white flex items-center gap-2">
                            <span>{client.name}</span>
                            {kickedSessionId === client.id && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 animate-pulse">
                                Kicking...
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-cyan-400">{client.username}</span>
                        </td>
                        <td className="p-3">
                          <span className="text-slate-200 block font-bold truncate max-w-[130px]">
                            {client.customerName || 'Router Pelanggan'}
                          </span>
                          <span className="text-[10px] text-indigo-300">{client.routerName}</span>
                        </td>
                        <td className="p-3">
                          <span className="text-slate-200 block font-bold">{client.ip}</span>
                          <span className="text-[10px] text-slate-500">{client.mac}</span>
                        </td>
                        <td className="p-3">
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                            client.isIsolated
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-slate-800 text-slate-300'
                          }`}>
                            {client.profile}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="text-slate-300 block">{client.uptime}</span>
                          <span className="text-[10px] text-cyan-400">{client.rxTx}</span>
                        </td>
                        <td className="p-3">
                          {client.isIsolated ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-[0_0_8px_rgba(244,63,94,0.3)]">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                              <span>TERISOLIR (OVERDUE)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              <span>LUNAS (AKTIF)</span>
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => onKickPppoeSession(client)}
                              disabled={kickedSessionId === client.id}
                              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] border border-slate-700 transition cursor-pointer"
                              title="Putus & Reset Sesi PPPoE"
                            >
                              Kick
                            </button>

                            <button
                              onClick={() => onToggleClientIsolir(client)}
                              className={`px-2 py-1 rounded text-[10px] font-bold border transition cursor-pointer ${
                                client.isIsolated
                                  ? 'bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border-emerald-500/40'
                                  : 'bg-rose-600/30 hover:bg-rose-600/50 text-rose-300 border-rose-500/40'
                              }`}
                              title={client.isIsolated ? 'Buka Blokir (Unisolir)' : 'Isolir Klien Ini'}
                            >
                              {client.isIsolated ? 'Unisolir' : 'Isolir'}
                            </button>

                            <button
                              onClick={() => {
                                setPingTarget(client.ip);
                                setActiveNocTab('diagnostics');
                                playCyberSynth(900, 'sine', 0.05);
                              }}
                              className="px-2 py-1 rounded bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-300 text-[10px] border border-cyan-400/30 transition cursor-pointer"
                              title="Uji Ping ke CPE Router Klien"
                            >
                              Ping
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: Otomasi Isolir Tagihan & Billing Sync */}
        {activeNocTab === 'isolir' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3 font-mono">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    <span>Arsitektur Otomasi Isolir MikroTik Router Pelanggan (Zero Touch)</span>
                  </h4>
                  <p className="text-xs text-slate-400">
                    Sistem sinkronisasi 2-arah: Tagihan overdue diisolir via Port 8728, pembayaran QRIS Dinamis buka isolir &lt; 0.4 detik!
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded bg-rose-500/20 text-rose-300 text-xs font-bold border border-rose-500/30">
                  POOL ISOLIR: {displayedClientSessions.filter(c => c.isIsolated).length} KLIEN
                </span>
              </div>

              {/* 4 Steps Interactive Pipeline */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-2 text-xs">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-cyan-400 font-bold block text-[10px]">TAHAP 1: DETEKSI</span>
                  <span className="text-white font-bold block">Faktur Jatuh Tempo</span>
                  <p className="text-[10px] text-slate-400">InvoiceKilat mendeteksi tagihan jatuh tempo H+1.</p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-rose-400 font-bold block text-[10px]">TAHAP 2: REST API</span>
                  <span className="text-white font-bold block">Injeksi Address-List</span>
                  <p className="text-[10px] text-slate-400">
                    RouterOS menambahkan IP ke list `ISOLIR` via Port 8728 instan.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-amber-400 font-bold block text-[10px]">TAHAP 3: NAT REDIRECT</span>
                  <span className="text-white font-bold block">Portal Tagihan QRIS</span>
                  <p className="text-[10px] text-slate-400">Port 80/443 dialihkan ke Web Portal Bayar QRIS Dinamis.</p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-emerald-400 font-bold block text-[10px]">TAHAP 4: WEBHOOK UNISOLIR</span>
                  <span className="text-white font-bold block">Akses Pulih &lt; 0.4s</span>
                  <p className="text-[10px] text-slate-400">Scan bayar QRIS ➔ Webhook DANA hapus IP dari list ISOLIR.</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
                <span className="text-xs text-slate-400">Aksi Operator NOC:</span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={onEnforceMassIsolir}
                    className="px-3.5 py-2 rounded-xl bg-rose-600/30 hover:bg-rose-600/50 border border-rose-500/40 text-xs font-bold text-rose-200 transition cursor-pointer"
                  >
                    Jalankan Isolir Overdue ({displayedClientSessions.filter(c => c.isOverdue).length})
                  </button>
                  <button
                    onClick={onResetAllIsolir}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition cursor-pointer"
                  >
                    Buka Blokir Semua Klien
                  </button>
                  <button
                    onClick={onSimulateQrisAutoUnisolir}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition active:scale-95 shadow-lg shadow-emerald-500/25 cursor-pointer"
                  >
                    ✨ Simulasi Bayar QRIS & Auto-Unisolir Real-Time
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Diagnostik ICMP Ping ke Router Pelanggan */}
        {activeNocTab === 'diagnostics' && (
          <div className="space-y-4 animate-in fade-in duration-200 font-mono">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-0.5">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-cyan-400" />
                  <span>ICMP Ping Diagnostic Suite ke Router Pelanggan & Gateway</span>
                </h4>
                <p className="text-xs text-slate-400">
                  Uji latensi RTT langsung ke IP router MikroTik pelanggan, gateway WAN, atau IP CPE.
                </p>
              </div>

              <button
                onClick={handleRunPingSuite}
                disabled={isPingingTarget}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold transition active:scale-95 disabled:opacity-50 shadow-lg shadow-cyan-500/25 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isPingingTarget ? 'animate-spin' : ''}`} />
                <span>{isPingingTarget ? 'Mengirim Paket...' : 'Kirim Paket ICMP Ping'}</span>
              </button>
            </div>

            {/* Quick Target Buttons */}
            <div className="flex flex-wrap items-center gap-2.5 p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs">
              <span className="text-slate-400">Target Router Pelanggan:</span>
              {customerRouters.map((router) => (
                <button
                  key={router.id}
                  onClick={() => {
                    setPingTarget(router.host);
                    playCyberSynth(900, 'sine', 0.05);
                  }}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                    pingTarget === router.host
                      ? 'bg-cyan-500 text-slate-950 font-black shadow-[0_0_10px_#22d3ee]'
                      : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  {router.customerName} ({router.host})
                </button>
              ))}
              <button
                onClick={() => setPingTarget('8.8.8.8')}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  pingTarget === '8.8.8.8'
                    ? 'bg-cyan-500 text-slate-950 font-black'
                    : 'bg-slate-950 text-slate-400 border border-slate-800'
                }`}
              >
                Google DNS (8.8.8.8)
              </button>

              <div className="flex items-center gap-2 ml-auto">
                <span className="text-slate-400">Ukuran:</span>
                {[64, 512, 1500].map((sz) => (
                  <button
                    key={sz}
                    onClick={() => setPingPacketSize(sz)}
                    className={`px-2 py-0.5 rounded text-[10px] transition cursor-pointer ${
                      pingPacketSize === sz
                        ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-400 font-bold'
                        : 'bg-slate-950 text-slate-400 border border-slate-800'
                    }`}
                  >
                    {sz}B
                  </button>
                ))}
              </div>
            </div>

            {/* Results Table */}
            <div className="rounded-xl border border-slate-800 overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-900 text-slate-400 text-[10px]">
                  <tr>
                    <th className="p-2.5">Seq #</th>
                    <th className="p-2.5">Bytes</th>
                    <th className="p-2.5">Target IP</th>
                    <th className="p-2.5">TTL</th>
                    <th className="p-2.5">RTT Latency</th>
                    <th className="p-2.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-950">
                  {pingPacketsList.map((pkt) => (
                    <tr key={pkt.seq} className="hover:bg-slate-900/50">
                      <td className="p-2.5 text-slate-400">icmp_seq={pkt.seq}</td>
                      <td className="p-2.5 text-slate-300">{pkt.bytes} bytes</td>
                      <td className="p-2.5 text-cyan-300 font-bold">{pingTarget}</td>
                      <td className="p-2.5 text-slate-400">ttl={pkt.ttl}</td>
                      <td className="p-2.5 text-emerald-400 font-black">{pkt.time} ms</td>
                      <td className="p-2.5 text-right">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                          SUCCESS
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-center">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">Min Latency</span>
                <span className="text-lg font-black text-cyan-400">
                  {Math.min(...pingPacketsList.map(p => p.time))} ms
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">Avg Latency</span>
                <span className="text-lg font-black text-emerald-400">
                  {(pingPacketsList.reduce((acc, p) => acc + p.time, 0) / pingPacketsList.length).toFixed(1)} ms
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">Max Latency</span>
                <span className="text-lg font-black text-indigo-400">
                  {Math.max(...pingPacketsList.map(p => p.time))} ms
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">Jitter</span>
                <span className="text-lg font-black text-amber-400">1.2 ms</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 col-span-2 sm:col-span-1">
                <span className="text-[10px] text-slate-500 uppercase block">Packet Loss</span>
                <span className="text-lg font-black text-emerald-400">0.0%</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Firewall & Security Shield */}
        {activeNocTab === 'firewall' && (
          <div className="space-y-4 animate-in fade-in duration-200 font-mono">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Status Proteksi Firewall & Filtrasi MikroTik RouterOS Pelanggan</span>
                </h4>
                <p className="text-xs text-slate-400">
                  Filtrasi brute-force WinBox/SSH, port-scanning auto-drop, mitigasi SYN-Flood, dan isolir otomatis.
                </p>
              </div>

              <button
                onClick={() => {
                  setFirewallDropCount(prev => prev + 14);
                  playCyberSynth(700, 'square', 0.1);
                  setLiveNocAlert('Simulasi drop paket penyerang berhasil diuji pada firewall router!');
                  setTimeout(() => setLiveNocAlert(null), 4000);
                }}
                className="px-3.5 py-2 rounded-xl bg-rose-600/30 hover:bg-rose-600/50 border border-rose-500/40 text-xs font-bold text-rose-300 transition cursor-pointer"
              >
                Simulasikan Drop Paket (+14)
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-[10px]">SYN-FLOOD PROTECTION</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                </div>
                <span className="text-white font-bold block">Rate-Limit 100 pkt/s</span>
                <span className="text-[10px] text-emerald-400">Status: ARMED & AKTIF</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-[10px]">PORT SCAN DETECTION</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                </div>
                <span className="text-white font-bold block">Auto-Drop PSD</span>
                <span className="text-[10px] text-emerald-400">Weight 21 · 3 hits</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-[10px]">BRUTE-FORCE WINBOX / SSH</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                </div>
                <span className="text-white font-bold block">Port 8291 / 22 SSH</span>
                <span className="text-[10px] text-cyan-300">0 IP Blacklisted</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-[10px]">TOTAL DROPPED PACKETS</span>
                  <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse shadow-[0_0_8px_#f43f5e]" />
                </div>
                <span className="text-lg font-black text-rose-300 block">{firewallDropCount} Packets</span>
                <span className="text-[10px] text-slate-400">Zero Impact on Router WAN</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ================= 4. LIVE SYSLOG STREAM & INTERACTIVE ROUTEROS CLI ================= */}
      <div className="p-5 rounded-2xl bg-slate-950 border border-cyan-900/40 space-y-3.5 font-mono relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-slate-200">
              MikroTik RouterOS Live Syslog & Interactive CLI Console
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-400/20">
              Port 8728 Stream
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 overflow-x-auto text-[10px]">
              {(['all', 'noc', 'pppoe', 'isolir', 'firewall', 'system'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => {
                    setTelemetryFilter(filter);
                    playCyberSynth(900, 'sine', 0.05);
                  }}
                  className={`px-2.5 py-1 rounded-lg font-bold transition uppercase cursor-pointer ${
                    telemetryFilter === filter
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            <button
              onClick={onExportTelemetryLogs}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-[10px] font-bold border border-slate-800 transition cursor-pointer"
              title="Ekspor Syslog ke JSON"
            >
              <Download className="w-3 h-3 text-cyan-400" />
              <span className="hidden sm:inline">Ekspor</span>
            </button>

            <button
              onClick={() => {
                setTelemetryLogsList([]);
                playCyberSynth(750, 'sine', 0.05);
              }}
              className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-rose-400 text-[10px] border border-slate-800 transition cursor-pointer"
              title="Bersihkan Syslog"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Syslog Rows */}
        <div className="space-y-2 text-xs max-h-56 overflow-y-auto pr-1 no-scrollbar">
          {telemetryLogsList
            .filter(item => telemetryFilter === 'all' || item.category === telemetryFilter)
            .map((log) => (
              <div 
                key={log.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-2 rounded-xl bg-slate-900/60 border border-slate-800/60 hover:border-cyan-500/40 hover:bg-slate-900 transition"
              >
                <div className="flex items-center gap-2.5">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    log.category === 'pppoe'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30'
                      : log.category === 'noc'
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/30'
                      : log.category === 'isolir'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-400/30'
                      : log.category === 'firewall'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                      : log.category === 'billing'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                      : 'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}>
                    [{log.category.toUpperCase()}]
                  </span>
                  <span className="text-slate-300 text-xs">{log.text}</span>
                </div>

                <div className="flex items-center gap-2 text-[10px] text-slate-500 shrink-0 self-end sm:self-auto">
                  <span>{log.timestamp}</span>
                  {log.hash && (
                    <button
                      onClick={() => handleCopyHash(log.hash!, log.id)}
                      className="text-slate-400 hover:text-cyan-300 p-0.5 cursor-pointer transition"
                      title="Salin Hash"
                    >
                      {copiedLogId === log.id ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
        </div>

        {/* CLI Console Form */}
        <div className="pt-2 border-t border-slate-800 space-y-2">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              onExecuteCli();
            }}
            className="flex items-center gap-2 bg-slate-900/90 rounded-xl border border-slate-800 focus-within:border-cyan-400/60 p-1.5 px-3 transition"
          >
            <span className="text-xs font-mono font-bold text-cyan-400 shrink-0 select-none">
              admin@{currentRouter ? currentRouter.systemIdentity : 'MikroTik-NOC'}:~$
            </span>
            <input
              type="text"
              value={cliInput}
              onChange={(e) => setCliInput(e.target.value)}
              placeholder="Perintah RouterOS (/ping, /ppp active, /isolate-overdue, /firewall, /system resource, /help)..."
              className="w-full bg-transparent text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none"
            />
            <button
              type="submit"
              className="p-1 rounded-lg bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500 hover:text-slate-950 transition cursor-pointer shrink-0"
              title="Jalankan Perintah"
            >
              <CornerDownLeft className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Quick Command Chips */}
          <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400">
            <span className="text-slate-500">Quick Commands:</span>
            {[
              { cmd: currentRouter ? `/ping ${currentRouter.host}` : '/ping 192.168.88.1', label: '🌐 /ping' },
              { cmd: '/ppp active', label: '👥 /ppp active' },
              { cmd: '/isolate-overdue', label: '🛡️ /isolate-overdue' },
              { cmd: '/unsolir-all', label: '🔓 /unsolir-all' },
              { cmd: '/interface', label: '🔌 /interface' },
              { cmd: '/firewall', label: '🔒 /firewall' },
              { cmd: '/system resource', label: '⚙️ /resource' },
              { cmd: '/qris-sim', label: '⚡ /qris-sim' },
              { cmd: '/help', label: '❓ /help' },
            ].map((chip) => (
              <button
                key={chip.cmd}
                type="button"
                onClick={() => onExecuteCli(chip.cmd)}
                className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border border-slate-800 transition cursor-pointer font-mono"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ================= 5. CYBER MODAL: TAMBAH SECRET PPPOE KE ROUTER PELANGGAN ================= */}
      {isAddSecretOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-3xl border border-cyan-400/60 bg-gradient-to-br from-[#020612] via-[#050e24] to-[#01040d] p-6 text-white shadow-[0_0_50px_rgba(6,182,212,0.3)] space-y-4 font-mono">
            {/* Modal Corner Laser Accents */}
            <div className="absolute top-2.5 left-2.5 w-3 h-3 border-t-2 border-l-2 border-cyan-400" />
            <div className="absolute top-2.5 right-2.5 w-3 h-3 border-t-2 border-r-2 border-cyan-400" />

            <div className="flex items-center justify-between pb-3 border-b border-cyan-900/50">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-black text-white">
                  TAMBAH SECRET PPPOE KE ROUTER PELANGGAN
                </h3>
              </div>
              <button
                onClick={() => setIsAddSecretOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={onAddNewSecret} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-bold">Target Router Pelanggan:</label>
                <select
                  value={selectedRouterId}
                  onChange={(e) => setSelectedRouterId(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 py-2 px-3 text-white focus:border-cyan-400 focus:outline-none"
                >
                  {customerRouters.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.customerName} - {r.routerName} ({r.host}:{r.port})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-bold">Username PPPoE:</label>
                  <input
                    type="text"
                    required
                    value={newSecretForm.username}
                    onChange={(e) => setNewSecretForm(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="contoh: hendra_klien05"
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 py-2 px-3 text-white placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-bold">Password:</label>
                  <input
                    type="password"
                    value={newSecretForm.password}
                    onChange={(e) => setNewSecretForm(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="******"
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 py-2 px-3 text-white placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-bold">Profil Kecepatan:</label>
                  <select
                    value={newSecretForm.profile}
                    onChange={(e) => setNewSecretForm(prev => ({ ...prev, profile: e.target.value }))}
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 py-2 px-3 text-white focus:border-cyan-400 focus:outline-none"
                  >
                    <option value="10M_HOME_BASIC">10M_HOME_BASIC (10 Mbps)</option>
                    <option value="20M_HOME_UNLIMITED">20M_HOME_UNLIMITED (20 Mbps)</option>
                    <option value="30M_HOME_TURBO">30M_HOME_TURBO (30 Mbps)</option>
                    <option value="50M_DEDICATED_PRO">50M_DEDICATED_PRO (50 Mbps)</option>
                    <option value="profile_isolir_redirect">profile_isolir_redirect (Isolir)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-bold">Remote Address (IP):</label>
                  <input
                    type="text"
                    value={newSecretForm.remoteAddress}
                    onChange={(e) => setNewSecretForm(prev => ({ ...prev, remoteAddress: e.target.value }))}
                    placeholder="10.10.20.55"
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 py-2 px-3 text-white placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-bold">Catatan / Komentar:</label>
                <input
                  type="text"
                  value={newSecretForm.comment}
                  onChange={(e) => setNewSecretForm(prev => ({ ...prev, comment: e.target.value }))}
                  placeholder="Klien Baru NOC"
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 py-2 px-3 text-white placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddSecretOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold transition shadow-lg shadow-cyan-500/25 active:scale-95 cursor-pointer"
                >
                  ⚡ Provisi ke MikroTik via API
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ambient bottom glow */}
      <div className="absolute -bottom-24 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
    </div>
  );
};
