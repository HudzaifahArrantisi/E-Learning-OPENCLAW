import React, { useMemo, useState, useRef, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion as Motion } from 'framer-motion'
import api from '../../services/api'
import Sidebar from '../../components/Sidebar'
import Navbar from '../../components/Navbar'
import useAuth from '../../hooks/useAuth'
import { FaBookOpen, FaCamera, FaEnvelope, FaIdCard, FaLock, FaMapMarkerAlt, FaUser } from 'react-icons/fa'
import { getProfilePhotoUrl } from '../../utils/profileUtils'
import SocialProfileStats from '../../components/SocialProfileStats'
import ChangePasswordModal from '../../components/ChangePasswordModal'
import { calculateCurrentSemester } from '../../utils/semesterUtils'

const CURRENT_YEAR = new Date().getFullYear()
const NIM_PATTERN = /^[A-Za-z0-9.-]{4,32}$/

// NIM disimpan/ditampilkan sebagai angka saja — buang domain email kampus bila ada
// (mis. 0110xxxx@nurulfikri.ac.id -> 0110xxxx).
const sanitizeNim = (value) => String(value || '').split('@')[0]

const deriveAngkatanFromStudent = (student) => {
  const values = [student?.entry_date, student?.tanggal_masuk, student?.nim].filter(Boolean)
  for (const value of values) {
    const digits = String(value).replace(/\D/g, '')
    const candidates = []
    if (digits.length >= 4) candidates.push(digits.slice(0, 4))
    if (digits.length >= 2) candidates.push(digits.slice(0, 2))
    for (const candidate of candidates) {
      let year = Number(candidate)
      if (!Number.isInteger(year)) continue
      if (year < 100) year += 2000
      if (year >= 2000 && year <= CURRENT_YEAR + 1) return year
    }
  }
  return null
}

const PEMINATAN_OPTIONS = [
  {
    value: 'cyber_security',
    label: 'Cyber Security',
    description: 'KRIPTOGRAFI, ETHICAL HACKING, DIGITAL FORENSIC',
  },
  {
    value: 'ai',
    label: 'Artificial Intelligence',
    description: 'MACHINE LEARNING, DATA MINING, NATURAL LANGUAGE PROCESSING',
  },
]

const PEMINATAN_LABELS = {
  cyber_security: 'Cyber Security',
  ai: 'Artificial Intelligence',
}

