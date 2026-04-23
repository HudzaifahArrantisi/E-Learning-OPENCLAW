const featureCards = [
  { icon: '⚡', cls: 'feat-icon-blue', title: 'Smart Reminder System', desc: 'AI-powered scheduling that learns your routine. Get notified before classes, deadlines, and important events — automatically.' },
  { icon: '✈️', cls: 'feat-icon-tg', title: 'Telegram Integration', desc: 'Reminders delivered directly to Telegram. No app-switching, no missed notifications. Your academic life in your pocket.' },
  { icon: '📊', cls: 'feat-icon-green', title: 'Automated Attendance', desc: 'QR-based check-in synced to dashboards in real time. Faculty gets instant visibility, students get frictionless check-in.' },
  { icon: '📝', cls: 'feat-icon-amber', title: 'Assignment Tracker', desc: 'Every deadline tracked, every submission monitored. Visual timeline of upcoming tasks with urgency indicators.' },
  { icon: '📈', cls: 'feat-icon-purple', title: 'Academic Dashboard', desc: 'Instagram-style feed for learning activities. Grades, attendance, courses — all in one elegant, social interface.' },
  { icon: '🔄', cls: 'feat-icon-red', title: 'Course Sync Engine', desc: 'OpenClaw continuously syncs your course schedules, materials, and assignments. Zero manual input required.' },
]

const howItWorks = [
  { num: '01', title: 'Connect Your Account', desc: 'Sign up with your student credentials and link your Telegram account in under 30 seconds.' },
  { num: '02', title: 'Sync Your Courses', desc: 'OpenClaw automatically imports your schedule, assignments, and course materials.' },
  { num: '03', title: 'Receive Reminders', desc: 'Smart notifications arrive via Telegram before every class, deadline, and event.' },
]

const benefits = [
  { icon: '🎯', title: 'Reduce Missed Deadlines', desc: 'Proactive reminders ensure you never miss an assignment submission or exam date again.', stat: '95% FEWER MISSED DEADLINES' },
  { icon: '🚀', title: 'Boost Productivity', desc: 'Automated tracking eliminates mental overhead. Focus on learning, not remembering.', stat: '3× PRODUCTIVITY IMPROVEMENT' },
  { icon: '🤖', title: 'Smart Academic Assistant', desc: 'OpenClaw works 24/7 behind the scenes — syncing, reminding, reporting. Your invisible academic ally.', stat: 'ALWAYS-ON AUTOMATION' },
]

const roles = [
  { idx: '01', name: 'Mahasiswa',   desc: 'Full access to courses, tasks, and campus social feed.',         access: ['Materi & Tugas', 'Absensi QR', 'Feed Kampus', 'Pembayaran UKT'] },
  { idx: '02', name: 'Dosen',       desc: 'Teaching management with deep class control.',                   access: ['Upload Materi', 'Kelola Nilai', 'Monitor Absensi', 'Chat Mahasiswa'] },
  { idx: '03', name: 'Admin / BAK', desc: 'Institutional administration and financial oversight.',          access: ['Manajemen Akun', 'Pantau Pembayaran', 'Kontrol Akses', 'Laporan Sistem'] },
  { idx: '04', name: 'Orang Tua',   desc: 'Read-only monitoring for student performance.',                  access: ['Nilai & Absensi', 'Status UKT', 'Info Kampus'] },
  { idx: '05', name: 'UKM / Ormawa',desc: 'Campus organization tools and event publishing.',               access: ['Post Kegiatan', 'Feed Filter', 'Kolaborasi'] },
]

