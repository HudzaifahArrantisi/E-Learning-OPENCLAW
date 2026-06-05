import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../services/api'
import useAuth from '../hooks/useAuth'
import useChatNotification from '../hooks/useChatNotification'
import Sidebar from './Sidebar'
import { resolveBackendAssetUrl } from '../utils/assetUrl'

const _MOTION = motion

const ROLES = [
  { value: '', label: 'Semua' },
  { value: 'mahasiswa', label: 'Mahasiswa' },
  { value: 'dosen', label: 'Dosen' },
  { value: 'admin', label: 'Admin' },
  { value: 'ukm', label: 'UKM' },
  { value: 'ormawa', label: 'Ormawa' },
]

const renderMessageContent = (text, isMine, extraClasses = '') => {
  if (!text) return null

  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi
  const parts = text.split(urlRegex)

  return (
    <div className={`whitespace-pre-wrap break-words break-all ${extraClasses}`}>
      {parts.map((part, index) => {
        if (part.match(urlRegex)) {
          const href = part.toLowerCase().startsWith('www.') ? `https://${part}` : part
          return (
            <a
              key={index}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={`underline break-all transition-all hover:opacity-85 ${
                isMine ? 'text-white font-semibold' : 'text-[#007AFF] font-semibold'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {part}
            </a>
          )
        }
        return part
      })}
    </div>
  )
}

const ChatPage = ({ role }) => {
  const { user } = useAuth()
  const { updateUnreadCount } = useChatNotification()
  const navigate = useNavigate()
  const { conversationId } = useParams()
  const basePath = `/${role}/pesan`

  const [conversations, setConversations] = useState([])
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, _setSending] = useState(false)
  const [typingUsers, setTypingUsers] = useState({})
  const [isWsConnected, setIsWsConnected] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState(new Set())
  const [showMobileList, setShowMobileList] = useState(true)

  // New Chat Modal state
  const [showNewChat, setShowNewChat] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [listQuery, setListQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [startingChat, setStartingChat] = useState(null)

  // Sidebar user search results
  const [sidebarSearchResults, setSidebarSearchResults] = useState([])
  const [searchingSidebar, setSearchingSidebar] = useState(false)
  
  // Hidden chats (local swipe-to-delete)
  const [hiddenChats, setHiddenChats] = useState(() => {
    try { return JSON.parse(localStorage.getItem('hiddenChats')) || {} } 
    catch { return {} }
  })

  const messagesEndRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const searchTimeoutRef = useRef(null)
  const selectedConvRef = useRef(null)
  const fileInputRef = useRef(null)
  const [uploadingFile, setUploadingFile] = useState(false)

  // Keep ref in sync with state
  useEffect(() => {
    selectedConvRef.current = selectedConversation
  }, [selectedConversation])

  // Load conversations & connect WS
  useEffect(() => {
    if (!user) return
    loadConversations()
    api.webSocket.connect()
    api.webSocket.onMessage(handleWsMessage)
    api.webSocket.onConnectionChange(setIsWsConnected)
    // Load online users
    api.getOnlineUsers().then(r => {
      if (r.data?.online_ids) setOnlineUsers(new Set(r.data.online_ids))
    }).catch(() => {})
    return () => {
      api.webSocket.removeMessageCallback(handleWsMessage)
    }
  }, [user])

  // Select conversation from URL
  useEffect(() => {
    if (!conversationId) return

    const selectOrFetch = async () => {
      const conv = conversations.find(c => c.id === conversationId)
      if (conv) {
        // Jika user secara aktif membuka percakapan ini, hapus dari hiddenChats
        if (hiddenChats[conv.id]) {
          const updated = { ...hiddenChats }
          delete updated[conv.id]
          setHiddenChats(updated)
          localStorage.setItem('hiddenChats', JSON.stringify(updated))
        }

        if (selectedConvRef.current?.id !== conv.id) {
          selectConversation(conv)
        }
      } else {
        // Jika tidak ada di daftar local, tapi loading sudah selesai
        if (!loading) {
          try {
            const res = await api.getConversationDetail(conversationId)
            if (res.data?.success && res.data.data) {
              const fetchedConv = res.data.data

              // Hapus dari hiddenChats
              if (hiddenChats[fetchedConv.id]) {
                const updated = { ...hiddenChats }
                delete updated[fetchedConv.id]
                setHiddenChats(updated)
                localStorage.setItem('hiddenChats', JSON.stringify(updated))
              }

              // Masukkan ke state conversations
              setConversations(prev => {
                if (prev.some(c => c.id === fetchedConv.id)) return prev
                return [fetchedConv, ...prev]
              })

              setSelectedConversation(fetchedConv)
              setMessages([])
              setShowMobileList(false)

              const msgRes = await api.getMessages(fetchedConv.id)
              if (msgRes.data?.success) setMessages(msgRes.data.data || [])
              api.markMessagesAsRead(fetchedConv.id).catch(() => {})
            } else {
              navigate(basePath, { replace: true })
            }
          } catch (err) {
            console.error('Fetch conversation detail error:', err)
            navigate(basePath, { replace: true })
          }
        }
      }
    }

    selectOrFetch()
  }, [conversationId, conversations, hiddenChats, loading])

  // Sync global unread count with local conversations list
  useEffect(() => {
    if (!loading) {
      const total = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0)
      updateUnreadCount(total)
    }
  }, [conversations, loading, updateUnreadCount])

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // Search users debounced
  useEffect(() => {
    if (!showNewChat) return
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(() => {
      doSearch()
    }, 350)
    return () => clearTimeout(searchTimeoutRef.current)
  }, [searchQuery, roleFilter, showNewChat])

  const doSearch = async () => {
    setSearching(true)
    try {
      const r = await api.searchUsers(searchQuery, roleFilter)
      if (r.data?.success) setSearchResults(r.data.data || [])
    } catch (err) {
      console.error('Search users error:', err)
      setSearchResults([])
    }
    setSearching(false)
  }

  // Debounced search for the main sidebar search input
  useEffect(() => {
    const query = listQuery.trim()
    if (!query) {
      setSidebarSearchResults([])
      return
    }
    
    setSearchingSidebar(true)
    const delayDebounce = setTimeout(async () => {
      try {
        const r = await api.searchUsers(query, '')
        if (r.data?.success) {
          const results = r.data.data || []
          
          // Get user IDs of current active private conversations to exclude
          const activePrivateUserIds = new Set(
            conversations
              .filter(c => c.type === 'private' && c.participants)
              .map(c => {
                const other = c.participants.find(p => p.user_id !== user?.id)
                return other?.user_id
              })
              .filter(Boolean)
          )
          
          // Only show users who don't have an active conversation yet
          const filteredResults = results.filter(u => !activePrivateUserIds.has(u.id))
          setSidebarSearchResults(filteredResults)
        }
      } catch (err) {
        console.error('Sidebar user search error:', err)
        setSidebarSearchResults([])
      } finally {
        setSearchingSidebar(false)
      }
    }, 400)
    
    return () => clearTimeout(delayDebounce)
  }, [listQuery, conversations, user])

  const loadConversations = async () => {
    try {
      const r = await api.getConversations()
      if (r.data?.success) {
        const convs = r.data.data || []
        setConversations(convs)
        if (!selectedConvRef.current && !conversationId) {
          const firstVisible = convs.find(c => hiddenChats[c.id] !== (c.last_message?.id || 'none') && c.last_message)
          if (firstVisible) {
            selectConversation(firstVisible)
          } else {
            setSelectedConversation(null)
            setMessages([])
          }
        }
      }
    } catch (e) { console.error('Load conversations:', e) }
    setLoading(false)
  }

  const selectConversation = async (conv) => {
    setSelectedConversation(conv)
    setMessages([])
    setShowMobileList(false)
    navigate(`${basePath}/${conv.id}`, { replace: true })
    try {
      const r = await api.getMessages(conv.id)
      if (r.data?.success) setMessages(r.data.data || [])
    } catch (e) { console.error('Load messages:', e) }
    api.markMessagesAsRead(conv.id).catch(() => {})
    setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unread_count: 0 } : c))
  }

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedConversation || sending) return
    
    const messageContent = newMessage.trim()
    setNewMessage('')
    
    // Optimistic Update
    const optimisticMsg = {
      id: `opt-${Date.now()}`,
      sender: { id: user.id, name: user.name },
      content: messageContent,
      message_type: 'text',
      created_at: new Date().toISOString(),
      is_read: false,
      status: 'sending'
    }
    
    setMessages(prev => [...prev, optimisticMsg])
    
    try {
      api.webSocket.sendTypingIndicator(selectedConversation.id, false)
      const r = await api.sendMessage(selectedConversation.id, { 
        content: messageContent, 
        message_type: 'text' 
      })
      
      if (r.data?.success) {
        // Replace optimistic message with actual one
        setMessages(prev => prev.map(m => m.id === optimisticMsg.id ? { ...r.data.data, status: 'sent' } : m))
      }
    } catch (e) { 
      console.error('Send:', e)
      // Mark as failed
      setMessages(prev => prev.map(m => m.id === optimisticMsg.id ? { ...m, status: 'error' } : m))
    }
  }

  const handleDeleteMessage = async (msgId) => {
    if (!window.confirm('Hapus pesan ini?')) return
    try {
      await api.deleteMessage(msgId)
      setMessages(prev => prev.filter(m => m.id !== msgId))
    } catch (e) {
      console.error('Delete message:', e)
    }
  }

  const handleHideConversation = (e, conv) => {
    e.stopPropagation()
    const newHidden = { ...hiddenChats, [conv.id]: conv.last_message?.id || 'none' }
    setHiddenChats(newHidden)
    localStorage.setItem('hiddenChats', JSON.stringify(newHidden))
    if (selectedConversation?.id === conv.id) {
      setSelectedConversation(null)
      navigate(basePath)
      setShowMobileList(true)
    }
  }

  const handleInputChange = (e) => {
    setNewMessage(e.target.value)
    if (selectedConversation && e.target.value.length > 0) {
      api.webSocket.sendTypingIndicator(selectedConversation.id, true)
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = setTimeout(() => {
        api.webSocket.sendTypingIndicator(selectedConversation.id, false)
      }, 2000)
    }
  }

  const handleAttachClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !selectedConversation) return
    
    e.target.value = ''
    
    setUploadingFile(true)
    const formData = new FormData()
    formData.append('file', file)
    
    const isImage = file.type.startsWith('image/')
    formData.append('type', isImage ? 'post' : 'document')
    
    try {
      const r = await api.uploadFile(formData)
      if (r.data?.success) {
        const uploadData = r.data.data
        const fileUrl = uploadData.file_url
        const fileName = uploadData.original_filename
        const fileSize = uploadData.original_size
        
        const sendRes = await api.sendMessage(selectedConversation.id, {
          conversation_id: selectedConversation.id,
          content: fileName,
          message_type: isImage ? 'image' : 'file',
          file_url: fileUrl,
          file_name: fileName,
          file_size: Number(fileSize)
        })
        
        if (sendRes.data?.success) {
          setMessages(prev => [...prev, sendRes.data.data])
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
          }, 100)
        }
      } else {
        alert(r.data?.message || 'Gagal mengunggah file')
      }
    } catch (err) {
      console.error('File upload error:', err)
      alert(err.response?.data?.message || 'Gagal mengunggah file. Pastikan ukuran file tidak melebihi batas.')
    } finally {
      setUploadingFile(false)
    }
  }

  const handleWsMessage = useCallback((msg) => {
    const currentConv = selectedConvRef.current
    switch (msg.type) {
      case 'new_message':
        if (msg.data.conversation_id === currentConv?.id) {
          setMessages(prev => {
            // Avoid duplicates if optimistic update already added it
            const exists = prev.some(m => m.id === msg.data.message.id || (m.status === 'sending' && m.content === msg.data.message.content))
            if (exists) {
              return prev.map(m => (m.status === 'sending' && m.content === msg.data.message.content) ? msg.data.message : m)
            }
            return [...prev, msg.data.message]
          })
          // Auto-mark active messages as read and send WS receipt
          api.markMessagesAsRead(currentConv.id).catch(() => {})
          api.webSocket.sendReadReceipt(currentConv.id, msg.data.message.id)
        }
        setConversations(prev => {
          const idx = prev.findIndex(c => c.id === msg.data.conversation_id)
          if (idx === -1) {
            // New or hidden conversation, reload the list to display it
            setTimeout(() => {
              loadConversations()
            }, 50)
            return prev
          }
          
          const newConvs = [...prev]
          const conv = { ...newConvs[idx] }
          conv.last_message = msg.data.message
          conv.unread_count = conv.id === currentConv?.id ? 0 : (conv.unread_count || 0) + 1
          conv.updated_at = new Date().toISOString()
          
          // Move to top
          newConvs.splice(idx, 1)
          return [conv, ...newConvs]
        })
        break
      case 'message_read':
        if (msg.data.conversation_id === currentConv?.id)
          setMessages(prev => prev.map(m => m.id === msg.data.message_id ? { ...m, is_read: true } : m))
        break
      case 'message_deleted':
        if (msg.data.conversation_id === currentConv?.id) {
          setMessages(prev => prev.filter(m => m.id !== msg.data.message_id))
        }
        setConversations(prev => prev.map(c => {
          if (c.id === msg.data.conversation_id && c.last_message?.id === msg.data.message_id) {
            return { ...c, last_message: { ...c.last_message, content: '🚫 Pesan ini telah dihapus', is_deleted: true } }
          }
          return c
        }))
        break
      case 'new_conversation':
        loadConversations()
        break
      case 'typing':
        if (msg.data?.conversation_id === currentConv?.id) {
          setTypingUsers(prev => ({ ...prev, [msg.data.user_id]: { name: msg.data.user_name, isTyping: msg.data.is_typing, ts: Date.now() } }))
        }
        break
      case 'user_online':
        setOnlineUsers(prev => new Set([...prev, msg.data.user_id]))
        break
      case 'user_offline':
        setOnlineUsers(prev => { const s = new Set(prev); s.delete(msg.data.user_id); return s })
        break
    }
  }, []) // No dependencies — uses ref instead

  const startNewChat = async (contactId) => {
    if (startingChat) return
    setStartingChat(contactId)
    try {
      const r = await api.createConversation({ type: 'private', participants: [contactId] })
      if (r.data?.success) {
        const convId = r.data.data

        // Hapus dari hiddenChats agar langsung terlihat
        if (convId) {
          const updated = { ...hiddenChats }
          delete updated[convId]
          setHiddenChats(updated)
          localStorage.setItem('hiddenChats', JSON.stringify(updated))
        }

        setShowNewChat(false)
        setSearchQuery('')
        setListQuery('')
        setRoleFilter('')

        // Navigasi langsung tanpa menunggu loading penuh seluruh list conversation
        if (convId) {
          navigate(`${basePath}/${convId}`)
        }

        // Jalankan pemuatan ulang list secara asynchronous di background
        loadConversations()
      }
    } catch (e) { console.error('Start chat:', e) }
    setStartingChat(null)
  }

  const formatTime = (d) => new Date(d).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  const formatDate = (d) => {
    const date = new Date(d), today = new Date()
    if (date.toDateString() === today.toDateString()) return 'Hari ini'
    const y = new Date(today); y.setDate(y.getDate() - 1)
    if (date.toDateString() === y.toDateString()) return 'Kemarin'
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
  }

  const getConvName = (conv) => {
    if (conv.type === 'private' && conv.participants) {
      const other = conv.participants.find(p => p.user_id !== user?.id)
      return other?.user?.name || conv.name
    }
    return conv.name
  }

  const getInitials = (name) => {
    if (!name) return '?'
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return parts[0].substring(0, 2).toUpperCase()
  }

  const getTypingText = () => {
    const t = Object.values(typingUsers).filter(x => x.isTyping && Date.now() - x.ts < 3000)
    if (!t.length) return null
    return t.length === 1 ? `${t[0].name} sedang mengetik...` : `${t.length} orang sedang mengetik...`
  }

  const getRoleBadge = (r) => {
    const m = { dosen: 'bg-amber-100 text-amber-800', admin: 'bg-red-100 text-red-800', mahasiswa: 'bg-blue-100 text-blue-800', ukm: 'bg-green-100 text-green-800', ormawa: 'bg-purple-100 text-purple-800' }
    return m[r] || 'bg-gray-100 text-gray-800'
  }

  const renderConvItem = (conv) => {
    const isSelected = selectedConversation?.id === conv.id;
    const convName = getConvName(conv);
    const initials = getInitials(convName);
    
    return (
      <motion.div 
        key={conv.id}
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="relative px-2 py-0.5 overflow-hidden"
      >
        {/* Background Delete Button (iOS style) */}
        <div className="absolute inset-y-0.5 right-2 w-20 bg-[#FF3B30] flex items-center justify-center rounded-r-xl">
          <button 
            onClick={(e) => handleHideConversation(e, conv)} 
            className="w-full h-full text-white flex flex-col items-center justify-center active:bg-red-700 transition-colors rounded-r-xl"
          >
            <i className="fas fa-trash-alt text-[15px]" />
            <span className="text-[10px] font-semibold mt-0.5">Delete</span>
          </button>
        </div>
        
        {/* Draggable Foreground */}
        <motion.div 
          drag="x"
          dragConstraints={{ left: -80, right: 0 }}
          dragSnapToOrigin={false}
          className={`group px-3 py-2.5 cursor-pointer relative z-10 transition-all duration-150 rounded-xl border ${
            isSelected
              ? 'bg-[#007AFF] border-[#007AFF] text-white shadow-sm'
              : 'bg-white border-[#E5E5EA] hover:bg-[#F2F2F7] active:bg-[#E5E5EA] text-black shadow-sm'
          }`} 
          onClick={() => selectConversation(conv)}
        >
          <div className="flex items-center gap-3 relative pl-4">
            {/* Unread Dot (iOS style) */}
            <div className="absolute left-[-2px] w-2 h-2 flex items-center justify-center">
              {!isSelected && conv.unread_count > 0 && (
                <div className="w-2.5 h-2.5 bg-[#007AFF] rounded-full" />
              )}
            </div>
            
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-[15px] shadow-sm select-none ${
                isSelected 
                  ? 'bg-white/20 text-white' 
                  : 'bg-gradient-to-br from-[#BAC6D1] to-[#A2ADB8] text-white border border-gray-200'
              }`}>
                {conv.type === 'group' ? (
                  <i className="fas fa-users text-sm" />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              {conv.type === 'private' && conv.participants && (() => {
                const other = conv.participants.find(p => p.user_id !== user?.id)
                return other && onlineUsers.has(other.user_id) ? (
                  <div className={`absolute bottom-0.5 right-0.5 w-3 h-3 bg-[#34C759] rounded-full border-2 ${isSelected ? 'border-[#007AFF]' : 'border-[#F4F4F6]'} shadow-sm`} />
                ) : null
              })()}
            </div>
            
            {/* Text Details */}
            <div className="flex-1 min-w-0 pr-1">
              <div className="flex justify-between items-baseline mb-0.5">
                <h3 className={`font-semibold text-[14px] truncate leading-snug ${isSelected ? 'text-white' : 'text-black'}`}>
                  {convName}
                </h3>
                {conv.last_message && (
                  <span className={`text-[11px] font-medium ml-2 flex-shrink-0 ${isSelected ? 'text-white/80' : 'text-gray-400'}`}>
                    {formatTime(conv.last_message.created_at)}
                  </span>
                )}
              </div>
              <div className="flex justify-between items-center">
                <p className={`text-[13px] truncate leading-tight pr-1 ${
                  isSelected 
                    ? 'text-white/90' 
                    : (conv.unread_count > 0 ? 'text-black font-semibold' : 'text-gray-500')
                }`}>
                  {conv.last_message ? (
                    <>
                      <span className="opacity-70">{conv.last_message.sender?.id === user?.id ? 'Anda: ' : ''}</span>
                      {conv.last_message.content}
                    </>
                  ) : (
                    <span className="italic opacity-50">No messages yet</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    )
  }

  if (loading && !conversations.length) {
    return (
      <div className="flex">
        <Sidebar role={role} />
        <div className="main-content w-full flex items-center justify-center h-screen bg-white">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#007AFF] mx-auto" />
            <p className="mt-4 text-gray-500 text-sm">Memuat percakapan...</p>
          </div>
        </div>
      </div>
    )
  }

  const visibleConversations = conversations.filter(c => hiddenChats[c.id] !== (c.last_message?.id || 'none') && c.last_message)
  const normalizedListQuery = listQuery.trim().toLowerCase()
  const filteredConversations = normalizedListQuery
    ? visibleConversations.filter((conv) => {
        const convName = (getConvName(conv) || '').toLowerCase()
        const lastContent = (conv.last_message?.content || '').toLowerCase()
        return convName.includes(normalizedListQuery) || lastContent.includes(normalizedListQuery)
      })
    : visibleConversations
  const unreadTotal = visibleConversations.reduce((acc, conv) => acc + (conv.unread_count || 0), 0)

  const styles = `
    /* Bouncing typing animation dots */
    .typing-dot {
      width: 6px;
      height: 6px;
      background-color: #8E8E93;
      border-radius: 50%;
      display: inline-block;
      animation: typing-bounce 1.4s infinite ease-in-out both;
    }
    .typing-dot:nth-child(1) { animation-delay: -0.32s; }
    .typing-dot:nth-child(2) { animation-delay: -0.16s; }
    
    @keyframes typing-bounce {
      0%, 80%, 100% { transform: scale(0.3); opacity: 0.3; }
      40% { transform: scale(1); opacity: 1; }
    }
  `;

  return (
    <div className="flex">
      <style>{styles}</style>
      <Sidebar role={role} />
      <div className="main-content w-full bg-white">
        <div className="flex h-screen overflow-hidden">
          {/* Sidebar - Conversation List */}
          <div className={`${showMobileList ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-[350px] lg:w-[380px] border-r border-gray-200/80 bg-[#F4F4F6]/90 backdrop-blur-xl flex-shrink-0 z-30`}>
            {/* Header */}
            <div className="pt-6 pb-2 px-5 sticky top-0 bg-[#F4F4F6]/90 backdrop-blur-md z-40">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.dispatchEvent(new CustomEvent('nf-sidebar-toggle'))}
                    className="lg:hidden text-gray-500 hover:text-gray-800 p-1.5 hover:bg-[#E3E3E8] rounded-xl transition-all flex items-center justify-center"
                    type="button"
                    aria-label="Toggle Sidebar"
                  >
                    <i className="fas fa-bars text-xl" />
                  </button>
                  <h2 className="text-[28px] font-bold text-gray-900 tracking-tight leading-none">Messages</h2>
                </div>
                <button onClick={() => setShowNewChat(true)} className="text-[#007AFF] hover:opacity-75 transition-opacity active:scale-95">
                  <i className="fas fa-plus-circle text-2xl" />
                </button>
              </div>
              <div className="relative group mb-2">
                <input 
                  type="text" 
                  value={listQuery}
                  onChange={(e) => setListQuery(e.target.value)}
                  placeholder="Search" 
                  className="w-full pl-9 pr-4 py-1.5 bg-[#E3E3E8] rounded-xl text-[14px] focus:outline-none placeholder-[#8E8E93] text-black transition-all border-none" 
                />
                <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-[#8E8E93] text-xs transition-colors" />
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-white text-[#5A6C94] border border-[#E3EAFF]">
                  {visibleConversations.length} chat
                </span>
                {unreadTotal > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#007AFF] text-white">
                    {unreadTotal} unread
                  </span>
                )}
              </div>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-x-hidden overflow-y-auto pb-4">
              {!normalizedListQuery ? (
                /* Mode 1: Search Empty -> show regular list */
                !filteredConversations.length ? (
                  <div className="p-8 text-center text-gray-400">
                    <i className="fas fa-comments text-4xl mb-3 text-gray-300 block" />
                    <p className="text-[14px]">No conversations yet</p>
                    <button onClick={() => setShowNewChat(true)} className="mt-3 text-[#007AFF] hover:underline text-sm font-semibold">Start a conversation</button>
                  </div>
                ) : (
                  <AnimatePresence>
                    {filteredConversations.map(conv => renderConvItem(conv))}
                  </AnimatePresence>
                )
              ) : (
                /* Mode 2: Searching -> show results grouped */
                <>
                  {/* Percakapan Aktif Section */}
                  {filteredConversations.length > 0 && (
                    <div className="mb-4">
                      <div className="px-5 py-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider select-none">
                        Percakapan Aktif ({filteredConversations.length})
                      </div>
                      <AnimatePresence>
                        {filteredConversations.map(conv => renderConvItem(conv))}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Cari Pengguna Lain Section */}
                  <div>
                    <div className="px-5 py-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider select-none flex items-center justify-between">
                      <span>Cari Pengguna Lain</span>
                      {searchingSidebar && (
                        <div className="w-3.5 h-3.5 border-2 border-[#007AFF]/30 border-t-[#007AFF] rounded-full animate-spin" />
                      )}
                    </div>

                    {!searchingSidebar && sidebarSearchResults.length === 0 ? (
                      <div className="px-5 py-3 text-xs text-gray-400 italic">
                        Tidak ada pengguna lain yang cocok
                      </div>
                    ) : (
                      <div className="space-y-1 mt-1">
                        {sidebarSearchResults.map(u => {
                          const initials = getInitials(u.name)
                          return (
                            <div 
                              key={u.id}
                              className="group mx-2 px-3 py-2.5 bg-white border border-[#E5E5EA] hover:bg-[#F2F2F7] active:bg-[#E5E5EA] text-black shadow-sm rounded-xl cursor-pointer transition-all duration-150 flex items-center justify-between"
                              onClick={() => startNewChat(u.id)}
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className="relative flex-shrink-0">
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#BAC6D1] to-[#A2ADB8] flex items-center justify-center text-white font-bold text-[14px]">
                                    <span>{initials}</span>
                                  </div>
                                  {onlineUsers.has(u.id) && (
                                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#34C759] rounded-full border-2 border-white shadow-sm" />
                                  )}
                                </div>
                                <div className="flex-grow min-w-0">
                                  <h4 className="font-semibold text-[13px] text-black truncate leading-tight">{u.name}</h4>
                                  <p className="text-[11px] text-gray-500 truncate leading-none mt-1">{u.email}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase ${getRoleBadge(u.role)}`}>{u.role}</span>
                                {startingChat === u.id ? (
                                  <i className="fas fa-spinner fa-spin text-[#007AFF] text-xs" />
                                ) : (
                                  <i className="fas fa-plus text-[#007AFF] text-xs opacity-60 group-hover:opacity-100 transition-opacity" />
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {filteredConversations.length === 0 && sidebarSearchResults.length === 0 && !searchingSidebar && (
                    <div className="p-8 text-center text-gray-400">
                      <i className="fas fa-search-minus text-4xl mb-3 text-gray-300 block" />
                      <p className="text-[14px]">Hasil pencarian tidak ditemukan</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Main Chat Area */}
          <div className={`${!showMobileList ? 'flex' : 'hidden'} md:flex flex-col flex-1 bg-white`}>
            {selectedConversation ? (
              <>
                {/* Chat Header (iMessage style centered) */}
                <div className="px-6 py-2.5 border-b border-[#E3E3E8] bg-white/90 backdrop-blur-xl sticky top-0 z-40 flex items-center justify-between shadow-sm">
                  <div className="flex items-center w-1/3">
                    <button onClick={() => setShowMobileList(true)} className="md:hidden flex items-center gap-1 text-[#007AFF] font-normal text-[17px] active:opacity-50">
                      <i className="fas fa-chevron-left" />
                      <span>Pesan</span>
                    </button>
                  </div>

                  <div className="flex flex-col items-center justify-center w-1/3 cursor-pointer group">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#BAC6D1] to-[#A2ADB8] text-white flex items-center justify-center text-[15px] font-bold shadow-sm transition-transform duration-200 group-hover:scale-105">
                      {selectedConversation.type === 'group' ? (
                        <i className="fas fa-users text-sm" />
                      ) : (
                        <span>{getInitials(getConvName(selectedConversation))}</span>
                      )}
                    </div>
                    <span className="font-semibold text-gray-900 text-[13px] mt-1 truncate max-w-full">{getConvName(selectedConversation)}</span>
                    <span className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                      <span>{selectedConversation.type === 'group' ? 'Grup' : 'iMessage'}</span>
                      <span className={`w-1.5 h-1.5 rounded-full ${isWsConnected ? 'bg-[#34C759]' : 'bg-red-400'}`} />
                    </span>
                  </div>

                  <div className="flex items-center justify-end gap-5 w-1/3 text-[#007AFF] text-[17px]">
                    <button className="hover:opacity-75 active:opacity-50">
                      <i className="fas fa-phone-alt" />
                    </button>
                    <button className="hover:opacity-75 active:opacity-50">
                      <i className="fas fa-video" />
                    </button>
                    <button className="hover:opacity-75 active:opacity-50">
                      <i className="fas fa-info-circle text-[19px]" />
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6 bg-white custom-scrollbar">
                  <div className="max-w-3xl mx-auto w-full space-y-1">
                    {messages.map((msg, i) => {
                      const showDate = i === 0 || formatDate(messages[i-1].created_at) !== formatDate(msg.created_at)
                      const isMine = msg.sender?.id === user?.id
                      const isSequential = i > 0 && messages[i-1].sender?.id === msg.sender?.id && !showDate
                      const isLastInSequence = i === messages.length - 1 || messages[i+1]?.sender?.id !== msg.sender?.id || (formatDate(messages[i+1].created_at) !== formatDate(msg.created_at))
                      
                      return (
                        <React.Fragment key={msg.id}>
                          {showDate && (
                            <div className="flex items-center justify-center my-6 select-none">
                              <span className="text-gray-400 text-[11px] font-semibold uppercase tracking-widest">{formatDate(msg.created_at)}</span>
                            </div>
                          )}
                          
                          {msg.message_type === 'system' ? (
                            <div className="flex items-center justify-center my-3 select-none">
                              <span className="px-3 py-1 bg-[#F2F2F7] text-gray-500 text-[11px] font-semibold rounded-full uppercase tracking-wider">
                                {msg.content}
                              </span>
                            </div>
                          ) : (
                            <motion.div 
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.15 }}
                              className={`flex w-full ${isMine ? 'justify-end' : 'justify-start'} group items-end gap-1.5 ${isSequential ? 'mt-[2px]' : 'mt-[10px]'}`}
                            >
                              {isMine && !msg.id.toString().startsWith('opt-') && (
                                <button 
                                  onClick={() => handleDeleteMessage(msg.id)} 
                                  className="opacity-0 group-hover:opacity-100 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 transition-all mr-2 self-center flex-shrink-0"
                                >
                                  <i className="fas fa-trash-alt text-xs" />
                                </button>
                              )}
                              
                              <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} max-w-[70%]`}>
                                {!isMine && !isSequential && selectedConversation.type === 'group' && (
                                  <div className="text-[11px] font-semibold text-gray-400 ml-3 mb-1 uppercase tracking-tight">{msg.sender?.name}</div>
                                )}
                                <div className={`relative px-4 py-2 text-[15px] leading-snug ${
                                  isMine 
                                    ? `bg-[#007AFF] text-white ${isLastInSequence ? 'rounded-[18px] rounded-br-[4px]' : 'rounded-[18px]'} ${msg.status === 'sending' ? 'opacity-70' : ''}` 
                                    : `bg-[#E9E9EB] text-black ${isLastInSequence ? 'rounded-[18px] rounded-bl-[4px]' : 'rounded-[18px]'}`
                                }`}>
                                  {msg.message_type === 'image' ? (
                                    <img src={resolveBackendAssetUrl(msg.file_url)} alt={msg.content} className="max-w-xs md:max-w-md rounded-xl shadow-sm cursor-pointer hover:opacity-95 transition-opacity" onClick={() => window.open(resolveBackendAssetUrl(msg.file_url), '_blank')} />
                                  ) : msg.message_type === 'file' ? (
                                    <a href={resolveBackendAssetUrl(msg.file_url)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 py-1 text-inherit hover:opacity-85 no-underline">
                                      <div className="w-10 h-10 rounded-lg bg-black/5 flex items-center justify-center text-lg flex-shrink-0">
                                        <i className="fas fa-file-alt" />
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <div className="font-semibold text-sm truncate leading-tight">{msg.content}</div>
                                        <div className="text-[11px] opacity-75 mt-0.5">
                                          {msg.file_size ? `${(msg.file_size / (1024 * 1024)).toFixed(2)} MB` : 'Unduh berkas'}
                                        </div>
                                      </div>
                                      <i className="fas fa-download text-sm opacity-60 ml-2 flex-shrink-0" />
                                    </a>
                                  ) : (
                                    renderMessageContent(msg.content, isMine)
                                  )}
                                  
                                  {/* Status Indicators */}
                                  {isMine && msg.status === 'sending' && (
                                    <div className="absolute -left-5 bottom-1">
                                      <div className="w-3 h-3 border-2 border-[#007AFF]/30 border-t-[#007AFF] rounded-full animate-spin" />
                                    </div>
                                  )}

                                  {/* SVG Tail */}
                                  {isLastInSequence && (
                                    isMine ? (
                                      <svg width="9" height="16" viewBox="0 0 9 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute bottom-0 -right-[8px] text-[#007AFF] pointer-events-none">
                                        <path d="M0 16C3 16 6 13 9 8C9 8 9 0 9 0C9 0 6 6 0 6V16Z" fill="currentColor"/>
                                      </svg>
                                    ) : (
                                      <svg width="9" height="16" viewBox="0 0 9 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute bottom-0 -left-[8px] text-[#E9E9EB] transform scale-x-[-1] pointer-events-none">
                                        <path d="M0 16C3 16 6 13 9 8C9 8 9 0 9 0C9 0 6 6 0 6V16Z" fill="currentColor"/>
                                      </svg>
                                    )
                                  )}
                                </div>
                                
                                {isMine && isLastInSequence && (
                                  <div className="flex items-center gap-1 mt-1 mr-1 select-none">
                                    <span className="text-[10px] font-medium text-gray-400">
                                      {msg.is_read ? 'Dibaca' : (msg.status === 'sending' ? 'Mengirim' : formatTime(msg.created_at))}
                                    </span>
                                    {msg.is_read && <i className="fas fa-check-double text-[8px] text-[#007AFF]" />}
                                  </div>
                                )}

                                {!isMine && isLastInSequence && (
                                  <div className="text-[10px] text-gray-400 mt-1 ml-1 font-medium select-none">
                                    {formatTime(msg.created_at)}
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </React.Fragment>
                      )
                    })}
                    {getTypingText() && (
                      <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start items-end mt-2 ml-1">
                        <div className="relative px-4 py-2.5 bg-[#E9E9EB] text-black rounded-[18px] rounded-bl-[4px] flex items-center gap-1.5 w-16 h-9 justify-center">
                          <span className="typing-dot" />
                          <span className="typing-dot" />
                          <span className="typing-dot" />
                          {/* SVG Tail for typing indicator */}
                          <svg width="9" height="16" viewBox="0 0 9 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute bottom-0 -left-[8px] text-[#E9E9EB] transform scale-x-[-1] pointer-events-none">
                            <path d="M0 16C3 16 6 13 9 8C9 8 9 0 9 0C9 0 6 6 0 6V16Z" fill="currentColor"/>
                          </svg>
                        </div>
                      </motion.div>
                    )}
                    {uploadingFile && (
                      <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="flex justify-end items-center mt-2 mr-2">
                        <div className="flex items-center gap-2 text-xs text-gray-500 bg-[#F2F2F7] px-3 py-1.5 rounded-full shadow-sm">
                          <div className="w-3.5 h-3.5 border-2 border-gray-400/30 border-t-gray-600 rounded-full animate-spin" />
                          <span>Mengirim file...</span>
                        </div>
                      </motion.div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </div>

                {/* Input (iMessage style) */}
                <form onSubmit={sendMessage} className="px-4 md:px-6 py-3 bg-[#F4F4F6]/95 backdrop-blur-xl border-t border-[#D2D2D7]/50 z-40">
                  <div className="max-w-4xl mx-auto flex items-center gap-2">
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileChange} 
                      className="hidden" 
                    />
                    
                    {/* Pill Input Container */}
                    <div className="flex-grow flex items-center bg-white border border-[#D2D2D7]/80 rounded-[20px] pl-2 pr-1.5 py-1 focus-within:border-[#007AFF]/60 focus-within:ring-1 focus-within:ring-[#007AFF]/30 transition-all">
                      {/* Attach button */}
                      <button 
                        type="button" 
                        onClick={handleAttachClick} 
                        className="w-8 h-8 flex items-center justify-center bg-[#007AFF] hover:bg-[#0066CC] text-white rounded-full active:scale-95 flex-shrink-0 mr-2 shadow-sm transition-all"
                        title="Unggah File/Gambar"
                      >
                        <i className="fas fa-plus text-[14px]" />
                      </button>
                      <textarea
                        value={newMessage} 
                        onChange={handleInputChange}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(e) } }}
                        placeholder="Kirim pesan"
                        className="flex-1 py-1.5 text-[15px] resize-none focus:outline-none bg-transparent max-h-32 self-center text-black placeholder-[#8E8E93] border-none focus:ring-0"
                        rows="1"
                      />
                      
                      {/* Emoji icon */}
                      <button type="button" className="w-8 h-8 flex items-center justify-center text-[#8E8E93] hover:text-[#007AFF] transition-colors rounded-full mr-1">
                        <i className="far fa-smile text-[18px]" />
                      </button>
                      
                      {/* Send button (iPhone style: circle with white arrow pointing up) */}
                      <button 
                        type="submit" 
                        disabled={!newMessage.trim() && !sending}
                        className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                          newMessage.trim() 
                            ? 'bg-[#007AFF] text-white scale-100' 
                            : 'bg-[#E9E9EB] text-[#8E8E93] scale-95 cursor-default'
                        }`}
                      >
                        {sending ? (
                          <i className="fas fa-spinner fa-spin text-xs" />
                        ) : (
                          <i className="fas fa-arrow-up text-xs font-bold" />
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#F4F4F6]/20">
                <div className="w-16 h-16 bg-white shadow-sm rounded-full flex items-center justify-center mb-4 border border-gray-100">
                  <i className="fas fa-comment-dots text-2xl text-gray-400" />
                </div>
                <h3 className="text-[17px] font-bold text-gray-700 mb-1">Mulai Obrolan</h3>
                <p className="text-[13px] text-gray-400 text-center max-w-sm">Pilih percakapan atau buat chat baru untuk mulai berkirim pesan.</p>
                <button onClick={() => setShowNewChat(true)} className="mt-6 text-[#007AFF] text-[15px] font-semibold hover:opacity-80 transition-opacity">
                  Pesan Baru
                </button>
              </div>
            )}
          </div>
        </div>

        {/* New Chat Modal */}
        {showNewChat && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[90] p-4" onClick={() => setShowNewChat(false)}>
            <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col shadow-[0_20px_40px_rgba(0,0,0,0.15)] border border-gray-200" onClick={e => e.stopPropagation()}>
              {/* Modal Header */}
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-[17px] font-bold text-black">Pesan Baru</h3>
                <button onClick={() => setShowNewChat(false)} className="text-[#007AFF] hover:opacity-85 font-medium text-sm">Batal</button>
              </div>

              {/* Search Bar / To Field (iOS Style) */}
              <div className="px-4 py-2 border-b border-gray-100 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-400">Kepada:</span>
                  <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Nama atau email..."
                    className="flex-1 py-1 text-sm text-black focus:outline-none border-none focus:ring-0"
                    autoFocus />
                </div>
                {/* Role Filter tags */}
                <div className="flex gap-1.5 flex-wrap py-1">
                  {ROLES.map(r => (
                    <button key={r.value} onClick={() => setRoleFilter(r.value)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                        roleFilter === r.value 
                          ? 'bg-[#007AFF] text-white' 
                          : 'bg-[#F2F2F7] text-gray-600 hover:bg-[#E5E5EA]'
                      }`}>
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search Results */}
              <div className="flex-grow overflow-y-auto p-2">
                {searching ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#007AFF] mx-auto" />
                    <p className="mt-2 text-gray-500 text-sm">Mencari...</p>
                  </div>
                ) : !searchResults.length ? (
                  <div className="text-center py-8 text-gray-400">
                    <i className="fas fa-users text-3xl mb-2 text-gray-200 block" />
                    <p className="text-sm">Pengguna tidak ditemukan</p>
                  </div>
                ) : (
                  searchResults.map(u => (
                    <div key={u.id} className="flex items-center gap-3 p-2.5 hover:bg-[#F2F2F7] rounded-xl cursor-pointer transition-colors group" onClick={() => startNewChat(u.id)}>
                      <div className="relative flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#BAC6D1] to-[#A2ADB8] flex items-center justify-center text-white">
                          <span className="font-semibold text-sm">{getInitials(u.name)}</span>
                        </div>
                        {onlineUsers.has(u.id) && <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#34C759] rounded-full border-2 border-white" />}
                      </div>
                      <div className="flex-grow min-w-0">
                        <h4 className="font-semibold text-sm text-black truncate">{u.name}</h4>
                        <p className="text-xs text-gray-500 truncate">{u.email}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${getRoleBadge(u.role)}`}>{u.role}</span>
                        {startingChat === u.id ? (
                          <i className="fas fa-spinner fa-spin text-[#007AFF]" />
                        ) : (
                          <i className="fas fa-chevron-right text-gray-300 group-hover:text-[#007AFF] transition-colors" />
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ChatPage
