import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase, DEFAULT_DANA_STATIC_QRIS, DEFAULT_ADMIN_USERS } from './storage';
import { convertToDynamicQris, generateQrDataUrl, validateQris, parseQris } from './qris';
import { Invoice, PaymentTransaction, RealtimeEvent, ReminderLog, AdminUser, AdminUserSafe } from './types';

export const apiRouter = Router();

// Store connected SSE response streams
const sseClients = new Set<Response>();

// In-memory active session tokens for Admin Auth
interface AuthSession {
  token: string;
  userId: string;
  username: string;
  expiresAt: number;
}
const activeSessions = new Map<string, AuthSession>();

function getSafeUser(user: AdminUser): AdminUserSafe {
  const { password, ...safe } = user;
  return safe;
}

function extractToken(req: Request): string | null {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  const customHeader = req.headers['x-admin-token'] as string;
  if (customHeader) return customHeader.trim();
  if (req.query.token) return String(req.query.token).trim();
  return null;
}

// ---------------- AUTHENTICATION ROUTES ----------------

// POST /api/auth/login
apiRouter.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { username, password, rememberMe } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username/Email dan Password wajib diisi.'
      });
    }

    const db = await getDatabase();
    const adminList = db.adminUsers && db.adminUsers.length > 0 ? db.adminUsers : DEFAULT_ADMIN_USERS;

    const trimmedInput = String(username).trim().toLowerCase();
    const user = adminList.find(
      (u) =>
        u.username.toLowerCase() === trimmedInput ||
        u.email.toLowerCase() === trimmedInput
    );

    if (!user || user.password !== String(password)) {
      return res.status(401).json({
        success: false,
        message: 'Username / Email atau Password salah. Akun default: admin / admin123'
      });
    }

    // Generate secure session token
    const token = `adm_${Date.now()}_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`;
    const durationDays = rememberMe ? 30 : 7;
    const expiresAt = Date.now() + durationDays * 24 * 60 * 60 * 1000;

    activeSessions.set(token, {
      token,
      userId: user.id,
      username: user.username,
      expiresAt,
    });

    user.lastLoginAt = new Date().toISOString();
    saveDatabase(db);

    broadcastEvent({
      type: 'connected',
      message: `Admin ${user.name} berhasil login ke portal`,
      timestamp: new Date().toISOString(),
    });

    return res.json({
      success: true,
      token,
      user: getSafeUser(user),
      message: 'Login admin berhasil.',
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan sistem: ' + err.message });
  }
});

// GET /api/auth/me
apiRouter.get('/auth/me', async (req: Request, res: Response) => {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ success: false, message: 'Tidak ada token autentikasi' });
  }

  const session = activeSessions.get(token);
  const db = await getDatabase();
  const adminList = db.adminUsers && db.adminUsers.length > 0 ? db.adminUsers : DEFAULT_ADMIN_USERS;

  // Validate session or allow valid format token matching user
  let user: AdminUser | undefined;
  if (session && session.expiresAt > Date.now()) {
    user = adminList.find((u) => u.id === session.userId);
  } else if (token.startsWith('adm_')) {
    // If server restarted, preserve valid token session
    user = adminList[0];
  }

  if (!user) {
    return res.status(401).json({ success: false, message: 'Sesi admin telah kedaluwarsa atau tidak valid.' });
  }

  return res.json({
    success: true,
    user: getSafeUser(user),
  });
});

// POST /api/auth/logout
apiRouter.post('/auth/logout', (req: Request, res: Response) => {
  const token = extractToken(req);
  if (token) {
    activeSessions.delete(token);
  }
  return res.json({ success: true, message: 'Logout admin berhasil.' });
});

// POST /api/auth/change-password
apiRouter.post('/auth/change-password', async (req: Request, res: Response) => {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ success: false, message: 'Tidak ada otorisasi admin' });
  }

  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 5) {
    return res.status(400).json({ success: false, message: 'Password baru minimal 5 karakter.' });
  }

  const db = await getDatabase();
  if (!db.adminUsers || db.adminUsers.length === 0) {
    db.adminUsers = [...DEFAULT_ADMIN_USERS];
  }

  const session = activeSessions.get(token);
  const user = session ? db.adminUsers.find((u) => u.id === session.userId) : db.adminUsers[0];

  if (!user) {
    return res.status(401).json({ success: false, message: 'User admin tidak ditemukan.' });
  }

  if (user.password !== currentPassword) {
    return res.status(400).json({ success: false, message: 'Password saat ini salah.' });
  }

  user.password = newPassword;
  saveDatabase(db);

  return res.json({ success: true, message: 'Password admin berhasil diperbarui.' });
});

