import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'

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
  const dropdownRef = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [dropdownOpen])

  const displayName = user?.name || user?.username || user?.email || user?.role || 'User'
  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase()

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center pt-5 pb-3 px-6">
      <div className="bg-lp-surface/80 backdrop-blur-2xl border border-lp-border rounded-full px-2 py-1.5 flex items-center gap-1 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 px-3 py-1.5">
          {logo && (
            <img src={logo} alt={logoAlt} className="w-5 h-5" />
          )}
          <span className="text-[12px] font-bold text-lp-text tracking-tight hidden sm:inline">Student Hub</span>
        </Link>

        <div className="w-px h-5 bg-lp-border mx-1" />

        {/* Nav Items */}
        {items.map((item, index) => {
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

        <div className="w-px h-5 bg-lp-border mx-1" />

        {/* Auth Area */}
        {user ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 pl-2.5 pr-3 py-1 rounded-full transition-all duration-200 hover:bg-lp-surface"
            >
              <span className="w-6 h-6 rounded-full bg-lp-accent text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                {initials}
              </span>
              <span className="text-[12px] font-semibold text-lp-text truncate max-w-[100px] hidden sm:inline">
                {displayName}
              </span>
              <svg className={`w-3 h-3 text-lp-text3 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown */}
            {dropdownOpen && (
              <div className="absolute right-0 top-[calc(100%+8px)] w-48 bg-white/95 backdrop-blur-xl border border-black/10 rounded-2xl shadow-[0_16px_40px_rgba(0,0,0,0.12)] overflow-hidden animate-slideUp">
                <div className="px-4 py-3 border-b border-lp-border">
                  <p className="text-[12px] font-semibold text-lp-text truncate">{displayName}</p>
                  <p className="text-[10px] text-lp-text3 capitalize">{user.role || ''}</p>
                </div>
                <div className="p-1.5">
                  {dashboardHref && (
                    <Link
                      to={dashboardHref}
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
                      onLogout?.()
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
            onClick={onLoginClick}
            className="bg-lp-text text-lp-bg text-[12px] font-semibold px-4 py-1.5 rounded-full transition-all hover:bg-lp-atext tracking-[0.01em]"
          >
            Masuk
          </button>
        )}
      </div>
    </nav>
  )
}

export default PillNav
