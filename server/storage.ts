import fs from 'fs';
import path from 'path';
import { 
  Invoice, 
  BusinessSettings, 
  ReminderLog, 
  PaymentTransaction, 
  CustomerRecord, 
  ServiceItem, 
  BillingAutomationRule, 
  AutomationDispatchLog,
  AdminUser,
  RecurringAddonService
} from './types';
import { convertToDynamicQris, generateQrDataUrl } from './qris';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Default Real-World Dana Bisnis Static QRIS Template (Standard Bank Indonesia EMVCo TLV)
export const DEFAULT_DANA_STATIC_QRIS = 
  '00020101021126570011ID.DANA.WWW011893600915356761342102095676134210303UMI51440014ID.CO.QRIS.WWW0215ID10233067778720303UMI5204737253033605802ID5911hendr.store6013Kab. Pemalang6105523716304F609';

export interface DatabaseSchema {
  settings: BusinessSettings;
  invoices: Invoice[];
  customers: CustomerRecord[];
  services: ServiceItem[];
  recurringAddons?: RecurringAddonService[];
  automationRules: BillingAutomationRule[];
  automationLogs: AutomationDispatchLog[];
  remindersLog: ReminderLog[];
  adminUsers?: AdminUser[];
}

export const DEFAULT_ADMIN_USERS: AdminUser[] = [
  {
    id: 'admin-1',
    username: 'admin',
    email: 'admin@ciptamedia.id',
    name: 'Budi Santoso',
    role: 'superadmin',
    password: 'admin123',
    avatarUrl: '',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'admin-2',
    username: 'heruu2004',
    email: 'heruu2004@gmail.com',
    name: 'Heru (Super Admin)',
    role: 'superadmin',
    password: 'admin123',
    avatarUrl: '',
    createdAt: new Date().toISOString(),
  }
];

