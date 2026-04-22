import React, { useState, useEffect, useRef } from 'react'
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Link } from 'react-router-dom'
import api from '../../services/api'
import Navbar from '../../components/Navbar'
import Sidebar from '../../components/Sidebar'
import useAuth from '../../hooks/useAuth'
import { FiX, FiUpload, FiCheckCircle, FiAlertCircle, FiChevronRight, FiArrowLeft, FiActivity, FiImage, FiType, FiGlobe } from 'react-icons/fi'
import { motion, AnimatePresence } from 'framer-motion'

const PostingOrmawa = () => {
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
      formData.append('role', 'ormawa')
      
      files.forEach((file) => {
        formData.append('media', file)
      })

      const res = await api.post('/api/ormawa/posts', formData, {
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
                            'Gagal posting ormawa'
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
    <div className="flex min-h-screen bg-[#020617] text-white relative overflow-hidden font-sans">
      {/* Liquid Background */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/10 blur-[150px] rounded-full animate-blob" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[130px] rounded-full animate-blob animation-delay-2000" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-30 mix-blend-soft-light"></div>
      </div>

      <Sidebar role="ormawa" />
      
      <div className="flex-1 flex flex-col relative z-10 transition-all duration-300 min-w-0">
        <Navbar user={user} />
        
        <main className="flex-1 overflow-y-auto p-6 md:p-12 lg:p-20 scrollbar-hide">
          <div className="max-w-5xl mx-auto">
            
            {/* Elegant Header */}
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              className="mb-20"
            >
              <Link 
                to="/ormawa/dashboard"
                className="group inline-flex items-center gap-4 text-[11px] font-mono font-bold tracking-[0.4em] text-white/30 hover:text-emerald-400 transition-all uppercase mb-12"
              >
                <div className="w-10 h-10 rounded-full border border-white/5 flex items-center justify-center group-hover:border-emerald-500/30 group-hover:bg-emerald-500/5 transition-all">
                  <FiArrowLeft className="group-hover:-translate-x-1 transition-transform" />
                </div>
                <span>Sync Center</span>
              </Link>
              
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="h-[2px] w-16 bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
                  <span className="text-[10px] font-mono tracking-[0.5em] text-emerald-400 uppercase font-bold">Broadcast Tool</span>
                </div>
                <h1 className="text-6xl md:text-8xl font-light tracking-tighter italic bg-clip-text text-transparent bg-gradient-to-br from-white via-white to-emerald-500/20">
                  Broadcast.
                </h1>
                <p className="text-white/40 font-light text-2xl max-w-2xl leading-relaxed">
                   Siarkan narasi dan visual ormawa Anda ke seluruh jaringan akademik.
                </p>
              </div>
            </motion.div>

            {/* Portal Interface */}
            <AnimatePresence mode="wait">
              {isUploading || showSuccess ? (
                <motion.div 
                  key="uploading-state"
                  initial={{ opacity: 0, scale: 0.9, filter: 'blur(20px)' }}
                  animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                  className="relative group"
                >
                  <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/10 to-blue-500/10 rounded-[4rem] blur-3xl -z-10"></div>
                  <div className="bg-white/[0.02] backdrop-blur-3xl border border-white/10 rounded-[4rem] p-12 md:p-24 shadow-[0_80px_160px_rgba(0,0,0,0.6)] relative overflow-hidden">
                    
                    <div className="flex items-center justify-between mb-20">
                      <div className="flex items-center gap-8">
                        <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center font-bold text-3xl text-emerald-400 shadow-[0_0_40px_rgba(16,185,129,0.1)]">
                          {user?.name?.charAt(0) || 'O'}
                        </div>
                        <div>
                          <p className="font-bold text-white text-xl tracking-tight">{user?.name || 'Ormawa Entity'}</p>
                          <div className="flex items-center gap-3 mt-1">
                             <div className={`w-2 h-2 rounded-full ${showSuccess ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-emerald-500 animate-ping'}`}></div>
                             <p className="text-[10px] text-white/30 font-mono tracking-[0.4em] uppercase">Channel {showSuccess ? 'Secured' : 'Live'}</p>
                          </div>
                        </div>
                      </div>
                      {!showSuccess && isUploading && (
                        <button onClick={handleCancel} className="px-8 py-3 rounded-full border border-red-500/20 text-[10px] font-mono font-bold tracking-[0.4em] uppercase text-red-500 hover:bg-red-500/5 transition-all">
                          Abort Dispersal
                        </button>
                      )}
                    </div>

                    <div className="space-y-10 mb-20">
                      <h3 className="text-4xl font-light italic leading-snug text-white/90">{title}</h3>
                      <div className="h-[1px] w-32 bg-emerald-500/30"></div>
                      <p className="text-xl text-white/40 font-light leading-relaxed italic line-clamp-4">"{content}"</p>
                    </div>

                    {previews.length > 0 && (
                      <div className="relative rounded-[3rem] overflow-hidden bg-black/60 border border-white/5 aspect-[16/7] shadow-2xl mb-20">
                        <img 
                          src={previews[0]} 
                          alt="uploading preview" 
                          className={`w-full h-full object-cover transition-all duration-1000 ease-out ${
                            uploadProgress < 100 ? 'blur-2xl scale-125 opacity-30 grayscale' : 'blur-0 scale-100 opacity-100'
                          }`} 
                        />
                        
                        <AnimatePresence>
                          {uploadProgress < 100 && (
                            <motion.div 
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="absolute inset-0 flex flex-col items-center justify-center backdrop-blur-md bg-black/40"
                            >
                               <div className="w-32 h-32 relative flex items-center justify-center">
                                  <svg className="w-full h-full transform -rotate-90">
                                    <circle cx="64" cy="64" r="60" stroke="rgba(16,185,129,0.05)" strokeWidth="2" fill="transparent" />
                                    <motion.circle 
                                      cx="64" 
                                      cy="64" 
                                      r="60" 
                                      stroke="#10b981" 
                                      strokeWidth="2" 
                                      fill="transparent" 
                                      strokeDasharray={2 * Math.PI * 60} 
                                      initial={{ strokeDashoffset: 2 * Math.PI * 60 }}
                                      animate={{ strokeDashoffset: (1 - uploadProgress / 100) * 2 * Math.PI * 60 }}
                                      transition={{ duration: 0.8, ease: "easeInOut" }}
                                      strokeLinecap="round" 
                                    />
                                  </svg>
                                  <span className="absolute text-xl font-mono font-bold text-emerald-400">{uploadProgress}%</span>
                               </div>
                               <p className="text-[12px] font-mono tracking-[0.6em] font-bold uppercase mt-12 text-white/30">Uploading Core Modules</p>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {isProcessing && !showSuccess && (
                          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center backdrop-blur-3xl">
                            <div className="flex gap-2 mb-8">
                               {[0, 1, 2].map(i => (
                                 <motion.div 
                                   key={i}
                                   animate={{ y: [0, -10, 0], opacity: [0.3, 1, 0.3] }}
                                   transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                                   className="w-2 h-2 rounded-full bg-emerald-500"
                                 />
                               ))}
                            </div>
                            <p className="text-[11px] font-mono tracking-[0.6em] font-bold uppercase text-emerald-400">Synchronizing Nodes</p>
                          </div>
                        )}

                        {showSuccess && (
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="absolute inset-0 bg-emerald-500/5 flex items-center justify-center backdrop-blur-xl"
                          >
                             <motion.div 
                               initial={{ scale: 0, scaleY: 0 }} 
                               animate={{ scale: 1, scaleY: 1 }} 
                               className="w-28 h-28 bg-white text-emerald-600 rounded-full flex items-center justify-center shadow-[0_0_80px_rgba(16,185,129,0.4)]"
                             >
                               <FiCheckCircle className="text-5xl" />
                             </motion.div>
                          </motion.div>
                        )}
                      </div>
                    )}

                    <div className="pt-12 border-t border-white/5 flex flex-col items-center">
                       {showSuccess ? (
                         <div className="text-center space-y-4">
                           <span className="text-[14px] font-mono font-bold tracking-[0.8em] uppercase text-emerald-400">Diffusion Complete</span>
                           <p className="text-[12px] text-white/20 font-light tracking-widest">Post identity secured in blockchain.</p>
                         </div>
                       ) : (
                         <div className="flex items-center gap-6">
                           <div className="flex -space-x-2">
                             {[1, 2, 3].map(i => <div key={i} className="w-6 h-6 rounded-full border-2 border-slate-900 bg-emerald-500/20" />)}
                           </div>
                           <span className="text-[11px] font-mono font-bold tracking-[0.5em] uppercase text-white/20 italic">Node Connection: High Fidelity</span>
                         </div>
                       )}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="form-state"
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-24"
                >
                  <form onSubmit={handleSubmit} className="space-y-32">
                    
                    {/* Narrative Construction */}
                    <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-20">
                      <div className="space-y-8">
                        <div className="flex items-center gap-4 text-emerald-500">
                           <FiType className="text-2xl" />
                           <span className="text-[11px] font-mono font-bold tracking-[0.5em] uppercase">The Narrative</span>
                        </div>
                        <h2 className="text-4xl font-light text-white/80 leading-tight">Define Your Story.</h2>
                        <p className="text-lg text-white/30 font-light leading-relaxed">Let your words echo across the campus. Craft a compelling headline and deep narrative.</p>
                      </div>

                      <div className="space-y-12 bg-white/[0.01] p-12 rounded-[3.5rem] border border-white/5 backdrop-blur-sm">
                        <div className="group relative">
                          <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Headline of your event..."
                            className="w-full bg-transparent border-b border-white/10 py-6 text-3xl font-light italic text-white focus:outline-none focus:border-emerald-500 transition-all duration-700 placeholder:text-white/5"
                            required
                          />
                          <div className="absolute top-[120%] right-0 text-[10px] font-mono text-white/10 uppercase tracking-widest group-focus-within:text-emerald-500/40 transition-colors">Heading V1.0</div>
                        </div>

                        <div className="group relative">
                          <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            rows={8}
                            placeholder="Draft the details..."
                            className="w-full bg-transparent border-b border-white/10 py-6 text-xl font-light leading-relaxed text-white focus:outline-none focus:border-emerald-500 transition-all duration-700 resize-none placeholder:text-white/5 scrollbar-hide"
                            required
                          />
                          <div className="absolute top-[105%] right-0 text-[10px] font-mono text-white/10 uppercase tracking-widest group-focus-within:text-emerald-500/40 transition-colors">Body_Data_Cluster</div>
                        </div>
                      </div>
                    </div>

                    {/* Visual Interface */}
                    <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-20">
                      <div className="space-y-8">
                        <div className="flex items-center gap-4 text-emerald-500">
                           <FiImage className="text-2xl" />
                           <span className="text-[11px] font-mono font-bold tracking-[0.5em] uppercase">Visual Hub</span>
                        </div>
                        <h2 className="text-4xl font-light text-white/80 leading-tight">Attach Assets.</h2>
                        <p className="text-lg text-white/30 font-light leading-relaxed">Provide visual context. PNG, JPEG, up to 10 nodes for optimal reach.</p>
                      </div>

                      <div className="space-y-12">
                        <div 
                          onDragEnter={handleDrag}
                          onDragLeave={handleDrag}
                          onDragOver={handleDrag}
                          onDrop={handleDrop}
                          className={`relative group h-[400px] rounded-[4rem] border-2 border-dashed transition-all duration-1000 flex flex-col items-center justify-center overflow-hidden bg-white/[0.01] hover:bg-emerald-500/[0.02] cursor-pointer ${
                            dragActive ? 'border-emerald-500 scale-[0.98] bg-emerald-500/5' : 'border-white/5 hover:border-emerald-500/30'
                          }`}
                        >
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleFileChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          />
                          
                          <motion.div 
                            animate={dragActive ? { y: -20, scale: 1.1 } : { y: 0, scale: 1 }}
                            className="w-28 h-28 bg-emerald-500/5 border border-emerald-500/20 rounded-[2.5rem] flex items-center justify-center mb-10 shadow-[0_0_50px_rgba(16,185,129,0.1)] group-hover:bg-emerald-500/10 group-hover:border-emerald-500/40 transition-all duration-700"
                          >
                             <FiUpload className="text-3xl text-emerald-400 group-hover:animate-bounce" />
                          </motion.div>
                          
                          <div className="text-center space-y-3">
                            <p className="text-2xl font-light text-white/60">Transplant assets here or <em className="text-emerald-400 underline underline-offset-8 decoration-emerald-500/30 font-normal">explore</em>.</p>
                            <p className="text-[10px] text-white/10 font-mono tracking-[0.5em] uppercase">Max Load: 10 Synchronized Modules</p>
                          </div>
                        </div>

                        {/* Liquid Visual Preview */}
                        <AnimatePresence>
                          {previews.length > 0 && (
                            <motion.div 
                              initial={{ opacity: 0, y: 30 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.9 }}
                              className="space-y-12 pt-12"
                            >
                              <div className="flex items-center justify-between px-4">
                                 <div className="flex items-center gap-4">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                    <span className="text-[11px] font-mono font-bold tracking-[0.5em] uppercase text-emerald-400/60">{files.length} Nodes in Buffer</span>
                                 </div>
                                 <button 
                                   type="button" 
                                   onClick={() => { setFiles([]); setPreviews([]); }}
                                   className="text-[10px] font-mono font-bold tracking-[0.5em] text-red-400/50 hover:text-red-500 transition-all uppercase flex items-center gap-3 border border-red-500/10 px-6 py-2 rounded-full hover:bg-red-500/5"
                                 >
                                   <FiX className="text-sm" /> Wipe Buffer
                                 </button>
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                                {previews.map((preview, index) => (
                                  <motion.div 
                                    layout
                                    initial={{ opacity: 0, rotateY: 90 }}
                                    animate={{ opacity: 1, rotateY: 0 }}
                                    exit={{ opacity: 0, scale: 0.5 }}
                                    className="relative group aspect-[4/5] rounded-[2rem] overflow-hidden border border-white/10 bg-slate-900 shadow-2xl"
                                    key={preview}
                                  >
                                    <img src={preview} alt="Asset" className="w-full h-full object-cover transition-all duration-1000 group-hover:scale-125 group-hover:rotate-6 grayscale-[0.5] group-hover:grayscale-0" />
                                    <div className="absolute inset-0 bg-emerald-950/60 opacity-0 group-hover:opacity-100 transition-all duration-700 flex items-center justify-center backdrop-blur-sm">
                                      <button type="button" onClick={() => removeFile(index)} className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:scale-125 hover:rotate-90 transition-all">
                                        <FiX className="text-2xl" />
                                      </button>
                                    </div>
                                    <div className="absolute bottom-4 left-4 text-[10px] font-mono text-white/30 uppercase opacity-0 group-hover:opacity-100 transition-opacity">Asset_{index + 1}</div>
                                  </motion.div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* Interaction Commands */}
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-12 pt-32 border-t border-white/5">
                      <div className="flex items-center gap-6 group cursor-help">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/30 group-hover:text-emerald-400 group-hover:bg-emerald-400/5 transition-all">
                           <FiGlobe className="text-xl animate-spin-slow" />
                        </div>
                        <p className="text-[11px] font-mono tracking-[0.3em] uppercase font-light text-white/20 group-hover:text-white/40 transition-colors">Satellite Uplink: Established</p>
                      </div>
                      
                      <div className="flex items-center gap-8 w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={() => window.history.back()}
                          className="flex-1 sm:flex-none px-12 py-6 text-[11px] font-mono font-bold tracking-[0.5em] uppercase text-white/20 hover:text-white transition-all border border-white/5 rounded-full hover:bg-white/5"
                        >
                          Discard
                        </button>
                        <button
                          type="submit"
                          disabled={mutation.isPending}
                          className="flex-1 sm:flex-none relative group overflow-hidden bg-emerald-500 text-black px-16 py-6 rounded-full text-[12px] font-bold tracking-[0.6em] uppercase disabled:opacity-50 transition-all duration-700 shadow-[0_20px_60px_rgba(16,185,129,0.2)] hover:shadow-emerald-500/40"
                        >
                          <div className="absolute inset-0 bg-white w-0 group-hover:w-full transition-all duration-700 ease-out"></div>
                          <span className="relative z-10 flex items-center justify-center gap-6 transition-colors duration-700">
                             {mutation.isPending ? 'Syncing...' : 'Broadcast'}
                             {!mutation.isPending && <FiChevronRight className="group-hover:translate-x-2 transition-transform duration-500" />}
                          </span>
                        </button>
                      </div>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Terminal Feedbacks */}
      <AnimatePresence>
        {showError && (
          <motion.div 
            initial={{ opacity: 0, x: 100, filter: 'blur(10px)' }}
            animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }}
            className="fixed bottom-12 right-12 z-[100] w-[90%] max-w-sm"
          >
             <div className="bg-[#0f172a]/80 backdrop-blur-3xl border border-red-500/30 rounded-[2.5rem] p-8 shadow-[0_40px_80px_rgba(0,0,0,0.7)] flex items-start gap-8">
                <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center shrink-0 border border-red-500/20">
                  <FiAlertCircle className="text-red-500 text-3xl" />
                </div>
                <div className="flex-1">
                   <h5 className="text-[11px] font-mono font-bold text-red-500 uppercase tracking-[0.4em] mb-3 flex items-center gap-3">
                     <FiActivity className="animate-pulse" /> Sys_Error
                   </h5>
                   <p className="text-md text-white/60 font-light leading-relaxed">{showError}</p>
                </div>
                <button onClick={() => setShowError('')} className="text-white/10 hover:text-white transition-colors">
                  <FiX />
                </button>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default PostingOrmawa