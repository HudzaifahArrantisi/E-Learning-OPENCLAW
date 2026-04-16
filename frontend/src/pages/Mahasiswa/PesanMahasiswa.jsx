import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../services/api'
import useAuth from '../../hooks/useAuth'
import Navbar from '../../components/Navbar'
import Sidebar from '../../components/Sidebar'

const ChatMahasiswa = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { conversationId } = useParams()
  
  const [conversations, setConversations] = useState([])
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [contacts, setContacts] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [typingUsers, setTypingUsers] = useState({})
  const [showContacts, setShowContacts] = useState(false)
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false)
  
  const messagesEndRef = useRef(null)
  const typingTimeoutRef = useRef(null)

  useEffect(() => {
    loadConversations()
    loadContacts()
    
    // Connect WebSocket
    if (user) {
      api.webSocket.connect()
      
      // Set up WebSocket listeners
      api.webSocket.onMessage(handleWebSocketMessage)
      api.webSocket.onConnectionChange(handleConnectionChange)
      api.webSocket.onTyping(handleTyping)
    }

    return () => {
      api.webSocket.disconnect()
      api.webSocket.removeMessageCallback(handleWebSocketMessage)
    }
  }, [user])

  useEffect(() => {
    if (conversationId) {
      const conv = conversations.find(c => c.id === parseInt(conversationId))
      if (conv) {
        selectConversation(conv)
      }
    }
  }, [conversationId, conversations])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const loadConversations = async () => {
    try {
      const response = await api.getConversations()
      if (response.data.success) {
        setConversations(response.data.data)
        
        // If no conversation selected, select the first one
        if (!selectedConversation && response.data.data.length > 0 && !conversationId) {
          selectConversation(response.data.data[0])
        }
      }
    } catch (error) {
      console.error('Error loading conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadContacts = async () => {
    try {
      const response = await api.getContacts()
      if (response.data.success) {
        setContacts(response.data.data)
      }
    } catch (error) {
      console.error('Error loading contacts:', error)
    }
  }

  const selectConversation = async (conversation) => {
    setSelectedConversation(conversation)
    setMessages([])
    
    // Update URL
    navigate(`/chat/${conversation.id}`)
    
    // Load messages
    loadMessages(conversation.id)
    
    // Mark messages as read
    await api.markMessagesAsRead(conversation.id)
    
    // Update conversation in list
    setConversations(prev => 
      prev.map(c => 
        c.id === conversation.id 
          ? { ...c, unread_count: 0 } 
          : c
      )
    )
  }

  const loadMessages = async (conversationId) => {
    try {
      const response = await api.getMessages(conversationId)
      if (response.data.success) {
        setMessages(response.data.data)
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedConversation || sending) return

    setSending(true)
    
    try {
      await api.sendMessage(selectedConversation.id, {
        content: newMessage.trim(),
        message_type: 'text'
      })
      
      // Clear input
      setNewMessage('')
      
      // Clear typing indicator
      api.webSocket.sendTypingIndicator(selectedConversation.id, false)
      
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setSending(false)
    }
  }

  const handleTyping = (typingData) => {
    if (typingData.conversation_id === selectedConversation?.id) {
      setTypingUsers(prev => ({
        ...prev,
        [typingData.user_id]: {
          name: typingData.user_name,
          isTyping: typingData.is_typing,
          timestamp: Date.now()
        }
      }))
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(e)
    }
  }

  const handleInputChange = (e) => {
    const value = e.target.value
    setNewMessage(value)
    
    // Send typing indicator
    if (selectedConversation) {
      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      
      // Send typing indicator
      if (value.length > 0) {
        api.webSocket.sendTypingIndicator(selectedConversation.id, true)
      }
      
      // Set timeout to stop typing indicator
      typingTimeoutRef.current = setTimeout(() => {
        if (selectedConversation) {
          api.webSocket.sendTypingIndicator(selectedConversation.id, false)
        }
      }, 2000)
    }
  }

  const handleWebSocketMessage = (message) => {
    switch (message.type) {
      case 'new_message':
        if (message.data.conversation_id === selectedConversation?.id) {
          setMessages(prev => [...prev, message.data.message])
        }
        
        // Update conversation list
        setConversations(prev => 
          prev.map(conv => {
            if (conv.id === message.data.conversation_id) {
              return {
                ...conv,
                last_message: message.data.message,
                unread_count: conv.id === selectedConversation?.id ? 0 : conv.unread_count + 1,
                updated_at: new Date().toISOString()
              }
            }
            return conv
          })
        )
        break
        
      case 'message_read':
        // Update message read status
        if (message.data.conversation_id === selectedConversation?.id) {
          setMessages(prev => 
            prev.map(msg => 
              msg.id === message.data.message_id 
                ? { ...msg, is_read: true, read_at: message.data.read_at }
                : msg
            )
          )
        }
        break
        
      case 'new_conversation':
        // Add new conversation to list
        loadConversations()
        break
        
      case 'connected':
        console.log('WebSocket connected:', message.data)
        setIsWebSocketConnected(true)
        break
        
      case 'typing':
        if (message.data.conversation_id === selectedConversation?.id) {
          handleTyping(message.data)
        }
        break
    }
  }

  const handleConnectionChange = (connected) => {
    console.log('WebSocket connection:', connected ? 'connected' : 'disconnected')
    setIsWebSocketConnected(connected)
  }

  const startNewChat = async (contactId) => {
    try {
      const response = await api.createConversation({
        type: 'private',
        participants: [contactId]
      })
      
      if (response.data.success) {
        // Reload conversations
        await loadConversations()
        
        // Close contacts modal
        setShowContacts(false)
        
        // Select the new conversation
        if (response.data.data) {
          const newConv = conversations.find(c => c.id === response.data.data)
          if (newConv) {
            selectConversation(newConv)
          } else {
            // If not found in current list, reload conversations
            loadConversations()
          }
        }
      }
    } catch (error) {
      console.error('Error starting new chat:', error)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const formatTime = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const today = new Date()
    
    if (date.toDateString() === today.toDateString()) {
      return 'Hari ini'
    }
    
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Kemarin'
    }
    
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short'
    })
  }

  const handleFileUpload = async (file) => {
    if (!selectedConversation) return
    
    // Create form data
    const formData = new FormData()
    formData.append('file', file)
    
    try {
      // Upload file to server (you need to implement file upload endpoint)
      const uploadResponse = await api.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      if (uploadResponse.data.success) {
        // Send message with file
        await api.sendMessage(selectedConversation.id, {
          content: file.name,
          message_type: file.type.startsWith('image/') ? 'image' : 'file',
          file_url: uploadResponse.data.url,
          file_name: file.name,
          file_size: file.size
        })
      }
    } catch (error) {
      console.error('Error uploading file:', error)
    }
  }

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (contact.nim && contact.nim.includes(searchQuery)) ||
    (contact.nip && contact.nip.includes(searchQuery))
  )

  const getTypingIndicatorText = () => {
    const typing = Object.values(typingUsers).filter(t => t.isTyping)
    if (typing.length === 0) return null
    
    // Remove old typing indicators (older than 3 seconds)
    const now = Date.now()
    Object.keys(typingUsers).forEach(userId => {
      if (now - typingUsers[userId].timestamp > 3000) {
        setTypingUsers(prev => {
          const updated = { ...prev }
          delete updated[userId]
          return updated
        })
      }
    })
    
    if (typing.length === 1) {
      return `${typing[0].name} sedang mengetik...`
    } else if (typing.length === 2) {
      return `${typing[0].name} dan ${typing[1].name} sedang mengetik...`
    } else {
      return `${typing.length} orang sedang mengetik...`
    }
  }

  if (loading && conversations.length === 0) {
    return (
      <div className="flex">
        <Sidebar role="mahasiswa" />
        <div className="main-content w-full">
          <Navbar user={user} />
          <div className="flex items-center justify-center h-[calc(100vh-80px)]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-4 text-lp-text2 font-light">Memuat percakapan...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex">
      <Sidebar role="mahasiswa" />
      <div className="main-content w-full">
        <Navbar user={user} />
        
        <div className="flex h-[calc(100vh-80px)]">
          {/* Sidebar - Daftar Percakapan */}
          <div className="w-1/3 border-r border-lp-border border bg-lp-surface">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Pesan</h2>
                <button
                  onClick={() => setShowContacts(true)}
                  className="bg-lp-accent hover:bg-lp-accent text-white px-4 py-2 rounded-lg flex items-center"
                >
                  <span className="mr-2">+</span> Chat Baru
                </button>
              </div>
              
              <div className="relative">
                <input
                  type="text"
                  placeholder="Cari percakapan..."
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <i className="fas fa-search absolute right-3 top-3 text-gray-400"></i>
              </div>
            </div>
            
            <div className="overflow-y-auto h-[calc(100vh-180px)]">
              {conversations.length === 0 ? (
                <div className="p-8 text-center text-lp-text3 font-light">
                  <i className="fas fa-comments text-4xl mb-4 text-gray-300"></i>
                  <p>Belum ada percakapan</p>
                  <button
                    onClick={() => setShowContacts(true)}
                    className="mt-4 text-lp-atext hover:text-lp-atext"
                  >
                    Mulai percakapan baru
                  </button>
                </div>
              ) : (
                conversations.map(conv => (
                  <div
                    key={conv.id}
                    className={`p-4 border-b cursor-pointer hover:bg-lp-bg transition-colors ${
                      selectedConversation?.id === conv.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                    }`}
                    onClick={() => selectConversation(conv)}
                  >
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                          {conv.type === 'group' ? (
                            <i className="fas fa-users text-lp-atext"></i>
                          ) : conv.mata_kuliah ? (
                            <i className="fas fa-book text-lp-green"></i>
                          ) : (
                            <i className="fas fa-user text-lp-text3 font-light"></i>
                          )}
                        </div>
                      </div>
                      
                      <div className="ml-3 flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <h3 className="font-semibold text-lp-text font-bold tracking-tight truncate">
                            {conv.name}
                            {conv.is_pinned && (
                              <i className="fas fa-thumbtack ml-2 text-yellow-500 text-xs"></i>
                            )}
                          </h3>
                          {conv.last_message && (
                            <span className="text-xs text-lp-text3 font-light">
                              {formatTime(conv.last_message.created_at)}
                            </span>
                          )}
                        </div>
                        
                        {conv.last_message ? (
                          <p className="text-sm text-lp-text2 font-light truncate mt-1">
                            <span className="font-medium">
                              {conv.last_message.sender.id === user.id ? 'Anda' : conv.last_message.sender.name}:
                            </span>{' '}
                            {conv.last_message.content}
                          </p>
                        ) : (
                          <p className="text-sm text-lp-text3 font-light italic mt-1">Belum ada pesan</p>
                        )}
                        
                        <div className="flex justify-between items-center mt-2">
                          {conv.mata_kuliah && (
                            <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
                              {conv.mata_kuliah.kode}
                            </span>
                          )}
                          
                          {conv.unread_count > 0 && (
                            <span className="bg-lp-accent text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                              {conv.unread_count}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col">
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b bg-lp-surface flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                      {selectedConversation.type === 'group' ? (
                        <i className="fas fa-users text-lp-atext"></i>
                      ) : selectedConversation.mata_kuliah ? (
                        <i className="fas fa-book text-lp-green"></i>
                      ) : (
                        <i className="fas fa-user text-lp-text3 font-light"></i>
                      )}
                    </div>
                    <div>
                      <h2 className="font-bold text-lg">{selectedConversation.name}</h2>
                      {selectedConversation.mata_kuliah && (
                        <p className="text-sm text-lp-text2 font-light">
                          {selectedConversation.mata_kuliah.kode} - {selectedConversation.mata_kuliah.nama}
                        </p>
                      )}
                      {selectedConversation.type === 'group' && (
                        <p className="text-sm text-lp-text2 font-light">
                          {selectedConversation.participants.length} peserta
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${isWebSocketConnected ? 'bg-lp-green' : 'bg-red-500'}`} 
                         title={isWebSocketConnected ? 'Terhubung' : 'Terputus'} />
                    
                    {selectedConversation.type === 'group' && (
                      <button
                        onClick={() => {
                          // Show group info modal
                        }}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                        title="Info Grup"
                      >
                        <i className="fas fa-info-circle text-lp-text2 font-light"></i>
                      </button>
                    )}
                    
                    <button
                      onClick={() => {
                        if (selectedConversation.is_pinned) {
                          api.unpinConversation(selectedConversation.id)
                          setSelectedConversation(prev => ({ ...prev, is_pinned: false }))
                          setConversations(prev => 
                            prev.map(c => 
                              c.id === selectedConversation.id 
                                ? { ...c, is_pinned: false }
                                : c
                            )
                          )
                        } else {
                          api.pinConversation(selectedConversation.id)
                          setSelectedConversation(prev => ({ ...prev, is_pinned: true }))
                          setConversations(prev => 
                            prev.map(c => 
                              c.id === selectedConversation.id 
                                ? { ...c, is_pinned: true }
                                : c
                            )
                          )
                        }
                      }}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                      title={selectedConversation.is_pinned ? "Unpin percakapan" : "Pin percakapan"}
                    >
                      <i className={`fas fa-thumbtack ${selectedConversation.is_pinned ? 'text-yellow-500' : 'text-lp-text2 font-light'}`}></i>
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 bg-lp-bg">
                  {messages.map((msg, index) => {
                    const showDate = index === 0 || 
                      formatDate(messages[index-1].created_at) !== formatDate(msg.created_at)
                    
                    return (
                      <React.Fragment key={msg.id}>
                        {showDate && (
                          <div className="text-center my-4">
                            <span className="bg-gray-200 text-lp-text2 text-xs px-3 py-1 rounded-full">
                              {formatDate(msg.created_at)}
                            </span>
                          </div>
                        )}
                        
                        <div
                          className={`flex ${msg.sender.id === user.id ? 'justify-end' : 'justify-start'} mb-4`}
                        >
                          <div
                            className={`max-w-[70%] rounded-lg p-3 ${
                              msg.sender.id === user.id
                                ? 'bg-lp-accent text-white rounded-br-none'
                                : 'bg-lp-surface text-lp-text font-semibold tracking-tight rounded-bl-none border border-lp-border border'
                            }`}
                          >
                            {msg.sender.id !== user.id && (
                              <div className="font-bold text-sm mb-1">
                                {msg.sender.name}
                                {msg.sender.role === 'dosen' && (
                                  <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                                    Dosen
                                  </span>
                                )}
                                {msg.sender.role === 'admin' && (
                                  <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                                    Admin
                                  </span>
                                )}
                              </div>
                            )}
                            
                            {msg.message_type === 'image' ? (
                              <img
                                src={msg.file_url}
                                alt={msg.file_name}
                                className="max-w-full rounded mt-1"
                              />
                            ) : msg.message_type === 'file' ? (
                              <a
                                href={msg.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center p-2 bg-gray-100 rounded hover:bg-gray-200"
                              >
                                <i className="fas fa-file text-lp-text2 font-light mr-2"></i>
                                <div>
                                  <p className="font-medium">{msg.file_name}</p>
                                  <p className="text-xs text-lp-text3 font-light">
                                    {(msg.file_size / 1024).toFixed(1)} KB
                                  </p>
                                </div>
                              </a>
                            ) : msg.message_type === 'system' ? (
                              <div className="text-center italic text-lp-text2 font-light">
                                {msg.content}
                              </div>
                            ) : (
                              <div className="whitespace-pre-wrap">{msg.content}</div>
                            )}
                            
                            <div className={`text-xs mt-2 flex items-center justify-end ${msg.sender.id === user.id ? 'text-blue-200' : 'text-lp-text3 font-light'}`}>
                              <span>{formatTime(msg.created_at)}</span>
                              {msg.sender.id === user.id && (
                                <span className="ml-2">
                                  {msg.is_read ? (
                                    <i className="fas fa-check-double text-blue-300"></i>
                                  ) : (
                                    <i className="fas fa-check text-gray-400"></i>
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </React.Fragment>
                    )
                  })}
                  
                  {/* Typing Indicator */}
                  {getTypingIndicatorText() && (
                    <div className="flex justify-start mb-4">
                      <div className="bg-lp-surface border border-lp-border border rounded-lg rounded-bl-none p-3">
                        <div className="flex items-center">
                          <div className="flex space-x-1 mr-2">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                          </div>
                          <span className="text-sm text-lp-text2 font-light">{getTypingIndicatorText()}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <form onSubmit={sendMessage} className="p-4 border-t bg-lp-surface">
                  <div className="flex items-end">
                    <div className="flex-1">
                      <textarea
                        value={newMessage}
                        onChange={handleInputChange}
                        onKeyPress={handleKeyPress}
                        placeholder="Ketik pesan..."
                        className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        rows="1"
                        disabled={sending}
                      />
                      
                      <div className="flex justify-between items-center mt-2">
                        <div className="flex space-x-2">
                          <button
                            type="button"
                            className="text-lp-text3 font-light hover:text-lp-text2"
                            title="Emoji"
                          >
                            <i className="fas fa-smile"></i>
                          </button>
                        </div>
                        
                        <button
                          type="submit"
                          disabled={!newMessage.trim() || sending}
                          className={`px-6 py-2 rounded-lg font-medium ${
                            newMessage.trim() && !sending
                              ? 'bg-lp-accent hover:bg-lp-accent text-white'
                              : 'bg-gray-200 text-lp-text3 font-light cursor-not-allowed'
                          }`}
                        >
                          {sending ? (
                            <i className="fas fa-spinner fa-spin"></i>
                          ) : (
                            'Kirim'
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl mb-4 text-gray-300">
                    <i className="fas fa-comments"></i>
                  </div>
                  <h3 className="text-xl font-semibold text-lp-text2 mb-2">
                    Pilih percakapan
                  </h3>
                  <p className="text-lp-text3 font-light">
                    Pilih percakapan dari daftar atau mulai percakapan baru
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Contacts Modal */}
        {showContacts && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-lp-surface rounded-lg w-full max-w-md max-h-[80vh] flex flex-col">
              <div className="p-6 border-b">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold">Pilih Kontak</h3>
                  <button
                    onClick={() => setShowContacts(false)}
                    className="text-lp-text3 font-light hover:text-lp-text2"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>
                
                <div className="relative mb-4">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari kontak..."
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <i className="fas fa-search absolute right-3 top-3 text-gray-400"></i>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-2">
                {filteredContacts.length === 0 ? (
                  <div className="text-center py-8 text-lp-text3 font-light">
                    <i className="fas fa-users text-4xl mb-4 text-gray-300"></i>
                    <p>Tidak ada kontak ditemukan</p>
                  </div>
                ) : (
                  filteredContacts.map(contact => (
                    <div
                      key={contact.id}
                      className="flex items-center p-3 hover:bg-lp-bg rounded-lg cursor-pointer"
                      onClick={() => startNewChat(contact.id)}
                    >
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                        {contact.role === 'dosen' ? (
                          <i className="fas fa-user-tie text-lp-atext"></i>
                        ) : contact.role === 'admin' ? (
                          <i className="fas fa-cog text-red-500"></i>
                        ) : (
                          <span className="font-medium text-lp-atext">
                            {contact.name.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold truncate">{contact.name}</h4>
                        <p className="text-sm text-lp-text2 font-light truncate">
                          {contact.role === 'mahasiswa' && contact.nim && `NIM: ${contact.nim}`}
                          {contact.role === 'dosen' && contact.nip && `NIP: ${contact.nip}`}
                          {contact.role === 'admin' && 'Administrator'}
                        </p>
                      </div>
                      <button className="text-lp-atext hover:text-lp-atext">
                        <i className="fas fa-comment"></i>
                      </button>
                    </div>
                  ))
                )}
              </div>
              
              <div className="p-4 border-t">
                <button
                  onClick={() => setShowContacts(false)}
                  className="w-full py-2 border border-lp-border border rounded-lg text-lp-text2 hover:bg-lp-bg"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ChatMahasiswa