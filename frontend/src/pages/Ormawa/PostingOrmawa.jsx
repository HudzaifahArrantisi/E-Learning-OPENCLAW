// src/pages/ormawa/PostingOrmawa.jsx
import React, { useState } from 'react'
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from '../../services/api'
import Navbar from '../../components/Navbar'
import Sidebar from '../../components/Sidebar'
import useAuth from '../../hooks/useAuth'
import { FaTimes, FaPlus, FaUpload } from 'react-icons/fa'

const PostingOrmawa = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [files, setFiles] = useState([])
  const [previews, setPreviews] = useState([])

  const mutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData()
      formData.append('title', title)
      formData.append('content', content)
      formData.append('role', 'ormawa')
      
      // Append semua file
      files.forEach((file, index) => {
        formData.append('media', file)
      })

    const response = await api.post('/api/ormawa/posts', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    
    },
    onSuccess: () => {
      alert('Postingan Ormawa berhasil!')
      setTitle('')
      setContent('')
      setFiles([])
      setPreviews([])
      queryClient.invalidateQueries({ queryKey: ['feed'] })
    },
    onError: (err) => {
      const errorMessage = err.response?.data?.message || 
                          err.response?.data?.error ||
                          err.message || 
                          'Gagal posting ormawa'
      alert('Gagal: ' + errorMessage)
      console.error('Posting error:', err)
    }
  })

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files)
    
    // Batasi maksimal 10 file
    if (files.length + selectedFiles.length > 10) {
      alert('Maksimal 10 gambar yang dapat diupload')
      return
    }

    const newFiles = [...files, ...selectedFiles]
    setFiles(newFiles)

    // Buat preview untuk semua file
    const newPreviews = selectedFiles.map(file => URL.createObjectURL(file))
    setPreviews(prev => [...prev, ...newPreviews])
  }

  const removeFile = (index) => {
    const newFiles = files.filter((_, i) => i !== index)
    const newPreviews = previews.filter((_, i) => i !== index)
    
    // Revoke object URLs untuk menghindari memory leaks
    URL.revokeObjectURL(previews[index])
    
    setFiles(newFiles)
    setPreviews(newPreviews)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!title.trim() || !content.trim()) {
      alert('Judul dan konten wajib diisi!')
      return
    }
    mutation.mutate()
  }

  // Cleanup preview URLs ketika komponen unmount
  React.useEffect(() => {
    return () => {
      previews.forEach(preview => URL.revokeObjectURL(preview))
    }
  }, [previews])

  return (
    <div className="flex min-h-screen bg-lp-bg">
      <Sidebar role="ormawa" />
      <div className="flex-1 lg:ml-64">
        <Navbar user={user} />
        
        <div className="max-w-4xl mx-auto p-6 mt-8">
          <div className="bg-lp-bg rounded-2xl p-8 mb-8 text-white text-center">
            <h1 className="text-4xl font-bold mb-4">Buat Postingan Ormawa</h1>
            <p className="text-lg opacity-90">Bagikan kegiatan dan informasi organisasi mahasiswa</p>
          </div>

          <form onSubmit={handleSubmit} className="bg-lp-surface rounded-2xl shadow-xl p-8 space-y-8">
            <div>
              <label className="block text-lg font-semibold text-lp-text font-semibold tracking-tight mb-3">
                <span className="text-red-500">*</span> Judul Postingan
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Open Recruitment Panitia Dies Natalis 2025"
                className="w-full px-5 py-4 text-lg border-2 border-lp-border border rounded-xl focus:border-green-500 focus:ring-4 focus:ring-green-100 transition"
                required
              />
            </div>

            <div>
              <label className="block text-lg font-semibold text-lp-text font-semibold tracking-tight mb-3">
                <span className="text-red-500">*</span> Isi Postingan
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={8}
                placeholder="Tuliskan detail postingan di sini..."
                className="w-full px-5 py-4 text-lg border-2 border-lp-border border rounded-xl focus:border-green-500 focus:ring-4 focus:ring-green-100 transition resize-none"
                required
              />
            </div>

            <div>
              <label className="block text-lg font-semibold text-lp-text font-semibold tracking-tight mb-3">
                Gambar / Foto (Maksimal 10 gambar)
              </label>
              
              {/* File Input */}
              <div className="border-2 border-dashed border-lp-border border rounded-2xl p-8 text-center mb-4 hover:border-green-400 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload-ormawa"
                />
                <label htmlFor="file-upload-ormawa" className="cursor-pointer">
                  <FaUpload className="text-4xl text-gray-400 mx-auto mb-4" />
                  <p className="text-lg text-lp-text2 font-light mb-2">Klik untuk upload gambar</p>
                  <p className="text-sm text-lp-text3 font-light">Format: JPG, PNG, GIF (Maksimal 10MB per file)</p>
                  <p className="text-sm text-lp-text3 font-light mt-1">Maksimal 10 gambar</p>
                </label>
              </div>

              {/* File Counter */}
              {files.length > 0 && (
                <div className="flex items-center justify-between mb-4 p-4 bg-green-50 rounded-xl">
                  <span className="text-green-700 font-medium">
                    {files.length} gambar terpilih
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      files.forEach((_, index) => removeFile(index))
                    }}
                    className="text-red-500 hover:text-red-700 text-sm font-medium"
                  >
                    Hapus Semua
                  </button>
                </div>
              )}

              {/* Preview Grid */}
              {previews.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {previews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <img 
                        src={preview} 
                        alt={`Preview ${index + 1}`} 
                        className="w-full h-32 object-cover rounded-lg shadow-sm border border-lp-border"
                      />
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <FaTimes className="text-xs" />
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 text-center">
                        Slide {index + 1}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => window.history.back()}
                className="flex-1 py-4 bg-lp-bg0 hover:bg-gray-600 text-white text-lg font-bold rounded-xl transition duration-300"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={mutation.isPending}
                className="flex-1 py-4 bg-lp-bg hover:from-green-700 hover:to-teal-700 text-white text-lg font-bold rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border transform hover:scale-105 transition duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {mutation.isPending ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Memposting...</span>
                  </div>
                ) : (
                  'Publikasikan Postingan'
                )}
              </button>
            </div>

            {mutation.isError && (
              <div className="p-4 bg-red-100 border border-red-300 rounded-xl">
                <p className="text-red-800 font-medium">
                  Error: {mutation.error?.response?.data?.message || 'Terjadi kesalahan tak terduga'}
                </p>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}

export default PostingOrmawa