import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import Sidebar from '../../components/Sidebar'
import useAuth from '../../hooks/useAuth'
import api from '../../services/api'
import { FaDownload, FaArrowLeft, FaBook, FaTasks } from 'react-icons/fa'
import { resolveBackendAssetUrl } from '../../utils/assetUrl'

const DetailPertemuanMateri = () => {
  const { user } = useAuth()
  const { courseId, pertemuan } = useParams()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [materiList, setMateriList] = useState([])
  const [courseName, setCourseName] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMateriDetail()
  }, [courseId, pertemuan])

  const fetchMateriDetail = async () => {
    try {
      setLoading(true)
      // Fetch course info
      const courseRes = await api.getCourseInfo(courseId)
      if (courseRes.data && courseRes.data.data) {
        setCourseName(courseRes.data.data.nama)
      }

      // ✅ PERBAIKAN: Gunakan endpoint mahasiswa, bukan dosen
      const response = await api.getPertemuanDetail(courseId, pertemuan)
      setMateriList(response.data.data.materi || [])
    } catch (error) {
      console.error('Error fetching materi detail:', error)
      // Jika error 403, mungkin token expired
      if (error.response?.status === 403) {
        console.log('Access forbidden - mungkin perlu login ulang atau token expired')
      }
    } finally {
      setLoading(false)
    }
  }



  if (loading) {
    return (
      <div className="flex h-screen bg-lp-bg">
        <Sidebar role="mahasiswa" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Navbar user={user} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lp-text mx-auto mb-4"></div>
              <p className="text-lp-text2 font-light">Memuat materi...</p>
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
            <div className="max-w-4xl mx-auto">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 space-y-4 sm:space-y-0">
                <div>
                  <Link 
                    to={`/mahasiswa/matkul/${courseId}`}
                    className="
                      inline-flex items-center space-x-2 text-lp-text2 hover:text-lp-text
                      mb-4 transition-colors
                    "
                  >
                  <FaArrowLeft />
                  <span>Kembali ke Mata Kuliah</span>
                </Link>
                <h1 className="text-2xl md:text-3xl font-bold text-lp-text font-semibold tracking-tight">
                  {courseName || courseId}
                </h1>
                <p className="text-lp-text2 font-light mt-1">Pertemuan {pertemuan} - Materi Pembelajaran</p>
              </div>
              
                <div className="flex space-x-2">
                  <Link 
                    to={`/mahasiswa/matkul/${courseId}/pertemuan/${pertemuan}/tugas`}
                    className="
                      flex items-center space-x-2 bg-lp-text text-white
                      py-2 px-4 rounded-xl hover:bg-lp-atext
                      transition-all duration-300 border border-lp-border
                    "
                  >
                  <FaTasks />
                  <span className="hidden sm:block">Lihat Tugas</span>
                </Link>
              </div>
            </div>

            {/* Materi List */}
            <div className="bg-white rounded-2xl border border-lp-border overflow-hidden">
              {materiList.length > 0 ? (
                <div className="divide-y divide-lp-border/70">
                  {materiList.map((materi, index) => (
                    <div 
                      key={index}
                      className="p-6 hover:bg-lp-surface transition-colors duration-300"
                    >
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between space-y-4 md:space-y-0">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-3">
                            <div className="w-10 h-10 bg-lp-surface rounded-xl flex items-center justify-center border border-lp-border">
                              <FaBook className="text-lp-text2 text-lg" />
                            </div>
                            <h3 className="font-bold text-lg text-lp-text font-semibold tracking-tight">{materi.title}</h3>
                          </div>
                          
                          {materi.desc && (
                            <p className="text-lp-text2 font-light mb-4 leading-relaxed">{materi.desc}</p>
                          )}
                          
                          <div className="flex items-center space-x-4 text-sm text-lp-text3 font-light">
                            <span>
                              Diupload: {materi.created_at ? new Date(materi.created_at).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric'
                              }) : 'Tidak diketahui'}
                            </span>
                          </div>
                        </div>
                        
                        {materi.file_path && (
                          <div className="flex items-center space-x-3">
                            <a 
                              href={resolveBackendAssetUrl(materi.file_path)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="
                                flex items-center space-x-2 bg-lp-text text-white
                                py-2 px-4 rounded-lg hover:bg-lp-atext
                                transition-all duration-300 border border-lp-border
                              "
                            >
                              <FaDownload />
                              <span>Lihat</span>
                            </a>
                            <span className="
                              px-2 py-1 bg-lp-surface text-lp-text2 font-light border border-lp-border
                              rounded-lg text-xs font-medium
                            ">
                              {materi.file_path.split('.').pop().toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <h3 className="text-xl font-semibold text-lp-text font-semibold tracking-tight mb-2">Belum ada materi</h3>
                  <p className="text-lp-text2 font-light max-w-md mx-auto">
                    Materi untuk pertemuan ini belum diupload oleh dosen.
                  </p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default DetailPertemuanMateri
