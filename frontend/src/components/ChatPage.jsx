import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../services/api'
import useAuth from '../hooks/useAuth'
import Sidebar from './Sidebar'

const ROLES = [
  { value: '', label: 'Semua' },
  { value: 'mahasiswa', label: 'Mahasiswa' },
  { value: 'dosen', label: 'Dosen' },
  { value: 'admin', label: 'Admin' },
  { value: 'ukm', label: 'UKM' },
  { value: 'ormawa', label: 'Ormawa' },
]

const ChatPage = ({ role }) => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { conversationId } = useParams()
  const basePath = `/${role}/pesan`

  const [conversations, setConversations] = useState([])
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [typingUsers, setTypingUsers] = useState({})
  const [isWsConnected, setIsWsConnected] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState(new Set())
  const [showMobileList, setShowMobileList] = useState(true)

  // New Chat Modal state
  const [showNewChat, setShowNewChat] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [startingChat, setStartingChat] = useState(null)
  
  // Hidden chats (local swipe-to-delete)
  const [hiddenChats, setHiddenChats] = useState(() => {
    try { return JSON.parse(localStorage.getItem('hiddenChats')) || {} } 
    catch { return {} }
  })

  const messagesEndRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const searchTimeoutRef = useRef(null)
  const selectedConvRef = useRef(null)

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
      api.webSocket.disconnect()
      api.webSocket.removeMessageCallback(handleWsMessage)
    }
  }, [user])

  // Select conversation from URL
  useEffect(() => {
    if (conversationId && conversations.length) {
      const targetId = parseInt(conversationId)
      if (selectedConvRef.current?.id !== targetId) {
        const conv = conversations.find(c => c.id === targetId)
        if (conv) {
          // Jika percakapan disembunyikan tapi diakses via URL, maka tampilkan kembali
          setHiddenChats(prev => {
            if (prev[conv.id]) {
              const newHidden = { ...prev }
              delete newHidden[conv.id]
              localStorage.setItem('hiddenChats', JSON.stringify(newHidden))
              return newHidden
            }
            return prev
          })
          selectConversation(conv)
        } else {
          // Jika tidak ada, kembalikan ke basePath
          navigate(basePath, { replace: true })
        }
      }
    }
  }, [conversationId, conversations])

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // Search users debounced
  useEffect(() => {
    if (!showNewChat) return
    // Don't search if query is empty and no role filter
    if (!searchQuery.trim() && !roleFilter) {
      setSearchResults([])
      return
    }
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

  const loadConversations = async () => {
    try {
      const r = await api.getConversations()
      if (r.data?.success) {
        setConversations(r.data.data || [])
        if (!selectedConvRef.current && r.data.data?.length > 0 && !conversationId) {
          selectConversation(r.data.data[0])
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
    setSending(true)
    try {
      await api.sendMessage(selectedConversation.id, { conversation_id: selectedConversation.id, content: newMessage.trim(), message_type: 'text' })
      setNewMessage('')
      api.webSocket.sendTypingIndicator(selectedConversation.id, false)
    } catch (e) { console.error('Send:', e) }
    setSending(false)
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

  const handleWsMessage = useCallback((msg) => {
    const currentConv = selectedConvRef.current
    switch (msg.type) {
      case 'new_message':
        if (msg.data.conversation_id === currentConv?.id) {
          setMessages(prev => [...prev, msg.data.message])
        }
        setConversations(prev => prev.map(c =>
          c.id === msg.data.conversation_id
            ? { ...c, last_message: msg.data.message, unread_count: c.id === currentConv?.id ? 0 : (c.unread_count || 0) + 1, updated_at: new Date().toISOString() }
            : c
        ))
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
        setShowNewChat(false)
        setSearchQuery('')
        setRoleFilter('')
        await loadConversations()
        const convId = r.data.data
        if (convId) navigate(`${basePath}/${convId}`)
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

  const getTypingText = () => {
    const t = Object.values(typingUsers).filter(x => x.isTyping && Date.now() - x.ts < 3000)
    if (!t.length) return null
    return t.length === 1 ? `${t[0].name} sedang mengetik...` : `${t.length} orang sedang mengetik...`
  }

  const getRoleBadge = (r) => {
    const m = { dosen: 'bg-amber-100 text-amber-800', admin: 'bg-red-100 text-red-800', mahasiswa: 'bg-blue-100 text-blue-800', ukm: 'bg-green-100 text-green-800', ormawa: 'bg-purple-100 text-purple-800' }
    return m[r] || 'bg-gray-100 text-gray-800'
  }

  if (loading && !conversations.length) {
    return (
      <div className="flex">
        <Sidebar role={role} />
        <div className="main-content w-full flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lp-accent mx-auto" />
            <p className="mt-4 text-lp-text2">Memuat percakapan...</p>
          </div>
        </div>
      </div>
    )
  }

  const visibleConversations = conversations.filter(c => hiddenChats[c.id] !== (c.last_message?.id || 'none'))

  return (
    <div className="flex">
      <Sidebar role={role} />
      <div className="main-content w-full">
        <div className="flex h-screen">
          {/* Sidebar - Conversation List */}
          <div className={`${showMobileList ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-[360px] lg:w-[380px] border-r border-gray-200 bg-white flex-shrink-0`}>
            {/* Header */}
            <div className="pt-6 pb-2 px-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[28px] font-bold text-black tracking-tight">Messages</h2>
                <button onClick={() => setShowNewChat(true)} className="text-[#007AFF] hover:opacity-80 transition-opacity p-1">
                  <i className="far fa-edit text-xl" />
                </button>
              </div>
              <div className="relative mb-2">
                <input type="text" placeholder="Search" className="w-full pl-9 pr-4 py-1.5 bg-[#E3E3E8]/70 border-none rounded-lg text-[15px] focus:outline-none placeholder-gray-500 text-black" />
                <i className="fas fa-search absolute left-3 top-2.5 text-gray-500 text-[13px]" />
              </div>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-x-hidden overflow-y-auto">
              {!visibleConversations.length ? (
                <div className="p-8 text-center text-lp-text3">
                  <i className="fas fa-comments text-4xl mb-3 text-gray-300 block" />
                  <p>Belum ada percakapan</p>
                  <button onClick={() => setShowNewChat(true)} className="mt-3 text-lp-accent hover:underline text-sm">Mulai percakapan baru</button>
                </div>
              ) : (
                <AnimatePresence>
                  {visibleConversations.map(conv => (
                    <motion.div 
                      key={conv.id}
                      layout
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                      className="relative border-b border-gray-100 bg-red-500"
                    >
                      {/* Background Delete Button */}
                      <div className="absolute inset-y-0 right-0 w-20 flex items-center justify-center">
                        <button onClick={(e) => handleHideConversation(e, conv)} title="Hapus chat" className="w-full h-full text-white flex flex-col items-center justify-center hover:bg-red-600 transition-colors">
                          <i className="fas fa-trash mb-1" />
                          <span className="text-[10px] font-medium">Hapus</span>
                        </button>
                      </div>
                      {/* Draggable Foreground */}
                      <motion.div 
                        drag="x"
                        dragConstraints={{ left: -80, right: 0 }}
                        dragElastic={0.1}
                        className={`px-4 py-3 cursor-pointer relative z-10 transition-colors ${selectedConversation?.id === conv.id ? 'bg-blue-50 border-l-[3px] border-l-[#007AFF]' : 'bg-white hover:bg-gray-50'}`} 
                        onClick={() => selectConversation(conv)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative flex-shrink-0">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#007AFF]/20 to-[#007AFF]/5 flex items-center justify-center border border-gray-200">
                              {conv.type === 'group' ? <i className="fas fa-users text-[#007AFF] text-lg" /> : <span className="font-semibold text-[#007AFF] text-lg">{getConvName(conv)?.[0]?.toUpperCase() || '?'}</span>}
                            </div>
                            {conv.type === 'private' && conv.participants && (() => {
                              const other = conv.participants.find(p => p.user_id !== user?.id)
                              return other && onlineUsers.has(other.user_id) ? <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white" /> : null
                            })()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-baseline mb-0.5">
                              <h3 className="font-semibold text-gray-900 text-[15px] truncate">{getConvName(conv)}</h3>
                              {conv.last_message && <span className="text-xs text-gray-400 flex-shrink-0 ml-2">{formatTime(conv.last_message.created_at)}</span>}
                            </div>
                            <div className="flex justify-between items-center">
                              <p className="text-[13px] text-gray-500 truncate pr-2">
                                {conv.last_message ? <><span className={conv.last_message.sender?.id === user?.id ? "" : "font-medium"}>{conv.last_message.sender?.id === user?.id ? 'Anda:' : ''}</span> {conv.last_message.content}</> : <span className="italic text-gray-400">Belum ada pesan</span>}
                              </p>
                              {conv.unread_count > 0 && <span className="bg-[#007AFF] text-white text-[11px] rounded-full h-5 min-w-[20px] px-1 flex items-center justify-center font-medium flex-shrink-0">{conv.unread_count}</span>}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </div>

          {/* Main Chat Area */}
          <div className={`${!showMobileList ? 'flex' : 'hidden'} md:flex flex-col flex-1 bg-white`}>
            {selectedConversation ? (
              <>
                {/* Chat Header (iMessage style) */}
                <div className="px-4 py-3 border-b border-gray-200 bg-white/80 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between">
                  <button onClick={() => setShowMobileList(true)} className="md:hidden text-[#007AFF] p-1 flex items-center gap-1">
                    <i className="fas fa-chevron-left text-lg" />
                    <span className="text-sm">Kembali</span>
                  </button>
                  <div className="flex-1 flex flex-col items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mb-1 overflow-hidden">
                      {selectedConversation.type === 'group' ? <i className="fas fa-users text-gray-500 text-xs" /> : <span className="font-medium text-gray-600 text-xs">{getConvName(selectedConversation)?.[0]?.toUpperCase() || '?'}</span>}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <h2 className="font-semibold text-gray-900 text-[13px] leading-none">{getConvName(selectedConversation)}</h2>
                      <div className={`w-1.5 h-1.5 rounded-full ${isWsConnected ? 'bg-green-500' : 'bg-red-400'}`} />
                    </div>
                  </div>
                  <div className="w-8 md:w-0" /> {/* Spacer for centering */}
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-4 bg-white flex flex-col gap-1.5">
                  {messages.map((msg, i) => {
                    const showDate = i === 0 || formatDate(messages[i-1].created_at) !== formatDate(msg.created_at)
                    const isMine = msg.sender?.id === user?.id
                    const isSequential = i > 0 && messages[i-1].sender?.id === msg.sender?.id && !showDate
                    const isLastInSequence = i === messages.length - 1 || messages[i+1]?.sender?.id !== msg.sender?.id || (formatDate(messages[i+1].created_at) !== formatDate(msg.created_at))
                    
                    return (
                      <React.Fragment key={msg.id}>
                        {showDate && <div className="text-center my-4"><span className="text-gray-400 text-[11px] font-medium">{formatDate(msg.created_at)}</span></div>}
                        {msg.message_type === 'system' ? (
                          <div className="text-center my-2"><span className="text-[11px] text-gray-400">{msg.content}</span></div>
                        ) : (
                          <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} group items-end`}>
                            {isMine && (
                              <button onClick={() => handleDeleteMessage(msg.id)} title="Hapus pesan" className="opacity-0 group-hover:opacity-100 text-red-500 transition-opacity p-2 text-xs mr-1">
                                <i className="fas fa-trash" />
                              </button>
                            )}
                            <div className="flex flex-col max-w-[70%]">
                              {!isMine && !isSequential && selectedConversation.type === 'group' && (
                                <div className="text-[11px] text-gray-500 ml-3 mb-1">{msg.sender?.name}</div>
                              )}
                              <div className={`px-4 py-2 text-[15px] leading-relaxed ${
                                isMine 
                                  ? `bg-[#007AFF] text-white ${isLastInSequence ? 'rounded-2xl rounded-br-sm' : 'rounded-2xl'}` 
                                  : `bg-[#E9E9EB] text-black ${isLastInSequence ? 'rounded-2xl rounded-bl-sm' : 'rounded-2xl'}`
                              }`}>
                                {msg.message_type === 'image' ? <img src={msg.file_url} alt="" className="max-w-full rounded-xl" /> : <div className="whitespace-pre-wrap">{msg.content}</div>}
                              </div>
                              {isMine && isLastInSequence && msg.is_read && (
                                <div className="text-[10px] text-gray-400 text-right mt-1 mr-1">Dibaca</div>
                              )}
                            </div>
                          </div>
                        )}
                      </React.Fragment>
                    )
                  })}
                  {getTypingText() && (
                    <div className="flex justify-start items-end gap-2 mt-1">
                      <div className="bg-[#E9E9EB] rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1">
                        {[0,0.15,0.3].map((d,i) => <div key={i} className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay:`${d}s`}} />)}
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input (iMessage style) */}
                <form onSubmit={sendMessage} className="px-4 py-3 bg-white/90 backdrop-blur-md border-t border-gray-200">
                  <div className="flex items-end gap-3 bg-white border border-gray-300 rounded-3xl pl-4 pr-1 py-1 focus-within:border-[#007AFF]">
                    <textarea
                      value={newMessage} onChange={handleInputChange}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(e) } }}
                      placeholder="iMessage"
                      className="flex-1 py-2 text-[15px] resize-none focus:outline-none bg-transparent max-h-32 self-center mt-1"
                      rows="1" disabled={sending}
                    />
                    <button type="submit" disabled={!newMessage.trim() || sending}
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mb-0.5 transition-colors ${newMessage.trim() && !sending ? 'bg-[#007AFF] text-white' : 'bg-transparent text-gray-300'}`}>
                      {sending ? <i className="fas fa-spinner fa-spin text-sm" /> : <i className="fas fa-arrow-up text-sm" />}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#F3F3F5]">
                <div className="w-16 h-16 bg-white shadow-sm rounded-full flex items-center justify-center mb-4">
                  <i className="fas fa-comment-dots text-2xl text-gray-400" />
                </div>
                <h3 className="text-[17px] font-semibold text-gray-500 mb-1">To:</h3>
                <p className="text-[13px] text-gray-400 text-center max-w-md">Select a conversation to start messaging</p>
                <button onClick={() => setShowNewChat(true)} className="mt-6 text-[#007AFF] text-[15px] font-medium hover:underline transition-colors">
                  New Message
                </button>
              </div>
            )}
          </div>
        </div>

        {/* New Chat Modal */}
        {showNewChat && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[90] p-4" onClick={() => setShowNewChat(false)}>
            <div className="bg-lp-surface rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl border border-lp-border" onClick={e => e.stopPropagation()}>
              {/* Modal Header */}
              <div className="p-5 border-b border-lp-border">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-lp-text tracking-tight">Chat Baru</h3>
                  <button onClick={() => setShowNewChat(false)} className="text-lp-text3 hover:text-lp-text2 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-lp-bg transition-colors"><i className="fas fa-times" /></button>
                </div>

                {/* Role Filter */}
                <div className="flex gap-1.5 mb-3 flex-wrap">
                  {ROLES.map(r => (
                    <button key={r.value} onClick={() => setRoleFilter(r.value)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${roleFilter === r.value ? 'bg-lp-accent text-white' : 'bg-lp-bg text-lp-text2 border border-lp-border hover:border-lp-accent/30'}`}>
                      {r.label}
                    </button>
                  ))}
                </div>

                {/* Search Input */}
                <div className="relative">
                  <i className="fas fa-search absolute left-3 top-2.5 text-lp-text3 text-sm" />
                  <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Cari nama atau email..."
                    className="w-full pl-9 pr-4 py-2 bg-lp-bg border border-lp-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-lp-accent/30"
                    autoFocus />
                </div>
              </div>

              {/* Search Results */}
              <div className="flex-1 overflow-y-auto p-2">
                {searching ? (
                  <div className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lp-accent mx-auto" /><p className="mt-2 text-lp-text3 text-sm">Mencari...</p></div>
                ) : !searchResults.length ? (
                  <div className="text-center py-8 text-lp-text3">
                    <i className="fas fa-users text-3xl mb-3 text-gray-300 block" />
                    <p className="text-sm">{searchQuery ? 'Tidak ditemukan' : 'Ketik untuk mencari pengguna'}</p>
                  </div>
                ) : (
                  searchResults.map(u => (
                    <div key={u.id} className="flex items-center gap-3 p-3 hover:bg-lp-bg rounded-xl cursor-pointer transition-colors group" onClick={() => startNewChat(u.id)}>
                      <div className="relative flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-lp-accent/20 to-lp-accent/5 flex items-center justify-center border border-lp-border">
                          <span className="font-bold text-lp-accent text-sm">{u.name?.[0]?.toUpperCase() || '?'}</span>
                        </div>
                        {onlineUsers.has(u.id) && <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-lp-surface" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm text-lp-text truncate">{u.name}</h4>
                        <p className="text-xs text-lp-text3 truncate">{u.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${getRoleBadge(u.role)}`}>{u.role}</span>
                        {startingChat === u.id ? <i className="fas fa-spinner fa-spin text-lp-accent" /> : <i className="fas fa-comment text-lp-accent opacity-0 group-hover:opacity-100 transition-opacity" />}
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