const roleGuides = [
  {
    id: 'mahasiswa',
    title: 'Panduan Mahasiswa',
    icon: '🎓',
    color: 'from-blue-500 to-indigo-600',
    steps: [
      { num: '01', title: 'Login & Hubungkan Akun', desc: 'Klik tombol Masuk. Gunakan email nim@nurulfikri.ac.id dengan kata sandi bawaan. Hubungkan akun Telegram Anda untuk notifikasi kelas otomatis.' },
      { num: '02', title: 'Eksplorasi Feed Kampus', desc: 'Di dashboard utama, pantau informasi dari kampus, BEM, atau UKM. Anda dapat memfilter feed khusus dari organisasi tertentu.' },
      { num: '03', title: 'Akses Materi & Kelas', desc: 'Pilih menu E-Learning untuk melihat materi kuliah minggu ini, cek modul, serta melakukan absen menggunakan QR code secara mandiri.' },
      { num: '04', title: 'Kumpulkan Tugas', desc: 'Upload file tugas Anda dalam batas waktu (deadline) yang telah ditentukan. Anda akan mendapat pengingat 24 jam sebelumnya via Telegram.' },
      { num: '05', title: 'Pantau Akademik', desc: 'Cek nilai UTS, UAS, total absensi semester, serta status pembayaran UKT langsung dari portal mahasiswa Anda.' }
    ]
  },
  {
    id: 'orangtua',
    title: 'Panduan Orang Tua',
    icon: '👨‍👩‍👧',
    color: 'from-amber-500 to-orange-600',
    steps: [
      { num: '01', title: 'Akses Portal Orang Tua', desc: 'Login menggunakan nomor induk mahasiswa anak Anda dan password khusus orang tua yang diberikan oleh kampus.' },
      { num: '02', title: 'Pantau Nilai Akademik', desc: 'Lihat ringkasan nilai ujian, Indeks Prestasi (IP) semester terakhir, dan perkembangan akademik anak secara transparan.' },
      { num: '03', title: 'Monitoring Absensi', desc: 'Ketahui rekapitulasi kehadiran anak di perkuliahan, termasuk jika ada teguran atau surat peringatan absensi.' },
      { num: '04', title: 'Status Keuangan', desc: 'Periksa status tagihan, riwayat pembayaran SPP/UKT, dan jadwal pembayaran agar anak dapat mengikuti ujian dengan lancar.' }
    ]
  },
  {
    id: 'dosen',
    title: 'Panduan Dosen',
    icon: '👨‍🏫',
    color: 'from-emerald-500 to-teal-600',
    steps: [
      { num: '01', title: 'Masuk Portal Pengajar', desc: 'Gunakan NIDN/email dosen dan password untuk mengakses panel pengajaran yang terhubung dengan jadwal kampus.' },
      { num: '02', title: 'Kelola Kelas & Absen', desc: 'Tampilkan QR Code di layar kelas. Mahasiswa men-scan, dan sistem OpenClaw langsung mencatat absensi di dashboard Anda.' },
      { num: '03', title: 'Upload Materi & Tugas', desc: 'Unggah file PDF, presentasi, atau berikan penugasan beserta tenggat waktu. Mahasiswa akan langsung ternotifikasi.' },
      { num: '04', title: 'Penilaian Mandiri', desc: 'Beri nilai untuk tugas, kuis, UTS, maupun UAS. Nilai akan otomatis dikalkulasikan ke IPK akhir mahasiswa.' }
    ]
  },
  {
    id: 'ormawa',
    title: 'Panduan UKM / Ormawa',
    icon: '🎭',
    color: 'from-purple-500 to-fuchsia-600',
    steps: [
      { num: '01', title: 'Kelola Akun Organisasi', desc: 'Akses dashboard UKM/Ormawa Anda. Edit profil organisasi untuk mengenalkan kegiatan ke seluruh kampus.' },
      { num: '02', title: 'Buat Postingan Acara', desc: 'Buat post dengan gambar carousel ala Instagram. Tambahkan deskripsi, poster kegiatan, atau informasi pendaftaran.' },
      { num: '03', title: 'Tunggu Validasi Admin', desc: 'Setiap kegiatan yang di-posting akan melewati pengecekan oleh Admin Kemahasiswaan. Statusnya bisa dipantau.' },
      { num: '04', title: 'Terbit ke Seluruh Mahasiswa', desc: 'Setelah disetujui, post akan tampil di dashboard semua mahasiswa STT-NF, meningkatkan visibilitas event Anda.' }
    ]
  },
  {
    id: 'admin',
    title: 'Panduan Admin BAK',
    icon: '🛡️',
    color: 'from-slate-600 to-gray-800',
    steps: [
      { num: '01', title: 'Akses Penuh Sistem', desc: 'Login sebagai SuperAdmin. Anda memiliki kendali penuh atas pengguna, struktur kurikulum, dan kalender akademik.' },
      { num: '02', title: 'Manajemen Pengguna', desc: 'Tambahkan, nonaktifkan, atau atur ulang password untuk akun Mahasiswa, Dosen, Orang Tua, maupun UKM.' },
      { num: '03', title: 'Approval Postingan', desc: 'Tinjau setiap pengajuan pos dari UKM/Ormawa. Setujui agar tampil di feed utama atau tolak jika tidak relevan.' },
      { num: '04', title: 'Manajemen Kurikulum', desc: 'Update data SKS, mata kuliah, dan plotting jadwal perkuliahan ke sistem agar OpenClaw bisa menjalankan otomasi.' }
    ]
  }
]

