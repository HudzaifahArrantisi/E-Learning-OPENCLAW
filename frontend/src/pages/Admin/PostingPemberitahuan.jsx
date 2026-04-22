import React, { useState, useEffect, useRef } from 'react'
import { useMutation, useQueryClient } from "@tanstack/react-query"
import api from '../../services/api'
import Navbar from '../../components/Navbar'
import Sidebar from '../../components/Sidebar'
import useAuth from '../../hooks/useAuth'
import { FiX, FiUpload, FiCheckCircle, FiAlertCircle, FiChevronRight, FiTerminal, FiShield, FiCpu, FiMessageSquare, FiActivity } from 'react-icons/fi'
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
  const [dragActive, setDragActive] = useState(false)
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
    processFiles(selectedFiles)
  }

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFiles(Array.from(e.dataTransfer.files))
    }
  }

  const processFiles = (selectedFiles) => {
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
    <div className="flex min-h-screen bg-[#0a0a0f] text-white relative overflow-hidden font-sans">
      {/* System Flux Background */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-600/10 blur-[140px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[140px] rounded-full animate-pulse capitalize" style={{animationDelay: '3s'}} />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100px_100px]"></div>
      </div>

      <Sidebar role="admin" />
      
      <div className="flex-1 flex flex-col relative z-10 transition-all duration-300 min-w-0">
        <Navbar user={user} />
        
        <main className="flex-1 overflow-y-auto p-6 md:p-12 lg:p-24 scrollbar-hide">
          <div className="max-w-6xl mx-auto">
            
            {/* Command Header */}
            <motion.div 
              initial={{ opacity: 0, y: -40 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-24 flex flex-col md:flex-row md:items-end justify-between gap-12"
            >
              <div className="space-y-6 flex-1">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
                    <FiShield />
                  </div>
                  <span className="text-[10px] font-mono font-bold tracking-[0.5em] uppercase text-blue-400">Security Level High</span>
                </div>
                <h1 className="text-5xl md:text-7xl font-extralight tracking-tighter text-white">
                  System <span className="font-bold italic">Broadcast.</span>
                </h1>
                <p className="text-white/40 font-light text-2xl max-w-xl leading-relaxed">
                  Disseminate official academic announcements across the institutional network.
                </p>
              </div>
              
              <div className="px-8 py-6 rounded-3xl bg-white/[0.02] border border-white/5 backdrop-blur-xl flex items-center gap-6">
                 <div className="text-right">
                    <p className="text-[10px] font-mono font-bold text-white/20 uppercase tracking-widest mb-1">Operator_ID</p>
                    <p className="text-sm font-bold text-white tracking-tight">{user?.name || 'Administrator'}</p>
                 </div>
                 <div className="w-[1px] h-10 bg-white/10"></div>
                 <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40">
                    <FiCpu className="animate-spin-slow" />
                 </div>
              </div>
            </motion.div>

            {/* View Switching */}
            <AnimatePresence mode="wait">
              {isUploading || showSuccess ? (
                <motion.div 
                  key="uploading-state"
                  initial={{ opacity: 0, scale: 0.98, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="relative group"
                >
                  <div className="absolute inset-0 bg-blue-500/5 blur-[100px] rounded-[4rem] -z-10 group-hover:bg-blue-500/10 transition-all duration-1000"></div>
                  <div className="bg-white/[0.01] backdrop-blur-3xl border border-white/10 rounded-[4rem] p-12 md:p-24 shadow-[0_100px_200px_rgba(0,0,0,0.8)] relative overflow-hidden">
                    
                    <div className="flex items-center justify-between mb-20">
                      <div className="flex items-center gap-10">
                        <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-4xl font-bold shadow-[0_20px_40px_rgba(59,130,246,0.3)]">
                           {user?.name?.charAt(0) || 'A'}
                        </div>
                        <div className="space-y-2">
                           <p className="text-2xl font-bold text-white tracking-tight">Transmission_Active</p>
                           <p className="text-[11px] text-white/30 font-mono tracking-[0.4em] uppercase font-bold">Node Host: {user?.name || 'System Root'}</p>
                        </div>
                      </div>
                      {!showSuccess && isUploading && (
                        <button onClick={handleCancel} className="px-10 py-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-[11px] font-mono font-bold tracking-[0.4em] uppercase text-red-500 hover:bg-red-500/20 transition-all">
                          Intercept
                        </button>
                      )}
                    </div>

                    <div className="space-y-12 mb-20">
                      <div className="flex items-center gap-4">
                         <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_15px_#3b82f6]"></div>
                         <h3 className="text-4xl font-bold text-white tracking-tighter italic">{title}</h3>
                      </div>
                      <div className="p-10 rounded-[2.5rem] bg-white/[0.02] border border-white/5">
                        <p className="text-xl text-white/50 font-light leading-relaxed whitespace-pre-wrap italic">"{content}"</p>
                      </div>
                    </div>

                    {previews.length > 0 && (
                      <div className="relative rounded-[3.5rem] overflow-hidden bg-black/40 border border-white/5 aspect-[21/8] shadow-2xl mb-20 group/media">
                        <img 
                          src={previews[0]} 
                          alt="uploading preview" 
                          className={`w-full h-full object-cover transition-all duration-1000 ease-out ${
                            uploadProgress < 100 ? 'blur-3xl scale-125 opacity-20' : 'blur-0 scale-100 opacity-100'
                          }`} 
                        />
                        
                        <AnimatePresence>
                          {uploadProgress < 100 && (
                            <motion.div 
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="absolute inset-0 bg-gradient-to-b from-blue-500/20 to-blue-500/5 flex flex-col items-center justify-center backdrop-blur-md rounded-[3.5rem]"
                            >
                               <div className="flex flex-col items-center gap-6">
                                  <div className="w-24 h-24 relative flex items-center justify-center">
                                    <svg className="w-full h-full transform -rotate-90">
                                      <circle cx="48" cy="48" r="44" stroke="rgba(59,130,246,0.1)" strokeWidth="2" fill="transparent" />
                                      <motion.circle 
                                        cx="48" 
                                        cy="48" 
                                        r="44" 
                                        stroke="#3b82f6" 
                                        strokeWidth="3" 
                                        fill="transparent" 
                                        strokeDasharray={2 * Math.PI * 44} 
                                        initial={{ strokeDashoffset: 2 * Math.PI * 44 }}
                                        animate={{ strokeDashoffset: (1 - uploadProgress / 100) * 2 * Math.PI * 44 }}
                                        transition={{ duration: 0.3, ease: "linear" }}
                                        strokeLinecap="round" 
                                      />
                                    </svg>
                                    <span className="absolute text-lg font-bold text-white">{uploadProgress}%</span>
                                  </div>
                                  <div className="text-center space-y-1">
                                    <p className="text-sm font-semibold text-white">Mengunggah File</p>
                                    <p className="text-xs text-blue-200">Mohon tunggu...</p>
                                  </div>
                               </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {isProcessing && !showSuccess && (
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="absolute inset-0 bg-gradient-to-b from-purple-500/20 to-purple-500/5 flex flex-col items-center justify-center backdrop-blur-md rounded-[3.5rem]"
                          >
                            <div className="flex flex-col items-center gap-6">
                              <motion.div 
                                animate={{ rotate: 360 }}
                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                className="w-12 h-12 border-3 border-purple-200 border-t-purple-500 rounded-full"
                              />
                              <div className="text-center space-y-1">
                                <p className="text-sm font-semibold text-white">Memproses File</p>
                                <p className="text-xs text-purple-200">Sedang memverifikasi...</p>
                              </div>
                            </div>
                          </motion.div>
                        )}

                        {showSuccess && (
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="absolute inset-0 bg-gradient-to-b from-emerald-500/20 to-emerald-500/5 flex items-center justify-center backdrop-blur-md rounded-[3.5rem]"
                          >
                             <motion.div 
                               initial={{ scale: 0, rotate: -180 }} 
                               animate={{ scale: 1, rotate: 0 }} 
                               transition={{ type: "spring", stiffness: 200, damping: 20 }}
                               className="flex flex-col items-center gap-4"
                             >
                               <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center">
                                 <FiCheckCircle className="text-4xl text-emerald-400" />
                               </div>
                               <div className="text-center space-y-1">
                                 <p className="text-sm font-semibold text-white">Berhasil Diunggah</p>
                                 <p className="text-xs text-emerald-200">File telah tersimpan</p>
                               </div>
                             </motion.div>
                          </motion.div>
                        )}
                      </div>
                    )}

                    <div className="pt-12 border-t border-white/5 flex flex-col items-center gap-8">
                       {showSuccess ? (
                         <div className="text-center space-y-3">
                           <div className="flex items-center justify-center gap-2 text-emerald-400">
                             <div className="w-2 h-2 rounded-full bg-emerald-400" />
                             <span className="text-sm font-semibold">Notifikasi Berhasil Diposting</span>
                             <div className="w-2 h-2 rounded-full bg-emerald-400" />
                           </div>
                           <p className="text-xs text-white/60">Sedang mengarahkan ulang...</p>
                         </div>
                       ) : (
                         <div className="flex items-center gap-10">
                           <div className="flex items-center gap-3">
                             <div className="w-2 h-2 rounded-full bg-emerald-500" />
                             <span className="text-[10px] font-semibold uppercase text-white/50">Upload: Siap</span>
                           </div>
                           <div className="flex items-center gap-3">
                             <div className="w-2 h-2 rounded-full bg-blue-500" />
                             <span className="text-[10px] font-semibold uppercase text-white/50">Server: Terhubung</span>
                           </div>
                         </div>
                       )}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="form-state"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="grid grid-cols-1 lg:grid-cols-12 gap-16"
                >
                  <form onSubmit={handleSubmit} className="lg:col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-16">
                    {/* Left Column: Form Inputs */}
                    <div className="lg:col-span-7 space-y-16">
                      <div className="space-y-12">
                        <div className="group relative">
                          <label className="text-[10px] font-mono font-bold text-blue-500 uppercase tracking-[0.5em] mb-6 block opacity-60 group-focus-within:opacity-100 transition-opacity">Request_Header_Title</label>
                          <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Announcement Headline..."
                            className="w-full bg-white/[0.01] border border-white/5 rounded-3xl p-8 text-3xl font-light italic text-white focus:outline-none focus:border-blue-500/50 transition-all duration-700 placeholder:text-white/5"
                            required
                          />
                        </div>

                        <div className="group relative">
                          <label className="text-[10px] font-mono font-bold text-blue-500 uppercase tracking-[0.5em] mb-6 block opacity-60 group-focus-within:opacity-100 transition-opacity">Payload_Content_Data</label>
                          <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            rows={10}
                            placeholder="Detailed narrative transmission..."
                            className="w-full bg-white/[0.01] border border-white/5 rounded-[2.5rem] p-10 text-xl font-light leading-relaxed text-white focus:outline-none focus:border-blue-500/50 transition-all duration-700 resize-none placeholder:text-white/5 scrollbar-hide"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Upload & Actions */}
                    <div className="lg:col-span-5 space-y-16 flex flex-col">
                      <div className="flex-1 space-y-12">
                        <label className="text-[10px] font-mono font-bold text-blue-500 uppercase tracking-[0.5em] block opacity-60">Media_Attachment_Interface</label>
                        
                        <div 
                          onDragEnter={handleDrag}
                          onDragLeave={handleDrag}
                          onDragOver={handleDrag}
                          onDrop={handleDrop}
                          className={`relative h-[400px] rounded-[3rem] border-2 border-dashed transition-all duration-1000 flex flex-col items-center justify-center group/uploader cursor-pointer ${
                            dragActive ? 'border-blue-500 bg-blue-500/5' : 'border-white/5 hover:border-blue-500/20 bg-white/[0.01]'
                          }`}
                        >
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleFileChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          />
                          
                          <div className="w-24 h-24 bg-white/5 border border-white/10 rounded-[2rem] flex items-center justify-center mb-10 group-hover/uploader:bg-blue-500 group-hover/uploader:text-white transition-all duration-700 shadow-2xl">
                             <FiUpload className="text-3xl" />
                          </div>
                          
                          <div className="text-center space-y-3">
                             <p className="text-xl font-light text-white/60 italic">Drop payload assets.</p>
                             <p className="text-[10px] text-white/10 font-mono tracking-[0.4em] uppercase">Limit: 10 Parallel Channels</p>
                          </div>
                        </div>

                        {/* Staged Modules */}
                        <AnimatePresence>
                          {previews.length > 0 && (
                            <motion.div 
                              initial={{ opacity: 0, x: 20 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="space-y-6 pt-10 border-t border-white/5"
                            >
                               <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-mono font-bold tracking-[0.4em] text-white/30 uppercase">Modules_Ready: {files.length}</span>
                                  <button type="button" onClick={() => { setFiles([]); setPreviews([]); }} className="text-[10px] font-mono text-red-500/50 hover:text-red-500 transition-colors uppercase tracking-widest font-bold">Wipe_Queue</button>
                               </div>
                               <div className="grid grid-cols-4 gap-4">
                                 {previews.map((preview, index) => (
                                   <div key={preview} className="relative aspect-square rounded-2xl overflow-hidden border border-white/5 group/asset">
                                      <img src={preview} alt="Asset" className="w-full h-full object-cover transition-all duration-700 group-hover/asset:scale-125" />
                                      <button type="button" onClick={() => removeFile(index)} className="absolute inset-0 bg-red-600/60 opacity-0 group-hover/asset:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                         <FiX className="text-2xl" />
                                      </button>
                                   </div>
                                 ))}
                               </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Finalization Actions */}
                      <div className="space-y-8 pt-12 border-t border-white/5">
                        <div className="flex items-center gap-6 justify-between p-6 rounded-3xl bg-white/[0.01] border border-white/5">
                           <div className="flex items-center gap-4">
                              <FiMessageSquare className="text-blue-500" />
                              <span className="text-[10px] font-mono tracking-[0.2em] text-white/30 uppercase">Broadcast Mode: Global</span>
                           </div>
                           <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]"></div>
                        </div>
                        
                        <div className="flex gap-6">
                           <button
                             type="button"
                             onClick={() => window.history.back()}
                             className="flex-1 py-6 rounded-full border border-white/5 text-[11px] font-mono font-bold tracking-[0.5em] uppercase hover:bg-white/5 transition-all text-white/30 hover:text-white"
                           >
                             Cancel
                           </button>
                           <button
                             type="submit"
                             disabled={mutation.isPending}
                             className="flex-[2] relative group overflow-hidden bg-white text-black py-6 rounded-full text-[12px] font-bold tracking-[0.6em] uppercase transition-all duration-700 shadow-[0_30px_60px_rgba(255,255,255,0.1)] hover:shadow-white/20"
                           >
                             <div className="absolute inset-0 bg-blue-600 w-0 group-hover:w-full transition-all duration-700 ease-out"></div>
                             <span className="relative z-10 flex items-center justify-center gap-6 group-hover:text-white transition-colors duration-700">
                                {mutation.isPending ? 'Uploading...' : 'Authorize_Broadcast'}
                                {!mutation.isPending && <FiChevronRight className="group-hover:translate-x-2 transition-transform duration-500" />}
                             </span>
                           </button>
                        </div>
                      </div>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Persistence Notifications */}
      <AnimatePresence>
        {showError && (
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed bottom-12 right-12 z-[100] w-full max-w-sm"
          >
             <div className="bg-[#101015] border border-red-500/30 rounded-[3rem] p-10 shadow-[0_50px_100px_rgba(0,0,0,0.8)] relative overflow-hidden group/err">
                <div className="absolute inset-0 bg-red-500/5 blur-[50px] -z-10 group-hover/err:bg-red-500/10 transition-all"></div>
                <div className="flex items-start gap-8">
                  <div className="w-16 h-16 rounded-[1.5rem] bg-red-500/10 flex items-center justify-center shrink-0 border border-red-500/20">
                    <FiAlertCircle className="text-red-500 text-3xl" />
                  </div>
                  <div className="flex-1 space-y-3">
                     <h5 className="text-[11px] font-mono font-bold text-red-500 uppercase tracking-[0.6em] flex items-center gap-4">
                       <FiActivity className="animate-pulse" /> ERROR_REPORT
                     </h5>
                     <p className="text-lg text-white/50 font-light leading-relaxed italic">"{showError}"</p>
                  </div>
                  <button onClick={() => setShowError('')} className="text-white/10 hover:text-white transition-colors">
                    <FiX className="text-2xl" />
                  </button>
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default PostingPemberitahuan
n