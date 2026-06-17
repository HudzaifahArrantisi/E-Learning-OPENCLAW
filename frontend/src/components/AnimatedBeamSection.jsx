import { useCallback, useEffect, useRef, useState, useId } from "react"
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion"
import minimaxImg from "../assets/minimax.webp"
import chatgptImg from "../assets/chatgpt.webp"

/* ───────────────── palette & timing tokens ───────────────── */

const C = {
  accent:   "#4B73FF",
  red:      "#DC2626",
  claw:     "#E74C3C",
  tg:       "#26A5E4",
  green:    "#16A34A",
  amber:    "#D97706",
  surface:  "#F1F5F9",
  text:     "#0F172A",
  text2:    "#475569",
  text3:    "#94A3B8",
  border:   "rgba(0,0,0,0.08)",
}

/* ────────── reusable cn helper ────────── */
function cn(...classes) { return classes.filter(Boolean).join(" ") }



function AnimatedBeam({
  containerRef, fromRef, toRef, curvature = 0,
  delay = 0, color = C.accent, reverse = false, active = false,
  dashed = false, pulseSize = 7,
}) {
  const [pathD, setPathD] = useState("")
  const [pts, setPts] = useState({ x1: 0, y1: 0, x2: 0, y2: 0 })
  const [dim, setDim] = useState({ w: 0, h: 0 })
  const generatedId = useId()
  const uid = generatedId.replace(/:/g, "") // clean string for SVG IDs

  const update = useCallback(() => {
    if (!containerRef?.current || !fromRef?.current || !toRef?.current) return
    const c = containerRef.current.getBoundingClientRect()
    const a = fromRef.current.getBoundingClientRect()
    const b = toRef.current.getBoundingClientRect()
    const x1 = a.left - c.left + a.width / 2
    const y1 = a.top  - c.top  + a.height / 2
    const x2 = b.left - c.left + b.width / 2
    const y2 = b.top  - c.top  + b.height / 2
    const mx = (x1 + x2) / 2 + curvature
    const my = (y1 + y2) / 2
    setDim({ w: c.width, h: c.height })
    setPts({ x1, y1, x2, y2 })
    setPathD(`M ${x1},${y1} Q ${mx},${my} ${x2},${y2}`)
  }, [containerRef, fromRef, toRef, curvature])

  useEffect(() => {
    update()
    const ro = new ResizeObserver(update)
    if (containerRef?.current) ro.observe(containerRef.current)
    window.addEventListener("resize", update)
    return () => { ro.disconnect(); window.removeEventListener("resize", update) }
  }, [update, containerRef])

  const travelDur = "2.6s"

  return (
    <svg
      className="pointer-events-none absolute left-0 top-0 z-0"
      width={dim.w} height={dim.h}
      style={{ overflow: "visible" }}
    >
      <defs>
        <linearGradient id={`${uid}-g`} gradientUnits="userSpaceOnUse"
          x1={pts.x1} y1={pts.y1} x2={pts.x2} y2={pts.y2}
        >
          <stop offset="0%" stopColor={color} stopOpacity="0.55" />
          <stop offset="100%" stopColor={color} stopOpacity="0.15" />
        </linearGradient>
        <radialGradient id={`${uid}-p`}>
          <stop offset="0%" stopColor="#fff" stopOpacity="1" />
          <stop offset="40%" stopColor={color} stopOpacity="0.95" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* the wire path animated with framer-motion */}
      {pathD && (
        <motion.path
          d={pathD}
          fill="none"
          stroke={`url(#${uid}-g)`}
          strokeWidth={dashed ? 1.5 : 2.2}
          strokeLinecap="round"
          strokeDasharray={dashed ? "6 5" : undefined}
          initial={{ pathLength: 0, opacity: 0 }}
          animate={active ? { pathLength: 1, opacity: 1 } : {}}
          transition={{
            pathLength: { duration: 1.1, delay, ease: "easeInOut" },
            opacity: { duration: 0.5, delay }
          }}
        />
      )}

      {/* arrow tip */}
      {pathD && active && (
        <motion.circle
          r={3.5}
          fill={color}
          cx={reverse ? pts.x1 : pts.x2}
          cy={reverse ? pts.y1 : pts.y2}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.6 }}
          transition={{ delay: delay + 1.0, duration: 0.3 }}
        />
      )}

      {/* travelling pulse dot */}
      {pathD && active && (
        <g className="beam-pulse">
          <circle r={pulseSize} fill={`url(#${uid}-p)`}>
            <animateMotion
              path={pathD} dur={travelDur} begin={`${delay + 1.1}s`}
              repeatCount="indefinite" calcMode="spline"
              keyPoints={reverse ? "1;0" : "0;1"} keyTimes="0;1"
              keySplines="0.45 0 0.25 1"
            />
          </circle>
          <circle r={2.2} fill="#fff">
            <animateMotion
              path={pathD} dur={travelDur} begin={`${delay + 1.1}s`}
              repeatCount="indefinite" calcMode="spline"
              keyPoints={reverse ? "1;0" : "0;1"} keyTimes="0;1"
              keySplines="0.45 0 0.25 1"
            />
          </circle>
        </g>
      )}
    </svg>
  )
}

