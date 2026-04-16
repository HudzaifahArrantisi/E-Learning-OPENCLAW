import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  featureCards, howItWorks, benefits, roles, semesters, visiData, platformFeatures,
  stats, footerLinks, programs, institutions, academicCalendar, calendarMonths,
  EVENT_COLORS, EVENT_LABELS, getEventsForDate, fmtDate, dashboardFeed
} from '../data/landingData'
import LoginModal from '../components/LoginModal'

export default function LandingPage() {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.remove('opacity-0', 'translate-y-4')
          e.target.classList.add('opacity-100', 'translate-y-0')
          obs.unobserve(e.target)
        }
      }),
      { threshold: 0.1, rootMargin: '0px 0px -48px 0px' }
    )
    document.querySelectorAll('.rv').forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [])

  const [activeProg, setActiveProg] = useState('ti')
  const [activeInst, setActiveInst] = useState('stt-nf')
  const [selectedDate, setSelectedDate] = useState(null)

  const inst = institutions[activeInst]
  const prog = programs[activeProg]
  const semNumbers = [...new Set(prog.courses.map(c => c.sem))].sort((a, b) => a - b)

  const rvBase = 'rv opacity-0 translate-y-4 transition-all duration-700 ease-in-out'
  const rvDelays = ['', 'delay-100', 'delay-200', 'delay-300', 'delay-400', 'delay-500']

  return (
    <div className="bg-lp-bg text-lp-text font-sans font-light overflow-x-hidden leading-relaxed min-h-screen relative z-0">
      {/* GLOBAL GRID BACKGROUND */}
      <div className="fixed inset-0 pointer-events-none z-[-1] bg-lp-surface">
        {/* Grid pattern with clearer opacity (0.08) */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.08)_1px,transparent_1px)] bg-[size:64px_64px]" />
        {/* Edges mask so grid fades nicely toward the sides/bottom */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,rgba(255,255,255,0.85)_70%,#ffffff_100%)]" />
      </div>
      {/* HEADER / NAV */}
      <div className="fixed top-5 left-0 right-0 z-50 flex justify-center px-4 sm:px-5 pointer-events-none">
        <div className={`pointer-events-auto transition-all duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] relative ${isMobileMenuOpen ? 'w-full sm:w-max' : 'w-max max-w-full'}`}>
          <nav className="flex items-center justify-between bg-lp-bg/50 backdrop-blur-x1 border border-lp-border/20 rounded-full py-1 px-1.5 pl-4 sm:pl-5 whitespace-nowrap gap-0.5 shadow-[0_12px_32px_rgba(0,0,0,0.08)]">
            <span className="text-[11.5px] font-semibold text-lp-text tracking-[0.07em] mr-2.5 sm:mr-4">STUDENT-HUB</span>
            
            <div className="hidden sm:flex items-center gap-0.5">
              <a href="#features" className="text-lp-text2 text-[12.5px] px-4 py-2 rounded-full transition-all hover:text-lp-text hover:bg-black/5">Features</a>
              <a href="#platform" className="text-lp-text2 text-[12.5px] px-4 py-2 rounded-full transition-all hover:text-lp-text hover:bg-black/5">Platform</a>
              <a href="#kurikulum" className="text-lp-text2 text-[12.5px] px-4 py-2 rounded-full transition-all hover:text-lp-text hover:bg-black/5">Kurikulum</a>
              <a href="#visi-misi" className="text-lp-text2 text-[12.5px] px-4 py-2 rounded-full transition-all hover:text-lp-text hover:bg-black/5">Visi Misi</a>
              <a href="#kalender" className="text-lp-text2 text-[12.5px] px-4 py-2 rounded-full transition-all hover:text-lp-text hover:bg-black/5">Kalender</a>
            </div>

            <div className="flex items-center gap-1.5 ml-auto pl-2 sm:pl-0">
              <button onClick={() => setIsLoginModalOpen(true)} className="bg-lp-text text-lp-bg text-[12px] sm:text-[12.5px] font-semibold px-4 sm:px-5 py-2 rounded-full transition-all hover:bg-lp-atext tracking-[0.01em]">Masuk</button>
              <button 
                className="sm:hidden w-8 h-8 flex flex-col justify-center items-center gap-[4px] bg-lp-surface border border-lp-border/50 rounded-full"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Toggle mobile menu"
              >
                <span className={`w-[13px] h-[1.5px] bg-lp-text transition-transform ${isMobileMenuOpen ? 'translate-y-[5.5px] rotate-45' : ''}`} />
                <span className={`w-[13px] h-[1.5px] bg-lp-text transition-opacity ${isMobileMenuOpen ? 'opacity-0' : ''}`} />
                <span className={`w-[13px] h-[1.5px] bg-lp-text transition-transform ${isMobileMenuOpen ? '-translate-y-[5.5px] -rotate-45' : ''}`} />
              </button>
            </div>
          </nav>

          <div className={`sm:hidden absolute top-[calc(100%+8px)] left-0 right-0 bg-lp-surface/80 backdrop-blur-2xl border border-lp-border/60 rounded-[20px] p-2 shadow-[0_24px_48px_rgba(0,0,0,0.1)] transition-all duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] origin-top overflow-hidden ${isMobileMenuOpen ? 'opacity-100 scale-y-100 translate-y-0' : 'opacity-0 scale-y-95 -translate-y-4 pointer-events-none'}`}>
            <div className="flex flex-col gap-1">
              <a href="#features" onClick={() => setIsMobileMenuOpen(false)} className="px-4 py-3 text-[13.5px] font-medium text-lp-text2 hover:text-lp-text hover:bg-black/5 rounded-xl transition-colors">Features</a>
              <a href="#platform" onClick={() => setIsMobileMenuOpen(false)} className="px-4 py-3 text-[13.5px] font-medium text-lp-text2 hover:text-lp-text hover:bg-black/5 rounded-xl transition-colors">Platform</a>
              <a href="#kurikulum" onClick={() => setIsMobileMenuOpen(false)} className="px-4 py-3 text-[13.5px] font-medium text-lp-text2 hover:text-lp-text hover:bg-black/5 rounded-xl transition-colors">Kurikulum</a>
              <a href="#visi-misi" onClick={() => setIsMobileMenuOpen(false)} className="px-4 py-3 text-[13.5px] font-medium text-lp-text2 hover:text-lp-text hover:bg-black/5 rounded-xl transition-colors">Visi Misi</a>
              <a href="#kalender" onClick={() => setIsMobileMenuOpen(false)} className="px-4 py-3 text-[13.5px] font-medium text-lp-text2 hover:text-lp-text hover:bg-black/5 rounded-xl transition-colors">Kalender</a>
            </div>
          </div>
        </div>
      </div>
      <section className="relative min-h-screen flex items-end pb-24 overflow-hidden">
        <div className="absolute left-0 right-0 h-[160px] animate-scanAnim bg-[linear-gradient(180deg,transparent,rgba(75,115,255,0.03)_35%,rgba(75,115,255,0.06)_50%,rgba(75,115,255,0.03)_65%,transparent)] pointer-events-none" />
        <div className="relative z-10 w-full max-w-[1120px] mx-auto px-7">
          <div className="inline-flex items-center gap-2 border border-black/10 rounded-full py-1.5 pl-2.5 pr-4 text-[11.5px] text-lp-text2 tracking-wide mb-10 animate-slideUp delay-100 fill-mode-both">
            <span className="w-1.5 h-1.5 rounded-full bg-lp-accent animate-pulse" />
            E-Learning Reminder Openclaw · By Andromeda 
          </div>
          <h1 className="font-sans text-[clamp(3.8rem,7.4vw,6.6rem)] font-normal leading-[0.96] tracking-[-0.035em] text-lp-text mb-8 animate-slideUp delay-300 fill-mode-both">
            Openclaw Reminder<br />
            <em className="italic text-lp-text/40">Student Hub</em>
          </h1>
          <p className="text-[17px] font-light text-lp-text2 max-w-[560px] leading-relaxed mb-11 animate-slideUp delay-500 fill-mode-both">
            Student Hub automatically reminds you about classes, assignments, 
            attendance, and deadlines delivered straight to your Telegram.
            Powered by the OpenClaw automation engine.
          </p>
          <div className="flex items-center gap-4 flex-wrap animate-slideUp delay-[650ms] fill-mode-both">
            <button onClick={() => setIsLoginModalOpen(true)} className="inline-flex items-center gap-2 bg-lp-text text-lp-bg font-sans text-[13px] font-semibold py-3 px-6 rounded-full transition-all hover:bg-lp-atext hover:-translate-y-px">Start Learning →</button>
            <a href="#features" className="inline-flex items-center gap-2 text-lp-text2 font-sans text-[13px] hover:text-lp-text group transition-colors">
              Explore features <span className="transition-transform group-hover:translate-x-1 inline-block">→</span>
            </a>
          </div>
        </div>
      </section>

      {/* 01 - FEATURES */}
      <hr className="border-0 border-t border-lp-border" />
      <section id="features" className="py-24">
        <div className="max-w-[1120px] mx-auto px-7">
          <div className={`${rvBase} flex items-center gap-4 text-[10.5px] font-medium tracking-[0.16em] uppercase text-lp-text3 mb-10 after:content-[''] after:flex-1 after:h-px after:bg-lp-border`}>
            <span className="font-mono">01</span> Core Features
          </div>
          <div className={`${rvBase} ${rvDelays[1]} flex flex-col md:flex-row md:justify-between md:items-end gap-6 mb-14`}>
            <h2 className="font-sans text-[clamp(2.8rem,5.5vw,4.5rem)] leading-[1.06] tracking-tight text-lp-text">Everything you need<br /><em className="italic text-lp-text/40">to stay on track.</em></h2>
            <p className="text-[14px] font-light text-lp-text2 max-w-[320px] pb-2">
              Smart reminders, automated tracking, and seamless Telegram integration — built for the modern student.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {featureCards.map((f, i) => (
              <div key={f.title} className={`${rvBase} ${rvDelays[Math.min(i+1, 5)]} border border-lp-border rounded-2xl p-8 relative overflow-hidden transition-all duration-300 hover:border-lp-borderA hover:bg-lp-borderA/5 hover:-translate-y-0.5 group`}>
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-lp-accent/30 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                {f.icon === '⚡' && <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-5 text-xl bg-lp-accentS text-lp-atext">{f.icon}</div>}
                {f.icon === '✈️' && <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-5 text-xl bg-lp-tg/10 text-lp-tg">{f.icon}</div>}
                {f.icon === '📊' && <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-5 text-xl bg-lp-green/10 text-lp-green">{f.icon}</div>}
                {f.icon === '📝' && <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-5 text-xl bg-lp-amber/10 text-lp-amber">{f.icon}</div>}
                {f.icon === '📈' && <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-5 text-xl bg-purple-500/10 text-purple-400">{f.icon}</div>}
                {f.icon === '🔄' && <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-5 text-xl bg-lp-red/10 text-lp-red">{f.icon}</div>}
                <div className="text-[15px] font-semibold text-lp-text mb-2.5 tracking-tight leading-snug">{f.title}</div>
                <div className="text-[13.5px] font-light text-lp-text2 leading-relaxed">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 02 - HOW IT WORKS */}
      <hr className="border-0 border-t border-lp-border" />
      <section className="py-24">
        <div className="max-w-[1120px] mx-auto px-7">
          <div className={`${rvBase} flex items-center gap-4 text-[10.5px] font-medium tracking-[0.16em] uppercase text-lp-text3 mb-10 after:content-[''] after:flex-1 after:h-px after:bg-lp-border`}>
            <span className="font-mono">02</span> How It Works
          </div>
          <div className={`${rvBase} ${rvDelays[1]} text-center mb-14`}>
            <h2 className="font-sans text-[clamp(2.8rem,5.5vw,4.5rem)] leading-[1.06] tracking-tight text-lp-text max-w-[600px] mx-auto">Three steps to<br /><em className="italic text-lp-text/40">academic clarity.</em></h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-0 relative">
            <div className="hidden md:block absolute top-11 left-[15%] right-[15%] h-px bg-gradient-to-r from-transparent via-lp-borderA to-transparent" />
            {howItWorks.map((step, i) => (
              <div key={step.num} className={`${rvBase} ${rvDelays[i+1]} text-center relative px-6`}>
                <div className="w-14 h-14 rounded-full border border-lp-borderA bg-lp-surface flex items-center justify-center font-mono text-base text-lp-atext mx-auto mb-7 relative z-10">{step.num}</div>
                <div className="text-base font-semibold text-lp-text mb-2.5 tracking-tight">{step.title}</div>
                <div className="text-[13.5px] font-light text-lp-text2 leading-relaxed max-w-[260px] mx-auto">{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 03 - TERMINAL */}
      <hr className="border-0 border-t border-lp-border" />
      <section id="platform" className="py-24">
        <div className="max-w-[1120px] mx-auto px-7">
          <div className={`${rvBase} flex items-center gap-4 text-[10.5px] font-medium tracking-[0.16em] uppercase text-lp-text3 mb-10 after:content-[''] after:flex-1 after:h-px after:bg-lp-border`}>
            <span className="font-mono">03</span> Automation Engine
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-[5fr_7fr] gap-12 lg:gap-24 items-center">
            <div className={`${rvBase} ${rvDelays[1]}`}>
              <h2 className="font-sans text-[clamp(2.8rem,5.5vw,4.5rem)] leading-[1.06] tracking-tight text-lp-text mb-5">OpenClaw handles<br /><em className="italic text-lp-text/40">the repetitive.</em></h2>
              <p className="text-[16px] font-light text-lp-text2 max-w-[380px] leading-relaxed mb-7">
                OpenClaw is the automation layer beneath Student Hub. It synchronizes
                assignments, dispatches Telegram reminders, monitors attendance, and
                generates reports automatically, every session.
              </p>
              <p className="text-xs font-mono tracking-wider text-lp-text3">RUNS ON GOLANG · REST API · TELEGRAM GATEWAY</p>
            </div>
            <div className={`${rvBase} ${rvDelays[2]}`}>
              <div className="bg-lp-surface border border-lp-border rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-lp-border bg-lp-card">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" /><span className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" /><span className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
                  <span className="font-mono text-[11px] text-lp-text3 ml-2.5 tracking-wide">~ / openclaw / automation</span>
                </div>
                <div className="p-6 pb-7 font-mono text-[12.5px] font-light leading-loose">
                  <span className="block"><span className="text-lp-text3">$ </span><span className="text-lp-atext">openclaw run --session morning-sync</span></span>
                  <span className="block h-2" />
                  <span className="block"><span className="text-lp-green">✓ </span><span className="text-lp-text2">1000+ students notified via Telegram</span></span>
                  <span className="block"><span className="text-lp-green">✓ </span><span className="text-lp-text2">12 new assignments synced to feed</span></span>
                  <span className="block"><span className="text-lp-green">✓ </span><span className="text-lp-text2">Attendance QR codes generated (18 classes)</span></span>
                  <span className="block"><span className="text-lp-green">✓ </span><span className="text-lp-text2">UKT reminders dispatched (1000+ students)</span></span>
                  <span className="block"><span className="text-lp-green">✓ </span><span className="text-lp-text2">Daily digest compiled and sent</span></span>
                  <span className="block h-2" />
                  <span className="block text-lp-text3 my-1">───────────────────────────────</span>
                  <span className="block text-lp-text3 text-[11.5px]">completed in 0.84s · 0 errors · next run in 6h</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 04 - TELEGRAM PREVIEW */}
      <hr className="border-0 border-t border-lp-border" />
      <section className="py-24">
        <div className="max-w-[1120px] mx-auto px-7">
          <div className={`${rvBase} flex items-center gap-4 text-[10.5px] font-medium tracking-[0.16em] uppercase text-lp-text3 mb-10 after:content-[''] after:flex-1 after:h-px after:bg-lp-border`}>
            <span className="font-mono">04</span> Telegram Integration
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-[7fr_5fr] gap-12 lg:gap-24 items-center">
            <div className={`${rvBase} ${rvDelays[1]} order-2 lg:order-1`}>
              <div className="bg-lp-card border border-lp-border rounded-[24px] w-[310px] mx-auto overflow-hidden shadow-[0_24px_64px_rgba(0,0,0,0.4)]">
                <div className="bg-gradient-to-br from-[#1b9ad6] to-lp-tg pt-4 px-5 pb-3 flex items-center gap-3">
                  <span className="text-white/70 text-sm">←</span>
                  <div className="w-9 h-9 rounded-full bg-lp-surface/20 flex items-center justify-center text-sm">🎓</div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-white">Student Hub Bot</div>
                    <div className="text-[11px] text-white/70">online</div>
                  </div>
                </div>
                <div className="p-4 flex flex-col gap-2 bg-lp-surface min-h-[320px]">
                  <div className="max-w-[85%] p-3 rounded-2xl text-[12.5px] leading-relaxed bg-lp-accent/10 text-lp-text rounded-bl-sm self-start">
                    📅 <strong className="font-semibold">Reminder:</strong> "Pemrograman Web" starts in 30 minutes.<br />
                    📍 Room B-204 · Dosen: Pak Arief
                    <div className="text-[9px] text-lp-text3 mt-1 text-right font-mono">08:30</div>
                  </div>
                  <div className="max-w-[85%] p-3 rounded-2xl text-[12.5px] leading-relaxed bg-lp-accent/10 text-lp-text rounded-bl-sm self-start">
                    ⚠️ <strong className="font-semibold">Deadline Alert:</strong> Assignment "REST API Implementation" is due in 6 hours.<br />
                    📝 Submit via StudentHub portal.
                    <div className="text-[9px] text-lp-text3 mt-1 text-right font-mono">09:15</div>
                  </div>
                  <div className="max-w-[85%] p-3 rounded-2xl text-[12.5px] leading-relaxed bg-lp-accent/10 text-lp-text rounded-bl-sm self-start">
                    ✅ <strong className="font-semibold">Attendance Confirmed:</strong> "Basis Data" — Session 12/14.<br />
                    📊 Your attendance rate: 92%
                    <div className="text-[9px] text-lp-text3 mt-1 text-right font-mono">10:00</div>
                  </div>
                </div>
              </div>
            </div>
            <div className={`${rvBase} ${rvDelays[2]} order-1 lg:order-2`}>
              <h2 className="font-sans text-[clamp(2.8rem,5.5vw,4.5rem)] leading-[1.06] tracking-tight text-lp-text mb-5">Reminders<br /><em className="italic text-lp-text/40">where you are.</em></h2>
              <p className="text-[16px] font-light text-lp-text2 max-w-[380px] leading-relaxed mb-7">
                No need to open another app. Student Hub sends smart, 
                contextual reminders directly to your Telegram — classes, 
                deadlines, attendance confirmations, and daily digests.
              </p>
              <p className="text-xs font-mono tracking-wider text-lp-text3 mb-6">TELEGRAM BOT API · END-TO-END ENCRYPTED · INSTANT DELIVERY</p>
              <a href="#" className="inline-flex items-center gap-2 bg-lp-tg text-white font-sans text-[13px] font-semibold py-3 px-6 rounded-full transition-all hover:bg-[#1e96d3] hover:-translate-y-px">Connect Telegram ✈️</a>
            </div>
          </div>
        </div>
      </section>

      {/* 05 - BENEFITS */}
      <hr className="border-0 border-t border-lp-border" />
      <section className="py-24">
        <div className="max-w-[1120px] mx-auto px-7">
          <div className={`${rvBase} flex items-center gap-4 text-[10.5px] font-medium tracking-[0.16em] uppercase text-lp-text3 mb-10 after:content-[''] after:flex-1 after:h-px after:bg-lp-border`}>
            <span className="font-mono">05</span> Why Students Love It
          </div>
          <div className={`${rvBase} ${rvDelays[1]} text-center mb-14`}>
            <h2 className="font-sans text-[clamp(2.8rem,5.5vw,4.5rem)] leading-[1.06] tracking-tight text-lp-text max-w-[600px] mx-auto">Your unfair<br /><em className="italic text-lp-text/40">academic advantage.</em></h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {benefits.map((b, i) => (
              <div key={b.title} className={`${rvBase} ${rvDelays[i+1]} border border-lp-border rounded-2xl px-7 py-9 transition-all duration-300 hover:border-lp-borderA hover:bg-lp-accent/5`}>
                <span className="text-[32px] block mb-5">{b.icon}</span>
                <div className="text-lg font-semibold text-lp-text mb-2.5 tracking-tight">{b.title}</div>
                <div className="text-[13.5px] font-light text-lp-text2 leading-relaxed">{b.desc}</div>
                <span className="block font-mono text-[10px] text-lp-atext tracking-wider mt-4">{b.stat}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 06 - KURIKULUM */}
      <hr className="border-0 border-t border-lp-border" />
      <section id="kurikulum" className="py-24">
        <div className="max-w-[1120px] mx-auto px-7">
          <div className={`${rvBase} flex items-center gap-4 text-[10.5px] font-medium tracking-[0.16em] uppercase text-lp-text3 mb-10 after:content-[''] after:flex-1 after:h-px after:bg-lp-border`}>
            <span className="font-mono">06</span> Kurikulum
          </div>
          <div className={`${rvBase} ${rvDelays[1]} mb-10`}>
            <h2 className="font-sans text-[clamp(2.8rem,5.5vw,4.5rem)] leading-[1.06] tracking-tight text-lp-text mb-6">Program Studi</h2>
            <div className="flex gap-4 flex-wrap">
              {Object.keys(programs).map(k => (
                <button key={k} onClick={() => setActiveProg(k)} className={`px-5 py-2.5 rounded-full text-[13px] font-medium transition-all ${activeProg === k ? 'bg-lp-text text-lp-bg' : 'bg-lp-surface border border-lp-border text-lp-text2 hover:text-lp-text'}`}>
                  {programs[k].label}
                </button>
              ))}
            </div>
          </div>
          <div className={`${rvBase} ${rvDelays[2]} grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6`}>
            {semNumbers.map(sem => (
              <div key={sem} className="bg-lp-surface border border-lp-border rounded-xl p-5 transition-transform hover:-translate-y-1">
                <div className="text-[11px] font-mono tracking-widest text-lp-text3 mb-4 uppercase">Semester {sem}</div>
                <ul className="flex flex-col gap-2.5">
                  {prog.courses.filter(c => c.sem === sem).map((c, idx) => (
                    <li key={idx} className="text-[13px] font-light text-lp-text2 flex justify-between items-start gap-2">
                      <span className="leading-snug pt-0.5">{c.name}</span>
                      <span className="bg-lp-bg border border-lp-border text-[10px] px-1.5 py-0.5 rounded text-lp-text3 min-w-[24px] text-center flex-shrink-0">{c.sks}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 07 - VISI & MISI */}
      <hr className="border-0 border-t border-lp-border" />
      <section id="visi-misi" className="py-24 bg-lp-surface/50">
        <div className="max-w-[1120px] mx-auto px-7">
          <div className={`${rvBase} flex items-center gap-4 text-[10.5px] font-medium tracking-[0.16em] uppercase text-lp-text3 mb-10 after:content-[''] after:flex-1 after:h-px after:bg-lp-border`}>
            <span className="font-mono">07</span> Visi & Misi
          </div>
          <div className={`${rvBase} ${rvDelays[1]} mb-14 text-center`}>
            <h2 className="font-sans text-[clamp(2.5rem,5vw,4rem)] leading-[1.06] tracking-tight text-lp-text mb-6">{inst.fullName}</h2>
            <div className="flex justify-center gap-4 flex-wrap mb-10">
              {Object.keys(institutions).map(k => (
                <button key={k} onClick={() => setActiveInst(k)} className={`px-4 py-2 rounded-full text-[13px] font-medium transition-all ${activeInst === k ? 'bg-lp-text text-lp-bg' : 'bg-lp-surface border border-lp-border text-lp-text2 hover:text-lp-text'}`}>
                  {institutions[k].abbr}
                </button>
              ))}
            </div>
            <p className="text-[17px] font-light text-lp-text2 max-w-[700px] mx-auto leading-relaxed border-l-2 border-lp-accent/50 pl-6 italic text-left md:text-center md:border-l-0">
              "{inst.visi}"
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className={`${rvBase} ${rvDelays[2]} bg-lp-card border border-lp-border rounded-2xl p-8 transition-colors hover:border-lp-borderA`}>
              <h3 className="text-lg font-semibold mb-6 text-lp-text">Misi</h3>
              <ul className="flex flex-col gap-4">
                {inst.misi.map((m, i) => (
                  <li key={i} className="flex gap-4 text-[14.5px] font-light text-lp-text2 leading-relaxed">
                    <span className="text-lp-accent mt-1 flex-shrink-0">✦</span> {m}
                  </li>
                ))}
              </ul>
            </div>
            <div className={`${rvBase} ${rvDelays[3]} bg-lp-card border border-lp-border rounded-2xl p-8 transition-colors hover:border-lp-borderA`}>
              <h3 className="text-lg font-semibold mb-6 text-lp-text">Tujuan</h3>
              <ul className="flex flex-col gap-4">
                {inst.tujuan.map((t, i) => (
                  <li key={i} className="flex gap-4 text-[14.5px] font-light text-lp-text2 leading-relaxed">
                    <span className="text-lp-accent mt-1 flex-shrink-0">✦</span> {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 08 - KALENDER */}
      <hr className="border-0 border-t border-lp-border" />
      <section id="kalender" className="py-24">
        <div className="max-w-[1120px] mx-auto px-7">
          <div className={`${rvBase} flex items-center gap-4 text-[10.5px] font-medium tracking-[0.16em] uppercase text-lp-text3 mb-10 after:content-[''] after:flex-1 after:h-px after:bg-lp-border`}>
            <span className="font-mono">08</span> Kalender Akademik
          </div>
          <div className={`${rvBase} ${rvDelays[1]} mb-10`}>
             <h2 className="font-sans text-[clamp(2.8rem,5.5vw,4.5rem)] leading-[1.06] tracking-tight text-lp-text">Jadwal<br /><em className="italic text-lp-text/40">Kegiatan.</em></h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-[2.5fr_1fr] gap-10">
            <div className={`${rvBase} ${rvDelays[2]}`}>
              <div className="bg-lp-surface border border-lp-border rounded-2xl overflow-hidden">
                 {calendarMonths.map((m, i) => {
                   const eventsInMonth = academicCalendar.filter(ev => {
                      const d = new Date(ev.date)
                      return d.getFullYear() === m.year && d.getMonth() === m.month
                   })
                   if (eventsInMonth.length === 0) return null
                   return (
                     <div key={m.name} className="border-b border-lp-border last:border-0 p-6 md:p-8 hover:bg-lp-card transition-colors">
                        <div className="font-semibold text-[16px] mb-5 text-lp-text">{m.name}</div>
                        <div className="flex flex-col gap-4">
                           {eventsInMonth.map((ev, ei) => (
                              <div key={ei} className="flex gap-4 items-start">
                                 <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0 shadow-sm" style={{ backgroundColor: EVENT_COLORS[ev.type] }} />
                                 <div>
                                    <div className="text-[14px] font-medium text-lp-text mb-0.5">{ev.event}</div>
                                    <div className="text-[12.5px] text-lp-text2 font-light">
                                      {fmtDate(ev.date)} {ev.endDate && <span className="opacity-70">hingga {fmtDate(ev.endDate)}</span>}
                                    </div>
                                 </div>
                              </div>
                           ))}
                        </div>
                     </div>
                   )
                 })}
              </div>
            </div>
            <div className={`${rvBase} ${rvDelays[3]}`}>
              <div className="sticky top-28 bg-lp-card border border-lp-border rounded-2xl p-6">
                 <h3 className="font-semibold text-[14px] text-lp-text mb-5 tracking-tight">Keterangan</h3>
                 <div className="flex flex-col gap-3.5">
                    {Object.entries(EVENT_LABELS).map(([k, label]) => (
                       <div key={k} className="flex items-center gap-3.5 text-[13px] text-lp-text2">
                          <span className="w-3 h-3 rounded-[3px] shadow-sm flex-shrink-0" style={{ backgroundColor: EVENT_COLORS[k] }} />
                          {label}
                       </div>
                    ))}
                 </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 09 - PLATFORM FEATURES */}
      <hr className="border-0 border-t border-lp-border" />
      <section className="py-24">
        <div className="max-w-[1120px] mx-auto px-7">
          <div className={`${rvBase} flex items-center gap-4 text-[10.5px] font-medium tracking-[0.16em] uppercase text-lp-text3 mb-10 after:content-[''] after:flex-1 after:h-px after:bg-lp-border`}>
            <span className="font-mono">09</span> Platform Features
          </div>
          <div className={`${rvBase} ${rvDelays[1]}`}>
            <h2 className="font-sans text-[clamp(2.8rem,5.5vw,4.5rem)] leading-[1.06] tracking-tight text-lp-text max-w-[480px]">Everything your campus needs.<br /><em className="italic text-lp-text/40">Nothing it doesn't.</em></h2>
          </div>
          <div className={`${rvBase} ${rvDelays[2]} border-t border-lp-border mt-14`}>
            {platformFeatures.map(f => (
              <div key={f.name} className="grid grid-cols-1 sm:grid-cols-[1fr_1.4fr] gap-6 sm:gap-20 items-start py-7 border-b border-lp-border transition-colors hover:bg-lp-accent/5 hover:rounded-xl px-2">
                <div className="text-[15px] font-medium text-lp-text tracking-tight leading-snug">{f.name}</div>
                <div className="text-[13.5px] font-light text-lp-text2 leading-relaxed">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 14 - STATS */}
      <hr className="border-0 border-t border-lp-border" />
      <section className="py-24">
        <div className="max-w-[1120px] mx-auto px-7">
          <div className={`${rvBase} border border-lp-border rounded-[20px] overflow-hidden grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`}>
            {stats.map((s, i) => (
              <div key={s.n} className="p-10 lg:py-14 sm:border-r border-lp-border last:border-r-0 border-b lg:border-b-0 last:border-b-0">
                <span className="font-sans text-[4rem] font-normal text-lp-text leading-none tracking-tight block mb-2.5">{s.n}</span>
                <p className="text-[13px] font-light text-lp-text2 leading-relaxed max-w-[140px]">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <hr className="border-0 border-t border-lp-border" />
      <div className={`${rvBase} text-center pt-[118px] pb-[112px] px-6 relative overflow-hidden`}>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[640px] h-[360px] bg-[radial-gradient(ellipse_at_50%_100%,rgba(75,115,255,0.06),transparent_72%)] pointer-events-none" />
        <span className="text-[10.5px] font-mono text-lp-text3 tracking-[0.16em] uppercase mb-7 block">Student Hub · E-Learning Reminder Platform</span>
        <h2 className="font-sans text-[clamp(3.2rem,7vw,6rem)] font-normal tracking-[-0.04em] leading-[0.97] text-lp-text mb-6 relative">
          Start with your<br />campus <em className="italic text-lp-text/40">today.</em>
        </h2>
        <p className="text-base font-light text-lp-text2 max-w-[360px] mx-auto mb-12 leading-relaxed">
          Join institutions already running on Student Hub. Setup takes minutes, not months.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <button onClick={() => setIsLoginModalOpen(true)} className="inline-flex items-center gap-2 bg-lp-text text-lp-bg font-sans text-[14px] font-semibold py-[13px] px-7 rounded-full transition-all hover:bg-lp-atext hover:-translate-y-px">Enter Platform →</button>
          <a href="#" className="inline-flex items-center gap-2 bg-lp-tg text-white font-sans text-[14px] font-semibold py-[13px] px-7 rounded-full transition-all hover:bg-[#1e96d3] hover:-translate-y-px">Connect Telegram ✈️</a>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="border-t border-lp-border pt-16 pb-11">
        <div className="max-w-[1120px] mx-auto px-7">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[2.4fr_1fr_1fr_1fr] gap-10 lg:gap-16 mb-14">
            <div>
              <span className="text-[12.5px] font-semibold text-lp-text tracking-wide block mb-3.5">STUDENT HUB</span>
              <p className="text-[13.5px] font-light text-lp-text2 leading-relaxed max-w-[270px] mb-7">
                E-Learning Reminder Platform for the modern campus. Powered by OpenClaw automation 
                and Telegram integration. Built for institutions that take education seriously.
              </p>
              <div className="flex gap-4">
                <a href="#" className="text-lp-text2 hover:text-lp-text transition-colors text-xs">Twitter</a>
                <a href="#" className="text-lp-text2 hover:text-lp-text transition-colors text-xs">Instagram</a>
                <a href="#" className="text-lp-text2 hover:text-lp-text transition-colors text-xs">Telegram</a>
              </div>
            </div>
            {Object.entries(footerLinks).map(([col, links]) => (
              <div key={col}>
                <span className="text-[11px] font-medium text-lp-text tracking-wider uppercase block mb-5">{col}</span>
                <ul className="flex flex-col gap-3">
                  {links.map(l => (
                    <li key={l.label}>
                      {l.href === '/' ? (
                        <button onClick={() => setIsLoginModalOpen(true)} className="text-lp-text2 text-[13.5px] font-light transition-colors hover:text-lp-text block bg-transparent outline-none p-0 text-left cursor-pointer">{l.label}</button>
                      ) : (
                        <a href={l.href} className="text-lp-text2 text-[13.5px] font-light transition-colors hover:text-lp-text block cursor-pointer">{l.label}</a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-lp-border pt-7 flex flex-col sm:flex-row justify-between items-center gap-4">
            <span className="text-xs text-lp-text3 font-light">© {new Date().getFullYear()} Student Hub. All rights reserved.</span>
            <div className="flex gap-6">
              <a href="#" className="text-xs text-lp-text3 transition-colors hover:text-lp-text2">Privacy Policy</a>
              <a href="#" className="text-xs text-lp-text3 transition-colors hover:text-lp-text2">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
    </div>
  )
}