const semesters = [
  { n: 'SEM 01', credits: 21, courses: 8 },
  { n: 'SEM 02', credits: 21, courses: 8 },
  { n: 'SEM 03', credits: 21, courses: 8 },
  { n: 'SEM 04', credits: 21, courses: 8 },
  { n: 'SEM 05', credits: 21, courses: 7 },
  { n: 'SEM 06', credits: 20, courses: 6 },
  { n: 'SEM 07', credits: 20, courses: 6 },
  { n: 'SEM 08', credits: 4,  courses: 1 },
]

const visiData = {
  statement: 'Pada tahun 2045 menjadi sekolah tinggi yang unggul di Indonesia, berbudaya inovasi, berjiwa teknopreneur, dan berkarakter religius.',
  source: 'Sekolah Tinggi Teknologi Terpadu Nurul Fikri',
  misi: [
    'Menyelenggarakan pendidikan tinggi berkualitas berlandaskan iman dan takwa.',
    'Melaksanakan penelitian inovatif berorientasi teknologi masa depan.',
    'Pengabdian masyarakat dengan teknologi tepat guna.',
    'Membangun lingkungan akademik kondusif dan berbudaya inovasi.',
  ],
}

const platformFeatures = [
  { name: 'OpenClaw Automation Engine',  desc: 'Automated notifications, reminders, and reporting delivered via Telegram. Zero manual intervention required from faculty.' },
  { name: 'QR-based Attendance',         desc: 'Students scan unique session QR codes. Attendance data syncs to faculty dashboards in real time.' },
  { name: 'Role-based Access Control',   desc: "JWT-secured endpoints with middleware validation. Every user sees only what they're authorized to access." },
  { name: 'Academic Social Feed',        desc: 'Campus-wide information channel with filtering by organization, department, or event type.' },
  { name: 'UKT Payment Tracking',        desc: 'Students view invoices, payment history, and outstanding balances. Parents get read-only visibility.' },
  { name: 'Transcript & Grade Archive',  desc: 'Full semester-by-semester academic record accessible to students and viewable by authorized staff.' },
  { name: 'Integrated Chat System',      desc: 'Direct messaging between students, faculty, and administration within the platform ecosystem.' },
  { name: 'Multi-platform Architecture', desc: 'React + Vite frontend, Golang REST backend, JWT auth layer. Built for stability, speed, and extensibility.' },
]

const stats = [
  { n: '5', label: 'Distinct user roles with granular access control' },
  { n: '8', label: 'Semesters of structured curriculum content' },
  { n: '∞', label: 'Automated workflows via OpenClaw engine' },
  { n: '1', label: 'Unified platform for every campus need' },
]

const footerLinks = {
  Platform: [
    { label: 'Kurikulum',        href: '#kurikulum'  },
    { label: 'Visi & Misi',      href: '#visi-misi'  },
    { label: 'Kalender Akademik',href: '#kalender'   },
    { label: 'Masuk',            href: '/'      },
  ],
  Institusi: [
    { label: 'Tentang STT-NF',    href: '#' },
    { label: 'Teknik Informatika',href: '#' },
    { label: 'Sistem Informasi',  href: '#' },
    { label: 'Bisnis Digital',    href: '#' },
  ],
  Perusahaan: [
    { label: 'Tentang Kami', href: '#' },
    { label: 'Karir',        href: '#' },
    { label: 'Blog',         href: '#' },
    { label: 'Kontak',       href: '#' },
  ],
}

