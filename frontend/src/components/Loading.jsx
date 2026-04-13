import React, { useEffect, useState } from 'react'

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&family=JetBrains+Mono:wght@300;400&display=swap');

:root {
  --bg:      #040609;
  --bg1:     #07090f;
  --border:  rgba(255,255,255,0.06);
  --accent:  #4B73FF;
  --atext:   #8BA4FF;
  --text:    #EDF0FF;
  --text2:   #5D6E8F;
  --text3:   #252E42;
  --ig-start:#f09433;
  --ig-mid:  #dc2743;
  --ig-end:  #bc1888;
  --ff-s:   'Instrument Serif', Georgia, serif;
  --ff:     'DM Sans', system-ui, sans-serif;
  --ff-m:   'JetBrains Mono', 'Courier New', monospace;
}

*,*::before,*::after { box-sizing:border-box; margin:0; padding:0; }

.loading-page {
  min-height: 100vh;
  width: 100vw;
  background: var(--bg);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-family: var(--ff);
  font-weight: 300;
  position: relative;
  overflow: hidden;
}

/* ambient glows */
.ld-glow-1 {
  position: absolute;
  top: -180px; left: -180px;
  width: 500px; height: 500px;
  background: radial-gradient(circle, rgba(75,115,255,0.07) 0%, transparent 70%);
  pointer-events: none;
}
.ld-glow-2 {
  position: absolute;
  bottom: -180px; right: -180px;
  width: 500px; height: 500px;
  background: radial-gradient(circle, rgba(188,24,136,0.06) 0%, transparent 70%);
  pointer-events: none;
}
.ld-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255,255,255,0.016) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.016) 1px, transparent 1px);
  background-size: 64px 64px;
  pointer-events: none;
}

/* spinner ring */
.ld-ring-wrap {
  position: relative;
  width: 72px;
  height: 72px;
  margin-bottom: 28px;
}
.ld-ring-track {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.05);
}
.ld-ring-spin {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2px solid transparent;
  border-top-color: transparent;
  border-right-color: transparent;
  background:
    linear-gradient(var(--bg), var(--bg)) padding-box,
    conic-gradient(from 0deg, #f09433, #dc2743, #bc1888, #4B73FF, #f09433) border-box;
  border: 2px solid transparent;
  animation: ld-spin 1.1s linear infinite;
}
@keyframes ld-spin { to { transform: rotate(360deg); } }

/* inner pulse dot */
.ld-ring-inner {
  position: absolute;
  inset: 12px;
  border-radius: 50%;
  background: radial-gradient(circle at 40% 40%, rgba(75,115,255,0.3), transparent 70%);
  animation: ld-pulse 2s ease-in-out infinite;
}
@keyframes ld-pulse { 0%,100%{opacity:.5;transform:scale(.9)} 50%{opacity:1;transform:scale(1.05)} }

/* brand mark */
.ld-brand {
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.1em;
  color: var(--text);
  text-transform: uppercase;
  margin-bottom: 8px;
}

/* cycling status text */
.ld-status {
  font-family: var(--ff-m);
  font-size: 10.5px;
  letter-spacing: 0.1em;
  color: var(--text3);
  text-transform: uppercase;
  min-height: 16px;
  animation: ld-fade 0.4s ease;
}
@keyframes ld-fade { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:none} }

/* bottom bar */
.ld-progress-bar {
  position: absolute;
  bottom: 0; left: 0;
  height: 2px;
  width: 0%;
  background: linear-gradient(90deg, var(--ig-start), var(--ig-mid), var(--ig-end), var(--accent));
  animation: ld-bar 2.4s cubic-bezier(.4,0,.2,1) infinite;
}
@keyframes ld-bar {
  0%   { width: 0%;   left: 0%; }
  50%  { width: 60%;  left: 20%; }
  100% { width: 0%;   left: 100%; }
}

/* scan line */
.ld-scan {
  position: absolute;
  left: 0; right: 0;
  height: 120px;
  background: linear-gradient(180deg,
    transparent,
    rgba(75,115,255,0.012) 35%,
    rgba(75,115,255,0.03) 50%,
    rgba(75,115,255,0.012) 65%,
    transparent
  );
  animation: ld-scan-anim 8s linear infinite;
  pointer-events: none;
}
@keyframes ld-scan-anim { from{top:-120px} to{top:100%} }

/* openclaw badge */
.ld-oc-badge {
  position: absolute;
  bottom: 28px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 7px;
  font-family: var(--ff-m);
  font-size: 9.5px;
  letter-spacing: 0.08em;
  color: var(--text3);
  white-space: nowrap;
}
.ld-oc-dot {
  width: 5px; height: 5px;
  border-radius: 50%;
  background: var(--accent);
  opacity: .5;
  animation: ld-pulse 3s ease-in-out infinite;
}
`

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
    <>
      <style>{CSS}</style>
      <div className="loading-page">
        <div className="ld-glow-1" />
        <div className="ld-glow-2" />
        <div className="ld-grid" />
        <div className="ld-scan" />

        <div className="ld-ring-wrap">
          <div className="ld-ring-track" />
          <div className="ld-ring-spin" />
          <div className="ld-ring-inner" />
        </div>

        <div className="ld-brand">NF StudentHub</div>
        <div className="ld-status" key={msgIdx}>{statusMessages[msgIdx]}</div>

        <div className="ld-progress-bar" />

        <div className="ld-oc-badge">
          <div className="ld-oc-dot" />
          Powered by OpenClaw
        </div>
      </div>
    </>
  )
}

export default Loading