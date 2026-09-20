import React, { useState } from 'react';
import { 
  Sparkles, 
  MessageCircle, 
  Phone, 
  ChevronUp, 
  ChevronDown, 
  Check, 
  Copy, 
  ExternalLink,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { BusinessSettings } from '../types';

interface AppWatermarkProps {
  settings?: BusinessSettings | null;
  mode?: 'floating' | 'banner' | 'compact' | 'subtle';
  className?: string;
}

export const AppWatermark: React.FC<AppWatermarkProps> = ({
  settings,
  mode = 'floating',
  className = '',
}) => {
  const [copied, setCopied] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Default text requested by user
  const watermarkText = settings?.watermarkText || 'Aplikasi ini dibuat oleh Heru Hendri • Contact Person: 08977345640';
  const showAppWatermark = settings?.showAppWatermark !== false;

  if (!showAppWatermark) return null;

  // Extract phone number from watermark text or settings
  const phoneMatch = watermarkText.match(/(?:08|628|\+628)[0-9\s\-]{8,15}/);
  const rawPhone = phoneMatch ? phoneMatch[0].replace(/[^0-9]/g, '') : '08977345640';
  const waNumber = rawPhone.startsWith('0') ? '62' + rawPhone.slice(1) : rawPhone;
  const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent('Halo Heru Hendri, saya menghubungi terkait sistem aplikasi billing & invoice.')}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(watermarkText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Subtle background imprint mode
  if (mode === 'subtle') {
    return (
      <div 
        id="app-watermark-subtle"
        className={`pointer-events-none select-none flex items-center justify-center gap-2 py-4 text-[11px] font-semibold text-slate-400/80 tracking-wide uppercase ${className}`}
      >
        <span className="w-6 h-px bg-slate-200"></span>
        <span>{watermarkText}</span>
        <span className="w-6 h-px bg-slate-200"></span>
      </div>
    );
  }

  // Bottom banner mode
  if (mode === 'banner') {
    return (
      <footer 
        id="app-watermark-banner"
        className={`w-full py-3.5 px-4 bg-slate-900 border-t border-slate-800 text-white text-xs ${className}`}
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <p className="font-extrabold text-slate-100 text-xs sm:text-sm">
                {watermarkText}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Sistem Billing Otomatis, Router Mikrotik PPPoE, & QRIS Dinamis
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-semibold transition"
              title="Salin Teks Watermark"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Tersalin' : 'Salin Kontak'}</span>
            </button>

            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shadow-xs transition active:scale-95"
            >
              <MessageCircle className="w-3.5 h-3.5 fill-current" />
              <span>WhatsApp Developer</span>
              <ExternalLink className="w-3 h-3 opacity-70" />
            </a>
          </div>
        </div>
      </footer>
    );
  }

  // Floating Pill Mode (Disabled as requested: user removed floating button)
  if (mode === 'floating') {
    return null;
  }

  return null;
};
