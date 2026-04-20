// src/services/api.js
import axios from 'axios'
import { getBackendBaseUrl, getBackendWebSocketBaseUrl } from '../utils/backendUrl'

const api = axios.create({
  baseURL: getBackendBaseUrl(),
  timeout: 10000,
})

// ===================== INTERCEPTORS =====================
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Jangan hapus token & reload halaman jika error 401 terjadi saat login
    const isLoginEndpoint = error.config && error.config.url && error.config.url.includes('/api/auth/login');
    if (error.response?.status === 401 && !isLoginEndpoint) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/'
    }
    // Tangkap error 500, 404, 403 (Forbidden/Invalid URL), 400, atau Network Error (0 / undefined)
    const status = error.response ? error.response.status : 0;
    const isErrorRedirectable = status === 500 || status === 404 || status === 403 || status === 400 || status === 0;

    // Jangan redirect jika error berasal dari endpoint 'stats' atau 'profile' (biarkan komponen menangani loading/error state sendiri)
    const isStatsOrProfile = error.config && error.config.url && (error.config.url.includes('stats') || error.config.url.includes('profile'));

    // Jangan redirect jika error 400 dari login (agar pesan error username/password salah bisa muncul)
    if (isErrorRedirectable && (!isLoginEndpoint || status !== 400) && !isStatsOrProfile) {
      if (!window.location.pathname.includes('/not-found')) {
        window.location.href = '/not-found';
      }
    }

    return Promise.reject(error)
  }
)

// ==============================================================
// ==================== CHAT ROUTES =============================
// ==============================================================

// Conversations
api.getConversations = () => api.get('/api/chat/conversations')
api.getConversationDetail = (conversationId) => 
  api.get(`/api/chat/conversations/${conversationId}`)
api.createConversation = (data) => api.post('/api/chat/conversations', data)

// Messages
api.getMessages = (conversationId, params = {}) => 
  api.get(`/api/chat/conversations/${conversationId}/messages`, { params })
api.sendMessage = (conversationId, data) => 
  api.post(`/api/chat/conversations/${conversationId}/messages`, data)
api.markMessagesAsRead = (conversationId) => 
  api.post(`/api/chat/conversations/${conversationId}/messages/read`)

// Group Management
api.createMatkulGroup = (mataKuliahId) => 
  api.post('/api/chat/groups/matkul', { mata_kuliah_id: Number(mataKuliahId) }, { headers: { 'Content-Type': 'application/json' } })
// Get Mata Kuliah groups
api.getMatkulGroups = () => api.get('/api/chat/groups/matkul')

// Contacts
api.getContacts = () => api.get('/api/chat/contacts')

// Utility
api.getChatStats = () => api.get('/api/chat/stats')
api.pinConversation = (conversationId) => 
  api.post(`/api/chat/conversations/${conversationId}/pin`)
api.unpinConversation = (conversationId) => 
  api.delete(`/api/chat/conversations/${conversationId}/pin`)

// ==============================================================
// =========== WEBSOCKET SERVICE FOR REAL-TIME CHAT =============
// ==============================================================

class WebSocketService {
  constructor() {
    this.socket = null
    this.messageCallbacks = []
    this.connectionCallbacks = []
    this.typingCallbacks = []
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this.reconnectDelay = 1000
    this.isConnected = false
    this.heartbeatInterval = null
  }

  connect() {
    const token = localStorage.getItem('token')
    if (!token) {
      console.error('No token found')
      return
    }

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      return
    }

    const wsUrl = `${getBackendWebSocketBaseUrl()}/ws/chat?token=${encodeURIComponent(token)}`
    this.socket = new WebSocket(wsUrl)

    this.socket.onopen = () => {
      console.log('WebSocket connected')
      this.isConnected = true
      this.reconnectAttempts = 0
      this.connectionCallbacks.forEach(cb => cb(true))
      
      // Start heartbeat
      this.startHeartbeat()
    }

    this.socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        this.messageCallbacks.forEach(cb => cb(message))
        
