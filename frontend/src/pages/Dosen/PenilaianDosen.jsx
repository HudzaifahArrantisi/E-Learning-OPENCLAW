
import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import api from '../../services/api'
import { resolveBackendAssetUrl } from '../../utils/assetUrl'
import {
  FiBarChart2, FiBookOpen, FiFilter, FiSearch,
  FiDownload, FiEye, FiCheckCircle, FiXCircle,
  FiClock, FiUser, FiFileText, FiCalendar,
  FiChevronRight, FiArrowLeft, FiRefreshCw,
  FiEdit2, FiTrash2, FiSave, FiPercent,
  FiTrendingUp, FiTrendingDown, FiUsers,
  FiFile, FiCheck, FiX
} from 'react-icons/fi'

const PenilaianDosen = () => {
  const { courseId } = useParams()
  const [submissions, setSubmissions] = useState([])
  const [filterPertemuan, setFilterPertemuan] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [grading, setGrading] = useState({})
  const [gradeInputs, setGradeInputs] = useState({})
  const [showAnswerModal, setShowAnswerModal] = useState(false)
  const [selectedAnswer, setSelectedAnswer] = useState('')
  const [deleting, setDeleting] = useState({})
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sortBy, setSortBy] = useState('latest') // 'latest', 'grade', 'name'
  const [showStats, setShowStats] = useState(true)

  useEffect(() => {
    if (courseId) {
      fetchSubmissions()
    }
  }, [courseId, filterPertemuan])
  
  const fetchSubmissions = async () => {
    try {
      setLoading(true)
      const response = await api.getTugasSubmissions(courseId, filterPertemuan)
      const submissionsArray = Array.isArray(response.data?.data?.submissions)
        ? response.data.data.submissions
        : []

      // Sort submissions
      let sortedSubmissions = [...submissionsArray]
      if (sortBy === 'grade') {
        sortedSubmissions.sort((a, b) => (b.grade || 0) - (a.grade || 0))
      } else if (sortBy === 'name') {
        sortedSubmissions.sort((a, b) => a.student_name.localeCompare(b.student_name))
      } else {
        sortedSubmissions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      }

      setSubmissions(sortedSubmissions)
      
      const initialGrades = {}
      sortedSubmissions.forEach(submission => {
        initialGrades[submission.id] = submission.grade ?? ''
      })
      setGradeInputs(initialGrades)
    } catch (error) {
      console.error('Error fetching submissions:', error)
      alert('Gagal memuat pengumpulan tugas: ' + (error.response?.data?.message || error.message))
    } finally {
      setLoading(false)
    }
  }

  const handleGradeChange = (submissionId, value) => {
    setGradeInputs(prev => ({
      ...prev,
      [submissionId]: value
    }))
  }

  const handleGrade = async (submissionId) => {
    const grade = gradeInputs[submissionId]
    
    if (!grade || grade < 0 || grade > 100) {
      alert('Nilai harus antara 0-100')
      return
    }

    setGrading(prev => ({ ...prev, [submissionId]: true }))
    try {
      await api.gradeSubmission(submissionId, parseFloat(grade))
      fetchSubmissions()
      alert('Nilai berhasil disimpan!')
    } catch (error) {
      console.error('Error grading submission:', error)
      alert('Gagal menyimpan nilai: ' + (error.response?.data?.message || error.message))
    } finally {
      setGrading(prev => ({ ...prev, [submissionId]: false }))
    }
  }

  const handleDeleteSubmission = async (submissionId) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus pengumpulan tugas ini?')) {
      return
    }

    setDeleting(prev => ({ ...prev, [submissionId]: true }))
    try {
      await api.deleteSubmission(submissionId)
      alert('Pengumpulan tugas berhasil dihapus!')
      fetchSubmissions()
    } catch (error) {
      console.error('Error deleting submission:', error)
      alert('Gagal menghapus pengumpulan: ' + (error.response?.data?.message || error.message))
    } finally {
      setDeleting(prev => ({ ...prev, [submissionId]: false }))
    }
  }

  const showAnswer = (answerText) => {
    setSelectedAnswer(answerText)
    setShowAnswerModal(true)
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

  const filteredSubmissions = submissions.filter(submission =>
    searchTerm === '' ||
    submission.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    submission.student_nim.toLowerCase().includes(searchTerm.toLowerCase()) ||
    submission.task_title.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const gradedCount = submissions.filter(s => s.grade !== null && s.grade !== undefined && s.grade > 0).length
  const averageGrade = submissions.length > 0 
    ? (submissions.reduce((sum, s) => sum + (s.grade || 0), 0) / submissions.length).toFixed(1)
    : 0

  const getGradeColor = (grade) => {
    if (grade >= 80) return 'text-emerald-600 bg-emerald-100 border-emerald-200'
    if (grade >= 70) return 'text-amber-600 bg-amber-100 border-amber-200'
    if (grade >= 60) return 'text-orange-600 bg-orange-100 border-orange-200'
    return 'text-red-600 bg-red-100 border-red-200'
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
                  <div className="h-8 w-64 bg-lp-bg rounded-lg animate-pulse mb-2"></div>
                  <div className="h-4 w-48 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="h-12 w-32 bg-gray-200 rounded-xl animate-pulse"></div>
                <div className="h-12 w-32 bg-gray-200 rounded-xl animate-pulse"></div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[1,2,3,4].map(item => (
                <div key={item} className="bg-lp-surface/50 backdrop-blur-sm rounded-2xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border animate-pulse">
                  <div className="h-6 w-24 bg-gray-200 rounded mb-4"></div>
                  <div className="h-10 w-16 bg-gray-300 rounded"></div>
                </div>
              ))}
            </div>

            <div className="bg-lp-surface/50 backdrop-blur-sm rounded-2xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border animate-pulse">
              <div className="h-6 w-32 bg-gray-200 rounded mb-4"></div>
              {[1,2,3].map(item => (
                <div key={item} className="h-20 bg-gray-200 rounded-xl mb-3"></div>
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
                    <FiBarChart2 className="text-2xl text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl lg:text-4xl font-bold bg-lp-bg bg-clip-text text-transparent">
                      Penilaian Tugas
                    </h1>
                    <p className="text-lp-text2 font-light ml-16">
                      {matkulData[courseId] || courseId} • {submissions.length} pengumpulan
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link 
                to={`/dosen/matkul/${courseId}`}
                className="group relative overflow-hidden px-6 py-3 bg-lp-accent text-white border-none rounded-xl font-medium shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 flex items-center gap-3"
              >
                <div className="absolute inset-0 bg-lp-surface/10 translate-x-[-100%] group-hover:translate-x-full transition-transform duration-1000"></div>
                <FiBookOpen className="relative z-10" />
                <span className="relative z-10">Kelola Matkul</span>
              </Link>
              <Link 
                to="/dosen/course/"
                className="px-6 py-3 bg-lp-surface/80 backdrop-blur-sm border border-lp-border border text-lp-text2 rounded-xl font-medium shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border hover:shadow-xl transition-all duration-300 hover:bg-lp-surface flex items-center gap-3"
              >
                <FiArrowLeft />
                Daftar Matkul
              </Link>
            </div>
          </div>

          {/* Stats Cards */}
          {showStats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-lp-surface/80 backdrop-blur-sm rounded-2xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border border border-lp-border border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lp-text2 font-light text-sm mb-1">Total Pengumpulan</p>
                    <h3 className="text-3xl font-bold text-lp-text font-semibold tracking-tight">{submissions.length}</h3>
                  </div>
                  <div className="p-3 bg-lp-bg rounded-xl">
                    <FiFileText className="text-2xl text-lp-atext" />
                  </div>
                </div>
              </div>
              <div className="bg-lp-surface/80 backdrop-blur-sm rounded-2xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border border border-lp-border border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lp-text2 font-light text-sm mb-1">Sudah Dinilai</p>
                    <h3 className="text-3xl font-bold text-lp-text font-semibold tracking-tight">{gradedCount}</h3>
                  </div>
                  <div className="p-3 bg-lp-bg rounded-xl">
                    <FiCheckCircle className="text-2xl text-emerald-600" />
                  </div>
                </div>
              </div>
              <div className="bg-lp-surface/80 backdrop-blur-sm rounded-2xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border border border-lp-border border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lp-text2 font-light text-sm mb-1">Belum Dinilai</p>
                    <h3 className="text-3xl font-bold text-lp-text font-semibold tracking-tight">{submissions.length - gradedCount}</h3>
                  </div>
                  <div className="p-3 bg-lp-bg rounded-xl">
                    <FiClock className="text-2xl text-amber-600" />
                  </div>
                </div>
              </div>
              <div className="bg-lp-surface/80 backdrop-blur-sm rounded-2xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border border border-lp-border border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lp-text2 font-light text-sm mb-1">Rata-rata Nilai</p>
                    <h3 className="text-3xl font-bold text-lp-text font-semibold tracking-tight">{averageGrade}</h3>
                  </div>
                  <div className="p-3 bg-lp-bg rounded-xl">
                    <FiPercent className="text-2xl text-purple-600" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Control Panel */}
          <div className="bg-lp-surface/80 backdrop-blur-sm rounded-2xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border border border-lp-border border mb-8">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div>
                <label className="block text-sm font-semibold text-lp-text2 mb-2">Filter Pertemuan</label>
                <div className="relative">
                  <FiFilter className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <select
                    value={filterPertemuan}
                    onChange={(e) => setFilterPertemuan(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border border-lp-border border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-lp-surface/50 backdrop-blur-sm"
                  >
                    <option value="">Semua Pertemuan</option>
                    {Array.from({ length: 16 }, (_, i) => i + 1).map(pertemuan => (
                      <option key={pertemuan} value={pertemuan}>
                        Pertemuan {pertemuan}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-lp-text2 mb-2">Urutkan Berdasarkan</label>
                <div className="relative">
                  <FiTrendingUp className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <select
                    value={sortBy}
                    onChange={(e) => {
                      setSortBy(e.target.value)
                      fetchSubmissions()
                    }}
                    className="w-full pl-12 pr-4 py-3 border border-lp-border border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-lp-surface/50 backdrop-blur-sm"
                  >
                    <option value="latest">Terbaru</option>
                    <option value="grade">Nilai Tertinggi</option>
                    <option value="name">Nama Mahasiswa</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-lp-text2 mb-2">Cari Mahasiswa/Tugas</label>
                <div className="relative">
                  <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border border-lp-border border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-lp-surface/50 backdrop-blur-sm"
                    placeholder="Nama, NIM, atau judul tugas"
                  />
                </div>
              </div>
              
              <div className="flex items-end">
                <button
                  onClick={fetchSubmissions}
                  className="group relative overflow-hidden w-full px-6 py-3 bg-lp-accent text-white border-none rounded-xl font-medium shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 flex items-center justify-center gap-2"
                >
                  <div className="absolute inset-0 bg-lp-surface/10 translate-x-[-100%] group-hover:translate-x-full transition-transform duration-1000"></div>
                  <FiRefreshCw className="relative z-10" />
                  <span className="relative z-10">Refresh Data</span>
                </button>
              </div>
            </div>
            
            <div className="flex items-center justify-between mt-6 pt-6 border-t border-lp-border border">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowStats(!showStats)}
                  className="px-4 py-2 text-sm bg-gray-100 text-lp-text2 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  {showStats ? 'Sembunyikan Stats' : 'Tampilkan Stats'}
                </button>
              </div>
              <div className="text-sm text-lp-text3 font-light">
                Menampilkan {filteredSubmissions.length} dari {submissions.length} pengumpulan
              </div>
            </div>
          </div>

          {/* Submissions Table */}
          <div className="bg-lp-surface/80 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border border border-lp-border border overflow-hidden">
            {filteredSubmissions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px]">
                  <thead className="bg-lp-bg">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-lp-text2">Mahasiswa</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-lp-text2">Tugas</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-lp-text2">Pertemuan</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-lp-text2">File</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-lp-text2">Nilai</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-lp-text2">Status</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-lp-text2">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredSubmissions.map((submission, index) => (
                      <tr key={index} className="hover:bg-lp-bg/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-lp-bg rounded-lg">
                              <FiUser className="text-lp-atext" />
                            </div>
                            <div>
                              <div className="font-medium text-lp-text font-bold tracking-tight">{submission.student_name}</div>
                              <div className="text-sm text-lp-text3 font-light font-mono">{submission.student_nim}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="max-w-xs">
                            <div className="font-medium text-lp-text font-bold tracking-tight truncate">{submission.task_title}</div>
                            <div className="text-sm text-lp-text3 font-light mt-1">
                              {new Date(submission.created_at).toLocaleString('id-ID')}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-lp-bg text-blue-800 border border-blue-200">
                            P{submission.pertemuan}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {submission.file_url ? (
                            <a
                              href={resolveBackendAssetUrl(submission.file_url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-4 py-2 bg-lp-bg text-emerald-700 rounded-lg font-medium hover:shadow-sm border border-lp-border transition-all duration-300 hover:-translate-y-0.5 border border-emerald-200"
                            >
                              <FiDownload />
                              Download
                            </a>
                          ) : (
                            <span className="text-gray-400 text-sm flex items-center gap-2">
                              <FiX />
                              Tidak ada file
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <input
                                type="number"
                                value={gradeInputs[submission.id] || ''}
                                onChange={(e) => handleGradeChange(submission.id, e.target.value)}
                                className="w-24 border border-lp-border border rounded-xl px-4 py-2.5 text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-lp-surface/50 backdrop-blur-sm"
                                min="0"
                                max="100"
                                step="0.1"
                                placeholder="0-100"
                              />
                              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400">
                                <FiPercent className="text-sm" />
                              </div>
                            </div>
                            {submission.grade !== null && submission.grade !== undefined && submission.grade > 0 && (
                              <span className={`px-3 py-1.5 rounded-full text-sm font-medium border ${getGradeColor(submission.grade)}`}>
                                {submission.grade}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${submission.grade ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                            <span className="text-sm text-lp-text2 font-light">
                              {submission.grade ? 'Sudah Dinilai' : 'Belum Dinilai'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleGrade(submission.id)}
                              disabled={grading[submission.id]}
                              className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 hover:-translate-y-0.5 flex items-center gap-2 ${
                                grading[submission.id]
                                  ? 'bg-blue-100 text-lp-atext'
                                  : 'bg-lp-accent text-white border-none hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border'
                              }`}
                            >
                              {grading[submission.id] ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                  <span>Menyimpan...</span>
                                </>
                              ) : (
                                <>
                                  <FiSave />
                                  <span>Simpan</span>
                                </>
                              )}
                            </button>
                            {submission.answer_text && (
                              <button
                                onClick={() => showAnswer(submission.answer_text)}
                                className="px-4 py-2 bg-lp-bg text-amber-700 rounded-lg font-medium hover:shadow-sm border border-lp-border transition-all duration-300 hover:-translate-y-0.5 border border-amber-200 flex items-center gap-2"
                              >
                                <FiEye />
                                Jawaban
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="p-4 bg-lp-bg rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                  <FiFileText className="text-4xl text-gray-400" />
                </div>
                <h3 className="text-2xl font-bold text-lp-text2 mb-3">Belum ada pengumpulan tugas</h3>
                <p className="text-lp-text3 font-light mb-8 max-w-md mx-auto">
                  {filterPertemuan 
                    ? `Tidak ada submission untuk pertemuan ${filterPertemuan}`
                    : 'Mahasiswa belum mengumpulkan tugas untuk mata kuliah ini'
                  }
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-3">
                  <button
                    onClick={fetchSubmissions}
                    className="px-6 py-3 bg-lp-accent text-white border-none rounded-xl font-medium shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 flex items-center gap-2"
                  >
                    <FiRefreshCw />
                    Refresh Data
                  </button>
                  <Link 
                    to={`/dosen/matkul/${courseId}`}
                    className="px-6 py-3 bg-lp-accent text-white border-none rounded-xl font-medium shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 flex items-center gap-2"
                  >
                    <FiBookOpen />
                    Kelola Materi & Tugas
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Bulk Actions (for future implementation) */}
          {filteredSubmissions.length > 0 && (
            <div className="mt-6 p-4 bg-lp-bg rounded-2xl border border-blue-100">
              <div className="flex items-center justify-between">
                <div className="text-sm text-lp-text2 font-light">
                  <strong>Tips:</strong> Klik pada kolom nilai untuk mengedit, lalu tekan Simpan untuk menyimpan perubahan.
                </div>
                <div className="flex items-center gap-3">
                  <button className="px-4 py-2 text-sm bg-lp-surface border border-lp-border border text-lp-text2 rounded-lg hover:bg-lp-bg transition-colors">
                    Export Excel
                  </button>
                  <button className="px-4 py-2 text-sm bg-lp-accent text-white border-none rounded-lg hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border transition-all duration-300">
                    Print Laporan
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Answer Modal */}
          {showAnswerModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
              <div className="bg-lp-surface rounded-2xl p-8 w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl animate-slideUp">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <FiEye className="text-xl text-amber-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-lp-text font-semibold tracking-tight">Jawaban Mahasiswa</h3>
                      <p className="text-lp-text2 font-light text-sm">Detail jawaban tugas</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAnswerModal(false)}
                    className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    <FiX className="text-2xl text-gray-400 hover:text-lp-text2 font-light" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <div className="bg-lp-bg rounded-xl p-6 border border-lp-border border">
                    <div className="prose max-w-none">
                      <div className="whitespace-pre-wrap text-lp-text2 leading-relaxed">
                        {selectedAnswer || 'Tidak ada jawaban teks yang disubmit.'}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-6 border-t border-lp-border border mt-6">
                  <button
                    onClick={() => setShowAnswerModal(false)}
                    className="px-6 py-3 bg-lp-surface border border-lp-border border text-lp-text2 rounded-xl font-medium hover:bg-lp-bg transition-all duration-300"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          )}

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
      </div>
    </div>
  )
}

export default PenilaianDosen
