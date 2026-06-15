// Removed duplicate/simple component block. Only the full-featured component remains below.
import React, { useState, useRef } from 'react'
import { useMutation, useQuery } from "@tanstack/react-query";
import api from '../../services/api'
import Navbar from '../../components/Navbar'
import Sidebar from '../../components/Sidebar'
import useAuth from '../../hooks/useAuth'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  FaQrcode, 
  FaCheckCircle, 
  FaTimesCircle, 
  FaCalendarAlt,
  FaClock,
  FaUserGraduate,
  FaCamera,
  FaHistory,
  FaFilter,
  FaCalendarWeek,
  FaStopCircle
} from 'react-icons/fa'
import {
  FiChevronRight,
  FiXCircle,
  FiClock,
  FiRefreshCw
} from 'react-icons/fi'
import QrScanner from 'qr-scanner';

const getCurrentIndonesianDay = () => {
  const dayMap = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
  return dayMap[new Date().getDay()]
}

class ScannerErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error) {
    console.error('QR scanner crashed:', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-lp-bg flex items-center justify-center p-6">
          <div className="max-w-md rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-800">
            Scanner mengalami masalah. Tutup halaman ini lalu buka kembali untuk mencoba lagi.
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

const ScanAbsensiContent = () => {
  const { user } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [showQRScanner, setShowQRScanner] = useState(false)
  const [scanResult, setScanResult] = useState(null)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [selectedDay, setSelectedDay] = useState(getCurrentIndonesianDay())
  const [qrScanner, setQrScanner] = useState(null)
  const videoRef = useRef(null)
  const isProcessingScanRef = useRef(false)
  const [isScanning, setIsScanning] = useState(false)
  const [scannerMessage, setScannerMessage] = useState(null)

  // Hari-hari untuk filter
  const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']

  // Query untuk jadwal berdasarkan hari
  const { data: coursesByDay, isLoading: loadingCoursesByDay, refetch: refetchCoursesByDay } = useQuery({
    queryKey: ['coursesByDay', selectedDay],
    queryFn: () => {
      const day = selectedDay?.trim()
      if (!day) {
        return Promise.resolve({ hari: '', courses: [], total_courses: 0 })
      }

      return api.getMahasiswaCoursesByDay(day).then(res => {
        console.log('Courses by day:', res.data)
        const data = res.data.data || {}
        if (!Array.isArray(data.courses) && Array.isArray(data.jadwal)) {
          return {
            ...data,
            courses: data.jadwal
          }
        }
        return {
          ...data,
          courses: Array.isArray(data.courses) ? data.courses : []
        }
      }).catch(error => {
        console.error('Failed fetching courses by day:', error)
        return {
          hari: day,
          courses: [],
          total_courses: 0
        }
      })
    },
    enabled: !!selectedDay,
    refetchInterval: 30000, // Refresh setiap 30 detik
  })

  // Query untuk riwayat absensi per mata kuliah
  const { data: courseHistory, isLoading: loadingHistory } = useQuery({
    queryKey: ['courseHistory', selectedCourse?.kode],
    queryFn: () => {
      if (!selectedCourse?.kode) return Promise.resolve(null)
      return api.getAttendanceByCourse(selectedCourse.kode).then(res => res.data.data)
    },
    enabled: !!selectedCourse?.kode && showHistoryModal,
  })

  // Mutation untuk scan QR
  const scanAttendanceMutation = useMutation({
    mutationFn: (data) => api.scanAttendance(data),
    onSuccess: (response) => {
      const data = response.data.data
      setSelectedCourse(null)
      setScanResult({
        success: true,
        course: data.course_name,
        dosen: data.dosen,
        time: data.time,
        date: data.date,
        pertemuan_ke: data.pertemuan_ke,
        status: data.status
      })
      
      // Stop scanning
      stopScanning()
      
      // Refresh data setelah sukses
      setTimeout(() => {
        refetchCoursesByDay()
      }, 1000)
    },
    onError: (error) => {
      console.error('Scan error:', error)
      const message = error.response?.data?.message || error.response?.data?.error || 'Gagal melakukan absensi'
      const alreadyPresent = /sudah.*absen|sudah.*hadir|already.*attend/i.test(message)

      setScanResult({
        success: alreadyPresent,
        course: selectedCourse?.nama || 'Mata kuliah',
        status: alreadyPresent ? 'hadir' : undefined,
        message: alreadyPresent ? 'Kehadiran Anda sudah tercatat sebelumnya.' : message
      })
      stopScanning()
      if (alreadyPresent) {
        refetchCoursesByDay()
      }
    }
  })

  React.useEffect(() => {
    let activeScanner = null

    if (showQRScanner && videoRef.current) {
      const scanner = new QrScanner(
        videoRef.current,
        result => handleScanResult(result),
        {
          preferredCamera: 'environment',
          highlightScanRegion: true,
          highlightCodeOutline: true,
        }
      )

      scanner.start()
        .then(() => {
          setQrScanner(scanner)
          setIsScanning(true)
        })
        .catch(err => {
          console.error('Error starting scanner:', err)
          setScannerMessage({
            type: 'error',
            text: err.name === 'NotAllowedError'
              ? 'Izinkan akses kamera untuk scan QR Code'
              : `Gagal membuka kamera: ${err.message || 'Kamera tidak tersedia'}`
          })
          scanner.stop()
          scanner.destroy()
        })

      activeScanner = scanner
    }

    return () => {
      if (activeScanner) {
        activeScanner.stop()
        activeScanner.destroy()
      }
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop())
        videoRef.current.srcObject = null
      }
      setQrScanner(null)
      setIsScanning(false)
    }
  }, [showQRScanner])