/* ══════════════════════════════════════════════════════════════
   FlowNode — a single node in the system flow
   ══════════════════════════════════════════════════════════════ */

/* ───────────────── AI Icon Components ───────────────── */

const OpenAIIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5.5 h-5.5 text-[#10A37F]">
    <path d="M21.7 10.3c.1-.4.2-.9.2-1.3 0-1.9-1.2-3.6-3-4.2-.3-.1-.7-.2-1-.2-.4 0-.8.1-1.2.2C15.8 3.5 14 2.3 12 2.3c-.7 0-1.4.2-2 .5-.3-.4-.8-.7-1.3-.9C7.4 1.5 5.8 2 4.6 3.1c-.6.6-1 1.3-1.2 2.1-.5.1-1 .4-1.4.8C.8 7.2.3 9.1.7 11c.2.8.6 1.5 1.2 2-.1.4-.2.9-.2 1.3 0 1.9 1.2 3.6 3 4.2.3.1.7.2 1 .2.4 0 .8-.1 1.2-.2.9 1.3 2.7 2.5 4.7 2.5.7 0 1.4-.2 2-.5.3.4.8.7 1.3.9 1.3.4 2.9-.1 4.1-1.2.6-.6 1-1.3 1.2-2.1.5-.1 1-.4 1.4-.8 1.2-1.2 1.7-3.1 1.3-5-.2-.8-.6-1.5-1.2-2zm-9.7 9.4c-.9 0-1.8-.4-2.4-1l5.5-3.2c.4-.2.6-.7.6-1.2v-5.7l1.7 1c.5.3.8.8.8 1.4v6.3c0 .8-.7 1.4-1.5 1.4H12zm-6.2-3.6c-.5-.3-.8-.8-.8-1.4V8.4c0-.8.7-1.4 1.5-1.4h4.7v6.4c0 .4.2.9.6 1.2l5.5 3.2-5.5 3.2c-.4.2-.9.2-1.3 0l-4.7-2.8zm-.8-7.7c0-.6.3-1.1.8-1.4l5.5-3.2c.4-.2.9-.2 1.3 0l4.7 2.8c.5.3.8.8.8 1.4v6.3c0 .8-.7 1.4-1.5 1.4h-4.7V8.9c0-.4-.2-.9-.6-1.2L6.8 5.5l-.2-.1v3.1zm11.7-2.8c.5.3.8.8.8 1.4v6.3c0 .8-.7 1.4-1.5 1.4h-4.7V7.5c0-.4-.2-.9-.6-1.2L6.2 3.1C7.4 2.4 9 2.5 10.1 3.2l4.7 2.8c.4.2.8.5 1 .9zM7.4 8.2l5.5-3.2c.4-.2.9-.2 1.3 0l4.7 2.8c.5.3.8.8.8 1.4v6.3c0 .8-.7 1.4-1.5 1.4h-4.7V10.5c0-.4-.2-.9-.6-1.2L7.4 8.2z" fill="currentColor"/>
  </svg>
)

const MiniMaxIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5.5 h-5.5 text-[#FF5A5F]">
    <path d="M12 2L14.8 8.4L21.2 11.2L14.8 14L12 20.4L9.2 14L2.8 11.2L9.2 8.4L12 2Z" fill="currentColor"/>
    <path d="M18.4 17.6L19.5 20.1L22 21.2L19.5 22.3L18.4 24.8L17.3 22.3L14.8 21.2L17.3 20.1L18.4 17.6Z" fill="currentColor" opacity="0.6"/>
  </svg>
)

/* ══════════════════════════════════════════════════════════════
   FlowNode — a single node in the system flow
   ══════════════════════════════════════════════════════════════ */

const FlowNode = ({ className, innerRef, icon, label, sublabel, color, stepNum, variant = "default", active, delay = 0 }) => {
  const isHub = variant === "hub"
  const isCard = variant === "card"
  const isMini = variant === "mini"

  const renderIcon = () => {
    if (typeof icon === "string" && (icon.startsWith("/") || icon.includes(".") || icon.startsWith("data:"))) {
      return (
        <img
          src={icon}
          alt={label || "icon"}
          className={cn(
            isHub ? "h-full w-full object-contain p-1.5" : isMini ? "h-7 w-7 sm:h-8 sm:w-8 object-contain rounded-full" : "h-6 w-6 object-contain"
          )}
          draggable="false"
        />
      )
    }
    return icon
  }

  return (
    <motion.div
      className={cn(
        "flex flex-col items-center gap-1.5 relative z-10 select-none",
        isCard ? "w-full max-w-[155px] sm:max-w-none sm:w-[220px]" : isMini ? "w-16 sm:w-20" : "w-28 sm:w-36",
        className
      )}
      initial={{ opacity: 0, y: 22, scale: 0.85 }}
      animate={active ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.215, 0.61, 0.355, 1] }}
    >
      {/* Step number badge */}
      {stepNum && (
        <span className="absolute -top-3 left-[calc(50%+12px)] sm:left-[calc(50%+16px)] z-20 flex items-center justify-center
          w-5 h-5 rounded-full text-[9.5px] font-bold text-white shadow-md border border-white/20"
          style={{ background: color || C.accent }}
        >
          {stepNum}
        </span>
      )}

      {isCard ? (
        <div
          ref={innerRef}
          className="w-full p-2.5 sm:p-3.5 rounded-2xl border bg-white/95 shadow-md flex items-start gap-1.5 sm:gap-2.5 text-left transition-all duration-300 hover:shadow-lg"
          style={{
            borderColor: color ? `${color}35` : C.border,
            boxShadow: `0 8px 24px -6px ${color}12, 0 2px 8px rgba(0,0,0,0.03)`,
          }}
        >
          <span className="text-[18px] sm:text-[22px] shrink-0 mt-0.5">{renderIcon()}</span>
          <div className="min-w-0">
            <span className="block text-[10px] sm:text-[11.5px] font-bold text-lp-text leading-tight">
              {label}
            </span>
            {sublabel && (
              <span className="block text-[8.5px] sm:text-[9.5px] text-lp-text2 font-light mt-1 leading-snug">
                {sublabel}
              </span>
            )}
          </div>
        </div>
      ) : isMini ? (
        <>
          <div
            ref={innerRef}
            className="relative flex items-center justify-center w-11 h-11 sm:w-13 sm:h-13 rounded-full border bg-white shadow-sm transition-all duration-300 hover:scale-105"
            style={{
              borderColor: color ? `${color}45` : C.border,
              boxShadow: `0 4px 12px -3px ${color}25, 0 2px 4px rgba(0,0,0,0.02)`,
            }}
          >
            <span className="text-[18px] sm:text-[20px] flex items-center justify-center">
              {renderIcon()}
            </span>
          </div>
          <div className="text-center w-full">
            <span className="block text-[10px] sm:text-[10.5px] font-extrabold text-lp-text tracking-tight leading-tight">
              {label}
            </span>
          </div>
        </>
      ) : (
        <>
          <div
            ref={innerRef}
            className={cn(
              "relative flex items-center justify-center transition-all duration-500",
              isHub
                ? "w-16 h-16 sm:w-20 sm:h-20 rounded-full"
                : "w-14 h-14 sm:w-16 sm:h-16 rounded-[22px]",
              "border bg-white shadow-md"
            )}
            style={{
              borderColor: color ? `${color}35` : C.border,
              boxShadow: isHub
                ? `0 0 35px -8px ${C.claw}45, 0 8px 24px rgba(0,0,0,0.04)`
                : `0 6px 18px -4px ${color}15, 0 2px 6px rgba(0,0,0,0.02)`,
            }}
          >
            {/* Hub glow rings */}
            {isHub && active && (
              <>
                <span className="absolute inset-0 rounded-full animate-[hubPing_2.8s_ease-out_infinite]"
                  style={{ border: `1.5px solid ${C.claw}60` }} />
                <span className="absolute inset-0 rounded-full animate-[hubPing_2.8s_ease-out_1.4s_infinite]"
                  style={{ border: `1.5px solid ${C.claw}40` }} />
              </>
            )}
            <span className={cn(isHub ? "text-[28px] sm:text-[34px] flex items-center justify-center h-full w-full" : "text-[22px] sm:text-[26px] flex items-center justify-center")}>
              {renderIcon()}
            </span>
          </div>

          {/* Label under icon */}
          <div className="text-center w-full px-1">
            <span className="block text-[11.5px] sm:text-[12px] font-bold text-lp-text tracking-tight leading-tight">
              {label}
            </span>
            {sublabel && (
              <span className="block text-[9.5px] text-lp-text3 font-light mt-1 leading-snug">
                {sublabel}
              </span>
            )}
          </div>
        </>
      )}
    </motion.div>
  )
}





