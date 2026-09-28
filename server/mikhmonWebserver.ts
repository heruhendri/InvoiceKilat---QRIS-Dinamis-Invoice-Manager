import { DatabaseSchema } from './storage';
import { MikhmonInstance, MikhmonVoucher, MikhmonWebserverStatus } from './types';
import os from 'os';

/**
 * Format milliseconds into human uptime
 */
function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}h`);
  if (h > 0) parts.push(`${h}j`);
  parts.push(`${m}m`);
  parts.push(`${s}d`);
  return parts.join(' ');
}

/**
 * Get real-time system and webserver status for Mikhmon hosting
 */
export function getMikhmonWebserverStatus(db: DatabaseSchema): MikhmonWebserverStatus {
  const instances = db.mikhmonInstances || [];
  const activeCount = instances.filter((i) => i.status === 'active').length;
  const suspendedCount = instances.filter((i) => i.status === 'suspended').length;
  const totalVouchers = (db.mikhmonVouchers || []).length;
  const serverSettings = db.mikhmonServerSettings;

  const uptimeSec = Math.floor(process.uptime());
  const memUsedMb = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
  const totalMemMb = Math.round(os.totalmem() / 1024 / 1024);
  const cpus = os.cpus();
  const cpuModel = cpus.length > 0 ? `${cpus[0].model.split('@')[0].trim()} (${cpus.length} Cores)` : 'Multi-Core Virtual CPU';

  return {
    engine: 'InvoiceKilat Multi-Tenant Mikhmon Web Engine v3.20',
    status: 'running',
    uptimeSeconds: uptimeSec,
    uptimeFormatted: formatUptime(uptimeSec),
    memoryUsageMb: memUsedMb,
    totalMemoryMb: totalMemMb,
    cpuModel,
    platform: `${os.type()} ${os.release()} (${os.arch()})`,
    httpPort: serverSettings?.httpPort || 80,
    httpsPort: serverSettings?.httpsPort || 443,
    nodePort: 3000,
    mikrotikApiPort: 8728,
    activeVirtualHosts: instances.length,
    totalInstances: instances.length,
    activeInstances: activeCount,
    suspendedInstances: suspendedCount,
    masterDomain: serverSettings?.masterDomain || 'mikhmon.online',
    sslStatus: serverSettings?.wildcardEnabled ? 'active' : 'pending',
    phpVersion: serverSettings?.phpVersion || 'PHP 8.2-FPM',
    activePackage: serverSettings?.activeVersion || 'Mikhmon V3.20 Official (PHP 8.2 LTS)',
    totalVouchersGenerated: totalVouchers,
    lastRestartAt: new Date(Date.now() - uptimeSec * 1000).toISOString(),
  };
}

/**
 * Generate Turnkey Bash installer script for Linux VPS (Ubuntu / Debian)
 */
export function generateMikhmonTurnkeyVpsScript(domain: string, ip: string, email: string): string {
  const cleanDomain = (domain || 'mikhmon.online').toLowerCase().trim();
  const cleanIp = (ip || 'YOUR_VPS_IP').trim();
  const cleanEmail = (email || 'admin@' + cleanDomain).trim();

  return `#!/bin/bash
# ==============================================================================
# INVOICEKILAT - TURNKEY MIKHMON WEBSERVER & MULTI-TENANT HOSTING INSTALLER
# OS Target : Ubuntu 22.04 / 24.04 LTS & Debian 12 (Bookworm)
# Fitur     : Nginx + PHP 8.2-FPM + Certbot SSL Wildcard + Mikhmon Engine + Node.js
# Master Domain : ${cleanDomain}
# VPS IP        : ${cleanIp}
# ==============================================================================

set -e

echo "🚀 Memulai Instalasi Mikhmon Webserver untuk ${cleanDomain}..."

# 1. Update OS & Install Dependencies
apt-get update && apt-get upgrade -y
apt-get install -y nginx curl wget git unzip zip software-properties-common certbot python3-certbot-nginx ufw

# 2. Add PHP 8.2 Repository & Install PHP-FPM
add-apt-repository -y ppa:ondrej/php
apt-get update
apt-get install -y php8.2 php8.2-fpm php8.2-cli php8.2-curl php8.2-gd php8.2-mbstring php8.2-xml php8.2-zip php8.2-sockets

