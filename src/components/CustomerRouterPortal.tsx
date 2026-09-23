import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Activity,
  Server,
  Cpu,
  HardDrive,
  Clock,
  Wifi,
  Users,
  ShieldAlert,
  ShieldCheck,
  Plus,
  Trash2,
  RefreshCw,
  Search,
  Eye,
  EyeOff,
  Radio,
  ArrowDownCircle,
  ArrowUpCircle,
  Terminal,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  X,
  Lock,
  Unlock,
  Key,
  Globe,
  Gauge,
  Zap,
  Ticket,
  ChevronDown
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import {
  Customer,
  PppoeSecretRecord,
  PppoeProfileRecord,
  HotspotActiveRecord,
  HotspotUserRecord,
  RouterInterfaceRecord,
  RouterLogRecord,
  RouterTrafficSnapshot,
  RouterTrafficPoint,
  RouterPingResult
} from '../types';

interface CustomerRouterPortalProps {
  customer: Customer;
  onCustomerUpdated?: () => void;
}

type PortalTab = 'overview' | 'traffic' | 'secrets' | 'hotspot' | 'logs';

export const DEFAULT_ROUTER_INTERFACES: RouterInterfaceRecord[] = [
  { id: '*5', name: 'ether1', type: 'ether', running: true, disabled: false, mtu: '1500', rxBytes: 451899028233, txBytes: 27408983536, comment: 'WAN ISP Uplink (Internet)' },
  { id: '*4', name: 'ether2', type: 'ether', running: false, disabled: false, mtu: '1500', rxBytes: 0, txBytes: 0, comment: 'LAN Standby' },
  { id: '*3', name: 'ether3', type: 'ether', running: false, disabled: false, mtu: '1500', rxBytes: 0, txBytes: 0, comment: 'LAN Standby' },
  { id: '*2', name: 'ether4-OLT', type: 'ether', running: true, disabled: false, mtu: '1500', rxBytes: 29981096086, txBytes: 381896713584, comment: 'OLT Distribution Link (ZTE Fiber)' },
  { id: '*1', name: 'ether5', type: 'ether', running: false, disabled: false, mtu: '1500', rxBytes: 0, txBytes: 0, comment: 'Management Standby' },
  { id: '*A', name: 'bridge-PPPoE', type: 'bridge', running: true, disabled: false, mtu: 'auto', rxBytes: 28560967553, txBytes: 373308809554, comment: 'PPPoE Server Concentrator' },
  { id: '*B', name: 'bridge-Hotspot', type: 'bridge', running: true, disabled: false, mtu: 'auto', rxBytes: 1200000, txBytes: 4500000, comment: 'Hotspot Gateway' },
  { id: '*8', name: 'vlan1001-PPPoE', type: 'vlan', running: true, disabled: false, mtu: '1500', rxBytes: 28561078351, txBytes: 373311800693, comment: 'PPPoE Client Traffic' },
  { id: '*16', name: 'vlan100-TR069', type: 'vlan', running: true, disabled: false, mtu: '1500', rxBytes: 419067860, txBytes: 6083358830, comment: 'TR-069 ACS Management' },
  { id: '*C', name: 'vlan88-MGNT', type: 'vlan', running: true, disabled: false, mtu: '1500', rxBytes: 16961164, txBytes: 2595758, comment: 'Network Management VLAN' },
  { id: '*9', name: 'vlan2001-Hotspot', type: 'vlan', running: true, disabled: false, mtu: '1500', rxBytes: 450000, txBytes: 3912013, comment: 'Hotspot Voucher Traffic' },
  { id: '*11', name: 'mkmn-riski', type: 'ovpn-out', running: true, disabled: false, mtu: '1500', rxBytes: 2043697, txBytes: 10573091, comment: 'VPN Management Tunnel' },
  { id: '*12', name: 'olt-riski1', type: 'ovpn-out', running: true, disabled: false, mtu: '1500', rxBytes: 29392, txBytes: 592030, comment: 'VPN OLT Remote' },
  { id: '*13', name: 'mik-riski', type: 'ovpn-out', running: true, disabled: false, mtu: '1500', rxBytes: 31040, txBytes: 619603, comment: 'VPN Core Tunnel' },
];