export const DEFAULT_SETTINGS: BusinessSettings = {
  appName: 'InvoiceKilat',
  appLogoUrl: '',
  appTagline: 'Sistem Faktur & QRIS Dinamis Otomatis',

  businessName: 'PT Cipta Media Nusantara',
  companyLogoUrl: '',
  businessTagline: 'Solusi Teknologi & Transformasi Digital',
  businessOwner: 'Budi Santoso',
  businessPhone: '6281298765432',
  businessEmail: 'billing@ciptamedia.id',
  businessAddress: 'Jl. Sudirman No. 45 Kav. 8, Senayan, Jakarta Pusat 10270',
  businessWebsite: 'https://ciptamedia.id',
  businessTaxId: '01.234.567.8-012.000',
  businessLogoUrl: '',

  bankName: 'BCA (Bank Central Asia)',
  bankAccountNumber: '8730918231',
  bankAccountHolder: 'PT Cipta Media Nusantara',

  // Akun Pembayaran Khusus (BCA, BRI, DANA, Gojek)
  bcaAccountNumber: '8730918231',
  bcaAccountHolder: 'PT Cipta Media Nusantara / Heruhendri',
  briAccountNumber: '012301098765501',
  briAccountHolder: 'PT Cipta Media Nusantara / Heruhendri',
  danaNumber: '08977345640',
  danaAccountHolder: 'Heruhendri',
  gojekNumber: '08977345640',
  gojekAccountHolder: 'Heruhendri',

  // Watermark Footer Invoice & Aplikasi
  watermarkText: 'Aplikasi ini dibuat oleh Heru Hendri • Contact Person: 08977345640',
  showAppWatermark: true,
  appWatermarkPosition: 'bottom-bar',

  // Otomasi Tagihan Bulanan (Recurring Invoicing)
  recurringBilling: {
    enabled: true,
    generateDay: 1,
    dateOption: 'system',
    dueDateOption: 'system',
    dueDaysOffset: 10,
    includeVpn: true,
    includeMonitoring: true,
    defaultVpnPrice: 50000,
    defaultMonitoringPrice: 250000,
    lastGeneratedMonth: '',
  },

  signatureImageUrl: '',
  stampImageUrl: '',
  signatoryName: 'Budi Santoso',
  signatoryTitle: 'Direktur Utama',

  defaultInvoiceTemplate: 'corporate',

  defaultStaticQris: DEFAULT_DANA_STATIC_QRIS,
  qrisMerchantName: 'hendr.store',
  qrisMerchantCity: 'Kab. Pemalang',

  googleSheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
  googleSheetName: 'InvoiceKilat_Master_Backup',
  googleSheetWebhookUrl: 'https://script.google.com/macros/s/AKfycbz_SAMPLE_APP_SCRIPT_URL_INVOICE_SYNC/exec',
  lastSpreadsheetSync: new Date().toISOString(),
  autoBackupToSheets: true,

  whatsappNotificationEnabled: true,
  whatsappTemplate: 
    'Halo *{{customer_name}}*, terima kasih! Pembayaran invoice *{{invoice_number}}* sebesar *Rp {{amount}}* telah BERHASIL kami terima dan diverifikasi oleh sistem. Status invoice saat ini: *LUNAS*. Detail invoice: {{invoice_url}}',

  emailNotificationEnabled: true,
  emailSenderName: 'Finance Cipta Media',
  emailSenderAddress: 'billing@ciptamedia.id',
  autoSendPreDueEmail: true,
  preDueDays: 3,
  autoSendOverdueEmail: true,
  overdueEmailTemplate: 
    'Pemberitahuan: Invoice {{invoice_number}} atas nama {{customer_name}} senilai Rp {{amount}} telah MELEWATI JATUH TEMPO (Due Date: {{due_date}}). Mohon segera melakukan pembayaran melalui QRIS Dinamis pada link berikut: {{invoice_url}}',
  preDueEmailTemplate: 
    'Pengingat Pembayaran: Invoice {{invoice_number}} senilai Rp {{amount}} akan jatuh tempo pada {{due_date}}. Segera lakukan pembayaran untuk menghindari denda.',

  // Telegram Backup Harian & Notifikasi
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
  telegramChatId: process.env.TELEGRAM_CHAT_ID || '',
  telegramDailyBackupEnabled: false,
  telegramDailyBackupTime: '00:00',
  telegramIncludeFormat: 'both',
  lastTelegramBackupAt: '',
  lastTelegramBackupStatus: 'idle',
  lastTelegramBackupMessage: '',
};