/* ── CURRICULUM DATA ── */
const programs = {
  ti: {
    abbr: 'TI', label: 'Teknik Informatika',
    fullName: 'Program Studi Teknik Informatika',
    totalSks: 149,
    courses: [
      { sem: 1, name: 'Kalkulus',                     type: 'Wajib',   sks: 3 },
      { sem: 1, name: 'Fisika Dasar',                  type: 'Wajib',   sks: 3 },
      { sem: 1, name: 'Algoritma & Pemrograman',       type: 'Wajib',   sks: 4 },
      { sem: 1, name: 'Logika Matematika',             type: 'Wajib',   sks: 3 },
      { sem: 1, name: 'Bahasa Indonesia',              type: 'Umum',    sks: 2 },
      { sem: 1, name: 'Pendidikan Agama',              type: 'Umum',    sks: 2 },
      { sem: 1, name: 'Bahasa Inggris I',              type: 'Umum',    sks: 2 },
      { sem: 1, name: 'Pancasila & Kewarganegaraan',   type: 'Umum',    sks: 2 },
      { sem: 2, name: 'Struktur Data',                 type: 'Wajib',   sks: 4 },
      { sem: 2, name: 'Pemrograman Berorientasi Objek',type: 'Wajib',   sks: 4 },
      { sem: 2, name: 'Matematika Diskret',            type: 'Wajib',   sks: 3 },
      { sem: 2, name: 'Basis Data',                    type: 'Wajib',   sks: 3 },
      { sem: 2, name: 'Statistika Dasar',              type: 'Wajib',   sks: 3 },
      { sem: 2, name: 'Bahasa Inggris II',             type: 'Umum',    sks: 2 },
      { sem: 2, name: 'Kewirausahaan',                 type: 'Umum',    sks: 2 },
      { sem: 3, name: 'Rekayasa Perangkat Lunak',      type: 'Wajib',   sks: 3 },
      { sem: 3, name: 'Jaringan Komputer',             type: 'Wajib',   sks: 3 },
      { sem: 3, name: 'Sistem Operasi',                type: 'Wajib',   sks: 3 },
      { sem: 3, name: 'Pemrograman Web',               type: 'Wajib',   sks: 4 },
      { sem: 3, name: 'Analisis & Desain Sistem',      type: 'Wajib',   sks: 3 },
      { sem: 3, name: 'Aljabar Linear',                type: 'Wajib',   sks: 3 },
      { sem: 4, name: 'Arsitektur & Organisasi Komputer', type: 'Wajib', sks: 3 },
      { sem: 4, name: 'Pemrograman Mobile',            type: 'Wajib',   sks: 4 },
      { sem: 4, name: 'Keamanan Siber',                type: 'Wajib',   sks: 3 },
      { sem: 4, name: 'Kecerdasan Buatan',             type: 'Wajib',   sks: 3 },
      { sem: 4, name: 'Manajemen Proyek TI',           type: 'Wajib',   sks: 3 },
      { sem: 4, name: 'Etika Profesi',                 type: 'Umum',    sks: 2 },
      { sem: 5, name: 'Machine Learning',              type: 'Wajib',   sks: 4 },
      { sem: 5, name: 'Cloud Computing',               type: 'Wajib',   sks: 3 },
      { sem: 5, name: 'Pengembangan Aplikasi Enterprise', type: 'Wajib', sks: 4 },
      { sem: 5, name: 'Metodologi Penelitian',         type: 'Wajib',   sks: 3 },
      { sem: 5, name: 'Mata Kuliah Pilihan I',         type: 'Pilihan', sks: 3 },
      { sem: 5, name: 'Mata Kuliah Pilihan II',        type: 'Pilihan', sks: 3 },
      { sem: 6, name: 'Big Data & Analytics',          type: 'Wajib',   sks: 3 },
      { sem: 6, name: 'DevOps & Automation',           type: 'Wajib',   sks: 3 },
      { sem: 6, name: 'Mata Kuliah Pilihan III',       type: 'Pilihan', sks: 3 },
      { sem: 6, name: 'Mata Kuliah Pilihan IV',        type: 'Pilihan', sks: 3 },
      { sem: 6, name: 'Kerja Praktik',                 type: 'Wajib',   sks: 3 },
      { sem: 7, name: 'Seminar Tugas Akhir',           type: 'Wajib',   sks: 2 },
      { sem: 7, name: 'Mata Kuliah Pilihan V',         type: 'Pilihan', sks: 3 },
      { sem: 7, name: 'Mata Kuliah Pilihan VI',        type: 'Pilihan', sks: 3 },
      { sem: 7, name: 'Pengabdian Masyarakat',         type: 'Wajib',   sks: 3 },
      { sem: 8, name: 'Tugas Akhir',                   type: 'Wajib',   sks: 4 },
    ],
  },
  si: {
    abbr: 'SI', label: 'Sistem Informasi',
    fullName: 'Program Studi Sistem Informasi',
    totalSks: 144,
    courses: [
      { sem: 1, name: 'Pengantar Sistem Informasi',    type: 'Wajib',   sks: 3 },
      { sem: 1, name: 'Algoritma & Pemrograman',       type: 'Wajib',   sks: 4 },
      { sem: 1, name: 'Matematika Bisnis',             type: 'Wajib',   sks: 3 },
      { sem: 1, name: 'Bahasa Indonesia',              type: 'Umum',    sks: 2 },
      { sem: 1, name: 'Pendidikan Agama',              type: 'Umum',    sks: 2 },
      { sem: 1, name: 'Bahasa Inggris I',              type: 'Umum',    sks: 2 },
      { sem: 2, name: 'Basis Data',                    type: 'Wajib',   sks: 4 },
      { sem: 2, name: 'Pemrograman Web',               type: 'Wajib',   sks: 4 },
      { sem: 2, name: 'Analisis Proses Bisnis',        type: 'Wajib',   sks: 3 },
      { sem: 2, name: 'Statistika',                    type: 'Wajib',   sks: 3 },
      { sem: 3, name: 'Analisis & Desain Sistem',      type: 'Wajib',   sks: 3 },
      { sem: 3, name: 'ERP & Sistem Bisnis',           type: 'Wajib',   sks: 3 },
      { sem: 3, name: 'Manajemen Data',                type: 'Wajib',   sks: 3 },
      { sem: 4, name: 'Keamanan Sistem Informasi',     type: 'Wajib',   sks: 3 },
      { sem: 4, name: 'Business Intelligence',         type: 'Wajib',   sks: 3 },
      { sem: 4, name: 'Manajemen Proyek SI',           type: 'Wajib',   sks: 3 },
      { sem: 5, name: 'Data Warehouse',                type: 'Wajib',   sks: 3 },
      { sem: 5, name: 'Mata Kuliah Pilihan I',         type: 'Pilihan', sks: 3 },
      { sem: 6, name: 'Kerja Praktik',                 type: 'Wajib',   sks: 3 },
      { sem: 6, name: 'Mata Kuliah Pilihan II',        type: 'Pilihan', sks: 3 },
      { sem: 7, name: 'Seminar Tugas Akhir',           type: 'Wajib',   sks: 2 },
      { sem: 8, name: 'Tugas Akhir',                   type: 'Wajib',   sks: 4 },
    ],
  },
  bd: {
    abbr: 'BD', label: 'Bisnis Digital',
    fullName: 'Program Studi Bisnis Digital',
    totalSks: 144,
    courses: [
      { sem: 1, name: 'Pengantar Bisnis Digital',      type: 'Wajib',   sks: 3 },
      { sem: 1, name: 'Dasar Pemrograman',             type: 'Wajib',   sks: 3 },
      { sem: 1, name: 'Ekonomi Mikro',                 type: 'Wajib',   sks: 3 },
      { sem: 1, name: 'Bahasa Indonesia',              type: 'Umum',    sks: 2 },
      { sem: 2, name: 'Digital Marketing',             type: 'Wajib',   sks: 3 },
      { sem: 2, name: 'E-Commerce',                    type: 'Wajib',   sks: 3 },
      { sem: 2, name: 'Basis Data Bisnis',             type: 'Wajib',   sks: 3 },
      { sem: 3, name: 'Manajemen Platform Digital',    type: 'Wajib',   sks: 3 },
      { sem: 3, name: 'Analitik Bisnis',               type: 'Wajib',   sks: 3 },
      { sem: 4, name: 'Strategi Transformasi Digital', type: 'Wajib',   sks: 3 },
      { sem: 4, name: 'UI/UX Design',                  type: 'Wajib',   sks: 3 },
      { sem: 5, name: 'Startup & Inovasi',             type: 'Wajib',   sks: 3 },
      { sem: 5, name: 'Mata Kuliah Pilihan I',         type: 'Pilihan', sks: 3 },
      { sem: 6, name: 'Kerja Praktik',                 type: 'Wajib',   sks: 3 },
      { sem: 7, name: 'Seminar Tugas Akhir',           type: 'Wajib',   sks: 2 },
      { sem: 8, name: 'Tugas Akhir',                   type: 'Wajib',   sks: 4 },
    ],
  },
}

