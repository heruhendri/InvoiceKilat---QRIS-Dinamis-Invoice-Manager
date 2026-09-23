export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  price: number;
  total: number;
}

export type CustomerMode = 'biasa' | 'noc';

export interface PppoeActiveUser {
  id?: string;
  name: string;
  service?: string;
  callerId?: string;
  address?: string;
  uptime?: string;
  profile?: string;
  comment?: string;
  isIsolir: boolean;
  rateLimit?: string;
}

export interface PppoeSecretRecord {
  id?: string;
  name: string;
  password?: string;
  service?: string;
  profile: string;
  comment?: string;
  disabled?: boolean;
  remoteAddress?: string;
  lastLoggedOut?: string;
  callerId?: string;
  isIsolir?: boolean;
  isOnline?: boolean;
  activeIp?: string;
  uptime?: string;
}

export interface HotspotActiveRecord {
  id?: string;
  user: string;
  address: string;
  macAddress?: string;
  uptime?: string;
  bytesIn?: number;
  bytesOut?: number;
  loginBy?: string;
  comment?: string;
}

export interface HotspotUserRecord {
  id?: string;
  name: string;
  password?: string;
  profile?: string;
  limitUptime?: string;
  limitBytesTotal?: string;
  disabled?: boolean;
  comment?: string;
}

export interface PppoeProfileRecord {
  id?: string;
  name: string;
  localAddress?: string;
  remoteAddress?: string;
  rateLimit?: string;
  comment?: string;
  default?: boolean;
}

export interface RouterTrafficPoint {
  time: string;
  rxMbps: number;
  txMbps: number;
}

export interface RouterTrafficSnapshot {
  interfaceName: string;
  timestamp: string;
  rxBps: number;
  txBps: number;
  rxMbps: number;
  txMbps: number;
  rxPackets: number;
  txPackets: number;
  history: RouterTrafficPoint[];
  interfaces: { name: string; type: string; running: boolean; rxMbps: number; txMbps: number }[];
}

export interface RouterInterfaceRecord {
  id?: string;
  name: string;
  type?: string;
  running?: boolean;
  disabled?: boolean;
  mtu?: string;
  rxBytes?: number;
  txBytes?: number;
  comment?: string;
}

export interface RouterLogRecord {
  id?: string;
  time?: string;
  topics?: string;
  message: string;
}

export interface RouterPingResult {
  host: string;
  sent: number;
  received: number;
  packetLoss: number;
  minRtt?: number;
  avgRtt?: number;
  maxRtt?: number;
  results: { seq: number; host: string; size: number; ttl: number; timeMs: number; status: string }[];
}

export interface MikrotikSample {
  timestamp: string;
  activeCount: number;
  nonIsolirCount: number;
  isolirCount: number;
}

export interface MikrotikConfig {
  routerName: string;
  host: string;
  port: number;
  username: string;
  password?: string;
  useSsl?: boolean;
  ratePerUser: number; // e.g. 5000 - 10000, customizable
  isolirProfileName?: string; // default 'isolir'

  connectionStatus?: 'connected' | 'disconnected' | 'error' | 'testing';
  lastSyncedAt?: string;
  totalPppoeSecrets?: number;
  totalSecretsNonIsolir?: number;
  totalSecretsIsolir?: number;
  activePppoeCount?: number;
  nonIsolirCount?: number;
  isolirCount?: number;
  systemIdentity?: string;
  rosVersion?: string;
  boardName?: string;
  uptime?: string;
  activeUsersList?: PppoeActiveUser[];
  lastErrorMessage?: string;

  // Real-time Router Hardware Specs & Resource Health (Stand-alone RouterOS Monitor)
  cpuLoad?: number;
  freeMemory?: string;
  totalMemory?: string;
  freeHdd?: string;
  totalHdd?: string;
  architectureName?: string;

