import React, { useState } from 'react';
import { X, ExternalLink, RefreshCw, Power, CheckCircle2, AlertTriangle, Maximize2 } from 'lucide-react';
import { MikhmonInstance } from '../types';

interface MikhmonLivePortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  instance: MikhmonInstance | null;
  onToggleStatus?: (inst: MikhmonInstance) => void;
}

export const MikhmonLivePortalModal: React.FC<MikhmonLivePortalModalProps> = ({
  isOpen,
  onClose,
  instance,
  onToggleStatus,
}) => {
  const [key, setKey] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  if (!isOpen || !instance) return null;

  const isSuspended = instance.status === 'suspended';
  const portalUrl = `/mikhmon/portal/${instance.id}?t=${key}`;

  const handleRefresh = () => {
    setIsLoading(true);
    setKey((prev) => prev + 1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-hidden animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-3xl w-full max-w-6xl h-[92vh] shadow-2xl flex flex-col overflow-hidden">
        {/* Browser Topbar Frame */}
        <div className="p-3 sm:p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3">
          {/* Left: Window Controls & Title */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
            </div>

            <div className="h-4 w-px bg-slate-800 mx-1" />

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-white truncate">
                  {instance.subdomain}
                </span>
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase font-mono ${
                    isSuspended
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {isSuspended ? 'Isolir / Suspended' : 'Aktif (200 OK)'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono truncate">
                Sesi: <span className="text-amber-400 font-bold">{instance.sessionName}</span> &bull; {instance.customerName}
              </p>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {onToggleStatus && (
              <button
                onClick={() => {
                  onToggleStatus(instance);
                  setTimeout(handleRefresh, 300);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  isSuspended
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30'
                }`}
                title="Ubah status untuk menguji tampilan Aktif vs Terisolir"
              >
                <Power className="w-3.5 h-3.5" />
                <span>{isSuspended ? 'Uji Status: Aktifkan' : 'Uji Status: Isolir'}</span>
              </button>
            )}

            <button
              onClick={handleRefresh}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="Refresh Halaman Web"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            <a
              href={`/mikhmon/portal/${instance.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition flex items-center gap-1.5"
              title="Buka full screen di tab baru browser"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Tab Baru</span>
            </a>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Address Bar Simulator */}
        <div className="px-4 py-2 bg-slate-950/80 border-b border-slate-800/80 flex items-center gap-2 text-xs font-mono">
          <span className="text-emerald-400">🔒 https://</span>
          <span className="text-white font-bold">{instance.subdomain}</span>
          <span className="text-slate-500">/mikhmon/portal/{instance.id}</span>
        </div>

        {/* Iframe Browser Frame */}
        <div className="flex-1 bg-slate-950 relative overflow-hidden">
          <iframe
            key={key}
            src={portalUrl}
            onLoad={() => setIsLoading(false)}
            className="w-full h-full border-0 bg-slate-950"
            title={`Mikhmon Portal - ${instance.subdomain}`}
          />
        </div>
      </div>
    </div>
  );
};