const DEFAULT_SERVICES: ServiceItem[] = [
  {
    id: 'srv-vpn-1',
    name: 'VPN Remote Mikrotik & Cloud Tunnel (L2TP/WireGuard/SSTP)',
    category: 'Jaringan & VPN',
    unit: 'Bulan',
    price: 50000,
    description: 'Akses remote Winbox dan Webfig router Mikrotik dari luar jaringan secara aman tanpa IP publik statis.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'srv-mon-1',
    name: 'Biaya Monitoring Jaringan NOC & Router 24/7',
    category: 'Monitoring & NOC',
    unit: 'Bulan',
    price: 250000,
    description: 'Monitoring traffic, latensi, uptime router Mikrotik, dan notifikasi alert real-time via WhatsApp/Telegram.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'srv-vpn-2',
    name: 'Sewa Port VPN Forwarding & Dedicated IP Publik Dinamis',
    category: 'Jaringan & VPN',
    unit: 'Bulan',
    price: 75000,
    description: 'Port forwarding dedicated untuk API Mikrotik, billing server, dan web monitoring online 24 jam.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'srv-mon-2',
    name: 'Biaya Monitoring Server & Database Realtime 24/7',
    category: 'Monitoring & NOC',
    unit: 'Bulan',
    price: 350000,
    description: 'Pemantauan performa server, beban CPU/RAM, backup database otomatis, dan laporan kesehatan sistem bulanan.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'srv-isp-1',
    name: 'Manajemen Bandwidth & Isolir Otomatis PPPoE ISP',
    category: 'ISP & PPPoE',
    unit: 'Bulan',
    price: 500000,
    description: 'Pengelolaan antrean bandwidth, pemeliharaan pool IP PPPoE, dan otomatisasi isolir pelanggan jatuh tempo.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'srv-1',
    name: 'Pengembangan Aplikasi Web & Mobile PWA',
    category: 'Software Development',
    unit: 'Proyek',
    price: 7500000,
    description: 'Pembuatan aplikasi web modern, responsif, dan installable PWA dengan sinkronisasi real-time.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'srv-2',
    name: 'Cloud Server Hosting & Domain 1 Tahun',
    category: 'Infrastruktur & Cloud',
    unit: 'Tahun',
    price: 1500000,
    description: 'Penyediaan hosting cloud cepat, sertifikat SSL HTTPS otomatis, dan maintenance 12 bulan.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'srv-3',
    name: 'Lisensi Modul Integrasi QRIS Dinamis',
    category: 'Payment Gateway',
    unit: 'Lisensi',
    price: 3500000,
    description: 'Modul otomatis konversi QRIS statis DANA Bisnis ke QRIS dinamis nominal terkunci.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'srv-4',
    name: 'Instalasi & Konfigurasi WhatsApp API Gateway',
    category: 'Komunikasi & Otomasi',
    unit: 'Paket',
    price: 1200000,
    description: 'Setup bot pesan WhatsApp otomatis untuk notifikasi invoice terbit dan bukti bayar lunas.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'srv-5',
    name: 'Jasa Maintenance Sistem & Spreadsheet Sync Bulanan',
    category: 'Maintenance & Support',
    unit: 'Bulan',
    price: 2000000,
    description: 'Monitoring berkala, pemeliharaan server database, dan integrasi webhook Google Sheets.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'srv-6',
    name: 'Desain UI/UX Design System & Dashboard Analitik',
    category: 'Desain Grafis & UI',
    unit: 'Paket',
    price: 4800000,
    description: 'Desain visual antarmuka modern, interaktif, komponen reusable, dan grafik analitik keuangan.',
    createdAt: new Date().toISOString(),
  },
];

export const DEFAULT_RECURRING_ADDONS: RecurringAddonService[] = [
  {
    id: 'addon-vpn',
    name: 'Layanan VPN Remote Mikrotik Dedicated',
    category: 'Jaringan & VPN',
    price: 50000,
    unit: 'Bulan',
    description: 'Akses remote Winbox & Webfig Mikrotik via port forwarding VPN cloud tunnel 24/7.',
    enabledByDefault: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'addon-mon',
    name: 'Biaya Monitoring Jaringan NOC 24/7',
    category: 'Monitoring & NOC',
    price: 250000,
    unit: 'Bulan',
    description: 'Pemantauan latensi, link router Mikrotik, dan alert insiden otomatis via WhatsApp & Telegram.',
    enabledByDefault: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'addon-ip-public',
    name: 'Sewa IP Publik Statis / Cloud Tunnel Dedicated',
    category: 'Jaringan & VPN',
    price: 100000,
    unit: 'Bulan',
    description: 'Alokasi IP publik statis untuk server local, web portal, atau router Mikrotik utama.',
    enabledByDefault: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'addon-maintenance',
    name: 'Jasa Pemeliharaan & Backup Config RouterOS Bulanan',
    category: 'Maintenance & Support',
    price: 350000,
    unit: 'Bulan',
    description: 'Backup berkala konfigurasi RouterOS, firmware update berkala, dan optimasi firewall.',
    enabledByDefault: false,
    createdAt: new Date().toISOString(),
  },
];

