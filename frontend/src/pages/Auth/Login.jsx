import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import useAuth from '../../hooks/useAuth'

/* ─────────────────────────────────────────────────────────────────
   STYLES  — same design tokens as LandingPage
───────────────────────────────────────────────────────────────── */
const CSS = `
:root {
  --bg:      #040609;
  --bg1:     #07090f;
  --surface: #090c18;
  --card:    #0b0e1e;
  --border:  rgba(255,255,255,0.06);
  --border-h:rgba(255,255,255,0.12);
  --border-a:rgba(75,115,255,0.30);
  --accent:  #4B73FF;
  --accent-s:rgba(75,115,255,0.10);
  --atext:   #8BA4FF;
  --text:    #EDF0FF;
  --text2:   #5D6E8F;
  --text3:   #252E42;
  --danger:  #F87171;
  --ff:     'Cabin', 'Google Sans', 'Quicksand', system-ui, sans-serif;
  --ff-m:   'Space Mono', 'Courier New', monospace;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }

/* ── PAGE ── */
.lg-page {
  min-height: 100vh;
  width: 100%;
  background: radial-gradient(900px 420px at 50% -10%, rgba(75,115,255,0.06), transparent 62%), var(--bg);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-family: var(--ff);
  padding: 80px 24px 48px;
  position: relative;
  overflow: hidden;
}

/* ── CARD ── */
.lg-card {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 420px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 18px;
  padding: 40px 36px 34px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 14px 30px rgba(0,0,0,0.3);
}

/* ── BRAND ── */
.lg-brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  margin-bottom: 30px;
}
.lg-brand-logo {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: rgba(75,115,255,0.18);
  border: 1px solid rgba(139,164,255,0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 10px;
}
.lg-brand-logo svg {
  width: 22px;
  height: 22px;
  stroke: #fff;
  fill: none;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.lg-brand-name {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.07em;
  color: var(--text);
  text-transform: uppercase;
}
.lg-brand-tagline {
  font-size: 10.5px;
  font-weight: 400;
  color: var(--text3);
  font-family: var(--ff-m);
  letter-spacing: 0.06em;
}

/* ── HEADING ── */
.lg-heading {
  font-size: 22px;
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.01em;
  margin-bottom: 6px;
  line-height: 1.2;
}
.lg-subheading {
  font-size: 13px;
  font-weight: 400;
  color: var(--text2);
  margin-bottom: 24px;
  line-height: 1.55;
}

/* ── FORM ── */
.lg-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ── FIELD ── */
.lg-field {
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.lg-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--text2);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-family: var(--ff-m);
}
.lg-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}
.lg-input-icon {
  position: absolute;
  left: 14px;
  width: 15px;
  height: 15px;
  stroke: var(--text3);
  fill: none;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
  pointer-events: none;
  transition: stroke 0.18s;
}
.lg-input {
  width: 100%;
  height: 46px;
  background: rgba(9,12,24,0.85);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 0 44px 0 42px;
  color: var(--text);
  font-family: var(--ff);
  font-size: 14px;
  font-weight: 400;
  outline: none;
  transition: border-color 0.18s, background 0.18s;
}
.lg-input::placeholder {
  color: var(--text3);
  font-size: 13.5px;
}
.lg-input:hover {
  border-color: var(--border-h);
}
.lg-input:focus {
  border-color: var(--border-a);
  background: rgba(75,115,255,0.06);
}
.lg-input:focus-visible,
.lg-pw-toggle:focus-visible,
.lg-btn:focus-visible,
.lg-forgot:focus-visible,
.lg-back:focus-visible {
  outline: 2px solid rgba(139,164,255,0.45);
  outline-offset: 2px;
}
.lg-input-wrap:focus-within .lg-input-icon {
  stroke: var(--atext);
}
.lg-input.has-error {
  border-color: rgba(248,113,113,0.45);
}

/* ── PW TOGGLE ── */
.lg-pw-toggle {
  position: absolute;
  right: 12px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  color: var(--text3);
  transition: color 0.18s;
}
.lg-pw-toggle:hover { color: var(--text2); }
.lg-pw-toggle svg {
  width: 15px;
  height: 15px;
  stroke: currentColor;
  fill: none;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* ── META ROW ── */
.lg-meta-row {
  display: flex;
  justify-content: flex-end;
  margin-top: -2px;
}
.lg-forgot {
  font-size: 12px;
  font-weight: 400;
  color: var(--text3);
  text-decoration: none;
  font-family: var(--ff-m);
  letter-spacing: 0.02em;
  transition: color 0.18s;
}
.lg-forgot:hover { color: var(--atext); }

/* ── ERROR BOX ── */
.lg-error {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  background: rgba(248,113,113,0.07);
  border: 1px solid rgba(248,113,113,0.18);
  border-radius: 8px;
  padding: 11px 14px;
  font-size: 12.5px;
  font-weight: 400;
  color: var(--danger);
  line-height: 1.5;
  animation: lg-shake 0.3s ease;
}
.lg-error svg {
  width: 14px;
  height: 14px;
  stroke: var(--danger);
  fill: none;
  stroke-width: 2;
  stroke-linecap: round;
  flex-shrink: 0;
  margin-top: 1px;
}
@keyframes lg-shake {
  0%,100% { transform: translateX(0); }
  25%      { transform: translateX(-4px); }
  75%      { transform: translateX(4px); }
}

/* ── SUBMIT BTN ── */
.lg-btn {
  width: 100%;
  height: 48px;
  border: none;
  border-radius: 10px;
  background: #4268e6;
  color: #fff;
  font-family: var(--ff);
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.02em;
  cursor: pointer;
  transition: background 0.18s, transform 0.15s, opacity 0.18s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 4px;
}
.lg-btn:hover:not(:disabled) {
  background: #5d80f0;
  transform: translateY(-1px);
}
.lg-btn:active:not(:disabled) {
  transform: translateY(0px);
}
.lg-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ── SPINNER ── */
.lg-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: lg-spin 0.65s linear infinite;
}
@keyframes lg-spin { to { transform: rotate(360deg); } }

/* ── DIVIDER ── */
.lg-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 20px 0 16px;
}
.lg-divider-line {
  flex: 1;
  height: 1px;
  background: var(--border);
}
.lg-divider-text {
  font-size: 10px;
  font-family: var(--ff-m);
  color: var(--text3);
  letter-spacing: 0.08em;
  white-space: nowrap;
}

/* ── REGISTER ── */
.lg-register {
  text-align: center;
  font-size: 13px;
  font-weight: 400;
  color: var(--text2);
}
.lg-register a {
  color: var(--atext);
  text-decoration: none;
  font-weight: 600;
  margin-left: 3px;
  transition: color 0.18s;
}
.lg-register a:hover { color: var(--text); }

/* ── BACK BTN ── */
.lg-back {
  position: fixed;
  top: 20px;
  left: 20px;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  font-weight: 500;
  font-family: var(--ff);
  color: var(--text2);
  text-decoration: none;
  background: rgba(4,6,9,0.8);
  border: 1px solid var(--border);
  border-radius: 100px;
  padding: 8px 16px;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  transition: color 0.18s, border-color 0.18s;
}
.lg-back:hover {
  color: var(--text);
  border-color: var(--border-h);
  background: rgba(7,9,15,0.92);
}
.lg-back svg {
  width: 13px;
  height: 13px;
  stroke: currentColor;
  fill: none;
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* ── OPENCLAW FOOTER ── */
.lg-oc {
  position: relative;
  z-index: 1;
  margin-top: 20px;
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 9.5px;
  font-family: var(--ff-m);
  color: var(--text3);
  letter-spacing: 0.08em;
}
.lg-oc-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--accent);
  opacity: 0.5;
}

/* ── RESPONSIVE ── */
@media (max-width: 440px) {
  .lg-card {
    padding: 36px 24px 32px;
    border-radius: 16px;
  }
  .lg-page {
    padding: 72px 16px 40px;
  }
  .lg-back {
    top: 14px;
    left: 14px;
    padding: 7px 14px;
  }
}
`

