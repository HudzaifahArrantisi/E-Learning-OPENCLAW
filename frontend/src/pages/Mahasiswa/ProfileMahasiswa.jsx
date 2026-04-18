import React, { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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
    <div className="bg-lp-bg text-lp-text font-sans font-light min-h-screen relative z-0">
      {/* GLOBAL GRID BACKGROUND */}
      <div className="fixed inset-0 pointer-events-none z-[-1] bg-lp-surface">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.08)_1px,transparent_1px)] bg-[size:64px_64px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,rgba(255,255,255,0.85)_70%,#ffffff_100%)]" />
      </div>

      <div className="flex h-screen">
        <Sidebar role="mahasiswa" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex-1 flex flex-col overflow-hidden">
          <Navbar user={user} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

          <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10">
            <div className="mx-auto w-full max-w-5xl space-y-6">

              {/* Section label */}
              <div className="flex items-center gap-4 text-[10px] font-mono font-medium tracking-[0.14em] uppercase text-lp-text3 after:content-[''] after:flex-1 after:h-px after:bg-lp-border">
                <span>Profile</span>
              </div>

              {/* Profile Header Card */}
              <section className="bg-lp-surface border border-lp-border rounded-2xl p-7 md:p-8 hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all duration-300">
                <div className="flex flex-col gap-6 md:flex-row md:items-center">
                  <div className="relative mx-auto md:mx-0">
                    <div className="h-28 w-28 overflow-hidden rounded-2xl border-2 border-lp-border bg-lp-surface md:h-32 md:w-32">
                      {displayPhoto ? (
                        <img src={displayPhoto} alt="Foto Profil" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-lp-accentS">
                          <FaUser className="text-4xl text-lp-text3" />
                        </div>
                      )}
                    </div>

                    {isEditing && (
                      <label className="absolute bottom-1 right-1 cursor-pointer rounded-full bg-lp-accent p-2.5 text-white shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border transition-all hover:bg-lp-atext hover:-translate-y-px">
                        <FaCamera className="text-xs" />
                        <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                      </label>
                    )}
                  </div>

                  <div className="flex-1 text-center md:text-left">
                    <h1 className="text-2xl font-semibold text-lp-text tracking-tight md:text-3xl">{profile?.name}</h1>
                    <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-lp-surface px-3.5 py-1.5 text-[12px] font-mono text-lp-text2 tracking-wider">
                      <FaIdCard className="text-lp-atext text-xs" />
                      <span>{profile?.nim}</span>
                    </p>
                    <p className="mt-2 text-[13px] text-lp-text3 font-light">{profile?.email}</p>
                  </div>

                  <div className="flex justify-center md:justify-end">
                    {!isEditing && (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="inline-flex items-center gap-2 bg-lp-text text-white rounded-full px-5 py-3 text-[13px] font-semibold transition-all hover:bg-lp-atext hover:-translate-y-px"
                      >
                        <FaEdit className="text-xs" />
                        <span>Edit Profil</span>
                      </button>
                    )}
                  </div>
                </div>
              </section>

              {/* Profile Info Card */}
              <section className="bg-lp-surface border border-lp-border rounded-2xl p-7 md:p-8 hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all duration-300">
                <h2 className="text-lg font-semibold text-lp-text tracking-tight">
                  {isEditing ? 'Perbarui Data Profil' : 'Informasi Profil'}
                </h2>

                {isEditing ? (
                  <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      {[
                        { label: 'Nama Lengkap', value: profile?.name, icon: FaUser },
                        { label: 'Nomor Induk Mahasiswa', value: profile?.nim, icon: FaIdCard },
                        { label: 'Alamat Email', value: profile?.email, icon: FaEnvelope },
                      ].map((field, index) => (
                        <div key={index}>
                          <label className="mb-2 block text-[10px] font-mono font-bold uppercase tracking-[0.1em] text-lp-text3">
                            {field.label}
                          </label>
                          <div className="relative">
                            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-lp-text3">
                              <field.icon className="text-xs" />
                            </span>
                            <input
                              type="text"
                              value={field.value || ''}
                              className="w-full cursor-not-allowed rounded-xl border border-lp-border bg-lp-surface py-3 pl-9 pr-3 text-[13px] font-light text-lp-text3"
                              readOnly
                              disabled
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <div>
                      <label className="mb-2 block text-[10px] font-mono font-bold uppercase tracking-[0.1em] text-lp-text3">
                        Alamat Lengkap
                      </label>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-3.5 text-lp-text3">
                          <FaMapMarkerAlt className="text-xs" />
                        </span>
                        <textarea
                          name="alamat"
                          value={formData.alamat}
                          onChange={handleInputChange}
                          rows="4"
                          className="w-full rounded-xl border border-lp-border bg-lp-surface py-3 pl-9 pr-3 text-[13px] font-light text-lp-text outline-none transition-all placeholder:text-lp-text3 focus:border-lp-borderA focus:ring-2 focus:ring-lp-accent/10"
                          placeholder="Contoh: Jl. Margonda Raya No. 100, Depok, Jawa Barat"
                        />
                      </div>
                      <p className="mt-2 text-[11px] font-light text-lp-text3">
                        Untuk mengganti foto profil, klik ikon kamera pada foto.
                      </p>
                    </div>

                    <div className="flex flex-col-reverse gap-3 border-t border-lp-border pt-5 sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="rounded-full border border-lp-border px-5 py-2.5 text-[13px] font-medium text-lp-text2 transition-all hover:bg-lp-surface"
                      >
                        Batalkan
                      </button>
                      <button
                        type="submit"
                        disabled={updateProfileMutation.isPending}
                        className="inline-flex items-center justify-center gap-2 bg-lp-text text-white rounded-full px-5 py-2.5 text-[13px] font-semibold transition-all hover:bg-lp-atext hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {updateProfileMutation.isPending ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        ) : (
                          <FaSave className="text-xs" />
                        )}
                        <span>{updateProfileMutation.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                    {profileInfo.map((item, index) => (
                      <div
                        key={index}
                        className={`rounded-2xl border border-lp-border bg-lp-surface/50 p-5 hover:bg-lp-surface hover:border-lp-borderA transition-all duration-200 ${item.fullRow ? 'md:col-span-2' : ''}`}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl ${item.bg}`}>
                            <item.icon className={`${item.accent} text-sm`} />
                          </div>
                          <div>
                            <p className="text-[10px] font-mono font-medium uppercase tracking-[0.1em] text-lp-text3">{item.label}</p>
                            <p
                              className={`mt-1 text-[14px] font-medium text-lp-text ${item.label === 'Alamat Tempat Tinggal' && !profile?.alamat ? 'italic text-lp-text3 font-light' : ''}`}
                            >
                              {item.value}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

export default ProfileMahasiswa
