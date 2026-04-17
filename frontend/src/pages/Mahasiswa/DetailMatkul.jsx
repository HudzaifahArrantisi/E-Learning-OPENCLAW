import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import Sidebar from '../../components/Sidebar'
import useAuth from '../../hooks/useAuth'
import api from '../../services/api'
import { FaBook, FaTasks, FaArrowLeft } from 'react-icons/fa'

const DetailMatkul = () => {
  const { user } = useAuth()
  const { courseId } = useParams()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [pertemuanList, setPertemuanList] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPertemuanList()
  }, [courseId])

  const fetchPertemuanList = async () => {
    try {
      const response = await api.getPertemuanByMatkul(courseId)
      setPertemuanList(response.data.data || [])
    } catch (error) {
      console.error('Error fetching pertemuan:', error)
    } finally {
      setLoading(false)
    }
  }

  const matkulData = {
    'KP001': 'KOMPUTASI PARALEL & TERDISTRIBUSI',
    'KW002': 'KEAMANAN WEB',
    'PBO001': 'PEMROGRAMAN BERORIENTASI OBJEK',
    'DEV001': 'DEVOPSSEC',
    'RPL001': 'REKAYASA PERANGKAT LUNAK',
    'KWU001': 'KEWIRAUSAHAAN',
    'BI002': 'BAHASA INGGRIS 2',
    'IR001': 'INCIDENT RESPONSE'
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-lp-bg">
        <Sidebar role="mahasiswa" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Navbar user={user} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-lp-text2 font-light">Memuat pertemuan...</p>
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
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 space-y-4 sm:space-y-0">
              <div>
                <Link 
                  to="/mahasiswa/matkul"
                  className="
                    inline-flex items-center space-x-2 text-lp-atext hover:text-lp-accent 
                    mb-4 transition-colors
                  "
                >
                  <FaArrowLeft />
                  <span>Kembali ke Daftar Matkul</span>
                </Link>
                <h1 className="text-2xl md:text-3xl font-bold text-lp-text font-semibold tracking-tight">
                  {matkulData[courseId] || courseId}
                </h1>
                <p className="text-lp-text2 font-light mt-1">Kode: {courseId}</p>
              </div>
            </div>

            {/* Pertemuan Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
              {pertemuanList.map((pertemuan, index) => (
                <div 
                  key={index} 
                  className="
                    bg-lp-surface rounded-2xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border border border-lp-border border
                    hover:shadow-xl transform hover:scale-105
                    transition-all duration-300
                  "
                >
                  <div className="text-center mb-4">
                    <div className="
                      w-16 h-16 bg-lp-accent 
                      rounded-2xl flex items-center justify-center text-white 
                      font-bold text-xl mx-auto mb-3
                    ">
                      {pertemuan.pertemuan}
                    </div>
                    <h3 className="font-bold text-lg text-lp-text font-semibold tracking-tight">
                      Pertemuan {pertemuan.pertemuan}
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {pertemuan.has_materi && (
                      <Link 
                        to={`/mahasiswa/matkul/${courseId}/pertemuan/${pertemuan.pertemuan}/materi`}
                        className="
                          flex items-center justify-center space-x-2 
                          bg-lp-accent text-white py-3 px-4 rounded-xl
                          hover:bg-lp-accent transform hover:scale-105
                          transition-all duration-300 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border hover:shadow-xl
                          w-full
                        "
                      >
                        <FaBook />
                        <span>Materi</span>
                      </Link>
                    )}
                    
                    {pertemuan.has_tugas && (
                      <Link 
                        to={`/mahasiswa/matkul/${courseId}/pertemuan/${pertemuan.pertemuan}/tugas`}
                        className="
                          flex items-center justify-center space-x-2 
                          bg-lp-green text-white py-3 px-4 rounded-xl
                          hover:bg-lp-green transform hover:scale-105
                          transition-all duration-300 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border hover:shadow-xl
                          w-full
                        "
                      >
                        <FaTasks />
                        <span>Tugas</span>
                      </Link>
                    )}
                    
                    {!pertemuan.has_materi && !pertemuan.has_tugas && (
                      <div className="text-center py-4">
                        <p className="text-lp-text3 font-light text-sm">Belum ada konten</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Empty State */}
            {pertemuanList.length === 0 && (
              <div className="bg-lp-surface rounded-2xl p-8 text-center shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border border border-lp-border border">
                <div className="text-6xl mb-4">📚</div>
                <h3 className="text-xl font-semibold text-lp-text font-semibold tracking-tight mb-2">Belum ada pertemuan</h3>
                <p className="text-lp-text2 font-light">Pertemuan untuk mata kuliah ini belum tersedia.</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export default DetailMatkul