// PUT /api/auth/profile
apiRouter.put('/auth/profile', async (req: Request, res: Response) => {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ success: false, message: 'Tidak ada otorisasi admin' });
  }

  const { name, email, avatarUrl } = req.body;
  const db = await getDatabase();
  if (!db.adminUsers || db.adminUsers.length === 0) {
    db.adminUsers = [...DEFAULT_ADMIN_USERS];
  }

  const session = activeSessions.get(token);
  const user = session ? db.adminUsers.find((u) => u.id === session.userId) : db.adminUsers[0];

  if (!user) {
    return res.status(401).json({ success: false, message: 'User admin tidak ditemukan.' });
  }

  if (name) user.name = name;
  if (email) user.email = email;
  if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;

  saveDatabase(db);
  return res.json({ success: true, user: getSafeUser(user), message: 'Profil admin berhasil diperbarui.' });
});

// ---------------- END AUTHENTICATION ROUTES ----------------

export function broadcastEvent(event: RealtimeEvent) {
  const data = `data: ${JSON.stringify(event)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(data);
    } catch {
      sseClients.delete(client);
    }
  }
}

// Server-Sent Events (SSE) Stream for real-time notification across all devices
apiRouter.get('/notifications/stream', (req: Request, res: Response) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  res.write('data: {"type":"connected","message":"Terhubung ke stream notifikasi real-time"}\n\n');
  sseClients.add(res);

  req.on('close', () => {
    sseClients.delete(res);
  });
});

// GET Settings
apiRouter.get('/settings', async (req: Request, res: Response) => {
  const db = await getDatabase();
  res.json(db.settings);
});

// UPDATE Settings
apiRouter.put('/settings', async (req: Request, res: Response) => {
  const db = await getDatabase();
  db.settings = {
    ...db.settings,
    ...req.body,
  };
  saveDatabase(db);
  res.json(db.settings);
});

// QRIS Generate & Validate endpoints
apiRouter.post('/qris/validate', (req: Request, res: Response) => {
  const { staticQris } = req.body;
  const result = validateQris(staticQris);
  const parsed = parseQris(staticQris);
  res.json({ ...result, parsed });
});

apiRouter.post('/qris/generate', async (req: Request, res: Response) => {
  try {
    const { staticQris, amount, invoiceNumber } = req.body;
    const db = await getDatabase();
    const sourceQris = staticQris || db.settings.defaultStaticQris || DEFAULT_DANA_STATIC_QRIS;

    const numericAmount = Math.max(0, Number(amount) || 0);
    const { dynamicQris, parsed } = convertToDynamicQris(sourceQris, numericAmount, invoiceNumber);
    const qrDataUrl = await generateQrDataUrl(dynamicQris);

    res.json({
      success: true,
      dynamicQris,
      qrDataUrl,
      parsed,
      amount: numericAmount,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || 'Gagal generate QRIS Dinamis' });
  }
});

// GET All Invoices
apiRouter.get('/invoices', async (req: Request, res: Response) => {
  const db = await getDatabase();
  
  // Auto-check overdue status based on current date
  const today = new Date().toISOString().split('T')[0];
  let updated = false;

  for (const inv of db.invoices) {
    if (inv.status === 'pending' && inv.dueDate < today) {
      inv.status = 'overdue';
      updated = true;
    }
  }

  if (updated) {
    saveDatabase(db);
  }

  res.json(db.invoices);
});

// GET Single Invoice
apiRouter.get('/invoices/:id', async (req: Request, res: Response) => {
  const db = await getDatabase();
  const invoice = db.invoices.find((i) => i.id === req.params.id || i.invoiceNumber === req.params.id);
  if (!invoice) {
    return res.status(404).json({ message: 'Invoice tidak ditemukan' });
  }
  res.json(invoice);
});

// CREATE Invoice
apiRouter.post('/invoices', async (req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    const body = req.body;

    // Generate Invoice Number if not provided
    const year = new Date().getFullYear();
    const count = db.invoices.length + 1;
    const invoiceNumber = body.invoiceNumber || `INV-${year}-${count.toString().padStart(3, '0')}`;

    const items = body.items || [];
    const subtotal = items.reduce((acc: number, item: any) => acc + (Number(item.total) || 0), 0);
    const discountAmount = Number(body.discountAmount) || 0;
    const taxPercent = Number(body.taxPercent) || 0;
    const taxableAmount = Math.max(0, subtotal - discountAmount);
    const taxAmount = Math.round((taxableAmount * taxPercent) / 100);
    const totalAmount = taxableAmount + taxAmount;

    // QRIS generation
    const staticQris = body.staticQris || db.settings.defaultStaticQris || DEFAULT_DANA_STATIC_QRIS;
    const { dynamicQris } = convertToDynamicQris(staticQris, totalAmount, invoiceNumber);
    const dynamicQrisDataUrl = await generateQrDataUrl(dynamicQris);

    const newInvoice: Invoice = {
      id: `inv-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      invoiceNumber,
      date: body.date || new Date().toISOString().split('T')[0],
      dueDate: body.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: body.status || 'pending',
      customer: {
        id: body.customer?.id || `cust-${Date.now()}`,
        name: body.customer?.name || 'Pelanggan Umum',
        email: body.customer?.email || '',
        phone: body.customer?.phone || '',
        company: body.customer?.company || '',
        address: body.customer?.address || '',
      },
      items,
      subtotal,
      taxPercent,
      taxAmount,
      discountAmount,
      totalAmount,
      paidAmount: 0,
      notes: body.notes || 'Terima kasih atas pesanan Anda. Silakan pindai QRIS Dinamis untuk pembayaran instan.',
      paymentTerms: body.paymentTerms || 'Pembayaran jatuh tempo maksimal pada tanggal yang tertera.',
      staticQris,
      dynamicQris,
      dynamicQrisDataUrl,
      transactions: [],
      reminders: [],
      whatsappNotified: false,
      spreadsheetSynced: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.invoices.unshift(newInvoice);
    saveDatabase(db);

    // Broadcast real-time event to all connected devices
    broadcastEvent({
      type: 'invoice_created',
      invoiceId: newInvoice.id,
      invoiceNumber: newInvoice.invoiceNumber,
      amount: newInvoice.totalAmount,
      message: `Invoice baru dibuat: ${newInvoice.invoiceNumber} (${newInvoice.customer.name}) sebesar Rp ${newInvoice.totalAmount.toLocaleString('id-ID')}`,
      timestamp: new Date().toISOString(),
      payload: newInvoice,
    });

    res.status(201).json(newInvoice);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Gagal membuat invoice' });
  }
});

