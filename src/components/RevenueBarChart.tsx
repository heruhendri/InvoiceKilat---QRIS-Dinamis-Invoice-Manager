import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Cell,
  Legend
} from 'recharts';
import {
  Calendar,
  TrendingUp,
  Award,
  DollarSign,
  Filter,
  BarChart3,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle2,
  ChevronRight,
  Info,
  SlidersHorizontal,
  X
} from 'lucide-react';
import { Invoice } from '../types';
import { formatRupiah, formatDateTimeIndo } from '../utils/formatters';

// Format currency compactly for chart axis ticks (e.g., Rp 50rb, Rp 1.5jt, Rp 2M)
const formatAxisCurrency = (val: number): string => {
  if (!val || val === 0) return 'Rp 0';
  if (val >= 1_000_000_000) {
    const formatted = (val / 1_000_000_000).toFixed(val % 1_000_000_000 === 0 ? 0 : 1);
    return `Rp ${formatted}M`;
  }
  if (val >= 1_000_000) {
    const formatted = (val / 1_000_000).toFixed(val % 1_000_000 === 0 ? 0 : 1);
    return `Rp ${formatted}jt`;
  }
  if (val >= 1_000) {
    return `Rp ${(val / 1_000).toFixed(0)}rb`;
  }
  return `Rp ${val}`;
};

export interface RevenueBarChartProps {
  dailyChartData: { day: string; revenue: number }[];
  monthlyChartData: { label: string; revenue: number; invoiceCount: number }[];
  invoices: Invoice[];
  onSelectInvoice?: (id: string) => void;
}

type ChartViewMode = 'daily' | 'monthly' | 'both';

