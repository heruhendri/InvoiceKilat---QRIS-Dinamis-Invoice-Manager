import React, { useState, useEffect } from 'react';
import {
  X,
  Github,
  GitBranch,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Link,
  Check,
  ArrowRight,
  ShieldCheck,
  CheckCheck
} from 'lucide-react';
import { BusinessSettings } from '../types';

interface AppGithubUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: BusinessSettings | null;
  onUpdateSuccess: (updatedSettings: Partial<BusinessSettings>) => void;
}

interface AppCommitInfo {
  repo: string;
  branch: string;
  commitSha: string;
  commitMessage: string;
  commitAuthor: string;
  commitDate: string;
  downloadUrl: string;
}

const PRESET_APP_REPOS = [
  {
    id: 'official-main',
    title: 'InvoiceKilat Official (Main)',
    repo: 'ciptamedia/invoice-kilat',
    branch: 'main',
    url: 'https://github.com/ciptamedia/invoice-kilat',
    desc: 'Rilis resmi paling stabil dengan modul QRIS Dinamis & Mikhmon Hosting Suite',
    badge: 'Produksi',
  },
  {
    id: 'official-dev',
    title: 'InvoiceKilat Staging / Preview',
    repo: 'ciptamedia/invoice-kilat',
    branch: 'dev',
    url: 'https://github.com/ciptamedia/invoice-kilat/tree/dev',
    desc: 'Fitur terbaru, pembaruan performa, dan optimasi eksperimental',
    badge: 'Preview Dev',
  },
  {
    id: 'custom',
    title: 'Custom Link GitHub / Fork',
    repo: '',
    branch: 'main',
    url: '',
    desc: 'Gunakan tautan repositori GitHub publik atau fork Anda sendiri',
    badge: 'Custom URL',
  },
];

