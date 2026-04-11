import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import Sidebar from '../../components/Sidebar'
import Navbar from '../../components/Navbar'
import useAuth from '../../hooks/useAuth'
import { FaCamera, FaSave, FaMapMarkerAlt, FaIdCard, FaEnvelope, FaUser, FaEdit } from 'react-icons/fa'
import { getProfilePhotoUrl } from '../../utils/profileUtils'

const ProfileMahasiswa = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [previewImage, setPreviewImage] = useState(null)

  const { data: profile, isLoading, error: profileError } = useQuery({
    queryKey: ['mahasiswaProfile'],
    queryFn: () => api.get('/api/mahasiswa/profile').then(res => res.data.data),
    staleTime: 5 * 60 * 1000,
  })

  const [formData, setFormData] = useState({
    alamat: '',
    photo: null
  })

  useEffect(() => {
    if (profile) {
      setFormData({
        alamat: profile.alamat || '',
        photo: null
      })
    }
  }, [profile])

  const updateProfileMutation = useMutation({
    mutationFn: async (data) => {
      const formDataToSend = new FormData()
      formDataToSend.append('name', profile.name)
      formDataToSend.append('nim', profile.nim)
      formDataToSend.append('alamat', data.alamat)
      
      if (data.photo) {
        formDataToSend.append('photo', data.photo)
      }

      const response = await api.put('/api/mahasiswa/profile', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      return response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mahasiswaProfile'] })
      setIsEditing(false)
      setPreviewImage(null)
    }
  })

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File terlalu besar. Maksimal 5MB')
        return
      }

      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif']
      if (!validTypes.includes(file.type)) {
        alert('Format file tidak didukung. Gunakan JPG, JPEG, PNG, atau GIF')
        return
      }

      setFormData({
        ...formData,
        photo: file
      })

      const reader = new FileReader()
      reader.onload = (e) => {
        setPreviewImage(e.target.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (!formData.alamat.trim() && !formData.photo) {
      alert('Harap isi alamat atau pilih foto untuk diupdate')
      return
    }

    updateProfileMutation.mutate(formData)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setPreviewImage(null)
    if (profile) {
      setFormData({
        alamat: profile.alamat || '',
        photo: null
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-screen bg-slate-50">
        <Sidebar role="mahasiswa" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Navbar user={user} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 border-4 border-indigo-200 rounded-full animate-ping opacity-75"></div>
                <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
              </div>
              <p className="text-indigo-600 font-medium tracking-wide animate-pulse mt-4">Memuat Profil Eksklusif...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const displayPhoto = previewImage || (profile?.photo ? getProfilePhotoUrl(profile.photo) : null)

  return (
    <div className="flex h-screen bg-slate-50 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <Sidebar role="mahasiswa" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <Navbar user={user} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        
        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto relative z-10 custom-scrollbar">
          <div className="max-w-5xl mx-auto p-4 md:p-8 lg:p-12 mb-10">
            
            {/* Header / Banner Section */}
            <div className="relative rounded-3xl overflow-hidden shadow-2xl mb-12 bg-white border border-slate-100 animate-fadeInUp">
              {/* Banner Background */}
              <div className="h-48 md:h-72 bg-gradient-to-r from-blue-700 via-indigo-600 to-purple-600 relative overflow-hidden">
                <div className="absolute inset-0 opacity-20 mix-blend-overlay" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg width=\\'60\\' height=\\'60\\' viewBox=\\'0 0 60 60\\' xmlns=\\'http://www.w3.org/2000/svg\\'%3E%3Cg fill=\\'none\\' fill-rule=\\'evenodd\\'%3E%3Cpath d=\\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\\' fill=\\'%23ffffff\\' fill-opacity=\\'1\\' fill-rule=\\'nonzero\\'/%3E%3C/g%3E%3C/svg%3E')" }}></div>
                <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-blob"></div>
                <div className="absolute -top-24 -right-24 w-72 h-72 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-blob animation-delay-2000"></div>
                <div className="absolute bottom-[-10px] left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent"></div>
              </div>

              {/* Profile Context */}
              <div className="px-6 pb-8 md:px-12 md:pb-12 relative flex flex-col md:flex-row items-center md:items-end -mt-24 md:-mt-28 space-y-6 md:space-y-0 md:space-x-8">
                {/* Avatar Container */}
                <div className="relative group">
                  <div className="w-40 h-40 md:w-48 md:h-48 rounded-full bg-white p-2 shadow-2xl relative z-10 transition-transform duration-500 hover:scale-105">
                    <div className="w-full h-full rounded-full overflow-hidden bg-slate-100 flex items-center justify-center relative">
                      {displayPhoto ? (
                        <img 
                          src={displayPhoto} 
                          alt="Profile" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <FaUser className="text-7xl text-slate-300" />
                      )}
                      {/* Editing Overlay inside avatar */}
                      {isEditing && (
                        <div className="absolute inset-0 bg-indigo-900/40 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                           <FaCamera className="text-white text-4xl mb-2 drop-shadow-md" />
                           <span className="absolute bottom-4 text-white text-xs font-bold tracking-wider">UBAH FOTO</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {isEditing && (
                    <label className="
                      absolute bottom-2 right-2 md:bottom-4 md:right-4 bg-indigo-600 text-white 
                      rounded-full p-3 shadow-xl cursor-pointer z-20
                      hover:bg-indigo-700 hover:scale-110 transition-all duration-300 ring-4 ring-white
                    ">
                      <FaCamera className="text-xl" />
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileChange}
                      />
                    </label>
                  )}
                </div>

                {/* Name & Basic Info */}
                <div className="flex-1 text-center md:text-left pt-2 md:pt-0 mb-4 md:mb-0 z-10">
                  <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight leading-tight">{profile?.name}</h1>
                  <p className="text-indigo-600 font-bold tracking-wide text-lg mt-2 inline-flex items-center space-x-2 bg-indigo-50 px-4 py-1.5 rounded-full shadow-sm">
                    <FaIdCard className="text-indigo-500" />
                    <span>{profile?.nim}</span>
                  </p>
                </div>

                {/* Action Button */}
                <div className="z-10 flex w-full md:w-auto justify-center md:justify-end">
                  {!isEditing && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="
                        bg-indigo-600 text-white px-8 py-3.5 rounded-2xl font-bold 
                        hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-500/30
                        active:scale-95 transition-all duration-300
                        flex items-center space-x-2 w-full md:w-auto justify-center group
                      "
                    >
                      <FaEdit className="text-lg group-hover:rotate-12 transition-transform" />
                      <span>Edit Profil</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Content Body */}
            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden relative z-10 animate-fadeInUp animation-delay-2000" style={{animationDelay: '100ms'}}>
              <div className="p-6 md:p-12">
                <div className="flex items-center space-x-4 mb-10">
                  <div className="w-1.5 h-8 bg-indigo-600 rounded-full shadow-sm"></div>
                  <h2 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">
                    {isEditing ? 'Perbarui Data Profil' : 'Informasi Lengkap'}
                  </h2>
                </div>

                {isEditing ? (
                  <form onSubmit={handleSubmit} className="space-y-8 animate-fadeIn">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Photo Upload Hint - Desktop Only */}
                      <div className="md:col-span-2 hidden md:block">
                        <div className="bg-indigo-50/70 rounded-2xl p-5 border border-indigo-100 flex items-start space-x-4 shadow-sm">
                          <div className="bg-white rounded-xl p-3 shadow-sm text-indigo-600">
                            <FaCamera className="text-xl" />
                          </div>
                          <div>
                            <h4 className="text-base font-bold text-indigo-900">Foto Profil</h4>
                            <p className="text-sm text-indigo-700 mt-1 leading-relaxed">Klik ikon kamera pada avatar di atas untuk mengubah foto profil Anda. Pastikan menggunakan format JPG, JPEG, atau PNG dengan ukuran maksimal 5MB.</p>
                          </div>
                        </div>
                      </div>

                      {/* Readonly Fields */}
                      {[
                        { label: 'Nama Lengkap', value: profile?.name, icon: FaUser, color: 'text-blue-500', bg: 'bg-blue-50' },
                        { label: 'Nomor Induk Mahasiswa', value: profile?.nim, icon: FaIdCard, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                        { label: 'Alamat Email', value: profile?.email, icon: FaEnvelope, color: 'text-purple-500', bg: 'bg-purple-50' },
                      ].map((field, index) => (
                        <div key={index} className="relative group">
                          <label className="block text-sm font-bold text-slate-600 mb-2.5 uppercase tracking-wide">{field.label}</label>
                          <div className="relative">
                            <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none ${field.color}`}>
                              <field.icon className="text-lg" />
                            </div>
                            <input
                              type="text"
                              value={field.value || ''}
                              className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-500 font-semibold cursor-not-allowed focus:outline-none transition-colors"
                              readOnly
                              disabled
                            />
                            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                              <span className="text-[10px] font-extrabold px-2 py-1 bg-slate-200 text-slate-500 rounded-md tracking-widest">LOCKED</span>
                            </div>
                          </div>
                        </div>
                      ))}

                    </div>

                    {/* Editable Fields: Alamat */}
                    <div className="relative pt-4">
                      <label className="block text-sm font-bold text-slate-600 mb-2.5 uppercase tracking-wide">Alamat Lengkap</label>
                      <div className="relative">
                        <div className="absolute top-5 left-4 text-rose-500">
                          <FaMapMarkerAlt className="text-lg" />
                        </div>
                        <textarea
                          name="alamat"
                          value={formData.alamat}
                          onChange={handleInputChange}
                          rows="4"
                          className="w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-200 rounded-2xl text-slate-800 font-semibold hover:border-indigo-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all resize-none shadow-sm placeholder:text-slate-400 placeholder:font-normal"
                          placeholder="Contoh: Jl. Margonda Raya No. 100, Depok, Jawa Barat..."
                        />
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row items-center justify-end space-y-4 sm:space-y-0 sm:space-x-4 pt-8 mt-4 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="
                          px-8 py-4 text-slate-600 font-bold bg-slate-50 border border-slate-200
                          rounded-2xl hover:bg-slate-100 hover:text-slate-900 active:scale-95
                          transition-all duration-300 w-full sm:w-auto
                        "
                      >
                        Batalkan
                      </button>
                      <button
                        type="submit"
                        disabled={updateProfileMutation.isLoading}
                        className="
                          flex items-center space-x-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white 
                          px-8 py-4 rounded-2xl font-bold 
                          hover:from-indigo-700 hover:to-blue-700 hover:shadow-lg hover:shadow-indigo-500/30
                          active:scale-95
                          disabled:opacity-75 disabled:cursor-not-allowed disabled:transform-none disabled:active:scale-100
                          transition-all duration-300 
                          w-full sm:w-auto justify-center
                        "
                      >
                        {updateProfileMutation.isLoading ? (
                           <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                          <FaSave className="text-xl" />
                        )}
                        <span className="text-lg">
                          {updateProfileMutation.isLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
                        </span>
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 animate-fadeIn">
                    {/* Info display Cards */}
                    {[
                      { label: 'Nama Lengkap', value: profile?.name, icon: FaUser, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
                      { label: 'Nomor Induk Mahasiswa', value: profile?.nim, icon: FaIdCard, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
                      { label: 'Alamat Email', value: profile?.email, icon: FaEnvelope, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
                      { label: 'Alamat Tempat Tinggal', value: profile?.alamat || 'Belum ditambahkan', icon: FaMapMarkerAlt, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100', fullRow: true },
                    ].map((field, index) => (
                      <div 
                        key={index}
                        className={`
                          group relative p-6 md:p-8 rounded-3xl border border-slate-100 bg-slate-50/50
                          hover:bg-white hover:shadow-xl hover:shadow-slate-200/60 hover:border-transparent
                          transition-all duration-500 flex items-start space-x-6 cursor-default
                          ${field.fullRow ? 'md:col-span-2' : ''}
                        `}
                      >
                        <div className={`absolute inset-0 bg-gradient-to-br from-white to-${field.bg.replace('bg-', '')} opacity-0 group-hover:opacity-40 rounded-3xl transition-opacity duration-500 pointer-events-none`}></div>
                        
                        <div className={`w-16 h-16 ${field.bg} rounded-2xl flex items-center justify-center shrink-0 transition-all duration-500 group-hover:scale-110 group-hover:-rotate-6 ring-4 ring-white shadow-sm relative z-10`}>
                          <field.icon className={`${field.color} text-2xl`} />
                        </div>
                        
                        <div className="pt-1 flex-1 relative z-10">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">{field.label}</p>
                          <p className={`font-bold text-lg md:text-xl text-slate-800 leading-snug ${!profile?.alamat && field.label.includes('Alamat Tempat') ? 'italic text-slate-400 font-medium' : ''}`}>
                            {field.value}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
          </div>
        </main>
      </div>
    </div>
  )
}

export default ProfileMahasiswa