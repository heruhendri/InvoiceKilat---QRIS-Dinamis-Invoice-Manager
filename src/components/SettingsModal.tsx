import React, { useState, useEffect, useRef } from 'react';
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
  ShieldCheck,
  Globe,
  FileBadge,
  CreditCard,
  PenTool,
  Upload,
  Image as ImageIcon,
  Palette,
  Layers,
  Database,
  Download,
  RefreshCw,
  ExternalLink,
  Copy,
  Radio,
  FileSpreadsheet,
  CheckCircle2,
  Code,
  Info,
  ChevronRight,
  MessageSquare,
  Bell,
  RotateCcw,
  AlertCircle,
  AlertTriangle,
  Send,
  Clock,
  Eye,
  EyeOff,
  FileText,
  CheckCircle,
  ArrowUpRight,
  HardDrive,
  FileUp,
  MapPin
} from 'lucide-react';
import { Invoice, BusinessSettings } from '../types';
import { QRISImageUploader } from './QRISImageUploader';
import { formatDateTimeIndo } from '../utils/formatters';
import { validateQris, parseQris } from '../utils/qrisClient';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: BusinessSettings | null;
  onSave: (updatedSettings: Partial<BusinessSettings>) => Promise<void>;
  onReset?: () => Promise<BusinessSettings>;
  initialTab?: 'app' | 'company' | 'template' | 'qris' | 'backup' | 'notification';
  invoices?: Invoice[];
  onTriggerSync?: () => Promise<void> | void;
  isSyncing?: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
  onReset,
  initialTab = 'app',
  invoices = [],
  onTriggerSync,
  isSyncing = false,
}) => {
  const [activeTab, setActiveTab] = useState<'app' | 'company' | 'template' | 'qris' | 'backup' | 'notification'>(initialTab);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  // Sync state & helpers for Google Sheets & Backup
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [showScriptGuide, setShowScriptGuide] = useState(false);
  const [isLocalSyncing, setIsLocalSyncing] = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const validTabs = ['app', 'company', 'template', 'qris', 'backup', 'notification'];
      if (initialTab && typeof initialTab === 'string' && validTabs.includes(initialTab)) {
        setActiveTab(initialTab as any);
      } else {
        setActiveTab('app');
      }
      setErrorMessage(null);
      setConfirmReset(false);
    }
  }, [isOpen, initialTab]);

  // App Identity
  const [appName, setAppName] = useState(settings?.appName || 'InvoiceKilat');
  const [appLogoUrl, setAppLogoUrl] = useState(settings?.appLogoUrl || '');
  const [appTagline, setAppTagline] = useState(settings?.appTagline || 'Sistem Faktur & QRIS Dinamis Otomatis');

  // Company Profile
  const [businessName, setBusinessName] = useState(settings?.businessName || '');
  const [companyLogoUrl, setCompanyLogoUrl] = useState(settings?.companyLogoUrl || '');
  const [businessTagline, setBusinessTagline] = useState(settings?.businessTagline || '');
  const [businessOwner, setBusinessOwner] = useState(settings?.businessOwner || '');
  const [businessPhone, setBusinessPhone] = useState(settings?.businessPhone || '');
  const [businessEmail, setBusinessEmail] = useState(settings?.businessEmail || '');
  const [businessAddress, setBusinessAddress] = useState(settings?.businessAddress || '');
  const [businessWebsite, setBusinessWebsite] = useState(settings?.businessWebsite || '');
  const [businessTaxId, setBusinessTaxId] = useState(settings?.businessTaxId || '');

  // Bank Account & Payment Methods
  const [bankName, setBankName] = useState(settings?.bankName || 'BCA');
  const [bankAccountNumber, setBankAccountNumber] = useState(settings?.bankAccountNumber || '');
  const [bankAccountHolder, setBankAccountHolder] = useState(settings?.bankAccountHolder || '');
  const [bcaAccountNumber, setBcaAccountNumber] = useState(settings?.bcaAccountNumber || '8730918231');
  const [bcaAccountHolder, setBcaAccountHolder] = useState(settings?.bcaAccountHolder || '');
  const [briAccountNumber, setBriAccountNumber] = useState(settings?.briAccountNumber || '012301098765501');
  const [briAccountHolder, setBriAccountHolder] = useState(settings?.briAccountHolder || '');
  const [danaNumber, setDanaNumber] = useState(settings?.danaNumber || '08977345640');
  const [danaAccountHolder, setDanaAccountHolder] = useState(settings?.danaAccountHolder || 'Heruhendri');
  const [gojekNumber, setGojekNumber] = useState(settings?.gojekNumber || '08977345640');
  const [gojekAccountHolder, setGojekAccountHolder] = useState(settings?.gojekAccountHolder || 'Heruhendri');
  const [watermarkText, setWatermarkText] = useState(settings?.watermarkText || 'Aplikasi ini dibuat oleh Heru Hendri • Contact Person: 08977345640');

  // Digital Signature & Stamp
  const [signatureImageUrl, setSignatureImageUrl] = useState(settings?.signatureImageUrl || '');
  const [stampImageUrl, setStampImageUrl] = useState(settings?.stampImageUrl || '');
  const [signatoryName, setSignatoryName] = useState(settings?.signatoryName || '');
  const [signatoryTitle, setSignatoryTitle] = useState(settings?.signatoryTitle || 'Direktur');

  // Template Choice
  const [defaultInvoiceTemplate, setDefaultInvoiceTemplate] = useState<
    'corporate' | 'minimalist' | 'creative' | 'formal' | 'pos'
  >(settings?.defaultInvoiceTemplate || 'corporate');

  // QRIS
  const [defaultStaticQris, setDefaultStaticQris] = useState(settings?.defaultStaticQris || '');
  const [qrisMerchantName, setQrisMerchantName] = useState(settings?.qrisMerchantName || '');
  const [qrisMerchantCity, setQrisMerchantCity] = useState(settings?.qrisMerchantCity || '');
  const [qrisAutoExtracted, setQrisAutoExtracted] = useState<boolean>(false);
  const [qrisExtractionNotice, setQrisExtractionNotice] = useState<string>('');

  const handleAutoExtractFromQris = (sourcePayload?: string) => {
    const payload = (sourcePayload || defaultStaticQris || '').trim();
    if (!payload) return;
    const parsed = parseQris(payload);
    if (parsed.merchantName) {
      setQrisMerchantName(parsed.merchantName);
    }
    if (parsed.merchantCity) {
      setQrisMerchantCity(parsed.merchantCity);
    }
    setQrisAutoExtracted(true);
    setQrisExtractionNotice(
      `Otomatis disinkronkan dari QRIS: ${parsed.merchantName || 'Merchant'} • ${parsed.merchantCity || 'Kota'}`
    );
    setTimeout(() => setQrisExtractionNotice(''), 6000);
  };

  // Google Sheets
  const [googleSheetId, setGoogleSheetId] = useState(settings?.googleSheetId || '');
  const [googleSheetName, setGoogleSheetName] = useState(settings?.googleSheetName || 'Master_Invoice_DB');
  const [googleSheetWebhookUrl, setGoogleSheetWebhookUrl] = useState(settings?.googleSheetWebhookUrl || '');
  const [autoBackupToSheets, setAutoBackupToSheets] = useState(settings?.autoBackupToSheets ?? true);

  // Telegram Backup Harian & Restore States
  const [backupSection, setBackupSection] = useState<'telegram' | 'restore' | 'offline' | 'sheets'>('telegram');
  const [telegramBotToken, setTelegramBotToken] = useState(settings?.telegramBotToken || '');
  const [telegramChatId, setTelegramChatId] = useState(settings?.telegramChatId || '');
  const [telegramDailyBackupEnabled, setTelegramDailyBackupEnabled] = useState(settings?.telegramDailyBackupEnabled ?? false);
  const [telegramDailyBackupTime, setTelegramDailyBackupTime] = useState(settings?.telegramDailyBackupTime || '00:00');
  const [telegramIncludeFormat, setTelegramIncludeFormat] = useState<'both' | 'document_json' | 'summary_text'>(settings?.telegramIncludeFormat || 'both');
  const [lastTelegramBackupAt, setLastTelegramBackupAt] = useState(settings?.lastTelegramBackupAt || '');
  const [lastTelegramBackupStatus, setLastTelegramBackupStatus] = useState(settings?.lastTelegramBackupStatus || 'idle');
  const [lastTelegramBackupMessage, setLastTelegramBackupMessage] = useState(settings?.lastTelegramBackupMessage || '');
  const [showBotToken, setShowBotToken] = useState(false);
  const [showTelegramGuide, setShowTelegramGuide] = useState(false);
  const [isTestingTelegram, setIsTestingTelegram] = useState(false);
  const [telegramTestFeedback, setTelegramTestFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [isSendingTelegramNow, setIsSendingTelegramNow] = useState(false);
  const [telegramSendFeedback, setTelegramSendFeedback] = useState<{ success: boolean; message: string; stats?: any } | null>(null);

  // Restore Database States
  const [restorePayload, setRestorePayload] = useState<any | null>(null);
  const [restorePreview, setRestorePreview] = useState<{
    appName: string;
    businessName: string;
    exportedAt: string;
    version: string;
    invoicesCount: number;
    paidInvoicesCount: number;
    customersCount: number;
    servicesCount: number;
    recurringAddonsCount: number;
    totalAmount: number;
    hasSettings: boolean;
  } | null>(null);
  const [restoreMode, setRestoreMode] = useState<'replace' | 'merge'>('replace');
  const [restoreIncludeSettings, setRestoreIncludeSettings] = useState(false);
  const [isValidatingRestore, setIsValidatingRestore] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreFeedback, setRestoreFeedback] = useState<{ success: boolean; message: string; stats?: any } | null>(null);
  const [showConfirmRestoreModal, setShowConfirmRestoreModal] = useState(false);
  const restoreFileInputRef = useRef<HTMLInputElement>(null);

  // Notification & WhatsApp settings
  const [whatsappNotificationEnabled, setWhatsappNotificationEnabled] = useState(settings?.whatsappNotificationEnabled ?? true);
  const [whatsappTemplate, setWhatsappTemplate] = useState(settings?.whatsappTemplate || '');
  const [emailNotificationEnabled, setEmailNotificationEnabled] = useState(settings?.emailNotificationEnabled ?? true);
  const [emailSenderName, setEmailSenderName] = useState(settings?.emailSenderName || 'Finance Cipta Media');
  const [emailSenderAddress, setEmailSenderAddress] = useState(settings?.emailSenderAddress || 'billing@ciptamedia.id');
  const [autoSendPreDueEmail, setAutoSendPreDueEmail] = useState(settings?.autoSendPreDueEmail ?? true);
  const [preDueDays, setPreDueDays] = useState(settings?.preDueDays || 3);
  const [autoSendOverdueEmail, setAutoSendOverdueEmail] = useState(settings?.autoSendOverdueEmail ?? true);
  const [overdueEmailTemplate, setOverdueEmailTemplate] = useState(settings?.overdueEmailTemplate || '');
  const [preDueEmailTemplate, setPreDueEmailTemplate] = useState(settings?.preDueEmailTemplate || '');

  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // File input refs
  const appLogoInputRef = useRef<HTMLInputElement>(null);
  const companyLogoInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);
  const stampInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (settings) {
      setAppName(settings.appName || 'InvoiceKilat');
      setAppLogoUrl(settings.appLogoUrl || '');
      setAppTagline(settings.appTagline || '');

      setBusinessName(settings.businessName || '');
      setCompanyLogoUrl(settings.companyLogoUrl || '');
      setBusinessTagline(settings.businessTagline || '');
      setBusinessOwner(settings.businessOwner || '');
      setBusinessPhone(settings.businessPhone || '');
      setBusinessEmail(settings.businessEmail || '');
      setBusinessAddress(settings.businessAddress || '');
      setBusinessWebsite(settings.businessWebsite || '');
      setBusinessTaxId(settings.businessTaxId || '');

      setBankName(settings.bankName || 'BCA');
      setBankAccountNumber(settings.bankAccountNumber || '');
      setBankAccountHolder(settings.bankAccountHolder || '');
      setBcaAccountNumber(settings.bcaAccountNumber || '8730918231');
      setBcaAccountHolder(settings.bcaAccountHolder || '');
      setBriAccountNumber(settings.briAccountNumber || '012301098765501');
      setBriAccountHolder(settings.briAccountHolder || '');
      setDanaNumber(settings.danaNumber || '08977345640');
      setDanaAccountHolder(settings.danaAccountHolder || 'Heruhendri');
      setGojekNumber(settings.gojekNumber || '08977345640');
      setGojekAccountHolder(settings.gojekAccountHolder || 'Heruhendri');
      setWatermarkText(settings.watermarkText || 'Aplikasi ini dibuat oleh Heru Hendri • Contact Person: 08977345640');

      setSignatureImageUrl(settings.signatureImageUrl || '');
      setStampImageUrl(settings.stampImageUrl || '');
      setSignatoryName(settings.signatoryName || '');
      setSignatoryTitle(settings.signatoryTitle || 'Direktur');

      setDefaultInvoiceTemplate(settings.defaultInvoiceTemplate || 'corporate');

      setDefaultStaticQris(settings.defaultStaticQris || '');
      setQrisMerchantName(settings.qrisMerchantName || '');
      setQrisMerchantCity(settings.qrisMerchantCity || '');

      setGoogleSheetId(settings.googleSheetId || '');
      setGoogleSheetName(settings.googleSheetName || 'Master_Invoice_DB');
      setGoogleSheetWebhookUrl(settings.googleSheetWebhookUrl || '');
      setAutoBackupToSheets(settings.autoBackupToSheets ?? true);

      setWhatsappNotificationEnabled(settings.whatsappNotificationEnabled ?? true);
      setWhatsappTemplate(
        settings.whatsappTemplate || 
        'Halo {{customer_name}}, terima kasih atas pembayaran Anda untuk invoice {{invoice_number}} sebesar Rp {{amount}}. Pembayaran telah kami verifikasi dengan sukses!\n\nLihat rincian invoice: {{invoice_url}}\n\nSalam hangat,\n{{business_name}}'
      );
      setEmailNotificationEnabled(settings.emailNotificationEnabled ?? true);
      setEmailSenderName(settings.emailSenderName || 'Finance Cipta Media');
      setEmailSenderAddress(settings.emailSenderAddress || 'billing@ciptamedia.id');
      setAutoSendPreDueEmail(settings.autoSendPreDueEmail ?? true);
      setPreDueDays(settings.preDueDays || 3);
      setAutoSendOverdueEmail(settings.autoSendOverdueEmail ?? true);
      setOverdueEmailTemplate(
        settings.overdueEmailTemplate || 
        'Pemberitahuan: Tagihan invoice {{invoice_number}} senilai Rp {{amount}} telah melewati tanggal jatuh tempo ({{due_date}}). Mohon segera lakukan pembayaran melalui QRIS atau transfer bank.'
      );
      setPreDueEmailTemplate(
        settings.preDueEmailTemplate || 
        'Pengingat Pembayaran: Tagihan invoice {{invoice_number}} senilai Rp {{amount}} akan jatuh tempo dalam waktu dekat pada tanggal {{due_date}}.'
      );

      // Telegram settings
      setTelegramBotToken(settings.telegramBotToken || '');
      setTelegramChatId(settings.telegramChatId || '');
      setTelegramDailyBackupEnabled(settings.telegramDailyBackupEnabled ?? false);
      setTelegramDailyBackupTime(settings.telegramDailyBackupTime || '00:00');
      setTelegramIncludeFormat(settings.telegramIncludeFormat || 'both');
      setLastTelegramBackupAt(settings.lastTelegramBackupAt || '');
      setLastTelegramBackupStatus(settings.lastTelegramBackupStatus || 'idle');
      setLastTelegramBackupMessage(settings.lastTelegramBackupMessage || '');
    }
  }, [settings, isOpen]);

  if (!isOpen) return null;

  // Helper to convert uploaded image file to DataURL
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2.5 * 1024 * 1024) {
        setErrorMessage('Ukuran file gambar maksimal 2.5 MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setter(reader.result);
          setErrorMessage(null);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResetToDefaults = async () => {
    setIsResetting(true);
    setErrorMessage(null);
    try {
      let updated: BusinessSettings;
      if (onReset) {
        updated = await onReset();
      } else {
        const res = await fetch('/api/settings/reset', { method: 'POST' });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Gagal mereset pengaturan ke default');
        }
        const data = await res.json();
        updated = data.settings || data;
      }
      
      setAppName(updated.appName || 'InvoiceKilat');
      setAppLogoUrl(updated.appLogoUrl || '');
      setAppTagline(updated.appTagline || '');
      setBusinessName(updated.businessName || '');
      setCompanyLogoUrl(updated.companyLogoUrl || '');
      setBusinessTagline(updated.businessTagline || '');
      setBusinessOwner(updated.businessOwner || '');
      setBusinessPhone(updated.businessPhone || '');
      setBusinessEmail(updated.businessEmail || '');
      setBusinessAddress(updated.businessAddress || '');
      setBusinessWebsite(updated.businessWebsite || '');
      setBusinessTaxId(updated.businessTaxId || '');
      setBankName(updated.bankName || 'BCA');
      setBankAccountNumber(updated.bankAccountNumber || '');
      setBankAccountHolder(updated.bankAccountHolder || '');
      setBcaAccountNumber(updated.bcaAccountNumber || '8730918231');
      setBcaAccountHolder(updated.bcaAccountHolder || '');
      setBriAccountNumber(updated.briAccountNumber || '012301098765501');
      setBriAccountHolder(updated.briAccountHolder || '');
      setDanaNumber(updated.danaNumber || '08977345640');
      setDanaAccountHolder(updated.danaAccountHolder || 'Heruhendri');
      setGojekNumber(updated.gojekNumber || '08977345640');
      setGojekAccountHolder(updated.gojekAccountHolder || 'Heruhendri');
      setWatermarkText(updated.watermarkText || 'Dibuat oleh heruhendri • Contact Person: 08977345640');
      setSignatureImageUrl(updated.signatureImageUrl || '');
      setStampImageUrl(updated.stampImageUrl || '');
      setSignatoryName(updated.signatoryName || '');
      setSignatoryTitle(updated.signatoryTitle || 'Direktur');
      setDefaultInvoiceTemplate(updated.defaultInvoiceTemplate || 'corporate');
      setDefaultStaticQris(updated.defaultStaticQris || '');
      setQrisMerchantName(updated.qrisMerchantName || '');
      setQrisMerchantCity(updated.qrisMerchantCity || '');
      setGoogleSheetId(updated.googleSheetId || '');
      setGoogleSheetName(updated.googleSheetName || 'Master_Invoice_DB');
      setGoogleSheetWebhookUrl(updated.googleSheetWebhookUrl || '');
      setAutoBackupToSheets(updated.autoBackupToSheets ?? true);
      setWhatsappNotificationEnabled(updated.whatsappNotificationEnabled ?? true);
      setWhatsappTemplate(updated.whatsappTemplate || '');
      setEmailNotificationEnabled(updated.emailNotificationEnabled ?? true);
      setEmailSenderName(updated.emailSenderName || 'Finance Cipta Media');
      setEmailSenderAddress(updated.emailSenderAddress || 'billing@ciptamedia.id');
      setAutoSendPreDueEmail(updated.autoSendPreDueEmail ?? true);
      setPreDueDays(updated.preDueDays || 3);
      setAutoSendOverdueEmail(updated.autoSendOverdueEmail ?? true);
      setOverdueEmailTemplate(updated.overdueEmailTemplate || '');
      setPreDueEmailTemplate(updated.preDueEmailTemplate || '');

      setTelegramBotToken(updated.telegramBotToken || '');
      setTelegramChatId(updated.telegramChatId || '');
      setTelegramDailyBackupEnabled(updated.telegramDailyBackupEnabled ?? false);
      setTelegramDailyBackupTime(updated.telegramDailyBackupTime || '00:00');
      setTelegramIncludeFormat(updated.telegramIncludeFormat || 'both');
      setLastTelegramBackupAt(updated.lastTelegramBackupAt || '');
      setLastTelegramBackupStatus(updated.lastTelegramBackupStatus || 'idle');
      setLastTelegramBackupMessage(updated.lastTelegramBackupMessage || '');

      setConfirmReset(false);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Gagal mengembalikan pengaturan default');
    } finally {
      setIsResetting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Friendly JavaScript validation
    if (!appName.trim()) {
      setActiveTab('app');
      setErrorMessage('Nama aplikasi / brand sistem tidak boleh kosong.');
      return;
    }
    if (!businessName.trim()) {
      setActiveTab('company');
      setErrorMessage('Nama perusahaan / badan usaha tidak boleh kosong.');
      return;
    }
    if (!businessPhone.trim()) {
      setActiveTab('company');
      setErrorMessage('Nomor WhatsApp / telepon resmi perusahaan wajib diisi.');
      return;
    }
    if (!businessEmail.trim()) {
      setActiveTab('company');
      setErrorMessage('Email resmi perusahaan wajib diisi.');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        appName: appName.trim(),
        appLogoUrl: appLogoUrl.trim(),
        appTagline: appTagline.trim(),

        businessName: businessName.trim(),
        companyLogoUrl: companyLogoUrl.trim(),
        businessTagline: businessTagline.trim(),
        businessOwner: businessOwner.trim(),
        businessPhone: businessPhone.trim(),
        businessEmail: businessEmail.trim(),
        businessAddress: businessAddress.trim(),
        businessWebsite: businessWebsite.trim(),
        businessTaxId: businessTaxId.trim(),

        bankName: bankName.trim(),
        bankAccountNumber: bankAccountNumber.trim(),
        bankAccountHolder: bankAccountHolder.trim(),

        bcaAccountNumber: bcaAccountNumber.trim(),
        bcaAccountHolder: bcaAccountHolder.trim(),
        briAccountNumber: briAccountNumber.trim(),
        briAccountHolder: briAccountHolder.trim(),
        danaNumber: danaNumber.trim(),
        danaAccountHolder: danaAccountHolder.trim(),
        gojekNumber: gojekNumber.trim(),
        gojekAccountHolder: gojekAccountHolder.trim(),
        watermarkText: watermarkText.trim(),

        signatureImageUrl,
        stampImageUrl,
        signatoryName: signatoryName.trim(),
        signatoryTitle: signatoryTitle.trim(),

        defaultInvoiceTemplate,

        defaultStaticQris: defaultStaticQris.trim(),
        qrisMerchantName: qrisMerchantName.trim(),
        qrisMerchantCity: qrisMerchantCity.trim(),

        googleSheetId: googleSheetId.trim(),
        googleSheetName: googleSheetName.trim(),
        googleSheetWebhookUrl: googleSheetWebhookUrl.trim(),
        autoBackupToSheets,

        whatsappNotificationEnabled,
        whatsappTemplate,

        emailNotificationEnabled,
        emailSenderName: emailSenderName.trim(),
        emailSenderAddress: emailSenderAddress.trim(),
        autoSendPreDueEmail,
        preDueDays: Number(preDueDays) || 3,
        autoSendOverdueEmail,
        overdueEmailTemplate,
        preDueEmailTemplate,

        // Telegram Backup settings
        telegramBotToken: telegramBotToken.trim(),
        telegramChatId: telegramChatId.trim(),
        telegramDailyBackupEnabled,
        telegramDailyBackupTime: telegramDailyBackupTime.trim() || '00:00',
        telegramIncludeFormat,
        lastTelegramBackupAt,
        lastTelegramBackupStatus,
        lastTelegramBackupMessage,
      });
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 1200);
    } catch (e: any) {
      console.error('Save settings error:', e);
      setErrorMessage(e?.message || 'Gagal menyimpan pengaturan ke database server.');
    } finally {
      setIsSaving(false);
    }
  };

  // Test Telegram Bot Connection
  const handleTestTelegram = async () => {
    if (!telegramBotToken.trim()) {
      setTelegramTestFeedback({ success: false, message: 'Harap isi Bot Token Telegram terlebih dahulu.' });
      return;
    }
    if (!telegramChatId.trim()) {
      setTelegramTestFeedback({ success: false, message: 'Harap isi Chat ID Telegram terlebih dahulu.' });
      return;
    }

    setIsTestingTelegram(true);
    setTelegramTestFeedback(null);
    try {
      const res = await fetch('/api/backup/telegram/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken: telegramBotToken.trim(),
          chatId: telegramChatId.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTelegramTestFeedback({ success: true, message: data.message });
      } else {
        setTelegramTestFeedback({ success: false, message: data.message || 'Gagal terhubung ke Telegram.' });
      }
    } catch (err: any) {
      setTelegramTestFeedback({ success: false, message: err.message || 'Gagal menghubungi server API.' });
    } finally {
      setIsTestingTelegram(false);
    }
  };

  // Dispatch Manual Telegram Backup Now
  const handleSendTelegramNow = async () => {
    if (!telegramBotToken.trim() || !telegramChatId.trim()) {
      setTelegramSendFeedback({
        success: false,
        message: 'Bot Token dan Chat ID wajib diisi sebelum mengirim cadangan.',
      });
      return;
    }

    setIsSendingTelegramNow(true);
    setTelegramSendFeedback(null);
    try {
      const res = await fetch('/api/backup/telegram/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken: telegramBotToken.trim(),
          chatId: telegramChatId.trim(),
          format: telegramIncludeFormat,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setLastTelegramBackupAt(data.sentAt || new Date().toISOString());
        setLastTelegramBackupStatus('success');
        setLastTelegramBackupMessage(data.message);
        setTelegramSendFeedback({
          success: true,
          message: data.message,
          stats: data.stats,
        });
      } else {
        setLastTelegramBackupStatus('failed');
        setLastTelegramBackupMessage(data.message);
        setTelegramSendFeedback({
          success: false,
          message: data.message || 'Pengiriman backup ke Telegram gagal.',
        });
      }
    } catch (err: any) {
      setLastTelegramBackupStatus('failed');
      setLastTelegramBackupMessage(err.message);
      setTelegramSendFeedback({
        success: false,
        message: err.message || 'Koneksi ke server gagal saat backup.',
      });
    } finally {
      setIsSendingTelegramNow(false);
    }
  };

  // Handle Restore File Selection & Validation
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsValidatingRestore(true);
    setRestoreFeedback(null);
    setRestorePreview(null);
    setRestorePayload(null);

    try {
      const text = await file.text();
      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch (err) {
        throw new Error('Berkas yang dipilih bukan format JSON yang valid.');
      }

      const res = await fetch('/api/backup/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backupData: parsed }),
      });
      const data = await res.json();

      if (data.success && data.isValid) {
        setRestorePayload(parsed);
        setRestorePreview(data.preview);
      } else {
        setRestoreFeedback({
          success: false,
          message: data.message || 'Validasi berkas cadangan gagal.',
        });
      }
    } catch (err: any) {
      setRestoreFeedback({
        success: false,
        message: err.message || 'Gagal membaca berkas cadangan.',
      });
    } finally {
      setIsValidatingRestore(false);
      if (restoreFileInputRef.current) {
        restoreFileInputRef.current.value = '';
      }
    }
  };

  // Execute Restore Action
  const handleExecuteRestore = async () => {
    if (!restorePayload) return;

    setIsRestoring(true);
    setRestoreFeedback(null);
    try {
      const res = await fetch('/api/backup/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          backupData: restorePayload,
          mode: restoreMode,
          includeSettings: restoreIncludeSettings,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setRestoreFeedback({
          success: true,
          message: data.message,
          stats: data.stats,
        });
        setShowConfirmRestoreModal(false);
        setRestorePreview(null);
        setRestorePayload(null);

        // Auto reload after brief delay to refresh all screens with restored data
        setTimeout(() => {
          window.location.reload();
        }, 1800);
      } else {
        setRestoreFeedback({
          success: false,
          message: data.message || 'Gagal memulihkan database.',
        });
        setShowConfirmRestoreModal(false);
      }
    } catch (err: any) {
      setRestoreFeedback({
        success: false,
        message: err.message || 'Terjadi kesalahan sistem saat pemulihan database.',
      });
      setShowConfirmRestoreModal(false);
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-3xl rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/90 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Pengaturan Sistem & Profil Perusahaan
              </h3>
              <p className="text-xs text-slate-500">
                Kustomisasi nama & logo aplikasi, profil bisnis, template PDF, QRIS, Google Sheets, dan notifikasi
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 px-6 py-2.5 bg-slate-100/70 border-b border-slate-200/80 overflow-x-auto shrink-0 scrollbar-none text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('app')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition whitespace-nowrap ${
              activeTab === 'app'
                ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Identitas Aplikasi</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('company')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition whitespace-nowrap ${
              activeTab === 'company'
                ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Building className="w-3.5 h-3.5 text-blue-600" />
            <span>Profil Perusahaan</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('template')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition whitespace-nowrap ${
              activeTab === 'template'
                ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Palette className="w-3.5 h-3.5 text-indigo-600" />
            <span>Pilihan Template PDF</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('qris')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition whitespace-nowrap ${
              activeTab === 'qris'
                ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <QrCode className="w-3.5 h-3.5 text-emerald-600" />
            <span>QRIS Pembayaran</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('backup')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition whitespace-nowrap ${
              activeTab === 'backup'
                ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-teal-600" />
            <span>Backup & Restore (Telegram / Cloud)</span>
            {telegramDailyBackupEnabled && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" title="Backup Telegram Harian Aktif" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('notification')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition whitespace-nowrap ${
              activeTab === 'notification'
                ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Mail className="w-3.5 h-3.5 text-emerald-600" />
            <span>Notifikasi & WhatsApp</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="p-1 text-rose-500 hover:text-rose-700 rounded-lg hover:bg-rose-100"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {savedSuccess && (
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Pengaturan dan profil berhasil disimpan secara permanen!</span>
            </div>
          )}

          {/* TAB 1: IDENTITAS & BRANDING APLIKASI */}
          {activeTab === 'app' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-100 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-blue-900 text-xs sm:text-sm">Identitas & Logo Aplikasi</h4>
                  <p className="text-slate-600 text-[11px] mt-0.5 leading-relaxed">
                    Nama dan logo ini akan ditampilkan di bilah navigasi (Navbar), header portal pelanggan, halaman login admin, dan judul sistem.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Nama Aplikasi / Brand Sistem <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={appName}
                    onChange={(e) => setAppName(e.target.value)}
                    placeholder="Contoh: InvoiceKilat, BillingPro, Factura..."
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 font-semibold text-slate-900"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Nama ini menggantikan branding default aplikasi.</p>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Slogan / Tagline Aplikasi
                  </label>
                  <input
                    type="text"
                    value={appTagline}
                    onChange={(e) => setAppTagline(e.target.value)}
                    placeholder="Sistem Faktur & QRIS Dinamis Otomatis"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 text-slate-800"
                  />
                </div>
              </div>

              {/* Logo Upload Section */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                <label className="font-bold text-slate-700 block">
                  Logo Aplikasi (Header & Navbar)
                </label>
                
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Logo Preview */}
                  <div className="w-20 h-20 rounded-2xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                    {appLogoUrl ? (
                      <img src={appLogoUrl} alt="App Logo" className="w-full h-full object-contain p-1.5" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-lg">
                        {appName.substring(0, 2).toUpperCase() || 'IK'}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-2 w-full">
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        ref={appLogoInputRef}
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, setAppLogoUrl)}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => appLogoInputRef.current?.click()}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload File Logo</span>
                      </button>

                      {appLogoUrl && (
                        <button
                          type="button"
                          onClick={() => setAppLogoUrl('')}
                          className="px-3 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs transition"
                        >
                          Reset Default
                        </button>
                      )}
                    </div>

                    <div>
                      <input
                        type="text"
                        value={appLogoUrl}
                        onChange={(e) => setAppLogoUrl(e.target.value)}
                        placeholder="Atau tempel URL gambar logo (https://...)"
                        className="w-full px-3 py-1.5 text-[11px] rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500 font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PROFIL PERUSAHAAN / BISNIS */}
          {activeTab === 'company' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 flex items-start gap-3">
                <Building className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm">Profil Badan Usaha & Perusahaan</h4>
                  <p className="text-slate-500 text-[11px] mt-0.5 leading-relaxed">
                    Informasi resmi perusahaan yang tercantum pada faktur invoice, lembar cetak PDF, dan pengingat resmi pelanggan.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Nama Perusahaan / Bisnis <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="PT Cipta Media Nusantara"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Slogan / Deskripsi Singkat Usaha
                  </label>
                  <input
                    type="text"
                    value={businessTagline}
                    onChange={(e) => setBusinessTagline(e.target.value)}
                    placeholder="Solusi Teknologi & Transformasi Digital"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Nama Pemilik / Direktur Penanggung Jawab
                  </label>
                  <input
                    type="text"
                    value={businessOwner}
                    onChange={(e) => setBusinessOwner(e.target.value)}
                    placeholder="Budi Santoso"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    NPWP / Nomor Pokok Wajib Pajak / NIB
                  </label>
                  <input
                    type="text"
                    value={businessTaxId}
                    onChange={(e) => setBusinessTaxId(e.target.value)}
                    placeholder="01.234.567.8-012.000"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Nomor Telepon / WhatsApp Resmi Bisnis <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={businessPhone}
                    onChange={(e) => setBusinessPhone(e.target.value)}
                    placeholder="6281298765432"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Email Resmi Perusahaan <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={businessEmail}
                    onChange={(e) => setBusinessEmail(e.target.value)}
                    placeholder="billing@ciptamedia.id"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Website Resmi
                  </label>
                  <input
                    type="text"
                    value={businessWebsite}
                    onChange={(e) => setBusinessWebsite(e.target.value)}
                    placeholder="https://ciptamedia.id"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Logo Resmi Perusahaan (Kop Surat)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      ref={companyLogoInputRef}
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, setCompanyLogoUrl)}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => companyLogoInputRef.current?.click()}
                      className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Logo</span>
                    </button>
                    {companyLogoUrl && (
                      <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                        <Check className="w-3 h-3" /> Logo Terpasang
                      </span>
                    )}
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">
                    Alamat Lengkap Kantor / Usaha
                  </label>
                  <input
                    type="text"
                    value={businessAddress}
                    onChange={(e) => setBusinessAddress(e.target.value)}
                    placeholder="Jl. Sudirman No. 45 Kav. 8, Senayan, Jakarta Pusat"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Multi-Payment Methods Section (BCA, BRI, DANA, Gojek) */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="font-bold text-slate-800 flex items-center gap-1.5 text-xs sm:text-sm">
                    <CreditCard className="w-4 h-4 text-blue-600" />
                    <span>Konfigurasi Metode Pembayaran (BCA, BRI, DANA, Gojek)</span>
                  </h5>
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                    Multi-Channel
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* BCA */}
                  <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-2">
                    <span className="text-xs font-bold text-blue-900 flex items-center gap-1">
                      Bank BCA
                    </span>
                    <div className="space-y-1.5">
                      <div>
                        <label className="text-[10px] font-semibold text-slate-500 block">Nomor Rekening BCA</label>
                        <input
                          type="text"
                          value={bcaAccountNumber}
                          onChange={(e) => setBcaAccountNumber(e.target.value)}
                          placeholder="8730918231"
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-slate-500 block">Atas Nama (A/N)</label>
                        <input
                          type="text"
                          value={bcaAccountHolder}
                          onChange={(e) => setBcaAccountHolder(e.target.value)}
                          placeholder="PT Cipta Media Nusantara"
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200"
                        />
                      </div>
                    </div>
                  </div>

                  {/* BRI */}
                  <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-2">
                    <span className="text-xs font-bold text-sky-900 flex items-center gap-1">
                      Bank BRI
                    </span>
                    <div className="space-y-1.5">
                      <div>
                        <label className="text-[10px] font-semibold text-slate-500 block">Nomor Rekening BRI</label>
                        <input
                          type="text"
                          value={briAccountNumber}
                          onChange={(e) => setBriAccountNumber(e.target.value)}
                          placeholder="012301098765501"
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-slate-500 block">Atas Nama (A/N)</label>
                        <input
                          type="text"
                          value={briAccountHolder}
                          onChange={(e) => setBriAccountHolder(e.target.value)}
                          placeholder="PT Cipta Media Nusantara"
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200"
                        />
                      </div>
                    </div>
                  </div>

                  {/* DANA */}
                  <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-2">
                    <span className="text-xs font-bold text-cyan-900 flex items-center gap-1">
                      DANA E-Wallet
                    </span>
                    <div className="space-y-1.5">
                      <div>
                        <label className="text-[10px] font-semibold text-slate-500 block">Nomor Handphone / DANA ID</label>
                        <input
                          type="text"
                          value={danaNumber}
                          onChange={(e) => setDanaNumber(e.target.value)}
                          placeholder="08977345640"
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-slate-500 block">Atas Nama Akun</label>
                        <input
                          type="text"
                          value={danaAccountHolder}
                          onChange={(e) => setDanaAccountHolder(e.target.value)}
                          placeholder="Heruhendri"
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Gojek */}
                  <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-2">
                    <span className="text-xs font-bold text-emerald-900 flex items-center gap-1">
                      Gojek / GoPay E-Wallet
                    </span>
                    <div className="space-y-1.5">
                      <div>
                        <label className="text-[10px] font-semibold text-slate-500 block">Nomor Handphone / GoPay ID</label>
                        <input
                          type="text"
                          value={gojekNumber}
                          onChange={(e) => setGojekNumber(e.target.value)}
                          placeholder="08977345640"
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-slate-500 block">Atas Nama Akun</label>
                        <input
                          type="text"
                          value={gojekAccountHolder}
                          onChange={(e) => setGojekAccountHolder(e.target.value)}
                          placeholder="Heruhendri"
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Watermark Configuration */}
                <div className="pt-2 border-t border-slate-200">
                  <label className="text-xs font-bold text-slate-800 block mb-1">
                    Teks Watermark / Footer Invoice & Portal
                  </label>
                  <input
                    type="text"
                    value={watermarkText}
                    onChange={(e) => setWatermarkText(e.target.value)}
                    placeholder="Dibuat oleh heruhendri • Contact Person: 08977345640"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Watermark ini akan tercetak pada bagian bawah semua faktur PDF dan portal pelanggan.
                  </span>
                </div>
              </div>

              {/* Digital Signature & Stamp */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                <h5 className="font-bold text-slate-800 flex items-center gap-1.5">
                  <PenTool className="w-4 h-4 text-purple-600" />
                  <span>Tanda Tangan Digital & Stempel / Cap Resmi (Cetak PDF)</span>
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Signature */}
                  <div className="space-y-2">
                    <label className="font-semibold text-slate-600 block">Tanda Tangan Digital</label>
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-14 rounded-xl border border-dashed border-slate-300 bg-white flex items-center justify-center overflow-hidden">
                        {signatureImageUrl ? (
                          <img src={signatureImageUrl} alt="Signature" className="max-h-full object-contain" />
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Belum ada</span>
                        )}
                      </div>
                      <div>
                        <input
                          type="file"
                          ref={signatureInputRef}
                          accept="image/*"
                          onChange={(e) => handleFileUpload(e, setSignatureImageUrl)}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => signatureInputRef.current?.click()}
                          className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs transition"
                        >
                          Upload TTD
                        </button>
                        {signatureImageUrl && (
                          <button
                            type="button"
                            onClick={() => setSignatureImageUrl('')}
                            className="block text-[10px] text-rose-500 hover:underline mt-1"
                          >
                            Hapus
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Stamp */}
                  <div className="space-y-2">
                    <label className="font-semibold text-slate-600 block">Cap / Stempel Perusahaan</label>
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-14 rounded-xl border border-dashed border-slate-300 bg-white flex items-center justify-center overflow-hidden">
                        {stampImageUrl ? (
                          <img src={stampImageUrl} alt="Stamp" className="max-h-full object-contain" />
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Belum ada</span>
                        )}
                      </div>
                      <div>
                        <input
                          type="file"
                          ref={stampInputRef}
                          accept="image/*"
                          onChange={(e) => handleFileUpload(e, setStampImageUrl)}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => stampInputRef.current?.click()}
                          className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs transition"
                        >
                          Upload Cap
                        </button>
                        {stampImageUrl && (
                          <button
                            type="button"
                            onClick={() => setStampImageUrl('')}
                            className="block text-[10px] text-rose-500 hover:underline mt-1"
                          >
                            Hapus
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="font-semibold text-slate-600 block mb-1">Nama Penanda Tangan</label>
                    <input
                      type="text"
                      value={signatoryName}
                      onChange={(e) => setSignatoryName(e.target.value)}
                      placeholder="Budi Santoso"
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-600 block mb-1">Jabatan Penanda Tangan</label>
                    <input
                      type="text"
                      value={signatoryTitle}
                      onChange={(e) => setSignatoryTitle(e.target.value)}
                      placeholder="Direktur Utama"
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PILIHAN TEMPLATE PDF INVOICE */}
          {activeTab === 'template' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="bg-indigo-50/60 p-4 rounded-2xl border border-indigo-100 flex items-start gap-3">
                <Palette className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-indigo-950 text-xs sm:text-sm">Banyak Pilihan Template PDF Invoice Profesional</h4>
                  <p className="text-slate-600 text-[11px] mt-0.5 leading-relaxed">
                    Pilih desain default faktur invoice cetak. Anda juga dapat mengganti template secara instan kapan pun di pratinjau cetak invoice.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Template 1: Corporate Clean */}
                <label className={`p-4 rounded-2xl border-2 cursor-pointer transition flex items-start gap-3 ${
                  defaultInvoiceTemplate === 'corporate' 
                    ? 'border-blue-600 bg-blue-50/40 shadow-xs' 
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}>
                  <input
                    type="radio"
                    name="templateChoice"
                    checked={defaultInvoiceTemplate === 'corporate'}
                    onChange={() => setDefaultInvoiceTemplate('corporate')}
                    className="mt-1 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900 text-xs">1. Corporate Clean</span>
                      <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">Populer</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      Desain korporat modern dengan header biru elegan, tabel terstruktur rapi, blok QRIS dinamis, dan kolom tanda tangan resmi.
                    </p>
                  </div>
                </label>

                {/* Template 2: Minimalist Luxe */}
                <label className={`p-4 rounded-2xl border-2 cursor-pointer transition flex items-start gap-3 ${
                  defaultInvoiceTemplate === 'minimalist' 
                    ? 'border-blue-600 bg-blue-50/40 shadow-xs' 
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}>
                  <input
                    type="radio"
                    name="templateChoice"
                    checked={defaultInvoiceTemplate === 'minimalist'}
                    onChange={() => setDefaultInvoiceTemplate('minimalist')}
                    className="mt-1 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900 text-xs">2. Minimalist Luxe</span>
                      <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold">Monokrom</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      Gaya tipografi presisi tinggi, garis pembatas ultra tipis, tata letak luas dan estetika serba hitam-putih profesional.
                    </p>
                  </div>
                </label>

                {/* Template 3: Creative Modern */}
                <label className={`p-4 rounded-2xl border-2 cursor-pointer transition flex items-start gap-3 ${
                  defaultInvoiceTemplate === 'creative' 
                    ? 'border-blue-600 bg-blue-50/40 shadow-xs' 
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}>
                  <input
                    type="radio"
                    name="templateChoice"
                    checked={defaultInvoiceTemplate === 'creative'}
                    onChange={() => setDefaultInvoiceTemplate('creative')}
                    className="mt-1 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900 text-xs">3. Creative Modern</span>
                      <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold">Kreatif</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      Aksen gradien indigo lembut, kartu ringkasan total tagihan, badge status dinamis, dan QRIS terpusat modern.
                    </p>
                  </div>
                </label>

                {/* Template 4: Classic Formal / Perpajakan */}
                <label className={`p-4 rounded-2xl border-2 cursor-pointer transition flex items-start gap-3 ${
                  defaultInvoiceTemplate === 'formal' 
                    ? 'border-blue-600 bg-blue-50/40 shadow-xs' 
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}>
                  <input
                    type="radio"
                    name="templateChoice"
                    checked={defaultInvoiceTemplate === 'formal'}
                    onChange={() => setDefaultInvoiceTemplate('formal')}
                    className="mt-1 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900 text-xs">4. Classic Formal (Pajak & B2B)</span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">Legal / NPWP</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      Format standar komersial dengan bilingual label (ID/EN), kotak NPWP lengkap, klausul jatuh tempo, dan cap pengesahan.
                    </p>
                  </div>
                </label>

                {/* Template 5: Thermal / POS Ringkas */}
                <label className={`p-4 rounded-2xl border-2 cursor-pointer transition flex items-start gap-3 sm:col-span-2 ${
                  defaultInvoiceTemplate === 'pos' 
                    ? 'border-blue-600 bg-blue-50/40 shadow-xs' 
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}>
                  <input
                    type="radio"
                    name="templateChoice"
                    checked={defaultInvoiceTemplate === 'pos'}
                    onChange={() => setDefaultInvoiceTemplate('pos')}
                    className="mt-1 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900 text-xs">5. Struk Kasir Ringkas (Thermal / Slip 80mm)</span>
                      <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">Ringkas</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      Format kuitansi pembayaran instan berukuran ramping, cocok untuk pembayaran langsung di tempat atau nota cepat.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* TAB 4: QRIS BISNIS */}
          {activeTab === 'qris' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100 flex items-start gap-3">
                <QrCode className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-emerald-950 text-xs sm:text-sm">QRIS DANA Bisnis Merchant Terpusat</h4>
                  <p className="text-slate-600 text-[11px] mt-0.5 leading-relaxed">
                    Sistem otomatis mengkonversi QRIS statis ini menjadi <strong>QRIS Dinamis</strong> ber-nominal terkunci untuk setiap invoice dan portal pelanggan. Upload gambar QRIS di bawah untuk mengisi nama & kota merchant secara otomatis.
                  </p>
                </div>
              </div>

              {qrisExtractionNotice && (
                <div className="p-3 bg-emerald-100/90 border border-emerald-300 rounded-xl text-xs text-emerald-950 flex items-center justify-between animate-in fade-in slide-in-from-top-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span className="font-semibold">{qrisExtractionNotice}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setQrisExtractionNotice('')}
                    className="text-emerald-700 hover:text-emerald-900 font-bold text-xs px-1"
                  >
                    ✕
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 flex items-center justify-between mb-1">
                    <span className="flex items-center gap-1.5">
                      <span>Nama Merchant QRIS (Sesuai DANA Bisnis)</span>
                      {qrisAutoExtracted && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 rounded-md">
                          <Sparkles className="w-3 h-3 text-emerald-600" />
                          Otomatis
                        </span>
                      )}
                    </span>
                    {defaultStaticQris && (
                      <button
                        type="button"
                        onClick={() => handleAutoExtractFromQris()}
                        className="text-[10px] font-medium text-emerald-600 hover:text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer"
                        title="Tarik nama & kota otomatis dari string QRIS"
                      >
                        <RefreshCw className="w-2.5 h-2.5" />
                        <span>Tarik dari QRIS</span>
                      </button>
                    )}
                  </label>
                  <input
                    type="text"
                    value={qrisMerchantName}
                    onChange={(e) => {
                      setQrisMerchantName(e.target.value);
                      setQrisAutoExtracted(false);
                    }}
                    placeholder="DANA BISNIS CIPTA MEDIA"
                    className={`w-full px-3.5 py-2 text-xs rounded-xl border focus:ring-2 focus:ring-blue-500 uppercase font-mono transition-colors ${
                      qrisAutoExtracted
                        ? 'border-emerald-300 bg-emerald-50/50 text-emerald-950 font-bold'
                        : 'border-slate-200 text-slate-800'
                    }`}
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    {qrisAutoExtracted ? '✓ Terisi otomatis dari Tag 59 QRIS' : 'Otomatis terisi saat screenshot QRIS di-upload'}
                  </p>
                </div>

                <div>
                  <label className="font-bold text-slate-700 flex items-center justify-between mb-1">
                    <span className="flex items-center gap-1.5">
                      <span>Kota Merchant (Contoh: JAKARTA, BANDUNG, SURABAYA)</span>
                      {qrisAutoExtracted && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 rounded-md">
                          <MapPin className="w-3 h-3 text-emerald-600" />
                          Otomatis
                        </span>
                      )}
                    </span>
                  </label>
                  <input
                    type="text"
                    value={qrisMerchantCity}
                    onChange={(e) => {
                      setQrisMerchantCity(e.target.value);
                      setQrisAutoExtracted(false);
                    }}
                    placeholder="JAKARTA"
                    className={`w-full px-3.5 py-2 text-xs rounded-xl border focus:ring-2 focus:ring-blue-500 uppercase font-mono transition-colors ${
                      qrisAutoExtracted
                        ? 'border-emerald-300 bg-emerald-50/50 text-emerald-950 font-bold'
                        : 'border-slate-200 text-slate-800'
                    }`}
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    {qrisAutoExtracted ? '✓ Terisi otomatis dari Tag 60 QRIS' : 'Otomatis terisi saat screenshot QRIS di-upload'}
                  </p>
                </div>
              </div>

              <QRISImageUploader
                label="Upload Screenshot QRIS DANA Bisnis Anda (Otomatis Ekstrak)"
                currentPayload={defaultStaticQris}
                autoSaveToSettings={true}
                onQRISDecoded={(payload, meta) => {
                  setDefaultStaticQris(payload);
                  const parsed = parseQris(payload);
                  const detectedName = meta?.merchantName || parsed.merchantName;
                  const detectedCity = meta?.merchantCity || parsed.merchantCity;

                  if (detectedName) {
                    setQrisMerchantName(detectedName);
                  }
                  if (detectedCity) {
                    setQrisMerchantCity(detectedCity);
                  }
                  setQrisAutoExtracted(true);
                  setQrisExtractionNotice(
                    `Berhasil otomatis mengisi: Nama Merchant "${detectedName || 'Merchant'}" & Kota "${detectedCity || 'Kota'}" dari QRIS yang di-upload!`
                  );
                  setTimeout(() => setQrisExtractionNotice(''), 7000);
                }}
              />

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-600 block">
                    String Payload EMVCo QRIS Statis:
                  </label>
                  {defaultStaticQris && (
                    <button
                      type="button"
                      onClick={() => handleAutoExtractFromQris()}
                      className="text-[10px] font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Ekstrak Ulang Nama & Kota</span>
                    </button>
                  )}
                </div>
                <textarea
                  rows={2}
                  value={defaultStaticQris}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDefaultStaticQris(val);
                    if (val.trim().startsWith('000201')) {
                      const parsed = parseQris(val.trim());
                      if (parsed.merchantName) setQrisMerchantName(parsed.merchantName);
                      if (parsed.merchantCity) setQrisMerchantCity(parsed.merchantCity);
                      setQrisAutoExtracted(true);
                    }
                  }}
                  placeholder="0002010102112658..."
                  className="w-full px-3 py-2 text-[11px] font-mono rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-500"
                />
                {defaultStaticQris && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-[11px]">
                    {validateQris(defaultStaticQris).valid ? (
                      <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg flex items-center gap-1 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        {validateQris(defaultStaticQris).message}
                      </span>
                    ) : (
                      <span className="text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-lg flex items-center gap-1 font-semibold">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                        {validateQris(defaultStaticQris).message}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: BACKUP & RESTORE (TELEGRAM, OFFLINE, SPREADSHEET) */}
          {activeTab === 'backup' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Header Status Banner */}
              <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 p-4 sm:p-5 text-white shadow-md border border-blue-900/40">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 border border-blue-400/20">
                        <Database className="w-3 h-3 text-blue-400" />
                        Pusat Cadangan & Pemulihan Sistem
                      </span>
                      {telegramDailyBackupEnabled ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold flex items-center gap-1 border border-emerald-400/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Telegram Harian Aktif ({telegramDailyBackupTime} WIB)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-medium border border-amber-400/20">
                          Telegram Otomatis Belum Aktif
                        </span>
                      )}
                    </div>
                    <h4 className="font-extrabold text-white text-sm sm:text-base">
                      Cadangan Otomatis ke Telegram & Pemulihan (Restore) Database
                    </h4>
                    <p className="text-slate-300 text-[11px] mt-0.5 max-w-xl leading-relaxed">
                      Amankan database transaksi, master invoice, profil pelanggan, dan layanan secara otomatis ke bot/channel Telegram Anda setiap hari, atau pulihkan data kapan saja.
                    </p>
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="shrink-0 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setBackupSection('restore')}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/10 transition active:scale-95"
                    >
                      <FileUp className="w-3.5 h-3.5 text-blue-400" />
                      <span>Pulihkan Data</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSendTelegramNow}
                      disabled={isSendingTelegramNow || !telegramBotToken || !telegramChatId}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/30 transition active:scale-95 disabled:opacity-50"
                      title="Kirim backup database terbaru ke Telegram sekarang"
                    >
                      <Send className={`w-3.5 h-3.5 ${isSendingTelegramNow ? 'animate-spin' : ''}`} />
                      <span>{isSendingTelegramNow ? 'Mengirim...' : 'Kirim ke Telegram'}</span>
                    </button>
                  </div>
                </div>

                {/* Status metrics bar */}
                <div className="mt-4 pt-3 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="bg-white/5 rounded-xl p-2 border border-white/10">
                    <span className="text-[10px] text-slate-400 block">Jadwal Backup:</span>
                    <span className="font-semibold text-white text-[11px] truncate block">
                      {telegramDailyBackupEnabled ? `Harian @ ${telegramDailyBackupTime} WIB` : 'Manual / Nonaktif'}
                    </span>
                  </div>
                  <div className="bg-white/5 rounded-xl p-2 border border-white/10">
                    <span className="text-[10px] text-slate-400 block">Status Terakhir:</span>
                    <span className={`font-semibold text-[11px] truncate block ${
                      lastTelegramBackupStatus === 'success' ? 'text-emerald-400' : lastTelegramBackupStatus === 'failed' ? 'text-rose-400' : 'text-slate-300'
                    }`}>
                      {lastTelegramBackupStatus === 'success' ? 'Berhasil Terkirim' : lastTelegramBackupStatus === 'failed' ? 'Gagal Terkirim' : 'Belum Ada'}
                    </span>
                  </div>
                  <div className="bg-white/5 rounded-xl p-2 border border-white/10">
                    <span className="text-[10px] text-slate-400 block">Waktu Terakhir:</span>
                    <span className="font-semibold text-white text-[11px] truncate block">
                      {lastTelegramBackupAt ? formatDateTimeIndo(lastTelegramBackupAt) : 'Belum Pernah'}
                    </span>
                  </div>
                  <div className="bg-white/5 rounded-xl p-2 border border-white/10">
                    <span className="text-[10px] text-slate-400 block">Data Sistem:</span>
                    <span className="font-semibold text-white text-[11px] truncate block">
                      {invoices.length} Invoice • {settings?.businessName || 'Profil Bisnis'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sub-tab Switcher Pills */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200 overflow-x-auto text-xs">
                <button
                  type="button"
                  onClick={() => setBackupSection('telegram')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition shrink-0 ${
                    backupSection === 'telegram'
                      ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <Send className="w-3.5 h-3.5 text-blue-600" />
                  <span>Backup Telegram Harian</span>
                  {telegramDailyBackupEnabled && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setBackupSection('restore')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition shrink-0 ${
                    backupSection === 'restore'
                      ? 'bg-white text-emerald-700 shadow-xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Pulihkan (Restore) Database</span>
                  {restorePreview && (
                    <span className="px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">Siap</span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setBackupSection('offline')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition shrink-0 ${
                    backupSection === 'offline'
                      ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <Download className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Unduh Cadangan Offline</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBackupSection('sheets')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition shrink-0 ${
                    backupSection === 'sheets'
                      ? 'bg-white text-teal-700 shadow-xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-teal-600" />
                  <span>Google Spreadsheet Sync</span>
                </button>
              </div>

              {/* ================= SECTION 1: TELEGRAM BACKUP HARIAN ================= */}
              {backupSection === 'telegram' && (
                <div className="space-y-4">
                  {/* Notification Feedback Banners */}
                  {telegramTestFeedback && (
                    <div className={`p-3 rounded-2xl border text-xs font-semibold flex items-center justify-between gap-2 animate-in fade-in ${
                      telegramTestFeedback.success
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border-rose-200'
                    }`}>
                      <div className="flex items-center gap-2">
                        {telegramTestFeedback.success ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        )}
                        <span>{telegramTestFeedback.message}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setTelegramTestFeedback(null)}
                        className="text-slate-400 hover:text-slate-700 text-xs font-bold"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  {telegramSendFeedback && (
                    <div className={`p-3 rounded-2xl border text-xs font-semibold flex items-center justify-between gap-2 animate-in fade-in ${
                      telegramSendFeedback.success
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border-rose-200'
                    }`}>
                      <div className="flex items-center gap-2">
                        {telegramSendFeedback.success ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        )}
                        <div>
                          <p>{telegramSendFeedback.message}</p>
                          {telegramSendFeedback.stats && (
                            <p className="text-[11px] opacity-80 mt-0.5">
                              Terkirim: {telegramSendFeedback.stats.invoices} tagihan, {telegramSendFeedback.stats.customers} pelanggan, total nominal Rp {Number(telegramSendFeedback.stats.totalRevenue || 0).toLocaleString('id-ID')}
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setTelegramSendFeedback(null)}
                        className="text-slate-400 hover:text-slate-700 text-xs font-bold"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  {/* Main Telegram Configuration Card */}
                  <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-white space-y-4">
                    <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                      <div>
                        <h5 className="font-extrabold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                          <Send className="w-4 h-4 text-blue-600" />
                          Pengaturan Bot & Saluran Telegram
                        </h5>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          File backup database (.json) dan ringkasan finansial akan otomatis dikirimkan ke Telegram Anda.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowTelegramGuide(!showTelegramGuide)}
                        className="text-[11px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 underline"
                      >
                        <Info className="w-3.5 h-3.5" />
                        <span>{showTelegramGuide ? 'Tutup Panduan' : 'Cara Buat Bot'}</span>
                      </button>
                    </div>

                    {/* Collapsible Step-by-step Guide */}
                    {showTelegramGuide && (
                      <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-100 text-xs text-slate-700 space-y-2 animate-in fade-in">
                        <p className="font-bold text-blue-900">Panduan 3 Langkah Menghubungkan Telegram:</p>
                        <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-700 pl-1 leading-relaxed">
                          <li>
                            Buka <strong>@BotFather</strong> di Telegram, kirim perintah <code className="bg-blue-100 px-1 py-0.5 rounded font-mono text-blue-800">/newbot</code>, ikuti petunjuk dan salin <strong>HTTP API Bot Token</strong> ke kolom di bawah.
                          </li>
                          <li>
                            Buka bot yang baru dibuat di Telegram dan klik <strong>START</strong> (atau kirim pesan apa saja agar bot bisa mengirim pesan ke Anda).
                          </li>
                          <li>
                            Dapatkan Chat ID Anda via bot <strong>@userinfobot</strong> atau <strong>@getidsbot</strong> di Telegram. Jika ingin dikirim ke <strong>Grup/Channel</strong>, tambahkan bot ke grup tersebut lalu masukkan ID Grup (biasanya diawali tanda minus <code className="bg-blue-100 px-1 py-0.5 rounded font-mono text-blue-800">-100xxxx</code>).
                          </li>
                        </ol>
                      </div>
                    )}

                    {/* Bot Token & Chat ID Inputs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="font-bold text-slate-700 text-xs flex items-center gap-1">
                            Telegram Bot Token
                            <span className="text-rose-500">*</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => setShowBotToken(!showBotToken)}
                            className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1"
                          >
                            {showBotToken ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            <span>{showBotToken ? 'Sembunyikan' : 'Lihat'}</span>
                          </button>
                        </div>
                        <input
                          type={showBotToken ? 'text' : 'password'}
                          value={telegramBotToken}
                          onChange={(e) => setTelegramBotToken(e.target.value)}
                          placeholder="Contoh: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                          className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 font-mono"
                        />
                        <span className="text-[10px] text-slate-400 mt-1 block">
                          Token rahasia dari @BotFather
                        </span>
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 text-xs block mb-1">
                          Telegram Chat ID / Group ID
                          <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={telegramChatId}
                          onChange={(e) => setTelegramChatId(e.target.value)}
                          placeholder="Contoh: 987654321 atau -100123456789"
                          className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 font-mono"
                        />
                        <span className="text-[10px] text-slate-400 mt-1 block">
                          ID Telegram pribadi Anda atau ID grup/saluran
                        </span>
                      </div>
                    </div>

                    {/* Automated Daily Toggle & Time Picker */}
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="font-extrabold text-slate-900 text-xs block">
                            Kirim Cadangan Otomatis Harian
                          </label>
                          <span className="text-[11px] text-slate-500">
                            Server akan otomatis mengekspor seluruh database dan mengirimkannya ke Telegram setiap hari
                          </span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={telegramDailyBackupEnabled}
                            onChange={(e) => setTelegramDailyBackupEnabled(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      {telegramDailyBackupEnabled && (
                        <div className="pt-3 border-t border-slate-200 space-y-2 animate-in fade-in">
                          <label className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-blue-600" />
                            Pilih Waktu Pengiriman Cadangan Harian:
                          </label>
                          <div className="flex flex-wrap items-center gap-2">
                            {[
                              { label: '00:00 (Tengah Malam)', value: '00:00' },
                              { label: '06:00 (Pagi Hari)', value: '06:00' },
                              { label: '12:00 (Siang Hari)', value: '12:00' },
                              { label: '18:00 (Sore Hari)', value: '18:00' },
                              { label: '23:00 (Malam Hari)', value: '23:00' },
                            ].map((preset) => (
                              <button
                                key={preset.value}
                                type="button"
                                onClick={() => setTelegramDailyBackupTime(preset.value)}
                                className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition border ${
                                  telegramDailyBackupTime === preset.value
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                    : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300'
                                }`}
                              >
                                {preset.label}
                              </button>
                            ))}
                            <div className="flex items-center gap-1 ml-auto">
                              <span className="text-[11px] text-slate-500 font-medium">Kustom (HH:mm):</span>
                              <input
                                type="time"
                                value={telegramDailyBackupTime}
                                onChange={(e) => setTelegramDailyBackupTime(e.target.value)}
                                className="px-2 py-1 text-xs rounded-lg border border-slate-200 font-mono font-bold text-slate-800"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Format Selector */}
                    <div>
                      <label className="font-bold text-slate-700 text-xs block mb-1.5">
                        Format Pengiriman ke Telegram:
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {[
                          {
                            id: 'both',
                            title: 'Dokumen JSON + Ringkasan Pesan',
                            desc: 'Kirim file database utuh dan laporan statistik finansial lengkap (Disarankan).',
                          },
                          {
                            id: 'document_json',
                            title: 'Hanya Dokumen JSON',
                            desc: 'Hanya melampirkan berkas file .json cadangan untuk restore.',
                          },
                          {
                            id: 'summary_text',
                            title: 'Hanya Ringkasan Teks',
                            desc: 'Kirim laporan ringkasan transaksi & tagihan tanpa lampiran file.',
                          },
                        ].map((fmt) => (
                          <label
                            key={fmt.id}
                            className={`p-2.5 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                              telegramIncludeFormat === fmt.id
                                ? 'bg-blue-50/70 border-blue-400 text-blue-950'
                                : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              <input
                                type="radio"
                                name="telegramFormat"
                                value={fmt.id}
                                checked={telegramIncludeFormat === fmt.id}
                                onChange={() => setTelegramIncludeFormat(fmt.id as any)}
                                className="mt-0.5 text-blue-600 focus:ring-blue-500"
                              />
                              <div>
                                <span className="font-bold text-xs block">{fmt.title}</span>
                                <span className="text-[10px] text-slate-500 leading-tight block mt-0.5">
                                  {fmt.desc}
                                </span>
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Action Buttons: Test Connection & Send Now */}
                    <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                      <button
                        type="button"
                        onClick={handleTestTelegram}
                        disabled={isTestingTelegram || !telegramBotToken || !telegramChatId}
                        className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isTestingTelegram ? 'animate-spin' : ''}`} />
                        <span>{isTestingTelegram ? 'Menguji Bot...' : 'Tes Koneksi Bot Telegram'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSendTelegramNow}
                        disabled={isSendingTelegramNow || !telegramBotToken || !telegramChatId}
                        className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition active:scale-95 disabled:opacity-50"
                      >
                        <Send className={`w-3.5 h-3.5 ${isSendingTelegramNow ? 'animate-spin' : ''}`} />
                        <span>{isSendingTelegramNow ? 'Mengirim Cadangan...' : 'Kirim Cadangan ke Telegram Sekarang'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ================= SECTION 2: RESTORE DATABASE ================= */}
              {backupSection === 'restore' && (
                <div className="space-y-4">
                  {restoreFeedback && (
                    <div className={`p-3 rounded-2xl border text-xs font-semibold flex items-center justify-between gap-2 animate-in fade-in ${
                      restoreFeedback.success
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border-rose-200'
                    }`}>
                      <div className="flex items-center gap-2">
                        {restoreFeedback.success ? (
                          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        )}
                        <div>
                          <p>{restoreFeedback.message}</p>
                          {restoreFeedback.stats && (
                            <p className="text-[11px] opacity-80 mt-0.5">
                              Hasil: {restoreFeedback.stats.totalInvoices} invoice & {restoreFeedback.stats.totalCustomers} pelanggan aktif sekarang. Halaman akan menyegarkan data otomatis...
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setRestoreFeedback(null)}
                        className="text-slate-400 hover:text-slate-700 text-xs font-bold"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  {/* Upload Dropzone Card */}
                  <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-white space-y-4">
                    <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <h5 className="font-extrabold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                          <RotateCcw className="w-4 h-4 text-emerald-600" />
                          Pemulihan (Restore) Database dari File Cadangan
                        </h5>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Unggah file cadangan JSON yang sebelumnya diunduh dari sistem atau diterima via Telegram untuk memulihkan seluruh data.
                        </p>
                      </div>
                    </div>

                    <input
                      type="file"
                      ref={restoreFileInputRef}
                      onChange={handleFileSelect}
                      accept=".json,application/json"
                      className="hidden"
                    />

                    {!restorePreview ? (
                      <div
                        onClick={() => restoreFileInputRef.current?.click()}
                        className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-6 text-center cursor-pointer bg-slate-50/60 hover:bg-emerald-50/30 transition group"
                      >
                        <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                          <FileUp className="w-6 h-6" />
                        </div>
                        <p className="text-xs font-bold text-slate-800">
                          {isValidatingRestore ? 'Membaca & Memvalidasi File...' : 'Klik atau Tarik File Cadangan (.json) ke Sini'}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Mendukung file cadangan database InvoiceKilat resmi (format .json)
                        </p>
                      </div>
                    ) : (
                      /* Preview Box */
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span className="font-extrabold text-emerald-950 text-xs">
                              File Cadangan Sah & Terverifikasi
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setRestorePreview(null);
                              setRestorePayload(null);
                            }}
                            className="text-[11px] text-rose-600 hover:text-rose-800 font-bold underline"
                          >
                            Ganti Berkas
                          </button>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                          <div className="bg-white rounded-xl p-2.5 border border-emerald-100 shadow-2xs">
                            <span className="text-[10px] text-slate-400 block">Aplikasi / Brand:</span>
                            <span className="font-bold text-slate-900 truncate block">
                              {restorePreview.appName}
                            </span>
                            <span className="text-[10px] text-slate-500 block truncate">
                              {restorePreview.businessName}
                            </span>
                          </div>
                          <div className="bg-white rounded-xl p-2.5 border border-emerald-100 shadow-2xs">
                            <span className="text-[10px] text-slate-400 block">Jumlah Tagihan:</span>
                            <span className="font-extrabold text-blue-700 text-sm block">
                              {restorePreview.invoicesCount} Tagihan
                            </span>
                            <span className="text-[10px] text-emerald-600 block">
                              {restorePreview.paidInvoicesCount} Lunas
                            </span>
                          </div>
                          <div className="bg-white rounded-xl p-2.5 border border-emerald-100 shadow-2xs">
                            <span className="text-[10px] text-slate-400 block">Pelanggan & Jasa:</span>
                            <span className="font-bold text-slate-900 block">
                              {restorePreview.customersCount} Pelanggan
                            </span>
                            <span className="text-[10px] text-slate-500 block">
                              {restorePreview.servicesCount} Layanan Jasa
                            </span>
                          </div>
                          <div className="bg-white rounded-xl p-2.5 border border-emerald-100 shadow-2xs">
                            <span className="text-[10px] text-slate-400 block">Total Nominal:</span>
                            <span className="font-extrabold text-emerald-700 text-sm block truncate">
                              Rp {Number(restorePreview.totalAmount || 0).toLocaleString('id-ID')}
                            </span>
                            <span className="text-[10px] text-slate-400 block truncate">
                              Ekspor: {restorePreview.exportedAt ? new Date(restorePreview.exportedAt).toLocaleDateString('id-ID') : '-'}
                            </span>
                          </div>
                        </div>

                        {/* Mode Selection */}
                        <div className="pt-2 border-t border-emerald-200/60 space-y-2">
                          <label className="font-bold text-slate-800 text-xs block">
                            Pilih Metode Pemulihan Data:
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <label
                              className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-2.5 ${
                                restoreMode === 'replace'
                                  ? 'bg-white border-emerald-500 ring-2 ring-emerald-500/20 text-slate-900'
                                  : 'bg-white/60 border-slate-200 text-slate-700'
                              }`}
                            >
                              <input
                                type="radio"
                                name="restoreMode"
                                value="replace"
                                checked={restoreMode === 'replace'}
                                onChange={() => setRestoreMode('replace')}
                                className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                              />
                              <div>
                                <span className="font-extrabold text-xs block text-slate-900">
                                  Ganti Total (Replace All)
                                </span>
                                <span className="text-[10px] text-slate-500 block mt-0.5 leading-snug">
                                  Menggantikan data invoice, pelanggan, dan jasa saat ini secara penuh dengan data file cadangan ini. Snapshot keamanan dibuat otomatis sebelum ditimpa.
                                </span>
                              </div>
                            </label>

                            <label
                              className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-2.5 ${
                                restoreMode === 'merge'
                                  ? 'bg-white border-blue-500 ring-2 ring-blue-500/20 text-slate-900'
                                  : 'bg-white/60 border-slate-200 text-slate-700'
                              }`}
                            >
                              <input
                                type="radio"
                                name="restoreMode"
                                value="merge"
                                checked={restoreMode === 'merge'}
                                onChange={() => setRestoreMode('merge')}
                                className="mt-0.5 text-blue-600 focus:ring-blue-500"
                              />
                              <div>
                                <span className="font-extrabold text-xs block text-slate-900">
                                  Gabungkan Data (Merge)
                                </span>
                                <span className="text-[10px] text-slate-500 block mt-0.5 leading-snug">
                                  Menambahkan invoice dan pelanggan baru tanpa menghapus catatan yang sudah ada di sistem saat ini.
                                </span>
                              </div>
                            </label>
                          </div>

                          <div className="mt-2 flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="restoreSettingsCheck"
                              checked={restoreIncludeSettings}
                              onChange={(e) => setRestoreIncludeSettings(e.target.checked)}
                              className="rounded text-emerald-600 focus:ring-emerald-500"
                            />
                            <label htmlFor="restoreSettingsCheck" className="text-xs font-semibold text-slate-700 cursor-pointer">
                              Perbarui juga Profil Perusahaan & Pengaturan dari Berkas Cadangan Ini
                            </label>
                          </div>
                        </div>

                        {/* Execute Button */}
                        <div className="pt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => setShowConfirmRestoreModal(true)}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 transition active:scale-95"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Mulai Pulihkan Database</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ================= SECTION 3: OFFLINE BACKUP DOWNLOAD ================= */}
              {backupSection === 'offline' && (
                <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-white space-y-4">
                  <div className="border-b border-slate-100 pb-3">
                    <h5 className="font-extrabold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                      <Download className="w-4 h-4 text-indigo-600" />
                      Unduh Cadangan Database Perusahaan (Offline Backup)
                    </h5>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Simpan salinan cadangan langsung ke komputer atau perangkat Anda dalam format JSON utuh maupun format tabel Excel/CSV.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-4 rounded-2xl border border-blue-100 bg-blue-50/50 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center mb-2 shadow-2xs">
                          <Database className="w-4 h-4" />
                        </div>
                        <h6 className="font-bold text-slate-900 text-xs">File Database Lengkap (.JSON)</h6>
                        <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                          Format cadangan utama sistem yang dapat dipulihkan kapan saja melalui fitur Restore di aplikasi ini.
                        </p>
                      </div>
                      <a
                        href="/api/backup/download"
                        download
                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-2xs"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Unduh File .JSON</span>
                      </a>
                    </div>

                    <div className="p-4 rounded-2xl border border-emerald-100 bg-emerald-50/50 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center mb-2 shadow-2xs">
                          <FileSpreadsheet className="w-4 h-4" />
                        </div>
                        <h6 className="font-bold text-slate-900 text-xs">Master Backup Lengkap (.CSV)</h6>
                        <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                          Seluruh data profil perusahaan, invoice, pelanggan, jasa, dan mutasi transaksi dalam format CSV untuk Excel.
                        </p>
                      </div>
                      <a
                        href="/api/spreadsheet/export-full"
                        download
                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-2xs"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        <span>Unduh CSV Lengkap</span>
                      </a>
                    </div>

                    <div className="p-4 rounded-2xl border border-indigo-100 bg-indigo-50/50 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center mb-2 shadow-2xs">
                          <TableProperties className="w-4 h-4" />
                        </div>
                        <h6 className="font-bold text-slate-900 text-xs">Tabel Daftar Invoice (.CSV)</h6>
                        <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                          Tabel ringkas daftar tagihan invoice, status bayar, jatuh tempo, dan nominal untuk pembukuan akuntansi.
                        </p>
                      </div>
                      <a
                        href="/api/spreadsheet/export"
                        download
                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-2xs"
                      >
                        <TableProperties className="w-3.5 h-3.5" />
                        <span>Unduh CSV Invoice</span>
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* ================= SECTION 4: GOOGLE SPREADSHEET ================= */}
              {backupSection === 'sheets' && (
                <div className="space-y-4">
                  {/* Header Status Banner */}
                  <div className="rounded-2xl bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 p-4 sm:p-5 text-white shadow-md">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 border border-teal-400/20">
                            <Radio className="w-3 h-3 text-teal-400 animate-pulse" />
                            Pusat Sinkronisasi Spreadsheet
                          </span>
                          <span className="text-[10px] text-teal-200">
                            {googleSheetId || settings?.googleSheetId ? 'Terhubung' : 'Siap Dikonfigurasi'}
                          </span>
                        </div>
                        <h4 className="font-extrabold text-white text-sm sm:text-base">
                          Sinkronisasi Lengkap ke Google Spreadsheet
                        </h4>
                        <p className="text-teal-100/80 text-[11px] mt-0.5 max-w-xl leading-relaxed">
                          Otomatis simpan nama aplikasi (<strong>{appName}</strong>), profil perusahaan (<strong>{businessName || 'Perusahaan'}</strong>), katalog jasa, pelanggan, invoice, dan transaksi.
                        </p>
                      </div>

                      {/* Sync Trigger Button */}
                      <div className="shrink-0 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            setIsLocalSyncing(true);
                            setSyncSuccessMsg(null);
                            try {
                              if (onTriggerSync) {
                                await onTriggerSync();
                              } else {
                                await fetch('/api/spreadsheet/sync-webhook', { method: 'POST' });
                              }
                              setSyncSuccessMsg('Data perusahaan berhasil disinkronkan ke Google Spreadsheet!');
                              setTimeout(() => setSyncSuccessMsg(null), 4000);
                            } catch (e: any) {
                              console.error(e);
                            } finally {
                              setIsLocalSyncing(false);
                            }
                          }}
                          disabled={isSyncing || isLocalSyncing}
                          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-md shadow-teal-500/20 transition active:scale-95 disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing || isLocalSyncing ? 'animate-spin' : ''}`} />
                          <span>{isSyncing || isLocalSyncing ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Status metrics */}
                    <div className="mt-4 pt-3 border-t border-teal-700/50 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                      <div className="bg-teal-950/40 rounded-xl p-2 border border-teal-700/30">
                        <span className="text-[10px] text-teal-300 block">Terakhir Disinkronkan:</span>
                        <span className="font-semibold text-white text-[11px] truncate block">
                          {settings?.lastSpreadsheetSync ? formatDateTimeIndo(settings.lastSpreadsheetSync) : 'Belum sinkron'}
                        </span>
                      </div>
                      <div className="bg-teal-950/40 rounded-xl p-2 border border-teal-700/30">
                        <span className="text-[10px] text-teal-300 block">Status Data Invoice:</span>
                        <span className="font-semibold text-white text-[11px] truncate block">
                          {invoices.length > 0
                            ? `${invoices.filter(i => i.spreadsheetSynced).length} / ${invoices.length} Tersinkron`
                            : 'Database Siap'}
                        </span>
                      </div>
                      <div className="bg-teal-950/40 rounded-xl p-2 border border-teal-700/30 col-span-2 sm:col-span-1">
                        <span className="text-[10px] text-teal-300 block">Integrasi Webhook:</span>
                        <span className="font-semibold text-white text-[11px] truncate block">
                          {googleSheetWebhookUrl ? 'Webhook Aktif' : 'Belum Diatur'}
                        </span>
                      </div>
                    </div>

                    {syncSuccessMsg && (
                      <div className="mt-3 p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>{syncSuccessMsg}</span>
                      </div>
                    )}
                  </div>

                  {/* 2. Konfigurasi Spreadsheet & Webhook */}
                  <div className="rounded-2xl border border-slate-200 p-4 bg-white space-y-3.5">
                <h5 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <TableProperties className="w-4 h-4 text-teal-600" />
                  <span>Konfigurasi Tautan Google Spreadsheet</span>
                </h5>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-slate-700 text-xs">
                        Google Spreadsheet ID atau Link URL
                      </label>
                      {googleSheetId && (
                        <a
                          href={`https://docs.google.com/spreadsheets/d/${googleSheetId}/edit`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-teal-700 hover:text-teal-800 font-bold flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Buka Spreadsheet</span>
                        </a>
                      )}
                    </div>
                    <input
                      type="text"
                      value={googleSheetId}
                      onChange={(e) => {
                        const val = e.target.value;
                        const match = val.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
                        if (match && match[1]) {
                          setGoogleSheetId(match[1]);
                        } else {
                          setGoogleSheetId(val.trim());
                        }
                      }}
                      placeholder="Tempelkan ID atau Link URL Google Spreadsheet Anda..."
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Bisa langsung tempel link lengkap (URL) atau ID Google Sheet (contoh: 1BxiMVs0XRA5nFMdKvBdBZj...).
                    </p>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1 text-xs">
                      Nama Lembar / Tab Utama di Spreadsheet
                    </label>
                    <input
                      type="text"
                      value={googleSheetName}
                      onChange={(e) => setGoogleSheetName(e.target.value)}
                      placeholder="InvoiceKilat_Master_Backup"
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 font-semibold"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Nama sheet tempat data transaksi disimpan (otomatis dibuat jika belum ada).
                    </p>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="font-bold text-slate-700 block mb-1 text-xs">
                      Google Apps Script Webhook URL (Sinkronisasi Otomatis Real-Time)
                    </label>
                    <input
                      type="url"
                      value={googleSheetWebhookUrl}
                      onChange={(e) => setGoogleSheetWebhookUrl(e.target.value.trim())}
                      placeholder="https://script.google.com/macros/s/.../exec"
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      URL Web App hasil deploy Apps Script di Google Sheets Anda.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800 block text-xs">Otomatis Backup Setiap Transaksi Baru & Lunas</span>
                    <p className="text-[11px] text-slate-500">
                      Sistem akan langsung mengirim data ke Google Sheets setiap kali invoice diterbitkan atau statusnya berubah lunas.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoBackupToSheets}
                    onChange={(e) => setAutoBackupToSheets(e.target.checked)}
                    className="w-5 h-5 text-teal-600 rounded-md focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* 3. Generator & Panduan Google Apps Script */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <button
                  type="button"
                  onClick={() => setShowScriptGuide(!showScriptGuide)}
                  className="w-full flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-2">
                    <Code className="w-4 h-4 text-teal-600" />
                    <div>
                      <span className="font-bold text-slate-900 text-xs block">
                        Panduan Integrasi & Script Google Apps Script
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {showScriptGuide ? 'Klik untuk menyembunyikan panduan' : 'Klik untuk melihat kode script dan 4 langkah cara integrasi'}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-teal-700 px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-100">
                    {showScriptGuide ? 'Tutup Panduan' : 'Lihat Script & Panduan'}
                  </span>
                </button>

                {showScriptGuide && (
                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-4 animate-in fade-in">
                    {/* Langkah-langkah */}
                    <div className="space-y-2 text-xs">
                      <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50">
                        <span className="w-5 h-5 rounded-full bg-teal-700 text-white font-black text-[11px] flex items-center justify-center shrink-0">1</span>
                        <div>
                          <strong className="text-slate-800">Buka Google Sheets:</strong> Buat lembar kerja baru di akun Google Anda, lalu salin ID spreadsheet dari URL ke kolom ID di atas.
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50">
                        <span className="w-5 h-5 rounded-full bg-teal-700 text-white font-black text-[11px] flex items-center justify-center shrink-0">2</span>
                        <div>
                          <strong className="text-slate-800">Buka Apps Script:</strong> Di Google Sheets, klik menu <strong>Ekstensi (Extensions)</strong> &gt; <strong>Apps Script</strong>.
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50">
                        <span className="w-5 h-5 rounded-full bg-teal-700 text-white font-black text-[11px] flex items-center justify-center shrink-0">3</span>
                        <div>
                          <strong className="text-slate-800">Tempel Kode:</strong> Hapus kode lama di file Code.gs, lalu tempel kode di bawah ini dan simpan (Ctrl+S).
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50">
                        <span className="w-5 h-5 rounded-full bg-teal-700 text-white font-black text-[11px] flex items-center justify-center shrink-0">4</span>
                        <div>
                          <strong className="text-slate-800">Deploy sebagai Web App:</strong> Klik <strong>Deploy</strong> &gt; <strong>New Deployment</strong> &gt; Pilih Jenis <strong>Web App</strong>. Set "Execute as: Me" dan "Who has access: Anyone". Salin URL Web App dan tempel ke kolom Webhook di atas.
                        </div>
                      </div>
                    </div>

                    {/* Kode Apps Script */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-bold text-slate-700">Kode Google Apps Script Siap Pakai:</span>
                        <button
                          type="button"
                          onClick={() => {
                            const script = `// Google Apps Script untuk ${appName} (${businessName || 'Perusahaan'})
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Tab Master Invoices
    var sheetName = "${googleSheetName || 'Master_Invoices'}";
    var sheetInvoices = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
    if (sheetInvoices.getLastRow() === 0) {
      sheetInvoices.appendRow(["No Invoice", "Tanggal", "Jatuh Tempo", "Pelanggan", "WhatsApp", "Total Tagihan (Rp)", "Dibayar (Rp)", "Status", "Metode Bayar", "Waktu Sinkron"]);
      sheetInvoices.getRange(1, 1, 1, 10).setFontWeight("bold").setBackground("#e2e8f0");
    }
    
    if (data.invoices && Array.isArray(data.invoices)) {
      data.invoices.forEach(function(inv) {
        sheetInvoices.appendRow([
          inv.invoiceNumber,
          inv.date,
          inv.dueDate,
          inv.customer ? inv.customer.name : "",
          inv.customer ? inv.customer.phone : "",
          inv.totalAmount,
          inv.paidAmount || 0,
          inv.status,
          inv.transactions && inv.transactions.length > 0 ? inv.transactions[inv.transactions.length - 1].paymentMethod : "QRIS_DINAMIS",
          new Date().toISOString()
        ]);
      });
    }

    // Tab Master Pelanggan
    if (data.customers && Array.isArray(data.customers)) {
      var sheetCust = ss.getSheetByName("Pelanggan") || ss.insertSheet("Pelanggan");
      if (sheetCust.getLastRow() === 0) {
        sheetCust.appendRow(["ID", "Nama", "Perusahaan", "WhatsApp", "Email", "Alamat"]);
        sheetCust.getRange(1, 1, 1, 6).setFontWeight("bold").setBackground("#e2e8f0");
      }
      data.customers.forEach(function(c) {
        sheetCust.appendRow([c.id, c.name, c.company || "", c.phone || "", c.email || "", c.address || ""]);
      });
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success", count: data.invoices ? data.invoices.length : 0 }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;
                            navigator.clipboard.writeText(script);
                            setCopiedScript(true);
                            setTimeout(() => setCopiedScript(false), 2000);
                          }}
                          className="flex items-center gap-1 text-[11px] font-bold text-teal-700 hover:text-teal-800 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200 transition"
                        >
                          {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedScript ? 'Tersalin!' : 'Salin Kode Script'}</span>
                        </button>
                      </div>

                      <pre className="p-3 bg-slate-900 text-slate-200 rounded-xl text-[10px] font-mono overflow-x-auto max-h-48 border border-slate-800 leading-relaxed scrollbar-thin">
{`// Google Apps Script untuk ${appName} (${businessName || 'Perusahaan'})
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    var sheetName = "${googleSheetName || 'Master_Invoices'}";
    var sheetInvoices = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
    if (sheetInvoices.getLastRow() === 0) {
      sheetInvoices.appendRow(["No Invoice", "Tanggal", "Jatuh Tempo", "Pelanggan", "WhatsApp", "Total Tagihan (Rp)", "Dibayar (Rp)", "Status", "Metode Bayar", "Waktu Sinkron"]);
      sheetInvoices.getRange(1, 1, 1, 10).setFontWeight("bold").setBackground("#e2e8f0");
    }
    
    if (data.invoices && Array.isArray(data.invoices)) {
      data.invoices.forEach(function(inv) {
        sheetInvoices.appendRow([
          inv.invoiceNumber, inv.date, inv.dueDate,
          inv.customer ? inv.customer.name : "",
          inv.customer ? inv.customer.phone : "",
          inv.totalAmount, inv.paidAmount || 0,
          inv.status,
          inv.transactions && inv.transactions.length > 0 ? inv.transactions[inv.transactions.length - 1].paymentMethod : "QRIS_DINAMIS",
          new Date().toISOString()
        ]);
      });
    }

    if (data.customers && Array.isArray(data.customers)) {
      var sheetCust = ss.getSheetByName("Pelanggan") || ss.insertSheet("Pelanggan");
      if (sheetCust.getLastRow() === 0) {
        sheetCust.appendRow(["ID", "Nama", "Perusahaan", "WhatsApp", "Email", "Alamat"]);
        sheetCust.getRange(1, 1, 1, 6).setFontWeight("bold").setBackground("#e2e8f0");
      }
      data.customers.forEach(function(c) {
        sheetCust.appendRow([c.id, c.name, c.company || "", c.phone || "", c.email || "", c.address || ""]);
      });
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}`}
                      </pre>
                    </div>

                    {/* Server Webhook URL */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold text-slate-700">Endpoint Webhook Server Invoice:</span>
                        <button
                          type="button"
                          onClick={() => {
                            try {
                              if (navigator?.clipboard?.writeText) {
                                navigator.clipboard.writeText(`${window.location.origin}/api/spreadsheet/sync-webhook`).catch(() => {});
                              }
                              setCopiedWebhook(true);
                              setTimeout(() => setCopiedWebhook(false), 2000);
                            } catch {
                              // safe fallback
                            }
                          }}
                          className="text-[10px] text-teal-700 font-bold hover:underline flex items-center gap-1"
                        >
                          {copiedWebhook ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedWebhook ? 'Tersalin' : 'Salin URL'}</span>
                        </button>
                      </div>
                      <code className="text-[10px] font-mono text-slate-600 break-all block">
                        {`${typeof window !== 'undefined' ? window.location.origin : ''}/api/spreadsheet/sync-webhook`}
                      </code>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
            </div>
          )}

          {/* TAB 6: NOTIFIKASI & WHATSAPP OTOMATIS */}
          {activeTab === 'notification' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* WhatsApp Section */}
              <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100 flex items-start gap-3">
                <MessageSquare className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-emerald-950 text-xs sm:text-sm">Format Pesan Notifikasi WhatsApp & Tanda Terima</h4>
                  <p className="text-slate-600 text-[11px] mt-0.5 leading-relaxed">
                    Pesan ini dikirimkan otomatis atau via tautan WhatsApp ke pelanggan saat invoice dibuat atau pembayaran lunas terverifikasi.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-bold text-slate-800 block text-xs">
                      Kirim Tanda Terima Pembayaran Otomatis
                    </label>
                    <span className="text-[11px] text-slate-500">
                      Aktifkan tombol cepat dan notifikasi otomatis ke WhatsApp pelanggan
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={whatsappNotificationEnabled}
                    onChange={(e) => setWhatsappNotificationEnabled(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Template Teks Pesan WhatsApp Lunas:
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    <span className="text-[10px] text-slate-500 self-center">Variabel siap pakai:</span>
                    {['{{customer_name}}', '{{invoice_number}}', '{{amount}}', '{{invoice_url}}', '{{business_name}}'].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setWhatsappTemplate((prev) => prev + ' ' + tag)}
                        className="px-2 py-0.5 text-[10px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md hover:bg-emerald-100 transition"
                        title="Klik untuk menyisipkan ke template"
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>
                  <textarea
                    rows={4}
                    value={whatsappTemplate}
                    onChange={(e) => setWhatsappTemplate(e.target.value)}
                    placeholder="Halo *{{customer_name}}*, terima kasih! Pembayaran invoice *{{invoice_number}}* sebesar *Rp {{amount}}* telah berhasil..."
                    className="w-full p-3 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-emerald-500 font-sans leading-relaxed"
                  />
                </div>

                {/* WhatsApp Message Preview Bubble */}
                <div className="p-3.5 rounded-xl bg-slate-100/80 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                    Simulasi Tampilan di WhatsApp Pelanggan:
                  </span>
                  <div className="max-w-md bg-[#dcf8c6] p-3 rounded-2xl rounded-tr-none shadow-xs text-xs text-slate-900 border border-[#c4e8aa] relative leading-relaxed whitespace-pre-wrap">
                    {whatsappTemplate
                      ? whatsappTemplate
                          .replace(/\{\{customer_name\}\}/g, 'Andi Pratama')
                          .replace(/\{\{invoice_number\}\}/g, 'INV-2026-001')
                          .replace(/\{\{amount\}\}/g, '1.500.000')
                          .replace(/\{\{invoice_url\}\}/g, `${typeof window !== 'undefined' ? window.location.origin : ''}/#/portal?inv=INV-2026-001`)
                          .replace(/\{\{business_name\}\}/g, businessName || 'PT Cipta Media Nusantara')
                      : 'Format pesan belum diatur.'}
                    <div className="text-[9px] text-slate-500 text-right mt-1.5 flex items-center justify-end gap-1 font-sans">
                      <span>10:45</span>
                      <span className="text-blue-500 font-bold">✓✓</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Email Notifications Section */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-blue-600" />
                    <h5 className="font-bold text-slate-800 text-xs">
                      Pengaturan Pengingat Email & Jatuh Tempo (Auto Reminder)
                    </h5>
                  </div>
                  <input
                    type="checkbox"
                    checked={emailNotificationEnabled}
                    onChange={(e) => setEmailNotificationEnabled(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-600 block mb-1">Nama Pengirim Email (Sender Name)</label>
                    <input
                      type="text"
                      value={emailSenderName}
                      onChange={(e) => setEmailSenderName(e.target.value)}
                      placeholder="Finance Cipta Media"
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-600 block mb-1">Alamat Email Pengirim (Sender Address)</label>
                    <input
                      type="text"
                      value={emailSenderAddress}
                      onChange={(e) => setEmailSenderAddress(e.target.value)}
                      placeholder="billing@ciptamedia.id"
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white font-mono"
                    />
                  </div>
                </div>

                {/* Pre-due reminder */}
                <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-950 text-xs flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5 text-blue-600" />
                      Pengingat Menjelang Jatuh Tempo (Pre-due Reminder)
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-600">H-</span>
                      <input
                        type="number"
                        min={1}
                        max={14}
                        value={preDueDays}
                        onChange={(e) => setPreDueDays(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-12 px-1.5 py-0.5 text-center text-xs rounded-lg border border-slate-300 font-bold bg-white"
                      />
                      <span className="text-[11px] text-slate-600">Hari</span>
                      <input
                        type="checkbox"
                        checked={autoSendPreDueEmail}
                        onChange={(e) => setAutoSendPreDueEmail(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded ml-2"
                      />
                    </div>
                  </div>
                  <textarea
                    rows={2}
                    value={preDueEmailTemplate}
                    onChange={(e) => setPreDueEmailTemplate(e.target.value)}
                    placeholder="Pengingat Pembayaran: Tagihan invoice {{invoice_number}} senilai Rp {{amount}} akan jatuh tempo pada {{due_date}}..."
                    className="w-full p-2.5 text-[11px] rounded-xl border border-slate-200 bg-white"
                  />
                </div>

                {/* Overdue reminder */}
                <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-950 text-xs flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      Pengingat Melewati Jatuh Tempo (Overdue Alert)
                    </span>
                    <input
                      type="checkbox"
                      checked={autoSendOverdueEmail}
                      onChange={(e) => setAutoSendOverdueEmail(e.target.checked)}
                      className="w-4 h-4 text-amber-600 rounded"
                    />
                  </div>
                  <textarea
                    rows={2}
                    value={overdueEmailTemplate}
                    onChange={(e) => setOverdueEmailTemplate(e.target.value)}
                    placeholder="Pemberitahuan: Tagihan invoice {{invoice_number}} senilai Rp {{amount}} telah melewati tanggal jatuh tempo ({{due_date}})..."
                    className="w-full p-2.5 text-[11px] rounded-xl border border-slate-200 bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 shrink-0">
            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
              {confirmReset ? (
                <div className="flex items-center gap-1.5 p-1.5 bg-rose-50 border border-rose-200 rounded-xl animate-in fade-in">
                  <span className="text-[11px] font-bold text-rose-700 px-1">Yakin reset ke data bawaan?</span>
                  <button
                    type="button"
                    onClick={handleResetToDefaults}
                    disabled={isResetting}
                    className="px-2.5 py-1 text-[11px] font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition"
                  >
                    {isResetting ? 'Mereset...' : 'Ya, Reset'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmReset(false)}
                    className="px-2 py-1 text-[11px] text-slate-600 hover:text-slate-800 rounded-lg"
                  >
                    Batal
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  disabled={isSaving || isResetting}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition border border-rose-200"
                  title="Kembalikan semua pengaturan sistem ke data default bawaan"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
                  <span>Reset ke Standar Bawaan</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              >
                Tutup
              </button>
              <button
                id="save-settings-btn"
                type="submit"
                disabled={isSaving || isResetting}
                className="flex items-center gap-1.5 px-6 py-2.5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition active:scale-95 disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Menyimpan...' : 'Simpan Semua Pengaturan'}</span>
              </button>
            </div>
          </div>

          {/* Modal Konfirmasi Pemulihan (Restore) Database */}
          {showConfirmRestoreModal && restorePreview && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
              <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-sm sm:text-base">
                      Konfirmasi Pemulihan Database
                    </h4>
                    <p className="text-xs text-slate-500">
                      Periksa kembali ringkasan berkas sebelum dipulihkan.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Metode Pemulihan:</span>
                    <span className="font-bold text-slate-900 uppercase">
                      {restoreMode === 'replace' ? 'Ganti Total (Replace All)' : 'Gabungkan (Merge)'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Jumlah Tagihan di File:</span>
                    <span className="font-bold text-blue-700">{restorePreview.invoicesCount} Invoice</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Jumlah Pelanggan:</span>
                    <span className="font-bold text-slate-900">{restorePreview.customersCount} Pelanggan</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Pengaturan Profil:</span>
                    <span className="font-bold text-slate-900">
                      {restoreIncludeSettings ? 'Ikut Diperbarui' : 'Pertahankan yang Ada'}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-900 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    Keamanan Data Terjamin
                  </p>
                  <p className="text-slate-600 leading-relaxed">
                    Sistem otomatis membuat file salinan pengaman (snapshot) database saat ini sebelum proses pemulihan dieksekusi.
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowConfirmRestoreModal(false)}
                    disabled={isRestoring}
                    className="px-4 py-2.5 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteRestore}
                    disabled={isRestoring}
                    className="flex items-center gap-2 px-5 py-2.5 text-xs font-extrabold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/30 transition active:scale-95 disabled:opacity-50"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${isRestoring ? 'animate-spin' : ''}`} />
                    <span>{isRestoring ? 'Memulihkan Data...' : 'Ya, Pulihkan Sekarang'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
