import { forwardRef, useCallback, useEffect, useRef, useState } from "react"

/* ───────────────────────────── helpers ───────────────────────────── */

function cn(...classes) {
  return classes.filter(Boolean).join(" ")
}

/* ─────────────── AnimatedBeam (self-contained, no registry) ─────── */

function AnimatedBeam({
  containerRef,
  fromRef,
  toRef,
  curvature = 0,
  endYOffset = 0,
  reverse = false,
  duration = Math.random() * 3 + 4,
  delay = 0,
  pathColor = "rgba(0,0,0,0.08)",
  pathWidth = 2,
  gradientStartColor = "#4b73ff",
  gradientStopColor = "#1bb5d8",
}) {
  const id = useRef(
    `beam-${Math.random().toString(36).slice(2, 9)}`
  ).current
  const [pathD, setPathD] = useState("")
  const [svgDim, setSvgDim] = useState({ w: 0, h: 0 })

  const updatePath = useCallback(() => {
    if (!containerRef?.current || !fromRef?.current || !toRef?.current) return
    const c = containerRef.current.getBoundingClientRect()
    const a = fromRef.current.getBoundingClientRect()
    const b = toRef.current.getBoundingClientRect()
    const x1 = a.left - c.left + a.width / 2
    const y1 = a.top - c.top + a.height / 2
    const x2 = b.left - c.left + b.width / 2
    const y2 = b.top - c.top + b.height / 2 + endYOffset
    const cx = (x1 + x2) / 2 + curvature
    const cy = (y1 + y2) / 2
    setSvgDim({ w: c.width, h: c.height })
    setPathD(`M ${x1},${y1} Q ${cx},${cy} ${x2},${y2}`)
  }, [containerRef, fromRef, toRef, curvature, endYOffset])

  useEffect(() => {
    updatePath()
    const ro = new ResizeObserver(updatePath)
    if (containerRef?.current) ro.observe(containerRef.current)
    window.addEventListener("resize", updatePath)
    return () => {
      ro.disconnect()
      window.removeEventListener("resize", updatePath)
    }
  }, [updatePath, containerRef])

  return (
    <svg
      className="pointer-events-none absolute left-0 top-0"
      width={svgDim.w}
      height={svgDim.h}
      style={{ overflow: "visible" }}
    >
      <defs>
        <linearGradient
          id={`${id}-grad`}
          gradientUnits="userSpaceOnUse"
        >
          <stop
            offset="0%"
            stopColor={reverse ? gradientStopColor : gradientStartColor}
          />
          <stop
            offset="100%"
            stopColor={reverse ? gradientStartColor : gradientStopColor}
          />
        </linearGradient>
        <linearGradient id={`${id}-anim`} gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={gradientStartColor} stopOpacity="0" />
          <stop offset="30%" stopColor={gradientStartColor} stopOpacity="1" />
          <stop offset="70%" stopColor={gradientStopColor} stopOpacity="1" />
          <stop offset="100%" stopColor={gradientStopColor} stopOpacity="0" />
          <animateTransform
            attributeName="gradientTransform"
            type="translate"
            from={reverse ? "0" : "-2"}
            to={reverse ? "2" : "0"}
            dur={`${duration}s`}
            repeatCount="indefinite"
          />
        </linearGradient>
      </defs>
      {/* background path */}
      <path
        d={pathD}
        fill="none"
        stroke={pathColor}
        strokeWidth={pathWidth}
      />
      {/* animated glowing path */}
      <path
        d={pathD}
        fill="none"
        stroke={`url(#${id}-anim)`}
        strokeWidth={pathWidth}
        strokeDasharray="16 24"
        style={{
          animation: `beamDash ${duration}s linear ${delay}s infinite ${reverse ? "reverse" : "normal"}`,
        }}
      />
    </svg>
  )
}

/* ──────────────────────── Circle Node ────────────────────────────── */

const Circle = forwardRef(({ className, children, label }, ref) => (
  <div className="flex flex-col items-center gap-2">
    <div
      ref={ref}
      className={cn(
        "z-10 flex size-12 items-center justify-center rounded-full border-2 border-lp-border bg-white p-3 shadow-[0_0_20px_-12px_rgba(0,0,0,0.8)] transition-all duration-300 hover:shadow-[0_0_28px_-8px_rgba(75,115,255,0.35)] hover:scale-110 hover:border-lp-borderA",
        className
      )}
    >
      {children}
    </div>
    {label && (
      <span className="text-[10.5px] font-medium text-lp-text2 tracking-tight text-center leading-tight max-w-[80px]">
        {label}
      </span>
    )}
  </div>
))
Circle.displayName = "Circle"

/* ──────────────────── Student Hub themed Icons ──────────────────── */

