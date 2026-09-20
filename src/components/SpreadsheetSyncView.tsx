import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  RefreshCw, 
  ExternalLink, 
  CheckCircle2, 
  Copy, 
  Check, 
  Radio, 
  Link, 
  Table, 
  ShieldCheck, 
  Database,
  Building,
  Users,
  Package,
  Layers,
  Code,
  Settings
} from 'lucide-react';
import { Invoice, BusinessSettings } from '../types';
import { formatRupiah, formatDateTimeIndo } from '../utils/formatters';

interface SpreadsheetSyncViewProps {
  invoices: Invoice[];
  settings: BusinessSettings | null;
  onTriggerSync: () => void;
  isSyncing: boolean;
  onSelectInvoice: (id: string) => void;
  onOpenSettings?: () => void;
}

export const SpreadsheetSyncView: React.FC<SpreadsheetSyncViewProps> = ({
  invoices,
  settings,
  onTriggerSync,
  isSyncing,
  onSelectInvoice,
  onOpenSettings,
}) => {
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [showScriptModal, setShowScriptModal] = useState(false);

  const appName = settings?.appName || 'InvoiceKilat';
  const companyName = settings?.businessName || 'PT Cipta Media Nusantara';

  const webhookUrl = `${window.location.origin}/api/spreadsheet/sync-webhook`;

  const handleCopyWebhook = () => {
    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(webhookUrl).catch(() => {});
      }
      setCopiedWebhook(true);
      setTimeout(() => setCopiedWebhook(false), 2000);
    } catch {
      // safe fallback
    }
  };

  const handleExportFullCSV = () => {
    try {
      const link = document.createElement('a');
      link.href = '/api/spreadsheet/export-full';
      link.setAttribute('download', 'invoices_export.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.warn('Failed to download CSV:', err);
    }
  };

  const handleExportJSON = () => {
    try {
      const link = document.createElement('a');
      link.href = '/api/spreadsheet/backup-data';
      link.setAttribute('download', 'backup_data.json');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.warn('Failed to download JSON:', err);
    }
  };

  const appsScriptCode = `// Google Apps Script untuk ${appName} (${companyName})
// Buka Google Sheets > Ekstensi > Apps Script > Tempel kode ini & Deploy sebagai Web App
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 1. Tab Invoices
    var sheetInvoices = ss.getSheetByName("${settings?.googleSheetName || 'Master_Invoices'}") || ss.insertSheet("${settings?.googleSheetName || 'Master_Invoices'}");
    if (sheetInvoices.getLastRow() === 0) {
      sheetInvoices.appendRow(["No Invoice", "Tanggal", "Pelanggan", "WhatsApp", "Total Amount", "Status", "Metode Bayar", "Disinkronkan"]);
    }
    
    if (data.invoices && Array.isArray(data.invoices)) {
      data.invoices.forEach(function(inv) {
        sheetInvoices.appendRow([
          inv.invoiceNumber,
          inv.date,
          inv.customer ? inv.customer.name : "",
          inv.customer ? inv.customer.phone : "",
          inv.totalAmount,
          inv.status,
          inv.paymentMethod || "QRIS_DINAMIS",
          new Date().toISOString()
        ]);
      });
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success", count: data.invoices ? data.invoices.length : 0 }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;

  const handleCopyScript = () => {
    navigator.clipboard.writeText(appsScriptCode);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const syncedCount = invoices.filter((i) => i.spreadsheetSynced).length;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 p-6 sm:p-8 text-white shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full bg-emerald-500/30 text-emerald-200 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border border-emerald-400/20">
                <Radio className="w-3.5 h-3.5 text-emerald-300 animate-pulse" />
                Cloud Backup & Google Spreadsheet
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              Backup Lengkap Data Perusahaan ke Spreadsheet
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
              Semua data nama aplikasi (<strong>{appName}</strong>), profil perusahaan (<strong>{companyName}</strong>), katalog jasa, pelanggan, invoice, dan mutasi otomatis tersimpan ke Google Sheets secara aman.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={handleExportFullCSV}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white border border-white/20 transition active:scale-95 shadow-xs"
              title="Unduh file format CSV lengkap mencakup semua entitas"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Unduh CSV Lengkap</span>
            </button>

            <button
              onClick={handleExportJSON}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white border border-white/20 transition active:scale-95"
              title="Unduh backup data format JSON mentah"
            >
              <Database className="w-4 h-4 text-teal-400" />
              <span>Backup JSON</span>
            </button>

            {onOpenSettings && (
              <button
                onClick={onOpenSettings}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-teal-600/80 hover:bg-teal-600 text-xs font-bold text-white transition active:scale-95 shadow-xs border border-teal-400/30"
                title="Buka Pengaturan Spreadsheet & Webhook"
              >
                <Settings className="w-4 h-4 text-teal-200" />
                <span>Pengaturan Spreadsheet</span>
              </button>
            )}

            <button
              id="sync-now-btn"
              onClick={onTriggerSync}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-xs font-bold text-white shadow-md shadow-emerald-500/30 transition active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Status Sinkronisasi
          </span>
          <div className="mt-2 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span className="text-lg font-black text-slate-900">
              Aktif & Terhubung
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {syncedCount} dari {invoices.length} invoice tersinkron
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Nama Lembar Target
          </span>
          <div className="mt-2 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            <span className="text-lg font-black text-slate-900 truncate">
              {settings?.googleSheetName || 'Master_Invoices'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 truncate">
            {settings?.googleSheetId ? `ID: ${settings.googleSheetId.slice(0, 10)}...` : 'Database Lokal Siap Sinkron'}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Data Perusahaan & Entitas
          </span>
          <div className="mt-2 flex items-center gap-2">
            <Building className="w-5 h-5 text-blue-600" />
            <span className="text-lg font-black text-slate-900 truncate">
              5 Entitas Siap
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Profil, Invoice, Klien, Jasa, Mutasi
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Terakhir Diperbarui
          </span>
          <div className="mt-2 text-sm font-black text-slate-900">
            {settings?.lastSpreadsheetSync ? formatDateTimeIndo(settings.lastSpreadsheetSync) : 'Real-time Aktif'}
          </div>
          <p className="text-[11px] text-emerald-600 font-semibold mt-1">
            Otomatis setiap mutasi invoice
          </p>
        </div>
      </div>

      {/* Webhook & Integration Box */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Link className="w-4 h-4 text-emerald-600" />
              <span>Webhook Sinkronisasi Google Apps Script / Zapier / Make</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Gunakan URL webhook ini untuk menghubungkan Google Sheets secara dua arah.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowScriptModal(!showScriptModal)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition"
            >
              <Code className="w-3.5 h-3.5 text-blue-600" />
              <span>{showScriptModal ? 'Sembunyikan Script' : 'Lihat Script Google Sheets'}</span>
            </button>

            {settings?.googleSheetId && (
              <a
                href={`https://docs.google.com/spreadsheets/d/${settings.googleSheetId}/edit`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Buka Google Sheet</span>
              </a>
            )}
          </div>
        </div>

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

        {/* Expandable Apps Script helper */}
        {showScriptModal && (
          <div className="p-4 rounded-2xl bg-slate-900 text-slate-200 space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <Code className="w-4 h-4" />
                <span>Kode Google Apps Script Siap Pakai:</span>
              </span>
              <button
                onClick={handleCopyScript}
                className="flex items-center gap-1 px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-white font-bold transition"
              >
                {copiedScript ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedScript ? 'Kode Tersalin!' : 'Salin Kode Script'}</span>
              </button>
            </div>
            <pre className="text-[11px] font-mono overflow-x-auto bg-slate-950/80 p-3 rounded-xl max-h-56 leading-relaxed text-emerald-300">
              {appsScriptCode}
            </pre>
          </div>
        )}
      </div>

      {/* Live Spreadsheet Preview Table */}
      <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Pratinjau Data Sinkronisasi Spreadsheet ({companyName})
            </h3>
            <p className="text-xs text-slate-500">
              Berikut adalah format baris data yang dikirimkan ke Google Spreadsheet
            </p>
          </div>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            {invoices.length} Baris Data Tersedia
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
