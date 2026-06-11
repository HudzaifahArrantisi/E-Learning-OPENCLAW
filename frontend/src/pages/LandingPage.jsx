import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  featureCards, howItWorks, benefits, roles, semesters, visiData, platformFeatures,
  stats, footerLinks, programs, institutions, academicCalendar, calendarMonths,
  EVENT_COLORS, EVENT_LABELS, getEventsForDate, fmtDate, dashboardFeed, roleGuides
} from '../data/landingData'
import LoginModal from '../components/LoginModal'
import AnimatedBeamSection from '../components/AnimatedBeamSection'
import TelegramAnimatedNotifications from '../components/TelegramAnimatedNotifications'
import { HighlighterDemo } from '../components/tulisan'
import useAuth from '../hooks/useAuth'

const ROLE_DASHBOARD = {
  admin: '/admin',
  dosen: '/dosen',
  mahasiswa: '/mahasiswa',
  orangtua: '/ortu',
  ukm: '/ukm',
  ormawa: '/ormawa',
}

export default function LandingPage() {
  const { user, logout, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const openClawRef = useRef(null)
  const terminalImgRef = useRef(null)
  const openClawAltRef = useRef(null)
  const openClawVisiRef = useRef(null)
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const profileMenuRef = useRef(null)
  const [showTutorial, setShowTutorial] = useState(false)
  const [activeRoleGuide, setActiveRoleGuide] = useState(0)

  // PWA & APK install states
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showInstallBtn, setShowInstallBtn] = useState(true)
  const [showIosPrompt, setShowIosPrompt] = useState(false)

  const dashboardHref = ROLE_DASHBOARD[user?.role] || '/'

  const handleCtaClick = () => {
    if (isAuthenticated) {
      navigate(dashboardHref)
    } else {
      setIsLoginModalOpen(true)
    }
  }

  const handleLogout = () => {
    logout()
    setShowProfileMenu(false)
    setIsMobileMenuOpen(false)
    navigate('/')
  }

  // Close profile dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setShowProfileMenu(false)
      }
    }
    if (showProfileMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showProfileMenu])

  const displayName = user?.name || user?.username || user?.email || user?.role || 'User'
  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase()

  useEffect(() => {
    const tutorialSeen = sessionStorage.getItem('tutorialSeen')
    if (!tutorialSeen) {
      setShowTutorial(true)
    }
  }, [])

  const closeTutorial = () => {
    sessionStorage.setItem('tutorialSeen', 'true')
    setShowTutorial(false)
  }

  // PWA Event Listener
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowInstallBtn(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Deteksi iOS Safari
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone
    
    if (isIos && !isStandalone) {
      setShowInstallBtn(true)
    }

    // Jika aplikasi sudah dalam mode standalone, sembunyikan tombol
    if (isStandalone) {
      setShowInstallBtn(false)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      console.log(`User response to PWA prompt: ${outcome}`)
      setDeferredPrompt(null)
      setShowInstallBtn(false)
    } else {
      const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
      if (isIos) {
        setShowIosPrompt(true)
      } else {
        // Fallback untuk Android/Desktop lain: unduh file APK langsung
        const link = document.createElement('a')
        link.href = '/student-hub.apk'
        link.download = 'student-hub.apk'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    }
  }
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

  useEffect(() => {
    const openClaw = openClawRef.current
    const openClawAlt = openClawAltRef.current
    const openClawVisi = openClawVisiRef.current
    if (!openClaw || !openClawAlt || !openClawVisi) return undefined

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let animationFrame = null
    let lastScrollY = window.scrollY

    const updateOpenClawPosition = () => {
      animationFrame = null

      const sections = [...document.querySelectorAll('section')]
      if (!sections.length) return

      const scrollFocus = window.scrollY + window.innerHeight * 0.5
      const sectionCenters = sections.map(section => (
        section.offsetTop + section.offsetHeight * 0.5
      ))
      const currentIndex = sectionCenters.findIndex(center => center >= scrollFocus)
      const nextIndex = currentIndex === -1 ? sections.length - 1 : currentIndex
      const previousIndex = Math.max(0, nextIndex - 1)
      const previousCenter = sectionCenters[previousIndex]
      const nextCenter = sectionCenters[nextIndex]
      const rawProgress = nextCenter === previousCenter
        ? 0
        : (scrollFocus - previousCenter) / (nextCenter - previousCenter)
      const progress = Math.min(1, Math.max(0, rawProgress))
      const easedProgress = progress * progress * (3 - 2 * progress)

      const mascotWidth = openClaw.offsetWidth
      const isMobile = window.innerWidth < 1024
      const edgeGap = isMobile ? 4 : Math.max(8, Math.min(18, window.innerWidth * 0.012))
      const leftX = edgeGap
      const rightX = window.innerWidth - mascotWidth - edgeGap
      const centerLeftX = isMobile
        ? leftX + mascotWidth * 0.35
        : Math.min(window.innerWidth * 0.2, leftX + mascotWidth * 0.55)
      const centerRightX = isMobile
        ? rightX - mascotWidth * 0.35
        : Math.max(window.innerWidth - mascotWidth - window.innerWidth * 0.2, rightX - mascotWidth * 0.55)
      const sectionPath = [
        { x: rightX, y: 0.28 },
        { x: leftX, y: 0.64 },
        { x: leftX, y: 0.25 },
        { x: leftX, y: 0.7 },
        { x: centerRightX, y: 0.42 },
        { x: rightX, y: 0.68 },
        { x: rightX, y: 0.24 },
        { x: centerLeftX, y: 0.5 },
      ]
      const getPathPoint = index => sectionPath[index % sectionPath.length]
      const getX = index => getPathPoint(index).x
      const getY = index => window.innerHeight * getPathPoint(index).y
      const getScale = index => (index === 0 ? (isMobile ? 1.05 : 1.2) : 1)

      const x = getX(previousIndex) + (getX(nextIndex) - getX(previousIndex)) * easedProgress
      const y = getY(previousIndex) + (getY(nextIndex) - getY(previousIndex)) * easedProgress
      const scrollDirection = window.scrollY >= lastScrollY ? 1 : -1
      const rotation = reducedMotion.matches ? 0 : Math.sin(progress * Math.PI) * 8 * scrollDirection
      const scale = getScale(previousIndex) + (getScale(nextIndex) - getScale(previousIndex)) * easedProgress
      const pageProgress = window.scrollY / Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
      const fadeOut = pageProgress > 0.94 ? Math.max(0, (1 - pageProgress) / 0.06) : 1
      const mascotOpacity = (reducedMotion.matches ? 0.5 : 0.82) * fadeOut
      const visiTarget = document.getElementById('visi-misi')
      const visiSection = visiTarget?.closest('section') || visiTarget
      const visiRect = visiSection?.getBoundingClientRect()
      const visiEnter = visiRect
        ? Math.min(1, Math.max(0, (window.innerHeight * 0.85 - visiRect.top) / (window.innerHeight * 0.35)))
        : 0
      const visiExit = visiRect
        ? Math.min(1, Math.max(0, (visiRect.bottom - window.innerHeight * 0.15) / (window.innerHeight * 0.35)))
        : 0
      const visiInfluence = Math.min(visiEnter, visiExit)
      const visiPageTop = visiRect ? window.scrollY + visiRect.top : document.documentElement.scrollHeight
      const companionTravel = Math.max(window.innerHeight, document.documentElement.scrollHeight - visiPageTop - window.innerHeight)
      const companionProgress = Math.min(1, Math.max(0, (scrollFocus - visiPageTop) / companionTravel))
      const isMascotSwitch = previousIndex === 2 && nextIndex === 3
      const exitProgress = Math.min(1, easedProgress * 2)
      const enterProgress = Math.max(0, easedProgress * 2 - 1)
      const offscreenRightX = window.innerWidth + mascotWidth * 0.35
      const exitX = x + (offscreenRightX - x) * exitProgress
      const enterTargetX = getX(nextIndex)
      const enterX = offscreenRightX + (enterTargetX - offscreenRightX) * enterProgress
      const exitRotation = rotation + exitProgress * 12
      const enterRotation = (1 - enterProgress) * -12 + rotation
      const defaultTransform = `translate3d(${x}px, ${y}px, 0) rotate(${rotation}deg) scale(${scale})`

      if (isMascotSwitch) {
        openClaw.style.transform = `translate3d(${exitX}px, ${y}px, 0) rotate(${exitRotation}deg) scale(${scale})`
        openClawAlt.style.transform = `translate3d(${enterX}px, ${y}px, 0) rotate(${enterRotation}deg) scale(${scale})`
        openClaw.style.opacity = String(mascotOpacity * Math.min(1, (1 - exitProgress) * 4))
        openClawAlt.style.opacity = String(mascotOpacity * Math.min(1, enterProgress * 4))
      } else {
        const showAltMascot = previousIndex >= 3 || nextIndex >= 3
        openClaw.style.transform = defaultTransform
        openClawAlt.style.transform = defaultTransform
        openClaw.style.opacity = String(showAltMascot ? 0 : mascotOpacity)
        openClawAlt.style.opacity = String(showAltMascot ? mascotOpacity : 0)
      }

      if (visiInfluence > 0) {
        const visiEase = visiInfluence * visiInfluence * (3 - 2 * visiInfluence)
        const visiY = window.innerHeight * (isMobile ? 0.7 : 0.46)
        const altX = x + (rightX - x) * visiEase
        const float = reducedMotion.matches ? 0 : Math.sin(visiInfluence * Math.PI) * 10

        openClaw.style.opacity = '0'
        openClawAlt.style.transform = `translate3d(${altX}px, ${visiY - float}px, 0) rotate(${4 * visiEase}deg) scale(${scale})`
        openClawAlt.style.opacity = String(mascotOpacity)
      }

      if (visiEnter > 0) {
        const companionPath = [
          { x: leftX, y: 0.46, rotation: 0, scale: 1 },
          { x: leftX, y: 0.7, rotation: -10, scale: 0.92 },
          { x: centerLeftX, y: 0.24, rotation: 8, scale: 1.06 },
          { x: rightX, y: 0.62, rotation: 14, scale: 0.9 },
          { x: centerLeftX, y: 0.38, rotation: -7, scale: 1.03 },
          { x: leftX, y: 0.68, rotation: -12, scale: 0.94 },
        ]
        const pathPosition = companionProgress * (companionPath.length - 1)
        const pathIndex = Math.min(companionPath.length - 2, Math.floor(pathPosition))
        const pathProgress = pathPosition - pathIndex
        const pathEase = pathProgress * pathProgress * (3 - 2 * pathProgress)
        const fromPoint = companionPath[pathIndex]
        const toPoint = companionPath[pathIndex + 1]
        const targetX = fromPoint.x + (toPoint.x - fromPoint.x) * pathEase
        const targetY = window.innerHeight * (fromPoint.y + (toPoint.y - fromPoint.y) * pathEase)
        const targetRotation = fromPoint.rotation + (toPoint.rotation - fromPoint.rotation) * pathEase
        const targetScale = fromPoint.scale + (toPoint.scale - fromPoint.scale) * pathEase
        const entryEase = visiEnter * visiEnter * (3 - 2 * visiEnter)
        const companionX = -mascotWidth * 1.2 + (targetX + mascotWidth * 1.2) * entryEase
        const companionFloat = reducedMotion.matches ? 0 : Math.sin(companionProgress * Math.PI * 8) * (isMobile ? 7 : 12)
        const companionOpacity = reducedMotion.matches ? 0.5 : 0.82

        openClawVisi.style.transform = `translate3d(${companionX}px, ${targetY + companionFloat}px, 0) rotate(${targetRotation}deg) scale(${targetScale})`
        openClawVisi.style.opacity = String(companionOpacity * Math.min(1, entryEase * 3))
      } else {
        openClawVisi.style.opacity = '0'
      }

      const ctaRect = document.getElementById('landing-cta')?.getBoundingClientRect()
      const ctaInfluence = ctaRect
        ? Math.min(1, Math.max(0, (window.innerHeight * 0.9 - ctaRect.top) / (window.innerHeight * 0.45)))
        : 0

      if (ctaInfluence > 0) {
        const ctaEase = ctaInfluence * ctaInfluence * (3 - 2 * ctaInfluence)
        const ctaY = window.innerHeight * (isMobile ? 0.72 : 0.5)
        const ctaFloat = reducedMotion.matches ? 0 : Math.sin(ctaInfluence * Math.PI * 3) * (isMobile ? 5 : 9)
        const leftTarget = leftX
        const rightTarget = rightX
        const lobsterX = x + (leftTarget - x) * ctaEase
        const altX = x + (rightTarget - x) * ctaEase

        openClaw.style.opacity = '0'
        openClawVisi.style.transform = `translate3d(${lobsterX}px, ${ctaY + ctaFloat}px, 0) rotate(${-8 * ctaEase}deg) scale(${0.96 + ctaEase * 0.04})`
        openClawAlt.style.transform = `translate3d(${altX}px, ${ctaY - ctaFloat}px, 0) rotate(${8 * ctaEase}deg) scale(${0.96 + ctaEase * 0.04})`
        openClawVisi.style.opacity = String((reducedMotion.matches ? 0.5 : 0.82) * ctaEase)
        openClawAlt.style.opacity = String((reducedMotion.matches ? 0.5 : 0.82) * ctaEase)
      }
      lastScrollY = window.scrollY
    }

    const scheduleUpdate = () => {
      if (animationFrame === null) {
        animationFrame = window.requestAnimationFrame(updateOpenClawPosition)
      }
    }

    updateOpenClawPosition()
    window.addEventListener('scroll', scheduleUpdate, { passive: true })
    window.addEventListener('resize', scheduleUpdate)
    reducedMotion.addEventListener('change', scheduleUpdate)

    return () => {
      window.removeEventListener('scroll', scheduleUpdate)
      window.removeEventListener('resize', scheduleUpdate)
      reducedMotion.removeEventListener('change', scheduleUpdate)
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame)
    }
  }, [])

  /* Scroll-driven wobble for the 3D terminal image in Automation Engine section */
  useEffect(() => {
    const img = terminalImgRef.current
    if (!img) return undefined

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (reducedMotion.matches) return undefined

    let raf = null
    let prevScrollY = window.scrollY

    const wobble = () => {
      raf = null
      const rect = img.getBoundingClientRect()
      const vh = window.innerHeight
      // How far the element center is from viewport center (–1 … 1)
      const centerOffset = (rect.top + rect.height / 2 - vh / 2) / (vh / 2)
      // Scroll velocity for dynamic tilt
      const delta = window.scrollY - prevScrollY
      prevScrollY = window.scrollY

      const rotate = Math.sin(window.scrollY * 0.004) * 2.5   // gentle rotation
      const translateY = Math.sin(window.scrollY * 0.006) * 5  // subtle bob
      const velocityTilt = Math.max(-3, Math.min(3, delta * 0.2)) // reactive tilt

      img.style.transform = `translateY(${translateY}px) rotate(${rotate + velocityTilt}deg)`
    }

    const onScroll = () => {
      if (raf === null) raf = requestAnimationFrame(wobble)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    wobble() // initialize

    return () => {
      window.removeEventListener('scroll', onScroll)
      if (raf !== null) cancelAnimationFrame(raf)
    }
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

      {/* Scroll-driven OpenClaw mascot that travels between page sections. */}
      <img
        ref={openClawRef}
        src="/claw1.webp"
        alt=""
        aria-hidden="true"
        draggable="false"
        className="fixed top-0 left-0 z-[5] block w-[clamp(64px,20vw,96px)] origin-center select-none pointer-events-none mix-blend-multiply drop-shadow-[0_8px_14px_rgba(15,23,42,0.16)] will-change-transform lg:w-[clamp(112px,10vw,164px)] lg:drop-shadow-[0_14px_24px_rgba(15,23,42,0.18)]"
      />
      <img
        ref={openClawAltRef}
        src="/claw2.webp"
        alt=""
        aria-hidden="true"
        draggable="false"
        className="fixed top-0 left-0 z-[5] block w-[clamp(64px,20vw,96px)] origin-center select-none pointer-events-none mix-blend-multiply drop-shadow-[0_8px_14px_rgba(15,23,42,0.16)] will-change-transform lg:w-[clamp(112px,10vw,164px)] lg:drop-shadow-[0_14px_24px_rgba(15,23,42,0.18)]"
      />
      <img
        ref={openClawVisiRef}
        src="/claw1.webp"
        alt=""
        aria-hidden="true"
        draggable="false"
        className="fixed top-0 left-0 z-[5] block w-[clamp(64px,20vw,96px)] origin-center select-none pointer-events-none mix-blend-multiply drop-shadow-[0_8px_14px_rgba(15,23,42,0.16)] will-change-transform lg:w-[clamp(112px,10vw,164px)] lg:drop-shadow-[0_14px_24px_rgba(15,23,42,0.18)]"
      />

      {/* HEADER / NAV */}
      <div className="fixed top-5 left-0 right-0 z-50 flex justify-center px-4 sm:px-5 pointer-events-none">
        <div className={`pointer-events-auto transition-all duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] relative ${isMobileMenuOpen ? 'w-full sm:w-max' : 'w-max max-w-full'}`}>
          <nav className="flex items-center justify-between bg-white/80 backdrop-blur-md border border-black/10 rounded-full py-1 px-1.5 pl-4 sm:pl-5 whitespace-nowrap gap-0.5 shadow-[0_8px_32px_rgba(0,0,0,0.06)]">
            <span className="text-[11.5px] font-bold text-lp-text tracking-[0.07em] mr-2.5 sm:mr-4">STUDENT-HUB</span>
            
            <div className="hidden sm:flex items-center gap-0.5">
              <a href="#platform" className="text-lp-text2 text-[12.5px] px-4 py-2 rounded-full transition-all hover:text-lp-text hover:bg-black/5">Platform</a>
              <a href="#kurikulum" className="text-lp-text2 text-[12.5px] px-4 py-2 rounded-full transition-all hover:text-lp-text hover:bg-black/5">Kurikulum</a>
              <a href="#panduan" className="text-lp-text2 text-[12.5px] px-4 py-2 rounded-full transition-all hover:text-lp-text hover:bg-black/5">Panduan</a>
              <a href="#visi-misi" className="text-lp-text2 text-[12.5px] px-4 py-2 rounded-full transition-all hover:text-lp-text hover:bg-black/5">Visi Misi</a>
              <a href="#kalender" className="text-lp-text2 text-[12.5px] px-4 py-2 rounded-full transition-all hover:text-lp-text hover:bg-black/5">Kalender</a>
            </div>

            <div className="flex items-center gap-1.5 ml-auto pl-2 sm:pl-0">
              {isAuthenticated ? (
                <div className="relative hidden sm:block" ref={profileMenuRef}>
                  <button
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-full transition-all hover:bg-black/5"
                  >
                    <span className="w-7 h-7 rounded-full bg-lp-accent text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                      {initials}
                    </span>
                    <span className="text-[12px] font-semibold text-lp-text truncate max-w-[100px]">
                      {displayName}
                    </span>
                    <svg className={`w-3 h-3 text-lp-text3 transition-transform duration-200 ${showProfileMenu ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showProfileMenu && (
                    <div className="absolute right-0 top-[calc(100%+8px)] w-48 bg-white/95 backdrop-blur-xl border border-black/10 rounded-2xl shadow-[0_16px_40px_rgba(0,0,0,0.12)] overflow-hidden z-[60]">
                      <div className="px-4 py-3 border-b border-lp-border">
                        <p className="text-[12px] font-semibold text-lp-text truncate">{displayName}</p>
                        <p className="text-[10px] text-lp-text3 capitalize">{user?.role || ''}</p>
                      </div>
                      <div className="p-1.5">
                        <Link
                          to={dashboardHref}
                          onClick={() => setShowProfileMenu(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12.5px] font-medium text-lp-text2 hover:text-lp-text hover:bg-black/5 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                          </svg>
                          Dashboard
                        </Link>
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12.5px] font-medium text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button onClick={() => setIsLoginModalOpen(true)} className="hidden sm:block bg-lp-text text-lp-bg text-[12px] sm:text-[12.5px] font-semibold px-4 sm:px-5 py-2 rounded-full transition-all hover:bg-lp-atext tracking-[0.01em]">Masuk</button>
              )}
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

          <div className={`sm:hidden absolute top-[calc(100%+8px)] left-0 right-0 bg-white/95 backdrop-blur-xl border border-black/10 rounded-[20px] shadow-[0_24px_48px_rgba(0,0,0,0.1)] transition-all duration-500 ease-in-out origin-top overflow-hidden ${isMobileMenuOpen ? 'max-h-[500px] opacity-100 translate-y-0' : 'max-h-0 opacity-0 -translate-y-4 pointer-events-none'}`}>
            <div className="flex flex-col gap-1 p-2">
              <a href="#platform" onClick={() => setIsMobileMenuOpen(false)} className="px-4 py-3 text-[13.5px] font-medium text-lp-text2 hover:text-lp-text hover:bg-black/5 rounded-xl transition-colors">Platform</a>
              <a href="#kurikulum" onClick={() => setIsMobileMenuOpen(false)} className="px-4 py-3 text-[13.5px] font-medium text-lp-text2 hover:text-lp-text hover:bg-black/5 rounded-xl transition-colors">Kurikulum</a>
              <a href="#panduan" onClick={() => setIsMobileMenuOpen(false)} className="px-4 py-3 text-[13.5px] font-medium text-lp-text2 hover:text-lp-text hover:bg-black/5 rounded-xl transition-colors">Panduan</a>
              <a href="#visi-misi" onClick={() => setIsMobileMenuOpen(false)} className="px-4 py-3 text-[13.5px] font-medium text-lp-text2 hover:text-lp-text hover:bg-black/5 rounded-xl transition-colors">Visi Misi</a>
              <a href="#kalender" onClick={() => setIsMobileMenuOpen(false)} className="px-4 py-3 text-[13.5px] font-medium text-lp-text2 hover:text-lp-text hover:bg-black/5 rounded-xl transition-colors">Kalender</a>
              <div className="h-px bg-black/5 mx-2 my-1" />
              {isAuthenticated ? (
                <>
                  <Link to={dashboardHref} onClick={() => setIsMobileMenuOpen(false)} className="px-4 py-3 text-[13.5px] font-semibold text-lp-accent hover:bg-lp-accent/5 rounded-xl transition-colors">Dashboard</Link>
                  <button onClick={handleLogout} className="px-4 py-3 text-[13.5px] font-semibold text-red-500 hover:bg-red-50 rounded-xl transition-colors text-left w-full">Logout</button>
                </>
              ) : (
                <button onClick={() => { setIsMobileMenuOpen(false); setIsLoginModalOpen(true) }} className="px-4 py-3 text-[13.5px] font-semibold text-lp-accent hover:bg-lp-accent/5 rounded-xl transition-colors text-left w-full">Masuk</button>
              )}
            </div>
          </div>
        </div>
      </div>

      <section className="relative min-h-screen flex items-end pb-44 overflow-hidden">
        <div className="absolute left-0 right-0 h-[160px] animate-scanAnim bg-[linear-gradient(180deg,transparent,rgba(75,115,255,0.03)_35%,rgba(75,115,255,0.06)_50%,rgba(75,115,255,0.03)_65%,transparent)] pointer-events-none" />
        <div className="relative z-10 w-full max-w-[1120px] mx-auto px-7">
          <h1 className="font-sans text-[clamp(3.8rem,7.4vw,6.6rem)] font-normal leading-[0.96] tracking-[-0.035em] text-lp-text mb-8 animate-slideUp delay-300 fill-mode-both">
            Student Hub<br />
            <em className="italic text-lp-text/40">Openlcaw Reminder</em>
          </h1>
      
          <div className="mb-10">
            <HighlighterDemo />
          </div>
          <div className="flex items-center gap-4 flex-wrap animate-slideUp delay-[650ms] fill-mode-both">
            <button onClick={handleCtaClick} className="inline-flex items-center gap-2 bg-lp-text text-lp-bg font-sans text-[13px] font-semibold py-3 px-6 rounded-full transition-all hover:bg-lp-atext hover:-translate-y-px">{isAuthenticated ? 'Go to Dashboard →' : 'Start Learning →'}</button>
            
            {showInstallBtn && (
              <button 
                onClick={handleInstallClick} 
                className="inline-flex items-center gap-2 bg-lp-accent text-white font-sans text-[13px] font-semibold py-3 px-6 rounded-full transition-all hover:bg-lp-accent/90 hover:-translate-y-px shadow-sm"
              >
                <i className="fa-brands fa-android"></i> Instal Aplikasi
              </button>
            )}

          
          </div>
        </div>
      </section>

      <AnimatedBeamSection />
      
            {/* 03 - PANDUAN AKSES (ROLE GUIDES) */}
      <section id="panduan" className="py-24 bg-lp-surface/30">
        <div className="max-w-[1120px] mx-auto px-7">
          <div className={`${rvBase} flex items-center gap-4 text-[10.5px] font-medium tracking-[0.16em] uppercase text-lp-text3 mb-10 after:content-[''] after:flex-1 after:h-px after:bg-lp-border`}>
            <span className="font-mono">01</span> Role Guides
          </div>
          <div className={`${rvBase} ${rvDelays[1]} text-center mb-14`}>
            <h2 className="font-sans text-[clamp(2.5rem,5vw,4rem)] leading-[1.06] tracking-tight text-lp-text max-w-[700px] mx-auto">Satu Platform untuk<br /><em className="italic text-lp-text/40">Semua Kebutuhan.</em></h2>
            <p className="text-[14px] font-light text-lp-text2 max-w-[400px] mx-auto mt-6">
              Pilih peran Anda untuk melihat bagaimana Student Hub mempermudah kehidupan akademik Anda sehari-hari.
            </p>
          </div>
          
          <div className={`${rvBase} ${rvDelays[2]} grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-8 lg:gap-16`}>
            {/* Role Selector */}
            <div className="flex flex-col gap-3">
              {roleGuides.map((role, idx) => (
                <button
                  key={role.id}
                  onClick={() => setActiveRoleGuide(idx)}
                  className={`flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 text-left border ${
                    activeRoleGuide === idx 
                      ? 'bg-white border-lp-borderA shadow-[0_8px_30px_rgba(0,0,0,0.06)] scale-[1.02]' 
                      : 'bg-lp-surface border-lp-border hover:bg-white/60 hover:border-lp-borderA/50'
                  }`}
                >
                  <div className="w-12 h-12 flex items-center justify-center text-2xl shrink-0">
                    {role.icon}
                  </div>
                  <div>
                    <h3 className={`text-[15px] font-bold tracking-tight mb-1 ${activeRoleGuide === idx ? 'text-lp-text' : 'text-lp-text2'}`}>
                      {role.title}
                    </h3>
                    <p className="text-[11.5px] text-lp-text3 font-light leading-relaxed line-clamp-1">
                      Lihat panduan lengkap {role.id}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            {/* Role Content */}
            <div className="bg-white border border-lp-border rounded-[24px] p-6 sm:p-10 shadow-[0_20px_60px_rgba(0,0,0,0.04)] relative overflow-hidden">
              {/* Decorative Blur */}
              <div className={`absolute -top-20 -right-20 w-64 h-64 rounded-full blur-[80px] opacity-10 bg-gradient-to-br ${roleGuides[activeRoleGuide].color} pointer-events-none transition-colors duration-700`}></div>
              
              <div className="flex items-center gap-4 mb-8 relative z-10">
                <div className="w-14 h-14 flex items-center justify-center text-3xl shrink-0">
                  {roleGuides[activeRoleGuide].icon}
                </div>
                <div>
                  <h3 className="text-[22px] font-bold text-lp-text tracking-tight leading-tight">
                    {roleGuides[activeRoleGuide].title}
                  </h3>
                  <p className="text-[13px] text-lp-text2 font-light mt-1">Langkah-langkah penggunaan sistem</p>
                </div>
              </div>

              <div className="space-y-6 relative z-10">
                <div className="absolute left-[27px] top-4 bottom-4 w-[2px] bg-lp-surface hidden sm:block"></div>
                {roleGuides[activeRoleGuide].steps.map((step, idx) => (
                  <div key={idx} className="flex gap-4 sm:gap-6 relative group">
                    <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-lp-surface border-2 border-white shadow-sm flex items-center justify-center text-[12px] sm:text-[14px] font-mono font-bold text-lp-text2 shrink-0 group-hover:bg-lp-text group-hover:text-white transition-colors relative z-10">
                      {step.num}
                    </div>
                    <div className="pt-0.5 sm:pt-2 pb-2">
                      <h4 className="text-[15px] font-bold text-lp-text mb-1.5 tracking-tight group-hover:text-lp-accent transition-colors">
                        {step.title}
                      </h4>
                      <p className="text-[13.5px] text-lp-text2 leading-relaxed font-light">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 02 - Platform / Automation Engine */}
      <section id="platform" className="py-24">
        <div className="max-w-[1120px] mx-auto px-7">
          <div className={`${rvBase} flex items-center gap-4 text-[10.5px] font-medium tracking-[0.16em] uppercase text-lp-text3 mb-10 after:content-[''] after:flex-1 after:h-px after:bg-lp-border`}>
            <span className="font-mono">02</span> Automation Engine
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-[5fr_7fr] gap-12 lg:gap-24 items-center">
            <div className={`${rvBase} ${rvDelays[1]}`}>
              <h2 className="font-sans text-[clamp(2.8rem,5.5vw,4.5rem)] leading-[1.06] tracking-tight text-lp-text mb-5">OpenClaw handles<br /><em className="italic text-lp-text/40">the repetitive.</em></h2>
              <p className="text-[16px] font-light text-lp-text2 max-w-[380px] leading-relaxed mb-7">
                OpenClaw is the automation layer beneath Student Hub. It synchronizes
                assignments, dispatches Telegram reminders, monitors attendance, and
                generates reports automatically, every session.
              </p>
            </div>
            <div className={`${rvBase} ${rvDelays[2]} flex items-center justify-center`}>
              <img
                ref={terminalImgRef}
                src="/chat 3d.webp"
                alt="OpenClaw Automation Terminal"
                draggable="false"
                className="w-full max-w-[560px] select-none"
                style={{ transform: 'translateZ(0)', backfaceVisibility: 'hidden' }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* 03 - TELEGRAM PREVIEW */}
      <section className="py-24">
        <div className="max-w-[1120px] mx-auto px-7">
          <div className={`${rvBase} flex items-center gap-4 text-[10.5px] font-medium tracking-[0.16em] uppercase text-lp-text3 mb-10 after:content-[''] after:flex-1 after:h-px after:bg-lp-border`}>
            <span className="font-mono">03</span> Telegram Integration
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
                <TelegramAnimatedNotifications />
                <div className="flex items-center gap-2 border-t border-lp-border bg-lp-card px-3 py-2.5">
                  <button type="button" aria-label="Attach file" className="grid size-8 place-items-center rounded-full text-lp-text3 transition-colors hover:bg-lp-surface hover:text-lp-tg">
                    <span className="text-base leading-none">＋</span>
                  </button>
                  <div className="flex h-8 flex-1 items-center rounded-full border border-lp-border bg-lp-surface px-3 text-[10px] text-lp-text3">
                    Notifications are sent automatically
                  </div>
                  <span className="grid size-8 place-items-center rounded-full bg-lp-tg text-[12px] text-white shadow-[0_4px_12px_rgba(38,165,228,0.28)]">➤</span>
                </div>
              </div>
            </div>
            <div className={`${rvBase} ${rvDelays[2]} order-1 lg:order-2`}>
              <h2 className="font-sans text-[clamp(2.8rem,5.5vw,4.5rem)] leading-[1.06] tracking-tight text-lp-text mb-5">Reminders<br /><em className="italic text-lp-text/40">where you are.</em></h2>
              <p className="text-[16px] font-light text-lp-text2 max-w-[380px] leading-relaxed mb-7">
                No need to open another app. Student Hub sends smart, 
                contextual reminders directly to your Telegram  classes, 
                deadlines, attendance confirmations, and daily digests.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 04 - KURIKULUM */}
      <section id="kurikulum" className="py-24">
        <div className="max-w-[1120px] mx-auto px-7">
          <div className={`${rvBase} flex items-center gap-4 text-[10.5px] font-medium tracking-[0.16em] uppercase text-lp-text3 mb-10 after:content-[''] after:flex-1 after:h-px after:bg-lp-border`}>
            <span className="font-mono">04</span> Kurikulum
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

      {/* 05 - VISI & MISI */}
      <section id="visi-misi" className="py-24 bg-lp-surface/50">
        <div className="max-w-[1120px] mx-auto px-7">
          <div className={`${rvBase} flex items-center gap-4 text-[10.5px] font-medium tracking-[0.16em] uppercase text-lp-text3 mb-10 after:content-[''] after:flex-1 after:h-px after:bg-lp-border`}>
            <span className="font-mono">05</span> Visi & Misi
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

      {/* 06 - KALENDER */}
      <section id="kalender" className="py-24">
        <div className="max-w-[1120px] mx-auto px-7">
          <div className={`${rvBase} flex items-center gap-4 text-[10.5px] font-medium tracking-[0.16em] uppercase text-lp-text3 mb-10 after:content-[''] after:flex-1 after:h-px after:bg-lp-border`}>
            <span className="font-mono">06</span> Kalender Akademik
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



      {/* 14 - STATS */}
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
      <div id="landing-cta" className={`${rvBase} text-center pt-[118px] pb-[112px] px-6 relative overflow-hidden`}>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[640px] h-[360px] bg-[radial-gradient(ellipse_at_50%_100%,rgba(75,115,255,0.06),transparent_72%)] pointer-events-none" />
        <span className="text-[10.5px] font-mono text-lp-text3 tracking-[0.16em] uppercase mb-7 block">Student Hub · E-Learning Reminder Platform</span>
        <h2 className="font-sans text-[clamp(3.2rem,7vw,6rem)] font-normal tracking-[-0.04em] leading-[0.97] text-lp-text mb-6 relative">
          Start with your<br />campus <em className="italic text-lp-text/40">today.</em>
        </h2>
        <p className="text-base font-light text-lp-text2 max-w-[360px] mx-auto mb-12 leading-relaxed">
          Join institutions already running on Student Hub. Setup takes minutes, not months.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <button onClick={handleCtaClick} className="inline-flex items-center gap-2 bg-lp-text text-lp-bg font-sans text-[14px] font-semibold py-[13px] px-7 rounded-full transition-all hover:bg-lp-atext hover:-translate-y-px">{isAuthenticated ? 'Go to Dashboard →' : 'Enter Platform →'}</button>
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

      {/* TUTORIAL MODAL - Simplified & Smaller */}
      {showTutorial && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-lp-surface/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-lp-border rounded-[24px] max-w-[400px] w-full shadow-[0_24px_60px_rgba(0,0,0,0.1)] relative transform transition-all animate-slideUp">
            
            {/* Simple Close Button */}
            <button 
              onClick={closeTutorial}
              className="absolute top-4 right-4 text-lp-text3 hover:text-lp-text transition-all p-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <div className="p-6 sm:p-8">
              <div className="mb-6">
                <h3 className="text-[18px] font-bold text-lp-text mb-2 tracking-tight">Panduan Cepat</h3>
                <p className="text-[12.5px] text-lp-text2 font-light leading-relaxed">
                  Gunakan akun berikut untuk mengakses dashboard mahasiswa:
                </p>
              </div>
              
              <div className="space-y-4 mb-7">
                <div className="p-4 bg-lp-bg border border-lp-border rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-lp-accent" />
                    <span className="text-[11px] font-bold text-lp-text uppercase tracking-wider">Login Mahasiswa</span>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[12px] text-lp-text2 font-light">
                      Email: <code className="bg-lp-accent/5 text-lp-accent px-1 rounded font-mono">nim@nurulfikri.ac.id</code>
                    </p>
                    <p className="text-[12px] text-lp-text2 font-light">
                      Sandi: <code className="bg-black/5 px-1 rounded font-mono">password</code>
                    </p>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={closeTutorial}
                className="w-full bg-lp-text text-lp-bg text-[13px] font-bold py-3 rounded-xl hover:bg-lp-atext transition-all flex items-center justify-center gap-2"
              >
                Mengerti
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* iOS PWA PROMPT MODAL */}
      {showIosPrompt && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-lp-surface/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-lp-border rounded-[24px] max-w-[400px] w-full shadow-[0_24px_60px_rgba(0,0,0,0.1)] relative transform transition-all animate-slideUp">
            
            <button 
              onClick={() => setShowIosPrompt(false)}
              className="absolute top-4 right-4 text-lp-text3 hover:text-lp-text transition-all p-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <div className="p-6 sm:p-8 text-center">
              <div className="mb-6">
                <div className="w-16 h-16 rounded-full bg-lp-accent/10 text-lp-accent flex items-center justify-center text-3xl mx-auto mb-4">
                  
                </div>
                <h3 className="text-[18px] font-bold text-lp-text mb-2 tracking-tight">Instal di iOS (Safari)</h3>
                <p className="text-[12.5px] text-lp-text2 font-light leading-relaxed">
                  Ikuti langkah mudah ini untuk menginstal **Student Hub** di iPhone atau iPad Anda:
                </p>
              </div>
              
              <div className="space-y-4 mb-7 text-left">
                <div className="flex gap-4 items-start">
                  <div className="w-7 h-7 rounded-full bg-lp-surface border border-lp-border flex items-center justify-center text-[12px] font-bold text-lp-text2 shrink-0">1</div>
                  <p className="text-[13px] text-lp-text2 font-light pt-0.5">
                    Ketuk tombol **Share** di Safari (ikon kotak dengan panah ke atas di bagian bawah layar).
                  </p>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="w-7 h-7 rounded-full bg-lp-surface border border-lp-border flex items-center justify-center text-[12px] font-bold text-lp-text2 shrink-0">2</div>
                  <p className="text-[13px] text-lp-text2 font-light pt-0.5">
                    Gulir ke bawah dan ketuk pilihan **Add to Home Screen** (Tambahkan ke Layar Utama).
                  </p>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="w-7 h-7 rounded-full bg-lp-surface border border-lp-border flex items-center justify-center text-[12px] font-bold text-lp-text2 shrink-0">3</div>
                  <p className="text-[13px] text-lp-text2 font-light pt-0.5">
                    Ketuk **Add** (Tambah) di pojok kanan atas untuk konfirmasi.
                  </p>
                </div>
              </div>
              
              <button 
                onClick={() => setShowIosPrompt(false)}
                className="w-full bg-lp-text text-lp-bg text-[13px] font-bold py-3 rounded-xl hover:bg-lp-atext transition-all flex items-center justify-center"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
