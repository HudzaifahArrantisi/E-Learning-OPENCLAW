// src/hooks/useChatNotification.jsx
// Global context for real-time chat notifications & unread badge count.
// Connects WebSocket once (singleton) when user is authenticated,
// keeps it alive across all pages so toast popups can appear anywhere.

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import api from '../services/api'
import useAuth from './useAuth'

const ChatNotificationContext = createContext(null)

// ─── helpers ───────────────────────────────────────────────────
let nextToastId = 1

const getInitials = (name) => {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return parts[0].substring(0, 2).toUpperCase()
}

const isMessageRequest = (conv, currentUserId) => (
  conv?.type === 'private' &&
  conv.created_by != null &&
  Number(conv.created_by) !== Number(currentUserId) &&
  !conv.has_replied &&
  !conv.isTemp
)

const calculateTotalUnread = (convs, currentUserId) => {
  if (!currentUserId) return 0
  const normalUnread = convs
    .filter(c => !isMessageRequest(c, currentUserId))
    .reduce((sum, c) => sum + (c.unread_count || 0), 0)
  
  const requestsUnread = convs
    .filter(c => isMessageRequest(c, currentUserId) && c.unread_count > 0)
    .length
  
  return normalUnread + requestsUnread
}

// ─── provider ──────────────────────────────────────────────────
export function ChatNotificationProvider({ children }) {
  const { user, isAuthenticated } = useAuth()
  const location = useLocation()

  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState([])

  // Refs to avoid stale closures inside the WS callback
  const locationRef = useRef(location)
  const userRef = useRef(user)
  const wsHandlerRef = useRef(null)

  useEffect(() => { locationRef.current = location }, [location])
  useEffect(() => { userRef.current = user }, [user])

  // Define actions early so they can be referenced in useEffects
  const refreshUnreadCount = useCallback(async () => {
    try {
      const r = await api.getConversations()
      if (r.data?.success) {
        const convs = r.data.data || []
        const total = calculateTotalUnread(convs, userRef.current?.id)
        setUnreadCount(total)
      }
    } catch {
      // ignore
    }
  }, [])

  const updateUnreadCount = useCallback((count) => {
    setUnreadCount(count)
  }, [])

  // ── fetch initial unread count ────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0)
      return
    }

    refreshUnreadCount()
  }, [isAuthenticated, refreshUnreadCount])

  // ── WebSocket listener (global) ───────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return

    // Connect the singleton WebSocket (no-op if already connected)
    api.webSocket.connect()

    const handler = (msg) => {
      if (msg.type === 'new_conversation') {
        refreshUnreadCount()
        return
      }

      if (msg.type !== 'new_message') return

      const currentUser = userRef.current
      const currentPath = locationRef.current.pathname

      // Ignore messages sent by ourselves
      if (msg.data?.message?.sender?.id === currentUser?.id) return

      // Check if the user is currently viewing the conversation that received the message
      const convId = msg.data?.conversation_id
      const isOnChatPage = currentPath.includes('/pesan')
      const isViewingThisConv = isOnChatPage && currentPath.endsWith(`/${convId}`)

      if (!isViewingThisConv) {
        // Refresh unread count to keep it perfectly accurate
        refreshUnreadCount()

        // Push toast notification (max 3 visible)
        const sender = msg.data?.message?.sender || {}
        const content = msg.data?.message?.content || ''

        // Parse share_post content for preview
        let preview = content
        if (content.startsWith('{"type":"share_post"')) {
          try {
            const data = JSON.parse(content)
            if (data.type === 'share_post') {
              preview = `(postingan dari ${data.author_name || 'User'})`
            }
          } catch (e) {
            preview = '📎 Berbagi postingan'
          }
        }

        const toast = {
          id: nextToastId++,
          senderName: sender.name || 'Seseorang',
          senderInitials: getInitials(sender.name),
          senderAvatar: sender.avatar || sender.profile_photo,
          preview: preview.length > 80 ? preview.slice(0, 80) + '…' : preview,
          conversationId: convId,
          role: currentUser?.role || 'mahasiswa',
          createdAt: Date.now(),
        }

        setNotifications((prev) => [toast, ...prev].slice(0, 3))

        // Auto-dismiss after 5 seconds
        setTimeout(() => {
          setNotifications((prev) => prev.filter((n) => n.id !== toast.id))
        }, 5000)
      }
    }

    wsHandlerRef.current = handler
    api.webSocket.onMessage(handler)

    return () => {
      if (wsHandlerRef.current) {
        api.webSocket.removeMessageCallback(wsHandlerRef.current)
        wsHandlerRef.current = null
      }
      // Don't disconnect — ChatPage may still need the connection,
      // and the singleton handles reconnects itself.
    }
  }, [isAuthenticated, refreshUnreadCount])

  // ── public API ────────────────────────────────────────────────
  const dismissNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const resetUnreadCount = useCallback(() => {
    setUnreadCount(0)
  }, [])

  const decrementUnread = useCallback((amount = 1) => {
    setUnreadCount((prev) => Math.max(0, prev - amount))
  }, [])

  const value = {
    unreadCount,
    notifications,
    dismissNotification,
    resetUnreadCount,
    decrementUnread,
    refreshUnreadCount,
    updateUnreadCount,
  }

  return (
    <ChatNotificationContext.Provider value={value}>
      {children}
    </ChatNotificationContext.Provider>
  )
}

// ─── hook ──────────────────────────────────────────────────────
const useChatNotification = () => {
  const ctx = useContext(ChatNotificationContext)
  if (!ctx) {
    throw new Error('useChatNotification must be used within ChatNotificationProvider')
  }
  return ctx
}

export default useChatNotification
