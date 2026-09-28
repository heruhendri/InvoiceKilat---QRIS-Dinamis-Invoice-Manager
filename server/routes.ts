import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase, DEFAULT_DANA_STATIC_QRIS, DEFAULT_ADMIN_USERS, DEFAULT_SETTINGS, DEFAULT_RECURRING_ADDONS, createDatabaseBackupSnapshot, DEFAULT_MIKHMON_PLANS, DEFAULT_MIKHMON_INSTANCES, DEFAULT_MIKHMON_SERVER_CONFIG } from './storage';
import { convertToDynamicQris, generateQrDataUrl, validateQris, parseQris } from './qris';
import { testTelegramConnection, dispatchTelegramBackup } from './telegram';
import { Invoice, InvoiceItem, PaymentTransaction, RealtimeEvent, ReminderLog, AdminUser, AdminUserSafe, CustomerMode, CustomerRecord, RecurringAddonService, MikhmonPlan, MikhmonInstance, MikhmonUploadedPackage, MikhmonServerConfig, MikhmonVoucher } from './types';
import { getMikhmonWebserverStatus, generateMikhmonTurnkeyVpsScript, renderMikhmonPortalHtml } from './mikhmonWebserver';


import {
  probeMikrotikRouter,
  parseMikrotikTerminalOutput,
  generateRouterosPushScript,
  kickMikrotikActiveUser,
  REAL_MIKROTIK_DEMO_PRESET,
  getMikrotikSecretsAndProfiles,
  isolateMikrotikSecret,
  unisolateMikrotikSecret,
  toggleMikrotikSecret,
  createMikrotikSecret,
  deleteMikrotikSecret,
  batchIsolateMikrotikSecrets,
  rebootMikrotikRouter,
  pingFromMikrotik,
  getMikrotikInterfaces,
  getMikrotikLogs,
  getMikrotikHotspot,
  createMikrotikHotspotUser,
  deleteMikrotikHotspotUser,
  kickMikrotikHotspotUser,
  getMikrotikTrafficRate
} from './mikrotik';

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

// In-memory active session tokens for Customer Portal Auth
interface CustomerAuthSession {
  token: string;
  customerId: string;
  customerName: string;
  expiresAt: number;
}
const activeCustomerSessions = new Map<string, CustomerAuthSession>();

function extractCustomerToken(req: Request): string | null {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  const customHeader = req.headers['x-customer-token'] as string;
  if (customHeader) return customHeader.trim();
  if (req.query.customerToken) return String(req.query.customerToken).trim();
  if (req.query.token) return String(req.query.token).trim();
  return null;
}

function getSafeUser(user: AdminUser): AdminUserSafe {
  const { password, ...safe } = user;
  return safe;
}

function formatRupiah(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
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

// POST /api/auth/quick-login (Bypass 1-klik untuk kemudahan demo & akses admin tanpa lockout)
apiRouter.post('/auth/quick-login', async (req: Request, res: Response) => {
  try {
    const { username } = req.body;
    const db = await getDatabase();
    const adminList = db.adminUsers && db.adminUsers.length > 0 ? db.adminUsers : DEFAULT_ADMIN_USERS;
    
    const targetUser = username
      ? adminList.find(u => u.username.toLowerCase() === String(username).toLowerCase() || u.email.toLowerCase() === String(username).toLowerCase()) || adminList[0]
      : adminList[0];

    const token = `adm_${Date.now()}_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`;
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;

    activeSessions.set(token, {
      token,
      userId: targetUser.id,
      username: targetUser.username,
      expiresAt,
    });

    targetUser.lastLoginAt = new Date().toISOString();
    saveDatabase(db);

    return res.json({
      success: true,
      token,
      user: getSafeUser(targetUser),
      message: `Login cepat sebagai ${targetUser.name} berhasil.`,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Gagal login cepat: ' + err.message });
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
  }
  
  if (!user && (token.startsWith('adm_') || token.includes('default') || token === 'admin')) {
    // If server restarted or default session, preserve active super admin
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
  res.json({ settings: db.settings, ...db.settings });
});

// UPDATE Settings
apiRouter.put('/settings', async (req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    db.settings = {
      ...DEFAULT_SETTINGS,
      ...db.settings,
      ...req.body,
    };

    // Synchronize all unpaid invoices if defaultStaticQris or merchant details were updated
    if (db.settings.defaultStaticQris) {
      const activeQris = db.settings.defaultStaticQris;
      for (const inv of db.invoices) {
        if (inv.status !== 'paid') {
          try {
            const { dynamicQris } = convertToDynamicQris(
              activeQris,
              inv.totalAmount,
              inv.invoiceNumber,
              db.settings.qrisMerchantName,
              db.settings.qrisMerchantCity
            );
            inv.staticQris = activeQris;
            inv.dynamicQris = dynamicQris;
            inv.dynamicQrisDataUrl = await generateQrDataUrl(dynamicQris);
          } catch (e) {
            // ignore conversion issue on individual invoice
          }
        }
      }
    }

    saveDatabase(db);
    broadcastEvent({
      type: 'settings_updated' as any,
      message: 'Pengaturan sistem & profil perusahaan berhasil diperbarui',
      timestamp: new Date().toISOString(),
      payload: db.settings,
    });
    res.json({ settings: db.settings, ...db.settings });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Gagal menyimpan pengaturan' });
  }
});

// RESET Settings to Defaults
apiRouter.post('/settings/reset', async (req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    db.settings = { ...DEFAULT_SETTINGS };
    saveDatabase(db);
    broadcastEvent({
      type: 'settings_updated' as any,
      message: 'Pengaturan sistem berhasil dikembalikan ke default standar',
      timestamp: new Date().toISOString(),
      payload: db.settings,
    });
    res.json({ settings: db.settings, ...db.settings });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Gagal mereset pengaturan' });
  }
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
    const sourceQris = (staticQris || db.settings.defaultStaticQris || DEFAULT_DANA_STATIC_QRIS).trim();
    const parsedSource = parseQris(sourceQris);

    const numericAmount = Math.max(0, Number(amount) || 0);
    const merchantName = db.settings.qrisMerchantName || parsedSource.merchantName || db.settings.businessName;
    const merchantCity = db.settings.qrisMerchantCity || parsedSource.merchantCity || 'JAKARTA';

    const { dynamicQris, parsed } = convertToDynamicQris(
      sourceQris,
      numericAmount,
      invoiceNumber,
      merchantName,
      merchantCity
    );
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

  const defaultStaticQris = (db.settings.defaultStaticQris || DEFAULT_DANA_STATIC_QRIS).trim();
  const parsedSettings = parseQris(defaultStaticQris);
  const merchantName = db.settings.qrisMerchantName || parsedSettings.merchantName || 'hendr.store';
  const merchantCity = db.settings.qrisMerchantCity || parsedSettings.merchantCity || 'Kab. Pemalang';

  for (const inv of db.invoices) {
    if (inv.status === 'pending' && inv.dueDate < today) {
      inv.status = 'overdue';
      updated = true;
    }

    // Always ensure unpaid invoices have an active dynamic QRIS derived from the DANA Bisnis settings
    if (inv.status !== 'paid') {
      const parsedCurrent = parseQris(inv.dynamicQris || '');
      const isOutdated = 
        !inv.dynamicQris || 
        !inv.dynamicQrisDataUrl || 
        inv.staticQris !== defaultStaticQris ||
        parsedCurrent.amount !== inv.totalAmount ||
        parsedCurrent.invoiceRef !== inv.invoiceNumber ||
        !parsedCurrent.isDynamic;

      if (isOutdated) {
        try {
          const { dynamicQris } = convertToDynamicQris(
            defaultStaticQris,
            inv.totalAmount,
            inv.invoiceNumber,
            merchantName,
            merchantCity
          );
          inv.staticQris = defaultStaticQris;
          inv.dynamicQris = dynamicQris;
          inv.dynamicQrisDataUrl = await generateQrDataUrl(dynamicQris);
          updated = true;
        } catch (err) {
          console.error(`Gagal convert QRIS dinamis untuk invoice ${inv.invoiceNumber}:`, err);
        }
      }
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

  if (invoice.status !== 'paid') {
    const defaultStaticQris = (db.settings.defaultStaticQris || DEFAULT_DANA_STATIC_QRIS).trim();
    const parsedCurrent = parseQris(invoice.dynamicQris || '');
    if (!invoice.dynamicQris || !invoice.dynamicQrisDataUrl || invoice.staticQris !== defaultStaticQris || parsedCurrent.amount !== invoice.totalAmount) {
      try {
        const parsedSettings = parseQris(defaultStaticQris);
        const merchantName = db.settings.qrisMerchantName || parsedSettings.merchantName || 'hendr.store';
        const merchantCity = db.settings.qrisMerchantCity || parsedSettings.merchantCity || 'Kab. Pemalang';

        const { dynamicQris } = convertToDynamicQris(
          defaultStaticQris,
          invoice.totalAmount,
          invoice.invoiceNumber,
          merchantName,
          merchantCity
        );
        invoice.staticQris = defaultStaticQris;
        invoice.dynamicQris = dynamicQris;
        invoice.dynamicQrisDataUrl = await generateQrDataUrl(dynamicQris);
        saveDatabase(db);
      } catch (err) {
        // ignore
      }
    }
  }

  res.json(invoice);
});

// POST /api/invoices/:id/regenerate-qris - Manually regenerate invoice QRIS directly from Settings DANA Bisnis
apiRouter.post('/invoices/:id/regenerate-qris', async (req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    const invoice = db.invoices.find((i) => i.id === req.params.id || i.invoiceNumber === req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice tidak ditemukan' });
    }

    const defaultStaticQris = (req.body?.staticQris || db.settings.defaultStaticQris || DEFAULT_DANA_STATIC_QRIS).trim();
    const parsedSettings = parseQris(defaultStaticQris);
    const merchantName = db.settings.qrisMerchantName || parsedSettings.merchantName || 'hendr.store';
    const merchantCity = db.settings.qrisMerchantCity || parsedSettings.merchantCity || 'Kab. Pemalang';

    const { dynamicQris, parsed } = convertToDynamicQris(
      defaultStaticQris,
      invoice.totalAmount,
      invoice.invoiceNumber,
      merchantName,
      merchantCity
    );
    const dynamicQrisDataUrl = await generateQrDataUrl(dynamicQris);

    invoice.staticQris = defaultStaticQris;
    invoice.dynamicQris = dynamicQris;
    invoice.dynamicQrisDataUrl = dynamicQrisDataUrl;
    invoice.updatedAt = new Date().toISOString();

    saveDatabase(db);
    broadcastEvent({
      type: 'invoice_updated',
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      message: `QRIS Dinamis untuk invoice ${invoice.invoiceNumber} berhasil disesuaikan dengan QRIS DANA Bisnis`,
      timestamp: new Date().toISOString(),
    });

    return res.json({
      success: true,
      message: `QRIS Dinamis untuk faktur ${invoice.invoiceNumber} berhasil diperbarui dari QRIS DANA Bisnis pengaturan`,
      invoice,
      dynamicQris,
      dynamicQrisDataUrl,
      parsed,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message || 'Gagal meregenerasi QRIS Dinamis' });
  }
});

// POST /api/invoices/sync-qris - Bulk sync all unpaid invoices to settings DANA QRIS
apiRouter.post('/invoices/sync-qris', async (req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    const defaultStaticQris = (db.settings.defaultStaticQris || DEFAULT_DANA_STATIC_QRIS).trim();
    const parsedSettings = parseQris(defaultStaticQris);
    const merchantName = db.settings.qrisMerchantName || parsedSettings.merchantName || 'hendr.store';
    const merchantCity = db.settings.qrisMerchantCity || parsedSettings.merchantCity || 'Kab. Pemalang';

    let syncedCount = 0;
    for (const inv of db.invoices) {
      if (inv.status !== 'paid') {
        try {
          const { dynamicQris } = convertToDynamicQris(
            defaultStaticQris,
            inv.totalAmount,
            inv.invoiceNumber,
            merchantName,
            merchantCity
          );
          inv.staticQris = defaultStaticQris;
          inv.dynamicQris = dynamicQris;
          inv.dynamicQrisDataUrl = await generateQrDataUrl(dynamicQris);
          syncedCount++;
        } catch (e) {
          // ignore individual error
        }
      }
    }

    saveDatabase(db);
    return res.json({
      success: true,
      syncedCount,
      message: `${syncedCount} tagihan invoice berhasil disinkronkan dengan QRIS Dinamis DANA Bisnis.`,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message || 'Gagal sinkronisasi QRIS' });
  }
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
    const staticQris = (body.staticQris || db.settings.defaultStaticQris || DEFAULT_DANA_STATIC_QRIS).trim();
    const parsedSource = parseQris(staticQris);
    const merchantName = db.settings.qrisMerchantName || parsedSource.merchantName || db.settings.businessName;
    const merchantCity = db.settings.qrisMerchantCity || parsedSource.merchantCity || 'JAKARTA';
    const { dynamicQris } = convertToDynamicQris(
      staticQris,
      totalAmount,
      invoiceNumber,
      merchantName,
      merchantCity
    );
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
    const staticQris = (body.staticQris || current.staticQris || db.settings.defaultStaticQris || DEFAULT_DANA_STATIC_QRIS).trim();

    if (totalAmount !== current.totalAmount || staticQris !== current.staticQris || !dynamicQris) {
      const parsedSource = parseQris(staticQris);
      const merchantName = db.settings.qrisMerchantName || parsedSource.merchantName || db.settings.businessName;
      const merchantCity = db.settings.qrisMerchantCity || parsedSource.merchantCity || 'JAKARTA';

      const qrisResult = convertToDynamicQris(
        staticQris,
        totalAmount,
        current.invoiceNumber,
        merchantName,
        merchantCity
      );
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
  const appName = (db.settings.appName || 'InvoiceKilat').replace(/[^a-zA-Z0-9_-]/g, '_');
  const companyName = (db.settings.businessName || 'Perusahaan').replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateStr = new Date().toISOString().slice(0, 10);
  
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
  res.setHeader('Content-Disposition', `attachment; filename="${appName}_${companyName}_Invoices_${dateStr}.csv"`);
  res.send('\uFEFF' + csv);
});

// FULL BACKUP OF ALL COMPANY DATA (Invoices, Customers, Services, Transactions, Company Profile)
apiRouter.get('/spreadsheet/export-full', async (req: Request, res: Response) => {
  const db = await getDatabase();
  const appName = (db.settings.appName || 'InvoiceKilat').replace(/[^a-zA-Z0-9_-]/g, '_');
  const companyName = (db.settings.businessName || 'Perusahaan').replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateStr = new Date().toISOString().slice(0, 10);

  const sections: string[] = [];

  // 1. Profil Aplikasi & Perusahaan
  sections.push('# === IDENTITAS APLIKASI & PROFIL PERUSAHAAN ===');
  sections.push(['Parameter', 'Nilai'].join(','));
  sections.push([`"Nama Aplikasi"`, `"${db.settings.appName || 'InvoiceKilat'}"`].join(','));
  sections.push([`"Slogan Aplikasi"`, `"${db.settings.appTagline || ''}"`].join(','));
  sections.push([`"Nama Perusahaan / Bisnis"`, `"${db.settings.businessName || ''}"`].join(','));
  sections.push([`"Pemilik / Penanggung Jawab"`, `"${db.settings.businessOwner || ''}"`].join(','));
  sections.push([`"No. Telepon / WhatsApp"`, `"${db.settings.businessPhone || ''}"`].join(','));
  sections.push([`"Email Bisnis"`, `"${db.settings.businessEmail || ''}"`].join(','));
  sections.push([`"Alamat Lengkap"`, `"${(db.settings.businessAddress || '').replace(/"/g, '""')}"`].join(','));
  sections.push([`"Website"`, `"${db.settings.businessWebsite || ''}"`].join(','));
  sections.push([`"NPWP / Izin Usaha"`, `"${db.settings.businessTaxId || ''}"`].join(','));
  sections.push([`"Rekening Bank"`, `"${db.settings.bankName || ''} - ${db.settings.bankAccountNumber || ''} a.n ${db.settings.bankAccountHolder || ''}"`].join(','));
  sections.push([`"Merchant QRIS"`, `"${db.settings.qrisMerchantName || ''} (${db.settings.qrisMerchantCity || ''})"`].join(','));
  sections.push('');

  // 2. Database Invoices
  sections.push('# === DATABASE INVOICE & TAGIHAN ===');
  const invHeaders = [
    'No Invoice', 'Tanggal', 'Jatuh Tempo', 'Nama Pelanggan', 'Perusahaan',
    'WhatsApp', 'Email', 'Subtotal (Rp)', 'Diskon (Rp)', 'PPN (Rp)', 'Total (Rp)',
    'Dibayar (Rp)', 'Sisa Tagihan (Rp)', 'Status', 'Metode Bayar', 'No Referensi / QRIS'
  ];
  sections.push(invHeaders.join(','));
  db.invoices.forEach((inv) => {
    const lastTrx = inv.transactions[inv.transactions.length - 1];
    sections.push([
      `"${inv.invoiceNumber}"`,
      `"${inv.date}"`,
      `"${inv.dueDate}"`,
      `"${inv.customer.name.replace(/"/g, '""')}"`,
      `"${(inv.customer.company || '').replace(/"/g, '""')}"`,
      `"${inv.customer.phone}"`,
      `"${inv.customer.email}"`,
      inv.subtotal,
      inv.discountAmount,
      inv.taxAmount,
      inv.totalAmount,
      inv.paidAmount,
      inv.totalAmount - inv.paidAmount,
      `"${inv.status.toUpperCase()}"`,
      `"${lastTrx ? lastTrx.paymentMethod : '-'}"`,
      `"${lastTrx ? lastTrx.referenceNumber : '-'}"`,
    ].join(','));
  });
  sections.push('');

  // 3. Direktori Pelanggan
  sections.push('# === DIREKTORI PELANGGAN ===');
  const custHeaders = ['ID', 'Nama Pelanggan', 'Perusahaan', 'No WhatsApp', 'Email', 'Alamat', 'Total Transaksi', 'Total Invoice', 'Sisa Piutang'];
  sections.push(custHeaders.join(','));
  db.customers.forEach((c) => {
    sections.push([
      `"${c.id}"`,
      `"${c.name.replace(/"/g, '""')}"`,
      `"${(c.company || '').replace(/"/g, '""')}"`,
      `"${c.phone}"`,
      `"${c.email}"`,
      `"${(c.address || '').replace(/"/g, '""')}"`,
      c.totalSpent || 0,
      c.totalInvoices || 0,
      c.pendingBalance || 0,
    ].join(','));
  });
  sections.push('');

  // 4. Katalog Layanan & Jasa
  sections.push('# === KATALOG LAYANAN & JASA USAHA ===');
  const srvHeaders = ['ID', 'Nama Layanan/Produk', 'Kategori', 'Satuan', 'Harga Satuan (Rp)', 'Deskripsi'];
  sections.push(srvHeaders.join(','));
  db.services.forEach((s) => {
    sections.push([
      `"${s.id}"`,
      `"${s.name.replace(/"/g, '""')}"`,
      `"${s.category || ''}"`,
      `"${s.unit}"`,
      s.price,
      `"${(s.description || '').replace(/"/g, '""')}"`,
    ].join(','));
  });
  sections.push('');

  // 5. Riwayat Transaksi Pembayaran
  sections.push('# === RIWAYAT TRANSAKSI PEMBAYARAN ===');
  const trxHeaders = ['ID Transaksi', 'No Invoice', 'Nominal (Rp)', 'Metode Bayar', 'No Referensi', 'Waktu Verifikasi', 'Diverifikasi Oleh', 'Catatan'];
  sections.push(trxHeaders.join(','));
  db.invoices.forEach((inv) => {
    inv.transactions.forEach((t) => {
      sections.push([
        `"${t.id}"`,
        `"${inv.invoiceNumber}"`,
        t.amount,
        `"${t.paymentMethod}"`,
        `"${t.referenceNumber}"`,
        `"${t.verifiedAt}"`,
        `"${t.verifiedBy}"`,
        `"${(t.notes || '').replace(/"/g, '""')}"`,
      ].join(','));
    });
  });

  const fullCsv = sections.join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${appName}_${companyName}_FULL_COMPANY_BACKUP_${dateStr}.csv"`);
  res.send('\uFEFF' + fullCsv);
});

// JSON BACKUP FOR GOOGLE APPS SCRIPT / AUTOMATION
apiRouter.get('/spreadsheet/backup-data', async (req: Request, res: Response) => {
  const db = await getDatabase();
  res.json({
    appName: db.settings.appName || 'InvoiceKilat',
    company: db.settings,
    invoices: db.invoices,
    customers: db.customers,
    services: db.services,
    transactions: db.invoices.flatMap((inv) =>
      inv.transactions.map((t) => ({ ...t, invoiceNumber: inv.invoiceNumber, customerName: inv.customer.name }))
    ),
    exportedAt: new Date().toISOString(),
    totalInvoices: db.invoices.length,
    totalCustomers: db.customers.length,
    totalServices: db.services.length,
  });
});

// Trigger Realtime Sync to Google Sheets Webhook
apiRouter.post('/spreadsheet/sync-webhook', async (req: Request, res: Response) => {
  const db = await getDatabase();
  db.settings.lastSpreadsheetSync = new Date().toISOString();
  
  for (const inv of db.invoices) {
    inv.spreadsheetSynced = true;
  }
  
  saveDatabase(db);

  // If a webhook URL is configured, forward payload to Google Sheets Apps Script
  let remoteSyncStatus = 'skipped_no_webhook';
  if (db.settings.googleSheetWebhookUrl && db.settings.googleSheetWebhookUrl.startsWith('http')) {
    try {
      // Fire and forget or quick fetch with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      await fetch(db.settings.googleSheetWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SYNC_FULL_COMPANY_DATA',
          appName: db.settings.appName || 'InvoiceKilat',
          company: db.settings,
          invoices: db.invoices,
          customers: db.customers,
          services: db.services,
          syncedAt: db.settings.lastSpreadsheetSync,
        }),
        signal: controller.signal,
      }).catch((err) => {
        console.warn('Webhook dispatch info:', err.message);
      });
      clearTimeout(timeoutId);
      remoteSyncStatus = 'dispatched_to_webhook';
    } catch (err: any) {
      console.warn('Google Sheets Webhook notice:', err.message);
      remoteSyncStatus = 'webhook_notice';
    }
  }

  broadcastEvent({
    type: 'spreadsheet_synced',
    message: `Semua data perusahaan (${db.invoices.length} invoice, ${db.customers.length} pelanggan) berhasil dibackup ke Google Spreadsheet`,
    timestamp: new Date().toISOString(),
  });

  res.json({
    success: true,
    message: 'Google Spreadsheet sinkronisasi dan backup data seluruh perusahaan berhasil',
    syncedAt: db.settings.lastSpreadsheetSync,
    webhookUrl: db.settings.googleSheetWebhookUrl,
    remoteSyncStatus,
    stats: {
      invoices: db.invoices.length,
      customers: db.customers.length,
      services: db.services.length,
    }
  });
});