  const stopScanning = () => {
    setShowQRScanner(false)
    setScannerMessage(null)
  }

  const handleScanResult = (result) => {
    console.log('QR Scan result:', result)

    if (isProcessingScanRef.current || scanAttendanceMutation.isPending) {
      return
    }

    const rawData = typeof result?.data === 'string' ? result.data.trim() : ''
    if (!rawData) {
      setScannerMessage({ type: 'error', text: 'QR Code tidak dapat dibaca. Coba arahkan kamera kembali.' })
      return
    }

    let sessionToken = rawData
    let qrCourseId = ''

    // Format JSON: {"session_token":"...","course_id":"..."}
    try {
      const parsed = JSON.parse(rawData)
      if (parsed?.session_token) {
        sessionToken = String(parsed.session_token)
        qrCourseId = parsed.course_id ? String(parsed.course_id) : ''
      }
    } catch {
      // Format lama: token|course_id|...
      const parts = rawData.split('|')
      if (parts.length >= 1 && parts[0]) {
        sessionToken = parts[0].trim()
      }
      if (parts.length >= 2 && parts[1]) {
        qrCourseId = parts[1].trim()
      }
    }

    if (!sessionToken) {
      setScannerMessage({ type: 'error', text: 'QR Code tidak valid. Gunakan QR dari sesi dosen yang aktif.' })
      return
    }

    const availableCourses = coursesByDay?.courses || []
    let resolvedCourseId = selectedCourse?.kode || ''

    if (qrCourseId) {
      if (resolvedCourseId && resolvedCourseId !== qrCourseId) {
        setScannerMessage({ type: 'error', text: 'QR Code ini berasal dari mata kuliah yang berbeda.' })
        return
      }

      if (!resolvedCourseId) {
        const matchedCourse = availableCourses.find((course) => course.kode === qrCourseId)
        if (matchedCourse) {
          setSelectedCourse(matchedCourse)
          resolvedCourseId = matchedCourse.kode
        } else {
          resolvedCourseId = qrCourseId
        }
      }
    }

    if (!resolvedCourseId) {
      setScannerMessage({ type: 'error', text: 'Mata kuliah tidak terdeteksi. Pilih mata kuliah lalu scan kembali.' })
      return
    }

    isProcessingScanRef.current = true
    setScannerMessage({ type: 'loading', text: 'QR terbaca. Sedang mencatat kehadiran...' })
    qrScanner?.stop()
    setIsScanning(false)
    scanAttendanceMutation.mutate({ 
      session_token: sessionToken,
      course_id: resolvedCourseId 
    }, {
      onSettled: () => {
        isProcessingScanRef.current = false
      }
    })
  }

