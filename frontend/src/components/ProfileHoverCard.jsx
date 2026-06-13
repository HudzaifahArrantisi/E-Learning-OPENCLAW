// src/components/ProfileHoverCard.jsx
import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import useAuth from '../hooks/useAuth'
import { resolveBackendAssetUrl } from '../utils/assetUrl'
import api from '../services/api'

export default function ProfileHoverCard({ role, username, displayName, displayAvatar, userId, children, className = '' }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const [followState, setFollowState] = useState(null)
  const [followBusy, setFollowBusy] = useState(false)
  const [resolvedUserId, setResolvedUserId] = useState(userId || null)
  const [profileData, setProfileData] = useState(null)

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

  const cleanUserId = userId || null
  const [prevUserId, setPrevUserId] = useState(cleanUserId)
  if (cleanUserId !== prevUserId) {
    setResolvedUserId(cleanUserId)
    setPrevUserId(cleanUserId)
  }

  const [prevIsOpen, setPrevIsOpen] = useState(isOpen)
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen)
    if (!isOpen) {
      setProfileData(null)
    }
  }

  useEffect(() => {
    if (!isOpen || profileData || !cleanRole || !cleanUser) return
    api.get(`/api/profile/public/${cleanRole}/${cleanUser}`)
      .then((res) => {
        setProfileData(res.data.data)
        if (res.data.data?.user_id) {
          setResolvedUserId(res.data.data.user_id)
        }
      })
      .catch(() => {
        setProfileData(null)
      })
  }, [isOpen, profileData, cleanRole, cleanUser])

  useEffect(() => {
    if (!isOpen || !user || !resolvedUserId || Number(user.id) === Number(resolvedUserId)) return
    api.getFollowStatus(resolvedUserId)
      .then((res) => setFollowState(res.data.data))
      .catch(() => setFollowState(null))
  }, [isOpen, user, resolvedUserId])

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
    const targetId = resolvedUserId || cleanUser
    navigate(`/${userRole}/pesan/temp-${targetId}`)
  }

  const handleFollowClick = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!resolvedUserId || followBusy) return
    setFollowBusy(true)
    try {
      const res = followState?.is_following
        ? await api.unfollowUser(resolvedUserId)
        : await api.followUser(resolvedUserId)
      setFollowState((current) => ({ ...current, ...res.data.data }))
    } finally {
      setFollowBusy(false)
    }
  }

  const cardContent = cleanRole === 'mahasiswa' ? (
    <div
      ref={cardRef}
      style={{
        position: 'absolute',
        top: `${coords.top}px`,
        left: `${coords.left}px`,
        zIndex: 9999,
      }}
      className="w-[240px] bg-white border border-gray-200 rounded-2xl shadow-2xl p-4 flex flex-col font-sans select-none animate-fadeIn pointer-events-auto"
      onMouseEnter={() => {
        if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current)
      }}
      onMouseLeave={() => closeCard(150)}
    >
      <div className="flex flex-col items-center text-center">
        {/* Avatar */}
        <div className="w-16 h-16 bg-gray-100 border border-gray-200 rounded-full flex items-center justify-center font-bold overflow-hidden mb-3 shrink-0">
          {profileData?.profile_picture || displayAvatar ? (
            <img
              src={resolveBackendAssetUrl(profileData?.profile_picture || displayAvatar)}
              alt={profileData?.name || displayName}
              className="w-full h-full object-cover"
              onError={(e) => { e.target.style.display = 'none' }}
            />
          ) : (
            (profileData?.name || displayName || cleanUser || '?')[0].toUpperCase()
          )}
        </div>
        
        {/* Info */}
        <h4 className="font-bold text-gray-900 text-sm truncate w-full px-1 leading-tight tracking-tight">
          {profileData?.name || displayName || username}
        </h4>
        
        <span className={`inline-block px-2 py-0.5 mt-2 text-[9px] font-bold uppercase tracking-wider rounded border ${getRoleBadgeClass('mahasiswa')}`}>
          Mahasiswa
        </span>

        {/* NIM */}
        <div className="mt-2.5 text-xs text-gray-500 font-mono">
          NIM: {profileData?.nim || '...'}
        </div>
      </div>
    </div>
  ) : (
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
          {user && resolvedUserId && Number(user.id) !== Number(resolvedUserId) ? (
            <button
              onClick={handleFollowClick}
              disabled={followBusy || !followState}
              className={`w-full py-1.5 active:scale-[0.98] text-[11px] font-semibold rounded-xl shadow-sm transition-all disabled:opacity-50 ${
                followState?.is_following
                  ? 'bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-200'
                  : 'bg-[#007AFF] hover:bg-[#0066CC] text-white'
              }`}
            >
              {followBusy ? 'Memproses...' : followState?.is_following ? 'Following' : 'Follow'}
            </button>
          ) : null}
          {user && resolvedUserId && Number(user.id) !== Number(resolvedUserId) ? (
            <button
              onClick={handleMessageClick}
              className="w-full py-1.5 bg-gray-50 hover:bg-gray-100 active:scale-[0.98] text-gray-700 text-[11px] font-semibold rounded-xl border border-gray-200 transition-all"
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
