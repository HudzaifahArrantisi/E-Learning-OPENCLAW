import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQuery } from "@tanstack/react-query"
import api from '../../services/api'
import Sidebar from '../../components/Sidebar'
import { AnimatePresence, motion } from 'framer-motion'

import {
  FaQrcode,
  FaUsers,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaUserCheck,
  FaUserTimes,
  FaStopCircle,
  FaSync,
  FaEdit,
  FaHistory,
  FaUserCircle,
  FaExpand,
  FaCompress,
  FaGraduationCap,
  FaBolt,
  FaLayerGroup,
  FaHourglassHalf,
  FaChevronRight,
  FaCalendarCheck,
  FaSearch,
} from 'react-icons/fa'
import { QRCodeSVG } from 'qrcode.react'

/* ─────────────────────────────────────
   Helper tiny components
───────────────────────────────────── */
const StatusBadge = ({ status }) => {
  const map = {
    hadir:       { label: 'Hadir',      cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    izin:        { label: 'Izin',       cls: 'bg-amber-50   text-amber-700   border-amber-200'   },
    sakit:       { label: 'Sakit',      cls: 'bg-sky-50     text-sky-700     border-sky-200'     },
    alpa:        { label: 'Alpa',       cls: 'bg-rose-50    text-rose-700    border-rose-200'    },
    belum_absen: { label: 'Belum',      cls: 'bg-slate-50   text-slate-500   border-slate-200'   },
  }
  const key = status?.toLowerCase() || 'belum_absen'
  const { label, cls } = map[key] || map['belum_absen']
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>
      {label}
    </span>
  )
}

const StatCard = ({ label, value, color }) => (
  <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200/60 bg-white/55 py-3 px-2 shadow-[inset_0_1px_0_rgba(255,255,255,.9),0_12px_30px_rgba(15,23,42,.05)] backdrop-blur-xl">
    <p className={`text-2xl font-black font-mono tracking-tight ${color}`}>{value}</p>
    <p className="text-xs font-medium text-slate-500 mt-0.5">{label}</p>
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
          className="fixed inset-0 z-[300] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-md"
          onClick={(event) => event.target === event.currentTarget && onCancel()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 12 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-white/70 bg-white/85 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,.95),0_32px_90px_rgba(15,23,42,.28)] backdrop-blur-2xl"
          >
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,rgba(75,115,255,.18),transparent_48%)]" />
            <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[.24em] text-lp-accent">Konfirmasi Sistem</p>
            <h3 className="text-xl font-black tracking-tight text-lp-text">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-lp-text2">{description}</p>
            <div className="mt-6 flex gap-3">
              <button onClick={onCancel} className="flex-1 rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3 text-sm font-bold text-lp-text2 transition hover:bg-white active:scale-95">Batal</button>
              <button onClick={onConfirm} disabled={pending} className="flex-1 rounded-2xl bg-lp-text px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-950/15 transition hover:bg-lp-accent disabled:opacity-50 active:scale-95">{pending ? 'Memproses...' : confirmLabel}</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

