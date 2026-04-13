import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

const CSS = `
:root {
  --bg:      #040609;
  --bg1:     #07090f;
  --surface: #090c18;
  --border:  rgba(255,255,255,0.06);
  --border-a:rgba(75,115,255,0.22);
  --accent:  #4B73FF;
  --atext:   #8BA4FF;
  --text:    #EDF0FF;
  --text2:   #5D6E8F;
  --text3:   #252E42;
  --ff-s:   'Cabin', 'Google Sans', 'Quicksand', system-ui, sans-serif;
  --ff:     'Cabin', 'Google Sans', 'Quicksand', system-ui, sans-serif;
  --ff-m:   'Space Mono', 'Courier New', monospace;
}

*,*::before,*::after { box-sizing:border-box; margin:0; padding:0; }
html { scroll-behavior: smooth; }

.nf-page {
  min-height: 100vh;
  width: 100%;
  background: radial-gradient(1000px 420px at 50% -10%, rgba(75,115,255,0.07), transparent 60%), var(--bg);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-family: var(--ff);
  font-weight: 300;
  position: relative;
  overflow: hidden;
  padding: 40px 24px;
  text-align: center;
}

/* ambience */
.nf-glow {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: 760px; height: 760px;
  background: radial-gradient(circle, rgba(75,115,255,0.055) 0%, transparent 68%);
  pointer-events: none;
}

.nf-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px);
  background-size: 64px 64px;
  pointer-events: none;
}

/* scan */
.nf-scan {
  position: absolute;
  left: 0; right: 0;
  height: 120px;
  background: linear-gradient(180deg,
    transparent,
    rgba(75,115,255,0.01) 50%,
    transparent
  );
  animation: nf-scan-anim 16s linear infinite;
  pointer-events: none;
}
@keyframes nf-scan-anim { from{top:-120px} to{top:100%} }

/* nav brand */
.nf-nav-brand {
  position: fixed;
  top: 24px; left: 24px;
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--text3);
  z-index: 10;
  text-decoration: none;
  font-family: var(--ff);
}

/* 404 number */
.nf-404 {
  position: relative;
  z-index: 1;
  font-family: var(--ff-s);
  font-size: clamp(7rem, 20vw, 14rem);
  font-weight: 600;
  line-height: .9;
  letter-spacing: -0.035em;
  color: var(--text);
  margin-bottom: 28px;
  user-select: none;
}

/* terminal block */
.nf-terminal {
  position: relative;
  z-index: 1;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  overflow: hidden;
  width: 100%;
  max-width: 440px;
  margin: 0 auto 30px;
  text-align: left;
}
.nf-terminal-bar {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 11px 16px;
  border-bottom: 1px solid var(--border);
  background: rgba(11,14,30,0.8);
}
.nf-t-dot { width: 9px; height: 9px; border-radius: 50%; }
.nf-t-dot-r { background: #FF5F57; }
.nf-t-dot-y { background: #FEBC2E; }
.nf-t-dot-g { background: #28C840; }
.nf-terminal-path {
  font-family: var(--ff-m);
  font-size: 10px;
  color: var(--text3);
  margin-left: 8px;
  letter-spacing: 0.04em;
}
.nf-terminal-body {
  padding: 18px 20px 20px;
  font-family: var(--ff-m);
  font-size: 12px;
  font-weight: 300;
  line-height: 2;
}
.nf-t-prompt { color: var(--text3); }
.nf-t-cmd    { color: var(--atext); }
.nf-t-err    { color: #F87171; }
.nf-t-dim    { color: var(--text3); }
.nf-t-ok     { color: #4ADE80; }
.nf-t-line   { display: block; }
.nf-t-spacer { display: block; height: 0.3em; }
.nf-cursor {
  display: inline-block;
  width: 7px; height: 13px;
  background: var(--atext);
  vertical-align: middle;
  margin-left: 2px;
  animation: nf-blink .9s step-end infinite;
}
@keyframes nf-blink { 0%,100%{opacity:1} 50%{opacity:0} }

/* message */
.nf-msg {
  position: relative;
  z-index: 1;
  font-family: var(--ff-s);
  font-size: clamp(1.1rem, 2.5vw, 1.45rem);
  color: var(--text);
  line-height: 1.5;
  max-width: 380px;
  margin: 0 auto 12px;
}
.nf-submsg {
  position: relative;
  z-index: 1;
  font-size: 13px;
  font-weight: 300;
  color: var(--text3);
  font-family: var(--ff-m);
  letter-spacing: 0.04em;
  margin-bottom: 40px;
}

/* actions */
.nf-actions {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
}
.nf-btn-home {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--text);
  color: var(--bg);
  font-family: var(--ff);
  font-size: 13px;
  font-weight: 600;
  padding: 11px 24px;
  border-radius: 100px;
  text-decoration: none;
  border: none;
  cursor: pointer;
  transition: all .2s;
  letter-spacing: 0.01em;
}
.nf-btn-home:hover {
  background: var(--atext);
  transform: translateY(-1px);
}
.nf-btn-back {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--text2);
  font-family: var(--ff);
  font-size: 13px;
  background: none;
  border: 1px solid var(--border);
  border-radius: 100px;
  padding: 10px 20px;
  cursor: pointer;
  transition: all .18s;
  text-decoration: none;
}
.nf-btn-back:hover {
  color: var(--text);
  border-color: rgba(255,255,255,0.14);
}
.nf-btn-home:focus-visible,
.nf-btn-back:focus-visible,
.nf-nav-brand:focus-visible {
  outline: 2px solid rgba(139,164,255,0.45);
  outline-offset: 2px;
}

/* bottom brand */
.nf-footer-brand {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  font-family: var(--ff-m);
  font-size: 9.5px;
  letter-spacing: 0.1em;
  color: var(--text3);
  white-space: nowrap;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 8px;
}
.nf-footer-brand-dot {
  width: 4px; height: 4px;
  border-radius: 50%;
  background: var(--accent);
  opacity: .4;
}

/* responsive */
@media (max-width: 480px) {
  .nf-terminal { max-width: 100%; }
  .nf-actions { flex-direction: column; }
}
`

