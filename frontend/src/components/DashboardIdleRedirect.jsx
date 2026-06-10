import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import useAuth from '../hooks/useAuth'

const IDLE_TIMEOUT_MS = 30 * 60 * 1000
const LAST_ACTIVITY_KEY = 'dashboardLastActivityAt'
const DASHBOARD_ROOTS = ['/mahasiswa', '/dosen', '/admin', '/ortu', '/ukm', '/ormawa']
const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'scroll', 'touchstart']

const isDashboardPath = (pathname) => (
  DASHBOARD_ROOTS.some(root => pathname === root || pathname.startsWith(`${root}/`))
)

export default function DashboardIdleRedirect() {
  const { isAuthenticated } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const lastRecordedActivity = useRef(0)

  useEffect(() => {
    if (!isAuthenticated || !isDashboardPath(location.pathname)) return undefined

    const redirectIfIdle = () => {
      const lastActivity = Number(localStorage.getItem(LAST_ACTIVITY_KEY))
      if (lastActivity && Date.now() - lastActivity >= IDLE_TIMEOUT_MS) {
        navigate('/', { replace: true })
        return true
      }
      return false
    }

    if (redirectIfIdle()) return undefined

    const recordActivity = () => {
      const now = Date.now()
      if (now - lastRecordedActivity.current < 1000) return

      lastRecordedActivity.current = now
      localStorage.setItem(LAST_ACTIVITY_KEY, String(now))
    }

    recordActivity()
    const interval = window.setInterval(redirectIfIdle, 15000)
    ACTIVITY_EVENTS.forEach(event => window.addEventListener(event, recordActivity, { passive: true }))

    return () => {
      window.clearInterval(interval)
      ACTIVITY_EVENTS.forEach(event => window.removeEventListener(event, recordActivity))
    }
  }, [isAuthenticated, location.pathname, navigate])

  return null
}
