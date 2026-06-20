import React, { useState, useEffect, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FiX,
  FiUpload,
  FiCheckCircle,
  FiAlertCircle,
  FiChevronRight,
  FiArrowLeft,
  FiActivity,
  FiImage,
  FiFileText,
  FiType,
} from 'react-icons/fi'
import api from '../services/api'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import useAuth from '../hooks/useAuth'

const PostingComposerPage = ({
  role,
  postEndpoint,
  backPath,
  fallbackError,
}) => {
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
      formData.append('role', role)

      files.forEach((file) => {
        formData.append('media', file)
      })

      const res = await api.post(postEndpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        signal: abortControllerRef.current.signal,
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total,
          )
          setUploadProgress(percentCompleted)
          if (percentCompleted === 100) {
            setIsProcessing(true)
          }
        },
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
        const errorMessage =
          err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          fallbackError
        setShowError(errorMessage)
      }
      setTimeout(() => setShowError(''), 4000)
    },
  })

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }

  const handleFileChange = (event) => {
    const selectedFiles = Array.from(event.target.files)
    processFiles(selectedFiles)
  }

  const handleDrag = (event) => {
    event.preventDefault()
    event.stopPropagation()
    if (event.type === 'dragenter' || event.type === 'dragover') {
      setDragActive(true)
    } else if (event.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (event) => {
    event.preventDefault()
    event.stopPropagation()
    setDragActive(false)
    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      processFiles(Array.from(event.dataTransfer.files))
    }
  }

  const processFiles = (selectedFiles) => {
    if (files.length + selectedFiles.length > 10) {
      setShowError('Maksimal 10 gambar yang dapat diupload')
      setTimeout(() => setShowError(''), 4000)
      return
    }

    // Sort files alphabetically by name to fix OS selection order issues (e.g. Windows reverse shift-click)
    const sortedSelectedFiles = [...selectedFiles].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))

    const newFiles = [...files, ...sortedSelectedFiles]
    setFiles(newFiles)

    const newPreviews = sortedSelectedFiles.map((file) => URL.createObjectURL(file))
    setPreviews((prev) => [...prev, ...newPreviews])
  }

  const removeFile = (index) => {
    const newFiles = files.filter((_, i) => i !== index)
    const newPreviews = previews.filter((_, i) => i !== index)
    URL.revokeObjectURL(previews[index])
    setFiles(newFiles)
    setPreviews(newPreviews)
  }

  // Drag-and-drop reorder
  const [dragIndex, setDragIndex] = useState(null)
  const [dragOverIndex, setDragOverIndex] = useState(null)

  const handleDragStart = (index) => {
    setDragIndex(index)
  }

  const handleDragOver = (e, index) => {
    e.preventDefault()
    setDragOverIndex(index)
  }

  const handleDragEnd = () => {
    if (dragIndex === null || dragOverIndex === null || dragIndex === dragOverIndex) {
      setDragIndex(null)
      setDragOverIndex(null)
      return
    }
    // Reorder files and previews
    const reorder = (arr) => {
      const result = [...arr]
      const [removed] = result.splice(dragIndex, 1)
      result.splice(dragOverIndex, 0, removed)
      return result
    }
    setFiles(reorder(files))
    setPreviews(reorder(previews))
    setDragIndex(null)
    setDragOverIndex(null)
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!title.trim() || !content.trim()) {
      setShowError('Judul dan konten wajib diisi!')
      setTimeout(() => setShowError(''), 4000)
      return
    }
    mutation.mutate()
  }

  useEffect(() => {
    return () => {
      previews.forEach((preview) => URL.revokeObjectURL(preview))
    }
  }, [previews])

  return (
    <div className="flex min-h-screen bg-white text-black relative overflow-hidden font-sans">
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full animate-pulse" />
        <div
          className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-lp-accent/10 blur-[100px] rounded-full animate-pulse capitalize"
          style={{ animationDelay: '2s' }}
        />
        <div className="absolute top-[20%] right-[-5%] w-[20%] h-[20%] bg-blue-500/5 blur-[80px] rounded-full" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
      </div>

      <Sidebar role={role} />

      <div className="flex-1 flex flex-col relative z-10 transition-all duration-300 min-w-0">
        <Navbar user={user} />

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 scrollbar-hide">
          <div className="max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="mb-6"
            >
              <Link
                to={backPath}
                className="group inline-flex items-center gap-3 text-[11px] font-mono font-bold tracking-[0.3em] text-black/50 hover:text-black transition-all uppercase mb-4"
              >
                <div className="w-8 h-8 rounded-full border border-black/10 flex items-center justify-center group-hover:border-white/30 group-hover:bg-black/5 transition-all">
                  <FiArrowLeft className="group-hover:-translate-x-0.5 transition-transform" />
                </div>
                <span>Workspace</span>
              </Link>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="h-[1px] w-12 bg-lp-accent" />
                </div>
                <h1 className="text-2xl md:text-3xl font-light tracking-tight italic bg-clip-text text-transparent bg-gradient-to-r from-black via-black to-white/40">
                  Compose.
                </h1>
                <p className="text-black/50 font-light text-base max-w-xl leading-relaxed">
                  Craft your narrative and synchronize it with the campus network.
                </p>
              </div>
            </motion.div>

            <AnimatePresence mode="wait">
              {isUploading || showSuccess ? (
                <motion.div
                  key="uploading-state"
                  initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
                  animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                  className="relative group"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-lp-accent/10 to-purple-600/10 rounded-[3rem] blur-2xl -z-10 opacity-50 group-hover:opacity-100 transition-opacity duration-1000" />
                  <div className="bg-black/5 backdrop-blur-3xl border border-black/10 rounded-[3rem] p-10 md:p-20 shadow-[0_64px_128px_rgba(0,0,0,0.4)] relative overflow-hidden">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-6">
                        <div className="relative">
                          <div className="absolute inset-0 bg-lp-accent/20 blur-lg rounded-2xl animate-pulse" />
                          <div className="w-16 h-16 rounded-2xl bg-black/5 border border-black/10 flex items-center justify-center font-bold text-base relative z-10">
                            {user?.name?.charAt(0) || 'U'}
                          </div>
                        </div>
                        <div>
                          <p className="font-bold text-black text-base tracking-tight">
                            {user?.name || 'Organization'}
                          </p>
                          <p className="text-[10px] text-black/40 font-mono tracking-[0.3em] uppercase">
                            Sync Status: {showSuccess ? 'Completed' : 'Transmitting'}
                          </p>
                        </div>
                      </div>
                      {!showSuccess && isUploading && (
                        <button
                          onClick={handleCancel}
                          className="px-6 py-2 rounded-full border border-red-500/30 text-[10px] font-mono font-bold tracking-widest uppercase text-red-500 hover:bg-red-500/10 transition-all"
                        >
                          Abort
                        </button>
                      )}
                    </div>

                    <div className="space-y-3 mb-6">
                      <h3 className="text-3xl font-light italic leading-tight">{title}</h3>
                      <div className="h-[1px] w-full bg-gradient-to-r from-black/10 to-transparent" />
                      <p className="text-base text-black/50 font-light leading-relaxed line-clamp-3 italic">
                        "{content}"
                      </p>
                    </div>

                    {previews.length > 0 && (
                      <div className="relative rounded-[2.5rem] overflow-hidden bg-black/40 border border-black/5 aspect-[21/9] shadow-2xl mb-6 group/img">
                        <img
                          src={previews[0]}
                          alt="uploading preview"
                          className={`w-full h-full object-cover transition-all duration-1000 ease-out select-none ${
                            uploadProgress < 100
                              ? 'blur-xl scale-110 opacity-50'
                              : 'blur-0 scale-100 opacity-100'
                          }`}
                        />

                        <AnimatePresence>
                          {uploadProgress < 100 && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="absolute inset-0 bg-gradient-to-b from-blue-500/20 to-blue-500/5 flex flex-col items-center justify-center backdrop-blur-md rounded-[2.5rem]"
                            >
                              <div className="flex flex-col items-center gap-6">
                                <div className="w-12 h-12 relative flex items-center justify-center">
                                  <svg className="w-full h-full transform -rotate-90">
                                    <circle cx="40" cy="40" r="36" stroke="rgba(59,130,246,0.1)" strokeWidth="2" fill="transparent" />
                                    <motion.circle
                                      cx="40"
                                      cy="40"
                                      r="36"
                                      stroke="#3b82f6"
                                      strokeWidth="2.5"
                                      fill="transparent"
                                      strokeDasharray={2 * Math.PI * 36}
                                      initial={{ strokeDashoffset: 2 * Math.PI * 36 }}
                                      animate={{ strokeDashoffset: (1 - uploadProgress / 100) * 2 * Math.PI * 36 }}
                                      transition={{ duration: 0.3, ease: 'linear' }}
                                      strokeLinecap="round"
                                    />
                                  </svg>
                                  <span className="absolute text-sm font-bold text-black">{uploadProgress}%</span>
                                </div>
                                <div className="text-center space-y-1">
                                  <p className="text-xs font-semibold text-black">Mengunggah</p>
                                  <p className="text-[10px] text-blue-200">Tunggu...</p>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {isProcessing && !showSuccess && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="absolute inset-0 bg-gradient-to-b from-purple-500/20 to-purple-500/5 flex flex-col items-center justify-center backdrop-blur-md rounded-[2.5rem]"
                          >
                            <div className="flex flex-col items-center gap-6">
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                                className="w-10 h-10 border-2 border-purple-200 border-t-purple-500 rounded-full"
                              />
                              <div className="text-center space-y-1">
                                <p className="text-xs font-semibold text-black">Memproses</p>
                                <p className="text-[10px] text-purple-200">Verifikasi...</p>
                              </div>
                            </div>
                          </motion.div>
                        )}

                        {showSuccess && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="absolute inset-0 bg-gradient-to-b from-emerald-500/20 to-emerald-500/5 flex items-center justify-center backdrop-blur-md rounded-[2.5rem]"
                          >
                            <motion.div
                              initial={{ scale: 0, rotate: -180 }}
                              animate={{ scale: 1, rotate: 0 }}
                              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                              className="flex flex-col items-center gap-3"
                            >
                              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center">
                                <FiCheckCircle className="text-3xl text-emerald-400" />
                              </div>
                              <div className="text-center space-y-1">
                                <p className="text-xs font-semibold text-black">Tersimpan</p>
                                <p className="text-[10px] text-emerald-200">File OK</p>
                              </div>
                            </motion.div>
                          </motion.div>
                        )}
                      </div>
                    )}

                    <div className="flex flex-col items-center gap-6 pt-4 border-t border-black/5">
                      {showSuccess ? (
                        <div className="text-center space-y-2">
                          <div className="flex items-center justify-center gap-2 text-emerald-400">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            <span className="text-xs font-semibold">Posting Berhasil Dibuat</span>
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          </div>
                          <p className="text-[10px] text-black/50">Mengalihkan halaman...</p>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                          <span className="text-[10px] font-semibold uppercase text-black/50">Koneksi Server: OK</span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="form-state"
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="relative"
                >
                  <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Section 1: Narrative Details */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                    >
                      {/* Section Number Header */}
                      <div className="flex items-center gap-4 mb-4">
                        <span className="text-[11px] font-mono font-bold tracking-[0.3em] text-lp-accent">01</span>
                        <div className="h-[1px] flex-1 bg-gradient-to-r from-lp-accent/30 to-transparent" />
                        <span className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-lp-text3">Narrative Details</span>
                      </div>

                      <div className="relative bg-white border border-lp-border rounded-[2rem] shadow-[0_8px_30px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.05)] transition-all duration-500 overflow-hidden">
                        {/* Left accent border strip */}
                        <div className="absolute left-0 top-6 bottom-6 w-[3px] rounded-full bg-gradient-to-b from-lp-accent via-lp-accent/60 to-transparent" />

                        <div className="p-6 sm:p-8 pl-7 sm:pl-10">
                          <div className="grid grid-cols-1 lg:grid-cols-[1fr_2.5fr] gap-8 items-start">
                            {/* Left: Section Description */}
                            <div className="lg:sticky lg:top-4">
                              <div className="w-10 h-10 rounded-xl bg-lp-accentS flex items-center justify-center mb-4">
                                <FiType className="text-lp-accent text-base" />
                              </div>
                              <h2 className="text-lg font-bold text-lp-text tracking-tight mb-2">Headline & Story</h2>
                              <p className="text-xs text-lp-text2 leading-relaxed font-normal">
                                Tulis judul yang menarik dan narasi lengkap untuk publikasi Anda.
                              </p>
                              <div className="hidden lg:block mt-6 p-3 bg-lp-surface/60 rounded-xl border border-lp-border/50">
                                <p className="text-[10px] text-lp-text3 font-mono tracking-wide leading-relaxed">
                                  <span className="text-lp-accent font-bold">Tips:</span> Judul yang singkat dan padat akan lebih menarik perhatian pembaca.
                                </p>
                              </div>
                            </div>

                            {/* Right: Form Fields */}
                            <div className="space-y-5">
                              {/* Title Field */}
                              <div className="group/field">
                                <div className="flex items-center justify-between mb-2 px-1">
                                  <label className="text-xs font-semibold text-lp-text flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-lp-accent" />
                                    Judul Publikasi
                                    <span className="text-red-400 text-[10px]">*</span>
                                  </label>
                                  <span className={`text-[10px] font-mono tracking-wider transition-colors duration-300 ${title.length > 100 ? 'text-lp-amber font-bold' : 'text-lp-text3'}`}>
                                    {title.length}/150
                                  </span>
                                </div>
                                <div className="relative">
                                  <input
                                    type="text"
                                    value={title}
                                    onChange={(event) => setTitle(event.target.value.slice(0, 150))}
                                    placeholder="Masukkan judul publikasi Anda..."
                                    className="w-full bg-lp-surface/50 border border-lp-border rounded-xl px-4 py-3.5 text-lp-text text-sm font-semibold tracking-tight focus:outline-none focus:border-lp-accent focus:bg-white focus:ring-[3px] focus:ring-lp-accentS focus:shadow-[0_0_0_1px_rgba(75,115,255,0.1)] transition-all duration-300 placeholder:text-lp-text3/60"
                                    required
                                    maxLength={150}
                                  />
                                  {title.length > 0 && (
                                    <motion.div
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      className="absolute right-3 top-1/2 -translate-y-1/2"
                                    >
                                      <FiCheckCircle className="text-emerald-500 text-sm" />
                                    </motion.div>
                                  )}
                                </div>
                              </div>

                              {/* Content Field */}
                              <div className="group/field">
                                <div className="flex items-center justify-between mb-2 px-1">
                                  <label className="text-xs font-semibold text-lp-text flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-lp-accent" />
                                    Konten / Deskripsi
                                    <span className="text-red-400 text-[10px]">*</span>
                                  </label>
                                  <span className={`text-[10px] font-mono tracking-wider transition-colors duration-300 ${content.length > 2000 ? 'text-lp-amber font-bold' : 'text-lp-text3'}`}>
                                    {content.length} karakter
                                  </span>
                                </div>
                                <div className="relative">
                                  <textarea
                                    value={content}
                                    onChange={(event) => setContent(event.target.value)}
                                    rows={6}
                                    placeholder="Tuliskan narasi lengkap untuk publikasi Anda di sini..."
                                    className="w-full bg-lp-surface/50 border border-lp-border rounded-xl px-4 py-3.5 text-lp-text text-sm font-normal leading-relaxed focus:outline-none focus:border-lp-accent focus:bg-white focus:ring-[3px] focus:ring-lp-accentS focus:shadow-[0_0_0_1px_rgba(75,115,255,0.1)] transition-all duration-300 resize-none placeholder:text-lp-text3/60 scrollbar-hide"
                                    required
                                  />
                                  {content.length > 0 && (
                                    <motion.div
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      className="absolute right-3 top-3.5"
                                    >
                                      <FiCheckCircle className="text-emerald-500 text-sm" />
                                    </motion.div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>

                    {/* Section 2: Visual Assets */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      {/* Section Number Header */}
                      <div className="flex items-center gap-4 mb-4">
                        <span className="text-[11px] font-mono font-bold tracking-[0.3em] text-lp-accent">02</span>
                        <div className="h-[1px] flex-1 bg-gradient-to-r from-lp-accent/30 to-transparent" />
                        <span className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-lp-text3">Visual Assets</span>
                      </div>

                      <div className="relative bg-white border border-lp-border rounded-[2rem] shadow-[0_8px_30px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.05)] transition-all duration-500 overflow-hidden">
                        {/* Left accent border strip */}
                        <div className="absolute left-0 top-6 bottom-6 w-[3px] rounded-full bg-gradient-to-b from-purple-500 via-purple-400/60 to-transparent" />

                        <div className="p-6 sm:p-8 pl-7 sm:pl-10">
                          <div className="grid grid-cols-1 lg:grid-cols-[1fr_2.5fr] gap-8 items-start">
                            {/* Left: Section Description */}
                            <div className="lg:sticky lg:top-4">
                              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center mb-4">
                                <FiImage className="text-purple-500 text-base" />
                              </div>
                              <h2 className="text-lg font-bold text-lp-text tracking-tight mb-2">Media Pendukung</h2>
                              <p className="text-xs text-lp-text2 leading-relaxed font-normal">
                                Lampirkan hingga 10 gambar resolusi tinggi untuk memperkaya publikasi.
                              </p>
                              <div className="hidden lg:block mt-6 space-y-2">
                                <div className="flex items-center gap-2 text-[10px] text-lp-text3 font-mono">
                                  <span className="w-4 h-4 rounded bg-lp-surface flex items-center justify-center text-[8px] font-bold">📷</span>
                                  PNG, JPG, JPEG
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-lp-text3 font-mono">
                                  <span className="w-4 h-4 rounded bg-lp-surface flex items-center justify-center text-[8px] font-bold">📁</span>
                                  Max 10 file
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-lp-text3 font-mono">
                                  <span className="w-4 h-4 rounded bg-lp-surface flex items-center justify-center text-[8px] font-bold">↕️</span>
                                  Drag untuk urutan
                                </div>
                              </div>
                            </div>

                            {/* Right: Upload Area */}
                            <div className="space-y-5">
                              <div className="group/field">
                                <div className="flex items-center justify-between mb-2 px-1">
                                  <label className="text-xs font-semibold text-lp-text flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                    Upload Gambar
                                    <span className="text-lp-text3 text-[10px] font-normal">(opsional)</span>
                                  </label>
                                  {files.length > 0 && (
                                    <span className="text-[10px] font-mono tracking-wider text-emerald-600 font-bold">
                                      {files.length}/10 file
                                    </span>
                                  )}
                                </div>
                                <div
                                  onDragEnter={handleDrag}
                                  onDragLeave={handleDrag}
                                  onDragOver={handleDrag}
                                  onDrop={handleDrop}
                                  className={`relative group h-[160px] rounded-xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center overflow-hidden cursor-pointer ${
                                    dragActive
                                      ? 'border-lp-accent bg-lp-accentS scale-[1.01]'
                                      : 'border-lp-border bg-lp-surface/30 hover:border-lp-accent/40 hover:bg-lp-surface/60'
                                  }`}
                                >
                                  <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={handleFileChange}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    id="file-upload"
                                  />

                                  <motion.div
                                    animate={dragActive ? { scale: 1.2, rotate: 10 } : { scale: 1, rotate: 0 }}
                                    className="w-12 h-12 bg-white border border-lp-border rounded-xl flex items-center justify-center mb-3 shadow-sm relative"
                                  >
                                    <div className="absolute inset-0 bg-purple-100 blur-md rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <FiUpload className="text-base text-purple-500 relative z-10" />
                                  </motion.div>

                                  <p className="text-sm font-medium text-lp-text">
                                    Seret file ke sini atau{' '}
                                    <span className="text-lp-accent font-semibold underline underline-offset-4 decoration-lp-accent/50 cursor-pointer">
                                      pilih file
                                    </span>
                                  </p>
                                  <p className="text-[10px] text-lp-text3 mt-1.5">Format: PNG, JPG, JPEG — Resolusi tinggi disarankan</p>
                                </div>
                              </div>

                              <AnimatePresence>
                                {previews.length > 0 && (
                                  <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="space-y-3"
                                  >
                                    <div className="flex items-center justify-between px-1">
                                      <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse" />
                                        <span className="text-[10px] font-semibold tracking-wide text-emerald-600 uppercase">
                                          {files.length} file siap diupload
                                        </span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setFiles([])
                                          setPreviews([])
                                        }}
                                        className="text-[10px] font-semibold text-red-500/80 hover:text-red-500 transition-colors uppercase flex items-center gap-1.5 hover:bg-red-50 px-2 py-1 rounded-lg"
                                      >
                                        <FiX className="text-xs" /> Hapus Semua
                                      </button>
                                    </div>
                                    <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                                      {previews.map((preview, index) => (
                                        <motion.div
                                          layout
                                          initial={{ opacity: 0, scale: 0.8 }}
                                          animate={{ 
                                            opacity: 1, 
                                            scale: dragOverIndex === index ? 1.05 : 1,
                                            borderColor: dragOverIndex === index ? 'rgba(75,115,255,0.5)' : 'rgba(0,0,0,0.06)'
                                          }}
                                          exit={{ opacity: 0, scale: 0.8 }}
                                          className={`relative group aspect-square rounded-xl overflow-hidden border-2 bg-lp-surface shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing transition-shadow ${
                                            dragIndex === index ? 'opacity-50' : ''
                                          }`}
                                          key={preview}
                                          draggable
                                          onDragStart={() => handleDragStart(index)}
                                          onDragOver={(e) => handleDragOver(e, index)}
                                          onDragEnd={handleDragEnd}
                                        >
                                          {/* Slide number badge */}
                                          <div className="absolute top-1.5 left-1.5 z-20 bg-black/70 text-white text-[9px] font-bold w-5 h-5 rounded-full flex items-center justify-center backdrop-blur-sm">
                                            {index + 1}
                                          </div>
                                          <img
                                            src={preview}
                                            alt={`Slide ${index + 1}`}
                                            className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110"
                                            draggable={false}
                                          />
                                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center backdrop-blur-[1px]">
                                            <button
                                              type="button"
                                              onClick={() => removeFile(index)}
                                              className="w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                                            >
                                              <FiX className="text-xs" />
                                            </button>
                                          </div>
                                        </motion.div>
                                      ))}
                                    </div>
                                    {files.length > 1 && (
                                      <p className="text-[10px] text-lp-text3 text-center mt-1 flex items-center justify-center gap-1.5">
                                        <span>↕️</span> Seret untuk mengubah urutan slide
                                      </p>
                                    )}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>

                    {/* Footer: Summary + Actions */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="bg-lp-surface/50 border border-lp-border rounded-2xl p-5 sm:p-6"
                    >
                      {/* Live Preview Summary */}
                      <div className="flex flex-wrap items-center gap-3 mb-5 pb-5 border-b border-lp-border/60">
                        <span className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-lp-text3">Status Ringkasan:</span>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border ${
                            title.trim() ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-lp-surface text-lp-text3 border-lp-border'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${title.trim() ? 'bg-emerald-500' : 'bg-lp-text3/40'}`} />
                            Judul
                          </span>
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border ${
                            content.trim() ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-lp-surface text-lp-text3 border-lp-border'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${content.trim() ? 'bg-emerald-500' : 'bg-lp-text3/40'}`} />
                            Konten
                          </span>
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border ${
                            files.length > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-lp-surface text-lp-text3 border-lp-border'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${files.length > 0 ? 'bg-emerald-500' : 'bg-lp-text3/40'}`} />
                            Media ({files.length})
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-3 text-lp-text3">
                          <FiFileText className="text-sm" />
                          <p className="text-[10px] font-mono tracking-[0.15em] uppercase">
                            Periksa semua data sebelum posting
                          </p>
                        </div>

                        <div className="flex items-center gap-3 w-full sm:w-auto">
                          <button
                            type="button"
                            onClick={() => window.history.back()}
                            className="flex-1 sm:flex-none px-6 py-3 text-[11px] font-semibold tracking-[0.2em] uppercase text-lp-text2 hover:text-lp-text transition-all border border-lp-border rounded-xl hover:bg-white hover:shadow-sm"
                          >
                            Batal
                          </button>
                          <button
                            type="submit"
                            disabled={mutation.isPending || !title.trim() || !content.trim()}
                            className="flex-1 sm:flex-none relative group overflow-hidden bg-lp-accent text-white px-8 py-3 rounded-xl text-[11px] font-bold tracking-[0.3em] uppercase disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 shadow-[0_4px_20px_rgba(75,115,255,0.25)] hover:shadow-[0_8px_30px_rgba(75,115,255,0.35)] hover:bg-lp-atext active:scale-[0.98]"
                          >
                            <span className="relative z-10 flex items-center justify-center gap-3">
                              {mutation.isPending ? 'Mengunggah...' : 'Publikasikan'}
                              {!mutation.isPending && <FiChevronRight className="group-hover:translate-x-1 transition-transform" />}
                            </span>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>

      <AnimatePresence>
        {showError && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
            className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-md"
          >
            <div className="bg-black/5 backdrop-blur-2xl border border-red-500/30 rounded-[2rem] p-6 shadow-[0_32px_64px_rgba(0,0,0,0.5)] flex items-start gap-6">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center shrink-0 border border-red-500/20 shadow-inner">
                <FiAlertCircle className="text-red-500 text-base" />
              </div>
              <div className="flex-1">
                <h5 className="text-[10px] font-mono font-bold text-red-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <FiActivity className="animate-pulse" /> Transmission Error
                </h5>
                <p className="text-sm text-black/70 font-light leading-relaxed">{showError}</p>
              </div>
              <button onClick={() => setShowError('')} className="text-black/40 hover:text-black transition-colors">
                <FiX />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default PostingComposerPage
