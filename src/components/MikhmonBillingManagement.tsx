import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Radio, 
  Plus, 
  Search, 
  ExternalLink, 
  Share2, 
  FileText, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  Trash2, 
  Edit3, 
  Power, 
  Globe, 
  RefreshCw, 
  Sliders, 
  Package, 
  DollarSign, 
  Users, 
  Cpu, 
  Lock, 
  Sparkles, 
  Zap, 
  X, 
  ChevronRight, 
  Check, 
  Copy, 
  CheckCheck,
  Phone,
  Server,
  Upload,
  FolderArchive,
  Settings,
  Terminal,
  Code2,
  Printer,
  Ticket,
  Monitor,
  Maximize2
} from 'lucide-react';
import { MikhmonInstance, MikhmonPlan, CustomerRecord, Invoice, BusinessSettings, MikhmonUploadedPackage, MikhmonServerConfig } from '../types';
import { formatRupiah, formatDateIndo } from '../utils/formatters';
import { MikhmonWebserverModal } from './MikhmonWebserverModal';
import { MikhmonLivePortalModal } from './MikhmonLivePortalModal';
import { MikhmonVoucherStudioModal } from './MikhmonVoucherStudioModal';


interface MikhmonBillingManagementProps {
  customers: CustomerRecord[];
  invoices: Invoice[];
  settings: BusinessSettings | null;
  onSelectInvoice: (id: string) => void;
  onOpenCreateInvoice: () => void;
}