  // Telemetri Sampel & Rata-rata Bulanan PPPoE
  samples?: MikrotikSample[];
  monthlyAverageNonIsolir?: number;
  preferredBillingMethod?: 'monthly_average' | 'realtime';
  connectionType?: 'api' | 'rest' | 'auto' | 'push' | 'terminal_import';
  pushSecret?: string;
  isolirKeywords?: string;
  serviceFilter?: 'all' | 'pppoe' | 'hotspot';
  realtimeSource?: 'routeros_api' | 'routeros_rest' | 'push_webhook' | 'terminal_import' | 'manual_correction';

  hotspotActiveCount?: number;
  hotspotUsersCount?: number;
}

export interface RecurringAddonService {
  id: string;
  name: string;
  category?: string;
  price: number;
  description?: string;
  unit?: string;
  enabledByDefault?: boolean;
  createdAt?: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string; // WhatsApp number
  company?: string;
  address?: string;
  notes?: string;
  customerMode?: CustomerMode;
  mikrotik?: MikrotikConfig;
  recurringEnabled?: boolean;
  includeVpn?: boolean;
  includeMonitoring?: boolean;
  recurringAddonIds?: string[];
  pppoeBillingMethod?: 'monthly_average' | 'realtime';
  monthlyAveragePppoeCount?: number;
  customMonthlyAmount?: number;
  password?: string;
  portalPin?: string;
}

export interface CustomerRecord extends Customer {
  createdAt: string;
  totalInvoices?: number;
  totalSpent?: number;
  pendingBalance?: number;
}

export interface ServiceItem {
  id: string;
  name: string;
  category?: string;
  unit: string; // e.g. "Proyek", "Bulan", "Jam", "Paket", "Pcs"
  price: number;
  description?: string;
  createdAt?: string;
}

export interface PaymentTransaction {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  paymentMethod: 'qris_dinamis' | 'dana_bisnis' | 'bank_transfer' | 'cash' | 'bca' | 'bri' | 'dana' | 'gojek' | 'other';
  referenceNumber: string;
  notes?: string;
  proofUrl?: string;
  verifiedAt: string;
  verifiedBy: string;
}

export interface ReminderLog {
  id: string;
  invoiceId: string;
  type: 'pre_due' | 'overdue' | 'payment_confirmed' | 'new_invoice' | 'due_today';
  recipientEmail?: string;
  recipientPhone?: string;
  status: 'sent' | 'pending' | 'failed';
  message: string;
  sentAt: string;
  channel?: 'whatsapp' | 'email' | 'both';
}

export interface BillingAutomationRule {
  id: string;
  name: string;
  trigger: 'on_create' | 'pre_due' | 'on_due_date' | 'overdue';
  channel: 'whatsapp' | 'email' | 'both';
  daysOffset: number; // e.g. -3 for H-3, 0 for Hari H, +1 for H+1 overdue
  enabled: boolean;
  messageTemplate: string;
  emailSubject?: string;
}

export interface AutomationDispatchLog {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  ruleType: string;
  channel: 'whatsapp' | 'email' | 'both';
  status: 'sent' | 'generated' | 'skipped';
  message: string;
  whatsappUrl?: string;
  dispatchedAt: string;
  amount: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  status: 'draft' | 'pending' | 'paid' | 'overdue' | 'partial' | 'cancelled';
  customer: Customer;
  items: InvoiceItem[];
  subtotal: number;
  taxPercent: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  notes?: string;
  paymentTerms?: string;
  
  staticQris?: string;
  dynamicQris?: string;
  dynamicQrisDataUrl?: string;

  transactions: PaymentTransaction[];
  reminders: ReminderLog[];
  whatsappNotified: boolean;
  spreadsheetSynced: boolean;
  
  createdAt: string;
  updatedAt: string;
}

export interface BusinessSettings {
  // Profil Aplikasi & Identitas Brand
  appName?: string;
  appLogoUrl?: string;
  appTagline?: string;

  // Profil Perusahaan / Usaha
  businessName: string;
  companyLogoUrl?: string;
  businessTagline?: string;
  businessOwner: string;
  businessPhone: string;
  businessEmail: string;
  businessAddress: string;
  businessWebsite?: string;
  businessTaxId?: string; // NPWP / NIB
  businessLogoUrl: string;

  // Informasi Rekening Pembayaran
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountHolder?: string;

