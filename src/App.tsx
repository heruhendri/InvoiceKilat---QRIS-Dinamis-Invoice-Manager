import React, { useState, useEffect, useCallback } from 'react';
import { Navbar, AppNavTab } from './components/Navbar';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { InvoiceList } from './components/InvoiceList';
import { InvoiceDetailModal } from './components/InvoiceDetailModal';
import { InvoiceFormModal } from './components/InvoiceFormModal';
import { PaymentModal } from './components/PaymentModal';
import { QRISGeneratorModal } from './components/QRISGeneratorModal';
import { PrintableInvoice } from './components/PrintableInvoice';
import { SpreadsheetSyncView } from './components/SpreadsheetSyncView';
import { SettingsModal } from './components/SettingsModal';
import { NotificationToast } from './components/NotificationToast';
import { OfflineIndicator } from './components/OfflineIndicator';

// New Feature Modules requested:
// 1. Customer Directory (Daftar Pelanggan)
// 2. Service Catalog (Daftar Jasa)
// 3. Billing Automation Center (Otomasi Tagihan)
// 4. Customer Portal (Portal Mandiri Pelanggan)
import { CustomerDirectory } from './components/CustomerDirectory';
import { RouterFleetManagement } from './components/RouterFleetManagement';
import { ServiceCatalog } from './components/ServiceCatalog';
import { BillingAutomationCenter } from './components/BillingAutomationCenter';
import { CustomerPortal } from './components/CustomerPortal';
import { CustomerPortalNavbar } from './components/CustomerPortalNavbar';
import { AdminLogin } from './components/AdminLogin';
import { AppWatermark } from './components/AppWatermark';
import { FeatureGalleryModal } from './components/FeatureGalleryModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { FileText, ShieldCheck, Globe, AlertCircle, CheckCircle2, Trash2, X } from 'lucide-react';

import { useRealtimeSync } from './hooks/useRealtimeSync';
import { 
  Invoice, 
  AnalyticsSummary, 
  BusinessSettings, 
  RealtimeEvent, 
  CustomerRecord, 
  ServiceItem, 
  RecurringAddonService,
  BillingAutomationRule, 
  AutomationDispatchLog,
  AdminUser
} from './types';
import { formatRupiah, formatDateIndo } from './utils/formatters';

