import React, { useState, useEffect, useMemo } from 'react';
import { 
  Zap, 
  Play, 
  CheckCircle2, 
  Clock, 
  Sliders, 
  Check, 
  Send,
  Calendar,
  Sparkles,
  ShieldCheck,
  Package,
  Users,
  Search,
  RotateCw, 
  Info,
  CalendarDays,
  Bell,
  CheckCircle,
  AlertCircle,
  Cpu
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
  onToggleRule?: (ruleId: string, isActive?: boolean) => void | Promise<void>;
  onRunAutomation: () => Promise<any>;
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

export type PresetKey = 'isp_billing' | 'beginning_month' | 'mid_month' | 'end_month';

interface SchedulePreset {
  key: PresetKey;
  title: string;
  badge: string;
  badgeColor: string;
  issueDay: number;
  dueDay: number;
  dueOffsetDays: number;
  description: string;
  recommendedFor: string;
}

const PRESETS: SchedulePreset[] = [
  {
    key: 'isp_billing',
    title: 'Rekomendasi ISP & Mikrotik PPPoE',
    badge: '⭐ Paling Direkomendasikan',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    issueDay: 5,
    dueDay: 20,
    dueOffsetDays: 15,
    description: 'Terbit otomatis setiap Tanggal 05 • Jatuh tempo Tanggal 20 (15 hari masa pembayaran).',
    recommendedFor: 'Standar penyedia internet, RT/RW Net & Router NOC setelah rekap awal bulan.',
  },
  {
    key: 'beginning_month',
    title: 'Rekomendasi Awal Bulan',
    badge: '🏢 Standar Korporasi',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    issueDay: 1,
    dueDay: 10,
    dueOffsetDays: 10,
    description: 'Terbit otomatis setiap Tanggal 01 • Jatuh tempo Tanggal 10 (10 hari masa pembayaran).',
    recommendedFor: 'Pelanggan korporat, kantor & instansi dengan siklus tagihan hari pertama kalender.',
  },
  {
    key: 'mid_month',
    title: 'Rekomendasi Siklus Gajian (Tgl 10)',
    badge: '📅 Siklus Payroll',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
    issueDay: 10,
    dueDay: 25,
    dueOffsetDays: 15,
    description: 'Terbit otomatis setiap Tanggal 10 • Jatuh tempo Tanggal 25 (15 hari masa pembayaran).',
    recommendedFor: 'Pelanggan perumahan yang menerima payroll atau gaji tengah bulan.',
  },
  {
    key: 'end_month',
    title: 'Rekomendasi Akhir Bulan (Pra-Bulan)',
    badge: '⏳ Pra-Penagihan',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    issueDay: 25,
    dueDay: 5,
    dueOffsetDays: 10,
    description: 'Terbit otomatis setiap Tanggal 25 • Jatuh tempo Tanggal 05 bulan berikutnya.',
    recommendedFor: 'Model langganan prabayar / tagihan sebelum periode bulan baru dimulai.',
  },
];

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
  const [activeTab, setActiveTab] = useState<'schedule' | 'rules' | 'logs'>('schedule');

  // Server Recurring Schedule State
  const [autoEnabled, setAutoEnabled] = useState<boolean>(
    settings?.recurringBilling?.enabled ?? true
  );
  const [dateMode, setDateMode] = useState<'recommendation' | 'custom'>(
    settings?.recurringBilling?.dateOption === 'custom' ? 'custom' : 'recommendation'
  );
  const [selectedPreset, setSelectedPreset] = useState<PresetKey>(
    (settings?.recurringBilling?.selectedPreset as PresetKey) || 'isp_billing'
  );
  const [customGenerateDay, setCustomGenerateDay] = useState<number>(
    settings?.recurringBilling?.generateDay || 5
  );
  const [dueDateType, setDueDateType] = useState<'fixed_day' | 'offset'>('fixed_day');
  const [customDueDay, setCustomDueDay] = useState<number>(
    settings?.recurringBilling?.customDueDay || 20
  );
  const [customDueOffset, setCustomDueOffset] = useState<number>(
    settings?.recurringBilling?.dueDaysOffset || 15
  );

  // Saving states
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [scheduleSaveSuccess, setScheduleSaveSuccess] = useState(false);
  const [scheduleSaveError, setScheduleSaveError] = useState<string | null>(null);

  // Server schedule telemetry & status info
  const [scheduleTelemetry, setScheduleTelemetry] = useState<{
    nextScheduledRun?: string;
    nextScheduledDue?: string;
    currentMonth?: string;
    isCurrentMonthGenerated?: boolean;
  }>({});

  // Fetch live schedule info from server on mount
  useEffect(() => {
    fetch('/api/automation/recurring-config')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.success) {
          if (data.config) {
            setAutoEnabled(data.config.enabled ?? true);
            if (data.config.selectedPreset) {
              setSelectedPreset(data.config.selectedPreset);
            }
            if (data.config.dateOption === 'custom') {
              setDateMode('custom');
            } else {
              setDateMode('recommendation');
            }
            if (data.config.generateDay) {
              setCustomGenerateDay(data.config.generateDay);
            }
            if (data.config.customDueDay) {
              setCustomDueDay(data.config.customDueDay);
            }
            if (data.config.dueDaysOffset) {
              setCustomDueOffset(data.config.dueDaysOffset);
            }
          }
          setScheduleTelemetry({
            nextScheduledRun: data.nextScheduledRun,
            nextScheduledDue: data.nextScheduledDue,
            currentMonth: data.currentMonth,
            isCurrentMonthGenerated: data.isCurrentMonthGenerated,
          });
        }
      })
      .catch((err) => console.error('Error fetching recurring config:', err));
  }, []);

  // Quick manual execution for current/chosen month
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [manualMonth, setManualMonth] = useState<string>(currentMonthStr);
  const [isGeneratingManual, setIsGeneratingManual] = useState<boolean>(false);
  const [manualResult, setManualResult] = useState<{
    message: string;
    month: string;
    generatedCount: number;
    skippedCount: number;
    invoices: Invoice[];
  } | null>(null);
  const [manualError, setManualError] = useState<string | null>(null);

  // Customer filter
  const [customerSearch, setCustomerSearch] = useState<string>('');
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>(
    customers.filter((c) => c.recurringEnabled !== false).map((c) => c.id)
  );

  // Update selected customer IDs if customer list changes
  useEffect(() => {
    setSelectedCustomerIds(
      customers.filter((c) => c.recurringEnabled !== false).map((c) => c.id)
    );
  }, [customers]);

  // Rules state
  const [localRules, setLocalRules] = useState<BillingAutomationRule[]>(rules);
  const [isSavingRules, setIsSavingRules] = useState(false);
  const [rulesSaveSuccess, setRulesSaveSuccess] = useState(false);
  const [runResult, setRunResult] = useState<{ dispatchedCount: number } | null>(null);

  // Reference list of available recurring addons
  const allAvailableAddons: RecurringAddonService[] = useMemo(() => {
    return [
      {
        id: 'addon-vpn',
        name: 'Layanan VPN Remote Mikrotik Dedicated',
        category: 'Jaringan & VPN',
        price: 50000,
        unit: 'Bulan',
        description: 'Akses remote Winbox & Webfig Mikrotik 24/7.',
        enabledByDefault: true,
        createdAt: '',
      },
      {
        id: 'addon-mon',
        name: 'Biaya Monitoring Jaringan NOC 24/7',
        category: 'Monitoring & SLA',
        price: 250000,
        unit: 'Bulan',
        description: 'Pengawasan uptime link, ICMP alert, bandwidth peak alert.',
        enabledByDefault: true,
        createdAt: '',
      },
      ...recurringAddons.filter((a) => a.id !== 'addon-vpn' && a.id !== 'addon-mon'),
    ];
  }, [recurringAddons]);

  // Helper to extract customer addon IDs
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

  // Determine current active effective dates
  const effectiveIssueDay = useMemo(() => {
    if (dateMode === 'recommendation') {
      const p = PRESETS.find((pr) => pr.key === selectedPreset);
      return p ? p.issueDay : 5;
    }
    return customGenerateDay;
  }, [dateMode, selectedPreset, customGenerateDay]);

  const effectiveDueInfo = useMemo(() => {
    if (dateMode === 'recommendation') {
      const p = PRESETS.find((pr) => pr.key === selectedPreset);
      return {
        mode: 'fixed_day',
        day: p ? p.dueDay : 20,
        offset: p ? p.dueOffsetDays : 15,
        text: `Tanggal ${String(p ? p.dueDay : 20).padStart(2, '0')}`,
      };
    }
    if (dueDateType === 'fixed_day') {
      return {
        mode: 'fixed_day',
        day: customDueDay,
        offset: 15,
        text: `Tanggal ${String(customDueDay).padStart(2, '0')}`,
      };
    }
    return {
      mode: 'offset',
      day: effectiveIssueDay + customDueOffset,
      offset: customDueOffset,
      text: `+${customDueOffset} hari setelah terbit`,
    };
  }, [dateMode, selectedPreset, dueDateType, customDueDay, customDueOffset, effectiveIssueDay]);

  // Real-time calculation of active recurring customer estimate
  const activeRecurringCustomers = useMemo(() => {
    return customers.filter((c) => c.recurringEnabled !== false);
  }, [customers]);

  const estimatedMonthlyRevenue = useMemo(() => {
    return activeRecurringCustomers.reduce((sum, c) => {
      let base = 0;
      if (c.customerMode === 'noc' && c.mikrotik) {
        const mk = c.mikrotik;
        const avg = c.monthlyAveragePppoeCount ?? mk.monthlyAverageNonIsolir ?? Number(mk.nonIsolirCount) ?? 84;
        const rate = Number(mk.ratePerUser) || 5000;
        base = avg * rate;
      } else {
        base = c.customMonthlyAmount || 2500000;
      }

      let addonsTotal = 0;
      const addons = getCustomerProfileAddonIds(c);
      for (const aId of addons) {
        if (aId === 'addon-vpn') addonsTotal += 50000;
        else if (aId === 'addon-mon') addonsTotal += 250000;
        else {
          const item = allAvailableAddons.find((a) => a.id === aId);
          if (item) addonsTotal += item.price;
        }
      }

      const subtotal = base + addonsTotal;
      const tax = Math.round(subtotal * 0.11);
      return sum + subtotal + tax;
    }, 0);
  }, [activeRecurringCustomers, allAvailableAddons]);

  // Handle Save Automatic Schedule
  const handleSaveSchedule = async () => {
    setIsSavingSchedule(true);
    setScheduleSaveSuccess(false);
    setScheduleSaveError(null);

    const presetObj = PRESETS.find((p) => p.key === selectedPreset);

    const payload = {
      enabled: autoEnabled,
      dateOption: dateMode === 'recommendation' ? 'system' : 'custom',
      selectedPreset: dateMode === 'recommendation' ? selectedPreset : 'custom',
      generateDay: dateMode === 'recommendation' ? (presetObj?.issueDay ?? 5) : customGenerateDay,
      dueDateOption: dateMode === 'recommendation' ? 'fixed_day' : dueDateType,
      customDueDay: dateMode === 'recommendation' ? (presetObj?.dueDay ?? 20) : customDueDay,
      dueDaysOffset: dateMode === 'recommendation' ? (presetObj?.dueOffsetDays ?? 15) : customDueOffset,
    };

    try {
      const res = await fetch('/api/automation/recurring-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Gagal menyimpan pengaturan jadwal');
      }

      setScheduleSaveSuccess(true);
      setTimeout(() => setScheduleSaveSuccess(false), 4000);

      // Refresh telemetry
      const getRes = await fetch('/api/automation/recurring-config');
      if (getRes.ok) {
        const getInfo = await getRes.json();
        if (getInfo.success) {
          setScheduleTelemetry({
            nextScheduledRun: getInfo.nextScheduledRun,
            nextScheduledDue: getInfo.nextScheduledDue,
            currentMonth: getInfo.currentMonth,
            isCurrentMonthGenerated: getInfo.isCurrentMonthGenerated,
          });
        }
      }
      if (onRefreshData) await onRefreshData();
    } catch (err: any) {
      console.error(err);
      setScheduleSaveError(err?.message || 'Terjadi kesalahan saat menyimpan jadwal');
    } finally {
      setIsSavingSchedule(false);
    }
  };

  // Handle Manual Trigger (Sekali Klik)
  const handleTriggerManualGeneration = async () => {
    if (selectedCustomerIds.length === 0) {
      setManualError('Pilih minimal 1 pelanggan untuk diterbitkan tagihannya.');
      return;
    }

    setIsGeneratingManual(true);
    setManualError(null);
    setManualResult(null);

    try {
      const [year, month] = manualMonth.split('-');
      const issueDayStr = String(effectiveIssueDay).padStart(2, '0');
      const customDateStr = `${year}-${month}-${issueDayStr}`;

      let customDueDateStr = '';
      if (effectiveDueInfo.mode === 'fixed_day') {
        const dueDayStr = String(effectiveDueInfo.day).padStart(2, '0');
        // Handle end_month preset where due date is next month
        if (selectedPreset === 'end_month' && dateMode === 'recommendation') {
          let nextY = Number(year);
          let nextM = Number(month) + 1;
          if (nextM > 12) {
            nextM = 1;
            nextY += 1;
          }
          customDueDateStr = `${nextY}-${String(nextM).padStart(2, '0')}-05`;
        } else {
          customDueDateStr = `${year}-${month}-${dueDayStr}`;
        }
      } else {
        const issueObj = new Date(Number(year), Number(month) - 1, effectiveIssueDay);
        const dueObj = new Date(issueObj.getTime() + effectiveDueInfo.offset * 24 * 60 * 60 * 1000);
        customDueDateStr = dueObj.toISOString().split('T')[0];
      }

      const payload = {
        monthStr: manualMonth,
        customDate: customDateStr,
        customDueDate: customDueDateStr,
        targetCustomerIds: selectedCustomerIds,
        pppoeBillingMethod: 'monthly_average' as const,
      };

      if (onGenerateMonthlyInvoices) {
        const res = await onGenerateMonthlyInvoices(payload);
        setManualResult(res);
      } else {
        const resp = await fetch('/api/invoices/generate-monthly', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await resp.json();
        if (!resp.ok) {
          throw new Error(data.message || data.error || 'Gagal menerbitkan tagihan bulanan');
        }
        setManualResult(data);
      }

      if (onRefreshData) await onRefreshData();

      // Refresh server schedule status
      const getRes = await fetch('/api/automation/recurring-config');
      if (getRes.ok) {
        const getInfo = await getRes.json();
        if (getInfo.success) {
          setScheduleTelemetry((prev) => ({
            ...prev,
            isCurrentMonthGenerated: getInfo.isCurrentMonthGenerated,
          }));
        }
      }
    } catch (err: any) {
      console.error(err);
      setManualError(err?.message || 'Terjadi kesalahan saat menerbitkan tagihan.');
    } finally {
      setIsGeneratingManual(false);
    }
  };

  // Rule management handlers
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
    setIsSavingRules(true);
    setRulesSaveSuccess(false);
    try {
      await onUpdateRules(localRules);
      setRulesSaveSuccess(true);
      setTimeout(() => setRulesSaveSuccess(false), 3000);
    } catch (e) {
      console.error('Failed saving rules:', e);
    } finally {
      setIsSavingRules(false);
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

  // Filter customers for display
  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      (c.company || '').toLowerCase().includes(customerSearch.toLowerCase()) ||
      (c.phone || '').includes(customerSearch)
  );

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Top Header Card */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-7 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold uppercase tracking-wider border border-blue-400/30">
                <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                Otomasi Tagihan & Auto-Recurring Invoicing
              </span>
              {autoEnabled ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold border border-emerald-500/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Server Otomatis Aktif
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-700/60 text-slate-300 text-[11px] font-semibold border border-slate-600">
                  Nonaktif (Manual)
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Otomasi Pembuatan Invoice Bulanan
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Tentukan tanggal atau pilih rekomendasi jadwal pembuatan invoice. Sistem server akan secara otomatis menerbitkan tagihan ber-QRIS dinamis dan mengirimkan pengingat WhatsApp tanpa perlu klik manual.
            </p>
          </div>

          {/* Quick Action Button */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              id="btn-run-automation"
              onClick={handleTriggerRun}
              disabled={isRunning}
              className="flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/20 transition active:scale-95 disabled:opacity-50"
              title="Kirim pengingat WhatsApp untuk tagihan jatuh tempo"
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
      </div>

      {/* Tabs Bar */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-2 gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('schedule')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'schedule'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>⚡ Jadwal Otomasi Pembuatan Invoice</span>
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
            <span>Aturan Pesan Pengingat ({localRules.filter((r) => r.enabled).length} Aktif)</span>
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
            disabled={isSavingRules}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs disabled:opacity-50"
          >
            {isSavingRules ? (
              <RotateCw className="w-3.5 h-3.5 animate-spin" />
            ) : rulesSaveSuccess ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            <span>{isSavingRules ? 'Menyimpan...' : rulesSaveSuccess ? 'Tersimpan!' : 'Simpan Aturan Pesan'}</span>
          </button>
        )}
      </div>

      {/* ================= TAB 1: SCHEDULE & AUTOMATION ================= */}
      {activeTab === 'schedule' && (
        <div className="space-y-6">
          {/* Notifications / Alerts */}
          {scheduleSaveSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span className="text-xs font-bold">
                  Pengaturan jadwal otomasi invoice berhasil disimpan dan aktif di server!
                </span>
              </div>
              <button
                onClick={() => setScheduleSaveSuccess(false)}
                className="text-xs font-bold text-emerald-700 hover:underline"
              >
                Tutup
              </button>
            </div>
          )}

          {scheduleSaveError && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-950 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                <span className="text-xs font-semibold">{scheduleSaveError}</span>
              </div>
              <button
                onClick={() => setScheduleSaveError(null)}
                className="text-xs font-bold text-rose-700 hover:underline"
              >
                Tutup
              </button>
            </div>
          )}

          {/* Quick Manual Result Alert */}
          {manualResult && (
            <div className="p-5 rounded-3xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-3 shadow-xs">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-xs">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold">{manualResult.message}</h4>
                    <p className="text-xs text-emerald-800 mt-0.5">
                      Berhasil menerbitkan <strong>{manualResult.generatedCount} invoice baru</strong> periode <strong>{manualResult.month}</strong> ({manualResult.skippedCount} pelanggan dilewati secara aman karena sudah terbit sebelumnya).
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setManualResult(null)}
                  className="text-xs font-bold text-emerald-800 underline"
                >
                  Tutup
                </button>
              </div>

              {manualResult.invoices && manualResult.invoices.length > 0 && (
                <div className="pt-2 border-t border-emerald-200/60">
                  <span className="text-[11px] font-bold text-emerald-900 block mb-2">
                    Daftar Invoice yang Diterbitkan:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {manualResult.invoices.map((inv) => (
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

          {/* MAIN CARD 1: Konfigurasi Otomasi Tanggal Pembuatan Invoice */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
            {/* Top Switch Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100">
                  <CalendarDays className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-slate-900">
                      Jadwal Pembuatan Invoice Otomatis
                    </h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                      autoEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {autoEnabled ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Pilih rekomendasi tanggal industri atau tentukan tanggal bebas pembuatan invoice setiap bulannya.
                  </p>
                </div>
              </div>

              {/* Master Automation Toggle */}
              <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-200 shrink-0">
                <span className="text-xs font-bold text-slate-700">
                  {autoEnabled ? 'Otomasi Aktif' : 'Otomasi Dimatikan'}
                </span>
                <button
                  type="button"
                  onClick={() => setAutoEnabled(!autoEnabled)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    autoEnabled ? 'bg-emerald-600' : 'bg-slate-300'
                  }`}
                  aria-label="Toggle Otomasi"
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      autoEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Mode Selector: Rekomendasi Sistem vs Tentukan Tanggal Bebas */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                  Metode Penetapan Tanggal Invoice:
                </span>

                <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setDateMode('recommendation')}
                    className={`px-4 py-1.5 rounded-lg transition ${
                      dateMode === 'recommendation'
                        ? 'bg-white text-blue-700 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    ⭐ Rekomendasi Tanggal Terbaik
                  </button>
                  <button
                    type="button"
                    onClick={() => setDateMode('custom')}
                    className={`px-4 py-1.5 rounded-lg transition ${
                      dateMode === 'custom'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    ✏️ Tentukan Tanggal Bebas (Custom)
                  </button>
                </div>
              </div>

              {/* Mode A: Pilihan Rekomendasi Tanggal */}
              {dateMode === 'recommendation' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                  {PRESETS.map((preset) => {
                    const isSelected = selectedPreset === preset.key;
                    return (
                      <div
                        key={preset.key}
                        onClick={() => setSelectedPreset(preset.key)}
                        className={`cursor-pointer p-4 rounded-2xl border transition relative flex flex-col justify-between gap-3 ${
                          isSelected
                            ? 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                            : 'bg-slate-50/50 border-slate-200 hover:bg-slate-100/70'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-extrabold text-xs text-slate-900">
                              {preset.title}
                            </span>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide border ${preset.badgeColor}`}>
                              {preset.badge}
                            </span>
                          </div>

                          <div className="mt-2.5 flex items-center gap-3 text-xs">
                            <div className="bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-2xs">
                              <span className="text-[10px] text-slate-500 font-semibold block">Terbit Otomatis:</span>
                              <span className="font-black text-blue-700 text-xs">Tanggal {String(preset.issueDay).padStart(2, '0')}</span>
                            </div>
                            <span className="text-slate-300 font-bold">➔</span>
                            <div className="bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-2xs">
                              <span className="text-[10px] text-slate-500 font-semibold block">Jatuh Tempo:</span>
                              <span className="font-black text-rose-700 text-xs">Tanggal {String(preset.dueDay).padStart(2, '0')}</span>
                            </div>
                            <span className="text-[11px] text-slate-500 font-medium">
                              ({preset.dueOffsetDays} hari tenggang)
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-600 mt-2.5 leading-relaxed">
                            {preset.recommendedFor}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-[10px]">
                          <span className="text-slate-500 font-medium">
                            {isSelected ? '✓ Terpilih sebagai jadwal utama' : 'Klik untuk memilih rekomendasi ini'}
                          </span>
                          {isSelected && (
                            <div className="flex items-center gap-1 font-bold text-blue-700">
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Aktif</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Mode B: Tentukan Tanggal Bebas (Custom) */}
              {dateMode === 'custom' && (
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                  <div className="flex items-center gap-2 text-slate-700 text-xs font-extrabold uppercase tracking-wider">
                    <span>Pengaturan Tanggal Terbit & Jatuh Tempo Kustom</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Tanggal Terbit */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                      <label className="text-xs font-bold text-slate-800 block mb-1">
                        Tanggal Terbit Otomatis Setiap Bulan:
                      </label>
                      <p className="text-[11px] text-slate-500 mb-2">
                        Invoice akan diterbitkan otomatis setiap tanggal ini.
                      </p>
                      <div className="flex items-center gap-2">
                        <select
                          value={customGenerateDay}
                          onChange={(e) => setCustomGenerateDay(Number(e.target.value))}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                        >
                          {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                            <option key={d} value={d}>
                              Setiap Tanggal {String(d).padStart(2, '0')} tiap bulan
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Tanggal Jatuh Tempo */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                      <label className="text-xs font-bold text-slate-800 block mb-1">
                        Penetapan Tanggal Jatuh Tempo:
                      </label>
                      <div className="flex items-center gap-2 mb-2">
                        <label className="flex items-center gap-1.5 text-xs text-slate-700 font-semibold cursor-pointer">
                          <input
                            type="radio"
                            name="dueDateType"
                            checked={dueDateType === 'fixed_day'}
                            onChange={() => setDueDateType('fixed_day')}
                            className="text-blue-600"
                          />
                          <span>Tanggal Tetap</span>
                        </label>
                        <label className="flex items-center gap-1.5 text-xs text-slate-700 font-semibold cursor-pointer ml-3">
                          <input
                            type="radio"
                            name="dueDateType"
                            checked={dueDateType === 'offset'}
                            onChange={() => setDueDateType('offset')}
                            className="text-blue-600"
                          />
                          <span>Jumlah Hari (+Hari)</span>
                        </label>
                      </div>

                      {dueDateType === 'fixed_day' ? (
                        <select
                          value={customDueDay}
                          onChange={(e) => setCustomDueDay(Number(e.target.value))}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                        >
                          {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                            <option key={d} value={d}>
                              Jatuh tempo Tanggal {String(d).padStart(2, '0')} tiap bulan
                            </option>
                          ))}
                        </select>
                      ) : (
                        <select
                          value={customDueOffset}
                          onChange={(e) => setCustomDueOffset(Number(e.target.value))}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                        >
                          <option value={7}>+7 Hari setelah invoice terbit</option>
                          <option value={10}>+10 Hari setelah invoice terbit</option>
                          <option value={14}>+14 Hari (2 Minggu) setelah terbit</option>
                          <option value={15}>+15 Hari setelah terbit</option>
                          <option value={20}>+20 Hari setelah terbit</option>
                          <option value={30}>+30 Hari (1 Bulan) setelah terbit</option>
                        </select>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Server Status Summary & Save Action */}
            <div className="pt-4 border-t border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50 p-4 rounded-2xl">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold text-slate-900">
                    Ringkasan Jadwal Terbit Otomatis:
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[11px] font-bold">
                    Terbit: Tgl {String(effectiveIssueDay).padStart(2, '0')} • Tempo: {effectiveDueInfo.text}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span>
                    Jadwal Terbit Berikutnya:{' '}
                    <strong className="text-slate-800">
                      {scheduleTelemetry.nextScheduledRun
                        ? formatDateIndo(scheduleTelemetry.nextScheduledRun)
                        : `Tanggal ${effectiveIssueDay} Bulan Depan`}
                    </strong>
                  </span>
                  <span>•</span>
                  <span>
                    Bulan Ini ({scheduleTelemetry.currentMonth || currentMonthStr}):{' '}
                    {scheduleTelemetry.isCurrentMonthGenerated ? (
                      <span className="text-emerald-700 font-bold">✓ Sudah Pernah Diterbitkan</span>
                    ) : (
                      <span className="text-amber-700 font-bold">⏳ Menunggu Jadwal Tanggal {effectiveIssueDay}</span>
                    )}
                  </span>
                </div>
              </div>

              {/* Save Schedule Button */}
              <button
                type="button"
                onClick={handleSaveSchedule}
                disabled={isSavingSchedule}
                className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md shadow-blue-500/20 transition active:scale-95 disabled:opacity-50 shrink-0"
              >
                {isSavingSchedule ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    <span>Menyimpan Jadwal...</span>
                  </>
                ) : scheduleSaveSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>Jadwal Tersimpan!</span>
                  </>
                ) : (
                  <>
                    <Calendar className="w-4 h-4" />
                    <span>Simpan Jadwal Otomasi</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* MAIN CARD 2: Pelanggan yang Terdaftar Dalam Otomasi */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Pelanggan Terjadwal Otomatis ({activeRecurringCustomers.length} Pelanggan)
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Layanan pokok dan layanan tambahan (VPN Remote / Monitoring NOC) otomatis disertakan sesuai profil pelanggan saat pembuatan/edit data.
                </p>
              </div>

              <div className="flex items-center gap-2">
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
              </div>
            </div>

            {/* Customer List Summary Table */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-72 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px] sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-3">Nama Pelanggan</th>
                    <th className="py-2.5 px-3">Paket Layanan Pokok</th>
                    <th className="py-2.5 px-3">Layanan Tambahan Otomatis</th>
                    <th className="py-2.5 px-3 text-right">Estimasi Tagihan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400">
                        Tidak ada pelanggan ditemukan
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map((cust) => {
                      const isAuto = cust.recurringEnabled !== false;

                      let baseAmount = cust.customMonthlyAmount || 2500000;
                      let billablePppoeCount = 0;
                      if (cust.customerMode === 'noc' && cust.mikrotik) {
                        const mk = cust.mikrotik;
                        const avgNonIso = cust.monthlyAveragePppoeCount ?? mk.monthlyAverageNonIsolir ?? Number(mk.nonIsolirCount) ?? 84;
                        billablePppoeCount = avgNonIso;
                        const rate = Number(mk.ratePerUser) || 5000;
                        baseAmount = billablePppoeCount * rate;
                      }

                      let addOns = 0;
                      const custAddonIds = getCustomerProfileAddonIds(cust);
                      for (const aId of custAddonIds) {
                        if (aId === 'addon-vpn') addOns += 50000;
                        else if (aId === 'addon-mon') addOns += 250000;
                        else {
                          const matched = allAvailableAddons.find((a) => a.id === aId);
                          if (matched) addOns += matched.price;
                        }
                      }

                      const subtotal = baseAmount + addOns;
                      const total = subtotal + Math.round(subtotal * 0.11);

                      return (
                        <tr key={cust.id} className="hover:bg-slate-50 transition">
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900">{cust.name}</span>
                              {!isAuto && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 text-slate-500">
                                  Nonaktif
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-500 block">
                              {cust.company || cust.phone}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            {cust.customerMode === 'noc' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold">
                                <Cpu className="w-3 h-3" />
                                NOC ({billablePppoeCount} User @ {formatRupiah(cust.mikrotik?.ratePerUser || 5000)})
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold">
                                Layanan Biasa
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex flex-wrap items-center gap-1">
                              {custAddonIds.length === 0 ? (
                                <span className="text-slate-400 text-[10px] italic">
                                  {isAuto ? 'Hanya pokok' : 'Non-aktif'}
                                </span>
                              ) : (
                                custAddonIds.map((aId) => {
                                  const isVpn = aId === 'addon-vpn';
                                  const isMon = aId === 'addon-mon';
                                  const label = isVpn ? 'VPN' : isMon ? 'Monitoring NOC' : aId;
                                  return (
                                    <span
                                      key={aId}
                                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                        isVpn
                                          ? 'bg-indigo-100 text-indigo-800'
                                          : isMon
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : 'bg-blue-100 text-blue-800'
                                      }`}
                                    >
                                      {label}
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
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Total Estimated Box */}
            <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">
                  Total Estimasi Nilai Tagihan Bulanan:
                </span>
                <span className="text-lg sm:text-xl font-black text-slate-900 font-mono">
                  {formatRupiah(estimatedMonthlyRevenue)}
                </span>
                <span className="text-[11px] text-slate-500 ml-2">
                  (Incl. PPN 11% untuk {activeRecurringCustomers.length} pelanggan terjadwal)
                </span>
              </div>

              <div className="text-[11px] text-slate-600 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Otomatis memverifikasi duplikasi invoice agar tidak terbit ganda.</span>
              </div>
            </div>
          </div>

          {/* MAIN CARD 3: Terbitkan Sekarang Secara Langsung (Manual / Cepat) */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Terbitkan Tagihan Sekarang (Tanpa Menunggu Tanggal Server)
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Gunakan tombol ini jika Anda ingin langsung men-generate seluruh tagihan bulan ini sekarang juga.
                </p>
              </div>

              {/* Month selector */}
              <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                <span className="text-xs font-bold text-slate-600 px-1">Periode:</span>
                <input
                  type="month"
                  value={manualMonth}
                  onChange={(e) => setManualMonth(e.target.value)}
                  className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-800 focus:outline-none"
                />
              </div>
            </div>

            {manualError && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-800 text-xs font-semibold flex items-center justify-between">
                <span>{manualError}</span>
                <button onClick={() => setManualError(null)} className="underline font-bold">
                  Tutup
                </button>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <span className="text-xs text-slate-600">
                Akan menerbitkan invoice untuk <strong>{selectedCustomerIds.length} pelanggan</strong> dengan tanggal terbit <strong>{effectiveIssueDay} {new Date(manualMonth + '-01').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</strong>.
              </span>

              <button
                type="button"
                onClick={handleTriggerManualGeneration}
                disabled={isGeneratingManual || selectedCustomerIds.length === 0}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-xs shadow-md shadow-blue-500/20 transition active:scale-95 disabled:opacity-50 shrink-0"
              >
                {isGeneratingManual ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    <span>Menghasilkan QRIS Dinamis & Invoice...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Terbitkan Invoice Bulan Ini Sekarang</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: RULES ================= */}
      {activeTab === 'rules' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
              Aturan Pengingat WhatsApp & Email Otomatis
            </h3>
            <span className="text-xs text-slate-500">
              Variable: {'{{customer_name}}'}, {'{{invoice_number}}'}, {'{{amount}}'}, {'{{due_date}}'}, {'{{invoice_url}}'}
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
                        <h4 className="text-sm font-extrabold text-slate-900">
                          {rule.name}
                        </h4>
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

      {/* ================= TAB 3: LOGS ================= */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
              Daftar Log Riwayat Pengiriman Notifikasi & Tagihan
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
