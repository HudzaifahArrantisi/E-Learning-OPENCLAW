// Removed duplicate/simple component block. Only the full-featured component remains below.
import React, { useState, useRef } from 'react'
import { useMutation, useQuery } from "@tanstack/react-query";
import api from '../../services/api'
import Navbar from '../../components/Navbar'
import Sidebar from '../../components/Sidebar'
import useAuth from '../../hooks/useAuth'
import { 
  FaQrcode, 
  FaCheckCircle, 
  FaTimesCircle, 
  FaCalendarAlt,
  FaClock,
  FaUserGraduate,
  FaBook,
  FaCalendarDay,
  FaRegCalendarCheck,
  FaCamera,
  FaHistory,
  FaFilter,
  FaCalendarWeek,
  FaVideo,
  FaStopCircle,
  FaList,
  FaEye,
  FaPlayCircle
} from 'react-icons/fa'
import QrScanner from 'qr-scanner';

const getCurrentIndonesianDay = () => {
  const dayMap = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
  return dayMap[new Date().getDay()]
}

const ScanAbsensi = () => {
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
      alert(response.data.message || 'Absensi berhasil!')
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
      setScanResult({
        success: false,
        message: error.response?.data?.message || 'Gagal melakukan absensi'
      })
      alert(error.response?.data?.message || 'Gagal melakukan absensi')
      stopScanning()
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
          alert('Tidak dapat mengakses kamera. Pastikan izin kamera diberikan.')
        })

      activeScanner = scanner
    }

    return () => {
      if (activeScanner) {
        activeScanner.stop()
        activeScanner.destroy()
      }
      setQrScanner(null)
      setIsScanning(false)
    }
  }, [showQRScanner])

  const stopScanning = () => {
    setShowQRScanner(false)
  }

  const handleScanResult = (result) => {
    console.log('QR Scan result:', result)

    if (isProcessingScanRef.current || scanAttendanceMutation.isPending) {
      return
    }

    const rawData = typeof result?.data === 'string' ? result.data.trim() : ''
    if (!rawData) {
      alert('QR Code tidak valid')
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
      alert('QR Code tidak valid')
      return
    }

    const availableCourses = coursesByDay?.courses || []
    let resolvedCourseId = selectedCourse?.kode || ''

    if (qrCourseId) {
      if (resolvedCourseId && resolvedCourseId !== qrCourseId) {
        alert('QR Code tidak sesuai dengan mata kuliah yang dipilih')
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
      alert('Pilih mata kuliah terlebih dahulu sebelum scan')
      return
    }

    isProcessingScanRef.current = true
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
      'hadir': { color: 'bg-green-100 text-green-800 border border-green-200/50', label: 'Hadir', icon: '✓' },
      'izin': { color: 'bg-yellow-100 text-yellow-800 border border-yellow-200/50', label: 'Izin', icon: 'i' },
      'sakit': { color: 'bg-blue-100 text-blue-800 border border-blue-200/50', label: 'Sakit', icon: '⚕' },
      'alpa': { color: 'bg-red-100 text-red-800 border border-red-200/50', label: 'Alpa', icon: '✗' },
      'belum_absen': { color: 'bg-slate-100 text-slate-700 border border-slate-200/50 font-semibold tracking-tight', label: 'Belum Absen', icon: '...' }
    }
    
    const config = statusConfig[status] || statusConfig['belum_absen']
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${config.color} flex items-center gap-1.5`}>
        <span className="text-[10px]">{config.icon}</span>
        <span>{config.label}</span>
      </span>
    )
  }

  const renderTimeStatus = (course) => {
    const now = new Date()
    const [startHour, startMinute] = course.jam_mulai.split(':').map(Number)
    const [endHour, endMinute] = course.jam_selesai.split(':').map(Number)
    
    const startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), startHour, startMinute)
    const endTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), endHour, endMinute)
    
    const fifteenBefore = new Date(startTime.getTime() - 15 * 60000)
    const sixtyAfter = new Date(endTime.getTime() + 60 * 60000)
    
    if (now < fifteenBefore) {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-lp-text3 font-medium bg-slate-50 border border-slate-200/50 px-2.5 py-1 rounded-lg">
          <FaClock className="text-lp-text3 shrink-0" />
          <span>Buka 15m sebelum kelas</span>
        </span>
      )
    } else if (now > sixtyAfter) {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-red-600 font-medium bg-red-50 border border-red-100 px-2.5 py-1 rounded-lg">
          <FaStopCircle className="text-red-500 shrink-0" />
          <span>Waktu absen habis</span>
        </span>
      )
    } else if (course.can_scan) {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-green-700 font-semibold bg-green-50 border border-green-200/50 px-2.5 py-1 rounded-lg animate-pulse">
          <FaCheckCircle className="text-green-500 shrink-0" />
          <span>Bisa absen sekarang</span>
        </span>
      )
    }
    return null
  }

  return (
    <div className="flex h-screen bg-lp-bg">
      <Sidebar role="mahasiswa" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar user={user} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {/* Header Section */}
            <div className="mb-8">
              <h1 className="text-2xl md:text-3xl font-bold text-lp-text tracking-tight mb-2">Scan Absensi</h1>
              <p className="text-lp-text2 font-light text-sm md:text-base">Lakukan absensi perkuliahan secara cepat dan efisien</p>
            </div>

            {/* Quick Scan Card */}
            <div className="bg-gradient-to-br from-lp-accent to-indigo-600 shadow-[0_12px_30px_rgba(75,115,255,0.15)] hover:shadow-[0_16px_40px_rgba(75,115,255,0.25)] transition-all duration-300 rounded-3xl p-6 md:p-8 text-white mb-8 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
              <div className="relative z-10 space-y-1">
                <h2 className="text-xl md:text-2xl font-bold">Presensi Cepat via QR</h2>
                <p className="text-white/80 font-light text-xs md:text-sm max-w-xl">
                  Dosen sudah menampilkan QR Code absensi? Klik tombol ini untuk langsung memindai QR Code kelas Anda secara instan tanpa memilih mata kuliah terlebih dahulu.
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedCourse(null) // Reset selection to allow auto-detect from QR
                  setShowQRScanner(true)
                }}
                className="bg-white text-lp-atext hover:bg-slate-50 font-bold px-6 py-3.5 rounded-2xl transition-all duration-300 shadow-lg hover:scale-[1.02] flex items-center gap-2.5 border-none cursor-pointer select-none shrink-0 w-full md:w-auto justify-center"
              >
                <FaCamera className="text-base" />
                <span>Mulai Scan QR</span>
              </button>
            </div>

            {/* Filter Hari */}
            <div className="bg-white border border-slate-100 rounded-3xl p-5 md:p-6 mb-8 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-lp-accentS flex items-center justify-center">
                  <FaFilter className="text-lp-atext text-sm" />
                </div>
                <h3 className="text-base md:text-lg font-bold text-lp-text tracking-tight">Filter Hari</h3>
              </div>
              <div className="flex overflow-x-auto gap-2 pb-2 -mx-5 px-5 md:mx-0 md:px-0 md:pb-0 scrollbar-hide md:flex-wrap">
                {days.map((day) => (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={`px-5 py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-all duration-200 whitespace-nowrap cursor-pointer border select-none ${
                      selectedDay === day 
                        ? 'bg-lp-accent text-white border-lp-accent shadow-md shadow-lp-accent/20' 
                        : 'bg-slate-50 text-lp-text2 hover:bg-slate-100 border-slate-200/60'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
              <p className="text-xs text-lp-text3 font-medium mt-3">
                Menampilkan mata kuliah untuk hari: <span className="text-lp-atext font-semibold">{selectedDay}</span>
              </p>
            </div>

            {/* Scan Result Notification */}
            {scanResult && (
              <div className={`mb-8 p-5 rounded-2xl border ${
                scanResult.success 
                  ? 'bg-green-50 border-green-200/60 text-green-900' 
                  : 'bg-red-50 border-red-200/60 text-red-900'
              } flex items-start gap-4 animate-fadeIn`}>
                <div className="mt-0.5">
                  {scanResult.success ? (
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                      <FaCheckCircle className="text-green-600 text-lg" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                      <FaTimesCircle className="text-red-600 text-lg" />
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <h4 className="font-bold text-sm md:text-base">
                    {scanResult.success ? 'Absensi Berhasil Tercatat' : 'Absensi Gagal'}
                  </h4>
                  {scanResult.success ? (
                    <div className="text-xs md:text-sm text-green-800 space-y-0.5 font-light">
                      <p className="font-semibold text-green-950">{scanResult.course}</p>
                      <p>Dosen: {scanResult.dosen}</p>
                      <p>Pertemuan ke-{scanResult.pertemuan_ke} • Status Kehadiran: <span className="font-semibold capitalize">{scanResult.status}</span></p>
                      <p className="text-[10px] text-green-600 mt-1">Dicatat pada pukul {scanResult.time} • {scanResult.date}</p>
                    </div>
                  ) : (
                    <p className="text-xs md:text-sm text-red-800 font-light">{scanResult.message}</p>
                  )}
                </div>
                <button 
                  onClick={() => setScanResult(null)}
                  className="text-slate-400 hover:text-slate-600 bg-transparent border-none cursor-pointer text-sm font-semibold"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Mata Kuliah List Container */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 mb-8 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-lp-accentS rounded-2xl flex items-center justify-center">
                    <FaCalendarWeek className="text-lp-atext text-xl" />
                  </div>
                  <div>
                    <h3 className="text-lg md:text-xl font-bold text-lp-text tracking-tight">Daftar Jadwal Kuliah</h3>
                    <p className="text-xs md:text-sm text-lp-text3 font-medium">
                      {coursesByDay?.hari || selectedDay}, {coursesByDay?.date ? 
                        new Date(coursesByDay.date).toLocaleDateString('id-ID', { 
                          day: 'numeric', 
                          month: 'long', 
                          year: 'numeric' 
                        }) : new Date().toLocaleDateString('id-ID', { 
                          day: 'numeric', 
                          month: 'long', 
                          year: 'numeric' 
                        })}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => refetchCoursesByDay()}
                  className="self-end sm:self-center text-lp-atext hover:text-blue-800 p-2.5 rounded-xl bg-lp-accentS hover:bg-blue-100/70 border-none transition-all flex items-center gap-1.5 cursor-pointer text-xs md:text-sm font-semibold"
                >
                  <FaClock className="text-xs md:text-sm shrink-0" />
                  <span>Perbarui Jadwal</span>
                </button>
              </div>

              {loadingCoursesByDay ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lp-accent mx-auto"></div>
                  <p className="mt-3 text-xs md:text-sm text-lp-text2 font-light">Memuat jadwal kuliah...</p>
                </div>
              ) : coursesByDay?.courses && coursesByDay.courses.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {coursesByDay.courses.map((course, index) => (
                    <div 
                      key={index} 
                      className={`bg-white rounded-2xl p-5 border transition-all duration-300 flex flex-col justify-between h-full ${
                        course.active_session 
                          ? 'border-blue-200 shadow-[0_8px_30px_rgba(75,115,255,0.06)] hover:shadow-[0_12px_40px_rgba(75,115,255,0.12)]' 
                          : 'border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] hover:-translate-y-0.5'
                      }`}
                    >
                      <div>
                        {/* Card Header: SKS & Status Badge */}
                        <div className="flex justify-between items-start mb-3 gap-2">
                          <span className="bg-slate-100 text-lp-text2 text-xs font-semibold px-2.5 py-1 rounded-lg">
                            {course.sks} SKS
                          </span>
                          <div className="flex flex-col items-end gap-1">
                            {renderStatusBadge(course.status_absen)}
                            {course.waktu_absen && (
                              <span className="text-[10px] text-lp-text3 font-medium">
                                Absen: {course.waktu_absen}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Course Title & Lecturer */}
                        <h4 className="font-bold text-base md:text-lg text-lp-text tracking-tight leading-snug mb-1">
                          {course.nama}
                        </h4>
                        <p className="text-xs md:text-sm text-lp-text2 font-light flex items-center gap-1.5 mb-3">
                          <FaUserGraduate className="text-lp-accent/70 shrink-0" />
                          <span className="truncate">{course.dosen}</span>
                        </p>

                        {/* Time info and state */}
                        <div className="bg-lp-surface/50 border border-slate-100/80 rounded-xl p-3 mb-4 space-y-1.5">
                          <div className="flex items-center text-xs text-lp-text2 font-medium">
                            <FaClock className="mr-2 text-lp-text3 shrink-0" />
                            <span>{course.jam_mulai} - {course.jam_selesai}</span>
                          </div>
                          <div className="flex items-center">
                            {renderTimeStatus(course)}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons directly on Card */}
                      <div className="flex items-center gap-2 mt-auto pt-3 border-t border-slate-100">
                        {course.can_scan ? (
                          <button
                            onClick={() => {
                              setSelectedCourse(course)
                              setShowQRScanner(true)
                            }}
                            className="flex-1 bg-lp-accent hover:bg-lp-atext text-white text-xs md:text-sm font-semibold py-2.5 px-3 rounded-xl shadow-md shadow-lp-accent/10 transition-all flex items-center justify-center gap-2 border-none cursor-pointer"
                          >
                            <FaCamera className="text-xs" />
                            <span>Scan QR</span>
                          </button>
                        ) : (
                          <button
                            disabled
                            className="flex-1 bg-slate-100 text-lp-text3 text-xs md:text-sm font-medium py-2.5 px-3 rounded-xl border-none cursor-not-allowed flex items-center justify-center gap-1"
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
                          className="bg-lp-accentS hover:bg-lp-accent hover:text-white text-lp-atext p-2.5 rounded-xl transition-all border-none cursor-pointer flex items-center justify-center"
                        >
                          <FaHistory className="text-sm" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-4xl text-slate-300 mb-3">📚</div>
                  <h4 className="font-bold text-base text-lp-text2 mb-1">Tidak Ada Mata Kuliah Hari Ini</h4>
                  <p className="text-xs text-lp-text3 font-light">Pilih filter hari lain untuk melihat jadwal kuliah yang tersedia.</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* QR Scanner Modal */}
      {showQRScanner && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[90] p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl relative overflow-hidden border border-slate-100 animate-scaleIn">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg md:text-xl font-bold text-lp-text tracking-tight">Pindai QR Code</h3>
                <p className="text-xs text-lp-text2 font-light mt-0.5">
                  {selectedCourse ? `${selectedCourse.nama}` : 'Pindai Cepat (Deteksi Otomatis)'}
                </p>
              </div>
              <button
                onClick={stopScanning}
                className="text-lp-text3 hover:text-lp-text bg-slate-100 hover:bg-slate-200 w-8 h-8 rounded-full flex items-center justify-center transition-all border-none cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            <div className="relative aspect-square bg-slate-950 rounded-2xl overflow-hidden mb-6 shadow-inner border border-slate-800">
              <video 
                ref={videoRef} 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-56 h-56 border-2 border-dashed border-white/40 rounded-2xl relative flex items-center justify-center">
                  {/* Scanner line animation */}
                  <div className="absolute left-0 right-0 h-0.5 bg-lp-green/70 shadow-[0_0_10px_rgba(22,163,74,0.8)] animate-pulse" style={{ top: '50%' }}></div>
                  <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-lp-accent rounded-tl-lg"></div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-lp-accent rounded-tr-lg"></div>
                  <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-lp-accent rounded-bl-lg"></div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-lp-accent rounded-br-lg"></div>
                </div>
              </div>
            </div>
            
            <div className="text-center space-y-4">
              <p className="text-xs text-lp-text2 font-light">
                Arahkan kamera ke QR Code absensi yang ditampilkan oleh Dosen Anda di depan kelas.
              </p>
              
              <button
                onClick={stopScanning}
                className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold transition-all flex items-center justify-center gap-2 border-none cursor-pointer text-xs md:text-sm"
              >
                <FaStopCircle />
                <span>Hentikan Pemindaian</span>
              </button>
              
              <div className="flex items-center justify-center gap-2 text-xs text-lp-text3 font-medium">
                <div className={`w-2 h-2 rounded-full ${isScanning ? 'bg-lp-green animate-pulse' : 'bg-red-500'}`}></div>
                <span>{isScanning ? 'Kamera Aktif & Memindai' : 'Kamera Nonaktif'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && selectedCourse && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[90] p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-2xl w-full max-h-[85vh] shadow-2xl relative overflow-hidden border border-slate-100 flex flex-col animate-scaleIn">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-lg md:text-xl font-bold text-lp-text tracking-tight">Riwayat Absensi</h3>
                <p className="text-xs md:text-sm text-lp-text2 font-light mt-0.5">
                  {selectedCourse.nama} • {selectedCourse.dosen}
                </p>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-lp-text3 hover:text-lp-text bg-slate-100 hover:bg-slate-200 w-8 h-8 rounded-full flex items-center justify-center transition-all border-none cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
              {loadingHistory ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lp-accent mx-auto"></div>
                  <p className="mt-3 text-xs md:text-sm text-lp-text2 font-light">Memuat riwayat kehadiran...</p>
                </div>
              ) : courseHistory ? (
                <div className="space-y-6">
                  {/* Summary */}
                  {courseHistory.summary && (
                    <div className="p-5 bg-lp-accentS border border-lp-accent/10 rounded-2xl">
                      <h4 className="font-bold text-lp-atext text-xs md:text-sm mb-3">Ringkasan Kehadiran</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        <div className="text-center p-3 bg-white rounded-xl border border-slate-100">
                          <p className="text-xl font-bold text-lp-green">{courseHistory.summary.hadir || 0}</p>
                          <p className="text-[10px] text-lp-green font-medium uppercase mt-0.5">Hadir</p>
                        </div>
                        <div className="text-center p-3 bg-white rounded-xl border border-slate-100">
                          <p className="text-xl font-bold text-lp-amber">{courseHistory.summary.izin || 0}</p>
                          <p className="text-[10px] text-lp-amber font-medium uppercase mt-0.5">Izin</p>
                        </div>
                        <div className="text-center p-3 bg-white rounded-xl border border-slate-100">
                          <p className="text-xl font-bold text-lp-accent">{courseHistory.summary.sakit || 0}</p>
                          <p className="text-[10px] text-lp-atext font-medium uppercase mt-0.5">Sakit</p>
                        </div>
                        <div className="text-center p-3 bg-white rounded-xl border border-slate-100">
                          <p className="text-xl font-bold text-lp-red">{courseHistory.summary.alpa || 0}</p>
                          <p className="text-[10px] text-lp-red font-medium uppercase mt-0.5">Alpa</p>
                        </div>
                        <div className="text-center p-3 bg-white rounded-xl border border-slate-100 col-span-2 sm:col-span-1">
                          <p className="text-xl font-bold text-lp-text">{courseHistory.summary.total || 0}</p>
                          <p className="text-[10px] text-lp-text3 font-medium uppercase mt-0.5">Total Sesi</p>
                        </div>
                      </div>
                      {courseHistory.summary.total > 0 && (
                        <div className="mt-4">
                          <div className="flex justify-between items-center text-xs text-lp-text2 font-semibold mb-1">
                            <span>Persentase Kehadiran</span>
                            <span className="text-lp-atext">{courseHistory.summary.kehadiran_percent?.toFixed(1) || 0}%</span>
                          </div>
                          <div className="w-full bg-slate-200/60 rounded-full h-2">
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
                    <h4 className="font-bold text-lp-text text-sm md:text-base mb-3">Detail Kehadiran Per Pertemuan</h4>
                    {courseHistory.history && courseHistory.history.length > 0 ? (
                      <div className="space-y-2.5">
                        {courseHistory.history.map((record, index) => (
                          <div key={index} className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 hover:bg-slate-50 transition-all duration-200">
                            <div className="flex justify-between items-start gap-4">
                              <div className="space-y-0.5">
                                <p className="font-bold text-sm text-lp-text">Pertemuan {record.pertemuan_ke}</p>
                                <p className="text-xs text-lp-text2 font-light flex items-center gap-1.5">
                                  <FaCalendarAlt className="text-lp-text3 shrink-0" />
                                  <span>{record.tanggal} • {record.jam}</span>
                                </p>
                                {record.session_code && (
                                  <p className="text-[10px] font-mono text-lp-text3 bg-white px-2 py-0.5 rounded border border-slate-100 inline-block mt-1">
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
                      <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl">
                        <div className="text-3xl mb-2">📝</div>
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
            
            <div className="mt-6 pt-4 border-t border-slate-100">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-lp-text border-none py-3 rounded-xl font-bold transition-all cursor-pointer text-xs md:text-sm"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ScanAbsensi
