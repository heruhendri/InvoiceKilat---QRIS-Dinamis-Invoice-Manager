import React, { useState } from 'react';
import { 
  Printer, 
  Download, 
  X, 
  QrCode, 
  CheckCircle, 
  ShieldCheck,
  Building,
  Phone,
  Mail,
  CreditCard,
  FileText,
  Palette,
  Check,
  Globe
} from 'lucide-react';
import { Invoice, BusinessSettings } from '../types';
import { formatRupiah, formatDateIndo } from '../utils/formatters';

interface PrintableInvoiceProps {
  invoice: Invoice | null;
  settings: BusinessSettings | null;
  onClose: () => void;
}

type InvoiceTemplateType = 'corporate' | 'minimalist' | 'creative' | 'formal' | 'pos';

export const PrintableInvoice: React.FC<PrintableInvoiceProps> = ({
  invoice,
  settings,
  onClose,
}) => {
  if (!invoice) return null;

  const [template, setTemplate] = useState<InvoiceTemplateType>(
    settings?.defaultInvoiceTemplate || 'corporate'
  );

  const isPaid = invoice.status === 'paid';
  const isOverdue = invoice.status === 'overdue';

  const handlePrint = () => {
    setTimeout(() => {
      try {
        window.print();
      } catch (err) {
        console.warn('Direct print blocked by iframe environment:', err);
      }
    }, 0);
  };

  const appName = settings?.appName || 'InvoiceKilat';
  const companyName = settings?.businessName || 'PT Cipta Media Nusantara';
  const logoSrc = settings?.companyLogoUrl || settings?.appLogoUrl || settings?.businessLogoUrl || '';
  const remainingBalance = Math.max(0, invoice.totalAmount - invoice.paidAmount);

  const bcaAcc = settings?.bcaAccountNumber || '8730918231';
  const bcaHolder = settings?.bcaAccountHolder || companyName;
  const briAcc = settings?.briAccountNumber || '012301098765501';
  const briHolder = settings?.briAccountHolder || companyName;
  const danaNum = settings?.danaNumber || '08977345640';
  const danaHolder = settings?.danaAccountHolder || 'Heruhendri';
  const gojekNum = settings?.gojekNumber || '08977345640';
  const gojekHolder = settings?.gojekAccountHolder || 'Heruhendri';
  const watermarkText = settings?.watermarkText || 'Aplikasi ini dibuat oleh Heru Hendri • Contact Person: 08977345640';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-2 sm:p-6 overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto">
      {/* Container */}
      <div className={`w-full ${template === 'pos' ? 'max-w-md' : 'max-w-4xl'} rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-auto print:shadow-none print:border-none print:rounded-none flex flex-col max-h-[96vh] print:max-h-none transition-all`}>
        
        {/* Top Control Bar (Hidden during print) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-3.5 bg-slate-900 text-white print:hidden shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-bold">
              PDF Invoice #{invoice.invoiceNumber}
            </span>
          </div>

          {/* Template Switcher Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mr-1 hidden sm:inline">
              Template:
            </span>
            <button
              onClick={() => setTemplate('corporate')}
              className={`px-2.5 py-1 text-xs rounded-lg font-bold transition flex items-center gap-1 ${
                template === 'corporate'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Corporate
            </button>
            <button
              onClick={() => setTemplate('minimalist')}
              className={`px-2.5 py-1 text-xs rounded-lg font-bold transition flex items-center gap-1 ${
                template === 'minimalist'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Minimalist
            </button>
            <button
              onClick={() => setTemplate('creative')}
              className={`px-2.5 py-1 text-xs rounded-lg font-bold transition flex items-center gap-1 ${
                template === 'creative'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Creative
            </button>
            <button
              onClick={() => setTemplate('formal')}
              className={`px-2.5 py-1 text-xs rounded-lg font-bold transition flex items-center gap-1 ${
                template === 'formal'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Classic Formal
            </button>
            <button
              onClick={() => setTemplate('pos')}
              className={`px-2.5 py-1 text-xs rounded-lg font-bold transition flex items-center gap-1 ${
                template === 'pos'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Struk POS
            </button>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-sm transition active:scale-95"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak / Download PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Paper Document Container */}
        <div 
          id="printable-invoice-content"
          className="overflow-y-auto bg-white print:p-0 print:overflow-visible text-slate-800 flex-1"
        >
          {/* ========================================================================= */}
          {/* TEMPLATE 1: CORPORATE CLEAN */}
          {/* ========================================================================= */}
          {template === 'corporate' && (
            <div className="p-8 sm:p-12 space-y-8 print:p-6 print:space-y-6">
              {/* Header Bar */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b-2 border-blue-900/20 pb-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    {logoSrc ? (
                      <img src={logoSrc} alt={companyName} className="h-12 w-auto max-w-[160px] object-contain" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-blue-900 text-white flex items-center justify-center font-black text-lg">
                        {appName.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h1 className="text-xl font-black text-slate-900 tracking-tight">
                        {companyName}
                      </h1>
                      {settings?.businessTagline && (
                        <p className="text-[11px] text-slate-500">{settings.businessTagline}</p>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 max-w-sm leading-relaxed">
                    {settings?.businessAddress || 'Jl. Sudirman No. 45, Jakarta Pusat'}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                    <span>Telp/WA: {settings?.businessPhone || '6281298765432'}</span>
                    <span>•</span>
                    <span>Email: {settings?.businessEmail || 'billing@ciptamedia.id'}</span>
                    {settings?.businessTaxId && (
                      <>
                        <span>•</span>
                        <span>NPWP: {settings.businessTaxId}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="sm:text-right space-y-1">
                  <span className="text-2xl sm:text-3xl font-black tracking-tight text-blue-900 uppercase block">
                    FAKTUR INVOICE
                  </span>
                  <p className="text-xs font-mono font-bold text-slate-700">
                    NO: {invoice.invoiceNumber}
                  </p>
                  <div className="pt-1">
                    <span className={`inline-block px-3 py-1 rounded-md text-xs font-black uppercase tracking-wider border ${
                      isPaid 
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : isOverdue
                        ? 'bg-rose-50 text-rose-800 border-rose-300'
                        : 'bg-amber-50 text-amber-800 border-amber-300'
                    }`}>
                      {isPaid ? 'LUNAS / PAID' : isOverdue ? 'JATUH TEMPO' : 'MENUNGGU PEMBAYARAN'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Meta Grid */}
              <div className="grid grid-cols-2 gap-8 text-xs">
                <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80">
                  <span className="font-bold text-blue-900 uppercase tracking-wider block mb-1">
                    DITAGIHKAN KEPADA:
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
                  <div className="mt-2 text-slate-600 space-y-0.5">
                    <p>WhatsApp: {invoice.customer.phone}</p>
                    {invoice.customer.email && <p>Email: {invoice.customer.email}</p>}
                  </div>
                </div>

                <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80">
                  <span className="font-bold text-blue-900 uppercase tracking-wider block mb-1">
                    DETAIL PENAGIHAN:
                  </span>
                  <div className="space-y-1.5 mt-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Tanggal Faktur:</span>
                      <span className="font-bold text-slate-800">{formatDateIndo(invoice.date)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Jatuh Tempo:</span>
                      <span className="font-bold text-rose-700">{formatDateIndo(invoice.dueDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Metode Tagihan:</span>
                      <span className="font-bold text-blue-800">QRIS Dinamis Otomatis</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-slate-200 font-bold">
                      <span className="text-slate-700">Total Tagihan:</span>
                      <span className="text-blue-900 font-black">{formatRupiah(invoice.totalAmount)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-blue-900 text-white font-bold uppercase tracking-wider">
                      <th className="py-3 px-4 w-12 text-center">#</th>
                      <th className="py-3 px-4">Deskripsi Layanan / Produk</th>
                      <th className="py-3 px-4 text-center w-20">Qty</th>
                      <th className="py-3 px-4 text-right w-36">Harga Satuan</th>
                      <th className="py-3 px-4 text-right w-36">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {invoice.items.map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-slate-50/50">
                        <td className="py-3.5 px-4 text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="py-3.5 px-4 font-semibold text-slate-900">{item.description}</td>
                        <td className="py-3.5 px-4 text-center font-bold">{item.quantity}</td>
                        <td className="py-3.5 px-4 text-right font-mono">{formatRupiah(item.price)}</td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">{formatRupiah(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals & Notes Section */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-8">
                {/* Notes & Bank Details */}
                <div className="flex-1 space-y-4 text-xs">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="font-bold text-slate-700 uppercase tracking-wider block mb-1">Catatan & Ketentuan:</span>
                    <p className="text-slate-600 leading-relaxed">{invoice.notes || 'Terima kasih atas kerja samanya.'}</p>
                    {invoice.paymentTerms && (
                      <p className="text-slate-500 mt-1 italic">{invoice.paymentTerms}</p>
                    )}
                  </div>

                  {/* Payment Accounts Options */}
                  <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 space-y-2">
                    <span className="font-bold text-blue-900 uppercase tracking-wider block text-[11px]">
                      Pilihan Metode Pembayaran Resmi:
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="p-2 rounded-xl bg-white border border-blue-100">
                        <span className="font-bold text-blue-900 block">Bank BCA:</span>
                        <p className="font-mono font-bold text-slate-800">{bcaAcc}</p>
                        <p className="text-[10px] text-slate-500 truncate">A/N: {bcaHolder}</p>
                      </div>
                      <div className="p-2 rounded-xl bg-white border border-blue-100">
                        <span className="font-bold text-sky-800 block">Bank BRI:</span>
                        <p className="font-mono font-bold text-slate-800">{briAcc}</p>
                        <p className="text-[10px] text-slate-500 truncate">A/N: {briHolder}</p>
                      </div>
                      <div className="p-2 rounded-xl bg-white border border-blue-100">
                        <span className="font-bold text-cyan-800 block">DANA:</span>
                        <p className="font-mono font-bold text-slate-800">{danaNum}</p>
                        <p className="text-[10px] text-slate-500 truncate">A/N: {danaHolder}</p>
                      </div>
                      <div className="p-2 rounded-xl bg-white border border-blue-100">
                        <span className="font-bold text-emerald-800 block">Gojek / GoPay:</span>
                        <p className="font-mono font-bold text-slate-800">{gojekNum}</p>
                        <p className="text-[10px] text-slate-500 truncate">A/N: {gojekHolder}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Calculation Summary Box */}
                <div className="w-full sm:w-72 space-y-2 text-xs border border-slate-200 rounded-2xl p-4 bg-slate-50">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-mono font-bold">{formatRupiah(invoice.subtotal)}</span>
                  </div>
                  {invoice.discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Diskon:</span>
                      <span className="font-mono font-bold">-{formatRupiah(invoice.discountAmount)}</span>
                    </div>
                  )}
                  {invoice.taxAmount > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>PPN ({invoice.taxPercent}%):</span>
                      <span className="font-mono font-bold">+{formatRupiah(invoice.taxAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-black text-blue-900 pt-2 border-t border-slate-300">
                    <span>Total Akhir:</span>
                    <span className="font-mono text-base">{formatRupiah(invoice.totalAmount)}</span>
                  </div>
                  {isPaid ? (
                    <div className="flex justify-between text-xs font-bold text-emerald-700 pt-1 border-t border-dashed border-slate-300">
                      <span>Dibayar:</span>
                      <span className="font-mono">{formatRupiah(invoice.paidAmount || invoice.totalAmount)} (LUNAS)</span>
                    </div>
                  ) : (
                    <div className="flex justify-between text-xs font-bold text-rose-700 pt-1 border-t border-dashed border-slate-300">
                      <span>Sisa Pembayaran:</span>
                      <span className="font-mono">{formatRupiah(remainingBalance)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* QRIS & Signatory Section */}
              <div className="pt-6 border-t-2 border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-8 items-center">
                {/* QRIS Block */}
                {!isPaid && invoice.dynamicQrisDataUrl ? (
                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <div className="w-24 h-24 bg-white p-1 rounded-xl border border-slate-300 shrink-0 shadow-xs">
                      <img src={invoice.dynamicQrisDataUrl} alt="QRIS Dinamis" className="w-full h-full object-contain" />
                    </div>
                    <div className="text-xs space-y-1">
                      <span className="font-bold text-blue-900 flex items-center gap-1">
                        <QrCode className="w-3.5 h-3.5 text-blue-600" />
                        <span>Scan & Bayar via QRIS Dinamis</span>
                      </span>
                      <p className="text-[11px] text-slate-500">
                        Nominal otomatis terkunci senilai <strong>{formatRupiah(invoice.totalAmount)}</strong>.
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Dukungan: BCA, Mandiri, BRI, BNI, DANA, GoPay, OVO, ShopeePay.
                      </p>
                    </div>
                  </div>
                ) : isPaid ? (
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3">
                    <CheckCircle className="w-8 h-8 text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-black text-sm">FAKTUR TELAH LUNAS</span>
                      <p className="text-xs text-emerald-700 mt-0.5">
                        Pembayaran telah diverifikasi secara resmi. Terima kasih atas kerja samanya.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500">
                    Pembayaran dapat dilakukan melalui QRIS Dinamis atau transfer rekening yang tertera di atas.
                  </div>
                )}

                {/* Signature & Stamp */}
                <div className="flex flex-col items-end text-center sm:text-right text-xs">
                  <p className="text-slate-500 mb-1">{settings?.businessAddress?.split(',')[0] || 'Jakarta'}, {formatDateIndo(invoice.date)}</p>
                  <p className="font-bold text-slate-800 mb-2">{companyName}</p>

                  <div className="relative h-20 w-44 flex items-center justify-center my-1">
                    {settings?.stampImageUrl && (
                      <img 
                        src={settings.stampImageUrl} 
                        alt="Stamp" 
                        className="absolute inset-0 w-full h-full object-contain opacity-70 pointer-events-none" 
                      />
                    )}
                    {settings?.signatureImageUrl ? (
                      <img 
                        src={settings.signatureImageUrl} 
                        alt="Signature" 
                        className="relative z-10 max-h-16 w-auto object-contain" 
                      />
                    ) : (
                      <div className="w-full h-full border-b border-slate-400 flex items-end justify-center pb-1">
                        <span className="text-[10px] text-slate-300 italic">(Tanda Tangan Digital)</span>
                      </div>
                    )}
                  </div>

                  <p className="font-bold text-slate-900 underline mt-1">
                    {settings?.signatoryName || settings?.businessOwner || 'Budi Santoso'}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {settings?.signatoryTitle || 'Direktur Utama'}
                  </p>
                </div>
              </div>

              {/* Watermark Footer */}
              <div className="mt-8 pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 font-medium">
                <span className="font-semibold text-slate-700">{watermarkText}</span>
                <span className="font-mono text-[10px] text-slate-400 mt-1 sm:mt-0">Faktur Resmi • {invoice.invoiceNumber}</span>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TEMPLATE 2: MINIMALIST LUXE (Monochrome & Precision Typography) */}
          {/* ========================================================================= */}
          {template === 'minimalist' && (
            <div className="p-8 sm:p-14 space-y-10 font-sans print:p-6 print:space-y-6">
              <div className="flex justify-between items-start border-b border-slate-900 pb-8">
                <div>
                  <h1 className="text-3xl font-light tracking-tight text-slate-900">
                    {companyName}
                  </h1>
                  <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest">
                    {settings?.businessTagline || 'Commercial Invoice'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono tracking-widest uppercase text-slate-400 block">Invoice Reference</span>
                  <p className="text-xl font-mono font-bold text-slate-900">{invoice.invoiceNumber}</p>
                  <p className="text-xs text-slate-500 font-mono mt-1">{invoice.date}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-12 text-xs">
                <div>
                  <span className="text-[10px] font-mono tracking-wider uppercase text-slate-400 block mb-2">Billed To</span>
                  <p className="text-base font-bold text-slate-900">{invoice.customer.name}</p>
                  {invoice.customer.company && <p className="text-slate-700">{invoice.customer.company}</p>}
                  <p className="text-slate-500 mt-1 leading-relaxed">{invoice.customer.address || '-'}</p>
                  <p className="text-slate-500 font-mono mt-1">{invoice.customer.phone}</p>
                </div>
                <div className="space-y-2 border-l border-slate-200 pl-6">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Issue Date</span>
                    <span className="font-mono">{invoice.date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Due Date</span>
                    <span className="font-mono font-bold text-slate-900">{invoice.dueDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Status</span>
                    <span className="font-mono uppercase font-bold text-slate-900">{invoice.status}</span>
                  </div>
                </div>
              </div>

              {/* Items */}
              <div className="pt-2">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-900 text-slate-400 font-mono uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-2">Description</th>
                      <th className="py-3 px-2 text-center w-16">Qty</th>
                      <th className="py-3 px-2 text-right w-32">Price</th>
                      <th className="py-3 px-2 text-right w-32">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoice.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-4 px-2 font-medium text-slate-900">{item.description}</td>
                        <td className="py-4 px-2 text-center font-mono">{item.quantity}</td>
                        <td className="py-4 px-2 text-right font-mono">{formatRupiah(item.price)}</td>
                        <td className="py-4 px-2 text-right font-mono font-bold text-slate-900">{formatRupiah(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Minimalist Summary */}
              <div className="flex justify-end pt-4 border-t border-slate-900">
                <div className="w-64 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span>Subtotal</span>
                    <span className="font-mono">{formatRupiah(invoice.subtotal)}</span>
                  </div>
                  {invoice.taxAmount > 0 && (
                    <div className="flex justify-between text-slate-500">
                      <span>PPN ({invoice.taxPercent}%)</span>
                      <span className="font-mono">+{formatRupiah(invoice.taxAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold text-slate-900 pt-3 border-t border-slate-200">
                    <span>Total</span>
                    <span className="font-mono">{formatRupiah(invoice.totalAmount)}</span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-8 border-t border-slate-200 flex justify-between items-end text-xs">
                <div className="space-y-1 text-slate-500">
                  <p className="font-bold text-slate-900">{companyName}</p>
                  <p>{settings?.businessEmail || 'billing@domain.com'} • {settings?.businessPhone || '-'}</p>
                  {settings?.businessTaxId && <p>Tax ID: {settings.businessTaxId}</p>}
                </div>
                {invoice.dynamicQrisDataUrl && !isPaid && (
                  <div className="flex items-center gap-3">
                    <img src={invoice.dynamicQrisDataUrl} alt="QRIS" className="w-16 h-16 object-contain border border-slate-200 p-1" />
                    <span className="text-[10px] font-mono text-slate-400">Scan QRIS to pay</span>
                  </div>
                )}
              </div>

              {/* Payment Methods */}
              <div className="border border-slate-200 rounded-xl p-3 text-[10px] grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50/50">
                <div>
                  <span className="font-bold text-slate-900 block">Bank BCA:</span>
                  <span className="font-mono text-slate-700">{bcaAcc}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-900 block">Bank BRI:</span>
                  <span className="font-mono text-slate-700">{briAcc}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-900 block">DANA:</span>
                  <span className="font-mono text-slate-700">{danaNum}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-900 block">Gojek:</span>
                  <span className="font-mono text-slate-700">{gojekNum}</span>
                </div>
              </div>

              {/* Watermark */}
              <div className="pt-3 border-t border-slate-200 text-center text-[10px] text-slate-500 font-medium">
                {watermarkText}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TEMPLATE 3: CREATIVE MODERN (Indigo Gradient & Rounded Cards) */}
          {/* ========================================================================= */}
          {template === 'creative' && (
            <div className="p-8 sm:p-10 space-y-6 print:p-6 print:space-y-6">
              {/* Vibrant Top Header */}
              <div className="rounded-3xl bg-gradient-to-r from-indigo-900 via-blue-900 to-indigo-950 text-white p-8 shadow-md">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex items-center gap-3">
                    {logoSrc ? (
                      <img src={logoSrc} alt={companyName} className="h-12 w-auto object-contain bg-white/10 rounded-xl p-1" />
                    ) : (
                      <div className="w-12 h-12 rounded-2xl bg-white/20 text-white font-black text-xl flex items-center justify-center">
                        {appName.substring(0, 2)}
                      </div>
                    )}
                    <div>
                      <h1 className="text-2xl font-black">{companyName}</h1>
                      <p className="text-xs text-indigo-200">{settings?.businessTagline || appName}</p>
                    </div>
                  </div>
                  <div className="sm:text-right">
                    <span className="px-3 py-1 rounded-full bg-indigo-500/30 text-indigo-200 text-[10px] font-bold uppercase tracking-wider block mb-1">
                      FAKTUR PEMBAYARAN
                    </span>
                    <p className="text-lg font-mono font-black">{invoice.invoiceNumber}</p>
                  </div>
                </div>
              </div>

              {/* Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-5 rounded-2xl bg-indigo-50/50 border border-indigo-100">
                  <span className="font-black text-indigo-900 text-xs block mb-1">Penerima Tagihan</span>
                  <p className="text-sm font-extrabold text-slate-900">{invoice.customer.name}</p>
                  <p className="text-slate-600">{invoice.customer.company}</p>
                  <p className="text-slate-500 mt-1">{invoice.customer.phone} • {invoice.customer.email}</p>
                </div>

                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="font-black text-slate-800 text-xs block mb-1">Jadwal & Status</span>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Tanggal Terbit:</span>
                      <span className="font-bold text-slate-800">{formatDateIndo(invoice.date)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Jatuh Tempo:</span>
                      <span className="font-bold text-rose-600">{formatDateIndo(invoice.dueDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Status Pembayaran:</span>
                      <span className="font-bold text-indigo-900 uppercase">{invoice.status}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items Card */}
              <div className="rounded-2xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 font-bold text-slate-700">
                    <tr>
                      <th className="py-3 px-4">Layanan</th>
                      <th className="py-3 px-4 text-center w-16">Qty</th>
                      <th className="py-3 px-4 text-right w-32">Harga</th>
                      <th className="py-3 px-4 text-right w-32">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoice.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-3.5 px-4 font-semibold text-slate-900">{item.description}</td>
                        <td className="py-3.5 px-4 text-center">{item.quantity}</td>
                        <td className="py-3.5 px-4 text-right font-mono">{formatRupiah(item.price)}</td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">{formatRupiah(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Total Card */}
              <div className="rounded-2xl bg-indigo-900 text-white p-6 flex justify-between items-center">
                <div>
                  <span className="text-xs text-indigo-200 block">Total Jumlah Pembayaran</span>
                  <p className="text-2xl font-black font-mono">{formatRupiah(invoice.totalAmount)}</p>
                </div>
                {invoice.dynamicQrisDataUrl && !isPaid && (
                  <div className="flex items-center gap-3 bg-white text-slate-900 p-2 rounded-xl">
                    <img src={invoice.dynamicQrisDataUrl} alt="QRIS" className="w-16 h-16 object-contain" />
                    <div className="text-[10px] font-bold leading-tight">
                      <span>Scan QRIS</span>
                      <p className="text-indigo-600">Otomatis Terkunci</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Payment Methods Card */}
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
                <span className="text-xs font-bold text-indigo-900 block mb-2">Metode Pembayaran Resmi:</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-white border border-indigo-100">
                    <span className="font-bold text-blue-900 block text-[11px]">Bank BCA</span>
                    <p className="font-mono font-bold text-slate-800">{bcaAcc}</p>
                    <p className="text-[10px] text-slate-500 truncate">A/N: {bcaHolder}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-indigo-100">
                    <span className="font-bold text-sky-900 block text-[11px]">Bank BRI</span>
                    <p className="font-mono font-bold text-slate-800">{briAcc}</p>
                    <p className="text-[10px] text-slate-500 truncate">A/N: {briHolder}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-indigo-100">
                    <span className="font-bold text-cyan-900 block text-[11px]">DANA</span>
                    <p className="font-mono font-bold text-slate-800">{danaNum}</p>
                    <p className="text-[10px] text-slate-500 truncate">A/N: {danaHolder}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-indigo-100">
                    <span className="font-bold text-emerald-900 block text-[11px]">Gojek (GoPay)</span>
                    <p className="font-mono font-bold text-slate-800">{gojekNum}</p>
                    <p className="text-[10px] text-slate-500 truncate">A/N: {gojekHolder}</p>
                  </div>
                </div>
              </div>

              {/* Watermark */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                <span className="font-medium text-slate-600">{watermarkText}</span>
                <span className="font-mono text-[10px] text-slate-400">#{invoice.invoiceNumber}</span>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TEMPLATE 4: CLASSIC FORMAL / PERPAJAKAN (Dual Language & Legal Box) */}
          {/* ========================================================================= */}
          {template === 'formal' && (
            <div className="p-8 sm:p-12 space-y-6 text-xs font-serif print:p-6 print:space-y-4">
              <div className="border-b-4 border-double border-slate-900 pb-4 text-center">
                <h1 className="text-2xl font-bold uppercase tracking-wider text-slate-900">{companyName}</h1>
                <p className="text-slate-600 font-sans text-xs mt-0.5">{settings?.businessAddress}</p>
                <p className="text-slate-500 font-sans text-[11px]">
                  NPWP: {settings?.businessTaxId || '01.234.567.8-012.000'} • Telp: {settings?.businessPhone} • Email: {settings?.businessEmail}
                </p>
              </div>

              <div className="text-center font-sans">
                <h2 className="text-base font-extrabold uppercase tracking-wide text-slate-900">
                  FAKTUR PENJUALAN / COMMERCIAL INVOICE
                </h2>
                <p className="text-xs text-slate-500 font-mono">NOMOR: {invoice.invoiceNumber}</p>
              </div>

              {/* Boxed Grid */}
              <div className="grid grid-cols-2 border border-slate-900 font-sans text-xs">
                <div className="p-3 border-r border-slate-900 space-y-1">
                  <span className="font-bold block uppercase text-[10px] text-slate-500">Penerima / Buyer:</span>
                  <p className="font-bold text-slate-900">{invoice.customer.name}</p>
                  {invoice.customer.company && <p className="font-semibold">{invoice.customer.company}</p>}
                  <p className="text-slate-600 text-[11px]">{invoice.customer.address || '-'}</p>
                  <p className="text-slate-600 text-[11px]">Kontak: {invoice.customer.phone}</p>
                </div>
                <div className="p-3 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tanggal Faktur / Date:</span>
                    <span className="font-bold">{formatDateIndo(invoice.date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Jatuh Tempo / Due Date:</span>
                    <span className="font-bold text-rose-800">{formatDateIndo(invoice.dueDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Status:</span>
                    <span className="font-bold uppercase">{invoice.status}</span>
                  </div>
                </div>
              </div>

              {/* Table with strict black borders */}
              <table className="w-full text-left text-xs border border-slate-900 font-sans">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-900 font-bold uppercase text-[10px]">
                    <th className="py-2 px-3 border-r border-slate-900 w-10 text-center">No</th>
                    <th className="py-2 px-3 border-r border-slate-900">Uraian / Description</th>
                    <th className="py-2 px-3 border-r border-slate-900 text-center w-16">Kuantitas</th>
                    <th className="py-2 px-3 border-r border-slate-900 text-right w-32">Harga Satuan</th>
                    <th className="py-2 px-3 text-right w-36">Jumlah (IDR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {invoice.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-2.5 px-3 border-r border-slate-900 text-center">{idx + 1}</td>
                      <td className="py-2.5 px-3 border-r border-slate-900 font-semibold">{item.description}</td>
                      <td className="py-2.5 px-3 border-r border-slate-900 text-center font-mono">{item.quantity}</td>
                      <td className="py-2.5 px-3 border-r border-slate-900 text-right font-mono">{formatRupiah(item.price)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">{formatRupiah(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Summary */}
              <div className="flex justify-end font-sans">
                <div className="w-72 border border-slate-900 p-3 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span className="font-mono">{formatRupiah(invoice.subtotal)}</span>
                  </div>
                  {invoice.taxAmount > 0 && (
                    <div className="flex justify-between">
                      <span>PPN {invoice.taxPercent}%:</span>
                      <span className="font-mono">+{formatRupiah(invoice.taxAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-sm pt-2 border-t border-slate-900">
                    <span>TOTAL:</span>
                    <span className="font-mono">{formatRupiah(invoice.totalAmount)}</span>
                  </div>
                </div>
              </div>

              {/* Formal Signatory Box */}
              <div className="pt-8 flex justify-between items-end font-sans text-xs">
                <div className="text-[11px] text-slate-600 max-w-sm space-y-1.5">
                  <p className="font-bold text-slate-800 uppercase tracking-wide">Pilihan Metode Transfer Resmi:</p>
                  <div className="grid grid-cols-2 gap-2 text-[10px] bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <div>
                      <span className="font-bold text-slate-900 block">Bank BCA:</span>
                      <p className="font-mono text-slate-800">{bcaAcc}</p>
                      <p className="text-[9px] text-slate-500">A/N: {bcaHolder}</p>
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 block">Bank BRI:</span>
                      <p className="font-mono text-slate-800">{briAcc}</p>
                      <p className="text-[9px] text-slate-500">A/N: {briHolder}</p>
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 block">DANA:</span>
                      <p className="font-mono text-slate-800">{danaNum}</p>
                      <p className="text-[9px] text-slate-500">A/N: {danaHolder}</p>
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 block">Gojek:</span>
                      <p className="font-mono text-slate-800">{gojekNum}</p>
                      <p className="text-[9px] text-slate-500">A/N: {gojekHolder}</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400">Atau bayar instan via scan QRIS Dinamis terlampir.</p>
                </div>
                <div className="text-center w-52">
                  <p className="text-slate-600 mb-1">{settings?.businessAddress?.split(',')[0] || 'Jakarta'}, {formatDateIndo(invoice.date)}</p>
                  <p className="font-bold text-slate-900">{companyName}</p>
                  <div className="h-20 flex items-center justify-center">
                    {settings?.signatureImageUrl ? (
                      <img src={settings.signatureImageUrl} alt="Signature" className="max-h-16 object-contain" />
                    ) : (
                      <div className="border-b border-slate-400 w-36 h-12" />
                    )}
                  </div>
                  <p className="font-bold underline">{settings?.signatoryName || 'Budi Santoso'}</p>
                  <p className="text-[10px] text-slate-500">{settings?.signatoryTitle || 'Direktur Utama'}</p>
                </div>
              </div>

              {/* Watermark */}
              <div className="mt-6 pt-3 border-t border-slate-300 font-sans text-center text-[10px] text-slate-500 font-medium">
                {watermarkText}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TEMPLATE 5: THERMAL RECEIPT / POS RINGKAS (Slip 80mm) */}
          {/* ========================================================================= */}
          {template === 'pos' && (
            <div className="p-6 sm:p-8 space-y-4 font-mono text-xs max-w-sm mx-auto bg-slate-50/50 print:p-2 print:max-w-none">
              <div className="text-center space-y-1 border-b border-dashed border-slate-400 pb-4">
                <h1 className="text-base font-black text-slate-900 uppercase">{companyName}</h1>
                <p className="text-[10px] text-slate-500 leading-tight">{settings?.businessAddress}</p>
                <p className="text-[10px] text-slate-500">WA: {settings?.businessPhone}</p>
              </div>

              <div className="space-y-1 text-[11px] border-b border-dashed border-slate-400 pb-3">
                <div className="flex justify-between">
                  <span>No. Faktur:</span>
                  <span className="font-bold">{invoice.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tanggal:</span>
                  <span>{invoice.date}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pelanggan:</span>
                  <span className="font-bold">{invoice.customer.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className="font-bold uppercase">{invoice.status}</span>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2 border-b border-dashed border-slate-400 pb-3">
                {invoice.items.map((item, idx) => (
                  <div key={idx} className="space-y-0.5">
                    <p className="font-bold text-slate-900">{item.description}</p>
                    <div className="flex justify-between text-slate-600 text-[10px]">
                      <span>{item.quantity} x {formatRupiah(item.price)}</span>
                      <span className="font-bold text-slate-900">{formatRupiah(item.total)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="space-y-1 pt-1 border-b border-dashed border-slate-400 pb-3">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span>{formatRupiah(invoice.subtotal)}</span>
                </div>
                {invoice.taxAmount > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>PPN {invoice.taxPercent}%:</span>
                    <span>+{formatRupiah(invoice.taxAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black text-slate-900 pt-1">
                  <span>TOTAL:</span>
                  <span>{formatRupiah(invoice.totalAmount)}</span>
                </div>
              </div>

              {/* QRIS in receipt */}
              {invoice.dynamicQrisDataUrl && !isPaid && (
                <div className="flex flex-col items-center justify-center py-2 space-y-1">
                  <p className="text-[10px] font-bold text-slate-700">BAYAR VIA QRIS DINAMIS:</p>
                  <img src={invoice.dynamicQrisDataUrl} alt="QRIS" className="w-32 h-32 object-contain bg-white p-1 border border-slate-300" />
                  <p className="text-[9px] text-slate-400 text-center">Nominal otomatis terkunci</p>
                </div>
              )}

              {/* POS Payment Methods */}
              <div className="text-[10px] space-y-0.5 border-t border-dashed border-slate-300 pt-2 text-slate-600">
                <p className="font-bold text-slate-800">Metode Bayar Alternatif:</p>
                <div className="grid grid-cols-2 gap-1 text-[9px]">
                  <div>BCA: {bcaAcc}</div>
                  <div>BRI: {briAcc}</div>
                  <div>DANA: {danaNum}</div>
                  <div>Gojek: {gojekNum}</div>
                </div>
              </div>

              <div className="text-center text-[10px] text-slate-400 pt-2 border-t border-dashed border-slate-300">
                <p>Terima kasih atas pembayaran Anda.</p>
                <p className="text-[9px] mt-0.5">{appName} • Paperless Billing</p>
                <p className="text-[9px] text-slate-500 font-medium mt-1">{watermarkText}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
