#!/usr/bin/env bash

# ==============================================================================
# InvoiceKilat - Automated VPS Installer & Custom Port Setup
# Mendukung: Ubuntu 20.04+, Debian 11+, Rocky Linux, AlmaLinux, CentOS Stream
# ==============================================================================

set -e

# Warna Terminal untuk Output Cantik
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Default values
DEFAULT_PORT=3000
CHOSEN_PORT=""
INSTALL_NGINX="n"
DOMAIN_NAME=""
ENABLE_SSL="n"
PROCESS_MANAGER="pm2"
AUTO_YES=false

print_banner() {
  clear 2>/dev/null || true
  echo -e "${CYAN}${BOLD}"
  echo "  ██╗███╗   ██╗██╗   ██╗ ██████╗ ██╗ ██████╗███████╗██╗  ██╗██╗██╗      █████╗ ████████╗"
  echo "  ██║████╗  ██║██║   ██║██╔═══██╗██║██╔════╝██╔════╝██║ ██╔╝██║██║     ██╔══██╗╚══██╔══╝"
  echo "  ██║██╔██╗ ██║██║   ██║██║   ██║██║██║     █████╗  █████═╝ ██║██║     ███████║   ██║   "
  echo "  ██║██║╚██╗██║╚██╗ ██╔╝██║   ██║██║██║     ██╔══╝  ██╔═██╗ ██║██║     ██╔══██║   ██║   "
  echo "  ██║██║ ╚████║ ╚████╔╝ ╚██████╔╝██║╚██████╗███████╗██║ ╚██╗██║███████╗██║  ██║   ██║   "
  echo "  ╚═╝╚═╝  ╚═══╝  ╚═══╝   ╚═════╝ ╚═╝ ╚═════╝╚══════╝╚═╝  ╚═╝╚═╝╚══════╝╚═╝  ╚═╝   ╚═╝   "
  echo -e "${NC}"
  echo -e "${BLUE}================================================================================${NC}"
  echo -e "   🚀 ${BOLD}Script Instalasi Otomatis VPS dengan Dukungan Port Kustom${NC}"
  echo -e "   ⚡ QRIS Dinamis Otomatis, Invoice Management & Billing Mikrotik"
  echo -e "${BLUE}================================================================================${NC}\n"
}

log_info() {
  echo -e "${CYAN}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[OK]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[PERINGATAN]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# Parsing command line arguments
while [[ "$#" -gt 0 ]]; do
  case $1 in
    -p|--port) CHOSEN_PORT="$2"; shift ;;
    -d|--domain) DOMAIN_NAME="$2"; INSTALL_NGINX="y"; shift ;;
    -s|--ssl) ENABLE_SSL="y"; shift ;;
    --pm2) PROCESS_MANAGER="pm2" ;;
    --systemd) PROCESS_MANAGER="systemd" ;;
    -y|--yes) AUTO_YES=true ;;
    -h|--help)
      echo "Penggunaan: bash install-vps.sh [OPSI]"
      echo ""
      echo "Opsi:"
      echo "  -p, --port <PORT>       Tentukan port aplikasi kustom (misal: 8080, 5000, 3000)"
      echo "  -d, --domain <DOMAIN>   Konfigurasi domain Nginx reverse proxy (misal: invoice.domain.com)"
      echo "  -s, --ssl               Pasang sertifikat SSL gratis via Let's Encrypt (Certbot)"
      echo "  --pm2                   Gunakan PM2 Process Manager (default)"
      echo "  --systemd               Gunakan Linux Systemd Service"
      echo "  -y, --yes               Jalankan mode non-interaktif otomatis tanpa konfirmasi"
      echo "  -h, --help              Tampilkan bantuan ini"
      exit 0
      ;;
    *) echo "Opsi tidak dikenal: $1"; exit 1 ;;
  esac
  shift
done

# Pastikan script dijalankan sebagai root atau memiliki sudo
check_root() {
  if [ "$EUID" -ne 0 ]; then
    log_error "Script ini memerlukan hak akses root/sudo."
    echo -e "Silakan jalankan ulang dengan: ${BOLD}sudo bash install-vps.sh${NC}"
    exit 1
  fi
}

