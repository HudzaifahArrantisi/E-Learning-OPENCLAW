import React, { useEffect, useState } from 'react'

const statusMessages = [
  'Memuat platform...',
  'Menyiapkan data...',
  'OpenClaw aktif...',
  'Hampir selesai...',
]

const Loading = () => {
  const [msgIdx, setMsgIdx] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setMsgIdx(i => (i + 1) % statusMessages.length)
    }, 900)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="min-h-screen w-screen bg-lp-bg flex flex-col items-center justify-center font-sans font-light relative overflow-hidden">
      {/* Grid background */}
      <div className="fixed inset-0 pointer-events-none z-[-1] bg-white">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.08)_1px,transparent_1px)] bg-[size:64px_64px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,rgba(255,255,255,0.85)_70%,#ffffff_100%)]" />
      </div>

      {/* Scan line */}
      <div className="absolute left-0 right-0 h-[120px] animate-scanAnim bg-[linear-gradient(180deg,transparent,rgba(75,115,255,0.03)_35%,rgba(75,115,255,0.06)_50%,rgba(75,115,255,0.03)_65%,transparent)] pointer-events-none" />

      {/* Spinner */}
      <div className="relative w-[72px] h-[72px] mb-7">
        <div className="absolute inset-0 rounded-full border-2 border-lp-border" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-lp-accent border-r-lp-atext animate-spin" />
        <div className="absolute inset-3 rounded-full bg-[radial-gradient(circle_at_40%_40%,rgba(75,115,255,0.15),transparent_70%)] animate-pulse" />
      </div>

      {/* Brand */}
      <div className="text-[11.5px] font-bold tracking-[0.1em] text-lp-text uppercase mb-2">Student Hub</div>

      {/* Status text */}
      <div className="text-[10.5px] font-mono tracking-[0.1em] text-lp-text3 uppercase min-h-[16px] animate-fadeIn" key={msgIdx}>
        {statusMessages[msgIdx]}
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-gradient-to-r from-lp-accent via-lp-atext to-lp-accent animate-[shimmer_2.4s_cubic-bezier(0.4,0,0.2,1)_infinite]" 
        style={{
          animation: 'loadBar 2.4s cubic-bezier(.4,0,.2,1) infinite',
        }}
      />
      <style>{`
        @keyframes loadBar {
          0%   { width: 0%;  left: 0%; }
          50%  { width: 60%; left: 20%; }
          100% { width: 0%;  left: 100%; }
        }
      `}</style>

      {/* OpenClaw badge */}
      <div className="absolute bottom-7 left-1/2 -translate-x-1/2 flex items-center gap-1.5 text-[9.5px] font-mono text-lp-text3 tracking-[0.08em] whitespace-nowrap">
        <div className="w-[5px] h-[5px] rounded-full bg-lp-accent/50 animate-pulse" />
        Powered by OpenClaw
      </div>
    </div>
  )
}

export default Loading