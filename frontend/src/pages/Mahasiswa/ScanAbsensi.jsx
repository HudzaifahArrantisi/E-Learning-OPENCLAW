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
  const [manualInput, setManualInput] = useState({ session_token: '', course_id: '' })
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [showQRScanner, setShowQRScanner] = useState(false)
  const [scanResult, setScanResult] = useState(null)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [showActionsModal, setShowActionsModal] = useState(false)
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

  // Mutation untuk scan QR - DIPERBAIKI
  const scanAttendanceMutation = useMutation({
    mutationFn: (data) => api.scanAttendance(data),
    onSuccess: (response) => {
      const data = response.data.data
      alert(response.data.message || 'Absensi berhasil!')
      setManualInput({ session_token: '', course_id: '' })
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
        setShowActionsModal(false)
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

  const handleScanSubmit = (e) => {
    e.preventDefault()
    if (!manualInput.session_token.trim() || !manualInput.course_id) {
      alert('Masukkan session token dan pilih mata kuliah')
      return
    }
    
    scanAttendanceMutation.mutate({ 
      session_token: manualInput.session_token,
      course_id: manualInput.course_id 
    })
  }

  const handleCourseSelect = (course) => {
    setSelectedCourse(course)
    setShowActionsModal(true)
  }

  const handleOpenScanner = () => {
    if (!selectedCourse) {
      alert('Pilih mata kuliah terlebih dahulu')
      return
    }
    
    if (!selectedCourse.can_scan) {
      if (selectedCourse.status_absen !== 'belum_absen' && selectedCourse.status_absen !== '') {
        alert(`Anda sudah absen untuk ${selectedCourse.nama} pada pukul ${selectedCourse.waktu_absen}`)
      } else {
        alert(`Belum waktunya absen untuk ${selectedCourse.nama}. Waktu: ${selectedCourse.jam_mulai} - ${selectedCourse.jam_selesai}`)
      }
      return
    }
    
    setShowQRScanner(true)
    startScanning()
    setShowActionsModal(false)
  }

  const startScanning = async () => {
    try {
      if (!videoRef.current) return
      
      const scanner = new QrScanner(
        videoRef.current,
        result => handleScanResult(result),
        {
          preferredCamera: 'environment',
          highlightScanRegion: true,
          highlightCodeOutline: true,
        }
      )
      
      await scanner.start()
      setQrScanner(scanner)
      setIsScanning(true)
    } catch (error) {
      console.error('Error starting scanner:', error)
      alert('Tidak dapat mengakses kamera. Pastikan izin kamera diberikan.')
    }
  }

  const stopScanning = () => {
    if (qrScanner) {
      qrScanner.stop()
      qrScanner.destroy()
      setQrScanner(null)
    }
    setIsScanning(false)
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

  const handleManualToken = (token) => {
    if (!selectedCourse) {
      alert('Pilih mata kuliah terlebih dahulu')
      return
    }

    const normalizedToken = token?.trim()
    if (!normalizedToken) {
      alert('Masukkan token QR Code')
      return
    }

    if (isProcessingScanRef.current || scanAttendanceMutation.isPending) {
      return
    }

    isProcessingScanRef.current = true
    scanAttendanceMutation.mutate({ 
      session_token: normalizedToken,
      course_id: selectedCourse.kode 
    }, {
      onSettled: () => {
        isProcessingScanRef.current = false
      }
    })
  }

  // Render status badge
  const renderStatusBadge = (status) => {
    const statusConfig = {
      'hadir': { color: 'bg-green-100 text-green-800', label: 'Hadir', icon: '✓' },
      'izin': { color: 'bg-yellow-100 text-yellow-800', label: 'Izin', icon: 'i' },
      'sakit': { color: 'bg-blue-100 text-blue-800', label: 'Sakit', icon: '⚕' },
      'alpa': { color: 'bg-red-100 text-red-800', label: 'Alpa', icon: '✗' },
      'belum_absen': { color: 'bg-gray-100 text-lp-text font-semibold tracking-tight', label: 'Belum Absen', icon: '...' }
    }
    
    const config = statusConfig[status] || statusConfig['belum_absen']
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${config.color} flex items-center gap-1`}>
        <span>{config.icon}</span>
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
      return <span className="text-xs text-lp-text3 font-light flex items-center gap-1"><FaClock /> Buka 15 menit sebelum kelas</span>
    } else if (now > sixtyAfter) {
      return <span className="text-xs text-red-500 flex items-center gap-1"><FaStopCircle /> Waktu absen habis</span>
    } else if (course.can_scan) {
      return <span className="text-xs text-lp-green flex items-center gap-1"><FaCheckCircle /> Bisa absen sekarang</span>
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
            <div className="mb-8">
              <h1 className="text-2xl md:text-3xl font-bold text-lp-text font-semibold tracking-tight mb-2">Scan Absensi</h1>
              <p className="text-lp-text2 font-light">Lakukan absensi sesuai jadwal kuliah Anda</p>
            </div>

            {/* Filter Hari */}
            <div className="bg-lp-surface rounded-2xl p-4 mb-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border border border-lp-border border">
              <div className="flex items-center gap-2 mb-4">
                <FaFilter className="text-lp-atext" />
                <h3 className="text-lg font-semibold text-lp-text font-semibold tracking-tight">Filter Hari</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {days.map((day) => (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      selectedDay === day 
                        ? 'bg-lp-accent text-white shadow-sm border border-lp-border' 
                        : 'bg-gray-100 text-lp-text2 hover:bg-gray-200'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
              <p className="text-sm text-lp-text3 font-light mt-3">
                Menampilkan mata kuliah untuk hari: <span className="font-semibold">{selectedDay}</span>
              </p>
            </div>

            {/* Scan Result */}
            {scanResult && (
              <div className={`mb-6 p-4 rounded-xl ${scanResult.success ? 'bg-green-100 border border-green-200' : 'bg-red-100 border border-red-200'}`}>
                <div className="flex items-center">
                  {scanResult.success ? (
                    <FaCheckCircle className="text-lp-green text-xl mr-3" />
                  ) : (
                    <FaTimesCircle className="text-red-600 text-xl mr-3" />
                  )}
                  <div>
                    <p className={`font-medium ${scanResult.success ? 'text-green-800' : 'text-red-800'}`}>
                      {scanResult.success ? 'Absensi Berhasil!' : 'Absensi Gagal'}
                    </p>
                    {scanResult.success && (
                      <div className="text-sm text-green-700">
                        <p><strong>{scanResult.course}</strong> - {scanResult.dosen}</p>
                        <p>Pertemuan ke-{scanResult.pertemuan_ke} • Status: {scanResult.status}</p>
                        <p>Waktu: {scanResult.time} • Tanggal: {scanResult.date}</p>
                      </div>
                    )}
                    {!scanResult.success && (
                      <p className="text-sm text-red-700">{scanResult.message}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Mata Kuliah List */}
            <div className="bg-lp-surface rounded-2xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border border border-lp-border border mb-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <FaCalendarWeek className="text-lp-atext text-lg" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-lp-text font-semibold tracking-tight">Mata Kuliah {selectedDay}</h3>
                    <p className="text-sm text-lp-text2 font-light">
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
                  className="text-lp-atext hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50"
                >
                  <FaClock className="text-lg" />
                </button>
              </div>

              {loadingCoursesByDay ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-lp-text2 font-light">Memuat jadwal...</p>
                </div>
              ) : coursesByDay?.courses && coursesByDay.courses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {coursesByDay.courses.map((course, index) => (
                    <div key={index} className={`border border-lp-border border rounded-xl p-4 hover:shadow-sm border border-lp-border transition-shadow ${
                      selectedCourse?.kode === course.kode ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                    }`}>
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-bold text-lp-text font-semibold tracking-tight">{course.nama}</h4>
                            {course.active_session && (
                              <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                                Sesi Aktif
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-lp-text2 font-light">{course.dosen} • {course.sks} SKS</p>
                          <div className="flex items-center mt-2 text-sm text-lp-text3 font-light">
                            <FaClock className="mr-2" />
                            <span>{course.jam_mulai} - {course.jam_selesai}</span>
                          </div>
                          <div className="mt-2">
                            {renderTimeStatus(course)}
                          </div>
                        </div>
                        <div className="ml-4 flex flex-col items-end">
                          {renderStatusBadge(course.status_absen)}
                          {course.waktu_absen && (
                            <p className="text-xs text-lp-text3 font-light mt-1">
                              {course.waktu_absen}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {/* Tombol Pilih */}
                      <button
                        onClick={() => handleCourseSelect(course)}
                        className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                          selectedCourse?.kode === course.kode 
                            ? 'bg-lp-accent text-white' 
                            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        }`}
                      >
                        {selectedCourse?.kode === course.kode ? '✓ Terpilih' : 'Pilih Mata Kuliah'}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl text-gray-300 mb-4">📚</div>
                  <h4 className="font-bold text-lp-text2 mb-2">Tidak ada mata kuliah {selectedDay}</h4>
                  <p className="text-lp-text3 font-light">Pilih hari lain untuk melihat jadwal kuliah</p>
                </div>
              )}
            </div>

            {/* Manual Input Section */}
            <div className="bg-lp-surface rounded-2xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border border border-lp-border border">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <FaQrcode className="text-lp-green text-lg" />
                </div>
                <h3 className="text-xl font-bold text-lp-text font-semibold tracking-tight">Input Manual Token</h3>
              </div>

              <form onSubmit={handleScanSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-lp-text2 mb-2">
                      Mata Kuliah
                    </label>
                    <select
                      value={manualInput.course_id}
                      onChange={(e) => setManualInput({...manualInput, course_id: e.target.value})}
                      className="w-full px-4 py-3 border border-lp-border border rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 bg-lp-bg focus:bg-lp-surface"
                      required
                      disabled={scanAttendanceMutation.isPending}
                    >
                      <option value="">Pilih Mata Kuliah</option>
                      {coursesByDay?.courses?.map((course) => (
                        <option key={course.kode} value={course.kode}>
                          {course.nama} ({course.jam_mulai}-{course.jam_selesai})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-lp-text2 mb-2">
                      Token dari QR Code
                    </label>
                    <input
                      type="text"
                      value={manualInput.session_token}
                      onChange={(e) => setManualInput({...manualInput, session_token: e.target.value})}
                      className="w-full px-4 py-3 border border-lp-border border rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 bg-lp-bg focus:bg-lp-surface"
                      placeholder="Masukkan token dari QR code dosen"
                      required
                      disabled={scanAttendanceMutation.isPending}
                    />
                  </div>
                </div>
                
                <button
                  type="submit"
                  disabled={scanAttendanceMutation.isPending || !manualInput.course_id}
                  className="w-full bg-lp-accent text-white border-none py-3 px-6 rounded-xl font-semibold hover:from-green-600 hover:to-green-700 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transition-all duration-300 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border hover:shadow-xl flex items-center justify-center space-x-2"
                >
                  {scanAttendanceMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Memproses...</span>
                    </>
                  ) : (
                    <>
                      <FaQrcode />
                      <span>Absen dengan Token Manual</span>
                    </>
                  )}
                </button>
              </form>
              
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Info:</strong> Token QR Code didapatkan dari QR Code yang ditampilkan dosen di kelas. 
                  Pastikan mata kuliah yang dipilih sesuai dengan QR Code.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Modal Actions untuk Mata Kuliah Terpilih */}
      {showActionsModal && selectedCourse && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-lp-surface rounded-2xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold text-lp-text font-semibold tracking-tight">Aksi untuk Mata Kuliah</h3>
                <p className="text-sm text-lp-text2 font-light">
                  {selectedCourse.nama} ({selectedCourse.dosen})
                </p>
              </div>
              <button
                onClick={() => {
                  setShowActionsModal(false)
                  setSelectedCourse(null)
                }}
                className="text-lp-text3 font-light hover:text-lp-text2 text-2xl"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={handleOpenScanner}
                disabled={!selectedCourse.can_scan || isScanning}
                className={`w-full py-3 px-6 rounded-xl font-semibold transition-all flex items-center justify-center gap-3 ${
                  selectedCourse.can_scan && !isScanning
                    ? 'bg-lp-accent text-white border-none hover:from-green-600 hover:to-green-700'
                    : 'bg-gray-300 text-lp-text2 font-light cursor-not-allowed'
                }`}
              >
                {isScanning ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Sedang Scan...</span>
                  </>
                ) : (
                  <>
                    <FaCamera />
                    <span>Scan QR Absen</span>
                  </>
                )}
              </button>
              
              <button
                onClick={() => {
                  setShowHistoryModal(true)
                  setShowActionsModal(false)
                }}
                className="w-full bg-lp-accent text-white border-none py-3 px-6 rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition-all flex items-center justify-center gap-3"
              >
                <FaHistory />
                <span>Lihat Riwayat Absen</span>
              </button>
              
              <button
                onClick={() => {
                  setShowActionsModal(false)
                  setSelectedCourse(null)
                }}
                className="w-full bg-gray-100 text-lp-text2 py-3 px-6 rounded-xl font-semibold hover:bg-gray-200 transition-all flex items-center justify-center gap-3"
              >
                <FaTimesCircle />
                <span>Batal</span>
              </button>
            </div>
            
            <div className="mt-6 pt-4 border-t border-lp-border border">
              <p className="text-sm text-lp-text2 font-light">
                <strong>Status:</strong> {renderStatusBadge(selectedCourse.status_absen)}
              </p>
              {selectedCourse.waktu_absen && (
                <p className="text-sm text-lp-text2 font-light mt-1">
                  <strong>Waktu Absen:</strong> {selectedCourse.waktu_absen}
                </p>
              )}
              <p className="text-sm text-lp-text2 font-light mt-1">
                <strong>Waktu Kelas:</strong> {selectedCourse.jam_mulai} - {selectedCourse.jam_selesai}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* QR Scanner Modal */}
      {showQRScanner && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-lp-surface rounded-2xl p-6 max-w-2xl w-full">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold text-lp-text font-semibold tracking-tight">Scan QR Code</h3>
                <p className="text-sm text-lp-text2 font-light">
                  Mata Kuliah: {selectedCourse?.nama} ({selectedCourse?.jam_mulai}-{selectedCourse?.jam_selesai})
                </p>
              </div>
              <button
                onClick={stopScanning}
                className="text-lp-text3 font-light hover:text-lp-text2 text-2xl"
              >
                ✕
              </button>
            </div>
            
            <div className="relative mb-6">
              <div className="aspect-video bg-black rounded-xl overflow-hidden">
                <video 
                  ref={videoRef} 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute inset-0 border-2 border-green-500 rounded-xl pointer-events-none">
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-2 border-white rounded-lg"></div>
              </div>
            </div>
            
            <div className="text-center space-y-4">
              <p className="text-sm text-lp-text2 font-light">
                Arahkan kamera ke QR Code dosen. Scanner akan otomatis mendeteksi.
              </p>
              
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => {
                    const token = prompt("Masukkan token QR Code secara manual:")
                    if (token) handleManualToken(token)
                  }}
                  className="px-6 py-3 border-2 border-blue-600 text-lp-atext rounded-lg font-semibold hover:bg-blue-50 transition-colors"
                >
                  Input Manual
                </button>
                
                <button
                  onClick={stopScanning}
                  className="px-6 py-3 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-colors flex items-center gap-2"
                >
                  <FaStopCircle />
                  Stop Scan
                </button>
              </div>
              
              <div className="flex items-center justify-center gap-2 text-sm text-lp-text3 font-light">
                <div className={`w-3 h-3 rounded-full ${isScanning ? 'bg-lp-green animate-pulse' : 'bg-red-500'}`}></div>
                <span>{isScanning ? 'Scanning aktif' : 'Scanning berhenti'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && selectedCourse && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-lp-surface rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold text-lp-text font-semibold tracking-tight">Riwayat Absensi</h3>
                <p className="text-sm text-lp-text2 font-light">
                  {selectedCourse.nama} • {selectedCourse.dosen}
                </p>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-lp-text3 font-light hover:text-lp-text2 text-2xl"
              >
                ✕
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2">
              {loadingHistory ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-lp-text2 font-light">Memuat riwayat...</p>
                </div>
              ) : courseHistory ? (
                <>
                  {/* Summary */}
                  {courseHistory.summary && (
                    <div className="mb-6 p-4 bg-blue-50 rounded-xl">
                      <h4 className="font-bold text-blue-800 mb-3">Statistik Kehadiran</h4>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <div className="text-center p-3 bg-green-100 rounded-lg">
                          <p className="text-2xl font-bold text-green-800">{courseHistory.summary.hadir || 0}</p>
                          <p className="text-sm text-lp-green">Hadir</p>
                        </div>
                        <div className="text-center p-3 bg-yellow-100 rounded-lg">
                          <p className="text-2xl font-bold text-yellow-800">{courseHistory.summary.izin || 0}</p>
                          <p className="text-sm text-yellow-600">Izin</p>
                        </div>
                        <div className="text-center p-3 bg-blue-100 rounded-lg">
                          <p className="text-2xl font-bold text-blue-800">{courseHistory.summary.sakit || 0}</p>
                          <p className="text-sm text-lp-atext">Sakit</p>
                        </div>
                        <div className="text-center p-3 bg-red-100 rounded-lg">
                          <p className="text-2xl font-bold text-red-800">{courseHistory.summary.alpa || 0}</p>
                          <p className="text-sm text-red-600">Alpa</p>
                        </div>
                        <div className="text-center p-3 bg-purple-100 rounded-lg">
                          <p className="text-2xl font-bold text-purple-800">{courseHistory.summary.total || 0}</p>
                          <p className="text-sm text-purple-600">Total</p>
                        </div>
                      </div>
                      {courseHistory.summary.total > 0 && (
                        <div className="mt-3">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-lp-green h-2 rounded-full" 
                              style={{ width: `${courseHistory.summary.kehadiran_percent || 0}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-lp-text2 font-light mt-1 text-center">
                            Kehadiran: {courseHistory.summary.kehadiran_percent?.toFixed(1) || 0}%
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* History List */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-lp-text font-semibold tracking-tight mb-3">Riwayat Detail</h4>
                    {courseHistory.history && courseHistory.history.length > 0 ? (
                      courseHistory.history.map((record, index) => (
                        <div key={index} className="border border-lp-border border rounded-lg p-4 hover:bg-lp-bg">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-lp-text font-semibold tracking-tight">Pertemuan {record.pertemuan_ke}</p>
                              <p className="text-sm text-lp-text2 font-light">
                                {record.tanggal} • {record.jam}
                              </p>
                              <p className="text-xs text-lp-text3 font-light mt-1">
                                {record.session_code}
                              </p>
                            </div>
                            <div>
                              {renderStatusBadge(record.status)}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-lp-text3 font-light">
                        <div className="text-4xl mb-4">📝</div>
                        <p>Belum ada riwayat absensi untuk mata kuliah ini</p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-lp-text3 font-light">
                  <p>Tidak ada data riwayat</p>
                </div>
              )}
            </div>
            
            <div className="mt-6 pt-4 border-t border-lp-border border">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="w-full bg-gray-100 text-lp-text2 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
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
