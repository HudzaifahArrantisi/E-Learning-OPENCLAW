import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import api from '../../services/api'
import { resolveBackendAssetUrl } from '../../utils/assetUrl'
import { 
  FiUpload, FiFileText, FiEye, FiTrash2, FiDownload, 
  FiCalendar, FiChevronLeft, FiChevronRight, FiPlus,
  FiGrid, FiList, FiClock, FiCheckCircle, FiXCircle,
  FiEdit2, FiMoreVertical, FiBookOpen, FiFile, FiFilter
} from 'react-icons/fi'

const KelolaMatkulDosen = () => {
  const { courseId } = useParams()
  const [pertemuanList, setPertemuanList] = useState([])
  const [showUploadMateri, setShowUploadMateri] = useState(false)
  const [showCreateTugas, setShowCreateTugas] = useState(false)
  const [showDetailPertemuan, setShowDetailPertemuan] = useState(false)
  const [selectedPertemuan, setSelectedPertemuan] = useState(null)
  const [pertemuanDetail, setPertemuanDetail] = useState({ materi: [], tugas: [] })
  const [formData, setFormData] = useState({
    pertemuan: '',
    title: '',
    desc: '',
    due_date: '',
    file: null,
    file_tugas: null
  })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [viewMode, setViewMode] = useState('grid') 

  useEffect(() => {
    fetchPertemuanList()
  }, [courseId])

  const fetchPertemuanList = async () => {
    try {
      setLoading(true)
      const response = await api.getPertemuanList(courseId, 'dosen')
      setPertemuanList(response.data.data || [])
    } catch (error) {
      console.error('Error fetching pertemuan:', error)
      alert('Gagal memuat pertemuan: ' + (error.response?.data?.message || error.message))
    } finally {
      setLoading(false)
    }
  }

  const fetchPertemuanDetail = async (pertemuan) => {
    try {
      setDetailLoading(true)
      const response = await api.getDosenPertemuanDetail(courseId, pertemuan)
      setPertemuanDetail(response.data.data)
      setSelectedPertemuan(pertemuan)
      setShowDetailPertemuan(true)
    } catch (error) {
      console.error('Error fetching pertemuan detail:', error)
      alert('Gagal memuat detail pertemuan: ' + (error.response?.data?.message || error.message))
    } finally {
      setDetailLoading(false)
    }
  }

  const handleUploadMateri = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const data = new FormData()
      data.append('course_id', courseId)
      data.append('pertemuan', formData.pertemuan)
      data.append('title', formData.title)
      data.append('desc', formData.desc)
      if (formData.file) data.append('file', formData.file)

      await api.uploadMateri(data)
      alert('Materi berhasil diupload!')
      setShowUploadMateri(false)
      setFormData(prev => ({ ...prev, title: '', desc: '', file: null }))
      fetchPertemuanList()
    } catch (error) {
      console.error('Error uploading materi:', error)
      alert('Gagal upload materi: ' + (error.response?.data?.message || error.message))
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreateTugas = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const data = new FormData()
      data.append('course_id', courseId)
      data.append('pertemuan', formData.pertemuan)
      data.append('title', formData.title)
      data.append('desc', formData.desc)
      data.append('due_date', formData.due_date)
      if (formData.file_tugas) data.append('file_tugas', formData.file_tugas)

      await api.createTugas(data)
      alert('Tugas berhasil dibuat!')
      setShowCreateTugas(false)
      setFormData(prev => ({ ...prev, title: '', desc: '', due_date: '', file_tugas: null }))
      fetchPertemuanList()
    } catch (error) {
      console.error('Error creating tugas:', error)
      alert('Gagal membuat tugas: ' + (error.response?.data?.message || error.message))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteMateri = async (materiId) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus materi ini?')) {
      return
    }

    try {
      await api.deleteMateri(materiId)
      alert('Materi berhasil dihapus!')
      if (selectedPertemuan) {
        fetchPertemuanDetail(selectedPertemuan)
      }
      fetchPertemuanList()
    } catch (error) {
      console.error('Error deleting materi:', error)
      alert('Gagal menghapus materi: ' + (error.response?.data?.message || error.message))
    }
  }

  const handleDeleteTugas = async (tugasId) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus tugas ini? Semua pengumpulan mahasiswa juga akan dihapus.')) {
      return
    }

    try {
      await api.deleteTugas(tugasId)
      alert('Tugas berhasil dihapus!')
      if (selectedPertemuan) {
        fetchPertemuanDetail(selectedPertemuan)
      }
      fetchPertemuanList()
    } catch (error) {
      console.error('Error deleting tugas:', error)
      alert('Gagal menghapus tugas: ' + (error.response?.data?.message || error.message))
    }
  }

  const handleFileChange = (e, field) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.files[0]
    }))
  }

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  const matkulData = {
    'KP001': 'Komputasi Paralel & Terdistribusi',
    'KW002': 'Keamanan Web',
    'PBO001': 'Pemrograman Berorientasi Objek',
    'DEV001': 'DevOpsSec',
    'RPL001': 'Rekayasa Perangkat Lunak',
    'KWU001': 'Kewirausahaan',
    'BI002': 'Bahasa Inggris 2',
    'IR001': 'Incident Response'
  }

  // Frontend blocker for invalid course IDs
  if (!matkulData[courseId]) {
    window.location.href = '/not-found';
    return null;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen bg-lp-bg">
        <Sidebar role="dosen" isOpen={sidebarOpen} onClose={toggleSidebar} />
        <div className="flex-1 lg:ml-0 transition-all duration-300">
          <div className="p-6 lg:p-8">
            {/* Skeleton Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="lg:hidden p-3 rounded-xl bg-lp-surface/50 backdrop-blur-sm shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border animate-pulse">
                  <div className="w-6 h-6 bg-gray-200 rounded"></div>
                </div>
                <div>
                  <div className="h-8 w-64 bg-lp-bg rounded-lg animate-pulse mb-2"></div>
                  <div className="h-4 w-48 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="h-12 w-32 bg-gray-200 rounded-xl animate-pulse"></div>
                <div className="h-12 w-32 bg-gray-200 rounded-xl animate-pulse"></div>
              </div>
            </div>

            {/* Skeleton Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[1,2,3,4,5,6,7,8].map(item => (
                <div key={item} className="bg-lp-surface/50 backdrop-blur-sm rounded-2xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border animate-pulse">
                  <div className="flex justify-between items-center mb-4">
                    <div className="h-6 w-24 bg-gray-200 rounded"></div>
                    <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                  </div>
                  <div className="space-y-3">
                    <div className="h-4 w-full bg-gray-200 rounded"></div>
                    <div className="h-4 w-3/4 bg-gray-200 rounded"></div>
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
                  <h1 className="text-3xl lg:text-4xl font-bold bg-lp-bg bg-clip-text text-transparent">
                    {matkulData[courseId] || courseId}
                  </h1>
                </div>
                <p className="text-lp-text2 font-light ml-16">Kelola materi dan tugas untuk setiap pertemuan</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link 
                to={`/dosen/penilaian/${courseId}`}
                className="group relative overflow-hidden px-6 py-3 bg-lp-accent text-white border-none rounded-xl font-medium shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 flex items-center gap-3"
              >
                <div className="absolute inset-0 bg-lp-surface/10 translate-x-[-100%] group-hover:translate-x-full transition-transform duration-1000"></div>
                <FiEye className="relative z-10" />
                <span className="relative z-10">Lihat Penilaian</span>
              </Link>

            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-lp-surface/80 backdrop-blur-sm rounded-2xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border border border-lp-border border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lp-text2 font-light text-sm mb-1">Total Pertemuan</p>
                  <h3 className="text-3xl font-bold text-lp-text font-semibold tracking-tight">{pertemuanList.length}</h3>
                </div>
                <div className="p-3 bg-blue-100 rounded-xl">
                  <FiGrid className="text-2xl text-lp-atext" />
                </div>
              </div>
            </div>
            <div className="bg-lp-surface/80 backdrop-blur-sm rounded-2xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border border border-lp-border border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lp-text2 font-light text-sm mb-1">Materi Tersedia</p>
                  <h3 className="text-3xl font-bold text-lp-text font-semibold tracking-tight">
                    {pertemuanList.filter(p => p.has_materi).length}
                  </h3>
                </div>
                <div className="p-3 bg-emerald-100 rounded-xl">
                  <FiFileText className="text-2xl text-emerald-600" />
                </div>
              </div>
            </div>
            <div className="bg-lp-surface/80 backdrop-blur-sm rounded-2xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border border border-lp-border border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lp-text2 font-light text-sm mb-1">Tugas Tersedia</p>
                  <h3 className="text-3xl font-bold text-lp-text font-semibold tracking-tight">
                    {pertemuanList.filter(p => p.has_tugas).length}
                  </h3>
                </div>
                <div className="p-3 bg-amber-100 rounded-xl">
                  <FiCalendar className="text-2xl text-amber-600" />
                </div>
              </div>
            </div>
            <div className="bg-lp-surface/80 backdrop-blur-sm rounded-2xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border border border-lp-border border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lp-text2 font-light text-sm mb-1">Status Aktif</p>
                  <h3 className="text-3xl font-bold text-lp-text font-semibold tracking-tight">
                    {pertemuanList.filter(p => p.has_materi || p.has_tugas).length}
                  </h3>
                </div>
                <div className="p-3 bg-purple-100 rounded-xl">
                  <FiCheckCircle className="text-2xl text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="bg-lp-surface/80 backdrop-blur-sm rounded-2xl p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border border border-lp-border border mb-8">
            <h3 className="text-xl font-semibold text-lp-text font-semibold tracking-tight mb-6">Aksi Cepat</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <button
                onClick={() => setShowUploadMateri(true)}
                className="group relative overflow-hidden bg-lp-accent text-white border-none rounded-2xl p-6 text-left shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                <div className="absolute inset-0 bg-lp-surface/10 translate-x-[-100%] group-hover:translate-x-full transition-transform duration-1000"></div>
                <div className="relative flex items-start gap-4">
                  <div className="p-3 bg-lp-surface/20 rounded-xl">
                    <FiUpload className="text-2xl" />
                  </div>
                  <div>
                    <div className="text-xl font-semibold mb-2">Upload Materi</div>
                    <div className="text-blue-100">Tambah materi pembelajaran baru</div>
                  </div>
                </div>
              </button>
              <button
                onClick={() => setShowCreateTugas(true)}
                className="group relative overflow-hidden bg-lp-accent text-white border-none rounded-2xl p-6 text-left shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                <div className="absolute inset-0 bg-lp-surface/10 translate-x-[-100%] group-hover:translate-x-full transition-transform duration-1000"></div>
                <div className="relative flex items-start gap-4">
                  <div className="p-3 bg-lp-surface/20 rounded-xl">
                    <FiFileText className="text-2xl" />
                  </div>
                  <div>
                    <div className="text-xl font-semibold mb-2">Buat Tugas</div>
                    <div className="text-emerald-100">Buat tugas dan penilaian baru</div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Daftar Pertemuan Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold bg-lp-bg bg-clip-text text-transparent">
              Daftar Pertemuan
            </h2>
            <div className="flex items-center gap-3">
              <div className="bg-lp-surface/80 backdrop-blur-sm rounded-xl p-2 flex items-center gap-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-blue-100 text-lp-atext' : 'text-lp-text3 font-light hover:bg-gray-100'}`}
                >
                  <FiGrid className="text-lg" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-blue-100 text-lp-atext' : 'text-lp-text3 font-light hover:bg-gray-100'}`}
                >
                  <FiList className="text-lg" />
                </button>
              </div>
              <button
                onClick={fetchPertemuanList}
                className="p-3 bg-lp-surface/80 backdrop-blur-sm rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border hover:shadow-xl transition-all duration-300 hover:rotate-180"
              >
                <FiClock className="text-lg text-lp-text2" />
              </button>
            </div>
          </div>

          {/* Daftar Pertemuan Grid */}
          <div className={`grid ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'} gap-6`}>
            {pertemuanList.map((pertemuan, index) => (
              <div 
                key={index}
                className="group bg-lp-surface/80 backdrop-blur-sm rounded-2xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border border border-lp-border border hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 cursor-pointer"
                onClick={() => fetchPertemuanDetail(pertemuan.pertemuan)}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${pertemuan.has_materi && pertemuan.has_tugas ? 'bg-emerald-500' : pertemuan.has_materi || pertemuan.has_tugas ? 'bg-amber-500' : 'bg-gray-300'}`}></div>
                    <h3 className="font-bold text-lg text-lp-text font-semibold tracking-tight">Pertemuan {pertemuan.pertemuan}</h3>
                  </div>
                  <FiChevronRight className="text-gray-400 group-hover:text-lp-atext transition-colors" />
                </div>
                
                <div className="space-y-4 mb-6">
                  <div className="flex items-center justify-between">
                    <span className="text-lp-text2 font-light text-sm flex items-center gap-2">
                      <FiFileText className="text-gray-400" /> Materi
                    </span>
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${pertemuan.has_materi ? "bg-emerald-100 text-emerald-800 border border-emerald-200" : "bg-gray-100 text-lp-text font-semibold tracking-tight border border-lp-border border"}`}>
                      {pertemuan.has_materi ? <FiCheckCircle /> : <FiXCircle />}
                      {pertemuan.has_materi ? "Tersedia" : "Belum"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-lp-text2 font-light text-sm flex items-center gap-2">
                      <FiCalendar className="text-gray-400" /> Tugas
                    </span>
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${pertemuan.has_tugas ? "bg-amber-100 text-amber-800 border border-amber-200" : "bg-gray-100 text-lp-text font-semibold tracking-tight border border-lp-border border"}`}>
                      {pertemuan.has_tugas ? <FiCheckCircle /> : <FiXCircle />}
                      {pertemuan.has_tugas ? "Tersedia" : "Belum"}
                    </span>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-lp-border border">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      fetchPertemuanDetail(pertemuan.pertemuan);
                    }}
                    className="w-full py-3 bg-lp-bg text-lp-text2 rounded-xl font-medium shadow-sm hover:shadow-sm border border-lp-border transition-all duration-300 hover:text-lp-atext flex items-center justify-center gap-2 border border-lp-border border hover:border-blue-300"
                  >
                    <FiEye />
                    Lihat Detail
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Modal Upload Materi */}
          {showUploadMateri && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
              <div className="bg-lp-surface rounded-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-slideUp">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-lp-bg rounded-xl">
                      <FiUpload className="text-2xl text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-lp-text font-semibold tracking-tight">Upload Materi Baru</h3>
                      <p className="text-lp-text2 font-light">Tambahkan materi pembelajaran untuk mahasiswa</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowUploadMateri(false)}
                    className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    <FiXCircle className="text-2xl text-gray-400 hover:text-lp-text2 font-light" />
                  </button>
                </div>
                
                <form onSubmit={handleUploadMateri} className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-lp-text2 mb-2">Pertemuan *</label>
                      <div className="relative">
                        <select
                          value={formData.pertemuan}
                          onChange={(e) => setFormData(prev => ({ ...prev, pertemuan: e.target.value }))}
                          className="w-full border border-lp-border border rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-lp-surface/50 backdrop-blur-sm"
                          required
                        >
                          <option value="">Pilih Pertemuan</option>
                          {Array.from({ length: 16 }, (_, i) => i + 1).map(pertemuan => (
                            <option key={pertemuan} value={pertemuan}>
                              Pertemuan {pertemuan}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-lp-text2 mb-2">Judul Materi *</label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full border border-lp-border border rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-lp-surface/50 backdrop-blur-sm"
                        placeholder="Contoh: Pengenalan Python"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-lp-text2 mb-2">Deskripsi</label>
                    <textarea
                      value={formData.desc}
                      onChange={(e) => setFormData(prev => ({ ...prev, desc: e.target.value }))}
                      className="w-full border border-lp-border border rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-lp-surface/50 backdrop-blur-sm"
                      rows="4"
                      placeholder="Deskripsi materi..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-lp-text2 mb-2">File Materi *</label>
                    <div className="border-2 border-dashed border-lp-border border rounded-2xl p-8 text-center bg-lp-bg/50 hover:border-blue-400 transition-colors cursor-pointer">
                      <input
                        type="file"
                        onChange={(e) => handleFileChange(e, 'file')}
                        className="hidden"
                        id="file-upload"
                        accept=".pdf,.ppt,.pptx,.doc,.docx,.zip,.jpg,.jpeg,.png"
                        required
                      />
                      <label htmlFor="file-upload" className="cursor-pointer">
                        <div className="p-4 bg-blue-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                          <FiUpload className="text-3xl text-lp-atext" />
                        </div>
                        <div className="text-lp-text2 font-medium mb-2">Klik untuk upload file</div>
                        <div className="text-sm text-lp-text3 font-light">
                          PDF, PPT, DOC, ZIP, JPG, PNG (Max: 32MB)
                        </div>
                      </label>
                    </div>
                    {formData.file && (
                      <div className="mt-4 p-4 bg-lp-bg rounded-xl border border-emerald-200 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-emerald-100 rounded-lg">
                            <FiFile className="text-emerald-600" />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-lp-text font-semibold tracking-tight">{formData.file.name}</div>
                            <div className="text-sm text-lp-text3 font-light">
                              {(formData.file.size / (1024 * 1024)).toFixed(2)} MB
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, file: null }))}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <FiTrash2 className="text-gray-400 hover:text-red-500" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-end gap-3 pt-6 border-t border-lp-border border">
                    <button
                      type="button"
                      onClick={() => setShowUploadMateri(false)}
                      className="px-8 py-3 bg-lp-surface border border-lp-border border text-lp-text2 rounded-xl font-medium shadow-sm hover:shadow-sm border border-lp-border transition-all duration-300 hover:bg-lp-bg"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="group relative overflow-hidden px-8 py-3 bg-lp-accent text-white border-none rounded-xl font-medium shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 flex items-center gap-2"
                    >
                      <div className="absolute inset-0 bg-lp-surface/10 translate-x-[-100%] group-hover:translate-x-full transition-transform duration-1000"></div>
                      {submitting ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Mengupload...
                        </>
                      ) : (
                        <>
                          <FiUpload className="relative z-10" />
                          <span className="relative z-10">Upload Materi</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal Buat Tugas */}
          {showCreateTugas && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
              <div className="bg-lp-surface rounded-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-slideUp">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-lp-bg rounded-xl">
                      <FiFileText className="text-2xl text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-lp-text font-semibold tracking-tight">Buat Tugas Baru</h3>
                      <p className="text-lp-text2 font-light">Buat tugas dan tentukan deadline pengumpulan</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowCreateTugas(false)}
                    className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    <FiXCircle className="text-2xl text-gray-400 hover:text-lp-text2 font-light" />
                  </button>
                </div>
                
                <form onSubmit={handleCreateTugas} className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-lp-text2 mb-2">Pertemuan *</label>
                      <div className="relative">
                        <select
                          value={formData.pertemuan}
                          onChange={(e) => setFormData(prev => ({ ...prev, pertemuan: e.target.value }))}
                          className="w-full border border-lp-border border rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-lp-surface/50 backdrop-blur-sm"
                          required
                        >
                          <option value="">Pilih Pertemuan</option>
                          {Array.from({ length: 16 }, (_, i) => i + 1).map(pertemuan => (
                            <option key={pertemuan} value={pertemuan}>
                              Pertemuan {pertemuan}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-lp-text2 mb-2">Judul Tugas *</label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full border border-lp-border border rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-lp-surface/50 backdrop-blur-sm"
                        placeholder="Contoh: Tugas Pemrograman 1"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-lp-text2 mb-2">Deskripsi Tugas *</label>
                    <textarea
                      value={formData.desc}
                      onChange={(e) => setFormData(prev => ({ ...prev, desc: e.target.value }))}
                      className="w-full border border-lp-border border rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-lp-surface/50 backdrop-blur-sm"
                      rows="4"
                      placeholder="Instruksi dan ketentuan tugas..."
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-lp-text2 mb-2">Batas Pengumpulan</label>
                      <div className="relative">
                        <FiCalendar className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type="datetime-local"
                          value={formData.due_date}
                          onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                          className="w-full border border-lp-border border rounded-xl pl-12 pr-4 py-3.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-lp-surface/50 backdrop-blur-sm"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-lp-text2 mb-2">File Tugas (Opsional)</label>
                      <div className="border-2 border-dashed border-lp-border border rounded-2xl p-6 text-center bg-lp-bg/50 hover:border-blue-400 transition-colors cursor-pointer">
                        <input
                          type="file"
                          onChange={(e) => handleFileChange(e, 'file_tugas')}
                          className="hidden"
                          id="file-tugas-upload"
                          accept=".pdf,.doc,.docx,.zip,.jpg,.jpeg,.png"
                        />
                        <label htmlFor="file-tugas-upload" className="cursor-pointer">
                          <div className="p-3 bg-emerald-100 rounded-full w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                            <FiUpload className="text-xl text-emerald-600" />
                          </div>
                          <div className="text-lp-text2 font-medium mb-1">Klik untuk upload file tugas</div>
                          <div className="text-sm text-lp-text3 font-light">
                            PDF, DOC, ZIP, JPG, PNG (Max: 32MB)
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                  
                  {formData.file_tugas && (
                    <div className="p-4 bg-lp-bg rounded-xl border border-emerald-200 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 rounded-lg">
                          <FiFile className="text-emerald-600" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-lp-text font-semibold tracking-tight">{formData.file_tugas.name}</div>
                          <div className="text-sm text-lp-text3 font-light">
                            {(formData.file_tugas.size / (1024 * 1024)).toFixed(2)} MB
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, file_tugas: null }))}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <FiTrash2 className="text-gray-400 hover:text-red-500" />
                        </button>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-end gap-3 pt-6 border-t border-lp-border border">
                    <button
                      type="button"
                      onClick={() => setShowCreateTugas(false)}
                      className="px-8 py-3 bg-lp-surface border border-lp-border border text-lp-text2 rounded-xl font-medium shadow-sm hover:shadow-sm border border-lp-border transition-all duration-300 hover:bg-lp-bg"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="group relative overflow-hidden px-8 py-3 bg-lp-accent text-white border-none rounded-xl font-medium shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 flex items-center gap-2"
                    >
                      <div className="absolute inset-0 bg-lp-surface/10 translate-x-[-100%] group-hover:translate-x-full transition-transform duration-1000"></div>
                      {submitting ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Membuat...
                        </>
                      ) : (
                        <>
                          <FiPlus className="relative z-10" />
                          <span className="relative z-10">Buat Tugas</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal Detail Pertemuan */}
          {showDetailPertemuan && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
              <div className="bg-lp-surface rounded-2xl p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl animate-slideUp">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-lp-bg rounded-xl">
                      <FiBookOpen className="text-2xl text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-lp-text font-semibold tracking-tight">
                        Pertemuan {selectedPertemuan}
                      </h3>
                      <p className="text-lp-text2 font-light">{matkulData[courseId] || courseId}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowDetailPertemuan(false)}
                    className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    <FiXCircle className="text-2xl text-gray-400 hover:text-lp-text2 font-light" />
                  </button>
                </div>
                
                {detailLoading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                    <p className="text-lp-text2 font-light">Memuat detail pertemuan...</p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {/* Materi Section */}
                    <div>
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <FiFileText className="text-xl text-lp-atext" />
                          </div>
                          <h4 className="text-xl font-semibold text-lp-text font-semibold tracking-tight">Materi</h4>
                          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                            {pertemuanDetail.materi?.length || 0} item
                          </span>
                        </div>
                        <button
                          onClick={() => setShowUploadMateri(true)}
                          className="px-4 py-2 bg-lp-accent text-white border-none rounded-lg font-medium hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border transition-all duration-300 flex items-center gap-2"
                        >
                          <FiPlus />
                          Tambah Materi
                        </button>
                      </div>
                      
                      {pertemuanDetail.materi && pertemuanDetail.materi.length > 0 ? (
                        <div className="grid gap-4">
                          {pertemuanDetail.materi.map((materi, index) => (
                            <div key={index} className="bg-lp-bg border border-lp-border border rounded-2xl p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5">
                              <div className="flex justify-between items-start mb-4">
                                <div className="flex-1">
                                  <h5 className="font-bold text-lp-text font-semibold tracking-tight text-lg mb-2">{materi.title}</h5>
                                  {materi.desc && <p className="text-lp-text2 font-light mb-3">{materi.desc}</p>}
                                </div>
                                <div className="flex gap-2">
                                  {materi.file_path && (
                                    <a 
                                      href={resolveBackendAssetUrl(materi.file_path)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-2 bg-blue-100 text-lp-atext rounded-lg hover:bg-blue-200 transition-colors"
                                      title="Download"
                                    >
                                      <FiDownload />
                                    </a>
                                  )}
                                  <button
                                    onClick={() => handleDeleteMateri(materi.id)}
                                    className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                                    title="Hapus"
                                  >
                                    <FiTrash2 />
                                  </button>
                                </div>
                              </div>
                              <div className="flex items-center justify-between text-sm text-lp-text3 font-light pt-4 border-t border-lp-border border">
                                <span className="flex items-center gap-2">
                                  <FiClock />
                                  Diupload: {new Date(materi.created_at).toLocaleString('id-ID')}
                                </span>
                                <span className="px-2 py-1 bg-gray-100 rounded-md text-xs">
                                  {materi.file_path?.split('.').pop().toUpperCase()}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12 border-2 border-dashed border-lp-border border rounded-2xl bg-lp-bg/50">
                          <div className="p-4 bg-blue-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                            <FiFileText className="text-3xl text-lp-atext" />
                          </div>
                          <p className="text-lp-text3 font-light">Belum ada materi untuk pertemuan ini.</p>
                          <button
                            onClick={() => {
                              setShowDetailPertemuan(false)
                              setShowUploadMateri(true)
                            }}
                            className="mt-4 px-4 py-2 bg-lp-accent text-white border-none rounded-lg font-medium hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border transition-all duration-300 flex items-center gap-2 mx-auto"
                          >
                            <FiPlus />
                            Tambah Materi Pertama
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Tugas Section */}
                    <div>
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-emerald-100 rounded-lg">
                            <FiCalendar className="text-xl text-emerald-600" />
                          </div>
                          <h4 className="text-xl font-semibold text-lp-text font-semibold tracking-tight">Tugas</h4>
                          <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-sm font-medium">
                            {pertemuanDetail.tugas?.length || 0} item
                          </span>
                        </div>
                        <button
                          onClick={() => setShowCreateTugas(true)}
                          className="px-4 py-2 bg-lp-accent text-white border-none rounded-lg font-medium hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border transition-all duration-300 flex items-center gap-2"
                        >
                          <FiPlus />
                          Buat Tugas
                        </button>
                      </div>
                      
                      {pertemuanDetail.tugas && pertemuanDetail.tugas.length > 0 ? (
                        <div className="grid gap-4">
                          {pertemuanDetail.tugas.map((tugas, index) => (
                            <div key={index} className="bg-lp-bg border border-lp-border border rounded-2xl p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5">
                              <div className="flex justify-between items-start mb-4">
                                <div className="flex-1">
                                  <h5 className="font-bold text-lp-text font-semibold tracking-tight text-lg mb-2">{tugas.title}</h5>
                                  {tugas.desc && <p className="text-lp-text2 font-light mb-3">{tugas.desc}</p>}
                                </div>
                                <div className="flex gap-2">
                                  {tugas.file_path && (
                                    <a 
                                      href={resolveBackendAssetUrl(tugas.file_path)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-2 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200 transition-colors"
                                      title="File Tugas"
                                    >
                                      <FiFile />
                                    </a>
                                  )}
                                  <Link
                                    to={`/dosen/penilaian/${courseId}?pertemuan=${selectedPertemuan}`}
                                    className="p-2 bg-blue-100 text-lp-atext rounded-lg hover:bg-blue-200 transition-colors"
                                    title="Lihat Pengumpulan"
                                  >
                                    <FiEye />
                                  </Link>
                                  <button
                                    onClick={() => handleDeleteTugas(tugas.id)}
                                    className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                                    title="Hapus"
                                  >
                                    <FiTrash2 />
                                  </button>
                                </div>
                              </div>
                              
                              {tugas.due_date && (
                                <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-lp-bg border border-amber-200 rounded-lg">
                                  <FiClock className="text-amber-600" />
                                  <span className="text-sm font-medium text-amber-800">
                                    Batas: {new Date(tugas.due_date).toLocaleString('id-ID')}
                                  </span>
                                </div>
                              )}
                              
                              <div className="flex items-center justify-between text-sm text-lp-text3 font-light pt-4 border-t border-lp-border border">
                                <span className="flex items-center gap-2">
                                  <FiClock />
                                  Dibuat: {new Date(tugas.created_at).toLocaleString('id-ID')}
                                </span>
                                <Link
                                  to={`/dosen/penilaian/${courseId}?pertemuan=${selectedPertemuan}`}
                                  className="px-3 py-1.5 bg-lp-accent text-white border-none rounded-lg text-sm font-medium hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border transition-all duration-300 flex items-center gap-2"
                                >
                                  <FiEye />
                                  Lihat Pengumpulan
                                </Link>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12 border-2 border-dashed border-lp-border border rounded-2xl bg-lp-bg/50">
                          <div className="p-4 bg-emerald-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                            <FiCalendar className="text-3xl text-emerald-600" />
                          </div>
                          <p className="text-lp-text3 font-light">Belum ada tugas untuk pertemuan ini.</p>
                          <button
                            onClick={() => {
                              setShowDetailPertemuan(false)
                              setShowCreateTugas(true)
                            }}
                            className="mt-4 px-4 py-2 bg-lp-accent text-white border-none rounded-lg font-medium hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border transition-all duration-300 flex items-center gap-2 mx-auto"
                          >
                            <FiPlus />
                            Buat Tugas Pertama
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Custom CSS for animations */}
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
      `}</style>
    </div>
  )
}

export default KelolaMatkulDosen
