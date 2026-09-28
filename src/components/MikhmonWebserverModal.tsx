import React, { useState, useEffect } from 'react';
import {
  X,
  Server,
  Globe,
  Cpu,
  Activity,
  CheckCircle2,
  Terminal,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  Layers,
  HardDrive,
  Ticket,
  Maximize2,
  Upload,
  FolderArchive,
  Trash2,
  Sparkles,
  Settings,
  Code2
} from 'lucide-react';
import { MikhmonInstance, MikhmonServerConfig, MikhmonWebserverStatus, MikhmonUploadedPackage } from '../types';

interface MikhmonWebserverModalProps {
  isOpen: boolean;
  onClose: () => void;
  instances: MikhmonInstance[];
  serverConfig: MikhmonServerConfig;
  setServerConfig: React.Dispatch<React.SetStateAction<MikhmonServerConfig>>;
  onSaveServerConfig: (e: React.FormEvent) => void;
  isSavingServerSettings: boolean;
  uploadForm: {
    fileName: string;
    version: string;
    notes: string;
    setAsDefault: boolean;
    fileSizeBytes: number;
  };
  setUploadForm: React.Dispatch<React.SetStateAction<{
    fileName: string;
    version: string;
    notes: string;
    setAsDefault: boolean;
    fileSizeBytes: number;
  }>>;
  onUploadWebPackage: (e: React.FormEvent) => void;
  isUploadingPackage: boolean;
  onActivatePackage: (id: string) => Promise<void>;
  onDeletePackage: (id: string) => Promise<void>;
  nginxVhost?: string;
  onOpenPortal: (inst: MikhmonInstance) => void;
  onOpenVouchers: (inst: MikhmonInstance) => void;
  showNotice: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const MikhmonWebserverModal: React.FC<MikhmonWebserverModalProps> = ({
  isOpen,
  onClose,
  instances,
  serverConfig,
  setServerConfig,
  onSaveServerConfig,
  isSavingServerSettings,
  uploadForm,
  setUploadForm,
  onUploadWebPackage,
  isUploadingPackage,
  onActivatePackage,
  onDeletePackage,
  nginxVhost,
  onOpenPortal,
  onOpenVouchers,
  showNotice,
}) => {
  const [activeTab, setActiveTab] = useState<'status' | 'domain' | 'vhosts' | 'upload' | 'installer' | 'nginx'>('status');
  const [status, setStatus] = useState<MikhmonWebserverStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // VPS Installer Form
  const [vpsForm, setVpsForm] = useState({
    domain: serverConfig.masterDomain || 'mikhmon.online',
    ip: serverConfig.fallbackIpOrHost || '103.189.234.12',
    email: serverConfig.sslEmail || 'admin@' + (serverConfig.masterDomain || 'mikhmon.online'),
  });
  const [installerScript, setInstallerScript] = useState<string>('');
  const [isGeneratingScript, setIsGeneratingScript] = useState<boolean>(false);

  // Fetch Webserver Status
  const fetchStatus = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/mikhmon/webserver/status');
      const data = await res.json();
      if (data && data.success && data.status) {
        setStatus(data.status);
      }
    } catch (err: any) {
      console.warn('Gagal memuat status webserver:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
      setVpsForm({
        domain: serverConfig.masterDomain || 'mikhmon.online',
        ip: serverConfig.fallbackIpOrHost || '103.189.234.12',
        email: serverConfig.sslEmail || 'admin@' + (serverConfig.masterDomain || 'mikhmon.online'),
      });
      handleGenerateScript();
    }
  }, [isOpen, serverConfig.masterDomain, serverConfig.fallbackIpOrHost]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleGenerateScript = async () => {
    setIsGeneratingScript(true);
    try {
      const res = await fetch('/api/mikhmon/webserver/install-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vpsForm),
      });
      const data = await res.json();
      if (data.success && data.script) {
        setInstallerScript(data.script);
      }
    } catch (err: any) {
      showNotice('error', 'Gagal generate installer: ' + err.message);
    } finally {
      setIsGeneratingScript(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-3xl max-w-5xl w-full shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black tracking-tight text-white">
                  Pusat Webserver & Domain Mikhmon
                </h3>
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  Aktif (Engine v3.20)
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Kelola infrastruktur webserver multi-tenant, domain wildcard, VirtualHost, berkas Mikhmon, dan script installer VPS.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchStatus}
              disabled={isLoading}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition active:scale-95 disabled:opacity-50"
              title="Perbarui Status Webserver"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition active:scale-95"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 px-6 pt-3 bg-slate-950/60 border-b border-slate-800 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('status')}
            className={`px-4 py-2.5 text-xs font-bold rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'status'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Status & Port</span>
          </button>

          <button
            onClick={() => setActiveTab('domain')}
            className={`px-4 py-2.5 text-xs font-bold rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'domain'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Domain & DNS</span>
          </button>

          <button
            onClick={() => setActiveTab('vhosts')}
            className={`px-4 py-2.5 text-xs font-bold rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'vhosts'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>VirtualHost ({instances.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-2.5 text-xs font-bold rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'upload'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Web ({serverConfig.uploadedPackages?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('installer')}
            className={`px-4 py-2.5 text-xs font-bold rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'installer'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>1-Click VPS Installer</span>
          </button>

          <button
            onClick={() => setActiveTab('nginx')}
            className={`px-4 py-2.5 text-xs font-bold rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'nginx'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Config Nginx VPS</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* TAB 1: STATUS & PORTS */}
          {activeTab === 'status' && (
            <div className="space-y-6">
              {/* Metric KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Engine Uptime</div>
                  <div className="mt-2 text-xl font-black font-mono text-white">
                    {status?.uptimeFormatted || '0m 0d'}
                  </div>
                  <div className="mt-1 text-[11px] text-emerald-400 flex items-center gap-1 font-mono">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Layanan Normal</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Memori Server</div>
                  <div className="mt-2 text-xl font-black font-mono text-white">
                    {status?.memoryUsageMb || 120} <span className="text-xs font-normal text-slate-400">MB</span>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400">
                    dari total {status?.totalMemoryMb || 4096} MB
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Subdomain Aktif</div>
                  <div className="mt-2 text-xl font-black font-mono text-amber-400">
                    {status?.activeInstances || 0} <span className="text-xs font-normal text-slate-400">/ {status?.totalInstances || 0}</span>
                  </div>
                  <div className="mt-1 text-[11px] text-rose-400">
                    {status?.suspendedInstances || 0} tenant diisolir
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Versi Mikhmon</div>
                  <div className="mt-2 text-sm font-bold font-mono text-white truncate">
                    {serverConfig.activeVersion || 'V3.20 (PHP 8.2)'}
                  </div>
                  <div className="mt-1 text-[11px] text-indigo-400">
                    LTS Cloud Edition
                  </div>
                </div>
              </div>

              {/* Listening Ports Table */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-amber-400" />
                    <span>Status Port & Protokol Jaringan</span>
                  </h4>
                  <span className="text-[11px] font-mono text-slate-400">
                    Platform: {status?.platform || 'Linux'}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400">
                        <th className="py-2.5 px-3">Port</th>
                        <th className="py-2.5 px-3">Layanan</th>
                        <th className="py-2.5 px-3">Fungsi</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      <tr>
                        <td className="py-2.5 px-3 font-bold text-amber-400">Port 80</td>
                        <td className="py-2.5 px-3 text-slate-200">HTTP Webserver</td>
                        <td className="py-2.5 px-3 text-slate-400 font-sans">Akses web browser & redirect HTTP ke HTTPS</td>
                        <td className="py-2.5 px-3"><span className="text-emerald-400 font-bold">● LISTENING</span></td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-bold text-amber-400">Port 443</td>
                        <td className="py-2.5 px-3 text-slate-200">HTTPS SSL (Certbot)</td>
                        <td className="py-2.5 px-3 text-slate-400 font-sans">Enkripsi aman Let's Encrypt Wildcard (*.{serverConfig.masterDomain})</td>
                        <td className="py-2.5 px-3"><span className="text-emerald-400 font-bold">● LISTENING</span></td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-bold text-indigo-400">Port 3000</td>
                        <td className="py-2.5 px-3 text-slate-200">InvoiceKilat Multi-Tenant API</td>
                        <td className="py-2.5 px-3 text-slate-400 font-sans">Pusat kontrol database, webhook QRIS, dan automasi isolir</td>
                        <td className="py-2.5 px-3"><span className="text-emerald-400 font-bold">● ACTIVE</span></td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-bold text-emerald-400">Port 8728 / 8729</td>
                        <td className="py-2.5 px-3 text-slate-200">MikroTik RouterOS API</td>
                        <td className="py-2.5 px-3 text-slate-400 font-sans">Jembatan query voucher, aktifitas hotspot & sync live</td>
                        <td className="py-2.5 px-3"><span className="text-amber-400 font-bold">● BRIDGE READY</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Direct Server URL tester */}
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h5 className="text-xs font-bold text-amber-300">
                    Host Master Webserver: {serverConfig.masterDomain || 'mikhmon.online'}
                  </h5>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Semua subdomain otomatis dipetakan ke web root <code className="text-amber-200 font-mono">{serverConfig.webRootDir || '/var/www/mikhmon'}</code>.
                  </p>
                </div>
                <a
                  href={`https://${serverConfig.masterDomain || 'mikhmon.online'}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition flex items-center gap-1.5 shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Kunjungi Host Master</span>
                </a>
              </div>
            </div>
          )}

          {/* TAB 2: DOMAIN & WILDCARD DNS */}
          {activeTab === 'domain' && (
            <form onSubmit={onSaveServerConfig} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Master Domain Mikhmon <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Globe className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={serverConfig.masterDomain}
                      onChange={(e) => setServerConfig({ ...serverConfig, masterDomain: e.target.value })}
                      required
                      placeholder="mikhmon.online"
                      className="w-full pl-9 pr-3.5 py-2.5 text-xs font-bold rounded-xl border border-slate-700 bg-slate-950 text-white focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Tenant akan otomatis memakai subdomain: <code className="text-amber-400 font-bold">tenant.{serverConfig.masterDomain || 'mikhmon.online'}</code>
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    IP Publik Server VPS <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Server className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={serverConfig.fallbackIpOrHost || ''}
                      onChange={(e) => setServerConfig({ ...serverConfig, fallbackIpOrHost: e.target.value })}
                      required
                      placeholder="103.147.20.12"
                      className="w-full pl-9 pr-3.5 py-2.5 text-xs font-bold font-mono rounded-xl border border-slate-700 bg-slate-950 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    IP server tempat Nginx, PHP-FPM, dan paket Mikhmon dijalankan.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Web Root Directory
                  </label>
                  <input
                    type="text"
                    value={serverConfig.webRootDir}
                    onChange={(e) => setServerConfig({ ...serverConfig, webRootDir: e.target.value })}
                    placeholder="/var/www/mikhmon"
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-700 bg-slate-950 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    PHP Socket / Versi
                  </label>
                  <select
                    value={serverConfig.phpVersion}
                    onChange={(e) => setServerConfig({ ...serverConfig, phpVersion: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-700 bg-slate-950 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="php8.2-fpm">PHP 8.2-FPM (Direkomendasikan)</option>
                    <option value="php8.1-fpm">PHP 8.1-FPM</option>
                    <option value="php8.0-fpm">PHP 8.0-FPM</option>
                    <option value="php7.4-fpm">PHP 7.4-FPM</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    SSL / HTTPS Provider
                  </label>
                  <select
                    value={serverConfig.sslProvider}
                    onChange={(e) => setServerConfig({ ...serverConfig, sslProvider: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-700 bg-slate-950 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="letsencrypt">Let's Encrypt Wildcard SSL</option>
                    <option value="cloudflare">Cloudflare Origin CA / Flexible</option>
                    <option value="custom">Sertifikat Custom Manual</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Email Admin untuk Notifikasi SSL
                  </label>
                  <input
                    type="email"
                    value={serverConfig.sslEmail}
                    onChange={(e) => setServerConfig({ ...serverConfig, sslEmail: e.target.value })}
                    placeholder="admin@domainanda.com"
                    className="w-full px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-700 bg-slate-950 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={serverConfig.wildcardEnabled}
                      onChange={(e) => setServerConfig({ ...serverConfig, wildcardEnabled: e.target.checked })}
                      className="w-4 h-4 text-amber-500 rounded-sm focus:ring-amber-500 bg-slate-950 border-slate-700"
                    />
                    <span className="text-xs font-bold text-slate-200">
                      Aktifkan Wildcard Subdomain (*.{serverConfig.masterDomain || 'mikhmon.online'})
                    </span>
                  </label>
                </div>
              </div>

              {/* DNS Setup Guide Card */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>Panduan DNS Record di Cloudflare / Registrar Domain:</span>
                  </h4>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse font-mono">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                        <th className="pb-2">Tipe</th>
                        <th className="pb-2">Nama / Host</th>
                        <th className="pb-2">Target / IP Value</th>
                        <th className="pb-2 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-[11px]">
                      <tr>
                        <td className="py-2.5 font-bold text-amber-400">A</td>
                        <td className="py-2.5 font-bold text-white">@</td>
                        <td className="py-2.5 text-slate-300">{serverConfig.fallbackIpOrHost || 'IP_VPS'}</td>
                        <td className="py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => handleCopy(serverConfig.fallbackIpOrHost || '', 'dns-1')}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 font-bold border border-slate-700 hover:bg-slate-700"
                          >
                            {copiedKey === 'dns-1' ? 'Disalin!' : 'Salin IP'}
                          </button>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 font-bold text-amber-400">A</td>
                        <td className="py-2.5 font-bold text-white">* (Wildcard)</td>
                        <td className="py-2.5 text-slate-300">{serverConfig.fallbackIpOrHost || 'IP_VPS'}</td>
                        <td className="py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => handleCopy(serverConfig.fallbackIpOrHost || '', 'dns-2')}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 font-bold border border-slate-700 hover:bg-slate-700"
                          >
                            {copiedKey === 'dns-2' ? 'Disalin!' : 'Salin IP'}
                          </button>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 font-bold text-amber-400">CNAME</td>
                        <td className="py-2.5 font-bold text-white">www</td>
                        <td className="py-2.5 text-slate-300">{serverConfig.masterDomain}</td>
                        <td className="py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => handleCopy(serverConfig.masterDomain, 'dns-3')}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 font-bold border border-slate-700 hover:bg-slate-700"
                          >
                            {copiedKey === 'dns-3' ? 'Disalin!' : 'Salin'}
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Form Footer */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="submit"
                  disabled={isSavingServerSettings}
                  className="px-5 py-2.5 text-xs font-black text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl shadow-md transition active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSavingServerSettings ? 'Menyimpan...' : 'Simpan Pengaturan Domain'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: VIRTUALHOSTS & TENANTS */}
          {activeTab === 'vhosts' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">
                  Daftar VirtualHost Subdomain yang aktif dilayani oleh Webserver:
                </span>
                <span className="font-mono text-amber-400 font-bold">
                  {instances.length} VirtualHosts Terdaftar
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {instances.map((inst) => {
                  const isSuspended = inst.status === 'suspended';
                  const portalUrl = `/mikhmon/portal/${inst.id}`;

                  return (
                    <div
                      key={inst.id}
                      className={`p-4 rounded-2xl border transition flex flex-col justify-between ${
                        isSuspended
                          ? 'bg-rose-950/20 border-rose-900/40 text-rose-200'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                            <h5 className="font-bold text-sm text-white font-mono">{inst.subdomain}</h5>
                          </div>
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                              isSuspended
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            }`}
                          >
                            {isSuspended ? 'Diisolir' : 'Aktif (200 OK)'}
                          </span>
                        </div>

                        <div className="mt-2 space-y-1 text-[11px] text-slate-400 font-mono">
                          <p>Pelanggan: <span className="text-slate-200 font-sans font-semibold">{inst.customerName}</span></p>
                          <p>Sesi: <span className="text-amber-400 font-bold">{inst.sessionName}</span></p>
                          <p>Router: <span className="text-slate-300">{inst.mikrotikHost}:{inst.mikrotikPort || 8728}</span></p>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => onOpenPortal(inst)}
                            className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold transition flex items-center gap-1.5"
                            title="Buka konsol interaktif Mikhmon"
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                            <span>Preview</span>
                          </button>

                          <a
                            href={portalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5"
                            title="Buka di Tab Baru Langsung"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Buka Tab</span>
                          </a>
                        </div>

                        <button
                          onClick={() => onOpenVouchers(inst)}
                          className="px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-bold transition flex items-center gap-1.5"
                        >
                          <Ticket className="w-3.5 h-3.5" />
                          <span>Voucher</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: UPLOAD WEB MIKHMON */}
          {activeTab === 'upload' && (
            <div className="space-y-6">
              {/* Upload Form Box */}
              <form onSubmit={onUploadWebPackage} className="p-5 rounded-2xl border border-slate-800 bg-slate-950 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white">Unggah & Registrasi Paket Web Mikhmon</h4>
                    <p className="text-[11px] text-slate-400">
                      Ekstrak berkas master web Mikhmon (ZIP) ke direktori web root server VPS
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                      Nama Berkas / Arsip <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={uploadForm.fileName}
                      onChange={(e) => setUploadForm({ ...uploadForm, fileName: e.target.value })}
                      required
                      placeholder="Contoh: mikhmon-v3-custom.zip"
                      className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-800 bg-slate-900 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                      Label / Versi Mikhmon <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={uploadForm.version}
                      onChange={(e) => setUploadForm({ ...uploadForm, version: e.target.value })}
                      required
                      placeholder="Mikhmon V3.20 Official (PHP 8)"
                      className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-800 bg-slate-900 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                    Catatan Rilis / Modifikasi
                  </label>
                  <input
                    type="text"
                    value={uploadForm.notes}
                    onChange={(e) => setUploadForm({ ...uploadForm, notes: e.target.value })}
                    placeholder="Contoh: Template voucher thermal 58mm sudah terpasang"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-800 bg-slate-900 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={uploadForm.setAsDefault}
                      onChange={(e) => setUploadForm({ ...uploadForm, setAsDefault: e.target.checked })}
                      className="w-4 h-4 text-amber-500 rounded-sm focus:ring-amber-500 bg-slate-900 border-slate-700"
                    />
                    <span className="text-xs font-bold text-slate-300">
                      Jadikan sebagai versi web default untuk semua tenant baru
                    </span>
                  </label>

                  <button
                    type="submit"
                    disabled={isUploadingPackage}
                    className="px-5 py-2.5 text-xs font-black text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl shadow-md transition active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Upload className="w-4 h-4" />
                    <span>{isUploadingPackage ? 'Memproses Berkas...' : 'Unggah & Pasang Paket'}</span>
                  </button>
                </div>
              </form>

              {/* Uploaded Packages List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <FolderArchive className="w-4 h-4 text-amber-400" />
                    <span>Daftar Paket Web Mikhmon di Server</span>
                  </h4>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Versi Aktif: <strong className="text-amber-400">{serverConfig.activeVersion}</strong>
                  </span>
                </div>

                {serverConfig.uploadedPackages && serverConfig.uploadedPackages.length > 0 ? (
                  <div className="space-y-2.5">
                    {serverConfig.uploadedPackages.map((pkg) => (
                      <div
                        key={pkg.id}
                        className={`p-3.5 rounded-2xl border transition flex items-center justify-between gap-3 ${
                          pkg.isDefault
                            ? 'bg-amber-500/10 border-amber-500/30 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <h5 className="font-bold text-xs text-white truncate">{pkg.version}</h5>
                            {pkg.isDefault && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[9px] uppercase tracking-wider">
                                Default Aktif
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] font-mono text-slate-400 truncate">
                            Berkas: <span className="text-slate-200">{pkg.fileName}</span> &bull; Path: <span>{pkg.extractedPath}</span>
                          </p>
                          {pkg.notes && <p className="text-[11px] text-slate-400">{pkg.notes}</p>}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {!pkg.isDefault && (
                            <button
                              type="button"
                              onClick={() => onActivatePackage(pkg.id)}
                              className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs transition active:scale-95"
                            >
                              Jadikan Aktif
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => onDeletePackage(pkg.id)}
                            className="p-2 rounded-xl text-rose-400 hover:bg-rose-500/20 transition"
                            title="Hapus paket"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center bg-slate-950 rounded-2xl border border-dashed border-slate-800 text-slate-400 text-xs">
                    Belum ada paket web Mikhmon tambahan yang diunggah.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: 1-CLICK VPS INSTALLER */}
          {activeTab === 'installer' && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-800/40 space-y-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-indigo-300 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-indigo-400" />
                  <span>Generator Script Turnkey Webserver (Ubuntu / Debian VPS)</span>
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Pasang seluruh webserver Mikhmon multi-tenant (Nginx + PHP 8.2-FPM + Certbot SSL Wildcard + InvoiceKilat Engine) di VPS Anda dengan 1 baris perintah saja.
                </p>
              </div>

              {/* Form Input Customization */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                    Master Domain
                  </label>
                  <input
                    type="text"
                    value={vpsForm.domain}
                    onChange={(e) => setVpsForm({ ...vpsForm, domain: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                    placeholder="mikhmon.online"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                    IP Public VPS
                  </label>
                  <input
                    type="text"
                    value={vpsForm.ip}
                    onChange={(e) => setVpsForm({ ...vpsForm, ip: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                    placeholder="103.189.234.12"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                    Email Certbot SSL
                  </label>
                  <input
                    type="email"
                    value={vpsForm.email}
                    onChange={(e) => setVpsForm({ ...vpsForm, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                    placeholder="admin@mikhmon.online"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleGenerateScript}
                  disabled={isGeneratingScript}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingScript ? 'animate-spin' : ''}`} />
                  <span>Perbarui Script Installer</span>
                </button>
              </div>

              {/* 1-Line Command Copy Box */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-amber-400 font-mono">
                    Perintah 1 Baris di Terminal SSH VPS:
                  </span>
                  <button
                    onClick={() =>
                      handleCopy(
                        `curl -sSL https://${vpsForm.domain}/api/mikhmon/webserver/installer.sh | sudo bash`,
                        'curl'
                      )
                    }
                    className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5"
                  >
                    {copiedKey === 'curl' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Salin Perintah</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs text-emerald-400 select-all overflow-x-auto">
                  curl -sSL https://{vpsForm.domain}/api/mikhmon/webserver/installer.sh | sudo bash
                </div>
              </div>

              {/* Full Bash Script Code Box */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-400">Isi Lengkap Script Bash (/tmp/install-mikhmon.sh):</span>
                  <button
                    onClick={() => handleCopy(installerScript, 'script')}
                    className="text-xs text-amber-400 hover:underline flex items-center gap-1 font-mono font-bold"
                  >
                    {copiedKey === 'script' ? '✓ Tersalin' : 'Salin Seluruh Script'}
                  </button>
                </div>
                <div className="rounded-2xl bg-slate-950 p-4 border border-slate-800 overflow-x-auto text-[11px] font-mono text-slate-300 max-h-64 select-all">
                  <pre>{installerScript}</pre>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: NGINX CONFIG VPS */}
          {activeTab === 'nginx' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                    <Terminal className="w-4 h-4 text-amber-400" />
                    <span>Konfigurasi Virtual Host Nginx Otomatis</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Disimpan pada file <code className="text-amber-400 font-bold font-mono">/etc/nginx/sites-available/{serverConfig.masterDomain || 'mikhmon'}</code> di server VPS
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(nginxVhost || '', 'nginx-cfg')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition active:scale-95"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedKey === 'nginx-cfg' ? 'Tersalin!' : 'Salin Konfigurasi'}</span>
                </button>
              </div>

              <div className="relative rounded-2xl bg-slate-950 p-4 border border-slate-800 overflow-x-auto text-xs font-mono text-emerald-400 max-h-80 select-all">
                <pre>{nginxVhost || '# Konfigurasi belum di-generate'}</pre>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                <h5 className="font-bold text-amber-400">Langkah Penerapan di Server VPS Linux:</h5>
                <ol className="list-decimal list-inside space-y-1 text-slate-300 font-mono text-[11px]">
                  <li>Simpan config ke: <code className="text-white">sudo nano /etc/nginx/sites-available/{serverConfig.masterDomain || 'mikhmon'}</code></li>
                  <li>Aktifkan vhost: <code className="text-white">sudo ln -sf /etc/nginx/sites-available/{serverConfig.masterDomain || 'mikhmon'} /etc/nginx/sites-enabled/</code></li>
                  <li>Uji konfigurasi: <code className="text-white">sudo nginx -t</code></li>
                  <li>Reload service: <code className="text-white">sudo systemctl reload nginx</code></li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div className="text-[11px] text-slate-400 font-mono">
            Webserver Engine &bull; InvoiceKilat v3.20 &bull; Port 80/443/3000
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition active:scale-95"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
