import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  Eye, 
  CreditCard, 
  Share2, 
  Printer, 
  Trash2, 
  Edit3, 
  Send, 
  QrCode, 
  Building, 
  Calendar,
  AlertTriangle,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { Invoice } from '../types';
import { formatRupiah, formatDateIndo, getStatusDetails } from '../utils/formatters';

interface InvoiceListProps {
  invoices: Invoice[];
  onSelectInvoice: (id: string) => void;
  onOpenCreateInvoice: () => void;
  onOpenGenerateMonthly?: () => void;
  onOpenPaymentModal: (invoice: Invoice) => void;
  onOpenEditInvoice: (invoice: Invoice) => void;
  onDeleteInvoice: (id: string) => void;
  onPrintInvoice: (invoice: Invoice) => void;
  onSendWhatsApp: (invoice: Invoice) => void;
  onSendEmailReminder: (invoice: Invoice) => void;
  onOpenPortal?: (invoice: Invoice) => void;
}

export const InvoiceList: React.FC<InvoiceListProps> = ({
  invoices,
  onSelectInvoice,
  onOpenCreateInvoice,
  onOpenGenerateMonthly,
  onOpenPaymentModal,
  onOpenEditInvoice,
  onDeleteInvoice,
  onPrintInvoice,
  onSendWhatsApp,
  onSendEmailReminder,
  onOpenPortal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inv.customer.company || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inv.customer.email || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' || inv.status.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const counts = {
    all: invoices.length,
    paid: invoices.filter((i) => i.status === 'paid').length,
    pending: invoices.filter((i) => i.status === 'pending').length,
    overdue: invoices.filter((i) => i.status === 'overdue').length,
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Database & Manajemen Invoice
          </h2>
          <p className="text-xs text-slate-500">
            Kelola faktur tagihan, status pembayaran real-time, dan unduh PDF invoice ber-QRIS dinamis.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onOpenGenerateMonthly && (
            <button
              id="btn-generate-monthly-invoice"
              onClick={onOpenGenerateMonthly}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-500/20 hover:from-indigo-700 hover:to-blue-700 active:scale-95 transition"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>⚡ Generate Tagihan Bulanan</span>
            </button>
          )}

          <button
            id="btn-new-invoice"
            onClick={onOpenCreateInvoice}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 active:scale-95 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Invoice Baru</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            id="search-invoice-input"
            type="text"
            placeholder="Cari no invoice, pelanggan, perusahaan, atau email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50/50"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Semua ({counts.all})
          </button>
          <button
            onClick={() => setStatusFilter('paid')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              statusFilter === 'paid'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            Lunas ({counts.paid})
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              statusFilter === 'pending'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-amber-700 hover:bg-amber-50'
            }`}
          >
            Menunggu ({counts.pending})
          </button>
          <button
            onClick={() => setStatusFilter('overdue')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              statusFilter === 'overdue'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-rose-700 hover:bg-rose-50'
            }`}
          >
            Jatuh Tempo ({counts.overdue})
          </button>
        </div>
      </div>

      {/* Invoice Table (Desktop) & Cards (Mobile) */}
      <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        {/* Desktop View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Invoice & Pelanggan</th>
                <th className="py-3.5 px-4">Tanggal & Jatuh Tempo</th>
                <th className="py-3.5 px-4">Total Tagihan</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-center">QRIS Dinamis</th>
                <th className="py-3.5 px-4 text-right">Aksi Cepat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Tidak ada invoice yang sesuai kriteria pencarian.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const statusInfo = getStatusDetails(inv.status);
                  const isPaid = inv.status === 'paid';
                  const isOverdue = inv.status === 'overdue';

                  return (
                    <tr 
                      key={inv.id} 
                      className="hover:bg-slate-50/80 transition cursor-pointer"
                      onClick={() => onSelectInvoice(inv.id)}
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl shrink-0 ${
                            isPaid ? 'bg-emerald-50 text-emerald-600' : isOverdue ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'
                          }`}>
                            <QrCode className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block">
                              {inv.invoiceNumber}
                            </span>
                            <span className="text-slate-600 font-medium">
                              {inv.customer.name}
                            </span>
                            {inv.customer.company && (
                              <span className="text-[10px] text-slate-400 block">
                                {inv.customer.company}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <span className="text-slate-700 block">
                            Dibuat: {formatDateIndo(inv.date)}
                          </span>
                          <span className={`block font-medium ${isOverdue ? 'text-rose-600' : 'text-slate-500'}`}>
                            Tempo: {formatDateIndo(inv.dueDate)}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div>
                          <span className="text-sm font-extrabold text-slate-900 block">
                            {formatRupiah(inv.totalAmount)}
                          </span>
                          {inv.paidAmount > 0 && inv.paidAmount < inv.totalAmount && (
                            <span className="text-[10px] text-emerald-600 block">
                              Dibayar: {formatRupiah(inv.paidAmount)}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${statusInfo.badgeClass}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.bgClass}`} />
                          {statusInfo.label}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {inv.dynamicQrisDataUrl ? (
                          <div className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            <QrCode className="w-3 h-3" />
                            <span>Auto-Nominal</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>

                      <td 
                        className="py-3.5 px-4 text-right"
                        onClick={(e) => e.stopPropagation()} // Prevent row click
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Payment Button if not paid */}
                          {!isPaid && (
                            <button
                              onClick={() => onOpenPaymentModal(inv)}
                              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition active:scale-95"
                              title="Catat Pembayaran Masuk"
                            >
                              Bayar
                            </button>
                          )}

                          {/* Print / View PDF */}
                          <button
                            onClick={() => onPrintInvoice(inv)}
                            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition"
                            title="Cetak / Unduh PDF Invoice"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* WhatsApp Trigger */}
                          <button
                            onClick={() => onSendWhatsApp(inv)}
                            className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                            title="Kirim Notifikasi WhatsApp"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>

                          {/* Customer Portal Link */}
                          {onOpenPortal && (
                            <button
                              onClick={() => onOpenPortal(inv)}
                              className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                              title="Buka Tampilan Portal Pelanggan"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </button>
                          )}

                          {/* Email Reminder Trigger */}
                          {!isPaid && (
                            <button
                              onClick={() => onSendEmailReminder(inv)}
                              className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                              title="Kirim Email Tagihan / Pengingat"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          )}

                          {/* Edit */}
                          <button
                            onClick={() => onOpenEditInvoice(inv)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                            title="Edit Invoice"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => onDeleteInvoice(inv.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Hapus Invoice"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View (Cards) */}
        <div className="lg:hidden divide-y divide-slate-100">
          {filteredInvoices.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              Tidak ada invoice yang ditemukan.
            </div>
          ) : (
            filteredInvoices.map((inv) => {
              const statusInfo = getStatusDetails(inv.status);
              const isPaid = inv.status === 'paid';
              const isOverdue = inv.status === 'overdue';

              return (
                <div 
                  key={inv.id}
                  onClick={() => onSelectInvoice(inv.id)}
                  className="p-4 hover:bg-slate-50/80 transition cursor-pointer space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-slate-900">
                          {inv.invoiceNumber}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusInfo.badgeClass}`}>
                          {statusInfo.label}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-700 mt-0.5">
                        {inv.customer.name}
                      </p>
                      {inv.customer.company && (
                        <p className="text-[11px] text-slate-400">
                          {inv.customer.company}
                        </p>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-extrabold text-slate-900 block">
                        {formatRupiah(inv.totalAmount)}
                      </span>
                      <span className={`text-[10px] block ${isOverdue ? 'text-rose-600 font-bold' : 'text-slate-400'}`}>
                        Jatuh Tempo: {formatDateIndo(inv.dueDate)}
                      </span>
                    </div>
                  </div>

                  {/* Actions for Mobile */}
                  <div 
                    className="flex items-center justify-between pt-2 border-t border-slate-50"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-1.5 text-xs text-blue-600 font-medium">
                      <Eye className="w-3.5 h-3.5" />
                      <span>Detail & QRIS</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {!isPaid && (
                        <button
                          onClick={() => onOpenPaymentModal(inv)}
                          className="px-3 py-1 rounded-lg bg-emerald-600 text-white text-xs font-semibold shadow-xs"
                        >
                          Bayar
                        </button>
                      )}
                      <button
                        onClick={() => onPrintInvoice(inv)}
                        className="p-1.5 text-slate-600 hover:text-blue-600 rounded-md border border-slate-200"
                        title="PDF"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onSendWhatsApp(inv)}
                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md border border-emerald-200"
                        title="WhatsApp"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
