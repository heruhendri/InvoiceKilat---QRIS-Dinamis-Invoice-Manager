# InvoiceKilat - QRIS Dinamis & Invoice Manager

Aplikasi penagihan invoice bisnis berbasis web dan Mobile PWA (Progressive Web App) dengan generator otomatis **QRIS Dinamis ber-CRC16 valid** langsung dari QRIS statis DANA Bisnis / e-wallet lain, dilengkapi dengan manajemen pelanggan, katalog jasa, serta pusat otomasi penagihan via WhatsApp & Email.

![InvoiceKilat Banner](/banner.png)

---

## ✨ Fitur Utama

- **Upload QRIS Cepat (No Manual Input)**: Cukup upload gambar QRIS statis DANA Bisnis, sistem otomatis memindai (*decode Canvas/jsQR*) dan mengekstrak nama merchant, kota, dan payload TLV.
- **Generator QRIS Dinamis Otomatis**: Mengonversi QRIS statis menjadi QRIS dinamis ber-nominal terkunci sesuai tagihan lengkap dengan checksum CRC16 standar EMVCo Bank Indonesia.
- **Daftar Pelanggan**: Pencatatan profil klien (nama, perusahaan, WhatsApp, email, alamat, catatan) serta kalkulasi histori transaksi dan saldo tertunggak.
- **Daftar Jasa & Produk**: Katalog layanan standar dengan pilihan satuan (Proyek, Bulan, Jam, Paket, Pcs) dan harga untuk disisipkan instan ke faktur.
- **Pusat Otomasi Penagihan**: Pengiriman notifikasi tagihan otomatis (Penerbitan Baru, H-3 Jatuh Tempo, Hari H, dan Peringatan Keterlambatan Overdue) via WhatsApp & Email.
- **PWA & Offline Ready**: Dapat diinstal (*Add to Home Screen*) di perangkat Android/iOS/Desktop.
- **Cetak Faktur PDF & Download QRIS**: Tampilan faktur profesional siap cetak lengkap dengan cap LUNAS dan QRIS dinamis resolusi tinggi.

---

## 🚀 Memulai (Local Development)

### Prasyarat:
- Node.js 20+ (atau Node.js 18+)
- npm atau pnpm

### Langkah Menjalankan:
```bash
# 1. Clone repositori
git clone https://github.com/USERNAME/invoice-kilat.git
cd invoice-kilat

# 2. Pasang dependensi
npm install

# 3. Jalankan server pengembangan
npm run dev
```
Buka browser di `http://localhost:3000`.

---

## 📦 Build & Production

```bash
# Build frontend dan backend
npm run build

# Jalankan server production
npm start
```

---

## 🌐 Panduan Upload ke GitHub & Hosting

Panduan lengkap langkah demi langkah untuk mengunggah ke GitHub dan men-deploy ke **Google Cloud Run, Render, Railway, VPS Ubuntu (Nginx/PM2), atau Docker** telah disediakan di berkas [DEPLOYMENT.md](./DEPLOYMENT.md).

---

## 📄 Lisensi
MIT License © 2026 InvoiceKilat.
