import React, { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import api from '../../services/api'
import Sidebar from '../../components/Sidebar'
import Navbar from '../../components/Navbar'
import useAuth from '../../hooks/useAuth'
import { FaCamera, FaEdit, FaEnvelope, FaIdCard, FaMapMarkerAlt, FaSave, FaUser } from 'react-icons/fa'
import { getProfilePhotoUrl } from '../../utils/profileUtils'

const ProfileMahasiswa = () => {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [previewImage, setPreviewImage] = useState(null)

  const { data: profile, isLoading, error: profileError } = useQuery({
    queryKey: ['mahasiswaProfile'],
    queryFn: () => api.get('/api/mahasiswa/profile').then((res) => res.data.data),
    staleTime: 5 * 60 * 1000,
  })

  const [formData, setFormData] = useState({
    alamat: '',
    photo: null,
  })

  useEffect(() => {
    if (profile) {
      setFormData({
        alamat: profile.alamat || '',
        photo: null,
      })
    }
  }, [profile])

  const updateProfileMutation = useMutation({
    mutationFn: async (data) => {
      const formDataToSend = new FormData()
      formDataToSend.append('name', profile?.name || '')
      formDataToSend.append('nim', profile?.nim || '')
      formDataToSend.append('alamat', data.alamat)

      if (data.photo) {
        formDataToSend.append('photo', data.photo)
      }

      return api.put('/api/mahasiswa/profile', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mahasiswaProfile'] })
      setIsEditing(false)
      setPreviewImage(null)
    },
  })

  const handleInputChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]

    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      alert('File terlalu besar. Maksimal 5MB')
      return
    }

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif']
    if (!validTypes.includes(file.type)) {
      alert('Format file tidak didukung. Gunakan JPG, JPEG, PNG, atau GIF')
      return
    }

    setFormData((prev) => ({
      ...prev,
      photo: file,
    }))

    const reader = new FileReader()
    reader.onload = (event) => {
      setPreviewImage(event.target.result)
    }
    reader.readAsDataURL(file)
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
        photo: null,
      })
    }
  }

  if (isLoading) {
    return (
      <div className="bg-lp-bg text-lp-text font-sans font-light min-h-screen relative z-0">
        <div className="fixed inset-0 pointer-events-none z-[-1] bg-lp-surface">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.08)_1px,transparent_1px)] bg-[size:64px_64px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,rgba(255,255,255,0.85)_70%,#ffffff_100%)]" />
        </div>
        <div className="flex h-screen">
          <Sidebar role="mahasiswa" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Navbar user={user} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="mx-auto h-10 w-10 border-2 border-lp-border border-t-lp-accent rounded-full animate-spin" />
                <p className="mt-3 text-sm font-light text-lp-text2">Memuat profil...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (profileError) {
    return (
      <div className="bg-lp-bg text-lp-text font-sans font-light min-h-screen relative z-0">
        <div className="fixed inset-0 pointer-events-none z-[-1] bg-lp-surface">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.08)_1px,transparent_1px)] bg-[size:64px_64px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,rgba(255,255,255,0.85)_70%,#ffffff_100%)]" />
        </div>
        <div className="flex h-screen">
          <Sidebar role="mahasiswa" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Navbar user={user} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="w-full max-w-md bg-lp-surface border border-lp-border rounded-2xl p-7 text-center shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
                <h2 className="text-lg font-semibold text-lp-text tracking-tight">Gagal memuat profil</h2>
                <p className="mt-2 text-[13px] font-light text-lp-text2">Silakan coba lagi dalam beberapa saat.</p>
                <button
                  onClick={() => queryClient.invalidateQueries({ queryKey: ['mahasiswaProfile'] })}
                  className="mt-5 bg-lp-text text-white rounded-full px-5 py-2.5 text-sm font-semibold transition-all hover:bg-lp-atext hover:-translate-y-px"
                >
                  Coba Lagi
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const displayPhoto = previewImage || (profile?.photo ? getProfilePhotoUrl(profile.photo) : null)
  const displayName = (profile?.name || user?.name || '').trim()
  const profileInitial = displayName ? displayName[0].toUpperCase() : 'U'

  const profileInfo = [
    {
      label: 'Nama Lengkap',
      value: profile?.name || '-',
      icon: FaUser,
      accent: 'text-lp-atext',
      bg: 'bg-lp-accentS',
    },
    {
      label: 'Nomor Induk Mahasiswa',
      value: profile?.nim || '-',
      icon: FaIdCard,
      accent: 'text-lp-green',
      bg: 'bg-lp-green/10',
    },
    {
      label: 'Alamat Email',
      value: profile?.email || '-',
      icon: FaEnvelope,
      accent: 'text-lp-accent',
      bg: 'bg-lp-accentS',
    },
    {
      label: 'Alamat Tempat Tinggal',
      value: profile?.alamat || 'Belum ditambahkan',
      icon: FaMapMarkerAlt,
      accent: 'text-lp-red',
      bg: 'bg-lp-red/8',
      fullRow: true,
    },
  ]

  return (
    <div className="flex min-h-screen bg-lp-bg font-sans">
      <Sidebar role="mahasiswa" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 relative overflow-hidden">
        <Navbar user={user} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        
        {/* Background Decorative Element */}
        <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-lp-surface rounded-full blur-[120px] opacity-50 pointer-events-none z-0"></div>

        <main className="max-w-5xl mx-auto p-6 sm:p-10 relative z-10 flex-1 overflow-y-auto">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <span className="text-[11px] font-mono font-medium tracking-[0.2em] uppercase text-lp-text3 mb-3 block">STUDENT PORTAL</span>
            <h1 className="text-4xl md:text-5xl font-light text-lp-text tracking-tight mb-3">Profil Mahasiswa</h1>
            <p className="text-lg text-lp-text2 font-light">Informasi identitas akademik dan detail personal Anda.</p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Preview & Avatar */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="lg:col-span-4 lg:sticky lg:top-24"
            >
              <div className="bg-white border border-lp-border rounded-[2.5rem] p-8 shadow-[0_32px_64px_rgba(0,0,0,0.03)] text-center">
                <div className="relative inline-block mb-6 group">
                  <div className="w-32 h-32 rounded-3xl bg-lp-surface border border-lp-border p-1 overflow-hidden transition-transform duration-500 group-hover:scale-[1.02]">
                    {displayPhoto ? (
                      <img src={displayPhoto} alt="Avatar" className="w-full h-full rounded-[1.2rem] object-cover grayscale-[0.2]" />
                    ) : (
                      <div className="w-full h-full rounded-[1.2rem] bg-lp-bg flex items-center justify-center text-white text-3xl font-light" style={{ backgroundColor: 'black' }}>
                        {profileInitial}
                      </div>
                    )}
                  </div>
                  
                  {isEditing && (
                    <label className="absolute -bottom-2 -right-2 w-10 h-10 bg-lp-text text-white rounded-full flex items-center justify-center border-4 border-white cursor-pointer hover:bg-lp-atext transition-all shadow-lg scale-110">
                      <FaCamera className="text-xs" />
                      <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                    </label>
                  )}
                  
                  {!isEditing && (
                    <div className="absolute bottom-0 right-0 w-8 h-8 bg-lp-text text-white rounded-full flex items-center justify-center border-4 border-white">
                      <span className="text-[10px] font-bold italic">STD</span>
                    </div>
                  )}
                </div>
                
                <h3 className="text-2xl font-normal text-lp-text tracking-tight truncate px-2">{profile?.name || 'Mahasiswa'}</h3>
                <p className="text-lp-text3 font-mono text-[11px] mb-8 mt-1 tracking-widest uppercase">{profile?.nim || 'NIM'}</p>
                
                <div className="space-y-3 pt-8 border-t border-lp-border">
                  {!isEditing ? (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="block w-full py-4 bg-lp-text text-white rounded-full text-[12px] font-bold tracking-[0.15em] uppercase hover:bg-lp-atext transition-all shadow-[0_12px_24px_rgba(0,0,0,0.1)]"
                    >
                      Update Profile
                    </button>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={handleCancelEdit}
                        className="py-4 border border-lp-border text-lp-text2 rounded-full text-[11px] font-bold tracking-[0.1em] uppercase hover:bg-lp-surface transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSubmit}
                        disabled={updateProfileMutation.isPending}
                        className="py-4 bg-lp-text text-white rounded-full text-[11px] font-bold tracking-[0.1em] uppercase hover:bg-lp-atext transition-all flex items-center justify-center gap-2"
                      >
                         {updateProfileMutation.isPending ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Save'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Right Column: Academic Details */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-8"
            >
              <div className="bg-white border border-lp-border rounded-[2.5rem] p-10 shadow-[0_32px_64px_rgba(0,0,0,0.03)] mb-8">
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-lp-border/50">
                   <h2 className="text-xl font-normal text-lp-text tracking-tight">Data Akademik</h2>
                   <div className="px-3 py-1 bg-lp-surface border border-lp-border rounded-full text-[10px] font-mono tracking-widest text-lp-text3 uppercase">Official</div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
                  {profileInfo.slice(0, 3).map((item, index) => (
                    <div key={index} className="group">
                      <label className="block text-[10px] font-mono font-medium tracking-[0.2em] uppercase text-lp-text3 mb-2">{item.label}</label>
                      <div className="flex items-center gap-4 py-1">
                        <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center transition-transform group-hover:scale-110`}>
                           <item.icon className={`${item.accent} text-sm`} />
                        </div>
                        <p className="text-[15px] text-lp-text font-normal tracking-tight">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Personal Details & Form */}
              <div className="bg-white border border-lp-border rounded-[2.5rem] p-10 shadow-[0_32px_64px_rgba(0,0,0,0.03)]">
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-lp-border/50">
                   <h2 className="text-xl font-normal text-lp-text tracking-tight">Detail Personal</h2>
                   <div className="px-3 py-1 bg-lp-surface border border-lp-border rounded-full text-[10px] font-mono tracking-widest text-lp-text2 uppercase">{isEditing ? 'Editing' : 'Info'}</div>
                </div>

                {isEditing ? (
                  <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="group">
                      <label className="block text-[10px] font-mono font-medium tracking-[0.2em] uppercase text-lp-text3 mb-3">ALAMAT LENGKAP</label>
                      <textarea
                        name="alamat"
                        value={formData.alamat}
                        onChange={handleInputChange}
                        rows="4"
                        className="w-full bg-lp-surface border border-lp-border rounded-2xl p-5 text-lp-text text-[15px] font-normal focus:outline-none focus:border-lp-text transition-all resize-none leading-relaxed"
                        placeholder="Contoh: Jl. Margonda Raya No. 100, Depok, Jawa Barat"
                      />
                      <p className="mt-3 text-[11px] text-lp-text3 font-medium tracking-[0.05em] uppercase opacity-60">Pastikan alamat sesuai dengan KTP atau tempat tinggal saat ini.</p>
                    </div>
                  </form>
                ) : (
                  <div className="group p-6 bg-lp-surface/50 border border-lp-border rounded-2xl hover:bg-lp-surface transition-all">
                    <label className="block text-[10px] font-mono font-medium tracking-[0.2em] uppercase text-lp-text3 mb-3">ALAMAT TEMPAT TINGGAL</label>
                    <div className="flex items-start gap-4">
                       <div className="w-10 h-10 rounded-xl bg-lp-red/8 flex items-center justify-center shrink-0">
                          <FaMapMarkerAlt className="text-lp-red text-sm" />
                       </div>
                       <p className={`text-[15px] text-lp-text font-normal leading-relaxed ${!profile?.alamat ? 'italic opacity-40' : ''}`}>
                          {profile?.alamat || 'Alamat belum ditambahkan.'}
                       </p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default ProfileMahasiswa
