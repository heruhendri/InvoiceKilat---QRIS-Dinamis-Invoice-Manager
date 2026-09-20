import React, { useState } from 'react';
import { 
  X, 
  CreditCard, 
  CheckCircle2, 
  QrCode, 
  Building2, 
  Wallet, 
  DollarSign, 
  Smartphone,
  Phone
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Invoice, BusinessSettings } from '../types';
import { formatRupiah } from '../utils/formatters';

interface PaymentModalProps {
  invoice: Invoice | null;
  settings?: BusinessSettings | null;
  onClose: () => void;
  onPaymentSuccess: (updatedInvoice: Invoice, whatsappInfo?: any) => void;
}

type AllowedMethod = 'bca' | 'bri' | 'dana' | 'gojek' | 'qris_dinamis' | 'dana_bisnis' | 'bank_transfer' | 'cash';

export const PaymentModal: React.FC<PaymentModalProps> = ({
  invoice,
  settings,
  onClose,
  onPaymentSuccess,
}) => {
  if (!invoice) return null;

  const defaultRemaining = Math.max(0, invoice.totalAmount - invoice.paidAmount);

  const [amount, setAmount] = useState<number>(defaultRemaining);
  const [paymentMethod, setPaymentMethod] = useState<AllowedMethod>('bca');
  const [referenceNumber, setReferenceNumber] = useState<string>(
    `BCA-TRF-${Math.floor(10000000 + Math.random() * 90000000)}`
  );
  const [notes, setNotes] = useState<string>(
    `Pembayaran Transfer Bank BCA (${settings?.bcaAccountNumber || '8730918231'})`
  );
  const [verifiedBy, setVerifiedBy] = useState<string>('Petugas Keuangan / Sistem');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const bcaAcc = settings?.bcaAccountNumber || '8730918231';
  const briAcc = settings?.briAccountNumber || '012301098765501';
  const danaNum = settings?.danaNumber || '08977345640';
  const gojekNum = settings?.gojekNumber || '08977345640';

  const selectMethod = (method: AllowedMethod) => {
    setPaymentMethod(method);
    const randDigits = Math.floor(10000000 + Math.random() * 90000000);
    switch (method) {
      case 'bca':
        setReferenceNumber(`BCA-TRF-${randDigits}`);
        setNotes(`Pembayaran Transfer Bank BCA (Rek: ${bcaAcc})`);
        break;
      case 'bri':
        setReferenceNumber(`BRI-TRF-${randDigits}`);
        setNotes(`Pembayaran Transfer Bank BRI (Rek: ${briAcc})`);
        break;
      case 'dana':
        setReferenceNumber(`DANA-${randDigits}`);
        setNotes(`Pembayaran E-Wallet DANA (${danaNum})`);
        break;
      case 'gojek':
        setReferenceNumber(`GOPAY-${randDigits}`);
        setNotes(`Pembayaran E-Wallet Gojek/GoPay (${gojekNum})`);
        break;
      case 'qris_dinamis':
        setReferenceNumber(`QRIS-${randDigits}`);
        setNotes('Pembayaran scan QRIS Dinamis otomatis');
        break;
      case 'cash':
        setReferenceNumber(`CASH-${Date.now().toString().slice(-6)}`);
        setNotes('Pembayaran tunai langsung di kasir/kantor');
        break;
      case 'bank_transfer':
        setReferenceNumber(`TRF-${randDigits}`);
        setNotes('Transfer rekening bank');
        break;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      setErrorMessage('Nominal pembayaran harus lebih dari 0');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const response = await fetch(`/api/invoices/${invoice.id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          paymentMethod,
          referenceNumber,
          notes,
          verifiedBy,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Gagal mencatat pembayaran');
      }

      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {
        // Fallback
      }

      onPaymentSuccess(data.invoice, data.whatsapp);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 my-auto max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-emerald-50/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Catat Pembayaran Masuk
              </h3>
              <p className="text-xs text-slate-500">
                {invoice.invoiceNumber} • {invoice.customer.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white rounded-xl transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {errorMessage}
            </div>
          )}

          {/* Nominal Amount */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-bold text-slate-700">
                Nominal Pembayaran (Rp)
              </label>
              <span className="text-[11px] text-slate-500 font-medium">
                Sisa Tagihan: <strong className="text-slate-900">{formatRupiah(defaultRemaining)}</strong>
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                Rp
              </span>
              <input
                id="payment-amount-input"
                type="number"
                min="1"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full pl-11 pr-4 py-2.5 text-base font-bold rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
          </div>

          {/* Payment Method Selector with BCA, BRI, DANA, Gojek */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700">
                Pilih Metode Pembayaran
              </label>
              <span className="text-[11px] text-emerald-600 font-medium">BCA • BRI • DANA • Gojek</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {/* 1. BCA */}
              <button
                type="button"
                id="select-pay-bca"
                onClick={() => selectMethod('bca')}
                className={`p-2.5 rounded-xl border text-left flex items-start gap-2 transition ${
                  paymentMethod === 'bca'
                    ? 'border-blue-500 bg-blue-50/80 text-blue-900 ring-2 ring-blue-500/20 shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-[10px] shrink-0">
                  BCA
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">Bank BCA</div>
                  <div className="text-[10px] text-slate-500 truncate">{bcaAcc}</div>
                </div>
              </button>

              {/* 2. BRI */}
              <button
                type="button"
                id="select-pay-bri"
                onClick={() => selectMethod('bri')}
                className={`p-2.5 rounded-xl border text-left flex items-start gap-2 transition ${
                  paymentMethod === 'bri'
                    ? 'border-sky-500 bg-sky-50/80 text-sky-900 ring-2 ring-sky-500/20 shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center font-black text-[10px] shrink-0">
                  BRI
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">Bank BRI</div>
                  <div className="text-[10px] text-slate-500 truncate">{briAcc}</div>
                </div>
              </button>

              {/* 3. DANA */}
              <button
                type="button"
                id="select-pay-dana"
                onClick={() => selectMethod('dana')}
                className={`p-2.5 rounded-xl border text-left flex items-start gap-2 transition ${
                  paymentMethod === 'dana'
                    ? 'border-cyan-500 bg-cyan-50/80 text-cyan-900 ring-2 ring-cyan-500/20 shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="w-7 h-7 rounded-lg bg-cyan-500 text-white flex items-center justify-center font-black text-[10px] shrink-0">
                  DANA
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">DANA</div>
                  <div className="text-[10px] text-slate-500 truncate">{danaNum}</div>
                </div>
              </button>

              {/* 4. Gojek / GoPay */}
              <button
                type="button"
                id="select-pay-gojek"
                onClick={() => selectMethod('gojek')}
                className={`p-2.5 rounded-xl border text-left flex items-start gap-2 transition ${
                  paymentMethod === 'gojek'
                    ? 'border-emerald-500 bg-emerald-50/80 text-emerald-900 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black text-[9px] shrink-0">
                  GOJEK
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">Gojek / GoPay</div>
                  <div className="text-[10px] text-slate-500 truncate">{gojekNum}</div>
                </div>
              </button>

              {/* 5. QRIS Dinamis */}
              <button
                type="button"
                id="select-pay-qris"
                onClick={() => selectMethod('qris_dinamis')}
                className={`p-2.5 rounded-xl border text-left flex items-start gap-2 transition ${
                  paymentMethod === 'qris_dinamis'
                    ? 'border-purple-500 bg-purple-50/80 text-purple-900 ring-2 ring-purple-500/20 shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <QrCode className="w-6 h-6 text-purple-600 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">QRIS Dinamis</div>
                  <div className="text-[10px] text-slate-500 truncate">Semua Bank / E-Wallet</div>
                </div>
              </button>

              {/* 6. Tunai / Cash */}
              <button
                type="button"
                id="select-pay-cash"
                onClick={() => selectMethod('cash')}
                className={`p-2.5 rounded-xl border text-left flex items-start gap-2 transition ${
                  paymentMethod === 'cash'
                    ? 'border-amber-500 bg-amber-50/80 text-amber-900 ring-2 ring-amber-500/20 shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <DollarSign className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">Tunai / Cash</div>
                  <div className="text-[10px] text-slate-500 truncate">Bayar di Tempat</div>
                </div>
              </button>
            </div>
          </div>

          {/* Reference Number */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Nomor Referensi / Bukti Transaksi
            </label>
            <input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              className="w-full px-3.5 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50"
              required
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Catatan Pembayaran
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Verification Badge */}
          <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/80 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-[11px] text-emerald-800 leading-relaxed">
              <span className="font-bold">Verifikasi Real-Time:</span> Status faktur akan langsung berubah menjadi Lunas atau Terbayar Sebagian, disinkronkan ke semua perangkat, dan bukti bayar siap dikirimkan melalui WhatsApp.
            </div>
          </div>

          {/* Watermark Notice in Modal */}
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-500 flex items-center justify-between">
            <span className="font-medium">
              Aplikasi ini dibuat oleh <strong className="text-slate-800 font-bold">Heru Hendri</strong>
            </span>
            <span className="font-semibold text-emerald-700">
              Contact Person: 08977345640
            </span>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
            >
              Batal
            </button>
            <button
              id="submit-payment-btn"
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20 transition active:scale-95 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Memverifikasi...' : 'Verifikasi & Catat Lunas'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

