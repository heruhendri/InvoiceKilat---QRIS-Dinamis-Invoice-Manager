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
 * Safely truncate HTML text without leaving unclosed tags or cut entities
 * to prevent Telegram API 400 Bad Request "can't parse entities: Unmatched end tag"
 */
function truncateHtmlSafely(html: string, maxLen = 950): string {
  if (html.length <= maxLen) return html;

  // Cut string before maxLen
  let truncated = html.slice(0, maxLen);
  // Avoid cutting in the middle of an entity (like &amp;)
  truncated = truncated.replace(/&[a-z0-9#]*$/i, '');
  // Avoid cutting in the middle of an HTML tag (like <b... or </span...)
  truncated = truncated.replace(/<[^>]*$/, '');

  // Track all unclosed tags
  const openTags: string[] = [];
  const tagRegex = /<\/?([a-z0-9]+)[^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = tagRegex.exec(truncated)) !== null) {
    const fullTag = match[0];
    const tagName = match[1].toLowerCase();
    if (fullTag.startsWith('</')) {
      const lastIndex = openTags.lastIndexOf(tagName);
      if (lastIndex !== -1) {
        openTags.splice(lastIndex, 1);
      }
    } else if (!fullTag.endsWith('/>')) {
      openTags.push(tagName);
    }
  }

  // Close all remaining open tags in reverse order
  while (openTags.length > 0) {
    const tag = openTags.pop();
    truncated += `</${tag}>`;
  }

  return truncated;
}

/**
 * Format current Date & Time in Western Indonesian Time (WIB / Asia/Jakarta / UTC+7)
 * Guaranteed reliable across all server runtime environments (containers, VPS, cloud).
 */
export function getWibDateTime(date = new Date()): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  dateStr: string; // YYYY-MM-DD in WIB
  timeStr: string; // HH:mm in WIB
  displayStr: string; // e.g. "Rabu, 30 September 2026 19:42 WIB"
} {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const map: Record<string, string> = {};
  for (const part of parts) {
    map[part.type] = part.value;
  }

  const year = parseInt(map.year, 10);
  const month = parseInt(map.month, 10);
  const day = parseInt(map.day, 10);
  let hour = parseInt(map.hour, 10);
  if (hour === 24) hour = 0;
  const minute = parseInt(map.minute, 10);
  const second = parseInt(map.second, 10);

  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

  const monthsIndo = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const daysIndo = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  // Day of week in Asia/Jakarta
  const wibEquivalent = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  const dayName = daysIndo[wibEquivalent.getUTCDay()];

  const displayStr = `${dayName}, ${day} ${monthsIndo[month - 1]} ${year} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} WIB`;

  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
    dateStr,
    timeStr,
    displayStr,
  };
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
        text: truncateHtmlSafely(text, 4000),
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
    formData.append('caption', truncateHtmlSafely(caption, 950));
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
  const { displayStr } = getWibDateTime();
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
• 📄 <b>Total Invoice:</b> ${totalInvoices} tagihan (Lunas: ${paidInvoices.length}, Pending: ${pendingInvoices.length}, Lewat Tempo: ${overdueInvoices.length})
• 💰 <b>Total Pemasukan:</b> Rp ${totalRevenue.toLocaleString('id-ID')}
• ⏳ <b>Total Piutang:</b> Rp ${totalOutstanding.toLocaleString('id-ID')}
• 👥 <b>Pelanggan:</b> ${customers.length} klien
• 🛠️ <b>Katalog Layanan:</b> ${services.length + addons.length} item
• ⚡ <b>Aturan Otomasi:</b> ${rules.length} aturan aktif

