import React, { useState, useEffect, useRef } from 'react'
import { useMutation, useQueryClient } from "@tanstack/react-query"
import api from '../../services/api'
import Navbar from '../../components/Navbar'
import Sidebar from '../../components/Sidebar'
import useAuth from '../../hooks/useAuth'
import { FiX, FiUpload, FiCheckCircle, FiAlertCircle, FiChevronRight, FiTerminal } from 'react-icons/fi'
import { motion, AnimatePresence } from 'framer-motion'

const PostingPemberitahuan = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [files, setFiles] = useState([])
  const [previews, setPreviews] = useState([])
  const [showSuccess, setShowSuccess] = useState(false)
  const [showError, setShowError] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const abortControllerRef = useRef(null)

  const mutation = useMutation({
    mutationFn: async () => {
      abortControllerRef.current = new AbortController()
      const formData = new FormData()
      formData.append('title', title)
      formData.append('content', content)
      formData.append('role', 'admin')
      
      files.forEach((file) => {
        formData.append('media', file)
      })

      const res = await api.post('/api/admin/posts', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        signal: abortControllerRef.current.signal,
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          )
          setUploadProgress(percentCompleted)
          if (percentCompleted === 100) {
            setIsProcessing(true)
          }
        }
      })
      return res.data
    },
    onMutate: () => {
      setIsUploading(true)
      setUploadProgress(0)
      setIsProcessing(false)
    },
    onSuccess: () => {
      setUploadProgress(100)
      setIsProcessing(false)
      setShowSuccess(true)
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      setTimeout(() => {
        setIsUploading(false)
        setShowSuccess(false)
        setTitle('')
        setContent('')
        setFiles([])
        setPreviews([])
        window.history.back()
      }, 2000)
    },
    onError: (err) => {
      setIsUploading(false)
      setIsProcessing(false)
      setUploadProgress(0)
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
        setShowError('Proses unggah dibatalkan')
      } else {
        const errorMessage = err.response?.data?.message || 
                            err.response?.data?.error ||
                            err.message || 
                            'Gagal posting pemberitahuan'
        setShowError(errorMessage)
      }
      setTimeout(() => setShowError(''), 4000)
    }
  })

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files)
    if (files.length + selectedFiles.length > 10) {
      setShowError('Maksimal 10 gambar yang dapat diupload')
      setTimeout(() => setShowError(''), 4000)
      return
    }

    const newFiles = [...files, ...selectedFiles]
    setFiles(newFiles)

    const newPreviews = selectedFiles.map(file => URL.createObjectURL(file))
    setPreviews(prev => [...prev, ...newPreviews])
  }

  const removeFile = (index) => {
    const newFiles = files.filter((_, i) => i !== index)
    const newPreviews = previews.filter((_, i) => i !== index)
    URL.revokeObjectURL(previews[index])
    setFiles(newFiles)
    setPreviews(newPreviews)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!title.trim() || !content.trim()) {
      setShowError('Judul dan konten wajib diisi!')
      setTimeout(() => setShowError(''), 4000)
      return
    }
    mutation.mutate()
  }

  useEffect(() => {
    return () => {
      previews.forEach(preview => URL.revokeObjectURL(preview))
    }
  }, [previews])

  return (
    <div className="flex min-h-screen bg-lp-bg relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-lp-accent/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-500/5 blur-[120px] rounded-full" />
      </div>

      <Sidebar role="admin" />
      
      <div className="flex-1 flex flex-col relative z-10 transition-all duration-300 min-w-0">
        <Navbar user={user} />
        
        <main className="flex-1 overflow-y-auto p-6 md:p-10 lg:p-14">
          <div className="max-w-4xl mx-auto">
            
            {/* Header Section */}
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-16"
            >
              <span className="text-[11px] font-mono font-bold tracking-[0.2em] uppercase text-lp-text3 mb-4 block">Official Communication</span>
              <h1 className="text-4xl md:text-5xl font-light text-lp-text tracking-tight mb-4 italic">
                Posting Pemberitahuan
              </h1>
              <p className="text-lp-text2 font-light text-lg max-w-2xl leading-relaxed">
                Siarkan informasi penting dan berita kampus kepada seluruh ekosistem akademik secara instan.
              </p>
            </motion.div>

            {/* Posting Status View */}
            <AnimatePresence mode="wait">
              {isUploading || showSuccess ? (
                <motion.div 
                  key="uploading-state"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="bg-white border border-lp-border rounded-[3rem] p-10 md:p-14 shadow-[0_64px_128px_rgba(0,0,0,0.06)] relative overflow-hidden"
                >
                  <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-lp-text text-lp-bg flex items-center justify-center font-bold text-xl shadow-lg ring-4 ring-lp-surface">
                        {user?.name?.charAt(0) || 'A'}
                      </div>
                      <div>
                        <p className="font-bold text-lp-text text-[16px] tracking-tight">{user?.name || 'Administrator'}</p>
                        <p className="text-[11px] text-lp-text3 font-mono tracking-widest uppercase">SYSLOG · NOW ACTIVE</p>
                      </div>
                    </div>
                    {!showSuccess && isUploading && uploadProgress < 100 && (
                      <button onClick={handleCancel} className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-red-500 hover:text-red-700 transition-colors">
                        ABORT TRANSMISSION
                      </button>
                    )}
                  </div>

                  <div className="mb-12">
                    <h3 className="text-3xl font-normal text-lp-text mb-6 tracking-tight italic">{title}</h3>
                    <p className="text-[16px] text-lp-text2 leading-relaxed font-light whitespace-pre-wrap">{content}</p>
                  </div>

                  {previews.length > 0 && (
                    <div className="relative rounded-[2rem] overflow-hidden bg-lp-surface border border-lp-border aspect-video shadow-inner mb-12">
                      <img 
                        src={previews[0]} 
                        alt="uploading preview" 
                        className={`w-full h-full object-cover transition-all duration-1000 ease-out ${
                          uploadProgress < 100 ? 'blur-2xl scale-110 grayscale' : 'blur-0 scale-100'
                        }`} 
                      />
                      
                      {uploadProgress < 100 && (
                        <div className="absolute inset-0 bg-lp-bg/40 flex flex-col items-center justify-center backdrop-blur-md">
                           <div className="w-24 h-24 relative flex items-center justify-center">
                              <svg className="w-full h-full transform -rotate-90">
                                <circle cx="48" cy="48" r="42" stroke="rgba(0,0,0,0.05)" strokeWidth="6" fill="transparent" />
                                <circle 
                                  cx="48" 
                                  cy="48" 
                                  r="42" 
                                  stroke="black" 
                                  strokeWidth="6" 
                                  fill="transparent" 
                                  strokeDasharray={2 * Math.PI * 42} 
                                  strokeDashoffset={(1 - uploadProgress / 100) * 2 * Math.PI * 42} 
                                  className="transition-all duration-300" 
                                  strokeLinecap="round" 
                                />
                              </svg>
                              <span className="absolute text-[14px] font-mono font-bold">{uploadProgress}%</span>
                           </div>
                           <p className="text-[11px] font-mono tracking-[0.3em] font-bold uppercase mt-6 text-lp-text">Transmitting Data</p>
                        </div>
                      )}

                      {isProcessing && !showSuccess && (
                        <div className="absolute inset-0 bg-lp-bg/80 flex flex-col items-center justify-center backdrop-blur-xl">
                          <div className="w-8 h-8 border-2 border-lp-text border-t-transparent rounded-full animate-spin mb-6"></div>
                          <p className="text-[11px] font-mono tracking-[0.3em] font-bold uppercase text-lp-text">Finalizing Broadcast</p>
                        </div>
                      )}

                      {showSuccess && (
                        <div className="absolute inset-0 bg-emerald-500/10 flex items-center justify-center backdrop-blur-sm">
                           <motion.div 
                             initial={{ scale: 0.5, opacity: 0 }} 
                             animate={{ scale: 1, opacity: 1 }} 
                             className="w-20 h-20 bg-lp-text text-white rounded-full flex items-center justify-center shadow-2xl"
                           >
                             <FiCheckCircle className="text-3xl" />
                           </motion.div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="pt-10 border-t border-lp-border flex flex-col items-center gap-4">
                     {showSuccess ? (
                       <motion.div 
                         initial={{ opacity: 0, y: 10 }}
                         animate={{ opacity: 1, y: 0 }}
                         className="flex flex-col items-center gap-2"
                       >
                         <span className="text-[13px] font-mono font-bold tracking-[0.4em] uppercase text-lp-text">BROADCAST SUCCESSFUL</span>
                         <p className="text-[13px] text-lp-text2 font-light">Redirecting to system feed...</p>
                       </motion.div>
                     ) : (
                       <div className="flex items-center gap-3">
                         <div className="w-2 h-2 rounded-full bg-lp-text animate-pulse"></div>
                         <span className="text-[11px] font-mono font-bold tracking-[0.3em] uppercase text-lp-text3">UPLINK ACTIVE</span>
                       </div>
                     )}
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="form-state"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white border border-lp-border rounded-[3rem] p-10 md:p-14 shadow-[0_32px_64px_rgba(0,0,0,0.03)]"
                >
                  <form onSubmit={handleSubmit} className="space-y-12">
                    <div className="space-y-10">
                      <div className="group">
                        <label className="block text-[11px] font-mono font-bold tracking-[0.2em] uppercase text-lp-text3 mb-4">Announcement Title *</label>
                        <input
                          type="text"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="Headline pengumuman Anda..."
                          className="w-full bg-lp-surface border border-lp-border rounded-2xl p-6 text-lp-text text-[17px] font-light tracking-tight focus:outline-none focus:ring-4 focus:ring-lp-accent/5 focus:border-lp-text transition-all duration-700"
                          required
                        />
                      </div>

                      <div className="group">
                        <label className="block text-[11px] font-mono font-bold tracking-[0.2em] uppercase text-lp-text3 mb-4">Detailed Narrative *</label>
                        <textarea
                          value={content}
                          onChange={(e) => setContent(e.target.value)}
                          rows={8}
                          placeholder="Interpretasi detail informasi yang ingin disampaikan..."
                          className="w-full bg-lp-surface border border-lp-border rounded-3xl p-8 text-lp-text text-[17px] font-light leading-relaxed focus:outline-none focus:ring-4 focus:ring-lp-accent/5 focus:border-lp-text transition-all duration-700 resize-none"
                          required
                        />
                      </div>

                      {/* Premium Upload Zone */}
                      <div>
                        <label className="block text-[11px] font-mono font-bold tracking-[0.2em] uppercase text-lp-text3 mb-6 text-center">Visual Media Assets <span className="font-sans lowercase opacity-50 font-normal italic ml-1">(Max 10)</span></label>
                        <div className="relative group">
                          <div className="absolute inset-0 bg-lp-text/5 blur-3xl rounded-[2.5rem] opacity-0 group-hover:opacity-100 transition-opacity duration-1000 -z-10"></div>
                          <div className="relative border-2 border-dashed border-lp-border bg-lp-surface/50 backdrop-blur-md rounded-[2.5rem] p-16 hover:border-lp-text transition-all duration-700 flex flex-col items-center cursor-pointer overflow-hidden group">
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={handleFileChange}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                              id="file-upload"
                            />
                            <div className="w-20 h-20 bg-white border border-lp-border rounded-[1.5rem] flex items-center justify-center mb-6 shadow-sm transition-transform duration-700 group-hover:scale-110 group-hover:rotate-6">
                              <FiUpload className="text-lp-text text-2xl" />
                            </div>
                            <p className="text-[18px] font-normal text-lp-text mb-2 tracking-tight">Drop visual assets or <em className="italic underline">browse</em>.</p>
                            <p className="text-[11px] text-lp-text3 font-medium tracking-[0.2em] uppercase opacity-60">High Resolution PNG or JPEG</p>
                          </div>
                        </div>

                        {/* Preview Management */}
                        <AnimatePresence>
                          {previews.length > 0 && (
                            <motion.div 
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 20 }}
                              className="mt-10 pt-10 border-t border-lp-border"
                            >
                              <div className="flex items-center justify-between mb-8">
                                 <span className="text-[11px] font-mono font-bold tracking-[0.2em] uppercase text-lp-text">{files.length} Assets Synchronized</span>
                                 <button 
                                   type="button" 
                                   onClick={() => { setFiles([]); setPreviews([]); }}
                                   className="text-[10px] font-mono font-bold tracking-[0.2em] text-red-500 uppercase hover:text-red-700 flex items-center gap-2"
                                 >
                                   <FiX className="text-sm" /> Clear All Data
                                 </button>
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                                {previews.map((preview, index) => (
                                  <motion.div 
                                    layout
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="relative group aspect-square rounded-2xl overflow-hidden border border-lp-border bg-lp-surface shadow-sm"
                                    key={preview}
                                  >
                                    <img src={preview} alt="Asset" className="w-full h-full object-cover grayscale-[0.3] group-hover:grayscale-0 transition-all duration-700 group-hover:scale-115" />
                                    <div className="absolute inset-0 bg-lp-text/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                      <button type="button" onClick={() => removeFile(index)} className="w-10 h-10 bg-white/20 hover:bg-lp-text text-white rounded-full flex items-center justify-center backdrop-blur-md transition-all">
                                        <FiX className="text-lg" />
                                      </button>
                                    </div>
                                  </motion.div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-6 pt-12 border-t border-lp-border">
                      <button
                        type="button"
                        onClick={() => window.history.back()}
                        className="w-full sm:w-auto px-12 py-5 border border-lp-border text-lp-text2 rounded-full text-[13px] font-bold tracking-[0.2em] uppercase hover:bg-lp-surface transition-all duration-500"
                      >
                        Discard
                      </button>
                      <button
                        type="submit"
                        disabled={mutation.isPending}
                        className="w-full sm:w-auto bg-lp-text text-lp-bg px-12 py-5 rounded-full text-[13px] font-bold tracking-[0.2em] uppercase hover:bg-lp-atext hover:-translate-y-1 transition-all duration-500 flex items-center justify-center gap-4 shadow-[0_12px_24px_rgba(0,0,0,0.1)] group"
                      >
                        {mutation.isPending ? (
                          <div className="w-5 h-5 border-2 border-lp-bg/30 border-t-lp-bg rounded-full animate-spin"></div>
                        ) : (
                          <>
                            <span>Authorize Broadcast</span>
                            <FiChevronRight className="group-hover:translate-x-1 transition-transform" />
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Global Terminal Messages */}
      <AnimatePresence>
        {showError && (
          <motion.div 
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed bottom-10 right-10 z-[100] w-full max-w-sm"
          >
             <div className="bg-lp-bg border border-lp-border rounded-[2rem] p-6 shadow-[0_32px_64px_rgba(0,0,0,0.15)] flex items-start gap-5 ring-1 ring-lp-borderA">
                <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center shrink-0 border border-red-100">
                  <FiAlertCircle className="text-red-500 text-xl" />
                </div>
                <div className="flex-1">
                   <h5 className="text-[12px] font-bold text-lp-text uppercase tracking-widest mb-1 flex items-center gap-2">
                     <FiTerminal className="text-lp-text3" /> Transmission Error
                   </h5>
                   <p className="text-[14px] text-lp-text2 font-light leading-relaxed">{showError}</p>
                </div>
                <button onClick={() => setShowError('')} className="text-lp-text3 hover:text-lp-text transition-colors">
                  <FiX />
                </button>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default PostingPemberitahuan