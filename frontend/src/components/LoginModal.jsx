import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import useAuth from '../hooks/useAuth'
import api from '../services/api'
import { getIdentifierError } from '../utils/auth'
import { calculateCurrentSemester, MAX_SEMESTER } from '../utils/semesterUtils'

const NIM_PATTERN = /^[A-Za-z0-9.-]{4,32}$/

const CURRENT_YEAR = new Date().getFullYear()
const OFFICIAL_INSTITUTION = 'Sekolah Tinggi Teknologi Terpadu Nurul Fikri'

const ROLE_DASHBOARD = {
  admin: '/admin',
  dosen: '/dosen',
  mahasiswa: '/mahasiswa',
  orangtua: '/ortu',
  ukm: '/ukm',
  ormawa: '/ormawa',
}

const REGISTER_ROLES = [
  { value: 'mahasiswa', label: 'Mahasiswa', enabled: true },
  { value: 'dosen', label: 'Dosen', enabled: false },
  { value: 'orangtua', label: 'Orang Tua', enabled: false },
  { value: 'ukm', label: 'UKM', enabled: false },
  { value: 'ormawa', label: 'Ormawa', enabled: false },
]

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

const formatEmpty = (value) => value || '-'
const formatProgramInfo = (student) => {
  const parts = [student?.education_level, student?.study_program].filter(Boolean)
  return parts.length ? parts.join(' - ') : '-'
}

