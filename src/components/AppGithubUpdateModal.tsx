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
  CheckCheck,
  FolderGit2,
  Database,
  Trash2,
  Cpu,
  Lock,
  Layers,
  Info
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
    repo: 'heruhendri/InvoiceKilat---QRIS-Dinamis-Invoice-Manager',
    branch: 'main',
    url: 'https://github.com/heruhendri/InvoiceKilat---QRIS-Dinamis-Invoice-Manager',
    desc: 'Rilis resmi paling stabil dengan modul QRIS Dinamis & Mikhmon Hosting Suite',
    badge: 'Produksi',
  },
  {
    id: 'official-dev',
    title: 'InvoiceKilat Staging / Preview',
    repo: 'heruhendri/InvoiceKilat---QRIS-Dinamis-Invoice-Manager',
    branch: 'dev',
    url: 'https://github.com/heruhendri/InvoiceKilat---QRIS-Dinamis-Invoice-Manager/tree/dev',
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
  const initialUrl = settings?.appGithubRepo || 'https://github.com/heruhendri/InvoiceKilat---QRIS-Dinamis-Invoice-Manager';
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

  // Data Retention Strategy & Auto Rebuild States
  const [dataHandlingMode, setDataHandlingMode] = useState<'preserve' | 'wipe'>('preserve');
  const [autoRebuild, setAutoRebuild] = useState<boolean>(true);
  const [confirmWipeChecked, setConfirmWipeChecked] = useState<boolean>(false);
  const [updatePhaseText, setUpdatePhaseText] = useState<string>('');
  const [rebuildResult, setRebuildResult] = useState<{
    performed: boolean;
    success: boolean;
    durationSeconds: string;
    message: string;
  } | null>(null);
  const [backupFileName, setBackupFileName] = useState<string | null>(null);
  const [preservedStats, setPreservedStats] = useState<{
    totalInvoices: number;
    totalCustomers: number;
    totalServices: number;
    totalRouters: number;
  } | null>(null);

  // Local .git folder detection state
  const [detectedGit, setDetectedGit] = useState<{
    hasGit: boolean;
    repoUrl: string | null;
    branch: string | null;
    source?: string;
  } | null>(null);
  const [isDetectingGit, setIsDetectingGit] = useState<boolean>(false);

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

  // Detect git repository from .git folder on server
  const detectGitInstallation = async () => {
    setIsDetectingGit(true);
    try {
      const res = await fetch('/api/system/git-detected');
      const data = await res.json();
      if (data && data.success && data.hasGit && data.repoUrl) {
        const info = {
          hasGit: true,
          repoUrl: data.repoUrl as string,
          branch: (data.branch as string) || 'main',
          source: data.source as string,
        };
        setDetectedGit(info);
        return info;
      } else {
        setDetectedGit({ hasGit: false, repoUrl: null, branch: null, source: 'none' });
      }
    } catch (e) {
      console.warn('Git detection warning:', e);
    } finally {
      setIsDetectingGit(false);
    }
    return null;
  };

  useEffect(() => {
    if (isOpen) {
      setSuccessResult(null);
      setErrorMsg(null);

      detectGitInstallation().then((gitInfo) => {
        // Otomatis terisi jika instalasi menggunakan GitHub (cari di folder .git)
        if (gitInfo && gitInfo.hasGit && gitInfo.repoUrl) {
          setCustomUrl(gitInfo.repoUrl);
          setBranch(gitInfo.branch || 'main');
          setSelectedPreset('git-detected');
          handleCheckCommit(gitInfo.repoUrl, gitInfo.branch || 'main');
        } else {
          const activeUrl = settings?.appGithubRepo || 'https://github.com/heruhendri/InvoiceKilat---QRIS-Dinamis-Invoice-Manager';
          const activeBranch = settings?.appGithubBranch || 'main';
          setCustomUrl(activeUrl);
          setBranch(activeBranch);

          const matchedPreset = PRESET_APP_REPOS.find((p) => p.url === activeUrl);
          if (matchedPreset) {
            setSelectedPreset(matchedPreset.id);
          } else {
            setSelectedPreset('custom');
          }
          handleCheckCommit(activeUrl, activeBranch);
        }
      });
    }
  }, [isOpen]);

  const availablePresets = [
    ...(detectedGit?.hasGit && detectedGit.repoUrl
      ? [
          {
            id: 'git-detected',
            title: 'Lokal Git Terdeteksi (.git)',
            repo: parseRepoAndBranch(detectedGit.repoUrl).repo,
            branch: detectedGit.branch || 'main',
            url: detectedGit.repoUrl,
            desc: `Otomatis terbaca dari folder .git konfigurasi instalasi VPS / server Anda (${detectedGit.branch || 'main'})`,
            badge: 'Otomatis .git',
          },
        ]
      : []),
    ...PRESET_APP_REPOS,
  ];

  const handleSelectPreset = (presetId: string) => {
    setSelectedPreset(presetId);
    setErrorMsg(null);
    setSuccessResult(null);

    if (presetId === 'git-detected' && detectedGit?.repoUrl) {
      setCustomUrl(detectedGit.repoUrl);
      setBranch(detectedGit.branch || 'main');
      handleCheckCommit(detectedGit.repoUrl, detectedGit.branch || 'main');
      return;
    }

    if (presetId === 'custom') {
      // In custom mode, keep whatever URL or let user type freely
      return;
    }

    const preset = PRESET_APP_REPOS.find((p) => p.id === presetId);
    if (preset && preset.url) {
      setCustomUrl(preset.url);
      setBranch(preset.branch);
      handleCheckCommit(preset.url, preset.branch);
    }
  };

  const handleUrlChange = (newUrl: string) => {
    setCustomUrl(newUrl);
    if (detectedGit?.hasGit && newUrl === detectedGit.repoUrl) {
      setSelectedPreset('git-detected');
    } else {
      const matched = PRESET_APP_REPOS.find((p) => p.url === newUrl);
      if (matched) {
        setSelectedPreset(matched.id);
      } else {
        setSelectedPreset('custom');
      }
    }
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

    if (dataHandlingMode === 'wipe' && !confirmWipeChecked) {
      setErrorMsg('Harap centang kotak konfirmasi bahwa Anda setuju untuk mereset seluruh data transaksi ke setelan awal.');
      return;
    }

    const { repo, branch: b } = parseRepoAndBranch(customUrl);
    setIsUpdating(true);
    setErrorMsg(null);
    setSuccessResult(null);
    setRebuildResult(null);
    setBackupFileName(null);
    setPreservedStats(null);
    setUpdatePhaseText('1/3 Mengamankan snapshot database lokal...');

    const phaseTimer1 = setTimeout(() => {
      setUpdatePhaseText('2/3 Memperbarui kode dari repositori GitHub...');
    }, 1500);

    const phaseTimer2 = setTimeout(() => {
      if (autoRebuild) {
        setUpdatePhaseText('3/3 Menjalankan rebuild otomatis aplikasi (npm run build)...');
      } else {
        setUpdatePhaseText('3/3 Menyimpan konfigurasi sistem...');
      }
    }, 3800);

    try {
      const res = await fetch('/api/system/update-github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo,
          url: customUrl,
          branch: b,
          preserveData: dataHandlingMode === 'preserve',
          wipeAllData: dataHandlingMode === 'wipe',
          autoRebuild,
        }),
      });

      const data = await res.json();
      clearTimeout(phaseTimer1);
      clearTimeout(phaseTimer2);

      if (data && data.success) {
        setSuccessResult({
          version: data.version,
          message: data.message || 'Aplikasi berhasil diperbarui dari GitHub!',
        });
        if (data.rebuild) {
          setRebuildResult(data.rebuild);
        }
        if (data.backupFile) {
          setBackupFileName(data.backupFile);
        }
        if (data.stats) {
          setPreservedStats(data.stats);
        }
        onUpdateSuccess(data.settings || {});
      } else {
        setErrorMsg(data?.message || 'Gagal menerapkan pembaruan aplikasi dari GitHub');
      }
    } catch (err: any) {
      clearTimeout(phaseTimer1);
      clearTimeout(phaseTimer2);
      setErrorMsg(err.message || 'Terjadi kesalahan saat memproses update aplikasi');
    } finally {
      setIsUpdating(false);
      setUpdatePhaseText('');
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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {availablePresets.map((preset) => {
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
              <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Link className="w-3.5 h-3.5 text-blue-400" />
                  <span>Tautan Repositori GitHub Aplikasi</span>
                  <span className="text-rose-400">*</span>
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {detectedGit?.hasGit && detectedGit.repoUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomUrl(detectedGit.repoUrl!);
                        setBranch(detectedGit.branch || 'main');
                        setSelectedPreset('git-detected');
                        handleCheckCommit(detectedGit.repoUrl!, detectedGit.branch || 'main');
                      }}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border flex items-center gap-1 transition ${
                        customUrl === detectedGit.repoUrl
                          ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300 shadow-sm'
                          : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-emerald-500/50 hover:text-emerald-300'
                      }`}
                      title="Isi otomatis dengan tautan dari folder .git"
                    >
                      <FolderGit2 className="w-3 h-3 text-emerald-400" />
                      <span>{customUrl === detectedGit.repoUrl ? 'Tautan .git Terisi' : 'Gunakan URL .git'}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPreset('custom');
                    }}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border flex items-center gap-1 transition ${
                      selectedPreset === 'custom'
                        ? 'bg-purple-950/80 border-purple-500/50 text-purple-300 shadow-sm'
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-purple-300 hover:border-purple-500/40'
                    }`}
                    title="Beralih ke mode custom link repositori atau fork"
                  >
                    <Sparkles className="w-3 h-3 text-purple-400" />
                    <span>Mode Custom Link</span>
                  </button>
                  <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
                    URL lengkap atau owner/repo
                  </span>
                </div>
              </div>
              <div className="relative">
                {detectedGit?.hasGit && detectedGit.repoUrl && customUrl === detectedGit.repoUrl ? (
                  <FolderGit2 className="w-4 h-4 text-emerald-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                ) : selectedPreset === 'custom' ? (
                  <Link className="w-4 h-4 text-purple-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                ) : (
                  <Github className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                )}
                <input
                  type="text"
                  value={customUrl}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  placeholder={
                    selectedPreset === 'custom'
                      ? 'https://github.com/username/fork-repo atau owner/repo'
                      : 'https://github.com/heruhendri/InvoiceKilat---QRIS-Dinamis-Invoice-Manager'
                  }
                  required
                  className={`w-full pl-10 pr-28 py-2.5 text-xs font-mono rounded-xl border transition-all duration-150 ${
                    detectedGit?.hasGit && detectedGit.repoUrl && customUrl === detectedGit.repoUrl
                      ? 'border-emerald-500/60 bg-slate-900/90 text-emerald-200 placeholder-slate-600 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/25'
                      : selectedPreset === 'custom'
                        ? 'border-purple-500/60 bg-slate-900/90 text-purple-100 placeholder-slate-600 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-500/25'
                        : 'border-slate-700 bg-slate-900 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25'
                  }`}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {customUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomUrl('');
                        setSelectedPreset('custom');
                      }}
                      className="px-1.5 py-0.5 text-[10px] font-bold text-slate-400 hover:text-rose-400 rounded bg-slate-800/80 hover:bg-slate-800 transition"
                      title="Kosongkan input untuk ketik custom link baru"
                    >
                      Hapus
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const clipText = await navigator.clipboard.readText();
                        if (clipText) handleUrlChange(clipText);
                      } catch {}
                    }}
                    className="px-1.5 py-0.5 text-[10px] font-bold text-blue-400 hover:text-blue-300 rounded bg-blue-950/80 hover:bg-blue-900/80 border border-blue-800/50 transition"
                    title="Tempel tautan dari clipboard"
                  >
                    Tempel
                  </button>
                </div>
              </div>

              {/* Status terdeteksi dari folder .git atau mode custom link */}
              <div className="mt-2.5">
                {detectedGit?.hasGit && detectedGit.repoUrl && customUrl === detectedGit.repoUrl ? (
                  <div className="flex items-center justify-between text-[11px] px-3 py-2 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300">
                    <div className="flex items-center gap-2 truncate">
                      <FolderGit2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="truncate">
                        Otomatis terisi dari folder <strong>.git</strong> lokal: <span className="font-mono text-emerald-200 font-bold">{detectedGit.repoUrl}</span> (branch: {detectedGit.branch || 'main'})
                      </span>
                    </div>
                    <span className="ml-2 text-[9px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-200 border border-emerald-500/30 font-mono shrink-0">
                      Otomatis .git Aktif
                    </span>
                  </div>
                ) : selectedPreset === 'custom' ? (
                  <div className="flex items-center justify-between text-[11px] px-3 py-2 rounded-xl bg-purple-950/40 border border-purple-800/60 text-purple-300">
                    <div className="flex items-center gap-2 truncate">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <span className="truncate">
                        Mode <strong>Custom Link</strong> aktif: Masukkan repositori GitHub publik atau fork Anda sendiri.
                      </span>
                    </div>
                    {detectedGit?.hasGit && detectedGit.repoUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setCustomUrl(detectedGit.repoUrl!);
                          setBranch(detectedGit.branch || 'main');
                          setSelectedPreset('git-detected');
                          handleCheckCommit(detectedGit.repoUrl!, detectedGit.branch || 'main');
                        }}
                        className="ml-2 text-[10px] font-bold text-emerald-300 hover:text-white underline shrink-0 flex items-center gap-1"
                      >
                        <FolderGit2 className="w-3 h-3 text-emerald-400" />
                        <span>Reset ke .git</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-[11px] px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400">
                    <div className="flex items-center gap-2 truncate">
                      <FolderGit2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="truncate">
                        {detectedGit?.hasGit && detectedGit.repoUrl
                          ? `Tersedia folder .git: ${detectedGit.repoUrl} (${detectedGit.branch})`
                          : 'Bisa custom link repositori GitHub / fork Anda sendiri, atau scan folder .git lokal.'}
                      </span>
                    </div>
                    {detectedGit?.hasGit && detectedGit.repoUrl ? (
                      <button
                        type="button"
                        onClick={() => {
                          setCustomUrl(detectedGit.repoUrl!);
                          setBranch(detectedGit.branch || 'main');
                          setSelectedPreset('git-detected');
                          handleCheckCommit(detectedGit.repoUrl!, detectedGit.branch || 'main');
                        }}
                        className="ml-2 text-[10px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 shrink-0"
                      >
                        <FolderGit2 className="w-3 h-3" />
                        <span>Gunakan .git</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={detectGitInstallation}
                        disabled={isDetectingGit}
                        className="ml-2 text-[10px] font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 shrink-0"
                      >
                        <RefreshCw className={`w-3 h-3 ${isDetectingGit ? 'animate-spin' : ''}`} />
                        <span>Scan .git</span>
                      </button>
                    )}
                  </div>
                )}
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

          {/* Pengaturan Penanganan Data & Rebuild Otomatis */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5 uppercase tracking-wider">
                <Database className="w-3.5 h-3.5 text-blue-400" />
                <span>Pengaturan Data & Rebuild Otomatis</span>
              </label>
              <span className="text-[11px] text-slate-400">
                Pilih perlakuan data transaksi Anda
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Opsi 1: Pertahankan Data (Aman & Rekomendasi) */}
              <div
                onClick={() => setDataHandlingMode('preserve')}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  dataHandlingMode === 'preserve'
                    ? 'bg-emerald-950/40 border-emerald-500/70 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/30'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 opacity-80'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${dataHandlingMode === 'preserve' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-extrabold text-white">Pertahankan Data</span>
                  </div>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                    Aman & Utuh
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  <strong className="text-emerald-300">Data Tidak Dihapus</strong>. Seluruh invoice, pelanggan, paket MikroTik, dan pengaturan bisnis tetap utuh 100%. Dilengkapi snapshot cadangan otomatis sebelum update.
                </p>
              </div>

              {/* Opsi 2: Reset Bersih / Hapus Semua Data */}
              <div
                onClick={() => setDataHandlingMode('wipe')}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  dataHandlingMode === 'wipe'
                    ? 'bg-rose-950/40 border-rose-500/70 shadow-lg shadow-rose-500/10 ring-1 ring-rose-500/30'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 opacity-80'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${dataHandlingMode === 'wipe' ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-800 text-slate-400'}`}>
                      <Trash2 className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-extrabold text-white">Hapus Semua Data</span>
                  </div>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-mono">
                    Reset Pabrik
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Mengembalikan database ke kondisi awal template. Menghapus seluruh transaksi dan invoice uji coba. Snapshot darurat tetap dibuat sebelum reset.
                </p>
              </div>
            </div>

            {/* Checkbox Konfirmasi jika memilih mode Hapus Semua Data */}
            {dataHandlingMode === 'wipe' && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-200 animate-in fade-in">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmWipeChecked}
                    onChange={(e) => setConfirmWipeChecked(e.target.checked)}
                    className="mt-0.5 rounded border-rose-600 text-rose-600 focus:ring-rose-500 bg-slate-900 cursor-pointer"
                  />
                  <span className="text-[11px] leading-relaxed">
                    <strong>Saya mengerti:</strong> Semua data transaksi, tagihan, dan pelanggan akan dibersihkan kembali ke setelan awal pabrik (Snapshot darurat tetap akan diamankan di <code>data/backups/</code>).
                  </span>
                </label>
              </div>
            )}

            {/* Switch Auto Rebuild */}
            <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">
                    Otomatis Rebuild Aplikasi (<code className="text-blue-300 font-mono text-[10px]">npm run build</code>)
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Kompilasi ulang bundle Vite & production server secara otomatis sehingga update kode langsung aktif tanpa perlu build manual lewat terminal.
                  </span>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={autoRebuild}
                  onChange={(e) => setAutoRebuild(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>

          {/* Updating In-Progress Live Feedback */}
          {isUpdating && (
            <div className="p-4 rounded-2xl bg-blue-950/50 border border-blue-500/40 text-blue-200 text-xs space-y-2 animate-in fade-in">
              <div className="flex items-center gap-2 font-bold text-blue-300">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
                <span>Memproses Pembaruan & Rebuild Aplikasi...</span>
              </div>
              <p className="text-[11px] text-blue-200/90 font-mono">
                {updatePhaseText || 'Sedang memproses... Harap tunggu beberapa saat.'}
              </p>
              <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                <div className="bg-blue-500 h-1.5 rounded-full animate-pulse w-3/4"></div>
              </div>
            </div>
          )}

          {/* Success Message Banner with Rebuild and Data Metrics */}
          {successResult && (
            <div className="p-4 rounded-2xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-200 text-xs space-y-2.5 animate-in fade-in">
              <div className="flex items-center gap-2 font-bold text-emerald-300">
                <CheckCheck className="w-4 h-4 text-emerald-400" />
                <span>Pembaruan & Rebuild Berhasil Diterapkan!</span>
              </div>
              <p className="text-[11px] text-emerald-200/90">
                {successResult.message} Versi sekarang: <strong className="font-mono text-white">{successResult.version}</strong>
              </p>

              {/* Detail Metrics Rebuild & Data */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-emerald-900/50 text-[11px] space-y-1.5">
                {rebuildResult && (
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Status Rebuild:</span>
                    </span>
                    <span className={`font-mono font-bold ${rebuildResult.success ? 'text-emerald-300' : 'text-amber-300'}`}>
                      {rebuildResult.success ? `✓ Sukses (${rebuildResult.durationSeconds}s)` : 'Peringatan build manual'}
                    </span>
                  </div>
                )}

                {preservedStats && (
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Status Data:</span>
                    </span>
                    <span className="font-mono text-emerald-300 font-bold">
                      {dataHandlingMode === 'preserve'
                        ? `Utuh (${preservedStats.totalInvoices} Faktur, ${preservedStats.totalCustomers} Pelanggan)`
                        : 'Reset ke Setelan Awal Pabrik'}
                    </span>
                  </div>
                )}

                {backupFileName && (
                  <div className="flex items-center justify-between text-slate-400 pt-0.5 border-t border-slate-800/80">
                    <span>Snapshot Cadangan:</span>
                    <span className="font-mono text-slate-300 text-[10px] truncate max-w-[200px]" title={backupFileName}>
                      {backupFileName}
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-1 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-md shadow-emerald-700/30"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Muat Ulang Halaman Sekarang</span>
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