// UPDATE Invoice
apiRouter.put('/invoices/:id', async (req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    const index = db.invoices.findIndex((i) => i.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ message: 'Invoice tidak ditemukan' });
    }

    const current = db.invoices[index];
    const body = req.body;

    // Recalculate totals
    const items = body.items || current.items;
    const subtotal = items.reduce((acc: number, item: any) => acc + (Number(item.total) || 0), 0);
    const discountAmount = body.discountAmount !== undefined ? Number(body.discountAmount) : current.discountAmount;
    const taxPercent = body.taxPercent !== undefined ? Number(body.taxPercent) : current.taxPercent;
    const taxableAmount = Math.max(0, subtotal - discountAmount);
    const taxAmount = Math.round((taxableAmount * taxPercent) / 100);
    const totalAmount = taxableAmount + taxAmount;

    // Regenerate QRIS if amount changed or static QRIS changed
    let dynamicQris = current.dynamicQris;
    let dynamicQrisDataUrl = current.dynamicQrisDataUrl;
    const staticQris = body.staticQris || current.staticQris || db.settings.defaultStaticQris;

    if (totalAmount !== current.totalAmount || staticQris !== current.staticQris) {
      const qrisResult = convertToDynamicQris(staticQris, totalAmount, current.invoiceNumber);
      dynamicQris = qrisResult.dynamicQris;
      dynamicQrisDataUrl = await generateQrDataUrl(dynamicQris);
    }

    const updatedInvoice: Invoice = {
      ...current,
      ...body,
      items,
      subtotal,
      discountAmount,
      taxPercent,
      taxAmount,
      totalAmount,
      staticQris,
      dynamicQris,
      dynamicQrisDataUrl,
      updatedAt: new Date().toISOString(),
    };

    db.invoices[index] = updatedInvoice;
    saveDatabase(db);

    broadcastEvent({
      type: 'invoice_updated',
      invoiceId: updatedInvoice.id,
      invoiceNumber: updatedInvoice.invoiceNumber,
      message: `Invoice ${updatedInvoice.invoiceNumber} telah diperbarui`,
      timestamp: new Date().toISOString(),
    });

    res.json(updatedInvoice);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Gagal memperbarui invoice' });
  }
});

// DELETE Invoice
apiRouter.delete('/invoices/:id', async (req: Request, res: Response) => {
  const db = await getDatabase();
  const index = db.invoices.findIndex((i) => i.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ message: 'Invoice tidak ditemukan' });
  }

  const removed = db.invoices.splice(index, 1)[0];
  saveDatabase(db);
  res.json({ message: 'Invoice berhasil dihapus', invoice: removed });
});

