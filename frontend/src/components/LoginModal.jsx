import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import useAuth from '../hooks/useAuth'

export default function LoginModal({ isOpen, onClose }) {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [form, setForm] = useState({ identifier: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleChange = (e) => {
    setError('')
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.identifier.trim() || !form.password.trim()) {
      setError('Email dan password tidak boleh kosong.')
      return
    }
    setLoading(true)
    setError('')
    const result = await login(form.identifier, form.password)
    if (result.success) {
       onClose()
       navigate(result.redirect || '/')
    } else {
      setError(result.message || 'Login gagal. Periksa kembali email dan password.')
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
        <h2 className="text-[22px] font-bold text-lp-text tracking-tight leading-tight mb-1.5 text-center">Masuk ke akun</h2>
        <p className="text-[13px] text-lp-text2 mb-6 leading-relaxed text-center">
          Selamat datang kembali. Silakan masuk untuk melanjutkan.
        </p>

        {/* ── Form ── */}
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

          {/* Identifier */}
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-bold text-lp-text2 tracking-[0.08em] uppercase font-mono" htmlFor="modal-identifier">
              NIM
            </label>
            <div className="relative flex items-center group">
              <input
                id="modal-identifier"
                className={`w-full h-[46px] bg-lp-surface border ${error ? 'border-lp-red/40' : 'border-lp-border'} rounded-xl pl-10 pr-4 text-lp-text text-sm font-sans outline-none transition-all duration-200 placeholder:text-lp-text3 placeholder:text-[13.5px] hover:border-lp-borderA focus:border-lp-borderA focus:bg-lp-accentS/30 focus:ring-2 focus:ring-lp-accent/10 shadow-sm`}
                type="text"
                name="identifier"
                placeholder="NIM@nurulfikri.ac.id"
                value={form.identifier}
                onChange={handleChange}
                autoComplete="username"
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
            password = password
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
      </div>
    </div>
  )
}
