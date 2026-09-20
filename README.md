# InvoiceKilat - Smart Dynamic QRIS, ISP Billing & Invoice Management Platform

[![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.x-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.x-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-5.x-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-FF6F00?logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
[![EMVCo QRIS](https://img.shields.io/badge/EMVCo-QRIS_CRC16_Valid-00529B)](https://qris.id/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**InvoiceKilat** adalah platform penagihan invoice bisnis, manajemen pelanggan ISP/IT Services, dan generator otomatis **QRIS Dinamis ber-CRC16 valid** langsung dari gambar QRIS statis (DANA Bisnis, GoPay, OVO, ShopeePay, BCA, dll.). Aplikasi dirancang modern, responsif, dan siap diinstal sebagai **Progressive Web App (PWA)** di perangkat desktop maupun smartphone.

---

## 📸 Tangkapan Layar Aplikasi (Application Screenshots)

### 1. Dashboard Utama & Manajemen Invoice
Tampilan ringkasan metrik keuangan real-time (Total Tagihan, Terbayar, Tertunggak, Overdue), filter status instan, pencarian cepat, aksi kirim WhatsApp sekali klik, dan generator faktur baru.

![Dashboard Utama InvoiceKilat](/screenshots/dashboard.jpg)

---

### 2. Generator & Decoder QRIS Dinamis (EMVCo Bank Indonesia)
Konversi instan QRIS statis menjadi QRIS dinamis ber-nominal otomatis dengan kalkulasi checksum CRC16 standar Bank Indonesia. Menghindari kesalahan nominal transfer dari pelanggan.

![QRIS Dinamis Generator](/screenshots/qris-generator.jpg)

---

### 3. Billing Automation Center (ISP & Layanan Recurring)
Pusat otomasi tagihan bulanan massal untuk penyedia internet (PPPoE / Dedicated) dan layanan TI. Dilengkapi pemilihan metode perhitungan PPPoE, integrasi layanan recurring profil pelanggan otomatis, serta pemicu notifikasi WhatsApp H-3, Hari H, dan Overdue.

![Billing Automation Center](/screenshots/billing-automation.jpg)

---

### 4. Faktur Invoice Resmi Siap Cetak (PDF / Thermal)
Desain faktur profesional A4 dengan rincian biaya transparan, QRIS dinamis beresolusi tinggi, nomor rekening bank, cap status LUNAS resmi, dan tombol cetak langsung.

![Faktur Siap Cetak](/screenshots/invoice-printable.jpg)

---

## ✨ Fitur Lengkap Aplikasi

### ⚡ 1. Generator & Decoder QRIS Dinamis Otomatis
- **No Manual Input**: Cukup unggah tangkapan layar/foto QRIS statis DANA Bisnis atau penyedia lain. Canvas engine (`jsQR`) langsung mengekstrak:
  - Nama Merchant (*Tag 59*)
  - Kota Merchant (*Tag 60*)
  - Merchant Category Code (*Tag 52*)
  - Payload TLV EMVCo lengkap (*Tag 26-51*)
- **Injeksi Nominal Otomatis (*Tag 54*)**: Mengunci nominal tagihan hingga ke digit rupiah satuan.
- **Kalkulasi Checksum CRC16-CCITT (0xFFFF)**: Menghitung ulang 4-karakter heksadesimal checksum standar ASPI / Bank Indonesia sehingga terbaca valid di seluruh aplikasi m-Banking (BCA, Mandiri, BRI, BNI) dan e-Wallet.
- **Simulasi Pembayaran & Uji Coba**: Tombol simulasi scan dan verifikasi status pembayaran real-time.
- **Unduh QRIS HD**: Ekspor gambar QRIS beresolusi tinggi untuk disisipkan ke pesan chat atau media cetak.

### 📋 2. Manajemen Invoice & Siklus Penagihan
- **Status Transaksi Lengkap**:
  - `DRAFT` (Konsep)
  - `PENDING` (Menunggu Pembayaran)
  - `PAID` (Lunas dengan riwayat tanggal & metode pembayaran)
  - `OVERDUE` (Melewati tanggal jatuh tempo)
  - `CANCELLED` (Dibatalkan)
- **Multi-Item & Diskon**: Tambahkan beragam item produk/jasa, potongan harga, opsi PPN 11%, dan kalkulasi subtotal instan.
- **Pelunasan 1-Klik**: Tombol cepat untuk mengubah status tagihan menjadi lunas lengkap dengan catatan referensi transaksi.
- **Export & Import Data**: Dukungan ekspor ke format Spreadsheet/CSV untuk pencatatan pembukuan akuntansi.

### 🤖 3. Billing Automation Center (Otomasi Tagihan ISP)
- **Generate Tagihan Bulanan Massal**: Buat ratusan tagihan pelanggan untuk periode bulan baru hanya dalam 1 kali klik.
- **Dua Metode Perhitungan Paket PPPoE**:
  - *Rata-rata Bulanan (Monthly Average)*: Tagihan flat bulanan standar untuk pelanggan reguler.
  - *Real-time Berdasarkan Tanggal Aktif*: Perhitungan prorata akurat sesuai durasi hari pemakaian pelanggan.
- **Layanan Recurring Otomatis dari Profil Pelanggan**:
  - VPN Remote Mikrotik
  - Monitoring NOC & Bot SLA
  - IP Publik Statis
  - Add-on kustom lainnya
  *Semua layanan tambahan otomatis dihitung dari konfigurasi profil masing-masing pelanggan tanpa perlu dipilih ulang secara manual.*
- **Pusat Notifikasi WhatsApp Cerdas**:
  - **Invoice Baru**: Mengirim rincian invoice, batas tempo, dan tautan faktur/QRIS saat diterbitkan.
  - **Reminder H-3**: Pengingat sopan 3 hari sebelum tanggal jatuh tempo.
  - **Reminder Hari-H**: Notifikasi pada hari tanggal jatuh tempo pembayaran.
  - **Peringatan Overdue**: Surat teguran otomatis jika tagihan melewati batas tempo untuk mencegah isolir layanan internet.

### 👥 4. Direktori & Profiling Pelanggan (CRM)
- **Informasi Lengkap**: Nama pelanggan, nama instansi/perusahaan, nomor WhatsApp resmi, alamat email, dan alamat fisik lokasi pemasangan.
- **Segmentasi & Mode Pelanggan**: Mendukung kategori Retail Home, Corporate Dedicated, hingga Klien NOC.
- **Pengaturan Recurring Bawaan**: Pengaturan opsi layanan VPN dan Monitoring dapat diatur langsung saat menambah atau mengedit pelanggan.
- **Buku Piutang Real-time**: Menampilkan total saldo tertunggak dan riwayat seluruh transaksi faktur pelanggan terkait.

### 📦 5. Katalog Produk & Layanan
- Kelola master data paket internet, jasa instalasi jaringan fiber optic, pemeliharaan router Mikrotik, hingga jasa konsultasi IT.
- Satuan fleksibel: `Bulan`, `Proyek`, `Paket`, `Jam`, `Pcs`, `Hari`.
- Integrasi 1-klik ke pembuatan invoice manual.

### 🖨️ 6. Desain Faktur Cetak & Customer Portal
- **Invoice Standar A4**: Tata letak profesional dengan logo bisnis kustom, alamat, NPWP, syarat & ketentuan, serta cap lunas digital.
- **Struk Ringkas**: Cetak ramah printer kasir / printer thermal Bluetooth.
- **Customer Portal**: Halaman publik aman bagi pelanggan untuk melihat tagihan mereka, memindai QRIS dinamis secara mandiri, dan mengunduh kuitansi resmi.

### 📱 7. Progressive Web App (PWA) & Offline Ready
- Siap dipasang di layar utama (*Add to Home Screen*) pada smartphone Android, iPhone/iPad, dan aplikasi desktop (Chrome/Edge).
- Dilengkapi service worker untuk caching asset statis dan deteksi status koneksi offline.

---

## 🛠️ Arsitektur & Teknologi

| Bagian | Teknologi | Keterangan |
|---|---|---|
| **Frontend Framework** | React 18 + TypeScript | Komponen modular dan type-safety penuh |
| **Styling & Icons** | Tailwind CSS + Lucide React | Desain antarmuka modern, high contrast, responsif |
| **Build Tool** | Vite 5 | Fast HMR dan build bundle teroptimasi |
| **Backend Server** | Node.js + Express | RESTful API server untuk manipulasi invoice & data |
| **Bundler Server** | ESBuild | Kompilasi backend menjadi single file `dist/server.cjs` |
| **QRIS Processing** | jsQR + QRious + Canvas API | Decode QRIS dari gambar & generate QRIS resolusi tinggi |
| **Kalkulasi Checksum** | CRC16-CCITT (Poly 0x1021) | Algoritma standar sertifikasi EMVCo Bank Indonesia |
| **PWA** | Service Worker + Web Manifest | Dukungan installable aplikasi & ikon multi-resolusi |

---

## 📂 Struktur Proyek

```
invoice-kilat/
├── public/
│   ├── screenshots/              # Tangkapan layar fitur untuk dokumentasi
│   │   ├── dashboard.jpg
│   │   ├── qris-generator.jpg
│   │   ├── billing-automation.jpg
│   │   └── invoice-printable.jpg
│   ├── icon.svg                  # Ikon aplikasi
│   ├── pwa-192x192.png           # Aset PWA Android/Desktop
│   ├── pwa-512x512.png
│   ├── manifest.json             # Konfigurasi PWA Web Manifest
│   └── sw.js                     # Service Worker PWA
├── server/
│   ├── routes.ts                 # Handler seluruh REST API backend
│   └── storage.ts                # Adapter penyimpanan data invoice & pelanggan
├── src/
│   ├── assets/                   # Aset gambar & ilustrasi
│   ├── components/               # Komponen UI modular
│   │   ├── AnalyticsDashboard.tsx        # Ringkasan KPI keuangan
│   │   ├── BillingAutomationCenter.tsx   # Otomasi tagihan bulanan & WA
│   │   ├── CustomerDirectory.tsx         # Manajemen pelanggan & piutang
│   │   ├── CustomerPortal.tsx            # Portal akses mandiri pelanggan
│   │   ├── InvoiceDetailModal.tsx        # Modal pratinjau detail faktur
│   │   ├── InvoiceFormModal.tsx          # Form buat & edit invoice
│   │   ├── InvoiceList.tsx               # Tabel daftar & filter invoice
│   │   ├── PrintableInvoice.tsx          # Template cetak A4 & PDF
│   │   ├── QRISGeneratorModal.tsx        # Generator QRIS dinamis interaktif
│   │   ├── QRISImageUploader.tsx         # Scanner QRIS dari unggahan gambar
│   │   ├── ServiceCatalog.tsx            # Katalog jasa & paket internet
│   │   └── SettingsModal.tsx             # Pengaturan profil bisnis & rekening
│   ├── utils/
│   │   ├── qris.ts               # Algoritma TLV EMVCo & CRC16 Bank Indonesia
│   │   └── helpers.ts            # Formatter mata uang IDR, tanggal, dsb.
│   ├── types.ts                  # Deklarasi tipe data TypeScript
│   ├── App.tsx                   # Komponen induk aplikasi
│   ├── main.tsx                  # Entry point React
│   └── index.css                 # Konfigurasi Tailwind CSS
├── server.ts                     # Entry point Express backend server
├── vite.config.ts                # Konfigurasi Vite & reverse proxy
├── package.json                  # Dependensi dan script project
├── README.md                     # Dokumentasi utama proyek
└── DEPLOYMENT.md                 # Panduan komprehensif deployment production
```

---

## 🚀 Panduan Memulai Cepat (Local Development)

### Prasyarat:
- **Node.js**: Versi 18.x atau 20.x ke atas.
- **NPM** atau **Yarn** / **PNPM**.

### Langkah Instalasi:

```bash
# 1. Clone repositori ini
git clone https://github.com/USERNAME/invoice-kilat.git
cd invoice-kilat

# 2. Pasang dependensi
npm install

# 3. Jalankan development server
npm run dev
```

Buka peramban Anda di: **`http://localhost:3000`**

---

## 🔌 Dokumentasi REST API

Backend Express menyediakan endpoint API siap pakai:

| Metode | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/api/invoices` | Mengambil seluruh daftar invoice (dengan opsi filter) |
| `POST` | `/api/invoices` | Membuat invoice baru |
| `GET` | `/api/invoices/:id` | Mengambil detail 1 invoice berdasarkan ID |
| `PUT` | `/api/invoices/:id` | Memperbarui invoice |
| `DELETE` | `/api/invoices/:id` | Menghapus invoice |
| `POST` | `/api/invoices/:id/pay` | Mencatat pelunasan invoice |
| `POST` | `/api/invoices/generate-monthly` | Generate invoice bulanan massal untuk seluruh pelanggan terpilih |
| `GET` | `/api/customers` | Mengambil direktori pelanggan |
| `POST` | `/api/customers` | Menambah pelanggan baru beserta konfigurasi layanan recurring |
| `PUT` | `/api/customers/:id` | Memperbarui profil pelanggan |
| `DELETE` | `/api/customers/:id` | Menghapus pelanggan |
| `GET` | `/api/services` | Mengambil katalog jasa dan produk |
| `POST` | `/api/services` | Menambah item jasa baru |
| `POST` | `/api/qris/decode` | Memproses payload gambar QRIS statis dan mengekstrak TLV |
| `POST` | `/api/qris/generate-dynamic` | Menghasilkan QRIS dinamis dengan nominal dan CRC16 valid |

---

## 🚢 Panduan Build & Deployment ke Production

### 1. Build Single Bundle:
```bash
npm run build
```
Script ini akan:
1. Mem-build asset static frontend ke folder `dist/`.
2. Mengompilasi backend TypeScript `server.ts` menjadi bundle CommonJS mandiri di `dist/server.cjs` menggunakan `esbuild`.

### 2. Menjalankan Server Production:
```bash
npm start
```
Aplikasi langsung berjalan di port `3000` pada host `0.0.0.0`.

### 3. Opsi Platform Deployment:
Panduan mendalam mengenai pengaturan **Google Cloud Run, VPS Ubuntu (Nginx + PM2 + SSL Let's Encrypt), Docker, Render, dan Railway** dapat dilihat pada berkas **[DEPLOYMENT.md](./DEPLOYMENT.md)**.

---

## 🔒 Standar Keamanan & Kepatuhan QRIS

- **Standar EMVCo & ASPI**: Struktur QR Code mematuhi standar *Merchant Presented Mode* (EMVCo MPM) yang diadopsi resmi oleh Bank Indonesia.
- **Integritas Nominal**: QRIS dinamis menyematkan *Tag 54* sehingga nasabah tidak perlu mengetik nominal secara manual, mengeliminasi kesalahan transfer kurang atau lebih.
- **Verifikasi Checksum**: Menghitung 16-bit CRC dengan polinomial generator `0x1021`, nilai awal `0xFFFF`, dan memastikan hasil selalu 4 digit hex berhuruf kapital.

---

## 📄 Lisensi

Proyek ini dilisensikan di bawah lisensi **MIT License** - Anda bebas menggunakan, memodifikasi, dan mendistribusikan untuk keperluan komersial maupun personal.
