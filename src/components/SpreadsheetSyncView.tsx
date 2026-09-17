import React, { useState } from 'react';
import { 
  TableProperties, 
  RefreshCw, 
  CheckCircle2, 
  ExternalLink, 
  Download, 
  FileSpreadsheet, 
  Link, 
  Copy, 
  Check, 
  Radio, 
  AlertCircle 
} from 'lucide-react';
import { Invoice, BusinessSettings } from '../types';
import { formatRupiah, formatDateIndo, formatDateTimeIndo } from '../utils/formatters';

interface SpreadsheetSyncViewProps {
  invoices: Invoice[];
  settings: BusinessSettings | null;
  onTriggerSync: () => void;
  isSyncing: boolean;
  onSelectInvoice: (id: string) => void;
}

export const SpreadsheetSyncView: React.FC<SpreadsheetSyncViewProps> = ({
  invoices,
  settings,
  onTriggerSync,
  isSyncing,
  onSelectInvoice,
}) => {
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const webhookUrl = `${window.location.origin}/api/spreadsheet/sync-webhook`;

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  // Export current table as CSV for direct Google Sheets / Excel import
  const handleExportCSV = () => {
    const headers = [
      'No Invoice',
      'Tanggal',
      'Jatuh Tempo',
      'Nama Pelanggan',
      'Perusahaan',
      'WhatsApp',
      'Email',
      'Subtotal',
      'PPN',
      'Total',
      'Dibayar',
      'Status',
      'Metode Bayar',
      'Ref Transaksi',
    ];

    const rows = invoices.map((inv) => {
      const lastTrx = inv.transactions[inv.transactions.length - 1];
      return [
        `"${inv.invoiceNumber}"`,
        `"${inv.date}"`,
        `"${inv.dueDate}"`,
        `"${inv.customer.name}"`,
        `"${inv.customer.company || '-'}"`,
        `"${inv.customer.phone}"`,
        `"${inv.customer.email || '-'}"`,
        inv.subtotal,
        inv.taxAmount,
        inv.totalAmount,
        inv.paidAmount,
        `"${inv.status.toUpperCase()}"`,
        `"${lastTrx?.paymentMethod || '-'}"`,
        `"${lastTrx?.referenceNumber || '-'}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `InvoiceKilat_GoogleSheets_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const syncedCount = invoices.filter((i) => i.spreadsheetSynced).length;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 p-6 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Radio className="w-3 h-3 text-emerald-300 animate-pulse" />
                Sinkronisasi Spreadsheet Real-Time
              </span>
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight">
              Integrasi Google Sheets & Backup Data
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              Setiap invoice yang dibuat dan pembayaran yang terverifikasi otomatis tersinkronisasi ke Google Spreadsheet secara real-time.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white border border-white/20 transition active:scale-95"
              title="Unduh file format CSV untuk Excel / Google Sheets"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh CSV Backup</span>
            </button>

            <button
              id="sync-now-btn"
              onClick={onTriggerSync}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-xs font-bold text-white shadow-md shadow-emerald-500/20 transition active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            Status Sinkronisasi
          </span>
          <div className="mt-2 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span className="text-lg font-black text-slate-900">
              Aktif & Terhubung
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {syncedCount} dari {invoices.length} invoice tersinkron
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            Nama Lembar (Sheet Target)
          </span>
          <div className="mt-2 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            <span className="text-lg font-black text-slate-900 truncate">
              {settings?.googleSheetName || 'InvoiceKilat_Master_DB'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Kolom diperbarui otomatis tanpa menimpa rumus
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            Terakhir Diperbarui
          </span>
          <div className="mt-2 text-lg font-black text-slate-900">
            {settings?.lastSpreadsheetSync ? formatDateTimeIndo(settings.lastSpreadsheetSync) : 'Realtime'}
          </div>
          <p className="text-[11px] text-emerald-600 font-semibold mt-1">
            Otomatis setiap ada mutasi
          </p>
        </div>
      </div>

      {/* Webhook Endpoint Box */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Link className="w-4 h-4 text-emerald-600" />
            <span>Webhook URL Google Apps Script / Zapier / Make</span>
          </h3>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
            Realtime Push & Pull
          </span>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          Gunakan endpoint webhook ini pada Google Apps Script Anda untuk sinkronisasi dua arah. Setiap perubahan di Spreadsheet atau di Web App akan langsung tersinkronkan tanpa delay.
        </p>

        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={webhookUrl}
            className="flex-1 px-3.5 py-2.5 text-xs font-mono rounded-xl border border-slate-200 bg-slate-50 text-slate-700 select-all"
          />
          <button
            onClick={handleCopyWebhook}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition active:scale-95 shrink-0"
          >
            {copiedWebhook ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedWebhook ? 'Tersalin' : 'Salin URL'}</span>
          </button>
        </div>
      </div>

      {/* Live Spreadsheet Preview Table */}
      <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Pratinjau Data Sinkronisasi Spreadsheet
            </h3>
            <p className="text-xs text-slate-500">
              Berikut adalah format baris data yang dikirimkan ke Google Sheets
            </p>
          </div>
          <span className="text-xs font-bold text-emerald-700">
            {invoices.length} Baris Data
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100 uppercase text-[10px]">
              <tr>
                <th className="py-2.5 px-3">No Invoice</th>
                <th className="py-2.5 px-3">Tanggal</th>
                <th className="py-2.5 px-3">Pelanggan</th>
                <th className="py-2.5 px-3">WhatsApp</th>
                <th className="py-2.5 px-3 text-right">Total (Rp)</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-center">Sync Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {invoices.map((inv) => (
                <tr 
                  key={inv.id} 
                  onClick={() => onSelectInvoice(inv.id)}
                  className="hover:bg-slate-50/80 transition cursor-pointer"
                >
                  <td className="py-2.5 px-3 font-bold text-slate-900">{inv.invoiceNumber}</td>
                  <td className="py-2.5 px-3 text-slate-600">{inv.date}</td>
                  <td className="py-2.5 px-3 font-sans font-medium text-slate-800">{inv.customer.name}</td>
                  <td className="py-2.5 px-3 text-slate-600">{inv.customer.phone}</td>
                  <td className="py-2.5 px-3 text-right font-bold text-slate-900">{formatRupiah(inv.totalAmount)}</td>
                  <td className="py-2.5 px-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      inv.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {inv.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-semibold">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Synced</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
