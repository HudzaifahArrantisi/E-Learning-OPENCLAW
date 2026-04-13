/**
 * NF StudentHub — Visi & Misi Page
 * Design System: Editorial Noir (shared)
 */

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

const CSS = `
:root {
  --bg:      #040609;
  --bg1:     #07090f;
  --surface: #090c18;
  --card:    #0b0e1e;
  --border:  rgba(255,255,255,0.06);
  --border-a:rgba(75,115,255,0.22);
  --accent:  #4B73FF;
  --atext:   #8BA4FF;
  --text:    #EDF0FF;
  --text2:   #5D6E8F;
  --text3:   #252E42;
  --ff-s:   'Quicksand', 'Cabin', system-ui, sans-serif;
  --ff:     'Cabin', 'Google Sans', 'Quicksand', system-ui, sans-serif;
  --ff-m:   'Space Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
}
*,*::before,*::after { box-sizing:border-box; margin:0; padding:0; }
html { scroll-behavior:smooth; }

.vp {
  background: var(--bg);
  color: var(--text);
  font-family: var(--ff);
  font-weight: 300;
  min-height: 100vh;
}
.w { max-width: 1100px; margin: 0 auto; padding: 0 36px; }
.sep { border: none; border-top: 1px solid var(--border); }

/* NAV */
.nav {
  position: fixed;
  top: 20px; left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  display: flex;
  align-items: center;
  background: rgba(4,6,9,0.82);
  backdrop-filter: blur(32px);
  border: 1px solid var(--border);
  border-radius: 100px;
  padding: 5px 6px 5px 18px;
  white-space: nowrap;
  gap: 2px;
}
.nav-brand { font-size: 11.5px; font-weight: 600; color: var(--text); letter-spacing: 0.07em; margin-right: 10px; }
.nav-link { color: var(--text2); text-decoration: none; font-size: 12.5px; padding: 7px 15px; border-radius: 100px; transition: all .18s; }
.nav-link:hover { color: var(--text); background: rgba(255,255,255,0.05); }
.nav-enter { background: var(--text); color: var(--bg); text-decoration: none; font-size: 12.5px; font-weight: 600; padding: 8px 20px; border-radius: 100px; transition: all .18s; margin-left: 4px; }
.nav-enter:hover { background: var(--atext); }

/* HEADER */
.vp-header {
  padding: 140px 0 72px;
  border-bottom: 1px solid var(--border);
}
.back-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--text2);
  text-decoration: none;
  font-size: 13px;
  margin-bottom: 44px;
  transition: color .18s, gap .18s;
}
.back-link:hover { color: var(--text); gap: 12px; }
.vp-header-meta {
  font-size: 10.5px;
  font-weight: 500;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text3);
  font-family: var(--ff-m);
  margin-bottom: 20px;
  display: block;
}
.vp-header-title {
  font-family: var(--ff-s);
  font-size: clamp(3rem, 6vw, 5rem);
  font-weight: 400;
  line-height: 1.02;
  letter-spacing: -0.03em;
  color: var(--text);
  margin-bottom: 16px;
}
.vp-header-title em { font-style: italic; }
.vp-header-sub {
  font-size: 16px;
  font-weight: 300;
  color: var(--text2);
  max-width: 520px;
  line-height: 1.75;
}

/* INSTITUTION SELECTOR */
.inst-selector {
  padding: 36px 0;
  border-bottom: 1px solid var(--border);
  display: flex;
  gap: 8px;
  overflow-x: auto;
}
.inst-btn {
  display: inline-flex;
  flex-direction: column;
  gap: 3px;
  padding: 12px 20px;
  border-radius: 12px;
  border: 1px solid var(--border);
  cursor: pointer;
  background: none;
  font-family: var(--ff);
  transition: all .22s;
  text-align: left;
  min-width: 160px;
  flex-shrink: 0;
}
.inst-btn:hover { border-color: rgba(255,255,255,0.12); background: rgba(255,255,255,0.025); }
.inst-btn.active {
  border-color: var(--border-a);
  background: rgba(75,115,255,0.07);
}
.inst-btn-label {
  font-size: 10px;
  font-family: var(--ff-m);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text3);
  transition: color .22s;
}
.inst-btn.active .inst-btn-label { color: var(--atext); }
.inst-btn-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text2);
  line-height: 1.35;
  transition: color .22s;
}
.inst-btn.active .inst-btn-name { color: var(--text); }

/* CONTENT AREA */
.vp-content {
  padding: 72px 0 100px;
}

/* VISI */
.visi-block {
  margin-bottom: 72px;
  padding-bottom: 72px;
  border-bottom: 1px solid var(--border);
}
.block-label {
  font-size: 10.5px;
  font-weight: 500;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text3);
  font-family: var(--ff-m);
  display: block;
  margin-bottom: 28px;
}
.visi-quote {
  font-family: var(--ff-s);
  font-style: italic;
  font-size: clamp(1.8rem, 3.5vw, 2.8rem);
  line-height: 1.4;
  color: var(--text);
  letter-spacing: -0.015em;
  max-width: 820px;
  position: relative;
  padding-left: 32px;
}
.visi-quote::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.2em;
  bottom: 0.2em;
  width: 2px;
  background: var(--accent);
  opacity: .5;
  border-radius: 2px;
}

/* MISI + TUJUAN GRID */
.vm-content-grid {
  display: grid;
  grid-template-columns: 1.1fr 1fr;
  gap: 80px;
}

.vm-block-title {
  font-family: var(--ff);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text3);
  font-family: var(--ff-m);
  display: block;
  margin-bottom: 28px;
}

.misi-list { list-style: none; }
.misi-item {
  display: flex;
  gap: 22px;
  align-items: flex-start;
  padding: 20px 0;
  border-bottom: 1px solid var(--border);
}
.misi-item:last-child { border-bottom: none; }
.misi-idx {
  font-family: var(--ff-m);
  font-size: 10px;
  color: var(--text3);
  flex-shrink: 0;
  padding-top: 3px;
  min-width: 28px;
}
.misi-text {
  font-size: 15px;
  font-weight: 300;
  color: var(--text2);
  line-height: 1.72;
}

.tujuan-list { list-style: none; }
.tujuan-item {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  padding: 16px 0;
  border-bottom: 1px solid var(--border);
}
.tujuan-item:last-child { border-bottom: none; }
.tujuan-arrow {
  font-family: var(--ff-m);
  font-size: 11px;
  color: var(--accent);
  opacity: .6;
  flex-shrink: 0;
  padding-top: 3px;
}
.tujuan-text {
  font-size: 14px;
  font-weight: 300;
  color: var(--text2);
  line-height: 1.65;
}

/* INSTITUTION BADGE */
.inst-full-name {
  margin-bottom: 52px;
}
.inst-fn-label {
  font-size: 11px;
  font-weight: 300;
  color: var(--text3);
  font-family: var(--ff-m);
  letter-spacing: 0.08em;
  margin-bottom: 8px;
  display: block;
}
.inst-fn-name {
  font-family: var(--ff-s);
  font-size: clamp(1.5rem, 2.8vw, 2.2rem);
  font-weight: 400;
  color: var(--text);
  line-height: 1.25;
  letter-spacing: -0.015em;
}

/* FOOTER */
.footer {
  border-top: 1px solid var(--border);
  padding: 44px 0;
}
.footer-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}
.footer-brand { font-size: 11.5px; font-weight: 600; color: var(--text3); letter-spacing: 0.06em; }
.footer-copy { font-size: 12px; color: var(--text3); }
.footer-nav { display: flex; gap: 20px; }
.footer-nav a { font-size: 12.5px; color: var(--text2); text-decoration: none; transition: color .18s; }
.footer-nav a:hover { color: var(--text); }

/* TRANSITIONS */
.fade-in {
  animation: fadeIn .4s ease both;
}
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }

@media (max-width: 768px) {
  .w { padding: 0 24px; }
  .vm-content-grid { grid-template-columns: 1fr; gap: 52px; }
  .nav-link { display: none; }
  .inst-selector { gap: 6px; }
  .inst-btn { min-width: 130px; }
}
@media (max-width: 520px) {
  .footer-inner { flex-direction: column; text-align: center; gap: 16px; }
  .footer-nav { flex-wrap: wrap; justify-content: center; }
}
`

