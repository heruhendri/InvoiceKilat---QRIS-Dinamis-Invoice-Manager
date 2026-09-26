import React, { useState, useEffect, useRef } from 'react';
import { RealtimeEvent } from '../types';
import { CheckCircle, AlertTriangle, FileText, Share2, X, BellOff, Volume2, VolumeX } from 'lucide-react';
import { formatRupiah } from '../utils/formatters';

interface NotificationToastProps {
  event: RealtimeEvent | null;
  onClose: () => void;
  onSelectInvoice?: (id: string) => void;
  onMuteToasts?: () => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({
  event,
  onClose,
  onSelectInvoice,
  onMuteToasts,
}) => {
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(100);
  const duration = 5000; // 5 seconds auto-dismiss
  const intervalStep = 50;

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!event) return;
    setProgress(100);
  }, [event]);

  useEffect(() => {
    if (!event || isPaused) return;

    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev - (intervalStep / duration) * 100;
        if (next <= 0) {
          clearInterval(timer);
          // Safely execute outside state updater / render phase
          setTimeout(() => {
            onCloseRef.current();
          }, 0);
          return 0;
        }
        return next;
      });
    }, intervalStep);

    return () => clearInterval(timer);
  }, [event, isPaused]);

  if (!event) return null;

  const isPayment = event.type === 'payment_received';
  const isReminder = event.type === 'reminder_dispatched';

  const handleMute = () => {
    try {
      localStorage.setItem('notification_toasts_muted', 'true');
    } catch {}
    if (onMuteToasts) {
      onMuteToasts();
    }
    onClose();
  };

  return (
    <aside
      id="realtime-toast"
      aria-label="Notifikasi Real-Time"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
      className="fixed bottom-4 sm:bottom-auto sm:top-20 right-3 sm:right-5 left-3 sm:left-auto z-50 max-w-sm sm:w-88 w-auto mx-auto sm:mx-0 transition-all duration-300 animate-in slide-in-from-bottom-3 sm:slide-in-from-top-3 fade-in"
    >
      <div
        className={`relative overflow-hidden rounded-2xl shadow-xl border backdrop-blur-md p-3.5 sm:p-4 text-white ${
          isPayment
            ? 'bg-slate-900/95 border-emerald-500/40 shadow-emerald-950/20'
            : isReminder
            ? 'bg-slate-900/95 border-amber-500/40 shadow-amber-950/20'
            : 'bg-slate-900/95 border-slate-700/60 shadow-slate-950/30'
        }`}
      >
        <div className="flex items-start gap-2.5 sm:gap-3">
          {/* Icon Badge */}
          <div
            className={`p-2 rounded-xl shrink-0 ${
              isPayment
                ? 'bg-emerald-500/20 text-emerald-400'
                : isReminder
                ? 'bg-amber-500/20 text-amber-400'
                : 'bg-blue-500/20 text-blue-400'
            }`}
          >
            {isPayment ? (
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            ) : isReminder ? (
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
            ) : (
              <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 pr-1">
            <div className="flex items-center justify-between gap-1 mb-1">
              <span
                className={`text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md ${
                  isPayment
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : isReminder
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                {isPayment ? 'Pembayaran Masuk' : isReminder ? 'Pengingat Tagihan' : 'Info Sistem'}
              </span>

              {/* Mute popups button */}
              <button
                type="button"
                onClick={handleMute}
                className="text-[10px] text-slate-400 hover:text-slate-200 flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-slate-800 transition"
                title="Heningkan notifikasi mengambang (tetap tersimpan di lonceng)"
              >
                <BellOff className="w-3 h-3" />
                <span className="hidden sm:inline">Heningkan</span>
              </button>
            </div>

            <p className="text-xs sm:text-sm font-semibold leading-snug line-clamp-2 text-slate-100">
              {event.message}
            </p>

            {isPayment && event.amount && (
              <p className="text-xs text-emerald-300 mt-1 font-mono font-bold">
                {formatRupiah(event.amount)}
              </p>
            )}

            {/* Actions row */}
            <div className="mt-2.5 flex items-center gap-2">
              {event.invoiceId && onSelectInvoice && (
                <button
                  type="button"
                  onClick={() => {
                    onSelectInvoice(event.invoiceId!);
                    onClose();
                  }}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition active:scale-95 shadow-2xs"
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
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 transition active:scale-95 shadow-2xs"
                >
                  <Share2 className="w-3 h-3" />
                  Kirim WA
                </a>
              )}
            </div>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition shrink-0"
            title="Tutup Notifikasi"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Subtle animated auto-dismiss progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-800">
          <div
            className={`h-full transition-all ease-linear ${
              isPayment ? 'bg-emerald-400' : isReminder ? 'bg-amber-400' : 'bg-blue-400'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </aside>
  );
};
