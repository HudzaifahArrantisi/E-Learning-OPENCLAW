import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
// eslint-disable-next-line no-unused-vars
import { AnimatePresence, motion } from 'framer-motion'
import useAuth from '../hooks/useAuth'
import useProfile from '../hooks/useProfile'
import { resolveBackendAssetUrl } from '../utils/assetUrl'

const ROLE_DASHBOARD = {
  admin: '/admin',
  dosen: '/dosen',
  mahasiswa: '/mahasiswa',
  orangtua: '/ortu',
  ukm: '/ukm',
  ormawa: '/ormawa',
}

const PillNav = ({
  logo,
  logoAlt = 'Logo',
  items = [],
  activeHref = '/',
  user,
  dashboardHref,
  onLogout,
  onLoginClick,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const dropdownRef = useRef(null)
  const navRef = useRef(null)
  const navigate = useNavigate()

  const auth = useAuth()
  const currentUser = user || auth.user
  const currentDashboardHref = dashboardHref || ROLE_DASHBOARD[currentUser?.role] || '/'

  // Fetch profile if user is logged in
  const { data: profile } = useProfile()
  const profilePhoto = profile?.profile_picture || profile?.photo || currentUser?.profile_picture || currentUser?.photo || ''

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setDropdownOpen(false)
        setIsMobileMenuOpen(false)
      }
    }
    if (dropdownOpen || isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [dropdownOpen, isMobileMenuOpen])

  const displayName = currentUser?.name || currentUser?.username || currentUser?.email || currentUser?.role || 'User'
  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase()

  const filteredItems = items.filter(item => {
    const isLoginLink = item.label?.toLowerCase() === 'login' || item.label?.toLowerCase() === 'masuk'
    if (isLoginLink && currentUser) {
      return false
    }
    return true
  })

  return (
    <div className="fixed top-5 left-0 right-0 z-50 flex justify-center px-4 sm:px-5 pointer-events-none" ref={navRef}>
      <div className="pointer-events-auto w-full max-w-[480px] sm:w-max relative transition-all duration-300">
        <nav className="w-full sm:w-auto flex items-center justify-between bg-lp-surface/80 backdrop-blur-2xl border border-lp-border rounded-full py-1.5 px-2 pl-4 sm:pl-5 whitespace-nowrap gap-0.5 shadow-[0_8px_32px_rgba(0,0,0,0.06)]">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 px-3 py-1.5 shrink-0">
            {logo && (
              <img src={logo} alt={logoAlt} className="w-5 h-5" />
            )}
            <span className="text-[12px] font-bold text-lp-text tracking-tight">Student Hub</span>
          </Link>

          <div className="hidden sm:block w-px h-5 bg-lp-border mx-1" />

          {/* Nav Items */}
          <div className="hidden sm:flex items-center gap-0.5">
            {filteredItems.map((item, index) => {
              const isActive = item.href === activeHref
              return (
                <Link
                  key={index}
                  to={item.href}
                  className={`px-4 py-1.5 rounded-full text-[12px] font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-lp-text text-white'
                      : 'text-lp-text2 hover:text-lp-text hover:bg-lp-surface'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </div>

          <div className="hidden sm:block w-px h-5 bg-lp-border mx-1" />

          {/* Auth Area */}
          <div className="flex items-center gap-1.5 ml-auto pl-2 sm:pl-0">
            {currentUser ? (
              <div className="relative hidden sm:block" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 pl-2.5 pr-3 py-1 rounded-full transition-all duration-200 hover:bg-lp-surface"
                >
                  <div className="w-6 h-6 rounded-full border border-lp-border flex items-center justify-center text-white font-bold text-[10px] overflow-hidden shrink-0">
                    {profilePhoto ? (
                      <img 
                        src={resolveBackendAssetUrl(profilePhoto)} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div 
                      className={`w-full h-full bg-lp-accent flex items-center justify-center text-white font-bold ${profilePhoto ? 'hidden' : 'flex'}`}
                    >
                      {initials}
                    </div>
                  </div>
                  <span className="text-[12px] font-semibold text-lp-text truncate max-w-[100px]">
                    {displayName}
                  </span>
                  <svg className={`w-3 h-3 text-lp-text3 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown */}
                {dropdownOpen && (
                  <div className="absolute right-0 top-[calc(100%+8px)] w-48 bg-white/95 backdrop-blur-xl border border-black/10 rounded-2xl shadow-[0_16px_40px_rgba(0,0,0,0.12)] overflow-hidden z-[60]">
                    <div className="px-4 py-3 border-b border-lp-border">
                      <p className="text-[12px] font-semibold text-lp-text truncate">{displayName}</p>
                      <p className="text-[10px] text-lp-text3 capitalize">{currentUser.role || ''}</p>
                    </div>
                    <div className="p-1.5">
                      {currentDashboardHref && (
                        <Link
                          to={currentDashboardHref}
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12.5px] font-medium text-lp-text2 hover:text-lp-text hover:bg-lp-surface transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                          </svg>
                          Dashboard
                        </Link>
                      )}
                      <button
                        onClick={() => {
                          setDropdownOpen(false)
                          if (onLogout) {
                            onLogout()
                          } else {
                            auth.logout()
                          }
                        }}
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
              <button
                onClick={() => {
                  if (onLoginClick) {
                    onLoginClick()
                  } else {
                    navigate('/?login=true')
                  }
                }}
                className="hidden sm:block bg-lp-text text-lp-bg text-[12px] font-semibold px-4 py-1.5 rounded-full transition-all hover:bg-lp-atext tracking-[0.01em]"
              >
                Masuk
              </button>
            )}

            {/* Mobile Menu Button */}
            <button 
              className="sm:hidden w-8 h-8 flex flex-col justify-center items-center gap-[4px] bg-lp-surface border border-lp-border/60 rounded-full transition-all active:scale-90 hover:bg-lp-surface/90"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle mobile menu"
            >
              <span className={`w-[13px] h-[1.5px] bg-lp-text rounded-full transition-all duration-300 ${isMobileMenuOpen ? 'translate-y-[5.5px] rotate-45' : ''}`} />
              <span className={`w-[13px] h-[1.5px] bg-lp-text rounded-full transition-all duration-300 ${isMobileMenuOpen ? 'opacity-0' : ''}`} />
              <span className={`w-[13px] h-[1.5px] bg-lp-text rounded-full transition-all duration-300 ${isMobileMenuOpen ? '-translate-y-[5.5px] -rotate-45' : ''}`} />
            </button>
          </div>
        </nav>

        {/* Mobile Dropdown Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0, scale: 0.95 }}
              animate={{ 
                opacity: 1, 
                height: 'auto', 
                scale: 1,
                transition: {
                  height: { type: 'spring', stiffness: 220, damping: 26 },
                  opacity: { duration: 0.2 },
                  scale: { type: 'spring', stiffness: 220, damping: 26 }
                }
              }}
              exit={{ 
                opacity: 0, 
                height: 0, 
                scale: 0.95,
                transition: {
                  height: { duration: 0.2, ease: 'easeInOut' },
                  opacity: { duration: 0.15 },
                  scale: { duration: 0.15, ease: 'easeInOut' }
                }
              }}
              style={{ overflow: 'hidden' }}
              className="sm:hidden absolute top-[calc(100%+8px)] left-0 right-0 bg-white/95 backdrop-blur-2xl border border-black/10 rounded-[20px] shadow-[0_24px_48px_rgba(0,0,0,0.1)] z-[60] origin-top"
            >
              <div className="flex flex-col gap-1 p-2">
                {filteredItems.map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.04 + 0.05 }}
                  >
                    <Link
                      to={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`px-4 py-3 text-[13.5px] font-medium rounded-xl transition-colors block ${
                        item.href === activeHref
                          ? 'bg-lp-text text-white shadow-sm'
                          : 'text-lp-text2 hover:text-lp-text hover:bg-black/5'
                      }`}
                    >
                      {item.label}
                    </Link>
                  </motion.div>
                ))}
                
                <div className="h-px bg-black/5 mx-2 my-1" />
                
                {currentUser && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: filteredItems.length * 0.04 + 0.05 }}
                    className="flex items-center gap-3 px-4 py-3 border-b border-black/5 mb-1 bg-lp-surface/30 rounded-xl"
                  >
                    <div className="w-8 h-8 rounded-full border border-lp-border flex items-center justify-center text-white font-bold text-xs overflow-hidden shrink-0">
                      {profilePhoto ? (
                        <img 
                          src={resolveBackendAssetUrl(profilePhoto)} 
                          alt="Profile" 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div 
                        className={`w-full h-full bg-lp-accent flex items-center justify-center text-white font-bold ${profilePhoto ? 'hidden' : 'flex'}`}
                      >
                        {initials}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-lp-text text-[13.5px] truncate">{displayName}</div>
                      <div className="text-[10px] text-lp-text3 capitalize">{currentUser.role || ''}</div>
                    </div>
                  </motion.div>
                )}
                
                {currentUser ? (
                  <>
                    {currentDashboardHref && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: (filteredItems.length + 1) * 0.04 + 0.05 }}
                      >
                        <Link
                          to={currentDashboardHref}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="px-4 py-3 text-[13.5px] font-semibold text-lp-accent hover:bg-lp-accent/5 rounded-xl transition-colors block"
                        >
                          Dashboard
                        </Link>
                      </motion.div>
                    )}
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: (filteredItems.length + 2) * 0.04 + 0.05 }}
                    >
                      <button
                        onClick={() => {
                          setIsMobileMenuOpen(false)
                          if (onLogout) {
                            onLogout()
                          } else {
                            auth.logout()
                          }
                        }}
                        className="px-4 py-3 text-[13.5px] font-semibold text-red-500 hover:bg-red-50 rounded-xl transition-colors text-left w-full block"
                      >
                        Logout
                      </button>
                    </motion.div>
                  </>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: (filteredItems.length + 1) * 0.04 + 0.05 }}
                  >
                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false)
                        if (onLoginClick) {
                          onLoginClick()
                        } else {
                          navigate('/?login=true')
                        }
                      }}
                      className="px-4 py-3 text-[13.5px] font-semibold text-lp-accent hover:bg-lp-accent/5 rounded-xl transition-colors text-left w-full block"
                    >
                      Masuk
                    </button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default PillNav
