import React, { useState } from 'react';
import { 
  X, 
  CreditCard, 
  CheckCircle2, 
  Share2, 
  QrCode, 
  Building2, 
  Wallet, 
  DollarSign, 
  Sparkles 
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Invoice } from '../types';
import { formatRupiah } from '../utils/formatters';

interface PaymentModalProps {
  invoice: Invoice | null;
  onClose: () => void;
  onPaymentSuccess: (updatedInvoice: Invoice, whatsappInfo?: any) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  invoice,
  onClose,
  onPaymentSuccess,
}) => {
  if (!invoice) return null;

  const defaultRemaining = Math.max(0, invoice.totalAmount - invoice.paidAmount);

  const [amount, setAmount] = useState<number>(defaultRemaining);
  const [paymentMethod, setPaymentMethod] = useState<'qris_dinamis' | 'dana_bisnis' | 'bank_transfer' | 'cash'>('qris_dinamis');
  const [referenceNumber, setReferenceNumber] = useState<string>(
    `QRIS-DANA-${Math.floor(10000000 + Math.random() * 90000000)}`
  );
  const [notes, setNotes] = useState<string>('Pembayaran terverifikasi otomatis via QRIS Dinamis DANA Bisnis');
  const [verifiedBy, setVerifiedBy] = useState<string>('Sistem Verifikasi QRIS');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

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

      // Fire confetti celebration on successful payment verification!
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {
        // Fallback if canvas blocked
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 my-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-emerald-50/70">
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
                Sisa Tagihan: <strong>{formatRupiah(defaultRemaining)}</strong>
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

          {/* Payment Method Selector */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              Metode Pembayaran
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setPaymentMethod('qris_dinamis');
                  setReferenceNumber(`QRIS-DANA-${Math.floor(10000000 + Math.random() * 90000000)}`);
                  setNotes('Pembayaran diverifikasi via QRIS Dinamis DANA Bisnis');
                }}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition ${
                  paymentMethod === 'qris_dinamis'
                    ? 'border-emerald-500 bg-emerald-50/70 text-emerald-900 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <QrCode className="w-4 h-4 text-emerald-600 mt-0.5" />
                <div>
                  <div className="text-xs font-bold">QRIS Dinamis</div>
                  <div className="text-[10px] text-slate-500">DANA / All Payment</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPaymentMethod('bank_transfer');
                  setReferenceNumber(`TRF-BCA-${Date.now().toString().slice(-6)}`);
                  setNotes('Transfer Bank via Virtual Account / Rekening Bisnis');
                }}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition ${
                  paymentMethod === 'bank_transfer'
                    ? 'border-emerald-500 bg-emerald-50/70 text-emerald-900 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Building2 className="w-4 h-4 text-blue-600 mt-0.5" />
                <div>
                  <div className="text-xs font-bold">Transfer Bank</div>
                  <div className="text-[10px] text-slate-500">BCA / Mandiri / BNI</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPaymentMethod('dana_bisnis');
                  setReferenceNumber(`DANA-BIZ-${Math.floor(10000000 + Math.random() * 90000000)}`);
                  setNotes('Penerimaan langsung DANA Bisnis Merchant');
                }}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition ${
                  paymentMethod === 'dana_bisnis'
                    ? 'border-emerald-500 bg-emerald-50/70 text-emerald-900 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Wallet className="w-4 h-4 text-blue-500 mt-0.5" />
                <div>
                  <div className="text-xs font-bold">DANA Bisnis</div>
                  <div className="text-[10px] text-slate-500">Saldo Merchant</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPaymentMethod('cash');
                  setReferenceNumber(`CASH-${Date.now().toString().slice(-4)}`);
                  setNotes('Pembayaran tunai di kasir / kantor');
                }}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition ${
                  paymentMethod === 'cash'
                    ? 'border-emerald-500 bg-emerald-50/70 text-emerald-900 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <DollarSign className="w-4 h-4 text-amber-600 mt-0.5" />
                <div>
                  <div className="text-xs font-bold">Tunai / Cash</div>
                  <div className="text-[10px] text-slate-500">Bayar di Tempat</div>
                </div>
              </button>
            </div>
          </div>

          {/* Reference Number */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Nomor Referensi / ID Transaksi
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
              <span className="font-bold">Otomatis Terverifikasi & Tersinkronisasi:</span> Status invoice akan diperbarui secara real-time ke semua perangkat dan Google Sheets, serta notifikasi WhatsApp otomatis disiapkan.
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2">
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
