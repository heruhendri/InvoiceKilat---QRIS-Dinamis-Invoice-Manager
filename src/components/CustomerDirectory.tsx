import React, { useState } from 'react';
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
  ArrowRight
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

  // Mikrotik test probe state inside modal
  const [isTestingMikrotik, setIsTestingMikrotik] = useState(false);
  const [mikrotikTestResult, setMikrotikTestResult] = useState<any>(null);
  const [mikrotikTestError, setMikrotikTestError] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCustomer(null);
    setFormError('');
    setMikrotikTestResult(null);
    setMikrotikTestError('');
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
    setMikrotikTestResult(null);
    setMikrotikTestError('');
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
    
    if (c.mikrotik) {
      setRouterName(c.mikrotik.routerName || '');
      setMikrotikHost(c.mikrotik.host || '');
      setMikrotikPort(c.mikrotik.port || 8728);
      setMikrotikUser(c.mikrotik.username || 'admin');
      setMikrotikPass(c.mikrotik.password || '');
      setMikrotikRate(c.mikrotik.ratePerUser || 5000);
      setIsolirProfile(c.mikrotik.isolirProfileName || 'isolir');
      setMikrotikTestResult(c.mikrotik);
    } else {
      setRouterName('');
      setMikrotikHost('');
      setMikrotikPort(8728);
      setMikrotikUser('admin');
      setMikrotikPass('');
      setMikrotikRate(5000);
      setIsolirProfile('isolir');
      setMikrotikTestResult(null);
    }

    setMikrotikTestError('');
    setFormError('');
    setIsModalOpen(true);
  };

  // Test Mikrotik connection in real-time
  const handleTestMikrotik = async () => {
    if (!mikrotikHost.trim()) {
      setMikrotikTestError('IP Host / Domain Mikrotik wajib diisi untuk melakukan pengujian');
      return;
    }

    setIsTestingMikrotik(true);
    setMikrotikTestError('');
    setMikrotikTestResult(null);

    try {
      const res = await fetch('/api/mikrotik/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          routerName: routerName.trim() || 'Mikrotik-Core',
          host: mikrotikHost.trim(),
          port: Number(mikrotikPort) || 8728,
          username: mikrotikUser.trim() || 'admin',
          password: mikrotikPass,
          ratePerUser: Number(mikrotikRate) || 5000,
          isolirProfileName: isolirProfile.trim() || 'isolir',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Gagal menguji koneksi Mikrotik');
      }

      setMikrotikTestResult(data.data);
    } catch (err: any) {
      setMikrotikTestError(err.message || 'Gagal menghubungi server router');
    } finally {
      setIsTestingMikrotik(false);
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

    if (customerMode === 'noc' && !mikrotikHost.trim()) {
      setFormError('Untuk Mode NOC, Host / IP Address Mikrotik wajib diisi');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      const mikrotikPayload: MikrotikConfig | undefined = customerMode === 'noc' ? {
        routerName: routerName.trim() || 'Mikrotik-Core',
        host: mikrotikHost.trim(),
        port: Number(mikrotikPort) || 8728,
        username: mikrotikUser.trim() || 'admin',
        password: mikrotikPass,
        ratePerUser: Number(mikrotikRate) >= 500 ? Number(mikrotikRate) : 5000,
        isolirProfileName: isolirProfile.trim() || 'isolir',
        ...(mikrotikTestResult || {}),
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

                        {mk?.activeUsersList && mk.activeUsersList.length > 0 && (
                          <button
                            onClick={() => {
                              setPppoeModalCustomer(cust);
                              setPppoeSearchQuery('');
                              setPppoeFilterType('all');
                            }}
                            className="px-2 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/40 text-cyan-200 text-[10px] font-bold border border-indigo-400/30 transition"
                          >
                            Detail PPPoE
                          </button>
                        )}
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
      {pppoeModalCustomer && pppoeModalCustomer.mikrotik?.activeUsersList && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 my-auto max-h-[85vh] flex flex-col">
            <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-sm">
                  <Cpu className="w-5 h-5 text-cyan-200" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    Daftar User PPPoE Aktif: {pppoeModalCustomer.mikrotik.routerName}
                  </h3>
                  <p className="text-xs text-cyan-200 font-mono">
                    Host: {pppoeModalCustomer.mikrotik.host} • Pelanggan: {pppoeModalCustomer.name}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setPppoeModalCustomer(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter and metrics inside modal */}
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

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                Dideteksi otomatis dari RouterOS API Mikrotik
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

                  <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="font-bold text-slate-700 block mb-1">
                          Nama Router / Identitas <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={routerName}
                          onChange={(e) => setRouterName(e.target.value)}
                          placeholder="e.g. CCR1009-Core-MitraNet"
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500 font-bold"
                          required={customerMode === 'noc'}
                        />
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 block mb-1">
                          Port API (RouterOS)
                        </label>
                        <input
                          type="number"
                          value={mikrotikPort}
                          onChange={(e) => setMikrotikPort(Number(e.target.value))}
                          placeholder="8728"
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500 font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">
                        IP Host / Domain DDNS Mikrotik <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={mikrotikHost}
                        onChange={(e) => setMikrotikHost(e.target.value)}
                        placeholder="e.g. 103.145.22.10 atau vpn.ispmitra.id"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500 font-mono"
                        required={customerMode === 'noc'}
                      />
                      <p className="text-[10px] text-slate-500 mt-1">
                        Gunakan IP Publik statis, DDNS Mikrotik Cloud, atau IP VPN monitoring
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">
                          Username API Mikrotik
                        </label>
                        <input
                          type="text"
                          value={mikrotikUser}
                          onChange={(e) => setMikrotikUser(e.target.value)}
                          placeholder="api-billing"
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500 font-mono"
                        />
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 block mb-1">
                          Password API Mikrotik
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
                          Semua user PPPoE dengan profile ini (atau comment isolir) tidak akan dihitung dalam total tagihan.
                        </p>
                      </div>
                    </div>

                    {/* Test Mikrotik Button */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleTestMikrotik}
                        disabled={isTestingMikrotik || !mikrotikHost.trim()}
                        className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-300 font-extrabold text-xs shadow-sm transition active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isTestingMikrotik ? 'animate-spin' : ''}`} />
                        <span>{isTestingMikrotik ? 'Menguji & Memindai Sesi PPPoE...' : 'Uji Koneksi & Deteksi PPPoE Sekarang'}</span>
                      </button>
                    </div>

                    {/* Test Error */}
                    {mikrotikTestError && (
                      <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{mikrotikTestError}</span>
                      </div>
                    )}

                    {/* Test Success Live Telemetry Card */}
                    {mikrotikTestResult && (
                      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 border border-emerald-200 text-slate-800 space-y-2 text-xs animate-in fade-in">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-emerald-800 font-extrabold">
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                            <span>Koneksi Berhasil • {mikrotikTestResult.boardName || 'RouterBOARD'}</span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-500">
                            {mikrotikTestResult.rosVersion || 'v7.x'}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 pt-1">
                          <div className="bg-white/80 p-2 rounded-xl text-center">
                            <span className="text-[10px] text-slate-500 block uppercase">Total PPPoE</span>
                            <span className="text-sm font-black text-slate-900 font-mono">
                              {mikrotikTestResult.activePppoeCount ?? 0}
                            </span>
                          </div>

                          <div className="bg-emerald-100/70 p-2 rounded-xl text-center border border-emerald-300">
                            <span className="text-[10px] text-emerald-800 font-bold block uppercase">Non-Isolir</span>
                            <span className="text-sm font-black text-emerald-900 font-mono">
                              {mikrotikTestResult.nonIsolirCount ?? 0}
                            </span>
                          </div>

                          <div className="bg-white/80 p-2 rounded-xl text-center">
                            <span className="text-[10px] text-slate-500 block uppercase">Isolir</span>
                            <span className="text-sm font-black text-slate-700 font-mono">
                              {mikrotikTestResult.isolirCount ?? 0}
                            </span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between">
                          <span className="text-[11px] text-slate-600">
                            Estimasi Tagihan ({mikrotikTestResult.nonIsolirCount ?? 0} × {formatRupiah(mikrotikRate)}):
                          </span>
                          <span className="text-sm font-black text-emerald-800 font-mono">
                            {formatRupiah((mikrotikTestResult.nonIsolirCount ?? 0) * mikrotikRate)}
                          </span>
                        </div>
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
