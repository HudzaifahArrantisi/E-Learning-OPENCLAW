// src/App.jsx
import React, { Suspense, lazy } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'

const LandingPage = lazy(() => import('./pages/LandingPage'))
const VisiMisiPage = lazy(() => import('./pages/Public/VisiMisiPage'))
const CurriculumPage = lazy(() => import('./pages/Public/CurriculumPage'))
const AcademicCalendarPage = lazy(() => import('./pages/Public/AcademicCalendarPage'))

const DashboardMahasiswa = lazy(() => import('./pages/Mahasiswa/DashboardMahasiswa'))
const ProfileMahasiswa = lazy(() => import('./pages/Mahasiswa/ProfileMahasiswa'))
const MatkulMahasiswa = lazy(() => import('./pages/Mahasiswa/MatkulMahasiswa'))
const PembayaranUKT = lazy(() => import('./pages/Mahasiswa/PembayaranUKT'))
const InvoiceDetail = lazy(() => import('./pages/Mahasiswa/InvoiceDetail'))
const ScanAbsensi = lazy(() => import('./pages/Mahasiswa/ScanAbsensi'))
const TranskripNilai = lazy(() => import('./pages/Mahasiswa/TranskripNilai'))
const PesanMahasiswa = lazy(() => import('./pages/Mahasiswa/PesanMahasiswa'))
const CariInvoice = lazy(() => import('./pages/Mahasiswa/CariInvoice'))
const TugasMahasiswa = lazy(() => import('./pages/Mahasiswa/TugasMahasiswa'))
const MateriMahasiswa = lazy(() => import('./pages/Mahasiswa/MateriMahasiswa'))
const DetailMatkul = lazy(() => import('./pages/Mahasiswa/DetailMatkul'))
const DetailPertemuanMateri = lazy(() => import('./pages/Mahasiswa/DetailPertemuanMateri'))
const DetailPertemuanTugas = lazy(() => import('./pages/Mahasiswa/DetailPertemuanTugas'))

const DashboardDosen = lazy(() => import('./pages/Dosen/DashboardDosen'))
const CourseDosen = lazy(() => import('./pages/Dosen/CourseDosen'))
const AbsensiDosen = lazy(() => import('./pages/Dosen/AbsensiDosen'))
const PenilaianDosen = lazy(() => import('./pages/Dosen/PenilaianDosen'))
const PesanDosen = lazy(() => import('./pages/Dosen/PesanDosen'))
const KelolaMatkulDosen = lazy(() => import('./pages/Dosen/KelolaMatkulDosen'))
const DetailPertemuanDosen = lazy(() => import('./pages/Dosen/DetailPertemuanDosen'))
const ManageMatkulSuperDosen = lazy(() => import('./pages/Dosen/ManageMatkulSuperDosen'))

const DashboardAdmin = lazy(() => import('./pages/Admin/DashboardAdmin'))
const PostingPemberitahuan = lazy(() => import('./pages/Admin/PostingPemberitahuan'))
const PemantauanUKT = lazy(() => import('./pages/Admin/PemantauanUKT'))
const SettingProfileAdmin = lazy(() => import('./pages/Admin/SettingProfileAdmin'))
const AkunAdmin = lazy(() => import('./pages/Admin/AkunAdmin'))
const PesanAdmin = lazy(() => import('./pages/Admin/pesanAdmin'))

const DashboardOrtu = lazy(() => import('./pages/Ortu/DashboardOrtu'))
const PantauKehadiran = lazy(() => import('./pages/Ortu/PantauKehadiran'))
const PembayaranOrtu = lazy(() => import('./pages/Ortu/PembayaranOrtu'))

const DashboardUKM = lazy(() => import('./pages/UKM/DashboardUKM'))
const PostingUKM = lazy(() => import('./pages/UKM/PostingUKM'))
const AkunUKM = lazy(() => import('./pages/UKM/AkunUKM'))
const SettingProfileUKM = lazy(() => import('./pages/UKM/SettingProfileUKM'))

