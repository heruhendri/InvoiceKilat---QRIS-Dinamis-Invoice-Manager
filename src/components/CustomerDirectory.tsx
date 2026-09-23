import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Mail, 
  Phone, 
  Building, 
  MapPin, 
  FileText, 
  Edit3, 
  Trash2, 
  Share2, 
  DollarSign, 
  X,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Cpu,
  Network,
  Activity,
  RefreshCw,
  Server,
  ShieldCheck,
  Check,
  Info,
  Radio,
  Zap,
  Layers,
  ArrowRight,
  Terminal,
  Copy,
  CheckCheck,
  Eye,
  Code2,
  Globe,
  AlertTriangle,
  UserX,
  HardDrive,
  Play,
  Pause,
  Clock,
  Timer
} from 'lucide-react';
import { CustomerRecord, CustomerMode, MikrotikConfig, Invoice, PppoeActiveUser, RecurringAddonService } from '../types';
import { formatRupiah } from '../utils/formatters';

interface CustomerDirectoryProps {
  customers: CustomerRecord[];
  invoices?: Invoice[];
  recurringAddons?: RecurringAddonService[];
  onAddCustomer?: (customer: Partial<CustomerRecord>) => Promise<void>;
  onUpdateCustomer?: (id: string, customer: Partial<CustomerRecord>) => Promise<void>;
  onSaveCustomer?: (customer: Partial<CustomerRecord>) => Promise<void>;
  onDeleteCustomer: (id: string) => Promise<void>;
  onCreateInvoiceForCustomer: (customer: CustomerRecord) => void;
  onOpenPortalForCustomer?: (phoneOrEmail: string) => void;
}

