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
      <div className="flex h-screen bg-slate-100">
        <Sidebar role="mahasiswa" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Navbar user={user} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600"></div>
              <p className="mt-3 text-sm font-medium text-slate-600">Memuat profil...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (profileError) {
    return (
      <div className="flex h-screen bg-slate-100">
        <Sidebar role="mahasiswa" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Navbar user={user} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm">
              <h2 className="text-lg font-semibold text-slate-800">Gagal memuat profil</h2>
              <p className="mt-2 text-sm text-slate-500">Silakan coba lagi dalam beberapa saat.</p>
              <button
                onClick={() => queryClient.invalidateQueries({ queryKey: ['mahasiswaProfile'] })}
                className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
              >
                Coba Lagi
              </button>
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
      accent: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Nomor Induk Mahasiswa',
      value: profile?.nim || '-',
      icon: FaIdCard,
      accent: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Alamat Email',
      value: profile?.email || '-',
      icon: FaEnvelope,
      accent: 'text-violet-600',
      bg: 'bg-violet-50',
    },
    {
      label: 'Alamat Tempat Tinggal',
      value: profile?.alamat || 'Belum ditambahkan',
      icon: FaMapMarkerAlt,
      accent: 'text-rose-600',
      bg: 'bg-rose-50',
      fullRow: true,
    },
  ]

  return (
    <div className="flex h-screen bg-slate-100">
      <Sidebar role="mahasiswa" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar user={user} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

        <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10">
          <div className="mx-auto w-full max-w-5xl space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
              <div className="flex flex-col gap-6 md:flex-row md:items-center">
                <div className="relative mx-auto md:mx-0">
                  <div className="h-32 w-32 overflow-hidden rounded-full border-4 border-white bg-slate-100 shadow md:h-36 md:w-36">
                    {displayPhoto ? (
                      <img src={displayPhoto} alt="Foto Profil" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <FaUser className="text-5xl text-slate-300" />
                      </div>
                    )}
                  </div>

                  {isEditing && (
                    <label className="absolute bottom-1 right-1 cursor-pointer rounded-full bg-indigo-600 p-2.5 text-white shadow transition hover:bg-indigo-700">
                      <FaCamera className="text-sm" />
                      <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                    </label>
                  )}
                </div>

                <div className="flex-1 text-center md:text-left">
                  <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">{profile?.name}</h1>
                  <p className="mt-2 inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700">
                    <FaIdCard className="text-indigo-600" />
                    <span>{profile?.nim}</span>
                  </p>
                  <p className="mt-2 text-sm text-slate-500">{profile?.email}</p>
                </div>

                <div className="flex justify-center md:justify-end">
                  {!isEditing && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
                    >
                      <FaEdit className="text-sm" />
                      <span>Edit Profil</span>
                    </button>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
              <h2 className="text-xl font-bold text-slate-900 md:text-2xl">
                {isEditing ? 'Perbarui Data Profil' : 'Informasi Profil'}
              </h2>

              {isEditing ? (
                <form onSubmit={handleSubmit} className="mt-6 space-y-6">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    {[
                      { label: 'Nama Lengkap', value: profile?.name, icon: FaUser },
                      { label: 'Nomor Induk Mahasiswa', value: profile?.nim, icon: FaIdCard },
                      { label: 'Alamat Email', value: profile?.email, icon: FaEnvelope },
                    ].map((field, index) => (
                      <div key={index}>
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {field.label}
                        </label>
                        <div className="relative">
                          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                            <field.icon />
                          </span>
                          <input
                            type="text"
                            value={field.value || ''}
                            className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-sm font-medium text-slate-500"
                            readOnly
                            disabled
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Alamat Lengkap
                    </label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-3.5 text-slate-400">
                        <FaMapMarkerAlt />
                      </span>
                      <textarea
                        name="alamat"
                        value={formData.alamat}
                        onChange={handleInputChange}
                        rows="4"
                        className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        placeholder="Contoh: Jl. Margonda Raya No. 100, Depok, Jawa Barat"
                      />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      Untuk mengganti foto profil, klik ikon kamera pada foto.
                    </p>
                  </div>

                  <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Batalkan
                    </button>
                    <button
                      type="submit"
                      disabled={updateProfileMutation.isLoading}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {updateProfileMutation.isLoading ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                      ) : (
                        <FaSave className="text-sm" />
                      )}
                      <span>{updateProfileMutation.isLoading ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
                    </button>
                  </div>
                </form>
              ) : (
                <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                  {profileInfo.map((item, index) => (
                    <div
                      key={index}
                      className={`rounded-2xl border border-slate-200 bg-slate-50 p-5 ${item.fullRow ? 'md:col-span-2' : ''}`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl ${item.bg}`}>
                          <item.icon className={`${item.accent} text-base`} />
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</p>
                          <p
                            className={`mt-1 text-sm font-semibold text-slate-800 ${item.label === 'Alamat Tempat Tinggal' && !profile?.alamat ? 'italic text-slate-500' : ''}`}
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
  )
}

export default ProfileMahasiswa
