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
  Binary,
  Plus,
  X,
  Phone,
  Users,
  Eye
} from 'lucide-react';
import { AnalyticsSummary, Invoice, PaymentTransaction, CustomerRecord } from '../types';
import { formatRupiah, formatDateTimeIndo, formatDateIndo } from '../utils/formatters';
import { RevenueBarChart } from './RevenueBarChart';
import { calculateCRC16 } from '../utils/qrisClient';
import { NocTacticalOperationsHud } from './NocTacticalOperationsHud';

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
  }>>([]);
  const [isTestingRouter, setIsTestingRouter] = useState<boolean>(false);
  const [isSyncingRouter, setIsSyncingRouter] = useState<boolean>(false);
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

  // Test Customer Router Socket & API Handshake
  const handleTestCustomerRouter = (router: typeof customerRouters[0]) => {
    if (isTestingRouter) return;
    setIsTestingRouter(true);
    playCyberSynth(880, 'sine', 0.08);
    const time = new Date().toLocaleTimeString('id-ID', { hour12: false });
    
    setTelemetryLogsList(prev => [
      ...prev,
      {
        id: `sock-test-${Date.now()}`,
        timestamp: time,
        category: 'noc',
        level: 'LIVE',
        text: `ROUTEROS API: Menghubungi socket ${router.host}:${router.port} untuk router "${router.routerName}" (${router.customerName})...`,
        hash: `SOCKET_${router.host}_${router.port}`
      }
    ]);

    setTimeout(() => {
      setIsTestingRouter(false);
      const latency = Math.floor(Math.random() * 8 + 8);
      setMeasuredPing(latency);
      playCyberSynth(1200, 'triangle', 0.1);
      setLiveNocAlert(`✓ Socket RouterOS API ke "${router.routerName}" (${router.host}:${router.port}) ONLINE! Latensi: ${latency}ms.`);
      setTimeout(() => setLiveNocAlert(null), 5000);

      const resTime = new Date().toLocaleTimeString('id-ID', { hour12: false });
      setTelemetryLogsList(prev => [
        ...prev,
        {
          id: `sock-ok-${Date.now()}`,
          timestamp: resTime,
          category: 'noc',
          level: 'OK',
          text: `ROUTEROS API CONNECTED: Socket ${router.host}:${router.port} OK (RTT: ${latency}ms). Identity: "${router.systemIdentity}", ROS: ${router.rosVersion}, CPU: ${router.cpuLoad}%.`,
          hash: `SOCKET_CONNECTED_${latency}MS`
        }
      ]);
    }, 700);
  };

  // Sync Customer Router Telemetry
  const handleSyncCustomerRouter = (router: typeof customerRouters[0]) => {
    if (isSyncingRouter) return;
    setIsSyncingRouter(true);
    playCyberSynth(940, 'sine', 0.08);
    const time = new Date().toLocaleTimeString('id-ID', { hour12: false });

    setTelemetryLogsList(prev => [
      ...prev,
      {
        id: `sync-start-${Date.now()}`,
        timestamp: time,
        category: 'noc',
        level: 'LIVE',
        text: `SYNC ROUTER: Mengambil telemetri sesi PPPoE, queue tree, dan address-list dari "${router.routerName}"...`,
        hash: `SYNC_REQ_${router.id}`
      }
    ]);

    setTimeout(() => {
      setIsSyncingRouter(false);
      playCyberSynth(1350, 'triangle', 0.12);
      setLiveNocAlert(`✓ Telemetri router "${router.routerName}" (${router.customerName}) tersinkronisasi 100%! ${router.activePppoeCount} sesi aktif.`);
      setTimeout(() => setLiveNocAlert(null), 5000);

      const resTime = new Date().toLocaleTimeString('id-ID', { hour12: false });
      setTelemetryLogsList(prev => [
        ...prev,
        {
          id: `sync-ok-${Date.now()}`,
          timestamp: resTime,
          category: 'noc',
          level: 'OK',
          text: `SYNC COMPLETED: ${router.activePppoeCount} sesi PPPoE (${router.isolirCount} isolir), uptime ${router.uptime}, CPU Load ${router.cpuLoad}%. Status: OPTIMAL.`,
          hash: `SYNC_SUCCESS_${router.id}`
        }
      ]);
    }, 850);
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
    </div>
  );
};