/* ── VISI-MISI DATA ── */
const institutions = {
  'stt-nf': {
    key: 'stt-nf', abbr: 'STT-NF',
    fullName: 'Sekolah Tinggi Teknologi Terpadu Nurul Fikri',
    visi: 'Pada tahun 2045 menjadi sekolah tinggi yang unggul di Indonesia, berbudaya inovasi, berjiwa teknopreneur, dan berkarakter religius.',
    misi: [
      'Menyelenggarakan pendidikan tinggi berkualitas berlandaskan iman dan takwa.',
      'Melaksanakan penelitian inovatif berorientasi teknologi masa depan.',
      'Pengabdian masyarakat dengan teknologi tepat guna.',
      'Membangun lingkungan akademik kondusif dan berbudaya inovasi.',
    ],
    tujuan: [
      'Menghasilkan sarjana kompeten, profesional, dan berakhlak mulia.',
      'Menghasilkan karya ilmiah inovatif dan terbuka (open source & open access).',
      'Menerapkan IPTEK tepat guna bagi masyarakat.',
      'Membangun kultur akademik inovatif dan kompetitif.',
    ],
  },
  ti: {
    key: 'ti', abbr: 'TI',
    fullName: 'Program Studi Teknik Informatika',
    visi: 'Pada tahun 2045 menjadi program studi teknik informatika yang unggul, berbudaya inovasi, dan berkarakter religius.',
    misi: [
      'Menyelenggarakan pendidikan teknik informatika berkualitas.',
      'Melaksanakan penelitian berorientasi teknologi masa depan.',
      'Pengabdian masyarakat berbasis teknologi tepat guna.',
      'Membangun budaya akademik inovatif dan mandiri.',
    ],
    tujuan: [
      'Menghasilkan sarjana TI profesional dan berakhlak mulia.',
      'Melahirkan karya ilmiah terbuka & inovatif di bidang TI.',
      'Menerapkan teknologi tepat guna bagi masyarakat.',
    ],
  },
  si: {
    key: 'si', abbr: 'SI',
    fullName: 'Program Studi Sistem Informasi',
    visi: 'Pada tahun 2045 menjadi program studi sistem informasi yang unggul, inovatif, dan religius.',
    misi: [
      'Pendidikan berkualitas bidang Sistem Informasi.',
      'Penelitian inovatif dan berorientasi masa depan.',
      'Pengabdian masyarakat berbasis teknologi tepat guna.',
      'Membangun budaya akademik inovatif dan mandiri.',
    ],
    tujuan: [
      'Lulusan kompeten & profesional di bidang Sistem Informasi.',
      'Karya ilmiah terbuka dan inovatif.',
      'Implementasi teknologi tepat guna bagi masyarakat.',
    ],
  },
  bd: {
    key: 'bd', abbr: 'BD',
    fullName: 'Program Studi Bisnis Digital',
    visi: 'Pada tahun 2045 menjadi program studi bisnis digital yang unggul, inovatif, dan berkarakter religius.',
    misi: [
      'Pendidikan berkualitas bidang bisnis digital.',
      'Penelitian inovatif berorientasi masa depan.',
      'Pengabdian masyarakat berbasis teknologi bisnis.',
      'Membangun budaya akademik inovatif.',
    ],
    tujuan: [
      'Lulusan profesional & berakhlak mulia.',
      'Karya ilmiah di bidang bisnis digital.',
      'Penerapan teknologi tepat guna untuk masyarakat.',
    ],
  },
}

