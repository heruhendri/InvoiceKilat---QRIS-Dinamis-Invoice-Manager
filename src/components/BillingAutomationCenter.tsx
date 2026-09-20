import React, { useState } from 'react';
import { 
  Zap, 
  Play, 
  CheckCircle2, 
  Clock, 
  MessageSquare, 
  Mail, 
  AlertTriangle, 
  RotateCw, 
  ExternalLink, 
  Sliders, 
  Check, 
  Send,
  Calendar,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  Package,
  Layers,
  Users,
  Search,
  Filter,
  ArrowRight,
  Radio,
  CheckSquare,
  Square,
  Network,
  Activity,
  Cpu,
  Info,
  X,
  UserCheck,
  Plus,
  Settings2,
  SlidersHorizontal
} from 'lucide-react';
import { 
  BillingAutomationRule, 
  AutomationDispatchLog, 
  CustomerRecord, 
  BusinessSettings, 
  Invoice, 
  RecurringAddonService 
} from '../types';
import { formatRupiah, formatDateIndo } from '../utils/formatters';

interface BillingAutomationCenterProps {
  rules: BillingAutomationRule[];
  logs: AutomationDispatchLog[];
  customers?: CustomerRecord[];
  recurringAddons?: RecurringAddonService[];
  settings?: BusinessSettings | null;
  onUpdateRules?: (rules: BillingAutomationRule[]) => Promise<void>;
  onToggleRule?: (ruleId: string) => void;
  onRunAutomation: () => Promise<{ dispatchedCount: number }>;
  onGenerateMonthlyInvoices?: (params: {
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
  }) => Promise<{
    message: string;
    month: string;
    generatedCount: number;
    skippedCount: number;
    invoices: Invoice[];
  }>;
  onRefreshData?: () => Promise<void>;
  onNavigateToInvoice?: (invoiceId: string) => void;
  isRunning?: boolean;
}