const DEFAULT_CUSTOMERS: CustomerRecord[] = [
  {
    id: 'cust-noc-1',
    name: 'Heru Pratama (Fiberku.net / ACO)',
    company: 'PT Net Nusantara Fiber (fiberku.net)',
    email: 'noc@fiberku.net',
    phone: '6281299887766',
    address: 'Gedung Cyber 1 Lt. 8, Jl. Kuningan Barat, Jakarta Selatan',
    notes: 'Klien ISP RTRW Net Mitra - Kontrak Monitoring NOC & Pemeliharaan Mikrotik PPPoE RouterOS Native',
    customerMode: 'noc',
    recurringEnabled: true,
    includeVpn: true,
    includeMonitoring: true,
    recurringAddonIds: ['addon-vpn', 'addon-mon'],
    pppoeBillingMethod: 'monthly_average',
    monthlyAveragePppoeCount: 135,
    password: 'client123',
    portalPin: '123456',
    mikrotik: {
      routerName: 'ACO (CCR2004-16G-2S+)',
      host: 'id-6.hostddns.us',
      port: 10941,
      username: 'mikhmon',
      password: 'rembulan',
      ratePerUser: 5000,
      isolirProfileName: 'isolir',
      connectionStatus: 'connected',
      connectionType: 'api',
      lastSyncedAt: new Date().toISOString(),
      totalPppoeSecrets: 138,
      activePppoeCount: 135,
      nonIsolirCount: 135,
      isolirCount: 0,
      hotspotActiveCount: 0,
      hotspotUsersCount: 0,
      systemIdentity: 'ACO',
      rosVersion: '7.20.8 (long-term)',
      boardName: 'CCR2004-16G-2S+',
      uptime: '1d 13h 48m',
      cpuLoad: 25,
      freeMemory: '3620.0 MiB',
      totalMemory: '4096.0 MiB',
      freeHdd: '112.5 MB',
      realtimeSource: 'routeros_api',
      samples: [
        { timestamp: '2026-09-01T08:00:00Z', activeCount: 130, nonIsolirCount: 130, isolirCount: 0 },
        { timestamp: '2026-09-07T12:00:00Z', activeCount: 132, nonIsolirCount: 132, isolirCount: 0 },
        { timestamp: '2026-09-14T15:30:00Z', activeCount: 134, nonIsolirCount: 134, isolirCount: 0 },
        { timestamp: '2026-09-20T07:55:44Z', activeCount: 135, nonIsolirCount: 135, isolirCount: 0 },
      ],
      monthlyAverageNonIsolir: 135,
      preferredBillingMethod: 'monthly_average',
    },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cust-1',
    name: 'Andi Pratama',
    company: 'CV Sinar Abadi Kreasi',
    email: 'andi.pratama@sinarabadi.co.id',
    phone: '6281234567890',
    address: 'Jl. Pemuda No. 12, Surabaya',
    notes: 'Klien prioritas jasa software dan integrasi pembayaran',
    customerMode: 'biasa',
    password: 'client123',
    portalPin: '123456',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cust-2',
    name: 'Siti Rahmawati',
    company: 'PT Global Solusindo Nusantara',
    email: 'siti.rahma@globalsolusindo.com',
    phone: '6281398761234',
    address: 'Wisma Mandiri Lt. 14, Jakarta Selatan',
    notes: 'Kontrak sistem QRIS dan WhatsApp gateway',
    customerMode: 'biasa',
    password: 'client123',
    portalPin: '123456',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cust-3',
    name: 'Dewi Lestari',
    company: 'Klinik Medika Sehat',
    email: 'dewi.lestari@medikasehat.id',
    phone: '6285712345678',
    address: 'Jl. Riau No. 88, Bandung',
    notes: 'Langganan maintenance bulanan',
    customerMode: 'biasa',
    password: 'client123',
    portalPin: '123456',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cust-4',
    name: 'Reza Firmansyah',
    company: 'Agency Digital Nusantara',
    email: 'reza@agencydigital.id',
    phone: '6281898765432',
    address: 'Jl. Malioboro No. 40, Yogyakarta',
    notes: 'Klien UI/UX design system',
    customerMode: 'biasa',
    password: 'client123',
    portalPin: '123456',
    createdAt: new Date().toISOString(),
  },
];