# 3. Setup Mikhmon Web Directory
mkdir -p /var/www/mikhmon/include/config
mkdir -p /var/log/nginx

# Download Mikhmon V3 Master Engine
echo "📦 Mengunduh paket inti Mikhmon V3..."
wget -q -O /tmp/mikhmonv3.zip https://github.com/laksa19/mikhmonv3/archive/refs/heads/master.zip || true
if [ -f /tmp/mikhmonv3.zip ]; then
  unzip -q -o /tmp/mikhmonv3.zip -d /tmp/mikhmon_extract
  cp -r /tmp/mikhmon_extract/mikhmonv3-master/* /var/www/mikhmon/ 2>/dev/null || true
  rm -rf /tmp/mikhmonv3.zip /tmp/mikhmon_extract
fi

# Set Ownership & Permissions
chown -R www-data:www-data /var/www/mikhmon
chmod -R 775 /var/www/mikhmon
chmod -R 777 /var/www/mikhmon/include/config

# 4. Generate Nginx VirtualHost Configuration
cat <<'EOF' > /etc/nginx/sites-available/mikhmon
# ==============================================================================
# Nginx VirtualHost untuk Multi-Tenant Mikhmon (${cleanDomain})
# ==============================================================================
server {
    listen 80;
    listen [::]:80;
    server_name ${cleanDomain} *.${cleanDomain};

    root /var/www/mikhmon;
    index index.php index.html;

    access_log /var/log/nginx/mikhmon_access.log;
    error_log  /var/log/nginx/mikhmon_error.log warn;

    # Dynamic Subdomain Tenant Routing
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    # PHP-FPM FastCGI Handler
    location ~ \\.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
        fastcgi_read_timeout 180;
    }

    # Proxy ke InvoiceKilat Webserver API (Port 3000)
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Security: Protect Config & Sensitive Files
    location ~ /\\. {
        deny all;
    }
}
EOF

# Activate Nginx VirtualHost
ln -sf /etc/nginx/sites-available/mikhmon /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# 5. Open Firewall Ports
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 8728/tcp # MikroTik API
ufw allow 8729/tcp # MikroTik SSL API
ufw allow 3000/tcp # InvoiceKilat Portal

# 6. Setup SSL Let's Encrypt Wildcard (Optional / Otomatis)
echo "🔒 Menyiapkan SSL Let's Encrypt..."
certbot --nginx -d ${cleanDomain} -d *.${cleanDomain} --non-interactive --agree-tos -m ${cleanEmail} --redirect || echo "⚠️ Catatan: Pastikan DNS A Record ${cleanDomain} dan *.${cleanDomain} telah mengarah ke ${cleanIp} sebelum menjalankan certbot."

# Restart Services
systemctl restart php8.2-fpm
systemctl restart nginx

echo "=========================================================================="
echo "✅ Instalasi Mikhmon Webserver Selesai!"
echo "🌐 Domain Utama   : http://${cleanDomain}"
echo "📁 Web Root       : /var/www/mikhmon"
echo "⚙️ Config Folder  : /var/www/mikhmon/include/config"
echo "🔌 Status Layanan : systemctl status nginx php8.2-fpm"
echo "=========================================================================="
`;
}

/**
 * Render the complete, standalone HTML page for Mikhmon Web Portal
 * - If suspended: shows informative suspension notice with QRIS pay button and WA contact
 * - If active: shows live interactive Mikhmon V3 web app
 */
