import React, { useState, useEffect } from 'react'
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

  const mutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData()
      formData.append('title', title)
      formData.append('content', content)
      formData.append('role', 'admin')
      
      files.forEach((file) => {
        formData.append('media', file)
      })

      await api.post('/api/admin/posts', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
    },
    onSuccess: () => {
      setShowSuccess(true)
      setTitle('')
      setContent('')
      setFiles([])
      setPreviews([])
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      setTimeout(() => {
        setShowSuccess(false)
        window.history.back()
      }, 2500)
    },
    onError: (err) => {
      const errorMessage = err.response?.data?.message || 
                          err.response?.data?.error ||
                          err.message || 
                          'Gagal posting pemberitahuan'
      setShowError(errorMessage)
      setTimeout(() => setShowError(''), 4000)
      console.error('Posting error:', err)
    }
  })

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

          {/* Form Section */}
          <motion.form 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onSubmit={handleSubmit} 
            className="bg-white rounded-3xl p-6 sm:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-lp-border space-y-8"
          >
            <div className="space-y-6">
              {/* Title Input */}
              <div className="group">
                <label className="block text-sm font-semibold text-lp-text tracking-wide mb-2 flex items-center gap-1.5 uppercase">
                  <span>Judul Pemberitahuan</span>
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Libur Semester Ganjil 2025"
                  className="w-full px-5 py-4 text-lp-text bg-lp-surface/50 border border-lp-border rounded-2xl focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-50 transition-all outline-none"
                  required
                />
              </div>

              {/* Content Input */}
              <div className="group">
                <label className="block text-sm font-semibold text-lp-text tracking-wide mb-2 flex items-center gap-1.5 uppercase">
                  <span>Isi Pemberitahuan</span>
                  <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={6}
                  placeholder="Ketikkan penjabaran lengkap pengumuman di sini..."
                  className="w-full px-5 py-4 text-lp-text bg-lp-surface/50 border border-lp-border rounded-2xl focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-50 transition-all outline-none resize-none"
                  required
                />
              </div>

              {/* File Upload Section */}
              <div>
                <label className="block text-sm font-semibold text-lp-text tracking-wide mb-2 uppercase">
                  Lampiran Gambar <span className="text-lp-text3 text-xs font-normal lowercase ml-1">(Opsional, Maks. 10 gambar)</span>
                </label>
                
                <div className="relative border-2 border-dashed border-lp-borderA rounded-3xl p-8 hover:bg-blue-50/30 hover:border-blue-300 transition-colors group text-center cursor-pointer overflow-hidden">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    id="file-upload"
                  />
                  <div className="relative z-0">
                    <div className="w-14 h-14 bg-white shadow-sm border border-lp-border rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                      <FaUpload className="text-xl text-blue-500" />
                    </div>
                    <p className="text-lp-text font-medium mb-1">Tarik & Lepas gambar ke sini</p>
                    <p className="text-sm text-lp-text3">atau klik untuk menelusuri (JPG, PNG. Maks 10MB)</p>
                  </div>
                </div>

                {/* File Counter & Quick Action */}
                {files.length > 0 && (
                  <div className="mt-4 flex items-center justify-between px-4 py-3 bg-blue-50/50 border border-blue-100 rounded-xl">
                    <span className="text-blue-700 text-sm font-medium">
                      {files.length} gambar siap diunggah
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        files.forEach((_, index) => removeFile(index))
                      }}
                      className="text-red-500 hover:text-red-600 text-sm font-semibold transition-colors"
                    >
                      Bersihkan Semua
                    </button>
                  </div>
                )}

                {/* Preview Grid */}
                {previews.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <AnimatePresence>
                      {previews.map((preview, index) => (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          key={preview} 
                          className="relative group rounded-2xl overflow-hidden shadow-sm border border-lp-border aspect-square bg-gray-100"
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
                              <FaTimes />
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
            <div className="flex flex-col-reverse sm:flex-row gap-4 pt-4 border-t border-lp-border">
              <button
                type="button"
                onClick={() => window.history.back()}
                className="w-full sm:w-1/3 py-4 font-semibold text-lp-text2 bg-lp-surface hover:bg-lp-surface/80 rounded-2xl transition-colors"
              >
                Kembali
              </button>
              <button
                type="submit"
                disabled={mutation.isPending}
                className="w-full sm:w-2/3 py-4 font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-2xl shadow-[0_8px_20px_rgba(37,99,235,0.25)] hover:shadow-[0_12px_25px_rgba(37,99,235,0.35)] hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
              >
                {mutation.isPending ? (
                  <div className="flex items-center justify-center gap-3">
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