const institutions = {
  'stt-nf': {
    key: 'stt-nf',
    abbr: 'STT-NF',
    fullName: 'Sekolah Tinggi Teknologi Terpadu Nurul Fikri',
    visi:
      'Pada tahun 2045 menjadi sekolah tinggi yang unggul di Indonesia, berbudaya inovasi, berjiwa teknopreneur, dan berkarakter religius.',
    misi: [
      'Menyelenggarakan pendidikan tinggi berkualitas berlandaskan iman dan takwa.',
      'Melaksanakan penelitian inovatif berorientasi teknologi masa depan.',
      'Pengabdian masyarakat dengan teknologi tepat guna.',
      'Membangun lingkungan akademik kondusif dan berbudaya inovasi.',
    ],
    tujuan: [
      'Menghasilkan sarjana kompeten, profesional, dan berakhlak mulia.',
      'Menghasilkan karya ilmiah inovatif dan terbuka (open source & open access).',
      'Menerapkan IPTEK tepat guna bagi masyarakat.',
      'Membangun kultur akademik inovatif dan kompetitif.',
    ],
  },
  ti: {
    key: 'ti',
    abbr: 'TI',
    fullName: 'Program Studi Teknik Informatika',
    visi:
      'Pada tahun 2045 menjadi program studi teknik informatika yang unggul, berbudaya inovasi, dan berkarakter religius.',
    misi: [
      'Menyelenggarakan pendidikan teknik informatika berkualitas.',
      'Melaksanakan penelitian berorientasi teknologi masa depan.',
      'Pengabdian masyarakat berbasis teknologi tepat guna.',
      'Membangun budaya akademik inovatif dan mandiri.',
    ],
    tujuan: [
      'Menghasilkan sarjana TI profesional dan berakhlak mulia.',
      'Melahirkan karya ilmiah terbuka & inovatif di bidang TI.',
      'Menerapkan teknologi tepat guna bagi masyarakat.',
    ],
  },
  si: {
    key: 'si',
    abbr: 'SI',
    fullName: 'Program Studi Sistem Informasi',
    visi:
      'Pada tahun 2045 menjadi program studi sistem informasi yang unggul, inovatif, dan religius.',
    misi: [
      'Pendidikan berkualitas bidang Sistem Informasi.',
      'Penelitian inovatif dan berorientasi masa depan.',
      'Pengabdian masyarakat berbasis teknologi tepat guna.',
      'Membangun budaya akademik inovatif dan mandiri.',
    ],
    tujuan: [
      'Lulusan kompeten & profesional di bidang Sistem Informasi.',
      'Karya ilmiah terbuka dan inovatif.',
      'Implementasi teknologi tepat guna bagi masyarakat.',
    ],
  },
  bd: {
    key: 'bd',
    abbr: 'BD',
    fullName: 'Program Studi Bisnis Digital',
    visi:
      'Pada tahun 2045 menjadi program studi bisnis digital yang unggul, inovatif, dan berkarakter religius.',
    misi: [
      'Pendidikan berkualitas bidang bisnis digital.',
      'Penelitian inovatif berorientasi masa depan.',
      'Pengabdian masyarakat berbasis teknologi bisnis.',
      'Membangun budaya akademik inovatif.',
    ],
    tujuan: [
      'Lulusan profesional & berakhlak mulia.',
      'Karya ilmiah di bidang bisnis digital.',
      'Penerapan teknologi tepat guna untuk masyarakat.',
    ],
  },
}