/* ── CALENDAR DATA ── */
const academicCalendar = [
  { date: '2025-08-13',                        event: 'Dies Natalis STT NF',                              type: 'event'     },
  { date: '2025-09-08', endDate: '2025-09-13', event: 'Bimbingan Akademik (PA) 1',                       type: 'academic'  },
  { date: '2025-09-15', endDate: '2025-09-20', event: 'Orientasi Akademik Mahasiswa Baru 2025',          type: 'important' },
  { date: '2025-09-15', endDate: '2025-09-20', event: 'Isi KRS Mahasiswa Semester Ganjil',               type: 'academic'  },
  { date: '2025-09-15', endDate: '2025-09-30', event: 'Pengajuan Cuti Kuliah',                           type: 'academic'  },
  { date: '2025-09-22',                        event: 'Kuliah Perdana Semester Ganjil',                   type: 'important' },
  { date: '2025-09-22', endDate: '2025-11-08', event: 'Perkuliahan Pekan Ke-1 s.d Ke-7',                type: 'academic'  },
  { date: '2025-10-07',                        event: 'Kuliah Umum',                                      type: 'event'     },
  { date: '2025-10-15',                        event: 'Pengumuman Dosen Pembimbing Tugas Akhir',          type: 'academic'  },
  { date: '2025-11-10', endDate: '2025-11-15', event: 'Pelaksanaan UTS dan Ujian Tugas Akhir',           type: 'exam'      },
  { date: '2026-01-12', endDate: '2026-01-17', event: 'Pelaksanaan UAS',                                  type: 'exam'      },
  { date: '2026-01-19', endDate: '2026-01-24', event: 'Pelaksanaan Sidang TA Ganjil',                    type: 'exam'      },
  { date: '2026-02-06',                        event: 'Pengumuman Yudisium',                              type: 'important' },
]

