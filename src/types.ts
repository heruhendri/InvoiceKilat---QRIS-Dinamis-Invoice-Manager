export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  price: number;
  total: number;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string; // WhatsApp number
  company?: string;
  address?: string;
  notes?: string;
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
  paymentMethod: 'qris_dinamis' | 'dana_bisnis' | 'bank_transfer' | 'cash' | 'other';
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
  businessName: string;
  businessOwner: string;
  businessPhone: string;
  businessEmail: string;
  businessAddress: string;
  businessLogoUrl: string;
  
  defaultStaticQris: string;
  qrisMerchantName: string;
  qrisMerchantCity: string;
  qrisUploadedImageUrl?: string;

  googleSheetId?: string;
  googleSheetName?: string;
  googleSheetWebhookUrl: string;
  lastSpreadsheetSync?: string;

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
}

export interface RealtimeEvent {
  type: 'payment_received' | 'invoice_created' | 'invoice_updated' | 'invoice_status_changed' | 'spreadsheet_synced' | 'reminder_dispatched' | 'connected' | 'automation_executed' | 'customer_updated' | 'service_updated';
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
