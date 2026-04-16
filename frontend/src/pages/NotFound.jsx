import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

const NotFound = () => {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <div className="bg-lp-bg text-lp-text font-sans font-light min-h-screen relative z-0 flex flex-col items-center justify-center px-6 py-10 text-center overflow-hidden">
      {/* GLOBAL GRID BACKGROUND */}
      <div className="fixed inset-0 pointer-events-none z-[-1] bg-lp-surface">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.08)_1px,transparent_1px)] bg-[size:64px_64px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,rgba(255,255,255,0.85)_70%,#ffffff_100%)]" />
      </div>

      {/* Scan line */}
      <div className="absolute left-0 right-0 h-[120px] animate-scanAnim bg-[linear-gradient(180deg,transparent,rgba(75,115,255,0.03)_50%,transparent)] pointer-events-none" />

      {/* Brand top-left */}
      <Link to="/" className="fixed top-6 left-6 text-[11.5px] font-semibold tracking-[0.08em] text-lp-text3 z-10">STUDENT HUB</Link>

      {/* Giant 404 */}
      <div className="relative z-10 font-sans text-[clamp(7rem,20vw,14rem)] font-semibold leading-[0.9] tracking-[-0.035em] text-lp-text mb-7 select-none">
        4<span className="text-lp-text/30">0</span>4
      </div>

      {/* Terminal */}
      <div className="relative z-10 bg-lp-surface border border-lp-border rounded-xl overflow-hidden w-full max-w-[440px] mx-auto mb-8 text-left">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-lp-border bg-lp-surface">
          <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
          <span className="font-mono text-[10px] text-lp-text3 ml-2 tracking-wide">~ / openclaw / router</span>
        </div>
        <div className="p-5 font-mono text-[12px] font-light leading-loose">
          <span className="block">
            <span className="text-lp-text3">$ </span>
            <span className="text-lp-atext">openclaw resolve --path "{location?.pathname || '/??'}"</span>
          </span>
          <span className="block h-1.5" />
          <span className="block">
            <span className="text-lp-red">✗ </span>
            <span className="text-lp-text2">Route not registered in manifest</span>
          </span>
          <span className="block">
            <span className="text-lp-red">✗ </span>
            <span className="text-lp-text2">HTTP 404 · Page does not exist</span>
          </span>
          <span className="block h-1.5" />
          <span className="block">
            <span className="text-lp-green">↗ </span>
            <span className="text-lp-text2">Suggested: navigate to /</span>
          </span>
          <span className="block">
            <span className="text-lp-text3">$ </span>
            <span className="inline-block w-[7px] h-[13px] bg-lp-atext align-middle ml-0.5 animate-pulse" />
          </span>
        </div>
      </div>

      {/* Human-readable message */}
      <p className="relative z-10 font-sans text-[clamp(1.1rem,2.5vw,1.45rem)] text-lp-text max-w-[380px] mx-auto mb-3 leading-relaxed">
        Halaman yang kamu cari <em className="italic text-lp-text/40">tidak tersedia.</em>
      </p>
      <p className="relative z-10 text-[13px] font-mono text-lp-text3 tracking-[0.04em] mb-10">
        Periksa kembali alamat URL atau kembali ke halaman utama.
      </p>

      {/* Actions */}
      <div className="relative z-10 flex items-center gap-4 flex-wrap justify-center">
        <Link to="/" className="inline-flex items-center gap-2 bg-lp-text text-white font-sans text-[13px] font-semibold py-3 px-6 rounded-full transition-all hover:bg-lp-atext hover:-translate-y-px">
          ← Ke Beranda
        </Link>
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-lp-text2 border border-lp-border font-sans text-[13px] py-3 px-5 rounded-full transition-all hover:text-lp-text hover:border-lp-borderA">
          Kembali
        </button>
      </div>

      {/* Bottom brand */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 text-[9.5px] font-mono text-lp-text3 tracking-[0.1em] whitespace-nowrap z-10">
        <div className="w-1 h-1 rounded-full bg-lp-accent/40" />
        STUDENT HUB · POWERED BY OPENCLAW
        <div className="w-1 h-1 rounded-full bg-lp-accent/40" />
      </div>
    </div>
  )
}

export default NotFound