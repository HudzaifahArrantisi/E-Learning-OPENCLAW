import React, { useState, useEffect, useRef } from 'react'
import { useMutation, useQueryClient } from "@tanstack/react-query"
import api from '../../services/api'
import Navbar from '../../components/Navbar'
import Sidebar from '../../components/Sidebar'
import useAuth from '../../hooks/useAuth'
import { FaTimes, FaUpload, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa'
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
      console.error('Posting error:', err)
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
    <div className="flex min-h-screen bg-lp-bg font-sans font-light">
      <Sidebar role="admin" />
      <div className="flex-1 relative">
        <Navbar user={user} />
        
        {/* Background Decorative Layer */}
        <div className="absolute top-0 left-0 w-full h-[400px] bg-gradient-to-b from-blue-50/50 via-white to-transparent pointer-events-none z-0" />
        
        <div className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8 mt-4 relative z-10">
          
          {/* Header Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 text-center"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-100/50 text-blue-600 mb-4 ring-1 ring-blue-100">
              <FaUpload className="text-2xl" />
            </div>
            <h1 className="text-3xl font-bold text-lp-text tracking-tight mb-2">Posting Pemberitahuan</h1>
            <p className="text-lp-text2 font-light">Sebarkan pengumuman resmi ke seluruh civitas akademika</p>
          </motion.div>

          {/* Form Section -> Optimistic Feed UI or Normal Form */}
          {isUploading || showSuccess ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-xl mx-auto bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-lp-border"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                    {user?.name?.charAt(0) || 'A'}
                  </div>
                  <div>
                    <p className="font-bold text-lp-text text-sm">{user?.name || 'Admin'}</p>
                    <p className="text-xs text-blue-600 font-medium">Berapa detik yang lalu</p>
                  </div>
                </div>
                {!showSuccess && isUploading && uploadProgress < 100 && (
                  <button onClick={handleCancel} className="text-xs font-semibold text-red-500 hover:text-red-600 px-3 py-1.5 bg-red-50 rounded-full transition-colors">
                    Batalkan
                  </button>
                )}
              </div>

              <div className="mb-4">
                <h3 className="font-bold text-lp-text text-lg mb-1">{title}</h3>
                <p className="text-sm text-lp-text2 whitespace-pre-wrap">{content}</p>
              </div>

              {previews.length > 0 && (
                <div className="relative rounded-2xl overflow-hidden bg-gray-100 aspect-video group shadow-inner">
                  <img 
                    src={previews[0]} 
                    alt="uploading preview" 
                    className={`w-full h-full object-cover transition-all duration-700 ease-in-out ${
                      uploadProgress < 100 ? 'blur-md scale-105 grayscale-[20%]' : 'blur-0 scale-100 grayscale-0'
                    }`} 
                  />
                  
                  {previews.length > 1 && (
                    <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md text-white text-xs font-bold px-2.5 py-1 rounded-full">
                      1/{previews.length}
                    </div>
                  )}

                  {uploadProgress < 100 && (
                    <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center transition-opacity duration-300">
                      <div className="relative flex items-center justify-center">
                        <svg className="w-16 h-16 transform -rotate-90">
                          <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="5" fill="transparent" className="text-white/20" />
                          <circle 
                            cx="32" 
                            cy="32" 
                            r="28" 
                            stroke="currentColor" 
                            strokeWidth="5" 
                            fill="transparent" 
                            strokeDasharray={28 * 2 * Math.PI} 
                            strokeDashoffset={28 * 2 * Math.PI - (uploadProgress / 100) * 28 * 2 * Math.PI} 
                            className="text-white transition-all duration-300" 
                            strokeLinecap="round" 
                          />
                        </svg>
                        <span className="absolute text-sm font-bold text-white drop-shadow-md">{uploadProgress}%</span>
                      </div>
                      <p className="text-white mt-3 font-medium text-sm drop-shadow-md">Mengunggah gambar...</p>
                    </div>
                  )}

                  {isProcessing && !showSuccess && (
                    <div className="absolute inset-0 bg-black/20 flex flex-col items-center justify-center transition-opacity duration-300">
                      <div className="bg-white/95 backdrop-blur-md px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3">
                        <svg className="w-5 h-5 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="text-sm font-bold text-blue-600">Memproses Posting...</span>
                      </div>
                    </div>
                  )}

                  {showSuccess && (
                    <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center backdrop-blur-[1px]">
                       <motion.div 
                         initial={{ scale: 0.5, opacity: 0 }} 
                         animate={{ scale: 1, opacity: 1 }} 
                         className="w-16 h-16 bg-green-500 text-white rounded-full flex items-center justify-center shadow-2xl"
                       >
                         <FaCheckCircle className="text-3xl" />
                       </motion.div>
                    </div>
                  )}
                </div>
              )}
              {previews.length === 0 && (
                <div className="py-8 flex flex-col items-center justify-center bg-gray-50 rounded-2xl mt-4 border border-gray-100">
                   {uploadProgress < 100 ? (
                     <div className="w-full max-w-xs">
                       <div className="bg-gray-200 rounded-full h-2.5 mb-2 overflow-hidden shadow-inner">
                         <div className="bg-blue-600 h-full rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                       </div>
                       <p className="text-center text-xs font-semibold text-blue-600">{uploadProgress}% Mengunggah...</p>
                     </div>
                   ) : isProcessing && !showSuccess ? (
                     <div className="flex items-center gap-2 text-blue-600">
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                       <span className="text-sm font-semibold">Memproses data...</span>
                     </div>
                   ) : showSuccess ? (
                     <div className="flex items-center gap-2 text-green-600">
                        <FaCheckCircle className="text-lg" />
                       <span className="text-sm font-bold">Berhasil!</span>
                     </div>
                   ) : null}
                </div>
              )}
            </motion.div>
          ) : (
          <motion.form 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onSubmit={handleSubmit} 
            className="bg-white rounded-[2rem] p-6 sm:p-8 md:p-10 shadow-sm border border-gray-100/80"
          >
            <div className="space-y-6">
              {/* Title Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">
                  Judul Pemberitahuan <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Libur Semester Ganjil 2025"
                  className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-50 transition-all outline-none text-gray-800 placeholder-gray-400 font-medium"
                  required
                />
              </div>

              {/* Content Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">
                  Isi Pemberitahuan <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={5}
                  placeholder="Ketikkan penjabaran lengkap pengumuman di sini..."
                  className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-50 transition-all outline-none resize-none text-gray-800 placeholder-gray-400 leading-relaxed max-h-[300px]"
                  required
                />
              </div>

              {/* File Upload Section */}
              <div>
                <div className="flex items-end justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Lampiran Gambar
                  </label>
                  <span className="text-gray-400 text-xs font-medium bg-gray-100 px-2 py-1 rounded-md">Maks. 10 gambar</span>
                </div>
                
                <div className="relative border-2 border-dashed border-gray-300 rounded-2xl p-8 sm:p-10 hover:bg-blue-50/50 hover:border-blue-300 transition-colors group text-center cursor-pointer overflow-hidden bg-gray-50">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    id="file-upload"
                  />
                  <div className="relative z-0 flex flex-col items-center">
                    <div className="w-12 h-12 bg-white shadow-sm border border-gray-100 rounded-full flex items-center justify-center mb-3 group-hover:-translate-y-1 transition-transform duration-300">
                      <FaUpload className="text-lg text-blue-500" />
                    </div>
                    <p className="text-gray-800 font-semibold mb-1 text-sm sm:text-base">Tarik & Lepas gambar ke sini</p>
                    <p className="text-xs sm:text-sm text-gray-500">atau klik untuk menelusuri (JPG, PNG. Maks 10MB)</p>
                  </div>
                </div>

                {/* File Counter & Quick Action */}
                {files.length > 0 && (
                  <div className="mt-3 flex items-center justify-between px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl">
                    <span className="text-gray-700 text-sm font-medium flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      {files.length} gambar siap diunggah
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        files.forEach((_, index) => removeFile(index))
                      }}
                      className="text-red-500 hover:text-red-600 text-sm font-semibold transition-colors px-2 py-1 hover:bg-red-50 rounded-lg"
                    >
                      Bersihkan Semua
                    </button>
                  </div>
                )}

                {/* Preview Grid */}
                {previews.length > 0 && (
                  <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    <AnimatePresence>
                      {previews.map((preview, index) => (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          key={preview} 
                          className="relative group rounded-xl overflow-hidden shadow-sm border border-gray-200 aspect-square bg-gray-100"
                        >
                          <img 
                            src={preview} 
                            alt={`Preview ${index + 1}`} 
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button
                              type="button"
                              onClick={() => removeFile(index)}
                              className="bg-white/20 hover:bg-red-500 text-white rounded-full p-2 backdrop-blur-md transition-colors"
                            >
                              <FaTimes className="text-sm" />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-100 mt-8">
              <button
                type="button"
                onClick={() => window.history.back()}
                className="w-full sm:w-auto px-8 py-3.5 font-semibold text-gray-500 hover:text-gray-800 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-colors shrink-0"
              >
                Kembali
              </button>
              <button
                type="submit"
                disabled={mutation.isPending}
                 className="flex-1 py-3.5 font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm hover:shadow-[0_4px_12px_rgba(37,99,235,0.3)] hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex justify-center items-center"
              >
                {mutation.isPending ? (
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Memproses...</span>
                  </div>
                ) : (
                  'Publikasikan Sekarang'
                )}
              </button>
            </div>
          </motion.form>
          )}
        </div>
      </div>

      {/* Modern Toast / Alerts */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-lp-bg text-lp-text py-4 px-6 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] ring-1 ring-lp-border border border-lp-borderA"
          >
            <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
              <FaCheckCircle className="text-xl" />
            </div>
            <div>
              <h4 className="font-bold text-sm tracking-tight border-b-0">Berhasil Dikirim!</h4>
              <p className="text-xs text-lp-text2">Pemberitahuan telah mengudara di feed kampus.</p>
            </div>
          </motion.div>
        )}

        {showError && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-red-50 text-red-800 py-4 px-6 rounded-2xl shadow-[0_20px_50px_rgba(220,38,38,0.15)] ring-1 ring-red-100"
          >
            <div className="w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
              <FaExclamationCircle className="text-xl" />
            </div>
            <div>
              <h4 className="font-bold text-sm tracking-tight border-b-0">Gagal Mempublikasikan</h4>
              <p className="text-xs text-red-700">{showError}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default PostingPemberitahuan