# Repository Guidelines

## Project Structure & Module Organization

This repository contains two applications:

- `frontend/`: React 19 and Vite UI. Put routed views in `src/pages/`, reusable UI in `src/components/`, API clients in `src/services/`, shared hooks in `src/hooks/`, utilities in `src/utils/`, and static images in `src/assets/`.
- `backend/`: Go API built with Gin, GORM, PostgreSQL, and WebSockets. Keep request logic in `controllers/` and `handlers/`, schemas in `models/`, middleware in `middleware/`, route registration in `routes/`, database setup in `config/`, and Telegram automation in `openclaw/`.

User-generated files belong in `backend/uploads/` and must not be committed.

## Build, Test, and Development Commands

Run frontend commands from `frontend/`:

- `npm install`: install pinned dependencies.
- `npm run dev`: start Vite on the local network.
- `npm run lint`: run ESLint across JavaScript and JSX.
- `npm run build`: create the production bundle in `dist/`.
- `npm run preview`: serve the production bundle locally.

Run backend commands from `backend/`:

- `go mod tidy`: synchronize Go dependencies.
- `go run main.go`: start the API and embedded OpenClaw service on port `8080`.
- `go build -o server main.go`: build the production executable.
- `go test ./controllers ./handlers ./routes`: run package-targeted Go tests.

## Coding Style & Naming Conventions

Use `gofmt` for Go files. Keep Go package names lowercase, exported identifiers in `PascalCase`, and local identifiers in `camelCase`. For React, follow the existing two-space indentation and extensionless ES module imports. Name components and page files in `PascalCase.jsx`; use `camelCase` for hooks, utilities, and service methods. Run `npm run lint` before submitting frontend changes.

## Testing Guidelines

Use Go's standard `testing` package and name files `*_test.go`. Prefer focused package tests because utility files in the backend root can interfere with repository-wide test builds. The frontend currently has no automated test runner; validate UI changes with `npm run lint`, `npm run build`, and manual browser checks. Include screenshots for visible changes.

## Commit & Pull Request Guidelines

Follow Conventional Commits, for example `feat: add attendance export` or `fix: persist deleted chat messages`. Use focused branches such as `feature/attendance-export`. Pull requests should explain the behavior change, list validation commands, link relevant issues, and include screenshots for UI work.

## Security & Configuration

Keep credentials in `backend/.env`; never commit `.env`, database dumps, tokens, keys, or uploaded media. Preserve RBAC checks and validate authorization server-side when adding routes.

## Landing Page Design System

Halaman pendaratan ([LandingPage.jsx](file:///c:/laragon/www/NF-Student-HUB/frontend/src/pages/LandingPage.jsx)) menggunakan sistem desain modern, minimalis, dan dinamis yang berfokus pada kejelasan informasi akademik serta interaksi mikro yang memikat pengguna (*user engagement*).

### 1. Sistem Warna & Token Palette (`lp-*`)
Warna dikonfigurasi melalui tema kustom di [tailwind.config.js](file:///c:/laragon/www/NF-Student-HUB/frontend/tailwind.config.js):
- **Warna Latar & Permukaan (Background & Surfaces):**
  - `lp-bg` (`#FFFFFF`): Warna putih bersih sebagai basis halaman untuk kenyamanan membaca.
  - `lp-surface` (`#F1F5F9`): Latar belakang sekunder abu-abu lembut untuk membedakan antar seksi secara halus.
  - `lp-elevated` (`#F8FAFC`): Warna kontainer ringan untuk meningkatkan kedalaman visual elemen.
  - **Grid Textur:** Garis-garis grid sistematis berukuran `64px` (`rgba(0,0,0,0.08)`) dengan gradien radial memudar memberikan nuansa bertema "blueprint/teknis".
- **Warna Teks & Tipografi (Typography):**
  - `lp-text` (`#0F172A` / Slate 900): Warna gelap pekat untuk teks utama guna menjaga kontras dan keterbacaan tinggi.
  - `lp-text2` (`#475569` / Slate 600): Warna abu-abu medium untuk deskripsi dan paragraf panjang.
  - `lp-text3` (`#94A3B8` / Slate 400): Warna abu-abu terang untuk penomoran seksi, label kecil, dan penanda waktu.
- **Warna Aksen & Fungsional (Accents & Functional Colors):**
  - `lp-accent` (`#4B73FF`): Warna biru cerah utama (*Royal Blue*) untuk menunjukkan elemen aktif, tautan penting, dan titik fokus utama.
  - `lp-accentS` (`rgba(75,115,255,0.1)`): Varian aksen transparan untuk efek hover dan latar belakang ikon.
  - `lp-atext` (`#3B5EEB`): Biru gelap untuk teks aksen agar ramah aksesibilitas kontras.
  - `lp-tg` (`#26A5E4`): Biru khas Telegram untuk menyorot integrasi notifikasi bot.
  - `lp-green` (`#16A34A`), `lp-amber` (`#D97706`), `lp-red` (`#DC2626`): Warna fungsional untuk status sukses (kehadiran), peringatan (tenggat waktu tugas), dan peringatan kritis.

### 2. Tata Letak & Penempatan UI/UX (Layout & UX Principles)
- **Floating Header/Navbar:**
  - Navigasi dikemas dalam bentuk kapsul melayang (*pill-shape*) dengan latar belakang semi-transparan (`bg-white/80`) dan efek blur kaca (`backdrop-blur-md`). Penempatan tombol aksi utama "Masuk" yang kontras diletakkan di sebelah kanan untuk memudahkan akses langsung pengguna.
- **Minimalist & Bold Hero Section:**
  - Judul halaman menggunakan font ukuran dinamis (*clamp-based font sizing*) yang responsif. Ritme visual diperkuat dengan mencampur teks tebal lurus (`Student Hub`) dan teks miring bertransparansi tinggi (`Openclaw Reminder`). CTA (Call-to-Action) utama ditempatkan sejajar di bawah deskripsi singkat.
- **Scroll-Driven Mascot Animation (OpenClaw Parallax):**
  - Menggunakan teknik interaksi mikro yang menyenangkan (*delighters*). Tiga maskot kepiting merah OpenClaw diprogram untuk bertransformasi (`will-change-transform`), memutar, dan membesar/mengecil secara dinamis berdasarkan posisi scroll pengguna. Maskot ini berpindah posisi dari kanan ke kiri layar untuk memandu mata pengguna ke bagian informasi berikutnya.
- **Seksi Berindeks (Numbered Visual Breakpoints):**
  - Setiap bagian konten baru dipisahkan dengan garis tipis dan label penomoran monospaced (contoh: `01 Role Guides`), yang meningkatkan keterbacaan cepat (*scannability*).
- **Struktur Kartu & Grid Interaktif:**
  - Bagian panduan peran (*Role Guides*) memisahkan daftar selektor vertikal di sisi kiri dan panel instruksi detail di sisi kanan dengan efek bayangan halus (*shadow*).
  - Bagian "Core Features", "Kurikulum", dan "Stats" disusun dalam layout grid responsif yang menyesuaikan ukuran dari 1 kolom pada perangkat seluler hingga 4 kolom pada layar desktop besar.
- **Visualisasi Simulator Terintegrasi:**
  - Fitur menyertakan mockup terminal CLI untuk *backend automation* (OpenClaw) dan visualisasi aplikasi Telegram Chat untuk menggambarkan cara kerja bot notifikasi secara langsung tanpa membingungkan pengguna non-teknis.

