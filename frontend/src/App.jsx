// src/App.jsx
import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import LandingPage from "./pages/LandingPage";

// IMPORT SEMUA PAGES
import Login from './pages/Auth/Login'
import Register from './pages/Auth/Register'

// Halaman Baru - Public
import VisiMisiPage from './pages/Public/VisiMisiPage'
import CurriculumPage from './pages/Public/CurriculumPage'
import AcademicCalendarPage from './pages/Public/AcademicCalendarPage'

// Mahasiswa
import DashboardMahasiswa from './pages/Mahasiswa/DashboardMahasiswa'
import ProfileMahasiswa from './pages/Mahasiswa/ProfileMahasiswa'
import MatkulMahasiswa from './pages/Mahasiswa/MatkulMahasiswa'
import PembayaranUKT from './pages/Mahasiswa/PembayaranUKT'
import InvoiceDetail from './pages/Mahasiswa/InvoiceDetail'
import ScanAbsensi from './pages/Mahasiswa/ScanAbsensi'
import TranskripNilai from './pages/Mahasiswa/TranskripNilai'
import PesanMahasiswa from './pages/Mahasiswa/PesanMahasiswa'
import CariInvoice from './pages/Mahasiswa/CariInvoice'
import TugasMahasiswa from './pages/Mahasiswa/TugasMahasiswa'

// Komponen Baru untuk Mahasiswa - Sistem Materi & Tugas
import DetailMatkul from './pages/Mahasiswa/DetailMatkul'
import DetailPertemuanMateri from './pages/Mahasiswa/DetailPertemuanMateri'
import DetailPertemuanTugas from './pages/Mahasiswa/DetailPertemuanTugas'

// Dosen
import DashboardDosen from './pages/Dosen/DashboardDosen'
import CourseDosen from './pages/Dosen/CourseDosen'
import AbsensiDosen from './pages/Dosen/AbsensiDosen'
import PenilaianDosen from './pages/Dosen/PenilaianDosen'
import PesanDosen from './pages/Dosen/PesanDosen'

// Komponen Baru untuk Dosen - Sistem Materi & Tugas
import KelolaMatkulDosen from './pages/Dosen/KelolaMatkulDosen'
import DetailPertemuanDosen from './pages/Dosen/DetailPertemuanDosen'

// Admin
import DashboardAdmin from './pages/Admin/DashboardAdmin'
import PostingPemberitahuan from './pages/Admin/PostingPemberitahuan'
import PemantauanUKT from './pages/Admin/PemantauanUKT'
import SettingProfileAdmin from './pages/Admin/SettingProfileAdmin'
import AkunAdmin from './pages/Admin/AkunAdmin'

// Orang Tua
import DashboardOrtu from './pages/Ortu/DashboardOrtu'
import PantauKehadiran from './pages/Ortu/PantauKehadiran'
import PembayaranOrtu from './pages/Ortu/PembayaranOrtu'

// UKM
import DashboardUKM from './pages/UKM/DashboardUKM'
import PostingUKM from './pages/UKM/PostingUKM'
import AkunUKM from './pages/UKM/AkunUKM'
import SettingProfileUKM from './pages/UKM/SettingProfileUKM'

// ORMAWA
import DashboardOrmawa from './pages/Ormawa/DashboardOrmawa'
import PostingOrmawa from './pages/Ormawa/PostingOrmawa'
import AkunOrmawa from './pages/Ormawa/AkunOrmawa'
import SettingProfileOrmawa from './pages/Ormawa/SettingProfileOrmawa'

// PUBLIC
import ProfilePublic from './pages/Public/ProfilePublic'

// IMPORT KOMPONEN UTILITAS
import useAuth from "./hooks/useAuth"
import ProtectedRoute from './components/ProtectedRoute'
import RoleRedirect from './components/RoleRedirect'
import NotFound from './pages/NotFound';
import MainLayout from "./components/MainLayout";


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 menit
      cacheTime: 10 * 60 * 1000, // 10 menit
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthWrapper />
      </Router>
    </QueryClientProvider>
  )
}