        // Handle typing indicators separately
        if (message.type === 'typing') {
          this.typingCallbacks.forEach(cb => cb(message.data))
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error)
      }
    }

    this.socket.onclose = (event) => {
      console.log('WebSocket disconnected:', event.code, event.reason)
      this.isConnected = false
      this.connectionCallbacks.forEach(cb => cb(false))
      
      // Stop heartbeat
      this.stopHeartbeat()
      
      // Attempt reconnection
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++
        console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
        
        setTimeout(() => {
          this.connect()
        }, this.reconnectDelay * this.reconnectAttempts)
      }
    }

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error)
      this.connectionCallbacks.forEach(cb => cb(false))
    }
  }

  disconnect() {
    if (this.socket) {
      this.stopHeartbeat()
      this.socket.close()
      this.socket = null
      this.isConnected = false
    }
  }

  sendMessage(message) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message))
      return true
    }
    return false
  }

  sendChatMessage(conversationId, content, messageType = 'text', fileInfo = null) {
    const message = {
      type: 'new_message',
      data: {
        conversation_id: conversationId,
        content: content,
        message_type: messageType,
        ...fileInfo
      }
    }
    return this.sendMessage(message)
  }

  sendTypingIndicator(conversationId, isTyping) {
    const message = {
      type: 'typing',
      data: {
        conversation_id: conversationId,
        is_typing: isTyping
      }
    }
    return this.sendMessage(message)
  }

  sendReadReceipt(conversationId, messageId) {
    const message = {
      type: 'message_read',
      data: {
        conversation_id: conversationId,
        message_id: messageId
      }
    }
    return this.sendMessage(message)
  }

  onMessage(callback) {
    this.messageCallbacks.push(callback)
  }

  onConnectionChange(callback) {
    this.connectionCallbacks.push(callback)
  }

  onTyping(callback) {
    this.typingCallbacks.push(callback)
  }

  removeMessageCallback(callback) {
    this.messageCallbacks = this.messageCallbacks.filter(cb => cb !== callback)
  }

  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        this.sendMessage({ type: 'ping' })
      }
    }, 25000) // Send ping every 25 seconds
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  getConnectionStatus() {
    return this.isConnected && this.socket && this.socket.readyState === WebSocket.OPEN
  }
}

// Create singleton instance
const webSocketService = new WebSocketService()

// Export WebSocket service
api.webSocket = webSocketService

// ==============================================================
// ==================== ADMIN ROUTES ============================
// ==============================================================

api.getAdminProfile = () => api.get('/api/admin/profile')
api.getUKTMahasiswa = () => api.get('/api/admin/ukt/mahasiswa')
api.getRiwayatPembayaranMahasiswa = (id) => api.get(`/api/admin/ukt/riwayat/${id}`)
api.sendReminder = (id) => api.post(`/api/admin/ukt/reminder/${id}`)
api.getUnpaidInvoices = () => api.get('/api/admin/invoices/unpaid')

