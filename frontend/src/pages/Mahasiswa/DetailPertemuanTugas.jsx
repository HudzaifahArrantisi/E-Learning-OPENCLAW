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
  const [submitting, setSubmitting] = useState(false)
  const [submissionStatus, setSubmissionStatus] = useState({})

  useEffect(() => {
    fetchTugasDetail()
  }, [courseId, pertemuan])

  const fetchTugasDetail = async () => {
    try {
      setLoading(true)
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
        <Sidebar role="mahasiswa" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col relative z-10 transition-all duration-300">
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
    <div className="flex min-h-screen bg-lp-bg relative overflow-hidden">
      {/* Background Decorative Layer */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-lp-accent/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-500/5 blur-[120px] rounded-full" />
      </div>

      <Sidebar role="mahasiswa" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col relative z-10 transition-all duration-300 min-w-0">
        <Navbar user={user} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        
        <main className="flex-1 overflow-y-auto p-6 md:p-10 lg:p-14">
          <div className="max-w-4xl mx-auto">
            
            {/* Header Section */}
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-10 mb-16"
            >
              <div>
                <Link 
                  to={`/mahasiswa/matkul/${courseId}`}
                  className="inline-flex items-center gap-2 text-[11px] font-mono font-bold tracking-[0.2em] text-lp-text3 hover:text-lp-text transition-colors uppercase mb-6"
                >
                  <FiArrowLeft /> Back to Course Feed
                </Link>
                
                <h1 className="text-4xl md:text-5xl font-light text-lp-text tracking-tight mb-3">
                  {matkulData[courseId] || courseId}
                  <span className="text-lp-text3 block text-lg font-normal mt-2">Meeting {pertemuan} Assessment Suite</span>
                </h1>
                <p className="text-lp-text2 font-light max-w-xl leading-relaxed">
                  Lengkapi seluruh tugas yang tersedia pada pertemuan ini sebelum tenggat waktu yang ditentukan.
                </p>
              </div>
              
              <Link 
                to={`/mahasiswa/matkul/${courseId}/pertemuan/${pertemuan}/materi`}
                className="group px-8 py-4 bg-lp-text text-lp-bg rounded-full text-[13px] font-bold hover:bg-lp-atext hover:-translate-y-1 transition-all duration-500 uppercase tracking-widest flex items-center gap-3 shadow-[0_12px_24px_rgba(0,0,0,0.1)]"
              >
                <FiBook className="text-lg" />
                <span>Lecture Modules</span>
              </Link>
            </motion.div>

            {/* Assignments Canvas */}
            <div className="space-y-8">
              {tugasList.length > 0 ? (
                tugasList.map((tugas, index) => {
                  const submission = submissionStatus[tugas.id]
                  return (
                    <motion.div 
                      key={index}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="group relative bg-white border border-lp-border rounded-[2.5rem] p-8 md:p-10 hover:shadow-[0_32px_64px_rgba(0,0,0,0.06)] transition-all duration-700 hover:-translate-y-1 overflow-hidden"
                    >
                      {/* Status Indicator Bar */}
                      <div className={`absolute top-0 left-0 w-full h-1.5 ${submission ? (submission.grade >= 80 ? 'bg-emerald-500' : 'bg-lp-tg') : 'bg-lp-border opacity-20'}`} />
                      
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-10 relative z-10">
                        <div className="flex-1">
                          <div className="flex items-center gap-4 mb-8">
                            <div className={`p-4 rounded-2xl flex items-center justify-center ${submission ? 'bg-emerald-50 text-emerald-600' : 'bg-lp-surface text-lp-text3'}`}>
                              <FiUpload className="text-xl" />
                            </div>
                            <div>
                              <p className="text-[11px] font-mono font-bold tracking-[0.2em] text-lp-text3 uppercase mb-1">TASK IDENTIFIER: {tugas.id}</p>
                              <h3 className="text-2xl font-normal text-lp-text tracking-tight italic">{tugas.title}</h3>
                            </div>
                          </div>

                          <p className="text-[15px] text-lp-text2 font-light leading-relaxed mb-10 max-w-[620px]">
                            {tugas.desc || "No special instructions provided for this task."}
                          </p>

                          <div className="flex flex-wrap items-center gap-6 mb-10">
                            {tugas.due_date && (
                              <div className="flex items-center gap-2.5 px-4 py-2.5 bg-lp-accent/5 rounded-full border border-lp-border/50">
                                <FiClock className="text-lp-atext text-lg" />
                                <span className="text-[13px] font-medium text-lp-atext">
                                  Deadline: {new Date(tugas.due_date).toLocaleString('id-ID')}
                                </span>
                              </div>
                            )}

                            {tugas.file_path && (
                              <a 
                                href={resolveBackendAssetUrl(tugas.file_path)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2.5 px-4 py-2.5 bg-lp-surface rounded-full border border-lp-border hover:bg-lp-text hover:text-white transition-all duration-300"
                              >
                                <FiDownload className="text-lg" />
                                <span className="text-[13px] font-medium">Download Resources</span>
                              </a>
                            )}
                          </div>
                          
                          {/* Submission Insight */}
                          {submission && (
                            <motion.div 
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="bg-lp-surface/50 border border-lp-border rounded-3xl p-6 md:p-8"
                            >
                              <div className="flex items-center gap-3 mb-6">
                                <FiCheckCircle className="text-emerald-500 text-xl" />
                                <h4 className="text-[11px] font-mono font-bold tracking-[0.2em] text-lp-text uppercase">Submission Locked</h4>
                              </div>
                              
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                  <div className="flex flex-col gap-1">
                                    <span className="text-[11px] text-lp-text3 font-medium uppercase tracking-widest">Grading Status</span>
                                    {submission.grade > 0 ? (
                                      <span className="text-3xl font-bold text-lp-text">{submission.grade}<span className="text-lp-text3 text-sm font-light">/100</span></span>
                                    ) : (
                                      <span className="text-[13px] text-lp-text2 italic font-light italic">Waiting for feedback...</span>
                                    )}
                                  </div>
                                  <div className="flex flex-col gap-1">
                                    <span className="text-[11px] text-lp-text3 font-medium uppercase tracking-widest">Locked Date</span>
                                    <span className="text-[14px] text-lp-text font-normal">{new Date(submission.created_at).toLocaleDateString('id-ID')}</span>
                                  </div>
                                </div>
                                
                                {submission.file_url && (
                                   <div className="flex flex-col justify-end items-start sm:items-end">
                                      <a 
                                        href={resolveBackendAssetUrl(submission.file_url)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 text-[13px] font-bold text-lp-atext hover:underline group"
                                      >
                                        Inspect Submitted Asset <FiChevronRight className="group-hover:translate-x-1 transition-transform" />
                                      </a>
                                   </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </div>
                        
                        <button
                          onClick={() => openSubmitModal(tugas)}
                          className={`
                            px-10 py-5 rounded-full text-[13px] font-bold tracking-[0.1em] uppercase transition-all duration-500 shadow-lg shrink-0
                            ${submission 
                              ? 'bg-lp-surface text-lp-text border border-lp-border hover:bg-lp-text hover:text-white' 
                              : 'bg-lp-text text-lp-bg hover:bg-lp-atext hover:-translate-y-1'
                            }
                          `}
                        >
                          {submission ? 'Revise Submission' : 'Submit Progress →'}
                        </button>
                      </div>
                    </motion.div>
                  )
                })
              ) : (
                <div className="py-24 text-center bg-lp-surface/30 border-2 border-dashed border-lp-border rounded-[3rem]">
                   <FiAlertCircle className="text-5xl text-lp-text/10 mx-auto mb-6" />
                   <h3 className="text-xl font-normal text-lp-text tracking-tight mb-2 italic">Belum Ada Tugas Tersedia</h3>
                   <p className="text-[13px] text-lp-text3 font-light">Monitor kanal ini secara berkala untuk pembaruan tugas dari dosen.</p>
                </div>
              )}
            </div>
          </div>

          {/* Submission Portal Modal */}
          <AnimatePresence>
            {showSubmitModal && (
              <div className="fixed inset-0 bg-lp-text/20 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className="bg-white border border-lp-border rounded-[3rem] p-8 md:p-14 w-full max-w-3xl my-auto shadow-[0_64px_128px_rgba(0,0,0,0.12)] relative overflow-hidden"
                >
                  {/* Decorative element */}
                  <div className="absolute top-0 right-0 w-48 h-48 bg-lp-accent/5 blur-[60px] rounded-full translate-x-1/2 -translate-y-1/2" />
                  
                  <div className="absolute top-10 right-10 z-10">
                     <button 
                       onClick={() => setShowSubmitModal(false)} 
                       className="w-12 h-12 rounded-full bg-lp-surface border border-lp-border flex items-center justify-center text-lp-text hover:bg-lp-text hover:text-white transition-all duration-500 shadow-sm"
                     >
                       <FiXCircle className="text-xl" />
                     </button>
                  </div>

                  <div className="mb-12 relative z-10">
                    <span className="text-[11px] font-mono font-bold tracking-[0.2em] uppercase text-lp-text3 mb-4 block">
                       {submissionStatus[selectedTugas?.id] ? 'REVISION PORTAL' : 'STUDENT SUBMISSION'}
                    </span>
                    <h3 className="text-3xl md:text-5xl font-light text-lp-text tracking-tight leading-none italic mb-4">
                      {selectedTugas?.title}
                    </h3>
                    <p className="text-lp-text2 font-light text-[15px]">Kumpulkan jawaban terbaik Anda untuk evaluasi ini.</p>
                  </div>
                  
                  <form onSubmit={handleSubmitTugas} className="space-y-10 relative z-10">
                    <div className="space-y-8">
                      <div>
                        <label className="block text-[11px] font-mono font-bold text-lp-text3 mb-4 tracking-widest uppercase">
                          Narrative Answer <span className="font-sans lowercase opacity-50 font-normal italic ml-1">(Optional)</span>
                        </label>
                        <textarea
                          value={formData.answer_text}
                          onChange={(e) => setFormData(prev => ({ ...prev, answer_text: e.target.value }))}
                          className="w-full bg-lp-surface border border-lp-border rounded-[2rem] p-8 text-lp-text text-[16px] font-light leading-relaxed focus:outline-none focus:ring-4 focus:ring-lp-accent/5 focus:border-lp-text transition-all duration-700 resize-none placeholder:text-lp-text3/50"
                          rows="6"
                          placeholder="Interpretasi atau narasi jawaban Anda..."
                        />
                      </div>
                      
                      <div>
                        <label className="block text-[11px] font-mono font-bold text-lp-text3 mb-4 tracking-widest uppercase">
                          Asset Attachment <span className="font-sans lowercase opacity-50 font-normal italic ml-1">(Optional)</span>
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
                              relative flex flex-col items-center justify-center w-full min-h-[220px] 
                              p-10 border-2 border-dashed rounded-[2.5rem] cursor-pointer
                              transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]
                              ${formData.file 
                                ? 'border-emerald-500 bg-emerald-50/20' 
                                : 'border-lp-border bg-lp-surface hover:border-lp-text hover:bg-lp-bg group'
                              }
                            `}
                          >
                             <div className="flex flex-col items-center text-center">
                                <div className={`
                                  w-16 h-16 rounded-[1.5rem] flex items-center justify-center mb-6 shadow-sm transition-transform duration-500 group-hover:scale-110
                                  ${formData.file ? 'bg-emerald-500 text-white shadow-emerald-200' : 'bg-white border border-lp-border text-lp-text3'}
                                `}>
                                  {formData.file ? <FiCheckCircle className="text-2xl" /> : <FiUpload className="text-2xl" />}
                                </div>
                                
                                {formData.file ? (
                                  <>
                                    <p className="text-[18px] font-normal text-lp-text mb-1 tracking-tight italic">Asset Captured Successfully</p>
                                    <p className="text-[13px] text-lp-text2 font-mono uppercase tracking-wider">{formData.file.name}</p>
                                  </>
                                ) : (
                                  <>
                                    <p className="text-[18px] font-normal text-lp-text mb-1 tracking-tight">Drop file here or <em className="italic underline">browse</em>.</p>
                                    <p className="text-[11px] text-lp-text3 font-medium uppercase tracking-[0.2em] mt-3 opacity-60">PDF · ZIP · PNG · DOC</p>
                                  </>
                                )}
                             </div>
                          </label>
                        </div>

                        {submissionStatus[selectedTugas?.id]?.file_url && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-6 flex items-center gap-4 px-6 py-4 bg-lp-bg border border-lp-border rounded-2xl w-fit"
                          >
                            <span className="text-[11px] font-mono font-bold text-lp-text3 uppercase">Previous Upload:</span>
                            <a 
                              href={resolveBackendAssetUrl(submissionStatus[selectedTugas?.id].file_url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[13px] text-lp-atext font-bold hover:underline flex items-center gap-2"
                            >
                              <FiDownload className="text-xs" /> Inspect Data
                            </a>
                          </motion.div>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-16 pt-10 border-t border-lp-border">
                      <button
                        type="button"
                        onClick={() => setShowSubmitModal(false)}
                        className="px-8 py-5 border border-lp-border text-lp-text2 rounded-full text-[13px] font-bold hover:bg-lp-surface transition-all duration-300 uppercase tracking-widest"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submitting || (!formData.answer_text && !formData.file)}
                        className="bg-lp-text text-lp-bg px-8 py-5 rounded-full text-[13px] font-bold hover:bg-lp-atext hover:-translate-y-1 disabled:opacity-40 transition-all duration-500 uppercase tracking-widest flex items-center justify-center gap-3 shadow-[0_12px_24px_rgba(0,0,0,0.1)]"
                      >
                        {submitting ? (
                          <>
                            <div className="w-4 h-4 border-2 border-lp-bg/30 border-t-lp-bg rounded-full animate-spin"></div>
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
        </main>
      </div>
    </div>
  )
}

export default DetailPertemuanTugas