export const CustomerDirectory: React.FC<CustomerDirectoryProps> = ({
  customers,
  invoices,
  recurringAddons = [],
  onAddCustomer,
  onUpdateCustomer,
  onSaveCustomer,
  onDeleteCustomer,
  onCreateInvoiceForCustomer,
  onOpenPortalForCustomer,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModeFilter, setSelectedModeFilter] = useState<'all' | 'biasa' | 'noc'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerRecord | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<CustomerRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Syncing state per customer ID
  const [syncingIds, setSyncingIds] = useState<string[]>([]);

  // Modal to view PPPoE user list of a customer
  const [pppoeModalCustomer, setPppoeModalCustomer] = useState<CustomerRecord | null>(null);
  const [pppoeSearchQuery, setPppoeSearchQuery] = useState('');
  const [pppoeFilterType, setPppoeFilterType] = useState<'all' | 'non-isolir' | 'isolir'>('all');

  // Form states
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('628');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [customerMode, setCustomerMode] = useState<CustomerMode>('biasa');

  // Recurring billing & Add-on services per customer
  const [recurringEnabled, setRecurringEnabled] = useState<boolean>(true);
  const [includeVpn, setIncludeVpn] = useState<boolean>(false);
  const [includeMonitoring, setIncludeMonitoring] = useState<boolean>(false);
  const [selectedRecurringAddonIds, setSelectedRecurringAddonIds] = useState<string[]>([]);
  const [customMonthlyAmount, setCustomMonthlyAmount] = useState<number>(2500000);

  // PPPoE Billing Calculation: monthly_average vs realtime
  const [pppoeBillingMethod, setPppoeBillingMethod] = useState<'monthly_average' | 'realtime'>('monthly_average');
  const [monthlyAveragePppoeCount, setMonthlyAveragePppoeCount] = useState<number | ''>('');

  // Mikrotik fields
  const [routerName, setRouterName] = useState('');
  const [mikrotikHost, setMikrotikHost] = useState('');
  const [mikrotikPort, setMikrotikPort] = useState(8728);
  const [mikrotikUser, setMikrotikUser] = useState('admin');
  const [mikrotikPass, setMikrotikPass] = useState('');
  const [mikrotikRate, setMikrotikRate] = useState<number>(5000);
  const [isolirProfile, setIsolirProfile] = useState('isolir');
  const [mikrotikProtocol, setMikrotikProtocol] = useState<'auto' | 'api' | 'rest'>('auto');
  const [mikrotikUseSsl, setMikrotikUseSsl] = useState<boolean>(false);

  // Mikrotik input mode tab: 'direct' | 'terminal' | 'push'
  const [mikrotikTab, setMikrotikTab] = useState<'direct' | 'terminal' | 'push'>('direct');
  const [terminalText, setTerminalText] = useState('');
  const [isParsingTerminal, setIsParsingTerminal] = useState(false);
  const [pushScript, setPushScript] = useState('');
  const [isScriptCopied, setIsScriptCopied] = useState(false);
  const [previewTestUsers, setPreviewTestUsers] = useState(false);
  const [kickingUser, setKickingUser] = useState<string | null>(null);

  // Mikrotik test probe state inside modal
  const [isTestingMikrotik, setIsTestingMikrotik] = useState(false);
  const [mikrotikTestResult, setMikrotikTestResult] = useState<any>(null);
  const [mikrotikTestError, setMikrotikTestError] = useState('');

  // Auto-refresh state for live router polling in modal
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState<boolean>(true);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(15);
  const [countdownSeconds, setCountdownSeconds] = useState<number>(15);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const [isAutoRefreshing, setIsAutoRefreshing] = useState<boolean>(false);

  // Manual correction / override state when data doesn't match router
  const [isManualEditActive, setIsManualEditActive] = useState<boolean>(false);
  const [manualActiveCount, setManualActiveCount] = useState<number | ''>('');
  const [manualNonIsolirCount, setManualNonIsolirCount] = useState<number | ''>('');
  const [manualIsolirCount, setManualIsolirCount] = useState<number | ''>('');
  const [manualTotalSecrets, setManualTotalSecrets] = useState<number | ''>('');
  const [manualRouterIdentity, setManualRouterIdentity] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCustomer(null);
    setFormError('');
    setMikrotikTestResult(null);
    setMikrotikTestError('');
    setTerminalText('');
    setPushScript('');
    setIsScriptCopied(false);
    setPreviewTestUsers(false);
    setIsManualEditActive(false);
    setIsAutoRefreshing(false);
  };

  const openAddModal = (initialMode: CustomerMode = 'biasa') => {
    setEditingCustomer(null);
    setName('');
    setCompany('');
    setEmail('');
    setPhone('628');
    setAddress('');
    setNotes('');
    setCustomerMode(initialMode);
    setRecurringEnabled(true);
    setIncludeVpn(false);
    setIncludeMonitoring(false);
    setSelectedRecurringAddonIds([]);
    setPppoeBillingMethod('monthly_average');
    setMonthlyAveragePppoeCount('');
    setCustomMonthlyAmount(2500000);
    setRouterName('');
    setMikrotikHost('');
    setMikrotikPort(8728);
    setMikrotikUser('admin');
    setMikrotikPass('');
    setMikrotikRate(5000);
    setIsolirProfile('isolir');
    setMikrotikProtocol('auto');
    setMikrotikUseSsl(false);
    setMikrotikTab('direct');
    setTerminalText('');
    setPushScript('');
    setIsScriptCopied(false);
    setPreviewTestUsers(false);
    setMikrotikTestResult(null);
    setMikrotikTestError('');
    setManualActiveCount('');
    setManualNonIsolirCount('');
    setManualIsolirCount('');
    setManualTotalSecrets('');
    setManualRouterIdentity('');
    setIsManualEditActive(false);
    setAutoRefreshEnabled(true);
    setAutoRefreshInterval(15);
    setCountdownSeconds(15);
    setLastRefreshedAt(null);
    setIsAutoRefreshing(false);
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (c: CustomerRecord) => {
    setEditingCustomer(c);
    setName(c.name);
    setCompany(c.company || '');
    setEmail(c.email || '');
    setPhone(c.phone || '628');
    setAddress(c.address || '');
    setNotes(c.notes || '');
    setCustomerMode(c.customerMode || 'biasa');
    setRecurringEnabled(c.recurringEnabled !== false);
    setIncludeVpn(c.includeVpn || false);
    setIncludeMonitoring(c.includeMonitoring || false);
    setSelectedRecurringAddonIds(c.recurringAddonIds || []);
    setPppoeBillingMethod(c.pppoeBillingMethod || c.mikrotik?.preferredBillingMethod || 'monthly_average');
    setMonthlyAveragePppoeCount(
      c.monthlyAveragePppoeCount !== undefined
        ? c.monthlyAveragePppoeCount
        : c.mikrotik?.monthlyAverageNonIsolir !== undefined
        ? c.mikrotik.monthlyAverageNonIsolir
        : ''
    );
    setCustomMonthlyAmount(c.customMonthlyAmount || 2500000);
    setMikrotikTab('direct');
    setTerminalText('');
    setPushScript('');
    setIsScriptCopied(false);
    setPreviewTestUsers(false);

    setAutoRefreshEnabled(true);
    setAutoRefreshInterval(15);
    setCountdownSeconds(15);
    setIsAutoRefreshing(false);

    if (c.mikrotik) {
      setRouterName(c.mikrotik.routerName || '');
      setMikrotikHost(c.mikrotik.host || '');
      setMikrotikPort(c.mikrotik.port || 8728);
      setMikrotikUser(c.mikrotik.username || 'admin');
      setMikrotikPass(c.mikrotik.password || '');
      setMikrotikRate(c.mikrotik.ratePerUser || 5000);
      setIsolirProfile(c.mikrotik.isolirProfileName || 'isolir');
      setMikrotikProtocol((c.mikrotik.connectionType as any) === 'mikhmon' ? 'auto' : ((c.mikrotik.connectionType as any) || 'auto'));
      setMikrotikUseSsl(!!c.mikrotik.useSsl);
      setMikrotikTestResult(c.mikrotik);
      setLastRefreshedAt(c.mikrotik.lastSyncedAt ? new Date(c.mikrotik.lastSyncedAt) : null);

      setManualActiveCount(c.mikrotik.activePppoeCount ?? '');
      setManualNonIsolirCount(c.mikrotik.nonIsolirCount ?? '');
      setManualIsolirCount(c.mikrotik.isolirCount ?? '');
      setManualTotalSecrets(c.mikrotik.totalPppoeSecrets ?? '');
      setManualRouterIdentity(c.mikrotik.systemIdentity || c.mikrotik.routerName || '');
    } else {
      setRouterName('');
      setMikrotikHost('');
      setMikrotikPort(8728);
      setMikrotikUser('admin');
      setMikrotikPass('');
      setMikrotikRate(5000);
      setIsolirProfile('isolir');
      setMikrotikProtocol('auto');
      setMikrotikUseSsl(false);
      setMikrotikTestResult(null);
      setLastRefreshedAt(null);

      setManualActiveCount('');
      setManualNonIsolirCount('');
      setManualIsolirCount('');
      setManualTotalSecrets('');
      setManualRouterIdentity('');
    }

    setIsManualEditActive(false);
    setMikrotikTestError('');
    setFormError('');
    setIsModalOpen(true);

    // If existing NOC customer has host configured, perform instant silent refresh
    if (c.customerMode === 'noc' && c.mikrotik?.host && c.mikrotik.host !== 'terminal-winbox') {
      setTimeout(() => {
        handleTestMikrotik({
          host: c.mikrotik!.host,
          port: c.mikrotik!.port,
          username: c.mikrotik!.username,
          password: c.mikrotik!.password,
          protocol: (c.mikrotik!.connectionType as any) || 'auto',
          useSsl: c.mikrotik!.useSsl,
        }, true);
      }, 400);
    }
  };

  // Kick / Disconnect an active PPPoE user session from MikroTik directly
  const handleKickUser = async (userIdentifier: string) => {
    if (!window.confirm(`Apakah Anda yakin ingin memutuskan sesi PPPoE "${userIdentifier}" langsung dari router MikroTik?`)) {
      return;
    }
    setKickingUser(userIdentifier);
    try {
      const res = await fetch('/api/mikrotik/kick-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: editingCustomer?.id,
          userIdentifier,
          config: {
            host: mikrotikHost.trim() || mikrotikTestResult?.host,
            port: Number(mikrotikPort) || mikrotikTestResult?.port || 8728,
            username: mikrotikUser.trim() || mikrotikTestResult?.username || 'admin',
            password: mikrotikPass || mikrotikTestResult?.password || '',
            connectionType: mikrotikProtocol,
            useSsl: mikrotikUseSsl,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Gagal memutuskan sesi user dari MikroTik');
      }

      setToastMessage(`Sesi "${userIdentifier}" berhasil diputuskan dari MikroTik!`);
      setTimeout(() => setToastMessage(null), 3500);

      // Update test result state locally
      if (mikrotikTestResult?.activeUsersList) {
        setMikrotikTestResult({
          ...mikrotikTestResult,
          activeUsersList: mikrotikTestResult.activeUsersList.filter(
            (u: any) => u.name !== userIdentifier && u.id !== userIdentifier
          ),
          activePppoeCount: Math.max(0, (mikrotikTestResult.activePppoeCount || 1) - 1),
          nonIsolirCount: Math.max(0, (mikrotikTestResult.nonIsolirCount || 1) - 1),
        });
      }
    } catch (err: any) {
      alert(err.message || 'Gagal memutuskan sesi user');
    } finally {
      setKickingUser(null);
    }
  };

  // Test / Refresh Mikrotik connection in real-time (Real socket API / REST)
  const handleTestMikrotik = async (
    overrides?: {
      protocol?: 'auto' | 'api' | 'rest';
      port?: number;
      useSsl?: boolean;
      host?: string;
      username?: string;
      password?: string;
      usePreset?: boolean;
    },
    isSilent: boolean = false
  ) => {
    let effHost = overrides?.host !== undefined ? overrides.host : mikrotikHost.trim();
    let effPort = overrides?.port !== undefined ? overrides.port : (Number(mikrotikPort) || 8728);
    let effUser = overrides?.username !== undefined ? overrides.username : (mikrotikUser.trim() || 'admin');
    let effPass = overrides?.password !== undefined ? overrides.password : mikrotikPass;
    let effProtocol = overrides?.protocol || mikrotikProtocol;
    let effSsl = overrides?.useSsl !== undefined ? overrides.useSsl : mikrotikUseSsl;

    // Fast autofill for router ACO with real port 10941
    if (overrides?.usePreset) {
      effHost = 'id-6.hostddns.us';
      effPort = 10941;
      effUser = 'mikhmon';
      effPass = 'rembulan';
      effProtocol = 'api';
      effSsl = false;

      setMikrotikHost('id-6.hostddns.us');
      setMikrotikPort(10941);
      setMikrotikUser('mikhmon');
      setMikrotikPass('rembulan');
      setMikrotikProtocol('api');
      setMikrotikUseSsl(false);
    }

    if (!effHost) {
      if (!isSilent) {
        setMikrotikTestError('IP Host / Domain Mikrotik wajib diisi untuk melakukan pengujian');
      }
      return;
    }

    if (overrides?.protocol) setMikrotikProtocol(effProtocol);
    if (overrides?.port !== undefined) setMikrotikPort(effPort);
    if (overrides?.useSsl !== undefined) setMikrotikUseSsl(effSsl);

    if (isSilent) {
      setIsAutoRefreshing(true);
    } else {
      setIsTestingMikrotik(true);
      setMikrotikTestError('');
    }

    try {
      const res = await fetch('/api/mikrotik/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          routerName: routerName.trim() || 'ACO (CCR2004-16G-2S+)',
          host: effHost,
          port: effPort,
          username: effUser,
          password: effPass,
          connectionType: effProtocol,
          useSsl: effSsl,
          ratePerUser: Number(mikrotikRate) || 5000,
          isolirProfileName: isolirProfile.trim() || 'isolir',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Gagal menguji koneksi Mikrotik');
      }

      const testData = data.data;
      setMikrotikTestResult(testData);
      setLastRefreshedAt(new Date());

      if (testData?.systemIdentity || testData?.routerName) {
        setRouterName(testData.systemIdentity || testData.routerName);
      }

      const detectedCount = testData?.monthlyAverageNonIsolir ?? testData?.nonIsolirCount ?? testData?.activePppoeCount;
      if (detectedCount !== undefined && detectedCount > 0) {
        setMonthlyAveragePppoeCount(detectedCount);
      }

      setManualActiveCount(testData?.activePppoeCount ?? '');
      setManualNonIsolirCount(testData?.nonIsolirCount ?? '');
      setManualIsolirCount(testData?.isolirCount ?? '');
      setManualTotalSecrets(testData?.totalPppoeSecrets ?? '');
      setManualRouterIdentity(testData?.systemIdentity || testData?.routerName || routerName || '');

      if (!isSilent) {
        setToastMessage(data.message || 'Koneksi MikroTik Berhasil Terhubung!');
        setTimeout(() => setToastMessage(null), 4500);
      }
    } catch (err: any) {
      if (!isSilent) {
        setMikrotikTestError(err.message || 'Gagal menghubungi server router');
      }
    } finally {
      if (isSilent) {
        setIsAutoRefreshing(false);
      } else {
        setIsTestingMikrotik(false);
      }
    }
  };

  // Auto-refresh timer effect for MikroTik in the modal
  useEffect(() => {
    if (!isModalOpen || customerMode !== 'noc' || !autoRefreshEnabled) {
      return;
    }

    const host = mikrotikHost.trim() || mikrotikTestResult?.host;
    if (!host || host === 'terminal-winbox' || mikrotikTab === 'terminal') {
      return;
    }

    const timer = setInterval(() => {
      setCountdownSeconds((prev) => {
        if (prev <= 1) {
          if (!isTestingMikrotik && !isAutoRefreshing) {
            handleTestMikrotik(undefined, true);
          }
          return autoRefreshInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [
    isModalOpen,
    customerMode,
    autoRefreshEnabled,
    autoRefreshInterval,
    mikrotikHost,
    mikrotikPort,
    mikrotikUser,
    mikrotikPass,
    mikrotikProtocol,
    mikrotikUseSsl,
    mikrotikRate,
    isolirProfile,
    mikrotikTab,
    isTestingMikrotik,
    isAutoRefreshing,
  ]);

  // Background auto-refresh for NOC customers in customer list
  useEffect(() => {
    const hasNoc = customers.some(
      (c) => c.customerMode === 'noc' && c.mikrotik?.host && c.mikrotik.host !== 'terminal-winbox'
    );
    if (!hasNoc) return;

    const bgInterval = setInterval(async () => {
      const nocCusts = customers.filter(
        (c) => c.customerMode === 'noc' && c.mikrotik?.host && c.mikrotik.host !== 'terminal-winbox'
      );
      for (const cust of nocCusts.slice(0, 3)) {
        if (!syncingIds.includes(cust.id)) {
          try {
            const res = await fetch(`/api/mikrotik/sync/${cust.id}`, { method: 'POST' });
            const data = await res.json();
            if (data.success && onUpdateCustomer && data.customer) {
              await onUpdateCustomer(cust.id, data.customer);
            }
          } catch {
            // silent ignore
          }
        }
      }
    }, 45000);

    return () => clearInterval(bgInterval);
  }, [customers, syncingIds, onUpdateCustomer]);

  // Apply manual numbers when user's router doesn't match probe or is offline
  const handleApplyManualCorrection = () => {
    const activeCount = typeof manualActiveCount === 'number' ? manualActiveCount : (Number(manualActiveCount) || 0);
    const nonIso = typeof manualNonIsolirCount === 'number' ? manualNonIsolirCount : (Number(manualNonIsolirCount) || 0);
    const iso = typeof manualIsolirCount === 'number' ? manualIsolirCount : (Number(manualIsolirCount) || 0);
    const totalSec = typeof manualTotalSecrets === 'number' ? manualTotalSecrets : (Number(manualTotalSecrets) || (activeCount > 0 ? activeCount : 0));
    const rName = manualRouterIdentity.trim() || routerName.trim() || 'MikroTik Router';

    setRouterName(rName);
    setMonthlyAveragePppoeCount(nonIso);

    setMikrotikTestResult((prev: any) => ({
      ...(prev || {}),
      routerName: rName,
      systemIdentity: rName,
      boardName: rName,
      activePppoeCount: activeCount,
      nonIsolirCount: nonIso,
      isolirCount: iso,
      totalPppoeSecrets: totalSec,
      realtimeSource: 'manual_correction',
      lastSyncedAt: new Date().toISOString(),
      connectionStatus: 'connected',
    }));

    setIsManualEditActive(false);
    setToastMessage(`Data router berhasil disesuaikan secara manual: ${nonIso} user non-isolir!`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Clear / Reset router data so user can start fresh with their own router
  const handleClearMikrotikData = () => {
    if (window.confirm('Apakah Anda yakin ingin mereset data router ini agar bisa menghubungkan router Anda sendiri?')) {
      setMikrotikTestResult(null);
      setRouterName('');
      setMikrotikHost('');
      setMikrotikPort(8728);
      setMikrotikUser('admin');
      setMikrotikPass('');
      setMonthlyAveragePppoeCount('');
      setManualActiveCount('');
      setManualNonIsolirCount('');
      setManualIsolirCount('');
      setManualTotalSecrets('');
      setManualRouterIdentity('');
      setIsManualEditActive(false);
      setToastMessage('Data router berhasil di-reset. Silakan masukkan data router Anda.');
      setTimeout(() => setToastMessage(null), 3500);
    }
  };

  // Parse raw text from Winbox Terminal (/ppp active print detail)
  const handleParseTerminal = async () => {
    if (!terminalText.trim()) {
      setMikrotikTestError('Silakan tempel teks output terminal Winbox terlebih dahulu (/ppp active print detail)');
      return;
    }

    setIsParsingTerminal(true);
    setMikrotikTestError('');

    try {
      const res = await fetch('/api/mikrotik/parse-terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: terminalText,
          isolirProfileName: isolirProfile.trim() || 'isolir',
          customerId: editingCustomer?.id,
          ratePerUser: Number(mikrotikRate) || 5000,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Gagal membedah output terminal');
      }

      setMikrotikTestResult({
        routerName: routerName.trim() || 'Mikrotik-Terminal',
        host: mikrotikHost.trim() || 'terminal-winbox',
        port: Number(mikrotikPort) || 8728,
        username: mikrotikUser.trim() || 'admin',
        ratePerUser: Number(mikrotikRate) || 5000,
        isolirProfileName: isolirProfile.trim() || 'isolir',
        connectionStatus: 'connected',
        lastSyncedAt: new Date().toISOString(),
        activePppoeCount: data.data.activePppoeCount,
        nonIsolirCount: data.data.nonIsolirCount,
        isolirCount: data.data.isolirCount,
        activeUsersList: data.data.activeUsersList,
        realtimeSource: 'terminal_import',
      });
      if (!routerName.trim()) {
        setRouterName('Mikrotik-Terminal (Winbox)');
      }
      if (!mikrotikHost.trim()) {
        setMikrotikHost('terminal-winbox');
      }
      if (data.data.nonIsolirCount !== undefined) {
        setMonthlyAveragePppoeCount(data.data.nonIsolirCount);
      }
      setManualActiveCount(data.data.activePppoeCount ?? '');
      setManualNonIsolirCount(data.data.nonIsolirCount ?? '');
      setManualIsolirCount(data.data.isolirCount ?? '');
      setManualTotalSecrets(data.data.activePppoeCount ?? '');
      setManualRouterIdentity(routerName.trim() || 'Mikrotik-Terminal (Winbox)');
      setToastMessage(data.message);
      setTimeout(() => setToastMessage(null), 4500);
    } catch (err: any) {
      setMikrotikTestError(err.message || 'Gagal memproses data terminal');
    } finally {
      setIsParsingTerminal(false);
    }
  };

  // Fetch ready-to-run RouterOS Auto-Push script
  const handleLoadPushScript = async () => {
    try {
      const cid = editingCustomer?.id || 'cust-demo';
      const res = await fetch(`/api/mikrotik/script/${cid}`);
      const data = await res.json();
      if (data.script) {
        setPushScript(data.script);
      }
    } catch (err: any) {
      setPushScript('# Gagal memuat script: ' + err.message);
    }
  };

  // Trigger real-time sync for a specific customer's Mikrotik
  const handleSyncMikrotik = async (cust: CustomerRecord) => {
    if (syncingIds.includes(cust.id)) return;
    setSyncingIds((prev) => [...prev, cust.id]);

    try {
      const res = await fetch(`/api/mikrotik/sync/${cust.id}`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Gagal sinkronisasi data Mikrotik');
      }

      setToastMessage(data.message);
      setTimeout(() => setToastMessage(null), 4500);

      // Trigger update in parent if update handler is available
      if (onUpdateCustomer && data.customer) {
        await onUpdateCustomer(cust.id, data.customer);
      }
    } catch (err: any) {
      setToastMessage(`Error sinkronisasi: ${err.message}`);
      setTimeout(() => setToastMessage(null), 4500);
    } finally {
      setSyncingIds((prev) => prev.filter((id) => id !== cust.id));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Nama pelanggan wajib diisi');
      return;
    }

    const effectiveHost =
      mikrotikHost.trim() ||
      mikrotikTestResult?.host ||
      (mikrotikTab === 'terminal' ? 'terminal-winbox' : '') ||
      (mikrotikTab === 'push' ? 'auto-push-scheduler' : '') ||
      (routerName.trim() ? `${routerName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}.local` : 'mikrotik.router.local');

    if (customerMode === 'noc' && !effectiveHost) {
      setFormError('Untuk Mode NOC, Host / IP Address Mikrotik wajib diisi');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      const mikrotikPayload: MikrotikConfig | undefined = customerMode === 'noc' ? {
        routerName: routerName.trim() || 'Mikrotik-Core',
        host: effectiveHost,
        port: Number(mikrotikPort) || 8728,
        username: mikrotikUser.trim() || 'admin',
        password: mikrotikPass,
        ratePerUser: Number(mikrotikRate) >= 500 ? Number(mikrotikRate) : 5000,
        isolirProfileName: isolirProfile.trim() || 'isolir',
        ...(mikrotikTestResult || {}),
        connectionType: mikrotikProtocol,
        useSsl: mikrotikUseSsl,
        preferredBillingMethod: pppoeBillingMethod,
        monthlyAverageNonIsolir: typeof monthlyAveragePppoeCount === 'number' && !isNaN(monthlyAveragePppoeCount) 
          ? monthlyAveragePppoeCount 
          : (mikrotikTestResult?.monthlyAverageNonIsolir || editingCustomer?.mikrotik?.monthlyAverageNonIsolir || mikrotikTestResult?.nonIsolirCount || editingCustomer?.mikrotik?.nonIsolirCount || 0),
      } : undefined;

      const payload: Partial<CustomerRecord> = {
        ...(editingCustomer ? { id: editingCustomer.id } : {}),
        name: name.trim(),
        company: company.trim(),
        email: email.trim(),
        phone: phone.trim(),
        address: address.trim(),
        notes: notes.trim(),
        customerMode,
        recurringEnabled,
        includeVpn,
        includeMonitoring,
        recurringAddonIds: selectedRecurringAddonIds,
        pppoeBillingMethod,
        monthlyAveragePppoeCount: typeof monthlyAveragePppoeCount === 'number' && !isNaN(monthlyAveragePppoeCount)
          ? monthlyAveragePppoeCount
          : (mikrotikPayload?.monthlyAverageNonIsolir || undefined),
        customMonthlyAmount: Number(customMonthlyAmount) || 0,
        mikrotik: mikrotikPayload,
      };

      if (editingCustomer && onUpdateCustomer) {
        await onUpdateCustomer(editingCustomer.id, payload);
      } else if (onSaveCustomer) {
        await onSaveCustomer(payload);
      } else if (onAddCustomer) {
        await onAddCustomer(payload);
      }

      setToastMessage(
        editingCustomer
          ? `Data pelanggan "${name.trim()}" berhasil diperbarui.`
          : `Pelanggan "${name.trim()}" [${customerMode === 'noc' ? 'Mode NOC Mikrotik' : 'Mode Biasa'}] berhasil ditambahkan.`
      );
      setTimeout(() => setToastMessage(null), 4000);
      closeModal();
    } catch (err: any) {
      setFormError(err.message || 'Gagal menyimpan data pelanggan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!customerToDelete) return;
    setIsDeleting(true);
    setDeleteError('');
    try {
      await onDeleteCustomer(customerToDelete.id);
      const deletedName = customerToDelete.name;
      setCustomerToDelete(null);
      setToastMessage(`Pelanggan "${deletedName}" telah berhasil dihapus.`);
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      setDeleteError(err.message || 'Gagal menghapus pelanggan');
    } finally {
      setIsDeleting(false);
    }
  };

  // Counts for tabs
  const biasaCount = customers.filter((c) => (c.customerMode || 'biasa') === 'biasa').length;
  const nocCount = customers.filter((c) => c.customerMode === 'noc').length;

  const filteredCustomers = customers.filter((c) => {
    const q = searchQuery.toLowerCase();
    const matchesQuery = 
      c.name.toLowerCase().includes(q) ||
      (c.company || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.phone || '').includes(q) ||
      (c.mikrotik?.routerName || '').toLowerCase().includes(q) ||
      (c.mikrotik?.host || '').toLowerCase().includes(q);

    if (!matchesQuery) return false;

    if (selectedModeFilter === 'biasa') {
      return (c.customerMode || 'biasa') === 'biasa';
    }
    if (selectedModeFilter === 'noc') {
      return c.customerMode === 'noc';
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 rounded-3xl p-6 text-white shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/30 text-blue-200 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-blue-400" />
              Manajemen Pelanggan & NOC Mikrotik
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 text-xs font-extrabold uppercase tracking-wider flex items-center gap-1">
              <Cpu className="w-3 h-3 text-cyan-300" />
              Auto-Billing PPPoE
            </span>
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight">
            Daftar Pelanggan & Monitoring Jaringan
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Mendukung pendaftaran <span className="text-white font-bold">Mode Biasa (Manual)</span> dan <span className="text-cyan-300 font-bold">Mode NOC</span> dengan integrasi router Mikrotik untuk mendeteksi user PPPoE aktif non-isolir dan menghitung tagihan monitoring secara otomatis.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            id="btn-add-customer-biasa"
            onClick={() => openAddModal('biasa')}
            className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 px-3.5 py-2.5 text-xs font-bold text-white transition active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Mode Biasa</span>
          </button>

          <button
            id="btn-add-customer-noc"
            onClick={() => openAddModal('noc')}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 px-4 py-2.5 text-xs font-extrabold text-white shadow-lg shadow-indigo-500/25 transition active:scale-95"
          >
            <Cpu className="w-4 h-4 text-cyan-200" />
            <span>+ Daftar Mode NOC</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="space-y-3">
        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedModeFilter('all')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
              selectedModeFilter === 'all'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Semua Pelanggan</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300">
              {customers.length}
            </span>
          </button>

          <button
            onClick={() => setSelectedModeFilter('noc')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
              selectedModeFilter === 'noc'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>Mode NOC (Mikrotik)</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${selectedModeFilter === 'noc' ? 'bg-indigo-700 text-cyan-200' : 'bg-indigo-100 text-indigo-800'}`}>
              {nocCount}
            </span>
          </button>

          <button
            onClick={() => setSelectedModeFilter('biasa')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
              selectedModeFilter === 'biasa'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Mode Biasa (Manual)</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${selectedModeFilter === 'biasa' ? 'bg-blue-700 text-blue-100' : 'bg-slate-100 text-slate-700'}`}>
              {biasaCount}
            </span>
          </button>
        </div>

        {/* Search Input */}
        <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              id="search-customer-input"
              type="text"
              placeholder="Cari berdasarkan nama, perusahaan, IP router Mikrotik, atau nomor WhatsApp..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <span className="text-xs font-semibold text-slate-500 px-2 whitespace-nowrap">
            {filteredCustomers.length} Pelanggan
          </span>
        </div>
      </div>

      {/* Customer Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-semibold">Tidak ada data pelanggan yang sesuai dengan filter.</p>
            <div className="mt-3 flex items-center justify-center gap-2">
              <button
                onClick={() => openAddModal('biasa')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Mode Biasa</span>
              </button>
              <button
                onClick={() => openAddModal('noc')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-bold hover:bg-indigo-100 transition"
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>Tambah Mode NOC</span>
              </button>
            </div>
          </div>
        ) : (
          filteredCustomers.map((cust) => {
            const isNoc = cust.customerMode === 'noc';
            const mk = cust.mikrotik;
            const nonIso = mk?.nonIsolirCount ?? 0;
            const avgNonIso = cust.monthlyAveragePppoeCount !== undefined 
              ? cust.monthlyAveragePppoeCount 
              : (mk?.monthlyAverageNonIsolir !== undefined ? mk.monthlyAverageNonIsolir : nonIso);
            const billingMethod = cust.pppoeBillingMethod || mk?.preferredBillingMethod || 'monthly_average';
            const billableCount = billingMethod === 'monthly_average' ? avgNonIso : nonIso;
            const rate = mk?.ratePerUser ?? 5000;
            const estimatedMonitoringBill = billableCount * rate;
            const isSyncingThis = syncingIds.includes(cust.id);

            return (
              <div
                key={cust.id}
                className={`rounded-3xl border transition flex flex-col justify-between p-5 bg-white shadow-xs hover:shadow-md ${
                  isNoc ? 'border-indigo-200 ring-1 ring-indigo-100' : 'border-slate-200'
                }`}
              >
                <div>
                  {/* Top Header: Badge & Actions */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 shadow-xs ${
                          isNoc
                            ? 'bg-gradient-to-br from-indigo-600 to-blue-700 text-white shadow-indigo-200'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {isNoc ? <Cpu className="w-5 h-5 text-cyan-200" /> : cust.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="overflow-hidden">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="text-sm font-extrabold text-slate-900 truncate">
                            {cust.name}
                          </h3>
                        </div>
                        {cust.company && (
                          <p className="text-xs text-slate-500 flex items-center gap-1 font-medium truncate mt-0.5">
                            <Building className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{cust.company}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => openEditModal(cust)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition"
                        title="Edit Data Pelanggan"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setCustomerToDelete(cust)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                        title="Hapus Pelanggan"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Mode Badge Tag */}
                  <div className="mt-3 flex items-center gap-2">
                    {isNoc ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-black uppercase tracking-wider">
                        <Cpu className="w-3 h-3 text-indigo-500" />
                        Mode NOC Mikrotik
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-wider">
                        <Users className="w-3 h-3 text-slate-500" />
                        Mode Biasa
                      </span>
                    )}

                    {isNoc && mk && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        {mk.boardName || 'Online'}
                      </span>
                    )}

                    {cust.recurringEnabled !== false && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold">
                        <Zap className="w-2.5 h-2.5 text-amber-600" />
                        Tagihan Bulanan
                      </span>
                    )}

                    {cust.includeVpn && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[10px] font-bold">
                        +VPN
                      </span>
                    )}

                    {cust.includeMonitoring && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        +NOC Mon
                      </span>
                    )}
                  </div>

                  {/* Contact Details */}
                  <div className="mt-3 space-y-1 text-xs text-slate-600">
                    {cust.phone && (
                      <div className="flex items-center gap-2 truncate">
                        <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="font-mono text-slate-700">{cust.phone}</span>
                      </div>
                    )}
                    {cust.email && (
                      <div className="flex items-center gap-2 truncate">
                        <Mail className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="truncate">{cust.email}</span>
                      </div>
                    )}
                  </div>

                  {/* ================= MIKROTIK MONITORING BOX (IF MODE NOC) ================= */}
                  {isNoc && (
                    <div className="mt-4 p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white shadow-md relative overflow-hidden">
                      <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2 mb-2.5">
                        <div className="flex items-center gap-2 truncate">
                          <Network className="w-4 h-4 text-cyan-400 shrink-0" />
                          <div className="truncate">
                            <span className="font-bold text-xs text-white block truncate">
                              {mk?.routerName || 'Router Mikrotik'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono block truncate">
                              {mk?.host || '127.0.0.1'}:{mk?.port || 8728}
                            </span>
                          </div>
                        </div>

                        <button
                          id={`btn-sync-mikrotik-${cust.id}`}
                          onClick={() => handleSyncMikrotik(cust)}
                          disabled={isSyncingThis}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-cyan-300 text-[11px] font-bold transition active:scale-95 disabled:opacity-50 shrink-0"
                          title="Sinkronisasi status user PPPoE sekarang"
                        >
                          <RefreshCw className={`w-3 h-3 ${isSyncingThis ? 'animate-spin text-cyan-400' : ''}`} />
                          <span>{isSyncingThis ? 'Sync...' : 'Sync'}</span>
                        </button>
                      </div>

                      {/* PPPoE User Breakdown */}
                      <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
                        <div className={`p-2 rounded-xl border ${
                          billingMethod === 'monthly_average'
                            ? 'bg-emerald-500/15 border-emerald-400/50 ring-1 ring-emerald-400/30'
                            : 'bg-white/5 border-white/10'
                        }`}>
                          <span className="text-[9px] text-slate-400 font-medium block uppercase tracking-wider truncate">
                            Rata² Bulan Ini
                          </span>
                          <div className="flex items-center justify-center gap-0.5 mt-0.5">
                            <span className="text-sm font-black text-emerald-400 font-mono">
                              {avgNonIso}
                            </span>
                            <span className="text-[9px] text-slate-400">User</span>
                          </div>
                          <span className={`text-[8px] font-bold block ${billingMethod === 'monthly_average' ? 'text-emerald-300' : 'text-slate-500'}`}>
                            {billingMethod === 'monthly_average' ? '★ Ditagih' : 'Opsional'}
                          </span>
                        </div>

                        <div className={`p-2 rounded-xl border ${
                          billingMethod === 'realtime'
                            ? 'bg-cyan-500/15 border-cyan-400/50 ring-1 ring-cyan-400/30'
                            : 'bg-white/5 border-white/10'
                        }`}>
                          <span className="text-[9px] text-slate-400 font-medium block uppercase tracking-wider truncate">
                            Live Sekarang
                          </span>
                          <div className="flex items-center justify-center gap-0.5 mt-0.5">
                            <span className="text-sm font-black text-cyan-400 font-mono">
                              {nonIso}
                            </span>
                            <span className="text-[9px] text-slate-400">User</span>
                          </div>
                          <span className={`text-[8px] font-bold block ${billingMethod === 'realtime' ? 'text-cyan-300' : 'text-slate-500'}`}>
                            {billingMethod === 'realtime' ? '★ Ditagih' : 'Live'}
                          </span>
                        </div>

                        <div className="bg-white/5 p-2 rounded-xl border border-white/10">
                          <span className="text-[9px] text-slate-400 font-medium block uppercase tracking-wider truncate">
                            Isolir
                          </span>
                          <div className="flex items-center justify-center gap-0.5 mt-0.5">
                            <span className="text-sm font-black text-amber-400 font-mono">
                              {mk?.isolirCount ?? 0}
                            </span>
                            <span className="text-[9px] text-slate-400">User</span>
                          </div>
                          <span className="text-[8px] text-slate-400 block">
                            Dikecualikan
                          </span>
                        </div>
                      </div>

                      {/* Automated Tagihan Calculation */}
                      <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-xs">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-400">
                              {billableCount} user × {formatRupiah(rate)}
                            </span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/30 text-cyan-300 font-bold">
                              {billingMethod === 'monthly_average' ? 'Metode Rata-rata' : 'Metode Realtime'}
                            </span>
                          </div>
                          <span className="text-xs font-black text-cyan-300 font-mono">
                            {formatRupiah(estimatedMonitoringBill)}
                          </span>
                        </div>

                        <button
                          id={`btn-view-pppoe-${cust.id}`}
                          onClick={() => {
                            setPppoeModalCustomer(cust);
                            setPppoeSearchQuery('');
                            setPppoeFilterType('all');
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/40 text-cyan-200 text-[10px] font-bold border border-indigo-400/30 transition shadow-2xs"
                          title="Lihat rincian nama dan status PPPoE hasil deteksi router"
                        >
                          <Eye className="w-3 h-3 text-cyan-300" />
                          <span>Rincian User ({mk?.nonIsolirCount ?? 0})</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Standard Financial Summary */}
                  <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-50 p-2 rounded-xl">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">
                        Total Terbayar
                      </span>
                      <span className="font-extrabold text-emerald-700 font-mono">
                        {formatRupiah(cust.totalSpent || 0)}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-2 rounded-xl">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">
                        Piutang Aktif
                      </span>
                      <span className="font-extrabold text-amber-700 font-mono">
                        {formatRupiah(cust.pendingBalance || 0)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Quick Action */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-400 font-medium">
                    {cust.totalInvoices || 0} Invoice
                  </span>

                  <div className="flex items-center gap-1.5">
                    {onOpenPortalForCustomer && (
                      <button
                        onClick={() => onOpenPortalForCustomer(cust.phone || cust.email || cust.name)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold transition"
                        title="Buka Portal Tagihan Pelanggan Ini"
                      >
                        <ExternalLink className="w-3 h-3 text-emerald-600" />
                        <span className="hidden sm:inline">Portal</span>
                      </button>
                    )}

                    <button
                      onClick={() => onCreateInvoiceForCustomer(cust)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 ${
                        isNoc
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xs'
                          : 'bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white'
                      }`}
                      title={isNoc ? 'Buat Faktur Otomatis Berdasarkan User PPPoE Aktif' : 'Buat Faktur'}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>{isNoc ? 'Tagih NOC' : 'Buat Faktur'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ================= PPPOE ACTIVE USERS MODAL ================= */}
      {pppoeModalCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 my-auto max-h-[88vh] flex flex-col">
            <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-sm">
                  <Cpu className="w-5 h-5 text-cyan-200" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-white">
                      Daftar User PPPoE Aktif Real: {pppoeModalCustomer.mikrotik?.routerName || 'Router Mikrotik'}
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                      Real RouterOS
                    </span>
                  </div>
                  <p className="text-xs text-cyan-200 font-mono mt-0.5">
                    Host: {pppoeModalCustomer.mikrotik?.host || '-'} • Pelanggan: {pppoeModalCustomer.name}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSyncMikrotik(pppoeModalCustomer)}
                  disabled={syncingIds.includes(pppoeModalCustomer.id)}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-cyan-200 text-xs font-bold border border-white/10 transition flex items-center gap-1.5 disabled:opacity-50"
                  title="Tarik sesi terbaru langsung dari Router"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncingIds.includes(pppoeModalCustomer.id) ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Sinkronkan</span>
                </button>

                <button
                  onClick={() => setPppoeModalCustomer(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Filter and metrics inside modal */}
            {pppoeModalCustomer.mikrotik?.activeUsersList && pppoeModalCustomer.mikrotik.activeUsersList.length > 0 ? (
              <>
                <div className="p-4 bg-slate-50 border-b border-slate-100 space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Total Active</span>
                      <span className="text-sm font-black text-slate-900 font-mono">
                        {pppoeModalCustomer.mikrotik.activeUsersList.length} User
                      </span>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-emerald-200 shadow-2xs">
                      <span className="text-[10px] text-emerald-600 font-bold block uppercase">Non-Isolir (Ditagih)</span>
                      <span className="text-sm font-black text-emerald-700 font-mono">
                        {pppoeModalCustomer.mikrotik.activeUsersList.filter(u => !u.isIsolir).length} User
                      </span>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-amber-200 shadow-2xs">
                      <span className="text-[10px] text-amber-600 font-bold block uppercase">Isolir (Dikecualikan)</span>
                      <span className="text-sm font-black text-amber-700 font-mono">
                        {pppoeModalCustomer.mikrotik.activeUsersList.filter(u => u.isIsolir).length} User
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Cari username PPPoE, IP address, atau profile..."
                        value={pppoeSearchQuery}
                        onChange={(e) => setPppoeSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs">
                      <button
                        onClick={() => setPppoeFilterType('all')}
                        className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                          pppoeFilterType === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        Semua
                      </button>
                      <button
                        onClick={() => setPppoeFilterType('non-isolir')}
                        className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                          pppoeFilterType === 'non-isolir' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        Non-Isolir
                      </button>
                      <button
                        onClick={() => setPppoeFilterType('isolir')}
                        className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                          pppoeFilterType === 'isolir' ? 'bg-amber-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        Isolir
                      </button>
                    </div>
                  </div>
                </div>

                {/* Scrollable list */}
                <div className="overflow-y-auto flex-1 divide-y divide-slate-100 p-2">
                  {pppoeModalCustomer.mikrotik.activeUsersList
                    .filter((u) => {
                      const q = pppoeSearchQuery.toLowerCase();
                      const matches = 
                        u.name.toLowerCase().includes(q) ||
                        (u.address || '').includes(q) ||
                        (u.profile || '').toLowerCase().includes(q);
                      if (!matches) return false;

                      if (pppoeFilterType === 'non-isolir') return !u.isIsolir;
                      if (pppoeFilterType === 'isolir') return u.isIsolir;
                      return true;
                    })
                    .map((u, idx) => (
                      <div key={idx} className="p-2.5 flex items-center justify-between hover:bg-slate-50 rounded-xl transition text-xs">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-xs ${
                            u.isIsolir ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            #{idx + 1}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 font-mono">{u.name}</span>
                              {u.isIsolir ? (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase bg-amber-100 text-amber-800">
                                  Isolir
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase bg-emerald-100 text-emerald-800">
                                  Non-Isolir (Ditagih)
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                              IP: {u.address || '-'} • Profile: {u.profile || '-'} • Uptime: {u.uptime || '-'}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-black font-mono text-slate-700">
                            {u.isIsolir ? 'Rp 0' : formatRupiah(pppoeModalCustomer.mikrotik?.ratePerUser || 5000)}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </>
            ) : (
              <div className="p-8 text-center space-y-4 my-auto">
                <div className="mx-auto w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Activity className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Belum Ada Sesi Tersimpan</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                    Silakan sinkronkan data langsung dari router MikroTik atau edit data pelanggan untuk melakukan tes deteksi sesi.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => handleSyncMikrotik(pppoeModalCustomer)}
                    disabled={syncingIds.includes(pppoeModalCustomer.id)}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncingIds.includes(pppoeModalCustomer.id) ? 'animate-spin' : ''}`} />
                    <span>Sinkronkan Router Sekarang</span>
                  </button>
                  <button
                    onClick={() => {
                      const cust = pppoeModalCustomer;
                      setPppoeModalCustomer(null);
                      openEditModal(cust);
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
                  >
                    Buka Pengaturan Router
                  </button>
                </div>
              </div>
            )}

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                Dideteksi otomatis dari Router MikroTik (Non-Dummy)
              </span>
              <button
                onClick={() => {
                  const cust = pppoeModalCustomer;
                  setPppoeModalCustomer(null);
                  onCreateInvoiceForCustomer(cust);
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Buat Invoice dengan Data Ini</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= DELETE CUSTOMER MODAL ================= */}
      {customerToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 my-auto">
            <div className="p-6 text-center space-y-4">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shadow-xs">
                <Trash2 className="w-7 h-7 text-rose-600" />
              </div>

              <div>
                <h3 className="text-lg font-black text-slate-900">
                  Hapus Data Pelanggan?
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Apakah Anda yakin ingin menghapus data kontak <span className="font-bold text-slate-900">{customerToDelete.name}</span>{customerToDelete.company ? ` (${customerToDelete.company})` : ''}?
                </p>
              </div>

              {/* Warning if customer has invoices */}
              {customerToDelete.totalInvoices && customerToDelete.totalInvoices > 0 ? (
                <div className="text-left p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-800">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Perhatian: Ada {customerToDelete.totalInvoices} Invoice Terkait</span>
                  </div>
                  <p className="text-[11px] text-amber-700 leading-relaxed">
                    Pelanggan ini memiliki {customerToDelete.totalInvoices} faktur invoice (Total belanja: {formatRupiah(customerToDelete.totalSpent || 0)}, Piutang: {formatRupiah(customerToDelete.pendingBalance || 0)}). Menghapus dari direktori kontak tidak akan menghapus arsip invoice yang sudah diterbitkan.
                  </p>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs text-left">
                  Kontak ini belum memiliki invoice terkait. Data akan dihapus dari direktori pelanggan.
                </div>
              )}

              {deleteError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold text-xs text-left flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{deleteError}</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-center gap-3">
                <button
                  id="btn-cancel-delete-customer"
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setCustomerToDelete(null)}
                  className="w-1/2 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition"
                >
                  Batal
                </button>
                <button
                  id="btn-confirm-delete-customer"
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmDelete}
                  className="w-1/2 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-500/20 transition active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isDeleting ? (
                    <span>Menghapus...</span>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Ya, Hapus</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= ADD / EDIT CUSTOMER MODAL WITH MODE NOC & MIKROTIK ================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-xl rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 my-auto max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className={`p-2.5 rounded-2xl ${editingCustomer ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'}`}>
                  {customerMode === 'noc' ? <Cpu className="w-5 h-5 text-indigo-700" /> : <Users className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    {editingCustomer ? 'Edit Data Pelanggan' : 'Pendaftaran Pelanggan Baru'}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {editingCustomer ? `Perbarui data klien: ${editingCustomer.name}` : 'Pilih mode pendaftaran dan lengkapi profil pelanggan'}
                  </p>
                </div>
              </div>
              <button
                id="btn-close-customer-modal"
                onClick={closeModal}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* ================= STEP 1: PILIHAN MODE PELANGGAN ================= */}
              <div>
                <label className="font-bold text-slate-800 block mb-1.5">
                  Mode Pendaftaran Pelanggan <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Option 1: Mode Biasa */}
                  <div
                    onClick={() => setCustomerMode('biasa')}
                    className={`cursor-pointer p-3.5 rounded-2xl border transition flex items-start gap-3 ${
                      customerMode === 'biasa'
                        ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20 shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                      customerMode === 'biasa' ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                    }`}>
                      {customerMode === 'biasa' && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                    </div>
                    <div>
                      <span className="font-extrabold text-slate-900 block text-xs">
                        Mode Biasa (Manual)
                      </span>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                        Untuk klien ritel, perseorangan, atau korporat standar. Tagihan dibuat manual per item jasa/produk.
                      </p>
                    </div>
                  </div>

                  {/* Option 2: Mode NOC */}
                  <div
                    onClick={() => setCustomerMode('noc')}
                    className={`cursor-pointer p-3.5 rounded-2xl border transition flex items-start gap-3 ${
                      customerMode === 'noc'
                        ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/20 shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                      customerMode === 'noc' ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'
                    }`}>
                      {customerMode === 'noc' && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-indigo-950 text-xs">
                          Mode NOC (Mikrotik)
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-indigo-200 text-indigo-800">
                          Auto
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                        Klien ISP / RTRW Net. Hubungkan router Mikrotik untuk deteksi user PPPoE aktif non-isolir & hitung tagihan otomatis.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Basic Customer Profile Fields */}
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Informasi Identitas & Kontak
                </h4>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Nama Pelanggan / Penanggung Jawab <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="customer-input-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={customerMode === 'noc' ? 'e.g. Hendra Pratama (NOC RTRW Net)' : 'e.g. Budi Gunawan'}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Nama Perusahaan / Nama Brand ISP (Opsional)
                  </label>
                  <input
                    id="customer-input-company"
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder={customerMode === 'noc' ? 'e.g. PT Net Mandiri Fiber / RTRW Net Berkah' : 'e.g. CV Solusindo Utama'}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Nomor WhatsApp
                    </label>
                    <input
                      id="customer-input-phone"
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="628123456789"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Email
                    </label>
                    <input
                      id="customer-input-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="noc@mitranet.id"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Alamat Lengkap
                  </label>
                  <textarea
                    id="customer-input-address"
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Jl. Raya Utama No. 10, Sentral NOC"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* ================= STEP 2: KONFIGURASI MIKROTIK (JIKA MODE NOC DIPILIH) ================= */}
              {customerMode === 'noc' && (
                <div className="pt-3 border-t border-slate-100 space-y-3.5 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700">
                        <Cpu className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-indigo-950 uppercase tracking-wider">
                          Konfigurasi Router Mikrotik Klien
                        </h4>
                        <p className="text-[11px] text-slate-500 font-medium">
                          Sistem akan mendeteksi session PPPoE aktif non-isolir secara otomatis
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-b from-indigo-50/70 via-white to-slate-50/80 border-2 border-indigo-200/90 shadow-sm space-y-4 ring-1 ring-indigo-100/70 transition-all duration-300">
                    {/* AUTO-REFRESH LIVE STATUS & CONTROLS BANNER */}
                    <div className="p-3 sm:p-3.5 rounded-2xl bg-white border border-indigo-100 shadow-xs space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="relative flex items-center justify-center shrink-0">
                            <span className={`w-3.5 h-3.5 rounded-full ${autoRefreshEnabled ? 'bg-emerald-500 animate-ping opacity-60' : 'bg-slate-300'} absolute`} />
                            <span className={`w-2.5 h-2.5 rounded-full ${autoRefreshEnabled ? 'bg-emerald-500' : 'bg-slate-400'} relative`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
                              <span>Penyegaran Otomatis MikroTik</span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                                autoRefreshEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                              }`}>
                                {autoRefreshEnabled ? 'Aktif' : 'Dijeda'}
                              </span>
                            </div>
                            <p className="text-[10.5px] text-slate-500">
                              {autoRefreshEnabled ? (
                                <span>
                                  Menyegarkan otomatis setiap <b className="text-indigo-600 font-semibold">{autoRefreshInterval} detik</b> • Hitung mundur: <b className="text-emerald-700 font-mono font-bold">{countdownSeconds}s</b>
                                </span>
                              ) : (
                                <span>Penyegaran otomatis dijeda. Klik "Lanjutkan" untuk menyegarkan otomatis kembali.</span>
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Quick Controls */}
                        <div className="flex flex-wrap items-center gap-1.5 ml-auto">
                          {/* Interval Selector Chips */}
                          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[10px] font-mono">
                            {[10, 15, 30, 60].map((sec) => (
                              <button
                                key={sec}
                                type="button"
                                onClick={() => {
                                  setAutoRefreshInterval(sec);
                                  setCountdownSeconds(sec);
                                }}
                                className={`px-2 py-0.5 rounded-md font-bold transition ${
                                  autoRefreshInterval === sec
                                    ? 'bg-white text-indigo-700 shadow-2xs font-extrabold'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                                title={`Interval ${sec} detik`}
                              >
                                {sec}s
                              </button>
                            ))}
                          </div>

                          {/* Toggle Pause / Resume */}
                          <button
                            type="button"
                            onClick={() => {
                              const next = !autoRefreshEnabled;
                              setAutoRefreshEnabled(next);
                              if (next) setCountdownSeconds(autoRefreshInterval);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 border shadow-2xs ${
                              autoRefreshEnabled
                                ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                            }`}
                          >
                            {autoRefreshEnabled ? (
                              <>
                                <Pause className="w-3 h-3 text-amber-600" />
                                <span>Jeda</span>
                              </>
                            ) : (
                              <>
                                <Play className="w-3 h-3 text-emerald-600" />
                                <span>Lanjutkan</span>
                              </>
                            )}
                          </button>

                          {/* Manual Refresh Now Button */}
                          <button
                            type="button"
                            onClick={() => {
                              handleTestMikrotik(undefined, false);
                              setCountdownSeconds(autoRefreshInterval);
                            }}
                            disabled={isTestingMikrotik || isAutoRefreshing}
                            className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold transition flex items-center gap-1 shadow-2xs disabled:opacity-50"
                            title="Segarkan data saat ini langsung"
                          >
                            <RefreshCw className={`w-3 h-3 ${isTestingMikrotik || isAutoRefreshing ? 'animate-spin' : ''}`} />
                            <span className="hidden sm:inline">Segarkan Sekarang</span>
                          </button>
                        </div>
                      </div>

                      {/* Auto-Refresh Progress / Countdown Bar */}
                      {autoRefreshEnabled && (
                        <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-emerald-500 to-indigo-500 h-1 rounded-full transition-all duration-1000 ease-linear"
                            style={{
                              width: `${Math.min(100, Math.max(0, ((autoRefreshInterval - countdownSeconds) / autoRefreshInterval) * 100))}%`,
                            }}
                          />
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[10.5px] text-slate-500 pt-0.5">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>
                            Terakhir disinkronkan:{' '}
                            <b className="text-slate-700">
                              {lastRefreshedAt
                                ? lastRefreshedAt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                                : mikrotikTestResult?.lastSyncedAt
                                ? new Date(mikrotikTestResult.lastSyncedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                                : 'Menunggu sinkronisasi...'}
                            </b>
                          </span>
                          {isAutoRefreshing && (
                            <span className="text-indigo-600 font-bold flex items-center gap-1 animate-pulse ml-1">
                              <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                              <span>Menyinkronkan otomatis...</span>
                            </span>
                          )}
                        </div>

                        {mikrotikTestResult && (
                          <span className="text-emerald-700 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span className="hidden sm:inline">Realtime Terhubung</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1 text-xs">
                        Nama Router / Identitas <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={routerName}
                        onChange={(e) => setRouterName(e.target.value)}
                        placeholder="e.g. CCR2004-16G-2S+ (ACO)"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500 font-bold"
                        required={customerMode === 'noc'}
                      />
                    </div>

                    {/* METODE PENGAMBILAN DATA SESI REAL */}
                    <div className="pt-2 border-t border-indigo-100">
                      <div className="flex items-center justify-between mb-2">
                        <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Metode Deteksi PPPoE Asli (Bukan Dummy)</span>
                        </label>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          Data Real Live
                        </span>
                      </div>

                      {/* Mode Tabs */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl mb-3 text-xs">
                        <button
                          type="button"
                          onClick={() => setMikrotikTab('direct')}
                          className={`py-2 px-3 rounded-lg font-bold text-center transition flex items-center justify-center gap-1.5 text-xs ${
                            mikrotikTab === 'direct'
                              ? 'bg-white text-indigo-700 shadow-2xs font-extrabold'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <Network className="w-3.5 h-3.5 text-indigo-600" />
                          <span>🔌 MikroTik API / REST</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setMikrotikTab('terminal')}
                          className={`py-2 px-3 rounded-lg font-bold text-center transition flex items-center justify-center gap-1.5 text-xs ${
                            mikrotikTab === 'terminal'
                              ? 'bg-white text-indigo-700 shadow-2xs font-extrabold'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <Terminal className="w-3.5 h-3.5 text-emerald-600" />
                          <span>📋 Impor Winbox</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setMikrotikTab('push');
                            if (!pushScript) handleLoadPushScript();
                          }}
                          className={`py-2 px-3 rounded-lg font-bold text-center transition flex items-center justify-center gap-1.5 text-xs ${
                            mikrotikTab === 'push'
                              ? 'bg-white text-indigo-700 shadow-2xs font-extrabold'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <Code2 className="w-3.5 h-3.5 text-cyan-600" />
                          <span>⚡ Script Auto-Push</span>
                        </button>
                      </div>

                      {/* TAB 1: DIRECT API / REST */}
                      {mikrotikTab === 'direct' && (
                        <div className="space-y-3 bg-white p-3.5 rounded-2xl border border-indigo-100 shadow-2xs">
                          {/* Protocol Selection */}
                          <div>
                            <label className="font-bold text-slate-700 block mb-1.5 text-xs flex items-center justify-between">
                              <span>Pilih Protokol Koneksi:</span>
                              <span className="text-[10px] text-indigo-600 font-semibold">Mendukung RouterOS v6 & v7</span>
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl text-xs">
                              <button
                                type="button"
                                onClick={() => setMikrotikProtocol('auto')}
                                className={`py-1.5 px-2 rounded-lg font-bold transition text-[11px] text-center ${
                                  mikrotikProtocol === 'auto'
                                    ? 'bg-white text-indigo-700 shadow-2xs'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                ⚡ Auto-Detect (API & REST)
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setMikrotikProtocol('api');
                                  if (mikrotikPort === 80 || mikrotikPort === 443) {
                                    setMikrotikPort(mikrotikUseSsl ? 8729 : 8728);
                                  }
                                }}
                                className={`py-1.5 px-2 rounded-lg font-bold transition text-[11px] text-center ${
                                  mikrotikProtocol === 'api'
                                    ? 'bg-white text-indigo-700 shadow-2xs'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                RouterOS API (8728/8729)
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setMikrotikProtocol('rest');
                                  if (mikrotikPort === 8728 || mikrotikPort === 8729) {
                                    setMikrotikPort(mikrotikUseSsl ? 443 : 80);
                                  }
                                }}
                                className={`py-1.5 px-2 rounded-lg font-bold transition text-[11px] text-center ${
                                  mikrotikProtocol === 'rest'
                                    ? 'bg-white text-indigo-700 shadow-2xs'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                REST API RouterOS v7
                              </button>
                            </div>
                          </div>

                          {/* Host & Port */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="sm:col-span-2">
                              <label className="font-bold text-slate-700 block mb-1 text-xs">
                                IP Host / Domain DDNS Mikrotik <span className="text-rose-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={mikrotikHost}
                                onChange={(e) => setMikrotikHost(e.target.value)}
                                placeholder="103.145.22.10 atau sn.mynetname.net"
                                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500 font-mono"
                                required={customerMode === 'noc'}
                              />
                              {(/^192\.168\./.test(mikrotikHost.trim()) ||
                                /^10\./.test(mikrotikHost.trim()) ||
                                /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(mikrotikHost.trim()) ||
                                /^127\./.test(mikrotikHost.trim()) ||
                                mikrotikHost.trim() === 'localhost') && (
                                <div className="mt-1.5 p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[10.5px] flex items-start gap-1.5 leading-snug">
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                                  <span>
                                    <b>IP Lokal (LAN) Terdeteksi:</b> Server cloud tidak dapat menjangkau router LAN tanpa <b>IP Publik / DDNS Cloud</b> atau <b>VPN Remote</b>. Anda dapat menggunakan tab <b>Impor Terminal Winbox</b> atau tombol <b>Gunakan Profil Demo</b> di bawah jika router belum memiliki IP Publik.
                                  </span>
                                </div>
                              )}
                            </div>

                            <div>
                              <label className="font-bold text-slate-700 block mb-1 text-xs">
                                Port (Remote / API / Web)
                              </label>
                              <input
                                type="number"
                                value={mikrotikPort}
                                onChange={(e) => setMikrotikPort(Number(e.target.value))}
                                placeholder="10941 / 8728"
                                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500 font-mono font-bold"
                              />
                            </div>
                          </div>

                          {/* Port Preset Chips & SSL Checkbox */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                            <div className="flex flex-wrap items-center gap-1 text-[10px]">
                              <span className="text-slate-400 font-medium">Preset Port:</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setMikrotikPort(8728);
                                  setMikrotikUseSsl(false);
                                  if (mikrotikProtocol === 'rest') setMikrotikProtocol('auto');
                                }}
                                className={`px-2 py-0.5 rounded-md border font-mono transition ${
                                  mikrotikPort === 8728 && !mikrotikUseSsl
                                    ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                8728 (API)
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setMikrotikPort(8729);
                                  setMikrotikUseSsl(true);
                                  if (mikrotikProtocol === 'rest') setMikrotikProtocol('auto');
                                }}
                                className={`px-2 py-0.5 rounded-md border font-mono transition ${
                                  mikrotikPort === 8729 && mikrotikUseSsl
                                    ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                8729 (API-SSL)
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setMikrotikPort(80);
                                  setMikrotikUseSsl(false);
                                  if (mikrotikProtocol === 'api') setMikrotikProtocol('rest');
                                }}
                                className={`px-2 py-0.5 rounded-md border font-mono transition ${
                                  mikrotikPort === 80 && !mikrotikUseSsl
                                    ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                80 (REST HTTP)
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setMikrotikPort(443);
                                  setMikrotikUseSsl(true);
                                  if (mikrotikProtocol === 'api') setMikrotikProtocol('rest');
                                }}
                                className={`px-2 py-0.5 rounded-md border font-mono transition ${
                                  mikrotikPort === 443 && mikrotikUseSsl
                                    ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                443 (REST HTTPS)
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setMikrotikPort(8080);
                                  setMikrotikUseSsl(false);
                                }}
                                className={`px-2 py-0.5 rounded-md border font-mono transition ${
                                  mikrotikPort === 8080
                                    ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                8080 (Alt Web)
                              </button>
                            </div>

                            <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-700 font-semibold select-none">
                              <input
                                type="checkbox"
                                checked={mikrotikUseSsl}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setMikrotikUseSsl(checked);
                                  if (checked) {
                                    if (mikrotikPort === 8728) setMikrotikPort(8729);
                                    else if (mikrotikPort === 80) setMikrotikPort(443);
                                  } else {
                                    if (mikrotikPort === 8729) setMikrotikPort(8728);
                                    else if (mikrotikPort === 443) setMikrotikPort(80);
                                  }
                                }}
                                className="w-3.5 h-3.5 text-indigo-600 rounded-sm border-slate-300 focus:ring-indigo-500"
                              />
                              <span>Gunakan SSL / TLS</span>
                            </label>
                          </div>

                          {/* Username & Password */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            <div>
                              <label className="font-bold text-slate-700 block mb-1 text-xs">
                                Username API / Web
                              </label>
                              <input
                                type="text"
                                value={mikrotikUser}
                                onChange={(e) => setMikrotikUser(e.target.value)}
                                placeholder="admin / api-user"
                                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500 font-mono"
                              />
                            </div>

                            <div>
                              <label className="font-bold text-slate-700 block mb-1 text-xs">
                                Password API / Web
                              </label>
                              <input
                                type="password"
                                value={mikrotikPass}
                                onChange={(e) => setMikrotikPass(e.target.value)}
                                placeholder="••••••••"
                                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500 font-mono"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => handleTestMikrotik()}
                              disabled={isTestingMikrotik || !mikrotikHost.trim()}
                              className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-300 font-extrabold text-xs shadow-sm transition active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${isTestingMikrotik ? 'animate-spin' : ''}`} />
                              <span>
                                {isTestingMikrotik 
                                  ? 'Menghubungi Router & Memindai Sesi Real...' 
                                  : `Uji Koneksi ${mikrotikProtocol === 'rest' ? 'REST API' : mikrotikProtocol === 'api' ? 'RouterOS API' : 'Auto Scan'} Real`}
                              </span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleTestMikrotik({ usePreset: true })}
                              disabled={isTestingMikrotik}
                              className="w-full py-2.5 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-extrabold text-xs shadow-2xs transition active:scale-95 flex items-center justify-center gap-2"
                              title="Gunakan profil ACO CCR2004 (id-6.hostddns.us:10941)"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                              <span>★ Isi Cepat Router ACO (Port 10941)</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* TAB 2: TERMINAL WINBOX IMPORT */}
                      {mikrotikTab === 'terminal' && (
                        <div className="space-y-3 bg-white p-3 rounded-2xl border border-indigo-100 shadow-2xs">
                          <div className="p-2.5 rounded-xl bg-slate-900 text-slate-300 font-mono text-[11px] leading-relaxed">
                            <span className="text-cyan-400 font-bold block mb-1">Perintah Winbox Terminal:</span>
                            <code>/ppp active print detail</code>
                            <p className="text-[10px] text-slate-400 mt-1 font-sans">
                              Buka Winbox → <b>New Terminal</b> → ketik perintah di atas → blok semua teks hasil (Ctrl+A) lalu salin (Ctrl+C).
                            </p>
                          </div>

                          <div>
                            <label className="font-bold text-slate-700 block mb-1 text-xs">
                              Tempel Teks Output Terminal Winbox:
                            </label>
                            <textarea
                              rows={4}
                              value={terminalText}
                              onChange={(e) => setTerminalText(e.target.value)}
                              placeholder={`Contoh:\n0 name="user01" service=pppoe caller-id="48:8F:5A:11:22:33" address=10.10.1.20 uptime=2d4h profile="10M_HOME"\n1 name="user02" service=pppoe caller-id="00:11:22:33:44:55" address=10.10.1.21 uptime=5h profile="isolir"`}
                              className="w-full px-3 py-2 text-[11px] rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 font-mono text-slate-800"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={handleParseTerminal}
                            disabled={isParsingTerminal || !terminalText.trim()}
                            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-sm transition active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            <Terminal className="w-3.5 h-3.5" />
                            <span>{isParsingTerminal ? 'Membedah Output Terminal...' : 'Proses & Deteksi Sesi Real dari Terminal'}</span>
                          </button>
                        </div>
                      )}

                      {/* TAB 3: AUTO-PUSH SCRIPT */}
                      {mikrotikTab === 'push' && (
                        <div className="space-y-3 bg-white p-3 rounded-2xl border border-indigo-100 shadow-2xs">
                          <p className="text-xs text-slate-600">
                            Untuk router di balik CGNAT / tanpa IP Publik: Pasang script ini di menu Winbox <b>System → Scripts</b> atau <b>Scheduler</b> agar router otomatis mengirimkan data session aktif non-isolir secara berkala.
                          </p>

                          <div className="relative">
                            <pre className="p-3 rounded-xl bg-slate-900 text-cyan-300 font-mono text-[10px] leading-relaxed max-h-36 overflow-y-auto whitespace-pre-wrap">
                              {pushScript || 'Memuat script RouterOS...'}
                            </pre>
                            <button
                              type="button"
                              onClick={() => {
                                if (pushScript) {
                                  navigator.clipboard.writeText(pushScript);
                                  setIsScriptCopied(true);
                                  setTimeout(() => setIsScriptCopied(false), 2500);
                                }
                              }}
                              className="absolute top-2 right-2 px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white text-[10px] font-bold transition flex items-center gap-1"
                            >
                              {isScriptCopied ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  <span>Tersalin!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Salin Script</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Rate Per User & Isolir Profile */}
                    <div className="pt-2 border-t border-indigo-100/60 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-slate-800 text-xs">
                          Tarif per 1 User PPPoE Aktif (Rp 5.000 - Rp 10.000 / Custom)
                        </label>
                        <span className="text-[10px] text-indigo-700 font-bold">
                          {formatRupiah(mikrotikRate)} / user
                        </span>
                      </div>

                      {/* Quick chips for preset pricing */}
                      <div className="flex items-center gap-2">
                        {[5000, 7500, 10000].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setMikrotikRate(preset)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                              mikrotikRate === preset
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {formatRupiah(preset)}
                          </button>
                        ))}

                        <div className="relative flex-1">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                            Rp
                          </span>
                          <input
                            type="number"
                            min={1000}
                            step={500}
                            value={mikrotikRate}
                            onChange={(e) => setMikrotikRate(Number(e.target.value))}
                            placeholder="Custom tarif..."
                            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white font-mono font-bold focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="font-semibold text-slate-600 text-[11px] block mt-1 mb-0.5">
                          Nama Profile Isolir (Dikecualikan dari Tagihan):
                        </label>
                        <input
                          type="text"
                          value={isolirProfile}
                          onChange={(e) => setIsolirProfile(e.target.value)}
                          placeholder="isolir"
                          className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white font-mono"
                        />
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          User dengan profile ini (atau comment berunsur 'isolir', 'expired', 'blokir') otomatis dipisahkan dan <b>TIDAK</b> ditagih.
                        </p>
                      </div>
                    </div>

                    {/* Test Error */}
                    {mikrotikTestError && (
                      <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium space-y-2">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                          <div>
                            <span className="font-bold block text-rose-900">Koneksi / Deteksi Gagal:</span>
                            <span className="leading-relaxed text-rose-700">{mikrotikTestError}</span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-rose-200/60 flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] text-rose-600 font-bold block w-full mb-0.5">Solusi Cepat (Klik untuk Coba Langsung):</span>
                          <button
                            type="button"
                            onClick={() => handleTestMikrotik({ protocol: 'rest', port: 80, useSsl: false })}
                            className="px-2 py-1 rounded-lg bg-white border border-rose-300 text-rose-800 text-[10px] font-bold hover:bg-rose-100 transition shadow-2xs"
                          >
                            Coba REST API (Port 80)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleTestMikrotik({ protocol: 'rest', port: 443, useSsl: true })}
                            className="px-2 py-1 rounded-lg bg-white border border-rose-300 text-rose-800 text-[10px] font-bold hover:bg-rose-100 transition shadow-2xs"
                          >
                            Coba REST HTTPS (Port 443)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleTestMikrotik({ protocol: 'api', port: 8728, useSsl: false })}
                            className="px-2 py-1 rounded-lg bg-white border border-rose-300 text-rose-800 text-[10px] font-bold hover:bg-rose-100 transition shadow-2xs"
                          >
                            Coba Native API (Port 8728)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleTestMikrotik({ protocol: 'api', port: 8729, useSsl: true })}
                            className="px-2 py-1 rounded-lg bg-white border border-rose-300 text-rose-800 text-[10px] font-bold hover:bg-rose-100 transition shadow-2xs"
                          >
                            Coba API-SSL (Port 8729)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleTestMikrotik({ usePreset: true })}
                            className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-[10px] font-bold hover:bg-indigo-700 transition shadow-2xs"
                          >
                            ★ Hubungkan ke Router ACO (Port 10941)
                          </button>
                          <button
                            type="button"
                            onClick={() => setMikrotikTab('terminal')}
                            className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-[10px] font-bold hover:bg-indigo-700 transition shadow-2xs ml-auto"
                          >
                            Gunakan Impor Terminal Winbox
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Manual Override Button when no test result yet */}
                    {!mikrotikTestResult && (
                      <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                        <span className="text-[11px] text-slate-600">
                          Router berada di jaringan lokal (tanpa IP Publik) atau ingin input manual?
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setMikrotikTestResult({
                              routerName: routerName.trim() || 'MikroTik-Router',
                              systemIdentity: routerName.trim() || 'MikroTik-Router',
                              activePppoeCount: 0,
                              nonIsolirCount: 0,
                              isolirCount: 0,
                              realtimeSource: 'manual_correction',
                              lastSyncedAt: new Date().toISOString(),
                              connectionStatus: 'connected',
                            });
                            setIsManualEditActive(true);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] flex items-center gap-1 shadow-2xs transition"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Input / Koreksi Manual</span>
                        </button>
                      </div>
                    )}

                    {/* Test Success Live Telemetry Card & Discrepancy Correction */}
                    {mikrotikTestResult && (
                      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 border border-emerald-200 text-slate-800 space-y-2.5 text-xs animate-in fade-in">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 text-emerald-800 font-extrabold min-w-0">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                            <span className="truncate">
                              {mikrotikTestResult.realtimeSource === 'manual_correction'
                                ? 'Data Terkoreksi Manual'
                                : 'Data Real Terkoneksi'} • {mikrotikTestResult.boardName || mikrotikTestResult.systemIdentity || 'MikroTik Router'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {autoRefreshEnabled && (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-indigo-100 text-indigo-800 flex items-center gap-1 border border-indigo-200">
                                <span className={`w-1.5 h-1.5 rounded-full ${isAutoRefreshing ? 'bg-indigo-600 animate-ping' : 'bg-emerald-500 animate-pulse'}`} />
                                <span>{isAutoRefreshing ? 'Memperbarui...' : `Auto: ${countdownSeconds}s`}</span>
                              </span>
                            )}
                            {mikrotikTestResult.realtimeSource !== 'manual_correction' && (
                              <button
                                type="button"
                                onClick={() => handleTestMikrotik()}
                                disabled={isTestingMikrotik || isAutoRefreshing}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-[11px] flex items-center gap-1 shadow-2xs transition disabled:opacity-50"
                                title="Ambil data real-time terbaru langsung dari router MikroTik"
                              >
                                <RefreshCw className={`w-3 h-3 ${isTestingMikrotik || isAutoRefreshing ? 'animate-spin' : ''}`} />
                                <span>{isTestingMikrotik || isAutoRefreshing ? 'Menyinkronkan...' : 'Segarkan Real-time'}</span>
                              </button>
                            )}
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
                              {mikrotikTestResult.realtimeSource === 'manual_correction' ? (
                                <span className="bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">✏️ Input Manual</span>
                              ) : mikrotikTestResult.realtimeSource === 'terminal_import' ? (
                                <span className="bg-purple-200 text-purple-900 px-2 py-0.5 rounded-full">📋 Terminal Winbox</span>
                              ) : mikrotikTestResult.realtimeSource === 'routeros_rest' ? (
                                <span className="bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded-full hidden sm:inline-block">🌐 REST API</span>
                              ) : (
                                <span className="bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded-full hidden sm:inline-block">⚡ Socket API</span>
                              )}
                            </span>
                          </div>
                        </div>

                        {/* Notice & Discrepancy Correction Banner */}
                        <div className="p-2.5 rounded-xl bg-amber-50/90 border border-amber-200/80 text-amber-950 space-y-1.5 shadow-2xs">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 font-bold text-[11px] text-amber-900">
                              <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span>Data ini tidak sesuai dengan router MikroTik Anda?</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setIsManualEditActive(!isManualEditActive)}
                              className="px-2.5 py-0.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] flex items-center gap-1 transition shadow-2xs"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>{isManualEditActive ? 'Tutup Form' : 'Koreksi Angka Manual'}</span>
                            </button>
                          </div>
                          <p className="text-[10.5px] text-amber-800 leading-relaxed">
                            Data saat ini mungkin berasal dari router contoh (ACO CCR2004) atau profil sebelumnya. Anda dapat <b>mengoreksi langsung jumlah user non-isolir (yang ditagih)</b> sesuai router Anda, atau mereset data router ini:
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            <button
                              type="button"
                              onClick={() => setIsManualEditActive(true)}
                              className="px-2 py-1 rounded-lg bg-white border border-amber-300 text-amber-900 font-semibold text-[10px] hover:bg-amber-100 flex items-center gap-1 transition shadow-2xs"
                            >
                              <Edit3 className="w-3 h-3 text-amber-700" />
                              <span>Koreksi Sesi & Tagihan</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setMikrotikTab('terminal')}
                              className="px-2 py-1 rounded-lg bg-white border border-indigo-200 text-indigo-800 font-semibold text-[10px] hover:bg-indigo-50 flex items-center gap-1 transition shadow-2xs"
                            >
                              <Terminal className="w-3 h-3 text-indigo-600" />
                              <span>Impor via Terminal Winbox</span>
                            </button>
                            <button
                              type="button"
                              onClick={handleClearMikrotikData}
                              className="px-2 py-1 rounded-lg bg-white border border-rose-200 text-rose-700 font-semibold text-[10px] hover:bg-rose-50 flex items-center gap-1 transition shadow-2xs ml-auto"
                            >
                              <Trash2 className="w-3 h-3 text-rose-500" />
                              <span>Reset / Ganti Router Saya</span>
                            </button>
                          </div>
                        </div>

                        {/* Interactive Manual Correction Drawer/Card */}
                        {isManualEditActive && (
                          <div className="p-3 rounded-xl bg-white border-2 border-amber-300 shadow-md space-y-2.5 animate-in slide-in-from-top-1">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                              <span className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                                <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                                <span>Koreksi Angka Manual Sesuai MikroTik Anda</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => setIsManualEditActive(false)}
                                className="text-slate-400 hover:text-slate-600 p-0.5"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              <div>
                                <label className="text-[10px] text-slate-600 block font-bold mb-0.5">
                                  Sesi Aktif Total:
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  value={manualActiveCount}
                                  onChange={(e) => {
                                    const val = e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0);
                                    setManualActiveCount(val);
                                    if (typeof val === 'number') {
                                      const currentIso = typeof manualIsolirCount === 'number' ? manualIsolirCount : 0;
                                      setManualNonIsolirCount(Math.max(0, val - currentIso));
                                    }
                                  }}
                                  className="w-full px-2 py-1.5 rounded-lg border border-slate-300 font-mono text-xs font-bold text-slate-900 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-amber-500"
                                  placeholder="Contoh: 85"
                                />
                              </div>

                              <div>
                                <label className="text-[10px] text-emerald-800 block font-bold mb-0.5">
                                  Non-Isolir (Ditagih):
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  value={manualNonIsolirCount}
                                  onChange={(e) => {
                                    const val = e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0);
                                    setManualNonIsolirCount(val);
                                  }}
                                  className="w-full px-2 py-1.5 rounded-lg border border-emerald-300 font-mono text-xs font-black text-emerald-800 bg-emerald-50 focus:bg-white focus:ring-1 focus:ring-emerald-500"
                                  placeholder="Contoh: 80"
                                />
                              </div>

                              <div>
                                <label className="text-[10px] text-slate-600 block font-bold mb-0.5">
                                  Isolir (Dikecualikan):
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  value={manualIsolirCount}
                                  onChange={(e) => {
                                    const val = e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0);
                                    setManualIsolirCount(val);
                                    if (typeof val === 'number' && typeof manualActiveCount === 'number') {
                                      setManualNonIsolirCount(Math.max(0, manualActiveCount - val));
                                    }
                                  }}
                                  className="w-full px-2 py-1.5 rounded-lg border border-slate-300 font-mono text-xs font-bold text-slate-800 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-amber-500"
                                  placeholder="Contoh: 5"
                                />
                              </div>

                              <div>
                                <label className="text-[10px] text-slate-600 block font-bold mb-0.5">
                                  Identitas Router:
                                </label>
                                <input
                                  type="text"
                                  value={manualRouterIdentity}
                                  onChange={(e) => setManualRouterIdentity(e.target.value)}
                                  className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-900 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-amber-500"
                                  placeholder="Nama Router Anda"
                                />
                              </div>
                            </div>

                            <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                              <button
                                type="button"
                                onClick={() => {
                                  const act = typeof manualActiveCount === 'number' ? manualActiveCount : 0;
                                  const iso = typeof manualIsolirCount === 'number' ? manualIsolirCount : 0;
                                  setManualNonIsolirCount(Math.max(0, act - iso));
                                }}
                                className="text-[10.5px] text-slate-600 hover:text-slate-800 underline flex items-center gap-1"
                              >
                                Auto Hitung: Non-Isolir = Total ({manualActiveCount || 0}) - Isolir ({manualIsolirCount || 0})
                              </button>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setIsManualEditActive(false)}
                                  className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-medium"
                                >
                                  Batal
                                </button>
                                <button
                                  type="button"
                                  onClick={handleApplyManualCorrection}
                                  className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs flex items-center gap-1.5"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Terapkan Angka Ini</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Hardware Telemetry Row */}
                        {(mikrotikTestResult.cpuLoad !== undefined || mikrotikTestResult.freeMemory || mikrotikTestResult.uptime || mikrotikTestResult.totalPppoeSecrets) && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px] font-mono">
                            {mikrotikTestResult.uptime && (
                              <span className="px-2 py-0.5 rounded-md bg-white/90 text-slate-600 border border-slate-200/80">
                                Uptime: <b className="text-slate-800">{mikrotikTestResult.uptime}</b>
                              </span>
                            )}
                            {mikrotikTestResult.cpuLoad !== undefined && (
                              <span className="px-2 py-0.5 rounded-md bg-white/90 text-slate-600 border border-slate-200/80 flex items-center gap-1">
                                <Cpu className="w-3 h-3 text-indigo-600" />
                                <span>CPU: <b className="text-indigo-800">{mikrotikTestResult.cpuLoad}%</b></span>
                              </span>
                            )}
                            {mikrotikTestResult.freeMemory && (
                              <span className="px-2 py-0.5 rounded-md bg-white/90 text-slate-600 border border-slate-200/80 flex items-center gap-1">
                                <Server className="w-3 h-3 text-cyan-600" />
                                <span>RAM: <b className="text-cyan-800">{mikrotikTestResult.freeMemory}</b></span>
                              </span>
                            )}
                            {mikrotikTestResult.totalPppoeSecrets !== undefined && (
                              <span className="px-2 py-0.5 rounded-md bg-white/90 text-slate-600 border border-slate-200/80">
                                Total Secrets: <b className="text-indigo-800">{mikrotikTestResult.totalPppoeSecrets} Akun</b>
                              </span>
                            )}
                            {mikrotikTestResult.lastSyncedAt && (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-100/70 text-emerald-800 border border-emerald-200">
                                Update: {new Date(mikrotikTestResult.lastSyncedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                              </span>
                            )}
                            {mikrotikTestResult.hotspotActiveCount !== undefined && mikrotikTestResult.hotspotActiveCount > 0 && (
                              <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-bold">
                                Hotspot: {mikrotikTestResult.hotspotActiveCount} Aktif
                              </span>
                            )}
                          </div>
                        )}

                        <div className="grid grid-cols-3 gap-2 pt-1">
                          <div 
                            onClick={() => setIsManualEditActive(true)}
                            className="bg-white/90 p-2.5 rounded-xl text-center shadow-2xs border border-slate-100 hover:border-amber-300 cursor-pointer transition relative group"
                            title="Klik untuk ubah angka"
                          >
                            <span className="text-[10px] text-slate-500 block uppercase font-medium">Sesi PPPoE Aktif</span>
                            <span className="text-base font-black text-slate-900 font-mono">
                              {mikrotikTestResult.activePppoeCount ?? 0}
                            </span>
                            <Edit3 className="w-2.5 h-2.5 text-slate-400 group-hover:text-amber-600 absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition" />
                          </div>

                          <div 
                            onClick={() => setIsManualEditActive(true)}
                            className="bg-emerald-100/90 p-2.5 rounded-xl text-center border border-emerald-300 shadow-2xs hover:border-emerald-500 cursor-pointer transition relative group"
                            title="Klik untuk ubah angka non-isolir"
                          >
                            <span className="text-[10px] text-emerald-800 font-bold block uppercase">Non-Isolir (Ditagih)</span>
                            <span className="text-base font-black text-emerald-900 font-mono">
                              {mikrotikTestResult.nonIsolirCount ?? 0}
                            </span>
                            <Edit3 className="w-2.5 h-2.5 text-emerald-600 group-hover:text-emerald-800 absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition" />
                          </div>

                          <div 
                            onClick={() => setIsManualEditActive(true)}
                            className="bg-white/90 p-2.5 rounded-xl text-center shadow-2xs border border-slate-100 hover:border-amber-300 cursor-pointer transition relative group"
                            title="Klik untuk ubah angka isolir"
                          >
                            <span className="text-[10px] text-slate-500 block uppercase font-medium">Isolir (Dikecualikan)</span>
                            <span className="text-base font-black text-slate-700 font-mono">
                              {mikrotikTestResult.isolirCount ?? 0}
                            </span>
                            <Edit3 className="w-2.5 h-2.5 text-slate-400 group-hover:text-amber-600 absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition" />
                          </div>
                        </div>

                        <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between">
                          <span className="text-[11px] text-slate-600">
                            Estimasi Tagihan ({mikrotikTestResult.nonIsolirCount ?? 0} user × {formatRupiah(mikrotikRate)}):
                          </span>
                          <span className="text-sm font-black text-emerald-800 font-mono">
                            {formatRupiah((mikrotikTestResult.nonIsolirCount ?? 0) * mikrotikRate)}
                          </span>
                        </div>

                        {/* Button to view list of detected real users */}
                        {mikrotikTestResult.activeUsersList && mikrotikTestResult.activeUsersList.length > 0 && (
                          <div className="pt-2 border-t border-emerald-200/60">
                            <button
                              type="button"
                              onClick={() => setPreviewTestUsers(!previewTestUsers)}
                              className="w-full py-1.5 rounded-xl bg-white/80 hover:bg-white text-emerald-800 font-bold text-xs border border-emerald-300 transition flex items-center justify-center gap-1.5"
                            >
                              <Eye className="w-3.5 h-3.5 text-emerald-600" />
                              <span>
                                {previewTestUsers 
                                  ? 'Sembunyikan Rincian Sesi' 
                                  : `Lihat Rincian Sesi Terdeteksi (${mikrotikTestResult.activeUsersList.length} User)`
                                }
                              </span>
                            </button>

                            {previewTestUsers && (
                              <div className="mt-2 p-2 rounded-xl bg-white border border-emerald-200 max-h-56 overflow-y-auto divide-y divide-slate-100 text-[11px]">
                                {mikrotikTestResult.activeUsersList.map((u: any, uIdx: number) => (
                                  <div key={uIdx} className="py-2 flex items-center justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                      <span className="font-bold text-slate-800 font-mono truncate block">{u.name}</span>
                                      <span className="text-[10px] text-slate-400 block font-mono truncate">
                                        IP: {u.address || '-'} • Profile: {u.profile || '-'} • Up: {u.uptime || '-'}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                        u.isIsolir ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                                      }`}>
                                        {u.isIsolir ? 'Isolir' : 'Non-Isolir'}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleKickUser(u.name || u.id)}
                                        disabled={kickingUser === (u.name || u.id)}
                                        className="px-2 py-0.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[9.5px] font-bold flex items-center gap-1 transition disabled:opacity-50"
                                        title="Putuskan sesi ini langsung dari MikroTik"
                                      >
                                        <UserX className="w-3 h-3 text-rose-600" />
                                        <span>{kickingUser === (u.name || u.id) ? '...' : 'Putuskan'}</span>
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    {/* Pilihan Metode Perhitungan Tagihan PPPoE */}
                    <div className="pt-3 border-t border-indigo-200/60 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                          <Cpu className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Metode Perhitungan Tagihan PPPoE</span>
                        </label>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-bold">
                          Penagihan Otomatis
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div
                          onClick={() => setPppoeBillingMethod('monthly_average')}
                          className={`cursor-pointer p-3 rounded-xl border transition ${
                            pppoeBillingMethod === 'monthly_average'
                              ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                              : 'bg-white border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 text-xs">Rata² Non-Isolir Bulan Ini</span>
                            {pppoeBillingMethod === 'monthly_average' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                          </div>
                          <p className="text-[10px] text-slate-500 mt-1 leading-tight">
                            Berdasarkan rata-rata user aktif non-isolir dalam bulan ini / pemantauan berkala (Rekomendasi)
                          </p>
                        </div>

                        <div
                          onClick={() => setPppoeBillingMethod('realtime')}
                          className={`cursor-pointer p-3 rounded-xl border transition ${
                            pppoeBillingMethod === 'realtime'
                              ? 'bg-cyan-50 border-cyan-500 ring-2 ring-cyan-500/20 shadow-xs'
                              : 'bg-white border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 text-xs">Snapshot Real-Time</span>
                            {pppoeBillingMethod === 'realtime' && <CheckCircle2 className="w-4 h-4 text-cyan-600" />}
                          </div>
                          <p className="text-[10px] text-slate-500 mt-1 leading-tight">
                            Mengambil total user non-isolir live tepat pada saat tombol penagihan ditekan
                          </p>
                        </div>
                      </div>

                      {pppoeBillingMethod === 'monthly_average' && (
                        <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs">
                          <div>
                            <span className="font-bold text-emerald-900 block text-[11px]">
                              Rata-rata User Aktif Non-Isolir Bulan Ini:
                            </span>
                            <span className="text-[10px] text-emerald-700">
                              Otomatis diperbarui dari telemetri router
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <input
                              type="number"
                              min={0}
                              value={monthlyAveragePppoeCount}
                              onChange={(e) => setMonthlyAveragePppoeCount(e.target.value === '' ? '' : Number(e.target.value))}
                              placeholder={String(mikrotikTestResult?.monthlyAverageNonIsolir ?? editingCustomer?.mikrotik?.monthlyAverageNonIsolir ?? (mikrotikTestResult?.nonIsolirCount ?? 84))}
                              className="w-20 px-2.5 py-1 text-right font-mono font-bold text-xs rounded-lg border border-emerald-300 bg-white focus:ring-2 focus:ring-emerald-500"
                            />
                            <span className="text-slate-600 font-bold text-xs">User</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Pengaturan Tagihan Bulanan Otomatis (Recurring Billing & Layanan Tambahan) */}
              <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span className="font-extrabold text-slate-900 text-xs">
                      Pengaturan Tagihan Bulanan Otomatis (Recurring)
                    </span>
                  </div>
                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={recurringEnabled}
                      onChange={(e) => setRecurringEnabled(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Aktifkan Tagihan Bulanan</span>
                  </label>
                </div>

                {customerMode === 'biasa' && (
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Nominal Tagihan Pokok Bulanan (Rp)
                    </label>
                    <input
                      type="number"
                      value={customMonthlyAmount}
                      onChange={(e) => setCustomMonthlyAmount(Number(e.target.value))}
                      placeholder="2500000"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                <div className="pt-2 border-t border-indigo-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700 block">
                      Sertakan Layanan Tambahan di Setiap Invoice Bulanan Pelanggan Ini:
                    </span>
                    <span className="text-[10px] text-indigo-600 font-bold">
                      {recurringAddons.length} Layanan Tersedia
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <label className={`flex items-start gap-2 p-2.5 rounded-xl border cursor-pointer transition text-xs ${
                      includeVpn ? 'bg-indigo-50/70 border-indigo-300 ring-1 ring-indigo-200' : 'bg-white border-indigo-100 hover:border-indigo-300'
                    }`}>
                      <input
                        type="checkbox"
                        checked={includeVpn}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setIncludeVpn(checked);
                          if (checked) {
                            setSelectedRecurringAddonIds((prev) => Array.from(new Set([...prev, 'addon-vpn'])));
                          } else {
                            setSelectedRecurringAddonIds((prev) => prev.filter((id) => id !== 'addon-vpn'));
                          }
                        }}
                        className="mt-0.5 rounded text-indigo-600"
                      />
                      <div>
                        <span className="font-bold text-slate-900 block text-[11px]">
                          Layanan VPN Remote Mikrotik
                        </span>
                        <span className="text-[10px] text-indigo-600 font-semibold">
                          +Rp 50.000 / bln
                        </span>
                      </div>
                    </label>

                    <label className={`flex items-start gap-2 p-2.5 rounded-xl border cursor-pointer transition text-xs ${
                      includeMonitoring ? 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-200' : 'bg-white border-indigo-100 hover:border-indigo-300'
                    }`}>
                      <input
                        type="checkbox"
                        checked={includeMonitoring}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setIncludeMonitoring(checked);
                          if (checked) {
                            setSelectedRecurringAddonIds((prev) => Array.from(new Set([...prev, 'addon-mon'])));
                          } else {
                            setSelectedRecurringAddonIds((prev) => prev.filter((id) => id !== 'addon-mon'));
                          }
                        }}
                        className="mt-0.5 rounded text-indigo-600"
                      />
                      <div>
                        <span className="font-bold text-slate-900 block text-[11px]">
                          Biaya Monitoring Jaringan NOC 24/7
                        </span>
                        <span className="text-[10px] text-emerald-600 font-semibold">
                          +Rp 250.000 / bln
                        </span>
                      </div>
                    </label>

                    {/* Additional custom recurring addons */}
                    {recurringAddons
                      .filter((addon) => addon.id !== 'addon-vpn' && addon.id !== 'addon-mon')
                      .map((addon) => {
                        const isSelected = selectedRecurringAddonIds.includes(addon.id);
                        return (
                          <label
                            key={addon.id}
                            className={`flex items-start gap-2 p-2.5 rounded-xl border cursor-pointer transition text-xs ${
                              isSelected
                                ? 'bg-indigo-50/70 border-indigo-300 ring-1 ring-indigo-200'
                                : 'bg-white border-indigo-100 hover:border-indigo-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedRecurringAddonIds((prev) => [...prev, addon.id]);
                                } else {
                                  setSelectedRecurringAddonIds((prev) => prev.filter((id) => id !== addon.id));
                                }
                              }}
                              className="mt-0.5 rounded text-indigo-600"
                            />
                            <div>
                              <span className="font-bold text-slate-900 block text-[11px]">
                                {addon.name}
                              </span>
                              <span className="text-[10px] text-blue-600 font-semibold">
                                +{formatRupiah(addon.price)} / {addon.unit || 'bln'}
                              </span>
                            </div>
                          </label>
                        );
                      })}
                  </div>
                </div>
              </div>

              {/* Notes field */}
              <div className="pt-2 border-t border-slate-100">
                <label className="font-bold text-slate-700 block mb-1">
                  Catatan Khusus (Opsional)
                </label>
                <input
                  id="customer-input-notes"
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Kontrak monitoring PPPoE RTRW Net bulanan"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Modal Buttons */}
              <div className="pt-4 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  id="btn-cancel-save-customer"
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition"
                >
                  Batal
                </button>
                <button
                  id="btn-submit-customer"
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold shadow-md shadow-indigo-500/20 disabled:opacity-50 transition active:scale-95 flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <span>Menyimpan...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{editingCustomer ? 'Simpan Perubahan' : 'Simpan Pelanggan'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
