import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import Sidebar from '../../components/Sidebar'
import useAuth from '../../hooks/useAuth'
import api from '../../services/api'
import { FaUpload, FaDownload, FaArrowLeft, FaBook, FaCheckCircle, FaClock } from 'react-icons/fa'
import { resolveBackendAssetUrl } from '../../utils/assetUrl'

const DetailPertemuanTugas = () => {
  const { user } = useAuth()
  const { courseId, pertemuan } = useParams()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [tugasList, setTugasList] = useState([])
  const [selectedTugas, setSelectedTugas] = useState(null)
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [formData, setFormData] = useState({
    answer_text: '',
    file: null
  })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submissionStatus, setSubmissionStatus] = useState({})

  useEffect(() => {
    fetchTugasDetail()
  }, [courseId, pertemuan])

  const fetchTugasDetail = async () => {
    try {
      // ✅ PERBAIKAN: Gunakan endpoint mahasiswa, bukan dosen
      const response = await api.getPertemuanDetail(courseId, pertemuan)
      const tugas = response.data.data.tugas || []
      setTugasList(tugas)
      
      for (const task of tugas) {
        try {
          const statusResponse = await api.getSubmissionStatus(task.id)
          if (statusResponse.data.data) {
            setSubmissionStatus(prev => ({
              ...prev,
              [task.id]: statusResponse.data.data
            }))
          }
        } catch (error) {
          console.log(`No submission found for task ${task.id}`)
        }
      }
    } catch (error) {
      console.error('Error fetching tugas detail:', error)
      if (error.response?.status === 403) {
        console.log('Access forbidden - mungkin perlu login ulang')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitTugas = async (e) => {
    e.preventDefault()
    if (!selectedTugas) return

    setSubmitting(true)
    try {
      const submitData = new FormData()
      submitData.append('task_id', selectedTugas.id)
      submitData.append('answer_text', formData.answer_text)
      if (formData.file) {
        submitData.append('file', formData.file)
      }

      await api.submitTugas(submitData)
      alert('Tugas berhasil dikumpulkan!')
      setShowSubmitModal(false)
      setFormData({ answer_text: '', file: null })
      
      const statusResponse = await api.getSubmissionStatus(selectedTugas.id)
      if (statusResponse.data.data) {
        setSubmissionStatus(prev => ({
          ...prev,
          [selectedTugas.id]: statusResponse.data.data
        }))
      }
    } catch (error) {
      console.error('Error submitting tugas:', error)
      alert('Gagal mengumpulkan tugas: ' + (error.response?.data?.message || error.message))
    } finally {
      setSubmitting(false)
    }
  }

  const handleFileChange = (e) => {
    setFormData(prev => ({
      ...prev,
      file: e.target.files[0]
    }))
  }

  const openSubmitModal = (tugas) => {
    setSelectedTugas(tugas)
    setFormData({
      answer_text: submissionStatus[tugas.id]?.answer_text || '',
      file: null
    })
    setShowSubmitModal(true)
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
      <div className="flex h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <Sidebar role="mahasiswa" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Navbar user={user} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Memuat tugas...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
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
                    inline-flex items-center space-x-2 text-blue-600 hover:text-blue-700 
                    mb-4 transition-colors
                  "
                >
                  <FaArrowLeft />
                  <span>Kembali ke Mata Kuliah</span>
                </Link>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
                  {matkulData[courseId] || courseId}
                </h1>
                <p className="text-gray-600 mt-1">Pertemuan {pertemuan} - Daftar Tugas</p>
              </div>
              
              <div className="flex space-x-2">
                <Link 
                  to={`/mahasiswa/matkul/${courseId}/pertemuan/${pertemuan}/materi`}
                  className="
                    flex items-center space-x-2 bg-blue-500 text-white 
                    py-2 px-4 rounded-xl hover:bg-blue-600 
                    transition-all duration-300 shadow-lg hover:shadow-xl
                  "
                >
                  <FaBook />
                  <span className="hidden sm:block">Lihat Materi</span>
                </Link>
              </div>
            </div>

            {/* Tugas List */}
            <div className="space-y-6">
              {tugasList.length > 0 ? (
                tugasList.map((tugas, index) => {
                  const submission = submissionStatus[tugas.id]
                  return (
                    <div 
                      key={index}
                      className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between space-y-4 lg:space-y-0">
                        <div className="flex-1">
                          <div className="flex items-start space-x-3 mb-4">
                            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                              <FaUpload className="text-green-600 text-lg" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-bold text-xl text-gray-800 mb-2">{tugas.title}</h3>
                              {tugas.desc && (
                                <p className="text-gray-600 mb-3 leading-relaxed">{tugas.desc}</p>
                              )}
                            </div>
                          </div>

                          {tugas.due_date && (
                            <div className="flex items-center space-x-2 text-sm text-orange-600 mb-4">
                              <FaClock />
                              <span>
                                Batas pengumpulan: {tugas.due_date ? new Date(tugas.due_date).toLocaleDateString('id-ID') + ' ' + new Date(tugas.due_date).toLocaleTimeString('id-ID') : 'Tidak ditentukan'}
                              </span>
                            </div>
                          )}
                          
                          {/* Submission Status */}
                          {submission && (
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                              <h4 className="font-semibold text-blue-800 mb-3 flex items-center space-x-2">
                                <FaCheckCircle className="text-blue-600" />
                                <span>Status Pengumpulan:</span>
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                {submission.file_url && (
                                  <div className="flex items-center space-x-2">
                                    <span className="font-medium text-gray-700">File: </span>
                                    <a 
                                      href={resolveBackendAssetUrl(submission.file_url)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:underline flex items-center space-x-1"
                                    >
                                      <FaDownload className="text-xs" />
                                      <span>Lihat File</span>
                                    </a>
                                  </div>
                                )}
                                {submission.answer_text && (
                                  <div>
                                    <span className="font-medium text-gray-700">Jawaban Text: </span>
                                    <span className="text-gray-600">{submission.answer_text.substring(0, 50)}...</span>
                                  </div>
                                )}
                                {submission.grade > 0 && (
                                  <div>
                                    <span className="font-medium text-gray-700">Nilai: </span>
                                    <span className={`font-bold ${
                                      submission.grade >= 80 ? 'text-green-600' :
                                      submission.grade >= 70 ? 'text-yellow-600' : 'text-red-600'
                                    }`}>
                                      {submission.grade}
                                    </span>
                                  </div>
                                )}
                                <div>
                                  <span className="font-medium text-gray-700">Dikumpulkan: </span>
                                  <span className="text-gray-600">
                                    {submission.created_at ? new Date(submission.created_at).toLocaleDateString('id-ID') : 'Tidak diketahui'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {tugas.file_path && (
                            <div className="flex items-center space-x-3">
                              <a 
                                href={resolveBackendAssetUrl(tugas.file_path)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="
                                  flex items-center space-x-2 bg-gray-500 text-white
                                  py-2 px-4 rounded-lg hover:bg-gray-600
                                  transition-all duration-300
                                "
                              >
                                <FaDownload />
                                <span>Download File Tugas</span>
                              </a>
                              <span className="text-sm text-gray-500">
                                {tugas.file_path.split('.').pop().toUpperCase()} File
                              </span>
                            </div>
                          )}
                        </div>
                        
                        <button
                          onClick={() => openSubmitModal(tugas)}
                          className="
                            flex items-center space-x-2 bg-green-500 text-white
                            py-3 px-6 rounded-xl hover:bg-green-600
                            transform hover:scale-105 transition-all duration-300
                            shadow-lg hover:shadow-xl w-full lg:w-auto justify-center
                          "
                        >
                          <FaUpload />
                          <span>{submission ? 'Edit Tugas' : 'Kumpulkan Tugas'}</span>
                        </button>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="bg-white rounded-2xl p-8 text-center shadow-lg border border-gray-100">
                  <div className="text-6xl mb-4">📝</div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">Belum ada tugas</h3>
                  <p className="text-gray-600">Tugas untuk pertemuan ini belum dibuat oleh dosen.</p>
                </div>
              )}
            </div>
          </div>

          {/* Submit Modal */}
          {showSubmitModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <h3 className="text-xl font-bold text-gray-800 mb-4">
                  {submissionStatus[selectedTugas?.id] ? 'Edit' : 'Kumpulkan'} Tugas: {selectedTugas?.title}
                </h3>
                
                <form onSubmit={handleSubmitTugas} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Jawaban Text (Optional)
                    </label>
                    <textarea
                      value={formData.answer_text}
                      onChange={(e) => setFormData(prev => ({ ...prev, answer_text: e.target.value }))}
                      className="
                        w-full border border-gray-300 rounded-xl p-4
                        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                        transition-all duration-300 resize-none
                      "
                      rows="6"
                      placeholder="Tulis jawaban tugas disini..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Upload File (Optional)
                    </label>
                    <input
                      type="file"
                      onChange={handleFileChange}
                      className="
                        w-full border border-gray-300 rounded-xl p-3
                        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                        transition-all duration-300
                      "
                      accept=".pdf,.doc,.docx,.zip,.jpg,.jpeg,.png"
                    />
                    <p className="text-sm text-gray-500 mt-2">
                      Format yang didukung: PDF, DOC, DOCX, ZIP, JPG, JPEG, PNG
                    </p>
                    {submissionStatus[selectedTugas?.id]?.file_url && (
                      <p className="text-sm text-blue-600 mt-2">
                        File sebelumnya: 
                        <a 
                          href={resolveBackendAssetUrl(submissionStatus[selectedTugas?.id].file_url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-1 hover:underline"
                        >
                          Lihat File
                        </a>
                      </p>
                    )}
                  </div>
                  
                  <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowSubmitModal(false)}
                      className="
                        px-6 py-3 border border-gray-300 text-gray-700 
                        rounded-xl font-semibold hover:bg-gray-50 
                        transition-all duration-300 flex-1
                      "
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || (!formData.answer_text && !formData.file)}
                      className="
                        bg-green-500 text-white px-6 py-3 rounded-xl 
                        font-semibold hover:bg-green-600 transform hover:scale-105
                        disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                        transition-all duration-300 flex-1
                      "
                    >
                      {submitting ? 'Mengumpulkan...' : (submissionStatus[selectedTugas?.id] ? 'Update Tugas' : 'Kumpulkan Tugas')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default DetailPertemuanTugas