const NotFound = () => {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <>
      <style>{CSS}</style>
      <div className="nf-page">

        {/* Ambience */}
        <div className="nf-glow" />
        <div className="nf-grid" />
        <div className="nf-scan" />

        {/* Brand top-left */}
        <Link to="/" className="nf-nav-brand">NF STUDENTHUB</Link>

        {/* Giant 404 */}
        <div className="nf-404">404</div>

        {/* Terminal */}
        <div className="nf-terminal">
          <div className="nf-terminal-bar">
            <span className="nf-t-dot nf-t-dot-r" />
            <span className="nf-t-dot nf-t-dot-y" />
            <span className="nf-t-dot nf-t-dot-g" />
            <span className="nf-terminal-path">~ / openclaw / router</span>
          </div>
          <div className="nf-terminal-body">
            <span className="nf-t-line">
              <span className="nf-t-prompt">$ </span>
              <span className="nf-t-cmd">openclaw resolve --path "{location?.pathname || '/??'}"</span>
            </span>
            <span className="nf-t-spacer" />
            <span className="nf-t-line">
              <span className="nf-t-err">✗ </span>
              <span style={{ color: 'var(--text2)' }}>Route not registered in manifest</span>
            </span>
            <span className="nf-t-line">
              <span className="nf-t-err">✗ </span>
              <span style={{ color: 'var(--text2)' }}>HTTP 404 · Page does not exist</span>
            </span>
            <span className="nf-t-spacer" />
            <span className="nf-t-line">
              <span className="nf-t-ok">↗ </span>
              <span style={{ color: 'var(--text2)' }}>Suggested: navigate to /</span>
            </span>
            <span className="nf-t-line">
              <span className="nf-t-dim">$ </span>
              <span className="nf-cursor" />
            </span>
          </div>
        </div>

        {/* Human-readable message */}
        <p className="nf-msg">Halaman yang kamu cari tidak tersedia.</p>
        <p className="nf-submsg">Periksa kembali alamat URL atau kembali ke halaman utama NF StudentHub.</p>

        {/* Actions */}
        <div className="nf-actions">
          <Link to="/" className="nf-btn-home">← Ke Beranda</Link>
          <button onClick={() => navigate(-1)} className="nf-btn-back">Kembali</button>
        </div>

        {/* Bottom brand */}
        <div className="nf-footer-brand">
          <div className="nf-footer-brand-dot" />
          NF STUDENTHUB · POWERED BY OPENCLAW
          <div className="nf-footer-brand-dot" />
        </div>

      </div>
    </>
  )
}

export default NotFound