// src/components/ProfileHoverCard.jsx
import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import useAuth from '../hooks/useAuth'
import { resolveBackendAssetUrl } from '../utils/assetUrl'

export default function ProfileHoverCard({ role, username, displayName, displayAvatar, userId, children, className = '' }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0 })

  const triggerRef = useRef(null)
  const cardRef = useRef(null)
  const hoverTimeoutRef = useRef(null)
  const closeTimeoutRef = useRef(null)

  const cleanRole = role || 'mahasiswa'
  const cleanUser = (username || displayName || '').toLowerCase()
    .replace(/^ormawa_/, '')
    .replace(/^ukm_/, '')
    .replace(/^admin_/, '')
    .trim()

  const calculatePosition = () => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const cardWidth = 240
    const cardHeight = 130
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    let left = rect.left + window.scrollX - (cardWidth - rect.width) / 2
    let top = rect.bottom + window.scrollY + 8

    // Adjust horizontal boundary
    if (left + cardWidth > viewportWidth - 16) {
      left = viewportWidth - cardWidth - 16
    }
    if (left < 16) {
      left = 16
    }

    // Adjust vertical boundary (show above if not enough space below)
    const spaceBelow = viewportHeight - rect.bottom
    if (spaceBelow < cardHeight && rect.top > cardHeight) {
      top = rect.top + window.scrollY - cardHeight - 8
    }

    setCoords({ top, left })
  }

  const openCard = () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current)
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)

    calculatePosition()
    setIsOpen(true)
  }

  const closeCard = (delay = 300) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false)
    }, delay)
  }

  const handleMouseEnter = () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current)
    hoverTimeoutRef.current = setTimeout(() => {
      openCard()
    }, 300) // Hover delay before showing
  }

  const handleMouseLeave = () => {
    closeCard(300)
  }

  const handleClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (isOpen) {
      setIsOpen(false)
    } else {
      openCard()
    }
  }

  useEffect(() => {
    if (isOpen) {
      calculatePosition()
      const handleScroll = () => calculatePosition()
      const handleResize = () => calculatePosition()
      window.addEventListener('scroll', handleScroll, { passive: true })
      window.addEventListener('resize', handleResize)

      // Close on clicking outside
      const handleOutsideClick = (e) => {
        if (
          cardRef.current && !cardRef.current.contains(e.target) &&
          triggerRef.current && !triggerRef.current.contains(e.target)
        ) {
          setIsOpen(false)
        }
      }
      document.addEventListener('mousedown', handleOutsideClick)

      return () => {
        window.removeEventListener('scroll', handleScroll)
        window.removeEventListener('resize', handleResize)
        document.removeEventListener('mousedown', handleOutsideClick)
      }
    }
  }, [isOpen])

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current)
    }
  }, [])

  const getRoleDisplay = (r) => {
    switch (r) {
      case 'admin': return 'Admin'
      case 'ormawa': return 'Ormawa'
      case 'ukm': return 'UKM'
      case 'mahasiswa': return 'Mahasiswa'
      case 'dosen': return 'Dosen'
      default: return 'User'
    }
  }

  const getRoleBadgeClass = (r) => {
    switch (r) {
      case 'admin': return 'bg-red-50 text-red-500 border-red-100'
      case 'ormawa': return 'bg-purple-50 text-purple-500 border-purple-100'
      case 'ukm': return 'bg-green-50 text-green-500 border-green-100'
      case 'dosen': return 'bg-amber-50 text-amber-500 border-amber-100'
      default: return 'bg-blue-50 text-blue-500 border-blue-100'
    }
  }

  const handleMessageClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsOpen(false)
    if (!user) return
    const userRole = user.role || 'mahasiswa'
    const targetId = userId || cleanUser
    navigate(`/${userRole}/pesan/temp-${targetId}`)
  }

  const cardContent = (
    <div
      ref={cardRef}
      style={{
        position: 'absolute',
        top: `${coords.top}px`,
        left: `${coords.left}px`,
        zIndex: 9999,
      }}
      className="w-[240px] bg-white border border-gray-200 rounded-2xl shadow-2xl p-3.5 flex flex-col font-sans select-none animate-fadeIn pointer-events-auto"
      onMouseEnter={() => {
        if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current)
      }}
      onMouseLeave={() => closeCard(150)}
    >
      <div className="flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 bg-gray-100 border border-gray-200 rounded-full flex items-center justify-center font-bold overflow-hidden flex-shrink-0">
            {displayAvatar ? (
              <img
                src={resolveBackendAssetUrl(displayAvatar)}
                alt={displayName}
                className="w-full h-full object-cover"
                onError={(e) => { e.target.style.display = 'none' }}
              />
            ) : (
              (displayName || cleanUser || '?')[0].toUpperCase()
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-bold text-gray-900 text-sm truncate leading-tight tracking-tight">
              {displayName || username}
            </h4>
            <span className={`inline-block px-1.5 py-0.5 mt-1 text-[9px] font-bold uppercase tracking-wider rounded border ${getRoleBadgeClass(cleanRole)}`}>
              {getRoleDisplay(cleanRole)}
            </span>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex flex-col gap-1.5 mt-1">
          {user && userId && Number(user.id) !== Number(userId) ? (
            <button
              onClick={handleMessageClick}
              className="w-full py-1.5 bg-[#007AFF] hover:bg-[#0066CC] active:scale-[0.98] text-white text-[11px] font-semibold rounded-xl shadow-sm transition-all"
            >
              Kirim Pesan
            </button>
          ) : null}
          <Link
            to={`/profile/${cleanRole}/${cleanUser}`}
            onClick={() => setIsOpen(false)}
            className="w-full py-1.5 bg-gray-50 hover:bg-gray-100 active:scale-[0.98] text-gray-700 text-[11px] font-semibold rounded-xl text-center border border-gray-200 transition-all block"
          >
            Lihat Profil Lengkap
          </Link>
        </div>
      </div>
    </div>
  )

  return (
    <>
      <span
        ref={triggerRef}
        className={`inline-block cursor-pointer ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      >
        {children}
      </span>
      {isOpen && createPortal(cardContent, document.body)}
    </>
  )
}