const calendarMonths = [
  { name: 'Agustus 2025',   year: 2025, month: 7  },
  { name: 'September 2025', year: 2025, month: 8  },
  { name: 'Oktober 2025',   year: 2025, month: 9  },
  { name: 'November 2025',  year: 2025, month: 10 },
  { name: 'Desember 2025',  year: 2025, month: 11 },
  { name: 'Januari 2026',   year: 2026, month: 0  },
  { name: 'Februari 2026',  year: 2026, month: 1  },
]

const EVENT_COLORS = { important: '#4B73FF', exam: '#F97316', event: '#A78BFA', academic: '#8BA4FF' }
const EVENT_LABELS = { important: 'Penting', exam: 'Ujian', event: 'Acara', academic: 'Akademik' }

/* ── CALENDAR HELPER ── */
function getEventsForDate(date) {
  return academicCalendar.filter(ev => {
    const start = new Date(ev.date)
    if (ev.endDate) return date >= start && date <= new Date(ev.endDate)
    return date.toDateString() === start.toDateString()
  })
}
function fmtDate(str) {
  return new Date(str).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

/* ── DASHBOARD PREVIEW DATA ── */
const dashboardStories = [
  { emoji: '📐', label: 'Kalkulus' },
  { emoji: '💻', label: 'Algo' },
  { emoji: '🌐', label: 'Web Dev' },
  { emoji: '📱', label: 'Mobile' },
  { emoji: '🔐', label: 'Security' },
  { emoji: '☁️', label: 'Cloud' },
]

const dashboardFeed = [
  { source: 'OpenClaw Bot', time: '2m ago', avatar: '🤖', bg: 'linear-gradient(135deg, #4B73FF, #A78BFA)', tag: 'REMINDER', tagBg: 'rgba(75,115,255,0.15)', tagColor: '#8BA4FF', text: '📚 Reminder: "Algoritma & Pemrograman" starts in 30 minutes. Room B-204. Don\'t forget your laptop!' },
  { source: 'Telegram Alert', time: '15m ago', avatar: '✈️', bg: 'linear-gradient(135deg, #26A5E4, #1b9ad6)', tag: 'DEADLINE', tagBg: 'rgba(251,191,36,0.15)', tagColor: '#FBBF24', text: '⏰ Assignment "Struktur Data — Binary Tree Implementation" is due tomorrow at 23:59. Submit via portal.' },
  { source: 'Attendance', time: '1h ago', avatar: '✅', bg: 'linear-gradient(135deg, #4ADE80, #16a34a)', tag: 'CONFIRMED', tagBg: 'rgba(74,222,128,0.15)', tagColor: '#4ADE80', text: '✓ Attendance recorded for "Basis Data" — Session 12/14. Your attendance rate: 92%.' },
]

export {
  featureCards,
  howItWorks,
  benefits,
  roles,
  semesters,
  visiData,
  platformFeatures,
  stats,
  footerLinks,
  programs,
  institutions,
  academicCalendar,
  calendarMonths,
  EVENT_COLORS,
  EVENT_LABELS,
  dashboardStories,
  dashboardFeed,
  roleGuides,
  getEventsForDate,
  fmtDate
}