/* ─────────────────────────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────────────────────────── */
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
    <>
      <style>{CSS}</style>

      {/* ── Back ── */}
      <Link to="/" className="lg-back">
        <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6" /></svg>
        Beranda
      </Link>

      <div className="lg-page">
        <div className="lg-card">

          {/* ── Brand ── */}
          <div className="lg-brand">
            <div className="lg-brand-logo">
              <svg viewBox="0 0 24 24">
                <path d="M22 10v6M2 10l10-5 10 5-10 5-10-5z" />
                <path d="M6 12v5c3.33 1.67 8.67 1.67 12 0v-5" />
              </svg>
            </div>
            <span className="lg-brand-name">NF StudentHub</span>
            <span className="lg-brand-tagline">Powered by OpenClaw</span>
          </div>

          {/* ── Heading ── */}
          <div className="lg-heading">Masuk ke akun</div>
          <div className="lg-subheading">
            Selamat datang kembali. Silakan masuk untuk melanjutkan.
          </div>

          {/* ── Form ── */}
          <form className="lg-form" onSubmit={handleSubmit} noValidate>

            {/* Error */}
            {error && (
              <div className="lg-error">
                <svg viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </div>
            )}

            {/* Identifier */}
            <div className="lg-field">
              <label className="lg-label" htmlFor="lg-identifier">
                Email / Username
              </label>
              <div className="lg-input-wrap">
                <input
                  id="lg-identifier"
                  className={`lg-input${error ? ' has-error' : ''}`}
                  type="text"
                  name="identifier"
                  placeholder="email@nurulfikri.ac.id"
                  value={form.identifier}
                  onChange={handleChange}
                  autoComplete="username"
                  autoFocus
                  required
                />
                <svg className="lg-input-icon" viewBox="0 0 24 24">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                </svg>
              </div>
            </div>

            {/* Password */}
            <div className="lg-field">
              <label className="lg-label" htmlFor="lg-password">
                Password
              </label>
              <div className="lg-input-wrap">
                <input
                  id="lg-password"
                  className={`lg-input${error ? ' has-error' : ''}`}
                  type={showPw ? 'text' : 'password'}
                  name="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                  required
                />
                <svg className="lg-input-icon" viewBox="0 0 24 24">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <button
                  type="button"
                  className="lg-pw-toggle"
                  onClick={() => setShowPw(v => !v)}
                  aria-label={showPw ? 'Sembunyikan password' : 'Tampilkan password'}
                >
                  {showPw ? (
                    <svg viewBox="0 0 24 24">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Meta */}
            <div className="lg-meta-row">
              <Link to="/forgot-password" className="lg-forgot">
                Lupa password?
              </Link>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="lg-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="lg-spinner" />
                  Memproses...
                </>
              ) : (
                'Masuk'
              )}
            </button>

          </form>

          {/* Divider */}
          <div className="lg-divider">
            <div className="lg-divider-line" />
            <span className="lg-divider-text">BELUM PUNYA AKUN</span>
            <div className="lg-divider-line" />
          </div>

          {/* Register */}
          <div className="lg-register">
            Hubungi admin atau
            <Link to="/register">daftar di sini</Link>
          </div>

        </div>

        {/* OpenClaw footer */}
        <div className="lg-oc">
          <div className="lg-oc-dot" />
          OPENCLAW · SECURE AUTH · NF 2025
          <div className="lg-oc-dot" />
        </div>

      </div>
    </>
  )
}