  // Akun Pembayaran Khusus (BCA, BRI, DANA, Gojek)
  bcaAccountNumber?: string;
  bcaAccountHolder?: string;
  briAccountNumber?: string;
  briAccountHolder?: string;
  danaNumber?: string;
  danaAccountHolder?: string;
  gojekNumber?: string;
  gojekAccountHolder?: string;

  // Watermark Footer Invoice & Aplikasi
  watermarkText?: string;
  showAppWatermark?: boolean;
  appWatermarkPosition?: 'bottom-bar' | 'floating' | 'subtle-background';

  // Pengaturan Otomasi Tagihan Bulanan (Recurring Invoicing)
  recurringBilling?: {
    enabled: boolean;
    generateDay: number; // e.g. 1 (awal bulan), 5, 10, 20
    dateOption?: 'system' | 'custom';
    customIssueDay?: number;
    dueDateOption: 'system' | 'custom';
    dueDaysOffset: number; // e.g. 10 (Jatuh tempo tgl 10 atau +7 hari)
    customDueDay?: number;
    includeVpn: boolean;
    includeMonitoring: boolean;
    defaultVpnPrice?: number;
    defaultMonitoringPrice?: number;
    lastGeneratedMonth?: string; // e.g. '2026-09'
  };

  // Tanda Tangan & Cap Stempel Digital untuk PDF Invoice
  signatureImageUrl?: string;
  stampImageUrl?: string;
  signatoryName?: string;
  signatoryTitle?: string;

  // Template Default Invoice
  defaultInvoiceTemplate?: 'corporate' | 'minimalist' | 'creative' | 'formal' | 'pos';

  // QRIS Pembayaran
  defaultStaticQris: string;
  qrisMerchantName: string;
  qrisMerchantCity: string;
  qrisUploadedImageUrl?: string;

  // Google Sheets & Backup
  googleSheetId?: string;
  googleSheetName?: string;
  googleSheetWebhookUrl: string;
  lastSpreadsheetSync?: string;
  autoBackupToSheets?: boolean;

  whatsappNotificationEnabled: boolean;
  whatsappTemplate: string;

  emailNotificationEnabled: boolean;
  emailSenderName: string;
  emailSenderAddress: string;
  autoSendPreDueEmail: boolean;
  preDueDays: number;
  autoSendOverdueEmail: boolean;
  overdueEmailTemplate: string;
  preDueEmailTemplate: string;

  // Telegram Backup Harian & Notifikasi
  telegramBotToken?: string;
  telegramChatId?: string;
  telegramDailyBackupEnabled?: boolean;
  telegramDailyBackupTime?: string; // e.g. "00:00" atau "23:00"
  telegramIncludeFormat?: 'document_json' | 'summary_text' | 'both';
  lastTelegramBackupAt?: string;
  lastTelegramBackupStatus?: 'success' | 'failed' | 'idle';
  lastTelegramBackupMessage?: string;
}

export interface RealtimeEvent {
  type: 'payment_received' | 'invoice_created' | 'invoice_updated' | 'invoice_status_changed' | 'spreadsheet_synced' | 'reminder_dispatched' | 'connected' | 'automation_executed' | 'customer_updated' | 'service_updated' | 'telegram_backup_sent' | 'backup_restored';
  invoiceId?: string;
  invoiceNumber?: string;
  amount?: number;
  message: string;
  timestamp: string;
  payload?: any;
}

export interface AnalyticsSummary {
  summary: {
    totalRevenueAllTime: number;
    totalRevenueThisMonth: number;
    totalRevenueToday: number;
    totalOutstanding: number;
    totalOverdueAmount: number;
    invoiceCounts: {
      total: number;
      paid: number;
      pending: number;
      overdue: number;
      partial: number;
    };
    collectionRate: number;
  };
  dailyChartData: { day: string; revenue: number }[];
  monthlyChartData: { label: string; revenue: number; invoiceCount: number }[];
  recentTransactions: (PaymentTransaction & { customerName: string })[];
}

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  name: string;
  role: 'superadmin' | 'finance' | 'staff';
  avatarUrl?: string;
  createdAt?: string;
  lastLoginAt?: string;
}