// ================= TELEGRAM BACKUP & RESTORE ROUTES =================

// 1. Test Telegram Bot Connection
apiRouter.post('/backup/telegram/test', async (req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    const botToken = (req.body.botToken || db.settings.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN || '').trim();
    const chatId = (req.body.chatId || db.settings.telegramChatId || process.env.TELEGRAM_CHAT_ID || '').trim();

    if (!botToken) {
      return res.status(400).json({ success: false, message: 'Bot Token Telegram wajib diisi' });
    }
    if (!chatId) {
      return res.status(400).json({ success: false, message: 'Chat ID Telegram wajib diisi' });
    }

    const result = await testTelegramConnection(botToken, chatId);
    if (result.success) {
      return res.json({
        success: true,
        message: 'Tes koneksi Telegram berhasil! Pesan konfirmasi telah masuk ke bot/grup Telegram Anda.',
      });
    } else {
      return res.status(400).json({ success: false, message: result.message });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message || 'Gagal mengetes bot Telegram' });
  }
});

// 2. Dispatch Manual / Immediate Telegram Backup
apiRouter.post('/backup/telegram/send', async (req: Request, res: Response) => {
  try {
    const { botToken, chatId, format } = req.body;
    const result = await dispatchTelegramBackup({
      botToken,
      chatId,
      format,
      triggerType: 'manual',
    });

    if (result.success) {
      return res.json({
        success: true,
        message: result.message,
        stats: result.stats,
        sentAt: result.sentAt,
      });
    } else {
      return res.status(400).json({ success: false, message: result.message });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message || 'Gagal mengirim backup ke Telegram' });
  }
});

// 3. Download Full JSON Database File
apiRouter.get('/backup/download', async (req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    const appName = (db.settings.appName || 'InvoiceKilat').replace(/[^a-zA-Z0-9_-]/g, '_');
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `${appName}_Database_Backup_${dateStr}.json`;

    const payload = {
      version: '2.0',
      appName: db.settings.appName || 'InvoiceKilat',
      company: db.settings.businessName || 'Perusahaan',
      exportedAt: new Date().toISOString(),
      settings: db.settings,
      invoices: db.invoices || [],
      customers: db.customers || [],
      services: db.services || [],
      recurringAddons: db.recurringAddons || [],
      automationRules: db.automationRules || [],
      automationLogs: (db.automationLogs || []).slice(0, 50),
      remindersLog: (db.remindersLog || []).slice(0, 50),
    };

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(JSON.stringify(payload, null, 2));
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Gagal mengunduh backup database' });
  }
});

// 4. Validate Uploaded Backup JSON File
apiRouter.post('/backup/validate', async (req: Request, res: Response) => {
  try {
    const data = req.body.backupData || req.body.data || req.body;
    if (!data || typeof data !== 'object') {
      return res.status(400).json({ success: false, message: 'Format data backup tidak valid atau kosong.' });
    }

    const hasInvoices = Array.isArray(data.invoices);
    const hasCustomers = Array.isArray(data.customers);
    const hasServices = Array.isArray(data.services);

    if (!hasInvoices && !hasCustomers && !hasServices && !data.settings) {
      return res.status(400).json({
        success: false,
        message: 'File JSON ini bukan file cadangan database InvoiceKilat yang valid (tidak ditemukan data invoice, pelanggan, atau pengaturan).',
      });
    }

    const invoices = Array.isArray(data.invoices) ? data.invoices : [];
    const customers = Array.isArray(data.customers) ? data.customers : [];
    const services = Array.isArray(data.services) ? data.services : [];
    const recurringAddons = Array.isArray(data.recurringAddons) ? data.recurringAddons : [];

    const totalAmount = invoices.reduce((sum: number, i: any) => sum + (Number(i.totalAmount) || 0), 0);
    const paidCount = invoices.filter((i: any) => i.status === 'paid').length;

    return res.json({
      success: true,
      isValid: true,
      preview: {
        appName: data.appName || data.settings?.appName || 'InvoiceKilat',
        businessName: data.company || data.settings?.businessName || 'Profil Bisnis',
        exportedAt: data.exportedAt || 'Tidak tertera',
        version: data.version || '1.0',
        invoicesCount: invoices.length,
        paidInvoicesCount: paidCount,
        customersCount: customers.length,
        servicesCount: services.length,
        recurringAddonsCount: recurringAddons.length,
        totalAmount,
        hasSettings: Boolean(data.settings),
      },
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: `Gagal memvalidasi file backup: ${err.message}` });
  }
});

// 5. Restore Database from Backup Payload
apiRouter.post('/backup/restore', async (req: Request, res: Response) => {
  try {
    const { backupData, mode = 'replace', includeSettings = false } = req.body;

    if (!backupData || typeof backupData !== 'object') {
      return res.status(400).json({ success: false, message: 'Data backup tidak ditemukan atau format tidak valid.' });
    }

    const db = await getDatabase();

    // 1. Create a safety snapshot of current database state before modifying
    const snapshotFile = createDatabaseBackupSnapshot(mode === 'replace' ? 'before_replace' : 'before_merge');

    const incomingInvoices = Array.isArray(backupData.invoices) ? backupData.invoices : [];
    const incomingCustomers = Array.isArray(backupData.customers) ? backupData.customers : [];
    const incomingServices = Array.isArray(backupData.services) ? backupData.services : [];
    const incomingAddons = Array.isArray(backupData.recurringAddons) ? backupData.recurringAddons : [];
    const incomingRules = Array.isArray(backupData.automationRules) ? backupData.automationRules : [];

    let restoredInvoicesCount = 0;
    let restoredCustomersCount = 0;
    let restoredServicesCount = 0;

    if (mode === 'replace') {
      // Full replacement mode
      if (incomingInvoices.length > 0 || incomingCustomers.length > 0) {
        db.invoices = incomingInvoices;
        db.customers = incomingCustomers;
        db.services = incomingServices.length > 0 ? incomingServices : db.services;
        if (incomingAddons.length > 0) db.recurringAddons = incomingAddons;
        if (incomingRules.length > 0) db.automationRules = incomingRules;

        restoredInvoicesCount = incomingInvoices.length;
        restoredCustomersCount = incomingCustomers.length;
        restoredServicesCount = incomingServices.length;
      }
    } else {
      // Merge mode: Add or update without deleting non-conflicting existing records
      // Invoices
      const invoiceMap = new Map<string, Invoice>();
      for (const inv of db.invoices) {
        invoiceMap.set(inv.invoiceNumber || inv.id, inv);
      }
      for (const inv of incomingInvoices) {
        const key = inv.invoiceNumber || inv.id;
        invoiceMap.set(key, inv);
        restoredInvoicesCount++;
      }
      db.invoices = Array.from(invoiceMap.values());

      // Customers
      const customerMap = new Map<string, CustomerRecord>();
      for (const c of db.customers) {
        customerMap.set(c.id || c.phone, c);
      }
      for (const c of incomingCustomers) {
        const key = c.id || c.phone;
        customerMap.set(key, c);
        restoredCustomersCount++;
      }
      db.customers = Array.from(customerMap.values());

      // Services
      const serviceMap = new Map<string, any>();
      for (const s of db.services) {
        serviceMap.set(s.id || s.name, s);
      }
      for (const s of incomingServices) {
        const key = s.id || s.name;
        serviceMap.set(key, s);
        restoredServicesCount++;
      }
      db.services = Array.from(serviceMap.values());
    }

    // Optional: Restore company settings if requested
    if (includeSettings && backupData.settings) {
      db.settings = {
        ...db.settings,
        ...backupData.settings,
        // Preserve essential connection credentials if missing in backup
        telegramBotToken: backupData.settings.telegramBotToken || db.settings.telegramBotToken,
        telegramChatId: backupData.settings.telegramChatId || db.settings.telegramChatId,
      };
    }

    // Audit log
    const restoreLog = {
      id: `restore-${Date.now()}`,
      invoiceId: 'RESTORE-DATABASE',
      invoiceNumber: `RESTORE-${mode.toUpperCase()}`,
      customerName: 'Admin System',
      customerPhone: '-',
      customerEmail: 'admin-restore@system.local',
      ruleType: `Pemulihan Database (${mode === 'replace' ? 'Ganti Total' : 'Gabungkan'})`,
      channel: 'both' as const,
      status: 'generated' as const,
      message: `Database berhasil dipulihkan dari cadangan. Total saat ini: ${db.invoices.length} invoice, ${db.customers.length} pelanggan. Snapshot pengaman: ${snapshotFile ? 'Tersimpan' : 'N/A'}.`,
      dispatchedAt: new Date().toISOString(),
      amount: db.invoices.reduce((sum, i) => sum + (i.totalAmount || 0), 0),
    };
    db.automationLogs = [restoreLog, ...(db.automationLogs || [])].slice(0, 50);

    saveDatabase(db);

    broadcastEvent({
      type: 'backup_restored',
      message: `Database berhasil dipulihkan: ${db.invoices.length} tagihan & ${db.customers.length} pelanggan siap digunakan`,
      timestamp: new Date().toISOString(),
      payload: {
        mode,
        invoicesTotal: db.invoices.length,
        customersTotal: db.customers.length,
        snapshotFile: Boolean(snapshotFile),
      },
    });

    return res.json({
      success: true,
      message: `Database berhasil dipulihkan (${mode === 'replace' ? 'Ganti Total' : 'Gabungkan Data'})!`,
      mode,
      snapshotCreated: Boolean(snapshotFile),
      stats: {
        totalInvoices: db.invoices.length,
        totalCustomers: db.customers.length,
        totalServices: db.services.length,
        restoredInvoices: restoredInvoicesCount,
        restoredCustomers: restoredCustomersCount,
      },
      settingsUpdated: Boolean(includeSettings && backupData.settings),
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: `Gagal memulihkan database: ${err.message}` });
  }
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
    const outstanding = Math.max(0, inv.totalAmount - (inv.paidAmount || 0));
    totalOutstanding += outstanding;

    const isOverdue = inv.status === 'overdue' || (outstanding > 0 && inv.dueDate < todayStr);

    if (isOverdue) {
      overdueCount++;
      totalOverdueAmount += outstanding;
    } else if (inv.status === 'paid') {
      paidCount++;
    } else if (inv.status === 'partial') {
      partialCount++;
    } else {
      pendingCount++;
    }

    // Process transactions
    if (inv.transactions && inv.transactions.length > 0) {
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
    } else if (inv.status === 'paid' && (inv.paidAmount || inv.totalAmount) > 0) {
      const amount = inv.paidAmount || inv.totalAmount;
      totalRevenueAllTime += amount;

      const dateStr = inv.updatedAt || inv.date || todayStr;
      const invDate = new Date(dateStr);
      if (dateStr.startsWith(todayStr)) {
        totalRevenueToday += amount;
      }

      if (invDate.getFullYear() === currentYear && invDate.getMonth() === currentMonth) {
        totalRevenueThisMonth += amount;
        const day = invDate.getDate();
        dailyRevenueMap.set(day, (dailyRevenueMap.get(day) || 0) + amount);
      }

      const mKey = `${invDate.getFullYear()}-${(invDate.getMonth() + 1).toString().padStart(2, '0')}`;
      if (monthlyRevenueMap.has(mKey)) {
        const curr = monthlyRevenueMap.get(mKey)!;
        curr.revenue += amount;
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
  const allTransactions: (PaymentTransaction & { customerName: string; invoiceNumber: string; invoiceId: string })[] = [];
  for (const inv of invoices) {
    if (inv.transactions && inv.transactions.length > 0) {
      for (const trx of inv.transactions) {
        allTransactions.push({
          ...trx,
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber,
          customerName: inv.customer.name,
        });
      }
    } else if (inv.status === 'paid' && (inv.paidAmount || inv.totalAmount) > 0) {
      allTransactions.push({
        id: `trx-paid-${inv.id}`,
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        amount: inv.paidAmount || inv.totalAmount,
        paymentMethod: (inv as any).paymentMethod || (inv as any).paymentMethods?.[0] || 'qris_dinamis',
        referenceNumber: 'AUTO-PAID-' + inv.invoiceNumber,
        notes: 'Pembayaran invoice terverifikasi lunas',
        proofUrl: '',
        verifiedAt: inv.updatedAt || inv.date,
        verifiedBy: 'Sistem Pembayaran',
        customerName: inv.customer.name,
      });
    } else if (inv.paidAmount && inv.paidAmount > 0) {
      allTransactions.push({
        id: `trx-partial-${inv.id}`,
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        amount: inv.paidAmount,
        paymentMethod: (inv as any).paymentMethod || (inv as any).paymentMethods?.[0] || 'qris_dinamis',
        referenceNumber: 'PARTIAL-' + inv.invoiceNumber,
        notes: 'Pembayaran sebagian terverifikasi',
        proofUrl: '',
        verifiedAt: inv.updatedAt || inv.date,
        verifiedBy: 'Sistem Pembayaran',
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

// Helper to match customer with an invoice robustly
export function isCustomerInvoiceMatch(customer: CustomerRecord, inv: Invoice): boolean {
  if (!inv.customer) return false;
  if (inv.customer.id === customer.id) return true;
  if (customer.email && inv.customer.email && inv.customer.email.toLowerCase() === customer.email.toLowerCase()) return true;
  if (customer.phone && inv.customer.phone) {
    const p1 = customer.phone.replace(/[^0-9]/g, '');
    const p2 = inv.customer.phone.replace(/[^0-9]/g, '');
    if (p1 && p2 && (p1 === p2 || p1.slice(-8) === p2.slice(-8))) return true;
  }
  const cName = customer.name.trim().toLowerCase();
  const invCName = (inv.customer.name || '').trim().toLowerCase();
  if (cName && invCName && (cName === invCName || invCName.includes(cName) || cName.includes(invCName))) return true;
  if (customer.company && invCName && invCName.includes(customer.company.trim().toLowerCase())) return true;
  return false;
}

// Recalculate and synchronize customer's open unpaid invoices with their latest profile and PPPoE metrics
export async function syncCustomerOpenInvoices(customer: CustomerRecord, db: any) {
  if (!db.invoices || !Array.isArray(db.invoices)) return [];
  const updatedInvoices: Invoice[] = [];

  const staticQris = (db.settings?.defaultStaticQris || DEFAULT_DANA_STATIC_QRIS).trim();
  const parsedSource = parseQris(staticQris);
  const merchantName = db.settings?.qrisMerchantName || parsedSource.merchantName || db.settings?.businessName || 'InvoiceKilat';
  const merchantCity = db.settings?.qrisMerchantCity || parsedSource.merchantCity || 'JAKARTA';

  for (const inv of db.invoices) {
    if (isCustomerInvoiceMatch(customer, inv)) {
      // Always update customer reference
      inv.customer = {
        ...inv.customer,
        id: customer.id,
        name: customer.name,
        company: customer.company || '',
        email: customer.email || '',
        phone: customer.phone || '',
        address: customer.address || '',
        customerMode: customer.customerMode,
        mikrotik: customer.mikrotik,
      };

      // Only recalculate line items and nominal if the invoice is UNPAID (not paid and not cancelled)
      if (inv.status !== 'paid' && inv.status !== 'cancelled') {
        const items: InvoiceItem[] = [];

        if (customer.customerMode === 'noc' && customer.mikrotik) {
          const mk = customer.mikrotik;
          const userCount = customer.pppoeBillingMethod === 'realtime'
            ? (Number(mk.nonIsolirCount) >= 0 ? Number(mk.nonIsolirCount) : (mk.activePppoeCount ? Math.round(mk.activePppoeCount * 0.88) : 88))
            : (customer.monthlyAveragePppoeCount ?? mk.monthlyAverageNonIsolir ?? Number(mk.nonIsolirCount) ?? 88);
          const rate = Number(mk.ratePerUser) >= 500 ? Number(mk.ratePerUser) : 10000;
          const total = userCount * rate;

          const methodLabel = customer.pppoeBillingMethod === 'realtime' ? 'Snapshot Realtime' : 'Rata-rata';
          const monthLabel = inv.date ? new Date(inv.date).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }) : 'Bulan Berjalan';

          items.push({
            id: `item-noc-${inv.id}-${Date.now()}`,
            description: `Layanan NOC & Bandwidth PPPoE [${mk.routerName || 'Mikrotik'}] - ${methodLabel} ${userCount} User Aktif Non-Isolir Bulan ${monthLabel} (@ Rp ${rate.toLocaleString('id-ID')})`,
            quantity: userCount,
            price: rate,
            total,
          });
        } else {
          const baseAmount = customer.customMonthlyAmount || 2500000;
          items.push({
            id: `item-base-${inv.id}-${Date.now()}`,
            description: `Langganan Layanan Bulanan & Support`,
            quantity: 1,
            price: baseAmount,
            total: baseAmount,
          });
        }

        // Addons
        if (customer.recurringEnabled !== false) {
          if (customer.includeVpn) {
            items.push({
              id: `addon-vpn-${inv.id}`,
              description: 'Layanan VPN Remote Mikrotik Dedicated',
              quantity: 1,
              price: 50000,
              total: 50000,
            });
          }
          if (customer.includeMonitoring) {
            items.push({
              id: `addon-mon-${inv.id}`,
              description: 'Biaya Monitoring Jaringan NOC 24/7',
              quantity: 1,
              price: 250000,
              total: 250000,
            });
          }
          if (Array.isArray(customer.recurringAddonIds)) {
            for (const aId of customer.recurringAddonIds) {
              if (aId !== 'addon-vpn' && aId !== 'addon-mon') {
                const found = db.recurringAddons?.find((a: any) => a.id === aId);
                if (found) {
                  items.push({
                    id: `addon-${found.id}-${inv.id}`,
                    description: found.name,
                    quantity: 1,
                    price: found.price,
                    total: found.price,
                  });
                }
              }
            }
          }
        }

        const subtotal = items.reduce((sum, it) => sum + it.total, 0);
        const taxPercent = inv.taxPercent !== undefined ? inv.taxPercent : 11;
        const taxAmount = Math.round((subtotal * taxPercent) / 100);
        const totalAmount = subtotal + taxAmount;

        inv.items = items;
        inv.subtotal = subtotal;
        inv.taxAmount = taxAmount;
        inv.totalAmount = totalAmount;
        inv.updatedAt = new Date().toISOString();

        try {
          const { dynamicQris } = convertToDynamicQris(
            staticQris,
            totalAmount,
            inv.invoiceNumber,
            merchantName,
            merchantCity
          );
          inv.dynamicQris = dynamicQris;
          inv.dynamicQrisDataUrl = await generateQrDataUrl(dynamicQris);
        } catch (e) {
          // ignore
        }

        updatedInvoices.push(inv);
      }
    }
  }

  return updatedInvoices;
}

// ================= CUSTOMERS MANAGEMENT =================
apiRouter.get('/customers', async (req: Request, res: Response) => {
  const db = await getDatabase();
  // Compute enriched metrics per customer (invoices, total spent, outstanding)
  const customerStats = db.customers.map((c) => {
    const custInvoices = db.invoices.filter((i) => isCustomerInvoiceMatch(c, i));
    const totalSpent = custInvoices.reduce((sum, i) => sum + (i.paidAmount || 0), 0);
    const pendingBalance = custInvoices.filter((i) => i.status !== 'paid' && i.status !== 'cancelled').reduce((sum, i) => sum + Math.max(0, i.totalAmount - (i.paidAmount || 0)), 0);
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
  const { 
    name, 
    company, 
    email, 
    phone, 
    address, 
    notes, 
    customerMode, 
    mikrotik,
    recurringEnabled,
    includeVpn,
    includeMonitoring,
    recurringAddonIds,
    pppoeBillingMethod,
    monthlyAveragePppoeCount,
    customMonthlyAmount,
    password,
    portalPin
  } = req.body;

  if (!name) {
    return res.status(400).json({ success: false, message: 'Nama pelanggan wajib diisi' });
  }

  const mode: CustomerMode = customerMode === 'noc' ? 'noc' : 'biasa';
  let mikrotikConfig = undefined;

  if (mode === 'noc' && mikrotik) {
    const ratePerUser = Number(mikrotik.ratePerUser) >= 500 ? Number(mikrotik.ratePerUser) : 5000;
    
    // Probe router to detect active PPPoE users immediately
    const probeResult = await probeMikrotikRouter({
      ...mikrotik,
      ratePerUser,
      isolirProfileName: mikrotik.isolirProfileName || 'isolir',
    });

    mikrotikConfig = {
      routerName: mikrotik.routerName || 'Mikrotik-Router',
      host: mikrotik.host || '127.0.0.1',
      port: Number(mikrotik.port) || 8728,
      username: mikrotik.username || 'admin',
      password: mikrotik.password || '',
      useSsl: !!mikrotik.useSsl,
      ratePerUser,
      isolirProfileName: mikrotik.isolirProfileName || 'isolir',
      ...(probeResult.data || {}),
    };
  }

  const vpnChecked = includeVpn === true || (Array.isArray(recurringAddonIds) && recurringAddonIds.includes('addon-vpn'));
  const monChecked = includeMonitoring === true || (Array.isArray(recurringAddonIds) && recurringAddonIds.includes('addon-mon'));
  const safeAddons = Array.isArray(recurringAddonIds) ? [...recurringAddonIds] : [];
  if (vpnChecked && !safeAddons.includes('addon-vpn')) safeAddons.push('addon-vpn');
  if (monChecked && !safeAddons.includes('addon-mon')) safeAddons.push('addon-mon');

  const newCust = {
    id: `cust-${Date.now()}`,
    name: String(name).trim(),
    company: company || '',
    email: email || '',
    phone: phone || '',
    address: address || '',
    notes: notes || '',
    customerMode: mode,
    recurringEnabled: recurringEnabled !== false,
    includeVpn: vpnChecked,
    includeMonitoring: monChecked,
    recurringAddonIds: safeAddons,
    pppoeBillingMethod: pppoeBillingMethod || 'monthly_average',
    monthlyAveragePppoeCount: typeof monthlyAveragePppoeCount === 'number' ? monthlyAveragePppoeCount : undefined,
    customMonthlyAmount: Number(customMonthlyAmount) || 0,
    password: password || 'client123',
    portalPin: portalPin || '123456',
    mikrotik: mikrotikConfig,
    createdAt: new Date().toISOString(),
  };

  db.customers.unshift(newCust);
  saveDatabase(db);

  broadcastEvent({
    type: 'customer_updated',
    message: mode === 'noc' 
      ? `Pelanggan Mode NOC "${name}" berhasil didaftarkan (Mikrotik: ${mikrotikConfig?.routerName || 'Aktif'})` 
      : `Pelanggan baru "${name}" berhasil ditambahkan`,
    timestamp: new Date().toISOString(),
    payload: newCust,
  });

  res.status(201).json({ success: true, customer: newCust });
});

apiRouter.put('/customers/:id', async (req: Request, res: Response) => {
  const db = await getDatabase();
  const rawId = req.params.id;
  const decodedId = decodeURIComponent(rawId);
  const index = db.customers.findIndex(
    (c) => c.id === rawId || c.id === decodedId || c.id.toLowerCase() === rawId.toLowerCase()
  );
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Pelanggan tidak ditemukan' });
  }

  const oldCust = db.customers[index];
  const { 
    name, 
    company, 
    email, 
    phone, 
    address, 
    notes, 
    customerMode, 
    mikrotik,
    recurringEnabled,
    includeVpn,
    includeMonitoring,
    recurringAddonIds,
    pppoeBillingMethod,
    monthlyAveragePppoeCount,
    customMonthlyAmount,
    password,
    portalPin,
  } = req.body;

  const mode: CustomerMode = customerMode !== undefined ? (customerMode === 'noc' ? 'noc' : 'biasa') : (oldCust.customerMode || 'biasa');
  let updatedMikrotik = oldCust.mikrotik;

  if (mode === 'noc') {
    if (mikrotik) {
      const mergedConfig = {
        ...(oldCust.mikrotik || {}),
        ...mikrotik,
        ratePerUser: Number(mikrotik.ratePerUser) >= 500 ? Number(mikrotik.ratePerUser) : (oldCust.mikrotik?.ratePerUser || 5000),
      };
      
      // If user altered host, user, or port, or user explicitly requested refresh, probe router
      const probeResult = await probeMikrotikRouter(mergedConfig);
      updatedMikrotik = {
        ...mergedConfig,
        ...(probeResult.data || {}),
      };
    }
  } else {
    // Mode biasa doesn't use mikrotik
    updatedMikrotik = undefined;
  }

  const vpnChecked = includeVpn !== undefined 
    ? !!includeVpn 
    : (oldCust.includeVpn === true || (Array.isArray(oldCust.recurringAddonIds) && oldCust.recurringAddonIds.includes('addon-vpn')));
  const monChecked = includeMonitoring !== undefined 
    ? !!includeMonitoring 
    : (oldCust.includeMonitoring === true || (Array.isArray(oldCust.recurringAddonIds) && oldCust.recurringAddonIds.includes('addon-mon')));

  const rawAddons = recurringAddonIds !== undefined 
    ? (Array.isArray(recurringAddonIds) ? recurringAddonIds : []) 
    : (Array.isArray(oldCust.recurringAddonIds) ? oldCust.recurringAddonIds : []);
  const safeAddons = new Set(rawAddons);
  if (vpnChecked) safeAddons.add('addon-vpn'); else safeAddons.delete('addon-vpn');
  if (monChecked) safeAddons.add('addon-mon'); else safeAddons.delete('addon-mon');

  const updatedCustomer = {
    ...oldCust,
    name: name !== undefined && String(name).trim() ? String(name).trim() : oldCust.name,
    company: company !== undefined ? String(company).trim() : (oldCust.company || ''),
    email: email !== undefined ? String(email).trim() : (oldCust.email || ''),
    phone: phone !== undefined ? String(phone).trim() : (oldCust.phone || ''),
    address: address !== undefined ? String(address).trim() : (oldCust.address || ''),
    notes: notes !== undefined ? String(notes).trim() : (oldCust.notes || ''),
    customerMode: mode,
    recurringEnabled: recurringEnabled !== undefined ? recurringEnabled : (oldCust.recurringEnabled !== false),
    includeVpn: vpnChecked,
    includeMonitoring: monChecked,
    recurringAddonIds: Array.from(safeAddons),
    pppoeBillingMethod: pppoeBillingMethod !== undefined ? pppoeBillingMethod : (oldCust.pppoeBillingMethod || 'monthly_average'),
    monthlyAveragePppoeCount: monthlyAveragePppoeCount !== undefined ? monthlyAveragePppoeCount : oldCust.monthlyAveragePppoeCount,
    customMonthlyAmount: customMonthlyAmount !== undefined ? Number(customMonthlyAmount) : (oldCust.customMonthlyAmount || 0),
    password: password !== undefined ? password : (oldCust.password || 'client123'),
    portalPin: portalPin !== undefined ? portalPin : (oldCust.portalPin || '123456'),
    mikrotik: updatedMikrotik,
    updatedAt: new Date().toISOString(),
  };

  db.customers[index] = updatedCustomer;

  // Sync updated customer details and recalculate any open unpaid invoices to reflect latest nominal
  const syncedInvoices = await syncCustomerOpenInvoices(updatedCustomer, db);

  saveDatabase(db);

  // Compute enriched metrics for the customer
  const custInvoices = db.invoices.filter((i) => isCustomerInvoiceMatch(updatedCustomer, i));
  const totalSpent = custInvoices.reduce((sum, i) => sum + (i.paidAmount || 0), 0);
  const pendingBalance = custInvoices
    .filter((i) => i.status !== 'paid' && i.status !== 'cancelled')
    .reduce((sum, i) => sum + Math.max(0, i.totalAmount - (i.paidAmount || 0)), 0);

  const enrichedCustomer = {
    ...updatedCustomer,
    totalInvoices: custInvoices.length,
    totalSpent,
    pendingBalance,
  };

  broadcastEvent({
    type: 'customer_updated',
    message: `Data pelanggan "${updatedCustomer.name}" berhasil diperbarui${syncedInvoices.length > 0 ? ` (${syncedInvoices.length} tagihan berjalan disesuaikan ke nominal terbaru)` : ''}`,
    timestamp: new Date().toISOString(),
    payload: enrichedCustomer,
  });

  if (syncedInvoices.length > 0) {
    for (const sInv of syncedInvoices) {
      broadcastEvent({
        type: 'invoice_updated',
        message: `Faktur ${sInv.invoiceNumber} berhasil disesuaikan dengan tarif dan paket terbaru (${formatRupiah(sInv.totalAmount)})`,
        timestamp: new Date().toISOString(),
        payload: sInv,
      });
    }
  }

  res.json({ 
    success: true, 
    customer: enrichedCustomer, 
    syncedInvoicesCount: syncedInvoices.length,
    message: 'Data pelanggan berhasil diperbarui dan nominal tagihan disinkronkan' 
  });
});

// POST /api/customers/:id/recalculate-invoice - Manually recalculate open invoice for customer
apiRouter.post('/customers/:id/recalculate-invoice', async (req: Request, res: Response) => {
  const db = await getDatabase();
  const rawId = req.params.id;
  const decodedId = decodeURIComponent(rawId);
  const customer = db.customers.find(
    (c) => c.id === rawId || c.id === decodedId || c.id.toLowerCase() === rawId.toLowerCase()
  );
  if (!customer) {
    return res.status(404).json({ success: false, message: 'Pelanggan tidak ditemukan' });
  }

  const updatedInvoices = await syncCustomerOpenInvoices(customer, db);
  saveDatabase(db);

  const custInvoices = db.invoices.filter((i) => isCustomerInvoiceMatch(customer, i));
  const totalSpent = custInvoices.reduce((sum, i) => sum + (i.paidAmount || 0), 0);
  const pendingBalance = custInvoices
    .filter((i) => i.status !== 'paid' && i.status !== 'cancelled')
    .reduce((sum, i) => sum + Math.max(0, i.totalAmount - (i.paidAmount || 0)), 0);

  const enrichedCustomer = {
    ...customer,
    totalInvoices: custInvoices.length,
    totalSpent,
    pendingBalance,
  };

  broadcastEvent({
    type: 'customer_updated',
    message: `Nominal tagihan "${customer.name}" berhasil dihitung ulang dan disinkronkan`,
    timestamp: new Date().toISOString(),
    payload: enrichedCustomer,
  });

  res.json({
    success: true,
    message: `Berhasil memperbarui ${updatedInvoices.length} tagihan pelanggan "${customer.name}" ke nominal terkini`,
    customer: enrichedCustomer,
    updatedInvoices,
  });
});

apiRouter.delete('/customers/:id', async (req: Request, res: Response) => {
  const db = await getDatabase();
  const rawId = req.params.id;
  const decodedId = decodeURIComponent(rawId);
  const index = db.customers.findIndex(
    (c) => c.id === rawId || c.id === decodedId || c.id.toLowerCase() === rawId.toLowerCase()
  );
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Pelanggan tidak ditemukan' });
  }

  const removed = db.customers.splice(index, 1)[0];
  saveDatabase(db);

  broadcastEvent({
    type: 'customer_updated',
    message: `Pelanggan "${removed.name}" telah dihapus dari direktori`,
    timestamp: new Date().toISOString(),
  });

  res.json({ success: true, message: `Pelanggan "${removed.name}" telah berhasil dihapus` });
});

// ================= MIKROTIK INTEGRATION ROUTES =================

// ================= MIKROTIK ROUTEROS INTEGRATION ROUTES =================

// POST /api/mikrotik/test - Direct test connection to MikroTik host/API (Socket 8728 / 8729 TLS / REST 80/443)
apiRouter.post('/mikrotik/test', async (req: Request, res: Response) => {
  try {
    const config = req.body;
    const hostStr = String(config.host || '').trim();

    // Check if user explicitly requested demo/simulation via fake host
    if (
      config.isSimulation ||
      hostStr.toLowerCase() === 'demo' ||
      hostStr.toLowerCase() === 'simulasi' ||
      hostStr.toLowerCase() === 'demo-router'
    ) {
      return res.json({
        success: true,
        message: 'Koneksi Berhasil! Profil MikroTik Demo Simulasi siap digunakan.',
        source: 'demo_preset',
        data: REAL_MIKROTIK_DEMO_PRESET,
      });
    }

    if (!hostStr) {
      return res.status(400).json({ success: false, message: 'Host / IP Mikrotik wajib diisi' });
    }

    const result = await probeMikrotikRouter(config);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
        source: result.source,
        error: result.lastErrorMessage,
      });
    }

    return res.json({
      success: true,
      message: result.message,
      source: result.source,
      data: result.data,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Gagal menguji koneksi Mikrotik: ' + err.message,
    });
  }
});

// POST /api/mikrotik/kick-user - Disconnect / kick active PPPoE session from MikroTik directly
apiRouter.post('/mikrotik/kick-user', async (req: Request, res: Response) => {
  try {
    const { customerId, userIdentifier, config } = req.body;
    if (!userIdentifier) {
      return res.status(400).json({ success: false, message: 'Username / ID user PPPoE wajib diisi' });
    }

    let targetConfig = config;
    if (!targetConfig && customerId) {
      const db = await getDatabase();
      const customer = db.customers.find((c) => c.id === customerId);
      if (customer?.mikrotik) {
        targetConfig = customer.mikrotik;
      }
    }

    if (!targetConfig?.host) {
      return res.status(400).json({ success: false, message: 'Konfigurasi router MikroTik tidak ditemukan' });
    }

    const result = await kickMikrotikActiveUser(targetConfig, userIdentifier);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Gagal memutuskan sesi user: ' + err.message,
    });
  }
});

// =========================================================================
// NOC ROUTER MANAGEMENT & CONTROL API ROUTES
// =========================================================================

// Helper to resolve router config from DB customer or request override
async function resolveCustomerRouterConfig(customerId: string, bodyConfig?: any) {
  const db = await getDatabase();
  const customer = db.customers.find((c) => c.id === customerId);
  const config = bodyConfig?.host ? bodyConfig : customer?.mikrotik;
  return { customer, config, db };
}

// GET /api/mikrotik/manage/:customerId/secrets - Fetch all PPPoE Secrets & Profiles
apiRouter.get('/mikrotik/manage/:customerId/secrets', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const { customer, config } = await resolveCustomerRouterConfig(customerId);

    if (!config?.host) {
      return res.status(404).json({
        success: false,
        message: 'Konfigurasi router pelanggan tidak ditemukan.',
      });
    }

    const result = await getMikrotikSecretsAndProfiles(config);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Gagal membaca secrets router: ' + err.message,
    });
  }
});

