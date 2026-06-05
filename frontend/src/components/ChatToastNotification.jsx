// src/components/ChatToastNotification.jsx
// Renders stacked toast popups in the top-right corner whenever a new
// chat message arrives from another user.
// Clicking a toast navigates to the conversation.

import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useChatNotification from '../hooks/useChatNotification'
import { getProfilePhotoUrl } from '../utils/profileUtils'

const ChatToastNotification = () => {
  const { notifications, dismissNotification } = useChatNotification()
  const navigate = useNavigate()

  const handleClick = (toast) => {
    dismissNotification(toast.id)
    const role = toast.role || 'mahasiswa'
    navigate(`/${role}/pesan/${toast.conversationId}`)
  }

  if (!notifications.length) return null

  return (
    <div
      id="chat-toast-container"
      className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none"
      style={{ maxWidth: 380 }}
    >
      {notifications.map((toast, idx) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          index={idx}
          onClick={() => handleClick(toast)}
          onDismiss={() => dismissNotification(toast.id)}
        />
      ))}
    </div>
  )
}

// ─── individual toast ──────────────────────────────────────────
const ToastItem = ({ toast, index, onClick, onDismiss }) => {
  const [visible, setVisible] = useState(false)
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    // Trigger enter animation
    const t = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(t)
  }, [])

  // Auto-exit animation shortly before the parent removes us
  useEffect(() => {
    const timer = setTimeout(() => setExiting(true), 4500)
    return () => clearTimeout(timer)
  }, [])

  const handleDismiss = (e) => {
    e.stopPropagation()
    setExiting(true)
    setTimeout(() => {
      onDismiss()
    }, 400) // matches transition duration 0.4s
  }

  const avatarUrl = toast.senderAvatar ? getProfilePhotoUrl(toast.senderAvatar) : null

  return (
    <div
      role="alert"
      onClick={onClick}
      className="pointer-events-auto cursor-pointer select-none"
      style={{
        transform: visible && !exiting
          ? 'translateX(0) scale(1)'
          : 'translateX(120%) scale(0.9)',
        opacity: visible && !exiting ? 1 : 0,
        transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
    >
      <div
        className="relative flex items-start gap-3 p-4 rounded-2xl shadow-2xl border border-white/30"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(248,248,255,0.88) 100%)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.12), 0 2px 12px rgba(0,122,255,0.08)',
        }}
      >
        {/* Accent bar */}
        <div
          className="absolute left-0 top-3 bottom-3 w-1 rounded-full"
          style={{ background: 'linear-gradient(180deg, #007AFF, #5856D6)' }}
        />

        {/* Avatar */}
        <div className="flex-shrink-0 ml-1">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={toast.senderName}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow-md"
              onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'flex' }}
            />
          ) : null}
          <div
            className={`w-10 h-10 rounded-full bg-gradient-to-br from-[#007AFF] to-[#5856D6] flex items-center justify-center text-white text-sm font-bold ring-2 ring-white shadow-md ${avatarUrl ? 'hidden' : ''}`}
          >
            {toast.senderInitials}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pr-6">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[13px] font-semibold text-gray-900 truncate">
              {toast.senderName}
            </span>
            <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">
              Baru saja
            </span>
          </div>
          <p className="text-[12px] text-gray-600 leading-relaxed line-clamp-2">
            {toast.preview}
          </p>
        </div>

        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
        >
          <i className="fas fa-times text-[10px]" />
        </button>

        {/* Progress bar */}
        <div className="absolute bottom-0 left-4 right-4 h-[2px] rounded-full overflow-hidden bg-gray-200/50">
          <div
            className="h-full rounded-full"
            style={{
              background: 'linear-gradient(90deg, #007AFF, #5856D6)',
              animation: 'toast-progress 5s linear forwards',
            }}
          />
        </div>
      </div>
    </div>
  )
}

// Inject keyframes for the progress bar
if (typeof document !== 'undefined' && !document.getElementById('chat-toast-keyframes')) {
  const style = document.createElement('style')
  style.id = 'chat-toast-keyframes'
  style.textContent = `
    @keyframes toast-progress {
      from { width: 100%; }
      to   { width: 0%; }
    }
  `
  document.head.appendChild(style)
}

export default ChatToastNotification