const HubIcons = {
  /* Center: Student Hub logo mark */
  studentHub: () => (
    <img
      src="/openclaw1.png"
      alt="OpenClaw Student Hub"
      className="h-full w-full object-contain"
      draggable="false"
    />
  ),
  /* Telegram */
  telegram: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" fill="#0088cc"/>
    </svg>
  ),
  /* QR / Attendance */
  qrAttendance: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="3" width="7" height="7" rx="1" stroke="#10b981" strokeWidth="1.5" fill="none"/>
      <rect x="14" y="3" width="7" height="7" rx="1" stroke="#10b981" strokeWidth="1.5" fill="none"/>
      <rect x="3" y="14" width="7" height="7" rx="1" stroke="#10b981" strokeWidth="1.5" fill="none"/>
      <rect x="5" y="5" width="3" height="3" rx="0.5" fill="#10b981"/>
      <rect x="16" y="5" width="3" height="3" rx="0.5" fill="#10b981"/>
      <rect x="5" y="16" width="3" height="3" rx="0.5" fill="#10b981"/>
      <rect x="14" y="14" width="3" height="3" rx="0.5" fill="#10b981"/>
      <rect x="18" y="18" width="3" height="3" rx="0.5" fill="#10b981"/>
      <rect x="14" y="18" width="3" height="1.5" rx="0.5" fill="#10b981" opacity="0.5"/>
      <rect x="18" y="14" width="3" height="3" rx="0.5" fill="#10b981" opacity="0.5"/>
    </svg>
  ),
  /* Calendar / Schedule */
  calendar: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="4" width="18" height="18" rx="2" stroke="#f59e0b" strokeWidth="1.5" fill="none"/>
      <path d="M3 10h18" stroke="#f59e0b" strokeWidth="1.5"/>
      <path d="M8 2v4M16 2v4" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="8" cy="15" r="1.5" fill="#f59e0b"/>
      <circle cx="12" cy="15" r="1.5" fill="#f59e0b" opacity="0.5"/>
      <circle cx="16" cy="15" r="1.5" fill="#f59e0b" opacity="0.3"/>
    </svg>
  ),
  /* Grades / Transcript */
  grades: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" stroke="#8b5cf6" strokeWidth="1.5" fill="none"/>
      <rect x="9" y="3" width="6" height="4" rx="1" stroke="#8b5cf6" strokeWidth="1.5" fill="none"/>
      <path d="M9 12h6M9 16h4" stroke="#8b5cf6" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  /* Assignments / Tasks */
  assignments: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 4h16v16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" stroke="#ef4444" strokeWidth="1.5" fill="none"/>
      <path d="M4 4h16" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>
      <path d="M9 10l2 2 4-4" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9 16h6" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
    </svg>
  ),
  /* Chat / Communication */
  chat: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" stroke="#0ea5e9" strokeWidth="1.5" fill="none"/>
      <circle cx="9" cy="12" r="1" fill="#0ea5e9"/>
      <circle cx="12" cy="12" r="1" fill="#0ea5e9"/>
      <circle cx="15" cy="12" r="1" fill="#0ea5e9"/>
    </svg>
  ),
}