const ProfileMahasiswa = () => {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [previewImage, setPreviewImage] = useState(null)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [selectedPeminatan, setSelectedPeminatan] = useState('')

  const [checkingNim, setCheckingNim] = useState(false)
  const [nimError, setNimError] = useState('')
  const [studentVerification, setStudentVerification] = useState(null)

  const nimDebounceRef = useRef(null)
  const nimRequestRef = useRef(0)

  useEffect(() => () => {
    if (nimDebounceRef.current) clearTimeout(nimDebounceRef.current)
  }, [])

  const { data: profile, isLoading, error: profileError } = useQuery({
    queryKey: ['mahasiswaProfile'],
    queryFn: () => api.get('/api/mahasiswa/profile').then((res) => res.data.data),
    staleTime: 5 * 60 * 1000,
  })

  const socialUserId = profile?.user_id || user?.id
  const [profileDraft, setProfileDraft] = useState(null)
  const formData = profileDraft || {
    name: profile?.name || '',
    nim: sanitizeNim(profile?.nim),
    alamat: profile?.alamat || '',
    photo: null,
    verification_token: '',
    semester: profile?.semester || '',
    angkatan: profile?.angkatan || '',
  }
  const currentSemester = Number(profile?.semester || 0)
  const currentPeminatan = String(profile?.peminatan || '').trim()
  const canChoosePeminatan = (currentSemester === 3 || currentSemester === 4) && !currentPeminatan
  const selectedPeminatanInfo = useMemo(
    () => PEMINATAN_OPTIONS.find(item => item.value === selectedPeminatan),
    [selectedPeminatan]
  )

  const updateProfileMutation = useMutation({
    mutationFn: async (data) => {
      const formDataToSend = new FormData()
      formDataToSend.append('name', data.name)
      formDataToSend.append('nim', data.nim)
      formDataToSend.append('alamat', data.alamat)

      if (data.photo) {
        formDataToSend.append('photo', data.photo)
      }
      if (data.verification_token) {
        formDataToSend.append('verification_token', data.verification_token)
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
      setProfileDraft(null)
      setStudentVerification(null)
      setNimError('')
    },
  })

  const updatePeminatanMutation = useMutation({
    mutationFn: (peminatan) => api.updateMahasiswaPeminatan({ peminatan }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mahasiswaProfile'] })
      setSelectedPeminatan('')
    },
  })

  const handleStartEdit = () => {
    setProfileDraft({
      name: profile?.name || '',
      nim: sanitizeNim(profile?.nim),
      alamat: profile?.alamat || '',
      photo: null,
      verification_token: '',
      semester: profile?.semester || '',
      angkatan: profile?.angkatan || '',
    })
    setStudentVerification(null)
    setNimError('')
    setIsEditing(true)
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setProfileDraft((prev) => {
      const next = prev ? { ...prev } : {
        name: profile?.name || '',
        nim: sanitizeNim(profile?.nim),
        alamat: profile?.alamat || '',
        photo: null,
        verification_token: '',
        semester: profile?.semester || '',
        angkatan: profile?.angkatan || '',
      }
      next[name] = value
      return next
    })
  }

  const handleNimChange = (e) => {
    const value = e.target.value.replace(/[^A-Za-z0-9.-]/g, '')
    setProfileDraft((prev) => {
      const next = prev ? { ...prev } : {
        name: profile?.name || '',
        nim: sanitizeNim(profile?.nim),
        alamat: profile?.alamat || '',
        photo: null,
        verification_token: '',
        semester: profile?.semester || '',
        angkatan: profile?.angkatan || '',
      }
      next.nim = value
      next.verification_token = ''
      return next
    })

    if (nimDebounceRef.current) {
      clearTimeout(nimDebounceRef.current)
    }

    setStudentVerification(null)
    setNimError('')

    const nim = value.trim()
    if (NIM_PATTERN.test(nim)) {
      setCheckingNim(true)
      nimDebounceRef.current = setTimeout(() => runNimCheck(nim), 800)
    } else {
      setCheckingNim(false)
    }
  }

  const runNimCheck = async (nim) => {
    const requestId = ++nimRequestRef.current
    setCheckingNim(true)
    setNimError('')
    setStudentVerification(null)
    try {
      const response = await api.verifyMahasiswaProfileStudent({ nim })
      if (requestId !== nimRequestRef.current) return

      const data = response.data?.data
      if (!response.data?.success || !data?.verification_token) {
        throw new Error(response.data?.message || 'NIM tidak dapat diverifikasi.')
      }

      setStudentVerification(data)
      const derivedAngkatan = deriveAngkatanFromStudent(data)
      const derivedSemesterInfo = derivedAngkatan ? calculateCurrentSemester(derivedAngkatan) : null

      setProfileDraft((prev) => ({
        ...prev,
        name: data.name,
        nim: data.nim || nim,
        verification_token: data.verification_token,
        angkatan: derivedAngkatan ? String(derivedAngkatan) : prev?.angkatan || '',
        semester: derivedSemesterInfo && !derivedSemesterInfo.error && !derivedSemesterInfo.exceedsLimit
          ? String(derivedSemesterInfo.semester)
          : prev?.semester || '',
      }))
    } catch (err) {
      if (requestId !== nimRequestRef.current) return
      setNimError(err.response?.data?.message || err.message || 'Gagal memverifikasi NIM.')
    } finally {
      if (requestId === nimRequestRef.current) setCheckingNim(false)
    }
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

    setProfileDraft((prev) => ({
      ...(prev || formData),
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

    if (!formData.alamat.trim() && !formData.photo && !formData.verification_token) {
      alert('Harap isi alamat, pilih foto, atau verifikasi NIM Anda sebelum menyimpan.')
      return
    }

    updateProfileMutation.mutate(formData)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setPreviewImage(null)
    setProfileDraft(null)
    setStudentVerification(null)
    setNimError('')
  }

  const handleSavePeminatan = () => {
    if (!selectedPeminatan || updatePeminatanMutation.isPending) return
    const confirmed = window.confirm(`Peminatan ${selectedPeminatanInfo?.label || ''} hanya bisa disimpan satu kali dan tidak dapat diubah. Lanjutkan?`)
    if (confirmed) updatePeminatanMutation.mutate(selectedPeminatan)
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
      value: sanitizeNim(profile?.nim) || '-',
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
      label: 'Semester Aktif',
      value: currentSemester ? `Semester ${currentSemester}` : '-',
      icon: FaBookOpen,
      accent: 'text-lp-amber',
      bg: 'bg-lp-amber/10',
    },
    {
      label: 'Angkatan',
      value: profile?.angkatan || '-',
      icon: FaIdCard,
      accent: 'text-lp-green',
      bg: 'bg-lp-green/10',
    },
    {
      label: 'Tanggal Masuk',
      value: profile?.tanggal_masuk || '-',
      icon: FaBookOpen,
      accent: 'text-lp-text2',
      bg: 'bg-lp-surface',
    },
    {
      label: 'Status Mahasiswa',
      value: profile?.status_mahasiswa || '-',
      icon: FaUser,
      accent: 'text-lp-green',
      bg: 'bg-lp-green/10',
    },
    {
      label: 'Program Studi',
      value: [profile?.jenjang, profile?.prodi].filter(Boolean).join(' - ') || '-',
      icon: FaBookOpen,
      accent: 'text-lp-atext',
      bg: 'bg-lp-accentS',
    },
    {
      label: 'Peminatan',
      value: currentPeminatan ? PEMINATAN_LABELS[currentPeminatan] || currentPeminatan : 'Belum dipilih',
      icon: FaBookOpen,
      accent: currentPeminatan ? 'text-lp-green' : 'text-lp-text3',
      bg: currentPeminatan ? 'bg-lp-green/10' : 'bg-lp-surface',
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
          <Motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <span className="text-[11px] font-mono font-medium tracking-[0.2em] uppercase text-lp-text3 mb-3 block">STUDENT PORTAL</span>
            <h1 className="text-4xl md:text-5xl font-light text-lp-text tracking-tight mb-3">Profil Mahasiswa</h1>
            <p className="text-lg text-lp-text2 font-light">Informasi identitas akademik dan detail personal Anda.</p>
          </Motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Preview & Avatar */}
            <Motion.div
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
                <p className="text-lp-text3 font-mono text-[11px] mb-8 mt-1 tracking-widest uppercase">{sanitizeNim(profile?.nim) || 'NIM'}</p>

                {socialUserId && (
                  <div className="mb-6">
                    <SocialProfileStats userId={socialUserId} />
                  </div>
                )}
                
                <div className="space-y-3 pt-8 border-t border-lp-border">
                  {!isEditing ? (
                    <>
                      <button
                        onClick={handleStartEdit}
                        className="block w-full py-4 bg-lp-text text-white rounded-full text-[12px] font-bold tracking-[0.15em] uppercase hover:bg-lp-atext transition-all shadow-[0_12px_24px_rgba(0,0,0,0.1)]"
                      >
                        Update Profile
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowChangePassword(true)}
                        className="w-full py-4 mt-3 bg-white border border-lp-border text-lp-text2 rounded-full text-[12px] font-bold tracking-[0.15em] uppercase hover:bg-lp-surface hover:text-lp-text transition-all flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(0,0,0,0.02)]"
                      >
                        <FaLock className="text-[10px]" />
                        Reset Password
                      </button>
                    </>
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
            </Motion.div>

            {/* Right Column: Academic Details */}
            <Motion.div
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
                  {profileInfo.filter(item => !item.fullRow).map((item, index) => (
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

                <div className="mt-10 pt-8 border-t border-lp-border/50">
                  <div className="flex flex-col gap-2 mb-5">
                    <h3 className="text-base font-semibold text-lp-text tracking-tight">Peminatan Semester</h3>
                    <p className="text-[13px] text-lp-text2 font-light leading-relaxed">
                      Peminatan hanya bisa dipilih satu kali saat semester aktif Anda adalah semester 3 atau 4. Semester dihitung dari data masuk/NIM, bukan dari input manual.
                    </p>
                  </div>

                  {currentPeminatan ? (
                    <div className="rounded-2xl border border-lp-green/20 bg-lp-green/5 p-5">
                      <p className="text-[11px] font-mono font-medium tracking-[0.18em] uppercase text-lp-green mb-2">Peminatan terkunci</p>
                      <p className="text-lg font-semibold text-lp-text">{PEMINATAN_LABELS[currentPeminatan] || currentPeminatan}</p>
                      <p className="text-[13px] text-lp-text2 mt-2">Pilihan ini sudah tersimpan dan tidak dapat diubah kembali.</p>
                    </div>
                  ) : canChoosePeminatan ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {PEMINATAN_OPTIONS.map(item => (
                          <button
                            key={item.value}
                            type="button"
                            onClick={() => setSelectedPeminatan(item.value)}
                            className={`text-left rounded-2xl border p-5 transition-all ${
                              selectedPeminatan === item.value
                                ? 'border-lp-accent bg-lp-accentS/40 shadow-[0_10px_24px_rgba(75,115,255,0.12)]'
                                : 'border-lp-border bg-lp-surface/40 hover:border-lp-borderA'
                            }`}
                          >
                            <span className="block text-[15px] font-semibold text-lp-text">{item.label}</span>
                            <span className="block text-[12px] text-lp-text2 mt-2 leading-relaxed">{item.description}</span>
                          </button>
                        ))}
                      </div>
                      {updatePeminatanMutation.error && (
                        <div className="rounded-xl border border-lp-red/15 bg-lp-red/5 px-4 py-3 text-[13px] text-lp-red">
                          {updatePeminatanMutation.error.response?.data?.message || 'Gagal menyimpan peminatan.'}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={handleSavePeminatan}
                        disabled={!selectedPeminatan || updatePeminatanMutation.isPending}
                        className="h-11 px-6 bg-lp-text text-white rounded-full text-[12px] font-bold tracking-[0.14em] uppercase hover:bg-lp-atext transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {updatePeminatanMutation.isPending ? 'Menyimpan...' : 'Simpan Peminatan'}
                      </button>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-lp-border bg-lp-surface/50 p-5">
                      <p className="text-[13px] text-lp-text2 leading-relaxed">
                        Peminatan belum bisa dipilih karena semester aktif Anda saat ini {currentSemester ? `semester ${currentSemester}` : 'belum terhitung'}. Pilihan akan tersedia pada semester 3 atau 4.
                      </p>
                    </div>
                  )}
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
                    {/* NIM Input */}
                    <div className="group relative">
                      <label className="block text-[10px] font-mono font-medium tracking-[0.2em] uppercase text-lp-text3 mb-3">
                        Nomor Induk Mahasiswa (NIM)
                      </label>
                      <div className="relative">
                        <input
                          id="edit-nim"
                          type="text"
                          name="nim"
                          value={formData.nim}
                          onChange={handleNimChange}
                          disabled={profile?.pddikti_verified}
                          maxLength={32}
                          placeholder="Masukkan NIM Anda"
                          className="w-full bg-lp-surface border border-lp-border rounded-2xl p-5 text-lp-text text-[15px] font-normal focus:outline-none focus:border-lp-text transition-all leading-relaxed disabled:opacity-75 disabled:cursor-not-allowed"
                        />
                        {/* Status indicator */}
                        {!profile?.pddikti_verified && (
                          <div className="absolute right-5 top-1/2 -translate-y-1/2 flex items-center">
                            {checkingNim ? (
                              <span className="block w-5 h-5 border-2 border-lp-text3/30 border-t-lp-text3 rounded-full animate-spin" />
                            ) : studentVerification ? (
                              <svg className="w-5 h-5 stroke-lp-green fill-none stroke-[2.5]" viewBox="0 0 24 24">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            ) : nimError ? (
                              <svg className="w-5 h-5 stroke-lp-red fill-none stroke-2" viewBox="0 0 24 24">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                              </svg>
                            ) : null}
                          </div>
                        )}
                      </div>
                      
                      {!profile?.pddikti_verified ? (
                        <p className="mt-3 text-[11px] text-lp-text3 font-medium tracking-[0.05em] uppercase opacity-60">
                          {checkingNim ? 'Menghubungkan ke PDDikti...' : 'Ketik NIM Anda untuk sinkronisasi otomatis dengan data PDDikti.'}
                        </p>
                      ) : (
                        <p className="mt-3 text-[11px] text-lp-green font-medium tracking-[0.05em] uppercase flex items-center gap-1">
                          <svg className="w-3.5 h-3.5 stroke-lp-green fill-none stroke-[2.5]" viewBox="0 0 24 24">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          NIM Anda sudah diverifikasi PDDikti secara resmi.
                        </p>
                      )}
                      
                      {nimError && (
                        <div className="mt-3 bg-lp-red/5 border border-lp-red/15 rounded-xl px-4 py-3 text-[13px] text-lp-red">
                          {nimError}
                        </div>
                      )}
                    </div>

                    {/* Detected PDDikti Data Card */}
                    {studentVerification && (
                      <Motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-2xl border border-lp-green/20 bg-lp-green/5 p-6 space-y-4"
                      >
                        <div className="flex items-center gap-2 text-lp-green font-semibold text-sm">
                          <svg className="w-4 h-4 stroke-lp-green fill-none stroke-[2.5]" viewBox="0 0 24 24">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          <span>Data Mahasiswa Ditemukan di PDDikti</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[13px]">
                          <div>
                            <span className="text-lp-text3 block">Nama Lengkap (Sesuai PDDikti)</span>
                            <span className="font-semibold text-lp-text">{studentVerification.name}</span>
                          </div>
                          <div>
                            <span className="text-lp-text3 block">Program Studi</span>
                            <span className="font-semibold text-lp-text">{studentVerification.education_level} - {studentVerification.study_program}</span>
                          </div>
                          <div>
                            <span className="text-lp-text3 block">Tahun Angkatan / Masuk</span>
                            <span className="font-semibold text-lp-text">{formData.angkatan || '-'} (Masuk: {studentVerification.entry_date || '-'})</span>
                          </div>
                          <div>
                            <span className="text-lp-text3 block">Semester Aktif Terdeteksi</span>
                            <span className="font-semibold text-lp-text">Semester {formData.semester || '-'}</span>
                          </div>
                          <div>
                            <span className="text-lp-text3 block">Status Mahasiswa</span>
                            <span className="font-semibold text-lp-text">{studentVerification.student_status}</span>
                          </div>
                          <div>
                            <span className="text-lp-text3 block">Perguruan Tinggi</span>
                            <span className="font-semibold text-lp-text">{studentVerification.institution}</span>
                          </div>
                        </div>
                        <p className="text-[11px] text-lp-text2 font-light border-t border-lp-green/10 pt-3">
                          *Menyimpan profil akan secara otomatis memverifikasi akun Anda, menghitung semester secara dinamis, dan mendaftarkan mata kuliah semester Anda.
                        </p>
                      </Motion.div>
                    )}

                    {/* Nama Lengkap Input (locked if verified) */}
                    <div className="group">
                      <label className="block text-[10px] font-mono font-medium tracking-[0.2em] uppercase text-lp-text3 mb-3">
                        Nama Lengkap
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        disabled={profile?.pddikti_verified || !!studentVerification}
                        placeholder="Nama Lengkap Anda"
                        className="w-full bg-lp-surface border border-lp-border rounded-2xl p-5 text-lp-text text-[15px] font-normal focus:outline-none focus:border-lp-text transition-all leading-relaxed disabled:opacity-75 disabled:cursor-not-allowed"
                      />
                      {(profile?.pddikti_verified || !!studentVerification) && (
                        <p className="mt-3 text-[11px] text-lp-text3 font-medium tracking-[0.05em] uppercase opacity-60">Nama resmi disinkronkan dengan data PDDikti.</p>
                      )}
                    </div>

                    {/* Alamat Lengkap */}
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
            </Motion.div>
          </div>
        </main>
        <ChangePasswordModal
          isOpen={showChangePassword}
          onClose={() => setShowChangePassword(false)}
        />
      </div>
    </div>
  )
}

export default ProfileMahasiswa
