import React from 'react';
import { 
  Printer, 
  Download, 
  X, 
  QrCode, 
  CheckCircle, 
  ShieldCheck,
  Building,
  Phone,
  Mail
} from 'lucide-react';
import { Invoice, BusinessSettings } from '../types';
import { formatRupiah, formatDateIndo } from '../utils/formatters';

interface PrintableInvoiceProps {
  invoice: Invoice | null;
  settings: BusinessSettings | null;
  onClose: () => void;
}

export const PrintableInvoice: React.FC<PrintableInvoiceProps> = ({
  invoice,
  settings,
  onClose,
}) => {
  if (!invoice) return null;

  const isPaid = invoice.status === 'paid';
  const isOverdue = invoice.status === 'overdue';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-2 sm:p-6 overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto">
      {/* Container */}
      <div className="w-full max-w-3xl rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-auto print:shadow-none print:border-none print:rounded-none flex flex-col max-h-[95vh] print:max-h-none">
        {/* Top bar (Hidden during print) */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-900 text-white print:hidden shrink-0">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-bold">Cetak / Simpan PDF Invoice ({invoice.invoiceNumber})</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white transition active:scale-95"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak / PDF (Ctrl + P)</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Paper Document (A4 Styling) */}
        <div 
          id="printable-invoice-content"
          className="p-8 sm:p-12 overflow-y-auto space-y-8 bg-white print:p-6 print:overflow-visible text-slate-800"
        >
          {/* Header Row: Company & Invoice Label */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-slate-200 pb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-sm">
                  IK
                </div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  {settings?.businessName || 'PT Cipta Media Nusantara'}
                </h1>
              </div>
              <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                {settings?.businessAddress || 'Jl. Sudirman No. 45, Jakarta Pusat'}
              </p>
              <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                <span>Telp: {settings?.businessPhone || '6281298765432'}</span>
                <span>•</span>
                <span>Email: {settings?.businessEmail || 'billing@ciptamedia.id'}</span>
              </div>
            </div>

            <div className="sm:text-right space-y-1">
              <span className="text-2xl sm:text-3xl font-black tracking-tight text-blue-600 uppercase block">
                FAKTUR INVOICE
              </span>
              <p className="text-xs font-mono font-bold text-slate-700">
                NO: {invoice.invoiceNumber}
              </p>
              <div className="pt-1">
                <span className={`inline-block px-3 py-1 rounded-md text-xs font-extrabold uppercase tracking-wider border ${
                  isPaid 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : isOverdue
                    ? 'bg-rose-50 text-rose-700 border-rose-300'
                    : 'bg-amber-50 text-amber-700 border-amber-300'
                }`}>
                  {isPaid ? 'LUNAS / PAID' : isOverdue ? 'JATUH TEMPO' : 'MENUNGGU PEMBAYARAN'}
                </span>
              </div>
            </div>
          </div>

          {/* Customer & Invoice Meta Grid */}
          <div className="grid grid-cols-2 gap-8 text-xs">
            <div>
              <span className="font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Ditagihkan Kepada:
              </span>
              <p className="text-sm font-extrabold text-slate-900">
                {invoice.customer.name}
              </p>
              {invoice.customer.company && (
                <p className="text-xs font-semibold text-slate-600 mt-0.5">
                  {invoice.customer.company}
                </p>
              )}
              {invoice.customer.address && (
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {invoice.customer.address}
                </p>
              )}
              <p className="text-xs text-slate-500 mt-1">
                WA: {invoice.customer.phone} {invoice.customer.email ? `• ${invoice.customer.email}` : ''}
              </p>
            </div>

            <div className="text-right space-y-1">
              <div>
                <span className="text-slate-400 uppercase font-bold text-[10px] tracking-wider block">
                  Tanggal Invoice:
                </span>
                <span className="font-bold text-slate-800">
                  {formatDateIndo(invoice.date)}
                </span>
              </div>

              <div>
                <span className="text-slate-400 uppercase font-bold text-[10px] tracking-wider block">
                  Jatuh Tempo Pembayaran:
                </span>
                <span className={`font-bold ${isOverdue ? 'text-rose-600' : 'text-slate-800'}`}>
                  {formatDateIndo(invoice.dueDate)}
                </span>
              </div>

              {invoice.transactions.length > 0 && (
                <div>
                  <span className="text-slate-400 uppercase font-bold text-[10px] tracking-wider block">
                    No Referensi Pembayaran:
                  </span>
                  <span className="font-mono text-emerald-700 font-bold">
                    {invoice.transactions[invoice.transactions.length - 1].referenceNumber}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Line Items Table */}
          <div>
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">No</th>
                  <th className="py-2.5 px-3">Deskripsi Barang / Jasa</th>
                  <th className="py-2.5 px-3 text-center">Qty</th>
                  <th className="py-2.5 px-3 text-right">Harga (Rp)</th>
                  <th className="py-2.5 px-3 text-right">Total (Rp)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoice.items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-2.5 px-3 text-slate-400 font-mono">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{item.description}</td>
                    <td className="py-2.5 px-3 text-center text-slate-600">{item.quantity}</td>
                    <td className="py-2.5 px-3 text-right text-slate-700 font-mono">{formatRupiah(item.price)}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900 font-mono">{formatRupiah(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Calculations Breakdown */}
            <div className="border-t border-slate-200 mt-2 pt-3 flex justify-end">
              <div className="w-64 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-mono font-semibold">{formatRupiah(invoice.subtotal)}</span>
                </div>
                {invoice.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700">
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
                <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
                  <span>TOTAL TAGIHAN:</span>
                  <span className="text-blue-700 font-mono">{formatRupiah(invoice.totalAmount)}</span>
                </div>
                {invoice.paidAmount > 0 && (
                  <div className="flex justify-between text-xs font-bold text-emerald-700 pt-1">
                    <span>Telah Dibayar:</span>
                    <span className="font-mono">{formatRupiah(invoice.paidAmount)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* DYNAMIC QRIS DISPLAY (Prominent in PDF as required by user prompt) */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center gap-6">
            <div className="bg-white p-2 rounded-xl shadow-xs border border-slate-200 shrink-0 text-center">
              {invoice.dynamicQrisDataUrl ? (
                <img
                  src={invoice.dynamicQrisDataUrl}
                  alt="QRIS Dinamis Invoice"
                  className="w-36 h-36 object-contain mx-auto"
                />
              ) : (
                <div className="w-36 h-36 flex items-center justify-center text-slate-400 text-xs">
                  QRIS Code
                </div>
              )}
              <div className="mt-1 text-[9px] font-bold text-slate-500 uppercase">
                QRIS DANA BISNIS DINAMIS
              </div>
            </div>

            <div className="text-xs space-y-1.5 flex-1">
              <div className="flex items-center gap-1.5 text-blue-700 font-extrabold text-sm">
                <QrCode className="w-4 h-4" />
                <span>Instruksi Pembayaran Instan via QRIS Dinamis</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                Scan kode QRIS di samping menggunakan aplikasi perbankan atau e-wallet (DANA, BCA Mobile, GoPay, OVO, ShopeePay, Mandiri Livin&apos;, dll).
              </p>
              <div className="p-2 rounded-lg bg-blue-100/70 text-blue-900 font-semibold text-[11px]">
                ⚡ Nominal pembayaran otomatis terkunci sebesar <span className="font-bold underline">{formatRupiah(invoice.totalAmount)}</span>. Tidak perlu memasukkan angka manual.
              </div>
              <p className="text-[10px] text-slate-400">
                Setelah pembayaran sukses, sistem otomatis mencatat pelunasan dan mengirimkan tanda terima via WhatsApp.
              </p>
            </div>
          </div>

          {/* Signatures & Notes */}
          <div className="grid grid-cols-2 gap-8 text-xs pt-4 border-t border-slate-100">
            <div>
              <span className="font-bold text-slate-400 uppercase text-[10px] tracking-wider block mb-1">
                Catatan & Syarat:
              </span>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                {invoice.notes || 'Terima kasih atas kepercayaan dan kerja sama Anda.'}
              </p>
              <p className="text-slate-500 text-[10px] mt-1">
                {invoice.paymentTerms}
              </p>
            </div>

            <div className="text-center ml-auto w-48 space-y-12">
              <div>
                <span className="text-slate-400 text-[10px] block">Hormat Kami,</span>
                <span className="font-bold text-slate-800 text-xs">{settings?.businessName || 'Manajemen Keuangan'}</span>
              </div>
              <div className="border-b border-slate-300 pb-1">
                <span className="font-bold text-slate-900 text-xs">{settings?.businessOwner || 'Bagian Keuangan'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