export default function VisiMisiPage() {
  const [activeKey, setActiveKey] = useState('stt-nf')
  const inst = institutions[activeKey]

  return (
    <>
      <style>{CSS}</style>
      <div className="vp">

        <nav className="nav">
          <span className="nav-brand">NF STUDENTHUB</span>
          <a href="/" className="nav-link">Home</a>
          <a href="/kurikulum" className="nav-link">Kurikulum</a>
          <a href="/kalender-akademik" className="nav-link">Kalender</a>
          <Link to="/login" className="nav-enter">Masuk</Link>
        </nav>

        <header className="vp-header">
          <div className="w">
            <Link to="/" className="back-link">
              <span>←</span>
              Kembali ke Beranda
            </Link>
            <span className="vp-header-meta">
              STT Terpadu Nurul Fikri · Institusi & Program Studi
            </span>
            <h1 className="vp-header-title">
              Visi & <em>Misi.</em>
            </h1>
            <p className="vp-header-sub">
              Integritas, inovasi, dan karakter religius sebagai fondasi untuk
              membangun generasi teknologi unggul Indonesia 2045.
            </p>
          </div>
        </header>

        <div className="w">
          <div className="inst-selector">
            {Object.values(institutions).map((i) => (
              <button
                key={i.key}
                className={`inst-btn${activeKey === i.key ? ' active' : ''}`}
                onClick={() => setActiveKey(i.key)}
              >
                <span className="inst-btn-label">{i.abbr}</span>
                <span className="inst-btn-name">
                  {i.fullName.split(' ').slice(0, 3).join(' ')}
                </span>
              </button>
            ))}
          </div>
        </div>

        <section className="vp-content">
          <div className="w" key={activeKey}>

            <div className="inst-full-name fade-in">
              <span className="inst-fn-label">Institusi / Program Studi</span>
              <div className="inst-fn-name">{inst.fullName}</div>
            </div>

            {/* VISI */}
            <div className="visi-block fade-in">
              <span className="block-label">Visi</span>
              <blockquote className="visi-quote">
                {inst.visi}
              </blockquote>
            </div>

            {/* MISI + TUJUAN */}
            <div className="vm-content-grid fade-in">
              <div>
                <span className="vm-block-title">Misi</span>
                <ul className="misi-list">
                  {inst.misi.map((m, i) => (
                    <li key={i} className="misi-item">
                      <span className="misi-idx">0{i + 1}</span>
                      <span className="misi-text">{m}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <span className="vm-block-title">Tujuan</span>
                <ul className="tujuan-list">
                  {inst.tujuan.map((t, i) => (
                    <li key={i} className="tujuan-item">
                      <span className="tujuan-arrow">→</span>
                      <span className="tujuan-text">{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

          </div>
        </section>

        <footer className="footer">
          <div className="w">
            <div className="footer-inner">
              <span className="footer-brand">NF STUDENTHUB</span>
              <nav className="footer-nav">
                <a href="/">Home</a>
                <a href="/kurikulum">Kurikulum</a>
                <a href="/kalender-akademik">Kalender</a>
                <a href="/login">Login</a>
              </nav>
              <span className="footer-copy">
                © {new Date().getFullYear()} NF StudentHub
              </span>
            </div>
          </div>
        </footer>

      </div>
    </>
  )
}