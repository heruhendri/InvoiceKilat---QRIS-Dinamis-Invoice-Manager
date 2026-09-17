import React from 'react';
import { RealtimeEvent } from '../types';
import { CheckCircle, AlertTriangle, FileText, Share2, X } from 'lucide-react';
import { formatRupiah } from '../utils/formatters';

interface NotificationToastProps {
  event: RealtimeEvent | null;
  onClose: () => void;
  onSelectInvoice?: (id: string) => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({
  event,
  onClose,
  onSelectInvoice,
}) => {
  if (!event) return null;

  const isPayment = event.type === 'payment_received';
  const isReminder = event.type === 'reminder_dispatched';

  return (
    <div
      id="realtime-toast"
      className="fixed top-20 right-4 z-50 max-w-sm w-full animate-in slide-in-from-top-4 fade-in duration-300"
    >
      <div className={`p-4 rounded-2xl shadow-2xl border ${
        isPayment 
          ? 'bg-emerald-900/95 text-white border-emerald-500/50 backdrop-blur-md' 
          : isReminder
          ? 'bg-amber-900/95 text-white border-amber-500/50 backdrop-blur-md'
          : 'bg-slate-900/95 text-white border-slate-700/50 backdrop-blur-md'
      }`}>
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-xl shrink-0 ${
            isPayment ? 'bg-emerald-500/20 text-emerald-300' : isReminder ? 'bg-amber-500/20 text-amber-300' : 'bg-blue-500/20 text-blue-300'
          }`}>
            {isPayment ? (
              <CheckCircle className="w-5 h-5 animate-bounce" />
            ) : isReminder ? (
              <AlertTriangle className="w-5 h-5" />
            ) : (
              <FileText className="w-5 h-5" />
            )}
          </div>

          <div className="flex-1 min-w-0 pr-2">
            <div className="flex items-center gap-1.5 mb-1">
              <span className={`text-[11px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full ${
                isPayment ? 'bg-emerald-500/30 text-emerald-200' : 'bg-slate-700 text-slate-300'
              }`}>
                {isPayment ? '⚡ Pembayaran Real-Time' : isReminder ? '🔔 Pengingat Otomatis' : '📢 Notifikasi'}
              </span>
            </div>

            <p className="text-sm font-semibold leading-snug">
              {event.message}
            </p>

            {isPayment && event.amount && (
              <p className="text-xs text-emerald-200/90 mt-1 font-mono font-medium">
                Nominal: {formatRupiah(event.amount)}
              </p>
            )}

            <div className="mt-3 flex items-center gap-2">
              {event.invoiceId && onSelectInvoice && (
                <button
                  onClick={() => {
                    onSelectInvoice(event.invoiceId!);
                    onClose();
                  }}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white/20 hover:bg-white/30 text-white transition active:scale-95"
                >
                  Buka Invoice
                </button>
              )}

              {isPayment && event.payload?.whatsappLink && (
                <a
                  href={event.payload.whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={onClose}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white flex items-center gap-1 transition active:scale-95"
                >
                  <Share2 className="w-3 h-3" />
                  Kirim WA
                </a>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