export const MikhmonBillingManagement: React.FC<MikhmonBillingManagementProps> = ({
  customers,
  invoices,
  settings,
  onSelectInvoice,
  onOpenCreateInvoice,
}) => {
  // State for instances and plans
  const [instances, setInstances] = useState<MikhmonInstance[]>([]);
  const [plans, setPlans] = useState<MikhmonPlan[]>([]);
  const [stats, setStats] = useState({
    totalInstances: 0,
    activeInstances: 0,
    suspendedInstances: 0,
    overdueInstances: 0,
    expiringSoon: 0,
    monthlyMRR: 0,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expiring' | 'suspended'>('all');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingInstance, setEditingInstance] = useState<MikhmonInstance | null>(null);
  const [isPlansModalOpen, setIsPlansModalOpen] = useState<boolean>(false);
  const [isBatchBillingModalOpen, setIsBatchBillingModalOpen] = useState<boolean>(false);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState<string | null>(null);
  const [isBatchProcessing, setIsBatchProcessing] = useState<boolean>(false);

  // Server & Domain Settings state
  const [serverConfig, setServerConfig] = useState<MikhmonServerConfig>({
    masterDomain: 'mikhmon.online',
    fallbackIpOrHost: '103.147.20.12',
    webRootDir: '/var/www/mikhmon',
    activeVersion: 'Mikhmon V3.20 (PHP 8.2 LTS)',
    phpVersion: 'php8.2-fpm',
    serverType: 'nginx_php_fpm',
    httpPort: 80,
    httpsPort: 443,
    sslProvider: 'letsencrypt',
    sslEmail: 'admin@ciptamedia.id',
    wildcardEnabled: true,
    autoCreateVhost: true,
    uploadedPackages: [],
  });
  const [nginxVhost, setNginxVhost] = useState<string>('');
  const [dnsGuide, setDnsGuide] = useState<Array<{ type: string; name: string; value: string; comment: string }>>([]);
  const [isSavingServerSettings, setIsSavingServerSettings] = useState<boolean>(false);
  const [isUploadingPackage, setIsUploadingPackage] = useState<boolean>(false);
  const [uploadForm, setUploadForm] = useState({
    fileName: '',
    version: 'Mikhmon V3.20 Official (PHP 8)',
    notes: 'Paket web standar resmi dengan template voucher dan login hotspot multi-bahasa',
    setAsDefault: true,
    fileSizeBytes: 2450000,
  });

  // Webserver, Live Portal, and Voucher Studio states
  const [isWebserverModalOpen, setIsWebserverModalOpen] = useState<boolean>(false);
  const [isPortalModalOpen, setIsPortalModalOpen] = useState<boolean>(false);
  const [activePortalInstance, setActivePortalInstance] = useState<MikhmonInstance | null>(null);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState<boolean>(false);
  const [activeVoucherInstance, setActiveVoucherInstance] = useState<MikhmonInstance | null>(null);

  // Feedback Notification

  const [alertNotice, setAlertNotice] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Form State for Add / Edit
  const [formCustomerType, setFormCustomerType] = useState<'existing' | 'new'>('existing');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  
  // Live Mikhmon Engine Testing & Sync State
  const [isTestingMikhmon, setIsTestingMikhmon] = useState<boolean>(false);
  const [mikhmonTestResult, setMikhmonTestResult] = useState<{
    success: boolean;
    message: string;
    pingMs?: number;
    data?: any;
  } | null>(null);
  const [isSyncingMikhmonId, setIsSyncingMikhmonId] = useState<string | null>(null);
  const [viewingPhpConfig, setViewingPhpConfig] = useState<{
    instance: MikhmonInstance;
    fileName: string;
    filePath: string;
    phpContent: string;
  } | null>(null);

  const [formData, setFormData] = useState<{
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    sessionName: string;
    subdomain: string;
    mikhmonVersion: string;
    adminUsername: string;
    adminPassword: string;
    planId: string;
    planName: string;
    price: number;
    billingCycle: 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
    startDate: string;
    dueDate: string;
    mikrotikHost: string;
    mikrotikPort: number;
    mikrotikUser: string;
    mikrotikPassword: string;
    hotspotName: string;
    dnsName: string;
    currency: string;
    mikhmonTheme: string;
    autoGenerateSessionPhp: boolean;
    autoInvoice: boolean;
    autoSuspend: boolean;
    notes: string;
    createInvoiceNow: boolean;
  }>({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    sessionName: '',
    subdomain: '',
    mikhmonVersion: 'Mikhmon V3 (PHP 8 Cloud)',
    adminUsername: 'admin',
    adminPassword: '',
    planId: 'plan-basic-1',
    planName: 'Mikhmon Cloud Basic (1 Router)',
    price: 15000,
    billingCycle: 'monthly',
    startDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    mikrotikHost: '',
    mikrotikPort: 8728,
    mikrotikUser: 'mikhmon',
    mikrotikPassword: '',
    hotspotName: '',
    dnsName: 'login.wifi',
    currency: 'Rp',
    mikhmonTheme: 'light',
    autoGenerateSessionPhp: true,
    autoInvoice: true,
    autoSuspend: true,
    notes: '',
    createInvoiceNow: true,
  });



  // Fetch Mikhmon data from backend with safe retry & json validation
  const fetchMikhmonData = useCallback(async (quiet: boolean = false) => {
    if (!quiet) setIsLoading(true);
    setIsRefreshing(true);
    try {
      let res = await fetch('/api/mikhmon/instances');
      // If server is warming up or returning HTML error page, retry once
      const contentType = res.headers.get('content-type') || '';
      if (!res.ok || !contentType.includes('application/json')) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        res = await fetch('/api/mikhmon/instances');
      }

      const freshContentType = res.headers.get('content-type') || '';
      if (!res.ok || !freshContentType.includes('application/json')) {
        console.warn('Mikhmon endpoint not ready or returned non-JSON:', res.status);
        return;
      }

      const data = await res.json();
      if (data && data.success) {
        setInstances(data.instances || []);
        setPlans(data.plans || []);
        if (data.stats) setStats(data.stats);
      }
    } catch (err: any) {
      console.warn('Could not fetch Mikhmon instances:', err?.message || err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMikhmonData();
  }, [fetchMikhmonData]);

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2500);
  };

  // Notification helper
  const showNotice = (type: 'success' | 'error' | 'info', message: string) => {
    setAlertNotice({ type, message });
    setTimeout(() => setAlertNotice(null), 5000);
  };

  // Open Modal for Add
  const handleOpenAddModal = () => {
    setEditingInstance(null);
    setFormCustomerType('existing');
    setSelectedCustomerId('');
    const defaultDueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setFormData({
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      sessionName: '',
      subdomain: '',
      mikhmonVersion: 'Mikhmon V3 (PHP 8 Cloud)',
      adminUsername: 'admin',
      adminPassword: '',
      planId: plans[0]?.id || 'plan-basic-1',
      planName: plans[0]?.name || 'Mikhmon Cloud Basic (1 Router)',
      price: plans[0]?.price || 15000,
      billingCycle: plans[0]?.billingCycle || 'monthly',
      startDate: new Date().toISOString().split('T')[0],
      dueDate: defaultDueDate,
      mikrotikHost: '',
      mikrotikPort: 8728,
      mikrotikUser: 'mikhmon',
      mikrotikPassword: '',
      hotspotName: '',
      dnsName: 'login.wifi',
      currency: 'Rp',
      mikhmonTheme: 'light',
      autoGenerateSessionPhp: true,
      autoInvoice: true,
      autoSuspend: true,
      notes: '',
      createInvoiceNow: true,
    });
    setMikhmonTestResult(null);
    setIsAddModalOpen(true);
  };

  // Open Modal for Edit
  const handleOpenEditModal = (inst: MikhmonInstance) => {
    setEditingInstance(inst);
    setFormCustomerType(inst.customerId ? 'existing' : 'new');
    setSelectedCustomerId(inst.customerId || '');
    setMikhmonTestResult(null);
    setFormData({
      customerName: inst.customerName,
      customerPhone: inst.customerPhone,
      customerEmail: inst.customerEmail || '',
      sessionName: inst.sessionName,
      subdomain: inst.subdomain.replace(/\.mikhmon\.online$/, ''),
      mikhmonVersion: inst.mikhmonVersion || 'Mikhmon V3 (PHP 8 Cloud)',
      adminUsername: inst.adminUsername || 'admin',
      adminPassword: inst.adminPassword || '',
      planId: inst.planId,
      planName: inst.planName,
      price: inst.price,
      billingCycle: inst.billingCycle,
      startDate: inst.startDate,
      dueDate: inst.dueDate,
      mikrotikHost: inst.mikrotikHost || '',
      mikrotikPort: inst.mikrotikPort || 8728,
      mikrotikUser: inst.mikrotikUser || 'mikhmon',
      mikrotikPassword: inst.mikrotikPassword || '',
      hotspotName: inst.hotspotName || inst.sessionName,
      dnsName: inst.dnsName || 'login.wifi',
      currency: inst.currency || 'Rp',
      mikhmonTheme: inst.mikhmonTheme || 'light',
      autoGenerateSessionPhp: true,
      autoInvoice: inst.autoInvoice,
      autoSuspend: inst.autoSuspend,
      notes: inst.notes || '',
      createInvoiceNow: false,
    });
    setIsAddModalOpen(true);
  };

  // Select customer from dropdown
  const handleSelectExistingCustomer = (cId: string) => {
    setSelectedCustomerId(cId);
    const selected = customers.find((c) => c.id === cId);
    if (selected) {
      const generatedSession = selected.company 
        ? selected.company.toUpperCase().replace(/[^A-Z0-9_]/g, '_')
        : selected.name.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
      const generatedSub = selected.name.toLowerCase().replace(/[^a-z0-9]/g, '');

      setFormData((prev) => ({
        ...prev,
        customerName: selected.name,
        customerPhone: selected.phone,
        customerEmail: selected.email || '',
        sessionName: prev.sessionName || generatedSession,
        subdomain: prev.subdomain || generatedSub,
        hotspotName: prev.hotspotName || selected.company || selected.name,
        mikrotikHost: selected.mikrotik?.host || prev.mikrotikHost,
        mikrotikPort: selected.mikrotik?.port || prev.mikrotikPort,
        mikrotikUser: selected.mikrotik?.username || prev.mikrotikUser,
        mikrotikPassword: selected.mikrotik?.password || prev.mikrotikPassword,
      }));
    }
  };


  // Select plan
  const handleSelectPlan = (pId: string) => {
    const selected = plans.find((p) => p.id === pId);
    if (selected) {
      setFormData((prev) => ({
        ...prev,
        planId: selected.id,
        planName: selected.name,
        price: selected.price,
        billingCycle: selected.billingCycle,
      }));
    }
  };

  // Test live connection to MikroTik router from Mikhmon form
  const handleTestMikhmonConnection = async () => {
    if (!formData.mikrotikHost) {
      showNotice('error', 'Masukkan Host / IP MikroTik terlebih dahulu untuk diuji.');
      return;
    }
    setIsTestingMikhmon(true);
    setMikhmonTestResult(null);
    try {
      const res = await fetch('/api/mikhmon/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: formData.mikrotikHost,
          port: formData.mikrotikPort,
          username: formData.mikrotikUser,
          password: formData.mikrotikPassword,
        }),
      });
      const data = await res.json();
      setMikhmonTestResult(data);
      if (data.success) {
        showNotice('success', `Koneksi Mikhmon ke MikroTik Sukses (${data.pingMs}ms)`);
      } else {
        showNotice('error', data.message || 'Koneksi ke MikroTik gagal.');
      }
    } catch (err: any) {
      setMikhmonTestResult({ success: false, message: err.message });
      showNotice('error', err.message);
    } finally {
      setIsTestingMikhmon(false);
    }
  };

  // Sync Mikhmon instance live telemetry
  const handleSyncMikhmonInstance = async (inst: MikhmonInstance) => {
    setIsSyncingMikhmonId(inst.id);
    try {
      const res = await fetch(`/api/mikhmon/instances/${inst.id}/sync-mikhmon`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        showNotice('success', data.message);
        fetchMikhmonData(true);
      } else {
        showNotice('error', data.message || 'Gagal sinkronisasi data Mikhmon');
      }
    } catch (err: any) {
      showNotice('error', err.message);
    } finally {
      setIsSyncingMikhmonId(null);
    }
  };

  // View & download generated Mikhmon session config (include/config/{session}.php)
  const handleViewMikhmonPhpConfig = async (inst: MikhmonInstance) => {
    try {
      const res = await fetch(`/api/mikhmon/instances/${inst.id}/config-file`);
      const data = await res.json();
      if (data.success) {
        setViewingPhpConfig({
          instance: inst,
          fileName: data.fileName,
          filePath: data.filePath,
          phpContent: data.phpContent,
        });
      } else {
        showNotice('error', data.message || 'Gagal memuat konfigurasi Mikhmon');
      }
    } catch (err: any) {
      showNotice('error', err.message);
    }
  };

  // Save Instance (Create or Update)

  const handleSaveInstance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.sessionName || !formData.subdomain) {
      showNotice('error', 'Nama Sesi dan Subdomain wajib diisi.');
      return;
    }

    try {
      const payload = {
        ...formData,
        customerId: formCustomerType === 'existing' ? selectedCustomerId : undefined,
      };

      let res;
      if (editingInstance) {
        res = await fetch(`/api/mikhmon/instances/${editingInstance.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/mikhmon/instances', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const result = await res.json();
      if (result.success) {
        showNotice('success', result.message);
        setIsAddModalOpen(false);
        fetchMikhmonData(true);
      } else {
        showNotice('error', result.message || 'Gagal menyimpan data.');
      }
    } catch (err: any) {
      showNotice('error', 'Terjadi kesalahan sistem: ' + err.message);
    }
  };

  // Toggle Suspend Status
  const handleToggleSuspend = async (inst: MikhmonInstance) => {
    try {
      const res = await fetch(`/api/mikhmon/instances/${inst.id}/toggle-suspend`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        showNotice('success', data.message);
        fetchMikhmonData(true);
      } else {
        showNotice('error', data.message || 'Gagal mengubah status.');
      }
    } catch (err: any) {
      showNotice('error', err.message);
    }
  };

  // Delete Instance
  const handleDeleteInstance = async (inst: MikhmonInstance) => {
    if (!window.confirm(`Yakin ingin menghapus instance Mikhmon "${inst.subdomain}"? Data tagihan tidak akan terhapus.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/mikhmon/instances/${inst.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        showNotice('success', data.message);
        fetchMikhmonData(true);
      } else {
        showNotice('error', data.message || 'Gagal menghapus instance.');
      }
    } catch (err: any) {
      showNotice('error', err.message);
    }
  };

  // Generate Renewal Invoice on demand
  const handleGenerateRenewalInvoice = async (inst: MikhmonInstance) => {
    setIsGeneratingInvoice(inst.id);
    try {
      const res = await fetch(`/api/mikhmon/instances/${inst.id}/generate-invoice`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        showNotice('success', data.message);
        fetchMikhmonData(true);

        // If user wants to open the invoice right away
        if (data.invoice?.id) {
          onSelectInvoice(data.invoice.id);
        }
      } else {
        showNotice('error', data.message || 'Gagal membuat tagihan perpanjangan.');
      }
    } catch (err: any) {
      showNotice('error', err.message);
    } finally {
      setIsGeneratingInvoice(null);
    }
  };

  // Execute Batch Billing
  const handleRunBatchBilling = async () => {
    setIsBatchProcessing(true);
    try {
      const res = await fetch('/api/mikhmon/batch-billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetDays: 7 }),
      });
      const data = await res.json();
      if (data.success) {
        showNotice('success', data.message);
        setIsBatchBillingModalOpen(false);
        fetchMikhmonData(true);
      } else {
        showNotice('error', data.message || 'Gagal memproses tagihan massal.');
      }
    } catch (err: any) {
      showNotice('error', err.message);
    } finally {
      setIsBatchProcessing(false);
    }
  };

  // Fetch Server & Domain Settings
  const fetchServerSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/mikhmon/server-settings');
      const contentType = res.headers.get('content-type') || '';
      if (!res.ok || !contentType.includes('application/json')) {
        return;
      }
      const data = await res.json();
      if (data && data.success) {
        if (data.settings) setServerConfig(data.settings);
        if (data.nginxVhost) setNginxVhost(data.nginxVhost);
        if (data.dnsGuide) setDnsGuide(data.dnsGuide);
      }
    } catch (err: any) {
      console.warn('Failed to load server settings:', err?.message || err);
    }
  }, []);

  // Save Server & Domain Settings
  const handleSaveServerSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingServerSettings(true);
    try {
      const res = await fetch('/api/mikhmon/server-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(serverConfig),
      });
      const data = await res.json();
      if (data.success) {
        showNotice('success', data.message || 'Pengaturan domain berhasil disimpan');
        if (data.settings) setServerConfig(data.settings);
        if (data.nginxVhost) setNginxVhost(data.nginxVhost);
      } else {
        showNotice('error', data.message || 'Gagal menyimpan pengaturan');
      }
    } catch (err: any) {
      showNotice('error', err.message);
    } finally {
      setIsSavingServerSettings(false);
    }
  };

  // Upload Web Mikhmon Package
  const handleUploadWebPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadForm.fileName || !uploadForm.version) {
      showNotice('error', 'Nama berkas ZIP dan Versi Mikhmon wajib diisi');
      return;
    }
    setIsUploadingPackage(true);
    try {
      const res = await fetch('/api/mikhmon/upload-package', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(uploadForm),
      });
      const data = await res.json();
      if (data.success) {
        showNotice('success', data.message);
        if (data.packages) {
          setServerConfig((prev) => ({ ...prev, uploadedPackages: data.packages }));
        }
        setUploadForm({
          fileName: '',
          version: 'Mikhmon V3.20 Official (PHP 8)',
          notes: '',
          setAsDefault: false,
          fileSizeBytes: 2450000,
        });
      } else {
        showNotice('error', data.message || 'Gagal mengunggah paket');
      }
    } catch (err: any) {
      showNotice('error', err.message);
    } finally {
      setIsUploadingPackage(false);
    }
  };

  // Activate Package as Default
  const handleActivatePackage = async (id: string) => {
    try {
      const res = await fetch(`/api/mikhmon/packages/${id}/activate`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showNotice('success', data.message);
        if (data.packages) {
          setServerConfig((prev) => ({ ...prev, uploadedPackages: data.packages }));
        }
      }
    } catch (err: any) {
      showNotice('error', err.message);
    }
  };

  // Delete Package
  const handleDeletePackage = async (id: string) => {
    if (!window.confirm('Yakin ingin menghapus paket web ini dari server?')) return;
    try {
      const res = await fetch(`/api/mikhmon/packages/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showNotice('success', data.message);
        if (data.packages) {
          setServerConfig((prev) => ({ ...prev, uploadedPackages: data.packages }));
        }
      }
    } catch (err: any) {
      showNotice('error', err.message);
    }
  };

  // Filtered instances

  const filteredInstances = useMemo(() => {
    return instances.filter((inst) => {
      const matchSearch = 
        inst.subdomain.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inst.sessionName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inst.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inst.customerPhone.includes(searchQuery);

      if (!matchSearch) return false;

      const days = Math.ceil((new Date(inst.dueDate).getTime() - new Date().setHours(0,0,0,0)) / (1000*3600*24));

      if (statusFilter === 'active') return inst.status === 'active';
      if (statusFilter === 'suspended') return inst.status === 'suspended';
      if (statusFilter === 'expiring') return days <= 7 && inst.status !== 'suspended';

      return true;
    });
  }, [instances, searchQuery, statusFilter]);

  // Candidates for batch billing (due in <= 7 days)
  const batchCandidates = useMemo(() => {
    return instances.filter((inst) => {
      if (!inst.autoInvoice) return false;
      const days = Math.ceil((new Date(inst.dueDate).getTime() - new Date().setHours(0,0,0,0)) / (1000*3600*24));
      return days <= 7;
    });
  }, [instances]);

  return (
    <div className="space-y-6">
      {/* Alert Notice Toast */}
      {alertNotice && (
        <div className={`p-4 rounded-2xl flex items-center justify-between shadow-lg transition-all animate-in fade-in slide-in-from-top-2 ${
          alertNotice.type === 'success' 
            ? 'bg-emerald-600 text-white shadow-emerald-600/20' 
            : alertNotice.type === 'error'
            ? 'bg-rose-600 text-white shadow-rose-600/20'
            : 'bg-blue-600 text-white shadow-blue-600/20'
        }`}>
          <div className="flex items-center gap-2.5 font-medium text-xs sm:text-sm">
            {alertNotice.type === 'success' && <CheckCircle2 className="w-5 h-5 shrink-0" />}
            {alertNotice.type === 'error' && <AlertTriangle className="w-5 h-5 shrink-0" />}
            {alertNotice.type === 'info' && <Radio className="w-5 h-5 shrink-0" />}
            <span>{alertNotice.message}</span>
          </div>
          <button 
            onClick={() => setAlertNotice(null)} 
            className="p-1 hover:bg-white/20 rounded-lg text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner & Title */}
      <div className="rounded-3xl bg-linear-to-r from-orange-600 via-amber-600 to-rose-600 p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-48 h-48 rounded-full bg-amber-400/20 blur-xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-orange-100 text-xs font-semibold uppercase tracking-wider">
              <Radio className="w-3.5 h-3.5 text-amber-200 animate-pulse" />
              <span>Mikhmon Cloud & Hosting Manager</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Billing Mikhmon Online
            </h1>
            <p className="text-orange-100/90 text-xs sm:text-sm leading-relaxed">
              Pusat pengelolaan hosting & sewa Mikhmon Online untuk pengusaha RT-RW Net & Hotspot Voucher. Dilengkapi generator invoice otomatis, integrasi QRIS Dinamis, dan pemutusan akses otomatis saat menunggak.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            <button
              onClick={() => {
                fetchServerSettings();
                setIsWebserverModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs sm:text-sm font-black shadow-md transition active:scale-95 border border-amber-300"
              title="Pusat Manajemen Webserver Mikhmon, Domain Master, VirtualHost, & VPS Installer"
            >
              <Server className="w-4 h-4 text-slate-950" />
              <span>Webserver & Domain</span>
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            </button>

            <button
              onClick={() => setIsBatchBillingModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-md text-white text-xs sm:text-sm font-bold shadow-xs transition active:scale-95 border border-white/20"
              title="Terbitkan faktur massal untuk akun yang akan jatuh tempo"
            >

              <Zap className="w-4 h-4 text-amber-300" />
              <span>Tagih Massal</span>
              {batchCandidates.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-900 text-[10px] font-black">
                  {batchCandidates.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setIsPlansModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-md text-white text-xs sm:text-sm font-bold shadow-xs transition active:scale-95 border border-white/20"
            >
              <Package className="w-4 h-4 text-orange-200" />
              <span>Paket & Tarif</span>
            </button>

            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-white text-orange-700 hover:bg-orange-50 text-xs sm:text-sm font-black shadow-lg shadow-black/10 transition active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Tambah Tenant</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Metrics Summary Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Total Instances */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Tenant</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Globe className="w-4 h-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900 tracking-tight">
            {stats.totalInstances}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Instance Mikhmon Cloud</p>
        </div>

        {/* Active Instances */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-600">Aktif Normal</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-emerald-600 tracking-tight">
            {stats.activeInstances}
          </p>
          <p className="text-[11px] text-emerald-700 mt-1">Dapat diakses online</p>
        </div>

        {/* Expiring Soon (< 7 Days) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-600">Mendekati Tempo</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-amber-600 tracking-tight">
            {stats.expiringSoon}
          </p>
          <p className="text-[11px] text-amber-700 mt-1">&le; 7 hari perpanjangan</p>
        </div>

        {/* Suspended / Isolir */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-600">Isolir / Suspended</span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <Power className="w-4 h-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-rose-600 tracking-tight">
            {stats.suspendedInstances}
          </p>
          <p className="text-[11px] text-rose-700 mt-1">Akses web dinonaktifkan</p>
        </div>

        {/* Monthly Recurring Revenue */}
        <div className="col-span-2 lg:col-span-1 p-4 sm:p-5 rounded-2xl bg-linear-to-br from-orange-50 to-amber-50/70 border border-orange-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-orange-900">MRR Bulanan</span>
            <div className="p-2 rounded-xl bg-orange-100 text-orange-700">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="mt-3 text-xl sm:text-2xl font-black text-orange-950 tracking-tight">
            {formatRupiah(stats.monthlyMRR)}
          </p>
          <p className="text-[11px] text-orange-800 font-medium mt-1">Potensi Omset Hosting / Bulan</p>
        </div>
      </div>

      {/* Filter & Action Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto no-scrollbar">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition whitespace-nowrap ${
              statusFilter === 'all'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Semua ({instances.length})
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition whitespace-nowrap ${
              statusFilter === 'active'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Aktif ({stats.activeInstances})
          </button>
          <button
            onClick={() => setStatusFilter('expiring')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition whitespace-nowrap ${
              statusFilter === 'expiring'
                ? 'bg-amber-500 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Mendekati Tempo ({stats.expiringSoon})
          </button>
          <button
            onClick={() => setStatusFilter('suspended')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition whitespace-nowrap ${
              statusFilter === 'suspended'
                ? 'bg-rose-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Isolir ({stats.suspendedInstances})
          </button>
        </div>

        {/* Search Bar & Refresh */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari subdomain, sesi, nama..."
              className="w-full pl-9 pr-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
            />
          </div>

          <button
            onClick={() => fetchMikhmonData(true)}
            disabled={isRefreshing}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition active:scale-95 disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 text-slate-600 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Tenant Cards Grid */}
      {isLoading ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80">
          <RefreshCw className="w-8 h-8 text-orange-500 animate-spin mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-700">Memuat data Mikhmon Online...</p>
        </div>
      ) : filteredInstances.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-300">
          <Radio className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">Tidak ada instance Mikhmon ditemukan</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            {searchQuery 
              ? `Tidak ada hasil pencarian yang cocok dengan kata kunci "${searchQuery}".` 
              : 'Belum ada tenant Mikhmon Online yang didaftarkan. Klik tombol di bawah untuk mendaftarkan tenant pertama.'}
          </p>
          {!searchQuery && (
            <button
              onClick={handleOpenAddModal}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-md shadow-orange-600/20 transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Daftarkan Tenant Baru</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredInstances.map((inst) => {
            const daysRemaining = Math.ceil(
              (new Date(inst.dueDate).getTime() - new Date().setHours(0,0,0,0)) / (1000 * 60 * 60 * 24)
            );
            const isOverdue = daysRemaining < 0 && inst.status !== 'suspended';
            const isSuspended = inst.status === 'suspended';

            const cleanPhone = (inst.customerPhone || '').replace(/\D/g, '').replace(/^0/, '62');
            const waRenewalMessage = encodeURIComponent(
              `Halo kak *${inst.customerName}*,\n` +
              `Pengingat tagihan langganan *Mikhmon Online* (${inst.subdomain}) sebesar *${formatRupiah(inst.price)}* jatuh tempo pada *${formatDateIndo(inst.dueDate)}*.\n` +
              `Silakan lakukan perpanjangan agar sistem monitoring hotspot Anda tetap aktif berjalan. Terima kasih!`
            );
            const waUrl = cleanPhone ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${waRenewalMessage}` : '';

            return (
              <div 
                key={inst.id}
                className={`rounded-3xl border bg-white shadow-2xs hover:shadow-md transition duration-200 flex flex-col justify-between overflow-hidden ${
                  isSuspended 
                    ? 'border-rose-200 bg-rose-50/20' 
                    : isOverdue 
                    ? 'border-amber-300 ring-1 ring-amber-300' 
                    : 'border-slate-200/90'
                }`}
              >
                {/* Card Top: Subdomain & Status */}
                <div className="p-5 pb-4 border-b border-slate-100">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-lg bg-orange-100 text-orange-700">
                          <Radio className="w-4 h-4" />
                        </span>
                        <h3 className="font-extrabold text-sm sm:text-base text-slate-900 truncate">
                          {inst.subdomain}
                        </h3>
                      </div>
                      <p className="text-[11px] font-mono text-slate-500 mt-1 truncate">
                        Sesi: <span className="font-bold text-slate-700">{inst.sessionName}</span>
                      </p>
                    </div>

                    {/* Status Badge */}
                    <div className="shrink-0">
                      {isSuspended ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-700 border border-rose-200">
                          <Power className="w-3 h-3 text-rose-600" />
                          <span>ISOLIR</span>
                        </span>
                      ) : isOverdue ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          <span>TERLAMBAT ({Math.abs(daysRemaining)}h)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>AKTIF</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <p className="text-[11px] text-slate-400 font-medium">Pemilik / Pelanggan:</p>
                      <p className="font-bold text-slate-800 truncate max-w-[160px]">{inst.customerName}</p>
                    </div>

                    {inst.customerPhone && (
                      <a
                        href={`tel:${inst.customerPhone}`}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition text-[11px] font-medium"
                      >
                        <Phone className="w-3 h-3 text-slate-500" />
                        <span>{inst.customerPhone}</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* Card Middle: Plan Details & Due Date */}
                <div className="p-5 py-3.5 space-y-2.5 bg-slate-50/50 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Paket Langganan:</span>
                    <span className="font-bold text-slate-800 bg-white px-2 py-0.5 rounded-md border border-slate-200 text-[11px]">
                      {inst.planName}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Tarif / Siklus:</span>
                    <span className="font-extrabold text-orange-700 text-sm">
                      {formatRupiah(inst.price)}
                      <span className="text-[10px] font-normal text-slate-500 ml-1">
                        / {inst.billingCycle === 'annual' ? 'thn' : 'bln'}
                      </span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Jatuh Tempo:</span>
                    <div className="text-right">
                      <span className="font-bold text-slate-800">
                        {formatDateIndo(inst.dueDate)}
                      </span>
                      <span className={`block text-[10px] font-semibold ${
                        daysRemaining < 0 
                          ? 'text-rose-600' 
                          : daysRemaining <= 7 
                          ? 'text-amber-600' 
                          : 'text-slate-400'
                      }`}>
                        {daysRemaining < 0 
                          ? `(Lewat ${Math.abs(daysRemaining)} hari)` 
                          : daysRemaining === 0 
                          ? '(Jatuh Tempo Hari Ini)' 
                          : `(${daysRemaining} hari lagi)`}
                      </span>
                    </div>
                  </div>

                  {inst.mikrotikHost && (
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[11px]">
                      <span className="text-slate-400">Router MikroTik:</span>
                      <span className="font-mono text-slate-600 truncate max-w-[150px]">
                        {inst.mikrotikHost}:{inst.mikrotikPort || 8728}
                      </span>
                    </div>
                  )}

                  {inst.lastInvoiceNumber && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Invoice Terakhir:</span>
                      <button
                        onClick={() => {
                          if (inst.lastInvoiceId) onSelectInvoice(inst.lastInvoiceId);
                        }}
                        className="font-mono text-blue-600 hover:underline font-bold flex items-center gap-1"
                      >
                        <FileText className="w-3 h-3" />
                        <span>{inst.lastInvoiceNumber}</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Card Actions Footer */}
                <div className="p-4 bg-white border-t border-slate-100 flex flex-col gap-2">
                  {/* Primary Row: Open Mikhmon, Voucher Studio & Pay/Invoice */}
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => {
                        setActivePortalInstance(inst);
                        setIsPortalModalOpen(true);
                      }}
                      className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold transition active:scale-95 border border-amber-200"
                      title="Buka Web Mikhmon (Live Webserver Preview)"
                    >
                      <Globe className="w-3.5 h-3.5 text-amber-600" />
                      <span className="truncate">Web Mikhmon</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveVoucherInstance(inst);
                        setIsVoucherModalOpen(true);
                      }}
                      className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition active:scale-95 border border-indigo-200"
                      title="Cetak & Terbitkan Voucher Hotspot"
                    >
                      <Ticket className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Voucher</span>
                    </button>

                    <button
                      onClick={() => handleGenerateRenewalInvoice(inst)}
                      disabled={isGeneratingInvoice === inst.id}
                      className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition active:scale-95 disabled:opacity-50"
                      title="Buat invoice tagihan perpanjangan beserta QRIS Dinamis"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span className="truncate">{isGeneratingInvoice === inst.id ? '...' : 'Tagih QRIS'}</span>
                    </button>
                  </div>

                  {/* Secondary Tools: WA reminder, Toggle Suspend, Edit, Delete */}
                  <div className="flex items-center justify-between pt-1 text-slate-500">
                    <div className="flex items-center gap-1">
                      {waUrl && (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600 transition"
                          title="Kirim Pengingat Tagihan WhatsApp"
                        >
                          <Share2 className="w-4 h-4" />
                        </a>
                      )}

                      <button
                        onClick={() => handleToggleSuspend(inst)}
                        className={`p-1.5 rounded-lg transition ${
                          inst.status === 'suspended'
                            ? 'hover:bg-emerald-50 text-emerald-600'
                            : 'hover:bg-rose-50 text-rose-600'
                        }`}
                        title={inst.status === 'suspended' ? 'Aktifkan Kembali Akses' : 'Isolir / Nonaktifkan Akses'}
                      >
                        <Power className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleCopy(inst.serverUrl || `https://${inst.subdomain}`, inst.id)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition"
                        title="Salin Link Mikhmon"
                      >
                        {copiedText === inst.id ? (
                          <Check className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditModal(inst)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition"
                        title="Edit Detail Tenant"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDeleteInstance(inst)}
                        className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500 transition"
                        title="Hapus Tenant"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: Tambah / Edit Tenant Mikhmon */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden my-6 border border-slate-200">
            {/* Modal Header */}
            <div className="p-6 bg-linear-to-r from-orange-600 to-amber-600 text-white flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-white">
                  {editingInstance ? 'Edit Data Tenant Mikhmon' : 'Daftarkan Tenant Mikhmon Baru'}
                </h3>
                <p className="text-xs text-orange-100 mt-0.5">
                  Layanan hosting & manajemen billing perpanjangan Mikhmon Online
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-white/20 text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveInstance} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Customer Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Pelanggan / Pemilik Tenant <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setFormCustomerType('existing')}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border transition ${
                      formCustomerType === 'existing'
                        ? 'border-orange-500 bg-orange-50 text-orange-800'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Pilih Dari Pelanggan Terdaftar
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormCustomerType('new')}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border transition ${
                      formCustomerType === 'new'
                        ? 'border-orange-500 bg-orange-50 text-orange-800'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Input Pelanggan Baru
                  </button>
                </div>

                {formCustomerType === 'existing' ? (
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => handleSelectExistingCustomer(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
                  >
                    <option value="">-- Pilih dari direktori pelanggan --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.company ? `(${c.company})` : ''} - {c.phone}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <input
                      type="text"
                      placeholder="Nama Lengkap Pelanggan *"
                      value={formData.customerName}
                      onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                      required
                      className="px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
                    />
                    <input
                      type="text"
                      placeholder="Nomor WhatsApp (contoh: 08123456789) *"
                      value={formData.customerPhone}
                      onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                      required
                      className="px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
                    />
                  </div>
                )}
              </div>

              {/* Session Name & Subdomain */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Sesi / Brand Hotspot <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: BERKAH_HOTSPOT_VOUCHER"
                    value={formData.sessionName}
                    onChange={(e) => setFormData({ ...formData, sessionName: e.target.value })}
                    required
                    className="w-full px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Subdomain Mikhmon <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 focus-within:ring-2 focus-within:ring-orange-500/20 focus-within:border-orange-500 overflow-hidden">
                    <input
                      type="text"
                      placeholder="berkahnet"
                      value={formData.subdomain}
                      onChange={(e) => setFormData({ ...formData, subdomain: e.target.value })}
                      required
                      className="w-full px-3 py-2 text-xs font-medium bg-transparent focus:outline-none"
                    />
                    <span className="px-2.5 py-2 text-[11px] font-bold text-slate-500 bg-slate-100 border-l border-slate-200 shrink-0">
                      .mikhmon.online
                    </span>
                  </div>
                </div>
              </div>

              {/* Plan & Pricing */}
              <div className="p-4 rounded-2xl bg-orange-50/70 border border-orange-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-orange-950 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-orange-600" />
                    <span>Pilihan Paket Langganan Mikhmon</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {plans.map((p) => {
                    const isSelected = formData.planId === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => handleSelectPlan(p.id)}
                        className={`p-3 rounded-xl border cursor-pointer transition ${
                          isSelected
                            ? 'border-orange-600 bg-white shadow-xs ring-2 ring-orange-500/20'
                            : 'border-orange-200/60 bg-white/70 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800">{p.name}</span>
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-orange-600" />}
                        </div>
                        <p className="text-xs font-extrabold text-orange-700 mt-1">
                          {formatRupiah(p.price)}
                          <span className="text-[10px] text-slate-400 font-normal"> / {p.billingCycle === 'annual' ? 'thn' : 'bln'}</span>
                        </p>
                      </div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Kustom Tarif (Rp)
                    </label>
                    <input
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Siklus Penagihan
                    </label>
                    <select
                      value={formData.billingCycle}
                      onChange={(e) => setFormData({ ...formData, billingCycle: e.target.value as any })}
                      className="w-full px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white"
                    >
                      <option value="monthly">Bulanan (1 Bulan)</option>
                      <option value="quarterly">3 Bulan</option>
                      <option value="semi_annual">6 Bulan</option>
                      <option value="annual">Tahunan (1 Tahun)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Start Date & Due Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tanggal Mulai Aktif
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tanggal Jatuh Tempo Perpanjangan
                  </label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
                  />
                </div>
              </div>

              {/* Integrasi Penuh Mesin Mikhmon & RouterOS API */}
              <div className="p-4 sm:p-5 rounded-2xl bg-linear-to-br from-slate-900 via-slate-900 to-indigo-950 text-white shadow-md border border-slate-800 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-orange-500/20 text-orange-400 border border-orange-500/30">
                      <Radio className="w-4 h-4 text-orange-400 animate-pulse" />
                    </span>
                    <div>
                      <h4 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
                        <span>Integrasi Mesin Mikhmon Online</span>
                        <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 text-[9px] font-bold border border-emerald-500/30">
                          Live API
                        </span>
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        Sinkronkan Router MikroTik ke sesi hosting Mikhmon Cloud
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleTestMikhmonConnection}
                    disabled={isTestingMikhmon}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-[11px] font-black transition active:scale-95 disabled:opacity-50 shadow-xs"
                    title="Uji koneksi socket port 8728 dari server Mikhmon ke MikroTik"
                  >
                    <Zap className={`w-3.5 h-3.5 text-amber-200 ${isTestingMikhmon ? 'animate-bounce' : ''}`} />
                    <span>{isTestingMikhmon ? 'Menguji...' : 'Uji Koneksi'}</span>
                  </button>
                </div>

                {/* Test Result Feedback Box */}
                {mikhmonTestResult && (
                  <div className={`p-3 rounded-xl text-xs border transition ${
                    mikhmonTestResult.success
                      ? 'bg-emerald-950/60 border-emerald-700/80 text-emerald-200'
                      : 'bg-rose-950/60 border-rose-700/80 text-rose-200'
                  }`}>
                    <div className="flex items-center gap-2 font-bold">
                      {mikhmonTestResult.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                      )}
                      <span>{mikhmonTestResult.message}</span>
                      {mikhmonTestResult.pingMs && (
                        <span className="ml-auto px-1.5 py-0.5 rounded-md bg-white/10 text-[10px] font-mono">
                          Ping: {mikhmonTestResult.pingMs} ms
                        </span>
                      )}
                    </div>
                    {mikhmonTestResult.success && mikhmonTestResult.data && (
                      <div className="mt-2 pt-2 border-t border-emerald-800/60 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono text-emerald-300">
                        <div>Identity: <span className="font-bold text-white">{mikhmonTestResult.data.systemIdentity}</span></div>
                        <div>Board: <span className="font-bold text-white">{mikhmonTestResult.data.boardName}</span></div>
                        <div>ROS: <span className="font-bold text-white">{mikhmonTestResult.data.rosVersion}</span></div>
                        <div>Hotspot Aktif: <span className="font-bold text-amber-300">{mikhmonTestResult.data.hotspotActiveCount} user</span></div>
                      </div>
                    )}
                  </div>
                )}

                {/* Host IP & Port */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      IP Publik / DDNS VPN Router MikroTik <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: id-6.hostddns.us atau 103.147.20.12"
                      value={formData.mikrotikHost}
                      onChange={(e) => setFormData({ ...formData, mikrotikHost: e.target.value })}
                      required
                      className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-700 bg-slate-800/80 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Port API Router (8728) <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="number"
                      placeholder="8728"
                      value={formData.mikrotikPort}
                      onChange={(e) => setFormData({ ...formData, mikrotikPort: Number(e.target.value) })}
                      required
                      className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-700 bg-slate-800/80 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                {/* Username & Password API */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Username API MikroTik (Mikhmon)
                    </label>
                    <input
                      type="text"
                      placeholder="mikhmon"
                      value={formData.mikrotikUser}
                      onChange={(e) => setFormData({ ...formData, mikrotikUser: e.target.value })}
                      className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-700 bg-slate-800/80 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Password API MikroTik
                    </label>
                    <input
                      type="password"
                      placeholder="Password API Router"
                      value={formData.mikrotikPassword}
                      onChange={(e) => setFormData({ ...formData, mikrotikPassword: e.target.value })}
                      className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-700 bg-slate-800/80 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                {/* Hotspot Server Name & DNS Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 border-t border-slate-800">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Nama Server Hotspot Mikhmon
                    </label>
                    <input
                      type="text"
                      placeholder="all (atau nama server hotspot)"
                      value={formData.hotspotName}
                      onChange={(e) => setFormData({ ...formData, hotspotName: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-700 bg-slate-800/80 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      DNS Name Hotspot Login
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: login.wifi atau hotspot.net"
                      value={formData.dnsName}
                      onChange={(e) => setFormData({ ...formData, dnsName: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-700 bg-slate-800/80 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                {/* Mikhmon Engine Automation Toggles */}
                <div className="space-y-2 pt-2 border-t border-slate-800 text-[11px]">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                    <input
                      type="checkbox"
                      checked={formData.autoGenerateSessionPhp}
                      onChange={(e) => setFormData({ ...formData, autoGenerateSessionPhp: e.target.checked })}
                      className="w-4 h-4 text-orange-600 rounded-sm focus:ring-orange-500"
                    />
                    <span className="font-semibold">
                      Otomatis buat & simpan file konfigurasi sesi Mikhmon (<code className="text-orange-300">include/config/{formData.sessionName || 'session'}.php</code>)
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                    <input
                      type="checkbox"
                      checked={formData.autoSuspend}
                      onChange={(e) => setFormData({ ...formData, autoSuspend: e.target.checked })}
                      className="w-4 h-4 text-orange-600 rounded-sm focus:ring-orange-500"
                    />
                    <span className="font-semibold">
                      Otomatis isolir akses Mikhmon jika menunggak melewati jatuh tempo
                    </span>
                  </label>
                </div>
              </div>


              {/* Automation Toggles */}
              <div className="space-y-2 pt-1 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.autoInvoice}
                    onChange={(e) => setFormData({ ...formData, autoInvoice: e.target.checked })}
                    className="w-4 h-4 text-orange-600 rounded-sm focus:ring-orange-500"
                  />
                  <span className="font-semibold text-slate-700">
                    Otomatis terbitkan invoice & QRIS Dinamis saat mendekati jatuh tempo
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.autoSuspend}
                    onChange={(e) => setFormData({ ...formData, autoSuspend: e.target.checked })}
                    className="w-4 h-4 text-orange-600 rounded-sm focus:ring-orange-500"
                  />
                  <span className="font-semibold text-slate-700">
                    Otomatis suspend / isolir akses instance web jika menunggak melewati jatuh tempo
                  </span>
                </label>

                {!editingInstance && (
                  <label className="flex items-center gap-2 cursor-pointer pt-1 text-blue-800">
                    <input
                      type="checkbox"
                      checked={formData.createInvoiceNow}
                      onChange={(e) => setFormData({ ...formData, createInvoiceNow: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded-sm focus:ring-blue-500"
                    />
                    <span className="font-bold">
                      Terbitkan faktur aktivasi pertama sekarang juga (beserta QRIS Dinamis)
                    </span>
                  </label>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-black text-white bg-orange-600 hover:bg-orange-700 rounded-xl shadow-md shadow-orange-600/25 transition active:scale-95"
                >
                  {editingInstance ? 'Simpan Perubahan' : 'Daftarkan Tenant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Kelola Paket & Tarif */}
      {isPlansModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden my-6 border border-slate-200">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Package className="w-5 h-5 text-orange-400" />
                  <span>Daftar Paket Langganan Mikhmon Online</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Sesuaikan harga dan fitur paket sewa Mikhmon Cloud untuk klien RT-RW Net
                </p>
              </div>
              <button
                onClick={() => setIsPlansModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-white/10 text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="space-y-3">
                {plans.map((p) => (
                  <div key={p.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-sm text-slate-900">{p.name}</h4>
                        {p.isPopular && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800">
                            POPULER
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">{p.description}</p>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {p.features?.map((f, idx) => (
                          <span key={idx} className="text-[10px] bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded-md font-medium">
                            ✓ {f}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-lg font-black text-orange-600">{formatRupiah(p.price)}</p>
                      <p className="text-[11px] text-slate-400">/ {p.billingCycle === 'annual' ? 'tahun' : 'bulan'}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-xs text-blue-900 leading-relaxed">
                <span className="font-bold">Tips Penjualan Mikhmon Online:</span> Anda bisa menawarkan paket bundling lengkap (VPN Remote + Hosting Mikhmon Online + Bot Telegram Voucher) dengan tarif Rp 25.000 - Rp 50.000 / bulan per pelanggan.
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setIsPlansModalOpen(false)}
                  className="px-5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Batch Billing (Tagih Massal) */}
      {isBatchBillingModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden my-6 border border-slate-200">
            <div className="p-6 bg-linear-to-r from-amber-500 to-orange-600 text-white flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-200" />
                  <span>Otomasi Tagih Massal (Batch Billing)</span>
                </h3>
                <p className="text-xs text-amber-100 mt-0.5">
                  Terbitkan faktur dan QRIS Dinamis untuk tenant yang akan jatuh tempo
                </p>
              </div>
              <button
                onClick={() => setIsBatchBillingModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-white/20 text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Sistem mendeteksi <span className="font-bold text-slate-900">{batchCandidates.length} tenant</span> yang akan jatuh tempo dalam waktu 7 hari ke depan atau sudah melewati batas tempo:
              </p>

              {batchCandidates.length > 0 ? (
                <div className="max-h-60 overflow-y-auto space-y-2 border border-slate-200 rounded-2xl p-2 bg-slate-50">
                  {batchCandidates.map((c) => (
                    <div key={c.id} className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-slate-800">{c.subdomain}</p>
                        <p className="text-[11px] text-slate-500">{c.customerName} - {formatDateIndo(c.dueDate)}</p>
                      </div>
                      <p className="font-extrabold text-orange-600">{formatRupiah(c.price)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">Semua tagihan sudah up-to-date!</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Tidak ada tenant yang mendekati jatuh tempo saat ini.</p>
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsBatchBillingModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Batal
                </button>

                {batchCandidates.length > 0 && (
                  <button
                    type="button"
                    onClick={handleRunBatchBilling}
                    disabled={isBatchProcessing}
                    className="px-5 py-2 text-xs font-black text-white bg-orange-600 hover:bg-orange-700 rounded-xl shadow-md shadow-orange-600/25 transition active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Zap className="w-4 h-4" />
                    <span>{isBatchProcessing ? 'Memproses...' : `Terbitkan ${batchCandidates.length} Faktur Sekarang`}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mikhmon Webserver Engine & VPS Installer Modal */}
      <MikhmonWebserverModal
        isOpen={isWebserverModalOpen}
        onClose={() => setIsWebserverModalOpen(false)}
        instances={instances}
        serverConfig={serverConfig}
        setServerConfig={setServerConfig}
        onSaveServerConfig={handleSaveServerSettings}
        isSavingServerSettings={isSavingServerSettings}
        uploadForm={uploadForm}
        setUploadForm={setUploadForm}
        onUploadWebPackage={handleUploadWebPackage}
        isUploadingPackage={isUploadingPackage}
        onActivatePackage={handleActivatePackage}
        onDeletePackage={handleDeletePackage}
        nginxVhost={nginxVhost}
        onOpenPortal={(inst) => {
          setActivePortalInstance(inst);
          setIsPortalModalOpen(true);
        }}
        onOpenVouchers={(inst) => {
          setActiveVoucherInstance(inst);
          setIsVoucherModalOpen(true);
        }}
        showNotice={showNotice}
      />

      {/* Mikhmon Live Portal In-App Preview Modal */}
      <MikhmonLivePortalModal
        isOpen={isPortalModalOpen}
        onClose={() => setIsPortalModalOpen(false)}
        instance={activePortalInstance}
        onToggleStatus={(inst) => {
          handleToggleSuspend(inst);
          setActivePortalInstance((prev) =>
            prev ? { ...prev, status: prev.status === 'suspended' ? 'active' : 'suspended' } : null
          );
        }}
      />

      {/* Mikhmon Voucher Studio & Thermal Ticket Modal */}
      <MikhmonVoucherStudioModal
        isOpen={isVoucherModalOpen}
        onClose={() => setIsVoucherModalOpen(false)}
        instance={activeVoucherInstance}
        showNotice={showNotice}
        onVouchersGenerated={() => fetchMikhmonData(true)}
      />
    </div>
  );
};