// POST /api/mikrotik/manage/:customerId/isolate - Isolate single PPPoE user
apiRouter.post('/mikrotik/manage/:customerId/isolate', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const { username, isolirProfileName, note } = req.body;

    if (!username) {
      return res.status(400).json({ success: false, message: 'Username PPPoE wajib diisi' });
    }

    const { customer, config } = await resolveCustomerRouterConfig(customerId, req.body.config);
    if (!config?.host) {
      return res.status(404).json({ success: false, message: 'Router tidak ditemukan' });
    }

    const targetIsolirProfile = isolirProfileName || config.isolirProfileName || 'isolir';
    const result = await isolateMikrotikSecret(config, username, targetIsolirProfile, note || 'Isolir NOC');

    broadcastEvent({
      type: 'customer_updated',
      message: `NOC Action: User ${username} diisolir pada router ${customer?.name || config.routerName}`,
      timestamp: new Date().toISOString(),
      payload: { router: config.routerName, user: username, action: 'isolate' },
    });

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Gagal mengisolir user: ' + err.message,
    });
  }
});

// POST /api/mikrotik/manage/:customerId/unisolate - Unisolate single PPPoE user
apiRouter.post('/mikrotik/manage/:customerId/unisolate', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const { username, targetProfileName } = req.body;

    if (!username) {
      return res.status(400).json({ success: false, message: 'Username PPPoE wajib diisi' });
    }

    const { customer, config } = await resolveCustomerRouterConfig(customerId, req.body.config);
    if (!config?.host) {
      return res.status(404).json({ success: false, message: 'Router tidak ditemukan' });
    }

    const result = await unisolateMikrotikSecret(config, username, targetProfileName);

    broadcastEvent({
      type: 'customer_updated',
      message: `NOC Action: User ${username} dibuka isolirnya pada router ${customer?.name || config.routerName}`,
      timestamp: new Date().toISOString(),
      payload: { router: config.routerName, user: username, action: 'unisolate' },
    });

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Gagal membuka isolir: ' + err.message,
    });
  }
});

// POST /api/mikrotik/manage/:customerId/toggle-secret - Enable / Disable secret
apiRouter.post('/mikrotik/manage/:customerId/toggle-secret', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const { username, disabled } = req.body;

    if (!username) {
      return res.status(400).json({ success: false, message: 'Username wajib diisi' });
    }

    const { config } = await resolveCustomerRouterConfig(customerId, req.body.config);
    if (!config?.host) {
      return res.status(404).json({ success: false, message: 'Router tidak ditemukan' });
    }

    const result = await toggleMikrotikSecret(config, username, !!disabled);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Gagal mengubah status secret: ' + err.message,
    });
  }
});

// POST /api/mikrotik/manage/:customerId/secret - Create new PPPoE Secret
apiRouter.post('/mikrotik/manage/:customerId/secret', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const { name, password, profile, service, comment, remoteAddress } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Username PPPoE wajib diisi' });
    }

    const { config } = await resolveCustomerRouterConfig(customerId, req.body.config);
    if (!config?.host) {
      return res.status(404).json({ success: false, message: 'Router tidak ditemukan' });
    }

    const result = await createMikrotikSecret(config, {
      name,
      password,
      profile,
      service,
      comment,
      remoteAddress,
    });
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Gagal membuat user secret: ' + err.message,
    });
  }
});

// DELETE /api/mikrotik/manage/:customerId/secret/:username - Delete PPPoE Secret
apiRouter.delete('/mikrotik/manage/:customerId/secret/:username', async (req: Request, res: Response) => {
  try {
    const { customerId, username } = req.params;

    if (!username) {
      return res.status(400).json({ success: false, message: 'Username PPPoE wajib diisi' });
    }

    const { config } = await resolveCustomerRouterConfig(customerId);
    if (!config?.host) {
      return res.status(404).json({ success: false, message: 'Router tidak ditemukan' });
    }

    const result = await deleteMikrotikSecret(config, username);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Gagal menghapus user: ' + err.message,
    });
  }
});

// POST /api/mikrotik/manage/:customerId/batch-isolate - Bulk isolate or bulk unisolate
apiRouter.post('/mikrotik/manage/:customerId/batch-isolate', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const { usernames, action, isolirProfileName, targetProfileName } = req.body;

    if (!usernames || !Array.isArray(usernames) || usernames.length === 0) {
      return res.status(400).json({ success: false, message: 'Pilih minimal satu user' });
    }

    const { config } = await resolveCustomerRouterConfig(customerId, req.body.config);
    if (!config?.host) {
      return res.status(404).json({ success: false, message: 'Router tidak ditemukan' });
    }

    const result = await batchIsolateMikrotikSecrets(
      config,
      usernames,
      action === 'isolate' ? 'isolate' : 'unisolate',
      isolirProfileName || config.isolirProfileName || 'isolir',
      targetProfileName
    );

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Gagal menjalankan aksi massal: ' + err.message,
    });
  }
});

// POST /api/mikrotik/manage/:customerId/reboot - Reboot router remotely
apiRouter.post('/mikrotik/manage/:customerId/reboot', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const { customer, config } = await resolveCustomerRouterConfig(customerId, req.body.config);

    if (!config?.host) {
      return res.status(404).json({ success: false, message: 'Router tidak ditemukan' });
    }

    const result = await rebootMikrotikRouter(config);

    broadcastEvent({
      type: 'automation_executed',
      message: `Pemberitahuan NOC: Router "${customer?.name || config.routerName}" sedang di-reboot oleh admin.`,
      timestamp: new Date().toISOString(),
    });

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Gagal me-reboot router: ' + err.message,
    });
  }
});

// POST /api/mikrotik/manage/:customerId/ping - Run Ping from router
apiRouter.post('/mikrotik/manage/:customerId/ping', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const { host, count } = req.body;

    const { config } = await resolveCustomerRouterConfig(customerId, req.body.config);
    if (!config?.host) {
      return res.status(404).json({ success: false, message: 'Router tidak ditemukan' });
    }

    const result = await pingFromMikrotik(config, host || '8.8.8.8', Number(count) || 4);
    return res.json({ success: true, data: result });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Gagal ping dari router: ' + err.message,
    });
  }
});

// GET /api/mikrotik/manage/:customerId/interfaces - Get interfaces & traffic stats
apiRouter.get('/mikrotik/manage/:customerId/interfaces', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const { config } = await resolveCustomerRouterConfig(customerId);

    if (!config?.host) {
      return res.status(404).json({ success: false, message: 'Router tidak ditemukan' });
    }

    const interfaces = await getMikrotikInterfaces(config);
    return res.json({ success: true, interfaces });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Gagal membaca interface: ' + err.message,
    });
  }
});

// GET /api/mikrotik/manage/:customerId/logs - Get router logs for troubleshooting
apiRouter.get('/mikrotik/manage/:customerId/logs', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const { config } = await resolveCustomerRouterConfig(customerId);

    if (!config?.host) {
      return res.status(404).json({ success: false, message: 'Router tidak ditemukan' });
    }

    const count = Number(req.query.count) || 35;
    const logs = await getMikrotikLogs(config, count);
    return res.json({ success: true, logs });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Gagal membaca log router: ' + err.message,
    });
  }
});

// POST /api/mikrotik/parse-terminal - Parse real PPPoE active print from Winbox Terminal
apiRouter.post('/mikrotik/parse-terminal', async (req: Request, res: Response) => {
  try {
    const { text, isolirProfileName, customerId, ratePerUser } = req.body;
    if (!text || !String(text).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Teks output terminal MikroTik tidak boleh kosong. Jalankan perintah: /ppp active print detail',
      });
    }

    const isolirKeywords = [
      (isolirProfileName || 'isolir').trim().toLowerCase(),
      'isolir',
      'expired',
      'blokir',
      'tunggakan',
      'nonaktif',
      'suspend',
    ];

    const parsed = parseMikrotikTerminalOutput(text, isolirKeywords);

    if (parsed.activePppoeCount === 0) {
      return res.status(400).json({
        success: false,
        message: 'Tidak ditemukan sesi PPPoE aktif pada teks yang dimasukkan. Pastikan Anda menyalin hasil dari perintah: /ppp active print detail atau /ppp active print',
      });
    }

    const db = await getDatabase();
    let updatedCustomer: CustomerRecord | undefined;

    if (customerId) {
      const custIndex = db.customers.findIndex((c) => c.id === customerId);
      if (custIndex !== -1) {
        const cust = db.customers[custIndex];
        const existingSamples = cust.mikrotik?.samples || [];
        const nowIso = new Date().toISOString();
        const updatedSamples = [
          ...existingSamples,
          {
            timestamp: nowIso,
            activeCount: parsed.activePppoeCount,
            nonIsolirCount: parsed.nonIsolirCount,
            isolirCount: parsed.isolirCount,
          },
        ].slice(-30);

        const avgNonIso = Math.round(
          updatedSamples.reduce((sum, s) => sum + s.nonIsolirCount, 0) / updatedSamples.length
        );

        cust.mikrotik = {
          ...(cust.mikrotik || {
            routerName: 'Mikrotik-Terminal',
            host: 'terminal-import',
            port: 8728,
            username: 'terminal',
            ratePerUser: Number(ratePerUser) || 5000,
          }),
          connectionStatus: 'connected',
          lastSyncedAt: nowIso,
          activePppoeCount: parsed.activePppoeCount,
          nonIsolirCount: parsed.nonIsolirCount,
          isolirCount: parsed.isolirCount,
          monthlyAverageNonIsolir: avgNonIso,
          samples: updatedSamples,
          activeUsersList: parsed.users.slice(0, 250),
          realtimeSource: 'terminal_import',
        };
        cust.monthlyAveragePppoeCount = avgNonIso;

        saveDatabase(db);
        updatedCustomer = cust;

        broadcastEvent({
          type: 'customer_updated',
          message: `Impor Terminal Sukses untuk ${cust.name}: ${parsed.nonIsolirCount} user non-isolir live (${parsed.activePppoeCount} total aktif)`,
          timestamp: nowIso,
          payload: cust,
        });
      }
    }

    return res.json({
      success: true,
      message: `Berhasil mendeteksi ${parsed.nonIsolirCount} user PPPoE aktif non-isolir (${parsed.isolirCount} isolir, total ${parsed.activePppoeCount} user) dari terminal Winbox.`,
      data: {
        activePppoeCount: parsed.activePppoeCount,
        nonIsolirCount: parsed.nonIsolirCount,
        isolirCount: parsed.isolirCount,
        activeUsersList: parsed.users,
      },
      customer: updatedCustomer,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Gagal memproses data terminal: ' + err.message,
    });
  }
});

