# ðŸ“¸ Panduan Screenshot

File ini berisi panduan untuk mengambil dan menyimpan screenshot aplikasi STUDENT HUB.

## ðŸ“ Struktur Folder
```
docs/
â”œâ”€â”€ images/
â”‚   â”œâ”€â”€ auth/
â”‚   â”‚   â”œâ”€â”€ login.png
â”‚   â”‚   â””â”€â”€ register.png
â”‚   â”œâ”€â”€ mahasiswa/
â”‚   â”‚   â”œâ”€â”€ dashboard.png
â”‚   â”‚   â”œâ”€â”€ courses.png
â”‚   â”‚   â””â”€â”€ attendance.png
â”‚   â”œâ”€â”€ dosen/
â”‚   â”‚   â”œâ”€â”€ dashboard.png
â”‚   â”‚   â”œâ”€â”€ upload-materi.png
â”‚   â”‚   â””â”€â”€ grade-students.png
â”‚   â”œâ”€â”€ admin/
â”‚   â”‚   â”œâ”€â”€ dashboard.png
â”‚   â”‚   â””â”€â”€ ukt-monitoring.png
â”‚   â”œâ”€â”€ chat/
â”‚   â”‚   â””â”€â”€ chat-interface.png
â”‚   â””â”€â”€ common/
â”‚       â”œâ”€â”€ landing-page.png
â”‚       â””â”€â”€ navbar.png
â””â”€â”€ SCREENSHOTS.md (file ini)
```

## ðŸ“· Halaman yang Perlu Di-screenshot

### 1. Landing Page
- Nama file: `common/landing-page.png`
- Deskripsi: Tampilan awal aplikasi sebelum login
- Ukuran: 1920x1080 (landscape recommended)

### 2. Authentication
- Login: `auth/login.png`
- Register: `auth/register.png`
- Deskripsi: Halaman login dan register untuk semua role

### 3. Mahasiswa Dashboard
- Dashboard: `mahasiswa/dashboard.png` - Ringkasan nilai, kehadiran, pembayaran
- Courses: `mahasiswa/courses.png` - Daftar mata kuliah
- Attendance: `mahasiswa/attendance.png` - History absensi & scan QR

### 4. Dosen Dashboard
- Dashboard: `dosen/dashboard.png` - Ringkasan kelas & mahasiswa
- Upload Materi: `dosen/upload-materi.png` - Interface upload materi & tugas
- Grade Students: `dosen/grade-students.png` - Input nilai mahasiswa

### 5. Admin Dashboard
- Dashboard: `admin/dashboard.png` - Overview sistem
- UKT Monitoring: `admin/ukt-monitoring.png` - Monitoring pembayaran

### 6. Chat & Komunikasi
- Chat Interface: `chat/chat-interface.png` - Tampilan WebSocket real-time chat

### 7. Common
- Navbar: `common/navbar.png` - Navigation bar dengan role indicator
- Feed/Posts: `common/feed.png` - Timeline posting UKM/ORMAWA

## ðŸŽ¨ Rekomendasi
- **Resolusi**: 1920x1080 (atau crop ke section penting)
- **Format**: PNG (lebih baik untuk screenshot)
- **Brightness**: Pastikan cukup terang & readable
- **Data Dummy**: Gunakan data dummy/sample untuk privacy
- **Anonymize**: Ganti nama real dengan placeholders jika perlu

## ðŸš€ Cara Mengambil Screenshot

### Windows
1. **Full Screen**: `Print Screen` â†’ paste ke editor
2. **Active Window**: `Alt + Print Screen` â†’ paste
3. **Region**: `Shift + S` (Windows 11) atau gunakan Snipping Tool
4. **Tool**: Gunakan ShareX, Lightshot, atau built-in Snipping Tool

### Langkah-Langkah
1. Jalankan aplikasi di `http://localhost:5173`
2. Buka halaman yang ingin di-screenshot
3. Ambil screenshot dengan tool pilihan Anda
4. Save ke folder sesuai struktur di atas
5. Crop jika terlalu besar
6. Compress dengan tools seperti TinyPNG jika diperlukan

---

Setelah semua screenshot siap, referensikan di README.md dalam section **Screenshots** ðŸ“¸.