export const RevenueBarChart: React.FC<RevenueBarChartProps> = ({
  dailyChartData,
  monthlyChartData,
  invoices,
  onSelectInvoice
}) => {
  const [viewMode, setViewMode] = useState<ChartViewMode>('daily');
  const [showAverageLine, setShowAverageLine] = useState(true);
  const [showOnlyActiveDays, setShowOnlyActiveDays] = useState(false);
  const [showInvoiceCountBar, setShowInvoiceCountBar] = useState(true);
  const [selectedBar, setSelectedBar] = useState<{
    type: 'daily' | 'monthly';
    label: string;
    revenue: number;
    count?: number;
    dayNum?: number;
  } | null>(null);

  const now = useMemo(() => new Date(), []);
  const currentDay = now.getDate();
  const currentMonthIdx = now.getMonth();
  const currentYear = now.getFullYear();

  // Base daily data with fallback generation if empty
  const baseDailyData = useMemo(() => {
    if (dailyChartData && dailyChartData.length > 0) return dailyChartData;
    const daysInMonth = new Date(currentYear, currentMonthIdx + 1, 0).getDate();
    const generated: { day: string; revenue: number }[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      generated.push({ day: `Tgl ${d}`, revenue: 0 });
    }
    return generated;
  }, [dailyChartData, currentYear, currentMonthIdx]);

  // Base monthly data with fallback generation if empty
  const baseMonthlyData = useMemo(() => {
    if (monthlyChartData && monthlyChartData.length > 0) return monthlyChartData;
    const generated: { label: string; revenue: number; invoiceCount: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYear, currentMonthIdx - i, 1);
      const label = d.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
      generated.push({ label, revenue: 0, invoiceCount: 0 });
    }
    return generated;
  }, [monthlyChartData, currentYear, currentMonthIdx]);

  // Daily Data Calculations
  const enrichedDailyData = useMemo(() => {
    return baseDailyData.map((item) => {
      const match = item.day.match(/\d+/);
      const dayNum = match ? parseInt(match[0], 10) : 0;
      const isToday = dayNum === currentDay;

      // Count transactions on this day from invoices
      let txCount = 0;
      const matchingTxs: {
        id: string;
        invoiceId: string;
        invoiceNumber: string;
        customerName: string;
        amount: number;
        method: string;
        verifiedAt: string;
      }[] = [];

      for (const inv of invoices) {
        if (inv.transactions && inv.transactions.length > 0) {
          for (const trx of inv.transactions) {
            const tDate = new Date(trx.verifiedAt);
            if (
              tDate.getDate() === dayNum &&
              tDate.getMonth() === currentMonthIdx &&
              tDate.getFullYear() === currentYear
            ) {
              txCount++;
              matchingTxs.push({
                id: trx.id,
                invoiceId: trx.invoiceId || inv.id,
                invoiceNumber: trx.invoiceNumber || inv.invoiceNumber,
                customerName: (trx as any).customerName || inv.customer.name,
                amount: trx.amount,
                method: trx.paymentMethod,
                verifiedAt: trx.verifiedAt
              });
            }
          }
        } else if (inv.status === 'paid' && (inv.paidAmount || inv.totalAmount) > 0) {
          const invDate = new Date(inv.date || inv.updatedAt || inv.createdAt);
          if (
            invDate.getDate() === dayNum &&
            invDate.getMonth() === currentMonthIdx &&
            invDate.getFullYear() === currentYear
          ) {
            txCount++;
            matchingTxs.push({
              id: `paid-${inv.id}`,
              invoiceId: inv.id,
              invoiceNumber: inv.invoiceNumber,
              customerName: inv.customer.name,
              amount: inv.paidAmount || inv.totalAmount,
              method: 'qris_dinamis',
              verifiedAt: inv.updatedAt || inv.date
            });
          }
        }
      }

      const txSum = matchingTxs.reduce((sum, tx) => sum + tx.amount, 0);
      const effectiveRevenue = txSum > 0 ? txSum : item.revenue;

      return {
        ...item,
        revenue: effectiveRevenue,
        dayNum,
        isToday,
        txCount,
        matchingTxs
      };
    });
  }, [baseDailyData, invoices, currentDay, currentMonthIdx, currentYear]);

  const filteredDailyData = useMemo(() => {
    if (showOnlyActiveDays) {
      return enrichedDailyData.filter((d) => d.revenue > 0);
    }
    return enrichedDailyData;
  }, [enrichedDailyData, showOnlyActiveDays]);

  const dailyStats = useMemo(() => {
    const total = enrichedDailyData.reduce((acc, curr) => acc + curr.revenue, 0);
    const activeDaysCount = enrichedDailyData.filter((d) => d.revenue > 0).length;
    const avgAll = enrichedDailyData.length > 0 ? Math.round(total / enrichedDailyData.length) : 0;
    const avgActive = activeDaysCount > 0 ? Math.round(total / activeDaysCount) : 0;

    let peakDay = { day: '-', revenue: 0, dayNum: 0 };
    for (const d of enrichedDailyData) {
      if (d.revenue > peakDay.revenue) {
        peakDay = { day: d.day, revenue: d.revenue, dayNum: d.dayNum };
      }
    }

    const todayRecord = enrichedDailyData.find((d) => d.dayNum === currentDay);
    const todayRev = todayRecord ? todayRecord.revenue : 0;

    return {
      total,
      activeDaysCount,
      totalDays: enrichedDailyData.length,
      avgAll,
      avgActive,
      peakDay,
      todayRev
    };
  }, [enrichedDailyData, currentDay]);

  // Monthly Data Calculations
  const enrichedMonthlyData = useMemo(() => {
    return baseMonthlyData.map((item, index) => {
      // Calculate live revenue and invoice count from invoices for this month
      let liveRevenue = 0;
      let liveInvoiceCount = 0;
      for (const inv of invoices) {
        if (inv.transactions && inv.transactions.length > 0) {
          for (const trx of inv.transactions) {
            const tDate = new Date(trx.verifiedAt);
            const mLabel = tDate.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
            if (mLabel.toLowerCase() === item.label.toLowerCase()) {
              liveRevenue += trx.amount;
            }
          }
        } else if (inv.status === 'paid' && (inv.paidAmount || inv.totalAmount) > 0) {
          const invDate = new Date(inv.date || inv.updatedAt || inv.createdAt);
          const mLabel = invDate.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
          if (mLabel.toLowerCase() === item.label.toLowerCase()) {
            liveRevenue += (inv.paidAmount || inv.totalAmount);
          }
        }
        if (inv.status === 'paid') {
          const invDate = new Date(inv.date || inv.updatedAt || inv.createdAt);
          const mLabel = invDate.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
          if (mLabel.toLowerCase() === item.label.toLowerCase()) {
            liveInvoiceCount++;
          }
        }
      }

      const effectiveRev = liveRevenue > 0 ? liveRevenue : item.revenue;
      const effectiveCount = liveInvoiceCount > 0 ? liveInvoiceCount : (item.invoiceCount || 0);

      const prevMonth = index > 0 ? baseMonthlyData[index - 1] : null;
      let momGrowth = 0;
      if (prevMonth && prevMonth.revenue > 0) {
        momGrowth = Math.round(((effectiveRev - prevMonth.revenue) / prevMonth.revenue) * 100);
      }

      return {
        ...item,
        revenue: effectiveRev,
        invoiceCount: effectiveCount,
        momGrowth,
        isCurrentMonth: index === baseMonthlyData.length - 1
      };
    });
  }, [baseMonthlyData, invoices]);

  const monthlyStats = useMemo(() => {
    const total = enrichedMonthlyData.reduce((acc, curr) => acc + curr.revenue, 0);
    const totalInvoices = enrichedMonthlyData.reduce((acc, curr) => acc + (curr.invoiceCount || 0), 0);
    const avgMonthly = enrichedMonthlyData.length > 0 ? Math.round(total / enrichedMonthlyData.length) : 0;

    let peakMonth = { label: '-', revenue: 0, invoiceCount: 0 };
    for (const m of enrichedMonthlyData) {
      if (m.revenue > peakMonth.revenue) {
        peakMonth = { label: m.label, revenue: m.revenue, invoiceCount: m.invoiceCount };
      }
    }

    const currentMonthData = enrichedMonthlyData[enrichedMonthlyData.length - 1] || { revenue: 0, momGrowth: 0 };
    const prevMonthData = enrichedMonthlyData.length > 1 ? enrichedMonthlyData[enrichedMonthlyData.length - 2] : null;

    let latestGrowth = 0;
    if (prevMonthData && prevMonthData.revenue > 0) {
      latestGrowth = Math.round(((currentMonthData.revenue - prevMonthData.revenue) / prevMonthData.revenue) * 100);
    }

    return {
      total,
      totalInvoices,
      avgMonthly,
      peakMonth,
      currentMonthRev: currentMonthData.revenue,
      latestGrowth
    };
  }, [enrichedMonthlyData]);

  // Matching transactions for the selected bar (Drill-Down)
  const selectedTransactions = useMemo(() => {
    if (!selectedBar) return [];

    if (selectedBar.type === 'daily' && selectedBar.dayNum) {
      const dayData = enrichedDailyData.find((d) => d.dayNum === selectedBar.dayNum);
      return dayData ? dayData.matchingTxs : [];
    }

    if (selectedBar.type === 'monthly') {
      // Find invoices verified in this month
      const list: any[] = [];
      for (const inv of invoices) {
        if (inv.transactions && inv.transactions.length > 0) {
          for (const trx of inv.transactions) {
            const tDate = new Date(trx.verifiedAt);
            const mLabel = tDate.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
            if (mLabel.toLowerCase() === selectedBar.label.toLowerCase()) {
              list.push({
                id: trx.id,
                invoiceId: trx.invoiceId || inv.id,
                invoiceNumber: trx.invoiceNumber || inv.invoiceNumber,
                customerName: (trx as any).customerName || inv.customer.name,
                amount: trx.amount,
                method: trx.paymentMethod,
                verifiedAt: trx.verifiedAt
              });
            }
          }
        } else if (inv.status === 'paid' && (inv.paidAmount || inv.totalAmount) > 0) {
          const invDate = new Date(inv.date || inv.updatedAt || inv.createdAt);
          const mLabel = invDate.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
          if (mLabel.toLowerCase() === selectedBar.label.toLowerCase()) {
            list.push({
              id: `paid-${inv.id}`,
              invoiceId: inv.id,
              invoiceNumber: inv.invoiceNumber,
              customerName: inv.customer.name,
              amount: inv.paidAmount || inv.totalAmount,
              method: 'qris_dinamis',
              verifiedAt: inv.updatedAt || inv.date
            });
          }
        }
      }
      return list;
    }

    return [];
  }, [selectedBar, enrichedDailyData, invoices]);

  // Custom Tooltip for Daily Chart
  const DailyTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isPeak = data.revenue === dailyStats.peakDay.revenue && data.revenue > 0;
      const isAboveAvg = data.revenue > dailyStats.avgAll;
      const pctOfTotal = dailyStats.total > 0 ? ((data.revenue / dailyStats.total) * 100).toFixed(1) : '0';

      return (
        <div className="rounded-2xl border border-slate-200 bg-white/95 p-3.5 shadow-xl backdrop-blur-md min-w-[210px]">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>{label}</span>
            </span>
            {data.isToday && (
              <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-blue-100 text-blue-800">
                Hari Ini
              </span>
            )}
            {isPeak && !data.isToday && (
              <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-100 text-emerald-800">
                Tertinggi 🏆
              </span>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <span className="text-[11px] text-slate-500">Pendapatan:</span>
              <span className="text-sm font-black text-blue-600">
                {formatRupiah(data.revenue)}
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Kontribusi:</span>
              <span className="font-semibold text-slate-700">{pctOfTotal}% bln ini</span>
            </div>

            {data.txCount > 0 && (
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Transaksi:</span>
                <span className="font-bold text-emerald-600">{data.txCount} pembayaran</span>
              </div>
            )}

            <div className="pt-1.5 mt-1 border-t border-slate-100 flex items-center justify-between text-[10px]">
              <span className="text-slate-400">Status:</span>
              <span
                className={`font-bold ${
                  data.revenue === 0
                    ? 'text-slate-400'
                    : isAboveAvg
                    ? 'text-emerald-600'
                    : 'text-amber-600'
                }`}
              >
                {data.revenue === 0
                  ? 'Belum Ada Transaksi'
                  : isAboveAvg
                  ? 'Di Atas Rata-rata (+)'
                  : 'Di Bawah Rata-rata (-)'}
              </span>
            </div>
          </div>

          <p className="mt-2 text-[9px] text-slate-400 text-center italic">
            Klik bar untuk melihat rincian transaksi
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom Tooltip for Monthly Chart
  const MonthlyTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isPeak = data.revenue === monthlyStats.peakMonth.revenue && data.revenue > 0;
      const isAboveAvg = data.revenue > monthlyStats.avgMonthly;

      return (
        <div className="rounded-2xl border border-slate-200 bg-white/95 p-3.5 shadow-xl backdrop-blur-md min-w-[220px]">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
              <span>{label}</span>
            </span>
            {data.isCurrentMonth && (
              <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-indigo-100 text-indigo-800">
                Bulan Ini
              </span>
            )}
            {isPeak && !data.isCurrentMonth && (
              <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-100 text-emerald-800">
                Puncak 🏆
              </span>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <span className="text-[11px] text-slate-500">Pemasukan:</span>
              <span className="text-sm font-black text-indigo-600">
                {formatRupiah(data.revenue)}
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Invoice Terbayar:</span>
              <span className="font-bold text-slate-700">{data.invoiceCount || 0} invoice</span>
            </div>

            {data.momGrowth !== undefined && data.momGrowth !== 0 && (
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Pertumbuhan (MoM):</span>
                <span
                  className={`font-bold inline-flex items-center gap-0.5 ${
                    data.momGrowth > 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {data.momGrowth > 0 ? '+' : ''}
                  {data.momGrowth}%
                </span>
              </div>
            )}

            <div className="pt-1.5 mt-1 border-t border-slate-100 flex items-center justify-between text-[10px]">
              <span className="text-slate-400">Kinerja:</span>
              <span
                className={`font-bold ${
                  isAboveAvg ? 'text-emerald-600' : 'text-slate-500'
                }`}
              >
                {isAboveAvg ? 'Di Atas Rata-rata 6 Bln' : 'Di Bawah Rata-rata'}
              </span>
            </div>
          </div>

          <p className="mt-2 text-[9px] text-slate-400 text-center italic">
            Klik bar untuk melihat riwayat pembayaran
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                Visualisasi Tren Pendapatan (Grafik Batang)
              </h3>
              <p className="text-xs text-slate-500">
                Analisis perbandingan penerimaan kas harian & bulanan berbasis Recharts interaktif
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls: Mode Switcher & Toggles */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Mode Tabs */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200/80">
            <button
              id="chart-tab-daily-btn"
              onClick={() => {
                setViewMode('daily');
                setSelectedBar(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                viewMode === 'daily'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Harian (Bulan Ini)</span>
            </button>

            <button
              id="chart-tab-monthly-btn"
              onClick={() => {
                setViewMode('monthly');
                setSelectedBar(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                viewMode === 'monthly'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Bulanan (6 Bulan)</span>
            </button>

            <button
              id="chart-tab-both-btn"
              onClick={() => {
                setViewMode('both');
                setSelectedBar(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                viewMode === 'both'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Dua Tampilan</span>
            </button>
          </div>

          {/* Reference Line Toggle */}
          <button
            onClick={() => setShowAverageLine(!showAverageLine)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition ${
              showAverageLine
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-slate-50 text-slate-600 border-slate-200'
            }`}
            title="Tampilkan garis rata-rata pendapatan sebagai tolok ukur"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600" />
            <span>Garis Rata-rata: {showAverageLine ? 'ON' : 'OFF'}</span>
          </button>

          {/* Contextual Filter */}
          {viewMode === 'daily' && (
            <button
              onClick={() => setShowOnlyActiveDays(!showOnlyActiveDays)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition ${
                showOnlyActiveDays
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}
              title="Saring tanggal agar hanya menampilkan hari yang memiliki transaksi"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>{showOnlyActiveDays ? 'Hanya Hari Aktif' : 'Semua Tanggal'}</span>
            </button>
          )}

          {viewMode === 'monthly' && (
            <button
              onClick={() => setShowInvoiceCountBar(!showInvoiceCountBar)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition ${
                showInvoiceCountBar
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}
              title="Tampilkan batang volume jumlah transaksi/invoice terbayar"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Jumlah Invoice: {showInvoiceCountBar ? 'ON' : 'OFF'}</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Informative Metric Strips */}
      {viewMode === 'daily' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-100">
            <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block">
              Total Pemasukan Bulan Ini
            </span>
            <span className="text-lg sm:text-xl font-black text-slate-900 mt-1 block">
              {formatRupiah(dailyStats.total)}
            </span>
            <span className="text-[10px] text-blue-600 mt-0.5 block">
              {dailyStats.activeDaysCount} dari {dailyStats.totalDays} hari bertransaksi
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
              Rata-rata Harian
            </span>
            <span className="text-lg sm:text-xl font-black text-slate-900 mt-1 block">
              {formatRupiah(dailyStats.avgAll)}
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5 block">
              Aktif: {formatRupiah(dailyStats.avgActive)} / hari
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-100">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                Hari Puncak Tertinggi
              </span>
              <Award className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <span className="text-lg sm:text-xl font-black text-emerald-900 mt-1 block">
              {formatRupiah(dailyStats.peakDay.revenue)}
            </span>
            <span className="text-[10px] font-semibold text-emerald-700 mt-0.5 block">
              {dailyStats.peakDay.day}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100">
            <span className="text-[11px] font-bold text-indigo-800 uppercase tracking-wider block">
              Pemasukan Hari Ini
            </span>
            <span className="text-lg sm:text-xl font-black text-indigo-950 mt-1 block">
              {formatRupiah(dailyStats.todayRev)}
            </span>
            <span className="text-[10px] text-indigo-600 mt-0.5 block">
              Tanggal {currentDay} (Real-time)
            </span>
          </div>
        </div>
      )}

      {viewMode === 'monthly' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100">
            <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider block">
              Total 6 Bulan Terakhir
            </span>
            <span className="text-lg sm:text-xl font-black text-slate-900 mt-1 block">
              {formatRupiah(monthlyStats.total)}
            </span>
            <span className="text-[10px] text-indigo-600 mt-0.5 block">
              {monthlyStats.totalInvoices} total invoice berhasil ditagih
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
              Rata-rata Bulanan
            </span>
            <span className="text-lg sm:text-xl font-black text-slate-900 mt-1 block">
              {formatRupiah(monthlyStats.avgMonthly)}
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5 block">
              Tolok ukur target bulanan
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-100">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                Bulan Tertinggi (Puncak)
              </span>
              <Award className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <span className="text-lg sm:text-xl font-black text-emerald-900 mt-1 block">
              {formatRupiah(monthlyStats.peakMonth.revenue)}
            </span>
            <span className="text-[10px] font-semibold text-emerald-700 mt-0.5 block">
              {monthlyStats.peakMonth.label} ({monthlyStats.peakMonth.invoiceCount} inv)
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-100">
            <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider block">
              Tren Pertumbuhan (MoM)
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-lg sm:text-xl font-black text-slate-900">
                {monthlyStats.latestGrowth > 0 ? `+${monthlyStats.latestGrowth}%` : `${monthlyStats.latestGrowth}%`}
              </span>
              {monthlyStats.latestGrowth >= 0 ? (
                <ArrowUpRight className="w-5 h-5 text-emerald-600" />
              ) : (
                <ArrowDownRight className="w-5 h-5 text-rose-600" />
              )}
            </div>
            <span className="text-[10px] text-blue-600 mt-0.5 block">
              Bulan ini dibanding bulan sebelumnya
            </span>
          </div>
        </div>
      )}

      {/* Informative Tip when no transactions yet */}
      {dailyStats.total === 0 && monthlyStats.total === 0 && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80 text-blue-900 text-xs">
          <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
          <div className="space-y-0.5">
            <p className="font-bold text-blue-950">
              Sistem Analitik Recharts Siap Merekam Pemasukan Real-time
            </p>
            <p className="text-blue-800 leading-relaxed">
              Saat ini belum tercatat riwayat pembayaran lunas. Setiap transaksi yang terverifikasi (via QRIS Dinamis DANA/BCA/BRI atau verifikasi manual invoice) akan otomatis membentuk grafik batang visual harian dan tren bulanan secara instan.
            </p>
          </div>
        </div>
      )}

      {/* Chart Canvas Area */}
      {viewMode === 'daily' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span className="font-semibold text-slate-700 flex items-center gap-2">
              <span>Distribusi Pendapatan Harian</span>
              <span className="text-[11px] font-normal text-slate-400">
                (Klik batang untuk membedah data invoice)
              </span>
            </span>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-600" />
                <span>Normal</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                <span>Puncak</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
                <span>Terpilih</span>
              </span>
            </div>
          </div>

          <div className="h-80 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={filteredDailyData}
                margin={{ top: 15, right: 15, left: 0, bottom: 25 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload[0]) {
                    const d = e.activePayload[0].payload;
                    setSelectedBar({
                      type: 'daily',
                      label: d.day,
                      revenue: d.revenue,
                      count: d.txCount,
                      dayNum: d.dayNum
                    });
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  interval={filteredDailyData.length > 20 ? 2 : 0}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={false}
                  angle={-35}
                  textAnchor="end"
                  height={40}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={formatAxisCurrency}
                />
                <Tooltip content={<DailyTooltip />} />

                {showAverageLine && dailyStats.avgAll > 0 && (
                  <ReferenceLine
                    y={dailyStats.avgAll}
                    stroke="#f59e0b"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{
                      value: `Rata-rata: Rp ${(dailyStats.avgAll / 1000).toFixed(0)}k`,
                      position: 'top',
                      fill: '#b45309',
                      fontSize: 10,
                      fontWeight: 'bold'
                    }}
                  />
                )}

                <Bar
                  dataKey="revenue"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={32}
                  cursor="pointer"
                >
                  {filteredDailyData.map((entry) => {
                    const isSelected =
                      selectedBar?.type === 'daily' && selectedBar?.dayNum === entry.dayNum;
                    const isPeak =
                      entry.revenue === dailyStats.peakDay.revenue && entry.revenue > 0;

                    let barColor = '#3b82f6'; // default blue
                    if (isSelected) {
                      barColor = '#f59e0b'; // amber
                    } else if (isPeak) {
                      barColor = '#10b981'; // emerald
                    } else if (entry.isToday) {
                      barColor = '#2563eb'; // dark vibrant blue
                    } else if (entry.revenue === 0) {
                      barColor = '#e2e8f0'; // light gray
                    }

                    return (
                      <Cell
                        key={`cell-${entry.dayNum}`}
                        fill={barColor}
                        className="transition-all duration-200 hover:opacity-85"
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {viewMode === 'monthly' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span className="font-semibold text-slate-700 flex items-center gap-2">
              <span>Tren Historis 6 Bulan Terakhir</span>
              <span className="text-[11px] font-normal text-slate-400">
                (Klik batang bulan untuk melihat daftar pelunasan)
              </span>
            </span>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-indigo-600" />
                <span>Pendapatan (IDR)</span>
              </span>
              {showInvoiceCountBar && (
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                  <span>Jml Invoice</span>
                </span>
              )}
            </div>
          </div>

          <div className="h-80 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={enrichedMonthlyData}
                margin={{ top: 20, right: 20, left: 0, bottom: 10 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload[0]) {
                    const m = e.activePayload[0].payload;
                    setSelectedBar({
                      type: 'monthly',
                      label: m.label,
                      revenue: m.revenue,
                      count: m.invoiceCount
                    });
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={formatAxisCurrency}
                />
                {showInvoiceCountBar && (
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 10, fill: '#10b981' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => `${val} inv`}
                  />
                )}
                <Tooltip content={<MonthlyTooltip />} />

                {showAverageLine && monthlyStats.avgMonthly > 0 && (
                  <ReferenceLine
                    yAxisId="left"
                    y={monthlyStats.avgMonthly}
                    stroke="#f59e0b"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{
                      value: `Rata-rata: Rp ${(monthlyStats.avgMonthly / 1000000).toFixed(2)} jt`,
                      position: 'top',
                      fill: '#b45309',
                      fontSize: 10,
                      fontWeight: 'bold'
                    }}
                  />
                )}

                <Bar
                  yAxisId="left"
                  dataKey="revenue"
                  name="Pendapatan (IDR)"
                  radius={[8, 8, 0, 0]}
                  maxBarSize={48}
                  cursor="pointer"
                >
                  {enrichedMonthlyData.map((entry) => {
                    const isSelected =
                      selectedBar?.type === 'monthly' && selectedBar?.label === entry.label;
                    const isPeak =
                      entry.revenue === monthlyStats.peakMonth.revenue && entry.revenue > 0;

                    let barColor = '#4f46e5'; // default indigo
                    if (isSelected) {
                      barColor = '#f59e0b'; // amber
                    } else if (isPeak) {
                      barColor = '#059669'; // emerald
                    }

                    return (
                      <Cell
                        key={`month-cell-${entry.label}`}
                        fill={barColor}
                        className="transition-all duration-200 hover:opacity-90"
                      />
                    );
                  })}
                </Bar>

                {showInvoiceCountBar && (
                  <Bar
                    yAxisId="right"
                    dataKey="invoiceCount"
                    name="Jumlah Invoice Lunas"
                    fill="#10b981"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={24}
                    cursor="pointer"
                  />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Side-by-Side Dual View */}
      {viewMode === 'both' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
          {/* Daily Sub-Chart */}
          <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50/50 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-extrabold text-slate-900">
                  Pemasukan Harian (Bulan Ini)
                </h4>
                <p className="text-[11px] text-slate-500">
                  Total: {formatRupiah(dailyStats.total)} • Rata-rata: {formatRupiah(dailyStats.avgAll)}/hari
                </p>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                Harian
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredDailyData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 9, fill: '#64748b' }}
                    interval={3}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 9, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={formatAxisCurrency}
                  />
                  <Tooltip content={<DailyTooltip />} />
                  <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monthly Sub-Chart */}
          <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50/50 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-extrabold text-slate-900">
                  Tren Pemasukan Bulanan (6 Bulan)
                </h4>
                <p className="text-[11px] text-slate-500">
                  Total: {formatRupiah(monthlyStats.total)} • Rata-rata: {formatRupiah(monthlyStats.avgMonthly)}/bln
                </p>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                Bulanan
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={enrichedMonthlyData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 9, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={formatAxisCurrency}
                  />
                  <Tooltip content={<MonthlyTooltip />} />
                  <Bar dataKey="revenue" fill="#4f46e5" radius={[6, 6, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Drill-down details when a bar is selected */}
      {selectedBar && (
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/40 p-5 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-amber-200">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500 text-white shadow-xs">
                <Info className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-900">
                  Rincian Penerimaan Kas: {selectedBar.label}
                </h4>
                <p className="text-xs text-slate-600">
                  Total terkumpul: <span className="font-extrabold text-amber-900">{formatRupiah(selectedBar.revenue)}</span>
                  {selectedBar.count !== undefined ? ` • ${selectedBar.count} transaksi` : ''}
                </p>
              </div>
            </div>

            <button
              onClick={() => setSelectedBar(null)}
              className="p-1.5 rounded-xl hover:bg-amber-100 text-slate-500 hover:text-slate-800 transition"
              title="Tutup rincian"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {selectedTransactions.length === 0 ? (
            <div className="py-4 text-center text-xs text-slate-500">
              Tidak ada riwayat rincian pembayaran langsung yang tercatat pada {selectedBar.label}.
            </div>
          ) : (
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                Daftar Pembayaran Masuk Terverifikasi:
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {selectedTransactions.map((trx, idx) => (
                  <div
                    key={trx.id || idx}
                    className="p-3 rounded-xl bg-white border border-amber-200 flex items-center justify-between shadow-2xs hover:border-amber-400 transition"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900">
                          {trx.invoiceNumber}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-700 uppercase">
                          {trx.method?.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 truncate mt-0.5">
                        {trx.customerName}
                      </p>
                      <span className="text-[9px] text-slate-400">
                        {formatDateTimeIndo(trx.verifiedAt)}
                      </span>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-extrabold text-emerald-600 block">
                        +{formatRupiah(trx.amount)}
                      </span>
                      {onSelectInvoice && (
                        <button
                          onClick={() => onSelectInvoice(trx.invoiceId)}
                          className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-800"
                        >
                          <span>Buka</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
