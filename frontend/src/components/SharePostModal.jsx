// components/SharePostModal.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import api from '../services/api'
import useAuth from '../hooks/useAuth'
import { resolveBackendAssetUrl } from '../utils/assetUrl'
import { FaTimes, FaCheck, FaPaperPlane, FaSearch } from 'react-icons/fa'

const getInitials = (name) => {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return parts[0].substring(0, 2).toUpperCase()
}

const SharePostModal = ({ post, onClose }) => {
  const { user } = useAuth()
  const [conversations, setConversations] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedTargets, setSelectedTargets] = useState([]) // [ { id, type, targetId, name } ]
  const [sendStatus, setSendStatus] = useState({}) // { [id]: 'idle' | 'sending' | 'sent' | 'error' }
  const [sendingAll, setSendingAll] = useState(false)
  const searchTimeoutRef = useRef(null)
  const inputRef = useRef(null)

  // Build the share message payload
  const buildSharePayload = useCallback(() => {
    const mediaUrl = (() => {
      if (Array.isArray(post.media) && post.media.length > 0) return post.media[0].media_url
      if (post.media_url) return post.media_url
      return null
    })()

    return JSON.stringify({
      type: 'share_post',
      post_id: post.id,
      author_name: post.author_name || post.author_username || 'Unknown',
      author_avatar: post.author_avatar || null,
      author_role: post.role || 'mahasiswa',
      content: (post.content || '').substring(0, 200),
      media_url: mediaUrl,
      title: post.title || null,
    })
  }, [post])

  // Load conversations on mount
  useEffect(() => {
    const load = async () => {
      try {
        const r = await api.getConversations()
        if (r.data?.success) {
          setConversations(r.data.data || [])
        }
      } catch (e) {
        console.error('Load conversations for share:', e)
      }
      setLoading(false)
    }
    load()
    setTimeout(() => inputRef.current?.focus(), 200)
  }, [])

  // Debounced user search
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }
    setSearching(true)
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const r = await api.searchUsers(searchQuery, '')
        if (r.data?.success) {
          // Exclude self
          const results = (r.data.data || []).filter(u => u.id !== user?.id)
          setSearchResults(results)
        }
      } catch (e) {
        console.error('Search users for share:', e)
        setSearchResults([])
      }
      setSearching(false)
    }, 350)
    return () => clearTimeout(searchTimeoutRef.current)
  }, [searchQuery, user])

  // Get display name for conversation
  const getConvName = (conv) => {
    if (conv.type === 'private' && conv.participants) {
      const other = conv.participants.find(p => p.user_id !== user?.id)
      return other?.user?.name || conv.name
    }
    return conv.name
  }

  // Toggle selection target
  const toggleTarget = (target) => {
    const status = sendStatus[target.id]
    if (status === 'sending' || status === 'sent') return // Prevent toggling if busy or done
    
    setSelectedTargets(prev => {
      const exists = prev.some(t => t.id === target.id)
      if (exists) {
        return prev.filter(t => t.id !== target.id)
      } else {
        return [...prev, target]
      }
    })
  }

  // Send to all selected targets
  const handleSendAll = async () => {
    if (selectedTargets.length === 0 || sendingAll) return
    setSendingAll(true)

    // Mark all selected targets as sending
    const initialStatus = {}
    selectedTargets.forEach(t => {
      initialStatus[t.id] = 'sending'
    })
    setSendStatus(prev => ({ ...prev, ...initialStatus }))

    const promises = selectedTargets.map(async (target) => {
      try {
        if (target.type === 'conversation') {
          await api.sendMessage(target.targetId, {
            content: buildSharePayload(),
            message_type: 'text',
          })
        } else {
          // Create or get existing private conversation
          const r = await api.createConversation({ type: 'private', participants: [target.targetId] })
          if (r.data?.success) {
            const convId = r.data.data
            await api.sendMessage(convId, {
              content: buildSharePayload(),
              message_type: 'text',
            })
          } else {
            throw new Error('Failed to create conversation')
          }
        }
        setSendStatus(prev => ({ ...prev, [target.id]: 'sent' }))
        return { id: target.id, success: true }
      } catch (e) {
        console.error('Share post target error:', target, e)
        setSendStatus(prev => ({ ...prev, [target.id]: 'error' }))
        return { id: target.id, success: false }
      }
    })

    const results = await Promise.all(promises)
    const allSucceeded = results.every(r => r.success)

    setSendingAll(false)

    if (allSucceeded) {
      // Set all-level status to sent and auto close
      setSendStatus(prev => ({ ...prev, all: 'sent' }))
      setTimeout(() => {
        onClose()
      }, 800)
    } else {
      // If some failed, keep the modal open, but remove the successful ones from selected list
      const succeededIds = results.filter(r => r.success).map(r => r.id)
      setSelectedTargets(prev => prev.filter(t => !succeededIds.includes(t.id)))
    }
  }

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const getRoleBadge = (r) => {
    const m = {
      dosen: 'bg-amber-100 text-amber-700',
      admin: 'bg-red-100 text-red-700',
      mahasiswa: 'bg-blue-100 text-blue-700',
      ukm: 'bg-green-100 text-green-700',
      ormawa: 'bg-purple-100 text-purple-700',
    }
    return m[r] || 'bg-gray-100 text-gray-700'
  }

  // Filter conversations by search query
  const filteredConversations = searchQuery.trim()
    ? conversations.filter(c => {
        const name = (getConvName(c) || '').toLowerCase()
        return name.includes(searchQuery.trim().toLowerCase())
      })
    : conversations.filter(c => c.last_message) // Only show convos with messages

  // Post preview card
  const postPreviewUrl = (() => {
    if (Array.isArray(post.media) && post.media.length > 0) return resolveBackendAssetUrl(post.media[0].media_url)
    if (post.media_url) return resolveBackendAssetUrl(post.media_url)
    return null
  })()

  // Selection indicator component
  const SelectionCircle = ({ isSelected, status }) => {
    if (status === 'sending') {
      return (
        <div className="w-5 h-5 border-2 border-[#007AFF]/30 border-t-[#007AFF] rounded-full animate-spin flex-shrink-0" />
      )
    }
    if (status === 'sent') {
      return (
        <div className="w-5 h-5 rounded-full bg-[#34C759] text-white flex items-center justify-center flex-shrink-0">
          <FaCheck className="text-[9px]" />
        </div>
      )
    }
    if (status === 'error') {
      return (
        <div className="w-5 h-5 rounded-full bg-red-100 border border-red-300 text-red-500 flex items-center justify-center flex-shrink-0" title="Gagal mengirim">
          <span className="text-[10px] font-bold">!</span>
        </div>
      )
    }
    return (
      <div
        className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
          isSelected
            ? 'bg-[#007AFF] border-[#007AFF] text-white scale-105'
            : 'border-gray-300 hover:border-gray-400 bg-white'
        }`}
      >
        {isSelected && <FaCheck className="text-[8px]" />}
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-[100] p-0 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.97 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="bg-white w-full sm:w-full sm:max-w-md max-h-[85vh] sm:max-h-[80vh] flex flex-col shadow-[0_20px_60px_rgba(0,0,0,0.2)] sm:rounded-2xl rounded-t-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[17px] font-bold text-gray-900 tracking-tight">Bagikan Postingan</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
            >
              <FaTimes className="text-sm" />
            </button>
          </div>

          {/* Post preview */}
          <div className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl border border-gray-100 mb-3">
            {postPreviewUrl ? (
              <img
                src={postPreviewUrl}
                alt="Post"
                className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center flex-shrink-0">
                <span className="text-gray-400 text-lg">📝</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-semibold text-gray-800 truncate">
                {post.author_name || post.author_username || 'Unknown'}
              </div>
              <div className="text-[11px] text-gray-500 truncate leading-tight mt-0.5">
                {(post.content || 'Postingan tanpa teks').substring(0, 60)}{(post.content || '').length > 60 ? '...' : ''}
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari nama atau percakapan..."
              className="w-full pl-9 pr-4 py-2 bg-gray-100 rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 focus:bg-white focus:border-[#007AFF]/40 border border-transparent placeholder-gray-400 text-gray-900 transition-all"
            />
          </div>
        </div>

        {/* Selected Targets Horizontal Scroll */}
        {selectedTargets.length > 0 && (
          <div 
            className="flex items-center gap-2 py-2 overflow-x-auto border-b border-gray-100 px-5 bg-gray-50/50 flex-shrink-0"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {selectedTargets.map(target => (
              <div
                key={target.id}
                onClick={() => toggleTarget(target)}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-red-50 border border-gray-200 hover:border-red-200 rounded-full flex-shrink-0 text-[12px] text-gray-700 hover:text-red-600 font-medium cursor-pointer transition-colors group"
              >
                <span className="truncate max-w-[100px]">{target.name}</span>
                <FaTimes className="text-gray-400 group-hover:text-red-500 text-[10px] transition-colors" />
              </div>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-[#007AFF]/30 border-t-[#007AFF] rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Existing Conversations */}
              {filteredConversations.length > 0 && (
                <div>
                  <div className="px-5 pt-3 pb-1.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    Percakapan
                  </div>
                  {filteredConversations.map(conv => {
                    const convName = getConvName(conv)
                    const initials = getInitials(convName)
                    const isSelected = selectedTargets.some(t => t.id === conv.id)
                    const status = sendStatus[conv.id] || 'idle'
                    return (
                      <div
                        key={conv.id}
                        onClick={() => toggleTarget({ id: conv.id, type: 'conversation', targetId: conv.id, name: convName })}
                        className="flex items-center gap-3 px-5 py-2.5 hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer select-none"
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#BAC6D1] to-[#A2ADB8] text-white flex items-center justify-center text-[13px] font-bold flex-shrink-0">
                          {conv.type === 'group' ? (
                            <i className="fas fa-users text-sm" />
                          ) : (
                            <span>{initials}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-semibold text-gray-900 truncate">{convName}</div>
                          <div className="text-[11px] text-gray-400 truncate">
                            {conv.type === 'group' ? 'Grup' : 'Chat pribadi'}
                          </div>
                        </div>
                        <SelectionCircle isSelected={isSelected} status={status} />
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Search Results (Users without existing conversations) */}
              {searchQuery.trim() && (
                <div>
                  <div className="px-5 pt-3 pb-1.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <span>Pengguna</span>
                    {searching && (
                      <div className="w-3 h-3 border-2 border-[#007AFF]/30 border-t-[#007AFF] rounded-full animate-spin" />
                    )}
                  </div>
                  {searchResults.length > 0 ? (
                    searchResults.map(u => {
                      const isSelected = selectedTargets.some(t => t.id === `user-${u.id}`)
                      const status = sendStatus[`user-${u.id}`] || 'idle'
                      return (
                        <div
                          key={u.id}
                          onClick={() => toggleTarget({ id: `user-${u.id}`, type: 'user', targetId: u.id, name: u.name })}
                          className="flex items-center gap-3 px-5 py-2.5 hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer select-none"
                        >
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#BAC6D1] to-[#A2ADB8] text-white flex items-center justify-center text-[13px] font-bold flex-shrink-0">
                            {getInitials(u.name)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-semibold text-gray-900 truncate">{u.name}</div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase ${getRoleBadge(u.role)}`}>
                                {u.role}
                              </span>
                              <span className="text-[11px] text-gray-400 truncate">{u.email}</span>
                            </div>
                          </div>
                          <SelectionCircle isSelected={isSelected} status={status} />
                        </div>
                      )
                    })
                  ) : !searching ? (
                    <div className="px-5 py-6 text-center text-gray-400 text-[13px]">
                      Tidak ada pengguna ditemukan
                    </div>
                  ) : null}
                </div>
              )}

              {/* Empty State */}
              {filteredConversations.length === 0 && !searchQuery.trim() && (
                <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                  <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                    <FaPaperPlane className="text-gray-400 text-xl -rotate-12" />
                  </div>
                  <p className="text-[14px] font-semibold text-gray-700">Belum ada percakapan</p>
                  <p className="text-[12px] text-gray-400 mt-1">Cari nama pengguna untuk memulai</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-gray-100 flex-shrink-0 bg-white flex flex-col gap-2">
          {selectedTargets.length > 0 ? (
            <button
              onClick={handleSendAll}
              disabled={sendingAll || sendStatus.all === 'sent'}
              className={`w-full py-2.5 font-semibold text-[14px] rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                sendStatus.all === 'sent'
                  ? 'bg-[#34C759] text-white cursor-default'
                  : 'bg-[#007AFF] hover:bg-[#0066CC] disabled:bg-[#007AFF]/60 disabled:cursor-not-allowed text-white shadow-[0_4px_12px_rgba(0,122,255,0.2)]'
              }`}
            >
              {sendingAll ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Mengirim ke {selectedTargets.length} Penerima...</span>
                </>
              ) : sendStatus.all === 'sent' ? (
                <>
                  <FaCheck className="text-xs" />
                  <span>✓ Berhasil Terkirim!</span>
                </>
              ) : (
                <>
                  <FaPaperPlane className="text-xs -rotate-12" />
                  <span>Kirim ke {selectedTargets.length} Penerima</span>
                </>
              )}
            </button>
          ) : (
            <div className="text-[12px] text-gray-400 text-center py-2">
              Pilih satu atau lebih percakapan untuk mengirim postingan
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

export default SharePostModal