💾 <i>File cadangan JSON database terlampir. Anda dapat memulihkan (restore) seluruh data kapan saja via menu <b>Pengaturan &gt; Backup &amp; Restore</b>.</i>`;
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

  const { dateStr, timeStr, displayStr } = getWibDateTime();
  const cleanAppName = (db.settings.appName || 'InvoiceKilat').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${cleanAppName}_Backup_${dateStr}_${timeStr.replace(':', '')}.json`;

  const summary = generateTelegramBackupSummary(db, triggerType);

  // Clean JSON string of complete database
  const exportPayload = {
    version: '2.0',
    appName: db.settings.appName || 'InvoiceKilat',
    company: db.settings.businessName || 'PT Cipta Media Nusantara',
    exportedAt: new Date().toISOString(),
    wibExportedAt: displayStr,
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
    if (triggerType === 'daily_automated') {
      db.settings.lastTelegramAutomatedBackupAt = nowIso;
      db.settings.lastTelegramDailyBackupDateWib = dateStr;
    } else {
      db.settings.lastTelegramBackupAt = nowIso;
    }

    db.settings.lastTelegramBackupStatus = 'success';
    db.settings.lastTelegramBackupMessage = `${triggerType === 'daily_automated' ? 'Backup harian otomatis' : 'Backup manual'} berhasil dikirim ke Telegram (${displayStr})`;

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
      status: 'sent' as const,
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
        triggerType,
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
        totalRevenue: exportPayload.invoices.reduce((sum: number, i: any) => sum + (i.paidAmount || 0), 0),
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
  const { displayStr } = getWibDateTime();
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

// Global scheduler state tracking
let schedulerInterval: NodeJS.Timeout | null = null;
let isBackupInProgress = false;
let retryAttemptCount = 0;
let lastRetryAt: number = 0;

/**
 * Diagnostic status for the Telegram Backup Scheduler
 */
export async function getTelegramSchedulerStatus(): Promise<{
  isRunning: boolean;
  enabled: boolean;
  configured: boolean;
  targetTimeWib: string;
  currentWibTime: string;
  currentWibDate: string;
  lastDailyBackupDateWib: string;
  lastAutomatedBackupAt: string;
  lastBackupAt: string;
  lastStatus: string;
  lastMessage: string;
  nextScheduledRunWib: string;
}> {
  const db = await getDatabase();
  const settings = db.settings;
  const wibNow = getWibDateTime();

  const botToken = (settings.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN || '').trim();
  const chatId = (settings.telegramChatId || process.env.TELEGRAM_CHAT_ID || '').trim();
  const targetTime = (settings.telegramDailyBackupTime || '00:00').trim();

  const [targetHStr, targetMStr] = targetTime.split(':');
  const targetHour = parseInt(targetHStr || '0', 10);
  const targetMinute = parseInt(targetMStr || '0', 10);

  const currentMinutesOfDay = wibNow.hour * 60 + wibNow.minute;
  const targetMinutesOfDay = targetHour * 60 + targetMinute;
  const alreadyRanToday = settings.lastTelegramDailyBackupDateWib === wibNow.dateStr;

  let nextScheduledRunWib = 'Otomasi dinonaktifkan';
  if (settings.telegramDailyBackupEnabled && botToken && chatId) {
    if (alreadyRanToday) {
      nextScheduledRunWib = `Besok pukul ${targetTime} WIB`;
    } else if (currentMinutesOfDay < targetMinutesOfDay) {
      nextScheduledRunWib = `Hari ini pukul ${targetTime} WIB`;
    } else {
      nextScheduledRunWib = `Segera berjalan hari ini (${targetTime} WIB)`;
    }
  }

  return {
    isRunning: schedulerInterval !== null,
    enabled: !!settings.telegramDailyBackupEnabled,
    configured: !!(botToken && chatId),
    targetTimeWib: targetTime,
    currentWibTime: wibNow.timeStr,
    currentWibDate: wibNow.dateStr,
    lastDailyBackupDateWib: settings.lastTelegramDailyBackupDateWib || '',
    lastAutomatedBackupAt: settings.lastTelegramAutomatedBackupAt || '',
    lastBackupAt: settings.lastTelegramBackupAt || '',
    lastStatus: settings.lastTelegramBackupStatus || 'idle',
    lastMessage: settings.lastTelegramBackupMessage || '',
    nextScheduledRunWib,
  };
}

/**
 * Check and execute scheduled daily Telegram backup.
 * Supports force execution for manual testing of automated pipeline.
 */
export async function checkDailyTelegramBackupSchedule(forceRun = false): Promise<{
  ran: boolean;
  success?: boolean;
  message: string;
}> {
  if (isBackupInProgress) {
    return { ran: false, message: 'Cadangan database Telegram sedang berlangsung' };
  }

  try {
    const db = await getDatabase();
    const settings = db.settings;

    const botToken = (settings.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN || '').trim();
    const chatId = (settings.telegramChatId || process.env.TELEGRAM_CHAT_ID || '').trim();

    if (!settings.telegramDailyBackupEnabled && !forceRun) {
      return { ran: false, message: 'Backup harian otomatis Telegram dinonaktifkan' };
    }

    if (!botToken || !chatId) {
      return { ran: false, message: 'Bot Token atau Chat ID Telegram belum dikonfigurasi' };
    }

    const wibNow = getWibDateTime();
    const targetTime = (settings.telegramDailyBackupTime || '00:00').trim();
    const [targetHStr, targetMStr] = targetTime.split(':');
    const targetHour = parseInt(targetHStr || '0', 10);
    const targetMinute = parseInt(targetMStr || '0', 10);

    const currentMinutesOfDay = wibNow.hour * 60 + wibNow.minute;
    const targetMinutesOfDay = targetHour * 60 + targetMinute;

    // Check if automated backup has already succeeded for today's WIB date
    const alreadyRanToday = settings.lastTelegramDailyBackupDateWib === wibNow.dateStr;

    // Evaluate trigger condition:
    // Either forced, or (has not yet run today AND current WIB time has reached target time)
    const isDue = currentMinutesOfDay >= targetMinutesOfDay;
    const shouldTrigger = forceRun || (!alreadyRanToday && isDue);

    if (!shouldTrigger) {
      return {
        ran: false,
        message: alreadyRanToday
          ? `Backup hari ini (${wibNow.dateStr}) sudah berhasil terkirim`
          : `Menunggu waktu jadwal (${targetTime} WIB, saat ini ${wibNow.timeStr} WIB)`,
      };
    }

    // Cooldown check if retrying after failure
    const nowMs = Date.now();
    if (!forceRun && retryAttemptCount > 0 && nowMs - lastRetryAt < 120000) {
      return { ran: false, message: 'Menunggu jeda percobaan ulang (retry cooldown 2 menit)' };
    }

    isBackupInProgress = true;
    console.log(`⏰ [Telegram Scheduler] Menjalankan backup harian untuk tanggal WIB ${wibNow.dateStr} (Target: ${targetTime} WIB, Saat ini: ${wibNow.timeStr} WIB)...`);

    const res = await dispatchTelegramBackup({
      botToken,
      chatId,
      format: settings.telegramIncludeFormat || 'both',
      triggerType: 'daily_automated',
    });

    if (res.success) {
      retryAttemptCount = 0;
      console.log(`✅ [Telegram Scheduler] Backup harian Telegram untuk ${wibNow.dateStr} BERHASIL terkirim!`);
      return { ran: true, success: true, message: res.message };
    } else {
      retryAttemptCount += 1;
      lastRetryAt = Date.now();
      console.warn(`⚠️ [Telegram Scheduler] Backup harian gagal (percobaan #${retryAttemptCount}): ${res.message}`);
      return { ran: true, success: false, message: res.message };
    }
  } catch (err: any) {
    console.error('[Telegram Scheduler Error]', err.message);
    return { ran: false, message: `Error scheduler: ${err.message}` };
  } finally {
    isBackupInProgress = false;
  }
}

/**
 * Initialize daily background Telegram backup scheduler
 * Runs every 30 seconds to inspect scheduled time with WIB accuracy.
 */
export function initDailyTelegramBackupScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }

  console.log('⏰ Inisialisasi Penjadwal Backup Otomatis Telegram (Zona Waktu WIB / Asia/Jakarta)...');

  // Initial check after 3 seconds on server startup
  setTimeout(() => {
    checkDailyTelegramBackupSchedule().catch((e) => console.error('[Telegram Scheduler Initial Check]', e));
  }, 3000);

  // Periodic check every 30 seconds
  schedulerInterval = setInterval(() => {
    checkDailyTelegramBackupSchedule().catch((e) => console.error('[Telegram Scheduler Interval Check]', e));
  }, 30000);

  if (schedulerInterval && typeof schedulerInterval.unref === 'function') {
    schedulerInterval.unref();
  }
}
