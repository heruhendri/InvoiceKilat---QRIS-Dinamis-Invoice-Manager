import React, { useMemo } from 'react';
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
  Sparkles
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  AreaChart, 
  Area, 
  CartesianGrid 
} from 'recharts';
import { AnalyticsSummary, Invoice } from '../types';
import { formatRupiah, formatDateTimeIndo, formatDateIndo } from '../utils/formatters';

interface AnalyticsDashboardProps {
  analytics: AnalyticsSummary | null;
  invoices: Invoice[];
  onSelectInvoice: (id: string) => void;
  onOpenCreateInvoice: () => void;
  onTriggerCheckReminders: () => void;
  isCheckingReminders: boolean;
  onOpenGallery?: () => void;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  analytics,
  invoices,
  onSelectInvoice,
  onOpenCreateInvoice,
  onTriggerCheckReminders,
  isCheckingReminders,
  onOpenGallery,
}) => {
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
    livePendingCount,
    livePaidCount,
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
        livePendingCount: summary?.invoiceCounts?.pending ?? 0,
        livePaidCount: summary?.invoiceCounts?.paid ?? 0,
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
    let outstandingAmt = 0;
    let pendingCnt = 0;
    let paidCnt = 0;
    let revMonth = 0;
    let revToday = 0;

    for (const inv of invoices) {
      const unpaid = Math.max(0, inv.totalAmount - (inv.paidAmount || 0));
      const isOverdue = inv.status === 'overdue' || (unpaid > 0 && inv.dueDate < todayStr);

      if (isOverdue) {
        overdueList.push(inv);
        overdueAmt += unpaid;
      }

      if (inv.status === 'paid') {
        paidCnt++;
      } else {
        outstandingAmt += unpaid;
        if (!isOverdue) {
          pendingCnt++;
        }
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
      } else if (inv.status === 'paid' && inv.paidAmount > 0) {
        const invDate = new Date(inv.date);
        if (invDate.getFullYear() === currentYear && invDate.getMonth() === currentMonth) {
          revMonth += inv.paidAmount;
        }
      }
    }

    const rate = invoices.length > 0 ? Math.round((paidCnt / invoices.length) * 100) : 0;

    return {
      liveOverdueInvoices: overdueList,
      liveTotalOverdueAmount: overdueAmt,
      liveOverdueCount: overdueList.length,
      liveTotalOutstanding: outstandingAmt,
      livePendingCount: pendingCnt,
      livePaidCount: paidCnt,
      liveTotalRevenueThisMonth: revMonth > 0 ? revMonth : (summary?.totalRevenueThisMonth ?? 0),
      liveTotalRevenueToday: revToday,
      liveCollectionRate: rate,
    };
  }, [invoices, summary, todayStr]);

  // Custom Tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur-xs">
          <p className="text-xs font-semibold text-slate-600">{label}</p>
          <p className="text-sm font-bold text-blue-600">
            {formatRupiah(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Top Banner Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 text-white shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/30 text-blue-200 text-xs font-semibold uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-300" />
              Sistem Invoice & QRIS Otomatis
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Dashboard Keuangan & Pemasukan
          </h1>
          <p className="text-sm text-slate-300 mt-1 max-w-2xl">
            Pantau pemasukan harian, bulanan, piutang jatuh tempo, dan riwayat pembayaran QRIS Dinamis secara real-time antar perangkat.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {onOpenGallery && (
            <button
              id="dash-open-gallery-btn"
              onClick={onOpenGallery}
              className="flex items-center gap-1.5 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 border border-amber-300/40 px-3.5 py-2.5 text-xs font-bold text-amber-200 transition active:scale-95"
              title="Lihat screenshot tampilan fitur aplikasi"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Screenshot Fitur</span>
            </button>
          )}

          <button
            id="run-reminders-check-btn"
            onClick={onTriggerCheckReminders}
            disabled={isCheckingReminders}
            className="flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2.5 text-xs font-semibold text-white transition active:scale-95 disabled:opacity-50"
            title="Cek otomatis tanggal jatuh tempo & kirim email tagihan"
          >
            <Clock className={`w-4 h-4 text-amber-300 ${isCheckingReminders ? 'animate-spin' : ''}`} />
            <span>{isCheckingReminders ? 'Mengecek...' : 'Cek Email Tagihan (H-3 & Overdue)'}</span>
          </button>

          <button
            id="create-invoice-dash-btn"
            onClick={onOpenCreateInvoice}
            className="flex items-center gap-1.5 rounded-xl bg-blue-500 hover:bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-500/30 transition active:scale-95"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Buat Invoice Baru</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Pemasukan Bulan Ini */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Pemasukan Bulan Ini
            </span>
            <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold tracking-tight text-slate-900">
              {formatRupiah(liveTotalRevenueThisMonth)}
            </span>
            <div className="mt-1 flex items-center gap-1 text-xs text-emerald-600 font-medium">
              <span>Hari ini:</span>
              <span className="font-bold">{formatRupiah(liveTotalRevenueToday)}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Total Piutang Belum Dibayar */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Piutang Belum Lunas
            </span>
            <div className="rounded-xl bg-amber-50 p-2.5 text-amber-600">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold tracking-tight text-slate-900">
              {formatRupiah(liveTotalOutstanding)}
            </span>
            <div className="mt-1 text-xs text-slate-500">
              Menunggu pembayaran ({livePendingCount} invoice)
            </div>
          </div>
        </div>

        {/* Card 3: Tagihan Jatuh Tempo (Overdue) - Sesuai dengan invoice saat ini */}
        <div 
          id="kpi-card-overdue"
          className={`rounded-2xl border p-5 shadow-xs transition flex flex-col justify-between ${
            liveOverdueCount > 0 
              ? 'border-rose-200 bg-rose-50/25 hover:border-rose-300 hover:shadow-md' 
              : 'border-slate-200/80 bg-white hover:shadow-md'
          }`}
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Tagihan Overdue / Lewat Tempo
              </span>
              <div className={`rounded-xl p-2.5 ${liveOverdueCount > 0 ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-400'}`}>
                <AlertCircle className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className={`text-2xl font-extrabold tracking-tight ${liveOverdueCount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                {formatRupiah(liveTotalOverdueAmount)}
              </span>
              <div className="mt-1 text-xs font-medium text-slate-600">
                <span className={liveOverdueCount > 0 ? 'text-rose-600 font-semibold' : 'text-slate-500'}>
                  {liveOverdueCount > 0 ? `${liveOverdueCount} invoice perlu penagihan segera` : 'Semua invoice tepat waktu (0 invoice)'}
                </span>
              </div>
            </div>
          </div>

          {/* Rincian invoice yang saat ini sedang overdue */}
          {liveOverdueInvoices.length > 0 && (
            <div className="mt-3 pt-3 border-t border-rose-100/90 space-y-2">
              <div className="bg-white/90 rounded-xl p-2.5 border border-rose-200/80 text-[11px] shadow-2xs">
                <div className="flex items-center justify-between font-bold text-slate-900">
                  <span className="text-rose-700 font-black">{liveOverdueInvoices[0].invoiceNumber}</span>
                  <span className="text-rose-600 font-semibold text-[10px] bg-rose-50 px-1.5 py-0.5 rounded-md border border-rose-200">
                    Tempo: {formatDateIndo(liveOverdueInvoices[0].dueDate)}
                  </span>
                </div>
                <p className="text-slate-600 truncate mt-1 font-medium">
                  {liveOverdueInvoices[0].customer.name}
                  {liveOverdueInvoices[0].customer.company ? ` • ${liveOverdueInvoices[0].customer.company}` : ''}
                </p>
                <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500">
                  <span>Sisa tagihan:</span>
                  <span className="font-extrabold text-rose-600">
                    {formatRupiah(Math.max(0, liveOverdueInvoices[0].totalAmount - (liveOverdueInvoices[0].paidAmount || 0)))}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onSelectInvoice(liveOverdueInvoices[0].id)}
                className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold py-2 px-3 transition active:scale-95 shadow-xs"
                title="Buka rincian invoice yang jatuh tempo"
              >
                <span>Buka Invoice Menunggak</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Card 4: Total Pemasukan Akumulatif */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Tingkat Pembayaran (Lunas)
            </span>
            <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold tracking-tight text-slate-900">
              {liveCollectionRate}%
            </span>
            <span className="text-xs font-medium text-slate-500">
              {livePaidCount} dari {invoices.length || summary.invoiceCounts.total} invoice
            </span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div 
              className="h-full rounded-full bg-blue-600 transition-all duration-500"
              style={{ width: `${liveCollectionRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Visual Charts Section: Daily & Monthly Revenue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Daily Revenue (Pemasukan Harian Bulan Ini) */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Pemasukan Harian (Bulan Ini)
              </h3>
              <p className="text-xs text-slate-500">
                Grafik visual penerimaan pembayaran setiap hari
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>Bulan Berjalan</span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="day" 
                  tick={{ fontSize: 10, fill: '#64748b' }} 
                  interval={3}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: '#64748b' }} 
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => `Rp ${(val / 1000000).toFixed(1)}jt`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="revenue" 
                  fill="#2563eb" 
                  radius={[6, 6, 0, 0]} 
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Monthly Revenue Trend (Pemasukan Bulanan) */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Tren Pemasukan Bulanan
              </h3>
              <p className="text-xs text-slate-500">
                Perbandingan pendapatan 6 bulan terakhir
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              <span>6 Bulan Terakhir</span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="label" 
                  tick={{ fontSize: 10, fill: '#64748b' }} 
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: '#64748b' }} 
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => `Rp ${(val / 1000000).toFixed(1)}jt`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#4f46e5" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#colorRevenue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Section: Recent Real-Time Transactions & Priority Invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Riwayat Pembayaran Masuk Real-Time */}
        <div className="lg:col-span-2 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Riwayat Transaksi Pembayaran Masuk</span>
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
              </h3>
              <p className="text-xs text-slate-500">
                Setiap pembayaran yang masuk diverifikasi dan otomatis tercatat di sini
              </p>
            </div>
            <span className="text-xs font-semibold text-blue-600">
              {recentTransactions.length} Transaksi Terakhir
            </span>
          </div>

          <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100">
            {recentTransactions.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Belum ada pembayaran yang tercatat.</p>
              </div>
            ) : (
              recentTransactions.map((trx) => (
                <div 
                  key={trx.id}
                  className="flex items-center justify-between p-4 hover:bg-slate-50/80 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">
                          {trx.invoiceNumber}
                        </span>
                        <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 uppercase">
                          {trx.paymentMethod.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {trx.customerName} • <span className="font-mono">{trx.referenceNumber}</span>
                      </p>
                      <span className="text-[10px] text-slate-400">
                        {formatDateTimeIndo(trx.verifiedAt)}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-extrabold text-emerald-600">
                      +{formatRupiah(trx.amount)}
                    </span>
                    <button
                      onClick={() => onSelectInvoice(trx.invoiceId)}
                      className="mt-1 flex items-center justify-end gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
                    >
                      <span>Lihat</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right 1 Col: Status Piutang & Overdue Quick View */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Status Tagihan Pelanggan
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Ringkasan status seluruh invoice saat ini
            </p>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50/70 border border-emerald-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-xs font-semibold text-emerald-900">Invoice Lunas</span>
                </div>
                <span className="text-sm font-bold text-emerald-700">
                  {summary.invoiceCounts.paid}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-50/70 border border-amber-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <span className="text-xs font-semibold text-amber-900">Menunggu Pembayaran</span>
                </div>
                <span className="text-sm font-bold text-amber-700">
                  {summary.invoiceCounts.pending}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-rose-50/70 border border-rose-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-full bg-rose-500" />
                  <span className="text-xs font-semibold text-rose-900">Melewati Jatuh Tempo</span>
                </div>
                <span className="text-sm font-bold text-rose-700">
                  {summary.invoiceCounts.overdue}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="rounded-2xl bg-blue-50 p-4 border border-blue-100">
              <div className="flex items-start gap-3">
                <Share2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-blue-900">
                    Otomasi WhatsApp & Email
                  </h4>
                  <p className="text-[11px] text-blue-700 mt-0.5 leading-relaxed">
                    Setiap pembayaran terverifikasi otomatis menyiapkan pesan terima kasih WhatsApp resmi beserta tautan invoice.
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
