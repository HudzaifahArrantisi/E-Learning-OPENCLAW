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
        
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 relative bg-white">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
          
          <div className="max-w-6xl mx-auto relative z-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 space-y-4 sm:space-y-0">
              <div>
                <Link 
                  to="/mahasiswa/matkul"
                  className="
                    inline-flex items-center space-x-2 text-lp-text3 hover:text-lp-text 
                    mb-6 transition-all hover:-translate-x-1 font-medium text-[13px]
                  "
                >
                  <FaArrowLeft />
                  <span>Kembali ke Daftar Matkul</span>
                </Link>
                <div className="flex flex-col items-start gap-2.5">
                  <span className="px-2.5 py-1 bg-gray-50 border border-gray-200 text-lp-text text-[11px] rounded-lg font-mono font-medium tracking-wider uppercase">
                    Kode: {courseId}
                  </span>
                  <h1 className="text-2xl md:text-[28px] font-bold text-lp-text tracking-tight leading-tight">
                    {matkulData[courseId] || courseId}
                  </h1>
                </div>
              </div>
            </div>

            {/* Pertemuan Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
              {pertemuanList.map((pertemuan, index) => (
                <div 
                  key={index} 
                  className="
                    bg-white rounded-[24px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-lp-border
                    hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:-translate-y-1
                    transition-all duration-300 flex flex-col items-center justify-center
                  "
                >
                  <div className="text-center mb-6 w-full">
                    <div className="
                      w-[60px] h-[60px] bg-white border-2 border-gray-100 
                      rounded-full flex items-center justify-center text-lp-text 
                      font-mono font-bold text-[22px] mx-auto mb-4
                    ">
                      {pertemuan.pertemuan}
                    </div>
                    <h3 className="font-bold text-[17px] text-lp-text tracking-tight w-full">
                      Pertemuan {pertemuan.pertemuan}
                    </h3>
                  </div>

                  <div className="space-y-3 w-full">
                    {pertemuan.has_materi && (
                      <Link 
                        to={`/mahasiswa/matkul/${courseId}/pertemuan/${pertemuan.pertemuan}/materi`}
                        className="
                          flex items-center justify-center space-x-2 
                          bg-[#111827] text-white h-[42px] rounded-full
                          font-sans text-[13px] font-semibold tracking-[0.02em]
                          hover:bg-black hover:shadow-md transition-all duration-300 w-full
                        "
                      >
                        <FaBook className="text-sm" />
                        <span>Materi</span>
                      </Link>
                    )}
                    
                    {pertemuan.has_tugas && (
                      <Link 
                        to={`/mahasiswa/matkul/${courseId}/pertemuan/${pertemuan.pertemuan}/tugas`}
                        className="
                          flex items-center justify-center space-x-2 
                          bg-white text-lp-text border border-lp-border h-[42px] rounded-full
                          font-sans text-[13px] font-semibold tracking-[0.02em]
                          hover:bg-gray-50 hover:shadow-sm transition-all duration-300 w-full
                        "
                      >
                        <FaTasks className="text-sm" />
                        <span>Tugas</span>
                      </Link>
                    )}
                    
                    {!pertemuan.has_materi && !pertemuan.has_tugas && (
                      <div className="text-center py-4 bg-gray-50 border border-gray-100 rounded-2xl w-full">
                        <p className="text-lp-text3 font-medium text-xs uppercase tracking-wider">Belum ada konten</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Empty State */}
            {pertemuanList.length === 0 && (
              <div className="bg-white rounded-[24px] p-8 md:p-12 text-center shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-lp-border">
                <div className="w-20 h-20 bg-gray-50 border border-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FaBook className="text-3xl text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-lp-text tracking-tight mb-2">Belum ada pertemuan</h3>
                <p className="text-lp-text2 font-light text-sm max-w-md mx-auto">Pertemuan untuk mata kuliah ini belum tersedia.</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export default DetailMatkul