  // Render status badge
  const renderStatusBadge = (status) => {
    const statusConfig = {
      'hadir': { color: 'bg-lp-green/10 text-lp-green ring-1 ring-lp-green/20', label: 'Hadir', icon: '✓' },
      'izin': { color: 'bg-lp-amber/10 text-lp-amber ring-1 ring-lp-amber/20', label: 'Izin', icon: 'i' },
      'sakit': { color: 'bg-lp-accent/10 text-lp-atext ring-1 ring-lp-accent/20', label: 'Sakit', icon: '⚕' },
      'alpa': { color: 'bg-lp-red/10 text-lp-red ring-1 ring-lp-red/20', label: 'Alpa', icon: '✗' },
      'belum_absen': { color: 'bg-lp-surface text-lp-text3 ring-1 ring-lp-border', label: 'Belum Absen', icon: '...' }
    }
    
    const config = statusConfig[status] || statusConfig['belum_absen']
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${config.color} flex items-center gap-1.5`}>
        <span className="text-[10px]">{config.icon}</span>
        <span>{config.label}</span>
      </span>
    )
  }

  const renderSessionStatus = (course) => {
    if (course.active_session) {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-lp-green font-semibold">
          <FaCheckCircle className="text-lp-green shrink-0" />
          <span>Sesi absensi dibuka</span>
        </span>
      )
    }
    return <span className="text-xs text-lp-text3 font-medium">Menunggu dosen membuka sesi</span>
  }

  return (
    <div className="flex min-h-screen bg-lp-bg">
      {/* Background Decorative Layer */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-lp-text/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-lp-text/5 blur-[120px] rounded-full" />
      </div>

      <Sidebar role="mahasiswa" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        <Navbar user={user} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto">

            {/* Header Section */}
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6 lg:gap-8 lg:mb-12"
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
                    ATTENDANCE SCANNER
                  </span>
                </div>
                
                <h1 className="text-4xl md:text-5xl font-light text-lp-text tracking-tight mb-3">
                  Scan Absensi
                  <span className="text-lp-text3 block text-lg font-normal mt-2">
                    Catat kehadiran perkuliahan secara cepat dan efisien
                  </span>
                </h1>
              </div>
              
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    setSelectedCourse(null)
                    setShowQRScanner(true)
                  }}
                  className="group px-6 py-3 sm:px-8 sm:py-4 bg-lp-text text-lp-bg rounded-full text-[12px] sm:text-[13px] font-bold hover:bg-lp-atext hover:-translate-y-1 transition-all duration-500 uppercase tracking-widest flex items-center gap-3 shadow-[0_12px_24px_rgba(0,0,0,0.1)]"
                >
                  <FaCamera className="text-lg" />
                  <span>Mulai Scan QR</span>
                </button>
              </div>
            </motion.div>

            {/* Scan Result Notification */}
            <AnimatePresence>
              {scanResult && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className={`mb-8 p-6 rounded-[2rem] border ${
                    scanResult.success 
                      ? 'bg-lp-green/5 border-lp-green/20 text-lp-text' 
                      : 'bg-lp-red/5 border-lp-red/20 text-lp-text'
                  } flex items-start gap-4`}
                >
                  <div className="mt-0.5">
                    {scanResult.success ? (
                      <div className="w-10 h-10 rounded-2xl bg-lp-green/10 flex items-center justify-center">
                        <FaCheckCircle className="text-lp-green text-lg" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-2xl bg-lp-red/10 flex items-center justify-center">
                        <FaTimesCircle className="text-lp-red text-lg" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <h4 className="font-bold text-base">
                      {scanResult.success ? 'Absensi Berhasil Tercatat' : 'Absensi Gagal'}
                    </h4>
                    {scanResult.success ? (
                      <div className="text-sm text-lp-text2 space-y-0.5 font-light">
                        <p className="font-semibold text-lp-text">{scanResult.course}</p>
                        {scanResult.message && <p>{scanResult.message}</p>}
                        {scanResult.dosen && <p>Dosen: {scanResult.dosen}</p>}
                        {scanResult.pertemuan_ke && <p>Pertemuan ke-{scanResult.pertemuan_ke} • Status: <span className="font-semibold capitalize">{scanResult.status}</span></p>}
                        {scanResult.time && <p className="text-[11px] text-lp-text3 mt-1 font-mono">Dicatat pukul {scanResult.time} • {scanResult.date}</p>}
                      </div>
                    ) : (
                      <p className="text-sm text-lp-text2 font-light">{scanResult.message}</p>
                    )}
                  </div>
                  <button 
                    onClick={() => setScanResult(null)}
                    className="w-8 h-8 rounded-full bg-lp-surface border border-lp-border flex items-center justify-center text-lp-text3 hover:text-lp-text hover:bg-lp-text hover:text-white transition-all duration-300 text-sm shrink-0"
                  >
                    ✕
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Filter Hari Section */}
            <div className="flex items-center gap-4 mb-8">
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-mono font-bold tracking-[0.2em] uppercase text-lp-text3">01</span>
                <h2 className="text-2xl font-light text-lp-text tracking-tight">Jadwal Hari Ini</h2>
                <div className="h-px w-16 bg-lp-border hidden sm:block" />
              </div>
            </div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white border border-lp-border rounded-[2.5rem] p-6 md:p-8 mb-8 shadow-sm"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="p-3 bg-lp-surface rounded-xl">
                  <FaFilter className="text-lp-text2 text-sm" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-lp-text tracking-tight">Filter Hari</h3>
                  <p className="text-[11px] text-lp-text3 font-light mt-0.5">
                    Menampilkan jadwal untuk: <span className="text-lp-atext font-semibold">{selectedDay}</span>
                  </p>
                </div>
              </div>
              <div className="flex overflow-x-auto gap-2 pb-2 -mx-6 px-6 md:mx-0 md:px-0 md:pb-0 scrollbar-hide md:flex-wrap">
                {days.map((day) => (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all duration-300 whitespace-nowrap cursor-pointer border select-none tracking-wide ${
                      selectedDay === day 
                        ? 'bg-lp-text text-white border-lp-text shadow-md' 
                        : 'bg-white text-lp-text2 hover:bg-lp-surface border-lp-border'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Mata Kuliah Section */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-mono font-bold tracking-[0.2em] uppercase text-lp-text3">02</span>
                <h2 className="text-2xl font-light text-lp-text tracking-tight">Daftar Jadwal</h2>
                <div className="h-px w-16 bg-lp-border hidden sm:block" />
              </div>
              <button
                onClick={() => refetchCoursesByDay()}
                className="p-3.5 bg-white border border-lp-border rounded-full text-lp-text3 hover:text-lp-text hover:rotate-180 transition-all duration-700 shadow-sm"
              >
                <FiRefreshCw className="text-sm" />
              </button>
            </div>

            {loadingCoursesByDay ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-12 h-12 border-2 border-lp-text/10 border-t-lp-text rounded-full animate-spin mb-6" />
                <p className="text-[11px] font-mono font-bold tracking-widest text-lp-text3 uppercase">Memuat Jadwal...</p>
              </div>
            ) : coursesByDay?.courses && coursesByDay.courses.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                {coursesByDay.courses.map((course, index) => (
                  <motion.div 
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`group relative bg-white border ${
                      course.active_session
                        ? 'border-lp-text shadow-[0_12px_32px_rgba(0,0,0,0.06)]'
                        : 'border-lp-border'
                    } rounded-[2.5rem] p-7 hover:shadow-[0_32px_64px_rgba(0,0,0,0.08)] transition-all duration-700 hover:-translate-y-1 overflow-hidden`}
                  >
                    {/* Visual Accent */}
                    {course.active_session && (
                      <div className="absolute top-0 right-0 w-32 h-32 blur-[40px] opacity-20 bg-lp-accent" />
                    )}

                    <div className="relative z-10">
                      {/* Card Header: SKS & Status */}
                      <div className="flex justify-between items-start mb-4 gap-2">
                        <span className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-lp-text3 bg-lp-surface px-3 py-1.5 rounded-full">
                          {course.sks} SKS
                        </span>
                        <div className="flex flex-col items-end gap-1">
                          {renderStatusBadge(course.status_absen)}
                          {course.waktu_absen && (
                            <span className="text-[10px] text-lp-text3 font-mono">
                              {course.waktu_absen}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Course Title & Lecturer */}
                      <h4 className="font-bold text-lg text-lp-text tracking-tight leading-snug mb-1">
                        {course.nama}
                      </h4>
                      <p className="text-sm text-lp-text2 font-light flex items-center gap-1.5 mb-4">
                        <FaUserGraduate className="text-lp-text3 shrink-0" />
                        <span className="truncate">{course.dosen}</span>
                      </p>

                      {/* Time & Session Status */}
                      <div className="bg-lp-surface/50 border border-lp-border rounded-2xl p-3.5 mb-5 space-y-2">
                        <div className="flex items-center text-xs text-lp-text2 font-medium">
                          <FiClock className="mr-2 text-lp-text3 shrink-0" />
                          <span>{course.jam_mulai} - {course.jam_selesai}</span>
                        </div>
                        <div className="flex items-center">
                          {renderSessionStatus(course)}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2.5">
                        {course.can_scan ? (
                          <button
                            onClick={() => {
                              setSelectedCourse(course)
                              setShowQRScanner(true)
                            }}
                            className="flex-1 bg-lp-text hover:bg-lp-atext text-white text-[12px] font-bold py-3.5 px-4 rounded-full shadow-[0_8px_20px_rgba(0,0,0,0.1)] transition-all duration-500 flex items-center justify-center gap-2 border-none cursor-pointer uppercase tracking-widest hover:-translate-y-0.5"
                          >
                            <FaCamera className="text-xs" />
                            <span>Scan QR</span>
                          </button>
                        ) : (
                          <button
                            disabled
                            className="flex-1 bg-lp-surface text-lp-text3 text-[12px] font-bold py-3.5 px-4 rounded-full border border-lp-border cursor-not-allowed flex items-center justify-center gap-1 uppercase tracking-wider"
                          >
                            {course.status_absen !== 'belum_absen' && course.status_absen !== '' ? (
                              <>
                                <FaCheckCircle className="text-lp-green text-xs" />
                                <span>Sudah Absen</span>
                              </>
                            ) : (
                              <span>Belum Mulai</span>
                            )}
                          </button>
                        )}
                        
                        <button
                          onClick={() => {
                            setSelectedCourse(course)
                            setShowHistoryModal(true)
                          }}
                          title="Riwayat Absen"
                          className="w-12 h-12 bg-white border border-lp-border hover:border-lp-text rounded-full transition-all duration-500 flex items-center justify-center cursor-pointer text-lp-text3 hover:text-lp-text hover:bg-lp-surface"
                        >
                          <FaHistory className="text-sm" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="bg-white border border-lp-border rounded-[2.5rem] p-12 mb-12">
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="w-14 h-14 rounded-2xl bg-lp-surface flex items-center justify-center mb-5">
                    <FaCalendarWeek className="text-xl text-lp-text3" />
                  </div>
                  <h4 className="font-bold text-lg text-lp-text2 mb-2">Tidak Ada Jadwal</h4>
                  <p className="text-sm text-lp-text3 font-light max-w-xs">
                    Tidak ada mata kuliah yang dijadwalkan pada hari <span className="font-semibold text-lp-text2">{selectedDay}</span>. Pilih hari lain untuk melihat jadwal.
                  </p>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* QR Scanner Modal */}
      <AnimatePresence>
        {showQRScanner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-lp-text/30 backdrop-blur-md flex items-center justify-center z-[90] p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white border border-lp-border rounded-[2.5rem] p-6 md:p-8 max-w-md w-full shadow-[0_32px_64px_rgba(0,0,0,0.12)] relative overflow-hidden"
            >
              {/* Decorative */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-lp-accent/5 blur-[60px] rounded-full" />

              <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <span className="text-[11px] font-mono font-medium tracking-[0.2em] uppercase text-lp-text3 mb-2 block">QR SCANNER</span>
                    <h3 className="text-xl font-bold text-lp-text tracking-tight">Pindai QR Code</h3>
                    <p className="text-xs text-lp-text2 font-light mt-0.5">
                      {selectedCourse ? `${selectedCourse.nama}` : 'Pindai Cepat (Deteksi Otomatis)'}
                    </p>
                  </div>
                  <button
                    onClick={stopScanning}
                    className="w-10 h-10 rounded-full bg-lp-surface border border-lp-border flex items-center justify-center text-lp-text hover:bg-lp-text hover:text-white transition-all duration-300"
                  >
                    ✕
                  </button>
                </div>
                
                <div className="relative aspect-square bg-lp-text rounded-[2rem] overflow-hidden mb-6 border border-lp-border">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-56 h-56 border-2 border-dashed border-white/50 rounded-2xl" />
                  </div>
                </div>
                
                <div className="text-center space-y-4">
                  <p className="text-xs text-lp-text2 font-light">
                    Arahkan kamera ke QR Code absensi yang ditampilkan oleh Dosen Anda di depan kelas.
                  </p>
                  
                  <button
                    onClick={stopScanning}
                    className="w-full py-3.5 bg-lp-red/5 hover:bg-lp-red/10 text-lp-red border border-lp-red/20 rounded-full font-bold transition-all flex items-center justify-center gap-2 cursor-pointer text-[12px] uppercase tracking-widest"
                  >
                    <FaStopCircle />
                    <span>Hentikan Pemindaian</span>
                  </button>
                  
                  <div className="flex items-center justify-center gap-2 text-xs text-lp-text3 font-medium">
                    <div className={`w-2 h-2 rounded-full ${isScanning ? 'bg-lp-green animate-pulse' : 'bg-lp-red'}`}></div>
                    <span>{isScanning ? 'Kamera Aktif & Memindai' : 'Kamera Nonaktif'}</span>
                  </div>
                  {scannerMessage && (
                    <div className={`rounded-2xl border px-4 py-3 text-left text-xs font-medium ${
                      scannerMessage.type === 'error'
                        ? 'bg-lp-red/5 border-lp-red/20 text-lp-red'
                        : 'bg-lp-accent/5 border-lp-accent/20 text-lp-atext'
                    }`}>
                      {scannerMessage.text}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* History Modal */}
      <AnimatePresence>
        {showHistoryModal && selectedCourse && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-lp-text/30 backdrop-blur-md flex items-center justify-center z-[90] p-4"
          >
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="bg-lp-bg border border-lp-border rounded-[2.5rem] p-6 md:p-10 max-w-2xl w-full max-h-[85vh] shadow-[0_64px_128px_rgba(0,0,0,0.15)] relative overflow-hidden flex flex-col"
            >
              {/* Decorative */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-lp-text/5 blur-[80px] rounded-full translate-x-1/2 -translate-y-1/2" />

              <div className="flex justify-between items-start mb-8 relative z-10 shrink-0">
                <div>
                  <span className="text-[11px] font-mono font-bold tracking-[0.2em] text-lp-text3 uppercase mb-3 block">RIWAYAT KEHADIRAN</span>
                  <h3 className="text-2xl md:text-3xl font-light text-lp-text tracking-tight mb-1">
                    {selectedCourse.nama}
                  </h3>
                  <p className="text-sm text-lp-text2 font-light flex items-center gap-1.5">
                    <FaUserGraduate className="text-lp-text3" />
                    <span>{selectedCourse.dosen}</span>
                  </p>
                </div>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="w-12 h-12 rounded-full bg-white border border-lp-border flex items-center justify-center text-lp-text hover:bg-lp-text hover:text-white transition-all duration-500 shadow-sm shrink-0"
                >
                  <FiXCircle className="text-xl" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar relative z-10">
                {loadingHistory ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-12 h-12 border-2 border-lp-text/10 border-t-lp-text rounded-full animate-spin mb-6" />
                    <p className="text-[11px] font-mono font-bold tracking-widest text-lp-text3 uppercase">Memuat Riwayat...</p>
                  </div>
                ) : courseHistory ? (
                  <div className="space-y-8">
                    {/* Summary */}
                    {courseHistory.summary && (
                      <div className="p-6 bg-lp-accentS/50 border border-lp-accent/10 rounded-[2rem]">
                        <h4 className="text-[11px] font-mono font-bold tracking-[0.2em] text-lp-atext uppercase mb-4">Ringkasan</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                          <div className="text-center p-3 bg-white rounded-2xl border border-lp-border">
                            <p className="text-xl font-bold text-lp-green">{courseHistory.summary.hadir || 0}</p>
                            <p className="text-[10px] text-lp-green font-mono font-bold uppercase mt-1 tracking-wider">Hadir</p>
                          </div>
                          <div className="text-center p-3 bg-white rounded-2xl border border-lp-border">
                            <p className="text-xl font-bold text-lp-amber">{courseHistory.summary.izin || 0}</p>
                            <p className="text-[10px] text-lp-amber font-mono font-bold uppercase mt-1 tracking-wider">Izin</p>
                          </div>
                          <div className="text-center p-3 bg-white rounded-2xl border border-lp-border">
                            <p className="text-xl font-bold text-lp-accent">{courseHistory.summary.sakit || 0}</p>
                            <p className="text-[10px] text-lp-atext font-mono font-bold uppercase mt-1 tracking-wider">Sakit</p>
                          </div>
                          <div className="text-center p-3 bg-white rounded-2xl border border-lp-border">
                            <p className="text-xl font-bold text-lp-red">{courseHistory.summary.alpa || 0}</p>
                            <p className="text-[10px] text-lp-red font-mono font-bold uppercase mt-1 tracking-wider">Alpa</p>
                          </div>
                          <div className="text-center p-3 bg-white rounded-2xl border border-lp-border col-span-2 sm:col-span-1">
                            <p className="text-xl font-bold text-lp-text">{courseHistory.summary.total || 0}</p>
                            <p className="text-[10px] text-lp-text3 font-mono font-bold uppercase mt-1 tracking-wider">Total</p>
                          </div>
                        </div>
                        {courseHistory.summary.total > 0 && (
                          <div className="mt-5">
                            <div className="flex justify-between items-center text-xs font-semibold mb-1.5">
                              <span className="text-lp-text2">Persentase Kehadiran</span>
                              <span className="text-lp-atext font-mono">{courseHistory.summary.kehadiran_percent?.toFixed(1) || 0}%</span>
                            </div>
                            <div className="w-full bg-lp-surface rounded-full h-2">
                              <div 
                                className="bg-lp-accent h-2 rounded-full transition-all duration-500" 
                                style={{ width: `${courseHistory.summary.kehadiran_percent || 0}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* History List */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 mb-4">
                        <h4 className="text-[11px] font-mono font-bold tracking-[0.2em] uppercase text-lp-text3">Detail Per Pertemuan</h4>
                        <div className="h-px flex-1 bg-lp-border" />
                      </div>
                      {courseHistory.history && courseHistory.history.length > 0 ? (
                        <div className="space-y-3">
                          {courseHistory.history.map((record, index) => (
                            <div key={index} className="border border-lp-border rounded-2xl p-4 bg-white hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 transition-all duration-500">
                              <div className="flex justify-between items-start gap-4">
                                <div className="space-y-0.5">
                                  <p className="font-bold text-sm text-lp-text">Pertemuan {record.pertemuan_ke}</p>
                                  <p className="text-xs text-lp-text2 font-light flex items-center gap-1.5">
                                    <FaCalendarAlt className="text-lp-text3 shrink-0" />
                                    <span>{record.tanggal} • {record.jam}</span>
                                  </p>
                                  {record.session_code && (
                                    <p className="text-[10px] font-mono text-lp-text3 bg-lp-surface px-2.5 py-0.5 rounded-full border border-lp-border inline-block mt-1">
                                      Code: {record.session_code}
                                    </p>
                                  )}
                                </div>
                                <div>
                                  {renderStatusBadge(record.status)}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12 border border-dashed border-lp-border rounded-[2rem]">
                          <div className="w-12 h-12 rounded-2xl bg-lp-surface flex items-center justify-center mx-auto mb-3">
                            <FaHistory className="text-lg text-lp-text3" />
                          </div>
                          <p className="text-xs text-lp-text3 font-light">Belum ada riwayat absensi untuk mata kuliah ini</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-xs text-lp-text3 font-light">Tidak ada data riwayat kehadiran.</p>
                  </div>
                )}
              </div>
              
              <div className="mt-6 pt-4 border-t border-lp-border relative z-10 shrink-0">
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="w-full py-3.5 bg-lp-surface hover:bg-lp-text hover:text-white text-lp-text border border-lp-border rounded-full font-bold transition-all duration-500 cursor-pointer text-[12px] uppercase tracking-widest"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const ScanAbsensi = () => (
  <ScannerErrorBoundary>
    <ScanAbsensiContent />
  </ScannerErrorBoundary>
)

export default ScanAbsensi