api.createAdminPost = (formData) =>
  api.post('/api/admin/posts', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

// ==============================================================
// ==================== UKT ROUTES ==============================
// ==============================================================

api.getSisaUKT = () => api.get('/api/ukt/sisa')
api.getRiwayatPembayaran = (status = 'all') => api.get(`/api/ukt/riwayat?status=${status}`)
api.createPayment = (data) => api.post('/api/ukt/bayar', data)

api.getInvoiceURL = (uuid) => api.get(`/api/ukt/invoice/${uuid}`)
api.checkPaymentStatus = (uuid) => api.get(`/api/ukt/status/${uuid}`)
api.getPaymentDetails = (uuid) => api.get(`/api/ukt/details/${uuid}`)
api.manualPaymentConfirm = (data) => api.post('/api/ukt/manual-confirm', data)
api.initUKTData = () => api.post('/api/ukt/init')
api.deleteExpiredPayments = () => api.delete('/api/ukt/expired')
api.cancelPayment = (uuid) => api.post(`/api/ukt/cancel/${uuid}`)

// ==============================================================
// ================= ORANG TUA ROUTES ===========================
// ==============================================================

api.getAnakProfile = () => api.get('/api/ortu/profile/anak')
api.getOrtuProfile = () => api.get('/api/ortu/profile')
api.getChildAttendance = (studentId) => api.get(`/api/ortu/anak/absensi/${studentId}`)
api.createPaymentForChild = (data) => api.post('/api/ortu/ukt/bayar', data)

// ==============================================================
// ================== MAHASISWA ROUTES ==========================
// ==============================================================

api.getMahasiswaCourses = () => api.get('/api/mahasiswa/courses')
api.getMahasiswaProfile = () => api.get('/api/mahasiswa/profile')

api.updateMahasiswaProfile = (formData) =>
  api.put('/api/mahasiswa/profile', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

api.getPertemuanByMatkul = (courseId) =>
  api.get(`/api/mahasiswa/matkul/${courseId}/pertemuan`)

api.getPertemuanDetail = (courseId, pertemuan) =>
  api.get(`/api/mahasiswa/matkul/${courseId}/pertemuan/${pertemuan}`)

api.getSubmissionStatus = (taskId) =>
  api.get(`/api/mahasiswa/tugas/${taskId}/status`)

api.submitTugas = (formData) =>
  api.post('/api/mahasiswa/tugas/submit', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

api.getMahasiswaTugasList = () =>
  api.get('/api/mahasiswa/tugas')

api.getMahasiswaTugasByCourse = (courseId) =>
  api.get(`/api/mahasiswa/tugas/course/${courseId}`)

// === Absensi Mahasiswa ===
api.getTodaySchedule = () => api.get('/api/mahasiswa/jadwal/hari-ini')

api.scanAttendance = (data) =>
  api.post('/api/mahasiswa/absensi/scan', data)

api.getAttendanceSummary = () =>
  api.get('/api/mahasiswa/absensi/summary')

api.getAttendanceHistory = (filters = {}) => {
  const params = new URLSearchParams(filters).toString()
  return api.get(`/api/mahasiswa/absensi/riwayat${params ? '?' + params : ''}`)
}

// API BARU UNTUK FILTER HARI
api.getMahasiswaCoursesByDay = (hari) => 
  api.get(`/api/mahasiswa/courses/day/${hari}`)

// API untuk riwayat absensi per mata kuliah
api.getAttendanceByCourse = (courseId) =>
  api.get(`/api/mahasiswa/absensi/course/${courseId}`)

// API untuk semua pertemuan attendance
api.getAllPertemuanAttendance = () =>
  api.get('/api/mahasiswa/absensi/pertemuan-all')

api.getAttendanceByCoursePertemuan = (courseId) =>
  api.get(`/api/mahasiswa/absensi/pertemuan?course_id=${courseId}`)

// ==============================================================
// ======================= DOSEN ROUTES =========================
// ==============================================================

api.getDosenCourses = () => api.get('/api/dosen/courses')
api.getDosenProfile = () => api.get('/api/dosen/profile')
api.getDosenStats = () => api.get('/api/dosen/stats')
api.updateDosenProfile = (data) => api.put('/api/dosen/profile', data)

// === Materi & Tugas ===
api.uploadMateri = (data) =>
  api.post('/api/dosen/materi/upload', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

api.createTugas = (data) =>
  api.post('/api/dosen/tugas', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

api.getTugasSubmissions = (courseId, pertemuan = null) => {
  const url = pertemuan
    ? `/api/dosen/tugas/${courseId}/submissions?pertemuan=${pertemuan}`
    : `/api/dosen/tugas/${courseId}/submissions`
  return api.get(url)
}

api.gradeSubmission = (submissionId, grade) =>
  api.put(`/api/dosen/tugas/${submissionId}/grade`, { grade })

api.deleteSubmission = (submissionId) =>
  api.delete(`/api/dosen/submissions/${submissionId}`)

api.deleteMateri = (materiId) =>
  api.delete(`/api/dosen/materi/${materiId}/delete`)

api.deleteTugas = (tugasId) =>
  api.delete(`/api/dosen/tugas/${tugasId}/delete`)

// === Pertemuan ===
api.getDosenPertemuanList = (courseId) =>
  api.get(`/api/dosen/matkul/${courseId}/pertemuan`)

api.getDosenPertemuanDetail = (courseId, pertemuan) =>
  api.get(`/api/dosen/matkul/${courseId}/pertemuan/${pertemuan}`)

// === Absensi Dosen ===
api.createAttendanceSession = (data) =>
  api.post('/api/dosen/absensi/create', data)

api.getActiveSessions = (filters = {}) => {
  const params = new URLSearchParams(filters).toString()
  return api.get(`/api/dosen/absensi/active${params ? '?' + params : ''}`)
}

api.getAttendanceSessionDetail = (sessionId) =>
  api.get(`/api/dosen/absensi/${sessionId}`)

api.refreshSessionToken = (data) =>
  api.post('/api/dosen/absensi/refresh-token', data)

api.updateAttendanceStatus = (data) =>
  api.post('/api/dosen/absensi/update-status', data)

api.closeAttendanceSession = (data) =>
  api.post('/api/dosen/absensi/close', data)

api.getAttendanceSummary = (courseId, pertemuanKe) => {
  const params = new URLSearchParams()
  if (courseId) params.append('course_id', courseId)
  if (pertemuanKe) params.append('pertemuan_ke', pertemuanKe)

  return api.get(`/api/dosen/absensi/summary${params.toString() ? '?' + params.toString() : ''}`)
}

api.getQRCode = (token) =>
  api.get(`/api/dosen/absensi/qr/${token}`)

// API BARU UNTUK RIWAYAT PERTEMUAN DOSEN
api.getRiwayatPertemuanDosen = (courseId, pertemuanKe) => {
  const params = new URLSearchParams()
  if (courseId) params.append('course_id', courseId)
  if (pertemuanKe) params.append('pertemuan_ke', pertemuanKe)
  
  return api.get(`/api/dosen/absensi/riwayat-pertemuan${params.toString() ? '?' + params.toString() : ''}`)
}

// API BARU UNTUK REALTIME ATTENDANCE
api.getRealtimeAttendance = (sessionId) =>
  api.get(`/api/dosen/absensi/realtime/${sessionId}`)

// ==============================================================
// ============== FUNGSI UMUM UNTUK KELOLA MATKUL ===============
// ==============================================================

// Fungsi baru untuk KelolaMatkulDosen.jsx
api.getPertemuanList = (courseId, role = 'dosen') => {
  if (role === 'dosen') {
    return api.get(`/api/dosen/matkul/${courseId}/pertemuan`)
  } else {
    return api.get(`/api/mahasiswa/matkul/${courseId}/pertemuan`)
  }
}

// ==============================================================
// ==================== STANDARD METHODS ========================
// ==============================================================

api.get = (url, config) => api.request({ method: 'GET', url, ...config })
api.post = (url, data, config) =>
  api.request({ method: 'POST', url, data, ...config })
api.put = (url, data, config) =>
  api.request({ method: 'PUT', url, data, ...config })
api.delete = (url, config) =>
  api.request({ method: 'DELETE', url, ...config })

export default api