export default function AnimatedBeamSection() {
  const containerRef = useRef(null)
  const centerRef = useRef(null)
  const telegramRef = useRef(null)
  const qrRef = useRef(null)
  const calendarRef = useRef(null)
  const gradesRef = useRef(null)
  const assignmentsRef = useRef(null)
  const chatRef = useRef(null)

  return (
    <section className="py-24">
      <div className="max-w-[1120px] mx-auto px-7">
        {/* Section Header */}
        <div className="rv opacity-0 translate-y-4 transition-all duration-700 ease-in-out flex items-center gap-4 text-[10.5px] font-medium tracking-[0.16em] uppercase text-lp-text3 mb-10 after:content-[''] after:flex-1 after:h-px after:bg-lp-border">
        </div>

        <div className="rv opacity-0 translate-y-4 transition-all duration-700 ease-in-out delay-100 text-center mb-14">
          <h2 className="font-sans text-[clamp(2.5rem,5vw,4rem)] leading-[1.06] tracking-tight text-lp-text max-w-[700px] mx-auto">
            Everything connects to<br />
            <em className="italic text-lp-text/40">Student Hub.</em>
          </h2>
          <p className="text-[14px] font-light text-lp-text2 max-w-[460px] mx-auto mt-6">
            Satu platform terpusat yang menghubungkan semua layanan akademik — dari notifikasi Telegram hingga absensi QR, jadwal, nilai, dan tugas.
          </p>
        </div>

        {/* AnimatedBeam Area */}
        <div className="rv opacity-0 translate-y-4 transition-all duration-700 ease-in-out delay-200">
          <div
            ref={containerRef}
            className="relative flex h-[420px] w-full items-center justify-center overflow-hidden rounded-[24px] border border-lp-border bg-white p-10 shadow-[0_20px_60px_rgba(0,0,0,0.04)]"
          >
            {/* Decorative background gradient blobs */}
            <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full blur-[100px] opacity-[0.06] bg-gradient-to-br from-blue-500 to-cyan-400 pointer-events-none" />
            <div className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full blur-[100px] opacity-[0.06] bg-gradient-to-br from-purple-500 to-pink-400 pointer-events-none" />

            <div className="flex size-full max-h-[320px] max-w-2xl flex-col items-stretch justify-between gap-8">
              {/* Top Row */}
              <div className="flex flex-row items-center justify-between px-4">
                <Circle ref={telegramRef} label="Telegram">
                  <HubIcons.telegram />
                </Circle>
                <Circle ref={gradesRef} label="Nilai">
                  <HubIcons.grades />
                </Circle>
              </div>

              {/* Middle Row */}
              <div className="flex flex-row items-center justify-between">
                <Circle ref={qrRef} label="Absensi QR">
                  <HubIcons.qrAttendance />
                </Circle>
                <Circle
                  ref={centerRef}
                  className="size-20 border-red-200 bg-white p-1.5 shadow-[0_0_34px_-8px_rgba(239,68,68,0.4)]"
                  label="Student Hub"
                >
                  <HubIcons.studentHub />
                </Circle>
                <Circle ref={assignmentsRef} label="Tugas">
                  <HubIcons.assignments />
                </Circle>
              </div>

              {/* Bottom Row */}
              <div className="flex flex-row items-center justify-between px-4">
                <Circle ref={calendarRef} label="Jadwal">
                  <HubIcons.calendar />
                </Circle>
                <Circle ref={chatRef} label="Chat">
                  <HubIcons.chat />
                </Circle>
              </div>
            </div>

            {/* Beams: Left side → Center */}
            <AnimatedBeam
              containerRef={containerRef}
              fromRef={telegramRef}
              toRef={centerRef}
              curvature={-75}
              endYOffset={-10}
              gradientStartColor="#0088cc"
              gradientStopColor="#4b73ff"
            />
            <AnimatedBeam
              containerRef={containerRef}
              fromRef={qrRef}
              toRef={centerRef}
              gradientStartColor="#10b981"
              gradientStopColor="#4b73ff"
            />
            <AnimatedBeam
              containerRef={containerRef}
              fromRef={calendarRef}
              toRef={centerRef}
              curvature={75}
              endYOffset={10}
              gradientStartColor="#f59e0b"
              gradientStopColor="#4b73ff"
            />

            {/* Beams: Center → Right side (reverse) */}
            <AnimatedBeam
              containerRef={containerRef}
              fromRef={gradesRef}
              toRef={centerRef}
              curvature={-75}
              endYOffset={-10}
              reverse
              gradientStartColor="#8b5cf6"
              gradientStopColor="#4b73ff"
            />
            <AnimatedBeam
              containerRef={containerRef}
              fromRef={assignmentsRef}
              toRef={centerRef}
              reverse
              gradientStartColor="#ef4444"
              gradientStopColor="#4b73ff"
            />
            <AnimatedBeam
              containerRef={containerRef}
              fromRef={chatRef}
              toRef={centerRef}
              curvature={75}
              endYOffset={10}
              reverse
              gradientStartColor="#0ea5e9"
              gradientStopColor="#4b73ff"
            />
          </div>
        </div>

        {/* Feature pills beneath the beam */}
        <div className="rv opacity-0 translate-y-4 transition-all duration-700 ease-in-out delay-300 flex flex-wrap justify-center gap-3 mt-10">
          {[
            { label: "Notifikasi Real-time", icon: "⚡" },
            { label: "Absensi QR Otomatis", icon: "📱" },
            { label: "Jadwal Terintegrasi", icon: "📅" },
            { label: "Laporan Nilai", icon: "📊" },
            { label: "Manajemen Tugas", icon: "📝" },
            { label: "Chat Dosen-Mahasiswa", icon: "💬" },
          ].map((pill) => (
            <span
              key={pill.label}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-lp-border bg-lp-surface text-[12px] font-medium text-lp-text2 transition-all duration-300 hover:border-lp-borderA hover:bg-white hover:text-lp-text hover:shadow-sm"
            >
              <span>{pill.icon}</span>
              {pill.label}
            </span>
          ))}
        </div>
      </div>

      {/* Inject keyframe for dash animation */}
      <style>{`
        @keyframes beamDash {
          to { stroke-dashoffset: -80; }
        }
      `}</style>
    </section>
  )
}
