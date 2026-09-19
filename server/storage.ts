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
  AdminUser
} from './types';
import { convertToDynamicQris, generateQrDataUrl } from './qris';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Default Real-World Dana Bisnis Static QRIS Template
export const DEFAULT_DANA_STATIC_QRIS = 
  '00020101021126590014ID.DANA.WWW0118936009153000000001021000000000000303UMI51440014ID.CO.QRIS.WWW0215ID10200210000010303UMI5204541153033605802ID5914DANA BISNIS MER59146007JAKARTA6105123406304ABCD';

export interface DatabaseSchema {
  settings: BusinessSettings;
  invoices: Invoice[];
  customers: CustomerRecord[];
  services: ServiceItem[];
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

const DEFAULT_SETTINGS: BusinessSettings = {
  businessName: 'PT Cipta Media Nusantara',
  businessOwner: 'Budi Santoso',
  businessPhone: '6281298765432',
  businessEmail: 'billing@ciptamedia.id',
  businessAddress: 'Jl. Sudirman No. 45 Kav. 8, Senayan, Jakarta Pusat 10270',
  businessLogoUrl: '',
  
  defaultStaticQris: DEFAULT_DANA_STATIC_QRIS,
  qrisMerchantName: 'DANA BISNIS CIPTA MEDIA',
  qrisMerchantCity: 'JAKARTA',

  googleSheetWebhookUrl: 'https://script.google.com/macros/s/AKfycbz_SAMPLE_APP_SCRIPT_URL_INVOICE_SYNC/exec',
  lastSpreadsheetSync: new Date().toISOString(),

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
};

const DEFAULT_SERVICES: ServiceItem[] = [
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

const DEFAULT_CUSTOMERS: CustomerRecord[] = [
  {
    id: 'cust-1',
    name: 'Andi Pratama',
    company: 'CV Sinar Abadi Kreasi',
    email: 'andi.pratama@sinarabadi.co.id',
    phone: '6281234567890',
    address: 'Jl. Pemuda No. 12, Surabaya',
    notes: 'Klien prioritas jasa software dan integrasi pembayaran',
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