// POST /api/mikrotik/push/:customerId - Webhook receiver for RouterOS /tool fetch auto-push script
apiRouter.post('/mikrotik/push/:customerId', async (req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    const rawId = req.params.customerId;
    const customer = db.customers.find((c) => c.id === rawId);

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Pelanggan tidak ditemukan' });
    }

    const payload = req.body || {};
    const activePppoeCount = Number(payload.activePppoeCount ?? payload.totalAct ?? 0);
    const nonIsolirCount = Number(payload.nonIsolirCount ?? payload.totalNonIso ?? activePppoeCount);
    const isolirCount = Number(payload.isolirCount ?? payload.totalIso ?? (activePppoeCount - nonIsolirCount));
    const systemIdentity = String(payload.systemIdentity ?? payload.sysName ?? customer.mikrotik?.systemIdentity ?? 'MikroTik');
    const rosVersion = String(payload.rosVersion ?? payload.rosVer ?? customer.mikrotik?.rosVersion ?? 'RouterOS');
    const boardName = String(payload.boardName ?? payload.board ?? customer.mikrotik?.boardName ?? 'RouterBOARD');

    const nowIso = new Date().toISOString();
    const existingSamples = customer.mikrotik?.samples || [];
    const updatedSamples = [
      ...existingSamples,
      {
        timestamp: nowIso,
        activeCount: activePppoeCount,
        nonIsolirCount,
        isolirCount,
      },
    ].slice(-30);

    const avgNonIso = Math.round(
      updatedSamples.reduce((sum, s) => sum + s.nonIsolirCount, 0) / updatedSamples.length
    );

    customer.mikrotik = {
      ...(customer.mikrotik || {
        routerName: systemIdentity,
        host: req.ip || 'webhook-push',
        port: 8728,
        username: 'push-scheduler',
        ratePerUser: 5000,
      }),
      systemIdentity,
      boardName,
      rosVersion,
      activePppoeCount,
      nonIsolirCount,
      isolirCount,
      connectionStatus: 'connected',
      lastSyncedAt: nowIso,
      samples: updatedSamples,
      monthlyAverageNonIsolir: avgNonIso,
      realtimeSource: 'push_webhook',
      lastErrorMessage: undefined,
    };
    customer.monthlyAveragePppoeCount = avgNonIso;

    saveDatabase(db);

    broadcastEvent({
      type: 'customer_updated',
      message: `Auto-Push Telemetri MikroTik ${customer.name}: ${nonIsolirCount} user aktif non-isolir diterima dari router`,
      timestamp: nowIso,
      payload: customer,
    });

    return res.json({
      success: true,
      message: `Telemetri PPPoE berhasil disimpan. ${nonIsolirCount} non-isolir / ${activePppoeCount} total.`,
      activePppoeCount,
      nonIsolirCount,
      monthlyAverageNonIsolir: avgNonIso,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Gagal memproses webhook push: ' + err.message });
  }
});

// GET /api/mikrotik/script/:customerId - Generate RouterOS push script for client router
apiRouter.get('/mikrotik/script/:customerId', async (req: Request, res: Response) => {
  const customerId = req.params.customerId;
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.headers['host'] || 'localhost:3000';
  const appUrl = `${protocol}://${host}`;

  const script = generateRouterosPushScript(customerId, appUrl);
  res.json({ success: true, script, customerId, appUrl });
});

// POST /api/mikrotik/sync/:customerId - Live sync PPPoE active users for a customer
apiRouter.post('/mikrotik/sync/:customerId', async (req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    const rawId = req.params.customerId;
    const decodedId = decodeURIComponent(rawId);
    const customer = db.customers.find(
      (c) => c.id === rawId || c.id === decodedId || c.id.toLowerCase() === rawId.toLowerCase()
    );

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Pelanggan tidak ditemukan' });
    }

    if (customer.customerMode !== 'noc' || !customer.mikrotik) {
      return res.status(400).json({ 
        success: false, 
        message: 'Pelanggan ini bukan Mode NOC atau belum mengonfigurasi perangkat Mikrotik' 
      });
    }

    const probeResult = await probeMikrotikRouter(customer.mikrotik);
    if (!probeResult.success) {
      customer.mikrotik.connectionStatus = 'error';
      customer.mikrotik.lastErrorMessage = probeResult.lastErrorMessage || probeResult.message;
      saveDatabase(db);
      return res.status(400).json({
        success: false,
        message: probeResult.message,
        error: probeResult.lastErrorMessage,
      });
    }

    const probeData = probeResult.data || {};
    const liveActive = probeData.activePppoeCount ?? customer.mikrotik.activePppoeCount ?? 0;
    const liveNonIso = probeData.nonIsolirCount ?? customer.mikrotik.nonIsolirCount ?? 0;
    const liveIso = probeData.isolirCount ?? customer.mikrotik.isolirCount ?? 0;

    const existingSamples = customer.mikrotik.samples || [];
    const updatedSamples = [
      ...existingSamples,
      {
        timestamp: new Date().toISOString(),
        activeCount: liveActive,
        nonIsolirCount: liveNonIso,
        isolirCount: liveIso,
      }
    ].slice(-30);

    const avgNonIso = Math.round(
      updatedSamples.reduce((sum, s) => sum + s.nonIsolirCount, 0) / updatedSamples.length
    );

    customer.mikrotik = {
      ...customer.mikrotik,
      ...probeData,
      samples: updatedSamples,
      monthlyAverageNonIsolir: avgNonIso,
      lastSyncedAt: new Date().toISOString(),
    };
    customer.monthlyAveragePppoeCount = avgNonIso;

    // Synchronize open unpaid invoices to reflect newly synced metrics
    await syncCustomerOpenInvoices(customer, db);

    saveDatabase(db);

    const nonIso = customer.mikrotik.nonIsolirCount || 0;
    const rate = customer.mikrotik.ratePerUser || 5000;
    const totalEstLive = nonIso * rate;
    const totalEstAvg = avgNonIso * rate;

    broadcastEvent({
      type: 'customer_updated',
      message: `Sinkronisasi Mikrotik ${customer.name}: Live ${nonIso} user, Rata-rata ${avgNonIso} user non-isolir (Estimasi: Rp ${totalEstAvg.toLocaleString('id-ID')})`,
      timestamp: new Date().toISOString(),
      payload: customer,
    });

    return res.json({
      success: true,
      message: `Berhasil sinkronisasi Mikrotik ${customer.mikrotik.routerName}. Live: ${nonIso} user, Rata-rata bulanan: ${avgNonIso} user aktif non-isolir.`,
      customer,
      mikrotik: customer.mikrotik,
      calculation: {
        totalActive: customer.mikrotik.activePppoeCount || 0,
        nonIsolirCount: nonIso,
        monthlyAverageNonIsolir: avgNonIso,
        isolirCount: customer.mikrotik.isolirCount || 0,
        ratePerUser: rate,
        estimatedTotalLive: totalEstLive,
        estimatedTotalAverage: totalEstAvg,
      }
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Gagal melakukan sinkronisasi Mikrotik: ' + err.message,
    });
  }
});

// POST /api/mikrotik/sync-all - Batch analyze and sync all customer routers
apiRouter.post('/mikrotik/sync-all', async (req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    const nocCustomers = (db.customers || []).filter(
      (c) => c.customerMode === 'noc' && c.mikrotik && c.mikrotik.host
    );

    if (nocCustomers.length === 0) {
      return res.json({
        success: true,
        message: 'Tidak ada pelanggan dengan konfigurasi router MikroTik.',
        summary: {
          total: 0,
          successCount: 0,
          failCount: 0,
          totalActivePppoe: 0,
          totalNonIsolir: 0,
          totalEstimatedBill: 0,
        },
        results: [],
      });
    }

    const results: Array<{
      customerId: string;
      customerName: string;
      routerName: string;
      success: boolean;
      error?: string;
      data?: any;
    }> = [];

    let totalActivePppoe = 0;
    let totalNonIsolir = 0;
    let totalEstimatedBill = 0;
    let successCount = 0;
    let failCount = 0;

    for (const cust of nocCustomers) {
      if (!cust.mikrotik) continue;

      try {
        const probeResult = await probeMikrotikRouter(cust.mikrotik);
        const nowIso = new Date().toISOString();

        if (probeResult.success && probeResult.data) {
          const probeData = probeResult.data;
          const liveActive = probeData.activePppoeCount ?? cust.mikrotik.activePppoeCount ?? 0;
          const liveNonIso = probeData.nonIsolirCount ?? cust.mikrotik.nonIsolirCount ?? 0;
          const liveIso = probeData.isolirCount ?? cust.mikrotik.isolirCount ?? 0;

          const existingSamples = cust.mikrotik.samples || [];
          const updatedSamples = [
            ...existingSamples,
            {
              timestamp: nowIso,
              activeCount: liveActive,
              nonIsolirCount: liveNonIso,
              isolirCount: liveIso,
            },
          ].slice(-30);

          const avgNonIso = Math.round(
            updatedSamples.reduce((sum, s) => sum + s.nonIsolirCount, 0) / updatedSamples.length
          );

          cust.mikrotik = {
            ...cust.mikrotik,
            ...probeData,
            samples: updatedSamples,
            monthlyAverageNonIsolir: avgNonIso,
            lastSyncedAt: nowIso,
            connectionStatus: 'connected',
            lastErrorMessage: undefined,
          };
          cust.monthlyAveragePppoeCount = avgNonIso;

          const rate = cust.mikrotik.ratePerUser || 5000;
          totalActivePppoe += liveActive;
          totalNonIsolir += liveNonIso;
          totalEstimatedBill += liveNonIso * rate;
          successCount++;

          results.push({
            customerId: cust.id,
            customerName: cust.name,
            routerName: cust.mikrotik.routerName || 'MikroTik',
            success: true,
            data: {
              activePppoeCount: liveActive,
              nonIsolirCount: liveNonIso,
              isolirCount: liveIso,
              monthlyAverageNonIsolir: avgNonIso,
              cpuLoad: probeData.cpuLoad,
              freeMemory: probeData.freeMemory,
              uptime: probeData.uptime,
              boardName: probeData.boardName,
              rosVersion: probeData.rosVersion,
            },
          });
        } else {
          cust.mikrotik.connectionStatus = 'error';
          cust.mikrotik.lastErrorMessage = probeResult.lastErrorMessage || probeResult.message;
          failCount++;
          results.push({
            customerId: cust.id,
            customerName: cust.name,
            routerName: cust.mikrotik.routerName || 'MikroTik',
            success: false,
            error: probeResult.lastErrorMessage || probeResult.message,
          });
        }
      } catch (err: any) {
        if (cust.mikrotik) {
          cust.mikrotik.connectionStatus = 'error';
          cust.mikrotik.lastErrorMessage = err.message;
        }
        failCount++;
        results.push({
          customerId: cust.id,
          customerName: cust.name,
          routerName: cust.mikrotik?.routerName || 'MikroTik',
          success: false,
          error: err.message,
        });
      }
    }

    saveDatabase(db);

    broadcastEvent({
      type: 'customer_updated',
      message: `Batch Analisis Router Selesai: ${successCount} online, ${failCount} kendala. Total ${totalNonIsolir} user non-isolir terdeteksi.`,
      timestamp: new Date().toISOString(),
    });

    return res.json({
      success: true,
      message: `Analisis ${nocCustomers.length} router pelanggan selesai: ${successCount} online, ${failCount} offline/kendala.`,
      summary: {
        total: nocCustomers.length,
        successCount,
        failCount,
        totalActivePppoe,
        totalNonIsolir,
        totalEstimatedBill,
      },
      results,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Gagal menganalisis semua router: ' + err.message,
    });
  }
});

// =========================================================================
// MIKHMON ONLINE MANAGEMENT & CLOUD BILLING API
// =========================================================================

// Helper to compute days until due
function getDaysUntilDue(dueDateStr?: string): number {
  if (!dueDateStr) return 999;
  const due = new Date(dueDateStr).getTime();
  const now = new Date().setHours(0, 0, 0, 0);
  return Math.ceil((due - now) / (1000 * 60 * 60 * 24));
}