const DEFAULT_AUTOMATION_RULES: BillingAutomationRule[] = [
  {
    id: 'rule-on-create',
    name: 'Kirim Faktur Baru (Saat Dibuat)',
    trigger: 'on_create',
    channel: 'both',
    daysOffset: 0,
    enabled: true,
    messageTemplate: 
      'Halo *{{customer_name}}*, invoice baru *{{invoice_number}}* senilai *Rp {{amount}}* telah diterbitkan (Jatuh Tempo: {{due_date}}). Silakan akses dan bayar praktis via QRIS Dinamis pada link: {{invoice_url}}',
    emailSubject: 'Faktur Tagihan Baru: {{invoice_number}} - {{business_name}}',
  },
  {
    id: 'rule-pre-due',
    name: 'Pengingat Pra-Jatuh Tempo (H-3)',
    trigger: 'pre_due',
    channel: 'both',
    daysOffset: -3,
    enabled: true,
    messageTemplate: 
      'Pengingat Pembayaran: Halo *{{customer_name}}*, invoice *{{invoice_number}}* senilai *Rp {{amount}}* akan jatuh tempo pada *{{due_date}}* (3 hari lagi). Mohon segera lakukan pembayaran melalui QRIS: {{invoice_url}}',
    emailSubject: 'Pengingat Jatuh Tempo (H-3): Invoice {{invoice_number}}',
  },
  {
    id: 'rule-due-date',
    name: 'Pemberitahuan Hari Jatuh Tempo (Hari-H)',
    trigger: 'on_due_date',
    channel: 'both',
    daysOffset: 0,
    enabled: true,
    messageTemplate: 
      'Pemberitahuan Hari Ini: Halo *{{customer_name}}*, invoice *{{invoice_number}}* senilai *Rp {{amount}}* jatuh tempo *HARI INI* ({{due_date}}). Mohon selesaikan pembayaran sebelum pukul 23:59 WIB melalui link QRIS: {{invoice_url}}',
    emailSubject: 'Hari Ini Jatuh Tempo: Invoice {{invoice_number}}',
  },
  {
    id: 'rule-overdue',
    name: 'Peringatan Tagihan Melewati Jatuh Tempo (Overdue)',
    trigger: 'overdue',
    channel: 'both',
    daysOffset: 1,
    enabled: true,
    messageTemplate: 
      'Pemberitahuan Tagihan Terlambat: Invoice *{{invoice_number}}* senilai *Rp {{amount}}* atas nama *{{customer_name}}* telah MELEWATI TANGGAL JATUH TEMPO ({{due_date}}). Mohon konfirmasi atau segera lunasi pembayaran melalui QRIS Dinamis: {{invoice_url}}',
    emailSubject: 'Peringatan Tagihan Jatuh Tempo (Overdue): Invoice {{invoice_number}}',
  },
];

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

let cachedDb: DatabaseSchema | null = null;

