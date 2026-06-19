import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import Sidebar from '../../components/Sidebar'
import useAuth from '../../hooks/useAuth'
import api from '../../services/api'
import { 
  FiUpload, FiDownload, FiArrowLeft, FiBook, 
  FiCheckCircle, FiClock, FiXCircle, FiFileText, 
  FiChevronRight, FiAlertCircle 
} from 'react-icons/fi'
import { resolveBackendAssetUrl } from '../../utils/assetUrl'
import { motion, AnimatePresence } from 'framer-motion'

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
  const [courseName, setCourseName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submissionStatus, setSubmissionStatus] = useState({})
  const [successMessage, setSuccessMessage] = useState(null)
  const [errorMessage, setErrorMessage] = useState(null)

  useEffect(() => {
    fetchTugasDetail()
  }, [courseId, pertemuan])

  const fetchTugasDetail = async () => {
    try {
      setLoading(true)

      // Fetch course info
      const courseRes = await api.getCourseInfo(courseId)
      if (courseRes.data && courseRes.data.data) {
        setCourseName(courseRes.data.data.nama)
      }

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
          // No submission found
        }
      }
    } catch (error) {
      console.error('Error fetching tugas detail:', error)
      if (error.response?.status === 404) {
        window.location.href = '/not-found';
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
      setSuccessMessage('Tugas berhasil dikumpulkan!')
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
      setErrorMessage('Gagal mengumpulkan tugas: ' + (error.response?.data?.message || error.message))
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



  if (loading) {
    return (
      <div className="flex h-screen bg-lp-bg overflow-hidden">
        <Sidebar role="mahasiswa" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col relative z-10 transition-all duration-300 overflow-hidden">
          <Navbar user={user} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
          <div className="flex-1 flex items-center justify-center p-10">
            <div className="flex flex-col items-center gap-6">
               <div className="w-12 h-12 border-2 border-lp-text/10 border-t-lp-text rounded-full animate-spin"></div>
               <p className="text-[11px] font-mono font-bold tracking-[0.2em] uppercase text-lp-text3 animate-pulse">Syncing Assignments...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-lp-bg relative overflow-hidden">
      {/* Background Decorative Layer */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-lp-accent/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-500/5 blur-[120px] rounded-full" />
      </div>

      <Sidebar role="mahasiswa" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col relative z-10 transition-all duration-300 min-w-0 overflow-hidden">
        <Navbar user={user} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-4xl mx-auto">
            
            {/* Header Section */}
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 space-y-4 sm:space-y-0"
            >
              <div>
                <Link 
                  to={`/mahasiswa/matkul/${courseId}`}
                  className="inline-flex items-center gap-2 text-xs font-semibold text-lp-text2 hover:text-lp-text mb-4 transition-colors"
                >
                  <FiArrowLeft /> Kembali ke Mata Kuliah
                </Link>
                <h1 className="text-2xl md:text-3xl font-bold text-lp-text tracking-tight">
                  {courseName || courseId}
                </h1>
                <p className="text-sm text-lp-text2 font-light mt-1">Pertemuan {pertemuan} - Daftar Tugas</p>
              </div>
              
              <Link 
                to={`/mahasiswa/matkul/${courseId}/pertemuan/${pertemuan}/materi`}
                className="inline-flex items-center space-x-2 bg-lp-text text-white py-2 px-4 rounded-xl hover:bg-lp-atext transition-all duration-300 border border-lp-border text-sm"
              >
                <FiBook />
                <span>Lihat Materi</span>
              </Link>
            </motion.div>

            {/* Assignments Canvas */}
            <div className="space-y-4">
              {tugasList.length > 0 ? (
                tugasList.map((tugas, index) => {
                  const submission = submissionStatus[tugas.id]
                  return (
                    <motion.div 
                      key={index}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="group relative bg-white border border-lp-border rounded-2xl p-5 md:p-6 hover:shadow-[0_8px_24px_rgba(0,0,0,0.04)] transition-all duration-300 overflow-hidden"
                    >
                      {/* Status Indicator Bar */}
                      <div className={`absolute top-0 left-0 w-full h-1 ${submission ? (submission.grade >= 80 ? 'bg-emerald-500' : 'bg-lp-tg') : 'bg-lp-border opacity-20'}`} />
                      
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 relative z-10">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-3 mb-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border border-lp-border shrink-0 ${submission ? 'bg-emerald-50 text-emerald-600' : 'bg-lp-surface text-lp-text3'}`}>
                              <FiUpload className="text-lg" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-[10px] font-mono text-lp-text3 tracking-wider uppercase block">TASK ID: {tugas.id}</span>
                              <h3 className="font-bold text-lg text-lp-text tracking-tight truncate">{tugas.title}</h3>
                            </div>
                          </div>

                          <p className="text-sm text-lp-text2 font-light leading-relaxed mb-6 whitespace-pre-wrap">
                            {tugas.desc || "Tidak ada instruksi khusus untuk tugas ini."}
                          </p>

                          <div className="flex flex-wrap items-center gap-3 mb-6">
                            {tugas.due_date && (
                              <div className="flex items-center gap-2 px-3 py-1.5 bg-lp-accent/5 rounded-lg border border-lp-border/50">
                                <FiClock className="text-lp-atext text-sm" />
                                <span className="text-xs font-semibold text-lp-atext">
                                  Deadline: {new Date(tugas.due_date).toLocaleString('id-ID', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
                            )}

                            {tugas.file_path && (
                              <a 
                                href={resolveBackendAssetUrl(tugas.file_path)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-3 py-1.5 bg-lp-surface rounded-lg border border-lp-border hover:bg-lp-text hover:text-white transition-all duration-300 text-xs font-semibold text-lp-text2"
                              >
                                <FiDownload className="text-sm" />
                                <span>Unduh Panduan</span>
                              </a>
                            )}
                          </div>
                          
                          {/* Submission Insight */}
                          {submission && (
                            <motion.div 
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="bg-lp-surface/50 border border-lp-border rounded-xl p-4 mt-4"
                            >
                              <div className="flex items-center gap-2 mb-3">
                                <FiCheckCircle className="text-emerald-500 text-lg" />
                                <h4 className="text-xs font-bold text-lp-text uppercase tracking-wide">Tugas Telah Dikumpulkan</h4>
                              </div>
                              
                              <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
                                <div className="flex items-center gap-4">
                                  <div className="flex flex-col">
                                    <span className="text-[10px] text-lp-text3 font-medium uppercase">Nilai</span>
                                    {submission.grade > 0 ? (
                                      <span className="text-lg font-bold text-lp-text">{submission.grade}<span className="text-lp-text3 text-xs font-normal">/100</span></span>
                                    ) : (
                                      <span className="text-lp-text2 italic font-light">Belum dinilai</span>
                                    )}
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-[10px] text-lp-text3 font-medium uppercase">Tanggal Kumpul</span>
                                    <span className="font-semibold text-lp-text">{new Date(submission.created_at).toLocaleDateString('id-ID')}</span>
                                  </div>
                                </div>
                                
                                {submission.file_url && (
                                  <a 
                                    href={resolveBackendAssetUrl(submission.file_url)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs font-bold text-lp-atext hover:underline"
                                  >
                                    Lihat Lampiran <FiChevronRight />
                                  </a>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </div>
                        
                        <button
                          onClick={() => openSubmitModal(tugas)}
                          className={`
                            px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 shrink-0 self-start md:self-center
                            ${submission 
                              ? 'bg-lp-surface text-lp-text border border-lp-border hover:bg-lp-text hover:text-white' 
                              : 'bg-lp-text text-lp-bg hover:bg-lp-atext hover:shadow-md'
                            }
                          `}
                        >
                          {submission ? 'Revisi Tugas' : 'Kumpulkan Tugas'}
                        </button>
                      </div>
                    </motion.div>
                  )
                })
              ) : (
                <div className="py-16 text-center bg-lp-surface/30 border border-dashed border-lp-border rounded-2xl">
                   <FiAlertCircle className="text-4xl text-lp-text/10 mx-auto mb-4" />
                   <h3 className="text-lg font-medium text-lp-text tracking-tight mb-1">Belum Ada Tugas Tersedia</h3>
                   <p className="text-xs text-lp-text3 font-light">Monitor kanal ini secara berkala untuk pembaruan tugas dari dosen.</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Submission Portal Modal */}
      <AnimatePresence>
        {showSubmitModal && (
          <div className="fixed inset-0 bg-lp-text/30 backdrop-blur-sm flex items-center justify-center p-4 z-[90] overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.97, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 10 }}
              className="bg-white border border-lp-border rounded-2xl p-6 w-full max-w-lg my-auto shadow-[0_32px_64px_rgba(0,0,0,0.12)] relative overflow-hidden"
            >
              {/* Decorative background accent */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-lp-accent/5 blur-[40px] rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none" />
              
              <div className="absolute top-4 right-4 z-10">
                 <button 
                   onClick={() => setShowSubmitModal(false)} 
                   className="w-8 h-8 rounded-full bg-lp-surface border border-lp-border flex items-center justify-center text-lp-text3 hover:text-lp-text hover:bg-lp-surface-hover transition-colors shadow-sm"
                 >
                   <FiXCircle className="text-lg" />
                 </button>
              </div>

              <div className="mb-6 relative z-10 pr-6">
                <span className="text-[9px] font-mono font-bold tracking-[0.15em] uppercase text-lp-text3 block mb-1">
                   {submissionStatus[selectedTugas?.id] ? 'REVISION PORTAL' : 'STUDENT SUBMISSION'}
                </span>
                <h3 className="text-xl font-bold text-lp-text tracking-tight leading-snug">
                  {selectedTugas?.title}
                </h3>
                <p className="text-lp-text2 text-xs font-light mt-1">Kumpulkan jawaban terbaik Anda untuk evaluasi ini.</p>
              </div>
              
              <form onSubmit={handleSubmitTugas} className="space-y-4 relative z-10">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-lp-text2 mb-1.5 tracking-wide">
                      Narrative Answer <span className="font-normal text-lp-text3 font-sans italic ml-0.5">(Optional)</span>
                    </label>
                    <textarea
                      value={formData.answer_text}
                      onChange={(e) => setFormData(prev => ({ ...prev, answer_text: e.target.value }))}
                      className="w-full bg-lp-surface border border-lp-border rounded-xl p-4 text-lp-text text-sm font-light leading-relaxed focus:outline-none focus:ring-2 focus:ring-lp-accent/10 focus:border-lp-accent transition-all duration-300 resize-none placeholder:text-lp-text3/50"
                      rows="3"
                      placeholder="Interpretasi atau narasi jawaban Anda..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-semibold text-lp-text2 mb-1.5 tracking-wide">
                      Asset Attachment <span className="font-normal text-lp-text3 font-sans italic ml-0.5">(Optional)</span>
                    </label>
                    
                    <div className="relative group">
                       <input
                         type="file"
                         id="file-upload"
                         onChange={handleFileChange}
                         className="hidden"
                       />
                       <label 
                         htmlFor="file-upload"
                         className={`
                           relative flex flex-col items-center justify-center w-full min-h-[120px] 
                           p-5 border-2 border-dashed rounded-xl cursor-pointer
                           transition-all duration-300 ease-out
                           ${formData.file 
                             ? 'border-emerald-500 bg-emerald-50/10' 
                             : 'border-lp-border bg-lp-surface hover:border-lp-accent/50 hover:bg-lp-bg group'
                           }
                         `}
                       >
                          <div className="flex flex-col items-center text-center">
                             <div className={`
                               w-10 h-10 rounded-lg flex items-center justify-center mb-2.5 shadow-sm transition-transform duration-300 group-hover:scale-105
                               ${formData.file ? 'bg-emerald-500 text-white shadow-emerald-100' : 'bg-white border border-lp-border text-lp-text3'}
                             `}>
                               {formData.file ? <FiCheckCircle className="text-lg" /> : <FiUpload className="text-lg" />}
                             </div>
                             
                             {formData.file ? (
                               <>
                                 <p className="text-sm font-semibold text-lp-text mb-0.5">Asset Captured Successfully</p>
                                 <p className="text-xs text-lp-text2 font-mono truncate max-w-[280px]">{formData.file.name}</p>
                               </>
                             ) : (
                               <>
                                 <p className="text-sm font-medium text-lp-text">Drop file here or <span className="text-lp-accent underline">browse</span>.</p>
                                 <p className="text-[10px] text-lp-text3 mt-1 tracking-wider uppercase">PDF, ZIP, PNG, DOC</p>
                               </>
                             )}
                          </div>
                       </label>
                    </div>

                    {submissionStatus[selectedTugas?.id]?.file_url && (
                      <motion.div 
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-3 flex items-center gap-3 px-4 py-2 bg-lp-surface border border-lp-border rounded-lg w-fit"
                      >
                        <span className="text-[10px] font-semibold text-lp-text3 uppercase tracking-wider">Previous:</span>
                        <a 
                          href={resolveBackendAssetUrl(submissionStatus[selectedTugas?.id].file_url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-lp-atext font-bold hover:underline flex items-center gap-1.5"
                        >
                          <FiDownload className="text-xs" /> Inspect Data
                        </a>
                      </motion.div>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3.5 pt-4 mt-6 border-t border-lp-border/60">
                  <button
                    type="button"
                    onClick={() => setShowSubmitModal(false)}
                    className="w-full sm:w-auto px-5 py-2.5 border border-lp-border text-lp-text2 rounded-full text-xs font-semibold hover:bg-lp-surface transition-colors uppercase tracking-wider"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || (!formData.answer_text && !formData.file)}
                    className="w-full sm:w-auto bg-lp-text text-lp-bg px-6 py-2.5 rounded-full text-xs font-semibold hover:bg-lp-atext hover:-translate-y-0.5 disabled:opacity-40 transition-all duration-300 uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(0,0,0,0.06)]"
                  >
                    {submitting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-lp-bg/30 border-t-lp-bg rounded-full animate-spin"></div>
                        <span>ENCRYPTING...</span>
                      </>
                    ) : (
                      <span>{submissionStatus[selectedTugas?.id] ? 'RE-UPLOAD NOW' : 'LOCK SUBMISSION'}</span>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Success Modal */}
      <AnimatePresence>
        {successMessage && (
          <div className="fixed inset-0 bg-lp-text/30 backdrop-blur-sm flex items-center justify-center p-4 z-[100] overflow-y-auto animate-fadeIn">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white border border-lp-border rounded-2xl p-6 w-full max-w-sm my-auto shadow-[0_32px_64px_rgba(0,0,0,0.12)] text-center relative overflow-hidden"
            >
              <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600 border border-emerald-100">
                <FiCheckCircle className="text-2xl" />
              </div>
              <h3 className="text-lg font-bold text-lp-text tracking-tight mb-2">
                Berhasil!
              </h3>
              <p className="text-lp-text2 text-xs font-light leading-relaxed mb-6">
                {successMessage}
              </p>
              <button
                type="button"
                onClick={() => setSuccessMessage(null)}
                className="w-full bg-lp-text text-lp-bg px-6 py-2.5 rounded-full text-xs font-semibold hover:bg-lp-atext transition-colors uppercase tracking-wider shadow-[0_4px_12px_rgba(0,0,0,0.06)]"
              >
                Tutup
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Error Modal */}
      <AnimatePresence>
        {errorMessage && (
          <div className="fixed inset-0 bg-lp-text/30 backdrop-blur-sm flex items-center justify-center p-4 z-[100] overflow-y-auto animate-fadeIn">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white border border-lp-border rounded-2xl p-6 w-full max-w-sm my-auto shadow-[0_32px_64px_rgba(0,0,0,0.12)] text-center relative overflow-hidden"
            >
              <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600 border border-red-100">
                <FiXCircle className="text-2xl" />
              </div>
              <h3 className="text-lg font-bold text-lp-text tracking-tight mb-2">
                Gagal!
              </h3>
              <p className="text-lp-text2 text-xs font-light leading-relaxed mb-6">
                {errorMessage}
              </p>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="w-full bg-lp-text text-lp-bg px-6 py-2.5 rounded-full text-xs font-semibold hover:bg-lp-atext transition-colors uppercase tracking-wider shadow-[0_4px_12px_rgba(0,0,0,0.06)]"
              >
                Tutup
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default DetailPertemuanTugas