export const BillingAutomationCenter: React.FC<BillingAutomationCenterProps> = ({
  rules,
  logs,
  customers = [],
  recurringAddons = [],
  settings,
  onUpdateRules,
  onRunAutomation,
  onGenerateMonthlyInvoices,
  onRefreshData,
  onNavigateToInvoice,
  isRunning = false,
}) => {
  const [activeTab, setActiveTab] = useState<'monthly' | 'rules' | 'logs'>('monthly');

  // Rules state
  const [localRules, setLocalRules] = useState<BillingAutomationRule[]>(rules);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [runResult, setRunResult] = useState<{ dispatchedCount: number } | null>(null);

  // Recurring Monthly Generator State
  const currentDate = new Date();
  const currentMonthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  
  // Date Mode: 'system' | 'custom'
  const [dateMode, setDateMode] = useState<'system' | 'custom'>('system');
  const [systemPreset, setSystemPreset] = useState<'standard' | 'beginning_month' | 'isp_billing' | 'end_month'>('isp_billing');
  
  // Custom dates
  const defaultIssueDate = `${selectedMonth}-05`;
  const defaultDueDate = `${selectedMonth}-20`;
  const [customDate, setCustomDate] = useState<string>(defaultIssueDate);
  const [customDueDate, setCustomDueDate] = useState<string>(defaultDueDate);

  // Reference list of available recurring addons for labels and base pricing
  const allAvailableAddons: RecurringAddonService[] = [
    {
      id: 'addon-vpn',
      name: 'Layanan VPN Remote Mikrotik Dedicated',
      category: 'Jaringan & VPN',
      price: 50000,
      unit: 'Bulan',
      description: 'Akses remote Winbox & Webfig Mikrotik via port forwarding VPN cloud tunnel 24/7.',
      enabledByDefault: true,
      createdAt: '',
    },
    {
      id: 'addon-mon',
      name: 'Biaya Monitoring Jaringan NOC 24/7',
      category: 'Monitoring & SLA',
      price: 250000,
      unit: 'Bulan',
      description: 'Pengawasan uptime link, ICMP alert, bandwidth peak alert via Telegram & NOC dashboard.',
      enabledByDefault: true,
      createdAt: '',
    },
    ...recurringAddons.filter((a) => a.id !== 'addon-vpn' && a.id !== 'addon-mon'),
  ];

  // Helper: Layanan recurring otomatis diambil dari profil pelanggan yang telah diatur saat penambahan/edit pelanggan baru
  const getCustomerProfileAddonIds = (cust: CustomerRecord): string[] => {
    if (cust.recurringEnabled === false) return [];
    const list: string[] = [];
    if (cust.includeVpn) list.push('addon-vpn');
    if (cust.includeMonitoring) list.push('addon-mon');
    if (Array.isArray(cust.recurringAddonIds)) {
      cust.recurringAddonIds.forEach((id) => {
        if (!list.includes(id)) list.push(id);
      });
    }
    return list;
  };

  // PPPoE Billing Calculation Method: 'monthly_average' | 'realtime'
  const [pppoeBillingMethod, setPppoeBillingMethod] = useState<'monthly_average' | 'realtime'>('monthly_average');

  // Customer selection
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>(
    customers.filter(c => c.recurringEnabled !== false).map(c => c.id)
  );
  const [customerSearch, setCustomerSearch] = useState<string>('');

  // Generation status & result
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generateResult, setGenerateResult] = useState<{
    message: string;
    month: string;
    generatedCount: number;
    skippedCount: number;
    invoices: Invoice[];
  } | null>(null);

  // Helper to apply system date presets
  const handleSelectSystemPreset = (preset: 'standard' | 'beginning_month' | 'isp_billing' | 'end_month') => {
    setSystemPreset(preset);
    setDateMode('system');
    const [y, m] = selectedMonth.split('-');
    const yearNum = Number(y);
    const monthNum = Number(m);

    if (preset === 'standard') {
      const today = new Date().toISOString().split('T')[0];
      const due = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      setCustomDate(today);
      setCustomDueDate(due);
    } else if (preset === 'beginning_month') {
      setCustomDate(`${y}-${m}-01`);
      setCustomDueDate(`${y}-${m}-10`);
    } else if (preset === 'isp_billing') {
      setCustomDate(`${y}-${m}-05`);
      setCustomDueDate(`${y}-${m}-20`);
    } else if (preset === 'end_month') {
      setCustomDate(`${y}-${m}-01`);
      const lastDay = new Date(yearNum, monthNum, 0).getDate();
      setCustomDueDate(`${y}-${m}-${String(lastDay).padStart(2, '0')}`);
    }
  };

  // Sync dates when selected month changes
  const handleMonthChange = (newMonth: string) => {
    setSelectedMonth(newMonth);
    const [y, m] = newMonth.split('-');
    const yearNum = Number(y);
    const monthNum = Number(m);

    if (dateMode === 'system') {
      if (systemPreset === 'isp_billing') {
        setCustomDate(`${y}-${m}-05`);
        setCustomDueDate(`${y}-${m}-20`);
      } else if (systemPreset === 'beginning_month') {
        setCustomDate(`${y}-${m}-01`);
        setCustomDueDate(`${y}-${m}-10`);
      } else if (systemPreset === 'end_month') {
        setCustomDate(`${y}-${m}-01`);
        const lastDay = new Date(yearNum, monthNum, 0).getDate();
        setCustomDueDate(`${y}-${m}-${String(lastDay).padStart(2, '0')}`);
      }
    } else {
      setCustomDate(`${y}-${m}-05`);
      setCustomDueDate(`${y}-${m}-20`);
    }
  };

  // Customer selection toggles
  const handleToggleCustomer = (id: string) => {
    setSelectedCustomerIds(prev => 
      prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
    );
  };

  const handleSelectAllCustomers = () => {
    const activeIds = customers.map(c => c.id);
    if (selectedCustomerIds.length === activeIds.length) {
      setSelectedCustomerIds([]);
    } else {
      setSelectedCustomerIds(activeIds);
    }
  };

  // Trigger monthly invoice generation
  const handleTriggerMonthlyGenerate = async () => {
    if (selectedCustomerIds.length === 0) {
      setGenerateError('Silakan pilih minimal 1 pelanggan untuk digenerate tagihannya.');
      return;
    }

    setIsGenerating(true);
    setGenerateError(null);
    setGenerateResult(null);

    try {
      const payload = {
        monthStr: selectedMonth,
        customDate,
        customDueDate,
        targetCustomerIds: selectedCustomerIds,
        pppoeBillingMethod,
      };

      if (onGenerateMonthlyInvoices) {
        const res = await onGenerateMonthlyInvoices(payload);
        setGenerateResult(res);
      } else {
        // Direct fetch
        const resp = await fetch('/api/invoices/generate-monthly', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await resp.json();
        if (!resp.ok) {
          throw new Error(data.message || data.error || 'Gagal memproses tagihan bulanan');
        }
        setGenerateResult(data);
        if (onRefreshData) await onRefreshData();
      }
    } catch (err: any) {
      console.error('Failed generating monthly invoices:', err);
      setGenerateError(err?.message || 'Terjadi kesalahan saat membuat tagihan bulanan.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Rules handlers
  const toggleRule = (ruleId: string) => {
    setLocalRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, enabled: !r.enabled } : r))
    );
  };

  const updateRuleTemplate = (ruleId: string, template: string) => {
    setLocalRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, messageTemplate: template } : r))
    );
  };

  const updateRuleChannel = (ruleId: string, channel: 'whatsapp' | 'email' | 'both') => {
    setLocalRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, channel } : r))
    );
  };

  const handleSaveRules = async () => {
    if (!onUpdateRules) return;
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await onUpdateRules(localRules);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      console.error('Failed saving rules:', e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTriggerRun = async () => {
    setRunResult(null);
    try {
      const res = await onRunAutomation();
      setRunResult(res);
      setActiveTab('logs');
    } catch (e) {
      console.error('Failed running automation:', e);
    }
  };

  // Filter customers for preview
  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    (c.company || '').toLowerCase().includes(customerSearch.toLowerCase()) ||
    (c.phone || '').includes(customerSearch)
  );

  // Calculate estimated total
  const estimatedTotal = customers
    .filter(c => selectedCustomerIds.includes(c.id))
    .reduce((sum, c) => {
      let base = 0;
      if (c.customerMode === 'noc' && c.mikrotik) {
        const mk = c.mikrotik;
        const custMethod = c.pppoeBillingMethod || mk.preferredBillingMethod || pppoeBillingMethod;
        const avgNonIso = c.monthlyAveragePppoeCount !== undefined 
          ? c.monthlyAveragePppoeCount 
          : (mk.monthlyAverageNonIsolir !== undefined ? mk.monthlyAverageNonIsolir : (Number(mk.nonIsolirCount) || 84));
        const liveNonIso = Number(mk.nonIsolirCount) || 84;
        const billableCount = custMethod === 'monthly_average' ? avgNonIso : liveNonIso;
        const rate = Number(mk.ratePerUser) || 5000;
        base = billableCount * rate;
      } else {
        base = c.customMonthlyAmount || 2500000;
      }

      let addOn = 0;
      const custAddonList = getCustomerProfileAddonIds(c);
      for (const aId of custAddonList) {
        if (aId === 'addon-vpn') addOn += 50000;
        else if (aId === 'addon-mon') addOn += 250000;
        else {
          const matched = allAvailableAddons.find(a => a.id === aId);
          if (matched) addOn += matched.price;
        }
      }

      const subtotal = base + addOn;
      const tax = Math.round(subtotal * 0.11);
      return sum + subtotal + tax;
    }, 0);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/30 text-blue-300 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Sistem Otomasi Tagihan & Recurring Bulanan
            </span>
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight">
            Pusat Otomasi Invoice Bulanan
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Generate invoice otomatis setiap bulan secara massal, sertakan layanan tambahan (VPN & Biaya Monitoring NOC), sesuaikan tanggal terbit & jatuh tempo dengan rekomendasi sistem, serta kirim pengingat otomatis ke WhatsApp.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            id="btn-run-automation"
            onClick={handleTriggerRun}
            disabled={isRunning}
            className="flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/20 transition active:scale-95 disabled:opacity-50"
          >
            {isRunning ? (
              <RotateCw className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4 fill-current" />
            )}
            <span>Jalankan Pengingat WA</span>
          </button>
        </div>
      </div>

      {/* Trigger Notification Result */}
      {runResult && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="text-xs font-bold">
              Otomasi berhasil dijalankan: {runResult.dispatchedCount} pesan tagihan diproses dan disiapkan untuk dikirim.
            </span>
          </div>
          <button
            onClick={() => setRunResult(null)}
            className="text-xs font-bold text-emerald-700 hover:underline"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-2 gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('monthly')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'monthly'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>⚡ Generate Tagihan Bulanan (Recurring)</span>
          </button>

          <button
            onClick={() => setActiveTab('rules')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'rules'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Aturan Pesan ({localRules.filter((r) => r.enabled).length} Aktif)</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'logs'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Riwayat Pengiriman ({logs.length})</span>
          </button>
        </div>

        {activeTab === 'rules' && onUpdateRules && (
          <button
            onClick={handleSaveRules}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs disabled:opacity-50"
          >
            {isSaving ? (
              <RotateCw className="w-3.5 h-3.5 animate-spin" />
            ) : saveSuccess ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            <span>{isSaving ? 'Menyimpan...' : saveSuccess ? 'Tersimpan!' : 'Simpan Aturan'}</span>
          </button>
        )}
      </div>

      {/* Tab 1: Monthly Recurring Generator */}
      {activeTab === 'monthly' && (
        <div className="space-y-6">
          {/* Generation Result Alert */}
          {generateResult && (
            <div className="p-5 rounded-3xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-3 shadow-xs">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-xs">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold">
                      {generateResult.message}
                    </h4>
                    <p className="text-xs text-emerald-800 mt-0.5">
                      Berhasil membuat <strong>{generateResult.generatedCount} invoice baru</strong> untuk periode bulan <strong>{generateResult.month}</strong> ({generateResult.skippedCount} sudah ada sebelumnya dan dilewati secara aman).
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setGenerateResult(null)}
                  className="text-xs font-bold text-emerald-800 hover:text-emerald-950 underline"
                >
                  Tutup
                </button>
              </div>

              {generateResult.invoices && generateResult.invoices.length > 0 && (
                <div className="pt-2 border-t border-emerald-200/60">
                  <span className="text-[11px] font-bold text-emerald-900 block mb-2">
                    Daftar Invoice yang Baru Saja Diterbitkan:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {generateResult.invoices.map((inv) => (
                      <div
                        key={inv.id}
                        onClick={() => onNavigateToInvoice && onNavigateToInvoice(inv.id)}
                        className="p-3 rounded-2xl bg-white border border-emerald-200 hover:border-emerald-400 cursor-pointer transition shadow-2xs flex items-center justify-between"
                      >
                        <div>
                          <span className="font-mono font-bold text-xs text-slate-900 block">
                            {inv.invoiceNumber}
                          </span>
                          <span className="text-[11px] text-slate-500 truncate max-w-[150px] block">
                            {inv.customer.name}
                          </span>
                        </div>
                        <span className="text-xs font-extrabold text-emerald-700 font-mono">
                          {formatRupiah(inv.totalAmount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {generateError && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-between">
              <span>{generateError}</span>
              <button
                onClick={() => setGenerateError(null)}
                className="underline hover:no-underline font-bold"
              >
                Tutup
              </button>
            </div>
          )}

          {/* Configuration Card */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Konfigurasi Periode & Tanggal Tagihan Bulanan
                  </h3>
                  <p className="text-xs text-slate-500">
                    Pilih bulan penagihan, tentukan tanggal terbit & jatuh tempo (sesuai rekomendasi sistem atau custom)
                  </p>
                </div>
              </div>

              {/* Month selector */}
              <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
                <label className="text-xs font-bold text-slate-600 px-2">Bulan Tagihan:</label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => handleMonthChange(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Date Setting Mode: System Recommendation vs Custom Date */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700">Mode Penetapan Tanggal:</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider ${
                    dateMode === 'system'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}>
                    {dateMode === 'system' ? '⚡ Rekomendasi Sistem' : '✏️ Custom Tanggal'}
                  </span>
                </div>

                {/* Switcher */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
                  <button
                    type="button"
                    onClick={() => handleSelectSystemPreset(systemPreset)}
                    className={`px-3 py-1 rounded-lg font-bold transition ${
                      dateMode === 'system'
                        ? 'bg-white text-blue-700 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Rekomendasi Sistem
                  </button>
                  <button
                    type="button"
                    onClick={() => setDateMode('custom')}
                    className={`px-3 py-1 rounded-lg font-bold transition ${
                      dateMode === 'custom'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Custom Tanggal
                  </button>
                </div>
              </div>

              {/* System Presets */}
              {dateMode === 'system' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => handleSelectSystemPreset('isp_billing')}
                    className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between gap-2 ${
                      systemPreset === 'isp_billing'
                        ? 'bg-blue-50/80 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                        : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-blue-900">
                        Billing ISP / PPPoE
                      </span>
                      {systemPreset === 'isp_billing' && (
                        <CheckCircle2 className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Terbit: <strong>Tgl 05</strong> • Tempo: <strong>Tgl 20</strong>
                    </p>
                    <span className="text-[10px] text-blue-600 font-semibold uppercase">
                      Direkomendasikan untuk ISP & Router NOC
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectSystemPreset('beginning_month')}
                    className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between gap-2 ${
                      systemPreset === 'beginning_month'
                        ? 'bg-blue-50/80 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                        : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-blue-900">
                        Awal Bulan
                      </span>
                      {systemPreset === 'beginning_month' && (
                        <CheckCircle2 className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Terbit: <strong>Tgl 01</strong> • Tempo: <strong>Tgl 10</strong>
                    </p>
                    <span className="text-[10px] text-slate-500 uppercase">
                      Standar Perusahaan & Corporate
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectSystemPreset('standard')}
                    className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between gap-2 ${
                      systemPreset === 'standard'
                        ? 'bg-blue-50/80 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                        : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-blue-900">
                        Standar (+7 Hari)
                      </span>
                      {systemPreset === 'standard' && (
                        <CheckCircle2 className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Terbit: <strong>Hari Ini</strong> • Tempo: <strong>+7 Hari</strong>
                    </p>
                    <span className="text-[10px] text-slate-500 uppercase">
                      Fleksibel mingguan
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectSystemPreset('end_month')}
                    className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between gap-2 ${
                      systemPreset === 'end_month'
                        ? 'bg-blue-50/80 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                        : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-blue-900">
                        Akhir Bulan
                      </span>
                      {systemPreset === 'end_month' && (
                        <CheckCircle2 className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Terbit: <strong>Tgl 01</strong> • Tempo: <strong>Akhir Bulan</strong>
                    </p>
                    <span className="text-[10px] text-slate-500 uppercase">
                      Batas akhir kalender
                    </span>
                  </button>
                </div>
              ) : null}

              {/* Date Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center justify-between">
                    <span>Tanggal Terbit Tagihan (Issue Date)</span>
                    {dateMode === 'custom' && (
                      <span className="text-[10px] text-amber-600 font-extrabold">Custom Aktif</span>
                    )}
                  </label>
                  <input
                    type="date"
                    value={customDate}
                    onChange={(e) => {
                      setCustomDate(e.target.value);
                      setDateMode('custom');
                    }}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center justify-between">
                    <span>Tanggal Jatuh Tempo (Due Date)</span>
                    {dateMode === 'custom' && (
                      <span className="text-[10px] text-amber-600 font-extrabold">Custom Aktif</span>
                    )}
                  </label>
                  <input
                    type="date"
                    value={customDueDate}
                    onChange={(e) => {
                      setCustomDueDate(e.target.value);
                      setDateMode('custom');
                    }}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
            </div>

            {/* PPPoE Billing Calculation Method Selection */}
            <div className="p-5 rounded-3xl bg-slate-900 text-white space-y-3.5 shadow-sm border border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-cyan-400" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-cyan-300">
                    Metode Perhitungan Tagihan PPPoE (Pelanggan Mode NOC)
                  </h4>
                </div>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono font-bold self-start sm:self-auto">
                  PPPoE Non-Isolir Billing
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Pilih metode perhitungan tagihan pelanggan PPPoE Mikrotik. Sesuai instruksi, tagihan PPPoE dapat dihitung berdasarkan <strong>rata-rata active non-isolir</strong> dalam bulan tersebut atau saat akan melakukan penagihan:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  onClick={() => setPppoeBillingMethod('monthly_average')}
                  className={`cursor-pointer p-4 rounded-2xl border transition ${
                    pppoeBillingMethod === 'monthly_average'
                      ? 'bg-emerald-950/70 border-emerald-400 ring-2 ring-emerald-400/30'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                      <span className="font-extrabold text-xs text-white">Rata-rata Non-Isolir Bulan Ini</span>
                    </div>
                    {pppoeBillingMethod === 'monthly_average' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  </div>
                  <p className="text-[11px] text-slate-300 mt-2 leading-relaxed">
                    Dihitung dari <strong>rata-rata sampel telemetri user aktif non-isolir</strong> sepanjang bulan/30 hari berjalan. Menghindari distorsi akibat router reboot atau jam sepi.
                  </p>
                  <div className="mt-2.5 pt-2 border-t border-emerald-800/40 flex items-center justify-between text-[10px] text-emerald-300 font-bold">
                    <span>Status: Metode Default Utama</span>
                    <span>Stabil & Fair Billing</span>
                  </div>
                </div>

                <div
                  onClick={() => setPppoeBillingMethod('realtime')}
                  className={`cursor-pointer p-4 rounded-2xl border transition ${
                    pppoeBillingMethod === 'realtime'
                      ? 'bg-cyan-950/70 border-cyan-400 ring-2 ring-cyan-400/30'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
                      <span className="font-extrabold text-xs text-white">Snapshot Real-Time Saat Penagihan</span>
                    </div>
                    {pppoeBillingMethod === 'realtime' && <CheckCircle2 className="w-4 h-4 text-cyan-400" />}
                  </div>
                  <p className="text-[11px] text-slate-300 mt-2 leading-relaxed">
                    Mengambil jumlah user aktif non-isolir <strong>tepat saat tombol buat tagihan ditekan</strong> secara real-time dari router Mikrotik.
                  </p>
                  <div className="mt-2.5 pt-2 border-t border-cyan-800/40 flex items-center justify-between text-[10px] text-cyan-300 font-bold">
                    <span>Status: Live Router State</span>
                    <span>Kondisi Realtime</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Note on Recurring Services */}
            <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-100 flex items-center gap-3">
              <div className="p-2 bg-blue-100 text-blue-700 rounded-xl shrink-0">
                <Package className="w-4 h-4" />
              </div>
              <p className="text-xs text-blue-900 leading-relaxed">
                <span className="font-bold">Layanan Tambahan Recurring:</span> Otomatis di-include ke tagihan sesuai pengaturan pada masing-masing data pelanggan saat penambahan atau pengeditan pelanggan baru.
              </p>
            </div>

            {/* Customers Target & Live Calculation */}
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-700" />
                  <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                    Pilih Pelanggan Target ({selectedCustomerIds.length} dari {customers.length} Dipilih)
                  </h4>
                </div>

                <div className="flex items-center gap-2">
                  {/* Search */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Cari pelanggan..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleSelectAllCustomers}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-700 transition"
                  >
                    {selectedCustomerIds.length === customers.length ? 'Batal Pilih Semua' : 'Pilih Semua'}
                  </button>
                </div>
              </div>

              {/* Customer Selection Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-80 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px] sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={selectedCustomerIds.length === customers.length && customers.length > 0}
                          onChange={handleSelectAllCustomers}
                          className="rounded text-blue-600"
                        />
                      </th>
                      <th className="py-2.5 px-3">Nama Pelanggan & Profil</th>
                      <th className="py-2.5 px-3">Mode & Jasa Pokok</th>
                      <th className="py-2.5 px-3">Layanan Recurring yang Di-Include</th>
                      <th className="py-2.5 px-3 text-right">Estimasi Tagihan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredCustomers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400">
                          Tidak ada pelanggan ditemukan
                        </td>
                      </tr>
                    ) : (
                      filteredCustomers.map((cust) => {
                        const isSelected = selectedCustomerIds.includes(cust.id);
                        
                        let baseAmount = cust.customMonthlyAmount || 2500000;
                        let billablePppoeCount = 0;
                        if (cust.customerMode === 'noc' && cust.mikrotik) {
                          const mk = cust.mikrotik;
                          const custMethod = cust.pppoeBillingMethod || mk.preferredBillingMethod || pppoeBillingMethod;
                          const avgNonIso = cust.monthlyAveragePppoeCount !== undefined 
                            ? cust.monthlyAveragePppoeCount 
                            : (mk.monthlyAverageNonIsolir !== undefined ? mk.monthlyAverageNonIsolir : (Number(mk.nonIsolirCount) || 84));
                          const liveNonIso = Number(mk.nonIsolirCount) || 84;
                          billablePppoeCount = custMethod === 'monthly_average' ? avgNonIso : liveNonIso;
                          const rate = Number(mk.ratePerUser) || 5000;
                          baseAmount = billablePppoeCount * rate;
                        }

                        let addOns = 0;
                        const custAddonIds = getCustomerProfileAddonIds(cust);
                        for (const aId of custAddonIds) {
                          if (aId === 'addon-vpn') addOns += 50000;
                          else if (aId === 'addon-mon') addOns += 250000;
                          else {
                            const matched = allAvailableAddons.find(a => a.id === aId);
                            if (matched) addOns += matched.price;
                          }
                        }

                        const subtotal = baseAmount + addOns;
                        const total = subtotal + Math.round(subtotal * 0.11);

                        return (
                          <tr
                            key={cust.id}
                            onClick={() => handleToggleCustomer(cust.id)}
                            className={`cursor-pointer transition hover:bg-blue-50/40 ${
                              isSelected ? 'bg-blue-50/20' : ''
                            }`}
                          >
                            <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleCustomer(cust.id)}
                                className="rounded text-blue-600 cursor-pointer"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <span className="font-bold text-slate-900 block">{cust.name}</span>
                              <span className="text-[10px] text-slate-500">{cust.company || cust.phone}</span>
                            </td>
                            <td className="py-2 px-3">
                              {cust.customerMode === 'noc' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold">
                                  <Cpu className="w-3 h-3" />
                                  NOC ({billablePppoeCount} User • {cust.pppoeBillingMethod === 'realtime' || pppoeBillingMethod === 'realtime' ? 'Live' : 'Rata²'})
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold">
                                  Layanan Biasa
                                </span>
                              )}
                              <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                                Pokok: {formatRupiah(baseAmount)}
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              <div className="flex flex-wrap items-center gap-1.5">
                                {custAddonIds.length === 0 ? (
                                  <span className="text-slate-400 text-[11px] italic">
                                    {cust.recurringEnabled === false ? 'Non-aktif di profil' : 'Tidak ada (diatur di profil)'}
                                  </span>
                                ) : (
                                  custAddonIds.map((aId) => {
                                    const addonObj = allAvailableAddons.find(a => a.id === aId);
                                    const isVpn = aId === 'addon-vpn';
                                    const isMon = aId === 'addon-mon';
                                    const label = isVpn 
                                      ? 'VPN Remote' 
                                      : isMon 
                                      ? 'Monitoring NOC' 
                                      : (addonObj?.name || aId);
                                    const price = isVpn ? 50000 : isMon ? 250000 : (addonObj?.price || 0);

                                    return (
                                      <span
                                        key={aId}
                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                          isVpn
                                            ? 'bg-indigo-100 text-indigo-800'
                                            : isMon
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : 'bg-blue-100 text-blue-800'
                                        }`}
                                        title={`+${formatRupiah(price)} (dari profil pelanggan)`}
                                      >
                                        <span>{label}</span>
                                        <span className="opacity-75 font-mono">+{formatRupiah(price)}</span>
                                      </span>
                                    );
                                  })
                                )}
                              </div>
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-900">
                              <span className="font-extrabold text-xs block">
                                {formatRupiah(total)}
                              </span>
                              <span className="text-[10px] text-slate-400 block font-normal">
                                Subtotal {formatRupiah(subtotal)}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Action Footer with Live Total */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-100 bg-slate-50/50 p-4 rounded-2xl">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Total Estimasi Tagihan yang Akan Diterbitkan:
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
                    {formatRupiah(estimatedTotal)}
                  </span>
                  <span className="text-xs text-slate-500">
                    ({selectedCustomerIds.length} Faktur Pelanggan • Incl. PPN 11%)
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleTriggerMonthlyGenerate}
                disabled={isGenerating || selectedCustomerIds.length === 0}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white font-extrabold text-xs shadow-lg shadow-blue-500/25 transition active:scale-95 disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    <span>Memproses & Menghasilkan QRIS Dinamis...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Generate {selectedCustomerIds.length} Invoice Bulanan Sekarang</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Rules & Notification Templates */}
      {activeTab === 'rules' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
              Konfigurasi Aturan & Template Pengingat
            </h3>
            <span className="text-xs text-slate-500">
              Variable yang didukung: {'{{customer_name}}'}, {'{{invoice_number}}'}, {'{{amount}}'}, {'{{due_date}}'}, {'{{invoice_url}}'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {localRules.map((rule) => (
              <div
                key={rule.id}
                className={`rounded-3xl border p-5 transition flex flex-col justify-between ${
                  rule.enabled
                    ? 'bg-white border-blue-200 shadow-xs'
                    : 'bg-slate-50 border-slate-200 opacity-75'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            rule.enabled ? 'bg-blue-600 animate-pulse' : 'bg-slate-300'
                          }`}
                        />
                        <h3 className="text-sm font-extrabold text-slate-900">
                          {rule.name}
                        </h3>
                      </div>
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        Pemicu: {rule.trigger === 'on_create' && 'Saat invoice baru diterbitkan'}
                        {rule.trigger === 'pre_due' && 'H-3 Sebelum Jatuh Tempo'}
                        {rule.trigger === 'on_due_date' && 'Hari-H Jatuh Tempo'}
                        {rule.trigger === 'overdue' && 'Setelah Lewat Jatuh Tempo (Overdue)'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleRule(rule.id)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        rule.enabled ? 'bg-blue-600' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          rule.enabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Channel selector */}
                  <div className="mt-4 flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-500">
                      Kanal Pengiriman:
                    </span>
                    <div className="inline-flex rounded-xl bg-slate-100 p-0.5 text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => updateRuleChannel(rule.id, 'whatsapp')}
                        className={`px-2.5 py-1 rounded-lg transition ${
                          rule.channel === 'whatsapp'
                            ? 'bg-white text-emerald-700 shadow-xs'
                            : 'text-slate-500'
                        }`}
                      >
                        WhatsApp
                      </button>
                      <button
                        type="button"
                        onClick={() => updateRuleChannel(rule.id, 'email')}
                        className={`px-2.5 py-1 rounded-lg transition ${
                          rule.channel === 'email'
                            ? 'bg-white text-blue-700 shadow-xs'
                            : 'text-slate-500'
                        }`}
                      >
                        Email
                      </button>
                      <button
                        type="button"
                        onClick={() => updateRuleChannel(rule.id, 'both')}
                        className={`px-2.5 py-1 rounded-lg transition ${
                          rule.channel === 'both'
                            ? 'bg-white text-indigo-800 shadow-xs'
                            : 'text-slate-500'
                        }`}
                      >
                        Keduanya
                      </button>
                    </div>
                  </div>

                  {/* Template Textarea */}
                  <div className="mt-3">
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Template Pesan:
                    </label>
                    <textarea
                      rows={4}
                      value={rule.messageTemplate}
                      onChange={(e) => updateRuleTemplate(rule.id, e.target.value)}
                      className="w-full text-xs font-sans p-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Logs */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
              Daftar Log Riwayat Pengiriman Tagihan Otomatis
            </h3>
            <span className="text-[11px] text-slate-400">
              Total {logs.length} riwayat tercatat
            </span>
          </div>

          {logs.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-xs font-semibold">Belum ada riwayat pengiriman otomasi.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {logs.map((log) => (
                <div key={log.id} className="p-4 hover:bg-slate-50 transition text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 font-mono">
                        {log.invoiceNumber}
                      </span>
                      <span className="text-slate-400">•</span>
                      <span className="font-semibold text-slate-700">
                        {log.customerName}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-bold">
                        {log.ruleType}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400 font-mono">
                        {new Date(log.dispatchedAt).toLocaleString('id-ID')}
                      </span>

                      {log.whatsappUrl && (
                        <a
                          href={log.whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white font-bold text-[11px] transition"
                        >
                          <Send className="w-3 h-3" />
                          <span>Kirim via WA</span>
                        </a>
                      )}
                    </div>
                  </div>

                  <p className="mt-2 text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 font-mono break-words leading-relaxed">
                    {log.message}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Watermark Section */}
      <div className="mt-8 pt-6 border-t border-slate-200 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-slate-600 text-xs font-medium shadow-2xs">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <span>{settings?.watermarkText || 'Aplikasi ini dibuat oleh Heru Hendri • Contact Person: 08977345640'}</span>
        </div>
      </div>
    </div>
  );
};