export const AppGithubUpdateModal: React.FC<AppGithubUpdateModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSuccess,
}) => {
  const currentAppVersion = settings?.appVersion || 'v3.2.0-stable';
  const initialUrl = settings?.appGithubRepo || 'https://github.com/ciptamedia/invoice-kilat';
  const initialBranch = settings?.appGithubBranch || 'main';

  const [selectedPreset, setSelectedPreset] = useState<string>('official-main');
  const [customUrl, setCustomUrl] = useState<string>(initialUrl);
  const [branch, setBranch] = useState<string>(initialBranch);

  const [isLoadingInfo, setIsLoadingInfo] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [commitInfo, setCommitInfo] = useState<AppCommitInfo | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    version: string;
    message: string;
  } | null>(null);

  // Helper to parse repo string from custom URL
  const parseRepoAndBranch = (inputUrl: string) => {
    let clean = inputUrl.trim();
    clean = clean.replace(/\.git$/, '');
    clean = clean.replace(/^git@github\.com:/, 'https://github.com/');
    clean = clean.replace(/^https?:\/\/github\.com\//, '');

    let repo = clean;
    let extractedBranch = branch;

    if (clean.includes('/tree/')) {
      const parts = clean.split('/tree/');
      repo = parts[0];
      extractedBranch = parts[1]?.split('/')[0] || extractedBranch;
    } else if (clean.includes('/archive/refs/heads/')) {
      const parts = clean.split('/archive/refs/heads/');
      repo = parts[0];
      extractedBranch = parts[1]?.replace(/\.zip|\.tar\.gz$/, '') || extractedBranch;
    } else {
      const segments = clean.split('/').filter(Boolean);
      if (segments.length >= 2) {
        repo = `${segments[0]}/${segments[1]}`;
      }
    }

    return { repo, branch: extractedBranch };
  };

  const handleCheckCommit = async (urlToCheck = customUrl, branchToCheck = branch) => {
    setErrorMsg(null);
    setSuccessResult(null);
    setIsLoadingInfo(true);
    try {
      const { repo, branch: b } = parseRepoAndBranch(urlToCheck);
      const res = await fetch(
        `/api/system/github-info?url=${encodeURIComponent(urlToCheck)}&repo=${encodeURIComponent(
          repo
        )}&branch=${encodeURIComponent(b)}`
      );
      const data = await res.json();
      if (data && data.success) {
        setCommitInfo(data);
      } else {
        setErrorMsg(data?.message || 'Gagal membaca repositori GitHub aplikasi.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Koneksi ke GitHub API gagal');
    } finally {
      setIsLoadingInfo(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const savedUrl = settings?.appGithubRepo || 'https://github.com/ciptamedia/invoice-kilat';
      const savedBranch = settings?.appGithubBranch || 'main';
      setCustomUrl(savedUrl);
      setBranch(savedBranch);
      setSuccessResult(null);
      setErrorMsg(null);

      const matchedPreset = PRESET_APP_REPOS.find((p) => p.url === savedUrl);
      if (matchedPreset) {
        setSelectedPreset(matchedPreset.id);
      } else {
        setSelectedPreset('custom');
      }

      handleCheckCommit(savedUrl, savedBranch);
    }
  }, [isOpen]);

  const handleSelectPreset = (presetId: string) => {
    setSelectedPreset(presetId);
    setErrorMsg(null);
    setSuccessResult(null);
    const preset = PRESET_APP_REPOS.find((p) => p.id === presetId);
    if (preset && preset.id !== 'custom') {
      setCustomUrl(preset.url);
      setBranch(preset.branch);
      handleCheckCommit(preset.url, preset.branch);
    }
  };

  const handleUrlChange = (newUrl: string) => {
    setCustomUrl(newUrl);
    setSelectedPreset('custom');
    const { branch: extractedBranch } = parseRepoAndBranch(newUrl);
    if (extractedBranch && extractedBranch !== branch) {
      setBranch(extractedBranch);
    }
  };

  const handlePerformAppUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrl.trim()) {
      setErrorMsg('Masukkan tautan repositori GitHub terlebih dahulu');
      return;
    }

    const { repo, branch: b } = parseRepoAndBranch(customUrl);
    setIsUpdating(true);
    setErrorMsg(null);
    setSuccessResult(null);

    try {
      const res = await fetch('/api/system/update-github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo,
          url: customUrl,
          branch: b,
        }),
      });

      const data = await res.json();
      if (data && data.success) {
        setSuccessResult({
          version: data.version,
          message: data.message || 'Aplikasi berhasil diperbarui dari GitHub!',
        });
        onUpdateSuccess(data.settings || {});
      } else {
        setErrorMsg(data?.message || 'Gagal menerapkan pembaruan aplikasi dari GitHub');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan saat memproses update aplikasi');
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col my-auto max-h-[94vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-500/15 text-blue-400 border border-blue-500/30">
              <Github className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black tracking-tight text-white">
                  Update Aplikasi dari GitHub
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-mono">
                  Sistem & Core
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Perbarui sistem aplikasi InvoiceKilat langsung dari repositori resmi atau custom link GitHub Anda.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handlePerformAppUpdate} className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {/* Current Version Banner */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Versi Aplikasi Terpasang
                </span>
                <span className="text-sm font-black text-white font-mono">
                  {currentAppVersion}
                </span>
              </div>
            </div>
            {settings?.lastAppUpdateAt && (
              <span className="text-[11px] text-slate-500 font-mono text-right">
                Update terakhir:<br />
                <strong className="text-slate-400 font-medium">
                  {new Date(settings.lastAppUpdateAt).toLocaleString('id-ID')}
                </strong>
              </span>
            )}
          </div>

          {/* Preset Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-2">
              Pilih Sumber Repositori Aplikasi:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {PRESET_APP_REPOS.map((preset) => {
                const isSelected = selectedPreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset.id)}
                    className={`p-3 rounded-2xl border text-left transition relative flex flex-col justify-between ${
                      isSelected
                        ? 'bg-blue-950/60 border-blue-500 text-white shadow-md'
                        : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-bold text-xs truncate text-white">{preset.title}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                        {preset.desc}
                      </p>
                    </div>
                    <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-300">
                        {preset.badge}
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-blue-400" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Link Input Field */}
          <div className="space-y-3.5 p-4 rounded-2xl bg-slate-950 border border-slate-800">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Link className="w-3.5 h-3.5 text-blue-400" />
                  <span>Tautan Repositori GitHub Aplikasi</span>
                  <span className="text-rose-400">*</span>
                </label>
                <span className="text-[10px] text-slate-500 font-mono">
                  Bisa paste URL lengkap atau owner/repo
                </span>
              </div>
              <div className="relative">
                <Github className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={customUrl}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  placeholder="https://github.com/ciptamedia/invoice-kilat"
                  required
                  className="w-full pl-10 pr-3 py-2.5 text-xs font-mono rounded-xl border border-slate-700 bg-slate-900 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  Branch / Tag <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <GitBranch className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    placeholder="main / master / release"
                    required
                    className="w-full pl-8 pr-3 py-2 text-xs font-mono rounded-xl border border-slate-700 bg-slate-900 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => handleCheckCommit(customUrl, branch)}
                  disabled={isLoadingInfo || !customUrl.trim()}
                  className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-95"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingInfo ? 'animate-spin text-amber-400' : ''}`} />
                  <span>{isLoadingInfo ? 'Memeriksa...' : 'Cek Pembaruan GitHub'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Commit Preview Information Card */}
          {commitInfo && (
            <div className="p-4 rounded-2xl bg-blue-950/30 border border-blue-500/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-300 flex items-center gap-1.5 font-mono">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Repositori Terverifikasi: {commitInfo.repo} ({commitInfo.branch})</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-200">
                  Commit {commitInfo.commitSha}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1 text-xs">
                <p className="text-slate-200 font-semibold truncate">
                  "{commitInfo.commitMessage}"
                </p>
                <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 font-mono pt-1">
                  <span>Author: <strong className="text-slate-300">{commitInfo.commitAuthor}</strong></span>
                  <span>Dirilis: {new Date(commitInfo.commitDate).toLocaleString('id-ID')}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                <span className="text-slate-400">
                  Status: Siap di-update ke versi terbaru
                </span>
                <a
                  href={`https://github.com/${commitInfo.repo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 flex items-center gap-1 font-bold"
                >
                  <span>Buka di GitHub</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}

          {/* Success Message Banner */}
          {successResult && (
            <div className="p-4 rounded-2xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-200 text-xs space-y-2 animate-in fade-in">
              <div className="flex items-center gap-2 font-bold text-emerald-300">
                <CheckCheck className="w-4 h-4 text-emerald-400" />
                <span>Pembaruan Berhasil Diterapkan!</span>
              </div>
              <p className="text-[11px] text-emerald-200/90">
                {successResult.message} Versi sekarang: <strong className="font-mono text-white">{successResult.version}</strong>
              </p>
              <div className="pt-1 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Muat Ulang Halaman</span>
                </button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Gagal Update:</p>
                <p className="text-[11px] text-rose-300/90 mt-0.5">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* Footer Action Buttons */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isUpdating}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition active:scale-95 disabled:opacity-50"
            >
              Tutup
            </button>

            <button
              type="submit"
              disabled={isUpdating || !customUrl.trim()}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 hover:from-blue-500 hover:to-sky-500 text-white font-black text-xs transition flex items-center gap-2 shadow-lg shadow-blue-600/30 active:scale-95 disabled:opacity-50"
            >
              <Github className="w-4 h-4" />
              <span>{isUpdating ? 'Mengunduh & Memasang...' : 'Update & Pasang Sekarang'}</span>
              {isUpdating ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ArrowRight className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