function AuthWrapper() {
  const { user } = useAuth()

  return (
    <div className="App">
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<LandingPage />} />
        
        {/* Halaman Baru - Public */}
        <Route path="/visi-misi" element={<VisiMisiPage />} />
        <Route path="/kurikulum" element={<CurriculumPage />} />
        <Route path="/kalender-akademik" element={<AcademicCalendarPage />} />

        {/* --- MAHASISWA --- */}
        <Route path="/mahasiswa" element={<ProtectedRoute allowedRoles={['mahasiswa']}><DashboardMahasiswa /></ProtectedRoute>} />
        <Route path="/mahasiswa/profile" element={<ProtectedRoute allowedRoles={['mahasiswa']}><ProfileMahasiswa /></ProtectedRoute>} />
        <Route path="/mahasiswa/matkul" element={<ProtectedRoute allowedRoles={['mahasiswa']}><MatkulMahasiswa /></ProtectedRoute>} />
        <Route path="/mahasiswa/pembayaran-ukt" element={<ProtectedRoute allowedRoles={['mahasiswa']}><PembayaranUKT /></ProtectedRoute>} />
        <Route path="/mahasiswa/invoice/:uuid" element={<ProtectedRoute allowedRoles={['mahasiswa']}><InvoiceDetail /></ProtectedRoute>} />
        <Route path="/mahasiswa/scan-absensi" element={<ProtectedRoute allowedRoles={['mahasiswa']}><ScanAbsensi /></ProtectedRoute>} />
        <Route path="/mahasiswa/transkrip-nilai" element={<ProtectedRoute allowedRoles={['mahasiswa']}><TranskripNilai /></ProtectedRoute>} />
        <Route path="/mahasiswa/pesan" element={<ProtectedRoute allowedRoles={['mahasiswa']}><PesanMahasiswa /></ProtectedRoute>} />
        <Route path="/mahasiswa/cari-invoice" element={<ProtectedRoute allowedRoles={['mahasiswa']}><CariInvoice /></ProtectedRoute>} />
        <Route path="/mahasiswa/tugas" element={<ProtectedRoute allowedRoles={['mahasiswa']}><TugasMahasiswa /></ProtectedRoute>} />

        {/* ROUTE BARU UNTUK SISTEM MATERI & TUGAS - MAHASISWA */}
        <Route path="/mahasiswa/matkul/:courseId" element={<ProtectedRoute allowedRoles={['mahasiswa']}><DetailMatkul /></ProtectedRoute>} />
        <Route path="/mahasiswa/matkul/:courseId/pertemuan/:pertemuan/materi" element={<ProtectedRoute allowedRoles={['mahasiswa']}><DetailPertemuanMateri /></ProtectedRoute>} />
        <Route path="/mahasiswa/matkul/:courseId/pertemuan/:pertemuan/tugas" element={<ProtectedRoute allowedRoles={['mahasiswa']}><DetailPertemuanTugas /></ProtectedRoute>} />

        {/* --- DOSEN --- */}
        <Route path="/dosen" element={<ProtectedRoute allowedRoles={['dosen']}><DashboardDosen /></ProtectedRoute>} />
        <Route path="/dosen/course" element={<ProtectedRoute allowedRoles={['dosen']}><CourseDosen /></ProtectedRoute>} />
        <Route path="/dosen/absensi" element={<ProtectedRoute allowedRoles={['dosen']}><AbsensiDosen /></ProtectedRoute>} />
        <Route path="/dosen/penilaian" element={<ProtectedRoute allowedRoles={['dosen']}><PenilaianDosen /></ProtectedRoute>} />
        <Route path="/dosen/pesan" element={<ProtectedRoute allowedRoles={['dosen']}><PesanDosen /></ProtectedRoute>} />

        {/* ROUTE BARU UNTUK SISTEM MATERI & TUGAS - DOSEN */}
        <Route path="/dosen/matkul/:courseId" element={<ProtectedRoute allowedRoles={['dosen']}><KelolaMatkulDosen /></ProtectedRoute>} />
        <Route path="/dosen/matkul/:courseId/pertemuan/:pertemuan" element={<ProtectedRoute allowedRoles={['dosen']}><DetailPertemuanDosen /></ProtectedRoute>} />
        <Route path="/dosen/penilaian/:courseId" element={<ProtectedRoute allowedRoles={['dosen']}><PenilaianDosen /></ProtectedRoute>} />

        {/* --- ADMIN --- */}
        <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><DashboardAdmin /></ProtectedRoute>} />
        <Route path="/admin/posting-pemberitahuan" element={<ProtectedRoute allowedRoles={['admin']}><PostingPemberitahuan /></ProtectedRoute>} />
        <Route path="/admin/pemantauan-ukt" element={<ProtectedRoute allowedRoles={['admin']}><PemantauanUKT /></ProtectedRoute>} />
        <Route path="/admin/setting-profile" element={<ProtectedRoute allowedRoles={['admin']}><SettingProfileAdmin /></ProtectedRoute>} />
        <Route path="/admin/akun" element={<ProtectedRoute allowedRoles={['admin']}><AkunAdmin /></ProtectedRoute>} />

        {/* --- ORANG TUA --- */}
        <Route path="/ortu" element={<ProtectedRoute allowedRoles={['orangtua']}><DashboardOrtu /></ProtectedRoute>} />
        <Route path="/ortu/pantau-kehadiran" element={<ProtectedRoute allowedRoles={['orangtua']}><PantauKehadiran /></ProtectedRoute>} />
        <Route path="/ortu/pembayaran-ukt" element={<ProtectedRoute allowedRoles={['orangtua']}><PembayaranOrtu /></ProtectedRoute>} />

        {/* --- UKM --- */}
        <Route path="/ukm" element={<ProtectedRoute allowedRoles={['ukm']}><DashboardUKM /></ProtectedRoute>} />
        <Route path="/ukm/posting" element={<ProtectedRoute allowedRoles={['ukm']}><PostingUKM /></ProtectedRoute>} />
        <Route path="/ukm/akun" element={<ProtectedRoute allowedRoles={['ukm']}><AkunUKM /></ProtectedRoute>} />
        <Route path="/ukm/setting-profile" element={<ProtectedRoute allowedRoles={['ukm']}><SettingProfileUKM /></ProtectedRoute>} />

        {/* --- ORMAWA --- */}
        <Route path="/ormawa" element={<ProtectedRoute allowedRoles={['ormawa']}><DashboardOrmawa /></ProtectedRoute>} />
        <Route path="/ormawa/posting" element={<ProtectedRoute allowedRoles={['ormawa']}><PostingOrmawa /></ProtectedRoute>} />
        <Route path="/ormawa/akun" element={<ProtectedRoute allowedRoles={['ormawa']}><AkunOrmawa /></ProtectedRoute>} />
        <Route path="/ormawa/setting-profile" element={<ProtectedRoute allowedRoles={['ormawa']}><SettingProfileOrmawa /></ProtectedRoute>} />

        {/* --- PUBLIC PROFILE --- */}
        <Route path="/profile/:role/:username" element={<ProfilePublic />} />
        <Route path="*" element={<NotFound />} />

      </Routes>
    </div>
  )
}

export default App