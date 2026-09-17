import React, { useState } from 'react';
import { 
  Zap, 
  Play, 
  CheckCircle2, 
  Clock, 
  MessageSquare, 
  Mail, 
  AlertTriangle, 
  RotateCw, 
  ExternalLink, 
  Sliders, 
  Check, 
  Send,
  Calendar,
  Sparkles,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { BillingAutomationRule, AutomationDispatchLog } from '../types';
import { formatRupiah } from '../utils/formatters';

interface BillingAutomationCenterProps {
  rules: BillingAutomationRule[];
  logs: AutomationDispatchLog[];
  onUpdateRules: (rules: BillingAutomationRule[]) => Promise<void>;
  onRunAutomation: () => Promise<{ dispatchedCount: number }>;
}

export const BillingAutomationCenter: React.FC<BillingAutomationCenterProps> = ({
  rules,
  logs,
  onUpdateRules,
  onRunAutomation,
}) => {
  const [localRules, setLocalRules] = useState<BillingAutomationRule[]>(rules);
  const [isRunning, setIsRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [runResult, setRunResult] = useState<{ dispatchedCount: number } | null>(null);
  const [activeTab, setActiveTab] = useState<'rules' | 'logs'>('rules');

  const toggleRule = (ruleId: string) => {
    setLocalRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, enabled: !r.enabled } : r))
    );
  };

  const updateRuleTemplate = (ruleId: string, template: string) => {
    setLocalRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, messageTemplate: template } : r))
    );
  };

  const updateRuleChannel = (ruleId: string, channel: 'whatsapp' | 'email' | 'both') => {
    setLocalRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, channel } : r))
    );
  };

  const handleSaveRules = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await onUpdateRules(localRules);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      console.error('Failed saving rules:', e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTriggerRun = async () => {
    setIsRunning(true);
    setRunResult(null);
    try {
      const res = await onRunAutomation();
      setRunResult(res);
      setActiveTab('logs');
    } catch (e) {
      console.error('Failed running automation:', e);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Sistem Otomasi Tagihan
            </span>
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight">
            Otomasi Pengiriman Tagihan
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Kirim tagihan secara otomatis ke WhatsApp dan Email pelanggan sebelum jatuh tempo, saat hari-H, dan penagihan berkala jika overdue.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            id="btn-run-automation"
            onClick={handleTriggerRun}
            disabled={isRunning}
            className="flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/20 transition active:scale-95 disabled:opacity-50"
          >
            {isRunning ? (
              <RotateCw className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4 fill-current" />
            )}
            <span>Jalankan Otomasi Sekarang</span>
          </button>
        </div>
      </div>

      {/* Trigger Notification Result */}
      {runResult && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="text-xs font-bold">
              Otomasi berhasil dijalankan: {runResult.dispatchedCount} pesan tagihan diproses dan disiapkan untuk dikirim.
            </span>
          </div>
          <button
            onClick={() => setRunResult(null)}
            className="text-xs font-bold text-emerald-700 hover:underline"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('rules')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'rules'
                ? 'bg-amber-100/80 text-amber-950 border border-amber-300'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Aturan & Template Otomasi ({localRules.filter((r) => r.enabled).length} Aktif)</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'logs'
                ? 'bg-amber-100/80 text-amber-950 border border-amber-300'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Riwayat Pengiriman Otomatis ({logs.length})</span>
          </button>
        </div>

        {activeTab === 'rules' && (
          <button
            onClick={handleSaveRules}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs disabled:opacity-50"
          >
            {isSaving ? (
              <RotateCw className="w-3.5 h-3.5 animate-spin" />
            ) : saveSuccess ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )}
            <span>{saveSuccess ? 'Tersimpan!' : 'Simpan Perubahan'}</span>
          </button>
        )}
      </div>

      {/* Rules Tab */}
      {activeTab === 'rules' && (
        <div className="space-y-4">
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 text-xs text-amber-950">
            <p className="font-bold flex items-center gap-1.5 mb-1">
              <Sparkles className="w-4 h-4 text-amber-600" />
              Variabel Dinamis Template:
            </p>
            <p className="text-[11px] text-amber-800 font-mono">
              {'{{customer_name}}'} • {'{{invoice_number}}'} • {'{{amount}}'} • {'{{due_date}}'} • {'{{invoice_url}}'} • {'{{business_name}}'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {localRules.map((rule) => (
              <div
                key={rule.id}
                className={`rounded-3xl border p-5 transition flex flex-col justify-between ${
                  rule.enabled
                    ? 'bg-white border-amber-200/90 shadow-xs'
                    : 'bg-slate-50 border-slate-200 opacity-75'
                }`}
              >
                <div>
                  {/* Card Header & Toggle */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            rule.enabled ? 'bg-amber-500 animate-pulse' : 'bg-slate-300'
                          }`}
                        />
                        <h3 className="text-sm font-extrabold text-slate-900">
                          {rule.name}
                        </h3>
                      </div>
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        Pemicu: {rule.trigger === 'on_create' && 'Saat invoice baru dibuat'}
                        {rule.trigger === 'pre_due' && 'H-3 Sebelum Tanggal Jatuh Tempo'}
                        {rule.trigger === 'on_due_date' && 'Tepat pada Hari-H Jatuh Tempo'}
                        {rule.trigger === 'overdue' && 'Setelah Melewati Jatuh Tempo (Overdue)'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleRule(rule.id)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        rule.enabled ? 'bg-amber-500' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          rule.enabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Saluran Pengiriman */}
                  <div className="mt-4 flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-500">
                      Kanal Pengiriman:
                    </span>
                    <div className="inline-flex rounded-xl bg-slate-100 p-0.5 text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => updateRuleChannel(rule.id, 'whatsapp')}
                        className={`px-2.5 py-1 rounded-lg transition ${
                          rule.channel === 'whatsapp'
                            ? 'bg-white text-emerald-700 shadow-xs'
                            : 'text-slate-500'
                        }`}
                      >
                        WhatsApp
                      </button>
                      <button
                        type="button"
                        onClick={() => updateRuleChannel(rule.id, 'email')}
                        className={`px-2.5 py-1 rounded-lg transition ${
                          rule.channel === 'email'
                            ? 'bg-white text-blue-700 shadow-xs'
                            : 'text-slate-500'
                        }`}
                      >
                        Email
                      </button>
                      <button
                        type="button"
                        onClick={() => updateRuleChannel(rule.id, 'both')}
                        className={`px-2.5 py-1 rounded-lg transition ${
                          rule.channel === 'both'
                            ? 'bg-white text-amber-800 shadow-xs'
                            : 'text-slate-500'
                        }`}
                      >
                        Keduanya
                      </button>
                    </div>
                  </div>

                  {/* Template Textarea */}
                  <div className="mt-3">
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Template Pesan Penagihan:
                    </label>
                    <textarea
                      rows={4}
                      value={rule.messageTemplate}
                      onChange={(e) => updateRuleTemplate(rule.id, e.target.value)}
                      className="w-full text-xs font-sans p-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 leading-relaxed"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Logs Tab */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
              Daftar Log Riwayat Otomasi
            </h3>
            <span className="text-[11px] text-slate-400">
              Total {logs.length} catatan
            </span>
          </div>

          {logs.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-xs font-semibold">Belum ada riwayat pengiriman otomasi.</p>
              <button
                onClick={handleTriggerRun}
                className="mt-2 text-xs text-amber-600 font-bold hover:underline"
              >
                Jalankan pemindaian otomasi sekarang
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {logs.map((log) => (
                <div key={log.id} className="p-4 hover:bg-slate-50 transition text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 font-mono">
                        {log.invoiceNumber}
                      </span>
                      <span className="text-slate-400">•</span>
                      <span className="font-semibold text-slate-700">
                        {log.customerName}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold">
                        {log.ruleType}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400 font-mono">
                        {new Date(log.dispatchedAt).toLocaleString('id-ID')}
                      </span>

                      {log.whatsappUrl && (
                        <a
                          href={log.whatsappUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white font-bold text-[11px] transition"
                        >
                          <Send className="w-3 h-3" />
                          <span>Kirim via WA</span>
                        </a>
                      )}
                    </div>
                  </div>

                  <p className="mt-2 text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 font-mono break-words leading-relaxed">
                    {log.message}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