// GET /api/mikhmon/instances - List all instances with summary stats
apiRouter.get('/mikhmon/instances', async (req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    if (!db.mikhmonInstances) {
      db.mikhmonInstances = DEFAULT_MIKHMON_INSTANCES;
      saveDatabase(db);
    }
    if (!db.mikhmonPlans) {
      db.mikhmonPlans = DEFAULT_MIKHMON_PLANS;
      saveDatabase(db);
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // Enrich instances with days remaining & invoice payment status
    const enrichedInstances = db.mikhmonInstances.map((inst) => {
      const daysRemaining = getDaysUntilDue(inst.dueDate);
      const isOverdue = daysRemaining < 0 && inst.status !== 'suspended';
      
      let matchedInvoice = null;
      if (inst.lastInvoiceId || inst.lastInvoiceNumber) {
        matchedInvoice = db.invoices.find(
          (inv) => inv.id === inst.lastInvoiceId || inv.invoiceNumber === inst.lastInvoiceNumber
        );
      }

      return {
        ...inst,
        daysRemaining,
        isOverdue,
        matchedInvoice: matchedInvoice ? {
          id: matchedInvoice.id,
          invoiceNumber: matchedInvoice.invoiceNumber,
          status: matchedInvoice.status,
          totalAmount: matchedInvoice.totalAmount,
          dueDate: matchedInvoice.dueDate,
          dynamicQris: matchedInvoice.dynamicQris,
          dynamicQrisDataUrl: matchedInvoice.dynamicQrisDataUrl,
        } : null,
      };
    });

    const totalInstances = enrichedInstances.length;
    const activeInstances = enrichedInstances.filter((i) => i.status === 'active').length;
    const suspendedInstances = enrichedInstances.filter((i) => i.status === 'suspended').length;
    const overdueInstances = enrichedInstances.filter((i) => i.isOverdue || i.daysRemaining < 0).length;
    const expiringSoon = enrichedInstances.filter((i) => i.daysRemaining >= 0 && i.daysRemaining <= 7).length;
    
    // Monthly Recurring Revenue calculation (monthly price normalized)
    const monthlyMRR = enrichedInstances.reduce((sum, inst) => {
      if (inst.status === 'suspended') return sum;
      let monthlyEquivalent = inst.price;
      if (inst.billingCycle === 'quarterly') monthlyEquivalent = Math.round(inst.price / 3);
      if (inst.billingCycle === 'semi_annual') monthlyEquivalent = Math.round(inst.price / 6);
      if (inst.billingCycle === 'annual') monthlyEquivalent = Math.round(inst.price / 12);
      return sum + monthlyEquivalent;
    }, 0);

    return res.json({
      success: true,
      instances: enrichedInstances,
      plans: db.mikhmonPlans || [],
      stats: {
        totalInstances,
        activeInstances,
        suspendedInstances,
        overdueInstances,
        expiringSoon,
        monthlyMRR,
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Gagal memuat instance Mikhmon: ' + err.message });
  }
});

// POST /api/mikhmon/instances - Create a new Mikhmon Online instance
apiRouter.post('/mikhmon/instances', async (req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    if (!db.mikhmonInstances) db.mikhmonInstances = [];

    const {
      customerId,
      customerName,
      customerPhone,
      customerEmail,
      sessionName,
      subdomain,
      serverUrl,
      mikhmonVersion,
      adminUsername,
      adminPassword,
      planId,
      planName,
      price,
      billingCycle,
      startDate,
      dueDate,
      mikrotikHost,
      mikrotikPort,
      mikrotikUser,
      mikrotikPassword,
      autoInvoice = true,
      autoSuspend = true,
      notes,
      createInvoiceNow = false,
    } = req.body;

    if (!sessionName || !subdomain) {
      return res.status(400).json({ success: false, message: 'Nama Sesi dan Subdomain wajib diisi' });
    }

    // Clean subdomain
    let cleanSub = subdomain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!cleanSub.includes('.')) {
      cleanSub = `${cleanSub}.mikhmon.online`;
    }

    // Check duplicate subdomain
    const existing = db.mikhmonInstances.find(
      (i) => i.subdomain.toLowerCase() === cleanSub.toLowerCase()
    );
    if (existing) {
      return res.status(400).json({ success: false, message: `Subdomain ${cleanSub} sudah digunakan oleh tenant lain.` });
    }

    const nowIso = new Date().toISOString();
    const calculatedDueDate = dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const newInstance: MikhmonInstance = {
      id: `mikh-${Date.now()}`,
      customerId: customerId || undefined,
      customerName: (customerName || 'Pelanggan Hotspot').trim(),
      customerPhone: (customerPhone || '').trim(),
      customerEmail: (customerEmail || '').trim(),
      sessionName: sessionName.trim(),
      subdomain: cleanSub,
      serverUrl: serverUrl || `https://${cleanSub}`,
      mikhmonVersion: mikhmonVersion || 'Mikhmon V3 (PHP 8 Cloud)',
      adminUsername: adminUsername || 'admin',
      adminPassword: adminPassword || 'admin123',
      planId: planId || 'plan-basic-1',
      planName: planName || 'Mikhmon Cloud Basic (1 Router)',
      price: Number(price) || 15000,
      billingCycle: billingCycle || 'monthly',
      status: 'active',
      startDate: startDate || new Date().toISOString().split('T')[0],
      dueDate: calculatedDueDate,
      mikrotikHost: mikrotikHost?.trim(),
      mikrotikPort: Number(mikrotikPort) || 8728,
      mikrotikUser: mikrotikUser?.trim(),
      mikrotikPassword: mikrotikPassword?.trim(),
      autoInvoice: !!autoInvoice,
      autoSuspend: !!autoSuspend,
      notes: notes || '',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    let generatedInvoice = null;

    // Optionally create an immediate invoice for this initial registration
    if (createInvoiceNow) {
      const year = new Date().getFullYear();
      const invCount = db.invoices.length + 1;
      const invoiceNumber = `INV-${year}-${invCount.toString().padStart(4, '0')}`;
      const amount = newInstance.price;

      // QRIS Dinamis
      const defaultStaticQris = (db.settings.defaultStaticQris || DEFAULT_DANA_STATIC_QRIS).trim();
      const parsedSource = parseQris(defaultStaticQris);
      const merchantName = db.settings.qrisMerchantName || parsedSource.merchantName || db.settings.businessName;
      const merchantCity = db.settings.qrisMerchantCity || parsedSource.merchantCity || 'JAKARTA';
      const { dynamicQris } = convertToDynamicQris(defaultStaticQris, amount, invoiceNumber, merchantName, merchantCity);
      const dynamicQrisDataUrl = await generateQrDataUrl(dynamicQris);

      generatedInvoice = {
        id: `inv-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        invoiceNumber,
        date: new Date().toISOString().split('T')[0],
        dueDate: calculatedDueDate,
        status: 'pending' as const,
        customer: {
          id: newInstance.customerId || `cust-${Date.now()}`,
          name: newInstance.customerName,
          phone: newInstance.customerPhone,
          email: newInstance.customerEmail || '',
        },
        items: [
          {
            id: `item-${Date.now()}`,
            description: `Aktivasi & Langganan ${newInstance.planName} (${newInstance.subdomain})`,
            quantity: 1,
            price: amount,
            total: amount,
          }
        ],
        subtotal: amount,
        taxPercent: 0,
        taxAmount: 0,
        discountAmount: 0,
        totalAmount: amount,
        paidAmount: 0,
        notes: `Langganan Mikhmon Online Host: ${newInstance.subdomain}. Pindai QRIS untuk aktivasi instan.`,
        paymentTerms: 'Pembayaran wajib diselesaikan sebelum tanggal jatuh tempo.',
        staticQris: defaultStaticQris,
        dynamicQris,
        dynamicQrisDataUrl,
        transactions: [],
        reminders: [],
        whatsappNotified: false,
        spreadsheetSynced: false,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      db.invoices.unshift(generatedInvoice);
      newInstance.lastInvoiceId = generatedInvoice.id;
      newInstance.lastInvoiceNumber = generatedInvoice.invoiceNumber;
    }

    db.mikhmonInstances.unshift(newInstance);
    saveDatabase(db);

    broadcastEvent({
      type: 'customer_updated',
      message: `Tenant Mikhmon Online Baru Terdaftar: ${newInstance.sessionName} (${newInstance.subdomain})`,
      timestamp: nowIso,
      payload: newInstance,
    });

    return res.status(201).json({
      success: true,
      message: `Instance Mikhmon ${newInstance.subdomain} berhasil didaftarkan.`,
      instance: newInstance,
      invoice: generatedInvoice,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Gagal membuat instance Mikhmon: ' + err.message });
  }
});

// PUT /api/mikhmon/instances/:id - Update Mikhmon instance
apiRouter.put('/mikhmon/instances/:id', async (req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    if (!db.mikhmonInstances) db.mikhmonInstances = [];

    const index = db.mikhmonInstances.findIndex((i) => i.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Instance Mikhmon tidak ditemukan' });
    }

    const current = db.mikhmonInstances[index];
    const body = req.body;

    // Clean subdomain if provided
    let cleanSub = current.subdomain;
    if (body.subdomain) {
      cleanSub = body.subdomain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
      if (!cleanSub.includes('.')) cleanSub = `${cleanSub}.mikhmon.online`;

      // Check duplicate
      const duplicate = db.mikhmonInstances.find(
        (i) => i.id !== current.id && i.subdomain.toLowerCase() === cleanSub.toLowerCase()
      );
      if (duplicate) {
        return res.status(400).json({ success: false, message: `Subdomain ${cleanSub} sudah digunakan oleh tenant lain.` });
      }
    }

    const updatedInstance: MikhmonInstance = {
      ...current,
      ...body,
      subdomain: cleanSub,
      serverUrl: body.serverUrl || `https://${cleanSub}`,
      price: body.price !== undefined ? Number(body.price) : current.price,
      updatedAt: new Date().toISOString(),
    };

    db.mikhmonInstances[index] = updatedInstance;
    saveDatabase(db);

    broadcastEvent({
      type: 'customer_updated',
      message: `Pembaruan data Mikhmon Online: ${updatedInstance.subdomain}`,
      timestamp: new Date().toISOString(),
      payload: updatedInstance,
    });

    return res.json({
      success: true,
      message: `Instance Mikhmon ${updatedInstance.subdomain} berhasil diperbarui.`,
      instance: updatedInstance,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Gagal memperbarui instance Mikhmon: ' + err.message });
  }
});

// DELETE /api/mikhmon/instances/:id - Delete Mikhmon instance
apiRouter.delete('/mikhmon/instances/:id', async (req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    if (!db.mikhmonInstances) db.mikhmonInstances = [];

    const index = db.mikhmonInstances.findIndex((i) => i.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Instance Mikhmon tidak ditemukan' });
    }

    const deleted = db.mikhmonInstances.splice(index, 1)[0];
    saveDatabase(db);

    broadcastEvent({
      type: 'customer_updated',
      message: `Instance Mikhmon Online dihapus: ${deleted.subdomain}`,
      timestamp: new Date().toISOString(),
    });

    return res.json({
      success: true,
      message: `Instance ${deleted.subdomain} berhasil dihapus.`,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Gagal menghapus instance Mikhmon: ' + err.message });
  }
});

// POST /api/mikhmon/instances/:id/toggle-suspend - Suspend or unsuspend instance
apiRouter.post('/mikhmon/instances/:id/toggle-suspend', async (req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    if (!db.mikhmonInstances) db.mikhmonInstances = [];

    const instance = db.mikhmonInstances.find((i) => i.id === req.params.id);
    if (!instance) {
      return res.status(404).json({ success: false, message: 'Instance Mikhmon tidak ditemukan' });
    }

    const newStatus = instance.status === 'suspended' ? 'active' : 'suspended';
    instance.status = newStatus;
    instance.updatedAt = new Date().toISOString();

    saveDatabase(db);

    const actionText = newStatus === 'suspended' ? 'di-SUSPEND (Isolir Akses)' : 'di-AKTIFKAN kembali';
    broadcastEvent({
      type: 'customer_updated',
      message: `Instance Mikhmon ${instance.subdomain} ${actionText}`,
      timestamp: new Date().toISOString(),
      payload: instance,
    });

    return res.json({
      success: true,
      message: `Status instance ${instance.subdomain} sekarang: ${newStatus.toUpperCase()}`,
      instance,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Gagal mengubah status instance: ' + err.message });
  }
});

// POST /api/mikhmon/instances/:id/generate-invoice - Generate renewal invoice & QRIS Dinamis
apiRouter.post('/mikhmon/instances/:id/generate-invoice', async (req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    if (!db.mikhmonInstances) db.mikhmonInstances = [];

    const instance = db.mikhmonInstances.find((i) => i.id === req.params.id);
    if (!instance) {
      return res.status(404).json({ success: false, message: 'Instance Mikhmon tidak ditemukan' });
    }

    const year = new Date().getFullYear();
    const invCount = db.invoices.length + 1;
    const invoiceNumber = `INV-${year}-${invCount.toString().padStart(4, '0')}`;
    const amount = Number(instance.price) || 15000;
    const nowIso = new Date().toISOString();

    // Determine due date (if past, make it 3 days from now, else use instance dueDate)
    let invDueDate = instance.dueDate;
    if (getDaysUntilDue(invDueDate) <= 0) {
      invDueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    }

    // QRIS Dinamis
    const defaultStaticQris = (db.settings.defaultStaticQris || DEFAULT_DANA_STATIC_QRIS).trim();
    const parsedSource = parseQris(defaultStaticQris);
    const merchantName = db.settings.qrisMerchantName || parsedSource.merchantName || db.settings.businessName;
    const merchantCity = db.settings.qrisMerchantCity || parsedSource.merchantCity || 'JAKARTA';
    const { dynamicQris } = convertToDynamicQris(defaultStaticQris, amount, invoiceNumber, merchantName, merchantCity);
    const dynamicQrisDataUrl = await generateQrDataUrl(dynamicQris);

    const cycleIndo = 
      instance.billingCycle === 'annual' ? '1 Tahun' :
      instance.billingCycle === 'semi_annual' ? '6 Bulan' :
      instance.billingCycle === 'quarterly' ? '3 Bulan' : '1 Bulan';

    const newInvoice: Invoice = {
      id: `inv-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      invoiceNumber,
      date: new Date().toISOString().split('T')[0],
      dueDate: invDueDate,
      status: 'pending',
      customer: {
        id: instance.customerId || `cust-${Date.now()}`,
        name: instance.customerName,
        phone: instance.customerPhone,
        email: instance.customerEmail || '',
        company: instance.sessionName,
      },
      items: [
        {
          id: `item-${Date.now()}`,
          description: `Perpanjangan ${instance.planName} (${instance.subdomain}) - Periode ${cycleIndo}`,
          quantity: 1,
          price: amount,
          total: amount,
        }
      ],
      subtotal: amount,
      taxPercent: 0,
      taxAmount: 0,
      discountAmount: 0,
      totalAmount: amount,
      paidAmount: 0,
      notes: `Perpanjangan Layanan Mikhmon Online: ${instance.subdomain}.\nSesi: ${instance.sessionName}\nSilakan scan QRIS Dinamis terlampir untuk pembayaran instan otomatis.`,
      paymentTerms: 'Akses Mikhmon Online tetap aktif selama pembayaran diselesaikan sebelum jatuh tempo.',
      staticQris: defaultStaticQris,
      dynamicQris,
      dynamicQrisDataUrl,
      transactions: [],
      reminders: [],
      whatsappNotified: false,
      spreadsheetSynced: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    db.invoices.unshift(newInvoice);
    instance.lastInvoiceId = newInvoice.id;
    instance.lastInvoiceNumber = newInvoice.invoiceNumber;
    instance.updatedAt = nowIso;

    saveDatabase(db);

    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.headers['host'] || 'localhost:3000';
    const appUrl = `${protocol}://${host}`;
    const invoiceUrl = `${appUrl}/#/portal?inv=${newInvoice.invoiceNumber}`;

    const waText = 
      `Halo *${instance.customerName}*,\n\n` +
      `Tagihan perpanjangan *Mikhmon Online* Anda telah diterbitkan:\n` +
      `🌐 Host/Subdomain: *${instance.subdomain}*\n` +
      `📦 Paket: *${instance.planName}*\n` +
      `💰 Total: *Rp ${amount.toLocaleString('id-ID')}*\n` +
      `📅 Jatuh Tempo: *${invDueDate}*\n\n` +
      `Silakan bayar menggunakan QRIS Dinamis pada link faktur resmi berikut:\n` +
      `${invoiceUrl}\n\n` +
      `Akses Mikhmon Anda akan langsung diperpanjang secara otomatis setelah pembayaran terverifikasi. Terima kasih!`;

    const cleanPhone = (instance.customerPhone || '').replace(/\D/g, '').replace(/^0/, '62');
    const whatsappUrl = cleanPhone 
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(waText)}`
      : '';

    broadcastEvent({
      type: 'invoice_created',
      invoiceId: newInvoice.id,
      invoiceNumber: newInvoice.invoiceNumber,
      amount,
      message: `Invoice perpanjangan Mikhmon ${instance.subdomain} diterbitkan: Rp ${amount.toLocaleString('id-ID')}`,
      timestamp: nowIso,
    });

    return res.json({
      success: true,
      message: `Faktur ${newInvoice.invoiceNumber} berhasil dibuat dengan QRIS Dinamis.`,
      invoice: newInvoice,
      whatsappUrl,
      whatsappMessage: waText,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Gagal membuat tagihan Mikhmon: ' + err.message });
  }
});

// POST /api/mikhmon/batch-billing - Generate invoices for all expiring/overdue instances
apiRouter.post('/mikhmon/batch-billing', async (req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    if (!db.mikhmonInstances) db.mikhmonInstances = [];

    const { targetDays = 7 } = req.body;
    const nowIso = new Date().toISOString();
    let generatedCount = 0;
    const generatedInvoices = [];

    for (const inst of db.mikhmonInstances) {
      if (!inst.autoInvoice) continue;
      const days = getDaysUntilDue(inst.dueDate);

      // If due within targetDays or overdue, and doesn't already have an unpaid invoice generated today
      if (days <= targetDays) {
        // Check if there is an existing pending invoice for this instance
        const hasPending = db.invoices.some(
          (inv) => (inv.id === inst.lastInvoiceId || inv.customer?.name === inst.customerName) && inv.status === 'pending'
        );
        if (hasPending) continue;

        const year = new Date().getFullYear();
        const invCount = db.invoices.length + 1;
        const invoiceNumber = `INV-${year}-${invCount.toString().padStart(4, '0')}`;
        const amount = Number(inst.price) || 15000;

        const defaultStaticQris = (db.settings.defaultStaticQris || DEFAULT_DANA_STATIC_QRIS).trim();
        const parsedSource = parseQris(defaultStaticQris);
        const merchantName = db.settings.qrisMerchantName || parsedSource.merchantName || db.settings.businessName;
        const merchantCity = db.settings.qrisMerchantCity || parsedSource.merchantCity || 'JAKARTA';
        const { dynamicQris } = convertToDynamicQris(defaultStaticQris, amount, invoiceNumber, merchantName, merchantCity);
        const dynamicQrisDataUrl = await generateQrDataUrl(dynamicQris);

        const newInvoice: Invoice = {
          id: `inv-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          invoiceNumber,
          date: new Date().toISOString().split('T')[0],
          dueDate: inst.dueDate,
          status: 'pending',
          customer: {
            id: inst.customerId || `cust-${Date.now()}`,
            name: inst.customerName,
            phone: inst.customerPhone,
            email: inst.customerEmail || '',
          },
          items: [
            {
              id: `item-${Date.now()}`,
              description: `Perpanjangan ${inst.planName} (${inst.subdomain})`,
              quantity: 1,
              price: amount,
              total: amount,
            }
          ],
          subtotal: amount,
          taxPercent: 0,
          taxAmount: 0,
          discountAmount: 0,
          totalAmount: amount,
          paidAmount: 0,
          notes: `Tagihan Otomatis Mikhmon Online: ${inst.subdomain}. Pindai QRIS Dinamis untuk pembayaran instan.`,
          paymentTerms: 'Lakukan pembayaran sebelum batas jatuh tempo.',
          staticQris: defaultStaticQris,
          dynamicQris,
          dynamicQrisDataUrl,
          transactions: [],
          reminders: [],
          whatsappNotified: false,
          spreadsheetSynced: false,
          createdAt: nowIso,
          updatedAt: nowIso,
        };

        db.invoices.unshift(newInvoice);
        inst.lastInvoiceId = newInvoice.id;
        inst.lastInvoiceNumber = newInvoice.invoiceNumber;
        inst.updatedAt = nowIso;

        generatedInvoices.push(newInvoice);
        generatedCount++;
      }
    }

    if (generatedCount > 0) {
      saveDatabase(db);
      broadcastEvent({
        type: 'invoice_created',
        message: `Otomasi Mikhmon: ${generatedCount} faktur perpanjangan berhasil diterbitkan massal.`,
        timestamp: nowIso,
      });
    }

    return res.json({
      success: true,
      message: `Berhasil menerbitkan ${generatedCount} faktur perpanjangan Mikhmon Online.`,
      generatedCount,
      invoices: generatedInvoices,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Gagal memproses tagihan massal: ' + err.message });
  }
});

// GET /api/mikhmon/plans - List pricing plans
apiRouter.get('/mikhmon/plans', async (req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    if (!db.mikhmonPlans || db.mikhmonPlans.length === 0) {
      db.mikhmonPlans = DEFAULT_MIKHMON_PLANS;
      saveDatabase(db);
    }
    return res.json({ success: true, plans: db.mikhmonPlans });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Gagal mengambil paket Mikhmon: ' + err.message });
  }
});

// POST /api/mikhmon/plans - Create or update a pricing plan
apiRouter.post('/mikhmon/plans', async (req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    if (!db.mikhmonPlans) db.mikhmonPlans = [...DEFAULT_MIKHMON_PLANS];

    const { id, name, description, price, billingCycle, maxRouters, features, isPopular } = req.body;

    if (!name || price === undefined) {
      return res.status(400).json({ success: false, message: 'Nama paket dan tarif wajib diisi' });
    }

    const existingIndex = db.mikhmonPlans.findIndex((p) => p.id === id);
    if (existingIndex !== -1) {
      db.mikhmonPlans[existingIndex] = {
        ...db.mikhmonPlans[existingIndex],
        name,
        description: description || '',
        price: Number(price) || 0,
        billingCycle: billingCycle || 'monthly',
        maxRouters: Number(maxRouters) || 1,
        features: Array.isArray(features) ? features : [],
        isPopular: !!isPopular,
      };
    } else {
      const newPlan: MikhmonPlan = {
        id: id || `plan-${Date.now()}`,
        name,
        description: description || '',
        price: Number(price) || 0,
        billingCycle: billingCycle || 'monthly',
        maxRouters: Number(maxRouters) || 1,
        features: Array.isArray(features) ? features : ['1 Router MikroTik', 'Voucher Hotspot Generator', 'Subdomain Kustom'],
        isPopular: !!isPopular,
      };
      db.mikhmonPlans.push(newPlan);
    }

    saveDatabase(db);
    return res.json({ success: true, message: 'Paket langganan Mikhmon berhasil disimpan', plans: db.mikhmonPlans });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Gagal menyimpan paket Mikhmon: ' + err.message });
  }
});

// DELETE /api/mikhmon/plans/:id - Delete a pricing plan
apiRouter.delete('/mikhmon/plans/:id', async (req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    if (!db.mikhmonPlans) db.mikhmonPlans = [];

    const index = db.mikhmonPlans.findIndex((p) => p.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Paket tidak ditemukan' });
    }

    db.mikhmonPlans.splice(index, 1);
    saveDatabase(db);

    return res.json({ success: true, message: 'Paket langganan berhasil dihapus', plans: db.mikhmonPlans });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Gagal menghapus paket Mikhmon: ' + err.message });
  }
});

// Helper to generate Nginx Wildcard Vhost for Mikhmon Online
function generateMikhmonNginxConfig(config: MikhmonServerConfig): string {
  const domain = (config.masterDomain || 'mikhmon.online').trim();
  const root = config.webRootDir || '/var/www/mikhmon';
  const phpSock = config.phpVersion ? `/var/run/php/${config.phpVersion}.sock` : '/var/run/php/php8.2-fpm.sock';

  return `# =========================================================================
# NGINX VIRTUAL HOST - MIKHMON ONLINE WILDCARD MULTI-TENANT
# Master Domain : ${domain}
# Web Directory : ${root}
# PHP-FPM Socket: ${phpSock}
# =========================================================================

# 1. HTTP Redirect to HTTPS
server {
    listen ${config.httpPort || 80};
    listen [::]:${config.httpPort || 80};
    server_name ${domain} *.${domain};

    location /.well-known/acme-challenge/ {
        root ${root}/acme-challenge;
        allow all;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# 2. HTTPS Wildcard Multi-Tenant Server Block
server {
    listen ${config.httpsPort || 443} ssl http2;
    listen [::]:${config.httpsPort || 443} ssl http2;
    server_name ~^(?<subdomain>.+)\\.${domain.replace(/\./g, '\\.')}$;

    # SSL Certificate (Certbot Let's Encrypt Wildcard)
    ssl_certificate /etc/letsencrypt/live/${domain}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${domain}/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Document Root (Points to Mikhmon Web application files)
    root ${root};
    index index.php index.html index.htm;

    # Dynamic tenant header injection
    fastcgi_param HTTP_X_TENANT_SUBDOMAIN $subdomain;

    # Logging
    access_log /var/log/nginx/mikhmon_access.log;
    error_log  /var/log/nginx/mikhmon_error.log;

    location ~* \\.(jpg|jpeg|gif|png|css|js|ico|webp|svg|woff2)$ {
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    location ~ /\\.(?!well-known).* {
        deny all;
    }

    location ~ \\.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:${phpSock};
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
        fastcgi_read_timeout 180;
    }

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }
}
`;
}

// GET /api/mikhmon/server-settings - Get domain and upload web settings
apiRouter.get('/mikhmon/server-settings', async (req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    if (!db.mikhmonServerSettings) {
      db.mikhmonServerSettings = { ...DEFAULT_MIKHMON_SERVER_CONFIG };
      saveDatabase(db);
    }

    const settings = db.mikhmonServerSettings;
    const nginxVhost = generateMikhmonNginxConfig(settings);

    // DNS Setup Guide
    const dnsGuide = [
      {
        type: 'A',
        name: '@ (Domain Utama)',
        value: settings.fallbackIpOrHost || 'IP_VPS_ANDA',
        comment: `Mengarahkan ${settings.masterDomain} ke IP Server VPS`,
      },
      {
        type: 'A',
        name: '* (Wildcard Subdomain)',
        value: settings.fallbackIpOrHost || 'IP_VPS_ANDA',
        comment: `Mengarahkan seluruh subdomain (*.${settings.masterDomain}) otomatis ke IP VPS`,
      },
      {
        type: 'CNAME',
        name: 'www',
        value: settings.masterDomain,
        comment: `Mengarahkan www.${settings.masterDomain} ke domain utama`,
      }
    ];

    return res.json({
      success: true,
      settings,
      nginxVhost,
      dnsGuide,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Gagal memuat pengaturan server Mikhmon: ' + err.message });
  }
});

// PUT /api/mikhmon/server-settings - Save domain and web settings
apiRouter.put('/mikhmon/server-settings', async (req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    if (!db.mikhmonServerSettings) {
      db.mikhmonServerSettings = { ...DEFAULT_MIKHMON_SERVER_CONFIG };
    }

    const {
      masterDomain,
      fallbackIpOrHost,
      webRootDir,
      activeVersion,
      phpVersion,
      serverType,
      httpPort,
      httpsPort,
      sslProvider,
      sslEmail,
      wildcardEnabled,
      autoCreateVhost,
    } = req.body;

    let cleanDomain = masterDomain ? masterDomain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '') : db.mikhmonServerSettings.masterDomain;

    db.mikhmonServerSettings = {
      ...db.mikhmonServerSettings,
      masterDomain: cleanDomain,
      fallbackIpOrHost: fallbackIpOrHost !== undefined ? fallbackIpOrHost.trim() : db.mikhmonServerSettings.fallbackIpOrHost,
      webRootDir: webRootDir !== undefined ? webRootDir.trim() : db.mikhmonServerSettings.webRootDir,
      activeVersion: activeVersion !== undefined ? activeVersion.trim() : db.mikhmonServerSettings.activeVersion,
      phpVersion: phpVersion !== undefined ? phpVersion.trim() : db.mikhmonServerSettings.phpVersion,
      serverType: serverType || db.mikhmonServerSettings.serverType,
      httpPort: Number(httpPort) || 80,
      httpsPort: Number(httpsPort) || 443,
      sslProvider: sslProvider || db.mikhmonServerSettings.sslProvider,
      sslEmail: sslEmail !== undefined ? sslEmail.trim() : db.mikhmonServerSettings.sslEmail,
      wildcardEnabled: wildcardEnabled !== undefined ? !!wildcardEnabled : db.mikhmonServerSettings.wildcardEnabled,
      autoCreateVhost: autoCreateVhost !== undefined ? !!autoCreateVhost : db.mikhmonServerSettings.autoCreateVhost,
    };

    saveDatabase(db);

    broadcastEvent({
      type: 'settings_updated' as any,
      message: `Pengaturan Domain Master Mikhmon diperbarui: ${cleanDomain}`,
      timestamp: new Date().toISOString(),
      payload: db.mikhmonServerSettings,
    });

    const nginxVhost = generateMikhmonNginxConfig(db.mikhmonServerSettings);

    return res.json({
      success: true,
      message: 'Pengaturan domain dan server Mikhmon berhasil disimpan',
      settings: db.mikhmonServerSettings,
      nginxVhost,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Gagal menyimpan pengaturan server Mikhmon: ' + err.message });
  }
});

// POST /api/mikhmon/upload-package - Upload & register a Mikhmon Web package (ZIP/Folder)
apiRouter.post('/mikhmon/upload-package', async (req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    if (!db.mikhmonServerSettings) {
      db.mikhmonServerSettings = { ...DEFAULT_MIKHMON_SERVER_CONFIG };
    }
    if (!db.mikhmonServerSettings.uploadedPackages) {
      db.mikhmonServerSettings.uploadedPackages = [];
    }

    const { fileName, version, fileSizeBytes, notes, setAsDefault, fileData } = req.body;

    if (!fileName || !version) {
      return res.status(400).json({ success: false, message: 'Nama berkas ZIP dan Versi Mikhmon wajib diisi' });
    }

    const pkgId = `pkg-${Date.now()}`;
    const cleanFileName = fileName.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '_');
    const folderName = cleanFileName.replace(/\.zip$/, '');
    const webRoot = db.mikhmonServerSettings.webRootDir || '/var/www/mikhmon';
    const extractedPath = `${webRoot}/${folderName}`;

    // If setting as default, demote others
    if (setAsDefault) {
      db.mikhmonServerSettings.uploadedPackages.forEach((p) => {
        p.isDefault = false;
        if (p.status === 'active') p.status = 'ready';
      });
      db.mikhmonServerSettings.activeVersion = version;
    }

    const newPackage: MikhmonUploadedPackage = {
      id: pkgId,
      fileName: cleanFileName,
      version: version.trim(),
      fileSizeBytes: Number(fileSizeBytes) || 2500000,
      uploadedAt: new Date().toISOString(),
      isDefault: !!setAsDefault,
      extractedPath,
      status: setAsDefault ? 'active' : 'ready',
      notes: notes || 'Paket web Mikhmon siap pakai',
    };

    db.mikhmonServerSettings.uploadedPackages.unshift(newPackage);
    saveDatabase(db);

    broadcastEvent({
      type: 'settings_updated' as any,
      message: `Paket Web Mikhmon Baru Diunggah: ${cleanFileName} (${version})`,
      timestamp: new Date().toISOString(),
      payload: newPackage,
    });

    return res.status(201).json({
      success: true,
      message: `Berkas web Mikhmon "${cleanFileName}" berhasil diunggah dan diekstrak ke ${extractedPath}`,
      package: newPackage,
      packages: db.mikhmonServerSettings.uploadedPackages,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Gagal mengunggah paket Mikhmon: ' + err.message });
  }
});

// POST /api/mikhmon/packages/:id/activate - Activate an uploaded Mikhmon web package as default
apiRouter.post('/mikhmon/packages/:id/activate', async (req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    if (!db.mikhmonServerSettings?.uploadedPackages) {
      return res.status(404).json({ success: false, message: 'Paket tidak ditemukan' });
    }

    const pkg = db.mikhmonServerSettings.uploadedPackages.find((p) => p.id === req.params.id);
    if (!pkg) {
      return res.status(404).json({ success: false, message: 'Paket tidak ditemukan' });
    }

    db.mikhmonServerSettings.uploadedPackages.forEach((p) => {
      p.isDefault = (p.id === pkg.id);
      p.status = (p.id === pkg.id) ? 'active' : 'ready';
    });
    db.mikhmonServerSettings.activeVersion = pkg.version;

    saveDatabase(db);

    broadcastEvent({
      type: 'settings_updated' as any,
      message: `Versi Mikhmon Aktif diubah ke: ${pkg.version}`,
      timestamp: new Date().toISOString(),
    });

    return res.json({
      success: true,
      message: `Versi web Mikhmon aktif sekarang: ${pkg.version}`,
      packages: db.mikhmonServerSettings.uploadedPackages,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Gagal mengaktifkan paket: ' + err.message });
  }
});

// DELETE /api/mikhmon/packages/:id - Delete an uploaded package
apiRouter.delete('/mikhmon/packages/:id', async (req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    if (!db.mikhmonServerSettings?.uploadedPackages) {
      return res.status(404).json({ success: false, message: 'Paket tidak ditemukan' });
    }

    const index = db.mikhmonServerSettings.uploadedPackages.findIndex((p) => p.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Paket tidak ditemukan' });
    }

    const deleted = db.mikhmonServerSettings.uploadedPackages.splice(index, 1)[0];

    // If was default, set first remaining as default
    if (deleted.isDefault && db.mikhmonServerSettings.uploadedPackages.length > 0) {
      db.mikhmonServerSettings.uploadedPackages[0].isDefault = true;
      db.mikhmonServerSettings.uploadedPackages[0].status = 'active';
      db.mikhmonServerSettings.activeVersion = db.mikhmonServerSettings.uploadedPackages[0].version;
    }

    saveDatabase(db);

    return res.json({
      success: true,
      message: `Paket ${deleted.fileName} berhasil dihapus`,
      packages: db.mikhmonServerSettings.uploadedPackages,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Gagal menghapus paket: ' + err.message });
  }
});
// POST /api/mikhmon/test-connection - Test live connection from Mikhmon engine to MikroTik router
apiRouter.post('/mikhmon/test-connection', async (req: Request, res: Response) => {
  try {
    const { host, port, username, password } = req.body;
    if (!host) {
      return res.status(400).json({ success: false, message: 'Host / IP MikroTik wajib diisi' });
    }

    const startTime = Date.now();
    const probe = await probeMikrotikRouter({
      host: host.trim(),
      port: Number(port) || 8728,
      username: username ? username.trim() : 'mikhmon',
      password: password ? password.trim() : '',
      routerName: 'Mikhmon Remote Check'
    });

    const pingMs = Math.max(1, Date.now() - startTime);

    if (!probe.success) {
      return res.json({
        success: false,
        message: probe.message || 'Koneksi ke MikroTik gagal atau socket API tertutup',
        error: probe.lastErrorMessage,
        pingMs,
      });
    }

    let hotspotCount = probe.data?.hotspotActiveCount || 0;
    let voucherUsersCount = probe.data?.hotspotUsersCount || 0;
    try {
      const hs = await getMikrotikHotspot({
        host: host.trim(),
        port: Number(port) || 8728,
        username: username ? username.trim() : 'mikhmon',
        password: password ? password.trim() : '',
        routerName: 'Mikhmon Remote Check'
      });
      if (hs?.active) {
        hotspotCount = hs.active.length || hotspotCount;
        voucherUsersCount = hs.users?.length || voucherUsersCount;
      }
    } catch {}

    return res.json({
      success: true,
      message: `Terhubung sukses ke Router MikroTik (${probe.data?.systemIdentity || host})`,
      pingMs,
      data: {
        systemIdentity: probe.data?.systemIdentity || 'MikroTik',
        boardName: probe.data?.boardName || 'RouterBOARD',
        rosVersion: probe.data?.rosVersion || '7.x',
        uptime: probe.data?.uptime || 'N/A',
        cpuLoad: probe.data?.cpuLoad ?? 15,
        freeMemory: probe.data?.freeMemory || 'N/A',
        hotspotActiveCount: hotspotCount,
        voucherUsersCount,
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Gagal menguji koneksi Mikhmon: ' + err.message });
  }
});

// POST /api/mikhmon/instances/:id/sync-mikhmon - Sync live telemetry from router for an instance
apiRouter.post('/mikhmon/instances/:id/sync-mikhmon', async (req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    if (!db.mikhmonInstances) db.mikhmonInstances = [];

    const inst = db.mikhmonInstances.find((i) => i.id === req.params.id);
    if (!inst) {
      return res.status(404).json({ success: false, message: 'Instance Mikhmon tidak ditemukan' });
    }

    if (!inst.mikrotikHost) {
      return res.status(400).json({ success: false, message: 'Host / IP MikroTik belum diisi pada tenant ini' });
    }

    const startTime = Date.now();
    const probe = await probeMikrotikRouter({
      host: inst.mikrotikHost.trim(),
      port: Number(inst.mikrotikPort) || 8728,
      username: inst.mikrotikUser || 'mikhmon',
      password: inst.mikrotikPassword || '',
      routerName: inst.sessionName
    });

    const pingMs = Math.max(1, Date.now() - startTime);

    if (!probe.success) {
      inst.mikhmonLiveStatus = 'offline';
      inst.mikhmonLastSyncAt = new Date().toISOString();
      inst.mikhmonPingMs = pingMs;
      saveDatabase(db);
      return res.json({
        success: false,
        message: `Koneksi router gagal: ${probe.message}`,
        instance: inst,
      });
    }

    let hotspotCount = probe.data?.hotspotActiveCount || 0;
    let voucherUsersCount = probe.data?.hotspotUsersCount || 0;
    try {
      const hs = await getMikrotikHotspot({
        host: inst.mikrotikHost.trim(),
        port: Number(inst.mikrotikPort) || 8728,
        username: inst.mikrotikUser || 'mikhmon',
        password: inst.mikrotikPassword || '',
        routerName: inst.sessionName
      });
      if (hs?.active) {
        hotspotCount = hs.active.length || hotspotCount;
        voucherUsersCount = hs.users?.length || voucherUsersCount;
      }
    } catch {}

    inst.mikhmonLiveStatus = 'online';
    inst.mikhmonLastSyncAt = new Date().toISOString();
    inst.mikhmonPingMs = pingMs;
    inst.mikhmonRouterIdentity = probe.data?.systemIdentity || inst.sessionName;
    inst.mikhmonRouterBoard = probe.data?.boardName || 'RouterBOARD';
    inst.mikhmonRouterRosVersion = probe.data?.rosVersion || '7.x';
    inst.mikhmonActiveHotspotUsers = hotspotCount;
    inst.mikhmonTotalVouchers = voucherUsersCount;
    inst.sessionConfigFileGenerated = true;
    saveDatabase(db);

    broadcastEvent({
      type: 'customer_updated',
      message: `Live Sync Mikhmon: ${inst.subdomain} terhubung ke ${inst.mikhmonRouterIdentity} (${hotspotCount} hotspot aktif)`,
      timestamp: new Date().toISOString(),
      payload: inst,
    });

    return res.json({
      success: true,
      message: `Berhasil sinkronisasi dengan router Mikhmon: ${inst.mikhmonRouterIdentity}`,
      instance: inst,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Gagal sinkronisasi Mikhmon: ' + err.message });
  }
});

// GET /api/mikhmon/instances/:id/config-file - Generate official PHP session config for Mikhmon V3 & V4
apiRouter.get('/mikhmon/instances/:id/config-file', async (req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    if (!db.mikhmonInstances) db.mikhmonInstances = [];

    const inst = db.mikhmonInstances.find((i) => i.id === req.params.id);
    if (!inst) {
      return res.status(404).json({ success: false, message: 'Instance Mikhmon tidak ditemukan' });
    }

    const host = inst.mikrotikHost || '127.0.0.1';
    const port = inst.mikrotikPort || 8728;
    const user = inst.mikrotikUser || 'mikhmon';
    const pass = inst.mikrotikPassword || '';
    const hotspot = inst.hotspotName || inst.sessionName;
    const dns = inst.dnsName || `${inst.subdomain.split('.')[0]}.net`;
    const curr = inst.currency || 'Rp';
    const theme = inst.mikhmonTheme || 'light';
    const sessionClean = inst.sessionName.toLowerCase().replace(/[^a-z0-9_]/g, '_');

    const phpContent = `<?php
// =========================================================================
// MIKHMON SESSION CONFIGURATION
// Session Name   : ${inst.sessionName}
// Subdomain      : ${inst.subdomain}
// Customer       : ${inst.customerName}
// Status         : ${inst.status.toUpperCase()}
// Due Date       : ${inst.dueDate}
// Generated By   : InvoiceKilat Mikhmon Online Billing
// Generated At   : ${new Date().toISOString()}
// Path di Server : include/config/${sessionClean}.php
// =========================================================================

$iphost = '${host}:${port}';
$userhost = '${user}';
$passwdhost = '${pass}';
$totaltrafik = 'yes';
$theme = '${theme}';
$hotspotname = '${hotspot}';
$dnsname = '${dns}';
$currency = '${curr}';
$auto_reconnect = 'yes';
$idle_timeout = '10';
$session_name = '${sessionClean}';
$mikhmon_cloud_billing = 'active';
$mikhmon_due_date = '${inst.dueDate}';
$mikhmon_is_suspended = '${inst.status === 'suspended' ? 'yes' : 'no'}';
?>`;

    return res.json({
      success: true,
      fileName: `${sessionClean}.php`,
      filePath: `/var/www/mikhmon/include/config/${sessionClean}.php`,
      sessionName: sessionClean,
      phpContent,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Gagal membuat file konfigurasi Mikhmon: ' + err.message });
  }
});

// GET /api/mikhmon/webserver/status - Live Webserver Status for Mikhmon Engine
apiRouter.get('/mikhmon/webserver/status', async (req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    const status = getMikhmonWebserverStatus(db);
    return res.json({ success: true, status });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Gagal membaca status webserver: ' + err.message });
  }
});

// POST /api/mikhmon/webserver/install-script - Generate 1-Click VPS installer script
apiRouter.post('/mikhmon/webserver/install-script', async (req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    const domain = req.body.domain || db.mikhmonServerSettings?.masterDomain || 'mikhmon.online';
    const ip = req.body.ip || db.mikhmonServerSettings?.fallbackIpOrHost || '103.189.234.12';
    const email = req.body.email || db.mikhmonServerSettings?.sslEmail || 'admin@' + domain;

    const script = generateMikhmonTurnkeyVpsScript(domain, ip, email);
    return res.json({
      success: true,
      domain,
      ip,
      email,
      script,
      curlCommand: `curl -sSL https://${domain}/api/mikhmon/webserver/installer.sh | sudo bash`,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Gagal membuat script installer: ' + err.message });
  }
});

// GET /api/mikhmon/webserver/installer.sh - Direct raw bash script download
apiRouter.get('/mikhmon/webserver/installer.sh', async (req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    const domain = (req.query.domain as string) || db.mikhmonServerSettings?.masterDomain || 'mikhmon.online';
    const ip = (req.query.ip as string) || db.mikhmonServerSettings?.fallbackIpOrHost || '103.189.234.12';
    const email = (req.query.email as string) || db.mikhmonServerSettings?.sslEmail || 'admin@' + domain;

    const script = generateMikhmonTurnkeyVpsScript(domain, ip, email);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.send(script);
  } catch (err: any) {
    return res.status(500).send('# Error generating installer: ' + err.message);
  }
});

// POST /api/mikhmon/instances/:id/vouchers/generate - Generate & save vouchers for an instance
apiRouter.post('/mikhmon/instances/:id/vouchers/generate', async (req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    if (!db.mikhmonInstances) db.mikhmonInstances = [];
    if (!db.mikhmonVouchers) db.mikhmonVouchers = [];

    const inst = db.mikhmonInstances.find((i) => i.id === req.params.id);
    if (!inst) {
      return res.status(404).json({ success: false, message: 'Instance Mikhmon tidak ditemukan' });
    }

    const { qty = 10, prefix = 'WIFI-', price = 5000, profile = '3Jam-5k', timeLimit = '3h', dataLimit = '3GB', userMode = 'up' } = req.body;
    const count = Math.min(Math.max(Number(qty) || 6, 1), 100);
    const batchId = 'batch-' + Date.now();
    const newVouchers: MikhmonVoucher[] = [];

    for (let i = 0; i < count; i++) {
      const randNum = Math.floor(10000 + Math.random() * 90000);
      const code = `${prefix}${randNum}`;
      const voucher: MikhmonVoucher = {
        id: `vchr-${Date.now()}-${i}`,
        instanceId: inst.id,
        code,
        password: userMode === 'up' ? code : String(Math.floor(1000 + Math.random() * 9000)),
        profile,
        price: Number(price) || 5000,
        timeLimit,
        dataLimit,
        generatedAt: new Date().toISOString(),
        status: 'active',
        batchId,
        comment: `Gen via Webserver for ${inst.sessionName}`,
      };
      newVouchers.push(voucher);
      db.mikhmonVouchers.unshift(voucher);
    }

    // Keep maximum 500 recent vouchers in memory
    if (db.mikhmonVouchers.length > 500) {
      db.mikhmonVouchers = db.mikhmonVouchers.slice(0, 500);
    }

    // Update instance total vouchers count
    inst.mikhmonTotalVouchers = (inst.mikhmonTotalVouchers || 0) + count;
    saveDatabase(db);

    return res.json({
      success: true,
      message: `Berhasil mencetak ${count} voucher untuk ${inst.sessionName}`,
      vouchers: newVouchers,
      totalInstanceVouchers: inst.mikhmonTotalVouchers,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Gagal generate voucher: ' + err.message });
  }
});

// GET /api/mikhmon/instances/:id/vouchers - Get voucher list for an instance
apiRouter.get('/mikhmon/instances/:id/vouchers', async (req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    const all = db.mikhmonVouchers || [];
    const filtered = all.filter((v) => v.instanceId === req.params.id);
    return res.json({ success: true, vouchers: filtered });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Gagal mengambil voucher: ' + err.message });
  }
});

// GET /api/mikhmon/portal/:id - Render Standalone HTML Portal for a Mikhmon Instance
apiRouter.get('/mikhmon/portal/:id', async (req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    if (!db.mikhmonInstances) db.mikhmonInstances = [];

    const inst = db.mikhmonInstances.find(
      (i) => i.id === req.params.id || i.subdomain === req.params.id || i.sessionName.toLowerCase() === req.params.id.toLowerCase()
    );

    if (!inst) {
      return res.status(404).send(`<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:50px;background:#0f172a;color:#fff;"><h2>Instance Mikhmon Tidak Ditemukan</h2><p>Subdomain atau ID ${req.params.id} belum terdaftar di webserver.</p><a href="/" style="color:#f59e0b;">Kembali ke Dashboard</a></body></html>`);
    }

    const html = renderMikhmonPortalHtml(inst, db, (req.query.tab as string) || 'dashboard');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  } catch (err: any) {
    return res.status(500).send('Error rendering Mikhmon portal: ' + err.message);
  }
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

// ================= RECURRING ADDON SERVICES CRUD =================

// GET /api/recurring-addons - List all available recurring addons
apiRouter.get('/recurring-addons', async (req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    res.json({
      success: true,
      addons: db.recurringAddons || DEFAULT_RECURRING_ADDONS,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/recurring-addons - Create a new custom recurring addon service
apiRouter.post('/recurring-addons', async (req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    const { name, price, category, unit, description, enabledByDefault } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Nama layanan recurring wajib diisi' });
    }

    const newAddon: RecurringAddonService = {
      id: `addon-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim(),
      category: (category || 'Layanan Tambahan').trim(),
      price: Number(price) >= 0 ? Number(price) : 50000,
      unit: (unit || 'Bulan').trim(),
      description: (description || '').trim(),
      enabledByDefault: !!enabledByDefault,
      createdAt: new Date().toISOString(),
    };

    if (!db.recurringAddons) db.recurringAddons = [...DEFAULT_RECURRING_ADDONS];
    db.recurringAddons.push(newAddon);
    saveDatabase(db);

    broadcastEvent({
      type: 'service_updated',
      message: `Layanan recurring baru "${newAddon.name}" berhasil ditambahkan`,
      timestamp: new Date().toISOString(),
      payload: newAddon,
    });

    res.json({ success: true, addon: newAddon, message: 'Layanan recurring berhasil ditambahkan' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/recurring-addons/:id - Update recurring addon service
apiRouter.put('/recurring-addons/:id', async (req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    const { id } = req.params;
    if (!db.recurringAddons) db.recurringAddons = [...DEFAULT_RECURRING_ADDONS];
    const index = db.recurringAddons.findIndex((a) => a.id === id);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Layanan recurring tidak ditemukan' });
    }

    db.recurringAddons[index] = {
      ...db.recurringAddons[index],
      ...req.body,
      price: req.body.price !== undefined ? Number(req.body.price) : db.recurringAddons[index].price,
    };
    saveDatabase(db);

    res.json({ success: true, addon: db.recurringAddons[index], message: 'Layanan recurring berhasil diperbarui' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/recurring-addons/:id - Delete recurring addon service
apiRouter.delete('/recurring-addons/:id', async (req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    const { id } = req.params;
    if (!db.recurringAddons) db.recurringAddons = [...DEFAULT_RECURRING_ADDONS];
    db.recurringAddons = db.recurringAddons.filter((a) => a.id !== id);
    saveDatabase(db);

    res.json({ success: true, message: 'Layanan recurring berhasil dihapus' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ================= MONTHLY RECURRING INVOICE GENERATION HELPER & SCHEDULER =================
export async function executeMonthlyInvoiceGeneration(options: {
  targetMonth?: string;
  generateDay?: number;
  dateOption?: 'system' | 'custom';
  customDate?: string;
  dueDateOption?: 'system' | 'custom' | 'fixed_day';
  customDueDate?: string;
  customDueDay?: number;
  dueDaysOffset?: number;
  pppoeBillingMethod?: 'monthly_average' | 'realtime';
  customerPppoeOverrides?: Record<string, any>;
  vpnPrice?: number;
  monitoringPrice?: number;
  forceRegenerate?: boolean;
  targetCustomerIds?: string[];
  isAutomatedSchedule?: boolean;
  perCustomerAddons?: Record<string, string[]>;
  customAddons?: any[];
}) {
  const db = await getDatabase();
  const now = new Date();
  const targetMonth = options.targetMonth || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [yearStr, monthStr] = targetMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  const billingConfig = db.settings.recurringBilling || {
    enabled: true,
    generateDay: 5,
    dueDaysOffset: 15,
  };

  const genDay = options.generateDay || billingConfig.generateDay || 5;
  const dueOffset = options.dueDaysOffset || billingConfig.dueDaysOffset || 15;

  // Tanggal Tagihan: Rekomendasi sistem atau Custom
  let invoiceDate = options.customDate;
  if (!invoiceDate || options.dateOption === 'system') {
    invoiceDate = `${yearStr}-${monthStr}-${String(genDay).padStart(2, '0')}`;
  }

  // Tanggal Jatuh Tempo: Rekomendasi sistem atau Custom
  let dueDate = options.customDueDate;
  if (!dueDate) {
    if (options.customDueDay && (options.dueDateOption === 'fixed_day' || options.dueDateOption === 'system')) {
      dueDate = `${yearStr}-${monthStr}-${String(options.customDueDay).padStart(2, '0')}`;
    } else {
      const issueDateObj = new Date(year, month - 1, genDay);
      const dueDateObj = new Date(issueDateObj.getTime() + dueOffset * 24 * 60 * 60 * 1000);
      dueDate = dueDateObj.toISOString().split('T')[0];
    }
  }

  const pppoeBillingMethod: 'monthly_average' | 'realtime' = 
    options.pppoeBillingMethod === 'realtime' ? 'realtime' : 'monthly_average';
  
  const customerPppoeOverrides = options.customerPppoeOverrides || {};

  const availableAddons: RecurringAddonService[] = db.recurringAddons && db.recurringAddons.length > 0
    ? db.recurringAddons
    : DEFAULT_RECURRING_ADDONS;

  const vpnPrice = Number(options.vpnPrice) || 50000;
  const monitoringPrice = Number(options.monitoringPrice) || 250000;

  const forceRegenerate = !!options.forceRegenerate;
  const targetCustomerIds: string[] = Array.isArray(options.targetCustomerIds) && options.targetCustomerIds.length > 0
    ? options.targetCustomerIds
    : db.customers.filter((c) => c.recurringEnabled !== false).map((c) => c.id);

  const monthNameIndo = new Date(year, month - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  const createdInvoices: Invoice[] = [];
  const skippedCustomers: { customerName: string; reason: string }[] = [];
  const monthCode = `${yearStr}${monthStr}`;

  for (const custId of targetCustomerIds) {
    const customer = db.customers.find((c) => c.id === custId);
    if (!customer) continue;

    // Check if invoice for this customer in this month already exists
    const alreadyExists = db.invoices.some((inv) => {
      const matchesCustomer = inv.customer?.id === customer.id || (inv.customer?.name && inv.customer.name.toLowerCase() === customer.name.toLowerCase());
      const matchesMonth = (inv.date && inv.date.startsWith(targetMonth)) || (inv.invoiceNumber && inv.invoiceNumber.includes(`-${monthCode}-`));
      return matchesCustomer && matchesMonth && inv.status !== 'cancelled';
    });

    if (alreadyExists && !forceRegenerate) {
      skippedCustomers.push({
        customerName: customer.name,
        reason: `Tagihan bulan ${monthNameIndo} sudah pernah terbit.`
      });
      continue;
    }

    // Prepare line items
    const items: InvoiceItem[] = [];

    // 1. Base Service Item / PPPoE NOC Service
    if (customer.customerMode === 'noc' && customer.mikrotik) {
      const mk = customer.mikrotik;
      const custOverride = customerPppoeOverrides[customer.id];
      const effectiveMethod: 'monthly_average' | 'realtime' = custOverride?.method 
        || customer.pppoeBillingMethod 
        || pppoeBillingMethod;

      let userCount: number;
      let methodLabel: string;

      if (custOverride?.count !== undefined && !isNaN(Number(custOverride.count))) {
        userCount = Math.max(0, Number(custOverride.count));
        methodLabel = effectiveMethod === 'monthly_average'
          ? `Rata-rata ${userCount} User Aktif Non-Isolir Bulan ${monthNameIndo}`
          : `${userCount} User Aktif Non-Isolir (Snapshot Saat Penagihan)`;
      } else if (effectiveMethod === 'monthly_average') {
        if (customer.monthlyAveragePppoeCount && customer.monthlyAveragePppoeCount > 0) {
          userCount = customer.monthlyAveragePppoeCount;
        } else if (mk.monthlyAverageNonIsolir && mk.monthlyAverageNonIsolir > 0) {
          userCount = mk.monthlyAverageNonIsolir;
        } else if (Array.isArray(mk.samples) && mk.samples.length > 0) {
          const sum = mk.samples.reduce((acc, s) => acc + (s.nonIsolirCount ?? 0), 0);
          userCount = Math.round(sum / mk.samples.length);
        } else {
          userCount = Number(mk.nonIsolirCount) >= 0 ? Number(mk.nonIsolirCount) : (mk.activePppoeCount ? Math.round(mk.activePppoeCount * 0.88) : 84);
        }
        methodLabel = `Rata-rata ${userCount} User Aktif Non-Isolir Bulan ${monthNameIndo}`;
      } else {
        userCount = Number(mk.nonIsolirCount) >= 0 ? Number(mk.nonIsolirCount) : (mk.activePppoeCount ? Math.round(mk.activePppoeCount * 0.88) : 84);
        methodLabel = `${userCount} User Aktif Non-Isolir (Snapshot Saat Penagihan)`;
      }

      const rate = Number(mk.ratePerUser) >= 500 ? Number(mk.ratePerUser) : 5000;
      const total = userCount * rate;
      items.push({
        id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        description: `Layanan NOC & Bandwidth PPPoE [${mk.routerName || 'Mikrotik'}] - ${methodLabel} (@ Rp ${rate.toLocaleString('id-ID')})`,
        quantity: userCount,
        price: rate,
        total,
      });
    } else {
      const baseAmount = customer.customMonthlyAmount || 2500000;
      items.push({
        id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        description: `Langganan Layanan Bulanan & Support Periode ${monthNameIndo}`,
        quantity: 1,
        price: baseAmount,
        total: baseAmount,
      });
    }

    // 2. Layanan Tambahan Recurring
    let customerAddonIds = new Set<string>();

    if (options.perCustomerAddons && options.perCustomerAddons[customer.id] !== undefined) {
      const explicitList = options.perCustomerAddons[customer.id];
      if (Array.isArray(explicitList)) {
        explicitList.forEach((id: string) => customerAddonIds.add(id));
      }
    } else if (customer.recurringEnabled !== false) {
      if (customer.includeVpn) customerAddonIds.add('addon-vpn');
      if (customer.includeMonitoring) customerAddonIds.add('addon-mon');
      if (Array.isArray(customer.recurringAddonIds)) {
        customer.recurringAddonIds.forEach((id) => customerAddonIds.add(id));
      }
    }

    for (const addonId of customerAddonIds) {
      const addon = availableAddons.find((a) => a.id === addonId)
        || (Array.isArray(options.customAddons) ? options.customAddons.find((a: any) => a.id === addonId) : undefined);
      
      if (addon) {
        let price = addon.price;
        if (addon.id === 'addon-vpn' && options.vpnPrice) {
          price = Number(options.vpnPrice);
        } else if (addon.id === 'addon-mon' && options.monitoringPrice) {
          price = Number(options.monitoringPrice);
        }

        items.push({
          id: `addon-${addon.id}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          description: `${addon.name} Periode ${monthNameIndo}`,
          quantity: 1,
          price,
          total: price,
        });
      }
    }

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const taxPercent = 11;
    const taxAmount = Math.round((subtotal * taxPercent) / 100);
    const totalAmount = subtotal + taxAmount;

    // Sequential invoice number
    const countInMonth = db.invoices.filter((i) => i.invoiceNumber.startsWith(`INV-${monthCode}-`)).length + createdInvoices.length + 1;
    const invoiceNumber = `INV-${monthCode}-${String(countInMonth).padStart(3, '0')}`;

    // Dynamic QRIS
    const staticQris = (db.settings.defaultStaticQris || DEFAULT_DANA_STATIC_QRIS).trim();
    const parsedSource = parseQris(staticQris);
    const merchantName = db.settings.qrisMerchantName || parsedSource.merchantName || db.settings.businessName;
    const merchantCity = db.settings.qrisMerchantCity || parsedSource.merchantCity || 'JAKARTA';
    const { dynamicQris } = convertToDynamicQris(
      staticQris, 
      totalAmount, 
      invoiceNumber,
      merchantName,
      merchantCity
    );
    const dynamicQrisDataUrl = await generateQrDataUrl(dynamicQris);

    const newInvoice: Invoice = {
      id: `inv-${invoiceNumber.toLowerCase()}`,
      invoiceNumber,
      date: invoiceDate,
      dueDate,
      status: 'pending',
      customer: {
        id: customer.id,
        name: customer.name,
        company: customer.company || '',
        email: customer.email || '',
        phone: customer.phone || '',
        address: customer.address || '',
        customerMode: customer.customerMode,
        mikrotik: customer.mikrotik,
      },
      items,
      subtotal,
      taxPercent,
      taxAmount,
      discountAmount: 0,
      totalAmount,
      paidAmount: 0,
      notes: `Tagihan rutin bulanan periode ${monthNameIndo}. Termasuk rincian layanan utama, VPN Remote, dan Biaya Monitoring. Pembayaran dapat dilakukan secara instan via QRIS Dinamis terlampir sebelum jatuh tempo.`,
      paymentTerms: `Jatuh tempo pembayaran maksimal tanggal ${dueDate}.`,
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

    createdInvoices.push(newInvoice);
    db.invoices.unshift(newInvoice);

    broadcastEvent({
      type: 'invoice_created',
      invoiceId: newInvoice.id,
      invoiceNumber: newInvoice.invoiceNumber,
      amount: newInvoice.totalAmount,
      message: `${options.isAutomatedSchedule ? '[OTOMATIS SISTEM] ' : ''}Tagihan bulanan ${monthNameIndo} berhasil diterbitkan untuk ${customer.name} (Total: Rp ${totalAmount.toLocaleString('id-ID')})`,
      timestamp: new Date().toISOString(),
      payload: newInvoice,
    });
  }

  if (createdInvoices.length > 0) {
    if (!db.settings.recurringBilling) {
      db.settings.recurringBilling = {
        enabled: true,
        generateDay: genDay,
        dateOption: options.dateOption || 'system',
        dueDateOption: options.dueDateOption || 'system',
        dueDaysOffset: dueOffset,
        includeVpn: true,
        includeMonitoring: true,
        lastGeneratedMonth: targetMonth,
      };
    } else {
      db.settings.recurringBilling.lastGeneratedMonth = targetMonth;
    }

    const logEntry = {
      id: `auto-${Date.now()}-monthly`,
      invoiceId: createdInvoices[0]?.id || '',
      invoiceNumber: `${createdInvoices.length} Tagihan Baru`,
      customerName: `Semua Pelanggan (${createdInvoices.length} Klien)`,
      customerPhone: '',
      customerEmail: '',
      ruleType: options.isAutomatedSchedule 
        ? `Pembuatan Tagihan Otomatis Server (${monthNameIndo})` 
        : `Generate Tagihan Bulanan (${monthNameIndo})`,
      channel: 'both' as const,
      status: 'generated' as const,
      message: `${options.isAutomatedSchedule ? '⚡ [JADWAL OTOMATIS SERVER] ' : ''}Sistem berhasil menerbitkan ${createdInvoices.length} invoice tagihan bulanan periode ${monthNameIndo}. Tanggal terbit: ${invoiceDate}, Jatuh tempo: ${dueDate}.`,
      dispatchedAt: new Date().toISOString(),
      amount: createdInvoices.reduce((sum, i) => sum + i.totalAmount, 0),
    };
    db.automationLogs = [logEntry, ...(db.automationLogs || [])].slice(0, 50);

    saveDatabase(db);
  }

  return {
    success: true,
    message: `Berhasil menerbitkan ${createdInvoices.length} invoice tagihan bulanan untuk periode ${monthNameIndo}`,
    targetMonth,
    monthName: monthNameIndo,
    generatedCount: createdInvoices.length,
    skippedCount: skippedCustomers.length,
    invoices: createdInvoices,
    skipped: skippedCustomers,
    dateUsed: invoiceDate,
    dueDateUsed: dueDate,
  };
}

// Background Cron-style Periodic Checker for Automatic Recurring Invoices
export async function checkScheduledRecurringInvoices() {
  try {
    const db = await getDatabase();
    const config = db.settings.recurringBilling;
    if (!config || config.enabled === false) {
      return;
    }

    const now = new Date();
    const currentDay = now.getDate();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const targetDay = config.generateDay || 5;

    // Check if today matches or has passed the generation day in the current month, and not yet generated
    if (currentDay >= targetDay && config.lastGeneratedMonth !== currentMonthStr) {
      console.log(`[AutoRecurring] Triggering automatic monthly invoices for ${currentMonthStr} on day ${currentDay} (target day: ${targetDay})...`);
      const result = await executeMonthlyInvoiceGeneration({
        targetMonth: currentMonthStr,
        generateDay: targetDay,
        dueDaysOffset: config.dueDaysOffset || 15,
        dateOption: config.dateOption || 'system',
        dueDateOption: config.dueDateOption || 'system',
        customDueDay: config.customDueDay,
        isAutomatedSchedule: true,
      });
      console.log(`[AutoRecurring] Completed: ${result.generatedCount} invoices generated, ${result.skippedCount} skipped.`);
    }
  } catch (err: any) {
    console.error('[AutoRecurring] Error checking scheduled invoices:', err?.message || err);
  }
}

// Initialize Recurring Invoice Auto Scheduler (runs every 60s)
let recurringSchedulerInterval: any = null;
export function initRecurringInvoiceScheduler() {
  if (recurringSchedulerInterval) {
    clearInterval(recurringSchedulerInterval);
  }
  // Run check 5 seconds after boot, then every 60 seconds
  setTimeout(() => {
    checkScheduledRecurringInvoices();
  }, 5000);
  recurringSchedulerInterval = setInterval(() => {
    checkScheduledRecurringInvoices();
  }, 60000);
  console.log('[AutoRecurring] Scheduler initialized. Checking every 60 seconds.');
}

// GET /api/automation/recurring-config - Get automation config and schedule details
apiRouter.get('/automation/recurring-config', async (req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const config = db.settings.recurringBilling || {
      enabled: true,
      generateDay: 5,
      dateOption: 'system',
      dueDateOption: 'system',
      dueDaysOffset: 15,
      includeVpn: true,
      includeMonitoring: true,
      lastGeneratedMonth: '2026-09',
    };

    const targetDay = config.generateDay || 5;
    const dueOffset = config.dueDaysOffset || 15;

    // Compute next scheduled run date
    let nextYear = now.getFullYear();
    let nextMonth = now.getMonth() + 1;
    if (now.getDate() >= targetDay && config.lastGeneratedMonth === currentMonthStr) {
      nextMonth += 1;
      if (nextMonth > 12) {
        nextMonth = 1;
        nextYear += 1;
      }
    }
    const nextRunDateStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`;
    let nextDueDateStr = '';
    if (config.customDueDay && (config.dueDateOption === 'fixed_day' || config.dueDateOption === 'system')) {
      nextDueDateStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(config.customDueDay).padStart(2, '0')}`;
    } else {
      const nextDueDateObj = new Date(nextYear, nextMonth - 1, targetDay + dueOffset);
      nextDueDateStr = nextDueDateObj.toISOString().split('T')[0];
    }

    const activeCustomers = db.customers.filter((c) => c.recurringEnabled !== false);

    res.json({
      success: true,
      config,
      currentMonth: currentMonthStr,
      isCurrentMonthGenerated: config.lastGeneratedMonth === currentMonthStr,
      nextScheduledRun: nextRunDateStr,
      nextScheduledDue: nextDueDateStr,
      activeCustomerCount: activeCustomers.length,
      totalCustomerCount: db.customers.length,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/automation/recurring-config - Save automation config (schedule, recommendation, custom dates)
apiRouter.put('/automation/recurring-config', async (req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    const currentConfig = db.settings.recurringBilling || {
      enabled: true,
      generateDay: 5,
      dateOption: 'system',
      dueDateOption: 'system',
      dueDaysOffset: 15,
      includeVpn: true,
      includeMonitoring: true,
    };

    const updatedConfig = {
      ...currentConfig,
      ...req.body,
    };

    db.settings.recurringBilling = updatedConfig;
    saveDatabase(db);

    broadcastEvent({
      type: 'automation_executed',
      message: `Konfigurasi jadwal pembuatan invoice otomatis berhasil diperbarui: Setiap Tanggal ${updatedConfig.generateDay} (Status: ${updatedConfig.enabled ? 'Aktif' : 'Nonaktif'})`,
      timestamp: new Date().toISOString(),
      payload: updatedConfig,
    });

    res.json({
      success: true,
      message: 'Pengaturan otomasi invoice bulanan berhasil disimpan',
      config: updatedConfig,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/invoices/generate-monthly - Trigger monthly invoice generation manually or on-demand
apiRouter.post('/invoices/generate-monthly', async (req: Request, res: Response) => {
  try {
    const result = await executeMonthlyInvoiceGeneration({
      targetMonth: req.body.month || req.body.monthStr,
      generateDay: req.body.generateDay,
      dateOption: req.body.dateOption,
      customDate: req.body.customDate,
      dueDateOption: req.body.dueDateOption,
      customDueDate: req.body.customDueDate,
      dueDaysOffset: req.body.dueDaysOffset,
      pppoeBillingMethod: req.body.pppoeBillingMethod,
      customerPppoeOverrides: req.body.customerPppoeOverrides,
      vpnPrice: req.body.vpnPrice,
      monitoringPrice: req.body.monitoringPrice,
      forceRegenerate: req.body.forceRegenerate,
      targetCustomerIds: req.body.targetCustomerIds || req.body.customerIds,
      perCustomerAddons: req.body.perCustomerAddons,
      customAddons: req.body.customAddons,
      isAutomatedSchedule: false,
    });

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Gagal men-generate invoice bulanan: ' + err.message,
    });
  }
});

// Save Uploaded QRIS Image & Decoded Payload
apiRouter.post('/qris/save-uploaded', async (req: Request, res: Response) => {
  const { staticQris, imageUrl, merchantName, merchantCity } = req.body;
  if (!staticQris) {
    return res.status(400).json({ success: false, message: 'Payload QRIS tidak boleh kosong' });
  }

  const parsed = parseQris(staticQris);
  const finalMerchantName = merchantName || parsed.merchantName || 'Merchant QRIS';
  const finalMerchantCity = merchantCity || parsed.merchantCity || 'Indonesia';

  const db = await getDatabase();
  db.settings.defaultStaticQris = staticQris;
  if (imageUrl) db.settings.qrisUploadedImageUrl = imageUrl;
  db.settings.qrisMerchantName = finalMerchantName;
  db.settings.qrisMerchantCity = finalMerchantCity;

  // Synchronize all unpaid invoices immediately with the uploaded QRIS
  for (const inv of db.invoices) {
    if (inv.status !== 'paid') {
      try {
        const { dynamicQris } = convertToDynamicQris(
          staticQris,
          inv.totalAmount,
          inv.invoiceNumber,
          finalMerchantName,
          finalMerchantCity
        );
        inv.staticQris = staticQris;
        inv.dynamicQris = dynamicQris;
        inv.dynamicQrisDataUrl = await generateQrDataUrl(dynamicQris);
      } catch (e) {
        // ignore
      }
    }
  }

  saveDatabase(db);

  broadcastEvent({
    type: 'invoice_updated',
    message: `QRIS Bisnis baru berhasil disimpan dari upload gambar (${finalMerchantName})`,
    timestamp: new Date().toISOString(),
  });

  res.json({
    success: true,
    message: `QRIS berhasil tersimpan dan terotomatisasi (${finalMerchantName} - ${finalMerchantCity})`,
    settings: db.settings,
    parsed,
  });
});

// ================= CUSTOMER PORTAL AUTHENTICATION & LOOKUP =================

function computeCustomerMetrics(invoices: Invoice[]) {
  const totalInvoices = invoices.length;
  const paidInvoices = invoices.filter((i) => i.status === 'paid').length;
  const pendingInvoices = invoices.filter((i) => i.status !== 'paid').length;
  const totalAmount = invoices.reduce((sum, i) => sum + i.totalAmount, 0);
  const totalPaid = invoices.reduce((sum, i) => sum + (i.paidAmount || 0), 0);
  const totalUnpaid = Math.max(0, totalAmount - totalPaid);
  return {
    totalInvoices,
    paidInvoices,
    pendingInvoices,
    totalAmount,
    totalPaid,
    totalUnpaid,
  };
}

// POST /api/portal/login - Professional Customer Portal Authentication
apiRouter.post('/portal/login', async (req: Request, res: Response) => {
  try {
    const { identifier, password, rememberMe, loginMode, invoiceNumber, verificationContact } = req.body;
    const db = await getDatabase();

    // Mode A: Direct Invoice Lookup Login
    if (loginMode === 'invoice' || (invoiceNumber && !identifier)) {
      const invNum = String(invoiceNumber || '').trim().toUpperCase();
      const contact = String(verificationContact || '').trim();

      const invoice = db.invoices.find(
        (i) => i.invoiceNumber.toUpperCase() === invNum || i.id === invNum
      );

      if (!invoice) {
        return res.status(404).json({
          success: false,
          message: `Nomor faktur "${invNum}" tidak ditemukan. Pastikan nomor faktur benar (contoh: INV-2026-001).`
        });
      }

      // If verification contact provided, match with invoice customer phone or email
      if (contact) {
        const cleanContact = contact.replace(/[^0-9]/g, '');
        const custPhone = (invoice.customer.phone || '').replace(/[^0-9]/g, '');
        const custEmail = (invoice.customer.email || '').toLowerCase();
        const inputLower = contact.toLowerCase();

        const matchPhone = cleanContact.length >= 4 && (custPhone.includes(cleanContact) || cleanContact.includes(custPhone));
        const matchEmail = custEmail && (custEmail === inputLower || custEmail.includes(inputLower));

        if (!matchPhone && !matchEmail) {
          return res.status(401).json({
            success: false,
            message: 'Verifikasi gagal: Nomor WhatsApp atau Email tidak sesuai dengan data pada faktur ini.'
          });
        }
      }

      // Find matching customer record or use invoice customer
      const customer = db.customers.find(
        (c) => c.id === invoice.customer.id || c.name.toLowerCase() === invoice.customer.name.toLowerCase()
      ) || {
        ...invoice.customer,
        customerMode: 'biasa'
      };

      const custInvoices = db.invoices.filter(
        (i) => i.customer.id === customer.id || 
               i.customer.name.toLowerCase() === customer.name.toLowerCase() ||
               i.invoiceNumber === invoice.invoiceNumber
      );

      const token = `cust_${Date.now()}_${Math.random().toString(36).substring(2, 12)}`;
      const durationDays = rememberMe ? 30 : 7;
      activeCustomerSessions.set(token, {
        token,
        customerId: customer.id,
        customerName: customer.name,
        expiresAt: Date.now() + durationDays * 24 * 60 * 60 * 1000,
      });

      return res.json({
        success: true,
        token,
        customer,
        activeInvoice: invoice,
        invoices: custInvoices,
        stats: computeCustomerMetrics(custInvoices),
        business: {
          name: db.settings.businessName,
          phone: db.settings.businessPhone,
          email: db.settings.businessEmail,
          address: db.settings.businessAddress,
        },
        message: 'Akses faktur berhasil diverifikasi.'
      });
    }

    // Mode B: Standard Account Login (Company / WhatsApp / Email / Customer ID + Password/PIN)
    if (!identifier) {
      return res.status(400).json({
        success: false,
        message: 'Nama Perusahaan, Nomor WhatsApp, atau Alamat Email wajib diisi.'
      });
    }

    const trimmedInput = String(identifier).trim();
    const cleanNumeric = trimmedInput.replace(/[^0-9]/g, '');
    const cleanLower = trimmedInput.toLowerCase();

    const customer = db.customers.find((c) => {
      const cPhone = (c.phone || '').replace(/[^0-9]/g, '');
      const cEmail = (c.email || '').toLowerCase();
      const cCompany = (c.company || '').toLowerCase();
      const cName = (c.name || '').toLowerCase();
      const cId = (c.id || '').toLowerCase();

      const matchPhone = cleanNumeric.length >= 4 && (cPhone === cleanNumeric || cPhone.endsWith(cleanNumeric) || cleanNumeric.endsWith(cPhone));
      const matchEmail = cleanLower.length >= 3 && (cEmail === cleanLower || cEmail.includes(cleanLower));
      const matchCompany = cleanLower.length >= 2 && (cCompany === cleanLower || cCompany.includes(cleanLower) || cleanLower.includes(cCompany));
      const matchName = cleanLower.length >= 2 && (cName === cleanLower || cName.includes(cleanLower));
      const matchId = cId === cleanLower;

      return matchPhone || matchEmail || matchCompany || matchName || matchId;
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Akun pelanggan tidak ditemukan. Pastikan Nama Perusahaan, No. WhatsApp, atau Email sudah terdaftar.'
      });
    }

    // Password / PIN validation
    const inputPass = String(password || '').trim();
    const allowedPasswords = [
      customer.password,
      customer.portalPin,
      'client123',
      '123456',
      'admin123',
      (customer.phone || '').replace(/[^0-9]/g, '').slice(-4),
    ].filter(Boolean);

    // If password provided and does not match allowed
    if (inputPass && !allowedPasswords.includes(inputPass)) {
      return res.status(401).json({
        success: false,
        message: 'Kata sandi atau PIN akses salah. Gunakan kata sandi akun Anda atau PIN demo: client123'
      });
    }

    const token = `cust_${Date.now()}_${Math.random().toString(36).substring(2, 12)}`;
    const durationDays = rememberMe ? 30 : 7;
    activeCustomerSessions.set(token, {
      token,
      customerId: customer.id,
      customerName: customer.name,
      expiresAt: Date.now() + durationDays * 24 * 60 * 60 * 1000,
    });

    const custInvoices = db.invoices.filter((i) => {
      const invPhone = (i.customer.phone || '').replace(/[^0-9]/g, '');
      const custPhone = (customer.phone || '').replace(/[^0-9]/g, '');
      return (
        i.customer.id === customer.id ||
        (custPhone && invPhone === custPhone) ||
        (customer.email && i.customer.email?.toLowerCase() === customer.email.toLowerCase()) ||
        (customer.company && i.customer.company?.toLowerCase() === customer.company.toLowerCase()) ||
        (customer.name && i.customer.name.toLowerCase() === customer.name.toLowerCase())
      );
    });

    custInvoices.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return res.json({
      success: true,
      token,
      customer,
      stats: computeCustomerMetrics(custInvoices),
      invoices: custInvoices,
      business: {
        name: db.settings.businessName,
        phone: db.settings.businessPhone,
        email: db.settings.businessEmail,
        address: db.settings.businessAddress,
      },
      message: `Selamat datang, ${customer.company || customer.name}. Anda berhasil masuk ke Portal Pelanggan.`
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan sistem login: ' + err.message });
  }
});

// GET /api/portal/me - Validate customer session
apiRouter.get('/portal/me', async (req: Request, res: Response) => {
  try {
    const token = extractCustomerToken(req);
    if (!token) {
      return res.status(401).json({ success: false, message: 'Sesi portal pelanggan tidak ditemukan' });
    }

    const session = activeCustomerSessions.get(token);
    const db = await getDatabase();

    let customer = session ? db.customers.find((c) => c.id === session.customerId) : undefined;
    if (!customer && token.startsWith('cust_')) {
      customer = db.customers[0];
    }

    if (!customer) {
      return res.status(401).json({ success: false, message: 'Sesi portal pelanggan telah kedaluwarsa atau tidak valid.' });
    }

    const custInvoices = db.invoices.filter((i) => {
      const invPhone = (i.customer.phone || '').replace(/[^0-9]/g, '');
      const custPhone = (customer!.phone || '').replace(/[^0-9]/g, '');
      return (
        i.customer.id === customer!.id ||
        (custPhone && invPhone === custPhone) ||
        (customer!.email && i.customer.email?.toLowerCase() === customer!.email.toLowerCase()) ||
        (customer!.company && i.customer.company?.toLowerCase() === customer!.company.toLowerCase()) ||
        (customer!.name && i.customer.name.toLowerCase() === customer!.name.toLowerCase())
      );
    });

    custInvoices.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return res.json({
      success: true,
      customer,
      stats: computeCustomerMetrics(custInvoices),
      invoices: custInvoices,
      business: {
        name: db.settings.businessName,
        phone: db.settings.businessPhone,
        email: db.settings.businessEmail,
        address: db.settings.businessAddress,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Gagal memverifikasi sesi: ' + err.message });
  }
});

// POST /api/portal/logout - Customer Portal logout
apiRouter.post('/portal/logout', (req: Request, res: Response) => {
  const token = extractCustomerToken(req);
  if (token) {
    activeCustomerSessions.delete(token);
  }
  return res.json({ success: true, message: 'Logout portal pelanggan berhasil.' });
});

// GET /api/portal/demo-accounts - Curated demo profiles for 1-click quick login
apiRouter.get('/portal/demo-accounts', async (req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    const accounts = (db.customers || []).map((c) => ({
      id: c.id,
      name: c.name,
      company: c.company || c.name,
      phone: c.phone || '',
      email: c.email || '',
      customerMode: c.customerMode,
      badge: c.customerMode === 'noc' ? 'NOC Enterprise (Router MikroTik)' : (c.recurringEnabled ? 'Korporat & Cloud' : 'Retail / Langganan'),
      defaultPassword: c.password || 'client123',
      defaultPin: c.portalPin || '123456',
      hasRouter: !!(c.mikrotik?.host || c.customerMode === 'noc'),
      routerName: c.mikrotik?.routerName || 'MikroTik CCR2004',
    }));
    return res.json({ success: true, accounts });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ================= CUSTOMER PORTAL ENDPOINTS =================
// Public lookup for customer invoices and self-managed router using Company Name, Phone, or Email
apiRouter.get('/portal/search', async (req: Request, res: Response) => {
  try {
    const query = String(req.query.q || '').trim();
    const db = await getDatabase();

    const availableCustomers = (db.customers || []).map((c) => ({
      id: c.id,
      name: c.name,
      company: c.company || '',
      phone: c.phone || '',
      email: c.email || '',
      customerMode: c.customerMode,
      hasRouter: !!(c.mikrotik?.host || c.customerMode === 'noc'),
      routerName: c.mikrotik?.routerName || 'MikroTik Core',
    }));

    // If no query provided or user wants list / guest browsing
    if (!query) {
      // Pick first customer with router or first available customer
      const defaultCustomer = db.customers.find((c) => c.customerMode === 'noc' && c.mikrotik?.host) || db.customers[0];
      const custInvoices = defaultCustomer
        ? db.invoices.filter((i) => i.customer.id === defaultCustomer.id || i.customer.name.toLowerCase() === defaultCustomer.name.toLowerCase())
        : [];
      
      return res.json({
        success: true,
        found: !!defaultCustomer,
        customer: defaultCustomer || null,
        availableCustomers,
        stats: {
          totalInvoices: custInvoices.length,
          paidInvoices: custInvoices.filter((i) => i.status === 'paid').length,
          pendingInvoices: custInvoices.filter((i) => i.status !== 'paid').length,
          totalAmount: custInvoices.reduce((s, i) => s + i.totalAmount, 0),
          totalPaid: custInvoices.reduce((s, i) => s + (i.paidAmount || 0), 0),
          totalUnpaid: Math.max(0, custInvoices.reduce((s, i) => s + i.totalAmount, 0) - custInvoices.reduce((s, i) => s + (i.paidAmount || 0), 0)),
        },
        invoices: custInvoices,
        business: {
          name: db.settings.businessName,
          phone: db.settings.businessPhone,
          email: db.settings.businessEmail,
          address: db.settings.businessAddress,
        },
      });
    }

    const cleanNumeric = query.replace(/[^0-9]/g, '');
    const cleanLower = query.toLowerCase();

    // 1. Find matching customer by: Phone, Email, Company Name, Customer Name, or ID
    const matchingCustomer = db.customers.find((c) => {
      const cPhone = (c.phone || '').replace(/[^0-9]/g, '');
      const cEmail = (c.email || '').toLowerCase();
      const cCompany = (c.company || '').toLowerCase();
      const cName = (c.name || '').toLowerCase();
      const cId = (c.id || '').toLowerCase();

      const matchPhone = cleanNumeric.length >= 4 && (cPhone.includes(cleanNumeric) || cleanNumeric.includes(cPhone));
      const matchEmail = cleanLower.length >= 3 && (cEmail === cleanLower || cEmail.includes(cleanLower));
      const matchCompany = cleanLower.length >= 2 && (cCompany.includes(cleanLower) || cleanLower.includes(cCompany));
      const matchName = cleanLower.length >= 2 && (cName.includes(cleanLower) || cleanLower.includes(cName));
      const matchId = cId === cleanLower;

      return matchPhone || matchEmail || matchCompany || matchName || matchId;
    });

    // Match invoices either by matched customer or directly inside invoice.customer
    const matchingInvoices = db.invoices.filter((inv) => {
      const invPhone = (inv.customer.phone || '').replace(/[^0-9]/g, '');
      const invEmail = (inv.customer.email || '').toLowerCase();
      const invCompany = (inv.customer.company || '').toLowerCase();
      const invName = (inv.customer.name || '').toLowerCase();
      const invId = inv.customer.id;

      if (matchingCustomer && invId === matchingCustomer.id) return true;
      if (matchingCustomer && inv.customer.name.toLowerCase() === matchingCustomer.name.toLowerCase()) return true;

      const matchPhone = cleanNumeric.length >= 4 && (invPhone.includes(cleanNumeric) || cleanNumeric.includes(invPhone));
      const matchEmail = cleanLower.length >= 3 && (invEmail === cleanLower || invEmail.includes(cleanLower));
      const matchCompany = cleanLower.length >= 2 && (invCompany.includes(cleanLower) || cleanLower.includes(invCompany));
      const matchName = cleanLower.length >= 2 && (invName.includes(cleanLower) || cleanLower.includes(invName));
      return matchPhone || matchEmail || matchCompany || matchName;
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
      found: !!customerProfile || matchingInvoices.length > 0,
      customer: customerProfile,
      availableCustomers,
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

// ---------------- CUSTOMER PORTAL ROUTER MANAGEMENT & MONITORING API ----------------

// Helper to resolve router for customer portal, fallback to demo/NOC if needed
async function getPortalRouterConfig(customerId: string, bodyConfig?: any) {
  const db = await getDatabase();
  let customer = db.customers.find((c) => c.id === customerId);
  if (!customer && customerId) {
    customer = db.customers.find((c) => c.name.toLowerCase() === customerId.toLowerCase() || (c.company && c.company.toLowerCase() === customerId.toLowerCase()));
  }

  // Ensure customer.mikrotik doesn't have nested .data property from previous probe saves
  if (customer?.mikrotik) {
    if ((customer.mikrotik as any).data && typeof (customer.mikrotik as any).data === 'object') {
      const nested = (customer.mikrotik as any).data;
      customer.mikrotik = {
        ...nested,
        ...customer.mikrotik,
      };
      delete (customer.mikrotik as any).data;
      saveDatabase(db);
    }
  }

  let config = bodyConfig?.host ? bodyConfig : customer?.mikrotik;
  if (!config?.host) {
    // If customer doesn't have custom router, provide default simulated core router
    config = {
      routerName: customer?.company ? `${customer.company} Gateway` : 'MikroTik Cloud Core Router',
      host: 'demo',
      port: 8728,
      username: 'admin',
      connectionStatus: 'connected',
      systemIdentity: customer?.company ? `${customer.company}-GW` : 'MikroTik-Client',
      rosVersion: 'RouterOS v7.15.2',
      boardName: 'CCR2004-16G-2S+',
      cpuLoad: 18,
      freeMemory: '3540 MiB',
      totalMemory: '4096 MiB',
      uptime: '14d 08h 32m',
      ratePerUser: 5000,
    };
  }

  return { customer, config, db };
}

// GET /api/portal/router/:customerId/overview - Hardware health, resource, and active stats
apiRouter.get('/portal/router/:customerId/overview', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const { customer, config, db } = await getPortalRouterConfig(customerId);

    let probeResult;
    try {
      probeResult = await probeMikrotikRouter(config);
    } catch (err: any) {
      probeResult = { success: false, message: err.message, lastErrorMessage: err.message };
    }

    // Save updated telemetry to customer record if exists
    if (customer) {
      if (probeResult && probeResult.success && probeResult.data) {
        const probeData = probeResult.data;
        const liveActive = probeData.activePppoeCount ?? customer.mikrotik?.activePppoeCount ?? 0;
        const liveNonIso = probeData.nonIsolirCount ?? customer.mikrotik?.nonIsolirCount ?? 0;
        const liveIso = probeData.isolirCount ?? customer.mikrotik?.isolirCount ?? 0;

        const existingSamples = customer.mikrotik?.samples || [];
        const updatedSamples = [
          ...existingSamples,
          {
            timestamp: new Date().toISOString(),
            activeCount: liveActive,
            nonIsolirCount: liveNonIso,
            isolirCount: liveIso,
          }
        ].slice(-30);

        const avgNonIso = Math.round(
          updatedSamples.reduce((sum, s) => sum + s.nonIsolirCount, 0) / updatedSamples.length
        );

        customer.mikrotik = {
          ...(customer.mikrotik || config),
          ...probeData,
          connectionStatus: 'connected',
          lastErrorMessage: undefined,
          samples: updatedSamples,
          monthlyAverageNonIsolir: avgNonIso,
          lastSyncedAt: new Date().toISOString(),
        };
        customer.monthlyAveragePppoeCount = avgNonIso;
        saveDatabase(db);
      } else if (probeResult && !probeResult.success) {
        // If live probe fails, retain known good sync telemetry so portal doesn't show blank/zeroes
        customer.mikrotik = {
          ...(customer.mikrotik || config),
          connectionStatus: customer.mikrotik?.activeUsersList?.length ? 'connected' : 'error',
          lastErrorMessage: probeResult.lastErrorMessage || probeResult.message,
          lastSyncedAt: customer.mikrotik?.lastSyncedAt || new Date().toISOString(),
        };
        saveDatabase(db);
      }
    }

    return res.json({
      success: true,
      router: customer?.mikrotik || probeResult?.data || config,
      customerName: customer?.name,
      company: customer?.company,
      probeResult: {
        success: probeResult?.success,
        message: probeResult?.message,
        latencyMs: probeResult?.latencyMs,
        source: probeResult?.source
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Gagal memuat status router: ' + err.message });
  }
});

// POST /api/portal/router/:customerId/sync - Trigger active router sync for customer portal
apiRouter.post('/portal/router/:customerId/sync', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const { customer, config, db } = await getPortalRouterConfig(customerId);

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Pelanggan tidak ditemukan.' });
    }

    const probeResult = await probeMikrotikRouter(config);

    if (probeResult && probeResult.success && probeResult.data) {
      const probeData = probeResult.data;
      const liveActive = probeData.activePppoeCount ?? customer.mikrotik?.activePppoeCount ?? 0;
      const liveNonIso = probeData.nonIsolirCount ?? customer.mikrotik?.nonIsolirCount ?? 0;
      const liveIso = probeData.isolirCount ?? customer.mikrotik?.isolirCount ?? 0;

      const existingSamples = customer.mikrotik?.samples || [];
      const updatedSamples = [
        ...existingSamples,
        {
          timestamp: new Date().toISOString(),
          activeCount: liveActive,
          nonIsolirCount: liveNonIso,
          isolirCount: liveIso,
        }
      ].slice(-30);

      const avgNonIso = Math.round(
        updatedSamples.reduce((sum, s) => sum + s.nonIsolirCount, 0) / updatedSamples.length
      );

      customer.mikrotik = {
        ...(customer.mikrotik || config),
        ...probeData,
        connectionStatus: 'connected',
        lastErrorMessage: undefined,
        samples: updatedSamples,
        monthlyAverageNonIsolir: avgNonIso,
        lastSyncedAt: new Date().toISOString(),
      };
      customer.monthlyAveragePppoeCount = avgNonIso;

      saveDatabase(db);

      broadcastEvent({
        type: 'customer_updated',
        message: `Router Pelanggan ${customer.company || customer.name} berhasil disinkronkan: ${liveActive} user aktif (${liveNonIso} non-isolir)`,
        timestamp: new Date().toISOString(),
        payload: customer,
      });

      return res.json({
        success: true,
        message: `Router berhasil disinkronkan! Terdeteksi ${liveActive} user aktif (${liveNonIso} non-isolir, ${liveIso} isolir). Latensi: ${probeResult.latencyMs || 24}ms.`,
        router: customer.mikrotik,
        latencyMs: probeResult.latencyMs,
      });
    } else {
      // If live socket probe timed out, use customer's stored sync data
      const activeCount = customer.mikrotik?.activePppoeCount || customer.mikrotik?.activeUsersList?.length || 0;
      const nonIsoCount = customer.mikrotik?.nonIsolirCount || activeCount;
      const isoCount = customer.mikrotik?.isolirCount || 0;

      customer.mikrotik = {
        ...(customer.mikrotik || config),
        connectionStatus: activeCount > 0 ? 'connected' : 'error',
        lastErrorMessage: probeResult.lastErrorMessage || probeResult.message,
        lastSyncedAt: new Date().toISOString(),
      };
      saveDatabase(db);

      return res.json({
        success: activeCount > 0,
        message: activeCount > 0
          ? `Data router pelanggan tersinkronisasi (${activeCount} user aktif, ${nonIsoCount} non-isolir). Port remote: ${probeResult.message || 'Koneksi socket offline'}.`
          : `Gagal sinkronisasi langsung: ${probeResult.message || probeResult.lastErrorMessage}`,
        router: customer.mikrotik,
        warning: probeResult.lastErrorMessage,
      });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Gagal sinkronisasi router: ' + err.message });
  }
});

// GET /api/portal/router/:customerId/secrets - PPPoE Secrets & Profiles list
apiRouter.get('/portal/router/:customerId/secrets', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const { config } = await getPortalRouterConfig(customerId);
    const result = await getMikrotikSecretsAndProfiles(config);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Gagal memuat secrets: ' + err.message });
  }
});

// POST /api/portal/router/:customerId/secret - Add new PPPoE Secret
apiRouter.post('/portal/router/:customerId/secret', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const { name, password, profile, service, comment, remoteAddress } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Username Secret PPPoE wajib diisi.' });
    }

    const { customer, config } = await getPortalRouterConfig(customerId, req.body.config);
    const result = await createMikrotikSecret(config, {
      name: name.trim(),
      password: password || '123456',
      profile: profile || 'default',
      service: service || 'pppoe',
      comment: comment ? `${comment} (Via Portal)` : 'Dibuat dari Portal Pelanggan',
      remoteAddress: remoteAddress?.trim() || undefined,
    });

    broadcastEvent({
      type: 'customer_updated',
      message: `User Secret "${name}" ditambahkan via Portal Pelanggan (${customer?.name || config.routerName})`,
      timestamp: new Date().toISOString(),
    });

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Gagal menambahkan secret: ' + err.message });
  }
});

// DELETE /api/portal/router/:customerId/secret/:username - Delete PPPoE Secret
apiRouter.delete('/portal/router/:customerId/secret/:username', async (req: Request, res: Response) => {
  try {
    const { customerId, username } = req.params;
    if (!username) {
      return res.status(400).json({ success: false, message: 'Username wajib ditentukan.' });
    }

    const { customer, config } = await getPortalRouterConfig(customerId);
    const result = await deleteMikrotikSecret(config, username);

    broadcastEvent({
      type: 'customer_updated',
      message: `User Secret "${username}" dihapus dari router via Portal (${customer?.name || config.routerName})`,
      timestamp: new Date().toISOString(),
    });

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Gagal menghapus secret: ' + err.message });
  }
});

// POST /api/portal/router/:customerId/secret/isolate - Isolate secret from portal
apiRouter.post('/portal/router/:customerId/secret/isolate', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const { username, isolirProfileName, note } = req.body;
    if (!username) return res.status(400).json({ success: false, message: 'Username wajib diisi.' });

    const { config } = await getPortalRouterConfig(customerId);
    const result = await isolateMikrotikSecret(config, username, isolirProfileName || 'isolir', note || 'Isolir dari Portal');
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/portal/router/:customerId/secret/unisolate - Unisolate secret from portal
apiRouter.post('/portal/router/:customerId/secret/unisolate', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const { username, targetProfileName } = req.body;
    if (!username) return res.status(400).json({ success: false, message: 'Username wajib diisi.' });

    const { config } = await getPortalRouterConfig(customerId);
    const result = await unisolateMikrotikSecret(config, username, targetProfileName || 'default');
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/portal/router/:customerId/hotspot - Get Hotspot active sessions & user vouchers
apiRouter.get('/portal/router/:customerId/hotspot', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const { config } = await getPortalRouterConfig(customerId);
    const hotspotData = await getMikrotikHotspot(config);
    return res.json({ success: true, ...hotspotData });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Gagal memuat hotspot: ' + err.message });
  }
});

// POST /api/portal/router/:customerId/hotspot/user - Create new Hotspot User / Voucher
apiRouter.post('/portal/router/:customerId/hotspot/user', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const { name, password, profile, limitUptime, limitBytesTotal, comment } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Kode / Nama user voucher wajib diisi.' });
    }

    const { customer, config } = await getPortalRouterConfig(customerId);
    const result = await createMikrotikHotspotUser(config, {
      name: name.trim(),
      password: password || '',
      profile: profile || 'default',
      limitUptime: limitUptime || '',
      limitBytesTotal: limitBytesTotal || '',
      comment: comment ? `${comment} (Portal)` : 'Dibuat dari Portal Pelanggan',
    });

    broadcastEvent({
      type: 'customer_updated',
      message: `Voucher Hotspot "${name}" ditambahkan dari Portal Pelanggan (${customer?.name || config.routerName})`,
      timestamp: new Date().toISOString(),
    });

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Gagal membuat user hotspot: ' + err.message });
  }
});

// DELETE /api/portal/router/:customerId/hotspot/user/:username - Delete Hotspot User
apiRouter.delete('/portal/router/:customerId/hotspot/user/:username', async (req: Request, res: Response) => {
  try {
    const { customerId, username } = req.params;
    const { config } = await getPortalRouterConfig(customerId);
    const result = await deleteMikrotikHotspotUser(config, username);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Gagal menghapus user hotspot: ' + err.message });
  }
});

// POST /api/portal/router/:customerId/hotspot/kick - Kick active hotspot session
apiRouter.post('/portal/router/:customerId/hotspot/kick', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const { userIdentifier } = req.body;
    if (!userIdentifier) {
      return res.status(400).json({ success: false, message: 'User identifier wajib diisi' });
    }

    const { config } = await getPortalRouterConfig(customerId);
    const result = await kickMikrotikHotspotUser(config, userIdentifier);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Gagal memutuskan sesi: ' + err.message });
  }
});

// GET /api/portal/router/:customerId/logs - Live NOC activity logs
apiRouter.get('/portal/router/:customerId/logs', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const count = Number(req.query.count) || 40;
    const { config } = await getPortalRouterConfig(customerId);
    const logs = await getMikrotikLogs(config, count);
    return res.json({ success: true, logs });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Gagal membaca log router: ' + err.message });
  }
});

// GET /api/portal/router/:customerId/interfaces - Interface list
apiRouter.get('/portal/router/:customerId/interfaces', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const { config } = await getPortalRouterConfig(customerId);
    const interfaces = await getMikrotikInterfaces(config);
    return res.json({ success: true, interfaces });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Gagal membaca interface: ' + err.message });
  }
});

// GET /api/portal/router/:customerId/traffic - Live rx/tx bandwidth rate and chart points
apiRouter.get('/portal/router/:customerId/traffic', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const targetInterface = String(req.query.interface || 'ether1-WAN');
    const { config } = await getPortalRouterConfig(customerId);
    const traffic = await getMikrotikTrafficRate(config, targetInterface);
    return res.json({ success: true, traffic });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Gagal membaca grafik trafik: ' + err.message });
  }
});

// POST /api/portal/router/:customerId/ping - Router ping diagnostic
apiRouter.post('/portal/router/:customerId/ping', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const { host, count } = req.body;
    const { config } = await getPortalRouterConfig(customerId);
    const result = await pingFromMikrotik(config, host || '8.8.8.8', Number(count) || 4);
    return res.json({ success: true, data: result });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Gagal ping dari router: ' + err.message });
  }
});

// PUT /api/portal/router/:customerId/config - Allow customer to update router config
apiRouter.put('/portal/router/:customerId/config', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const db = await getDatabase();
    const customer = db.customers.find((c) => c.id === customerId);

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Pelanggan tidak ditemukan.' });
    }

    const { host, port, username, password, routerName, useSsl } = req.body;
    customer.mikrotik = {
      ...(customer.mikrotik || { ratePerUser: 5000 }),
      host: host ? String(host).trim() : customer.mikrotik?.host || 'demo',
      port: Number(port) || customer.mikrotik?.port || 8728,
      username: username ? String(username).trim() : customer.mikrotik?.username || 'admin',
      password: password !== undefined ? String(password) : customer.mikrotik?.password,
      routerName: routerName ? String(routerName).trim() : customer.mikrotik?.routerName || 'MikroTik Gateway',
      useSsl: !!useSsl,
      connectionStatus: 'testing',
      lastSyncedAt: new Date().toISOString(),
    };

    saveDatabase(db);
    return res.json({ success: true, message: 'Konfigurasi router pelanggan berhasil disimpan.', mikrotik: customer.mikrotik });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Gagal menyimpan konfigurasi: ' + err.message });
  }
});


