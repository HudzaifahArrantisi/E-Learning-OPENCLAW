import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import Sidebar from '../../components/Sidebar'
import useAuth from '../../hooks/useAuth'
import api from '../../services/api'
import { FaSync, FaBook, FaChalkboardTeacher, FaClock, FaSearch } from 'react-icons/fa'

const MatkulMahasiswa = () => {
  const { user } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    fetchMahasiswaCourses()
  }, [])

  const fetchMahasiswaCourses = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log('🔄 Fetching mahasiswa courses...')
      
      const response = await api.getMahasiswaCourses()
      console.log('📦 API Response:', response)
      console.log('📊 Response data:', response.data)
      console.log('📊 Response nested data:', response.data?.data)
      console.log('📊 Response nested inner data:', response.data?.data?.data)

      // Ensure we extract the courses array from various possible response shapes
      let coursesData = []

      // Prefer deepest nested `data` (backend returns: { success, data: { data: [...], meta } })
      if (response?.data?.data && Array.isArray(response.data.data)) {
        // case: utils.SuccessResponse(c, courses) -> response.data.data === courses (array)
        coursesData = response.data.data
      }

      // case: utils.SuccessResponse(c, gin.H{"data": courses, "meta": {...}})
      if (response?.data?.data?.data && Array.isArray(response.data.data.data)) {
        coursesData = response.data.data.data
      }

      // other fallbacks
      if (!coursesData.length && Array.isArray(response?.data)) {
        coursesData = response.data
      }
      if (!coursesData.length && response?.data?.courses && Array.isArray(response.data.courses)) {
        coursesData = response.data.courses
      }
      
      console.log(`✅ Found ${coursesData.length} courses`)
      setCourses(coursesData)
      
    } catch (error) {
      console.error('❌ Error fetching courses:', error)
      console.error('❌ Error details:', error.response?.data || error.message)
      
      // Fallback: Load dummy data for testing
      console.log('🔄 Loading fallback data...')
      setCourses(getFallbackCourses())
      setError('⚠️ Gagal memuat data dari server. Menampilkan data contoh.')
      
      // Tampilkan pesan error yang lebih spesifik
      if (error.response) {
        const status = error.response.status
        if (status === 401) {
          setError('Sesi login telah berakhir. Silakan login kembali.')
        } else if (status === 403) {
          setError('Akses ditolak. Anda tidak memiliki izin untuk mengakses data ini.')
        } else if (status === 400) {
          setError('Permintaan tidak valid. Silakan coba lagi.')
        } else {
          setError(`Gagal memuat data mata kuliah (Error ${status})`)
        }
      } else if (error.request) {
        setError('Tidak dapat terhubung ke server. Periksa koneksi internet Anda.')
      } else {
        setError('Gagal memuat data mata kuliah: ' + error.message)
      }
    } finally {
      setLoading(false)
    }
  }

  // Fallback data jika API gagal
  const getFallbackCourses = () => {
    return [
      {
        kode: 'KP001',
        nama: 'KOMPUTASI PARALEL & TERDISTRIBUSI',
        dosen: 'Dr. Dosen 1',
        sks: 3,
        hari: 'Jumat',
        jam_mulai: '13:30',
        jam_selesai: '15:00'
      },
      {
        kode: 'KW002',
        nama: 'KEAMANAN WEB',
        dosen: 'Dr. Dosen 2',
        sks: 3,
        hari: 'Senin',
        jam_mulai: '13:00',
        jam_selesai: '15:00'
      },
      {
        kode: 'PBO001',
        nama: 'PEMROGRAMAN BERORIENTASI OBJEK',
        dosen: 'Dr. Dosen 3',
        sks: 4,
        hari: 'Kamis',
        jam_mulai: '13:30',
        jam_selesai: '15:30'
      },
      {
        kode: 'DEV001',
        nama: 'DEVOPSSEC',
        dosen: 'Dr. Dosen 4',
        sks: 3,
        hari: 'Senin',
        jam_mulai: '08:30',
        jam_selesai: '11:00'
      }
    ]
  }

  const handleCardClick = (courseKode) => {
    console.log(`📚 Navigating to course: ${courseKode}`)
    navigate(`/mahasiswa/matkul/${courseKode}`)
  }

  // FIX: Pastikan courses adalah array sebelum memanggil filter
  const filteredCourses = Array.isArray(courses) 
    ? courses.filter(course => {
        if (!course || typeof course !== 'object') return false
        
        return (
          (course.nama && course.nama.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (course.kode && course.kode.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (course.dosen && course.dosen.toLowerCase().includes(searchTerm.toLowerCase()))
        )
      })
    : []

  if (loading) {
    return (
      <div className="flex h-screen bg-lp-bg">
        <Sidebar role="mahasiswa" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Navbar user={user} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-lp-text2 font-light">Memuat mata kuliah...</p>
              <p className="text-sm text-lp-text3 font-light mt-2">Mengambil data dari server</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-lp-bg">
      <Sidebar role="mahasiswa" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar user={user} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 space-y-4 sm:space-y-0">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-lp-text font-semibold tracking-tight">Mata Kuliah</h1>
              <p className="text-lp-text2 font-light mt-1">Semester 3 - Total {Array.isArray(courses) ? courses.length : 0} mata kuliah</p>
              {error && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-700 text-sm">{error}</p>
                </div>
              )}
            </div>
            
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
              {/* Search Bar */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Cari mata kuliah..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-lp-border border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full sm:w-64"
                />
                <FaSearch className="absolute left-3 top-3 text-gray-400" />
              </div>
              
              <button 
                onClick={fetchMahasiswaCourses}
                className="
                  flex items-center space-x-2 px-4 py-2 bg-lp-surface rounded-xl
                  text-lp-text2 hover:bg-lp-bg border border-lp-border border
                  transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border
                  w-full sm:w-auto justify-center
                "
              >
                <FaSync className="text-lg" />
                <span>Refresh</span>
              </button>
            </div>
          </div>
          {/* Courses Grid */}
          {filteredCourses.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                {filteredCourses.map((course, index) => (
                  <div 
                    key={index}
                    onClick={() => handleCardClick(course.kode)}
                    className="
                      bg-lp-surface rounded-2xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border border border-lp-border border
                      hover:shadow-xl transform hover:scale-105
                      transition-all duration-300 cursor-pointer
                      group relative
                    "
                  >
                    {/* Course Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 bg-lp-accent rounded-xl flex items-center justify-center">
                        <FaBook className="text-xl text-white" />
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="
                          px-2 py-1 bg-blue-100 text-blue-700 text-xs
                          rounded-lg font-medium mb-1
                        ">
                          {course.sks || 0} SKS
                        </span>
                        <span className="text-xs text-lp-text3 font-light">{course.kode}</span>
                      </div>
                    </div>

                    {/* Course Info */}
                    <h3 className="font-bold text-lp-text font-semibold tracking-tight text-lg mb-2 line-clamp-2 group-hover:text-lp-atext transition-colors">
                      {course.nama || 'Nama Mata Kuliah'}
                    </h3>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center space-x-2 text-sm text-lp-text2 font-light">
                        <FaChalkboardTeacher className="text-gray-400" />
                        <span className="line-clamp-1">{course.dosen || 'Dosen'}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-lp-text2 font-light">
                        <FaClock className="text-gray-400" />
                        <span>{course.hari || 'Hari'}, {course.jam_mulai || '00:00'} - {course.jam_selesai || '00:00'}</span>
                      </div>
                    </div>

                    {/* Action Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCardClick(course.kode)
                      }}
                      className="
                        w-full bg-lp-accent text-white border-none
                        py-2 px-4 rounded-lg text-sm font-medium
                        hover:bg-blue-600
                        transition-all duration-300 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-xl
                      "
                    >
                      Lihat Detail
                    </button>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="bg-lp-surface rounded-2xl p-8 text-center shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border border border-lp-border border">
              <div className="text-6xl mb-4">📚</div>
              <h3 className="text-xl font-semibold text-lp-text font-semibold tracking-tight mb-2">
                {searchTerm ? 'Mata kuliah tidak ditemukan' : 'Belum ada mata kuliah'}
              </h3>
              <p className="text-lp-text2 font-light mb-6">
                {searchTerm 
                  ? `Tidak ada hasil untuk "${searchTerm}". Coba kata kunci lain.`
                  : 'Anda belum mengambil mata kuliah untuk semester ini.'}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="
                      bg-gray-100 text-lp-text2
                      px-6 py-3 rounded-xl font-medium
                      hover:bg-gray-200
                      transition-all duration-300
                    "
                  >
                    Hapus Filter
                  </button>
                )}
                <button 
                  onClick={fetchMahasiswaCourses}
                  className="
                    bg-lp-accent text-white border-none
                    px-6 py-3 rounded-xl font-semibold
                    hover:bg-blue-600
                    transition-all duration-300 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-xl
                  "
                >
                  Muat Ulang Data
                </button>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !courses.length && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
              <div className="text-red-500 text-4xl mb-4">⚠️</div>
              <h3 className="text-lg font-semibold text-red-800 mb-2">Terjadi Kesalahan</h3>
              <p className="text-red-600 mb-4">{error}</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button 
                  onClick={() => setCourses(getFallbackCourses())}
                  className="
                    bg-gray-100 text-lp-text2 px-4 py-2 rounded-lg
                    hover:bg-gray-200 transition-colors
                  "
                >
                  Tampilkan Data Contoh
                </button>
                <button 
                  onClick={fetchMahasiswaCourses}
                  className="
                    bg-red-500 text-white px-4 py-2 rounded-lg
                    hover:bg-red-600 transition-colors
                  "
                >
                  Coba Lagi
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default MatkulMahasiswa