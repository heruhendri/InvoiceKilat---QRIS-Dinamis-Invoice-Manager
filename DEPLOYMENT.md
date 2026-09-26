# Panduan Lengkap: Upload ke GitHub & Deployment ke Hosting

Dokumen ini berisi panduan langkah demi langkah untuk mengunggah proyek **InvoiceKilat** ke **GitHub** dan menyebarkannya (*deploy*) ke berbagai platform hosting (**Cloud Run, Render, Railway, VPS Ubuntu/Debian, atau Docker**).

---

## Bagian 1: Cara Upload ke GitHub

Anda dapat mengunggah proyek ini ke GitHub melalui dua cara:
1. **Cara Cepat (Ekspor dari Menu Google AI Studio)**
2. **Cara Manual (Menggunakan Git CLI / Terminal)**

---

### Metode A: Ekspor Langsung dari Google AI Studio (Paling Mudah)

1. Di pojok kanan atas tampilan Google AI Studio Build, klik ikon menu **Titik Tiga (...)** atau **Settings**.
2. Pilih opsi **"Export to GitHub"** (atau **"Download as ZIP"** jika ingin mengedit di laptop terlebih dahulu).
3. Sambungkan akun GitHub Anda saat diminta.
4. Tentukan nama repositori (misal: `invoice-kilat-qris`) dan pilih visibilitas (**Public** atau **Private**).
5. Klik **Export**. Seluruh kode sumber beserta riwayat commit akan otomatis tersedia di akun GitHub Anda.

---

### Metode B: Menggunakan Git CLI (Terminal di Laptop / Komputer)

Jika Anda mengunduh source code dalam bentuk file ZIP atau mengkloningnya ke laptop:

#### 1. Ekstrak dan Buka Terminal di Folder Proyek
```bash
cd invoice-kilat
```

