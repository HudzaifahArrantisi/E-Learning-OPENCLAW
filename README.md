<div align="center">
  <h1>E-learning STUDENT HUB</h1>

  ![Status](https://img.shields.io/badge/Status-Active-success)
  ![Platform](https://img.shields.io/badge/Platform-Web-blue)
  ![Stack](https://img.shields.io/badge/Stack-React%20%7C%20Go-orange)
  ![Database](https://img.shields.io/badge/Database-PostgreSQL-blue)
  ![License](https://img.shields.io/badge/License-Academic-lightgrey)
</div>

## 📸 Preview

### 1. Landing Page
*Kesan pertama platform akademik yang modern.*
![Landing Page](frontend/src/assets/img.png)

### 2. Dashboard Mahasiswa
*Pengalaman feed layaknya media sosial (For You, Like, Komentar, Update Organisasi) yang digabungkan dengan fungsi inti akademik (Tugas, Materi, Absensi, Nilai, UKT).*
![Dashboard Mahasiswa](frontend/src/assets/image.png)

### 3. Notifikasi Telegram
*Notifikasi Real Time Tugas Mahasiswa.*
![Notifikasi Telegram](frontend/src/assets/image2.png)

---

## 📖 Gambaran Umum

**STUDENT HUB** menghubungkan **Mahasiswa**, **Dosen**, **Admin**, **Orang Tua**, **UKM**, dan **ORMAWA** ke dalam satu pengalaman web terpusat yang aman dan skalabel.

Secara pengalaman pengguna (*User Experience*), STUDENT HUB mengadopsi pola interaksi modern (seperti *timeline feed* dan *social interaction*) lalu menggabungkannya dengan kebutuhan inti kampus (*LMS*, administrasi, komunikasi real-time).

> **One platform. One ecosystem. One academic experience.**

### 🔄 Pembaruan Terbaru
- Penambahan **Popup Tutorial Interaktif** khusus mahasiswa baru pada Landing Page (hanya muncul pada kunjungan pertama).
- Pembaruan UI Landing Page dengan section **Panduan Role (Role Guides)** interaktif yang terstruktur (Mahasiswa, Dosen, Orang Tua, Ormawa, Admin).
- Optimalisasi **Akses Jaringan Lokal (LAN)**: Backend telah dikonfigurasi menggunakan `AllowOriginFunc` untuk mengizinkan akses sistem penuh melalui jaringan Wi-Fi lokal dari perangkat mobile tanpa kendala CORS (403 Forbidden).
- Modul **Chatbot** telah dihapus dari frontend dan backend.
- Seluruh endpoint dan fungsi **API health check** yang terkait chatbot/OpenClaw telah dihapus karena tidak digunakan.

---

## ✨ Fitur Utama (Berdasarkan Role)

Sistem memastikan privasi dan keamanan dengan menggunakan arsitektur *Role-Based Access Control* (RBAC) yang memisahkan dashboard setiap user:

| 👑 Role | Fitur Tersedia |
|---|---|
| 🎓 **Mahasiswa** | Dashboard Akademik, Lihat Materi & Submit Tugas, Cek Kehadiran (Scan QR), Bayar & Tracking UKT, Chat Dosen, Profil Publik. |
| 👨‍🏫 **Dosen** | Manajemen Matkul & Pertemuan, Upload Tugas & Materi, Input & Koreksi Nilai, Generate Absensi QR Code, Chat Mahasiswa. |
| 🤖 **OpenClaw** | *(Automation Engine)*: Menarik data via Outbox Pattern, Kirim Notifikasi via Telegram Bot, Pengingat *Deadline* Otomatis. |
| 🛠️ **Admin** | Manajemen Akun, Posting Pengumuman Kampus, Monitor UKT Mahasiswa, Dashboard Analytics, Pengaturan Sistem Kampus. |
| 👨‍👩‍👧 **Orang Tua** | Monitor Kehadiran Kuliah Anak, Tracking Status Pembayaran UKT, Notifikasi Akademik. |
| 🏫 **Ormawa/UKM** | Manajemen Profil Organisasi, Publikasi Kegiatan/Kepanitiaan di Feed Kampus, Berinteraksi dengan Sivitas (Like & Comment). |

---

## 🛠️ Stack Teknologi

Sistem menggunakan stack moderen yang dioptimalkan untuk skalabilitas tinggi, transisi antar layar yang mulus, serta proses *automation* tanpa henti di belakang layar.

### Frontend
- **Framework:** React 19 + Vite 7
- **Styling:** Tailwind CSS, MUI + Emotion, GSAP (Animations), Three.js (3D Elements)
- **Routing & State:** React Router 7, TanStack React Query 5
- **Communication:** Axios

### Backend & Automation
- **Language:** Go 1.24
- **Framework:** Gin (HTTP framework)
- **Database:** PostgreSQL (Supabase) + GORM (Seelumnya MySQL)
- **Authentication:** JWT (HS256)
- **Real-time:** Gorilla / WebSocket
- **Automation Service:** Backend memiliki *microservice* internal bernama **OpenClaw** untuk Push Notification ke Telegram Bot API.

---

## 🚀 Panduan Instalasi (Development)

Pastikan lingkungan lokal Anda sudah diinstal **Node.js ≥ 18**, **Go ≥ 1.20**, dan **PostgreSQL**.

### 1. Ekstraksi Repositori
```bash
git clone https://github.com/HudzaifahArrantisi/NF-STUDENT-HUB.git
cd NF-STUDENT-HUB
```

### 2. Setup Database & Environment Backend
Pusat API dan Database harus dikonfigurasi pada folder `backend`. Buatlah file `.env` di dalam folder `backend`:

```env
# Koneksi Database PostgreSQL (Bisa lokal atau Supabase)
# PENTING: Untuk deployment serverless (Leapcell/Vercel), gunakan Transaction Pooler (port 6543)
# JANGAN gunakan Session Pooler (port 5432) — akan menyebabkan error EMAXCONNSESSION
DB_DSN=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres

# Security
JWT_SECRET=isi_dengan_bebas_rahasia_panjang
NAMA=STUDENT HUB Server

# Konfigurasi OpenClaw dan Bot Telegram
OPENCLAW_BASE_URL=http://localhost:9090
TELEGRAM_BOT_TOKEN=token_bot_anda_dari_botfather
TELEGRAM_CHANNEL_ID=@channel_target_reminder

# Opsional: path interpreter Python untuk optimizer upload (default: python / py -3)
PYTHON_BIN=python
```

Instal dependency Python untuk optimizer upload:

```bash
pip install pillow pypdf pikepdf
```

### 3. Menjalankan Ke-3 Servis Utamanya

Buka **tiga (3) terminal yang berbeda** untuk menjalankan masing-masing komponen:

**Terminal 1 — Frontend Web**
```bash
cd frontend
npm install
npm run dev
# Akses aplikasi web Anda pada http://localhost:3000
```

**Terminal 2 — REST API Backend**
```bash
cd backend
go mod download
go run main.go
# API Utama melayani rute http://localhost:8080
```

**Terminal 3 — Microservice OpenClaw (Bot/Notifikasi)**
```bash
cd backend/openclaw
go mod download
go run main.go
# Internal API OpenClaw berjalan di http://localhost:9090
```

> **Catatan:** Jika Anda ingin menggunakan akses LAN, pastikan Firewall Inbound (Windows) pada port 3000, 8080 terhubung pada Wi-Fi yang sama, dan gunakan `http://<IP-LAN-ANDA>:3000` di perangkat klien (Mobile / Device lain).

---

## 📁 Struktur Arsip Root

```text
STUDENT-HUB/
├── frontend/             # Folder seluruh UI React
│   ├── public/
│   └── src/
│       ├── components/   # UI Partials (Re-usable Components)
│       ├── pages/        # Views untuk Routing
│       ├── hooks/
│       ├── services/
│       └── utils/
│
├── backend/              # Inti Sistem API Go
│   ├── config/           # Database Connectors (PostgreSQL)
│   ├── controllers/      # Business Logic
│   ├── models/           # DTO & Schema Models
│   ├── routes/           # Endpoint Index
│   ├── openclaw/         # MICROSERVICE Engine Automation
│   │   ├── discord/      # (Opsional Future) Modul Discord
│   │   ├── handler/      # Polling Events
│   │   └── telegram/     # Broadcast Bot
│   └── uploads/          # Auto-generated Static Files (Tugas & Materi)
│
└── README.md
```

---

## 🔐 Standar Keamanan Sistem
- **RBAC (Role Based Access Control):** Implementasi middleware di backend Go untuk memblokir user mengakses resource selain golongannya.
- **Payload Encryption:** Autentikasi state-less dengan token JWT yang di-_hash_ via standard HS256.
- **Auto Prevention:** Mencegah kebocoran struktur Query SQL *Injection* via standardisasi GORM.

*(Peringatan: Pastikan `.env` ter-ignor (`.gitignore`) saat production deployment agar *credential* API & Database tidak terekspos.)*

---

## 🤝 Menjadi Kontributor
1. Lakukan **Fork** pada repository ini.
2. Buatlah **branch** untuk tiap fitur/pengembangan `git checkout -b feature/SistemKerenKu`.
3. Simpan perubahan dengan _Conventional Commit_: `git commit -m "feat: Menambah auto-login system"`.
4. Dorong (_push_) kodenya `git push origin feature/SistemKerenKu`.
5. Buka **Pull Request**.

---

<div align="center">
  <p><strong>Lisensi Penggunaan</strong><br>
  Proyek ini berada di bawah jalur pengunaan Akademik (STT Terpadu Nurul Fikri).</p>

  <p><em>Terakhir diperbarui: April 2026 — v1.0.2</em></p>
</div>