export async function getDatabase(): Promise<DatabaseSchema> {
  if (cachedDb) return cachedDb;

  ensureDataDir();

  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      cachedDb = JSON.parse(raw);
      // Ensure new schema arrays exist if loaded from older db version
      if (!cachedDb!.customers || cachedDb!.customers.length === 0) {
        cachedDb!.customers = DEFAULT_CUSTOMERS;
      }
      if (!cachedDb!.services || cachedDb!.services.length === 0) {
        cachedDb!.services = DEFAULT_SERVICES;
      } else {
        // Merge in any newly introduced default services (e.g. VPN, Monitoring) if missing
        for (const defaultSrv of DEFAULT_SERVICES) {
          const exists = cachedDb!.services.some(
            (s) => s.id === defaultSrv.id || s.name.toLowerCase() === defaultSrv.name.toLowerCase()
          );
          if (!exists) {
            cachedDb!.services.push(defaultSrv);
          }
        }
      }
      if (!cachedDb!.recurringAddons || cachedDb!.recurringAddons.length === 0) {
        cachedDb!.recurringAddons = DEFAULT_RECURRING_ADDONS;
      } else {
        for (const defaultAddon of DEFAULT_RECURRING_ADDONS) {
          const exists = cachedDb!.recurringAddons.some(
            (a) => a.id === defaultAddon.id || a.name.toLowerCase() === defaultAddon.name.toLowerCase()
          );
          if (!exists) {
            cachedDb!.recurringAddons.push(defaultAddon);
          }
        }
      }

      // Ensure customers have portal password, pin, and NOC metrics initialized
      for (const cust of cachedDb!.customers) {
        if (!cust.password) cust.password = 'client123';
        if (!cust.portalPin) cust.portalPin = '123456';
        if (cust.customerMode === 'noc' && cust.mikrotik) {
          if (!cust.mikrotik.samples || cust.mikrotik.samples.length === 0) {
            cust.mikrotik.samples = [
              { timestamp: '2026-09-01T08:00:00Z', activeCount: 99, nonIsolirCount: 90, isolirCount: 9 },
              { timestamp: '2026-09-07T12:00:00Z', activeCount: 104, nonIsolirCount: 94, isolirCount: 10 },
              { timestamp: '2026-09-14T15:30:00Z', activeCount: 102, nonIsolirCount: 91, isolirCount: 11 },
              { timestamp: '2026-09-19T20:00:00Z', activeCount: 105, nonIsolirCount: 93, isolirCount: 12 },
            ];
          }
          if (!cust.mikrotik.monthlyAverageNonIsolir) {
            const sum = cust.mikrotik.samples.reduce((a, b) => a + b.nonIsolirCount, 0);
            cust.mikrotik.monthlyAverageNonIsolir = Math.round(sum / cust.mikrotik.samples.length);
          }
          if (!cust.pppoeBillingMethod) {
            cust.pppoeBillingMethod = 'monthly_average';
          }
          if (!cust.monthlyAveragePppoeCount) {
            cust.monthlyAveragePppoeCount = cust.mikrotik.monthlyAverageNonIsolir || 92;
          }
        }
      }
      if (!cachedDb!.automationRules || cachedDb!.automationRules.length === 0) {
        cachedDb!.automationRules = DEFAULT_AUTOMATION_RULES;
      }
      if (!cachedDb!.automationLogs) {
        cachedDb!.automationLogs = [];
      }
      if (!cachedDb!.adminUsers || cachedDb!.adminUsers.length === 0) {
        cachedDb!.adminUsers = DEFAULT_ADMIN_USERS;
      }
      if (!cachedDb!.settings) {
        cachedDb!.settings = DEFAULT_SETTINGS;
      } else {
        cachedDb!.settings = {
          ...DEFAULT_SETTINGS,
          ...cachedDb!.settings,
          appName: cachedDb!.settings.appName || DEFAULT_SETTINGS.appName,
          businessName: cachedDb!.settings.businessName || DEFAULT_SETTINGS.businessName,
          businessOwner: cachedDb!.settings.businessOwner || DEFAULT_SETTINGS.businessOwner,
          businessPhone: cachedDb!.settings.businessPhone || DEFAULT_SETTINGS.businessPhone,
          businessEmail: cachedDb!.settings.businessEmail || DEFAULT_SETTINGS.businessEmail,
          businessAddress: cachedDb!.settings.businessAddress || DEFAULT_SETTINGS.businessAddress,
          defaultStaticQris: cachedDb!.settings.defaultStaticQris || DEFAULT_SETTINGS.defaultStaticQris,
          qrisMerchantName: cachedDb!.settings.qrisMerchantName || DEFAULT_SETTINGS.qrisMerchantName,
          qrisMerchantCity: cachedDb!.settings.qrisMerchantCity || DEFAULT_SETTINGS.qrisMerchantCity,
          whatsappTemplate: cachedDb!.settings.whatsappTemplate || DEFAULT_SETTINGS.whatsappTemplate,
          watermarkText: cachedDb!.settings.watermarkText || 'Aplikasi ini dibuat oleh Heru Hendri • Contact Person: 08977345640',
          showAppWatermark: cachedDb!.settings.showAppWatermark ?? true,
          appWatermarkPosition: cachedDb!.settings.appWatermarkPosition || 'bottom-bar',
          recurringBilling: cachedDb!.settings.recurringBilling || DEFAULT_SETTINGS.recurringBilling,
          telegramBotToken: cachedDb!.settings.telegramBotToken !== undefined ? cachedDb!.settings.telegramBotToken : (DEFAULT_SETTINGS.telegramBotToken || ''),
          telegramChatId: cachedDb!.settings.telegramChatId !== undefined ? cachedDb!.settings.telegramChatId : (DEFAULT_SETTINGS.telegramChatId || ''),
          telegramDailyBackupEnabled: cachedDb!.settings.telegramDailyBackupEnabled ?? false,
          telegramDailyBackupTime: cachedDb!.settings.telegramDailyBackupTime || '00:00',
          telegramIncludeFormat: cachedDb!.settings.telegramIncludeFormat || 'both',
          lastTelegramBackupAt: cachedDb!.settings.lastTelegramBackupAt || '',
          lastTelegramBackupStatus: cachedDb!.settings.lastTelegramBackupStatus || 'idle',
          lastTelegramBackupMessage: cachedDb!.settings.lastTelegramBackupMessage || '',
        };
      }
      saveDatabase(cachedDb!);
      return cachedDb!;
    } catch (e) {
      console.error('Error reading db.json, re-initializing...', e);
    }
  }

  // Initialize with rich Indonesian sample business invoices
  const initialInvoices: Invoice[] = await createSeedInvoices();
  cachedDb = {
    settings: DEFAULT_SETTINGS,
    invoices: initialInvoices,
    customers: DEFAULT_CUSTOMERS,
    services: DEFAULT_SERVICES,
    recurringAddons: DEFAULT_RECURRING_ADDONS,
    automationRules: DEFAULT_AUTOMATION_RULES,
    automationLogs: [],
    remindersLog: [],
    adminUsers: DEFAULT_ADMIN_USERS,
  };

  saveDatabase(cachedDb);
  return cachedDb;
}