#### 2. Buat Repositori Baru di GitHub
1. Buka browser dan login ke [github.com](https://github.com).
2. Klik tombol hijau **New** (atau tanda `+` di kanan atas > **New repository**).
3. Beri nama repositori, contoh: `invoice-kilat`.
4. Pilih **Public** atau **Private**.
5. **JANGAN** centang *"Add a README file"*, *"Add .gitignore"*, atau *"Choose a license"* (karena proyek ini sudah menyediakannya).
6. Klik **Create repository**. Salin URL repositori Anda (misal: `https://github.com/USERNAME/invoice-kilat.git`).

#### 3. Inisialisasi Git dan Push ke GitHub
Jalankan perintah berikut di terminal:

```bash
# 1. Inisialisasi git jika belum ada
git init

# 2. Tambahkan semua file proyek
git add .

# 3. Buat commit pertama
git commit -m "feat: inisialisasi awal InvoiceKilat QRIS Dinamis & Otomasi Tagihan"

# 4. Ubah nama branch utama menjadi main
git branch -M main

# 5. Hubungkan ke repositori GitHub Anda (ganti USERNAME dan REPO_NAME)
git remote add origin https://github.com/USERNAME/invoice-kilat.git

# 6. Unggah kode ke GitHub
git push -u origin main
```

> **Tips untuk pembaruan berikutnya:**
> Jika Anda melakukan perubahan kode di kemudian hari, cukup jalankan:
> ```bash
> git add .
> git commit -m "update: pembaruan fitur"
> git push
> ```

---

## Bagian 2: Panduan Deployment ke Hosting

Aplikasi **InvoiceKilat** adalah aplikasi full-stack berbasis **Node.js (Express) + React (Vite)**. Pilih platform hosting yang paling sesuai dengan kebutuhan Anda di bawah ini:

---

### Opsi 1: Google Cloud Run (Rekomendasi Terbaik)

Karena aplikasi ini dikembangkan di Google AI Studio, Cloud Run adalah solusi hosting serverless resmi Google yang sangat cepat, murah, dan otomatis menyesuaikan skala (*auto-scale*).

#### Langkah 1-Klik dari Google AI Studio:
1. Klik tombol **Deploy** di bar atas Google AI Studio.
2. Pilih **Cloud Run**.
3. Sistem akan otomatis membangun image kontainer dan memberikan domain publik HTTPS aktif.

#### Atau Deploy Manual via Google Cloud CLI:
```bash
# Login ke akun Google Cloud
gcloud auth login

# Set project ID
gcloud config set project ID_PROYEK_ANDA

# Deploy langsung dari folder proyek
gcloud run deploy invoice-kilat \
  --source . \
  --region asia-southeast1 \
  --allow-unauthenticated \
  --port 3000
```

---

### Opsi 2: Cloud PaaS (Render / Railway / Koyeb)

Platform ini sangat ramah pemula dan otomatis melakukan deploy setiap kali Anda melakukan `git push` ke GitHub.

#### A. Deploy di Render.com:
1. Login ke [dashboard.render.com](https://dashboard.render.com).
2. Klik **New +** > **Web Service**.
3. Sambungkan repositori GitHub `invoice-kilat`.
4. Atur konfigurasi berikut:
   - **Environment:** `Node` atau `Docker`
   - Jika memilih `Node`:
     - **Build Command:** `npm run build`
     - **Start Command:** `npm start`
   - **Port:** `3000`
5. Tambahkan Environment Variable:
   - `NODE_ENV`: `production`
   - `GEMINI_API_KEY`: *(opsional jika menggunakan AI)*
6. Klik **Create Web Service**. Tunggu 2-3 menit hingga URL publik aktif.

#### B. Deploy di Railway.app:
1. Login ke [railway.app](https://railway.app).
2. Klik **New Project** > **Deploy from GitHub repo**.
3. Pilih repositori `invoice-kilat`.
4. Railway akan otomatis mendeteksi `Dockerfile` atau `package.json`.
5. Di tab **Settings** > **Networking**, klik **Generate Domain**.
6. Aplikasi Anda siap diakses secara online!

---

### Opsi 3: Shared Hosting / cPanel (Setup Node.js App) - Termasuk Node.js Versi 16

Jika Anda menggunakan hosting biasa (cPanel) dari penyedia seperti Niagahoster, Hostinger, DomaiNesia, IDCloudHost, dll.:

#### Langkah Penting untuk Node.js Versi 16:
> **Penting untuk Diketahui:**
> Tool modern seperti Vite membutuhkan Node.js 18+ saat proses *build* (`npm run build`). Namun, hasil akhirnya (`dist/` dan `dist/server.cjs`) telah kami konfigurasikan dengan **`--target=node16`** dan kami sertakan berkas **`app.js`**, sehingga **100% kompatibel dan dapat berjalan lancar di Node.js 16 di cPanel Anda**.

#### Cara Setup di cPanel:
1. **Periksa Versi Node.js di cPanel**:
   - Masuk ke cPanel > cari dan klik menu **"Setup Node.js App"**.
   - Klik **Create Application**.
   - Lihat menu dropdown **Node.js version**. Jika ada pilihan `18.x` atau `20.x`, **sangat disarankan memilih versi 18 atau 20**.
   - Jika hosting Anda **hanya memiliki Versi 16 (16.x)**, jangan khawatir! Ikuti langkah di bawah:

2. **Pengaturan Aplikasi di cPanel**:
   - **Node.js version:** `16.x` (atau 18.x/20.x)
   - **Application mode:** `Production`
   - **Application root:** folder tempat Anda menaruh file (contoh: `invoice` atau `public_html/invoice`)
   - **Application URL:** domain atau subdomain Anda (contoh: `invoice.domainanda.com`)
   - **Application startup file:** `app.js`
   - Klik tombol **Create** (atau **Save**).

3. **Cara Upload Berkas ke cPanel**:
   - Di laptop/komputer Anda atau dari hasil download proyek ini, pastikan sudah menjalankan `npm run build`.
   - Buka **File Manager** di cPanel, masuk ke folder **Application root** yang Anda tentukan tadi.
   - Unggah berkas-berkas berikut:
     - Folder **`dist/`** *(berisi file web dan `server.cjs`)*
     - Berkas **`app.js`** *(starter Passenger cPanel)*
     - Berkas **`package.json`**
     - Berkas **`.env`** *(opsional)*
   - Di halaman **Setup Node.js App** di cPanel, klik tombol **"Run NPM Install"** (atau buka terminal cPanel dan jalankan `npm install --omit=dev`).
   - Klik tombol **"Restart"** pada aplikasi Node.js Anda.

Aplikasi Anda kini langsung aktif di domain Anda dengan Node.js 16!

---

### Opsi 4: VPS Server Pribadi (Installer Otomatis 1-Klik & Custom Port)

Jika Anda memiliki VPS di DigitalOcean, Linode, AWS EC2, Contabo, IDCloudHost, atau Niagahoster:

#### ⚡ Metode 1: Installer Otomatis (Direkomendasikan)
Tersedia skrip installer otomatis **`install-vps.sh`** yang mendeteksi OS, memasang Node.js 20 LTS, mengizinkan **kustomisasi port** (misal: 8080, 5000, 3000), mengonfigurasi PM2/systemd, firewall UFW, serta Nginx Reverse Proxy & SSL Let's Encrypt secara otomatis.

1. **Clone dan Jalankan Installer di VPS:**
   ```bash
   git clone https://github.com/USERNAME/invoice-kilat.git
   cd invoice-kilat
   sudo bash install-vps.sh
   ```
2. **Atau jalankan langsung dengan parameter port kustom:**
   ```bash
   # Contoh menjalankan di Port 8080 tanpa interaksi:
   sudo bash install-vps.sh --port 8080 --yes

   # Contoh instalasi lengkap dengan Port 8080 + Domain Nginx + SSL HTTPS otomatis:
   sudo bash install-vps.sh --port 8080 --domain invoice.domainanda.com --ssl --yes
   ```

---

#### 🛠️ Metode 2: Instalasi Manual di VPS (dengan Port Kustom)

Jika Anda ingin melakukan langkah demi langkah sendiri:

##### 1. Masuk ke VPS dan Pasang Node.js 20 & Git:
```bash
# Update sistem
sudo apt update && sudo apt upgrade -y

# Pasang Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git nginx

# Pasang PM2 (Process Manager)
sudo npm install -g pm2
```

##### 2. Clone Repositori dan Tentukan Port Kustom:
```bash
# Clone repositori dari GitHub
git clone https://github.com/USERNAME/invoice-kilat.git
cd invoice-kilat

# Salin konfigurasi environment & ubah PORT sesuai keinginan (misal: 8080)
cp .env.example .env
sed -i 's/^PORT=.*/PORT=8080/' .env

# Install dependency & build aplikasi
npm install
npm run build

# Jalankan server dengan PM2 pada port yang telah ditentukan
PORT=8080 pm2 start dist/server.cjs --name "invoice-kilat"
pm2 save
pm2 startup
```

##### 3. Konfigurasi Nginx Reverse Proxy (Domain / Subdomain):
Edit konfigurasi Nginx:
```bash
sudo nano /etc/nginx/sites-available/invoice-kilat
```

Tempelkan konfigurasi berikut (sesuaikan port jika menggunakan selain 3000, misal: `8080`):


Tempelkan konfigurasi berikut:
```nginx
server {
    listen 80;
    server_name invoice.domainanda.com; # Ganti dengan domain Anda

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Aktifkan konfigurasi dan pasang SSL gratis (Let's Encrypt Certbot):
```bash
sudo ln -s /etc/nginx/sites-available/invoice-kilat /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Pasang SSL HTTPS gratis
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d invoice.domainanda.com
```

---

### Opsi 4: Menggunakan Docker Container

Proyek ini telah dilengkapi dengan `Dockerfile` multi-stage production yang sangat efisien.

#### 1. Build Image Docker:
```bash
docker build -t invoice-kilat .
```

#### 2. Jalankan Kontainer:
```bash
docker run -d -p 3000:3000 --name invoice-kilat-app invoice-kilat
```
Buka browser di `http://IP_SERVER:3000`.

---

## 📌 Rangkuman Perintah Penting (Cheat Sheet)

| Perintah | Fungsi |
| :--- | :--- |
| `npm run dev` | Menjalankan aplikasi dalam mode pengembangan lokal |
| `npm run build` | Melakukan build frontend (Vite) dan bundling server (esbuild) ke folder `dist` |
| `npm start` | Menjalankan server production dari file `dist/server.cjs` |
| `npm run lint` | Mengecek tipe data TypeScript sebelum deploy |
| `git push origin main` | Mengirim pembaruan kode ke repositori GitHub |
