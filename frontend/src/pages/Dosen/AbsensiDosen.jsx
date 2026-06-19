import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQuery } from "@tanstack/react-query"
import api from '../../services/api'
import Navbar from '../../components/Navbar'
import Sidebar from '../../components/Sidebar'
import useAuth from '../../hooks/useAuth'
import { AnimatePresence, motion } from 'framer-motion'
import {
  FaQrcode, FaUsers, FaClock, FaCheckCircle, FaTimesCircle,
  FaStopCircle, FaSync, FaEdit, FaHistory, FaUserCircle,
  FaExpand, FaCompress, FaBolt, FaLayerGroup,
  FaHourglassHalf, FaChevronRight, FaCalendarCheck, FaSearch,
  FaUserCheck,
} from 'react-icons/fa'
import {
  FiChevronRight,
  FiXCircle,
  FiRefreshCw,
} from 'react-icons/fi'
import { QRCodeSVG } from 'qrcode.react'

// ─── Tiny components ────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const map = {
    hadir:       { label: 'Hadir',  cls: 'bg-lp-green/10 text-lp-green ring-1 ring-lp-green/20' },
    izin:        { label: 'Izin',   cls: 'bg-lp-amber/10 text-lp-amber ring-1 ring-lp-amber/20' },
    sakit:       { label: 'Sakit',  cls: 'bg-lp-accent/10 text-lp-atext ring-1 ring-lp-accent/20' },
    alpa:        { label: 'Alpa',   cls: 'bg-lp-red/10 text-lp-red ring-1 ring-lp-red/20' },
    belum_absen: { label: 'Belum',  cls: 'bg-lp-surface text-lp-text3 ring-1 ring-lp-border' },
  }
  const { label, cls } = map[status?.toLowerCase()] || map.belum_absen
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${cls}`}>
      {label}
    </span>
  )
}

const StatCard = ({ label, value, color }) => (
  <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white border border-lp-border">
    <p className={`text-xl font-bold tabular-nums ${color}`}>{value}</p>
    <p className="text-[10px] text-lp-text3 mt-0.5 font-mono font-bold uppercase tracking-wider">{label}</p>
  </div>
)

const ConfirmationModal = ({ open, title, description, confirmLabel, pending, onCancel, onConfirm }) => {
  if (typeof document === 'undefined') return null
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[300] flex items-center justify-center bg-lp-text/30 backdrop-blur-md p-4"
          onClick={(e) => e.target === e.currentTarget && onCancel()}
        >
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className="bg-white border border-lp-border rounded-[2rem] p-8 w-full max-w-sm shadow-[0_32px_64px_rgba(0,0,0,0.12)]"
          >
            <h3 className="text-lg font-bold text-lp-text tracking-tight">{title}</h3>
            <p className="mt-2 text-sm text-lp-text2 leading-relaxed font-light">{description}</p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 py-3 rounded-full border border-lp-border text-[12px] font-bold text-lp-text2 hover:bg-lp-surface transition-all uppercase tracking-widest"
              >
                Batal
              </button>
              <button
                onClick={onConfirm}
                disabled={pending}
                className="flex-1 py-3 rounded-full bg-lp-red text-white text-[12px] font-bold hover:bg-lp-red/90 disabled:opacity-50 transition-all uppercase tracking-widest"
              >
                {pending ? 'Memproses...' : confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

// ─── Main Component ─────────────────────────────────────────────────
const AbsensiDosen = () => {
  const { user } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [courseID, setCourseID] = useState('')
  const [duration, setDuration] = useState(15)
  const [pertemuanKe, setPertemuanKe] = useState(1)
  const [activeSession, setActiveSession] = useState(null)
  const [qrToken, setQrToken] = useState('')
  const [showManualModal, setShowManualModal] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [manualStatus, setManualStatus] = useState('hadir')
  const [autoRefreshActive, setAutoRefreshActive] = useState(false)
  const [projectorMode, setProjectorMode] = useState(false)
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false)
  const [notice, setNotice] = useState(null)
  const refreshIntervalRef = useRef(null)
  const [localStudents, setLocalStudents] = useState([])
  const [liveNotifications, setLiveNotifications] = useState([])
  const checkInQueueRef = useRef([])
  const [selectedHistorySession, setSelectedHistorySession] = useState(null)
  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [historySessionDetails, setHistorySessionDetails] = useState(null)
  const [loadingHistoryDetails, setLoadingHistoryDetails] = useState(false)
  const [historySearchQuery, setHistorySearchQuery] = useState('')

  /* ── Queries ── */
  const { data: courses, isLoading: loadingCourses } = useQuery({
    queryKey: ['dosenCourses'],
    queryFn: () => api.getDosenCourses().then(res => res.data.data),
  })

  const { data: activeSessions, refetch: refetchSessions } = useQuery({
    queryKey: ['activeSessions'],
    queryFn: () => api.getActiveSessions({}).then(res => res.data.data),
    refetchInterval: 10000,
  })

  const { data: pertemuanHistory, refetch: refetchHistory } = useQuery({
    queryKey: ['pertemuanHistory'],
    queryFn: () => api.getRiwayatPertemuanDosen().then(res => res.data.data?.history || []),
  })

  const { data: sessionStudents, refetch: refetchStudents, isLoading: loadingStudents } = useQuery({
    queryKey: ['sessionStudents', activeSession?.session_id],
    queryFn: () => {
      if (!activeSession?.session_id) return Promise.resolve(null)
      return api.getAttendanceSessionDetail(activeSession.session_id)
        .then(res => res.data.data)
        .catch(() => ({ students: [], total_students: 0 }))
    },
    enabled: !!activeSession?.session_id,
    refetchInterval: 5000,
  })

  /* ── Mutations ── */
  const createSessionMutation = useMutation({
    mutationFn: (data) => api.createAttendanceSession(data),
    onSuccess: (response) => {
      const s = response.data.data
      setActiveSession({
        session_id: s.session_id,
        course_name: s.course_name,
        session_token: s.session_token,
        expires_at: s.expires_at,
        pertemuan_ke: s.pertemuan_ke,
        qr_token: s.qr_token,
        created_at: s.created_at,
        course_id: s.course_id,
      })
      setQrToken(s.session_token)
      refetchSessions()
      startAutoRefresh()
    },
    onError: (err) => setNotice('Gagal membuat sesi: ' + (err.response?.data?.message || err.message)),
  })

  const refreshTokenMutation = useMutation({
    mutationFn: (sessionId) => api.refreshSessionToken({ session_id: sessionId }),
    onSuccess: (response) => {
      const newToken = response.data.data.session_token
      setActiveSession(prev => ({ ...prev, session_token: newToken }))
      setQrToken(newToken)
    },
    onError: (err) => {
      if (err.response?.status === 400 || err.response?.status === 404) {
        stopAutoRefresh()
        setNotice('Sesi tidak aktif. Silakan buat sesi baru.')
        setActiveSession(null)
      }
    },
  })

  const updateStatusMutation = useMutation({
    mutationFn: (data) => api.updateAttendanceStatus(data),
    onSuccess: () => {
      refetchStudents()
      setShowManualModal(false)
      setSelectedStudent(null)
    },
    onError: (err) => setNotice('Gagal update status: ' + (err.response?.data?.message || err.message)),
  })

  const closeSessionMutation = useMutation({
    mutationFn: (sessionId) => api.closeAttendanceSession({ session_id: sessionId }),
    onSuccess: () => {
      stopAutoRefresh()
      setActiveSession(null)
      setQrToken('')
      refetchSessions()
      refetchHistory()
      setConfirmCloseOpen(false)
    },
    onError: (err) => setNotice('Gagal menutup sesi: ' + (err.response?.data?.message || err.message)),
  })

  /* ── Auto-refresh helpers ── */
  const startAutoRefresh = () => {
    stopAutoRefresh()
    refreshIntervalRef.current = setInterval(() => {
      refetchSessions()
      refetchStudents()
    }, 7000)
    setAutoRefreshActive(true)
  }

  const stopAutoRefresh = () => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current)
      refreshIntervalRef.current = null
    }
    setAutoRefreshActive(false)
  }

  useEffect(() => () => stopAutoRefresh(), [])
  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(null), 4500)
    return () => clearTimeout(t)
  }, [notice])

  /* ── Queue / Animation Logic ── */
  useEffect(() => {
    if (!sessionStudents?.students) return
    if (localStudents.length === 0) { setLocalStudents(sessionStudents.students); return }
    const newCheckIns = []
    sessionStudents.students.forEach(s => {
      const local = localStudents.find(l => l.id === s.id)
      const sStatus = s.attendance_status?.toLowerCase()
      const lStatus = local?.attendance_status?.toLowerCase()
      if (sStatus && sStatus !== 'belum_absen' && sStatus !== '' &&
          (!lStatus || lStatus === 'belum_absen' || lStatus === '')) {
        if (!checkInQueueRef.current.some(q => q.id === s.id)) newCheckIns.push(s)
      }
    })
    if (newCheckIns.length > 0) checkInQueueRef.current = [...checkInQueueRef.current, ...newCheckIns]
    setLocalStudents(prev => prev.map(localS => {
      const serverS = sessionStudents.students.find(s => s.id === localS.id)
      if (!serverS) return localS
      const isPending = checkInQueueRef.current.some(q => q.id === localS.id)
      return { ...serverS, attendance_status: isPending ? localS.attendance_status : serverS.attendance_status }
    }))
  }, [sessionStudents])

  useEffect(() => {
    if (!activeSession) {
      setLocalStudents([])
      setLiveNotifications([])
      checkInQueueRef.current = []
    }
  }, [activeSession])

  useEffect(() => {
    const interval = setInterval(() => {
      if (checkInQueueRef.current.length === 0) return
      const next = checkInQueueRef.current.shift()
      setLocalStudents(prev => {
        const exists = prev.some(s => s.id === next.id)
        if (!exists) return [...prev, next]
        return prev.map(s => s.id === next.id ? {
          ...s,
          attendance_status: next.attendance_status,
          attendance_time: next.attendance_time || new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
        } : s)
      })
      const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      setLiveNotifications(prev => [{
        id: Math.random().toString(36).substring(2, 9),
        title: 'Presensi Masuk',
        description: `${next.name} (${next.nim}) presensi ${next.attendance_status?.toUpperCase()} — Pertemuan ${activeSession?.pertemuan_ke || pertemuanKe}`,
        time: timeStr,
      }, ...prev].slice(0, 5))
    }, 1200)
    return () => clearInterval(interval)
  }, [activeSession, pertemuanKe])

  /* ── Sorted students ── */
  const getSortedStudents = () => {
    const list = localStudents.length > 0 ? localStudents : (sessionStudents?.students || [])
    const rank = (s) => {
      const st = (s.attendance_status || '').toLowerCase()
      if (st === 'hadir') return 3
      if (['izin', 'sakit', 'alpa'].includes(st)) return 2
      return 1
    }
    return [...list].sort((a, b) => {
      const diff = rank(b) - rank(a)
      if (diff !== 0) return diff
      if (rank(a) >= 2) return (b.attendance_time || '').localeCompare(a.attendance_time || '')
      return a.name.localeCompare(b.name)
    })
  }

  /* ── Handlers ── */
  const handleCreateSession = (e) => {
    e.preventDefault()
    if (!courseID) return setNotice('Pilih mata kuliah terlebih dahulu')
    createSessionMutation.mutate({ course_id: courseID, duration: parseInt(duration), pertemuan_ke: parseInt(pertemuanKe) })
  }

  const handleStatusUpdate = (studentId, status) => {
    if (!activeSession?.session_id) return setNotice('Tidak ada sesi aktif')
    updateStatusMutation.mutate({ session_id: activeSession.session_id, student_id: studentId, status })
  }

  const handleCloseSession = () => {
    if (!activeSession?.session_id) return
    setConfirmCloseOpen(true)
  }

  const handleViewHistoryDetail = (item) => {
    setSelectedHistorySession(item)
    setHistoryModalOpen(true)
    setLoadingHistoryDetails(true)
    setHistorySearchQuery('')
    api.getAttendanceSessionDetail(item.id)
      .then(res => { setHistorySessionDetails(res.data.data); setLoadingHistoryDetails(false) })
      .catch(err => {
        setNotice('Gagal mengambil detail: ' + (err.response?.data?.message || err.message))
        setLoadingHistoryDetails(false)
        setHistoryModalOpen(false)
      })
  }

  const pertemuanList = Array.from({ length: 16 }, (_, i) => i + 1)

  const getUsedPertemuan = () => {
    if (!courseID) return []
    const used = new Set()
    pertemuanHistory?.forEach(item => { if (item.course_id === courseID) used.add(item.pertemuan_ke) })
    activeSessions?.sessions?.forEach(item => { if (item.course_id === courseID) used.add(item.pertemuan_ke) })
    return Array.from(used)
  }

  useEffect(() => {
    if (!courseID) return
    const used = getUsedPertemuan()
    if (used.includes(pertemuanKe)) {
      const available = pertemuanList.find(p => !used.includes(p))
      if (available) setPertemuanKe(available)
    }
  }, [courseID, pertemuanHistory, activeSessions])

  const hadirCount  = sessionStudents?.hadir_count || 0
  const totalCount  = sessionStudents?.total_students || 0
  const belumCount  = totalCount - (sessionStudents?.attendance_count || 0)
  const progressPct = totalCount > 0 ? Math.round((hadirCount / totalCount) * 100) : 0

  /* ══════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════ */
  return (
    <div className="flex min-h-screen bg-lp-bg overflow-hidden">
      {/* Background Decorative Layer */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-lp-text/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-lp-text/5 blur-[120px] rounded-full" />
      </div>

      <Sidebar role="dosen" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* ── Projector / Fullscreen QR ── */}
      <AnimatePresence>
        {projectorMode && activeSession && qrToken && (
          <motion.div
            key="projector"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-lp-text"
          >
            <div className="text-center mb-10">
              <p className="text-lp-text3 text-[11px] font-mono font-bold tracking-[0.2em] uppercase mb-4">Presensi Kelas</p>
              <h1 className="text-4xl md:text-5xl font-light text-white tracking-tight">{activeSession.course_name}</h1>
              <p className="text-lp-text3 text-lg mt-3 font-light">Pertemuan {activeSession.pertemuan_ke} · Scan QR untuk absen</p>
            </div>

            <div className="bg-white p-6 rounded-[2rem] shadow-2xl">
              <QRCodeSVG
                value={JSON.stringify({
                  session_token: qrToken,
                  course_id: activeSession.course_id,
                  pertemuan_ke: activeSession.pertemuan_ke,
                })}
                size={typeof window !== 'undefined' && window.innerWidth < 768 ? 220 : 300}
                level="H"
                includeMargin
              />
            </div>

            <div className="mt-10 flex gap-12 text-center">
              <div>
                <p className="text-4xl font-bold text-lp-green">{hadirCount}</p>
                <p className="text-lp-text3 text-sm mt-1 font-mono uppercase tracking-wider">Hadir</p>
              </div>
              <div>
                <p className="text-4xl font-bold text-white">{totalCount}</p>
                <p className="text-lp-text3 text-sm mt-1 font-mono uppercase tracking-wider">Total</p>
              </div>
              <div>
                <p className="text-4xl font-bold text-lp-amber">{belumCount}</p>
                <p className="text-lp-text3 text-sm mt-1 font-mono uppercase tracking-wider">Belum</p>
              </div>
            </div>

            <button
              onClick={() => setProjectorMode(false)}
              className="absolute top-5 right-5 flex items-center gap-2 text-lp-text3 hover:text-white text-[12px] font-bold bg-white/10 hover:bg-white/20 px-5 py-2.5 rounded-full transition-all uppercase tracking-widest"
            >
              <FaCompress />
              Keluar
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">

        {/* Navbar */}
        <Navbar user={user} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} skipProfileFetch={true} />

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 lg:p-10 max-w-7xl mx-auto">

            {/* Header */}
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 mb-12"
            >
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <button 
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="lg:hidden p-3 rounded-xl bg-white border border-lp-border hover:bg-lp-surface transition-all"
                  >
                    <FiChevronRight className="text-lp-text" />
                  </button>
                  <span className="text-[11px] font-mono font-medium tracking-[0.2em] uppercase text-lp-text3">
                    ATTENDANCE MANAGEMENT
                  </span>
                </div>
                <h1 className="text-4xl md:text-5xl font-light text-lp-text tracking-tight mb-3">
                  Manajemen Absensi
                  <span className="text-lp-text3 block text-lg font-normal mt-2">
                    Kelola sesi absensi QR Code per pertemuan
                  </span>
                </h1>
              </div>
              {activeSession && (
                <div className="flex items-center gap-2 text-lp-green bg-lp-green/10 border border-lp-green/20 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest">
                  <span className="w-1.5 h-1.5 rounded-full bg-lp-green animate-pulse" />
                  Sesi Aktif
                </div>
              )}
            </motion.div>

            <AnimatePresence mode="wait">

              {/* ══════════════════════════════
                  IDLE STATE — No active session
              ══════════════════════════════ */}
              {!activeSession ? (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.22 }}
                  className="grid grid-cols-1 lg:grid-cols-5 gap-6"
                >
                  {/* ── Create Session Form (3 cols) ── */}
                  <div className="lg:col-span-3">
                    <div className="bg-white rounded-[2.5rem] border border-lp-border shadow-sm overflow-hidden">
                      <div className="px-8 py-6 border-b border-lp-border flex items-center gap-3">
                        <div className="p-3 bg-lp-accentS rounded-xl shrink-0">
                          <FaQrcode className="text-lp-atext text-sm" />
                        </div>
                        <div>
                          <h2 className="text-sm font-bold text-lp-text tracking-tight">Buat Sesi Absensi Baru</h2>
                          <p className="text-[11px] text-lp-text3 font-light mt-0.5">Mahasiswa scan QR Code untuk mencatat kehadiran</p>
                        </div>
                      </div>

                      <form onSubmit={handleCreateSession} className="p-8 space-y-8">
                        {/* Mata Kuliah */}
                        <div>
                          <label className="block text-[11px] font-mono font-semibold text-lp-text mb-3 tracking-widest uppercase">
                            Mata Kuliah *
                          </label>
                          <select
                            value={courseID}
                            onChange={(e) => setCourseID(e.target.value)}
                            className="w-full bg-lp-surface font-normal text-[15px] text-lp-text border border-lp-border rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-lp-accent/10 focus:border-lp-text transition-all duration-500 appearance-none"
                            required
                            disabled={loadingCourses || createSessionMutation.isPending}
                          >
                            <option value="">— Pilih Mata Kuliah —</option>
                            {courses?.map((c) => (
                              <option key={c.kode} value={c.kode}>
                                {c.nama} ({c.kode}) · {c.hari} {c.jam_mulai}–{c.jam_selesai}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Pertemuan ke */}
                        <div>
                          <label className="block text-[11px] font-mono font-semibold text-lp-text mb-3 tracking-widest uppercase">
                            Pertemuan Ke-
                          </label>
                          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                            {pertemuanList.map(p => {
                              const isUsed = getUsedPertemuan().includes(p)
                              return (
                                <button
                                  key={p}
                                  type="button"
                                  disabled={isUsed}
                                  onClick={() => setPertemuanKe(p)}
                                  title={isUsed ? `Pertemuan ${p} sudah digunakan` : undefined}
                                  className={`h-10 rounded-xl text-sm font-bold transition-all duration-300 ${
                                    isUsed
                                      ? 'bg-lp-surface text-lp-text3/40 cursor-not-allowed line-through'
                                      : pertemuanKe === p
                                      ? 'bg-lp-text text-white shadow-md'
                                      : 'bg-white text-lp-text2 hover:bg-lp-surface border border-lp-border'
                                  }`}
                                >
                                  {p}
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        {/* Durasi */}
                        <div>
                          <div className="flex justify-between items-center mb-3">
                            <label className="text-[11px] font-mono font-semibold text-lp-text tracking-widest uppercase">Durasi Sesi</label>
                            <span className="text-sm font-bold text-lp-atext font-mono">{duration} menit</span>
                          </div>
                          <input
                            type="range"
                            value={duration}
                            onChange={(e) => setDuration(e.target.value)}
                            min="5" max="120" step="5"
                            className="w-full h-1.5 bg-lp-surface rounded-full appearance-none cursor-pointer accent-lp-text"
                          />
                          <div className="flex justify-between text-[10px] text-lp-text3 mt-2 font-mono tracking-wider">
                            <span>5 min</span>
                            <span>120 min</span>
                          </div>
                        </div>

                        {/* Submit */}
                        <button
                          type="submit"
                          disabled={createSessionMutation.isPending || !courseID}
                          className="w-full flex items-center justify-center gap-3 bg-lp-text hover:bg-lp-atext text-white py-4 rounded-full text-[13px] font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-500 uppercase tracking-widest shadow-[0_12px_24px_rgba(0,0,0,0.1)] hover:-translate-y-0.5"
                        >
                          {createSessionMutation.isPending ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              Membuat Sesi...
                            </>
                          ) : (
                            <>
                              <FaBolt />
                              Buat Sesi — Pertemuan {pertemuanKe}
                            </>
                          )}
                        </button>

                        {createSessionMutation.isError && (
                          <div className="flex items-center gap-2.5 p-4 bg-lp-red/5 border border-lp-red/20 rounded-2xl text-lp-red text-sm">
                            <FaTimesCircle className="shrink-0" />
                            {createSessionMutation.error?.response?.data?.message || 'Gagal membuat sesi'}
                          </div>
                        )}
                      </form>
                    </div>
                  </div>

                  {/* ── Right: Active sessions + History (2 cols) ── */}
                  <div className="lg:col-span-2 space-y-5">

                    {/* Running sessions */}
                    {activeSessions?.sessions?.length > 0 && (
                      <div className="bg-white rounded-[2rem] border border-lp-border shadow-sm p-6">
                        <div className="flex items-center gap-2 mb-5">
                          <span className="text-[11px] font-mono font-bold text-lp-text3 uppercase tracking-[0.2em]">Sesi Berjalan</span>
                          <div className="h-px flex-1 bg-lp-border" />
                        </div>
                        <div className="space-y-3">
                          {activeSessions.sessions.slice(0, 3).map(session => (
                            <div key={session.id} className="p-4 border border-lp-border rounded-2xl hover:border-lp-text/20 hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all duration-500">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1 min-w-0">
                                  <p className="font-bold text-lp-text text-sm truncate tracking-tight">{session.course_name}</p>
                                  <p className="text-[11px] text-lp-text3 mt-0.5 font-mono">Pertemuan {session.pertemuan_ke}</p>
                                </div>
                                <span className={`ml-2 shrink-0 px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono ${
                                  session.time_left_minutes > 0
                                    ? 'bg-lp-green/10 text-lp-green'
                                    : 'bg-lp-surface text-lp-text3'
                                }`}>
                                  {session.time_left_minutes > 0 ? `${session.time_left_minutes}m` : 'Habis'}
                                </span>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    setActiveSession({
                                      session_id: session.id,
                                      course_name: session.course_name,
                                      course_id: session.course_id,
                                      session_token: session.session_token,
                                      expires_at: session.expires_at,
                                      pertemuan_ke: session.pertemuan_ke,
                                      created_at: session.created_at,
                                    })
                                    setQrToken(session.session_token)
                                    startAutoRefresh()
                                  }}
                                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full bg-lp-text text-white text-[11px] font-bold hover:bg-lp-atext transition-all uppercase tracking-widest"
                                >
                                  <FaQrcode className="text-xs" /> Monitor
                                </button>
                                <button
                                  onClick={() => { if (window.confirm('Tutup sesi ini?')) closeSessionMutation.mutate(session.id) }}
                                  className="w-10 h-10 rounded-full bg-lp-red/5 text-lp-red hover:bg-lp-red/10 border border-lp-red/20 transition-all flex items-center justify-center"
                                >
                                  <FaStopCircle className="text-xs" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* History */}
                    <div className="bg-white rounded-[2rem] border border-lp-border shadow-sm p-6">
                      <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono font-bold text-lp-text3 uppercase tracking-[0.2em]">Riwayat</span>
                          <div className="h-px w-8 bg-lp-border" />
                        </div>
                        <button
                          onClick={() => refetchHistory()}
                          className="p-2 rounded-full bg-lp-surface border border-lp-border text-lp-text3 hover:text-lp-text hover:rotate-180 transition-all duration-700"
                        >
                          <FiRefreshCw className="text-xs" />
                        </button>
                      </div>

                      {pertemuanHistory?.length > 0 ? (
                        <div className="space-y-1">
                          {pertemuanHistory.slice(0, 5).map((item, i) => (
                            <button
                              key={i}
                              onClick={() => handleViewHistoryDetail(item)}
                              className="w-full flex items-center gap-3 p-3.5 rounded-2xl hover:bg-lp-surface border border-transparent hover:border-lp-border transition-all text-left"
                            >
                              <div className="w-9 h-9 bg-lp-accentS rounded-xl flex items-center justify-center shrink-0">
                                <FaCalendarCheck className="text-lp-atext text-xs" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-lp-text truncate tracking-tight">{item.course_name}</p>
                                <p className="text-[11px] text-lp-text3 mt-0.5 font-mono">
                                  P{item.pertemuan_ke} · {item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : ''}
                                </p>
                                <div className="flex gap-1.5 mt-1">
                                  <span className="text-[10px] font-bold px-2 py-0.5 bg-lp-green/10 text-lp-green rounded-full font-mono">
                                    {item.hadir_count || 0} H
                                  </span>
                                  <span className="text-[10px] font-bold px-2 py-0.5 bg-lp-red/10 text-lp-red rounded-full font-mono">
                                    {item.alpa_count || 0} A
                                  </span>
                                </div>
                              </div>
                              <FaChevronRight className="text-lp-text3/50 text-xs shrink-0" />
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-10">
                          <div className="w-12 h-12 rounded-2xl bg-lp-surface flex items-center justify-center mx-auto mb-3">
                            <FaHistory className="text-xl text-lp-text3" />
                          </div>
                          <p className="text-sm text-lp-text3 font-light">Belum ada riwayat</p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>

              ) : (
                /* ══════════════════════════════
                   ACTIVE SESSION DASHBOARD
                ══════════════════════════════ */
                <motion.div
                  key="active"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.22 }}
                >
                  {/* Session bar */}
                  <div className="bg-white rounded-[2rem] border border-lp-border shadow-sm p-5 mb-6 flex flex-wrap items-center gap-4">
                    <div className="p-3 bg-lp-green/10 rounded-xl shrink-0">
                      <FaHourglassHalf className="text-lp-green text-sm" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-lp-text text-sm truncate tracking-tight">{activeSession.course_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] font-bold text-lp-green bg-lp-green/10 px-2.5 py-0.5 rounded-full font-mono">
                          P{activeSession.pertemuan_ke}
                        </span>
                        {autoRefreshActive && (
                          <span className="text-[11px] text-lp-green font-bold flex items-center gap-1 font-mono uppercase tracking-wider">
                            <span className="w-1.5 h-1.5 rounded-full bg-lp-green animate-pulse" />
                            Live
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setProjectorMode(true)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-lp-surface border border-lp-border text-lp-text2 hover:border-lp-text hover:text-lp-text text-[11px] font-bold transition-all uppercase tracking-widest"
                      >
                        <FaExpand className="text-xs" />
                        <span className="hidden sm:inline">Proyektor</span>
                      </button>
                      <button
                        onClick={() => refreshTokenMutation.mutate(activeSession.session_id)}
                        disabled={refreshTokenMutation.isPending}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-lp-surface border border-lp-border text-lp-text2 hover:border-lp-text hover:text-lp-text text-[11px] font-bold transition-all uppercase tracking-widest disabled:opacity-50"
                      >
                        <FaSync className={`text-xs ${refreshTokenMutation.isPending ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">Refresh QR</span>
                      </button>
                      <button
                        onClick={handleCloseSession}
                        disabled={closeSessionMutation.isPending}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-lp-red/5 border border-lp-red/20 text-lp-red hover:bg-lp-red/10 text-[11px] font-bold transition-all uppercase tracking-widest disabled:opacity-50"
                      >
                        {closeSessionMutation.isPending
                          ? <div className="w-3.5 h-3.5 border-2 border-lp-red/50 border-t-lp-red rounded-full animate-spin" />
                          : <FaStopCircle className="text-xs" />
                        }
                        <span className="hidden sm:inline">Tutup Sesi</span>
                      </button>
                    </div>
                  </div>

                  {/* Dashboard grid */}
                  <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

                    {/* Left: QR + Stats */}
                    <div className="xl:col-span-2 space-y-5">

                      {/* QR Card */}
                      <div className="bg-white rounded-[2.5rem] border border-lp-border shadow-sm p-8 flex flex-col items-center">
                        <p className="text-[11px] font-mono font-bold text-lp-text3 uppercase tracking-[0.2em] mb-6">QR Code Absensi</p>
                        <div className="p-4 border-2 border-lp-border rounded-[2rem] bg-white mb-6">
                          {qrToken && (
                            <QRCodeSVG
                              value={JSON.stringify({
                                session_token: qrToken,
                                course_id: activeSession.course_id,
                                pertemuan_ke: activeSession.pertemuan_ke,
                              })}
                              size={192}
                              level="H"
                              includeMargin={false}
                            />
                          )}
                        </div>
                        <p className="text-xs text-lp-text3 text-center mb-4 leading-relaxed font-light">
                          Tampilkan di layar kelas agar mahasiswa dapat scan
                        </p>
                        <button
                          onClick={() => setProjectorMode(true)}
                          className="flex items-center gap-1.5 text-lp-atext text-sm font-bold hover:text-lp-text transition-colors"
                        >
                          <FaExpand className="text-xs" />
                          Tampilkan Fullscreen
                        </button>
                      </div>

                      {/* Stats */}
                      <div className="bg-white rounded-[2.5rem] border border-lp-border shadow-sm p-6">
                        <p className="text-[11px] font-mono font-bold text-lp-text3 uppercase tracking-[0.2em] mb-5">Statistik Kehadiran</p>
                        <div className="mb-5">
                          <div className="flex justify-between text-xs font-bold mb-2">
                            <span className="text-lp-text2">Tingkat Kehadiran</span>
                            <span className="text-lp-green font-mono">{progressPct}%</span>
                          </div>
                          <div className="h-2 bg-lp-surface rounded-full overflow-hidden">
                            <motion.div
                              className="h-full bg-lp-green rounded-full"
                              animate={{ width: `${progressPct}%` }}
                              transition={{ duration: 0.6, ease: 'easeOut' }}
                            />
                          </div>
                          <p className="text-[11px] text-lp-text3 mt-2 font-mono">{hadirCount} dari {totalCount} mahasiswa hadir</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <StatCard label="Hadir"       value={hadirCount}                       color="text-lp-green" />
                          <StatCard label="Belum"       value={belumCount}                       color="text-lp-amber" />
                          <StatCard label="Izin"        value={sessionStudents?.izin_count || 0} color="text-lp-accent" />
                          <StatCard label="Alpa"        value={sessionStudents?.alpa_count || 0} color="text-lp-red" />
                        </div>
                      </div>
                    </div>

                    {/* Right: Student list */}
                    <div className="xl:col-span-3">
                      <div className="bg-white rounded-[2.5rem] border border-lp-border shadow-sm flex flex-col h-full overflow-hidden">
                        <div className="flex items-center justify-between px-7 py-5 border-b border-lp-border shrink-0">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-lp-accentS rounded-xl">
                              <FaUsers className="text-lp-atext text-sm" />
                            </div>
                            <div>
                              <h3 className="font-bold text-lp-text text-sm tracking-tight">Daftar Mahasiswa</h3>
                              <p className="text-[11px] text-lp-text3 font-mono">Pertemuan {activeSession.pertemuan_ke}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => refetchStudents()}
                            disabled={loadingStudents}
                            className="p-2.5 rounded-full bg-lp-surface border border-lp-border text-lp-text3 hover:text-lp-text hover:rotate-180 transition-all duration-700"
                          >
                            <FaSync className={`text-xs ${loadingStudents ? 'animate-spin' : ''}`} />
                          </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-5 space-y-2" style={{ maxHeight: '56vh' }}>
                          {loadingStudents && localStudents.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16">
                              <div className="w-8 h-8 border-2 border-lp-text/10 border-t-lp-text rounded-full animate-spin mb-4" />
                              <p className="text-sm text-lp-text3 font-light">Memuat mahasiswa...</p>
                            </div>
                          ) : getSortedStudents().length > 0 ? (
                            <AnimatePresence>
                              {getSortedStudents().map((student) => (
                                <motion.div
                                  key={student.id}
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ duration: 0.18 }}
                                  className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all duration-300 ${
                                    student.attendance_status === 'hadir'
                                      ? 'border-lp-green/20 bg-lp-green/5'
                                      : student.attendance_status === 'alpa'
                                      ? 'border-lp-red/20 bg-lp-red/5'
                                      : ['izin', 'sakit'].includes(student.attendance_status)
                                      ? 'border-lp-amber/20 bg-lp-amber/5'
                                      : 'border-lp-border hover:border-lp-text/10 bg-white'
                                  }`}
                                >
                                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                                    student.attendance_status === 'hadir' ? 'bg-lp-green/10 text-lp-green' :
                                    student.attendance_status === 'alpa'  ? 'bg-lp-red/10 text-lp-red' :
                                    ['izin','sakit'].includes(student.attendance_status) ? 'bg-lp-amber/10 text-lp-amber' :
                                    'bg-lp-surface text-lp-text3'
                                  }`}>
                                    {student.name?.charAt(0)?.toUpperCase() || '?'}
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className="font-bold text-lp-text text-sm truncate tracking-tight">{student.name}</p>
                                      <StatusBadge status={student.attendance_status} />
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <span className="text-[11px] text-lp-text3 font-mono">{student.nim}</span>
                                      {student.attendance_time && (
                                        <span className="text-[11px] text-lp-text3 flex items-center gap-1 font-mono">
                                          <FaClock className="text-[9px]" />
                                          {student.attendance_time}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-0.5 shrink-0 bg-lp-surface p-1 rounded-xl border border-lp-border">
                                    {[
                                      { key: 'hadir', label: 'H', active: 'bg-lp-green text-white', base: 'text-lp-text3 hover:text-lp-green hover:bg-white' },
                                      { key: 'izin',  label: 'I', active: 'bg-lp-amber text-white', base: 'text-lp-text3 hover:text-lp-amber hover:bg-white' },
                                      { key: 'sakit', label: 'S', active: 'bg-lp-accent text-white', base: 'text-lp-text3 hover:text-lp-atext hover:bg-white' },
                                      { key: 'alpa',  label: 'A', active: 'bg-lp-red text-white', base: 'text-lp-text3 hover:text-lp-red hover:bg-white' },
                                    ].map(btn => (
                                      <button
                                        key={btn.key}
                                        onClick={() => handleStatusUpdate(student.id, btn.key)}
                                        title={btn.key}
                                        className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                                          student.attendance_status === btn.key ? btn.active : btn.base
                                        }`}
                                      >
                                        {btn.label}
                                      </button>
                                    ))}
                                    <button
                                      onClick={() => { setSelectedStudent(student); setManualStatus(student.attendance_status || 'hadir'); setShowManualModal(true) }}
                                      className="w-7 h-7 rounded-lg text-lp-text3 hover:text-lp-atext hover:bg-white transition-all flex items-center justify-center"
                                    >
                                      <FaEdit className="text-[10px]" />
                                    </button>
                                  </div>
                                </motion.div>
                              ))}
                            </AnimatePresence>
                          ) : (
                            <div className="flex flex-col items-center justify-center py-16">
                              <div className="w-14 h-14 rounded-2xl bg-lp-surface flex items-center justify-center mb-4">
                                <FaUserCircle className="text-2xl text-lp-text3" />
                              </div>
                              <p className="text-sm text-lp-text2 font-bold tracking-tight">Belum ada mahasiswa</p>
                              <p className="text-xs text-lp-text3 mt-0.5 font-light">Mahasiswa akan muncul setelah scan QR</p>
                            </div>
                          )}
                        </div>

                        {sessionStudents && getSortedStudents().length > 0 && (
                          <div className="border-t border-lp-border px-7 py-3.5 flex items-center justify-between shrink-0">
                            <span className="text-[11px] text-lp-text3 font-mono">
                              {hadirCount} hadir · {belumCount} belum · {totalCount} total
                            </span>
                            <span className="text-[11px] font-bold text-lp-green font-mono">{progressPct}%</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* ── Manual Status Modal ── */}
      <AnimatePresence>
        {showManualModal && selectedStudent && (
          <motion.div
            key="manual-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-lp-text/30 backdrop-blur-md flex items-center justify-center z-[150] p-4"
            onClick={(e) => { if (e.target === e.currentTarget) { setShowManualModal(false); setSelectedStudent(null) } }}
          >
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.18 }}
              className="bg-white border border-lp-border rounded-[2rem] p-8 w-full max-w-sm shadow-[0_32px_64px_rgba(0,0,0,0.12)]"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <span className="text-[11px] font-mono font-medium tracking-[0.2em] uppercase text-lp-text3 mb-1 block">UPDATE STATUS</span>
                  <h3 className="font-bold text-lp-text text-lg tracking-tight">{selectedStudent.name}</h3>
                  <p className="text-sm text-lp-text3 mt-0.5 font-mono">{selectedStudent.nim}</p>
                </div>
                <button
                  onClick={() => { setShowManualModal(false); setSelectedStudent(null) }}
                  className="w-10 h-10 rounded-full bg-lp-surface border border-lp-border text-lp-text3 flex items-center justify-center hover:bg-lp-text hover:text-white transition-all duration-300"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                {[
                  { value: 'hadir', label: 'Hadir', letter: 'H', active: 'border-lp-green bg-lp-green/5 text-lp-green', chip: 'bg-lp-green/10 text-lp-green' },
                  { value: 'izin',  label: 'Izin',  letter: 'I', active: 'border-lp-amber bg-lp-amber/5 text-lp-amber', chip: 'bg-lp-amber/10 text-lp-amber' },
                  { value: 'sakit', label: 'Sakit', letter: 'S', active: 'border-lp-accent bg-lp-accent/5 text-lp-atext', chip: 'bg-lp-accent/10 text-lp-atext' },
                  { value: 'alpa',  label: 'Alpa',  letter: 'A', active: 'border-lp-red bg-lp-red/5 text-lp-red', chip: 'bg-lp-red/10 text-lp-red' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setManualStatus(opt.value)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 font-bold transition-all duration-300 ${
                      manualStatus === opt.value
                        ? opt.active
                        : 'border-lp-border bg-white text-lp-text3 hover:border-lp-text/20'
                    }`}
                  >
                    <span className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold ${
                      manualStatus === opt.value ? opt.chip : 'bg-lp-surface text-lp-text3'
                    }`}>
                      {opt.letter}
                    </span>
                    <span className="text-sm">{opt.label}</span>
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setShowManualModal(false); setSelectedStudent(null) }}
                  className="flex-1 py-3 rounded-full border border-lp-border text-lp-text2 text-[12px] font-bold hover:bg-lp-surface transition-all uppercase tracking-widest"
                >
                  Batal
                </button>
                <button
                  onClick={() => handleStatusUpdate(selectedStudent.id, manualStatus)}
                  disabled={updateStatusMutation.isPending}
                  className="flex-1 py-3 rounded-full bg-lp-text text-white text-[12px] font-bold hover:bg-lp-atext disabled:opacity-50 flex items-center justify-center gap-2 transition-all uppercase tracking-widest shadow-[0_8px_20px_rgba(0,0,0,0.1)]"
                >
                  {updateStatusMutation.isPending
                    ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <FaCheckCircle className="text-sm" />
                  }
                  Simpan
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── History Detail Modal ── */}
      <AnimatePresence>
        {historyModalOpen && selectedHistorySession && (
          <motion.div
            key="history-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-lp-text/30 backdrop-blur-md flex items-center justify-center z-[150] p-4"
            onClick={(e) => { if (e.target === e.currentTarget) { setHistoryModalOpen(false); setSelectedHistorySession(null) } }}
          >
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              transition={{ duration: 0.18 }}
              className="bg-lp-bg border border-lp-border rounded-[2.5rem] w-full max-w-2xl shadow-[0_64px_128px_rgba(0,0,0,0.15)] flex flex-col max-h-[85vh] overflow-hidden relative"
            >
              {/* Decorative */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-lp-text/5 blur-[80px] rounded-full translate-x-1/2 -translate-y-1/2" />

              <div className="flex items-start justify-between px-8 py-6 border-b border-lp-border shrink-0 relative z-10">
                <div>
                  <span className="text-[11px] font-mono font-bold text-lp-atext uppercase tracking-[0.2em] mb-2 block">Riwayat Pertemuan</span>
                  <h3 className="font-bold text-lp-text text-xl leading-tight tracking-tight">{selectedHistorySession.course_name}</h3>
                  <p className="text-sm text-lp-text3 mt-1 font-light">
                    Pertemuan ke-{selectedHistorySession.pertemuan_ke} · {selectedHistorySession.created_at
                      ? new Date(selectedHistorySession.created_at).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                      : ''}
                  </p>
                </div>
                <button
                  onClick={() => { setHistoryModalOpen(false); setSelectedHistorySession(null) }}
                  className="w-10 h-10 rounded-full bg-white border border-lp-border text-lp-text3 flex items-center justify-center hover:bg-lp-text hover:text-white transition-all duration-300 ml-4 shrink-0"
                >
                  ✕
                </button>
              </div>

              {loadingHistoryDetails ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="w-8 h-8 border-2 border-lp-text/10 border-t-lp-text rounded-full animate-spin mb-4" />
                  <p className="text-sm text-lp-text3 font-light">Memuat rekap absensi...</p>
                </div>
              ) : (
                <div className="flex-1 overflow-hidden flex flex-col min-h-0 p-8 gap-5 relative z-10">
                  {/* Stats */}
                  <div className="grid grid-cols-5 gap-2 shrink-0">
                    {[
                      { label: 'Total',  value: historySessionDetails?.total_students || selectedHistorySession.total_students || 0, color: 'text-lp-text' },
                      { label: 'Hadir',  value: historySessionDetails?.hadir_count    || selectedHistorySession.hadir_count    || 0, color: 'text-lp-green' },
                      { label: 'Izin',   value: historySessionDetails?.izin_count     || selectedHistorySession.izin_count     || 0, color: 'text-lp-amber' },
                      { label: 'Sakit',  value: historySessionDetails?.sakit_count    || selectedHistorySession.sakit_count    || 0, color: 'text-lp-accent' },
                      { label: 'Alpa',   value: historySessionDetails?.alpa_count     || selectedHistorySession.alpa_count     || 0, color: 'text-lp-red' },
                    ].map((stat, i) => (
                      <div key={i} className="flex flex-col items-center p-3 rounded-2xl bg-white border border-lp-border">
                        <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                        <p className="text-[10px] text-lp-text3 font-mono font-bold mt-0.5 uppercase tracking-wider">{stat.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Search */}
                  <div className="relative shrink-0">
                    <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-lp-text3 text-xs" />
                    <input
                      type="text"
                      placeholder="Cari nama atau NIM..."
                      value={historySearchQuery}
                      onChange={(e) => setHistorySearchQuery(e.target.value)}
                      className="w-full bg-lp-surface border border-lp-border rounded-2xl pl-10 pr-4 py-3 text-sm text-lp-text placeholder-lp-text3 focus:outline-none focus:ring-2 focus:ring-lp-accent/10 focus:border-lp-text transition-all"
                    />
                  </div>

                  {/* Student list */}
                  <div className="flex-1 overflow-y-auto space-y-2">
                    {historySessionDetails?.students
                      ?.filter(s =>
                        s.name?.toLowerCase().includes(historySearchQuery.toLowerCase()) ||
                        s.nim?.includes(historySearchQuery)
                      )
                      .map((student) => (
                        <div
                          key={student.id}
                          className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all ${
                            student.attendance_status === 'hadir' ? 'border-lp-green/20 bg-lp-green/5' :
                            student.attendance_status === 'alpa'  ? 'border-lp-red/20 bg-lp-red/5' :
                            ['izin','sakit'].includes(student.attendance_status) ? 'border-lp-amber/20 bg-lp-amber/5' :
                            'border-lp-border bg-white'
                          }`}
                        >
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                            student.attendance_status === 'hadir' ? 'bg-lp-green/10 text-lp-green' :
                            student.attendance_status === 'alpa'  ? 'bg-lp-red/10 text-lp-red' :
                            ['izin','sakit'].includes(student.attendance_status) ? 'bg-lp-amber/10 text-lp-amber' :
                            'bg-lp-surface text-lp-text3'
                          }`}>
                            {student.name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-lp-text text-sm truncate tracking-tight">{student.name}</p>
                              <StatusBadge status={student.attendance_status} />
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[11px] text-lp-text3 font-mono">{student.nim}</span>
                              {student.attendance_time && (
                                <span className="text-[11px] text-lp-text3 flex items-center gap-1 font-mono">
                                  <FaClock className="text-[9px]" />
                                  {student.attendance_time}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )) ?? (
                        <div className="text-center py-10 text-sm text-lp-text3 font-light">Tidak ada data</div>
                      )
                    }
                  </div>
                </div>
              )}

              <div className="px-8 pb-6 pt-4 border-t border-lp-border shrink-0 relative z-10">
                <button
                  onClick={() => { setHistoryModalOpen(false); setSelectedHistorySession(null) }}
                  className="w-full py-3.5 rounded-full bg-lp-surface hover:bg-lp-text hover:text-white border border-lp-border text-lp-text text-[12px] font-bold transition-all duration-500 uppercase tracking-widest"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Confirmation Modal ── */}
      <ConfirmationModal
        open={confirmCloseOpen}
        title="Tutup sesi absensi?"
        description="Sesi akan dikunci dan mahasiswa tidak dapat mengirim presensi lagi. Riwayat pertemuan tetap tersimpan."
        confirmLabel="Tutup Sesi"
        pending={closeSessionMutation.isPending}
        onCancel={() => setConfirmCloseOpen(false)}
        onConfirm={() => closeSessionMutation.mutate(activeSession?.session_id)}
      />

      {/* ── Toast notification ── */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {notice && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="fixed left-1/2 top-5 z-[350] -translate-x-1/2 max-w-sm w-[90vw] bg-lp-text text-white text-sm font-medium px-5 py-3.5 rounded-full shadow-[0_12px_24px_rgba(0,0,0,0.15)]"
            >
              {notice}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}

      {/* ── Live notifications ── */}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2.5 max-w-xs w-full pointer-events-none">
        <AnimatePresence>
          {liveNotifications.map(n => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="pointer-events-auto bg-white border border-lp-border rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.06)] px-4 py-3.5 flex gap-3 items-start"
            >
              <span className="w-8 h-8 rounded-xl bg-lp-green/10 text-lp-green flex items-center justify-center shrink-0">
                <FaUserCheck className="text-xs" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-lp-text tracking-tight">{n.title}</p>
                <p className="text-[11px] text-lp-text3 mt-0.5 leading-snug font-light">{n.description}</p>
              </div>
              <time className="text-[10px] text-lp-text3 shrink-0 font-mono mt-0.5">{n.time}</time>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default AbsensiDosen
