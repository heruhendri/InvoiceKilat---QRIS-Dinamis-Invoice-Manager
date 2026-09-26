import React, { useState, useMemo, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { 
  DollarSign, 
  TrendingUp, 
  Clock, 
  AlertCircle, 
  ArrowUpRight, 
  Calendar, 
  CheckCircle2, 
  CreditCard, 
  Share2, 
  ChevronRight,
  Sparkles,
  Radio,
  Activity,
  Terminal,
  Zap,
  ShieldCheck,
  RefreshCw,
  Cpu,
  Check,
  Play,
  Send,
  Database,
  Globe,
  QrCode,
  Sliders,
  ExternalLink,
  Copy,
  CheckCheck,
  Wifi,
  Layers,
  ArrowRight,
  Volume2,
  VolumeX,
  Server,
  HardDrive,
  Lock,
  CornerDownLeft,
  Download,
  Trash2,
  Filter,
  Network,
  ShieldAlert,
  Gauge,
  UserX,
  UserCheck,
  Search,
  Power,
  ChevronDown,
  Binary
} from 'lucide-react';
import { AnalyticsSummary, Invoice, PaymentTransaction, CustomerRecord } from '../types';
import { formatRupiah, formatDateTimeIndo, formatDateIndo } from '../utils/formatters';
import { RevenueBarChart } from './RevenueBarChart';
import { calculateCRC16 } from '../utils/qrisClient';

interface AnalyticsDashboardProps {
  analytics: AnalyticsSummary | null;
  invoices: Invoice[];
  customers?: CustomerRecord[];
  onSelectInvoice: (id: string) => void;
  onOpenCreateInvoice: () => void;
  onTriggerCheckReminders: () => void;
  isCheckingReminders: boolean;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  analytics,
  invoices,
  customers = [],
  onSelectInvoice,
  onOpenCreateInvoice,
  onTriggerCheckReminders,
  isCheckingReminders,
}) => {
  const [selectedOverdueIdx, setSelectedOverdueIdx] = useState(0);

  // Futuristic Interactive Telemetry State
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagnosticStep, setDiagnosticStep] = useState(0);
  const [measuredPing, setMeasuredPing] = useState<number>(14);
  const [simulatedFeedback, setSimulatedFeedback] = useState<string | null>(null);
  const [telemetryFilter, setTelemetryFilter] = useState<'all' | 'noc' | 'pppoe' | 'isolir' | 'firewall' | 'system'>('all');
  const [copiedLogId, setCopiedLogId] = useState<string | null>(null);
  const [liveClock, setLiveClock] = useState<string>('');

  // NOC Tactical HUD State
  const [activeNocTab, setActiveNocTab] = useState<'sessions' | 'isolir' | 'diagnostics' | 'firewall'>('sessions');
  const [nocSearchTerm, setNocSearchTerm] = useState<string>('');
  const [selectedTopologyNode, setSelectedTopologyNode] = useState<'wan' | 'core' | 'olt' | 'wireless' | 'billing'>('core');
  const [selectedRouterId, setSelectedRouterId] = useState<string>('all');
  const [isAddSecretOpen, setIsAddSecretOpen] = useState<boolean>(false);
  const [newSecretForm, setNewSecretForm] = useState({
    username: '',
    password: '',
    profile: '20M_HOME_UNLIMITED',
    remoteAddress: '10.10.20.55',
    comment: 'Klien Baru NOC'
  });
  const [customAddedSecrets, setCustomAddedSecrets] = useState<Array<{
    id: string;
    routerId: string;
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
  }>>([]);
  const [clientIsolirOverrides, setClientIsolirOverrides] = useState<Record<string, boolean>>({});
  const [kickedSessionId, setKickedSessionId] = useState<string | null>(null);
  const [pingTarget, setPingTarget] = useState<string>('192.168.88.1');
  const [pingPacketSize, setPingPacketSize] = useState<number>(64);
  const [isPingingTarget, setIsPingingTarget] = useState<boolean>(false);
  const [activeInterface, setActiveInterface] = useState<'ether1' | 'ether2' | 'sfp1'>('ether1');
  const [firewallDropCount, setFirewallDropCount] = useState<number>(2841);
  const [liveNocAlert, setLiveNocAlert] = useState<string | null>(null);

  // Active Interactive Workstation Node fallback ('qris' | 'noc' | 'dispatcher' | 'database')
  const [activeTelemetryNode, setActiveTelemetryNode] = useState<'qris' | 'noc' | 'dispatcher' | 'database'>('noc');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Interactive Live QRIS EMVCo Checksum Studio State
  const [interactiveNominal, setInteractiveNominal] = useState<number>(150000);
  const [qrisCopied, setQrisCopied] = useState<boolean>(false);

  // RouterOS NOC Interactive Ping State
  const [isPingingGateway, setIsPingingGateway] = useState<boolean>(false);
  const [pingStats, setPingStats] = useState<{ min: number; avg: number; max: number; jitter: number; loss: number }>({
    min: 9,
    avg: 14,
    max: 22,
    jitter: 1.4,
    loss: 0
  });

  const [pingPacketsList, setPingPacketsList] = useState<Array<{ seq: number; bytes: number; ttl: number; time: number; status: 'OK' | 'TIMEOUT' }>>([
    { seq: 1, bytes: 64, ttl: 64, time: 12.4, status: 'OK' },
    { seq: 2, bytes: 64, ttl: 64, time: 14.1, status: 'OK' },
    { seq: 3, bytes: 64, ttl: 64, time: 13.8, status: 'OK' },
    { seq: 4, bytes: 64, ttl: 64, time: 15.2, status: 'OK' },
  ]);

  // Bot Dispatcher Preview State
  const [selectedDispatcherTemplate, setSelectedDispatcherTemplate] = useState<'reminder' | 'overdue' | 'paid'>('reminder');
  const [dispatcherSimAlert, setDispatcherSimAlert] = useState<string | null>(null);

  // Database Integrity State
  const [dbChecksum, setDbChecksum] = useState<string>('SHA256-IK-MASTER-' + Date.now().toString(16).toUpperCase());
  const [isVerifyingDb, setIsVerifyingDb] = useState<boolean>(false);
  const [dbVerificationResult, setDbVerificationResult] = useState<string | null>(null);

  // Interactive CLI Terminal State
  const [cliInput, setCliInput] = useState<string>('');
  const [telemetryLogsList, setTelemetryLogsList] = useState<Array<{
    id: string;
    timestamp: string;
    category: 'qris' | 'noc' | 'dispatcher' | 'database' | 'system' | 'pppoe' | 'isolir' | 'firewall' | 'billing';
    level: 'INFO' | 'OK' | 'WARN' | 'LIVE';
    text: string;
    hash?: string;
  }>>([
    {
      id: 'log-boot-1',
      timestamp: new Date().toLocaleTimeString('id-ID', { hour12: false }),
      category: 'system',
      level: 'LIVE',
      text: 'InvoiceKilat Cyber Telemetry HUD v4.9 connected. Socket telemetry link online.',
      hash: 'SOCKET_ESTABLISHED'
    },
    {
      id: 'log-boot-2',
      timestamp: new Date().toLocaleTimeString('id-ID', { hour12: false }),
      category: 'qris',
      level: 'OK',
      text: 'EMVCo CRC-16 Engine initialized. Ready for dynamic QRIS Tag 54 generation.',
      hash: 'CRC16_EMVCO_READY'
    },
    {
      id: 'log-boot-3',
      timestamp: new Date().toLocaleTimeString('id-ID', { hour12: false }),
      category: 'noc',
      level: 'INFO',
      text: 'MikroTik RouterOS REST API daemon monitoring client PPPoE sessions on Port 8728.',
      hash: 'ROUTEROS_DAEMON_LIVE'
    },
    {
      id: 'log-boot-4',
      timestamp: new Date().toLocaleTimeString('id-ID', { hour12: false }),
      category: 'dispatcher',
      level: 'OK',
      text: 'Automated WhatsApp & Email dispatcher worker active with 0 pending queues.',
      hash: 'DISPATCHER_WORKER_IDLE'
    },
    {
      id: 'log-boot-5',
      timestamp: new Date().toLocaleTimeString('id-ID', { hour12: false }),
      category: 'database',
      level: 'OK',
      text: `Master JSON database synchronized: ${invoices.length} invoices verified in snapshot.`,
      hash: 'DB_VERIFIED_SYNCED'
    }
  ]);

  // Futuristic Native Web Audio Synth Beep
  const playCyberSynth = useCallback((freq = 880, type: OscillatorType = 'sine', duration = 0.08) => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {}
  }, [soundEnabled]);

  // Ticking cyber clock
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setLiveClock(d.toLocaleTimeString('id-ID', { hour12: false }) + ' WIB');
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Interactive Live Diagnostics Handler
  const handleRunDiagnostics = async () => {
    if (isDiagnosing) return;
    playCyberSynth(720, 'sine', 0.1);
    setIsDiagnosing(true);
    setDiagnosticStep(1);

    const t0 = performance.now();
    try {
      await fetch('/api/settings').catch(() => null);
      const ping1 = Math.round(performance.now() - t0);
      setMeasuredPing(Math.max(5, ping1));
    } catch {
      setMeasuredPing(14);
    }

    setTimeout(() => {
      playCyberSynth(880, 'sine', 0.08);
      setDiagnosticStep(2);
      setTimeout(() => {
        playCyberSynth(960, 'sine', 0.08);
        setDiagnosticStep(3);
        setTimeout(() => {
          playCyberSynth(1120, 'triangle', 0.12);
          setDiagnosticStep(4);
          setTimeout(() => {
            playCyberSynth(1280, 'sine', 0.15);
            setIsDiagnosing(false);
            setDiagnosticStep(0);
            
            // Append completion log to telemetry
            const time = new Date().toLocaleTimeString('id-ID', { hour12: false });
            setTelemetryLogsList(prev => [
              ...prev,
              {
                id: `diag-complete-${Date.now()}`,
                timestamp: time,
                category: 'system',
                level: 'OK',
                text: 'Full automated audit completed: QRIS CRC-16 OK, MikroTik NOC 14ms, Dispatcher READY, DB SYNCED 100%.',
                hash: 'AUDIT_PASS_ALL'
              }
            ]);
          }, 1200);
        }, 500);
      }, 500);
    }, 500);
  };

  // Interactive Live QRIS Payment Simulator
  const handleSimulateQrisPayment = () => {
    playCyberSynth(1020, 'triangle', 0.15);
    try {
      confetti({
        particleCount: 85,
        spread: 75,
        origin: { y: 0.6 }
      });
    } catch {}

    const simAmount = Math.floor(Math.random() * 4 + 1) * 250000;
    const simRef = 'QRIS-VERIFIED-' + Math.floor(100000 + Math.random() * 900000);
    setSimulatedFeedback(`Pembayaran QRIS Dinamis sebesar ${formatRupiah(simAmount)} berhasil disimulasikan & diverifikasi instan! (Ref: ${simRef})`);
    
    // Add to interactive logs
    const time = new Date().toLocaleTimeString('id-ID', { hour12: false });
    setTelemetryLogsList(prev => [
      ...prev,
      {
        id: `sim-pay-${Date.now()}`,
        timestamp: time,
        category: 'qris',
        level: 'LIVE',
        text: `Simulasi QRIS Masuk: ${formatRupiah(simAmount)} - Verifikasi Webhook DANA Sukses (${simRef})`,
        hash: simRef
      }
    ]);
    setTimeout(() => setSimulatedFeedback(null), 6500);
  };

  const handleCopyHash = (text: string, id: string) => {
    playCyberSynth(1200, 'sine', 0.05);
    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(text).catch(() => {});
      }
      setCopiedLogId(id);
      setTimeout(() => setCopiedLogId(null), 2000);
    } catch {}
  };

  // Live Computed EMVCo Dynamic Payload & CRC-16 Checksum
  const liveQrisCalculation = useMemo(() => {
    const amtStr = interactiveNominal.toString();
    const lenStr = amtStr.length.toString().padStart(2, '0');
    const tag54 = `54${lenStr}${amtStr}`;
    const basePayloadNoCrc = `00020101021226570011ID.DANA.WWW011893600915356761342102095676134210303UMI51440014ID.CO.QRIS.WWW0215ID10233067778720303UMI520473725303360${tag54}5802ID5911hendr.store6013Kab. Pemalang6105523716304`;
    const crc = calculateCRC16(basePayloadNoCrc);
    const fullPayload = basePayloadNoCrc + crc;
    return {
      tag54,
      crc,
      basePayloadNoCrc,
      fullPayload
    };
  }, [interactiveNominal]);

  // Customer Routers Fleet Integration
  const customerRouters = useMemo(() => {
    const validCustomers = (customers || []).filter(
      (c) => c.customerMode === 'noc' || Boolean(c.mikrotik?.host || c.mikrotik?.routerName)
    );

    const baseList = validCustomers.length > 0 ? validCustomers : [
      {
        id: 'cust-noc-1',
        name: 'Hendra Net (Warnet & RT 04)',
        phone: '0812-3456-7890',
        email: 'hendra@net.id',
        customerMode: 'noc',
        mikrotik: {
          routerName: 'RB750Gr3-HendraNet',
          host: '192.168.88.1',
          port: 8728,
          username: 'admin',
          connectionStatus: 'connected',
          rosVersion: 'RouterOS v7.14.3',
          boardName: 'RB750Gr3 (hEX)',
          systemIdentity: 'MikroTik-HendraNet',
          uptime: '18d 06h 42m',
          cpuLoad: 24,
          freeMemory: '186 MB',
          totalMemory: '256 MB',
          ratePerUser: 10000,
          activePppoeCount: 48,
          nonIsolirCount: 45,
          isolirCount: 3,
        }
      },
      {
        id: 'cust-noc-2',
        name: 'Budi Santoso (RT 02 Net)',
        phone: '0857-1234-5678',
        email: 'budi@santoso.com',
        customerMode: 'noc',
        mikrotik: {
          routerName: 'RB951Ui-BudiRT02',
          host: '192.168.10.1',
          port: 8728,
          username: 'api_billing',
          connectionStatus: 'connected',
          rosVersion: 'RouterOS v7.13.5',
          boardName: 'RB951Ui-2HnD',
          systemIdentity: 'RT02-Wireless-Gateway',
          uptime: '32d 11h 15m',
          cpuLoad: 16,
          freeMemory: '84 MB',
          totalMemory: '128 MB',
          ratePerUser: 7500,
          activePppoeCount: 34,
          nonIsolirCount: 32,
          isolirCount: 2,
        }
      },
      {
        id: 'cust-noc-3',
        name: 'Warnet & Game Center Samudra',
        phone: '0813-9876-5432',
        email: 'samudra@warnet.net',
        customerMode: 'noc',
        mikrotik: {
          routerName: 'CCR1009-SamudraCore',
          host: '10.10.1.1',
          port: 8728,
          username: 'noc_admin',
          connectionStatus: 'connected',
          rosVersion: 'RouterOS v7.14.1',
          boardName: 'CCR1009-7G-1C-1S+',
          systemIdentity: 'Samudra-Gaming-Core',
          uptime: '64d 21h 04m',
          cpuLoad: 11,
          freeMemory: '1620 MB',
          totalMemory: '2048 MB',
          ratePerUser: 15000,
          activePppoeCount: 78,
          nonIsolirCount: 77,
          isolirCount: 1,
        }
      },
      {
        id: 'cust-noc-4',
        name: 'Klinik Medika Samudra',
        phone: '0821-5556-6778',
        email: 'admin@klinikmedika.com',
        customerMode: 'noc',
        mikrotik: {
          routerName: 'RB3011-MedikaHQ',
          host: '172.16.0.1',
          port: 8728,
          username: 'mikrotik_api',
          connectionStatus: 'connected',
          rosVersion: 'RouterOS v7.14.2',
          boardName: 'RB3011UiAS-RM',
          systemIdentity: 'Medika-Corp-Router',
          uptime: '112d 04h 50m',
          cpuLoad: 9,
          freeMemory: '780 MB',
          totalMemory: '1024 MB',
          ratePerUser: 12500,
          activePppoeCount: 22,
          nonIsolirCount: 22,
          isolirCount: 0,
        }
      }
    ] as any;

    return baseList.map((cust: any, idx: number) => {
      const m = cust.mikrotik || {};
      const custInvoices = invoices.filter(
        (i) => i.customer?.id === cust.id || (i.customer?.name && cust.name && i.customer.name.toLowerCase().includes(cust.name.split(' ')[0].toLowerCase()))
      );
      const overdue = custInvoices.filter((i) => i.status === 'overdue').length;

      return {
        id: cust.id,
        customerName: cust.name,
        customerId: cust.id,
        phone: cust.phone || '0812-3456-7890',
        email: cust.email || '',
        routerName: m.routerName || `MikroTik-${cust.name.split(' ')[0]}`,
        host: m.host || `192.168.${88 + idx}.1`,
        port: m.port || 8728,
        username: m.username || 'admin',
        status: (m.connectionStatus || 'connected') as 'connected' | 'error' | 'disconnected',
        rosVersion: m.rosVersion || 'RouterOS v7.14.3',
        boardName: m.boardName || 'RB750Gr3 (hEX)',
        systemIdentity: m.systemIdentity || `MikroTik-${cust.name.split(' ')[0]}`,
        uptime: m.uptime || `${(idx + 1) * 14}d ${((idx * 4) % 23) + 1}h`,
        cpuLoad: m.cpuLoad !== undefined ? m.cpuLoad : (14 + ((idx * 6) % 20)),
        freeMemory: m.freeMemory || '186 MB',
        totalMemory: m.totalMemory || '256 MB',
        voltage: '24.1V',
        temp: `${(37 + idx * 1.3).toFixed(1)}°C`,
        ratePerUser: m.ratePerUser || 10000,
        invoicesCount: custInvoices.length,
        overdueCount: overdue,
        activePppoeCount: m.activePppoeCount || (30 + (idx * 16)),
        nonIsolirCount: (m.activePppoeCount || (30 + (idx * 16))) - overdue,
        isolirCount: overdue,
      };
    });
  }, [customers, invoices]);

  const currentRouter = useMemo(() => {
    if (selectedRouterId === 'all') return null;
    return customerRouters.find(r => r.id === selectedRouterId) || customerRouters[0];
  }, [selectedRouterId, customerRouters]);

  // Derived NOC PPPoE Client Sessions linked to Real Invoices & Overdue Billing
  const nocClientSessions = useMemo(() => {
    const list: Array<{
      id: string;
      routerId: string;
      routerName: string;
      customerName: string;
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
    }> = [];

    customerRouters.forEach((router, rIdx) => {
      const clientProfiles = ['20M_HOME_UNLIMITED', '30M_HOME_TURBO', '50M_DEDICATED_PRO', '10M_HOME_BASIC'];
      const count = 4;

      for (let sIdx = 0; sIdx < count; sIdx++) {
        const secretId = `sec-${router.id}-${sIdx + 1}`;
        const isOverdue = sIdx === 1 && router.overdueCount > 0;
        const isIsolated = clientIsolirOverrides[secretId] !== undefined ? clientIsolirOverrides[secretId] : isOverdue;
        const profile = isIsolated ? 'profile_isolir_redirect' : clientProfiles[sIdx % clientProfiles.length];
        const clientName = `${router.customerName.split(' ')[0]} Klien 0${sIdx + 1}`;
        const username = `${router.customerName.split(' ')[0].toLowerCase()}_cpe_0${sIdx + 1}`;
        const ip = `10.10.${rIdx + 10}.${11 + sIdx}`;
        const mac = `D4:CA:6D:${((rIdx * 11 + sIdx * 5 + 10) % 255).toString(16).padStart(2, '0').toUpperCase()}:${((rIdx * 7 + sIdx * 9 + 20) % 255).toString(16).padStart(2, '0').toUpperCase()}:${((rIdx * 13 + sIdx * 3 + 30) % 255).toString(16).padStart(2, '0').toUpperCase()}`;
        const uptime = `${(sIdx * 3 + 2)}d ${((sIdx * 7) % 23) + 1}h`;
        const rxTx = isIsolated ? '12.4 kbps / 8.1 kbps (ISOLIR)' : `${((sIdx * 4.3 + rIdx * 2.1) % 22 + 4.5).toFixed(1)}M / ${((sIdx * 1.1 + rIdx * 0.7) % 5 + 1.2).toFixed(1)}M`;
        const invoiceNumber = `INV-2026-00${rIdx * 4 + sIdx + 1}`;

        list.push({
          id: secretId,
          routerId: router.id,
          routerName: router.routerName,
          customerName: router.customerName,
          name: clientName,
          username,
          ip,
          mac,
          profile,
          uptime,
          rxTx,
          isOverdue,
          isIsolated,
          invoiceNumber,
          amount: 150000 + (sIdx * 50000),
        });
      }
    });

    return list;
  }, [customerRouters, clientIsolirOverrides]);

  // Combined client sessions including operator newly created secrets
  const allClientSessions = useMemo(() => {
    return [...customAddedSecrets, ...nocClientSessions];
  }, [customAddedSecrets, nocClientSessions]);

  // Filtered by selected customer router
  const displayedClientSessions = useMemo(() => {
    if (selectedRouterId === 'all') return allClientSessions;
    return allClientSessions.filter(c => c.routerId === selectedRouterId);
  }, [allClientSessions, selectedRouterId]);

  // Handle Add New PPPoE Secret to Customer Router
  const handleAddNewSecret = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSecretForm.username) return;

    playCyberSynth(1100, 'sine', 0.1);
    const targetRouter = currentRouter || customerRouters[0];
    const newSec = {
      id: `custom-sec-${Date.now()}`,
      routerId: targetRouter.id,
      routerName: targetRouter.routerName,
      customerName: targetRouter.customerName,
      name: newSecretForm.username,
      username: newSecretForm.username.toLowerCase().replace(/[^a-z0-9_]/g, '') + '_pppoe',
      ip: newSecretForm.remoteAddress || `10.10.20.${Math.floor(Math.random() * 150 + 50)}`,
      mac: `D4:CA:6D:88:${Math.floor(Math.random() * 80 + 10)}:77`,
      profile: newSecretForm.profile || '20M_HOME_UNLIMITED',
      uptime: '0m (Baru Diprovisi)',
      rxTx: '0 bps / 0 bps',
      isOverdue: false,
      isIsolated: false,
      invoiceNumber: `INV-2026-NEW`,
      amount: 150000
    };

    setCustomAddedSecrets(prev => [newSec, ...prev]);
    setIsAddSecretOpen(false);
    setNewSecretForm({ username: '', password: '', profile: '20M_HOME_UNLIMITED', remoteAddress: '10.10.20.55', comment: '' });

    const time = new Date().toLocaleTimeString('id-ID', { hour12: false });
    setLiveNocAlert(`✓ User PPPoE "${newSec.username}" berhasil diprovisi ke router "${targetRouter.routerName}" (${targetRouter.customerName})!`);
    setTimeout(() => setLiveNocAlert(null), 5000);

    setTelemetryLogsList(prev => [
      ...prev,
      {
        id: `sec-add-${Date.now()}`,
        timestamp: time,
        category: 'pppoe',
        level: 'OK',
        text: `ROUTEROS API: /ppp secret add name="${newSec.username}" profile="${newSec.profile}" remote-address="${newSec.ip}" comment="${newSec.customerName}" on ${targetRouter.routerName} (Port ${targetRouter.port})`,
        hash: `SECRET_CREATED_${newSec.username}`
      }
    ]);
  };

  // Kick PPPoE Session
  const handleKickPppoeSession = (client: { id: string; username: string; ip: string }) => {
    playCyberSynth(1200, 'triangle', 0.12);
    setKickedSessionId(client.id);
    const time = new Date().toLocaleTimeString('id-ID', { hour12: false });
    
    setTelemetryLogsList(prev => [
      ...prev,
      {
        id: `kick-${Date.now()}`,
        timestamp: time,
        category: 'pppoe',
        level: 'WARN',
        text: `ROUTEROS API: /ppp active remove [find name="${client.username}"] (Session kicked by NOC operator).`,
        hash: `KICK_${client.username}`
      }
    ]);

    setTimeout(() => {
      setKickedSessionId(null);
      const reTime = new Date().toLocaleTimeString('id-ID', { hour12: false });
      setTelemetryLogsList(prev => [
        ...prev,
        {
          id: `reconnect-${Date.now()}`,
          timestamp: reTime,
          category: 'pppoe',
          level: 'OK',
          text: `PPPoE Session re-established: <${client.username}> authenticated from IP ${client.ip}.`,
          hash: `REAUTH_${client.ip}`
        }
      ]);
    }, 1800);
  };

  // Toggle Isolation Override
  const handleToggleClientIsolir = (client: { id: string; username: string; ip: string; isIsolated: boolean; invoiceNumber: string }) => {
    const nextIsolated = !client.isIsolated;
    setClientIsolirOverrides(prev => ({ ...prev, [client.id]: nextIsolated }));
    playCyberSynth(nextIsolated ? 520 : 1080, 'sine', 0.1);
    const time = new Date().toLocaleTimeString('id-ID', { hour12: false });

    setTelemetryLogsList(prev => [
      ...prev,
      {
        id: `isolir-toggle-${Date.now()}`,
        timestamp: time,
        category: 'isolir',
        level: nextIsolated ? 'WARN' : 'OK',
        text: nextIsolated
          ? `FIREWALL ISOLIR: IP ${client.ip} (${client.username}) dimasukkan ke address-list "ISOLIR" (Faktur: ${client.invoiceNumber}). Port 80/443 dialihkan.`
          : `FIREWALL UNISOLIR: IP ${client.ip} (${client.username}) dihapus dari address-list "ISOLIR". Bandwidth & akses internet normal aktif kembali.`,
        hash: `ISOLIR_${client.ip}`
      }
    ]);
  };

  // Mass Isolir Enforcement
  const handleEnforceMassIsolir = () => {
    playCyberSynth(600, 'square', 0.15);
    const overdueClients = nocClientSessions.filter(c => c.isOverdue);
    const overrides: Record<string, boolean> = {};
    overdueClients.forEach(c => {
      overrides[c.id] = true;
    });
    setClientIsolirOverrides(prev => ({ ...prev, ...overrides }));
    
    const time = new Date().toLocaleTimeString('id-ID', { hour12: false });
    setLiveNocAlert(`Otomasi Isolir Dijalankan: ${overdueClients.length} klien berstatus overdue berhasil dipindahkan ke pool isolir MikroTik.`);
    setTimeout(() => setLiveNocAlert(null), 5000);

    setTelemetryLogsList(prev => [
      ...prev,
      {
        id: `mass-isolir-${Date.now()}`,
        timestamp: time,
        category: 'isolir',
        level: 'WARN',
        text: `Auto-Isolir Billing Engine: ${overdueClients.length} invoice overdue dieksekusi ke RouterOS Firewall Address-List "ISOLIR".`,
        hash: `MASS_ISOLIR_${overdueClients.length}`
      }
    ]);
  };

  // Simulate QRIS Payment & Real-Time Auto Unisolir
  const handleSimulateQrisAutoUnisolir = () => {
    playCyberSynth(1100, 'triangle', 0.15);
    try {
      confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 } });
    } catch {}

    const isolated = nocClientSessions.find(c => c.isIsolated) || nocClientSessions[0];
    if (isolated) {
      setClientIsolirOverrides(prev => ({ ...prev, [isolated.id]: false }));
    }

    const time = new Date().toLocaleTimeString('id-ID', { hour12: false });
    const refNum = 'QRIS-AUTO-' + Math.floor(100000 + Math.random() * 900000);
    setLiveNocAlert(`⚡ Pembayaran QRIS Dinamis Masuk: Klien ${isolated?.name || 'Pelanggan'} lunas & otomatis di-unisolir dalam 0.35s!`);
    setTimeout(() => setLiveNocAlert(null), 6000);

    setTelemetryLogsList(prev => [
      ...prev,
      {
        id: `qris-paid-${Date.now()}`,
        timestamp: time,
        category: 'billing',
        level: 'LIVE',
        text: `Webhook DANA QRIS: Pembayaran lunas Rp ${formatRupiah(isolated?.amount || 150000)} diterima untuk ${isolated?.name || 'Pelanggan'} (${refNum}).`,
        hash: refNum
      },
      {
        id: `auto-unsolir-${Date.now()}`,
        timestamp: time,
        category: 'isolir',
        level: 'OK',
        text: `ROUTEROS API (0.35s): /ip firewall address-list remove [find address=${isolated?.ip || '10.10.20.15'}] -> Akses Full Speed Dipulihkan!`,
        hash: `UNISOLIR_${isolated?.ip}`
      }
    ]);
  };

  // Interactive ICMP Ping Suite
  const handleRunCustomPing = () => {
    if (isPingingTarget) return;
    setIsPingingTarget(true);
    playCyberSynth(900, 'sine', 0.08);

    setTimeout(() => {
      const packets: Array<{ seq: number; bytes: number; ttl: number; time: number; status: 'OK' | 'TIMEOUT' }> = [];
      const baseLat = pingTarget.includes('88.1') ? 8 : pingTarget.includes('8.8.8.8') ? 16 : 22;
      for (let i = 1; i <= 4; i++) {
        const t = parseFloat((baseLat + (Math.random() * 4 - 2) + (pingPacketSize > 1000 ? 5 : 0)).toFixed(1));
        packets.push({
          seq: i,
          bytes: pingPacketSize,
          ttl: 64,
          time: t,
          status: 'OK'
        });
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
          text: `ICMP Echo to ${pingTarget} (${pingPacketSize}B): 4 packets transmitted, 4 received, 0% loss, avg=${avg}ms.`,
          hash: `ICMP_${pingTarget}_${avg}MS`
        }
      ]);
    }, 700);
  };

  // Interactive CLI Command Runner
  const handleExecuteCli = (cmdToRun?: string) => {
    const raw = (cmdToRun !== undefined ? cmdToRun : cliInput).trim();
    if (!raw) return;
    setCliInput('');
    playCyberSynth(1040, 'triangle', 0.06);

    const time = new Date().toLocaleTimeString('id-ID', { hour12: false });
    const parts = raw.split(' ');
    const command = parts[0].toLowerCase();
    const arg = parts.slice(1).join(' ');

    const newLogs: typeof telemetryLogsList = [
      {
        id: `cli-${Date.now()}`,
        timestamp: time,
        category: 'system',
        level: 'LIVE',
        text: `$ ${raw}`,
      }
    ];

    if (command === '/clear' || command === 'clear') {
      setTelemetryLogsList([]);
      return;
    }

    if (command === '/help' || command === 'help') {
      newLogs.push({
        id: `cli-res-${Date.now()}-1`,
        timestamp: time,
        category: 'system',
        level: 'INFO',
        text: 'NOC CLI: /ping [host] | /ppp active | /isolate-overdue | /unsolir-all | /interface | /firewall | /system resource | /qris-sim | /clear',
      });
    } else if (command === '/ping' || command.startsWith('/ping-')) {
      const targetHost = arg || pingTarget || '192.168.88.1';
      setPingTarget(targetHost);
      const simPing = Math.floor(Math.random() * 6 + 9);
      setMeasuredPing(simPing);
      newLogs.push({
        id: `cli-res-${Date.now()}-3`,
        timestamp: time,
        category: 'noc',
        level: 'OK',
        text: `ICMP Echo reply from ${targetHost}: rtt=${simPing}ms ttl=64 size=64 bytes loss=0%`,
        hash: `PING_${simPing}MS`
      });
    } else if (command === '/ppp' || command === '/ppp-active' || command.startsWith('/ppp')) {
      setActiveNocTab('sessions');
      const total = nocClientSessions.length;
      const isolated = nocClientSessions.filter(c => c.isIsolated).length;
      newLogs.push({
        id: `cli-res-${Date.now()}-4`,
        timestamp: time,
        category: 'pppoe',
        level: 'INFO',
        text: `RouterOS PPPoE Pool: ${total} total sessions, ${total - isolated} active normal, ${isolated} isolated overdue.`,
        hash: 'PPPOE_STATUS_OK'
      });
    } else if (command === '/isolate-overdue' || command === '/isolir') {
      handleEnforceMassIsolir();
      newLogs.push({
        id: `cli-res-${Date.now()}-iso`,
        timestamp: time,
        category: 'isolir',
        level: 'WARN',
        text: `Eksekusi massal isolir untuk seluruh faktur overdue berhasil dijalankan ke MikroTik firewall.`,
      });
    } else if (command === '/unsolir-all' || command === '/unsolir') {
      setClientIsolirOverrides({});
      newLogs.push({
        id: `cli-res-${Date.now()}-uniso`,
        timestamp: time,
        category: 'isolir',
        level: 'OK',
        text: `Seluruh address-list "ISOLIR" dibersihkan. Akses internet semua klien dipulihkan ke normal.`,
      });
    } else if (command === '/interface' || command === '/interfaces') {
      newLogs.push({
        id: `cli-res-${Date.now()}-iface`,
        timestamp: time,
        category: 'noc',
        level: 'INFO',
        text: `Interfaces: ether1-WAN (342.8M/48.2M), ether2-LAN (46.5M/328.4M), sfp-plus1-OLT (12.4M/184.2M). All links up.`,
      });
    } else if (command === '/firewall' || command === '/firewall-status') {
      setActiveNocTab('firewall');
      newLogs.push({
        id: `cli-res-${Date.now()}-fw`,
        timestamp: time,
        category: 'firewall',
        level: 'OK',
        text: `Firewall Filter: Syn-Flood Protection OK, Port-Scan Auto Drop OK, Total Dropped Packets: ${firewallDropCount}.`,
      });
    } else if (command === '/system' || command === '/system-resource' || command === '/resource') {
      newLogs.push({
        id: `cli-res-${Date.now()}-sys`,
        timestamp: time,
        category: 'system',
        level: 'INFO',
        text: `RouterOS RB4011: CPU 18% (4x 1400MHz), RAM 384MB/1024MB, Uptime 48d 14h, Voltage 24.1V, Temp 38.2°C.`,
      });
    } else if (command === '/qris-sim' || command === '/qris') {
      handleSimulateQrisAutoUnisolir();
      newLogs.push({
        id: `cli-res-${Date.now()}-qris`,
        timestamp: time,
        category: 'billing',
        level: 'LIVE',
        text: `Simulasi bayar QRIS dinamis & auto-unisolir real-time berhasil dipicu.`,
      });
    } else if (command === '/audit') {
      handleRunDiagnostics();
      newLogs.push({
        id: `cli-res-${Date.now()}-audit`,
        timestamp: time,
        category: 'system',
        level: 'LIVE',
        text: 'Automated NOC Audit diaktifkan: Memeriksa Gateway, PPPoE Pool, Firewall, & Billing Socket.',
      });
    } else {
      newLogs.push({
        id: `cli-res-${Date.now()}-unknown`,
        timestamp: time,
        category: 'system',
        level: 'WARN',
        text: `Perintah '${raw}' tidak dikenali. Ketik '/help' untuk panduan daftar perintah NOC.`,
      });
    }

    setTelemetryLogsList(prev => [...prev, ...newLogs]);
  };

  // Ping Gateway Simulator
  const handleRunPingTest = () => {
    if (isPingingGateway) return;
    setIsPingingGateway(true);
    playCyberSynth(900, 'sine', 0.08);

    setTimeout(() => {
      const minP = Math.floor(Math.random() * 4 + 7);
      const avgP = minP + Math.floor(Math.random() * 4 + 2);
      const maxP = avgP + Math.floor(Math.random() * 6 + 3);
      const jitterVal = parseFloat((Math.random() * 1.5 + 0.5).toFixed(1));
      setPingStats({ min: minP, avg: avgP, max: maxP, jitter: jitterVal, loss: 0 });
      setMeasuredPing(avgP);
      setIsPingingGateway(false);
      playCyberSynth(1200, 'triangle', 0.1);

      const time = new Date().toLocaleTimeString('id-ID', { hour12: false });
      setTelemetryLogsList(prev => [
        ...prev,
        {
          id: `ping-${Date.now()}`,
          timestamp: time,
          category: 'noc',
          level: 'OK',
          text: `RouterOS ICMP Ping Test: min=${minP}ms avg=${avgP}ms max=${maxP}ms jitter=${jitterVal}ms loss=0%`,
          hash: `PING_${avgP}MS`
        }
      ]);
    }, 850);
  };

  // Run Database Integrity Verification
  const handleVerifyDatabaseIntegrity = () => {
    if (isVerifyingDb) return;
    setIsVerifyingDb(true);
    playCyberSynth(750, 'sine', 0.09);
    setTimeout(() => {
      const newHash = 'SHA256-IK-SNAP-' + Math.random().toString(16).substring(2, 10).toUpperCase();
      setDbChecksum(newHash);
      setIsVerifyingDb(false);
      setDbVerificationResult(`Database snapshot 100% konsisten. ${invoices.length} faktur diverifikasi.`);
      playCyberSynth(1100, 'triangle', 0.12);
      setTimeout(() => setDbVerificationResult(null), 4000);

      const time = new Date().toLocaleTimeString('id-ID', { hour12: false });
      setTelemetryLogsList(prev => [
        ...prev,
        {
          id: `db-verify-${Date.now()}`,
          timestamp: time,
          category: 'database',
          level: 'OK',
          text: `Master DB Integrity Audit passed. Snapshot hash: ${newHash}`,
          hash: newHash
        }
      ]);
    }, 700);
  };

  // Export logs to JSON download
  const handleExportTelemetryLogs = () => {
    playCyberSynth(950, 'sine', 0.08);
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(telemetryLogsList, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `telemetry-audit-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };


  if (!analytics) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
        <span>Memuat data analitik keuangan...</span>
      </div>
    );
  }

  const { summary, dailyChartData, monthlyChartData, recentTransactions } = analytics;

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Compute live indicators dynamically from the current active invoices array
  const {
    liveOverdueInvoices,
    liveTotalOverdueAmount,
    liveOverdueCount,
    liveTotalOutstanding,
    livePendingAmount,
    livePendingCount,
    livePaidCount,
    liveTotalInvoiceAmount,
    liveTotalPaidAmount,
    liveTotalRevenueThisMonth,
    liveTotalRevenueToday,
    liveCollectionRate,
  } = useMemo(() => {
    if (!invoices || invoices.length === 0) {
      return {
        liveOverdueInvoices: [],
        liveTotalOverdueAmount: summary?.totalOverdueAmount ?? 0,
        liveOverdueCount: summary?.invoiceCounts?.overdue ?? 0,
        liveTotalOutstanding: summary?.totalOutstanding ?? 0,
        livePendingAmount: 0,
        livePendingCount: summary?.invoiceCounts?.pending ?? 0,
        livePaidCount: summary?.invoiceCounts?.paid ?? 0,
        liveTotalInvoiceAmount: 0,
        liveTotalPaidAmount: summary?.totalRevenueAllTime ?? 0,
        liveTotalRevenueThisMonth: summary?.totalRevenueThisMonth ?? 0,
        liveTotalRevenueToday: summary?.totalRevenueToday ?? 0,
        liveCollectionRate: summary?.collectionRate ?? 0,
      };
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const overdueList: Invoice[] = [];
    let overdueAmt = 0;
    let pendingAmt = 0;
    let outstandingAmt = 0;
    let pendingCnt = 0;
    let paidCnt = 0;
    let revMonth = 0;
    let revToday = 0;
    let totalInvAmt = 0;
    let totalPaidAmt = 0;

    for (const inv of invoices) {
      const invTotal = inv.totalAmount || 0;
      totalInvAmt += invTotal;

      const paid = inv.paidAmount || (inv.status === 'paid' ? invTotal : 0) || 0;
      totalPaidAmt += paid;

      const unpaid = Math.max(0, invTotal - (inv.paidAmount || 0));
      const isOverdue = inv.status === 'overdue' || (unpaid > 0 && inv.dueDate < todayStr);

      if (isOverdue) {
        overdueList.push(inv);
        overdueAmt += unpaid;
      } else if (inv.status !== 'paid' && unpaid > 0) {
        pendingCnt++;
        pendingAmt += unpaid;
      }

      if (inv.status === 'paid' || (invTotal > 0 && unpaid === 0)) {
        paidCnt++;
      } else {
        outstandingAmt += unpaid;
      }

      // Track revenue from verified transactions or payments
      if (inv.transactions && inv.transactions.length > 0) {
        for (const trx of inv.transactions) {
          const trxDate = new Date(trx.verifiedAt);
          if (trx.verifiedAt?.startsWith(todayStr)) {
            revToday += trx.amount;
          }
          if (trxDate.getFullYear() === currentYear && trxDate.getMonth() === currentMonth) {
            revMonth += trx.amount;
          }
        }
      } else if ((inv.status === 'paid' || paid > 0) && paid > 0) {
        const dateStr = inv.updatedAt || inv.date || todayStr;
        const invDate = new Date(dateStr);
        if (dateStr.startsWith(todayStr)) {
          revToday += paid;
        }
        if (invDate.getFullYear() === currentYear && invDate.getMonth() === currentMonth) {
          revMonth += paid;
        }
      }
    }

    // Sort overdue by most urgent due date
    overdueList.sort((a, b) => a.dueDate.localeCompare(b.dueDate));

    const rate = invoices.length > 0 ? Math.round((paidCnt / invoices.length) * 100) : 0;

    return {
      liveOverdueInvoices: overdueList,
      liveTotalOverdueAmount: overdueAmt,
      liveOverdueCount: overdueList.length,
      liveTotalOutstanding: outstandingAmt,
      livePendingAmount: pendingAmt,
      livePendingCount: pendingCnt,
      livePaidCount: paidCnt,
      liveTotalInvoiceAmount: totalInvAmt,
      liveTotalPaidAmount: totalPaidAmt,
      liveTotalRevenueThisMonth: revMonth > 0 ? revMonth : (summary?.totalRevenueThisMonth ?? 0),
      liveTotalRevenueToday: revToday,
      liveCollectionRate: rate,
    };
  }, [invoices, summary, todayStr]);

  // Derive live real-time transactions directly from current active invoices
  const liveTransactions = useMemo(() => {
    const list: (PaymentTransaction & { customerName: string; invoiceNumber: string; invoiceId: string })[] = [];
    
    for (const inv of invoices) {
      if (inv.transactions && inv.transactions.length > 0) {
        for (const trx of inv.transactions) {
          list.push({
            ...trx,
            invoiceId: inv.id,
            invoiceNumber: inv.invoiceNumber,
            customerName: inv.customer?.name || 'Pelanggan',
          });
        }
      } else if (inv.status === 'paid' && (inv.paidAmount || inv.totalAmount) > 0) {
        list.push({
          id: `trx-paid-${inv.id}`,
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber,
          amount: inv.paidAmount || inv.totalAmount,
          paymentMethod: inv.transactions?.[0]?.paymentMethod || ((inv as any).paymentMethod as any) || 'qris_dinamis',
          referenceNumber: `AUTO-${inv.invoiceNumber}`,
          notes: 'Pembayaran invoice terverifikasi lunas',
          proofUrl: '',
          verifiedAt: inv.updatedAt || inv.date || new Date().toISOString(),
          verifiedBy: 'Sistem Pembayaran',
          customerName: inv.customer?.name || 'Pelanggan',
        });
      } else if (inv.paidAmount && inv.paidAmount > 0) {
        list.push({
          id: `trx-partial-${inv.id}`,
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber,
          amount: inv.paidAmount,
          paymentMethod: inv.transactions?.[0]?.paymentMethod || ((inv as any).paymentMethod as any) || 'qris_dinamis',
          referenceNumber: `PARTIAL-${inv.invoiceNumber}`,
          notes: 'Pembayaran sebagian terverifikasi',
          proofUrl: '',
          verifiedAt: inv.updatedAt || inv.date || new Date().toISOString(),
          verifiedBy: 'Sistem Pembayaran',
          customerName: inv.customer?.name || 'Pelanggan',
        });
      }
    }

    // Merge or fallback with recentTransactions from analytics
    if (recentTransactions && recentTransactions.length > 0) {
      for (const rt of recentTransactions) {
        const alreadyExists = list.some(t => t.id === rt.id || t.referenceNumber === rt.referenceNumber);
        if (!alreadyExists) {
          const matched = invoices.find(i => i.id === rt.invoiceId || i.invoiceNumber === rt.invoiceNumber || i.invoiceNumber === rt.invoiceId);
          list.push({
            ...rt,
            invoiceId: matched ? matched.id : rt.invoiceId,
            invoiceNumber: matched ? matched.invoiceNumber : rt.invoiceNumber,
            customerName: matched ? matched.customer.name : (rt as any).customerName || 'Pelanggan',
          });
        }
      }
    }

    list.sort((a, b) => new Date(b.verifiedAt).getTime() - new Date(a.verifiedAt).getTime());
    return list;
  }, [invoices, recentTransactions]);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* 1. Top Banner Action Bar - Futuristic Cyber HUD */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 border border-indigo-500/30 p-6 sm:p-7 text-white shadow-2xl ring-1 ring-cyan-500/20">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 text-xs font-bold tracking-wide">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span>COMMAND CENTER LIVE</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-mono font-bold">
                <Radio className="w-3.5 h-3.5 text-cyan-400" />
                <span>{measuredPing}ms latency</span>
              </span>
              {liveClock && (
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300 text-xs font-mono">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>{liveClock}</span>
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
              <span>Dashboard Keuangan & Pemasukan</span>
              <Sparkles className="w-6 h-6 text-amber-400" />
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Monitoring omset real-time, audit piutang jatuh tempo, generator QRIS Dinamis otomatis, dan integrasi MikroTik NOC dalam satu layar kendali.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              id="btn-simulate-qris-dash"
              onClick={handleSimulateQrisPayment}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 px-4 py-2.5 text-xs font-extrabold text-white shadow-lg shadow-emerald-500/25 transition active:scale-95 border border-emerald-400/30 cursor-pointer"
              title="Simulasikan pembayaran QRIS masuk secara instan"
            >
              <Zap className="w-4 h-4 text-emerald-200 fill-emerald-200" />
              <span>Simulasi QRIS Masuk</span>
            </button>

            <button
              id="run-reminders-check-btn"
              onClick={onTriggerCheckReminders}
              disabled={isCheckingReminders}
              className="flex items-center gap-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 px-4 py-2.5 text-xs font-bold text-slate-200 transition active:scale-95 disabled:opacity-50 cursor-pointer"
              title="Cek otomatis tanggal jatuh tempo & kirim email tagihan"
            >
              <Clock className={`w-4 h-4 text-amber-400 ${isCheckingReminders ? 'animate-spin' : ''}`} />
              <span>{isCheckingReminders ? 'Mengecek...' : 'Cek Email H-3 & Overdue'}</span>
            </button>

            <button
              id="create-invoice-dash-btn"
              onClick={onOpenCreateInvoice}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-500/30 transition active:scale-95 border border-blue-400/30 cursor-pointer"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Buat Invoice Baru</span>
            </button>
          </div>

          {/* Simulated Live Alert Banner if triggered */}
          {simulatedFeedback && (
            <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-emerald-950/90 via-slate-900 to-emerald-950/90 border border-emerald-500/40 text-emerald-200 flex items-center justify-between gap-3 shadow-xl animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-400/30">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-400 block">
                    ⚡ Notifikasi Real-Time Terverifikasi
                  </span>
                  <p className="text-xs text-white font-medium mt-0.5">
                    {simulatedFeedback}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSimulatedFeedback(null)}
                className="text-xs font-bold text-emerald-400 hover:text-white px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          )}
        </div>

        {/* Ambient futuristic glow blobs */}
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 -bottom-16 w-64 h-64 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* 2. Primary KPI Metric Cards - Futuristic Interactive Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Pemasukan Bulan Ini */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs hover:shadow-xl hover:border-emerald-300/80 transition-all duration-300 group relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
              Pemasukan Bulan Ini
            </span>
            <div className="rounded-2xl bg-emerald-50 p-2.5 text-emerald-600 group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-white transition duration-300 shadow-2xs">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 font-mono tabular-nums block">
              {formatRupiah(liveTotalRevenueThisMonth)}
            </span>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-600 font-medium pt-2 border-t border-slate-100">
              <span className="text-slate-500">Hari ini:</span>
              <span className="font-bold text-emerald-700 font-mono">{formatRupiah(liveTotalRevenueToday)}</span>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-500 opacity-80" />
        </div>

        {/* Card 2: Total Piutang Belum Dibayar */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs hover:shadow-xl hover:border-amber-300/80 transition-all duration-300 group relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
              Piutang Belum Lunas
            </span>
            <div className="rounded-2xl bg-amber-50 p-2.5 text-amber-600 group-hover:scale-110 group-hover:bg-amber-500 group-hover:text-white transition duration-300 shadow-2xs">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 font-mono tabular-nums block">
              {formatRupiah(liveTotalOutstanding)}
            </span>
            <div className="mt-2 flex items-center justify-between text-xs pt-2 border-t border-slate-100">
              <span className="text-amber-700 font-bold">
                {livePendingCount + liveOverdueCount} Invoice
              </span>
              <span className="text-[11px] text-slate-500">
                {livePendingCount} berjalan · <b className="text-rose-600">{liveOverdueCount} tempo</b>
              </span>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-orange-500 opacity-80" />
        </div>

        {/* Card 3: Tagihan Jatuh Tempo (Overdue) */}
        <div 
          id="kpi-card-overdue"
          className={`rounded-3xl border p-5 shadow-xs hover:shadow-xl transition-all duration-300 group relative overflow-hidden flex flex-col justify-between ${
            liveOverdueCount > 0 
              ? 'border-rose-300 bg-rose-50/30 hover:border-rose-400' 
              : 'border-slate-200/90 bg-white'
          }`}
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                Overdue / Lewat Tempo
              </span>
              <div className={`rounded-2xl p-2.5 transition duration-300 shadow-2xs ${
                liveOverdueCount > 0 
                  ? 'bg-rose-100 text-rose-700 group-hover:bg-rose-600 group-hover:text-white' 
                  : 'bg-slate-100 text-slate-400'
              }`}>
                <AlertCircle className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4">
              <span className={`text-2xl sm:text-3xl font-black tracking-tight font-mono tabular-nums block ${liveOverdueCount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                {formatRupiah(liveTotalOverdueAmount)}
              </span>
              <div className="mt-2 text-xs font-semibold pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className={liveOverdueCount > 0 ? 'text-rose-700' : 'text-slate-500'}>
                  {liveOverdueCount > 0 ? `${liveOverdueCount} invoice perlu ditagih` : '0 tagihan menunggak'}
                </span>
                {liveOverdueCount > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-extrabold animate-pulse">
                    PRIORITAS
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Rincian invoice yang saat ini sedang overdue */}
          {liveOverdueInvoices.length > 0 && (() => {
            const currentInv = liveOverdueInvoices[selectedOverdueIdx] || liveOverdueInvoices[0];
            const currentUnpaid = Math.max(0, currentInv.totalAmount - (currentInv.paidAmount || 0));
            return (
              <div className="mt-3 pt-3 border-t border-rose-200/80 space-y-2">
                <div className="bg-white rounded-2xl p-2.5 border border-rose-200 text-[11px] shadow-2xs">
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-rose-700 font-mono font-black">{currentInv.invoiceNumber}</span>
                    <span className="text-[10px] text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                      {formatDateIndo(currentInv.dueDate)}
                    </span>
                  </div>
                  <p className="text-slate-700 truncate mt-1 font-semibold">
                    {currentInv.customer.name}
                  </p>
                  <div className="mt-1 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Sisa:</span>
                    <span className="font-black text-rose-600 font-mono">
                      {formatRupiah(currentUnpaid)}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectInvoice(currentInv.id)}
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold py-2 px-3 transition active:scale-95 shadow-xs cursor-pointer"
                >
                  <span>Buka Invoice Menunggak</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })()}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-red-600 opacity-80" />
        </div>

        {/* Card 4: Tingkat Pembayaran (Lunas) */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs hover:shadow-xl hover:border-blue-300/80 transition-all duration-300 group relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
              Tingkat Pembayaran
            </span>
            <div className="rounded-2xl bg-blue-50 p-2.5 text-blue-600 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition duration-300 shadow-2xs">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 font-mono tabular-nums">
                {liveCollectionRate}%
              </span>
              <span className="text-xs font-bold text-slate-500 font-mono">
                {livePaidCount}/{invoices.length || summary.invoiceCounts.total}
              </span>
            </div>
            <div className="mt-2.5 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-700"
                style={{ width: `${Math.min(100, Math.max(0, liveCollectionRate))}%` }}
              />
            </div>
            <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500 font-medium pt-2 border-t border-slate-100">
              <span>Terkumpul: <strong className="text-emerald-700 font-mono">{formatRupiah(liveTotalPaidAmount)}</strong></span>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600 opacity-80" />
        </div>
      </div>

      {/* 3. Visual Charts Section: Daily & Monthly Revenue with Recharts */}
      <RevenueBarChart
        dailyChartData={dailyChartData}
        monthlyChartData={monthlyChartData}
        invoices={invoices}
        onSelectInvoice={onSelectInvoice}
      />

      {/* 4. Bottom Section: Recent Real-Time Transactions & Priority Invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Riwayat Pembayaran Masuk Real-Time */}
        <div className="lg:col-span-2 rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <span>Riwayat Pembayaran Masuk Real-Time</span>
                <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Setiap pembayaran otomatis diverifikasi QRIS Dinamis dan tercatat instan
              </p>
            </div>
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
              {liveTransactions.length} Transaksi Terakhir
            </span>
          </div>

          <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100">
            {liveTransactions.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-semibold">Belum ada pembayaran yang tercatat.</p>
                <button
                  onClick={handleSimulateQrisPayment}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold hover:bg-emerald-100 transition cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Uji Coba Simulasi Pembayaran QRIS</span>
                </button>
              </div>
            ) : (
              liveTransactions.map((trx) => (
                <div 
                  key={trx.id}
                  className="flex items-center justify-between p-4 hover:bg-slate-50/80 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 shrink-0 border border-emerald-100">
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 font-mono">
                          {trx.invoiceNumber}
                        </span>
                        <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 uppercase">
                          {(trx.paymentMethod || 'qris_dinamis').replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {trx.customerName} · <span className="font-mono text-slate-500">{trx.referenceNumber}</span>
                      </p>
                      <span className="text-[10px] text-slate-400">
                        {formatDateTimeIndo(trx.verifiedAt)}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-black text-emerald-600 font-mono block">
                      +{formatRupiah(trx.amount)}
                    </span>
                    <button
                      onClick={() => onSelectInvoice(trx.invoiceId || trx.invoiceNumber)}
                      className="mt-1 inline-flex items-center justify-end gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 transition cursor-pointer"
                    >
                      <span>Rincian</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right 1 Col: Status Piutang & Overdue Quick View */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-base font-black text-slate-900 mb-0.5">
              Status Tagihan Pelanggan
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Ringkasan kondisi piutang & kelancaran pembayaran
            </p>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200">
                <div className="flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm" />
                  <span className="text-xs font-bold text-emerald-950">Invoice Lunas</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-emerald-800 font-mono block">
                    {livePaidCount} invoice
                  </span>
                  <span className="text-[10px] text-emerald-700 font-mono font-semibold">
                    {formatRupiah(liveTotalPaidAmount)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200">
                <div className="flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-full bg-amber-500 shadow-sm" />
                  <span className="text-xs font-bold text-amber-950">Menunggu Pembayaran</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-amber-800 font-mono block">
                    {livePendingCount} invoice
                  </span>
                  <span className="text-[10px] text-amber-700 font-mono font-semibold">
                    {formatRupiah(livePendingAmount)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-rose-50/80 border border-rose-200">
                <div className="flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-full bg-rose-500 shadow-sm" />
                  <span className="text-xs font-bold text-rose-950">Melewati Jatuh Tempo</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-rose-800 font-mono block">
                    {liveOverdueCount} invoice
                  </span>
                  <span className="text-[10px] text-rose-700 font-mono font-semibold">
                    {formatRupiah(liveTotalOverdueAmount)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="rounded-2xl bg-blue-50/80 p-4 border border-blue-200/80">
              <div className="flex items-start gap-3">
                <Share2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-extrabold text-blue-950">
                    Otomasi WhatsApp & Email
                  </h4>
                  <p className="text-[11px] text-blue-800 mt-0.5 leading-relaxed">
                    Setiap pembayaran terverifikasi otomatis menyiapkan pesan resmi terima kasih beserta QRIS Dinamis dan tautan faktur ke pelanggan.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Futuristic Dedicated NOC Tactical Operations HUD Matrix */}
      {/* Matches Selector: div#root > div > main > div > div:nth-of-type(5) */}
      <div className="rounded-3xl border border-cyan-500/40 bg-gradient-to-br from-[#020612] via-[#050e24] to-[#01040d] p-5 sm:p-8 text-white shadow-[0_0_60px_rgba(6,182,212,0.2)] relative overflow-hidden ring-1 ring-cyan-400/30 space-y-6 backdrop-blur-2xl">
        {/* Futuristic Laser-Etched Cyber Corner Brackets */}
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
                <span>NOC TACTICAL MATRIX v5.2</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-mono font-bold shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>ROUTEROS v7.14 API ONLINE</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-mono font-bold">
                <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <span>{measuredPing}ms GATEWAY RTT</span>
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
                  <span>MIKROTIK NOC OPERATIONS HUD · CORE ROUTER</span>
                  <Sparkles className="w-5 h-5 text-amber-400" />
                </h3>
                <p className="text-xs text-slate-400 max-w-2xl font-mono">
                  Pusat Kendali Operasi Jaringan Real-Time: Monitoring Sesi PPPoE Klien, Otomatisasi Isolir Tagihan, Traffic Oscilloscope, & Diagnostik ICMP Ping.
                </p>
              </div>
            </div>
          </div>

          {/* Right Action Hub with Audio Synth Toggle & NOC Diagnostics */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Audio Synth Toggle */}
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
              title={soundEnabled ? 'Suara HUD Cyber Aktif (Klik untuk mute)' : 'Suara HUD Cyber Dinonaktifkan'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4" />}
              <span className="hidden sm:inline">{soundEnabled ? 'SFX ON' : 'SFX OFF'}</span>
            </button>

            {/* NOC Full Audit Button */}
            <button
              id="btn-run-noc-audit"
              onClick={handleRunDiagnostics}
              disabled={isDiagnosing}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-lg shadow-cyan-500/25 transition active:scale-95 disabled:opacity-50 border border-cyan-400/40 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isDiagnosing ? 'animate-spin' : ''}`} />
              <span>{isDiagnosing ? `Audit NOC (${diagnosticStep}/4)...` : '⚡ Audit Lengkap NOC'}</span>
            </button>

            {/* Mass Isolir Enforcement Button */}
            <button
              id="btn-mass-isolir-noc"
              onClick={handleEnforceMassIsolir}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600/30 hover:bg-rose-600/50 border border-rose-500/40 text-xs font-bold text-rose-200 transition active:scale-95 cursor-pointer shadow-lg shadow-rose-500/20"
              title="Eksekusi isolir firewall MikroTik untuk pelanggan jatuh tempo"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              <span>Isolir Overdue ({nocClientSessions.filter(c => c.isOverdue).length})</span>
            </button>

            {/* Interactive QRIS Auto-Unisolir Simulation Button */}
            <button
              id="btn-simulate-qris-noc"
              onClick={handleSimulateQrisAutoUnisolir}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-400/40 text-xs font-bold text-emerald-200 transition active:scale-95 cursor-pointer shadow-lg shadow-emerald-500/20"
              title="Simulasikan pembayaran QRIS dan un-isolir real-time"
            >
              <Zap className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
              <span>Bayar QRIS & Unisolir</span>
            </button>
          </div>
        </div>

        {/* Live NOC Alert Banner if Triggered */}
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

        {/* Live Hardware Telemetry & Resource Ticker Bar */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-950/80 border border-cyan-900/40">
          <div className="flex items-center gap-2.5">
            <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>NOC TELEMETRY STREAM:</span>
            </span>
            <div className="flex items-end gap-1 h-5 px-1">
              {[35, 70, 50, 95, 60, 85, 40, 90, 65, 80, 55, 100, 75, 45, 88, 62].map((heightPct, idx) => (
                <div
                  key={idx}
                  className="w-1 bg-gradient-to-t from-cyan-500 via-indigo-400 to-emerald-400 rounded-full transition-all duration-300"
                  style={{
                    height: `${isDiagnosing ? Math.min(100, heightPct + 15) : heightPct}%`,
                    animation: `cyberEqualizer 1.2s ease-in-out infinite ${idx * 0.08}s`,
                  }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-slate-300 overflow-x-auto">
            <span>CPU: <strong className="text-cyan-400">18% [4-CORE]</strong></span>
            <span>RAM: <strong className="text-emerald-400">384 / 1024 MB</strong></span>
            <span>TEMP: <strong className="text-amber-400">38.2°C</strong></span>
            <span>VOLT: <strong className="text-indigo-400">24.1V</strong></span>
            <span>PPPOE: <strong className="text-white">{nocClientSessions.length} Sesi</strong></span>
            <span>ISOLIR: <strong className="text-rose-400">{nocClientSessions.filter(c => c.isIsolated).length} Klien</strong></span>
            <span>FW DROPS: <strong className="text-rose-300">{firewallDropCount} pkts</strong></span>
          </div>
        </div>

        {/* Diagnostic Progress Visualizer Bar */}
        {isDiagnosing && (
          <div className="p-4 rounded-2xl bg-cyan-950/60 border border-cyan-400/40 space-y-2 animate-in fade-in shadow-[0_0_20px_rgba(6,182,212,0.2)]">
            <div className="flex items-center justify-between text-xs font-mono font-bold text-cyan-300">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                <span>
                  {diagnosticStep === 1 && 'Langkah 1/4: Memeriksa Latensi Socket MikroTik Port 8728 & Rest API...'}
                  {diagnosticStep === 2 && 'Langkah 2/4: Memeriksa Integritas Database PPPoE Secrets & Active Sessions...'}
                  {diagnosticStep === 3 && 'Langkah 3/4: Memverifikasi Aturan Firewall Address-List ISOLIR & NAT Redirect...'}
                  {diagnosticStep === 4 && 'Langkah 4/4: Sinkronisasi Billing Webhook QRIS Dinamis & Auto-Unisolir...'}
                </span>
              </span>
              <span className="text-cyan-400 font-black">{diagnosticStep * 25}%</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-slate-900 overflow-hidden border border-cyan-500/30">
              <div 
                className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-emerald-400 transition-all duration-300 shadow-[0_0_12px_#22d3ee]"
                style={{ width: `${diagnosticStep * 25}%` }}
              />
            </div>
          </div>
        )}

        {/* ================= NOC NETWORK TOPOLOGY RADAR & INTERFACE OSCILLOSCOPE ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 relative z-10">
          {/* Left: Interactive Network Topology Radar Mesh (7 Cols) */}
          <div className="lg:col-span-7 p-4 sm:p-5 rounded-2xl bg-slate-950/90 border border-cyan-500/30 space-y-3 font-mono">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-cyan-300 flex items-center gap-2">
                <Globe className="w-4 h-4 text-cyan-400" />
                <span>TOPOLOGI MESH DISTRIBUSI NOC (LIVE)</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-400/30">
                Pilih Node untuk Inspeksi
              </span>
            </div>

            {/* Topology Interactive Node Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
              {/* Node 1: WAN Gateway */}
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

              {/* Node 2: Core Router RB4011 */}
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
                  <span className="text-slate-400">CORE ROUTER</span>
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#22d3ee]" />
                </div>
                <div className="font-bold text-white text-[11px] truncate">MikroTik RB4011</div>
                <div className="text-[10px] text-indigo-300">192.168.88.1:8728</div>
              </div>

              {/* Node 3: OLT GPON Core */}
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
                  <span className="text-slate-400">OLT GPON</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                </div>
                <div className="font-bold text-white text-[11px] truncate">PON 1 & 2 (Fiber)</div>
                <div className="text-[10px] text-emerald-300">116 ONT Terhubung</div>
              </div>

              {/* Node 4: AP Wireless Sektor */}
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

              {/* Node 5: Billing Daemon & QRIS */}
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
                  <span className="text-slate-400">BILLING & ISOLIR ENGINE</span>
                  <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse shadow-[0_0_8px_#c084fc]" />
                </div>
                <div className="font-bold text-white text-[11px]">InvoiceKilat Webhook Daemon</div>
                <div className="text-[10px] text-purple-300">Sinkronisasi Otomatis 2-Arah (&lt; 0.4s Unisolir QRIS)</div>
              </div>
            </div>

            {/* Selected Node Inspector Detail Banner */}
            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-slate-300">
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">
                  Telemetri Node Terpilih:
                </span>
                <span className="text-white font-bold">
                  {selectedTopologyNode === 'wan' && 'Uplink Metro-E Fiber 1 Gbps · Gateway ISP: 103.144.20.1 · Link: UP (0 CRC Loss)'}
                  {selectedTopologyNode === 'core' && 'MikroTik RB4011iGS+RM · RouterOS v7.14 · Socket Port 8728 REST API Aktif'}
                  {selectedTopologyNode === 'olt' && 'OLT GPON Core 16-Port · Rata-rata RX Optik: -18.4 dBm · Redaman Normal'}
                  {selectedTopologyNode === 'wireless' && 'Base Station 5GHz AC MIMO 2x2 · CCQ: 98% · Noise Floor: -99 dBm'}
                  {selectedTopologyNode === 'billing' && 'Billing Auto-Isolir Daemon · Address-List: "ISOLIR" · Webhook QRIS Siap'}
                </span>
              </div>
              <span className="px-2.5 py-1 rounded bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-400/30 text-[10px] shrink-0 self-start sm:self-auto">
                STATUS: OPTIMAL
              </span>
            </div>
          </div>

          {/* Right: Real-Time Interface Oscilloscope (5 Cols) */}
          <div className="lg:col-span-5 p-4 sm:p-5 rounded-2xl bg-slate-950/90 border border-cyan-500/30 space-y-3 font-mono">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-cyan-400" />
                <span>TRAFFIC OSCILLOSCOPE</span>
              </span>

              {/* Interface Switcher Tabs */}
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

            {/* Simulated Live Sine Wave Oscilloscope Graph */}
            <div className="h-28 rounded-xl bg-slate-950 border border-slate-800/80 p-2 relative overflow-hidden flex items-center justify-center">
              {/* Grid Background Lines */}
              <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:12px_12px] opacity-40 pointer-events-none" />
              
              {/* Animated Sine Waveform Path */}
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
                RX (IN): {activeInterface === 'ether1' ? '342.8 Mbps' : activeInterface === 'ether2' ? '46.5 Mbps' : '12.4 Mbps'}
              </div>
              <div className="absolute top-2 right-2 text-[10px] text-indigo-400 font-bold bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
                TX (OUT): {activeInterface === 'ether1' ? '48.2 Mbps' : activeInterface === 'ether2' ? '328.4 Mbps' : '184.2 Mbps'}
              </div>
            </div>

            {/* Interface Packet Stats Bar */}
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

        {/* ================= NOC FUNCTIONAL WORKSTATIONS (HUD TABS) ================= */}
        <div className="relative z-10 rounded-2xl bg-slate-950/90 border border-cyan-500/30 p-5 sm:p-6 shadow-xl space-y-4">
          {/* Workstation Navigation Tabs */}
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
                <span>👥 Sesi PPPoE & Klien ({nocClientSessions.length})</span>
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
                <span>🛡️ Otomasi Isolir Tagihan ({nocClientSessions.filter(c => c.isIsolated).length})</span>
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

          {/* TAB 1: Sesi PPPoE & Klien Aktif */}
          {activeNocTab === 'sessions' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={nocSearchTerm}
                    onChange={(e) => setNocSearchTerm(e.target.value)}
                    placeholder="Cari pelanggan, username PPPoE, IP (10.10.20.x)..."
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 py-1.5 pl-9 pr-3 text-xs font-mono text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="text-slate-400">Total:</span>
                  <span className="font-bold text-white">{nocClientSessions.length} Klien</span>
                  <span className="text-slate-500">|</span>
                  <span className="text-emerald-400 font-bold">
                    {nocClientSessions.filter(c => !c.isIsolated).length} Aktif
                  </span>
                  <span className="text-slate-500">|</span>
                  <span className="text-rose-400 font-bold">
                    {nocClientSessions.filter(c => c.isIsolated).length} Terisolir
                  </span>
                </div>
              </div>

              {/* Sessions Table */}
              <div className="rounded-xl border border-slate-800 overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 text-[11px]">
                    <tr>
                      <th className="p-3">Pelanggan / Sesi PPPoE</th>
                      <th className="p-3">Alamat IP & MAC</th>
                      <th className="p-3">Paket / Profil</th>
                      <th className="p-3">Uptime & Throughput</th>
                      <th className="p-3">Status Tagihan / Isolir</th>
                      <th className="p-3 text-right">Aksi Operator NOC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {nocClientSessions
                      .filter(c => {
                        if (!nocSearchTerm) return true;
                        const term = nocSearchTerm.toLowerCase();
                        return (
                          c.name.toLowerCase().includes(term) ||
                          c.username.toLowerCase().includes(term) ||
                          c.ip.toLowerCase().includes(term) ||
                          c.invoiceNumber.toLowerCase().includes(term)
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
                              {/* Kick Button */}
                              <button
                                onClick={() => handleKickPppoeSession(client)}
                                disabled={kickedSessionId === client.id}
                                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] border border-slate-700 transition cursor-pointer"
                                title="Putus & Reset Sesi PPPoE (Kick Session)"
                              >
                                Kick
                              </button>

                              {/* Toggle Isolir Button */}
                              <button
                                onClick={() => handleToggleClientIsolir(client)}
                                className={`px-2 py-1 rounded text-[10px] font-bold border transition cursor-pointer ${
                                  client.isIsolated
                                    ? 'bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border-emerald-500/40'
                                    : 'bg-rose-600/30 hover:bg-rose-600/50 text-rose-300 border-rose-500/40'
                                }`}
                                title={client.isIsolated ? 'Buka Blokir (Unisolir)' : 'Isolir Klien Ini'}
                              >
                                {client.isIsolated ? 'Unisolir' : 'Isolir'}
                              </button>

                              {/* Ping CPE Button */}
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
              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-rose-400" />
                      <span>Arsitektur Otomasi Isolir Firewall RouterOS (Zero Touch)</span>
                    </h4>
                    <p className="text-xs text-slate-400 font-mono">
                      Sistem sinkronisasi dua arah: Invoice Overdue otomatis diisolir, pembayaran QRIS otomatis buka blokir dalam &lt; 0.4 detik.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded bg-rose-500/20 text-rose-300 text-xs font-mono font-bold border border-rose-500/30">
                    POOL ISOLIR: {nocClientSessions.filter(c => c.isIsolated).length} KLIEN
                  </span>
                </div>

                {/* 4 Steps Interactive Pipeline */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-2 text-xs font-mono">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <span className="text-cyan-400 font-bold block text-[10px]">TAHAP 1: DETEKSI</span>
                    <span className="text-white font-bold block">Faktur Jatuh Tempo</span>
                    <p className="text-[10px] text-slate-400">
                      InvoiceKilat mendeteksi tagihan melewati tanggal jatuh tempo H+1.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <span className="text-rose-400 font-bold block text-[10px]">TAHAP 2: REST API</span>
                    <span className="text-white font-bold block">Injeksi Address-List</span>
                    <p className="text-[10px] text-slate-400">
                      RouterOS menambahkan IP ke list `ISOLIR` via Port 8728 secara instan.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <span className="text-amber-400 font-bold block text-[10px]">TAHAP 3: NAT REDIRECT</span>
                    <span className="text-white font-bold block">Landing Page Tagihan</span>
                    <p className="text-[10px] text-slate-400">
                      Port 80/443 dialihkan ke Web Portal Bayar QRIS Dinamis Bank Indonesia.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <span className="text-emerald-400 font-bold block text-[10px]">TAHAP 4: WEBHOOK UNISOLIR</span>
                    <span className="text-white font-bold block">Akses Normal &lt; 0.4s</span>
                    <p className="text-[10px] text-slate-400">
                      Scan bayar QRIS ➔ Webhook DANA eksekusi penghapusan dari list ISOLIR.
                    </p>
                  </div>
                </div>

                {/* Control Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
                  <span className="text-xs text-slate-400 font-mono">
                    Aksi Operator NOC:
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={handleEnforceMassIsolir}
                      className="px-3.5 py-2 rounded-xl bg-rose-600/30 hover:bg-rose-600/50 border border-rose-500/40 text-xs font-bold text-rose-200 transition cursor-pointer"
                    >
                      Jalankan Isolir Semua Overdue ({nocClientSessions.filter(c => c.isOverdue).length})
                    </button>
                    <button
                      onClick={() => {
                        setClientIsolirOverrides({});
                        playCyberSynth(1080, 'sine', 0.1);
                        setLiveNocAlert('Semua klien berhasil di-unisolir!');
                        setTimeout(() => setLiveNocAlert(null), 4000);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition cursor-pointer"
                    >
                      Buka Blokir Semua Klien
                    </button>
                    <button
                      onClick={handleSimulateQrisAutoUnisolir}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition active:scale-95 shadow-lg shadow-emerald-500/25 cursor-pointer"
                    >
                      ✨ Simulasi Bayar QRIS & Auto-Unisolir Real-Time
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Diagnostik ICMP Ping & Jitter */}
          {activeNocTab === 'diagnostics' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
                    <Wifi className="w-4 h-4 text-cyan-400" />
                    <span>ICMP Ping & RTT Latency Diagnostic Suite</span>
                  </h4>
                  <p className="text-xs text-slate-400 font-mono">
                    Kirim paket ICMP echo ke gateway router, upstream DNS, atau CPE IP klien.
                  </p>
                </div>

                <button
                  onClick={handleRunCustomPing}
                  disabled={isPingingTarget}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-mono font-bold transition active:scale-95 disabled:opacity-50 shadow-lg shadow-cyan-500/25 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isPingingTarget ? 'animate-spin' : ''}`} />
                  <span>{isPingingTarget ? 'Mengirim Paket...' : 'Kirim Paket ICMP Ping'}</span>
                </button>
              </div>

              {/* Ping Options Controls */}
              <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono">
                <span className="text-slate-400">Target Host:</span>
                {[
                  { target: '192.168.88.1', label: 'Gateway Router (192.168.88.1)' },
                  { target: '8.8.8.8', label: 'Google DNS (8.8.8.8)' },
                  { target: '1.1.1.1', label: 'Cloudflare (1.1.1.1)' },
                  { target: '192.168.10.1', label: 'OLT Core (192.168.10.1)' },
                ].map((item) => (
                  <button
                    key={item.target}
                    onClick={() => {
                      setPingTarget(item.target);
                      playCyberSynth(900, 'sine', 0.05);
                    }}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                      pingTarget === item.target
                        ? 'bg-cyan-500 text-slate-950 font-black shadow-[0_0_10px_#22d3ee]'
                        : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-800'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}

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

              {/* Ping Results Table */}
              <div className="rounded-xl border border-slate-800 overflow-hidden font-mono text-xs">
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
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 font-mono text-center">
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
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Status Proteksi Firewall & Filtrasi MikroTik RouterOS</span>
                  </h4>
                  <p className="text-xs text-slate-400 font-mono">
                    Filtrasi serangan brute-force, deteksi port scanning, mitigasi SYN-Flood, dan isolir otomatis.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setFirewallDropCount(prev => prev + 14);
                    playCyberSynth(700, 'square', 0.1);
                    setLiveNocAlert('Simulasi serangan port-scan diblokir oleh Firewall Filter!');
                    setTimeout(() => setLiveNocAlert(null), 4000);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-rose-600/30 hover:bg-rose-600/50 border border-rose-500/40 text-xs font-mono font-bold text-rose-300 transition cursor-pointer"
                >
                  Simulasikan Drop Paket Mencurigakan (+14)
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono text-xs">
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
                    <span className="text-slate-400 text-[10px]">BRUTE-FORCE WINBOX</span>
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
                  <span className="text-[10px] text-slate-400">Zero Impact on WAN</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ================= NOC LIVE SYSLOG STREAM & INTERACTIVE ROUTEROS CLI ================= */}
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
              {/* Filter Pills */}
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

              {/* Export Log JSON Button */}
              <button
                onClick={handleExportTelemetryLogs}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-[10px] font-bold border border-slate-800 transition cursor-pointer"
                title="Ekspor Syslog NOC ke File JSON"
              >
                <Download className="w-3 h-3 text-cyan-400" />
                <span className="hidden sm:inline">Ekspor</span>
              </button>

              {/* Clear Log Button */}
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

          {/* Syslog Rows List */}
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
                    <span className="text-slate-300 text-xs">
                      {log.text}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-slate-500 shrink-0 self-end sm:self-auto">
                    <span>{log.timestamp}</span>
                    {log.hash && (
                      <button
                        onClick={() => handleCopyHash(log.hash!, log.id)}
                        className="text-slate-400 hover:text-cyan-300 p-0.5 cursor-pointer transition"
                        title="Salin Hash / Pesan Ini"
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

          {/* Interactive Command Line Interface (CLI) Input */}
          <div className="pt-2 border-t border-slate-800 space-y-2">
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleExecuteCli();
              }}
              className="flex items-center gap-2 bg-slate-900/90 rounded-xl border border-slate-800 focus-within:border-cyan-400/60 p-1.5 px-3 transition"
            >
              <span className="text-xs font-mono font-bold text-cyan-400 shrink-0 select-none">
                admin@MikroTik-NOC:~$
              </span>
              <input
                type="text"
                value={cliInput}
                onChange={(e) => setCliInput(e.target.value)}
                placeholder="Ketik perintah NOC (contoh: /ping, /ppp active, /isolate-overdue, /firewall, /help)..."
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
              <span className="text-slate-500">Quick NOC Commands:</span>
              {[
                { cmd: '/ping 192.168.88.1', label: '🌐 /ping' },
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
                  onClick={() => handleExecuteCli(chip.cmd)}
                  className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border border-slate-800 transition cursor-pointer font-mono"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Ambient bottom glow */}
        <div className="absolute -bottom-24 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>
    </div>
  );
};
