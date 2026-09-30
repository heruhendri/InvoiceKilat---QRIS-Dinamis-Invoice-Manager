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
  Server,
  FolderArchive,
  ArrowRight
} from 'lucide-react';
import { MikhmonServerConfig } from '../types';

interface MikhmonGithubUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  serverConfig: MikhmonServerConfig;
  onUpdateSuccess: (updatedConfig: Partial<MikhmonServerConfig>) => void;
  showNotice: (type: 'success' | 'error' | 'info', message: string) => void;
}

interface GithubCommitInfo {
  repo: string;
  branch: string;
  commitSha: string;
  commitMessage: string;
  commitAuthor: string;
  commitDate: string;
  downloadUrl: string;
}

const PRESET_REPOS = [
  {
    id: 'official-v3',
    title: 'Mikhmon V3 Official (LTS)',
    repo: 'laksa19/mikhmonv3',
    branch: 'master',
    url: 'https://github.com/laksa19/mikhmonv3',
    desc: 'Versi paling stabil & teruji untuk hotspot MikroTik (PHP 7.4 - PHP 8.2)',
    badge: 'Rekomendasi',
  },
  {
    id: 'official-v4',
    title: 'Mikhmon V4 Modern GUI',
    repo: 'laksa19/mikhmonv4',
    branch: 'main',
    url: 'https://github.com/laksa19/mikhmonv4',
    desc: 'Antarmuka modern terbaru dengan arsitektur REST API & responsive UI',
    badge: 'V4 Modern',
  },
  {
    id: 'custom',
    title: 'Custom Link GitHub Pribadi / Fork',
    repo: '',
    branch: 'master',
    url: '',
    desc: 'Gunakan tautan repositori GitHub publik/pribadi atau fork custom Anda sendiri',
    badge: 'Custom URL',
  },
];

