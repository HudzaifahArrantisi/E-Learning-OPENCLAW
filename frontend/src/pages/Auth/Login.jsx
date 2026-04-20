import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import useAuth from '../../hooks/useAuth'

export default function Login() {
  const navigate    = useNavigate()
  const { login }   = useAuth()

  const [form, setForm]         = useState({ identifier: '', password: '' })
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

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
      navigate(result.redirect || '/')
    } else {
      setError(result.message || 'Login gagal. Periksa kembali email dan password.')
    }
    setLoading(false)
  }

  return (
    <div className="bg-lp-bg text-lp-text font-sans font-light min-h-screen relative z-0 flex flex-col items-center justify-center px-6 py-20">
      {/* GLOBAL GRID BACKGROUND */}
      <div className="fixed inset-0 pointer-events-none z-[-1] bg-lp-surface">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.08)_1px,transparent_1px)] bg-[size:64px_64px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,rgba(255,255,255,0.85)_70%,#ffffff_100%)]" />
      </div>

      {/* ── Back ── */}
      <Link
        to="/"
        className="fixed top-5 left-5 z-50 flex items-center gap-1.5 text-[12.5px] font-medium text-lp-text2 bg-lp-surface/80 backdrop-blur-2xl border border-lp-border rounded-full py-2 px-4 transition-all hover:text-lp-text hover:border-lp-borderA hover:-translate-y-px"
      >
        <svg className="w-3.5 h-3.5 stroke-current fill-none stroke-[2.2] [stroke-linecap:round] [stroke-linejoin:round]" viewBox="0 0 24 24">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Beranda
      </Link>

      {/* ── Card ── */}
      <div className="relative z-10 w-full max-w-[420px] bg-lp-surface border border-lp-border rounded-2xl p-10 sm:p-10 flex flex-col shadow-[0_14px_30px_rgba(0,0,0,0.06)] animate-slideUp">

        {/* ── Brand ── */}
        <div className="flex flex-col items-center gap-1.5 mb-8">
          <div className="w-11 h-11 rounded-xl bg-lp-accentS border border-lp-borderA flex items-center justify-center mb-2.5">
            <svg className="w-[22px] h-[22px] stroke-lp-accent fill-none stroke-2 [stroke-linecap:round] [stroke-linejoin:round]" viewBox="0 0 24 24">
              <path d="M22 10v6M2 10l10-5 10 5-10 5-10-5z" />
              <path d="M6 12v5c3.33 1.67 8.67 1.67 12 0v-5" />
            </svg>
          </div>
          <span className="text-[13px] font-bold tracking-[0.07em] text-lp-text uppercase">Student Hub</span>
          <span className="text-[10.5px] font-mono text-lp-text3 tracking-[0.06em]">Powered by OpenClaw</span>
        </div>

        {/* ── Heading ── */}
        <h1 className="text-[22px] font-bold text-lp-text tracking-tight leading-tight mb-1.5">Masuk ke akun</h1>
        <p className="text-[13px] text-lp-text2 mb-6 leading-relaxed">
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
            <label className="text-[11px] font-bold text-lp-text2 tracking-[0.08em] uppercase font-mono" htmlFor="lg-identifier">
              NIM
            </label>
            <div className="relative flex items-center group">
              <input
                id="lg-identifier"
                className={`w-full h-[46px] bg-lp-surface border ${error ? 'border-lp-red/40' : 'border-lp-border'} rounded-xl pl-10 pr-4 text-lp-text text-sm font-sans outline-none transition-all duration-200 placeholder:text-lp-text3 placeholder:text-[13.5px] hover:border-lp-borderA focus:border-lp-borderA focus:bg-lp-accentS/30 focus:ring-2 focus:ring-lp-accent/10`}
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
            <label className="text-[11px] font-bold text-lp-text2 tracking-[0.08em] uppercase font-mono" htmlFor="lg-password">
              Password
            </label>
            <div className="relative flex items-center group">
              <input
                id="lg-password"
                className={`w-full h-[46px] bg-lp-surface border ${error ? 'border-lp-red/40' : 'border-lp-border'} rounded-xl pl-10 pr-11 text-lp-text text-sm font-sans outline-none transition-all duration-200 placeholder:text-lp-text3 placeholder:text-[13.5px] hover:border-lp-borderA focus:border-lp-borderA focus:bg-lp-accentS/30 focus:ring-2 focus:ring-lp-accent/10`}
                type={showPw ? 'text' : 'password'}
                name="password"
                placeholder=""
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
                className="absolute right-3 p-1 text-lp-text3 hover:text-lp-text2 transition-colors"
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

          {/* Meta */}
          <div className="flex justify-end -mt-1">
            <Link to="/forgot-password" className="text-xs font-mono text-lp-text3 tracking-[0.02em] transition-colors hover:text-lp-atext">
              Lupa password?
            </Link>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full h-12 bg-lp-text text-white rounded-full font-sans text-sm font-bold tracking-[0.02em] flex items-center justify-center gap-2 mt-1 transition-all duration-200 hover:bg-lp-atext hover:-translate-y-px disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Memproses...
              </>
            ) : (
              'Masuk'
            )}
          </button>
        </form>

      </div>

      {/* OpenClaw footer */}
      <div className="relative z-10 mt-5 flex items-center gap-1.5 text-[9.5px] font-mono text-lp-text3 tracking-[0.08em]">
        <div className="w-1 h-1 rounded-full bg-lp-accent/50" />
        OPENCLAW · SECURE AUTH · NF 2025
        <div className="w-1 h-1 rounded-full bg-lp-accent/50" />
      </div>
    </div>
  )
}