/* ─────────────────────────────────────
   Main Component
───────────────────────────────────── */
const AbsensiDosen = () => {
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

  // Real-time animation states
  const [localStudents, setLocalStudents] = useState([])
  const [liveNotifications, setLiveNotifications] = useState([])
  const checkInQueueRef = useRef([])

  // History Detail states
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
    const timeout = setTimeout(() => setNotice(null), 4500)
    return () => clearTimeout(timeout)
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
        icon: '🦀',
        title: 'OpenClaw Attendance Bot',
        description: `📢 ${next.name} (${next.nim}) berhasil presensi ${next.attendance_status?.toUpperCase()} — Pertemuan ${activeSession?.pertemuan_ke || pertemuanKe}`,
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
      .then(res => {
        setHistorySessionDetails(res.data.data)
        setLoadingHistoryDetails(false)
      })
      .catch(err => {
        setNotice('Gagal mengambil detail riwayat: ' + (err.response?.data?.message || err.message))
        setLoadingHistoryDetails(false)
        setHistoryModalOpen(false)
      })
  }

  const pertemuanList = Array.from({ length: 16 }, (_, i) => i + 1)

  const getUsedPertemuan = () => {
    if (!courseID) return []
    const used = new Set()
    
    // Get from history
    if (pertemuanHistory) {
      pertemuanHistory.forEach(item => {
        if (item.course_id === courseID) {
          used.add(item.pertemuan_ke)
        }
      })
    }
    
    // Get from active sessions
    if (activeSessions?.sessions) {
      activeSessions.sessions.forEach(item => {
        if (item.course_id === courseID) {
          used.add(item.pertemuan_ke)
        }
      })
    }
    
    return Array.from(used)
  }

  // Auto-select first available meeting number when courseID changes
  useEffect(() => {
    if (!courseID) return
    const used = getUsedPertemuan()
    if (used.includes(pertemuanKe)) {
      // Find first available meeting
      const available = pertemuanList.find(p => !used.includes(p))
      if (available) {
        setPertemuanKe(available)
      }
    }
  }, [courseID, pertemuanHistory, activeSessions])

  const hadirCount = sessionStudents?.hadir_count || 0
  const totalCount = sessionStudents?.total_students || 0
  const belumCount = totalCount - (sessionStudents?.attendance_count || 0)
  const progressPct = totalCount > 0 ? Math.round((hadirCount / totalCount) * 100) : 0

  /* ═══════════════════════════════════
     RENDER
  ═══════════════════════════════════ */
  return (
    <div className="relative flex min-h-screen overflow-hidden bg-lp-bg text-lp-text before:pointer-events-none before:fixed before:inset-0 before:bg-[linear-gradient(rgba(15,23,42,.045)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,.045)_1px,transparent_1px),radial-gradient(circle_at_45%_8%,rgba(75,115,255,.14),transparent_42%)] before:bg-[size:64px_64px,64px_64px,100%_100%] before:[mask-image:linear-gradient(to_bottom,black,transparent_75%)]">
      <Sidebar role="dosen" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Projector / Fullscreen QR Overlay */}
      <AnimatePresence>
        {projectorMode && activeSession && qrToken && (
          <motion.div
            key="projector"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900"
          >
            {/* Header info */}
            <motion.div
              initial={{ y: -30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-center mb-8"
            >
              <div className="flex items-center justify-center gap-3 mb-3">
                <span className="text-3xl">🦀</span>
                <span className="text-white/60 text-sm font-mono tracking-widest uppercase">OpenClaw Attendance</span>
              </div>
              <h1 className="text-3xl md:text-5xl font-black text-white">{activeSession.course_name}</h1>
              <p className="text-blue-300 text-lg mt-2 font-medium">
                Pertemuan {activeSession.pertemuan_ke} &nbsp;·&nbsp; Scan QR untuk absen
              </p>
            </motion.div>

            {/* QR Code */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="relative"
            >
              <div className="absolute -inset-4 rounded-3xl bg-blue-500/20 blur-2xl animate-pulse" />
              <div className="relative bg-white p-6 md:p-8 rounded-3xl shadow-2xl">
                <QRCodeSVG
                  value={JSON.stringify({
                    session_token: qrToken,
                    course_id: activeSession.course_id,
                    pertemuan_ke: activeSession.pertemuan_ke,
                  })}
                  size={typeof window !== 'undefined' && window.innerWidth < 768 ? 220 : 300}
                  level="H"
                  includeMargin={true}
                  bgColor="#FFFFFF"
                  fgColor="#1e3a8a"
                />
              </div>
            </motion.div>

            {/* Stats bar */}
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-10 flex gap-6 text-center"
            >
              <div>
                <p className="text-4xl font-black text-emerald-400">{hadirCount}</p>
                <p className="text-white/50 text-sm">Hadir</p>
              </div>
              <div className="w-px bg-white/10" />
              <div>
                <p className="text-4xl font-black text-white">{totalCount}</p>
                <p className="text-white/50 text-sm">Total</p>
              </div>
              <div className="w-px bg-white/10" />
              <div>
                <p className="text-4xl font-black text-amber-400">{belumCount}</p>
                <p className="text-white/50 text-sm">Belum Absen</p>
              </div>
            </motion.div>

            {/* Close projector */}
            <button
              onClick={() => setProjectorMode(false)}
              className="absolute top-6 right-6 flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm font-medium bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl backdrop-blur-sm"
            >
              <FaCompress />
              Keluar Mode Proyektor
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 min-w-0 transition-all duration-300">
        <div className="relative p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">

          {/* ── TOP HEADER ── */}
          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-3 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
            >
              <span className="text-xl text-slate-600">☰</span>
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <FaGraduationCap className="text-blue-500 text-lg" />
                <span className="text-xs font-bold text-blue-500 tracking-widest uppercase">Dosen Dashboard</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">Manajemen Absensi</h1>
              <p className="text-slate-500 text-sm font-medium mt-0.5">Kelola sesi absensi QR Code per pertemuan</p>
            </div>

            {/* Status pill */}
            {activeSession && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="hidden sm:flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-2 rounded-full text-sm font-semibold"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Sesi Aktif
              </motion.div>
            )}
          </div>

          {/* ══════════════════════════════
              IDLE STATE — No active session
          ══════════════════════════════ */}
          <AnimatePresence mode="wait">
            {!activeSession ? (
              <motion.div
                key="idle"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.35 }}
                className="grid grid-cols-1 lg:grid-cols-5 gap-6"
              >
                {/* ── Buat Sesi Form ── (3 cols) */}
                <div className="lg:col-span-3">
                  <div className="bg-white rounded-3xl border border-slate-200 shadow-[0_4px_24px_rgba(0,0,0,0.06)] overflow-hidden">
                    {/* Card header gradient */}
                    <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
                          <FaQrcode className="text-white text-lg" />
                        </div>
                        <div>
                          <h2 className="text-white font-black text-lg">Buat Sesi Absensi Baru</h2>
                          <p className="text-blue-100 text-xs font-medium">Mahasiswa scan QR Code untuk hadir</p>
                        </div>
                      </div>
                    </div>

                    <form onSubmit={handleCreateSession} className="p-6 space-y-5">
                      {/* Mata Kuliah */}
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                          Mata Kuliah
                        </label>
                        <select
                          value={courseID}
                          onChange={(e) => setCourseID(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
                        <label className="block text-sm font-bold text-slate-700 mb-2">
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
                                title={isUsed ? `Pertemuan ${p} sudah digunakan` : `Pilih Pertemuan ${p}`}
                                className={`h-10 rounded-xl text-sm font-bold transition-all relative ${
                                  isUsed
                                    ? 'bg-slate-100 text-slate-300 cursor-not-allowed line-through'
                                    : pertemuanKe === p
                                    ? 'bg-blue-600 text-white shadow-[0_4px_12px_rgba(59,130,246,0.4)]'
                                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
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
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-sm font-bold text-slate-700">Durasi Sesi</label>
                          <span className="text-sm font-black text-blue-600 bg-blue-50 px-3 py-0.5 rounded-full">
                            {duration} menit
                          </span>
                        </div>
                        <input
                          type="range"
                          value={duration}
                          onChange={(e) => setDuration(e.target.value)}
                          min="5" max="120" step="5"
                          className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-blue-600"
                        />
                        <div className="flex justify-between text-xs text-slate-400 font-medium mt-1">
                          <span>5m</span>
                          <span>120m</span>
                        </div>
                      </div>

                      {/* Submit */}
                      <button
                        type="submit"
                        disabled={createSessionMutation.isPending || !courseID}
                        className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white py-4 rounded-2xl font-black text-base hover:from-blue-700 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-[0_4px_16px_rgba(59,130,246,0.4)] hover:shadow-[0_6px_20px_rgba(59,130,246,0.5)] hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3"
                      >
                        {createSessionMutation.isPending ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
                        <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-sm font-medium">
                          <FaTimesCircle className="text-rose-500 shrink-0" />
                          {createSessionMutation.error?.response?.data?.message || 'Gagal membuat sesi'}
                        </div>
                      )}
                    </form>
                  </div>
                </div>

                {/* ── Sidebar right: Riwayat & Sesi aktif tersisa ── (2 cols) */}
                <div className="lg:col-span-2 space-y-5">

                  {/* Sesi aktif (dari server, bukan state lokal) */}
                  {activeSessions?.sessions?.length > 0 && (
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-[0_4px_24px_rgba(0,0,0,0.06)] p-5">
                      <h3 className="font-black text-slate-800 text-base mb-4 flex items-center gap-2">
                        <FaLayerGroup className="text-blue-500" />
                        Sesi Berjalan
                      </h3>
                      <div className="space-y-3">
                        {activeSessions.sessions.slice(0, 3).map(session => (
                          <div key={session.id} className="border border-slate-100 rounded-2xl p-4 hover:border-blue-200 hover:bg-blue-50/30 transition-all">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-slate-800 text-sm truncate">{session.course_name}</p>
                                <p className="text-slate-400 text-xs font-medium mt-0.5">Pertemuan {session.pertemuan_ke}</p>
                              </div>
                              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold shrink-0 ${
                                session.time_left_minutes > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
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
                                className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                              >
                                <FaQrcode />
                                Monitor
                              </button>
                              <button
                                onClick={() => { if (window.confirm('Tutup sesi ini?')) closeSessionMutation.mutate(session.id) }}
                                className="flex items-center justify-center w-9 h-9 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                              >
                                <FaStopCircle />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Riwayat Pertemuan */}
                  <div className="bg-white rounded-3xl border border-slate-200 shadow-[0_4px_24px_rgba(0,0,0,0.06)] p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-black text-slate-800 text-base flex items-center gap-2">
                        <FaHistory className="text-blue-500" />
                        Riwayat Pertemuan
                      </h3>
                      <button onClick={() => refetchHistory()} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <FaSync className="text-sm" />
                      </button>
                    </div>
                    {pertemuanHistory?.length > 0 ? (
                      <div className="space-y-2">
                        {pertemuanHistory.slice(0, 5).map((item, i) => (
                          <div
                            key={i}
                            onClick={() => handleViewHistoryDetail(item)}
                            className="flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 border border-slate-100 hover:border-slate-200 transition-all cursor-pointer"
                          >
                            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                              <FaCalendarCheck className="text-blue-500 text-xs" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-slate-800 text-xs truncate">{item.course_name}</p>
                              <p className="text-slate-400 text-[10px] font-medium">
                                Pertemuan {item.pertemuan_ke} · {item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: '2-digit' }) : ''}
                              </p>
                              <div className="flex flex-wrap items-center gap-1 mt-1">
                                <span className="text-[9px] font-bold px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-md">
                                  {item.hadir_count || 0} Hadir
                                </span>
                                <span className="text-[9px] font-bold px-1.5 py-0.5 bg-rose-50 text-rose-700 rounded-md">
                                  {item.alpa_count || 0} Alpa
                                </span>
                                {(item.izin_count > 0 || item.sakit_count > 0) && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded-md">
                                    {(item.izin_count || 0) + (item.sakit_count || 0)} Izin/Sakit
                                  </span>
                                )}
                              </div>
                            </div>
                            <FaChevronRight className="text-slate-300 text-xs shrink-0" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-slate-400">
                        <FaHistory className="text-3xl mx-auto mb-2 text-slate-200" />
                        <p className="text-sm font-medium">Belum ada riwayat</p>
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
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.35 }}
              >
                {/* ── Session top bar ── */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-[0_4px_24px_rgba(0,0,0,0.06)] p-4 sm:p-5 mb-6 flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center shrink-0">
                      <FaHourglassHalf className="text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-slate-800 text-base truncate">{activeSession.course_name}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-0.5">
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                          Pertemuan {activeSession.pertemuan_ke}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">
                          Berakhir: {new Date(activeSession.expires_at).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className={`flex items-center gap-1 text-xs font-medium ${autoRefreshActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${autoRefreshActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                          {autoRefreshActive ? 'Live' : 'Paused'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setProjectorMode(true)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-blue-50 text-blue-700 font-bold text-sm hover:bg-blue-100 transition-colors"
                    >
                      <FaExpand className="text-xs" />
                      <span className="hidden sm:inline">Proyektor</span>
                    </button>
                    <button
                      onClick={() => refreshTokenMutation.mutate(activeSession.session_id)}
                      disabled={refreshTokenMutation.isPending}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-100 text-slate-700 font-bold text-sm hover:bg-slate-200 transition-colors disabled:opacity-50"
                    >
                      <FaSync className={`text-xs ${refreshTokenMutation.isPending ? 'animate-spin' : ''}`} />
                      <span className="hidden sm:inline">Refresh QR</span>
                    </button>
                    <button
                      onClick={handleCloseSession}
                      disabled={closeSessionMutation.isPending}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-rose-50 text-rose-700 font-bold text-sm hover:bg-rose-100 transition-colors disabled:opacity-50"
                    >
                      {closeSessionMutation.isPending
                        ? <div className="w-4 h-4 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                        : <FaStopCircle className="text-xs" />
                      }
                      <span className="hidden sm:inline">Tutup Sesi</span>
                    </button>
                  </div>
                </div>

                {/* ── Main Dashboard Grid ── */}
                <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

                  {/* LEFT: QR + Stats (xl:2 cols) */}
                  <div className="xl:col-span-2 space-y-5">

                    {/* QR Card */}
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-[0_4px_24px_rgba(0,0,0,0.06)] p-6 flex flex-col items-center">
                      <p className="text-xs font-bold text-slate-400 tracking-widest uppercase mb-4">QR Code Absensi</p>

                      {/* QR Frame */}
                      <div className="relative mb-5">
                        <div className="absolute -inset-3 rounded-3xl bg-blue-100/50 blur-xl animate-pulse" />
                        <div className="relative bg-white rounded-3xl p-4 border-2 border-blue-100 shadow-lg">
                          {qrToken && (
                            <QRCodeSVG
                              value={JSON.stringify({
                                session_token: qrToken,
                                course_id: activeSession.course_id,
                                pertemuan_ke: activeSession.pertemuan_ke,
                              })}
                              size={200}
                              level="H"
                              includeMargin={true}
                              bgColor="#FFFFFF"
                              fgColor="#1e40af"
                            />
                          )}
                        </div>
                      </div>

                      <p className="text-slate-500 text-sm font-medium text-center">
                        Tampilkan di layar kelas agar mahasiswa dapat scan
                      </p>
                      <button
                        onClick={() => setProjectorMode(true)}
                        className="mt-3 flex items-center gap-2 text-blue-600 text-sm font-bold hover:text-blue-700 transition-colors"
                      >
                        <FaExpand className="text-xs" />
                        Tampilkan Fullscreen
                      </button>
                    </div>

                    {/* Stats Cards */}
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-[0_4px_24px_rgba(0,0,0,0.06)] p-5">
                      <p className="text-xs font-bold text-slate-400 tracking-widest uppercase mb-4">Statistik Kehadiran</p>

                      {/* Progress bar */}
                      <div className="mb-4">
                        <div className="flex justify-between text-xs font-bold mb-1.5">
                          <span className="text-slate-600">Tingkat Kehadiran</span>
                          <span className="text-emerald-600">{progressPct}%</span>
                        </div>
                        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full"
                            animate={{ width: `${progressPct}%` }}
                            transition={{ duration: 0.8, ease: 'easeInOut' }}
                          />
                        </div>
                        <p className="text-xs text-slate-400 font-medium mt-1.5">
                          {hadirCount} dari {totalCount} mahasiswa hadir
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <StatCard label="Hadir"        value={sessionStudents?.hadir_count || 0} color="text-emerald-600" />
                        <StatCard label="Belum Absen"  value={belumCount}                         color="text-amber-600"   />
                        <StatCard label="Izin"         value={sessionStudents?.izin_count || 0}  color="text-sky-600"     />
                        <StatCard label="Alpa"         value={sessionStudents?.alpa_count || 0}  color="text-rose-600"    />
                      </div>
                    </div>
                  </div>

                  {/* RIGHT: Student list (xl:3 cols) */}
                  <div className="xl:col-span-3">
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-[0_4px_24px_rgba(0,0,0,0.06)] h-full flex flex-col">
                      {/* List header */}
                      <div className="flex items-center justify-between p-5 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-blue-50 rounded-2xl flex items-center justify-center">
                            <FaUsers className="text-blue-600 text-sm" />
                          </div>
                          <div>
                            <h3 className="font-black text-slate-800 text-base leading-tight">Daftar Mahasiswa</h3>
                            <p className="text-xs text-slate-400 font-medium">Pertemuan {activeSession.pertemuan_ke}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => refetchStudents()}
                          disabled={loadingStudents}
                          className="w-9 h-9 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-center text-slate-500"
                        >
                          <FaSync className={`text-sm ${loadingStudents ? 'animate-spin' : ''}`} />
                        </button>
                      </div>

                      {/* List body */}
                      <div className="flex-1 overflow-y-auto p-4 space-y-2" style={{ maxHeight: '60vh' }}>
                        {loadingStudents && localStudents.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-16">
                            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4" />
                            <p className="text-slate-400 text-sm font-medium">Memuat data mahasiswa...</p>
                          </div>
                        ) : getSortedStudents().length > 0 ? (
                          <AnimatePresence>
                            {getSortedStudents().map((student) => {
                              const isHadir = student.attendance_status === 'hadir'
                              const isAlpa  = student.attendance_status === 'alpa'
                              return (
                                <motion.div
                                  key={student.id}
                                  layout
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ duration: 0.3 }}
                                  className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all ${
                                    isHadir
                                      ? 'border-emerald-200 bg-emerald-50/50'
                                      : isAlpa
                                      ? 'border-rose-200 bg-rose-50/30'
                                      : student.attendance_status === 'izin' || student.attendance_status === 'sakit'
                                      ? 'border-amber-200 bg-amber-50/30'
                                      : 'border-slate-100 bg-white hover:border-slate-200'
                                  }`}
                                >
                                  {/* Avatar */}
                                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                                    isHadir ? 'bg-emerald-100 text-emerald-700' :
                                    isAlpa  ? 'bg-rose-100 text-rose-700' :
                                    'bg-slate-100 text-slate-500'
                                  }`}>
                                    {student.name?.charAt(0)?.toUpperCase() || '?'}
                                  </div>

                                  {/* Info */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className="font-bold text-slate-800 text-sm truncate">{student.name}</p>
                                      <StatusBadge status={student.attendance_status} />
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <span className="text-xs text-slate-400 font-mono">{student.nim}</span>
                                      {student.attendance_time && (
                                        <span className="text-xs text-slate-400 flex items-center gap-1">
                                          <FaClock className="text-[9px]" />
                                          {student.attendance_time}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Action Buttons */}
                                  <div className="flex items-center gap-0.5 shrink-0 rounded-2xl border border-slate-200/70 bg-slate-100/75 p-1 shadow-[inset_0_1px_3px_rgba(15,23,42,.08)] backdrop-blur-md">
                                    {[
                                      { key: 'hadir', label: 'H', cls: 'bg-emerald-500 text-white shadow-emerald-500/20', base: 'text-slate-500 hover:text-emerald-600' },
                                      { key: 'izin',  label: 'I', cls: 'bg-amber-400 text-white shadow-amber-500/20', base: 'text-slate-500 hover:text-amber-600' },
                                      { key: 'sakit', label: 'S', cls: 'bg-sky-500 text-white shadow-sky-500/20', base: 'text-slate-500 hover:text-sky-600' },
                                      { key: 'alpa',  label: 'A', cls: 'bg-rose-500 text-white shadow-rose-500/20', base: 'text-slate-500 hover:text-rose-600' },
                                    ].map(btn => (
                                      <button
                                        key={btn.key}
                                        onClick={() => handleStatusUpdate(student.id, btn.key)}
                                        title={btn.key.charAt(0).toUpperCase() + btn.key.slice(1)}
                                        className={`w-8 h-8 rounded-xl text-xs font-black font-mono transition-all duration-300 active:scale-90 ${
                                          student.attendance_status === btn.key ? btn.cls : btn.base
                                        }`}
                                      >
                                        {btn.label}
                                      </button>
                                    ))}
                                    <button
                                      onClick={() => { setSelectedStudent(student); setManualStatus(student.attendance_status || 'hadir'); setShowManualModal(true) }}
                                      className="w-8 h-8 rounded-xl text-slate-500 hover:bg-white hover:text-lp-accent transition-all active:scale-90 flex items-center justify-center"
                                      title="Edit Manual"
                                    >
                                      <FaEdit className="text-xs" />
                                    </button>
                                  </div>
                                </motion.div>
                              )
                            })}
                          </AnimatePresence>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-16">
                            <FaUserCircle className="text-5xl text-slate-200 mb-3" />
                            <p className="text-slate-400 text-sm font-medium">Belum ada mahasiswa terdaftar</p>
                            <p className="text-slate-300 text-xs mt-1">Mahasiswa akan muncul setelah scan QR</p>
                          </div>
                        )}
                      </div>

                      {/* Footer summary */}
                      {sessionStudents && getSortedStudents().length > 0 && (
                        <div className="border-t border-slate-100 p-4 flex items-center justify-between">
                          <span className="text-xs text-slate-400 font-medium">
                            {hadirCount} hadir · {belumCount} belum absen · {totalCount} total
                          </span>
                          <span className="text-xs font-black text-emerald-600">{progressPct}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Manual Status Modal ── */}
      <AnimatePresence>
        {showManualModal && selectedStudent && (
          <motion.div
            key="manual-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[150] p-4"
            onClick={(e) => { if (e.target === e.currentTarget) { setShowManualModal(false); setSelectedStudent(null) } }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-100"
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="font-black text-slate-800 text-lg">Ubah Status</h3>
                  <p className="text-sm text-slate-500 font-medium mt-0.5">
                    {selectedStudent.name} · <span className="font-mono text-xs">{selectedStudent.nim}</span>
                  </p>
                </div>
                <button
                  onClick={() => { setShowManualModal(false); setSelectedStudent(null) }}
                  className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center font-bold transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-5">
                {[
                  { value: 'hadir', label: 'Hadir', emoji: '✅', cls: 'border-emerald-400 bg-emerald-50 text-emerald-700', inactive: 'border-slate-200 hover:border-emerald-300' },
                  { value: 'izin',  label: 'Izin',  emoji: '📋', cls: 'border-amber-400  bg-amber-50  text-amber-700',  inactive: 'border-slate-200 hover:border-amber-300'   },
                  { value: 'sakit', label: 'Sakit', emoji: '🏥', cls: 'border-sky-400    bg-sky-50    text-sky-700',    inactive: 'border-slate-200 hover:border-sky-300'     },
                  { value: 'alpa',  label: 'Alpa',  emoji: '❌', cls: 'border-rose-400   bg-rose-50   text-rose-700',   inactive: 'border-slate-200 hover:border-rose-300'    },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setManualStatus(opt.value)}
                    className={`flex flex-col items-center gap-1.5 p-4 rounded-2xl border-2 font-bold transition-all ${
                      manualStatus === opt.value ? opt.cls : `border-slate-200 bg-white text-slate-500 ${opt.inactive}`
                    }`}
                  >
                    <span className="text-2xl">{opt.emoji}</span>
                    <span className="text-sm">{opt.label}</span>
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setShowManualModal(false); setSelectedStudent(null) }}
                  className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={() => handleStatusUpdate(selectedStudent.id, manualStatus)}
                  disabled={updateStatusMutation.isPending}
                  className="flex-1 py-3 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {updateStatusMutation.isPending
                    ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <FaCheckCircle />
                  }
                  Simpan
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Detail Riwayat Pertemuan Modal ── */}
      <AnimatePresence>
        {historyModalOpen && selectedHistorySession && (
          <motion.div
            key="history-detail-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[150] p-4"
            onClick={(e) => { if (e.target === e.currentTarget) { setHistoryModalOpen(false); setSelectedHistorySession(null) } }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl p-6 w-full max-w-2xl shadow-2xl border border-slate-100 flex flex-col max-h-[85vh]"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4 border-b border-slate-100 pb-4">
                <div>
                  <span className="text-xs font-bold text-blue-500 tracking-wider uppercase">Detail Riwayat Pertemuan</span>
                  <h3 className="font-black text-slate-800 text-xl mt-0.5">{selectedHistorySession.course_name}</h3>
                  <p className="text-sm text-slate-500 font-medium mt-1">
                    Pertemuan ke-{selectedHistorySession.pertemuan_ke} &nbsp;·&nbsp; {selectedHistorySession.created_at ? new Date(selectedHistorySession.created_at).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : ''}
                  </p>
                </div>
                <button
                  onClick={() => { setHistoryModalOpen(false); setSelectedHistorySession(null) }}
                  className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center font-bold transition-colors"
                >
                  ✕
                </button>
              </div>

              {loadingHistoryDetails ? (
                <div className="flex flex-col items-center justify-center py-20 flex-1">
                  <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-slate-400 text-sm font-medium">Memuat data rekap absensi...</p>
                </div>
              ) : (
                <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                  {/* Statistics widgets */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
                    {[
                      { label: "Total Siswa", value: historySessionDetails?.total_students || selectedHistorySession.total_students || 0, color: "text-slate-700", bg: "bg-slate-50 border-slate-100" },
                      { label: "Hadir", value: historySessionDetails?.hadir_count || selectedHistorySession.hadir_count || 0, color: "text-emerald-600", bg: "bg-emerald-50/30 border-emerald-100" },
                      { label: "Izin", value: historySessionDetails?.izin_count || selectedHistorySession.izin_count || 0, color: "text-amber-600", bg: "bg-amber-50/30 border-amber-100" },
                      { label: "Sakit", value: historySessionDetails?.sakit_count || selectedHistorySession.sakit_count || 0, color: "text-sky-600", bg: "bg-sky-50/30 border-sky-100" },
                      { label: "Alpa", value: historySessionDetails?.alpa_count || selectedHistorySession.alpa_count || 0, color: "text-rose-600", bg: "bg-rose-50/30 border-rose-100" },
                    ].map((stat, idx) => (
                      <div key={idx} className={`flex flex-col items-center justify-center rounded-2xl border py-3 px-2 shadow-sm ${stat.bg}`}>
                        <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
                        <p className="text-[10px] font-bold text-slate-500 mt-0.5 text-center leading-tight">{stat.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Search bar */}
                  <div className="relative mb-4">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <FaSearch className="text-slate-400 text-sm" />
                    </span>
                    <input
                      type="text"
                      placeholder="Cari mahasiswa berdasarkan nama atau NIM..."
                      value={historySearchQuery}
                      onChange={(e) => setHistorySearchQuery(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-sm font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>

                  {/* Student list */}
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1 select-none">
                    {historySessionDetails?.students && historySessionDetails.students.filter(student => 
                      student.name?.toLowerCase().includes(historySearchQuery.toLowerCase()) ||
                      student.nim?.includes(historySearchQuery)
                    ).length > 0 ? (
                      historySessionDetails.students
                        .filter(student => 
                          student.name?.toLowerCase().includes(historySearchQuery.toLowerCase()) ||
                          student.nim?.includes(historySearchQuery)
                        )
                        .map((student) => {
                          const isHadir = student.attendance_status === 'hadir'
                          const isAlpa  = student.attendance_status === 'alpa'
                          const isIzin  = student.attendance_status === 'izin'
                          const isSakit = student.attendance_status === 'sakit'
                          return (
                            <div
                              key={student.id}
                              className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                                isHadir
                                  ? 'border-emerald-100 bg-emerald-50/20'
                                  : isAlpa
                                  ? 'border-rose-100 bg-rose-50/20'
                                  : isIzin || isSakit
                                  ? 'border-amber-100 bg-amber-50/20'
                                  : 'border-slate-100 bg-white'
                              }`}
                            >
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                                isHadir ? 'bg-emerald-100 text-emerald-700' :
                                isAlpa  ? 'bg-rose-100 text-rose-700' :
                                isIzin || isSakit ? 'bg-amber-100 text-amber-700' :
                                'bg-slate-100 text-slate-500'
                              }`}>
                                {student.name?.charAt(0)?.toUpperCase() || '?'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-bold text-slate-800 text-sm truncate">{student.name}</p>
                                  <StatusBadge status={student.attendance_status} />
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[10px] text-slate-400 font-mono">{student.nim}</span>
                                  {student.attendance_time && (
                                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                      <FaClock className="text-[8px]" />
                                      {student.attendance_time}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })
                    ) : (
                      <div className="flex flex-col items-center justify-center py-10">
                        <p className="text-slate-400 text-sm font-medium">Mahasiswa tidak ditemukan</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-4 border-t border-slate-100 pt-4 flex justify-end">
                <button
                  onClick={() => { setHistoryModalOpen(false); setSelectedHistorySession(null) }}
                  className="px-6 py-2.5 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmationModal
        open={confirmCloseOpen}
        title="Tutup sesi absensi?"
        description="Sesi akan dikunci dan mahasiswa tidak dapat mengirim presensi lagi. Riwayat pertemuan tetap tersimpan."
        confirmLabel="Tutup Sesi"
        pending={closeSessionMutation.isPending}
        onCancel={() => setConfirmCloseOpen(false)}
        onConfirm={() => closeSessionMutation.mutate(activeSession?.session_id)}
      />

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {notice && (
            <motion.div
              initial={{ opacity: 0, y: -18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              className="fixed left-1/2 top-5 z-[350] w-[min(92vw,520px)] -translate-x-1/2 rounded-2xl border border-blue-500/10 bg-slate-950/90 px-4 py-3 text-sm font-semibold text-white shadow-2xl backdrop-blur-xl"
            >
              <span className="mr-2 font-mono text-lp-accent">SYS/</span>{notice}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}

      {/* ── Live Telegram-style Notifications ── */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {liveNotifications.map(n => (
            <motion.div
              key={n.id}
              layout
              initial={{ opacity: 0, x: 140, scale: 0.96, filter: 'blur(6px)' }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 80, scale: 0.96, filter: 'blur(4px)', transition: { duration: 0.28, ease: [0.4, 0, 1, 1] } }}
              transition={{ layout: { type: 'spring', stiffness: 150, damping: 18 }, duration: 0.48, ease: [0.16, 1, 0.3, 1] }}
              className="pointer-events-auto relative overflow-hidden rounded-2xl rounded-br-[5px] border border-white/70 bg-white/80 px-4 py-3 pl-5 shadow-[inset_0_1px_0_rgba(255,255,255,.9),0_18px_50px_rgba(15,23,42,.16)] backdrop-blur-xl flex gap-3"
            >
              <span className="absolute inset-y-0 left-0 w-1.5 bg-[#26A5E4] rounded-l-2xl" />
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-100 bg-slate-50 text-base shadow-sm">
                {n.icon}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-black text-slate-800">{n.title}</h4>
                  <time className="text-[9px] font-mono text-slate-400 shrink-0">{n.time}</time>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5 leading-snug">{n.description}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default AbsensiDosen