const DashboardOrmawa = lazy(() => import('./pages/Ormawa/DashboardOrmawa'))
const PostingOrmawa = lazy(() => import('./pages/Ormawa/PostingOrmawa'))
const AkunOrmawa = lazy(() => import('./pages/Ormawa/AkunOrmawa'))
const SettingProfileOrmawa = lazy(() => import('./pages/Ormawa/SettingProfileOrmawa'))

const ProfilePublic = lazy(() => import('./pages/Public/ProfilePublic'))
const NotFound = lazy(() => import('./pages/NotFound'))

import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider } from './hooks/useAuth'

import queryClient from './lib/queryClient'

import Loading from './components/Loading'

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
        <div className="App">
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/" element={<LandingPage />} />

              <Route path="/visi-misi" element={<VisiMisiPage />} />
              <Route path="/kurikulum" element={<CurriculumPage />} />
              <Route path="/kalender-akademik" element={<AcademicCalendarPage />} />

              <Route path="/mahasiswa" element={<ProtectedRoute allowedRoles={['mahasiswa']}><DashboardMahasiswa /></ProtectedRoute>} />
              <Route path="/mahasiswa/profile" element={<ProtectedRoute allowedRoles={['mahasiswa']}><ProfileMahasiswa /></ProtectedRoute>} />
              <Route path="/mahasiswa/matkul" element={<ProtectedRoute allowedRoles={['mahasiswa']}><MatkulMahasiswa /></ProtectedRoute>} />
              <Route path="/mahasiswa/pembayaran-ukt" element={<ProtectedRoute allowedRoles={['mahasiswa']}><PembayaranUKT /></ProtectedRoute>} />
              <Route path="/mahasiswa/invoice/:uuid" element={<ProtectedRoute allowedRoles={['mahasiswa']}><InvoiceDetail /></ProtectedRoute>} />
              <Route path="/mahasiswa/scan-absensi" element={<ProtectedRoute allowedRoles={['mahasiswa']}><ScanAbsensi /></ProtectedRoute>} />
              <Route path="/mahasiswa/transkrip-nilai" element={<ProtectedRoute allowedRoles={['mahasiswa']}><TranskripNilai /></ProtectedRoute>} />
              <Route path="/mahasiswa/pesan" element={<ProtectedRoute allowedRoles={['mahasiswa']}><PesanMahasiswa /></ProtectedRoute>} />
              <Route path="/mahasiswa/pesan/:conversationId" element={<ProtectedRoute allowedRoles={['mahasiswa']}><PesanMahasiswa /></ProtectedRoute>} />
              <Route path="/mahasiswa/cari-invoice" element={<ProtectedRoute allowedRoles={['mahasiswa']}><CariInvoice /></ProtectedRoute>} />
              <Route path="/mahasiswa/tugas" element={<ProtectedRoute allowedRoles={['mahasiswa']}><TugasMahasiswa /></ProtectedRoute>} />
              <Route path="/mahasiswa/materi" element={<ProtectedRoute allowedRoles={['mahasiswa']}><MateriMahasiswa /></ProtectedRoute>} />
              <Route path="/mahasiswa/matkul/:courseId" element={<ProtectedRoute allowedRoles={['mahasiswa']}><DetailMatkul /></ProtectedRoute>} />
              <Route path="/mahasiswa/matkul/:courseId/pertemuan/:pertemuan/materi" element={<ProtectedRoute allowedRoles={['mahasiswa']}><DetailPertemuanMateri /></ProtectedRoute>} />
              <Route path="/mahasiswa/matkul/:courseId/pertemuan/:pertemuan/tugas" element={<ProtectedRoute allowedRoles={['mahasiswa']}><DetailPertemuanTugas /></ProtectedRoute>} />

              <Route path="/dosen" element={<ProtectedRoute allowedRoles={['dosen']}><DashboardDosen /></ProtectedRoute>} />
              <Route path="/dosen/course" element={<ProtectedRoute allowedRoles={['dosen']}><CourseDosen /></ProtectedRoute>} />
              <Route path="/dosen/absensi" element={<ProtectedRoute allowedRoles={['dosen']}><AbsensiDosen /></ProtectedRoute>} />
              <Route path="/dosen/penilaian" element={<ProtectedRoute allowedRoles={['dosen']}><PenilaianDosen /></ProtectedRoute>} />
              <Route path="/dosen/pesan" element={<ProtectedRoute allowedRoles={['dosen']}><PesanDosen /></ProtectedRoute>} />
              <Route path="/dosen/pesan/:conversationId" element={<ProtectedRoute allowedRoles={['dosen']}><PesanDosen /></ProtectedRoute>} />
              <Route path="/dosen/matkul/:courseId" element={<ProtectedRoute allowedRoles={['dosen']}><KelolaMatkulDosen /></ProtectedRoute>} />
              <Route path="/dosen/matkul/:courseId/pertemuan/:pertemuan" element={<ProtectedRoute allowedRoles={['dosen']}><DetailPertemuanDosen /></ProtectedRoute>} />
              <Route path="/dosen/penilaian/:courseId" element={<ProtectedRoute allowedRoles={['dosen']}><PenilaianDosen /></ProtectedRoute>} />
              <Route path="/dosen/manage-matkul" element={<ProtectedRoute allowedRoles={['dosen']}><ManageMatkulSuperDosen /></ProtectedRoute>} />

              <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><DashboardAdmin /></ProtectedRoute>} />
              <Route path="/admin/posting-pemberitahuan" element={<ProtectedRoute allowedRoles={['admin']}><PostingPemberitahuan /></ProtectedRoute>} />
              <Route path="/admin/pemantauan-ukt" element={<ProtectedRoute allowedRoles={['admin']}><PemantauanUKT /></ProtectedRoute>} />
              <Route path="/admin/setting-profile" element={<ProtectedRoute allowedRoles={['admin']}><SettingProfileAdmin /></ProtectedRoute>} />
              <Route path="/admin/akun" element={<ProtectedRoute allowedRoles={['admin']}><AkunAdmin /></ProtectedRoute>} />
              <Route path="/admin/pesan" element={<ProtectedRoute allowedRoles={['admin']}><PesanAdmin /></ProtectedRoute>} />
              <Route path="/admin/pesan/:conversationId" element={<ProtectedRoute allowedRoles={['admin']}><PesanAdmin /></ProtectedRoute>} />

              <Route path="/ortu" element={<ProtectedRoute allowedRoles={['orangtua']}><DashboardOrtu /></ProtectedRoute>} />
              <Route path="/ortu/pantau-kehadiran" element={<ProtectedRoute allowedRoles={['orangtua']}><PantauKehadiran /></ProtectedRoute>} />
              <Route path="/ortu/pembayaran-ukt" element={<ProtectedRoute allowedRoles={['orangtua']}><PembayaranOrtu /></ProtectedRoute>} />

              <Route path="/ukm" element={<ProtectedRoute allowedRoles={['ukm']}><DashboardUKM /></ProtectedRoute>} />
              <Route path="/ukm/posting" element={<ProtectedRoute allowedRoles={['ukm']}><PostingUKM /></ProtectedRoute>} />
              <Route path="/ukm/akun" element={<ProtectedRoute allowedRoles={['ukm']}><AkunUKM /></ProtectedRoute>} />
              <Route path="/ukm/setting-profile" element={<ProtectedRoute allowedRoles={['ukm']}><SettingProfileUKM /></ProtectedRoute>} />

              <Route path="/ormawa" element={<ProtectedRoute allowedRoles={['ormawa']}><DashboardOrmawa /></ProtectedRoute>} />
              <Route path="/ormawa/posting" element={<ProtectedRoute allowedRoles={['ormawa']}><PostingOrmawa /></ProtectedRoute>} />
              <Route path="/ormawa/akun" element={<ProtectedRoute allowedRoles={['ormawa']}><AkunOrmawa /></ProtectedRoute>} />
              <Route path="/ormawa/setting-profile" element={<ProtectedRoute allowedRoles={['ormawa']}><SettingProfileOrmawa /></ProtectedRoute>} />

              <Route path="/profile/:role/:username" element={<ProfilePublic />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </div>
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  )
}

export default App