# Deteksi OS
detect_os() {
  if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
    OS_VERSION=$VERSION_ID
    log_info "Sistem Operasi terdeteksi: ${BOLD}$NAME ($VERSION_ID)${NC}"
  else
    OS="unknown"
    log_warn "Sistem Operasi tidak terdeteksi secara otomatis, melanjutkan dengan asumsi Debian/Ubuntu..."
  fi
}

# Cek ketersediaan port di sistem
is_port_in_use() {
  local port=$1
  if command -v ss &>/dev/null; then
    ss -tuln | grep -q ":$port "
    return $?
  elif command -v netstat &>/dev/null; then
    netstat -tuln | grep -q ":$port "
    return $?
  elif command -v lsof &>/dev/null; then
    lsof -i :$port &>/dev/null
    return $?
  fi
  return 1
}

# Prompt interaktif jika argumen tidak diberikan
prompt_user_inputs() {
  if [ "$AUTO_YES" = true ] && [ -n "$CHOSEN_PORT" ]; then
    return
  fi

  echo -e "${YELLOW}--------------------------------------------------------------------------------${NC}"
  echo -e "${BOLD}1. Konfigurasi Port Aplikasi${NC}"
  echo -e "Anda dapat menentukan port kustom (misal: 3000, 3001, 8080, 5000, 8000)."

  while true; do
    if [ -n "$CHOSEN_PORT" ]; then
      port_input="$CHOSEN_PORT"
    else
      read -rp "$(echo -e "${CYAN}Masukkan Port yang diinginkan [default: ${DEFAULT_PORT}]: ${NC}")" port_input
      port_input=${port_input:-$DEFAULT_PORT}
    fi

    # Validasi integer
    if ! [[ "$port_input" =~ ^[0-9]+$ ]] || [ "$port_input" -lt 1 ] || [ "$port_input" -gt 65535 ]; then
      log_error "Port harus berupa angka antara 1 dan 65535. Silakan ulangi."
      CHOSEN_PORT=""
      continue
    fi

    # Cek apakah port sedang dipakai
    if is_port_in_use "$port_input"; then
      log_warn "Port $port_input saat ini sedang aktif digunakan oleh layanan lain!"
      read -rp "$(echo -e "${YELLOW}Tetap gunakan port ini? (y/N): ${NC}")" confirm_in_use
      if [[ ! "$confirm_in_use" =~ ^[Yy]$ ]]; then
        CHOSEN_PORT=""
        continue
      fi
    fi

    CHOSEN_PORT="$port_input"
    log_success "Port aplikasi dikonfigurasi ke: ${BOLD}${CHOSEN_PORT}${NC}"
    break
  done

  echo ""
  echo -e "${YELLOW}--------------------------------------------------------------------------------${NC}"
  echo -e "${BOLD}2. Konfigurasi Nginx Reverse Proxy & Domain (Opsional)${NC}"
  echo -e "Nginx memungkinkan Anda mengakses aplikasi melalui nama domain/subdomain tanpa perlu mengetikkan port (contoh: ${CYAN}https://invoice.domainanda.com${NC})."

  if [ -z "$DOMAIN_NAME" ]; then
    read -rp "$(echo -e "${CYAN}Apakah Anda ingin mengonfigurasi Nginx Reverse Proxy sekarang? (y/N): ${NC}")" nginx_choice
    if [[ "$nginx_choice" =~ ^[Yy]$ ]]; then
      INSTALL_NGINX="y"
      read -rp "$(echo -e "${CYAN}Masukkan nama domain/subdomain (contoh: invoice.domainanda.com): ${NC}")" DOMAIN_NAME
      
      if [ -n "$DOMAIN_NAME" ]; then
        read -rp "$(echo -e "${CYAN}Pasang SSL Gratis Let's Encrypt (HTTPS) dengan Certbot? (y/N): ${NC}")" ssl_choice
        if [[ "$ssl_choice" =~ ^[Yy]$ ]]; then
          ENABLE_SSL="y"
        fi
      fi
    fi
  fi

  echo ""
  echo -e "${YELLOW}--------------------------------------------------------------------------------${NC}"
  echo -e "${BOLD}3. Manajemen Proses Latar Belakang (Auto-Restart)${NC}"
  echo -e "1) ${BOLD}PM2${NC} (Rekomendasi - mudah memantau log & restart otomatis)"
  echo -e "2) ${BOLD}Systemd Service${NC} (Layanan bawaan sistem Linux)"
  read -rp "$(echo -e "${CYAN}Pilih process manager [1=PM2, 2=Systemd, default: 1]: ${NC}")" pm_choice
  if [ "$pm_choice" = "2" ]; then
    PROCESS_MANAGER="systemd"
  else
    PROCESS_MANAGER="pm2"
  fi

  echo ""
  echo -e "${GREEN}Ringkasan Instalasi:${NC}"
  echo -e "  - Port Aplikasi   : ${BOLD}${CHOSEN_PORT}${NC}"
  echo -e "  - Reverse Proxy   : ${BOLD}$([ "$INSTALL_NGINX" = "y" ] && echo "Ya ($DOMAIN_NAME)" || echo "Tidak")${NC}"
  echo -e "  - Let's Encrypt   : ${BOLD}$([ "$ENABLE_SSL" = "y" ] && echo "Aktif" || echo "Tidak")${NC}"
  echo -e "  - Process Manager : ${BOLD}${PROCESS_MANAGER}${NC}"
  echo ""

  if [ "$AUTO_YES" = false ]; then
    read -rp "$(echo -e "${CYAN}Mulai proses instalasi sekarang? (Y/n): ${NC}")" confirm_start
    if [[ "$confirm_start" =~ ^[Nn]$ ]]; then
      log_warn "Instalasi dibatalkan oleh pengguna."
      exit 0
    fi
  fi
}

