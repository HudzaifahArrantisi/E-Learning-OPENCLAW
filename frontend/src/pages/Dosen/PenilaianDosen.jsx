
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
      <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Sidebar role="dosen" isOpen={sidebarOpen} onClose={toggleSidebar} />
        <div className="flex-1 lg:ml-0 transition-all duration-300">
          <div className="p-6 lg:p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="lg:hidden p-3 rounded-xl bg-white/50 backdrop-blur-sm shadow-lg animate-pulse">
                  <div className="w-6 h-6 bg-gray-200 rounded"></div>
                </div>
                <div>
                  <div className="h-8 w-64 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg animate-pulse mb-2"></div>
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
                <div key={item} className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 shadow-lg animate-pulse">
                  <div className="h-6 w-24 bg-gray-200 rounded mb-4"></div>
                  <div className="h-10 w-16 bg-gray-300 rounded"></div>
                </div>
              ))}
            </div>

            <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 shadow-lg animate-pulse">
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
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Sidebar role="dosen" isOpen={sidebarOpen} onClose={toggleSidebar} />
      
      {/* Main Content */}
      <div className="flex-1 lg:ml-0 transition-all duration-300 min-w-0">
        <div className="p-6 lg:p-8">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
            <div className="flex items-center gap-4">
              <button 
                onClick={toggleSidebar}
                className="lg:hidden p-3 rounded-xl bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                <FiChevronRight className="text-xl text-gray-700" />
              </button>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-3 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl shadow-lg">
                    <FiBarChart2 className="text-2xl text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                      Penilaian Tugas
                    </h1>
                    <p className="text-gray-600 ml-16">
                      {matkulData[courseId] || courseId} • {submissions.length} pengumpulan
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link 
                to={`/dosen/matkul/${courseId}`}
                className="group relative overflow-hidden px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 flex items-center gap-3"
              >
                <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-full transition-transform duration-1000"></div>
                <FiBookOpen className="relative z-10" />
                <span className="relative z-10">Kelola Matkul</span>
              </Link>
              <Link 
                to="/dosen/course/"
                className="px-6 py-3 bg-white/80 backdrop-blur-sm border border-gray-200 text-gray-700 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-300 hover:bg-white flex items-center gap-3"
              >
                <FiArrowLeft />
                Daftar Matkul
              </Link>
            </div>
          </div>

          {/* Stats Cards */}
          {showStats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm mb-1">Total Pengumpulan</p>
                    <h3 className="text-3xl font-bold text-gray-800">{submissions.length}</h3>
                  </div>
                  <div className="p-3 bg-gradient-to-r from-blue-100 to-blue-50 rounded-xl">
                    <FiFileText className="text-2xl text-blue-600" />
                  </div>
                </div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm mb-1">Sudah Dinilai</p>
                    <h3 className="text-3xl font-bold text-gray-800">{gradedCount}</h3>
                  </div>
                  <div className="p-3 bg-gradient-to-r from-emerald-100 to-emerald-50 rounded-xl">
                    <FiCheckCircle className="text-2xl text-emerald-600" />
                  </div>
                </div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm mb-1">Belum Dinilai</p>
                    <h3 className="text-3xl font-bold text-gray-800">{submissions.length - gradedCount}</h3>
                  </div>
                  <div className="p-3 bg-gradient-to-r from-amber-100 to-amber-50 rounded-xl">
                    <FiClock className="text-2xl text-amber-600" />
                  </div>
                </div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm mb-1">Rata-rata Nilai</p>
                    <h3 className="text-3xl font-bold text-gray-800">{averageGrade}</h3>
                  </div>
                  <div className="p-3 bg-gradient-to-r from-purple-100 to-purple-50 rounded-xl">
                    <FiPercent className="text-2xl text-purple-600" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Control Panel */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100 mb-8">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Filter Pertemuan</label>
                <div className="relative">
                  <FiFilter className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <select
                    value={filterPertemuan}
                    onChange={(e) => setFilterPertemuan(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 backdrop-blur-sm"
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
                <label className="block text-sm font-semibold text-gray-700 mb-2">Urutkan Berdasarkan</label>
                <div className="relative">
                  <FiTrendingUp className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <select
                    value={sortBy}
                    onChange={(e) => {
                      setSortBy(e.target.value)
                      fetchSubmissions()
                    }}
                    className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 backdrop-blur-sm"
                  >
                    <option value="latest">Terbaru</option>
                    <option value="grade">Nilai Tertinggi</option>
                    <option value="name">Nama Mahasiswa</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Cari Mahasiswa/Tugas</label>
                <div className="relative">
                  <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 backdrop-blur-sm"
                    placeholder="Nama, NIM, atau judul tugas"
                  />
                </div>
              </div>
              
              <div className="flex items-end">
                <button
                  onClick={fetchSubmissions}
                  className="group relative overflow-hidden w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 flex items-center justify-center gap-2"
                >
                  <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-full transition-transform duration-1000"></div>
                  <FiRefreshCw className="relative z-10" />
                  <span className="relative z-10">Refresh Data</span>
                </button>
              </div>
            </div>
            
            <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowStats(!showStats)}
                  className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  {showStats ? 'Sembunyikan Stats' : 'Tampilkan Stats'}
                </button>
              </div>
              <div className="text-sm text-gray-500">
                Menampilkan {filteredSubmissions.length} dari {submissions.length} pengumpulan
              </div>
            </div>
          </div>

          {/* Submissions Table */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            {filteredSubmissions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px]">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Mahasiswa</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Tugas</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Pertemuan</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">File</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Nilai</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredSubmissions.map((submission, index) => (
                      <tr key={index} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-r from-blue-100 to-blue-50 rounded-lg">
                              <FiUser className="text-blue-600" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{submission.student_name}</div>
                              <div className="text-sm text-gray-500 font-mono">{submission.student_nim}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="max-w-xs">
                            <div className="font-medium text-gray-900 truncate">{submission.task_title}</div>
                            <div className="text-sm text-gray-500 mt-1">
                              {new Date(submission.created_at).toLocaleString('id-ID')}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-gradient-to-r from-blue-100 to-blue-50 text-blue-800 border border-blue-200">
                            P{submission.pertemuan}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {submission.file_url ? (
                            <a
                              href={resolveBackendAssetUrl(submission.file_url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-100 to-emerald-50 text-emerald-700 rounded-lg font-medium hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 border border-emerald-200"
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
                                className="w-24 border border-gray-200 rounded-xl px-4 py-2.5 text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 backdrop-blur-sm"
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
                            <span className="text-sm text-gray-600">
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
                                  ? 'bg-blue-100 text-blue-600'
                                  : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:shadow-lg'
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
                                className="px-4 py-2 bg-gradient-to-r from-amber-100 to-amber-50 text-amber-700 rounded-lg font-medium hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 border border-amber-200 flex items-center gap-2"
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
                <div className="p-4 bg-gradient-to-r from-gray-100 to-gray-50 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                  <FiFileText className="text-4xl text-gray-400" />
                </div>
                <h3 className="text-2xl font-bold text-gray-700 mb-3">Belum ada pengumpulan tugas</h3>
                <p className="text-gray-500 mb-8 max-w-md mx-auto">
                  {filterPertemuan 
                    ? `Tidak ada submission untuk pertemuan ${filterPertemuan}`
                    : 'Mahasiswa belum mengumpulkan tugas untuk mata kuliah ini'
                  }
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-3">
                  <button
                    onClick={fetchSubmissions}
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 flex items-center gap-2"
                  >
                    <FiRefreshCw />
                    Refresh Data
                  </button>
                  <Link 
                    to={`/dosen/matkul/${courseId}`}
                    className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 flex items-center gap-2"
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
            <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-white rounded-2xl border border-blue-100">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  <strong>Tips:</strong> Klik pada kolom nilai untuk mengedit, lalu tekan Simpan untuk menyimpan perubahan.
                </div>
                <div className="flex items-center gap-3">
                  <button className="px-4 py-2 text-sm bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                    Export Excel
                  </button>
                  <button className="px-4 py-2 text-sm bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:shadow-lg transition-all duration-300">
                    Print Laporan
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Answer Modal */}
          {showAnswerModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
              <div className="bg-white rounded-2xl p-8 w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl animate-slideUp">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <FiEye className="text-xl text-amber-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">Jawaban Mahasiswa</h3>
                      <p className="text-gray-600 text-sm">Detail jawaban tugas</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAnswerModal(false)}
                    className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    <FiX className="text-2xl text-gray-400 hover:text-gray-600" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <div className="bg-gradient-to-r from-gray-50 to-white rounded-xl p-6 border border-gray-200">
                    <div className="prose max-w-none">
                      <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                        {selectedAnswer || 'Tidak ada jawaban teks yang disubmit.'}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 mt-6">
                  <button
                    onClick={() => setShowAnswerModal(false)}
                    className="px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all duration-300"
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