export default function LoginModal({ isOpen, onClose }) {
  const navigate = useNavigate()
  const { login, applyAuthResponse } = useAuth()

  const [form, setForm] = useState({ identifier: '', password: '' })
  const [mode, setMode] = useState('login')
  const [registerForm, setRegisterForm] = useState({
    role: 'mahasiswa',
    nim: '',
    email: '',
    semester: '',
    angkatan: '',
    peminatan: '',
    kelas: '',
    password: '',
    confirmPassword: '',
  })
  const [studentVerification, setStudentVerification] = useState(null)
  const [semesterInfo, setSemesterInfo] = useState(null)
  const [registrationOptions, setRegistrationOptions] = useState({ specializations: [], classPrefix: '', classExample: '' })
  const [optionsLoading, setOptionsLoading] = useState(false)
  const [optionsError, setOptionsError] = useState('')
  const [checkingNim, setCheckingNim] = useState(false)
  const [nimError, setNimError] = useState('')
  const [registering, setRegistering] = useState(false)
  const [info, setInfo] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [unverifiedEmail, setUnverifiedEmail] = useState('')
  const [resending, setResending] = useState(false)

  const nimDebounceRef = useRef(null)
  const nimRequestRef = useRef(0)
  const optionsRequestRef = useRef(0)

  // Clear any pending debounce timer when the modal unmounts.
  useEffect(() => () => {
    if (nimDebounceRef.current) clearTimeout(nimDebounceRef.current)
  }, [])

  useEffect(() => {
    if (mode !== 'register') return
    const prodi = studentVerification?.study_program
    const semester = registerForm.semester
    const angkatan = registerForm.angkatan
    if (!prodi || !semester || !angkatan) return

    const requestId = ++optionsRequestRef.current
    Promise.resolve().then(() => {
      if (requestId !== optionsRequestRef.current) return
      setOptionsLoading(true)
      api.getRegistrationOptions({ prodi, semester, angkatan })
        .then(response => {
          if (requestId !== optionsRequestRef.current) return
          const data = response.data?.data || {}
        setRegistrationOptions({
          specializations: data.specializations || [],
          classPrefix: data.class_prefix || '',
          classExample: data.class_example || '',
        })
        })
        .catch(err => {
          if (requestId !== optionsRequestRef.current) return
          setOptionsError(err.response?.data?.message || 'Gagal mengambil pilihan kelas.')
        })
        .finally(() => {
          if (requestId === optionsRequestRef.current) setOptionsLoading(false)
        })
    })
  }, [mode, studentVerification?.study_program, registerForm.semester, registerForm.angkatan])

  if (!isOpen) return null

  const handleChange = (e) => {
    setError('')
    setInfo('')
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const switchMode = (nextMode) => {
    setMode(nextMode)
    setError('')
    setInfo('')
  }

  const handleRegisterChange = (e) => {
    const { name, value } = e.target
    setError('')
    setInfo('')
    setRegisterForm(prev => {
      const next = { ...prev, [name]: value }

      // When angkatan changes, auto-calculate semester
      if (name === 'angkatan' && value) {
        const info = calculateCurrentSemester(Number(value))
        setSemesterInfo(info)
        if (!info.error && !info.exceedsLimit) {
          next.semester = String(info.semester)
        } else {
          next.semester = ''
        }
        // Reset dependent fields
        next.kelasId = ''
        if (info.semester < 3) {
          next.peminatan = ''
        }
      } else if (name === 'angkatan' && !value) {
        setSemesterInfo(null)
        next.semester = ''
        next.kelasId = ''
        next.peminatan = ''
      }

      if (name === 'semester' && Number(value) < 3) {
        next.peminatan = ''
      }
      if (name === 'semester' || name === 'angkatan') {
        next.kelas = ''
      }
      return next
    })
    if (name === 'semester' || name === 'angkatan') {
      setRegistrationOptions({ specializations: [], classPrefix: '', classExample: '' })
      setOptionsError('')
    }
    if (name === 'nim') {
      setStudentVerification(null)
      setSemesterInfo(null)
      setRegistrationOptions({ specializations: [], classPrefix: '', classExample: '' })
      setOptionsError('')
      setNimError('')
      // Debounced auto-verify (800ms after the user stops typing).
      if (nimDebounceRef.current) clearTimeout(nimDebounceRef.current)
      const nim = value.trim()
      if (NIM_PATTERN.test(nim)) {
        setCheckingNim(true)
        nimDebounceRef.current = setTimeout(() => runNimCheck(nim), 800)
      } else {
        setCheckingNim(false)
      }
    }
  }

  // Verify a NIM against PDDikti. Guards against stale/out-of-order responses
  // so only the result for the latest typed NIM is applied.
  const runNimCheck = async (nim) => {
    const requestId = ++nimRequestRef.current
    setCheckingNim(true)
    setNimError('')
    setInfo('')
    setStudentVerification(null)
    try {
      const response = await api.verifyStudentRegistration({ nim })
      if (requestId !== nimRequestRef.current) return // a newer request superseded this one
      const data = response.data?.data
      if (!response.data?.success || !data?.verification_token) {
        throw new Error(response.data?.message || 'NIM tidak dapat diverifikasi.')
      }
      setStudentVerification(data)
      const derivedAngkatan = deriveAngkatanFromStudent(data)
      const derivedSemesterInfo = derivedAngkatan ? calculateCurrentSemester(derivedAngkatan) : null
      setSemesterInfo(derivedSemesterInfo)
      setRegisterForm(prev => ({
        ...prev,
        email: `${data.nim}@nurulfikri.ac.id`,
        angkatan: derivedAngkatan ? String(derivedAngkatan) : '',
        semester: derivedSemesterInfo && !derivedSemesterInfo.error && !derivedSemesterInfo.exceedsLimit
          ? String(derivedSemesterInfo.semester)
          : '',
        peminatan: derivedSemesterInfo?.semester < 3 ? '' : prev.peminatan,
        kelas: '',
      }))
    } catch (err) {
      if (requestId !== nimRequestRef.current) return
      setNimError(err.response?.data?.message || err.message || 'Gagal memverifikasi NIM.')
    } finally {
      if (requestId === nimRequestRef.current) setCheckingNim(false)
    }
  }

  const handleResendVerification = async (email) => {
    if (resending) return
    setResending(true)
    setError('')
    try {
      const response = await api.resendVerification({ email })
      setInfo(response.data?.message || 'Tautan verifikasi telah dikirim ulang. Silakan cek email Anda.')
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal mengirim ulang tautan verifikasi.')
    } finally {
      setResending(false)
    }
  }

  const handleRegisterSubmit = async (e) => {
    e.preventDefault()
    if (registering) return
    if (registerForm.role !== 'mahasiswa') {
      setError('Registrasi mandiri saat ini hanya tersedia untuk mahasiswa.')
      return
    }
    if (!studentVerification?.verification_token) {
      setError('Silakan cek NIM melalui PDDikti terlebih dahulu.')
      return
    }
    if (!registerForm.email.trim().toLowerCase().endsWith('@nurulfikri.ac.id')) {
      setError('Email harus menggunakan domain @nurulfikri.ac.id.')
      return
    }
    const emailLocalPart = registerForm.email.trim().split('@')[0]
    if (emailLocalPart.toLowerCase() !== String(studentVerification.nim || '').toLowerCase()) {
      setError('Email kampus harus menggunakan format NIM@nurulfikri.ac.id.')
      return
    }
    if (registerForm.password.length < 6) {
      setError('Password minimal 6 karakter.')
      return
    }
    if (!registerForm.semester) {
      setError('Semester belum terhitung. Pastikan angkatan dipilih dengan benar.')
      return
    }
    if (semesterInfo?.exceedsLimit) {
      setError('Masa studi telah melebihi batas semester normal. Registrasi tidak dapat dilanjutkan.')
      return
    }
    if (!registerForm.angkatan) {
      setError('Angkatan wajib dipilih.')
      return
    }
    if (Number(registerForm.semester) >= 3 && !registerForm.peminatan) {
      setError('Peminatan wajib dipilih untuk semester 3 ke atas.')
      return
    }
    if (!registerForm.kelas.trim()) {
      setError('Kelas wajib dipilih.')
      return
    }
    if (registerForm.password !== registerForm.confirmPassword) {
      setError('Konfirmasi password tidak sama.')
      return
    }

    setRegistering(true)
    setError('')
    setInfo('')
    try {
      const response = await api.register({
        role: 'mahasiswa',
        nim: studentVerification.nim,
        name: studentVerification.name,
        email: registerForm.email.trim(),
        password: registerForm.password,
        verification_token: studentVerification.verification_token,
        semester: Number(registerForm.semester),
        angkatan: Number(registerForm.angkatan),
        peminatan: registerForm.peminatan,
        kelas: registerForm.kelas.trim(),
      })
      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Registrasi gagal.')
      }

      // Email verification required: do not auto-login; send the student to login + check email.
      if (response.data?.data?.email_verification_required) {
        setMode('login')
        setForm({ identifier: registerForm.email.trim(), password: '' })
        setInfo(response.data?.message || 'Akun dibuat. Cek email kampus Anda untuk memverifikasi sebelum masuk.')
        return
      }

      const payload = response.data?.data || {}
      const result = payload.token
        ? applyAuthResponse(payload, registerForm.email.trim())
        : await login(registerForm.email.trim(), registerForm.password)
      if (!result.success) {
        setInfo('Akun berhasil dibuat. Silakan masuk menggunakan email/NIM dan password Anda.')
        setMode('login')
        setForm({ identifier: registerForm.email.trim(), password: '' })
        return
      }

      onClose()
      navigate(ROLE_DASHBOARD[result.user?.role] || '/mahasiswa', { replace: true })
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Registrasi gagal. Coba lagi nanti.')
    } finally {
      setRegistering(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (loading) return
    const idErr = getIdentifierError(form.identifier)
    if (idErr) {
      setError(idErr)
      return
    }
    if (!form.password.trim()) {
      setError('Password tidak boleh kosong.')
      return
    }
    setLoading(true)
    setError('')
    setInfo('')
    setUnverifiedEmail('')
    const result = await login(form.identifier, form.password)
    if (result.success) {
      const role = String(result.user?.role || '').trim().toLowerCase()
      const dashboardPath = ROLE_DASHBOARD[role]

      if (!dashboardPath) {
        setError('Role akun tidak dikenali. Hubungi administrator.')
        setLoading(false)
        return
      }

      onClose()
      navigate(dashboardPath, { replace: true })
    } else {
      // Email not verified yet — offer a resend affordance.
      if (result.data?.email_unverified) {
        setUnverifiedEmail(result.data.email || form.identifier)
      }
      setError(result.message || 'Login gagal. Periksa kembali kredensial Anda.')
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 sm:bg-lp-bg/50 backdrop-blur-sm p-4 sm:p-0 animate-fadeIn overflow-hidden">
      {/* Overlay to close */}
      <div className="absolute inset-0" onClick={onClose}></div>
      
      {/* ── Card ── */}
      <div className="relative w-full max-w-[420px] max-h-[calc(100dvh-32px)] overflow-y-auto no-scrollbar bg-white border border-lp-border rounded-[28px] sm:rounded-3xl p-6 sm:p-10 flex flex-col shadow-[0_24px_64px_rgba(0,0,0,0.15)] animate-slideUp">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 sm:top-5 right-4 sm:right-5 w-8 h-8 flex items-center justify-center rounded-full bg-lp-surface text-lp-text3 hover:text-lp-text hover:bg-lp-border transition-colors outline-none"
        >
          <svg className="w-4 h-4 stroke-current stroke-2 [stroke-linecap:round]" viewBox="0 0 24 24">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* ── Brand ── */}
        <div className="flex flex-col items-center gap-1.5 mb-8">
          <div className="w-11 h-11 rounded-xl bg-lp-accentS border border-lp-borderA flex items-center justify-center mb-2.5">
            <svg className="w-[22px] h-[22px] stroke-lp-accent fill-none stroke-2 [stroke-linecap:round] [stroke-linejoin:round]" viewBox="0 0 24 24">
              <path d="M22 10v6M2 10l10-5 10 5-10 5-10-5z" />
              <path d="M6 12v5c3.33 1.67 8.67 1.67 12 0v-5" />
            </svg>
          </div>
          <span className="text-[13px] font-bold tracking-[0.07em] text-lp-text uppercase">Student Hub</span>
          <span className="text-[10px] font-mono text-lp-text3 tracking-[0.06em]">Powered by OpenClaw</span>
        </div>

        {/* ── Heading ── */}
        <div className="grid grid-cols-2 gap-1 bg-lp-surface rounded-full p-1 mb-6">
          <button
            type="button"
            onClick={() => switchMode('login')}
            className={`h-9 rounded-full text-[12.5px] font-semibold transition-all ${mode === 'login' ? 'bg-white text-lp-text shadow-sm' : 'text-lp-text2 hover:text-lp-text'}`}
          >
            Masuk
          </button>
          <button
            type="button"
            onClick={() => switchMode('register')}
            className={`h-9 rounded-full text-[12.5px] font-semibold transition-all ${mode === 'register' ? 'bg-white text-lp-text shadow-sm' : 'text-lp-text2 hover:text-lp-text'}`}
          >
            Daftar
          </button>
        </div>

        <h2 className="text-[22px] font-bold text-lp-text tracking-tight leading-tight mb-1.5 text-center">
          {mode === 'login' ? 'Masuk ke akun' : 'Registrasi mahasiswa'}
        </h2>
        <p className="text-[13px] text-lp-text2 mb-6 leading-relaxed text-center">
          {mode === 'login'
            ? 'Selamat datang kembali. Silakan masuk untuk melanjutkan.'
            : 'Cek NIM ke PDDikti sebelum membuat akun Student Hub.'}
        </p>

        {/* ── Form ── */}
        {mode === 'login' ? (
        <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
          {/* Error */}
          {error && (
            <div className="flex items-start gap-2.5 bg-lp-red/5 border border-lp-red/15 rounded-xl px-3.5 py-3 text-[12.5px] text-lp-red leading-relaxed animate-scaleIn">
              <svg className="w-3.5 h-3.5 stroke-lp-red fill-none stroke-2 [stroke-linecap:round] flex-shrink-0 mt-0.5" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}
          {info && (
            <div className="flex items-start gap-2.5 bg-lp-green/5 border border-lp-green/15 rounded-xl px-3.5 py-3 text-[12.5px] text-lp-green leading-relaxed animate-scaleIn">
              {info}
            </div>
          )}
          {unverifiedEmail && (
            <button
              type="button"
              onClick={() => handleResendVerification(unverifiedEmail)}
              disabled={resending}
              className="flex items-center justify-center gap-2 bg-lp-accentS/40 border border-lp-borderA rounded-xl px-3.5 py-2.5 text-[12.5px] text-lp-atext font-semibold hover:bg-lp-accentS/60 transition-colors disabled:opacity-50"
            >
              {resending ? (
                <span className="w-3.5 h-3.5 border-[1.5px] border-lp-atext/30 border-t-lp-atext rounded-full animate-spin" />
              ) : null}
              Kirim ulang email verifikasi
            </button>
          )}

          {/* Identifier */}
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-bold text-lp-text2 tracking-[0.08em] uppercase font-mono" htmlFor="modal-identifier">
              ID Akun atau Email
            </label>
            <div className="relative flex items-center group">
              <input
                id="modal-identifier"
                className={`w-full h-[46px] bg-lp-surface border ${error ? 'border-lp-red/40' : 'border-lp-border'} rounded-xl pl-10 pr-4 text-lp-text text-sm font-sans outline-none transition-all duration-200 placeholder:text-lp-text3 placeholder:text-[13.5px] hover:border-lp-borderA focus:border-lp-borderA focus:bg-lp-accentS/30 focus:ring-2 focus:ring-lp-accent/10 shadow-sm`}
                type="text"
                name="identifier"
                placeholder="Nim"
                value={form.identifier}
                onChange={handleChange}
                autoComplete="username"
                maxLength={254}
                spellCheck={false}
                autoCapitalize="none"
                autoFocus
                required
              />
              <svg className="absolute left-3.5 w-[15px] h-[15px] stroke-lp-text3 fill-none stroke-[1.8] [stroke-linecap:round] [stroke-linejoin:round] pointer-events-none transition-colors group-focus-within:stroke-lp-atext" viewBox="0 0 24 24">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
              </svg>
            </div>
          </div>

          {/* Password */}
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-bold text-lp-text2 tracking-[0.08em] uppercase font-mono" htmlFor="modal-password">
            password
            </label>
            <div className="relative flex items-center group">
              <input
                id="modal-password"
                className={`w-full h-[46px] bg-lp-surface border ${error ? 'border-lp-red/40' : 'border-lp-border'} rounded-xl pl-10 pr-11 text-lp-text text-sm font-sans outline-none transition-all duration-200 placeholder:text-lp-text3 placeholder:text-[13.5px] hover:border-lp-borderA focus:border-lp-borderA focus:bg-lp-accentS/30 focus:ring-2 focus:ring-lp-accent/10 shadow-sm`}
                type={showPw ? 'text' : 'password'}
                name="password"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                autoComplete="current-password"
                maxLength={128}
                required
              />
              <svg className="absolute left-3.5 w-[15px] h-[15px] stroke-lp-text3 fill-none stroke-[1.8] [stroke-linecap:round] [stroke-linejoin:round] pointer-events-none transition-colors group-focus-within:stroke-lp-atext" viewBox="0 0 24 24">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <button
                type="button"
                className="absolute right-3 p-1 text-lp-text3 hover:text-lp-text2 transition-colors outline-none"
                onClick={() => setShowPw(v => !v)}
                aria-label={showPw ? 'Sembunyikan password' : 'Tampilkan password'}
              >
                {showPw ? (
                  <svg className="w-[15px] h-[15px] stroke-current fill-none stroke-[1.8] [stroke-linecap:round] [stroke-linejoin:round]" viewBox="0 0 24 24">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg className="w-[15px] h-[15px] stroke-current fill-none stroke-[1.8] [stroke-linecap:round] [stroke-linejoin:round]" viewBox="0 0 24 24">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full h-11 bg-lp-text text-white rounded-full font-sans text-[13px] font-semibold tracking-[0.02em] flex items-center justify-center gap-2 mt-4 transition-all duration-200 hover:bg-lp-atext hover:-translate-y-px shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="w-3.5 h-3.5 border-[1.5px] border-white/30 border-t-white rounded-full animate-spin" />
                Memproses...
              </>
            ) : (
              'Masuk'
            )}
          </button>
        </form>
        ) : (
        <form className="flex flex-col gap-4" onSubmit={handleRegisterSubmit} noValidate>
          {error && (
            <div className="flex items-start gap-2.5 bg-lp-red/5 border border-lp-red/15 rounded-xl px-3.5 py-3 text-[12.5px] text-lp-red leading-relaxed animate-scaleIn">
              {error}
            </div>
          )}
          {info && (
            <div className="flex items-start gap-2.5 bg-lp-green/5 border border-lp-green/15 rounded-xl px-3.5 py-3 text-[12.5px] text-lp-green leading-relaxed animate-scaleIn">
              {info}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-bold text-lp-text2 tracking-[0.08em] uppercase font-mono" htmlFor="register-role">
              Role
            </label>
            <select
              id="register-role"
              name="role"
              value={registerForm.role}
              onChange={handleRegisterChange}
              className="w-full h-[46px] bg-lp-surface border border-lp-border rounded-xl px-3.5 text-lp-text text-sm outline-none focus:border-lp-borderA focus:ring-2 focus:ring-lp-accent/10"
            >
              {REGISTER_ROLES.map(item => (
                <option key={item.value} value={item.value} disabled={!item.enabled}>
                  {item.label}{item.enabled ? '' : ' - hubungi admin'}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-bold text-lp-text2 tracking-[0.08em] uppercase font-mono" htmlFor="register-nim">
              NIM
            </label>
            <div className="relative">
              <input
                id="register-nim"
                className={`w-full h-[46px] bg-lp-surface border rounded-xl px-3.5 pr-10 text-lp-text text-sm outline-none focus:ring-2 focus:ring-lp-accent/10 ${
                  nimError ? 'border-lp-red/40' : studentVerification ? 'border-lp-green/40' : 'border-lp-border focus:border-lp-borderA'
                }`}
                type="text"
                name="nim"
                placeholder="0110224xxx"
                value={registerForm.nim}
                onChange={handleRegisterChange}
                autoComplete="off"
                maxLength={32}
                required
              />
              {/* Inline status indicator */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {checkingNim ? (
                  <span className="block w-4 h-4 border-[1.5px] border-lp-text3/30 border-t-lp-text3 rounded-full animate-spin" />
                ) : studentVerification ? (
                  <svg className="w-4 h-4 stroke-lp-green fill-none stroke-[2.5] [stroke-linecap:round] [stroke-linejoin:round]" viewBox="0 0 24 24">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : nimError ? (
                  <svg className="w-4 h-4 stroke-lp-red fill-none stroke-2 [stroke-linecap:round]" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                ) : null}
              </div>
            </div>
            <p className="text-[11px] text-lp-text3">
              {checkingNim ? 'Memverifikasi NIM ke PDDikti…' : 'Ketik NIM, verifikasi otomatis berjalan.'}
            </p>
            {nimError && (
              <div className="flex items-start gap-2.5 bg-lp-red/5 border border-lp-red/15 rounded-xl px-3.5 py-2.5 text-[12.5px] text-lp-red leading-relaxed animate-scaleIn">
                {nimError}
              </div>
            )}
          </div>

          {studentVerification && (
            <div className="rounded-xl border border-lp-green/20 bg-lp-green/5 p-3.5 text-[12.5px] text-lp-text2 space-y-2 animate-scaleIn">
              <div className="flex items-center gap-1.5 text-lp-green font-semibold">
                <svg className="w-3.5 h-3.5 stroke-lp-green fill-none stroke-[2.5] [stroke-linecap:round] [stroke-linejoin:round]" viewBox="0 0 24 24">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>NIM Terverifikasi</span>
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                <p><span className="text-lp-text3">Nama:</span> <span className="font-semibold text-lp-text">{formatEmpty(studentVerification.name)}</span></p>
                <p><span className="text-lp-text3">Jenis kelamin:</span> <span className="font-semibold text-lp-text">{formatEmpty(studentVerification.gender)}</span></p>
                <p><span className="text-lp-text3">NIM / Email:</span> <span className="font-semibold text-lp-text">{studentVerification.nim}@nurulfikri.ac.id</span></p>
                <p><span className="text-lp-text3">Perguruan tinggi:</span> <span className="font-semibold text-lp-text">{OFFICIAL_INSTITUTION}</span></p>
                <p><span className="text-lp-text3">Tanggal masuk:</span> <span className="font-semibold text-lp-text">{formatEmpty(studentVerification.entry_date)}</span></p>
                <p><span className="text-lp-text3">Jenjang / Prodi:</span> <span className="font-semibold text-lp-text">{formatProgramInfo(studentVerification)}</span></p>
                <p><span className="text-lp-text3">Status terakhir:</span> <span className="font-semibold text-lp-text">{formatEmpty(studentVerification.student_status)}</span></p>
                <p><span className="text-lp-text3">Angkatan:</span> <span className="font-semibold text-lp-text">{formatEmpty(registerForm.angkatan)}</span></p>
              </div>
            </div>
          )}

          {studentVerification && (
            <div className="flex flex-col gap-3">
              {/* Auto-calculated semester display */}
              {semesterInfo && (
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-bold text-lp-text2 tracking-[0.08em] uppercase font-mono">
                    Semester
                    <span className="text-[9px] font-normal text-lp-text3 ml-1.5 normal-case tracking-normal">(otomatis)</span>
                  </label>

                  {semesterInfo.error ? (
                    <div className="flex items-start gap-2.5 bg-lp-red/5 border border-lp-red/15 rounded-xl px-3.5 py-3 text-[12.5px] text-lp-red leading-relaxed">
                      {semesterInfo.error}
                    </div>
                  ) : semesterInfo.exceedsLimit ? (
                    <div className="flex items-start gap-2.5 bg-lp-amber/5 border border-lp-amber/15 rounded-xl px-3.5 py-3 text-[12.5px] text-lp-amber leading-relaxed">
                      <svg className="w-3.5 h-3.5 stroke-lp-amber fill-none stroke-2 [stroke-linecap:round] flex-shrink-0 mt-0.5" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      <span>Masa studi telah melebihi batas semester normal (semester {semesterInfo.semester}, maks {MAX_SEMESTER}).</span>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-lp-borderA bg-lp-accentS/30 p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-lp-accent/10 text-lp-atext font-bold text-sm">
                            {semesterInfo.semester}
                          </span>
                          <div>
                            <span className="text-sm font-semibold text-lp-text">Semester {semesterInfo.semester}</span>
                            <span className="text-[11px] text-lp-text3 ml-1.5">({semesterInfo.periode})</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-[11px] text-lp-text3">
                        <span>Tahun akademik: {semesterInfo.tahunSaatIni}</span>
                        <span>•</span>
                        <span>Estimasi lulus: {semesterInfo.estimasiLulus}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {studentVerification && Number(registerForm.semester) >= 3 && (
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-bold text-lp-text2 tracking-[0.08em] uppercase font-mono" htmlFor="register-peminatan">
                Peminatan
              </label>
              <select
                id="register-peminatan"
                name="peminatan"
                value={registerForm.peminatan}
                onChange={handleRegisterChange}
                className="w-full h-[46px] bg-lp-surface border border-lp-border rounded-xl px-3.5 text-lp-text text-sm outline-none focus:border-lp-borderA focus:ring-2 focus:ring-lp-accent/10"
                required
              >
                <option value="">Pilih peminatan</option>
                {(registrationOptions.specializations.length ? registrationOptions.specializations : [
                  { value: 'cyber_security', label: 'Cyber Security' },
                  { value: 'ai', label: 'Artificial Intelligence' },
                ]).map(item => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </div>
          )}

          {studentVerification && (
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-bold text-lp-text2 tracking-[0.08em] uppercase font-mono" htmlFor="register-kelas">
                Kelas
              </label>
              <input
                id="register-kelas"
                name="kelas"
                value={registerForm.kelas}
                onChange={handleRegisterChange}
                disabled={!registerForm.semester || !registerForm.angkatan || optionsLoading}
                type="text"
                placeholder={registrationOptions.classExample || 'TI-03'}
                className="w-full h-[46px] bg-lp-surface border border-lp-border rounded-xl px-3.5 text-lp-text text-sm outline-none focus:border-lp-borderA focus:ring-2 focus:ring-lp-accent/10 disabled:opacity-60"
                required
              />
              {optionsError ? (
                <p className="text-[11px] text-lp-red">{optionsError}</p>
              ) : (
                <p className="text-[11px] text-lp-text3">
                  Masukkan kelas dari kemahasiswaan, contoh {registrationOptions.classExample || 'TI-03'}.
                </p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-bold text-lp-text2 tracking-[0.08em] uppercase font-mono" htmlFor="register-email">
              Email kampus
            </label>
            <input
              id="register-email"
              className="w-full h-[46px] bg-lp-surface border border-lp-border rounded-xl px-3.5 text-lp-text text-sm outline-none focus:border-lp-borderA focus:ring-2 focus:ring-lp-accent/10"
              type="email"
              name="email"
              placeholder="nim@nurulfikri.ac.id"
              value={registerForm.email}
              onChange={handleRegisterChange}
              autoComplete="email"
              readOnly={!!studentVerification}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-bold text-lp-text2 tracking-[0.08em] uppercase font-mono" htmlFor="register-password">
                Password
              </label>
              <input
                id="register-password"
                className="w-full h-[46px] bg-lp-surface border border-lp-border rounded-xl px-3.5 text-lp-text text-sm outline-none focus:border-lp-borderA focus:ring-2 focus:ring-lp-accent/10"
                type="password"
                name="password"
                placeholder="Minimal 6 karakter"
                value={registerForm.password}
                onChange={handleRegisterChange}
                autoComplete="new-password"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-bold text-lp-text2 tracking-[0.08em] uppercase font-mono" htmlFor="register-confirm-password">
                Konfirmasi
              </label>
              <input
                id="register-confirm-password"
                className="w-full h-[46px] bg-lp-surface border border-lp-border rounded-xl px-3.5 text-lp-text text-sm outline-none focus:border-lp-borderA focus:ring-2 focus:ring-lp-accent/10"
                type="password"
                name="confirmPassword"
                placeholder="Ulangi password"
                value={registerForm.confirmPassword}
                onChange={handleRegisterChange}
                autoComplete="new-password"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full h-11 bg-lp-text text-white rounded-full font-sans text-[13px] font-semibold tracking-[0.02em] flex items-center justify-center gap-2 mt-2 transition-all duration-200 hover:bg-lp-atext hover:-translate-y-px shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={registering || checkingNim || optionsLoading || !studentVerification}
          >
            {registering ? (
              <>
                <span className="w-3.5 h-3.5 border-[1.5px] border-white/30 border-t-white rounded-full animate-spin" />
                Membuat akun...
              </>
            ) : (
              'Daftar sebagai Mahasiswa'
            )}
          </button>
        </form>
        )}
      </div>
    </div>
  )
}