install_system_packages() {
  log_info "Memperbarui paket repositori sistem operasi..."
  
  if [[ "$OS" == "ubuntu" ]] || [[ "$OS" == "debian" ]]; then
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -y
    apt-get install -y curl wget git ufw lsof net-tools build-essential
    if [ "$INSTALL_NGINX" = "y" ]; then
      apt-get install -y nginx
      if [ "$ENABLE_SSL" = "y" ]; then
        apt-get install -y certbot python3-certbot-nginx
      fi
    fi
  elif [[ "$OS" == "centos" ]] || [[ "$OS" == "almalinux" ]] || [[ "$OS" == "rocky" ]] || [[ "$OS" == "rhel" ]]; then
    dnf update -y
    dnf install -y curl wget git tar gcc-c++ make lsof net-tools
    if [ "$INSTALL_NGINX" = "y" ]; then
      dnf install -y epel-release || true
      dnf install -y nginx
      if [ "$ENABLE_SSL" = "y" ]; then
        dnf install -y certbot python3-certbot-nginx
      fi
    fi
  fi
  log_success "Paket pendukung sistem berhasil diperbarui."
}

# Cek dan pasang Node.js 20 LTS jika belum ada
ensure_nodejs() {
  local need_install=false

  if command -v node &>/dev/null; then
    local node_ver=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
    if [ "$node_ver" -ge 18 ]; then
      log_success "Node.js versi $(node -v) sudah terpasang dan memenuhi syarat (>= v18)."
    else
      log_warn "Versi Node.js terpasang ($(node -v)) sudah usang. Memperbarui ke Node.js 20 LTS..."
      need_install=true
    fi
  else
    log_info "Node.js belum terpasang. Memulai pemasangan Node.js 20 LTS..."
    need_install=true
  fi

  if [ "$need_install" = true ]; then
    if [[ "$OS" == "ubuntu" ]] || [[ "$OS" == "debian" ]]; then
      curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
      apt-get install -y nodejs
    elif [[ "$OS" == "centos" ]] || [[ "$OS" == "almalinux" ]] || [[ "$OS" == "rocky" ]] || [[ "$OS" == "rhel" ]]; then
      curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
      dnf install -y nodejs
    else
      log_error "Pemasangan Node.js otomatis tidak didukung untuk distro ini. Pasang Node.js 20 manual."
      exit 1
    fi
    log_success "Node.js $(node -v) dan npm $(npm -v) berhasil dipasang."
  fi
}

