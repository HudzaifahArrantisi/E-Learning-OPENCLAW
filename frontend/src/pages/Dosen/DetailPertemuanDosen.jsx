import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import api from '../../services/api'
import { resolveBackendAssetUrl } from '../../utils/assetUrl'
import {
  FiBookOpen, FiFileText, FiCalendar, FiDownload,
  FiTrash2, FiEye, FiChevronRight, FiClock,
  FiFile, FiUsers, FiCheckCircle, FiXCircle,
  FiEdit2, FiArrowLeft, FiExternalLink, FiBarChart2
} from 'react-icons/fi'

const DetailPertemuanDosen = () => {
  const { courseId, pertemuan } = useParams()
  const [detail, setDetail] = useState({ materi: [], tugas: [] })
  const [courseName, setCourseName] = useState('')
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('materi') // 'materi' or 'tugas'
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null) // {type: 'materi'|'tugas', id: number}

  useEffect(() => {
    fetchPertemuanDetail()
  }, [courseId, pertemuan])

  const fetchPertemuanDetail = async () => {
    try {
      setLoading(true)

      // Fetch course info
      const courseRes = await api.getCourseInfo(courseId)
      if (courseRes.data && courseRes.data.data) {
        setCourseName(courseRes.data.data.nama)
      }

      const response = await api.get(`/api/dosen/matkul/${courseId}/pertemuan/${pertemuan}`)
      setDetail(response.data.data)
    } catch (error) {
      console.error('Error fetching pertemuan detail:', error)
      alert('Gagal memuat detail pertemuan: ' + (error.response?.data?.message || error.message))
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteMateri = async (materiId) => {
    try {
      await api.deleteMateri(materiId)
      alert('Materi berhasil dihapus!')
      fetchPertemuanDetail()
    } catch (error) {
      console.error('Error deleting materi:', error)
      alert('Gagal menghapus materi: ' + (error.response?.data?.message || error.message))
    }
  }

  const handleDeleteTugas = async (tugasId) => {
    try {
      await api.deleteTugas(tugasId)
      alert('Tugas berhasil dihapus!')
      fetchPertemuanDetail()
    } catch (error) {
      console.error('Error deleting tugas:', error)
      alert('Gagal menghapus tugas: ' + (error.response?.data?.message || error.message))
    }
  }

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }


  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' bytes'
    else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    else return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  if (loading) {
    return (
      <div className="flex min-h-screen bg-lp-bg">
        <Sidebar role="dosen" isOpen={sidebarOpen} onClose={toggleSidebar} />
        <div className="flex-1 lg:ml-0 transition-all duration-300">
          <div className="p-6 lg:p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="lg:hidden p-3 rounded-xl bg-lp-surface/50 backdrop-blur-sm shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border animate-pulse">
                  <div className="w-6 h-6 bg-gray-200 rounded"></div>
                </div>
                <div>
                  <div className="h-8 w-64 bg-lp-bg rounded-xl animate-pulse mb-2"></div>
                  <div className="h-4 w-48 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
              <div className="h-12 w-32 bg-gray-200 rounded-xl animate-pulse"></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[1, 2].map(item => (
                <div key={item} className="bg-lp-surface/50 backdrop-blur-sm rounded-2xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border animate-pulse">
                  <div className="h-6 w-32 bg-gray-200 rounded mb-4"></div>
                  <div className="space-y-4">
                    {[1, 2, 3].map(sub => (
                      <div key={sub} className="border border-lp-border rounded-xl p-4">
                        <div className="h-4 w-3/4 bg-gray-200 rounded mb-3"></div>
                        <div className="h-3 w-1/2 bg-gray-200 rounded"></div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-lp-bg">
      <Sidebar role="dosen" isOpen={sidebarOpen} onClose={toggleSidebar} />
      
      {/* Main Content */}
      <div className="flex-1 lg:ml-0 transition-all duration-300 min-w-0">
        <div className="p-6 lg:p-8">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
            <div className="flex items-center gap-4">
              <button 
                onClick={toggleSidebar}
                className="lg:hidden p-3 rounded-xl bg-lp-surface/80 backdrop-blur-sm shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                <FiChevronRight className="text-xl text-lp-text2" />
              </button>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-3 bg-lp-bg rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border">
                    <FiBookOpen className="text-2xl text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl lg:text-4xl font-bold bg-lp-bg bg-clip-text text-transparent">
                      {courseName || courseId}
                    </h1>
                    <p className="text-lp-text2 font-light mt-1">Pertemuan {pertemuan}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link 
                to={`/dosen/matkul/${courseId}`}
                className="group relative overflow-hidden px-6 py-3 bg-lp-text text-white border-none rounded-xl font-medium shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 flex items-center gap-3"
              >
                <div className="absolute inset-0 bg-lp-surface/10 translate-x-[-100%] group-hover:translate-x-full transition-transform duration-1000"></div>
                <FiArrowLeft className="relative z-10" />
                <span className="relative z-10">Kembali ke Kelola</span>
              </Link>
              <Link 
                to={`/dosen/penilaian/${courseId}?pertemuan=${pertemuan}`}
                className="px-6 py-3 bg-lp-text text-white border-none rounded-xl font-medium shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 flex items-center gap-3"
              >
                <FiBarChart2 />
                Lihat Penilaian
              </Link>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-lp-surface/80 backdrop-blur-sm rounded-2xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border-lp-border border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lp-text2 font-light text-sm mb-1">Total Materi</p>
                  <h3 className="text-3xl font-bold text-lp-text font-semibold tracking-tight">{detail.materi.length}</h3>
                </div>
                <div className="p-3 bg-lp-bg rounded-xl">
                  <FiFileText className="text-2xl text-lp-text2" />
                </div>
              </div>
            </div>
            <div className="bg-lp-surface/80 backdrop-blur-sm rounded-2xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border-lp-border border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lp-text2 font-light text-sm mb-1">Total Tugas</p>
                  <h3 className="text-3xl font-bold text-lp-text font-semibold tracking-tight">{detail.tugas.length}</h3>
                </div>
                <div className="p-3 bg-lp-bg rounded-xl">
                  <FiCalendar className="text-2xl text-lp-text2" />
                </div>
              </div>
            </div>
            <div className="bg-lp-surface/80 backdrop-blur-sm rounded-2xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border-lp-border border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lp-text2 font-light text-sm mb-1">File Tersedia</p>
                  <h3 className="text-3xl font-bold text-lp-text font-semibold tracking-tight">
                    {detail.materi.filter(m => m.file_path).length + detail.tugas.filter(t => t.file_path).length}
                  </h3>
                </div>
                <div className="p-3 bg-lp-bg rounded-xl">
                  <FiFile className="text-2xl text-lp-text2" />
                </div>
              </div>
            </div>
            <div className="bg-lp-surface/80 backdrop-blur-sm rounded-2xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border-lp-border border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lp-text2 font-light text-sm mb-1">Status Pertemuan</p>
                  <h3 className="text-3xl font-bold text-lp-text font-semibold tracking-tight">
                    {detail.materi.length > 0 || detail.tugas.length > 0 ? 'Aktif' : 'Kosong'}
                  </h3>
                </div>
                <div className="p-3 bg-lp-bg rounded-xl">
                  <FiCheckCircle className="text-2xl text-lp-text2" />
                </div>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="bg-lp-surface/80 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border-lp-border border mb-6">
            <div className="flex border-b border-lp-border border">
              <button
                onClick={() => setActiveTab('materi')}
                className={`flex-1 py-4 px-6 text-center font-medium transition-all duration-300 ${
                  activeTab === 'materi' 
                    ? 'text-lp-text2 border-b-2 border-lp-text bg-lp-bg' 
                    : 'text-lp-text3 font-light hover:text-lp-text2 hover:bg-lp-bg'
                }`}
              >
                <div className="flex items-center justify-center gap-3">
                  <FiFileText className="text-xl" />
                  <span>Materi ({detail.materi.length})</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('tugas')}
                className={`flex-1 py-4 px-6 text-center font-medium transition-all duration-300 ${
                  activeTab === 'tugas' 
                    ? 'text-lp-text2 border-b-2 border-lp-text bg-lp-bg' 
                    : 'text-lp-text3 font-light hover:text-lp-text2 hover:bg-lp-bg'
                }`}
              >
                <div className="flex items-center justify-center gap-3">
                  <FiCalendar className="text-xl" />
                  <span>Tugas ({detail.tugas.length})</span>
                </div>
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Materi Section */}
            <div className={`transition-all duration-500 ${activeTab === 'materi' ? 'opacity-100' : 'opacity-70'}`}>
              <div className="bg-lp-surface/80 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border-lp-border border p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-lp-bg rounded-xl">
                      <FiFileText className="text-xl text-lp-text2" />
                    </div>
                    <h2 className="text-xl font-bold text-lp-text font-semibold tracking-tight">Materi Pembelajaran</h2>
                  </div>
                  <Link
                    to={`/dosen/matkul/${courseId}?upload=materi&pertemuan=${pertemuan}`}
                    className="px-4 py-2 bg-lp-text text-white border-none rounded-xl font-medium hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border transition-all duration-300 hover:-translate-y-0.5 flex items-center gap-2"
                  >
                    <FiFileText />
                    Tambah Materi
                  </Link>
                </div>
                
                {detail.materi.length > 0 ? (
                  <div className="space-y-4">
                    {detail.materi.map((materi, index) => (
                      <div key={index} className="group bg-lp-bg border border-lp-border rounded-xl p-5 hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold text-lp-text font-semibold tracking-tight text-lg">{materi.title}</h3>
                              {materi.file_path && (
                                <span className="px-2 py-1 bg-lp-surface text-lp-text2 font-light text-xs rounded-lg">
                                  {materi.file_path.split('.').pop().toUpperCase()}
                                </span>
                              )}
                            </div>
                            {materi.desc && (
                              <p className="text-lp-text2 font-light text-sm mb-3 line-clamp-2 whitespace-pre-wrap">{materi.desc}</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            {materi.file_path && (
                              <a
                                href={resolveBackendAssetUrl(materi.file_path)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 bg-lp-bg text-lp-text2 rounded-xl hover:bg-lp-surface transition-colors"
                                title="Unduh"
                              >
                                <FiDownload />
                              </a>
                            )}
                            <button
                              onClick={() => setShowDeleteConfirm({ type: 'materi', id: materi.id })}
                              className="p-2 bg-lp-bg text-lp-text2 rounded-xl hover:bg-lp-surface transition-colors"
                              title="Hapus"
                            >
                              <FiTrash2 />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-sm text-lp-text3 font-light pt-4 border-t border-lp-border border">
                          <span className="flex items-center gap-2">
                            <FiClock />
                            {new Date(materi.created_at).toLocaleDateString('id-ID', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </span>
                          <span className="text-xs px-2 py-1 bg-lp-surface rounded">
                            ID: {materi.id}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="p-4 bg-lp-bg rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                      <FiFileText className="text-3xl text-lp-text2" />
                    </div>
                    <h3 className="text-lg font-semibold text-lp-text2 mb-2">Belum ada materi</h3>
                    <p className="text-lp-text3 font-light mb-6">Tambahkan materi untuk pertemuan ini</p>
                    <Link
                      to={`/dosen/matkul/${courseId}?upload=materi&pertemuan=${pertemuan}`}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-lp-text text-white border-none rounded-xl font-medium hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border transition-all duration-300 hover:-translate-y-0.5"
                    >
                      <FiFileText />
                      Tambah Materi Pertama
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Tugas Section */}
            <div className={`transition-all duration-500 ${activeTab === 'tugas' ? 'opacity-100' : 'opacity-70'}`}>
              <div className="bg-lp-surface/80 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border-lp-border border p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-lp-bg rounded-xl">
                      <FiCalendar className="text-xl text-lp-text2" />
                    </div>
                    <h2 className="text-xl font-bold text-lp-text font-semibold tracking-tight">Tugas & Penilaian</h2>
                  </div>
                  <Link
                    to={`/dosen/matkul/${courseId}?create=tugas&pertemuan=${pertemuan}`}
                    className="px-4 py-2 bg-lp-text text-white border-none rounded-xl font-medium hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border transition-all duration-300 hover:-translate-y-0.5 flex items-center gap-2"
                  >
                    <FiCalendar />
                    Buat Tugas
                  </Link>
                </div>
                
                {detail.tugas.length > 0 ? (
                  <div className="space-y-4">
                    {detail.tugas.map((tugas, index) => (
                      <div key={index} className="group bg-lp-bg border border-lp-border rounded-xl p-5 hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold text-lp-text font-semibold tracking-tight text-lg">{tugas.title}</h3>
                              {tugas.file_path && (
                                <span className="px-2 py-1 bg-lp-bg text-lp-text2 text-xs rounded-lg">
                                  FILE
                                </span>
                              )}
                            </div>
                            {tugas.desc && (
                              <p className="text-lp-text2 font-light text-sm mb-3 line-clamp-2 whitespace-pre-wrap">{tugas.desc}</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            {tugas.file_path && (
                              <a
                                href={resolveBackendAssetUrl(tugas.file_path)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 bg-lp-bg text-lp-text2 rounded-xl hover:bg-lp-surface transition-colors"
                                title="File Tugas"
                              >
                                <FiFile />
                              </a>
                            )}
                            <button
                              onClick={() => setShowDeleteConfirm({ type: 'tugas', id: tugas.id })}
                              className="p-2 bg-lp-bg text-lp-text2 rounded-xl hover:bg-lp-surface transition-colors"
                              title="Hapus"
                            >
                              <FiTrash2 />
                            </button>
                          </div>
                        </div>
                        
                        {tugas.due_date && (
                          <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-lp-bg border border-lp-border rounded-xl">
                            <FiClock className="text-lp-text2" />
                            <span className="text-sm font-medium text-lp-text2">
                              Batas: {new Date(tugas.due_date).toLocaleString('id-ID')}
                            </span>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between text-sm text-lp-text3 font-light pt-4 border-t border-lp-border border">
                          <div className="flex items-center gap-4">
                            <span className="flex items-center gap-2">
                              <FiClock />
                              {new Date(tugas.created_at).toLocaleDateString('id-ID')}
                            </span>
                            <Link
                              to={`/dosen/penilaian/${courseId}?pertemuan=${pertemuan}`}
                              className="px-3 py-1.5 bg-lp-text text-white border-none rounded-xl text-sm font-medium hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border transition-all duration-300 hover:-translate-y-0.5 flex items-center gap-2"
                            >
                              <FiEye />
                              Lihat Pengumpulan
                            </Link>
                          </div>
                          <span className="text-xs px-2 py-1 bg-lp-surface rounded">
                            ID: {tugas.id}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="p-4 bg-lp-bg rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                      <FiCalendar className="text-3xl text-lp-text2" />
                    </div>
                    <h3 className="text-lg font-semibold text-lp-text2 mb-2">Belum ada tugas</h3>
                    <p className="text-lp-text3 font-light mb-6">Buat tugas untuk mengukur pemahaman mahasiswa</p>
                    <Link
                      to={`/dosen/matkul/${courseId}?create=tugas&pertemuan=${pertemuan}`}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-lp-text text-white border-none rounded-xl font-medium hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border transition-all duration-300 hover:-translate-y-0.5"
                    >
                      <FiCalendar />
                      Buat Tugas Pertama
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-8 bg-lp-bg rounded-2xl p-6 border border-lp-border">
            <h3 className="text-lg font-semibold text-lp-text font-semibold tracking-tight mb-4 flex items-center gap-2">
              <FiExternalLink />
              Aksi Cepat
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link
                to={`/dosen/matkul/${courseId}?upload=materi&pertemuan=${pertemuan}`}
                className="p-4 bg-lp-surface border border-lp-border rounded-xl hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border transition-all duration-300 hover:-translate-y-1 hover:border-lp-text2 group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-lp-bg rounded-xl group-hover:bg-lp-surface transition-colors">
                    <FiFileText className="text-lp-text2" />
                  </div>
                  <div>
                    <div className="font-medium text-lp-text font-semibold tracking-tight">Tambah Materi</div>
                    <div className="text-sm text-lp-text3 font-light">Upload file pembelajaran baru</div>
                  </div>
                </div>
              </Link>
              <Link
                to={`/dosen/matkul/${courseId}?create=tugas&pertemuan=${pertemuan}`}
                className="p-4 bg-lp-surface border border-lp-border rounded-xl hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border transition-all duration-300 hover:-translate-y-1 hover:border-lp-text2 group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-lp-bg rounded-xl group-hover:bg-lp-surface transition-colors">
                    <FiCalendar className="text-lp-text2" />
                  </div>
                  <div>
                    <div className="font-medium text-lp-text font-semibold tracking-tight">Buat Tugas</div>
                    <div className="text-sm text-lp-text3 font-light">Buat penugasan baru</div>
                  </div>
                </div>
              </Link>
              <Link
                to={`/dosen/penilaian/${courseId}?pertemuan=${pertemuan}`}
                className="p-4 bg-lp-surface border border-lp-border rounded-xl hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border transition-all duration-300 hover:-translate-y-1 hover:border-lp-text2 group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-lp-bg rounded-xl group-hover:bg-lp-surface transition-colors">
                    <FiBarChart2 className="text-lp-text2" />
                  </div>
                  <div>
                    <div className="font-medium text-lp-text font-semibold tracking-tight">Lihat Penilaian</div>
                    <div className="text-sm text-lp-text3 font-light">Kelola nilai mahasiswa</div>
                  </div>
                </div>
              </Link>
            </div>
          </div>

          {/* Delete Confirmation Modal */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[90] animate-fadeIn">
              <div className="bg-lp-surface rounded-2xl p-8 w-full max-w-md shadow-2xl animate-slideUp">
                <div className="text-center mb-6">
                  <div className="p-3 bg-lp-bg rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <FiTrash2 className="text-2xl text-lp-text2" />
                  </div>
                  <h3 className="text-xl font-bold text-lp-text font-semibold tracking-tight mb-2">
                    Konfirmasi Penghapusan
                  </h3>
                  <p className="text-lp-text2 font-light">
                    {showDeleteConfirm.type === 'materi'
                      ? 'Apakah Anda yakin ingin menghapus materi ini?'
                      : 'Apakah Anda yakin ingin menghapus tugas ini? Semua pengumpulan mahasiswa juga akan dihapus.'}
                  </p>
                </div>
                
                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(null)}
                    className="px-6 py-3 bg-lp-surface border border-lp-border text-lp-text2 rounded-xl font-medium hover:bg-lp-bg transition-all duration-300"
                  >
                    Batal
                  </button>
                  <button
                    onClick={() => {
                      if (showDeleteConfirm.type === 'materi') {
                        handleDeleteMateri(showDeleteConfirm.id)
                      } else {
                        handleDeleteTugas(showDeleteConfirm.id)
                      }
                      setShowDeleteConfirm(null)
                    }}
                    className="px-6 py-3 bg-lp-text text-white border-none rounded-xl font-medium hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border transition-all duration-300 hover:-translate-y-0.5"
                  >
                    Ya, Hapus
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Custom CSS */}
          <style jsx>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes slideUp {
              from { 
                opacity: 0;
                transform: translateY(20px);
              }
              to { 
                opacity: 1;
                transform: translateY(0);
              }
            }
            .animate-fadeIn {
              animation: fadeIn 0.3s ease-out;
            }
            .animate-slideUp {
              animation: slideUp 0.4s ease-out;
            }
            .line-clamp-2 {
              display: -webkit-box;
              -webkit-line-clamp: 2;
              -webkit-box-orient: vertical;
              overflow: hidden;
            }
          `}</style>
        </div>
      </div>
    </div>
  )
}

export default DetailPertemuanDosen