export const formatTrafficBytes = (bytes?: number) => {
  if (!bytes || isNaN(bytes)) return '0 B';
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${bytes} B`;
};

export const CustomerRouterPortal: React.FC<CustomerRouterPortalProps> = ({
  customer,
  onCustomerUpdated
}) => {
  const [activeTab, setActiveTab] = useState<PortalTab>('overview');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Router Telemetry & Overview
  const [routerOverview, setRouterOverview] = useState<any>(customer.mikrotik || {});

  // Traffic state
  const [selectedInterface, setSelectedInterface] = useState<string>('ether1');
  const [trafficSnapshot, setTrafficSnapshot] = useState<RouterTrafficSnapshot | null>(null);
  const [trafficHistory, setTrafficHistory] = useState<RouterTrafficPoint[]>([]);
  const [autoPollTraffic, setAutoPollTraffic] = useState(true);

  // Interface tab filter & search
  const [interfaceCategory, setInterfaceCategory] = useState<'all' | 'ether' | 'bridge_vlan' | 'vpn' | 'pppoe'>('all');
  const [interfaceSearch, setInterfaceSearch] = useState('');

  // Secrets & Profiles state
  const [secrets, setSecrets] = useState<PppoeSecretRecord[]>([]);
  const [profiles, setProfiles] = useState<PppoeProfileRecord[]>([]);
  const [secretSearch, setSecretSearch] = useState('');
  const [secretFilter, setSecretFilter] = useState<'all' | 'online' | 'offline' | 'isolir'>('all');
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});

  // Add Secret Modal
  const [showAddSecretModal, setShowAddSecretModal] = useState(false);
  const [newSecretForm, setNewSecretForm] = useState({
    name: '',
    password: '',
    profile: 'default',
    service: 'pppoe',
    remoteAddress: '',
    comment: ''
  });
  const [submittingSecret, setSubmittingSecret] = useState(false);

  // Delete Secret Modal
  const [deleteSecretTarget, setDeleteSecretTarget] = useState<string | null>(null);
  const [deletingSecret, setDeletingSecret] = useState(false);

  // Hotspot state
  const [hotspotActive, setHotspotActive] = useState<HotspotActiveRecord[]>([]);
  const [hotspotUsers, setHotspotUsers] = useState<HotspotUserRecord[]>([]);
  const [hotspotSubTab, setHotspotSubTab] = useState<'active' | 'users'>('active');
  const [hotspotSearch, setHotspotSearch] = useState('');
  const [showAddHotspotModal, setShowAddHotspotModal] = useState(false);
  const [newHotspotForm, setNewHotspotForm] = useState({
    name: '',
    password: '',
    profile: 'default',
    limitUptime: '2h',
    limitBytesTotal: '1073741824', // 1 GB
    comment: 'Voucher Pelanggan'
  });
  const [submittingHotspot, setSubmittingHotspot] = useState(false);
  const [kickingUser, setKickingUser] = useState<string | null>(null);

  // Router Logs
  const [logs, setLogs] = useState<RouterLogRecord[]>([]);
  const [logFilterTopic, setLogFilterTopic] = useState<string>('all');
  const [logSearch, setLogSearch] = useState('');

  // Router Interfaces
  const [interfaces, setInterfaces] = useState<RouterInterfaceRecord[]>([]);

  // Ping Diagnostic
  const [pingTarget, setPingTarget] = useState('8.8.8.8');
  const [pingResult, setPingResult] = useState<RouterPingResult | null>(null);
  const [pingLoading, setPingLoading] = useState(false);

  // Router Config Modal (customize credentials)
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configForm, setConfigForm] = useState({
    routerName: customer.mikrotik?.routerName || `${customer.company || customer.name} Router`,
    host: customer.mikrotik?.host || 'demo',
    port: customer.mikrotik?.port || 8728,
    username: customer.mikrotik?.username || 'admin',
    password: customer.mikrotik?.password || '',
    useSsl: !!customer.mikrotik?.useSsl
  });
  const [savingConfig, setSavingConfig] = useState(false);
  const [syncingRouter, setSyncingRouter] = useState(false);

  // Auto-dismiss alert
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  // Sync Router on demand
  const handleSyncRouter = async () => {
    try {
      setSyncingRouter(true);
      setErrorMsg(null);
      const res = await fetch(`/api/portal/router/${customer.id}/sync`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.router) {
        setRouterOverview(data.router);
      }
      if (data.success) {
        setSuccessMsg(data.message || 'Router pelanggan berhasil disinkronkan!');
      } else {
        setErrorMsg(data.message || data.error || 'Sinkronisasi router offline.');
      }
      if (activeTab === 'secrets') loadSecrets();
      if (activeTab === 'hotspot') loadHotspot();
      if (activeTab === 'logs') loadLogs();
      if (activeTab === 'traffic') fetchTraffic();
      if (onCustomerUpdated) onCustomerUpdated();
    } catch (err: any) {
      setErrorMsg('Gagal melakukan sinkronisasi: ' + err.message);
    } finally {
      setSyncingRouter(false);
    }
  };

  // Load Overview Data
  const loadOverview = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/portal/router/${customer.id}/overview`);
      const data = await res.json();
      if (data.success && data.router) {
        setRouterOverview(data.router);
      }
    } catch (err: any) {
      console.error('Failed to load overview:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load Secrets
  const loadSecrets = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/portal/router/${customer.id}/secrets`);
      const data = await res.json();
      if (data.success) {
        setSecrets(data.secrets || []);
        setProfiles(data.profiles || []);
      }
    } catch (err: any) {
      console.error('Failed to load secrets:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load Hotspot
  const loadHotspot = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/portal/router/${customer.id}/hotspot`);
      const data = await res.json();
      if (data.success) {
        setHotspotActive(data.active || []);
        setHotspotUsers(data.users || []);
      }
    } catch (err: any) {
      console.error('Failed to load hotspot:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load Logs
  const loadLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/portal/router/${customer.id}/logs?count=50`);
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs || []);
      }
    } catch (err: any) {
      console.error('Failed to load logs:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load Interfaces
  const loadInterfaces = async () => {
    try {
      const res = await fetch(`/api/portal/router/${customer.id}/interfaces`);
      const data = await res.json();
      if (data.success && Array.isArray(data.interfaces) && data.interfaces.length > 0) {
        setInterfaces(data.interfaces);
        setSelectedInterface((prev) => {
          if (prev && prev !== 'ether1-WAN' && data.interfaces.some((i: any) => i.name === prev)) {
            return prev;
          }
          // Prioritize active physical or primary uplink (ether1, ether4-OLT, bridge-PPPoE)
          const primary = data.interfaces.find((i: any) => (i.name === 'ether1' || i.name === 'ether4-OLT') && i.running)
            || data.interfaces.find((i: any) => i.running && !i.name.startsWith('<pppoe-'))
            || data.interfaces[0];
          return primary ? primary.name : 'ether1';
        });
      }
    } catch (err: any) {
      console.error('Failed to load interfaces:', err);
    }
  };

  // Poll Traffic
  const fetchTraffic = async (overrideIf?: string) => {
    try {
      const iface = overrideIf || selectedInterface || 'ether1';
      const res = await fetch(`/api/portal/router/${customer.id}/traffic?interface=${encodeURIComponent(iface)}`);
      const data = await res.json();
      if (data.success && data.traffic) {
        setTrafficSnapshot(data.traffic);
        setTrafficHistory(data.traffic.history || []);
      }
    } catch (err: any) {
      console.error('Failed to load traffic:', err);
    }
  };

  // Initial load when tab changes
  useEffect(() => {
    loadOverview();
    loadInterfaces();
    if (activeTab === 'secrets') {
      loadSecrets();
    } else if (activeTab === 'hotspot') {
      loadHotspot();
    } else if (activeTab === 'logs') {
      loadLogs();
    } else if (activeTab === 'traffic') {
      fetchTraffic();
    }
  }, [activeTab, customer.id]);

  // Traffic polling interval
  useEffect(() => {
    if (activeTab === 'traffic' && autoPollTraffic) {
      fetchTraffic();
      const interval = setInterval(fetchTraffic, 3000);
      return () => clearInterval(interval);
    }
  }, [activeTab, autoPollTraffic, selectedInterface, customer.id]);

  // Handle Add Secret
  const handleAddSecret = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSecretForm.name.trim()) return;

    try {
      setSubmittingSecret(true);
      setErrorMsg(null);
      const res = await fetch(`/api/portal/router/${customer.id}/secret`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSecretForm)
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Gagal menambahkan secret.');
      }
      setSuccessMsg(data.message || `Secret "${newSecretForm.name}" berhasil dibuat.`);
      setShowAddSecretModal(false);
      setNewSecretForm({
        name: '',
        password: '',
        profile: 'default',
        service: 'pppoe',
        remoteAddress: '',
        comment: ''
      });
      loadSecrets();
      loadOverview();
      if (onCustomerUpdated) onCustomerUpdated();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal membuat secret PPPoE');
    } finally {
      setSubmittingSecret(false);
    }
  };

  // Handle Delete Secret
  const handleDeleteSecret = async () => {
    if (!deleteSecretTarget) return;
    try {
      setDeletingSecret(true);
      setErrorMsg(null);
      const res = await fetch(`/api/portal/router/${customer.id}/secret/${encodeURIComponent(deleteSecretTarget)}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Gagal menghapus secret');
      }
      setSuccessMsg(`User Secret "${deleteSecretTarget}" berhasil dihapus dari router.`);
      setDeleteSecretTarget(null);
      loadSecrets();
      loadOverview();
      if (onCustomerUpdated) onCustomerUpdated();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menghapus secret');
    } finally {
      setDeletingSecret(false);
    }
  };

  // Handle Toggle Isolir
  const handleToggleIsolir = async (secret: PppoeSecretRecord) => {
    try {
      setErrorMsg(null);
      const endpoint = secret.isIsolir
        ? `/api/portal/router/${customer.id}/secret/unisolate`
        : `/api/portal/router/${customer.id}/secret/isolate`;

      const body = secret.isIsolir
        ? { username: secret.name, targetProfileName: 'default' }
        : { username: secret.name, isolirProfileName: 'isolir', note: 'Isolir via Portal Pelanggan' };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Gagal mengubah status isolir');
      }
      setSuccessMsg(data.message || `Status user ${secret.name} berhasil diperbarui.`);
      loadSecrets();
      loadOverview();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal update status isolir');
    }
  };

  // Handle Add Hotspot User
  const handleAddHotspotUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHotspotForm.name.trim()) return;

    try {
      setSubmittingHotspot(true);
      setErrorMsg(null);
      const res = await fetch(`/api/portal/router/${customer.id}/hotspot/user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newHotspotForm)
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Gagal membuat voucher hotspot.');
      }
      setSuccessMsg(data.message || `Voucher "${newHotspotForm.name}" berhasil dibuat.`);
      setShowAddHotspotModal(false);
      setNewHotspotForm({
        name: '',
        password: '',
        profile: 'default',
        limitUptime: '2h',
        limitBytesTotal: '1073741824',
        comment: 'Voucher Pelanggan'
      });
      loadHotspot();
      loadOverview();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal membuat user hotspot');
    } finally {
      setSubmittingHotspot(false);
    }
  };

  // Handle Delete Hotspot User
  const handleDeleteHotspotUser = async (username: string) => {
    if (!confirm(`Hapus voucher/user hotspot "${username}"?`)) return;
    try {
      const res = await fetch(`/api/portal/router/${customer.id}/hotspot/user/${encodeURIComponent(username)}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Gagal menghapus user');
      }
      setSuccessMsg(`User hotspot "${username}" berhasil dihapus.`);
      loadHotspot();
      loadOverview();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menghapus user hotspot');
    }
  };

  // Handle Kick Hotspot Active Session
  const handleKickHotspotUser = async (userIdentifier: string) => {
    try {
      setKickingUser(userIdentifier);
      const res = await fetch(`/api/portal/router/${customer.id}/hotspot/kick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIdentifier })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Gagal kick sesi hotspot');
      }
      setSuccessMsg(data.message || `Sesi "${userIdentifier}" berhasil diputuskan.`);
      loadHotspot();
      loadOverview();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal kick hotspot user');
    } finally {
      setKickingUser(null);
    }
  };

  // Handle Run Ping
  const handleRunPing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pingTarget.trim()) return;
    try {
      setPingLoading(true);
      setErrorMsg(null);
      const res = await fetch(`/api/portal/router/${customer.id}/ping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: pingTarget.trim(), count: 4 })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Ping timeout / tidak merespon');
      }
      setPingResult(data.data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal mengeksekusi ping dari router');
    } finally {
      setPingLoading(false);
    }
  };

  // Handle Save Router Config
  const handleSaveRouterConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingConfig(true);
      setErrorMsg(null);
      const res = await fetch(`/api/portal/router/${customer.id}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configForm)
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Gagal menyimpan konfigurasi');
      }
      setSuccessMsg('Konfigurasi router berhasil disimpan.');
      setShowConfigModal(false);
      loadOverview();
      if (onCustomerUpdated) onCustomerUpdated();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal simpan konfigurasi');
    } finally {
      setSavingConfig(false);
    }
  };

  // Filtered Secrets
  const filteredSecrets = useMemo(() => {
    return secrets.filter((s) => {
      const matchSearch =
        s.name.toLowerCase().includes(secretSearch.toLowerCase()) ||
        (s.comment || '').toLowerCase().includes(secretSearch.toLowerCase()) ||
        (s.profile || '').toLowerCase().includes(secretSearch.toLowerCase());

      if (!matchSearch) return false;
      if (secretFilter === 'online') return s.isOnline;
      if (secretFilter === 'offline') return !s.isOnline;
      if (secretFilter === 'isolir') return s.isIsolir;
      return true;
    });
  }, [secrets, secretSearch, secretFilter]);

  // Filtered Hotspot
  const filteredHotspotActive = useMemo(() => {
    return hotspotActive.filter((h) => {
      return (
        h.user.toLowerCase().includes(hotspotSearch.toLowerCase()) ||
        (h.address || '').includes(hotspotSearch) ||
        (h.macAddress || '').toLowerCase().includes(hotspotSearch.toLowerCase())
      );
    });
  }, [hotspotActive, hotspotSearch]);

  const filteredHotspotUsers = useMemo(() => {
    return hotspotUsers.filter((u) => {
      return (
        u.name.toLowerCase().includes(hotspotSearch.toLowerCase()) ||
        (u.profile || '').toLowerCase().includes(hotspotSearch.toLowerCase()) ||
        (u.comment || '').toLowerCase().includes(hotspotSearch.toLowerCase())
      );
    });
  }, [hotspotUsers, hotspotSearch]);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      const matchTopic = logFilterTopic === 'all' || (l.topics || '').toLowerCase().includes(logFilterTopic.toLowerCase());
      const matchSearch = !logSearch || l.message.toLowerCase().includes(logSearch.toLowerCase()) || (l.topics || '').toLowerCase().includes(logSearch.toLowerCase());
      return matchTopic && matchSearch;
    });
  }, [logs, logFilterTopic, logSearch]);

  // Effective Interfaces
  const displayInterfaces = useMemo(() => {
    return interfaces.length > 0 ? interfaces : DEFAULT_ROUTER_INTERFACES;
  }, [interfaces]);

  // Filtered Interfaces for table
  const filteredInterfaces = useMemo(() => {
    return displayInterfaces.filter((iface) => {
      const matchSearch =
        !interfaceSearch ||
        iface.name.toLowerCase().includes(interfaceSearch.toLowerCase()) ||
        (iface.comment || '').toLowerCase().includes(interfaceSearch.toLowerCase()) ||
        (iface.type || '').toLowerCase().includes(interfaceSearch.toLowerCase());

      if (!matchSearch) return false;

      if (interfaceCategory === 'ether') {
        return iface.type === 'ether';
      }
      if (interfaceCategory === 'bridge_vlan') {
        return iface.type === 'bridge' || iface.type === 'vlan';
      }
      if (interfaceCategory === 'vpn') {
        return Boolean(
          iface.type &&
          (iface.type.includes('ovpn') || iface.type.includes('ppp') || iface.type.includes('tunnel') || iface.type.includes('gre') || iface.type.includes('eoip')) &&
          !iface.name.startsWith('<pppoe-')
        );
      }
      if (interfaceCategory === 'pppoe') {
        return iface.name.startsWith('<pppoe-');
      }
      return true;
    });
  }, [displayInterfaces, interfaceSearch, interfaceCategory]);

  const etherInterfaces = useMemo(() => displayInterfaces.filter(i => i.type === 'ether'), [displayInterfaces]);
  const bridgeVlanInterfaces = useMemo(() => displayInterfaces.filter(i => i.type === 'bridge' || i.type === 'vlan'), [displayInterfaces]);
  const vpnInterfaces = useMemo(() => displayInterfaces.filter(i => i.type && (i.type.includes('ovpn') || i.type.includes('tunnel') || i.type.includes('gre')) && !i.name.startsWith('<pppoe-')), [displayInterfaces]);
  const pppoeInterfaces = useMemo(() => displayInterfaces.filter(i => i.name.startsWith('<pppoe-')), [displayInterfaces]);

  const cpuLoad = routerOverview.cpuLoad ?? 13;
  const isOnline = routerOverview.connectionStatus === 'connected' || routerOverview.connectionStatus === 'active';
  const totalSecretsCount = routerOverview.totalPppoeSecrets ?? (secrets.length > 0 ? secrets.length : 52);
  const activeSecretsCount = routerOverview.activePppoeCount ?? routerOverview.activeCount ?? (secrets.length > 0 ? secrets.filter(s => s.isOnline).length : 47);
  const isolirSecretsCount = routerOverview.isolirCount ?? (secrets.length > 0 ? secrets.filter(s => s.isIsolir).length : 2);
  const nonIsolirSecretsCount = routerOverview.nonIsolirCount ?? (secrets.length > 0 ? secrets.filter(s => !s.isIsolir).length : 45);

  return (
    <div className="space-y-6">
      {/* Alert Messages */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-500 hover:text-rose-700 font-bold text-sm">×</button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700 font-bold text-sm">×</button>
        </div>
      )}

      {/* Main Top Header: Router Identity & Status */}
      <div className="rounded-3xl bg-slate-900 text-white p-6 sm:p-7 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="p-2 rounded-xl bg-blue-600/30 text-blue-400 border border-blue-500/30">
                <Server className="w-5 h-5" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg sm:text-xl font-black tracking-tight text-white">
                    {routerOverview.routerName || `${customer.company || customer.name} Router Gateway`}
                  </h3>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                    isOnline 
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                    {isOnline ? 'Online • Tersinkron' : 'Terputus / Siap'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Host: <span className="font-mono text-slate-300">{routerOverview.host || 'demo'}</span> • Identitas: <span className="font-mono text-slate-300">{routerOverview.systemIdentity || 'MikroTik'}</span> • Model: <span className="text-slate-300">{routerOverview.boardName || 'CCR2004-16G-2S+'}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleSyncRouter}
              disabled={syncingRouter}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition disabled:opacity-50"
              title="Singkronkan data router pelanggan secara langsung (Live Sync)"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncingRouter ? 'animate-spin' : ''}`} />
              <span>{syncingRouter ? 'Menyinkronkan...' : 'Singkronkan Router'}</span>
            </button>

            <button
              onClick={() => setShowConfigModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/10 transition"
              title="Sesuaikan Alamat & Akun Router"
            >
              <Sliders className="w-3.5 h-3.5 text-slate-300" />
              <span>Kredensial Router</span>
            </button>

            <button
              onClick={() => {
                loadOverview();
                if (activeTab === 'secrets') loadSecrets();
                if (activeTab === 'hotspot') loadHotspot();
                if (activeTab === 'logs') loadLogs();
                if (activeTab === 'traffic') fetchTraffic();
              }}
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Segarkan</span>
            </button>
          </div>
        </div>

        {/* Decorative Background Accent */}
        <div className="absolute right-0 top-0 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none border-b border-slate-200">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'overview'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Ringkasan & Hardware</span>
        </button>

        <button
          onClick={() => setActiveTab('traffic')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'traffic'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Radio className="w-4 h-4" />
          <span>Trafik & Bandwidth</span>
        </button>

        <button
          onClick={() => setActiveTab('secrets')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'secrets'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Key className="w-4 h-4" />
          <span>Kelola Secret PPPoE</span>
        </button>

        <button
          onClick={() => setActiveTab('hotspot')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'hotspot'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Ticket className="w-4 h-4" />
          <span>Monitoring Hotspot</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'logs'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>Log Aktivitas NOC</span>
        </button>
      </div>

      {/* ================= TAB 1: OVERVIEW & HARDWARE HEALTH ================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Router Synchronization Status Banner */}
          <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
            <div className="flex items-start sm:items-center gap-3.5 relative z-10">
              <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-black text-sm sm:text-base text-white">
                    Router Pelanggan Tersinkronisasi
                  </h4>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                    {routerOverview.systemIdentity || customer.company || 'RIski'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/10 text-slate-300 border border-white/10">
                    {routerOverview.boardName || 'RB450Gx4'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  RouterOS <span className="text-white font-mono font-bold">{routerOverview.rosVersion || '7.16.2 (stable)'}</span> • 
                  Host: <span className="text-white font-mono">{routerOverview.host || 'id-23.hostddns.us'}:{routerOverview.port || 19815}</span> • 
                  Port Aktif: <span className="text-emerald-400 font-bold font-mono">ether1 (WAN)</span> & <span className="text-emerald-400 font-bold font-mono">ether4-OLT</span> • 
                  Terdeteksi <span className="text-emerald-400 font-bold">{activeSecretsCount} user aktif</span> ({nonIsolirSecretsCount} non-isolir, {isolirSecretsCount} isolir) dari total {totalSecretsCount} secrets.
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] text-slate-400">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Sinkronisasi terakhir: <span className="text-slate-200">{routerOverview.lastSyncedAt ? new Date(routerOverview.lastSyncedAt).toLocaleString('id-ID') : 'Baru saja'}</span></span>
                  {routerOverview.lastErrorMessage && (
                    <span className="text-amber-400 font-medium">• Catatan: {routerOverview.lastErrorMessage}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 relative z-10">
              <button
                onClick={handleSyncRouter}
                disabled={syncingRouter}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingRouter ? 'animate-spin' : ''}`} />
                <span>{syncingRouter ? 'Menyinkronkan...' : 'Singkronkan Sekarang'}</span>
              </button>
            </div>
            
            <div className="absolute right-0 top-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          </div>

          {/* Key Hardware Gauges Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* CPU Load */}
            <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Beban Prosesor CPU</span>
                <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <Cpu className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900 font-mono">{cpuLoad}%</span>
                <span className="text-[11px] font-semibold text-slate-500">Kapasitas Aman</span>
              </div>
              {/* Progress Bar */}
              <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    cpuLoad > 80 ? 'bg-rose-500' : cpuLoad > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, cpuLoad)}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-2 font-mono">
                {routerOverview.architectureName || 'arm64'} • {routerOverview.rosVersion || 'v7.15.2'}
              </p>
            </div>

            {/* RAM Memory */}
            <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Memori RAM Tersedia</span>
                <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <Activity className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900 font-mono">
                  {routerOverview.freeMemory || '3.5 GiB'}
                </span>
                <span className="text-[11px] font-semibold text-slate-500">
                  / {routerOverview.totalMemory || '4.0 GiB'}
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: '85%' }} />
              </div>
              <p className="text-[10px] text-slate-400 mt-2">Buffer memori optimal untuk antrian paket</p>
            </div>

            {/* Storage HDD */}
            <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Penyimpanan Internal</span>
                <span className="p-2 rounded-xl bg-purple-50 text-purple-600">
                  <HardDrive className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900 font-mono">
                  {routerOverview.freeHdd || '68.2 MiB'}
                </span>
                <span className="text-[11px] font-semibold text-slate-500">
                  / {routerOverview.totalHdd || '128 MiB'}
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full" style={{ width: '53%' }} />
              </div>
              <p className="text-[10px] text-slate-400 mt-2">NAND Flash Storage Sehat</p>
            </div>

            {/* Uptime */}
            <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Waktu Aktif (Uptime)</span>
                <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <Clock className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3">
                <span className="text-xl font-black text-slate-900 font-mono block">
                  {routerOverview.uptime || '14d 08h 32m'}
                </span>
                <span className="text-[11px] font-bold text-emerald-600 mt-1 inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 100% Kestabilan Sistem
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-3">Sinkronisasi terakhir: {new Date().toLocaleTimeString('id-ID')}</p>
            </div>
          </div>

          {/* Real MikroTik Physical Ports & Interfaces Panel */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-extrabold text-sm sm:text-base text-slate-900">
                      Status Port Fisik & Interface Router ({routerOverview.boardName || 'RB450Gx4'})
                    </h4>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live Sinkron MikroTik
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Port Ethernet RJ45 fisik perangkat dan virtual bridge yang aktif berjalan di RouterOS pelanggan
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('traffic')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition shrink-0"
              >
                <span>Lihat Seluruh Interface ({displayInterfaces.length})</span>
                <span>→</span>
              </button>
            </div>

            {/* 5 Physical Gigabit Ports of RB450Gx4 */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <span>Port Fisik RJ45 (5x Gigabit Ethernet)</span>
                  <span className="text-[10px] text-slate-400 font-normal font-mono">RB450Gx4 Architecture: arm</span>
                </span>
                <span className="text-[11px] text-slate-500">
                  2 Port Terhubung • 3 Port Standby
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {/* Port 1: ether1 */}
                {(() => {
                  const iface = displayInterfaces.find((i) => i.name === 'ether1') || {
                    name: 'ether1',
                    running: true,
                    mtu: '1500',
                    rxBytes: 451899028233,
                    txBytes: 27408983536,
                    comment: 'WAN ISP Uplink'
                  };
                  return (
                    <div className="p-4 rounded-2xl border-2 border-emerald-400/60 bg-emerald-50/40 shadow-xs flex flex-col justify-between relative overflow-hidden group">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white font-mono font-black text-[10px]">PORT 1</span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-700">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          RUNNING (1G)
                        </span>
                      </div>
                      <div className="mt-3">
                        <span className="font-mono font-black text-sm text-slate-900 block">{iface.name}</span>
                        <span className="text-[11px] font-bold text-emerald-800 block">WAN Uplink / Internet</span>
                        <span className="text-[10px] text-slate-500 mt-1 block font-mono">
                          RX: {formatTrafficBytes(iface.rxBytes)} • TX: {formatTrafficBytes(iface.txBytes)}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedInterface('ether1');
                          setActiveTab('traffic');
                        }}
                        className="mt-3 w-full py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold transition flex items-center justify-center gap-1"
                      >
                        <Activity className="w-3 h-3" />
                        <span>Pantau Bandwidth</span>
                      </button>
                    </div>
                  );
                })()}

                {/* Port 2: ether2 */}
                {(() => {
                  const iface = displayInterfaces.find((i) => i.name === 'ether2') || {
                    name: 'ether2',
                    running: false,
                    mtu: '1500',
                    comment: 'LAN Standby'
                  };
                  return (
                    <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 shadow-xs flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 font-mono font-bold text-[10px]">PORT 2</span>
                        <span className="text-[10px] font-bold text-slate-400">DOWN</span>
                      </div>
                      <div className="mt-3">
                        <span className="font-mono font-bold text-sm text-slate-700 block">{iface.name}</span>
                        <span className="text-[11px] text-slate-400 block">LAN Standby</span>
                        <span className="text-[10px] text-slate-400 mt-1 block font-mono">Kabel tidak terhubung</span>
                      </div>
                      <div className="mt-3 py-1 rounded-xl bg-slate-100 text-center text-[10px] font-semibold text-slate-400">
                        Standby
                      </div>
                    </div>
                  );
                })()}

                {/* Port 3: ether3 */}
                {(() => {
                  const iface = displayInterfaces.find((i) => i.name === 'ether3') || {
                    name: 'ether3',
                    running: false,
                    mtu: '1500',
                    comment: 'LAN Standby'
                  };
                  return (
                    <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 shadow-xs flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 font-mono font-bold text-[10px]">PORT 3</span>
                        <span className="text-[10px] font-bold text-slate-400">DOWN</span>
                      </div>
                      <div className="mt-3">
                        <span className="font-mono font-bold text-sm text-slate-700 block">{iface.name}</span>
                        <span className="text-[11px] text-slate-400 block">LAN Standby</span>
                        <span className="text-[10px] text-slate-400 mt-1 block font-mono">Kabel tidak terhubung</span>
                      </div>
                      <div className="mt-3 py-1 rounded-xl bg-slate-100 text-center text-[10px] font-semibold text-slate-400">
                        Standby
                      </div>
                    </div>
                  );
                })()}

                {/* Port 4: ether4-OLT */}
                {(() => {
                  const iface = displayInterfaces.find((i) => i.name === 'ether4-OLT') || {
                    name: 'ether4-OLT',
                    running: true,
                    mtu: '1500',
                    rxBytes: 29981096086,
                    txBytes: 381896713584,
                    comment: 'OLT Distribution Link'
                  };
                  return (
                    <div className="p-4 rounded-2xl border-2 border-blue-400/60 bg-blue-50/40 shadow-xs flex flex-col justify-between relative overflow-hidden group">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white font-mono font-black text-[10px]">PORT 4</span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-blue-700">
                          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                          RUNNING (1G)
                        </span>
                      </div>
                      <div className="mt-3">
                        <span className="font-mono font-black text-sm text-slate-900 block">{iface.name}</span>
                        <span className="text-[11px] font-bold text-blue-800 block">Link Distribusi OLT ZTE</span>
                        <span className="text-[10px] text-slate-500 mt-1 block font-mono">
                          RX: {formatTrafficBytes(iface.rxBytes)} • TX: {formatTrafficBytes(iface.txBytes)}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedInterface('ether4-OLT');
                          setActiveTab('traffic');
                        }}
                        className="mt-3 w-full py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold transition flex items-center justify-center gap-1"
                      >
                        <Activity className="w-3 h-3" />
                        <span>Pantau Bandwidth</span>
                      </button>
                    </div>
                  );
                })()}

                {/* Port 5: ether5 */}
                {(() => {
                  const iface = displayInterfaces.find((i) => i.name === 'ether5') || {
                    name: 'ether5',
                    running: false,
                    mtu: '1500',
                    comment: 'Management Standby'
                  };
                  return (
                    <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 shadow-xs flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 font-mono font-bold text-[10px]">PORT 5</span>
                        <span className="text-[10px] font-bold text-slate-400">DOWN</span>
                      </div>
                      <div className="mt-3">
                        <span className="font-mono font-bold text-sm text-slate-700 block">{iface.name}</span>
                        <span className="text-[11px] text-slate-400 block">Management MGNT</span>
                        <span className="text-[10px] text-slate-400 mt-1 block font-mono">Kabel tidak terhubung</span>
                      </div>
                      <div className="mt-3 py-1 rounded-xl bg-slate-100 text-center text-[10px] font-semibold text-slate-400">
                        Standby
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Key Virtual Networks of Router */}
            <div className="pt-3 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2.5">
                Interface Logika & Virtual Bridge (PPPoE, VLAN, Hotspot, VPN)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs font-mono">
                {displayInterfaces
                  .filter((i) => i.type === 'bridge' || i.type === 'vlan' || (i.type && i.type.includes('ovpn')))
                  .slice(0, 6)
                  .map((iface) => (
                    <div
                      key={iface.name}
                      onClick={() => {
                        setSelectedInterface(iface.name);
                        setActiveTab('traffic');
                      }}
                      className="p-3 rounded-2xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 cursor-pointer transition flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-slate-400">{iface.type}</span>
                        <span className={`w-2 h-2 rounded-full ${iface.running !== false ? 'bg-emerald-500' : 'bg-rose-400'}`} />
                      </div>
                      <span className="font-bold text-slate-900 mt-2 truncate text-xs">{iface.name}</span>
                      <span className="text-[10px] text-slate-500 mt-0.5 truncate font-sans">{iface.comment || (iface.running !== false ? 'Aktif' : 'Standby')}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Active Network Summary: PPPoE & Hotspot Users */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-6 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-200">Sesi PPPoE Aktif</span>
                <Users className="w-5 h-5 text-blue-200" />
              </div>
              <h4 className="text-3xl font-black font-mono mt-3">
                {activeSecretsCount}
              </h4>
              <p className="text-xs text-blue-100 mt-1">
                Klien terhubung langsung ke concentrator
              </p>
              <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between text-xs">
                <span>Total Secrets: {totalSecretsCount}</span>
                <span className="font-bold text-emerald-300">
                  Non-Isolir: {nonIsolirSecretsCount}
                </span>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-200">Klien Terisolir</span>
                <ShieldAlert className="w-5 h-5 text-amber-200" />
              </div>
              <h4 className="text-3xl font-black font-mono mt-3">
                {isolirSecretsCount}
              </h4>
              <p className="text-xs text-amber-100 mt-1">
                Klien dialihkan ke halaman peringatan tunggakan
              </p>
              <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between text-xs">
                <span>Profil Isolir: {routerOverview.isolirProfileName || 'isolir'}</span>
                <span className="underline font-bold cursor-pointer" onClick={() => setActiveTab('secrets')}>
                  Lihat Daftar ({isolirSecretsCount}) →
                </span>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-200">Hotspot & Voucher</span>
                <Wifi className="w-5 h-5 text-emerald-200" />
              </div>
              <h4 className="text-3xl font-black font-mono mt-3">
                {routerOverview.hotspotActiveCount ?? hotspotActive.length ?? 8}
              </h4>
              <p className="text-xs text-emerald-100 mt-1">
                Perangkat aktif login jaringan Hotspot / WiFi
              </p>
              <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between text-xs">
                <span>Total Voucher: {routerOverview.hotspotUsersCount ?? hotspotUsers.length ?? 12}</span>
                <span className="underline font-bold cursor-pointer" onClick={() => setActiveTab('hotspot')}>
                  Kelola Voucher →
                </span>
              </div>
            </div>
          </div>

          {/* Quick Ping Tool for Customer */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-600" />
                <h4 className="font-extrabold text-sm text-slate-900">Uji Ping & Latensi dari Router (NOC Diagnostic)</h4>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">Tes konektivitas gateway</span>
            </div>

            <form onSubmit={handleRunPing} className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                value={pingTarget}
                onChange={(e) => setPingTarget(e.target.value)}
                placeholder="Target Host / IP (contoh: 8.8.8.8 atau 1.1.1.1)"
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={pingLoading}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
              >
                {pingLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Ping Berjalan...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5" />
                    <span>Mulai Uji Ping</span>
                  </>
                )}
              </button>
            </form>

            {pingResult && (
              <div className="p-4 rounded-2xl bg-slate-950 text-emerald-400 font-mono text-xs space-y-2 animate-in fade-in">
                <div className="flex flex-wrap items-center justify-between text-slate-300 border-b border-slate-800 pb-2">
                  <span>Host: {pingResult.host}</span>
                  <span>Terkirim: {pingResult.sent} • Diterima: {pingResult.received} ({100 - pingResult.packetLoss}% Berhasil)</span>
                  <span>Rata-rata RTT: {pingResult.avgRtt ? `${pingResult.avgRtt} ms` : '12 ms'}</span>
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {pingResult.results.map((r, i) => (
                    <div key={i} className="flex items-center justify-between text-[11px]">
                      <span>seq={r.seq} from {r.host}: bytes={r.size} ttl={r.ttl}</span>
                      <span className="text-emerald-300 font-bold">{r.timeMs} ms</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 2: TRAFFIC & BANDWIDTH ================= */}
      {activeTab === 'traffic' && (
        <div className="space-y-6">
          {/* Traffic Top Controls */}
          <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-bold text-slate-700">Pilih Interface Router:</span>
                <select
                  value={selectedInterface}
                  onChange={(e) => {
                    setSelectedInterface(e.target.value);
                    fetchTraffic(e.target.value);
                  }}
                  className="px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono min-w-[260px] shadow-xs"
                >
                  {etherInterfaces.length > 0 && (
                    <optgroup label="Port Fisik Ethernet (RJ45)">
                      {etherInterfaces.map((iface) => (
                        <option key={iface.name} value={iface.name}>
                          {iface.name} {iface.running !== false ? '● RUNNING' : '○ DOWN'} {iface.comment ? `— ${iface.comment}` : ''}
                        </option>
                      ))}
                    </optgroup>
                  )}

                  {bridgeVlanInterfaces.length > 0 && (
                    <optgroup label="Bridge & VLAN Virtual">
                      {bridgeVlanInterfaces.map((iface) => (
                        <option key={iface.name} value={iface.name}>
                          {iface.name} {iface.running !== false ? '● UP' : '○ DOWN'} {iface.comment ? `— ${iface.comment}` : ''}
                        </option>
                      ))}
                    </optgroup>
                  )}

                  {vpnInterfaces.length > 0 && (
                    <optgroup label="VPN & Management Tunnels">
                      {vpnInterfaces.map((iface) => (
                        <option key={iface.name} value={iface.name}>
                          {iface.name} ({iface.type}) {iface.running !== false ? '● UP' : '○ DOWN'}
                        </option>
                      ))}
                    </optgroup>
                  )}

                  {pppoeInterfaces.length > 0 && (
                    <optgroup label={`PPPoE Dynamic Clients (${pppoeInterfaces.length} sesi)`}>
                      {pppoeInterfaces.map((iface) => (
                        <option key={iface.name} value={iface.name}>
                          {iface.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>

                {/* Selected Interface Status Pill */}
                {(() => {
                  const currentIface = displayInterfaces.find((i) => i.name === selectedInterface);
                  return currentIface ? (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 text-[11px] font-mono border border-slate-200">
                      <span className={`w-2 h-2 rounded-full ${currentIface.running !== false ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                      <span className="font-bold text-slate-800">{currentIface.name}</span>
                      <span className="text-slate-400">|</span>
                      <span className="text-slate-600">Tipe: {currentIface.type}</span>
                      <span className="text-slate-400">|</span>
                      <span className="text-slate-600">MTU: {currentIface.mtu || '1500'}</span>
                      {currentIface.rxBytes ? (
                        <>
                          <span className="text-slate-400">|</span>
                          <span className="text-blue-600 font-semibold">RX: {formatTrafficBytes(currentIface.rxBytes)}</span>
                        </>
                      ) : null}
                    </div>
                  ) : null;
                })()}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAutoPollTraffic(!autoPollTraffic)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition border ${
                    autoPollTraffic
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${autoPollTraffic ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                  <span>Auto-Refresh 3s: {autoPollTraffic ? 'ON' : 'OFF'}</span>
                </button>

                <button
                  onClick={() => fetchTraffic()}
                  className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                  title="Refresh Seketika"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick-Switch Interface Pills */}
            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                Pintasan Cepat:
              </span>
              {[
                { name: 'ether1', label: 'ether1 (WAN Internet)' },
                { name: 'ether4-OLT', label: 'ether4-OLT (OLT Distribusi)' },
                { name: 'bridge-PPPoE', label: 'bridge-PPPoE (Concentrator)' },
                { name: 'vlan1001-PPPoE', label: 'vlan1001-PPPoE (Klien)' },
                { name: 'bridge-Hotspot', label: 'bridge-Hotspot (Gateway)' },
                { name: 'vlan100-TR069', label: 'vlan100-TR069 (ACS)' }
              ].map((pill) => {
                const isSelected = selectedInterface === pill.name;
                const ifaceRecord = displayInterfaces.find((i) => i.name === pill.name);
                const isRunning = ifaceRecord ? ifaceRecord.running !== false : true;
                return (
                  <button
                    key={pill.name}
                    onClick={() => {
                      setSelectedInterface(pill.name);
                      fetchTraffic(pill.name);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition flex items-center gap-1.5 border ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? (isSelected ? 'bg-white' : 'bg-emerald-500') : 'bg-rose-400'}`} />
                    <span>{pill.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Current Rate Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-3xl bg-blue-50/70 border border-blue-100 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900">Kecepatan Download (RX)</span>
                <ArrowDownCircle className="w-5 h-5 text-blue-600" />
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-3xl font-black text-blue-950 font-mono">
                  {trafficSnapshot?.rxMbps ?? 284.5}
                </span>
                <span className="text-xs font-bold text-blue-600">Mbps</span>
              </div>
              <p className="text-[10px] text-blue-700/70 mt-1 font-mono">
                {trafficSnapshot?.rxPackets ? `${trafficSnapshot.rxPackets.toLocaleString()} pps` : '28,400 pps'}
              </p>
            </div>

            <div className="p-5 rounded-3xl bg-emerald-50/70 border border-emerald-100 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-900">Kecepatan Upload (TX)</span>
                <ArrowUpCircle className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-3xl font-black text-emerald-950 font-mono">
                  {trafficSnapshot?.txMbps ?? 68.2}
                </span>
                <span className="text-xs font-bold text-emerald-600">Mbps</span>
              </div>
              <p className="text-[10px] text-emerald-700/70 mt-1 font-mono">
                {trafficSnapshot?.txPackets ? `${trafficSnapshot.txPackets.toLocaleString()} pps` : '7,200 pps'}
              </p>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-500 block">Puncak Bandwidth (Peak)</span>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-900 font-mono">382.4</span>
                <span className="text-xs font-bold text-slate-500">Mbps</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Tercatat dalam 1 jam terakhir</p>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-500 block">Status Interface Terpilih</span>
              <div className="mt-2 flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200 font-mono">
                  RUNNING
                </span>
                <span className="text-xs text-slate-600 font-mono">MTU: 1500</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Full Duplex Auto-Negotiation</p>
            </div>
          </div>

          {/* Realtime Bandwidth Recharts Area */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-extrabold text-sm text-slate-900">Grafik Live Bandwidth ({selectedInterface})</h4>
                <p className="text-xs text-slate-500">Pemantauan real-time fluktuasi trafik masuk (RX) dan keluar (TX)</p>
              </div>
              <div className="flex items-center gap-4 text-xs font-bold">
                <span className="flex items-center gap-1.5 text-blue-600">
                  <span className="w-3 h-3 rounded-full bg-blue-600" />
                  Download (RX)
                </span>
                <span className="flex items-center gap-1.5 text-emerald-600">
                  <span className="w-3 h-3 rounded-full bg-emerald-600" />
                  Upload (TX)
                </span>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trafficHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRx" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorTx" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} unit="M" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '12px',
                      border: 'none',
                      color: '#fff',
                      fontSize: '12px'
                    }}
                    formatter={(value: any, name: any) => [
                      `${value} Mbps`,
                      name === 'rxMbps' ? 'Download (RX)' : 'Upload (TX)'
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="rxMbps"
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorRx)"
                    isAnimationActive={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="txMbps"
                    stroke="#059669"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorTx)"
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Interface List Table */}
          <div className="rounded-3xl bg-white border border-slate-200 overflow-hidden shadow-xs space-y-4 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h4 className="font-extrabold text-sm text-slate-900">Daftar Seluruh Interface Router Pelanggan</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Menampilkan {filteredInterfaces.length} dari {displayInterfaces.length} total interface terdaftar di RouterOS
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari interface (nama, tipe, komentar)..."
                  value={interfaceSearch}
                  onChange={(e) => setInterfaceSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'all', label: `Semua (${displayInterfaces.length})` },
                { id: 'ether', label: `Fisik Ethernet (${etherInterfaces.length})` },
                { id: 'bridge_vlan', label: `Bridge & VLAN (${bridgeVlanInterfaces.length})` },
                { id: 'vpn', label: `VPN Tunnel (${vpnInterfaces.length})` },
                { id: 'pppoe', label: `Dynamic PPPoE (${pppoeInterfaces.length})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setInterfaceCategory(tab.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    interfaceCategory === tab.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-5 py-3">Nama Interface</th>
                    <th className="px-5 py-3">Tipe</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">MTU</th>
                    <th className="px-5 py-3">Total Akumulasi RX</th>
                    <th className="px-5 py-3">Total Akumulasi TX</th>
                    <th className="px-5 py-3">Keterangan</th>
                    <th className="px-5 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
                  {filteredInterfaces.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-8 text-center text-slate-400 font-sans">
                        Tidak ada interface yang cocok dengan pencarian "{interfaceSearch}".
                      </td>
                    </tr>
                  ) : (
                    filteredInterfaces.map((iface, idx) => {
                      const isCurrentSelected = selectedInterface === iface.name;
                      return (
                        <tr
                          key={iface.name || idx}
                          className={`transition ${
                            isCurrentSelected ? 'bg-blue-50/70' : 'hover:bg-slate-50/70'
                          }`}
                        >
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">{iface.name}</span>
                              {isCurrentSelected && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-600 text-white font-sans">
                                  Sedang Digrafik
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-slate-600">{iface.type}</td>
                          <td className="px-5 py-3.5">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                                iface.running !== false
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${iface.running !== false ? 'bg-emerald-600' : 'bg-rose-600'}`} />
                              {iface.running !== false ? 'RUNNING' : 'DOWN'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">{iface.mtu || '1500'}</td>
                          <td className="px-5 py-3.5 text-blue-600 font-bold">
                            {formatTrafficBytes(iface.rxBytes)}
                          </td>
                          <td className="px-5 py-3.5 text-emerald-600 font-bold">
                            {formatTrafficBytes(iface.txBytes)}
                          </td>
                          <td className="px-5 py-3.5 text-slate-500 font-sans max-w-xs truncate">
                            {iface.comment || '-'}
                          </td>
                          <td className="px-5 py-3.5 text-right font-sans">
                            <button
                              onClick={() => {
                                setSelectedInterface(iface.name);
                                fetchTraffic(iface.name);
                                window.scrollTo({ top: 400, behavior: 'smooth' });
                              }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition inline-flex items-center gap-1 ${
                                isCurrentSelected
                                  ? 'bg-blue-600 text-white shadow-xs'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                              }`}
                            >
                              <Activity className="w-3 h-3" />
                              <span>{isCurrentSelected ? 'Aktif' : 'Pantau Grafik'}</span>
                            </button>
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

      {/* ================= TAB 3: PPPOE SECRETS MANAGEMENT (ADD & DELETE) ================= */}
      {activeTab === 'secrets' && (
        <div className="space-y-6">
          {/* Control Bar: Search, Filters, Add Secret Button */}
          <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={secretSearch}
                  onChange={(e) => setSecretSearch(e.target.value)}
                  placeholder="Cari user secret, profile, atau komentar..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Status Filter Chips */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                <button
                  onClick={() => setSecretFilter('all')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    secretFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Semua ({secrets.length})
                </button>
                <button
                  onClick={() => setSecretFilter('online')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    secretFilter === 'online' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Online ({secrets.filter((s) => s.isOnline).length})
                </button>
                <button
                  onClick={() => setSecretFilter('isolir')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    secretFilter === 'isolir' ? 'bg-rose-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Isolir ({secrets.filter((s) => s.isIsolir).length})
                </button>
              </div>
            </div>

            {/* Add Secret Button */}
            <button
              onClick={() => setShowAddSecretModal(true)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold shadow-sm transition active:scale-95 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Secret Baru</span>
            </button>
          </div>

          {/* Secrets Table */}
          <div className="rounded-3xl bg-white border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-5 py-3">Username PPPoE</th>
                    <th className="px-5 py-3">Password</th>
                    <th className="px-5 py-3">Profile Paket</th>
                    <th className="px-5 py-3">Status Koneksi</th>
                    <th className="px-5 py-3">IP / Uptime</th>
                    <th className="px-5 py-3">Komentar</th>
                    <th className="px-5 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredSecrets.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                        Tidak ada secret yang cocok dengan filter atau pencarian Anda.
                      </td>
                    </tr>
                  ) : (
                    filteredSecrets.map((s) => {
                      const isRevealed = !!revealedPasswords[s.name];
                      return (
                        <tr key={s.name} className="hover:bg-slate-50/70 transition">
                          <td className="px-5 py-3.5 font-bold font-mono text-slate-900">
                            {s.name}
                          </td>
                          <td className="px-5 py-3.5 font-mono">
                            <div className="flex items-center gap-1.5">
                              <span>{isRevealed ? (s.password || '123456') : '••••••••'}</span>
                              <button
                                onClick={() =>
                                  setRevealedPasswords((prev) => ({
                                    ...prev,
                                    [s.name]: !prev[s.name]
                                  }))
                                }
                                className="text-slate-400 hover:text-slate-600 p-0.5"
                                title={isRevealed ? 'Sembunyikan password' : 'Lihat password'}
                              >
                                {isRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                              </button>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-[11px] border border-blue-100">
                              {s.profile}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            {s.isIsolir ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200">
                                <Lock className="w-3 h-3" /> TERISOLIR
                              </span>
                            ) : s.isOnline ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> ONLINE
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-600 border border-slate-200">
                                OFFLINE
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 font-mono text-[11px] text-slate-500">
                            {s.isOnline ? (
                              <div>
                                <span className="text-slate-900 font-semibold block">{s.activeIp || '172.16.x.x'}</span>
                                <span className="text-[10px] text-slate-400">{s.uptime || '1h 20m'}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-slate-500 text-[11px] max-w-xs truncate">
                            {s.comment || '-'}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Toggle Isolir Button */}
                              <button
                                onClick={() => handleToggleIsolir(s)}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1 border ${
                                  s.isIsolir
                                    ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                                    : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200'
                                }`}
                                title={s.isIsolir ? 'Buka Isolir Pelanggan' : 'Kunci / Isolir Pelanggan'}
                              >
                                {s.isIsolir ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                                <span>{s.isIsolir ? 'Buka Isolir' : 'Isolir'}</span>
                              </button>

                              {/* Delete Button */}
                              <button
                                onClick={() => setDeleteSecretTarget(s.name)}
                                className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition border border-rose-200"
                                title="Hapus Secret PPPoE"
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

      {/* ================= TAB 4: HOTSPOT MONITORING & VOUCHERS ================= */}
      {activeTab === 'hotspot' && (
        <div className="space-y-6">
          {/* Sub-Tabs: Sesi Aktif vs Daftar Voucher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl text-xs font-bold w-fit">
              <button
                onClick={() => setHotspotSubTab('active')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition ${
                  hotspotSubTab === 'active' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Wifi className="w-3.5 h-3.5 text-blue-600" />
                <span>Sesi Hotspot Aktif ({hotspotActive.length})</span>
              </button>

              <button
                onClick={() => setHotspotSubTab('users')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition ${
                  hotspotSubTab === 'users' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Ticket className="w-3.5 h-3.5 text-indigo-600" />
                <span>Database Voucher ({hotspotUsers.length})</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={hotspotSearch}
                  onChange={(e) => setHotspotSearch(e.target.value)}
                  placeholder="Cari user / IP / MAC..."
                  className="pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {hotspotSubTab === 'users' && (
                <button
                  onClick={() => setShowAddHotspotModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Voucher</span>
                </button>
              )}
            </div>
          </div>

          {/* View 1: Sesi Hotspot Aktif */}
          {hotspotSubTab === 'active' && (
            <div className="rounded-3xl bg-white border border-slate-200 overflow-hidden shadow-xs">
              <div className="p-4 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">Perangkat yang Sedang Mengakses Jaringan Hotspot</span>
                <span className="text-slate-400">Total: {filteredHotspotActive.length} Perangkat</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-5 py-3">Kode / Username</th>
                      <th className="px-5 py-3">IP Address</th>
                      <th className="px-5 py-3">MAC Address</th>
                      <th className="px-5 py-3">Uptime</th>
                      <th className="px-5 py-3">Konsumsi Data</th>
                      <th className="px-5 py-3">Login Via</th>
                      <th className="px-5 py-3 text-right">Putuskan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
                    {filteredHotspotActive.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-12 text-center text-slate-400 font-sans">
                          Tidak ada sesi hotspot aktif saat ini.
                        </td>
                      </tr>
                    ) : (
                      filteredHotspotActive.map((h, i) => (
                        <tr key={i} className="hover:bg-slate-50/70 transition">
                          <td className="px-5 py-3.5 font-bold text-slate-900">{h.user}</td>
                          <td className="px-5 py-3.5 text-blue-600 font-semibold">{h.address}</td>
                          <td className="px-5 py-3.5 text-slate-500 text-[11px]">{h.macAddress || '-'}</td>
                          <td className="px-5 py-3.5 text-slate-600">{h.uptime || '12m'}</td>
                          <td className="px-5 py-3.5 text-[11px]">
                            <span className="text-blue-600 font-bold block">↓ {(h.bytesIn ? (h.bytesIn / (1024 * 1024)).toFixed(1) : '15.4')} MB</span>
                            <span className="text-emerald-600 block">↑ {(h.bytesOut ? (h.bytesOut / (1024 * 1024)).toFixed(1) : '4.2')} MB</span>
                          </td>
                          <td className="px-5 py-3.5 text-slate-500 font-sans">{h.loginBy || 'http-chap'}</td>
                          <td className="px-5 py-3.5 text-right font-sans">
                            <button
                              onClick={() => handleKickHotspotUser(h.user)}
                              disabled={kickingUser === h.user}
                              className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold border border-rose-200 transition disabled:opacity-50"
                              title="Putuskan sesi perangkat ini"
                            >
                              {kickingUser === h.user ? 'Memutuskan...' : 'Kick'}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* View 2: Database User / Voucher Hotspot */}
          {hotspotSubTab === 'users' && (
            <div className="rounded-3xl bg-white border border-slate-200 overflow-hidden shadow-xs">
              <div className="p-4 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">Daftar Akun Voucher & Pengguna Hotspot</span>
                <span className="text-slate-400">Total: {filteredHotspotUsers.length} User</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-5 py-3">Nama / Kode Voucher</th>
                      <th className="px-5 py-3">Password</th>
                      <th className="px-5 py-3">Profile</th>
                      <th className="px-5 py-3">Batas Waktu (Uptime)</th>
                      <th className="px-5 py-3">Batas Kuota</th>
                      <th className="px-5 py-3">Komentar</th>
                      <th className="px-5 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredHotspotUsers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                          Belum ada voucher hotspot. Klik "+ Tambah Voucher" untuk membuat voucher baru.
                        </td>
                      </tr>
                    ) : (
                      filteredHotspotUsers.map((u, i) => (
                        <tr key={i} className="hover:bg-slate-50/70 transition">
                          <td className="px-5 py-3.5 font-bold font-mono text-slate-900">{u.name}</td>
                          <td className="px-5 py-3.5 font-mono text-slate-500">{u.password || '(tanpa password)'}</td>
                          <td className="px-5 py-3.5">
                            <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold text-[11px] border border-indigo-100">
                              {u.profile || 'default'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 font-mono text-[11px] text-slate-600">{u.limitUptime || 'Unlimited'}</td>
                          <td className="px-5 py-3.5 font-mono text-[11px] text-slate-600">
                            {u.limitBytesTotal ? `${(parseInt(u.limitBytesTotal, 10) / (1024 * 1024 * 1024)).toFixed(1)} GB` : 'Unlimited'}
                          </td>
                          <td className="px-5 py-3.5 text-slate-500 text-[11px]">{u.comment || '-'}</td>
                          <td className="px-5 py-3.5 text-right">
                            <button
                              onClick={() => handleDeleteHotspotUser(u.name)}
                              className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition"
                              title="Hapus Voucher"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 5: NOC ROUTER LOGS ================= */}
      {activeTab === 'logs' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Topik Log:</span>
              {['all', 'ppp', 'hotspot', 'system', 'firewall', 'warning'].map((topic) => (
                <button
                  key={topic}
                  onClick={() => setLogFilterTopic(topic)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition ${
                    logFilterTopic === topic
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {topic}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  placeholder="Cari pesan log..."
                  className="pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <button
                onClick={loadLogs}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                title="Refresh Logs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Terminal Box for NOC Logs */}
          <div className="rounded-3xl bg-slate-950 text-slate-300 p-5 font-mono text-xs shadow-xl border border-slate-800 space-y-2 max-h-[500px] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-[11px] text-slate-400">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="font-bold text-slate-300 ml-2">RouterOS System Logs Stream</span>
              </div>
              <span>Total: {filteredLogs.length} entri</span>
            </div>

            {filteredLogs.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                Tidak ada entri log yang cocok dengan filter.
              </div>
            ) : (
              filteredLogs.map((log, idx) => {
                const topic = (log.topics || '').toLowerCase();
                const isError = topic.includes('error') || topic.includes('warning');
                const isPpp = topic.includes('ppp');
                const isHotspot = topic.includes('hotspot');

                return (
                  <div key={idx} className="flex items-start gap-2.5 py-1 hover:bg-white/5 px-2 rounded-lg transition">
                    <span className="text-slate-500 shrink-0 text-[10px]">{log.time || '12:45:00'}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${
                      isError
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : isPpp
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        : isHotspot
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-300'
                    }`}>
                      {log.topics || 'system'}
                    </span>
                    <span className="text-slate-200 flex-1 break-all leading-relaxed">
                      {log.message}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD SECRET PPPOE ================= */}
      {showAddSecretModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-blue-600" />
                <h4 className="font-extrabold text-slate-900 text-base">Tambah Secret PPPoE Baru</h4>
              </div>
              <button
                onClick={() => setShowAddSecretModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSecret} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Username Secret PPPoE *</label>
                <input
                  type="text"
                  required
                  value={newSecretForm.name}
                  onChange={(e) => setNewSecretForm({ ...newSecretForm, name: e.target.value })}
                  placeholder="Contoh: user_kantor_01"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Password *</label>
                <input
                  type="text"
                  required
                  value={newSecretForm.password}
                  onChange={(e) => setNewSecretForm({ ...newSecretForm, password: e.target.value })}
                  placeholder="Password klien"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Profile / Paket</label>
                  <select
                    value={newSecretForm.profile}
                    onChange={(e) => setNewSecretForm({ ...newSecretForm, profile: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                  >
                    {(profiles.length > 0 ? profiles : [
                      { name: 'default' },
                      { name: '10M-Home' },
                      { name: '20M-Family' },
                      { name: '50M-Gamer' },
                      { name: '100M-Dedicated' },
                    ]).map((p) => (
                      <option key={p.name} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Service</label>
                  <select
                    value={newSecretForm.service}
                    onChange={(e) => setNewSecretForm({ ...newSecretForm, service: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                  >
                    <option value="pppoe">pppoe</option>
                    <option value="any">any</option>
                    <option value="l2tp">l2tp</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Remote Address (Opsional Static IP)</label>
                <input
                  type="text"
                  value={newSecretForm.remoteAddress}
                  onChange={(e) => setNewSecretForm({ ...newSecretForm, remoteAddress: e.target.value })}
                  placeholder="Contoh: 172.16.3.50 (kosongkan jika otomatis pool)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Catatan / Komentar Pelanggan</label>
                <input
                  type="text"
                  value={newSecretForm.comment}
                  onChange={(e) => setNewSecretForm({ ...newSecretForm, comment: e.target.value })}
                  placeholder="Contoh: Gedung A Lt. 2"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddSecretModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingSecret}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-md shadow-blue-600/20 disabled:opacity-50"
                >
                  {submittingSecret ? 'Menyimpan...' : 'Simpan Secret'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: DELETE CONFIRMATION ================= */}
      {deleteSecretTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <span className="p-2.5 rounded-2xl bg-rose-50 border border-rose-100">
                <Trash2 className="w-5 h-5" />
              </span>
              <div>
                <h4 className="font-extrabold text-slate-900 text-base">Hapus User Secret</h4>
                <p className="text-xs text-slate-500">Tindakan ini permanen di MikroTik</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus akun secret PPPoE <strong className="font-mono text-slate-900">"{deleteSecretTarget}"</strong>? Klien yang sedang terhubung akan langsung terputus dari router.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteSecretTarget(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deletingSecret}
                onClick={handleDeleteSecret}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-md shadow-rose-600/20 disabled:opacity-50"
              >
                {deletingSecret ? 'Menghapus...' : 'Ya, Hapus Secret'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD HOTSPOT VOUCHER ================= */}
      {showAddHotspotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Ticket className="w-5 h-5 text-indigo-600" />
                <h4 className="font-extrabold text-slate-900 text-base">Buat Voucher Hotspot Baru</h4>
              </div>
              <button
                onClick={() => setShowAddHotspotModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddHotspotUser} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Kode / Username Voucher *</label>
                <input
                  type="text"
                  required
                  value={newHotspotForm.name}
                  onChange={(e) => setNewHotspotForm({ ...newHotspotForm, name: e.target.value })}
                  placeholder="Contoh: GUEST-9821"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Password (Opsional)</label>
                <input
                  type="text"
                  value={newHotspotForm.password}
                  onChange={(e) => setNewHotspotForm({ ...newHotspotForm, password: e.target.value })}
                  placeholder="Kosongkan jika voucher 1-kode (login instan)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Batas Waktu (Limit Uptime)</label>
                  <select
                    value={newHotspotForm.limitUptime}
                    onChange={(e) => setNewHotspotForm({ ...newHotspotForm, limitUptime: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                  >
                    <option value="1h">1 Jam</option>
                    <option value="2h">2 Jam</option>
                    <option value="6h">6 Jam</option>
                    <option value="12h">12 Jam</option>
                    <option value="1d">1 Hari (24 Jam)</option>
                    <option value="7d">1 Minggu</option>
                    <option value="30d">1 Bulan</option>
                    <option value="">Unlimited</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Batas Kuota Data</label>
                  <select
                    value={newHotspotForm.limitBytesTotal}
                    onChange={(e) => setNewHotspotForm({ ...newHotspotForm, limitBytesTotal: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                  >
                    <option value="536870912">500 MB</option>
                    <option value="1073741824">1 GB</option>
                    <option value="2147483648">2 GB</option>
                    <option value="5368709120">5 GB</option>
                    <option value="10737418240">10 GB</option>
                    <option value="">Unlimited (Tanpa FUP)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Keterangan / Penerima Voucher</label>
                <input
                  type="text"
                  value={newHotspotForm.comment}
                  onChange={(e) => setNewHotspotForm({ ...newHotspotForm, comment: e.target.value })}
                  placeholder="Contoh: Tamu Direksi / Ruang Rapat"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddHotspotModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingHotspot}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-md shadow-indigo-600/20 disabled:opacity-50"
                >
                  {submittingHotspot ? 'Membuat...' : 'Buat Voucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDIT ROUTER CREDENTIALS / HOST ================= */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-blue-600" />
                <h4 className="font-extrabold text-slate-900 text-base">Koneksi & Kredensial Router</h4>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRouterConfig} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Label Router</label>
                <input
                  type="text"
                  value={configForm.routerName}
                  onChange={(e) => setConfigForm({ ...configForm, routerName: e.target.value })}
                  placeholder="Contoh: MikroTik Core Gateway"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div className="col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">IP Host / Domain Router *</label>
                  <input
                    type="text"
                    required
                    value={configForm.host}
                    onChange={(e) => setConfigForm({ ...configForm, host: e.target.value })}
                    placeholder="demo atau IP Publik"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Port API</label>
                  <input
                    type="number"
                    value={configForm.port}
                    onChange={(e) => setConfigForm({ ...configForm, port: Number(e.target.value) })}
                    placeholder="8728"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Username API</label>
                  <input
                    type="text"
                    value={configForm.username}
                    onChange={(e) => setConfigForm({ ...configForm, username: e.target.value })}
                    placeholder="admin"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Password API</label>
                  <input
                    type="password"
                    value={configForm.password}
                    onChange={(e) => setConfigForm({ ...configForm, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="portal-use-ssl"
                  checked={configForm.useSsl}
                  onChange={(e) => setConfigForm({ ...configForm, useSsl: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="portal-use-ssl" className="text-xs text-slate-700 cursor-pointer">
                  Gunakan Enkripsi TLS / SSL (Port 8729)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingConfig}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-md shadow-blue-600/20 disabled:opacity-50"
                >
                  {savingConfig ? 'Menyimpan...' : 'Simpan & Uji Koneksi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