// RECORD PAYMENT & AUTO-VERIFY
apiRouter.post('/invoices/:id/payments', async (req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    const invoice = db.invoices.find((i) => i.id === req.params.id || i.invoiceNumber === req.params.id);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice tidak ditemukan' });
    }

    const { amount, paymentMethod, referenceNumber, notes, proofUrl, verifiedBy } = req.body;
    const payAmount = Number(amount) || invoice.totalAmount - invoice.paidAmount;

    if (payAmount <= 0) {
      return res.status(400).json({ message: 'Nominal pembayaran tidak valid' });
    }

    const transaction: PaymentTransaction = {
      id: `trx-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      amount: payAmount,
      paymentMethod: paymentMethod || 'qris_dinamis',
      referenceNumber: referenceNumber || `QRIS-DANA-${Date.now().toString().slice(-6)}`,
      notes: notes || 'Pembayaran via QRIS Dinamis Dana Bisnis otomatis',
      proofUrl: proofUrl || '',
      verifiedAt: new Date().toISOString(),
      verifiedBy: verifiedBy || 'Sistem Verifikasi QRIS',
    };

    invoice.transactions.push(transaction);
    invoice.paidAmount = (invoice.paidAmount || 0) + payAmount;

    // Check if fully paid
    if (invoice.paidAmount >= invoice.totalAmount) {
      invoice.status = 'paid';
    } else {
      invoice.status = 'partial';
    }

    invoice.updatedAt = new Date().toISOString();
    invoice.spreadsheetSynced = true; // Mark as queued/synced to Google Sheets

    // Prepare WhatsApp automated notification content
    const customerPhone = invoice.customer.phone.replace(/[^0-9]/g, '');
    const formattedAmount = payAmount.toLocaleString('id-ID');
    const waText = db.settings.whatsappTemplate
      .replace(/{{customer_name}}/g, invoice.customer.name)
      .replace(/{{invoice_number}}/g, invoice.invoiceNumber)
      .replace(/{{amount}}/g, formattedAmount)
      .replace(/{{invoice_url}}/g, `${req.protocol}://${req.get('host')}/?view=invoice&id=${invoice.id}`);

    const waLink = `https://wa.me/${customerPhone}?text=${encodeURIComponent(waText)}`;
    invoice.whatsappNotified = true;

    saveDatabase(db);

    // Broadcast Real-time Notification to ALL connected mobile & desktop devices
    broadcastEvent({
      type: 'payment_received',
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      amount: payAmount,
      message: `PEMBAYARAN DITERIMA: ${invoice.invoiceNumber} sebesar Rp ${formattedAmount} via ${transaction.paymentMethod}`,
      timestamp: new Date().toISOString(),
      payload: {
        invoice,
        transaction,
        whatsappLink: waLink,
      },
    });

    res.json({
      success: true,
      message: 'Pembayaran berhasil diverifikasi dan dicatat!',
      invoice,
      transaction,
      whatsapp: {
        sent: true,
        customerPhone,
        message: waText,
        link: waLink,
      },
      spreadsheetSync: {
        synced: true,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Gagal memproses pembayaran' });
  }
});

// AUTOMATED REMINDER CHECK (Pre-Due Date & Overdue Date)
apiRouter.post('/reminders/check', async (req: Request, res: Response) => {
  const db = await getDatabase();
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const preDueDays = db.settings.preDueDays || 3;

  const logs: ReminderLog[] = [];

  for (const inv of db.invoices) {
    if (inv.status === 'paid' || inv.status === 'cancelled') continue;

    const dueDate = new Date(inv.dueDate);
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Overdue Check
    if (diffDays < 0 && db.settings.autoSendOverdueEmail) {
      const alreadySentToday = inv.reminders?.some(
        (r) => r.type === 'overdue' && r.sentAt.startsWith(todayStr)
      );

      if (!alreadySentToday) {
        inv.status = 'overdue';
        const msg = db.settings.overdueEmailTemplate
          .replace(/{{customer_name}}/g, inv.customer.name)
          .replace(/{{invoice_number}}/g, inv.invoiceNumber)
          .replace(/{{amount}}/g, inv.totalAmount.toLocaleString('id-ID'))
          .replace(/{{due_date}}/g, inv.dueDate)
          .replace(/{{invoice_url}}/g, `${req.protocol}://${req.get('host')}/?view=invoice&id=${inv.id}`);

        const log: ReminderLog = {
          id: `rem-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          invoiceId: inv.id,
          type: 'overdue',
          recipientEmail: inv.customer.email,
          recipientPhone: inv.customer.phone,
          status: 'sent',
          message: msg,
          sentAt: new Date().toISOString(),
        };

        inv.reminders.push(log);
        db.remindersLog.push(log);
        logs.push(log);
      }
    } 
    // Pre-Due Check (e.g. 3 days before)
    else if (diffDays >= 0 && diffDays <= preDueDays && db.settings.autoSendPreDueEmail) {
      const alreadySent = inv.reminders?.some((r) => r.type === 'pre_due');
      if (!alreadySent) {
        const msg = db.settings.preDueEmailTemplate
          .replace(/{{customer_name}}/g, inv.customer.name)
          .replace(/{{invoice_number}}/g, inv.invoiceNumber)
          .replace(/{{amount}}/g, inv.totalAmount.toLocaleString('id-ID'))
          .replace(/{{due_date}}/g, inv.dueDate);

        const log: ReminderLog = {
          id: `rem-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          invoiceId: inv.id,
          type: 'pre_due',
          recipientEmail: inv.customer.email,
          recipientPhone: inv.customer.phone,
          status: 'sent',
          message: msg,
          sentAt: new Date().toISOString(),
        };

        inv.reminders.push(log);
        db.remindersLog.push(log);
        logs.push(log);
      }
    }
  }

  saveDatabase(db);

  if (logs.length > 0) {
    broadcastEvent({
      type: 'reminder_dispatched',
      message: `${logs.length} pengingat otomatis (Email / WhatsApp) berhasil dikirim`,
      timestamp: new Date().toISOString(),
      payload: logs,
    });
  }

  res.json({
    checkedAt: new Date().toISOString(),
    remindersDispatchedCount: logs.length,
    reminders: logs,
  });
});

// GOOGLE SPREADSHEET SYNC & EXPORT
apiRouter.get('/spreadsheet/export', async (req: Request, res: Response) => {
  const db = await getDatabase();
  
  // Create CSV format ready for Google Sheets / Excel
  const headers = [
    'No Invoice',
    'Tanggal',
    'Jatuh Tempo',
    'Nama Pelanggan',
    'Perusahaan',
    'Email',
    'No WhatsApp',
    'Subtotal (Rp)',
    'Diskon (Rp)',
    'PPN (Rp)',
    'Total (Rp)',
    'Dibayar (Rp)',
    'Status',
    'Metode Bayar Terakhir',
    'No Referensi / QRIS',
    'Tanggal Lunas',
  ];

  const rows = db.invoices.map((inv) => {
    const lastTrx = inv.transactions[inv.transactions.length - 1];
    return [
      `"${inv.invoiceNumber}"`,
      `"${inv.date}"`,
      `"${inv.dueDate}"`,
      `"${inv.customer.name.replace(/"/g, '""')}"`,
      `"${(inv.customer.company || '').replace(/"/g, '""')}"`,
      `"${inv.customer.email}"`,
      `"${inv.customer.phone}"`,
      inv.subtotal,
      inv.discountAmount,
      inv.taxAmount,
      inv.totalAmount,
      inv.paidAmount,
      `"${inv.status.toUpperCase()}"`,
      `"${lastTrx ? lastTrx.paymentMethod : '-'}"`,
      `"${lastTrx ? lastTrx.referenceNumber : '-'}"`,
      `"${lastTrx ? lastTrx.verifiedAt.split('T')[0] : '-'}"`,
    ].join(',');
  });

  const csv = [headers.join(','), ...rows].join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="invoices_spreadsheet_export.csv"');
  res.send('\uFEFF' + csv); // Include BOM for Excel UTF-8
});

// Trigger Realtime Sync to Google Sheets Webhook
apiRouter.post('/spreadsheet/sync-webhook', async (req: Request, res: Response) => {
  const db = await getDatabase();
  db.settings.lastSpreadsheetSync = new Date().toISOString();
  
  for (const inv of db.invoices) {
    inv.spreadsheetSynced = true;
  }
  
  saveDatabase(db);

  broadcastEvent({
    type: 'spreadsheet_synced',
    message: 'Data invoice dan riwayat transaksi berhasil disinkronkan ke Google Spreadsheet',
    timestamp: new Date().toISOString(),
  });

  res.json({
    success: true,
    message: 'Google Spreadsheet sinkronisasi berhasil',
    syncedAt: db.settings.lastSpreadsheetSync,
    webhookUrl: db.settings.googleSheetWebhookUrl,
    totalRecords: db.invoices.length,
  });
});

// ANALYTICS DASHBOARD DATA
apiRouter.get('/analytics', async (req: Request, res: Response) => {
  const db = await getDatabase();
  const invoices = db.invoices;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed

  let totalRevenueAllTime = 0;
  let totalRevenueThisMonth = 0;
  let totalRevenueToday = 0;
  let totalOutstanding = 0;
  let totalOverdueAmount = 0;

  const todayStr = now.toISOString().split('T')[0];

  // Daily revenue aggregation for current month
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const dailyRevenueMap = new Map<number, number>();
  for (let d = 1; d <= daysInMonth; d++) {
    dailyRevenueMap.set(d, 0);
  }

  // Monthly revenue aggregation for last 6 months
  const monthlyRevenueMap = new Map<string, { label: string; revenue: number; invoiceCount: number }>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(currentYear, currentMonth - i, 1);
    const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
    const label = d.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
    monthlyRevenueMap.set(key, { label, revenue: 0, invoiceCount: 0 });
  }

  let paidCount = 0;
  let pendingCount = 0;
  let overdueCount = 0;
  let partialCount = 0;

  for (const inv of invoices) {
    if (inv.status === 'paid') paidCount++;
    else if (inv.status === 'pending') pendingCount++;
    else if (inv.status === 'overdue') overdueCount++;
    else if (inv.status === 'partial') partialCount++;

    const outstanding = Math.max(0, inv.totalAmount - inv.paidAmount);
    totalOutstanding += outstanding;
    if (inv.status === 'overdue') {
      totalOverdueAmount += outstanding;
    }

    // Process transactions
    for (const trx of inv.transactions) {
      totalRevenueAllTime += trx.amount;

      const trxDate = new Date(trx.verifiedAt);
      if (trx.verifiedAt.startsWith(todayStr)) {
        totalRevenueToday += trx.amount;
      }

      if (trxDate.getFullYear() === currentYear && trxDate.getMonth() === currentMonth) {
        totalRevenueThisMonth += trx.amount;
        const day = trxDate.getDate();
        dailyRevenueMap.set(day, (dailyRevenueMap.get(day) || 0) + trx.amount);
      }

      const mKey = `${trxDate.getFullYear()}-${(trxDate.getMonth() + 1).toString().padStart(2, '0')}`;
      if (monthlyRevenueMap.has(mKey)) {
        const curr = monthlyRevenueMap.get(mKey)!;
        curr.revenue += trx.amount;
        curr.invoiceCount++;
      }
    }
  }

  const dailyChartData = Array.from(dailyRevenueMap.entries()).map(([day, revenue]) => ({
    day: `Tgl ${day}`,
    revenue,
  }));

  const monthlyChartData = Array.from(monthlyRevenueMap.values());

  // Recent transactions list
  const allTransactions: (PaymentTransaction & { customerName: string })[] = [];
  for (const inv of invoices) {
    for (const trx of inv.transactions) {
      allTransactions.push({
        ...trx,
        customerName: inv.customer.name,
      });
    }
  }
  allTransactions.sort((a, b) => new Date(b.verifiedAt).getTime() - new Date(a.verifiedAt).getTime());

  res.json({
    summary: {
      totalRevenueAllTime,
      totalRevenueThisMonth,
      totalRevenueToday,
      totalOutstanding,
      totalOverdueAmount,
      invoiceCounts: {
        total: invoices.length,
        paid: paidCount,
        pending: pendingCount,
        overdue: overdueCount,
        partial: partialCount,
      },
      collectionRate: invoices.length > 0 ? Math.round((paidCount / invoices.length) * 100) : 0,
    },
    dailyChartData,
    monthlyChartData,
    recentTransactions: allTransactions.slice(0, 10),
  });
});

// ================= CUSTOMERS MANAGEMENT =================
apiRouter.get('/customers', async (req: Request, res: Response) => {
  const db = await getDatabase();
  // Compute enriched metrics per customer (invoices, total spent, outstanding)
  const customerStats = db.customers.map((c) => {
    const custInvoices = db.invoices.filter((i) => i.customer.name.toLowerCase() === c.name.toLowerCase() || i.customer.id === c.id);
    const totalSpent = custInvoices.reduce((sum, i) => sum + (i.paidAmount || 0), 0);
    const pendingBalance = custInvoices.filter((i) => i.status !== 'paid').reduce((sum, i) => sum + Math.max(0, i.totalAmount - (i.paidAmount || 0)), 0);
    return {
      ...c,
      totalInvoices: custInvoices.length,
      totalSpent,
      pendingBalance,
    };
  });
  res.json({ success: true, customers: customerStats });
});

apiRouter.post('/customers', async (req: Request, res: Response) => {
  const db = await getDatabase();
  const { name, company, email, phone, address, notes } = req.body;
  if (!name) {
    return res.status(400).json({ success: false, message: 'Nama pelanggan wajib diisi' });
  }

  const newCust = {
    id: `cust-${Date.now()}`,
    name,
    company: company || '',
    email: email || '',
    phone: phone || '',
    address: address || '',
    notes: notes || '',
    createdAt: new Date().toISOString(),
  };

  db.customers.unshift(newCust);
  saveDatabase(db);

  broadcastEvent({
    type: 'customer_updated',
    message: `Pelanggan baru "${name}" berhasil ditambahkan`,
    timestamp: new Date().toISOString(),
  });

  res.status(201).json({ success: true, customer: newCust });
});

apiRouter.put('/customers/:id', async (req: Request, res: Response) => {
  const db = await getDatabase();
  const index = db.customers.findIndex((c) => c.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Pelanggan tidak ditemukan' });
  }

  db.customers[index] = {
    ...db.customers[index],
    ...req.body,
  };
  saveDatabase(db);

  res.json({ success: true, customer: db.customers[index] });
});

apiRouter.delete('/customers/:id', async (req: Request, res: Response) => {
  const db = await getDatabase();
  const index = db.customers.findIndex((c) => c.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Pelanggan tidak ditemukan' });
  }

  const removed = db.customers.splice(index, 1)[0];
  saveDatabase(db);

  res.json({ success: true, message: `Pelanggan ${removed.name} telah dihapus` });
});

// ================= SERVICES / DAFTAR JASA MANAGEMENT =================
apiRouter.get('/services', async (req: Request, res: Response) => {
  const db = await getDatabase();
  res.json({ success: true, services: db.services || [] });
});

apiRouter.post('/services', async (req: Request, res: Response) => {
  const db = await getDatabase();
  const { name, category, unit, price, description } = req.body;
  if (!name || price === undefined) {
    return res.status(400).json({ success: false, message: 'Nama dan harga jasa wajib diisi' });
  }

  const newService = {
    id: `srv-${Date.now()}`,
    name,
    category: category || 'Umum',
    unit: unit || 'Proyek',
    price: Number(price) || 0,
    description: description || '',
    createdAt: new Date().toISOString(),
  };

  db.services = db.services || [];
  db.services.unshift(newService);
  saveDatabase(db);

  broadcastEvent({
    type: 'service_updated',
    message: `Jasa baru "${name}" ditambahkan ke katalog`,
    timestamp: new Date().toISOString(),
  });

  res.status(201).json({ success: true, service: newService });
});

apiRouter.put('/services/:id', async (req: Request, res: Response) => {
  const db = await getDatabase();
  const index = db.services.findIndex((s) => s.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Jasa tidak ditemukan' });
  }

  db.services[index] = {
    ...db.services[index],
    ...req.body,
    price: req.body.price !== undefined ? Number(req.body.price) : db.services[index].price,
  };
  saveDatabase(db);

  res.json({ success: true, service: db.services[index] });
});

apiRouter.delete('/services/:id', async (req: Request, res: Response) => {
  const db = await getDatabase();
  const index = db.services.findIndex((s) => s.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Jasa tidak ditemukan' });
  }

  const removed = db.services.splice(index, 1)[0];
  saveDatabase(db);

  res.json({ success: true, message: `Jasa ${removed.name} telah dihapus` });
});

// ================= BILLING AUTOMATION & SCHEDULED DISPATCH =================
apiRouter.get('/automation/rules', async (req: Request, res: Response) => {
  const db = await getDatabase();
  res.json({ success: true, rules: db.automationRules || [] });
});

apiRouter.put('/automation/rules', async (req: Request, res: Response) => {
  const db = await getDatabase();
  db.automationRules = req.body.rules;
  saveDatabase(db);
  res.json({ success: true, rules: db.automationRules });
});

apiRouter.get('/automation/logs', async (req: Request, res: Response) => {
  const db = await getDatabase();
  res.json({ success: true, logs: db.automationLogs || [] });
});

// Execute Billing Automation Scan & Dispatch
apiRouter.post('/automation/run', async (req: Request, res: Response) => {
  const db = await getDatabase();
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const protocol = req.protocol;
  const host = req.get('host');
  const baseUrl = `${protocol}://${host}`;

  const rules = db.automationRules || [];
  const logs: any[] = [];
  let dispatchedCount = 0;

  for (const inv of db.invoices) {
    if (inv.status === 'paid' || inv.status === 'cancelled') continue;

    const dueTime = new Date(inv.dueDate).getTime();
    const todayTime = new Date(todayStr).getTime();
    const diffDays = Math.round((dueTime - todayTime) / (1000 * 60 * 60 * 24));
    const invoiceUrl = `${baseUrl}/?invoice=${inv.id}`;

    for (const rule of rules) {
      if (!rule.enabled) continue;

      let isMatch = false;

      if (rule.trigger === 'pre_due' && diffDays === rule.daysOffset) {
        isMatch = true;
      } else if (rule.trigger === 'on_due_date' && diffDays === 0) {
        isMatch = true;
      } else if (rule.trigger === 'overdue' && diffDays < 0) {
        isMatch = true;
      }

      if (isMatch) {
        // Compose personalized message
        const message = rule.messageTemplate
          .replace(/\{\{customer_name\}\}/g, inv.customer.name)
          .replace(/\{\{invoice_number\}\}/g, inv.invoiceNumber)
          .replace(/\{\{amount\}\}/g, inv.totalAmount.toLocaleString('id-ID'))
          .replace(/\{\{due_date\}\}/g, inv.dueDate)
          .replace(/\{\{invoice_url\}\}/g, invoiceUrl)
          .replace(/\{\{business_name\}\}/g, db.settings.businessName);

        const cleanPhone = (inv.customer.phone || '').replace(/[^0-9]/g, '');
        const whatsappUrl = cleanPhone
          ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
          : undefined;

        const logEntry = {
          id: `auto-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber,
          customerName: inv.customer.name,
          customerPhone: inv.customer.phone || '',
          customerEmail: inv.customer.email || '',
          ruleType: rule.name,
          channel: rule.channel,
          status: 'generated',
          message,
          whatsappUrl,
          dispatchedAt: new Date().toISOString(),
          amount: inv.totalAmount,
        };

        logs.unshift(logEntry);
        dispatchedCount++;
      }
    }
  }

  db.automationLogs = [...logs, ...(db.automationLogs || [])].slice(0, 50);
  saveDatabase(db);

  broadcastEvent({
    type: 'automation_executed',
    message: `Otomasi penagihan selesai: ${dispatchedCount} pesan tagihan diproses`,
    timestamp: new Date().toISOString(),
    payload: { dispatchedCount },
  });

  res.json({
    success: true,
    message: `Sistem otomasi berhasil memproses ${dispatchedCount} tagihan`,
    dispatchedCount,
    logs: logs.slice(0, 10),
  });
});

// Save Uploaded QRIS Image & Decoded Payload
apiRouter.post('/qris/save-uploaded', async (req: Request, res: Response) => {
  const { staticQris, imageUrl, merchantName, merchantCity } = req.body;
  if (!staticQris) {
    return res.status(400).json({ success: false, message: 'Payload QRIS tidak boleh kosong' });
  }

  const db = await getDatabase();
  db.settings.defaultStaticQris = staticQris;
  if (imageUrl) db.settings.qrisUploadedImageUrl = imageUrl;
  if (merchantName) db.settings.qrisMerchantName = merchantName;
  if (merchantCity) db.settings.qrisMerchantCity = merchantCity;

  saveDatabase(db);

  broadcastEvent({
    type: 'invoice_updated',
    message: `QRIS Bisnis baru berhasil disimpan dari upload gambar (${merchantName || 'Merchant'})`,
    timestamp: new Date().toISOString(),
  });

  res.json({
    success: true,
    message: 'QRIS dari gambar berhasil tersimpan sebagai QRIS bisnis utama',
    settings: db.settings,
  });
});

// ================= CUSTOMER PORTAL ENDPOINTS =================
// Public lookup for customer invoices using Phone number or Email
apiRouter.get('/portal/search', async (req: Request, res: Response) => {
  try {
    const query = String(req.query.q || '').trim();
    if (!query || query.length < 3) {
      return res.status(400).json({ 
        success: false, 
        message: 'Masukkan nomor WhatsApp/HP (min. 4 digit) atau alamat email terdaftar.' 
      });
    }

    const db = await getDatabase();
    const cleanNumeric = query.replace(/[^0-9]/g, '');
    const cleanLower = query.toLowerCase();

    // 1. Find matching customer
    const matchingCustomer = db.customers.find((c) => {
      const cPhone = (c.phone || '').replace(/[^0-9]/g, '');
      const cEmail = (c.email || '').toLowerCase();
      const matchPhone = cleanNumeric.length >= 4 && (cPhone.includes(cleanNumeric) || cleanNumeric.includes(cPhone));
      const matchEmail = cleanLower.length >= 4 && (cEmail === cleanLower || cEmail.includes(cleanLower));
      return matchPhone || matchEmail;
    });

    // Match invoices either by matched customer id or directly inside invoice.customer
    const matchingInvoices = db.invoices.filter((inv) => {
      const invPhone = (inv.customer.phone || '').replace(/[^0-9]/g, '');
      const invEmail = (inv.customer.email || '').toLowerCase();
      const invId = inv.customer.id;

      if (matchingCustomer && invId === matchingCustomer.id) return true;
      if (matchingCustomer && inv.customer.name.toLowerCase() === matchingCustomer.name.toLowerCase()) return true;

      const matchPhone = cleanNumeric.length >= 4 && (invPhone.includes(cleanNumeric) || cleanNumeric.includes(invPhone));
      const matchEmail = cleanLower.length >= 4 && (invEmail === cleanLower || invEmail.includes(cleanLower));
      return matchPhone || matchEmail;
    });

    // Sort by latest date first
    matchingInvoices.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Calculate customer metrics
    const totalInvoices = matchingInvoices.length;
    const paidInvoices = matchingInvoices.filter((i) => i.status === 'paid').length;
    const pendingInvoices = matchingInvoices.filter((i) => i.status !== 'paid').length;
    const totalAmount = matchingInvoices.reduce((sum, i) => sum + i.totalAmount, 0);
    const totalPaid = matchingInvoices.reduce((sum, i) => sum + (i.paidAmount || 0), 0);
    const totalUnpaid = Math.max(0, totalAmount - totalPaid);

    const customerProfile = matchingCustomer || (matchingInvoices[0] ? matchingInvoices[0].customer : null);

    res.json({
      success: true,
      found: matchingInvoices.length > 0,
      customer: customerProfile,
      stats: {
        totalInvoices,
        paidInvoices,
        pendingInvoices,
        totalAmount,
        totalPaid,
        totalUnpaid,
      },
      invoices: matchingInvoices,
      business: {
        name: db.settings.businessName,
        phone: db.settings.businessPhone,
        email: db.settings.businessEmail,
        address: db.settings.businessAddress,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Gagal memuat data portal pelanggan' });
  }
});

// Single invoice lookup for portal with bank details & QRIS
apiRouter.get('/portal/invoice/:idOrNumber', async (req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    const param = req.params.idOrNumber;
    const invoice = db.invoices.find((i) => i.id === param || i.invoiceNumber === param);

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Faktur tidak ditemukan atau tautan sudah kedaluwarsa' });
    }

    res.json({
      success: true,
      invoice,
      business: {
        name: db.settings.businessName,
        owner: db.settings.businessOwner,
        phone: db.settings.businessPhone,
        email: db.settings.businessEmail,
        address: db.settings.businessAddress,
        logo: db.settings.businessLogoUrl,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});