export default function App() {
  // Navigation & View state
  // Active Portal mode: 'admin' (pengelola) or 'customer' (pelanggan/publik)
  const [activePortal, setActivePortal] = useState<'admin' | 'customer'>('admin');
  const [currentTab, setCurrentTab] = useState<AppNavTab>('dashboard');

  // Admin Authentication State
  const [adminUser, setAdminUser] = useState<AdminUser | null>(() => {
    try {
      const saved = localStorage.getItem('admin_user') || sessionStorage.getItem('admin_user');
      if (saved) return JSON.parse(saved);
      // Default super admin session ready out-of-the-box so users are not blocked by a login screen
      return {
        id: 'admin-1',
        username: 'admin',
        email: 'admin@ciptamedia.id',
        name: 'Budi Santoso',
        role: 'superadmin',
        createdAt: new Date().toISOString(),
      };
    } catch {
      return {
        id: 'admin-1',
        username: 'admin',
        email: 'admin@ciptamedia.id',
        name: 'Budi Santoso',
        role: 'superadmin',
        createdAt: new Date().toISOString(),
      };
    }
  });
  const [adminToken, setAdminToken] = useState<string | null>(() => {
    return localStorage.getItem('admin_token') || sessionStorage.getItem('admin_token') || 'adm_default_session';
  });

  // Customer Portal navigation state
  const [portalSearchQuery, setPortalSearchQuery] = useState<string>('');
  const [portalInvoiceNumber, setPortalInvoiceNumber] = useState<string>('');

  // Core data states
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [recurringAddons, setRecurringAddons] = useState<RecurringAddonService[]>([]);
  const [automationRules, setAutomationRules] = useState<BillingAutomationRule[]>([]);
  const [automationLogs, setAutomationLogs] = useState<AutomationDispatchLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modals state
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [preselectedCustomer, setPreselectedCustomer] = useState<CustomerRecord | null>(null);
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
  const [isQrisModalOpen, setIsQrisModalOpen] = useState<boolean>(false);
  const [printInvoice, setPrintInvoice] = useState<Invoice | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isGalleryModalOpen, setIsGalleryModalOpen] = useState<boolean>(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<'app' | 'company' | 'template' | 'qris' | 'backup' | 'notification'>('app');

  const handleOpenSettings = (tab?: any) => {
    const validTabs = ['app', 'company', 'template', 'qris', 'backup', 'notification'];
    const selectedTab = (typeof tab === 'string' && validTabs.includes(tab)) ? tab : 'app';
    setSettingsInitialTab(selectedTab as any);
    setIsSettingsModalOpen(true);
  };

  // Interactive operations state
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isCheckingReminders, setIsCheckingReminders] = useState<boolean>(false);
  const [isRunningAutomation, setIsRunningAutomation] = useState<boolean>(false);
  const [activeToast, setActiveToast] = useState<RealtimeEvent | null>(null);

  // In-app dialog & notification states (replaces window.confirm & window.alert for iframe compatibility)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const [appAlert, setAppAlert] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type?: 'success' | 'error' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
  });

  // Fetch initial application data
  const fetchData = useCallback(async () => {
    try {
      const [
        invData,
        anaData,
        setData,
        custData,
        srvData,
        addonsData,
        rulesData,
        logsData
      ] = await Promise.all([
        fetch('/api/invoices').then((r) => r.json()).catch(() => ({ invoices: [] })),
        fetch('/api/analytics').then((r) => r.json()).catch(() => null),
        fetch('/api/settings').then((r) => r.json()).catch(() => null),
        fetch('/api/customers').then((r) => r.json()).catch(() => ({ customers: [] })),
        fetch('/api/services').then((r) => r.json()).catch(() => ({ services: [] })),
        fetch('/api/recurring-addons').then((r) => r.json()).catch(() => ({ addons: [] })),
        fetch('/api/automation/rules').then((r) => r.json()).catch(() => ({ rules: [] })),
        fetch('/api/automation/logs').then((r) => r.json()).catch(() => ({ logs: [] })),
      ]);

      if (Array.isArray(invData)) {
        setInvoices(invData);
      } else if (invData?.invoices && Array.isArray(invData.invoices)) {
        setInvoices(invData.invoices);
      }
      if (anaData?.summary) setAnalytics(anaData);
      if (setData?.settings) {
        setSettings(setData.settings);
      } else if (setData && typeof setData === 'object' && (setData.businessName !== undefined || setData.appName !== undefined)) {
        setSettings(setData);
      }
      if (custData?.customers) setCustomers(custData.customers);
      if (srvData?.services) setServices(srvData.services);
      if (addonsData?.addons) setRecurringAddons(addonsData.addons);
      if (rulesData?.rules) setAutomationRules(rulesData.rules);
      if (logsData?.logs) setAutomationLogs(logsData.logs);
    } catch (err) {
      console.error('Error fetching application data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Check for deep links / URL hash (e.g. #/portal?q=0812... or #/portal?inv=INV-...)
    const checkHashRoute = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/portal') || hash.startsWith('#portal')) {
        setActivePortal('customer');
        setCurrentTab('portal');
        const urlParams = new URLSearchParams(hash.split('?')[1] || '');
        const qParam = urlParams.get('q');
        const invParam = urlParams.get('inv');
        if (qParam) setPortalSearchQuery(qParam);
        if (invParam) setPortalInvoiceNumber(invParam);
      } else if (hash.startsWith('#/admin') || hash.startsWith('#admin')) {
        setActivePortal('admin');
      }
    };

    checkHashRoute();
    window.addEventListener('hashchange', checkHashRoute);
    return () => window.removeEventListener('hashchange', checkHashRoute);
  }, [fetchData]);

  // Check active admin session from token
  useEffect(() => {
    const token = localStorage.getItem('admin_token') || sessionStorage.getItem('admin_token');
    if (token) {
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.success && data.user) {
            setAdminUser(data.user);
            setAdminToken(token);
          } else {
            localStorage.removeItem('admin_token');
            localStorage.removeItem('admin_user');
            sessionStorage.removeItem('admin_token');
            sessionStorage.removeItem('admin_user');
            setAdminUser(null);
            setAdminToken(null);
          }
        })
        .catch(() => {});
    }
  }, []);

  const handleAdminLoginSuccess = (user: AdminUser, token: string) => {
    setAdminUser(user);
    setAdminToken(token);
    setCurrentTab('dashboard');
    fetchData();
  };

  const handleAdminLogout = async () => {
    const token = adminToken || localStorage.getItem('admin_token') || sessionStorage.getItem('admin_token');
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (e) {
        console.warn('Logout error', e);
      }
    }
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    sessionStorage.removeItem('admin_token');
    sessionStorage.removeItem('admin_user');
    setAdminUser(null);
    setAdminToken(null);
  };

  // Real-time synchronization hook via SSE
  const handleRealtimeEvent = useCallback((event: RealtimeEvent) => {
    try {
      const isMuted = localStorage.getItem('notification_toasts_muted') === 'true';
      if (!isMuted) {
        setActiveToast(event);
      }
    } catch {
      setActiveToast(event);
    }
    // Refresh analytics & invoice data seamlessly
    fetchData();
  }, [fetchData]);

  const handleCloseToast = useCallback(() => {
    setActiveToast(null);
  }, []);

  const { isConnected, notifications, unreadCount, clearUnread } = useRealtimeSync(handleRealtimeEvent);

  // Find currently selected invoice
  const selectedInvoice = selectedInvoiceId 
    ? invoices.find((i) => i.id === selectedInvoiceId || i.invoiceNumber === selectedInvoiceId) || null 
    : null;

  // Invoice Handlers
  const handleSaveInvoice = async (invoiceData: any) => {
    if (editingInvoice) {
      // Update
      const res = await fetch(`/api/invoices/${editingInvoice.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoiceData),
      });
      if (!res.ok) throw new Error('Gagal memperbarui invoice');
      const updated = await res.json();
      setInvoices((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    } else {
      // Create
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoiceData),
      });
      if (!res.ok) throw new Error('Gagal membuat invoice');
      const created = await res.json();
      setInvoices((prev) => [created, ...prev]);
      // Open detail modal to preview the generated QRIS
      setSelectedInvoiceId(created.id);
    }
    setPreselectedCustomer(null);
    fetchData();
  };

  const handleDeleteInvoice = (id: string) => {
    const inv = invoices.find((i) => i.id === id);
    setConfirmDialog({
      isOpen: true,
      title: 'Hapus Invoice',
      message: `Apakah Anda yakin ingin menghapus invoice #${inv?.invoiceNumber || id}? Data transaksi terkait juga akan dihapus dan tindakan ini tidak dapat dibatalkan.`,
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      isDestructive: true,
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        try {
          const res = await fetch(`/api/invoices/${id}`, { method: 'DELETE' });
          if (res.ok) {
            setInvoices((prev) => prev.filter((i) => i.id !== id));
            if (selectedInvoiceId === id) setSelectedInvoiceId(null);
            fetchData();
          }
        } catch (e) {
          console.error(e);
        }
      },
    });
  };

  // Payment Settlement Handler
  const handlePaymentSuccess = async (updatedInvoice: Invoice) => {
    setInvoices((prev) => prev.map((inv) => (inv.id === updatedInvoice.id ? updatedInvoice : inv)));
    setSelectedInvoiceId(updatedInvoice.id);
    setPaymentInvoice(null);
    fetchData();
  };

  // WhatsApp Notification Helper
  const handleSendWhatsApp = (invoice: Invoice) => {
    const phone = invoice.customer.phone.replace(/[^0-9]/g, '');
    const cleanPhone = phone.startsWith('0') ? '62' + phone.substring(1) : phone;
    const isPaid = invoice.status === 'paid';

    let text = '';
    if (isPaid) {
      const verifiedDate = invoice.transactions?.[0]?.verifiedAt || new Date().toISOString();
      text = `*BUKTI PEMBAYARAN LUNAS*\n\nHalo Bapak/Ibu *${invoice.customer.name}*,\n\nTerima kasih atas pembayaran Anda untuk:\nInvoice: *${invoice.invoiceNumber}*\nTotal: *${formatRupiah(invoice.totalAmount)}*\nStatus: *LUNAS (TERVERIFIKASI)* ✅\nTanggal Bayar: *${formatDateIndo(verifiedDate)}*\n\nTransaksi Anda telah terverifikasi secara real-time pada sistem kami.`;
    } else {
      text = `*FAKTUR PENAGIHAN PEMBAYARAN*\n\nHalo Bapak/Ibu *${invoice.customer.name}*,\n\nBerikut rincian tagihan Anda:\nNo. Invoice: *${invoice.invoiceNumber}*\nTotal Tagihan: *${formatRupiah(invoice.totalAmount)}*\nJatuh Tempo: *${formatDateIndo(invoice.dueDate)}*\n\nSilakan scan kode QRIS Dinamis pada faktur yang telah kami kirimkan (nominal sudah otomatis terisi dan terkunci).\n\nTerima kasih,\n*${settings?.businessName || 'InvoiceKilat'}*`;
    }

    const encoded = encodeURIComponent(text);
    const url = `https://wa.me/${cleanPhone}?text=${encoded}`;
    
    // Safely trigger external navigation in next event loop tick to prevent cross-origin iframe security errors
    setTimeout(() => {
      try {
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch {
        window.location.href = url;
      }
    }, 0);
  };

  // Email Notification Helper
  const handleSendEmailReminder = async (invoice: Invoice) => {
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.success) {
        setAppAlert({
          isOpen: true,
          title: 'Email Terkirim',
          message: data.message || 'Email tagihan / pengingat berhasil dikirim!',
          type: 'success',
        });
        fetchData();
      } else {
        setAppAlert({
          isOpen: true,
          title: 'Gagal Mengirim Email',
          message: data.error || 'Terjadi kendala saat mengirim email.',
          type: 'error',
        });
      }
    } catch (e: any) {
      setAppAlert({
        isOpen: true,
        title: 'Error Pengiriman',
        message: 'Terjadi kesalahan saat mengirim email: ' + (e?.message || 'Koneksi terputus'),
        type: 'error',
      });
    }
  };

  // Automation Run Handler
  const handleRunAutomation = async () => {
    setIsRunningAutomation(true);
    try {
      const res = await fetch('/api/automation/run', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setAppAlert({
          isOpen: true,
          title: 'Otomasi Penagihan Selesai',
          message: `Dipindai: ${data.scannedCount} invoice | Notifikasi dieksekusi: ${data.triggeredCount}`,
          type: 'success',
        });
        fetchData();
      } else {
        setAppAlert({
          isOpen: true,
          title: 'Gagal Menjalankan Otomasi',
          message: data.error || 'Terjadi kesalahan saat memproses otomasi penagihan.',
          type: 'error',
        });
      }
    } catch (err: any) {
      setAppAlert({
        isOpen: true,
        title: 'Error Eksekusi Otomasi',
        message: 'Error saat mengeksekusi otomasi: ' + (err?.message || 'Koneksi error'),
        type: 'error',
      });
    } finally {
      setIsRunningAutomation(false);
    }
  };

  // Toggle Rule Status
  const handleToggleAutomationRule = async (ruleId: string, isActive: boolean) => {
    try {
      const res = await fetch(`/api/automation/rules/${ruleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });
      if (res.ok) {
        setAutomationRules((prev) =>
          prev.map((r) => (r.id === ruleId ? { ...r, isActive } : r))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Generate Monthly Recurring Invoices
  const handleGenerateMonthlyInvoices = async (params: {
    monthStr?: string;
    customDate?: string;
    customDueDate?: string;
    targetCustomerIds?: string[];
    globalIncludeVpn?: boolean;
    globalIncludeMonitoring?: boolean;
    selectedAddonIds?: string[];
    globalAddonIds?: string[];
    pppoeBillingMethod?: 'monthly_average' | 'realtime';
    perCustomerAddons?: Record<string, string[]>;
    addonCustomerTargets?: Record<string, string[]>;
  }) => {
    const res = await fetch('/api/invoices/generate-monthly', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || 'Gagal membuat tagihan bulanan');
    }
    await fetchData();
    return data;
  };

  // Customer Management Handlers
  const handleSaveCustomer = async (customerData: Partial<CustomerRecord>) => {
    if (customerData.id) {
      // Edit
      const res = await fetch(`/api/customers/${customerData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gagal memperbarui data pelanggan');
      if (data.customer) {
        setCustomers((prev) =>
          prev.map((c) => (c.id === data.customer.id ? { ...c, ...data.customer } : c))
        );
      }
    } else {
      // Create
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gagal menambahkan pelanggan');
      if (data.customer) {
        setCustomers((prev) => [data.customer, ...prev]);
      }
    }
    await fetchData();
  };

  const handleDeleteCustomer = async (id: string) => {
    try {
      const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Gagal menghapus pelanggan');
      }
      setCustomers((prev) => prev.filter((c) => c.id !== id));
      await fetchData();
    } catch (err: any) {
      console.error('Delete customer error:', err);
      throw err;
    }
  };

  const handleCreateInvoiceForCustomer = (cust: CustomerRecord) => {
    setPreselectedCustomer(cust);
    setEditingInvoice(null);
    setIsCreateModalOpen(true);
  };

  // Service Catalog Handlers
  const handleSaveService = async (serviceData: Partial<ServiceItem>) => {
    if (serviceData.id) {
      const res = await fetch(`/api/services/${serviceData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(serviceData),
      });
      if (!res.ok) throw new Error('Gagal memperbarui layanan jasa');
    } else {
      const res = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(serviceData),
      });
      if (!res.ok) throw new Error('Gagal menambahkan layanan jasa');
    }
    fetchData();
  };

  const handleDeleteService = (id: string) => {
    const srv = services.find((s) => s.id === id);
    setConfirmDialog({
      isOpen: true,
      title: 'Hapus Item Jasa',
      message: `Apakah Anda yakin ingin menghapus "${srv?.name || 'layanan'}" dari katalog jasa? Tindakan ini tidak dapat dibatalkan.`,
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      isDestructive: true,
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        try {
          const res = await fetch(`/api/services/${id}`, { method: 'DELETE' });
          if (res.ok) {
            setServices((prev) => prev.filter((s) => s.id !== id));
          }
        } catch (err) {
          console.error(err);
        }
      },
    });
  };

  // Recurring Addon Handlers
  const handleSaveRecurringAddon = async (addonData: Partial<RecurringAddonService>) => {
    if (addonData.id) {
      const res = await fetch(`/api/recurring-addons/${addonData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addonData),
      });
      if (!res.ok) throw new Error('Gagal memperbarui layanan recurring');
    } else {
      const res = await fetch('/api/recurring-addons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addonData),
      });
      if (!res.ok) throw new Error('Gagal menambahkan layanan recurring');
    }
    fetchData();
  };

  const handleDeleteRecurringAddon = async (id: string) => {
    const addon = recurringAddons.find((a) => a.id === id);
    setConfirmDialog({
      isOpen: true,
      title: 'Hapus Layanan Recurring',
      message: `Apakah Anda yakin ingin menghapus layanan recurring "${addon?.name || 'layanan'}"?`,
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      isDestructive: true,
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        try {
          const res = await fetch(`/api/recurring-addons/${id}`, { method: 'DELETE' });
          if (res.ok) {
            setRecurringAddons((prev) => prev.filter((a) => a.id !== id));
          }
        } catch (err) {
          console.error(err);
        }
      },
    });
  };

  // Check and dispatch overdue reminders
  const handleTriggerCheckReminders = async () => {
    setIsCheckingReminders(true);
    try {
      const res = await fetch('/api/invoices/check-reminders', { method: 'POST' });
      const data = await res.json();
      setAppAlert({
        isOpen: true,
        title: 'Pemeriksaan Jatuh Tempo Selesai',
        message: data.message || 'Semua invoice telah diperiksa untuk jatuh tempo.',
        type: 'success',
      });
      fetchData();
    } catch (e: any) {
      setAppAlert({
        isOpen: true,
        title: 'Gagal Memeriksa Jatuh Tempo',
        message: 'Error saat mengecek jatuh tempo: ' + (e?.message || 'Koneksi error'),
        type: 'error',
      });
    } finally {
      setIsCheckingReminders(false);
    }
  };

  // Spreadsheet Sync
  const handleTriggerSpreadsheetSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/spreadsheet/sync', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setAppAlert({
          isOpen: true,
          title: 'Sinkronisasi Spreadsheet Berhasil',
          message: `Sinkronisasi Google Spreadsheet berhasil! ${data.syncedCount} baris invoice diperbarui secara realtime.`,
          type: 'success',
        });
        fetchData();
      } else {
        setAppAlert({
          isOpen: true,
          title: 'Sinkronisasi Gagal',
          message: data.error || 'Periksa konfigurasi sheet ID pada menu Pengaturan.',
          type: 'error',
        });
      }
    } catch (e: any) {
      setAppAlert({
        isOpen: true,
        title: 'Error Sinkronisasi',
        message: 'Gagal menghubungi server spreadsheet: ' + (e?.message || 'Koneksi error'),
        type: 'error',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Save Settings
  const handleSaveSettings = async (updatedSettings: Partial<BusinessSettings>) => {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedSettings),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Gagal memperbarui pengaturan');
    }
    const data = await res.json();
    const newSettings = data?.settings || data;
    setSettings(newSettings);
    return newSettings;
  };

  // Reset Settings to Factory Defaults
  const handleResetSettings = async () => {
    const res = await fetch('/api/settings/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Gagal mereset pengaturan ke default');
    }
    const data = await res.json();
    const newSettings = data?.settings || data;
    setSettings(newSettings);
    return newSettings;
  };

  // Switch portals and update URL hash cleanly
  const handleSwitchToCustomerPortal = (query = '', invNumber = '') => {
    setActivePortal('customer');
    setCurrentTab('portal');
    if (query) setPortalSearchQuery(query);
    if (invNumber) setPortalInvoiceNumber(invNumber);
    const hashParams = new URLSearchParams();
    if (query) hashParams.set('q', query);
    if (invNumber) hashParams.set('inv', invNumber);
    const hashStr = hashParams.toString();
    window.location.hash = hashStr ? `/portal?${hashStr}` : '/portal';
  };

  const handleSwitchToAdminPortal = (tab: AppNavTab = 'dashboard') => {
    setActivePortal('admin');
    setCurrentTab(tab);
    window.location.hash = '/admin';
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-100/70 text-slate-800 antialiased font-sans flex flex-col">
        {/* Offline Alert */}
        <OfflineIndicator />

      {/* Real-time Notification Toast (Active only in Admin Portal) */}
      {activePortal === 'admin' && (
        <NotificationToast
          event={activeToast}
          onClose={handleCloseToast}
          onSelectInvoice={(id) => setSelectedInvoiceId(id)}
        />
      )}

      {/* Dynamic Portal Header: Admin Navbar or Customer Portal Navbar */}
      {activePortal === 'admin' ? (
        adminUser ? (
          <Navbar
            settings={settings}
            currentTab={currentTab}
            onSelectTab={(tab) => {
              if (tab === 'qris') {
                setIsQrisModalOpen(true);
              } else if (tab === 'portal') {
                handleSwitchToCustomerPortal();
              } else if (tab === 'spreadsheet') {
                handleOpenSettings('backup');
              } else {
                setCurrentTab(tab);
              }
            }}
            onOpenCreateInvoice={() => {
              setPreselectedCustomer(null);
              setEditingInvoice(null);
              setIsCreateModalOpen(true);
            }}
            onOpenSettings={handleOpenSettings}
            isConnected={isConnected}
            notifications={notifications}
            unreadCount={unreadCount}
            onClearUnread={clearUnread}
            onSelectInvoice={(id) => setSelectedInvoiceId(id)}
            onTriggerSync={handleTriggerSpreadsheetSync}
            isSyncing={isSyncing}
            adminUser={adminUser}
            onLogout={handleAdminLogout}
            onOpenGallery={() => setIsGalleryModalOpen(true)}
          />
        ) : (
          <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-3 sm:px-6 lg:px-8">
              <div className="flex items-center gap-3">
                {settings?.appLogoUrl ? (
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-slate-200 overflow-hidden shadow-xs p-1">
                    <img src={settings.appLogoUrl} alt={settings?.appName || 'Logo'} className="max-h-full max-w-full object-contain" />
                  </div>
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-sky-500 text-white shadow-md shadow-blue-500/20">
                    <FileText className="h-5 w-5" />
                  </div>
                )}
                <div>
                  <h1 className="text-base font-black tracking-tight text-slate-900 leading-tight">
                    {settings?.appName || settings?.businessName || 'InvoiceKilat'}
                  </h1>
                  <p className="text-[11px] font-bold text-blue-600 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Portal Pengelola & Keuangan</span>
                  </p>
                </div>
              </div>

              <button
                id="header-goto-customer-portal-btn"
                onClick={() => handleSwitchToCustomerPortal()}
                className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/90 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition shadow-2xs"
                title="Buka Portal Mandiri Pelanggan"
              >
                <Globe className="h-3.5 w-3.5 text-emerald-600" />
                <span>Portal Pelanggan</span>
              </button>
            </div>
          </header>
        )
      ) : (
        <CustomerPortalNavbar
          settings={settings}
          businessName={settings?.appName || settings?.businessName || 'InvoiceKilat'}
          onSwitchToAdmin={() => handleSwitchToAdminPortal('invoices')}
        />
      )}

      {/* Main Container */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-3 sm:px-6 lg:px-8 py-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-3 text-slate-500">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-semibold">Memuat sistem InvoiceKilat & sinkronisasi data...</p>
          </div>
        ) : activePortal === 'customer' ? (
          /* ================= PORTAL MANDIRI PELANGGAN (KLIEN/PUBLIK) ================= */
          <CustomerPortal
            settings={settings}
            initialSearchQuery={portalSearchQuery}
            initialInvoiceNumber={portalInvoiceNumber}
            onBackToAdmin={() => handleSwitchToAdminPortal('invoices')}
            onSelectInvoiceForPrint={(inv) => setPrintInvoice(inv)}
            isStandalone={true}
          />
        ) : !adminUser ? (
          /* ================= LOGIN ADMIN JIKA BELUM TERAUTENTIKASI ================= */
          <AdminLogin
            onLoginSuccess={handleAdminLoginSuccess}
            onGoToCustomerPortal={() => handleSwitchToCustomerPortal()}
            businessName={settings?.appName || settings?.businessName || 'InvoiceKilat'}
          />
        ) : (
          /* ================= PORTAL PENGELOLA / ADMIN USAHA ================= */
          <>
            {/* 1. Dashboard View */}
            {currentTab === 'dashboard' && (
              <AnalyticsDashboard
                analytics={analytics}
                invoices={invoices}
                customers={customers}
                onSelectInvoice={(id) => setSelectedInvoiceId(id)}
                onOpenCreateInvoice={() => {
                  setPreselectedCustomer(null);
                  setEditingInvoice(null);
                  setIsCreateModalOpen(true);
                }}
                onTriggerCheckReminders={handleTriggerCheckReminders}
                isCheckingReminders={isCheckingReminders}
              />
            )}

            {/* 2. Invoices List View */}
            {currentTab === 'invoices' && (
              <InvoiceList
                invoices={invoices}
                onSelectInvoice={(id) => setSelectedInvoiceId(id)}
                onOpenCreateInvoice={() => {
                  setPreselectedCustomer(null);
                  setEditingInvoice(null);
                  setIsCreateModalOpen(true);
                }}
                onOpenGenerateMonthly={() => setCurrentTab('automation')}
                onOpenPaymentModal={(inv) => setPaymentInvoice(inv)}
                onOpenEditInvoice={(inv) => {
                  setEditingInvoice(inv);
                  setIsCreateModalOpen(true);
                }}
                onDeleteInvoice={handleDeleteInvoice}
                onPrintInvoice={(inv) => setPrintInvoice(inv)}
                onSendWhatsApp={handleSendWhatsApp}
                onSendEmailReminder={handleSendEmailReminder}
                onOpenPortal={(inv) => {
                  handleSwitchToCustomerPortal(inv.invoiceNumber, inv.invoiceNumber);
                }}
              />
            )}

            {/* 3. Customer Directory View */}
            {currentTab === 'customers' && (
              <CustomerDirectory
                customers={customers}
                invoices={invoices}
                recurringAddons={recurringAddons}
                onSaveCustomer={handleSaveCustomer}
                onUpdateCustomer={(id, data) => handleSaveCustomer({ ...data, id })}
                onAddCustomer={(data) => handleSaveCustomer(data)}
                onDeleteCustomer={handleDeleteCustomer}
                onCreateInvoiceForCustomer={handleCreateInvoiceForCustomer}
                onOpenPortalForCustomer={(query) => {
                  handleSwitchToCustomerPortal(query);
                }}
              />
            )}

            {/* 3.5. Router Fleet & Analytics View */}
            {currentTab === 'routers' && (
              <RouterFleetManagement
                customers={customers}
                onUpdateCustomer={async (id, data) => {
                  try {
                    await handleSaveCustomer({ ...data, id });
                    return true;
                  } catch {
                    return false;
                  }
                }}
                onCreateInvoiceForCustomer={handleCreateInvoiceForCustomer}
                onNavigateToCustomer={(cust) => {
                  setCurrentTab('customers');
                }}
                onRefreshAllData={fetchData}
              />
            )}

            {/* 4. Service Catalog View */}
            {currentTab === 'services' && (
              <ServiceCatalog
                services={services}
                recurringAddons={recurringAddons}
                onSaveService={handleSaveService}
                onDeleteService={handleDeleteService}
                onSaveRecurringAddon={handleSaveRecurringAddon}
                onDeleteRecurringAddon={handleDeleteRecurringAddon}
              />
            )}

            {/* 5. Billing Automation Center View */}
            {currentTab === 'automation' && (
              <BillingAutomationCenter
                rules={automationRules}
                logs={automationLogs}
                customers={customers}
                recurringAddons={recurringAddons}
                settings={settings}
                onUpdateRules={async (updatedRules) => {
                  try {
                    const res = await fetch('/api/automation/rules', {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ rules: updatedRules }),
                    });
                    if (res.ok) {
                      setAutomationRules(updatedRules);
                    }
                  } catch (e) {
                    console.error('Failed saving rules:', e);
                  }
                }}
                onToggleRule={handleToggleAutomationRule}
                onRunAutomation={handleRunAutomation}
                onGenerateMonthlyInvoices={handleGenerateMonthlyInvoices}
                onRefreshData={fetchData}
                onNavigateToInvoice={(invId) => {
                  setSelectedInvoiceId(invId);
                }}
                isRunning={isRunningAutomation}
              />
            )}

            {/* 6. Spreadsheet Sync View */}
            {currentTab === 'spreadsheet' && (
              <SpreadsheetSyncView
                invoices={invoices}
                settings={settings}
                onTriggerSync={handleTriggerSpreadsheetSync}
                isSyncing={isSyncing}
                onSelectInvoice={(id) => setSelectedInvoiceId(id)}
                onOpenSettings={() => handleOpenSettings('backup')}
              />
            )}
          </>
        )}
      </main>

      {/* Global In-App Footer Watermark Banner */}
      <AppWatermark settings={settings} mode="banner" />

      {/* Modals */}
      {/* 1. Invoice Detail & QRIS View */}
      <InvoiceDetailModal
        invoice={selectedInvoice}
        settings={settings}
        onInvoiceUpdated={(updatedInv) => {
          setInvoices((prev) => prev.map((inv) => (inv.id === updatedInv.id ? updatedInv : inv)));
        }}
        onClose={() => setSelectedInvoiceId(null)}
        onOpenPaymentModal={(inv) => setPaymentInvoice(inv)}
        onPrintInvoice={(inv) => setPrintInvoice(inv)}
        onSendWhatsApp={handleSendWhatsApp}
        onSendEmailReminder={handleSendEmailReminder}
        onOpenPortal={(inv) => {
          setSelectedInvoiceId(null);
          handleSwitchToCustomerPortal(inv.invoiceNumber, inv.invoiceNumber);
        }}
      />

      {/* 2. Create / Edit Invoice */}
      <InvoiceFormModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingInvoice(null);
          setPreselectedCustomer(null);
        }}
        onSave={handleSaveInvoice}
        editInvoice={editingInvoice}
        defaultStaticQris={settings?.defaultStaticQris}
        customers={customers}
        services={services}
        preselectedCustomer={preselectedCustomer}
      />

      {/* 3. Record Payment */}
      <PaymentModal
        invoice={paymentInvoice}
        onClose={() => setPaymentInvoice(null)}
        onPaymentSuccess={handlePaymentSuccess}
      />

      {/* 4. Standalone QRIS Generator Playground */}
      <QRISGeneratorModal
        isOpen={isQrisModalOpen}
        onClose={() => setIsQrisModalOpen(false)}
        defaultStaticQris={settings?.defaultStaticQris || ''}
        settings={settings}
      />

      {/* 5. Printable / PDF Invoice */}
      <PrintableInvoice
        invoice={printInvoice}
        settings={settings}
        onClose={() => setPrintInvoice(null)}
      />

      {/* 6. Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onSave={handleSaveSettings}
        onReset={handleResetSettings}
        initialTab={settingsInitialTab}
        invoices={invoices}
        onTriggerSync={handleTriggerSpreadsheetSync}
        isSyncing={isSyncing}
      />

      {/* 6b. Feature Screenshots Gallery Modal */}
      <FeatureGalleryModal
        isOpen={isGalleryModalOpen}
        onClose={() => setIsGalleryModalOpen(false)}
      />

      {/* 7. In-App Confirmation Modal (Cross-origin & Iframe Safe) */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                  confirmDialog.isDestructive
                    ? 'bg-rose-50 text-rose-600'
                    : 'bg-blue-50 text-blue-600'
                }`}
              >
                {confirmDialog.isDestructive ? (
                  <Trash2 className="w-5 h-5" />
                ) : (
                  <AlertCircle className="w-5 h-5" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-slate-900 mb-1">
                  {confirmDialog.title}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {confirmDialog.message}
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                {confirmDialog.cancelText || 'Batal'}
              </button>
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition active:scale-95 ${
                  confirmDialog.isDestructive
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {confirmDialog.confirmText || 'Konfirmasi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. In-App Notification / Alert Modal */}
      {appAlert.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                  appAlert.type === 'success'
                    ? 'bg-emerald-50 text-emerald-600'
                    : appAlert.type === 'error'
                    ? 'bg-rose-50 text-rose-600'
                    : 'bg-blue-50 text-blue-600'
                }`}
              >
                {appAlert.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : appAlert.type === 'error' ? (
                  <AlertCircle className="w-5 h-5" />
                ) : (
                  <AlertCircle className="w-5 h-5" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-slate-900 mb-1">
                  {appAlert.title}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                  {appAlert.message}
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setAppAlert((prev) => ({ ...prev, isOpen: false }))}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 shadow-xs transition active:scale-95"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating watermark removed as requested by user */}
      </div>
    </ErrorBoundary>
  );
}