export const MikhmonGithubUpdateModal: React.FC<MikhmonGithubUpdateModalProps> = ({
  isOpen,
  onClose,
  serverConfig,
  onUpdateSuccess,
  showNotice,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<string>('official-v3');
  const [customUrl, setCustomUrl] = useState<string>(
    serverConfig.customGithubRepo || 'https://github.com/laksa19/mikhmonv3'
  );
  const [branch, setBranch] = useState<string>(serverConfig.customGithubBranch || 'master');
  const [setAsDefault, setSetAsDefault] = useState<boolean>(true);

  const [isLoadingInfo, setIsLoadingInfo] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [commitInfo, setCommitInfo] = useState<GithubCommitInfo | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

  // Check GitHub repo information
  const handleCheckCommit = async (urlToCheck = customUrl, branchToCheck = branch) => {
    setErrorMsg(null);
    setIsLoadingInfo(true);
    try {
      const { repo, branch: b } = parseRepoAndBranch(urlToCheck);
      const res = await fetch(
        `/api/mikhmon/packages/github-info?repo=${encodeURIComponent(repo)}&branch=${encodeURIComponent(b)}`
      );
      const data = await res.json();
      if (data && data.success) {
        setCommitInfo(data);
      } else {
        setErrorMsg(data?.message || 'Gagal membaca repositori GitHub. Pastikan URL & nama branch valid.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Koneksi ke GitHub API gagal');
    } finally {
      setIsLoadingInfo(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const initialUrl = serverConfig.customGithubRepo || 'https://github.com/laksa19/mikhmonv3';
      setCustomUrl(initialUrl);
      const isPreset = PRESET_REPOS.find((p) => p.url === initialUrl);
      if (isPreset) {
        setSelectedPreset(isPreset.id);
        setBranch(isPreset.branch);
      } else {
        setSelectedPreset('custom');
      }
      handleCheckCommit(initialUrl, serverConfig.customGithubBranch || 'master');
    }
  }, [isOpen]);

  const handleSelectPreset = (presetId: string) => {
    setSelectedPreset(presetId);
    setErrorMsg(null);
    const preset = PRESET_REPOS.find((p) => p.id === presetId);
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

  // Perform Update
  const handlePerformUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrl.trim()) {
      showNotice('error', 'Masukkan tautan / repository GitHub terlebih dahulu');
      return;
    }

    const { repo, branch: b } = parseRepoAndBranch(customUrl);
    setIsUpdating(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/mikhmon/packages/update-github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo,
          url: customUrl,
          branch: b,
          setAsDefault,
        }),
      });

      const data = await res.json();
      if (data && data.success) {
        showNotice('success', data.message || `Mikhmon berhasil di-update dari GitHub (${repo})!`);
        onUpdateSuccess({
          uploadedPackages: data.packages,
          activeVersion: data.activeVersion,
          customGithubRepo: customUrl,
          customGithubBranch: b,
        });
        onClose();
      } else {
        setErrorMsg(data?.message || 'Gagal menerapkan update dari GitHub');
        showNotice('error', data?.message || 'Gagal update dari GitHub');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan saat memproses update');
      showNotice('error', 'Update gagal: ' + err.message);
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
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Github className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black tracking-tight text-white">
                  Update Mikhmon dari GitHub
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                  Custom Link
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Perbarui engine web Mikhmon langsung dari repositori resmi, fork komunitas, atau link GitHub custom Anda.
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
        <form onSubmit={handlePerformUpdate} className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {/* Preset Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-2">
              Pilih Sumber Repositori:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {PRESET_REPOS.map((preset) => {
                const isSelected = selectedPreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset.id)}
                    className={`p-3 rounded-2xl border text-left transition relative flex flex-col justify-between ${
                      isSelected
                        ? 'bg-indigo-950/60 border-indigo-500 text-white shadow-md'
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
                      {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400" />}
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
                  <Link className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Tautan Repositori GitHub (Custom Link)</span>
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
                  placeholder="https://github.com/laksa19/mikhmonv3 atau username/repo-custom"
                  required
                  className="w-full pl-10 pr-3 py-2.5 text-xs font-mono rounded-xl border border-slate-700 bg-slate-900 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Contoh: <code className="text-slate-400">https://github.com/laksa19/mikhmonv3</code> atau <code className="text-slate-400">https://github.com/username/fork-mikhmon/tree/main</code>
              </p>
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
                    placeholder="master / main / v3.20"
                    required
                    className="w-full pl-8 pr-3 py-2 text-xs font-mono rounded-xl border border-slate-700 bg-slate-900 text-white focus:outline-none focus:border-indigo-500"
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
                  <span>{isLoadingInfo ? 'Memeriksa...' : 'Cek Repositori GitHub'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Commit Preview Information Card */}
          {commitInfo && (
            <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5 font-mono">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Repositori Terverifikasi: {commitInfo.repo} ({commitInfo.branch})</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-200">
                  Commit {commitInfo.commitSha}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1 text-xs">
                <p className="text-slate-200 font-semibold truncate">
                  "{commitInfo.commitMessage}"
                </p>
                <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 font-mono pt-1">
                  <span>Author: <strong className="text-slate-300">{commitInfo.commitAuthor}</strong></span>
                  <span>Diperbarui: {new Date(commitInfo.commitDate).toLocaleString('id-ID')}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                <span className="flex items-center gap-1">
                  <Server className="w-3.5 h-3.5 text-amber-400" />
                  Target Web Root: <code className="text-slate-300 font-mono">{serverConfig.webRootDir || '/var/www/mikhmon'}</code>
                </span>
                <a
                  href={`https://github.com/${commitInfo.repo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-bold"
                >
                  <span>Buka di GitHub</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Gagal Membaca Repositori:</p>
                <p className="text-[11px] text-rose-300/90 mt-0.5">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* Options */}
          <div className="pt-1">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={setAsDefault}
                onChange={(e) => setSetAsDefault(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded-sm focus:ring-indigo-500 bg-slate-900 border-slate-700"
              />
              <span className="text-xs font-semibold text-slate-300">
                Jadikan sebagai versi web aktif default untuk semua tenant & virtualhost
              </span>
            </label>
          </div>

          {/* Footer Action Buttons */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isUpdating}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition active:scale-95 disabled:opacity-50"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={isUpdating || !customUrl.trim()}
              className="px-5 py-2.5 rounded-xl bg-linear-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-black text-xs transition flex items-center gap-2 shadow-lg shadow-indigo-600/30 active:scale-95 disabled:opacity-50"
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
