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
import { CustomerDirectory } from './components/CustomerDirectory';
import { ServiceCatalog } from './components/ServiceCatalog';
import { BillingAutomationCenter } from './components/BillingAutomationCenter';

import { useRealtimeSync } from './hooks/useRealtimeSync';
import { 
  Invoice, 
  AnalyticsSummary, 
  BusinessSettings, 
  RealtimeEvent, 
  CustomerRecord, 
  ServiceItem, 
  BillingAutomationRule, 
  AutomationDispatchLog 
} from './types';
import { formatRupiah, formatDateIndo } from './utils/formatters';

export default function App() {
  // Navigation & View state
  const [currentTab, setCurrentTab] = useState<AppNavTab>('dashboard');

  // Core data states
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
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

  // Interactive operations state
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isCheckingReminders, setIsCheckingReminders] = useState<boolean>(false);
  const [isRunningAutomation, setIsRunningAutomation] = useState<boolean>(false);
  const [activeToast, setActiveToast] = useState<RealtimeEvent | null>(null);

  // Fetch initial application data
  const fetchData = useCallback(async () => {
    try {
      const [
        invData,
        anaData,
        setData,
        custData,
        srvData,
        rulesData,
        logsData
      ] = await Promise.all([
        fetch('/api/invoices').then((r) => r.json()).catch(() => ({ invoices: [] })),
        fetch('/api/analytics').then((r) => r.json()).catch(() => null),
        fetch('/api/settings').then((r) => r.json()).catch(() => null),
        fetch('/api/customers').then((r) => r.json()).catch(() => ({ customers: [] })),
        fetch('/api/services').then((r) => r.json()).catch(() => ({ services: [] })),
        fetch('/api/automation/rules').then((r) => r.json()).catch(() => ({ rules: [] })),
        fetch('/api/automation/logs').then((r) => r.json()).catch(() => ({ logs: [] })),
      ]);

      if (invData?.invoices) setInvoices(invData.invoices);
      if (anaData?.summary) setAnalytics(anaData);
      if (setData?.settings) setSettings(setData.settings);
      if (custData?.customers) setCustomers(custData.customers);
      if (srvData?.services) setServices(srvData.services);
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
  }, [fetchData]);

  // Real-time synchronization hook via SSE
  const handleRealtimeEvent = useCallback((event: RealtimeEvent) => {
    setActiveToast(event);
    // Refresh analytics & invoice data seamlessly
    fetchData();
  }, [fetchData]);

  const { isConnected, notifications, unreadCount, clearUnread } = useRealtimeSync(handleRealtimeEvent);

  // Find currently selected invoice
  const selectedInvoice = selectedInvoiceId 
    ? invoices.find((i) => i.id === selectedInvoiceId) || null 
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

  const handleDeleteInvoice = async (id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus invoice ini?')) return;
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
    window.open(url, '_blank');
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
        alert(data.message || 'Email tagihan / pengingat berhasil dikirim!');
        fetchData();
      } else {
        alert(data.error || 'Gagal mengirim email.');
      }
    } catch (e: any) {
      alert('Terjadi kesalahan saat mengirim email: ' + e.message);
    }
  };

  // Automation Run Handler
  const handleRunAutomation = async () => {
    setIsRunningAutomation(true);
    try {
      const res = await fetch('/api/automation/run', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert(`Otomasi Penagihan Selesai!\nDipindai: ${data.scannedCount} invoice\nNotifikasi dieksekusi: ${data.triggeredCount}`);
        fetchData();
      } else {
        alert('Gagal menjalankan otomasi penagihan.');
      }
    } catch (err: any) {
      alert('Error saat mengeksekusi otomasi: ' + err.message);
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

  // Customer Management Handlers
  const handleSaveCustomer = async (customerData: Partial<CustomerRecord>) => {
    if (customerData.id) {
      // Edit
      const res = await fetch(`/api/customers/${customerData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerData),
      });
      if (!res.ok) throw new Error('Gagal memperbarui data pelanggan');
    } else {
      // Create
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerData),
      });
      if (!res.ok) throw new Error('Gagal menambahkan pelanggan');
    }
    fetchData();
  };

  const handleDeleteCustomer = async (id: string) => {
    if (!window.confirm('Hapus pelanggan ini dari daftar?')) return;
    try {
      const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setCustomers((prev) => prev.filter((c) => c.id !== id));
      }
    } catch (err) {
      console.error(err);
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

  const handleDeleteService = async (id: string) => {
    if (!window.confirm('Hapus item jasa ini dari katalog?')) return;
    try {
      const res = await fetch(`/api/services/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setServices((prev) => prev.filter((s) => s.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Check and dispatch overdue reminders
  const handleTriggerCheckReminders = async () => {
    setIsCheckingReminders(true);
    try {
      const res = await fetch('/api/invoices/check-reminders', { method: 'POST' });
      const data = await res.json();
      alert(`Pemeriksaan Jatuh Tempo Selesai:\n${data.message || 'Semua invoice telah diperiksa.'}`);
      fetchData();
    } catch (e: any) {
      alert('Error saat mengecek jatuh tempo: ' + e.message);
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
        alert(`Sinkronisasi Google Spreadsheet Berhasil!\n${data.syncedCount} baris invoice diperbarui secara realtime.`);
        fetchData();
      } else {
        alert('Sinkronisasi gagal: ' + (data.error || 'Periksa konfigurasi sheet ID.'));
      }
    } catch (e) {
      console.error(e);
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
    if (!res.ok) throw new Error('Gagal memperbarui pengaturan');
    const data = await res.json();
    setSettings(data.settings);
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 antialiased font-sans flex flex-col">
      {/* Offline Alert */}
      <OfflineIndicator />

      {/* Real-time Notification Toast */}
      <NotificationToast
        event={activeToast}
        onClose={() => setActiveToast(null)}
        onSelectInvoice={(id) => setSelectedInvoiceId(id)}
      />

      {/* Navigation Header */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          if (tab === 'qris') {
            setIsQrisModalOpen(true);
          } else {
            setCurrentTab(tab);
          }
        }}
        onOpenCreateInvoice={() => {
          setPreselectedCustomer(null);
          setEditingInvoice(null);
          setIsCreateModalOpen(true);
        }}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        isConnected={isConnected}
        notifications={notifications}
        unreadCount={unreadCount}
        onClearUnread={clearUnread}
        onSelectInvoice={(id) => setSelectedInvoiceId(id)}
        onTriggerSync={handleTriggerSpreadsheetSync}
        isSyncing={isSyncing}
      />

      {/* Main Container */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-3 sm:px-6 lg:px-8 py-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-3 text-slate-500">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-semibold">Memuat sistem InvoiceKilat & sinkronisasi data...</p>
          </div>
        ) : (
          <>
            {/* 1. Dashboard View */}
            {currentTab === 'dashboard' && (
              <AnalyticsDashboard
                analytics={analytics}
                invoices={invoices}
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
                onOpenPaymentModal={(inv) => setPaymentInvoice(inv)}
                onOpenEditInvoice={(inv) => {
                  setEditingInvoice(inv);
                  setIsCreateModalOpen(true);
                }}
                onDeleteInvoice={handleDeleteInvoice}
                onPrintInvoice={(inv) => setPrintInvoice(inv)}
                onSendWhatsApp={handleSendWhatsApp}
                onSendEmailReminder={handleSendEmailReminder}
              />
            )}

            {/* 3. Customer Directory View */}
            {currentTab === 'customers' && (
              <CustomerDirectory
                customers={customers}
                invoices={invoices}
                onSaveCustomer={handleSaveCustomer}
                onDeleteCustomer={handleDeleteCustomer}
                onCreateInvoiceForCustomer={handleCreateInvoiceForCustomer}
              />
            )}

            {/* 4. Service Catalog View */}
            {currentTab === 'services' && (
              <ServiceCatalog
                services={services}
                onSaveService={handleSaveService}
                onDeleteService={handleDeleteService}
              />
            )}

            {/* 5. Billing Automation Center View */}
            {currentTab === 'automation' && (
              <BillingAutomationCenter
                rules={automationRules}
                logs={automationLogs}
                onToggleRule={handleToggleAutomationRule}
                onRunAutomation={handleRunAutomation}
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
              />
            )}
          </>
        )}
      </main>

      {/* Modals */}
      {/* 1. Invoice Detail & QRIS View */}
      <InvoiceDetailModal
        invoice={selectedInvoice}
        onClose={() => setSelectedInvoiceId(null)}
        onOpenPaymentModal={(inv) => setPaymentInvoice(inv)}
        onPrintInvoice={(inv) => setPrintInvoice(inv)}
        onSendWhatsApp={handleSendWhatsApp}
        onSendEmailReminder={handleSendEmailReminder}
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
      />
    </div>
  );
}