/* ══════════════════════════════════════════════════════════════
   MAIN SECTION EXPORT
   ══════════════════════════════════════════════════════════════ */

export default function AnimatedBeamSection() {
  const containerRef = useRef(null)

  /* Node refs */
  const dosenRef     = useRef(null)
  const dbRef        = useRef(null)
  const readDbRef    = useRef(null)
  const clawRef      = useRef(null)
  const ruleRef      = useRef(null)
  const openaiRef    = useRef(null)
  const minimaxRef   = useRef(null)
  const telegramRef  = useRef(null)
  const mhsRef       = useRef(null)

  const [active, setActive] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  /* Track screen size for dynamic curves */
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  /* Trigger on scroll */
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setActive(true); obs.disconnect() }
    }, { threshold: 0.15 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])



  /* Beam definitions:  from → to, curvature, delay, color */
  const beams = [
    // Dosen -> Database (vertical straight)
    { from: dosenRef,    to: dbRef,       curvature: 0,                     delay: 0,    color: C.accent },
    // Database -> Read Database (diagonal down-left)
    { from: dbRef,       to: readDbRef,   curvature: isMobile ? 0 : -20,    delay: 1.0,  color: C.amber,  dashed: true },
    // Database -> Rule Engine (diagonal down-right)
    { from: dbRef,       to: ruleRef,     curvature: isMobile ? 0 : 20,     delay: 1.0,  color: C.red,    dashed: true },
    // Read Database -> OpenClaw Core (diagonal down-right)
    { from: readDbRef,   to: clawRef,     curvature: 0,                     delay: 2.2,  color: C.amber,  dashed: true },
    // Rule Engine -> OpenClaw Core (diagonal down-left)
    { from: ruleRef,     to: clawRef,     curvature: 0,                     delay: 2.2,  color: C.red,    dashed: true },
    // OpenClaw Core -> OpenAI (diagonal down-left)
    { from: clawRef,     to: openaiRef,   curvature: 0,                     delay: 3.4,  color: "#10A37F" },
    // OpenClaw Core -> Minimax (diagonal down-right)
    { from: clawRef,     to: minimaxRef,  curvature: 0,                     delay: 3.4,  color: "#FF5A5F" },
    // OpenClaw Core -> Telegram (vertical straight)
    { from: clawRef,     to: telegramRef, curvature: 0,                     delay: 4.6,  color: C.tg     },
    // Telegram -> Mahasiswa (vertical straight)
    { from: telegramRef, to: mhsRef,      curvature: 0,                     delay: 5.8,  color: C.green  },
  ]
  return (
    <section className="py-12 sm:py-16 relative overflow-hidden bg-transparent">

      <div className="max-w-[1120px] mx-auto px-5 sm:px-8">
        <div className="rv opacity-0 translate-y-4 transition-all duration-700 ease-in-out flex items-center gap-4 text-[10.5px] font-medium tracking-[0.16em] uppercase text-lp-text3 mb-6 after:content-[''] after:flex-1 after:h-px after:bg-lp-border">
        </div>

        <div className="rv opacity-0 translate-y-4 transition-all duration-700 ease-in-out delay-100 text-center mb-8 sm:mb-12">
          <h3 className="font-sans text-[clamp(1.6rem,4vw,2.8rem)] semibold leading-[1.1] tracking-tight text-lp-text max-w-[750px] mx-auto">
            Bagaimana OpenClaw
            <em className="italic text-lp-text/30 font-light font-instagram"> Bekerja?</em>
          </h3>
          <p className="text-[13px] sm:text-[14px] font-light text-lp-text2 max-w-[500px] mx-auto mt-4 leading-relaxed">
            Ikuti alur otomatisasi pintar yang menghubungkan dosen, sistem database, OpenClaw Automation Engine, hingga notifikasi langsung ke Telegram mahasiswa.
          </p>
        </div>

        {/* ─────────── Flow Diagram Container ─────────── */}
        <div className="rv opacity-0 translate-y-4 transition-all duration-700 ease-in-out delay-200">
          <div
            ref={containerRef}
            className={cn(
              "flow-stage relative w-full overflow-visible py-4",
              active && "flow-active"
            )}
          >
            {/* The Unified Grid Layout (responsive areas) */}
            <div className="flow-grid w-full">
              <FlowNode
                className="area-dosen"
                innerRef={dosenRef}
                icon="👨‍🏫"
                label="Dosen Input Tugas"
                sublabel="Upload tugas ke portal"
                color={C.accent}
                stepNum="1"
                active={active}
                delay={0}
              />

              <FlowNode
                className="area-db"
                innerRef={dbRef}
                icon="🗄️"
                label="Database"
                sublabel="Tugas terdata di sistem"
                color={C.green}
                stepNum="2"
                active={active}
                delay={0.15}
              />

              <FlowNode
                className="area-read"
                innerRef={readDbRef}
                icon="📖"
                label="Membaca Tugas"
                sublabel="Openclaw membaca tugas upload dari dosen lewat database"
                color={C.amber}
                variant="card"
                stepNum="3"
                active={active}
                delay={0.3}
              />

              <FlowNode
                className="area-claw"
                innerRef={clawRef}
                icon="/claw2.webp"
                label="OpenClaw Core"
                sublabel="Automation Engine"
                color={C.claw}
                variant="hub"
                stepNum="4"
                active={active}
                delay={0.6}
              />

              <FlowNode
                className="area-rule"
                innerRef={ruleRef}
                icon="⚙️"
                label="Rule Engine"
                sublabel="Openclaw membuat Rule engine untuk tugas"
                color={C.red}
                variant="card"
                stepNum="4"
                active={active}
                delay={0.45}
              />

              <FlowNode
                className="area-openai"
                innerRef={openaiRef}
                icon={chatgptImg}
                label="OpenAI"
                color="#10A37F"
                variant="mini"
                active={active}
                delay={0.7}
              />

              <FlowNode
                className="area-minimax"
                innerRef={minimaxRef}
                icon={minimaxImg}
                label="Minimax"
                color="#FF5A5F"
                variant="mini"
                active={active}
                delay={0.7}
              />

              <FlowNode
                className="area-tg"
                innerRef={telegramRef}
                icon={
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 sm:w-8 sm:h-8">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" fill="#26A5E4"/>
                  </svg>
                }
                label="Telegram"
                sublabel="Notif dikirim ke Telegram"
                color={C.tg}
                stepNum="6"
                active={active}
                delay={0.8}
              />

              <FlowNode
                className="area-mhs"
                innerRef={mhsRef}
                icon="🎓"
                label="Mahasiswa"
                sublabel="Membaca reminder tugas"
                color={C.green}
                stepNum="7"
                active={active}
                delay={0.9}
              />
            </div>

            {/* SVG Beams */}
            {beams.map((b, i) => (
              <AnimatedBeam
                key={i}
                containerRef={containerRef}
                fromRef={b.from}
                toRef={b.to}
                curvature={b.curvature}
                delay={b.delay}
                color={b.color}
                active={active}
                dashed={b.dashed}
              />
            ))}
          </div>
        </div>


      </div>

      {/* Styles for Grid layout and keyframes */}
      <style>{`
        /* Mobile Layout: 3-column layout matching the diagram */
        .flow-grid {
          display: grid;
          gap: 1.6rem 0.5rem;
          justify-items: center;
          align-items: center;
          grid-template-areas:
            ". dosen ."
            ". db ."
            "read . rule"
            ". claw ."
            "openai . minimax"
            ". tg ."
            ". mhs .";
          grid-template-columns: 1.2fr 0.6fr 1.2fr;
        }

        /* Desktop Layout: 7 columns, 3 rows */
        @media (min-width: 768px) {
          .flow-grid {
            grid-template-areas:
              ". . . read . . ."
              "dosen db . claw . tg mhs"
              ". . openai rule minimax . .";
            grid-template-columns: 1.1fr 1.1fr 0.8fr 1.6fr 0.8fr 1.1fr 1.1fr;
            grid-template-rows: auto auto auto;
            gap: 2.5rem 1.2rem;
            align-items: center;
          }
        }

        @media (min-width: 1024px) {
          .flow-grid {
            gap: 3.2rem 1.8rem;
          }
        }

        /* Mapping grid areas */
        .area-dosen { grid-area: dosen; }
        .area-db { grid-area: db; }
        .area-read { grid-area: read; }
        .area-claw { grid-area: claw; }
        .area-rule { grid-area: rule; }
        .area-openai { grid-area: openai; }
        .area-minimax { grid-area: minimax; }
        .area-tg { grid-area: tg; }
        .area-mhs { grid-area: mhs; }

        @media (min-width: 768px) {
          .area-openai,
          .area-minimax {
            align-self: start;
            margin-top: -3.2rem;
          }
        }

        /* Hub glow animation pulse ring */
        @keyframes hubPing {
          0%   { transform: scale(1);   opacity: 0.55; }
          75%  { opacity: 0; }
          100% { transform: scale(2.4); opacity: 0; }
        }
      `}</style>
    </section>
  )
}
