import React, { useState, useEffect, useRef } from 'react'
import { useMutation, useQuery } from "@tanstack/react-query"
import api from '../../services/api'
import Sidebar from '../../components/Sidebar'
import Navbar from '../../components/Navbar'

import { 
  FaQrcode, 
  FaUsers, 
  FaClock, 
  FaFilter,
  FaCheckCircle,
  FaTimesCircle,
  FaUserCheck,
  FaUserTimes,
  FaStopCircle,
  FaSync,
  FaChartBar,
  FaCalendarAlt,
  FaKey,
  FaHourglassHalf,
  FaEdit,
  FaTrash,
  FaEye,
  FaHistory,
  FaCalendarWeek,
  FaUserCircle
} from 'react-icons/fa'
import { QRCodeSVG } from 'qrcode.react'

const AbsensiDosen = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [courseID, setCourseID] = useState('')
  const [duration, setDuration] = useState(15)
  const [pertemuanKe, setPertemuanKe] = useState(1)
  const [activeSession, setActiveSession] = useState(null)
  const [filterPertemuan, setFilterPertemuan] = useState('')
  const [filterCourse, setFilterCourse] = useState('')
  const [qrToken, setQrToken] = useState('')
  const [showManualModal, setShowManualModal] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [manualStatus, setManualStatus] = useState('hadir')
  const refreshIntervalRef = useRef(null)

  // Query untuk mata kuliah dosen
  const { data: courses, isLoading: loadingCourses, refetch: refetchCourses } = useQuery({
    queryKey: ['dosenCourses'],
    queryFn: () => api.getDosenCourses().then(res => res.data.data),
    enabled: true
  })

  // Query untuk sesi aktif dengan filter
  const { data: activeSessions, refetch: refetchSessions, isLoading: loadingSessions } = useQuery({
    queryKey: ['activeSessions', filterPertemuan, filterCourse],
    queryFn: () => {
      const params = {}
      if (filterPertemuan) params.pertemuan_ke = filterPertemuan
      if (filterCourse) params.course_id = filterCourse
      return api.getActiveSessions(params).then(res => res.data.data)
    },
    enabled: true,
    refetchInterval: 10000 // Refresh setiap 10 detik
  })

  // Query untuk riwayat pertemuan
  const { data: pertemuanHistory, refetch: refetchHistory } = useQuery({
    queryKey: ['pertemuanHistory'],
    queryFn: () => api.getRiwayatPertemuanDosen().then(res => res.data.data),
    enabled: true
  })

  // Mutation untuk create session dengan pertemuan
  const createSessionMutation = useMutation({
    mutationFn: (data) => api.createAttendanceSession(data),
    onSuccess: (response) => {
      console.log('Session created:', response.data)
      const sessionData = response.data.data
      setActiveSession({
        session_id: sessionData.session_id,
        course_name: sessionData.course_name,
        session_token: sessionData.session_token,
        expires_at: sessionData.expires_at,
        pertemuan_ke: sessionData.pertemuan_ke,
        qr_token: sessionData.qr_token,
        created_at: sessionData.created_at,
        course_id: sessionData.course_id
      })
      setQrToken(sessionData.session_token)
      refetchSessions()
      refetchCourses()
      // Start auto-refresh setelah session dibuat
      startAutoRefresh(sessionData.session_id)
    },
    onError: (error) => {
      console.error('Error creating session:', error)
      const errorMsg = error.response?.data?.message || error.message
      alert('Gagal membuat sesi: ' + errorMsg)
    }
  })

  // Mutation untuk refresh token
  const refreshTokenMutation = useMutation({
    mutationFn: (sessionId) => {
      if (!sessionId) {
        return Promise.reject(new Error('No session ID'))
      }
      return api.refreshSessionToken({ session_id: sessionId })
    },
    onSuccess: (response) => {
      console.log('Token refreshed:', response.data)
      if (activeSession) {
        const newToken = response.data.data.session_token
        setActiveSession(prev => ({
          ...prev,
          session_token: newToken,
          updated_at: response.data.data.updated_at
        }))
        setQrToken(newToken)
      }
    },
    onError: (error) => {
      console.error('Refresh token error:', error)
      const errorMsg = error.response?.data?.message || error.message
      // Jika error 400 atau 404, stop auto-refresh
      if (error.response?.status === 400 || error.response?.status === 404) {
        stopAutoRefresh()
        alert('Sesi sudah tidak aktif. Silakan buat sesi baru.')
        setActiveSession(null)
      }
    }
  })

  // Mutation untuk update status manual
  const updateStatusMutation = useMutation({
    mutationFn: (data) => api.updateAttendanceStatus(data),
    onSuccess: (response) => {
      console.log('Status updated:', response.data)
      refetchSessions()
      // Refresh students list
      if (activeSession?.session_id) {
        refetchStudents()
      }
      setShowManualModal(false)
      setSelectedStudent(null)
      alert(response.data.message || 'Status berhasil diupdate')
    },
    onError: (error) => {
      console.error('Update status error:', error)
      alert('Gagal update status: ' + (error.response?.data?.message || error.message))
    }
  })

  // Mutation untuk menutup sesi
  const closeSessionMutation = useMutation({
    mutationFn: (sessionId) => api.closeAttendanceSession({ session_id: sessionId }),
    onSuccess: (response) => {
      console.log('Session closed:', response.data)
      stopAutoRefresh()
      setActiveSession(null)
      setQrToken('')
      refetchSessions()
      refetchHistory()
      alert(response.data.message || 'Sesi berhasil ditutup')
    },
    onError: (error) => {
      console.error('Close session error:', error)
      alert('Gagal menutup sesi: ' + (error.response?.data?.message || error.message))
    }
  })

  // Get daftar mahasiswa untuk sesi aktif
  const { data: sessionStudents, refetch: refetchStudents, isLoading: loadingStudents } = useQuery({
    queryKey: ['sessionStudents', activeSession?.session_id],
    queryFn: () => {
      if (!activeSession?.session_id) return Promise.resolve(null)
      return api.getAttendanceSessionDetail(activeSession.session_id)
        .then(res => res.data.data)
        .catch(err => {
          console.error('Error fetching students:', err)
          return { students: [], total_students: 0 }
        })
    },
    enabled: !!activeSession?.session_id,
    refetchInterval: 8000 // Auto-refresh setiap 8 detik
  })

  // Fungsi untuk start auto-refresh
  const startAutoRefresh = (sessionId) => {
    stopAutoRefresh() // Hentikan interval sebelumnya
    
    refreshIntervalRef.current = setInterval(() => {
      console.log('Auto-refreshing token for session:', sessionId)
      refreshTokenMutation.mutate(sessionId)
    }, 15000) // 15 detik
  }

  // Fungsi untuk stop auto-refresh
  const stopAutoRefresh = () => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current)
      refreshIntervalRef.current = null
    }
  }

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      stopAutoRefresh()
    }
  }, [])

  const handleCreateSession = (e) => {
    e.preventDefault()
    if (!courseID) {
      alert('Pilih mata kuliah terlebih dahulu')
      return
    }
    
    createSessionMutation.mutate({ 
      course_id: courseID, 
      duration: parseInt(duration),
      pertemuan_ke: parseInt(pertemuanKe)
    })
  }

  const handleStatusUpdate = (studentId, status) => {
    if (!activeSession || !activeSession.session_id) {
      alert('Tidak ada sesi aktif')
      return
    }
    
    updateStatusMutation.mutate({
      session_id: activeSession.session_id,
      student_id: studentId,
      status
    })
  }

  const handleManualStatus = (student) => {
    setSelectedStudent(student)
    setManualStatus(student.attendance_status || 'hadir')
    setShowManualModal(true)
  }

  const handleCloseSession = () => {
    if (!activeSession || !activeSession.session_id) return
    
    if (window.confirm('Yakin ingin menutup sesi absensi ini?')) {
      closeSessionMutation.mutate(activeSession.session_id)
    }
  }

  const handleManualRefresh = () => {
    if (!activeSession || !activeSession.session_id) {
      alert('Tidak ada sesi aktif')
      return
    }
    
    refreshTokenMutation.mutate(activeSession.session_id)
  }

  const getStatusColor = (status) => {
    switch(status?.toLowerCase()) {
      case 'hadir': return 'bg-lp-bg text-lp-text'
      case 'izin': return 'bg-lp-bg text-lp-text'
      case 'sakit': return 'bg-lp-bg text-lp-text'
      case 'alpa': return 'bg-lp-bg text-lp-text'
      default: return 'bg-lp-surface text-lp-text font-semibold tracking-tight'
    }
  }

  const getStatusLabel = (status) => {
    switch(status?.toLowerCase()) {
      case 'hadir': return 'Hadir'
      case 'izin': return 'Izin'
      case 'sakit': return 'Sakit'
      case 'alpa': return 'Alpa'
      case 'belum': return 'Belum Absen'
      default: return status || 'Belum Absen'
    }
  }

  const getStatusIcon = (status) => {
    switch(status?.toLowerCase()) {
      case 'hadir': return <FaUserCheck className="text-lp-text2" />
      case 'izin': return <FaEdit className="text-lp-text2" />
      case 'sakit': return <FaUserCircle className="text-lp-text2" />
      case 'alpa': return <FaUserTimes className="text-lp-text2" />
      default: return <FaClock className="text-lp-text3 font-light" />
    }
  }

  // Generate array pertemuan 1-16
  const pertemuanList = Array.from({ length: 16 }, (_, i) => i + 1)

  // Status options untuk modal manual
  const statusOptions = [
    { value: 'hadir', label: 'Hadir', color: 'text-lp-text2', bg: 'bg-lp-bg' },
    { value: 'izin', label: 'Izin', color: 'text-lp-text2', bg: 'bg-lp-bg' },
    { value: 'sakit', label: 'Sakit', color: 'text-lp-text2', bg: 'bg-lp-bg' },
    { value: 'alpa', label: 'Alpa', color: 'text-lp-text2', bg: 'bg-lp-bg' }
  ]

  return (
    <div className="flex min-h-screen bg-lp-bg">
      <Sidebar role="dosen" isOpen={sidebarOpen} onClose={() => setSidebarOpen(!sidebarOpen)} />
      
      <div className="flex-1 lg:ml-0 transition-all duration-300 min-w-0">
        <div className="p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6 lg:mb-8">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-3 rounded-xl bg-lp-surface border border-lp-border shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border transition-shadow"
            >
              <span className="text-xl">☰</span>
            </button>
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-lp-text font-semibold tracking-tight">Manajemen Absensi Dosen</h1>
              <p className="text-lp-text2 font-light mt-2">Buat dan kelola sesi absensi per pertemuan</p>
            </div>
          </div>

          {/* Filter Section */}
          <div className="bg-lp-surface rounded-2xl border border-lp-border shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-6 mb-6">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <FaFilter className="text-lp-text3 font-light" />
                <span className="font-medium text-lp-text2">Filter Sesi Aktif:</span>
              </div>
              <select
                value={filterPertemuan}
                onChange={(e) => setFilterPertemuan(e.target.value)}
                className="border border-lp-border rounded-xl px-3 py-2 text-sm"
              >
                <option value="">Semua Pertemuan</option>
                {pertemuanList.map(p => (
                  <option key={p} value={p}>Pertemuan {p}</option>
                ))}
              </select>
              <select
                value={filterCourse}
                onChange={(e) => setFilterCourse(e.target.value)}
                className="border border-lp-border rounded-xl px-3 py-2 text-sm"
              >
                <option value="">Semua Mata Kuliah</option>
                {courses?.map((course) => (
                  <option key={course.kode} value={course.kode}>
                    {course.nama} ({course.kode})
                  </option>
                ))}
              </select>
              <button
                onClick={() => {
                  setFilterPertemuan('')
                  setFilterCourse('')
                }}
                className="text-sm text-lp-text2 font-light hover:text-lp-text font-semibold tracking-tight"
              >
                Reset Filter
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Panel Kiri - Buat Sesi & Mata Kuliah */}
            <div className="lg:col-span-2 space-y-6">
              {/* Buat Sesi Baru */}
              <div className="bg-lp-surface rounded-2xl border border-lp-border shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-6">
                <h3 className="text-xl font-bold text-lp-text font-semibold tracking-tight mb-4 flex items-center gap-3">
                  <FaQrcode className="text-lp-text2" />
                  Buat Sesi Absensi Baru
                </h3>
                
                <form onSubmit={handleCreateSession} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-lp-text2 mb-2">
                        Mata Kuliah
                      </label>
                      <select
                        value={courseID}
                        onChange={(e) => setCourseID(e.target.value)}
                        className="w-full border border-lp-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-lp-text/20 focus:border-transparent"
                        required
                        disabled={loadingCourses || createSessionMutation.isPending}
                      >
                        <option value="">Pilih Mata Kuliah</option>
                        {courses?.map((course) => (
                          <option key={course.kode} value={course.kode}>
                            {course.nama} ({course.kode}) - {course.hari} {course.jam_mulai}-{course.jam_selesai}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-lp-text2 mb-2">
                        Pertemuan Ke-
                      </label>
                      <select
                        value={pertemuanKe}
                        onChange={(e) => setPertemuanKe(parseInt(e.target.value))}
                        className="w-full border border-lp-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-lp-text/20 focus:border-transparent"
                        required
                        disabled={createSessionMutation.isPending}
                      >
                        {pertemuanList.map(p => (
                          <option key={p} value={p}>Pertemuan {p}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-lp-text2 mb-2">
                      Durasi Sesi (menit)
                    </label>
                    <input
                      type="range"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      min="5"
                      max="120"
                      step="5"
                      className="w-full h-2 bg-gray-200 rounded-xl appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-sm text-lp-text2 font-light mt-1">
                      <span>5m</span>
                      <span className="font-medium">{duration} menit</span>
                      <span>120m</span>
                    </div>
                    <p className="text-sm text-lp-text3 font-light mt-1">QR Code akan auto-refresh setiap 15 detik</p>
                  </div>
                  
                  <button
                    type="submit"
                    disabled={createSessionMutation.isPending || !courseID}
                    className="w-full bg-lp-text text-white border-none py-3 rounded-xl font-semibold hover:bg-lp-atext transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transition-all duration-300 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border hover:shadow-xl flex items-center justify-center gap-2"
                  >
                    {createSessionMutation.isPending ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Membuat Sesi...
                      </>
                    ) : (
                      <>
                        <FaQrcode />
                        Buat Sesi Absensi Pertemuan {pertemuanKe}
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Sesi Aktif */}
              {activeSession && (
                <div className="bg-lp-surface rounded-2xl border border-lp-border shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-6">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-lp-text font-semibold tracking-tight flex items-center gap-3">
                        <FaHourglassHalf className="text-lp-text2" />
                        Sesi Aktif: {activeSession.course_name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-3 mt-2">
                        <span className="bg-lp-bg text-lp-text text-sm font-medium px-3 py-1 rounded-full">
                          Pertemuan {activeSession.pertemuan_ke}
                        </span>
                        <span className="text-lp-text2 font-light">
                          Berakhir: {new Date(activeSession.expires_at).toLocaleString('id-ID')}
                        </span>
                        <span className={`text-sm font-medium px-2 py-1 rounded ${
                          refreshIntervalRef.current ? 'bg-lp-bg text-lp-text' : 'bg-lp-surface text-lp-text font-semibold tracking-tight'
                        }`}>
                          {refreshIntervalRef.current ? '🟢 Auto-refresh aktif' : '⚫ Auto-refresh berhenti'}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleManualRefresh}
                        disabled={refreshTokenMutation.isPending}
                        className="bg-lp-text text-white px-4 py-2 rounded-xl hover:bg-lp-text transition-colors flex items-center gap-2"
                      >
                        <FaSync className={refreshTokenMutation.isPending ? "animate-spin" : ""} />
                        Refresh QR
                      </button>
                      <button
                        onClick={handleCloseSession}
                        className="bg-lp-text text-white px-4 py-2 rounded-xl hover:bg-lp-atext transition-colors flex items-center gap-2"
                        disabled={closeSessionMutation.isPending}
                      >
                        {closeSessionMutation.isPending ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        ) : (
                          <FaStopCircle className="mr-2" />
                        )}
                        Tutup Sesi
                      </button>
                    </div>
                  </div>

                  {/* QR Code */}
                  <div className="flex flex-col items-center mb-6">
                    <div className="bg-lp-surface p-6 rounded-2xl border-4 border-lp-border mb-4 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border">
                      {qrToken && (
                        <QRCodeSVG 
                          value={qrToken}
                          size={240}
                          level="H"
                          includeMargin={true}
                          bgColor="#FFFFFF"
                          fgColor="#1e40af"
                        />
                      )}
                    </div>
                    <div className="text-center space-y-2">
                      <p className="text-sm text-lp-text2 font-light">
                        Tampilkan QR Code ini di kelas untuk di-scan mahasiswa
                      </p>
                      <div className="flex items-center justify-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${refreshIntervalRef.current ? 'bg-lp-text animate-pulse' : 'bg-gray-400'}`}></div>
                        <span className="text-sm text-lp-text2">
                          {refreshIntervalRef.current ? 'Auto-refresh aktif (15 detik)' : 'Auto-refresh berhenti'}
                        </span>
                      </div>
                      <p className="text-xs text-lp-text3 font-light font-mono bg-lp-surface p-2 rounded mt-2">
                        Token: {qrToken?.substring(0, 20)}...
                      </p>
                    </div>
                  </div>

                  {/* Session Info */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-lp-surface p-4 rounded-xl border border-lp-border">
                      <p className="text-sm text-lp-text2 font-light flex items-center gap-2">
                        <FaKey className="text-lp-text2" />
                        Token Session
                      </p>
                      <p className="font-mono text-sm truncate mt-1" title={activeSession.session_token}>
                        {activeSession.session_token}
                      </p>
                    </div>
                    <div className="bg-lp-surface p-4 rounded-xl border border-lp-border">
                      <p className="text-sm text-lp-text2 font-light flex items-center gap-2">
                        <FaUsers className="text-lp-text2" />
                        Total Mahasiswa
                      </p>
                      <p className="text-2xl font-bold mt-1">{sessionStudents?.total_students || 0}</p>
                    </div>
                  </div>

                  {/* Status Info */}
                  {sessionStudents && (
                    <div className="grid grid-cols-4 gap-2 mb-6">
                      <div className="bg-lp-bg p-3 rounded-xl text-center">
                        <p className="text-lg font-bold text-lp-text">{sessionStudents.hadir_count || 0}</p>
                        <p className="text-xs text-lp-text2">Hadir</p>
                      </div>
                      <div className="bg-lp-bg p-3 rounded-xl text-center">
                        <p className="text-lg font-bold text-lp-text">{sessionStudents.izin_count || 0}</p>
                        <p className="text-xs text-lp-text2">Izin</p>
                      </div>
                      <div className="bg-lp-bg p-3 rounded-xl text-center">
                        <p className="text-lg font-bold text-lp-text">{sessionStudents.sakit_count || 0}</p>
                        <p className="text-xs text-lp-text2">Sakit</p>
                      </div>
                      <div className="bg-lp-bg p-3 rounded-xl text-center">
                        <p className="text-lg font-bold text-lp-text">{sessionStudents.alpa_count || 0}</p>
                        <p className="text-xs text-lp-text2">Alpa</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Daftar Sesi Aktif */}
              <div className="bg-lp-surface rounded-2xl border border-lp-border shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-lp-text font-semibold tracking-tight flex items-center gap-3">
                    <FaCalendarAlt className="text-lp-text2" />
                    Sesi Absensi Aktif
                  </h3>
                  <div className="text-sm text-lp-text2 font-light">
                    Total: {activeSessions?.sessions?.length || 0} sesi
                  </div>
                </div>
                
                {loadingSessions ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lp-text mx-auto"></div>
                    <p className="mt-2 text-lp-text2 font-light">Memuat sesi aktif...</p>
                  </div>
                ) : activeSessions?.sessions && activeSessions.sessions.length > 0 ? (
                  <div className="space-y-4">
                    {activeSessions.sessions.map((session) => (
                      <div key={session.id} className="border border-lp-border rounded-xl p-4 hover:border border-lp-border shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-shadow">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="bg-lp-bg text-lp-text text-xs font-medium px-2 py-1 rounded">
                                Pertemuan {session.pertemuan_ke}
                              </span>
                              <span className={`text-xs font-medium px-2 py-1 rounded ${
                                session.time_left_minutes > 10 ? 'bg-lp-bg text-lp-text' : 
                                session.time_left_minutes > 0 ? 'bg-lp-bg text-lp-text' : 
                                'bg-lp-bg text-lp-text'
                              }`}>
                                {session.time_left_minutes > 0 ? `${session.time_left_minutes}m tersisa` : 'Expired'}
                              </span>
                            </div>
                            <h4 className="font-semibold text-lp-text font-semibold tracking-tight">{session.course_name}</h4>
                            <p className="text-sm text-lp-text2 font-light">
                              {session.hari} {session.jam_mulai}-{session.jam_selesai}
                            </p>
                            <p className="text-xs text-lp-text3 font-light">
                              Dibuat: {new Date(session.created_at).toLocaleString('id-ID')}
                            </p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            session.status === 'active' && session.time_left_minutes > 0
                              ? 'bg-lp-bg text-lp-text' 
                              : 'bg-lp-surface text-lp-text font-semibold tracking-tight'
                          }`}>
                            {session.status === 'active' && session.time_left_minutes > 0 ? 'Aktif' : 'Tidak Aktif'}
                          </span>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <button 
                            onClick={() => {
                              setActiveSession({
                                session_id: session.id,
                                course_name: session.course_name,
                                course_id: session.course_id,
                                session_token: session.session_token,
                                expires_at: session.expires_at,
                                pertemuan_ke: session.pertemuan_ke,
                                created_at: session.created_at
                              })
                              setQrToken(session.session_token)
                              startAutoRefresh(session.id)
                            }}
                            className="px-4 py-2 bg-lp-bg text-lp-text2 rounded-xl text-sm hover:bg-lp-surface transition-colors flex items-center gap-1"
                          >
                            <FaQrcode />
                            Tampilkan QR
                          </button>
                          <button 
                            onClick={() => {
                              // Navigate to session detail
                              window.location.href = `/dosen/absensi/${session.id}`
                            }}
                            className="px-4 py-2 bg-lp-surface text-lp-text2 rounded-xl text-sm hover:bg-lp-bg transition-colors flex items-center gap-1"
                          >
                            <FaEye />
                            Detail
                          </button>
                          <button 
                            onClick={() => {
                              if (window.confirm('Tutup sesi ini?')) {
                                closeSessionMutation.mutate(session.id)
                              }
                            }}
                            className="px-4 py-2 bg-lp-bg text-lp-text2 rounded-xl text-sm hover:bg-lp-surface transition-colors flex items-center gap-1"
                          >
                            <FaStopCircle />
                            Tutup
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4 text-lp-text3">📋</div>
                    <h4 className="font-semibold text-lp-text2 mb-2">Tidak ada sesi aktif</h4>
                    <p className="text-lp-text3 font-light text-sm">
                      Buat sesi absensi baru untuk memulai
                    </p>
                  </div>
                )}
              </div>

              {/* Riwayat Pertemuan */}
              <div className="bg-lp-surface rounded-2xl border border-lp-border shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-lp-text font-semibold tracking-tight flex items-center gap-3">
                    <FaHistory className="text-lp-text2" />
                    Riwayat Pertemuan
                  </h3>
                  <button 
                    onClick={() => refetchHistory()}
                    className="text-sm text-lp-text2 font-light hover:text-lp-text font-semibold tracking-tight"
                  >
                    Refresh
                  </button>
                </div>
                
                <div className="space-y-3">
                  {pertemuanHistory && pertemuanHistory.length > 0 ? (
                    pertemuanHistory.slice(0, 5).map((item, index) => (
                      <div key={index} className="border border-lp-border rounded-xl p-3">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium text-lp-text font-semibold tracking-tight">{item.course_name}</p>
                            <p className="text-sm text-lp-text2 font-light">Pertemuan {item.pertemuan_ke} • {item.date}</p>
                          </div>
                          <div className="flex gap-2">
                            <span className={`px-2 py-1 rounded text-xs ${getStatusColor(item.status)}`}>
                              {getStatusLabel(item.status)}
                            </span>
                            <span className="text-xs text-lp-text3 font-light">{item.time}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-lp-text3 font-light">
                      <p>Belum ada riwayat pertemuan</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Panel Kanan - Daftar Mahasiswa & Statistik */}
            <div className="space-y-6">
              {/* Statistik Pertemuan */}
              <div className="bg-lp-surface rounded-2xl border border-lp-border shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-6">
                <h3 className="text-xl font-bold text-lp-text font-semibold tracking-tight mb-4 flex items-center gap-3">
                  <FaChartBar className="text-lp-text2" />
                  Statistik Pertemuan
                </h3>
                <div className="space-y-3">
                  {pertemuanList.slice(0, 6).map(pertemuan => {
                    const sessionCount = activeSessions?.sessions?.filter(s => s.pertemuan_ke === pertemuan).length || 0
                    return (
                      <div key={pertemuan} className="flex items-center justify-between p-3 border border-lp-border rounded-xl hover:bg-lp-bg">
                        <div>
                          <span className="font-medium text-lp-text font-semibold tracking-tight">Pertemuan {pertemuan}</span>
                          <p className="text-sm text-lp-text2 font-light">{sessionCount} sesi aktif</p>
                        </div>
                        <button
                          onClick={() => {
                            setFilterPertemuan(pertemuan.toString())
                            setPertemuanKe(pertemuan)
                          }}
                          className={`px-3 py-1 rounded-xl text-sm transition-colors ${
                            filterPertemuan === pertemuan.toString() 
                              ? 'bg-lp-bg text-lp-text2' 
                              : 'bg-lp-surface text-lp-text2 hover:bg-lp-bg'
                          }`}
                        >
                          Filter
                        </button>
                      </div>
                    )
                  })}
                </div>
                <button 
                  onClick={() => window.location.href = '/dosen/absensi/riwayat'}
                  className="w-full mt-4 text-center text-lp-text2 hover:text-lp-text text-sm font-medium"
                >
                  Lihat semua statistik →
                </button>
              </div>

              {/* Daftar Mahasiswa untuk Sesi Aktif */}
              {activeSession && (
                <div className="bg-lp-surface rounded-2xl border border-lp-border shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-lp-text font-semibold tracking-tight flex items-center gap-3">
                      <FaUsers className="text-lp-text2" />
                      Daftar Mahasiswa
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="bg-lp-bg text-lp-text text-xs font-medium px-2 py-1 rounded">
                        Pertemuan {activeSession.pertemuan_ke}
                      </span>
                      <button 
                        onClick={() => refetchStudents()}
                        className="text-lp-text3 font-light hover:text-lp-text2"
                        disabled={loadingStudents}
                      >
                        <FaSync className={loadingStudents ? "animate-spin" : ""} />
                      </button>
                    </div>
                  </div>
                  
                  {loadingStudents ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lp-text mx-auto"></div>
                      <p className="mt-2 text-lp-text2 font-light">Memuat data mahasiswa...</p>
                    </div>
                  ) : sessionStudents?.students && sessionStudents.students.length > 0 ? (
                    <>
                      <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                        {sessionStudents.students.map((student, index) => (
                          <div key={student.id} className="border border-lp-border rounded-xl p-3 hover:bg-lp-bg transition-colors">
                            <div className="flex justify-between items-center">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-sm text-lp-text font-semibold tracking-tight truncate">{student.name}</p>
                                  <span className="text-xs text-lp-text3 font-light bg-lp-surface px-2 py-0.5 rounded">
                                    {student.nim}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(student.attendance_status)} flex items-center gap-1`}>
                                    {getStatusIcon(student.attendance_status)}
                                    {getStatusLabel(student.attendance_status)}
                                  </span>
                                  {student.attendance_time && (
                                    <span className="text-xs text-lp-text3 font-light">
                                      {student.attendance_time}
                                    </span>
                                  )}
                                </div>
                              </div>
                            <div className="flex gap-1 ml-2">
                              <button
                                onClick={() => handleStatusUpdate(student.id, 'hadir')}
                                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                                  student.attendance_status === 'hadir' 
                                    ? 'bg-lp-bg text-lp-text2 border border-lp-border' 
                                    : 'bg-lp-bg text-lp-text2 hover:bg-lp-surface'
                                }`}
                                title="Hadir"
                              >
                                H
                              </button>
                              <button
                                onClick={() => handleStatusUpdate(student.id, 'izin')}
                                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                                  student.attendance_status === 'izin' 
                                    ? 'bg-lp-bg text-lp-text2 border border-lp-border' 
                                    : 'bg-lp-bg text-lp-text2 hover:bg-lp-surface'
                                }`}
                                title="Izin"
                              >
                                I
                              </button>
                              <button
                                onClick={() => handleStatusUpdate(student.id, 'sakit')}
                                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                                  student.attendance_status === 'sakit' 
                                    ? 'bg-lp-bg text-lp-text2 border border-lp-border' 
                                    : 'bg-lp-bg text-lp-text2 hover:bg-lp-surface'
                                }`}
                                title="Sakit"
                              >
                                S
                              </button>
                              <button
                                onClick={() => handleStatusUpdate(student.id, 'alpa')}
                                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                                  student.attendance_status === 'alpa' 
                                    ? 'bg-lp-bg text-lp-text2 border border-lp-border' 
                                    : 'bg-lp-bg text-lp-text2 hover:bg-lp-surface'
                                }`}
                                title="Alpa"
                              >
                                A
                              </button>
                              <button
                                onClick={() => handleManualStatus(student)}
                                className="w-8 h-8 rounded-xl flex items-center justify-center bg-lp-surface text-lp-text2 font-light hover:bg-lp-bg transition-colors"
                                title="Edit Manual"
                              >
                                <FaEdit className="text-xs" />
                              </button>
                            </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Summary */}
                      {sessionStudents && (
                        <div className="mt-4 pt-4 border-t border-lp-border border">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="text-center">
                              <p className="text-lg font-bold text-lp-text2">{sessionStudents.hadir_count || 0}</p>
                              <p className="text-xs text-lp-text2 font-light">Hadir</p>
                            </div>
                            <div className="text-center">
                              <p className="text-lg font-bold text-lp-text2">
                                {sessionStudents.total_students - sessionStudents.attendance_count || 0}
                              </p>
                              <p className="text-xs text-lp-text2 font-light">Belum Absen</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-4xl text-lp-text3 mb-4">👥</div>
                      <p className="text-lp-text3 font-light">Tidak ada mahasiswa terdaftar</p>
                    </div>
                  )}
                </div>
              )}

              {/* Instruksi */}
              <div className="bg-lp-surface border border-lp-border rounded-2xl p-4">
                <h4 className="font-bold text-lp-text mb-2 flex items-center gap-2">
                  <FaClock className="text-lp-text2" />
                  Cara Kerja Absensi:
                </h4>
                <ol className="text-sm text-lp-text2 space-y-2 list-decimal pl-4">
                  <li>Pilih mata kuliah dan pertemuan</li>
                  <li>Buat sesi absensi dengan QR Code</li>
                  <li>Tampilkan QR Code di kelas</li>
                  <li>Mahasiswa scan QR untuk absen otomatis</li>
                  <li>Klik tombol H/I/S/A untuk absen manual</li>
                  <li>Status langsung tersimpan di database</li>
                </ol>
                <div className="mt-3 text-xs text-lp-text2 space-y-1">
                  <p>⚡ QR Code auto-refresh setiap 15 detik</p>
                  <p>🔒 Token berbeda untuk setiap sesi</p>
                  <p>📊 Data realtime di mahasiswa & dosen</p>
                </div>
              </div>

              {/* Legend Status */}
              <div className="bg-lp-bg border border-lp-border rounded-2xl p-4">
                <h4 className="font-bold text-lp-text font-semibold tracking-tight mb-3">Legenda Status:</h4>
                <div className="space-y-2">
                  {statusOptions.map((status) => (
                    <div key={status.value} className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded flex items-center justify-center font-bold ${status.bg} ${status.color}`}>
                        {status.value === 'hadir' ? 'H' : 
                         status.value === 'izin' ? 'I' : 
                         status.value === 'sakit' ? 'S' : 'A'}
                      </div>
                      <span className="text-sm text-lp-text2">{status.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status Messages */}
              {createSessionMutation.isSuccess && (
                <div className="p-4 bg-lp-bg border border-lp-border rounded-xl text-lp-text flex items-center space-x-2">
                  <FaCheckCircle className="text-lp-text2 text-lg" />
                  <span>Sesi absensi berhasil dibuat!</span>
                </div>
              )}
              
              {createSessionMutation.isError && (
                <div className="p-4 bg-lp-bg border border-lp-border rounded-xl text-lp-text flex items-center space-x-2">
                  <FaTimesCircle className="text-lp-text2 text-lg" />
                  <span>Error: {createSessionMutation.error.response?.data?.message || 'Failed to create session'}</span>
                </div>
              )}

              {refreshTokenMutation.isError && (
                <div className="p-4 bg-lp-bg border border-lp-border rounded-xl text-lp-text flex items-center space-x-2">
                  <FaTimesCircle className="text-lp-text2 text-lg" />
                  <span>Refresh gagal: {refreshTokenMutation.error.response?.data?.message || 'Token refresh failed'}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Absensi Manual */}
      {showManualModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[90] p-4">
          <div className="bg-lp-surface rounded-2xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold text-lp-text font-semibold tracking-tight">Absensi Manual</h3>
                <p className="text-sm text-lp-text2 font-light">
                  {selectedStudent.name} ({selectedStudent.nim})
                </p>
              </div>
              <button
                onClick={() => {
                  setShowManualModal(false)
                  setSelectedStudent(null)
                }}
                className="text-lp-text3 font-light hover:text-lp-text2"
              >
                ✕
              </button>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-lp-text2 mb-3">
                Pilih Status Kehadiran:
              </label>
              <div className="grid grid-cols-2 gap-3">
                {statusOptions.map((status) => (
                  <button
                    key={status.value}
                    type="button"
                    onClick={() => setManualStatus(status.value)}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      manualStatus === status.value 
                        ? `${status.bg} border-lp-text` 
                        : 'border-lp-border border hover:border-lp-border border'
                    }`}
                  >
                    <div className="text-center">
                      <div className={`text-2xl font-bold mb-1 ${status.color}`}>
                        {status.value === 'hadir' ? 'H' : 
                         status.value === 'izin' ? 'I' : 
                         status.value === 'sakit' ? 'S' : 'A'}
                      </div>
                      <p className={`text-sm font-medium ${status.color}`}>
                        {status.label}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowManualModal(false)
                  setSelectedStudent(null)
                }}
                className="flex-1 bg-lp-surface text-lp-text2 py-3 rounded-xl font-medium hover:bg-lp-bg transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => handleStatusUpdate(selectedStudent.id, manualStatus)}
                disabled={updateStatusMutation.isPending}
                className="flex-1 bg-lp-text text-white py-3 rounded-xl font-medium hover:bg-lp-atext transition-colors flex items-center justify-center gap-2"
              >
                {updateStatusMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Memproses...
                  </>
                ) : (
                  <>
                    <FaCheckCircle />
                    Simpan Status
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AbsensiDosen