setup_environment_file() {
  log_info "Mengonfigurasi file .env dengan port ${CHOSEN_PORT}..."
  
  if [ ! -f .env ]; then
    if [ -f .env.example ]; then
      cp .env.example .env
    else
      touch .env
    fi
  fi

  # Update atau tambahkan variabel PORT di .env
  if grep -q "^PORT=" .env; then
    sed -i "s/^PORT=.*/PORT=${CHOSEN_PORT}/" .env
  else
    echo "PORT=${CHOSEN_PORT}" >> .env
  fi

  log_success "File .env berhasil diperbarui (PORT=${CHOSEN_PORT})."
}

build_application() {
  log_info "Memasang dependensi project via npm install..."
  npm install

  log_info "Melakukan build frontend & bundling server production (npm run build)..."
  npm run build

  if [ ! -f "dist/server.cjs" ]; then
    log_error "Bundle server 'dist/server.cjs' tidak ditemukan setelah build! Periksa log kesalahan di atas."
    exit 1
  fi
  log_success "Aplikasi InvoiceKilat berhasil dibuild."
}

configure_firewall() {
  if command -v ufw &>/dev/null; then
    log_info "Mengonfigurasi aturan firewall (UFW) untuk port ${CHOSEN_PORT}..."
    ufw allow "${CHOSEN_PORT}/tcp" comment "InvoiceKilat Port ${CHOSEN_PORT}" || true
    if [ "$INSTALL_NGINX" = "y" ]; then
      ufw allow 80/tcp comment "Nginx HTTP" || true
      ufw allow 443/tcp comment "Nginx HTTPS" || true
    fi
    log_success "Firewall UFW disesuaikan."
  fi
}

setup_pm2() {
  log_info "Memasang dan menyiapkan PM2 process manager..."
  npm install -g pm2

  # Hentikan proses lama jika ada
  pm2 delete invoice-kilat 2>/dev/null || true

  # Jalankan aplikasi dengan environment PORT yang ditentukan
  PORT="${CHOSEN_PORT}" pm2 start dist/server.cjs --name "invoice-kilat" --env PORT="${CHOSEN_PORT}"
  pm2 save
  
  # Aktifkan startup saat reboot server
  pm2 startup systemd -u root --hp /root || pm2 startup || true
  log_success "Aplikasi berhasil dijalankan di background dengan PM2."
}

setup_systemd() {
  log_info "Membuat service systemd /etc/systemd/system/invoice-kilat.service..."
  local app_dir=$(pwd)
  local node_path=$(which node)

  cat <<EOF > /etc/systemd/system/invoice-kilat.service
[Unit]
Description=InvoiceKilat QRIS & Billing Manager
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=${app_dir}
Environment=NODE_ENV=production
Environment=PORT=${CHOSEN_PORT}
ExecStart=${node_path} ${app_dir}/dist/server.cjs
Restart=always
RestartSec=5
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=invoice-kilat

[Install]
WantedBy=multi-user.target
EOF

  systemctl daemon-reload
  systemctl enable invoice-kilat
  systemctl restart invoice-kilat
  log_success "Layanan systemd 'invoice-kilat' berhasil diaktifkan dan dijalankan."
}

