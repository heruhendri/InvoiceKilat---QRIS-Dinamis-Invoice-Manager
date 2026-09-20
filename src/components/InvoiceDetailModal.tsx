import React, { useState } from 'react';
import { 
  X, 
  Printer, 
  CreditCard, 
  Share2, 
  Download, 
  Copy, 
  Check, 
  Calendar, 
  Building, 
  Mail, 
  Phone, 
  QrCode, 
  CheckCircle2, 
  Clock, 
  FileSpreadsheet, 
  Send,
  ExternalLink
} from 'lucide-react';
import { Invoice } from '../types';
import { formatRupiah, formatDateIndo, formatDateTimeIndo, getStatusDetails, getPaymentMethodDetails } from '../utils/formatters';

interface InvoiceDetailModalProps {
  invoice: Invoice | null;
  onClose: () => void;
  onOpenPaymentModal: (invoice: Invoice) => void;
  onPrintInvoice: (invoice: Invoice) => void;
  onSendWhatsApp: (invoice: Invoice) => void;
  onSendEmailReminder: (invoice: Invoice) => void;
  onOpenPortal?: (invoice: Invoice) => void;
}

export const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({
  invoice,
  onClose,
  onOpenPaymentModal,
  onPrintInvoice,
  onSendWhatsApp,
  onSendEmailReminder,
  onOpenPortal,
}) => {
  const [copiedQris, setCopiedQris] = useState(false);

  if (!invoice) return null;

  const statusInfo = getStatusDetails(invoice.status);
  const isPaid = invoice.status === 'paid';
  const remainingAmount = Math.max(0, invoice.totalAmount - invoice.paidAmount);

  const handleCopyQris = () => {
    if (invoice.dynamicQris) {
      navigator.clipboard.writeText(invoice.dynamicQris);
      setCopiedQris(true);
      setTimeout(() => setCopiedQris(false), 2000);
    }
  };

  const handleDownloadQr = () => {
    if (!invoice.dynamicQrisDataUrl) return;
    const link = document.createElement('a');
    link.href = invoice.dynamicQrisDataUrl;
    link.download = `QRIS_${invoice.invoiceNumber}_Rp${invoice.totalAmount}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-3xl rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 my-auto max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900">
                  {invoice.invoiceNumber}
                </h3>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusInfo.badgeClass}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.bgClass}`} />
                  {statusInfo.label}
                </span>
              </div>
              <span className="text-xs text-slate-500">
                Dibuat pada {formatDateIndo(invoice.date)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onPrintInvoice(invoice)}
              className="p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-xl transition"
              title="Cetak PDF Invoice"
            >
              <Printer className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Customer & Dates Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50/80 border border-slate-100">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Ditagihkan Kepada:
              </span>
              <p className="text-sm font-bold text-slate-900">
                {invoice.customer.name}
              </p>
              {invoice.customer.company && (
                <p className="text-xs text-slate-600 font-medium">
                  {invoice.customer.company}
                </p>
              )}
              {invoice.customer.phone && (
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-1 font-mono">
                  <Phone className="w-3 h-3 text-emerald-600" />
                  <span>{invoice.customer.phone}</span>
                </p>
              )}
              {invoice.customer.email && (
                <p className="text-xs text-slate-500 flex items-center gap-1 font-mono">
                  <Mail className="w-3 h-3 text-blue-600" />
                  <span>{invoice.customer.email}</span>
                </p>
              )}
            </div>

            <div className="space-y-1.5 sm:text-right">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Tanggal Jatuh Tempo:
                </span>
                <span className={`text-sm font-extrabold ${invoice.status === 'overdue' ? 'text-rose-600' : 'text-slate-900'}`}>
                  {formatDateIndo(invoice.dueDate)}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Total Tagihan:
                </span>
                <span className="text-lg font-black text-blue-600">
                  {formatRupiah(invoice.totalAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Dynamic QRIS Box (Special Feature from Prompt) */}
          <div className="rounded-3xl border-2 border-dashed border-blue-200 bg-gradient-to-br from-blue-50/60 via-indigo-50/40 to-slate-50 p-5">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* QR Image */}
              <div className="bg-white p-3 rounded-2xl shadow-md border border-slate-100 shrink-0 text-center">
                {invoice.dynamicQrisDataUrl ? (
                  <img
                    src={invoice.dynamicQrisDataUrl}
                    alt="QRIS Dinamis Otomatis"
                    className="w-44 h-44 object-contain mx-auto"
                  />
                ) : (
                  <div className="w-44 h-44 flex items-center justify-center text-slate-400">
                    Membuat QRIS...
                  </div>
                )}
                <div className="mt-2 text-[10px] font-bold text-slate-500 tracking-wider uppercase">
                  DANA BISNIS • QRIS DINAMIS
                </div>
              </div>

              {/* QR Info & Actions */}
              <div className="space-y-2.5 text-center sm:text-left flex-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold">
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Nominal Otomatis Terkunci: {formatRupiah(invoice.totalAmount)}</span>
                </div>

                <h4 className="text-base font-extrabold text-slate-900">
                  Scan QRIS untuk Pembayaran Instan
                </h4>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Pelanggan cukup membuka aplikasi perbankan atau e-wallet (DANA, BCA Mobile, GoPay, OVO, ShopeePay, Livin&apos;, dll). Nominal <span className="font-bold text-slate-900">{formatRupiah(invoice.totalAmount)}</span> akan otomatis muncul di layar tanpa perlu input manual!
                </p>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                  <button
                    onClick={handleCopyQris}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs transition active:scale-95"
                  >
                    {copiedQris ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedQris ? 'Disalin!' : 'Salin String QRIS'}</span>
                  </button>

                  <button
                    onClick={handleDownloadQr}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs transition active:scale-95"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download QR PNG</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Rincian Item / Layanan
            </h4>
            <div className="rounded-2xl border border-slate-200 overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                  <tr>
                    <th className="py-2.5 px-3.5">Deskripsi</th>
                    <th className="py-2.5 px-3.5 text-center">Qty</th>
                    <th className="py-2.5 px-3.5 text-right">Harga Satuan</th>
                    <th className="py-2.5 px-3.5 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoice.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3.5 font-medium text-slate-900">
                        {item.description}
                      </td>
                      <td className="py-2.5 px-3.5 text-center text-slate-600">
                        {item.quantity}
                      </td>
                      <td className="py-2.5 px-3.5 text-right text-slate-600 font-mono">
                        {formatRupiah(item.price)}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-bold text-slate-900 font-mono">
                        {formatRupiah(item.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Total Calculation breakdown */}
              <div className="p-3.5 bg-slate-50 border-t border-slate-100 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-mono">{formatRupiah(invoice.subtotal)}</span>
                </div>
                {invoice.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Diskon:</span>
                    <span className="font-mono">-{formatRupiah(invoice.discountAmount)}</span>
                  </div>
                )}
                {invoice.taxAmount > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>PPN ({invoice.taxPercent}%):</span>
                    <span className="font-mono">+{formatRupiah(invoice.taxAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-extrabold text-slate-900 pt-2 border-t border-slate-200">
                  <span>Total Tagihan:</span>
                  <span className="text-blue-600 font-mono">{formatRupiah(invoice.totalAmount)}</span>
                </div>
                {invoice.paidAmount > 0 && (
                  <div className="flex justify-between text-xs font-bold text-emerald-600 pt-1">
                    <span>Telah Dibayar:</span>
                    <span className="font-mono">{formatRupiah(invoice.paidAmount)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Transaction History Logs (Audit Trail) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Riwayat Transaksi & Pembayaran
              </h4>
              <span className="text-[11px] text-slate-400 font-medium">
                {invoice.transactions.length} transaksi
              </span>
            </div>

            {invoice.transactions.length === 0 ? (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-400">
                Belum ada transaksi pembayaran yang tercatat untuk invoice ini.
              </div>
            ) : (
              <div className="space-y-2">
                {invoice.transactions.map((trx) => (
                  <div 
                    key={trx.id} 
                    className="p-3 rounded-2xl bg-emerald-50/50 border border-emerald-100 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">
                            {formatRupiah(trx.amount)}
                          </span>
                          {(() => {
                            const methodInfo = getPaymentMethodDetails(trx.paymentMethod);
                            return (
                              <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase ${methodInfo.badgeClass}`}>
                                {methodInfo.label}
                              </span>
                            );
                          })()}
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Ref: <span className="font-mono">{trx.referenceNumber}</span> • {formatDateTimeIndo(trx.verifiedAt)}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] text-emerald-700 font-semibold block">
                        Terverifikasi
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        {trx.verifiedBy}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sync & Automation Status Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 pt-3 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Google Sheets: <strong className="text-slate-800">{invoice.spreadsheetSynced ? 'Terhubung' : 'Pending'}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <Share2 className="w-4 h-4 text-emerald-600" />
                <span>WhatsApp: <strong className="text-slate-800">{invoice.whatsappNotified ? 'Terkirim' : 'Belum'}</strong></span>
              </div>
            </div>
            <div className="text-[11px] font-medium text-slate-400">
              Dibuat oleh heruhendri • Contact Person: 08977345640
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition"
          >
            Tutup
          </button>

          <div className="flex items-center gap-2">
            {onOpenPortal && (
              <button
                onClick={() => onOpenPortal(invoice)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition active:scale-95"
                title="Buka Tampilan Portal Pelanggan untuk Faktur Ini"
              >
                <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
                <span>Lihat di Portal Pelanggan</span>
              </button>
            )}

            {!isPaid && (
              <button
                onClick={() => onSendEmailReminder(invoice)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 transition active:scale-95"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Kirim Email Tagihan</span>
              </button>
            )}

            <button
              onClick={() => onSendWhatsApp(invoice)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition active:scale-95"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Kirim WhatsApp</span>
            </button>

            {!isPaid && (
              <button
                onClick={() => onOpenPaymentModal(invoice)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/25 transition active:scale-95"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Catat Pembayaran</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
