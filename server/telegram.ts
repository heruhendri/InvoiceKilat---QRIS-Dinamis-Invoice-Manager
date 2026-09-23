import { DatabaseSchema, getDatabase, saveDatabase } from './storage';
import { broadcastEvent } from './routes';

function escapeHtml(text: string): string {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Format date in Indonesian locale (WIB / Jakarta)
 */
function getIndoFormattedNow(): { dateStr: string; displayStr: string; timeStr: string } {
  const now = new Date();
  // Format for filename YYYY-MM-DD_HHmm
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');

  const dateStr = `${y}-${m}-${d}_${h}${min}`;
  const timeStr = `${h}:${min}`;

  const monthsIndo = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const daysIndo = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  const displayStr = `${daysIndo[now.getDay()]}, ${now.getDate()} ${monthsIndo[now.getMonth()]} ${y} ${h}:${min} WIB`;

  return { dateStr, displayStr, timeStr };
}

/**
 * Send plain or HTML text message via Telegram Bot API
 */
export async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  text: string
): Promise<{ success: boolean; message: string; raw?: any }> {
  const token = String(botToken || '').trim();
  const chat = String(chatId || '').trim();

  if (!token) {
    return { success: false, message: 'Bot Token Telegram wajib diisi' };
  }
  if (!chat) {
    return { success: false, message: 'Chat ID Telegram wajib diisi' };
  }

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chat,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    const resJson = await response.json().catch(() => ({}));

    if (!response.ok || !resJson.ok) {
      const errDesc = resJson.description || `HTTP ${response.status} ${response.statusText}`;
      let userFriendly = errDesc;
      if (errDesc.includes('Unauthorized') || errDesc.includes('Not Found')) {
        userFriendly = 'Bot Token tidak valid. Pastikan Anda menyalin API Token dari @BotFather dengan benar.';
      } else if (errDesc.includes('chat not found')) {
        userFriendly = 'Chat ID tidak ditemukan. Pastikan Anda sudah mengirim pesan /start ke bot Anda di Telegram atau masukkan bot ke grup/channel.';
      } else if (errDesc.includes('bot was blocked by the user')) {
        userFriendly = 'Bot diblokir oleh akun Anda. Buka bot di Telegram lalu klik Unblock / Restart.';
      }
      return {
        success: false,
        message: `Gagal mengirim pesan Telegram: ${userFriendly}`,
        raw: resJson,
      };
    }

    return {
      success: true,
      message: 'Pesan Telegram berhasil dikirim',
      raw: resJson,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Gagal menghubungi server Telegram: ${err.message || String(err)}`,
    };
  }
}

/**
 * Send a document/file attachment via Telegram Bot API with multipart/form-data
 */
export async function sendTelegramDocument(
  botToken: string,
  chatId: string,
  documentBuffer: Buffer | Uint8Array,
  filename: string,
  caption: string
): Promise<{ success: boolean; message: string; raw?: any }> {
  const token = String(botToken || '').trim();
  const chat = String(chatId || '').trim();

  if (!token) return { success: false, message: 'Bot Token Telegram wajib diisi' };
  if (!chat) return { success: false, message: 'Chat ID Telegram wajib diisi' };

  try {
    const url = `https://api.telegram.org/bot${token}/sendDocument`;

    // Modern Node.js FormData & Blob
    const formData = new FormData();
    formData.append('chat_id', chat);
    formData.append('caption', caption.slice(0, 1024)); // Telegram caption limit 1024 chars
    formData.append('parse_mode', 'HTML');

    const fileBlob = new Blob([documentBuffer], { type: 'application/json' });
    formData.append('document', fileBlob, filename);

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    const resJson = await response.json().catch(() => ({}));

    if (!response.ok || !resJson.ok) {
      const errDesc = resJson.description || `HTTP ${response.status}`;
      let userFriendly = errDesc;
      if (errDesc.includes('Unauthorized')) {
        userFriendly = 'Bot Token tidak valid. Periksa token dari @BotFather.';
      } else if (errDesc.includes('chat not found')) {
        userFriendly = 'Chat ID tidak ditemukan. Buka bot di Telegram dan ketik /start terlebih dahulu.';
      }
      return {
        success: false,
        message: `Gagal mengirim dokumen backup ke Telegram: ${userFriendly}`,
        raw: resJson,
      };
    }

    return {
      success: true,
      message: 'File cadangan database berhasil dikirim ke Telegram',
      raw: resJson,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Gagal mengirim dokumen ke Telegram: ${err.message || String(err)}`,
    };
  }
}

/**
 * Generate human-readable summary text for Telegram message
 */
export function generateTelegramBackupSummary(
  db: DatabaseSchema,
  triggerType: 'manual' | 'daily_automated' = 'manual'
): string {
  const { displayStr } = getIndoFormattedNow();
  const appName = escapeHtml(db.settings.appName || 'InvoiceKilat');
  const businessName = escapeHtml(db.settings.businessName || 'PT Cipta Media Nusantara');

  const invoices = db.invoices || [];
  const customers = db.customers || [];
  const services = db.services || [];
  const addons = db.recurringAddons || [];
  const rules = db.automationRules || [];

  const totalInvoices = invoices.length;
  const paidInvoices = invoices.filter((i) => i.status === 'paid');
  const pendingInvoices = invoices.filter((i) => i.status === 'pending');
  const overdueInvoices = invoices.filter((i) => i.status === 'overdue');
  const partialInvoices = invoices.filter((i) => i.status === 'partial');

  const totalRevenue = invoices.reduce((sum, i) => sum + (i.paidAmount || 0), 0);
  const totalOutstanding = invoices
    .filter((i) => i.status !== 'paid')
    .reduce((sum, i) => sum + Math.max(0, i.totalAmount - (i.paidAmount || 0)), 0);

  const headerTitle = triggerType === 'daily_automated'
    ? '📦 <b>BACKUP DATABASE HARIAN (OTOMATIS)</b>'
    : '📦 <b>BACKUP DATABASE (MANUAL)</b>';

  return `${headerTitle}
🏢 <b>Perusahaan:</b> ${businessName}
📱 <b>Aplikasi:</b> ${appName}
📅 <b>Waktu:</b> ${displayStr}

📊 <b>Ringkasan Database:</b>
• 📄 <b>Total Invoice:</b> ${totalInvoices} tagihan
  - Lunas: ${paidInvoices.length}
  - Menunggu: ${pendingInvoices.length}
  - Jatuh Tempo: ${overdueInvoices.length}
  - Sebagian: ${partialInvoices.length}
• 💰 <b>Total Pemasukan:</b> Rp ${totalRevenue.toLocaleString('id-ID')}
• ⏳ <b>Total Piutang:</b> Rp ${totalOutstanding.toLocaleString('id-ID')}
• 👥 <b>Pelanggan Terdaftar:</b> ${customers.length} klien
• 🛠️ <b>Katalog Jasa &amp; Addon:</b> ${services.length + addons.length} item
• ⚡ <b>Aturan Otomasi:</b> ${rules.length} aturan aktif

💾 <i>File cadangan JSON database terlampir. Anda dapat memulihkan (restore) seluruh data kapan saja melalui menu <b>Pengaturan &gt; Backup &amp; Restore</b>.</i>`;
}

/**
 * Execute a complete backup dispatch to Telegram (file + caption summary)
 */
export async function dispatchTelegramBackup(options?: {
  botToken?: string;
  chatId?: string;
  format?: 'both' | 'document_json' | 'summary_text';
  triggerType?: 'manual' | 'daily_automated';
}): Promise<{
  success: boolean;
  message: string;
  stats?: any;
  sentAt?: string;
}> {
  const db = await getDatabase();
  const triggerType = options?.triggerType || 'manual';

  const token = (options?.botToken || db.settings.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN || '').trim();
  const chatId = (options?.chatId || db.settings.telegramChatId || process.env.TELEGRAM_CHAT_ID || '').trim();
  const format = options?.format || db.settings.telegramIncludeFormat || 'both';

  if (!token) {
    const msg = 'Bot Token Telegram belum diisi. Silakan atur di menu Pengaturan > Backup & Restore.';
    db.settings.lastTelegramBackupStatus = 'failed';
    db.settings.lastTelegramBackupMessage = msg;
    saveDatabase(db);
    return { success: false, message: msg };
  }

  if (!chatId) {
    const msg = 'Chat ID Telegram belum diisi. Silakan atur di menu Pengaturan > Backup & Restore.';
    db.settings.lastTelegramBackupStatus = 'failed';
    db.settings.lastTelegramBackupMessage = msg;
    saveDatabase(db);
    return { success: false, message: msg };
  }

  const { dateStr, displayStr } = getIndoFormattedNow();
  const cleanAppName = (db.settings.appName || 'InvoiceKilat').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${cleanAppName}_Backup_${dateStr}.json`;

  const summary = generateTelegramBackupSummary(db, triggerType);

  // Clean JSON string of complete database
  const exportPayload = {
    version: '2.0',
    appName: db.settings.appName || 'InvoiceKilat',
    company: db.settings.businessName || 'PT Cipta Media Nusantara',
    exportedAt: new Date().toISOString(),
    trigger: triggerType,
    settings: db.settings,
    invoices: db.invoices || [],
    customers: db.customers || [],
    services: db.services || [],
    recurringAddons: db.recurringAddons || [],
    automationRules: db.automationRules || [],
    automationLogs: (db.automationLogs || []).slice(0, 50),
    remindersLog: (db.remindersLog || []).slice(0, 50),
    adminUsers: (db.adminUsers || []).map((u) => ({
      id: u.id,
      username: u.username,
      email: u.email,
      name: u.name,
      role: u.role,
      avatarUrl: u.avatarUrl,
      createdAt: u.createdAt,
    })),
  };

  const jsonBuffer = Buffer.from(JSON.stringify(exportPayload, null, 2), 'utf-8');

  let sendResult: { success: boolean; message: string };

  if (format === 'summary_text') {
    sendResult = await sendTelegramMessage(token, chatId, summary);
  } else {
    // Both or document_json
    sendResult = await sendTelegramDocument(token, chatId, jsonBuffer, filename, summary);
  }

  const nowIso = new Date().toISOString();

  if (sendResult.success) {
    db.settings.lastTelegramBackupAt = nowIso;
    db.settings.lastTelegramBackupStatus = 'success';
    db.settings.lastTelegramBackupMessage = `Backup berhasil dikirim ke Telegram (${displayStr})`;

    // Append to automation logs for tracking
    const autoLog = {
      id: `auto-backup-${Date.now()}`,
      invoiceId: 'SYSTEM-BACKUP',
      invoiceNumber: filename,
      customerName: 'Telegram Admin Channel',
      customerPhone: chatId,
      customerEmail: 'telegram-backup@system.local',
      ruleType: triggerType === 'daily_automated' ? 'Backup Harian Otomatis Telegram' : 'Backup Manual Telegram',
      channel: 'both' as const,
      status: 'generated' as const,
      message: `File database ${filename} (${Math.round(jsonBuffer.length / 1024)} KB) berhasil dikirim ke Telegram Chat ID ${chatId}`,
      dispatchedAt: nowIso,
      amount: exportPayload.invoices.reduce((sum: number, i: any) => sum + (i.totalAmount || 0), 0),
    };

    db.automationLogs = [autoLog, ...(db.automationLogs || [])].slice(0, 50);
    saveDatabase(db);

    broadcastEvent({
      type: 'telegram_backup_sent',
      message: `Backup database berhasil dikirim ke Telegram (${exportPayload.invoices.length} invoice, ${exportPayload.customers.length} pelanggan)`,
      timestamp: nowIso,
      payload: {
        filename,
        invoicesCount: exportPayload.invoices.length,
        customersCount: exportPayload.customers.length,
        sizeKb: Math.round(jsonBuffer.length / 1024),
      },
    });

    return {
      success: true,
      message: `Backup database (${Math.round(jsonBuffer.length / 1024)} KB) berhasil dikirim ke Telegram!`,
      sentAt: nowIso,
      stats: {
        invoices: exportPayload.invoices.length,
        customers: exportPayload.customers.length,
        services: exportPayload.services.length,
        filename,
        fileSizeKb: Math.round(jsonBuffer.length / 1024),
      },
    };
  } else {
    db.settings.lastTelegramBackupStatus = 'failed';
    db.settings.lastTelegramBackupMessage = sendResult.message;
    saveDatabase(db);
    return {
      success: false,
      message: sendResult.message,
    };
  }
}

/**
 * Test Telegram bot connection with a friendly ping message
 */
export async function testTelegramConnection(
  botToken: string,
  chatId: string
): Promise<{ success: boolean; message: string }> {
  const { displayStr } = getIndoFormattedNow();
  const db = await getDatabase();
  const appName = escapeHtml(db.settings.appName || 'InvoiceKilat');
  const businessName = escapeHtml(db.settings.businessName || 'Perusahaan');

  const testMessage = `🔔 <b>TES KONEKSI BOT TELEGRAM BERHASIL</b>
━━━━━━━━━━━━━━━━━━
Sistem <b>${appName}</b> (${businessName}) berhasil terhubung dengan akun / grup Telegram ini.

📅 <b>Waktu Tes:</b> ${displayStr}
💬 <b>Chat ID:</b> <code>${escapeHtml(chatId)}</code>
⚡ <b>Status:</b> Siap menerima cadangan database harian otomatis!

<i>Pesan ini dikirim sebagai pengujian konfigurasi bot Telegram.</i>`;

  return await sendTelegramMessage(botToken, chatId, testMessage);
}

// Global scheduler timer tracking
let schedulerInterval: NodeJS.Timeout | null = null;

/**
 * Initialize daily background Telegram backup scheduler
 * Runs once every 60 seconds to inspect scheduled time.
 */
export function initDailyTelegramBackupScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }

  console.log('⏰ Initializing Daily Telegram Backup Scheduler...');

  const checkScheduledBackup = async () => {
    try {
      const db = await getDatabase();
      const settings = db.settings;

      if (!settings.telegramDailyBackupEnabled) {
        return;
      }

      if (!settings.telegramBotToken || !settings.telegramChatId) {
        return;
      }

      const now = new Date();
      // Server / Local hours & minutes
      const currentHour = String(now.getHours()).padStart(2, '0');
      const currentMin = String(now.getMinutes()).padStart(2, '0');
      const currentTime = `${currentHour}:${currentMin}`;

      const targetTime = (settings.telegramDailyBackupTime || '00:00').trim();

      // Check if already dispatched today
      const todayDateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
      const lastBackupDateStr = (settings.lastTelegramBackupAt || '').split('T')[0];

      if (currentTime === targetTime && lastBackupDateStr !== todayDateStr) {
        console.log(`🚀 [Telegram Scheduler] Triggering daily backup for ${todayDateStr} at ${currentTime}...`);
        const res = await dispatchTelegramBackup({
          triggerType: 'daily_automated',
        });
        if (res.success) {
          console.log('✅ [Telegram Scheduler] Daily backup sent successfully!');
        } else {
          console.warn('⚠️ [Telegram Scheduler] Daily backup failed:', res.message);
        }
      }
    } catch (err: any) {
      console.error('[Telegram Scheduler Error]', err.message);
    }
  };

  // Run initial check after 5 seconds, then every 60 seconds
  setTimeout(checkScheduledBackup, 5000);
  schedulerInterval = setInterval(checkScheduledBackup, 60000);
  if (schedulerInterval && typeof schedulerInterval.unref === 'function') {
    schedulerInterval.unref();
  }
}