setup_nginx() {
  if [ "$INSTALL_NGINX" != "y" ] || [ -z "$DOMAIN_NAME" ]; then
    return
  fi

  log_info "Mengonfigurasi virtual host Nginx untuk domain: ${DOMAIN_NAME} -> Port ${CHOSEN_PORT}..."

  local conf_file="/etc/nginx/sites-available/invoice-kilat"
  if [ ! -d "/etc/nginx/sites-available" ]; then
    mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled
  fi

  cat <<EOF > "$conf_file"
server {
    listen 80;
    server_name ${DOMAIN_NAME};

    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:${CHOSEN_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

  ln -sf "$conf_file" /etc/nginx/sites-enabled/invoice-kilat
  
  # Hapus default nginx jika ada konflik nama
  if [ -f /etc/nginx/sites-enabled/default ]; then
    rm -f /etc/nginx/sites-enabled/default
  fi

  nginx -t
  systemctl restart nginx
  log_success "Nginx reverse proxy berhasil diaktifkan."

  if [ "$ENABLE_SSL" = "y" ]; then
    log_info "Mengajukan sertifikat SSL gratis via Let's Encrypt Certbot untuk ${DOMAIN_NAME}..."
    certbot --nginx -d "${DOMAIN_NAME}" --non-interactive --agree-tos --register-unsafely-without-email --redirect || {
      log_warn "Penerbitan SSL otomatis gagal. Pastikan DNS domain ${DOMAIN_NAME} sudah mengarah ke IP server ini."
    }
  fi
}

get_server_ip() {
  curl -s -4 ifconfig.me || curl -s -4 api.ipify.org || hostname -I | awk '{print $1}'
}

print_completion_summary() {
  local ip=$(get_server_ip)

  echo -e "\n${GREEN}${BOLD}================================================================================${NC}"
  echo -e "   🎉 ${BOLD}INSTALASI INVOICEKILAT BERHASIL DISELESAIKAN!${NC}"
  echo -e "${GREEN}${BOLD}================================================================================${NC}\n"

  echo -e "${BOLD}Detail Konfigurasi Server:${NC}"
  echo -e "  • Status Aplikasi : ${GREEN}${BOLD}AKTIF / BERJALAN${NC}"
  echo -e "  • Port Aplikasi   : ${CYAN}${BOLD}${CHOSEN_PORT}${NC}"
  echo -e "  • Process Manager : ${BOLD}${PROCESS_MANAGER}${NC}"

  echo -e "\n${BOLD}Alamat Akses Aplikasi:${NC}"
  echo -e "  • IP Langsung     : ${GREEN}${BOLD}http://${ip}:${CHOSEN_PORT}${NC}"
  if [ "$INSTALL_NGINX" = "y" ] && [ -n "$DOMAIN_NAME" ]; then
    if [ "$ENABLE_SSL" = "y" ]; then
      echo -e "  • Domain HTTPS    : ${GREEN}${BOLD}https://${DOMAIN_NAME}${NC}"
    else
      echo -e "  • Domain HTTP     : ${GREEN}${BOLD}http://${DOMAIN_NAME}${NC}"
    fi
  fi

  echo -e "\n${BOLD}Perintah Pengelolaan Aplikasi:${NC}"
  if [ "$PROCESS_MANAGER" = "pm2" ]; then
    echo -e "  • Cek Status : ${CYAN}pm2 status${NC}"
    echo -e "  • Lihat Log  : ${CYAN}pm2 logs invoice-kilat${NC}"
    echo -e "  • Restart    : ${CYAN}pm2 restart invoice-kilat${NC}"
    echo -e "  • Stop       : ${CYAN}pm2 stop invoice-kilat${NC}"
  else
    echo -e "  • Cek Status : ${CYAN}systemctl status invoice-kilat${NC}"
    echo -e "  • Lihat Log  : ${CYAN}journalctl -u invoice-kilat -f${NC}"
    echo -e "  • Restart    : ${CYAN}systemctl restart invoice-kilat${NC}"
    echo -e "  • Stop       : ${CYAN}systemctl stop invoice-kilat${NC}"
  fi

  echo -e "\n${CYAN}Buka alamat di browser Anda untuk mulai mengelola invoice & QRIS!${NC}\n"
}

# --- Alur Eksekusi Utama ---
check_root
detect_os
print_banner
prompt_user_inputs
install_system_packages
ensure_nodejs
setup_environment_file
build_application
configure_firewall

if [ "$PROCESS_MANAGER" = "pm2" ]; then
  setup_pm2
else
  setup_systemd
fi

setup_nginx
print_completion_summary