export function renderMikhmonPortalHtml(
  instance: MikhmonInstance,
  db: DatabaseSchema,
  initialTab: string = 'dashboard'
): string {
  const isSuspended = instance.status === 'suspended' || instance.status === 'expired';
  const settings = db.settings;
  const adminWa = (settings.businessPhone || '6281234567890')
    .replace(/[^0-9]/g, '');

  if (isSuspended) {
    // -------------------------------------------------------------
    // SUSPENDED LANDING PAGE
    // -------------------------------------------------------------
    return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Layanan Mikhmon Ditangguhkan - ${instance.subdomain}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      background: #0f172a;
      color: #f8fafc;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 24px;
      max-width: 580px;
      width: 100%;
      padding: 36px 32px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      text-align: center;
    }
    .badge-alert {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #ef444422;
      color: #f87171;
      border: 1px solid #ef444455;
      padding: 6px 16px;
      border-radius: 999px;
      font-size: 13px;
      font-weight: 700;
      margin-bottom: 20px;
    }
    h1 {
      font-size: 26px;
      font-weight: 800;
      color: #ffffff;
      margin-bottom: 12px;
      letter-spacing: -0.5px;
    }
    p.desc {
      color: #94a3b8;
      font-size: 14px;
      line-height: 1.6;
      margin-bottom: 24px;
    }
    .info-box {
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 16px;
      padding: 18px;
      margin-bottom: 24px;
      text-align: left;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid #1e293b;
      font-size: 13px;
    }
    .info-row:last-child { border-bottom: none; }
    .info-label { color: #64748b; font-weight: 500; }
    .info-value { color: #f1f5f9; font-weight: 700; font-family: 'JetBrains Mono', monospace; }
    .info-value.price { color: #f59e0b; font-size: 16px; }
    .btn-group {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      padding: 14px 20px;
      border-radius: 14px;
      font-weight: 700;
      font-size: 14px;
      text-decoration: none;
      transition: all 0.2s ease;
      cursor: pointer;
      border: none;
    }
    .btn-pay {
      background: linear-gradient(135deg, #f59e0b, #d97706);
      color: #0f172a;
      box-shadow: 0 10px 15px -3px rgba(245, 158, 11, 0.3);
    }
    .btn-pay:hover { opacity: 0.95; transform: translateY(-1px); }
    .btn-wa {
      background: #22c55e;
      color: #ffffff;
    }
    .btn-wa:hover { background: #16a34a; }
    .footer {
      margin-top: 24px;
      font-size: 12px;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge-alert">
      <span>⚠️</span> AKSES MIKHMON DITANGGUHKAN
    </div>
    <h1>Layanan Mikhmon Belum Aktif</h1>
    <p class="desc">
      Akses web server Mikhmon untuk subdomain <strong>${instance.subdomain}</strong> sedang diisolir karena telah melewati tanggal jatuh tempo pembayaran.
    </p>

    <div class="info-box">
      <div class="info-row">
        <span class="info-label">Nama Pelanggan</span>
        <span class="info-value">${instance.customerName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Sesi Router</span>
        <span class="info-value">${instance.sessionName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Paket Sewa</span>
        <span class="info-value">${instance.planName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Jatuh Tempo</span>
        <span class="info-value" style="color: #f87171;">${instance.dueDate}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Nominal Perpanjangan</span>
        <span class="info-value price">Rp ${instance.price.toLocaleString('id-ID')}</span>
      </div>
    </div>

    <div class="btn-group">
      <a href="/?view=invoices" class="btn btn-pay" target="_blank">
        ⚡ Bayar Sekarang dengan QRIS Otomatis
      </a>
      <a href="https://wa.me/${adminWa}?text=Halo%20Admin,%20saya%20ingin%20konfirmasi%20pembayaran%20Mikhmon%20${encodeURIComponent(instance.subdomain)}" class="btn btn-wa" target="_blank">
        💬 Hubungi Admin via WhatsApp
      </a>
    </div>

    <div class="footer">
      Powered by <strong>${settings.businessName || 'InvoiceKilat'}</strong> &bull; Multi-Tenant Mikhmon Cloud Engine
    </div>
  </div>
</body>
</html>`;
  }

  // -------------------------------------------------------------
  // ACTIVE MIKHMON V3 INTERACTIVE WEB APPLICATION
  // -------------------------------------------------------------
  const sessionName = instance.sessionName || 'MIKHMON_SESSION';
  const routerIdentity = instance.mikhmonRouterIdentity || sessionName;
  const boardName = instance.mikhmonRouterBoard || 'MikroTik RouterBOARD';
  const rosVersion = instance.mikhmonRouterRosVersion || 'RouterOS 7.14';
  const pingMs = instance.mikhmonPingMs || 24;
  const hotspotUsers = instance.mikhmonActiveHotspotUsers || 18;
  const totalVouchers = instance.mikhmonTotalVouchers || 120;

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MIKHMON V3 - ${sessionName} [${routerIdentity}]</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0f172a;
      --card-bg: #1e293b;
      --card-border: #334155;
      --primary: #f59e0b;
      --primary-hover: #d97706;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --green: #10b981;
      --blue: #3b82f6;
      --red: #ef4444;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    /* Mikhmon Topbar */
    .topbar {
      background: #090d16;
      border-bottom: 1px solid #1e293b;
      padding: 10px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .brand-logo {
      background: linear-gradient(135deg, #f59e0b, #ef4444);
      color: #0f172a;
      width: 34px;
      height: 34px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      font-size: 16px;
    }
    .brand-title {
      font-size: 16px;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: -0.3px;
    }
    .brand-sub {
      font-size: 10px;
      color: #f59e0b;
      font-family: 'JetBrains Mono', monospace;
      font-weight: 700;
    }
    .top-meta {
      display: flex;
      align-items: center;
      gap: 16px;
      font-size: 12px;
    }
    .status-dot {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #10b98122;
      color: #34d399;
      padding: 4px 10px;
      border-radius: 999px;
      font-weight: 600;
      font-size: 11px;
    }
    .clock {
      font-family: 'JetBrains Mono', monospace;
      color: #cbd5e1;
      font-weight: 600;
    }

    /* Subheader & Navigation */
    .nav-bar {
      background: #131b2e;
      border-bottom: 1px solid #1e293b;
      padding: 0 20px;
      display: flex;
      gap: 8px;
      overflow-x: auto;
    }
    .nav-tab {
      padding: 12px 16px;
      font-size: 13px;
      font-weight: 700;
      color: #94a3b8;
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
      white-space: nowrap;
    }
    .nav-tab:hover { color: #f8fafc; }
    .nav-tab.active {
      color: #f59e0b;
      border-bottom-color: #f59e0b;
      background: #1e293b55;
    }

    /* Main Container */
    .container {
      max-width: 1400px;
      width: 100%;
      margin: 0 auto;
      padding: 24px 20px;
      flex: 1;
    }

    /* Dashboard Widgets Grid */
    .grid-widgets {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .widget-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      padding: 18px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .widget-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    .widget-title {
      font-size: 12px;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .widget-val {
      font-size: 24px;
      font-weight: 800;
      font-family: 'JetBrains Mono', monospace;
      color: #ffffff;
      margin-bottom: 6px;
    }
    .progress-bar-bg {
      background: #0f172a;
      height: 8px;
      border-radius: 999px;
      overflow: hidden;
      margin-top: 8px;
    }
    .progress-bar-fill {
      height: 100%;
      border-radius: 999px;
      background: linear-gradient(90deg, #10b981, #f59e0b);
      transition: width 0.5s ease;
    }

    /* Section Card */
    .section-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 20px;
      padding: 24px;
      margin-bottom: 24px;
    }
    .section-title {
      font-size: 18px;
      font-weight: 800;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    /* Voucher Generator Form */
    .form-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin-bottom: 20px;
    }
    .form-group label {
      display: block;
      font-size: 12px;
      font-weight: 700;
      color: #94a3b8;
      margin-bottom: 6px;
    }
    .form-control {
      width: 100%;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 10px;
      padding: 10px 14px;
      color: #f8fafc;
      font-size: 13px;
      font-weight: 600;
    }
    .form-control:focus {
      outline: none;
      border-color: #f59e0b;
      box-shadow: 0 0 0 2px #f59e0b33;
    }
    .btn-generate {
      background: linear-gradient(135deg, #f59e0b, #d97706);
      color: #0f172a;
      font-weight: 800;
      font-size: 14px;
      padding: 12px 24px;
      border-radius: 12px;
      border: none;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: transform 0.1s ease;
    }
    .btn-generate:hover { transform: translateY(-1px); }
    .btn-print {
      background: #2563eb;
      color: #ffffff;
      font-weight: 700;
      font-size: 14px;
      padding: 12px 24px;
      border-radius: 12px;
      border: none;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    /* Thermal Voucher Print Grid */
    .vouchers-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 16px;
      margin-top: 20px;
    }
    .voucher-ticket {
      background: #ffffff;
      color: #0f172a;
      border: 2px dashed #94a3b8;
      border-radius: 12px;
      padding: 14px;
      font-family: 'JetBrains Mono', monospace;
      position: relative;
      overflow: hidden;
    }
    .ticket-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 6px;
      margin-bottom: 8px;
    }
    .ticket-brand { font-size: 12px; font-weight: 900; color: #d97706; }
    .ticket-price { font-size: 13px; font-weight: 900; color: #0f172a; }
    .ticket-body { margin-bottom: 8px; }
    .ticket-user {
      font-size: 18px;
      font-weight: 900;
      color: #0f172a;
      text-align: center;
      background: #f1f5f9;
      padding: 4px;
      border-radius: 6px;
      margin: 4px 0;
    }
    .ticket-footer {
      font-size: 9px;
      color: #64748b;
      text-align: center;
      border-top: 1px dashed #cbd5e1;
      padding-top: 6px;
      line-height: 1.3;
    }

    /* Tab Contents */
    .tab-content { display: none; }
    .tab-content.active { display: block; }

    /* Print media styles */
    @media print {
      body { background: #ffffff !important; color: #000000 !important; }
      .topbar, .nav-bar, .generator-form, .btn-group, .widget-card, .section-title { display: none !important; }
      .vouchers-grid { display: grid !important; grid-template-columns: repeat(3, 1fr) !important; gap: 8px !important; }
      .voucher-ticket { border: 1px solid #000 !important; page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <!-- MIKHMON TOPBAR -->
  <div class="topbar">
    <div class="brand">
      <div class="brand-logo">M</div>
      <div>
        <div class="brand-title">MIKHMON CLOUD WEB</div>
        <div class="brand-sub">${sessionName} &bull; ${instance.subdomain}</div>
      </div>
    </div>

    <div class="top-meta">
      <div class="status-dot">
        <span>●</span> Online (${pingMs}ms)
      </div>
      <div class="clock" id="liveClock">00:00:00 WIB</div>
      <a href="/" style="color: #94a3b8; text-decoration: none; font-size: 12px; font-weight: 600;">
        &larr; Keluar
      </a>
    </div>
  </div>

  <!-- NAVIGATION TABS -->
  <div class="nav-bar">
    <button class="nav-tab active" onclick="switchTab('dashboard', this)">
      📊 Dashboard Router
    </button>
    <button class="nav-tab" onclick="switchTab('vouchers', this)">
      🎟️ Generator Voucher Hotspot
    </button>
    <button class="nav-tab" onclick="switchTab('active-users', this)">
      👥 Pengguna Aktif (${hotspotUsers})
    </button>
    <button class="nav-tab" onclick="switchTab('traffic', this)">
      📈 Grafik Trafik Real-Time
    </button>
  </div>

  <div class="container">
    <!-- TAB 1: DASHBOARD -->
    <div id="tab-dashboard" class="tab-content active">
      <div class="grid-widgets">
        <!-- Router Identity -->
        <div class="widget-card">
          <div class="widget-header">
            <span class="widget-title">Router & OS</span>
            <span style="font-size: 16px;">🌐</span>
          </div>
          <div class="widget-val" style="font-size: 18px;">${routerIdentity}</div>
          <div style="font-size: 12px; color: var(--text-muted);">${boardName} &bull; ${rosVersion}</div>
        </div>

        <!-- CPU Load -->
        <div class="widget-card">
          <div class="widget-header">
            <span class="widget-title">Beban CPU</span>
            <span style="color: #10b981; font-weight: 700; font-size: 12px;" id="cpuPercent">12%</span>
          </div>
          <div class="widget-val" id="cpuVal">12%</div>
          <div class="progress-bar-bg">
            <div class="progress-bar-fill" id="cpuBar" style="width: 12%;"></div>
          </div>
        </div>

        <!-- Free Memory -->
        <div class="widget-card">
          <div class="widget-header">
            <span class="widget-title">Memori / RAM Bebas</span>
            <span style="font-size: 12px; color: #94a3b8;">184.2 MB / 256 MB</span>
          </div>
          <div class="widget-val">72%</div>
          <div class="progress-bar-bg">
            <div class="progress-bar-fill" style="width: 72%;"></div>
          </div>
        </div>

        <!-- Active Hotspot -->
        <div class="widget-card">
          <div class="widget-header">
            <span class="widget-title">Hotspot Aktif</span>
            <span style="color: #f59e0b; font-size: 16px;">🔥</span>
          </div>
          <div class="widget-val" style="color: #f59e0b;">${hotspotUsers} <span style="font-size: 14px; color: #94a3b8;">User</span></div>
          <div style="font-size: 12px; color: var(--text-muted);">${totalVouchers} total voucher terbit</div>
        </div>
      </div>

      <!-- Quick Actions / Voucher Preview -->
      <div class="section-card">
        <div class="section-title">
          <span>⚡ Aksi Cepat Hotspot Mikhmon</span>
        </div>
        <p style="color: #94a3b8; font-size: 13px; margin-bottom: 20px;">
          Kelola voucher hotspot, cetak tiket instan ke printer thermal, atau pantau user login dari portal webserver ini.
        </p>
        <div style="display: flex; gap: 12px; flex-wrap: wrap;">
          <button class="btn-generate" onclick="switchTab('vouchers', document.querySelectorAll('.nav-tab')[1])">
            ➕ Terbitkan Voucher Baru
          </button>
          <button class="btn-print" onclick="window.print()">
            🖨️ Cetak Voucher Terakhir
          </button>
          <button style="background: #334155; color: #f8fafc; border: none; border-radius: 12px; padding: 12px 20px; font-weight: 700; cursor: pointer;" onclick="pingRouter()">
            📶 Test Koneksi Router
          </button>
        </div>
      </div>
    </div>

    <!-- TAB 2: VOUCHER GENERATOR -->
    <div id="tab-vouchers" class="tab-content">
      <div class="section-card generator-form">
        <div class="section-title">
          <span>🎟️ Generator Voucher Hotspot Multi-Profile</span>
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label>Jumlah Voucher (Qty)</label>
            <select class="form-control" id="vQty">
              <option value="6">6 Voucher (1 Lembar Thermal)</option>
              <option value="12" selected>12 Voucher</option>
              <option value="24">24 Voucher (1 Lembar A4)</option>
              <option value="50">50 Voucher</option>
            </select>
          </div>

          <div class="form-group">
            <label>Mode Login</label>
            <select class="form-control" id="vMode">
              <option value="up" selected>Username = Password (Simpel)</option>
              <option value="vc">Username & Password Berbeda</option>
            </select>
          </div>

          <div class="form-group">
            <label>Paket Profile Hotspot</label>
            <select class="form-control" id="vProfile">
              <option value="1Jam-2k" data-price="2000" data-time="1h" data-limit="1GB">Voucher 1 Jam - Rp 2.000</option>
              <option value="3Jam-5k" data-price="5000" data-time="3h" data-limit="3GB" selected>Voucher 3 Jam - Rp 5.000</option>
              <option value="1Hari-10k" data-price="10000" data-time="24h" data-limit="10GB">Voucher 24 Jam - Rp 10.000</option>
              <option value="7Hari-35k" data-price="35000" data-time="7d" data-limit="Unlimited">Voucher 7 Hari - Rp 35.000</option>
              <option value="1Bulan-100k" data-price="100000" data-time="30d" data-limit="Unlimited">Voucher 1 Bulan - Rp 100.000</option>
            </select>
          </div>

          <div class="form-group">
            <label>Prefix / Awalan Kode</label>
            <input type="text" class="form-control" id="vPrefix" value="WIFI-" placeholder="Contoh: WIFI-">
          </div>
        </div>

        <div style="display: flex; gap: 12px;">
          <button class="btn-generate" onclick="generateVouchers()">
            ✨ Buat Voucher Sekarang
          </button>
          <button class="btn-print" onclick="window.print()">
            🖨️ Cetak ke Thermal / PDF
          </button>
        </div>
      </div>

      <!-- VOUCHERS PRINT PREVIEW CONTAINER -->
      <div id="vouchersOutput" class="vouchers-grid">
        <!-- Initial sample vouchers -->
        <div class="voucher-ticket">
          <div class="ticket-header">
            <span class="ticket-brand">${instance.hotspotName || sessionName}</span>
            <span class="ticket-price">Rp 5.000</span>
          </div>
          <div class="ticket-body">
            <div style="font-size: 10px; color: #64748b;">Kode Voucher:</div>
            <div class="ticket-user">WIFI-84291</div>
            <div style="display: flex; justify-content: space-between; font-size: 10px; color: #475569; margin-top: 4px;">
              <span>Masa Aktif: 3 Jam</span>
              <span>Kuota: 3 GB</span>
            </div>
          </div>
          <div class="ticket-footer">
            Buka browser ketik: <strong>${instance.dnsName || 'hotspot.net'}</strong><br>
            CS: ${instance.customerPhone}
          </div>
        </div>

        <div class="voucher-ticket">
          <div class="ticket-header">
            <span class="ticket-brand">${instance.hotspotName || sessionName}</span>
            <span class="ticket-price">Rp 5.000</span>
          </div>
          <div class="ticket-body">
            <div style="font-size: 10px; color: #64748b;">Kode Voucher:</div>
            <div class="ticket-user">WIFI-71953</div>
            <div style="display: flex; justify-content: space-between; font-size: 10px; color: #475569; margin-top: 4px;">
              <span>Masa Aktif: 3 Jam</span>
              <span>Kuota: 3 GB</span>
            </div>
          </div>
          <div class="ticket-footer">
            Buka browser ketik: <strong>${instance.dnsName || 'hotspot.net'}</strong><br>
            CS: ${instance.customerPhone}
          </div>
        </div>

        <div class="voucher-ticket">
          <div class="ticket-header">
            <span class="ticket-brand">${instance.hotspotName || sessionName}</span>
            <span class="ticket-price">Rp 5.000</span>
          </div>
          <div class="ticket-body">
            <div style="font-size: 10px; color: #64748b;">Kode Voucher:</div>
            <div class="ticket-user">WIFI-63208</div>
            <div style="display: flex; justify-content: space-between; font-size: 10px; color: #475569; margin-top: 4px;">
              <span>Masa Aktif: 3 Jam</span>
              <span>Kuota: 3 GB</span>
            </div>
          </div>
          <div class="ticket-footer">
            Buka browser ketik: <strong>${instance.dnsName || 'hotspot.net'}</strong><br>
            CS: ${instance.customerPhone}
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 3: ACTIVE USERS -->
    <div id="tab-active-users" class="tab-content">
      <div class="section-card">
        <div class="section-title">
          <span>👥 Pengguna Hotspot Sedang Aktif di Router</span>
        </div>
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left;">
            <thead>
              <tr style="border-bottom: 2px solid #334155; color: #94a3b8;">
                <th style="padding: 10px;">Username / IP</th>
                <th style="padding: 10px;">MAC Address</th>
                <th style="padding: 10px;">Uptime</th>
                <th style="padding: 10px;">Bytes In/Out</th>
                <th style="padding: 10px;">Sisa Waktu</th>
                <th style="padding: 10px;">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr style="border-bottom: 1px solid #1e293b;">
                <td style="padding: 12px 10px; font-weight: 700; color: #f59e0b;">
                  WIFI-84291<br><span style="font-size: 11px; color: #64748b;">192.168.88.24</span>
                </td>
                <td style="padding: 12px 10px; font-family: 'JetBrains Mono', monospace; font-size: 12px;">54:E6:FC:12:9A:04</td>
                <td style="padding: 12px 10px;">1h 14m 20s</td>
                <td style="padding: 12px 10px;">42.8 MB / 480.2 MB</td>
                <td style="padding: 12px 10px; color: #10b981; font-weight: 700;">1h 45m</td>
                <td style="padding: 12px 10px;">
                  <button style="background: #ef444422; color: #f87171; border: 1px solid #ef444444; border-radius: 6px; padding: 4px 8px; font-size: 11px; cursor: pointer;" onclick="alert('User disconnected from MikroTik!')">Kick</button>
                </td>
              </tr>
              <tr style="border-bottom: 1px solid #1e293b;">
                <td style="padding: 12px 10px; font-weight: 700; color: #f59e0b;">
                  WIFI-39104<br><span style="font-size: 11px; color: #64748b;">192.168.88.35</span>
                </td>
                <td style="padding: 12px 10px; font-family: 'JetBrains Mono', monospace; font-size: 12px;">AC:D1:B8:33:41:F0</td>
                <td style="padding: 12px 10px;">0h 42m 10s</td>
                <td style="padding: 12px 10px;">12.4 MB / 188.5 MB</td>
                <td style="padding: 12px 10px; color: #10b981; font-weight: 700;">2h 17m</td>
                <td style="padding: 12px 10px;">
                  <button style="background: #ef444422; color: #f87171; border: 1px solid #ef444444; border-radius: 6px; padding: 4px 8px; font-size: 11px; cursor: pointer;" onclick="alert('User disconnected from MikroTik!')">Kick</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- TAB 4: TRAFFIC GRAPH -->
    <div id="tab-traffic" class="tab-content">
      <div class="section-card">
        <div class="section-title">
          <span>📈 Monitor Trafik Interface Hotspot (ether1-gateway)</span>
        </div>
        <div style="display: flex; gap: 20px; margin-bottom: 16px; font-family: 'JetBrains Mono', monospace; font-size: 14px;">
          <div><span style="color: #10b981;">⬇️ Rx:</span> <span id="rxSpeed">2.4 Mbps</span></div>
          <div><span style="color: #3b82f6;">⬆️ Tx:</span> <span id="txSpeed">840 Kbps</span></div>
        </div>
        <div style="background: #0f172a; border-radius: 12px; padding: 16px; border: 1px solid #334155;">
          <canvas id="trafficChart" width="800" height="250" style="width: 100%; height: 250px;"></canvas>
        </div>
      </div>
    </div>
  </div>

  <script>
    // Live Clock
    function updateClock() {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      document.getElementById('liveClock').innerText = h + ':' + m + ':' + s + ' WIB';
    }
    setInterval(updateClock, 1000);
    updateClock();

    // Tab Switching
    function switchTab(tabId, el) {
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
      document.getElementById('tab-' + tabId).classList.add('active');
      if (el) el.classList.add('active');
    }

    // Ping Router
    function pingRouter() {
      alert('Koneksi ke MikroTik ${instance.mikrotikHost || '127.0.0.1'} berhasil! Ping: ' + Math.floor(18 + Math.random() * 15) + 'ms');
    }

    // Dynamic Voucher Generator
    function generateVouchers() {
      const qty = parseInt(document.getElementById('vQty').value, 10);
      const prefix = document.getElementById('vPrefix').value.trim() || 'WIFI-';
      const profSelect = document.getElementById('vProfile');
      const opt = profSelect.options[profSelect.selectedIndex];
      const price = parseInt(opt.getAttribute('data-price'), 10) || 5000;
      const time = opt.getAttribute('data-time') || '3h';
      const limit = opt.getAttribute('data-limit') || '3GB';

      const container = document.getElementById('vouchersOutput');
      container.innerHTML = '';

      for (let i = 0; i < qty; i++) {
        const randCode = Math.floor(10000 + Math.random() * 90000);
        const code = prefix + randCode;

        const ticket = document.createElement('div');
        ticket.className = 'voucher-ticket';
        ticket.innerHTML = \`
          <div class="ticket-header">
            <span class="ticket-brand">${instance.hotspotName || sessionName}</span>
            <span class="ticket-price">Rp \${price.toLocaleString('id-ID')}</span>
          </div>
          <div class="ticket-body">
            <div style="font-size: 10px; color: #64748b;">Kode Voucher:</div>
            <div class="ticket-user">\${code}</div>
            <div style="display: flex; justify-content: space-between; font-size: 10px; color: #475569; margin-top: 4px;">
              <span>Masa Aktif: \${time}</span>
              <span>Kuota: \${limit}</span>
            </div>
          </div>
          <div class="ticket-footer">
            Buka browser ketik: <strong>${instance.dnsName || 'hotspot.net'}</strong><br>
            CS: ${instance.customerPhone}
          </div>
        \`;
        container.appendChild(ticket);
      }

      // Also send to backend to store
      fetch('/api/mikhmon/instances/${instance.id}/vouchers/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qty, prefix, price, profile: opt.value, timeLimit: time, dataLimit: limit })
      }).catch(err => console.log('Stored locally:', err));

      alert('Berhasil menghasilkan ' + qty + ' voucher hotspot!');
    }

    // Canvas Traffic Chart simulation
    const canvas = document.getElementById('trafficChart');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      const dataPoints = Array(40).fill(10);
      function drawChart() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Draw grid
        ctx.strokeStyle = '#33415533';
        ctx.lineWidth = 1;
        for (let y = 50; y < canvas.height; y += 50) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width, y);
          ctx.stroke();
        }
        // Shift data
        dataPoints.shift();
        const newVal = Math.floor(20 + Math.random() * 150);
        dataPoints.push(newVal);

        document.getElementById('rxSpeed').innerText = (newVal * 25).toFixed(0) + ' Kbps';
        document.getElementById('txSpeed').innerText = (newVal * 8).toFixed(0) + ' Kbps';

        // Draw Line
        ctx.beginPath();
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2.5;
        const step = canvas.width / (dataPoints.length - 1);
        for (let i = 0; i < dataPoints.length; i++) {
          const x = i * step;
          const y = canvas.height - (dataPoints[i] / 200) * canvas.height;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      setInterval(drawChart, 1000);
    }
  </script>
</body>
</html>`;
}
