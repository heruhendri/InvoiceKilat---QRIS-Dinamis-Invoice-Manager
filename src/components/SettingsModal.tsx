import React, { useState } from 'react';
import { 
  X, 
  Settings, 
  QrCode, 
  Building, 
  Mail, 
  Phone, 
  Share2, 
  TableProperties, 
  Save, 
  Check, 
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { BusinessSettings } from '../types';
import { QRISImageUploader } from './QRISImageUploader';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: BusinessSettings | null;
  onSave: (updatedSettings: Partial<BusinessSettings>) => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
}) => {
  const [businessName, setBusinessName] = useState(settings?.businessName || '');
  const [businessOwner, setBusinessOwner] = useState(settings?.businessOwner || '');
  const [businessAddress, setBusinessAddress] = useState(settings?.businessAddress || '');
  const [businessPhone, setBusinessPhone] = useState(settings?.businessPhone || '');
  const [businessEmail, setBusinessEmail] = useState(settings?.businessEmail || '');
  const [defaultStaticQris, setDefaultStaticQris] = useState(settings?.defaultStaticQris || '');
  const [googleSheetId, setGoogleSheetId] = useState(settings?.googleSheetId || '');
  const [googleSheetName, setGoogleSheetName] = useState(settings?.googleSheetName || 'Master_Invoice_DB');
  const [whatsappTemplate, setWhatsappTemplate] = useState(settings?.whatsappTemplate || '');
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  React.useEffect(() => {
    if (settings) {
      setBusinessName(settings.businessName);
      setBusinessOwner(settings.businessOwner);
      setBusinessAddress(settings.businessAddress);
      setBusinessPhone(settings.businessPhone);
      setBusinessEmail(settings.businessEmail);
      setDefaultStaticQris(settings.defaultStaticQris);
      setGoogleSheetId(settings.googleSheetId);
      setGoogleSheetName(settings.googleSheetName);
      setWhatsappTemplate(settings.whatsappTemplate);
    }
  }, [settings, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave({
        businessName,
        businessOwner,
        businessAddress,
        businessPhone,
        businessEmail,
        defaultStaticQris,
        googleSheetId,
        googleSheetName,
        whatsappTemplate,
      });
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 1000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Pengaturan Sistem & QRIS Bisnis
              </h3>
              <p className="text-xs text-slate-500">
                Konfigurasi profil bisnis, QRIS dinamis DANA Bisnis, dan Google Sheets
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
          {savedSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Pengaturan berhasil disimpan!</span>
            </div>
          )}

          {/* Section 1: Business Profile */}
          <div className="space-y-3">
            <h4 className="font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Building className="w-4 h-4 text-blue-600" />
              <span>Profil Bisnis / Usaha</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Nama Bisnis / Brand / Usaha
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Nama Pemilik / Penanggung Jawab
                </label>
                <input
                  type="text"
                  value={businessOwner}
                  onChange={(e) => setBusinessOwner(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Nomor WhatsApp Bisnis
                </label>
                <input
                  type="text"
                  value={businessPhone}
                  onChange={(e) => setBusinessPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Email Bisnis (Untuk Pengiriman Invoice)
                </label>
                <input
                  type="email"
                  value={businessEmail}
                  onChange={(e) => setBusinessEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="font-semibold text-slate-700 block mb-1">
                  Alamat Lengkap Usaha
                </label>
                <input
                  type="text"
                  value={businessAddress}
                  onChange={(e) => setBusinessAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Section 2: Default Static QRIS Payload */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <h4 className="font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-emerald-600" />
                <span>QRIS Bisnis Statis (DANA Bisnis Merchant)</span>
              </h4>
              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">
                Auto Convert ke Dinamis
              </span>
            </div>

            <p className="text-slate-500 leading-relaxed text-[11px]">
              Cukup upload gambar screenshot QRIS DANA Bisnis Anda, atau tempel string payload EMVCo secara langsung. Sistem otomatis memindai QR code dan mengubahnya ke QRIS dinamis nominal terkunci saat menerbitkan faktur.
            </p>

            <QRISImageUploader
              label="Upload Foto / Gambar QRIS DANA Bisnis"
              currentPayload={defaultStaticQris}
              onQRISDecoded={(payload) => setDefaultStaticQris(payload)}
            />

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                String Payload QRIS Statis:
              </label>
              <textarea
                rows={2}
                value={defaultStaticQris}
                onChange={(e) => setDefaultStaticQris(e.target.value)}
                placeholder="00020101021126590014ID.DANA.WWW..."
                className="w-full px-3 py-2 text-[11px] font-mono rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Section 3: Google Sheets Sync Settings */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h4 className="font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <TableProperties className="w-4 h-4 text-emerald-600" />
              <span>Integrasi Google Spreadsheet</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Google Sheet ID / URL
                </label>
                <input
                  type="text"
                  value={googleSheetId}
                  onChange={(e) => setGoogleSheetId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Nama Lembar (Sheet Tab)
                </label>
                <input
                  type="text"
                  value={googleSheetName}
                  onChange={(e) => setGoogleSheetName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Section 4: WhatsApp Notification Template */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <h4 className="font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Share2 className="w-4 h-4 text-emerald-600" />
              <span>Template Pesan WhatsApp Otomatis</span>
            </h4>
            <textarea
              rows={3}
              value={whatsappTemplate}
              onChange={(e) => setWhatsappTemplate(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-[10px] text-slate-400">
              Placeholder tersedia: <code className="bg-slate-100 px-1 rounded">{'{customerName}'}</code>, <code className="bg-slate-100 px-1 rounded">{'{invoiceNumber}'}</code>, <code className="bg-slate-100 px-1 rounded">{'{totalAmount}'}</code>, <code className="bg-slate-100 px-1 rounded">{'{invoiceUrl}'}</code>
            </p>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
            >
              Batal
            </button>
            <button
              id="save-settings-btn"
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-1.5 px-6 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition active:scale-95 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