export function saveDatabase(db: DatabaseSchema) {
  ensureDataDir();
  cachedDb = db;
  const tempFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(db, null, 2), 'utf-8');
  fs.renameSync(tempFile, DB_FILE);
}

/**
 * Creates an automatic timestamped snapshot of the current database before any restore or critical change
 */
export function createDatabaseBackupSnapshot(label: string = 'pre_restore'): string {
  try {
    ensureDataDir();
    const backupDir = path.join(DATA_DIR, 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `db_snapshot_${label}_${timestamp}.json`);
    if (fs.existsSync(DB_FILE)) {
      fs.copyFileSync(DB_FILE, backupFile);
    } else if (cachedDb) {
      fs.writeFileSync(backupFile, JSON.stringify(cachedDb, null, 2), 'utf-8');
    }
    return backupFile;
  } catch (err: any) {
    console.warn('Failed to create database snapshot:', err.message);
    return '';
  }
}

async function createSeedInvoices(): Promise<Invoice[]> {
  const now = new Date();
  
  const formatDate = (daysOffset: number) => {
    const d = new Date(now.getTime() + daysOffset * 24 * 60 * 60 * 1000);
    return d.toISOString().split('T')[0];
  };

  const seedData = [
    {
      invoiceNumber: 'INV-2026-001',
      customer: {
        id: 'cust-1',
        name: 'Andi Pratama',
        company: 'CV Sinar Abadi Kreasi',
        email: 'andi.pratama@sinarabadi.co.id',
        phone: '6281234567890',
        address: 'Jl. Pemuda No. 12, Surabaya',
      },
      items: [
        { id: 'item-1', description: 'Pengembangan Aplikasi Web & Mobile PWA', quantity: 1, price: 7500000, total: 7500000 },
        { id: 'item-2', description: 'Cloud Server Hosting & Domain 1 Tahun', quantity: 1, price: 1500000, total: 1500000 },
      ],
      date: formatDate(-10),
      dueDate: formatDate(4),
      status: 'pending' as const,
      taxPercent: 11,
      discountAmount: 0,
    },
    {
      invoiceNumber: 'INV-2026-002',
      customer: {
        id: 'cust-2',
        name: 'Siti Rahmawati',
        company: 'PT Global Solusindo Nusantara',
        email: 'siti.rahma@globalsolusindo.com',
        phone: '6281398761234',
        address: 'Wisma Mandiri Lt. 14, Jakarta Selatan',
      },
      items: [
        { id: 'item-3', description: 'Lisensi Modul Integrasi QRIS Dinamis Multi-Platform', quantity: 1, price: 3500000, total: 3500000 },
        { id: 'item-4', description: 'Instalasi & Konfigurasi WhatsApp API Gateway', quantity: 1, price: 1200000, total: 1200000 },
      ],
      date: formatDate(-25),
      dueDate: formatDate(-5),
      status: 'overdue' as const,
      taxPercent: 11,
      discountAmount: 200000,
    },
    {
      invoiceNumber: 'INV-2026-003',
      customer: {
        id: 'cust-3',
        name: 'Dewi Lestari',
        company: 'Klinik Medika Sehat',
        email: 'dewi.lestari@medikasehat.id',
        phone: '6285712345678',
        address: 'Jl. Riau No. 88, Bandung',
      },
      items: [
        { id: 'item-5', description: 'Jasa Maintenance Sistem Database & Spreadsheet Sync Bulanan', quantity: 1, price: 2000000, total: 2000000 },
      ],
      date: formatDate(-40),
      dueDate: formatDate(-25),
      status: 'paid' as const,
      taxPercent: 11,
      discountAmount: 0,
      paidAmount: 2220000,
    },
    {
      invoiceNumber: 'INV-2026-004',
      customer: {
        id: 'cust-4',
        name: 'Reza Firmansyah',
        company: 'Agency Digital Nusantara',
        email: 'reza@agencydigital.id',
        phone: '6281898765432',
        address: 'Jl. Malioboro No. 40, Yogyakarta',
      },
      items: [
        { id: 'item-6', description: 'Desain UI/UX Design System & Dashboard Analitik', quantity: 1, price: 4800000, total: 4800000 },
      ],
      date: formatDate(-3),
      dueDate: formatDate(11),
      status: 'pending' as const,
      taxPercent: 11,
      discountAmount: 0,
    },
  ];

  const invoices: Invoice[] = [];

  for (const s of seedData) {
    const subtotal = s.items.reduce((acc, i) => acc + i.total, 0);
    const taxableAmount = Math.max(0, subtotal - s.discountAmount);
    const taxAmount = Math.round((taxableAmount * s.taxPercent) / 100);
    const totalAmount = taxableAmount + taxAmount;

    // Generate Dynamic QRIS using DANA Bisnis template
    const { dynamicQris } = convertToDynamicQris(DEFAULT_DANA_STATIC_QRIS, totalAmount, s.invoiceNumber);
    const qrDataUrl = await generateQrDataUrl(dynamicQris);

    const isPaid = s.status === 'paid';
    const paidAmount = isPaid ? totalAmount : 0;

    const transactions: PaymentTransaction[] = isPaid
      ? [
          {
            id: `trx-${Date.now()}-1`,
            invoiceId: s.invoiceNumber,
            invoiceNumber: s.invoiceNumber,
            amount: totalAmount,
            paymentMethod: 'qris_dinamis',
            referenceNumber: 'DANA-QRIS-' + Math.floor(10000000 + Math.random() * 90000000),
            notes: 'Pembayaran otomatis diverifikasi via QRIS Dinamis Dana Bisnis',
            verifiedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
            verifiedBy: 'Sistem Otomatis (QRIS Dana)',
          },
        ]
      : [];

    invoices.push({
      id: `inv-${s.invoiceNumber.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      invoiceNumber: s.invoiceNumber,
      date: s.date,
      dueDate: s.dueDate,
      status: s.status,
      customer: s.customer,
      items: s.items,
      subtotal,
      taxPercent: s.taxPercent,
      taxAmount,
      discountAmount: s.discountAmount,
      totalAmount,
      paidAmount,
      notes: 'Terima kasih atas kerja samanya. Pembayaran dapat dilakukan via scan QRIS Dinamis terlampir.',
      paymentTerms: 'Pembayaran jatuh tempo maksimal tanggal yang tertera.',
      staticQris: DEFAULT_DANA_STATIC_QRIS,
      dynamicQris,
      dynamicQrisDataUrl: qrDataUrl,
      transactions,
      reminders: [],
      whatsappNotified: isPaid,
      spreadsheetSynced: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  return invoices;
}
