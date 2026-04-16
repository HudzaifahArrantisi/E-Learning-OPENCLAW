import React, { useState } from 'react'
import { useQuery } from "@tanstack/react-query";
import api from '../../services/api'
import Navbar from '../../components/Navbar'
import Sidebar from '../../components/Sidebar'
import useAuth from '../../hooks/useAuth'
import { 
  FaUserGraduate, 
  FaCalendarAlt, 
  FaCheckCircle, 
  FaTimesCircle,
  FaUserCheck,
  FaUserTimes,
  FaClipboardList,
  FaChartLine,
  FaClock,
  FaCalendarDay
} from 'react-icons/fa'

const PantauKehadiran = () => {
  const { user } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [view, setView] = useState('today') // 'today' or 'history'

  // Query untuk profil anak - DIPERBAIKI
  const { data: childProfile, isLoading: loadingProfile } = useQuery({
    queryKey: ['childProfile'],
    queryFn: () => api.getChildProfile().then(res => res.data.data),
    enabled: true
  })

  // Query untuk data anak hari ini - DIPERBAIKI
  const { data: todayData, isLoading: loadingToday, refetch: refetchToday } = useQuery({
    queryKey: ['childAttendanceToday'],
    queryFn: () => api.getChildAttendanceToday().then(res => res.data.data),
    enabled: view === 'today' && !!childProfile
  })

  // Query untuk riwayat lengkap - DIPERBAIKI
  const { data: historyData, isLoading: loadingHistory } = useQuery({
    queryKey: ['childAttendanceHistory', childProfile?.id],
    queryFn: () => api.getChildAttendance(childProfile?.id).then(res => res.data.data),
    enabled: view === 'history' && !!childProfile?.id
  })

  const isLoading = (view === 'today' ? loadingToday : loadingHistory) || loadingProfile

  const renderStatusBadge = (status) => {
    const statusConfig = {
      'hadir': { color: 'bg-green-100 text-green-800', icon: FaUserCheck, label: 'Hadir' },
      'izin': { color: 'bg-yellow-100 text-yellow-800', icon: FaUserCheck, label: 'Izin' },
      'sakit': { color: 'bg-blue-100 text-blue-800', icon: FaUserCheck, label: 'Sakit' },
      'alpa': { color: 'bg-red-100 text-red-800', icon: FaUserTimes, label: 'Alpa' },
      'belum_absen': { color: 'bg-gray-100 text-lp-text font-semibold tracking-tight', icon: FaUserTimes, label: 'Belum' }
    }
    
    const config = statusConfig[status] || statusConfig['belum_absen']
    const Icon = config.icon
    
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${config.color} flex items-center gap-1`}>
        <Icon className="text-sm" />
        {config.label}
      </span>
    )
  }

  const getStatusCount = (status) => {
    if (!todayData?.today_schedule) return 0
    return todayData.today_schedule.filter(c => c.status_absen === status).length
  }

  if (isLoading) return (
    <div className="flex h-screen bg-lp-bg">
      <Sidebar role="orangtua" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col">
        <Navbar user={user} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-lp-bg">
      <Sidebar role="orangtua" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar user={user} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-2xl md:text-3xl font-bold text-lp-text font-semibold tracking-tight mb-2">Pantau Kehadiran Anak</h1>
              {childProfile && (
                <div className="flex items-center gap-4 p-4 bg-lp-surface rounded-xl shadow-sm border border-lp-border border">
                  <div className="w-16 h-16 bg-lp-bg rounded-full flex items-center justify-center">
                    <FaUserGraduate className="text-lp-atext text-2xl" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-lp-text font-semibold tracking-tight">{childProfile.name}</h2>
                    <p className="text-lp-text2 font-light">{childProfile.nim} • {childProfile.major || 'Teknik Informatika'}</p>
                    <p className="text-sm text-lp-text3 font-light">Semester {childProfile.semester || '3'}</p>
                  </div>
                </div>
              )}
            </div>

            {/* View Toggle */}
            <div className="mb-6">
              <div className="inline-flex rounded-lg border border-lp-border border p-1">
                <button
                  onClick={() => setView('today')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${view === 'today' 
                    ? 'bg-lp-accent text-white shadow' 
                    : 'text-lp-text2 font-light hover:text-lp-text font-bold tracking-tight'}`}
                >
                  <FaCalendarDay className="inline mr-2" />
                  Hari Ini
                </button>
                <button
                  onClick={() => setView('history')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${view === 'history' 
                    ? 'bg-lp-accent text-white shadow' 
                    : 'text-lp-text2 font-light hover:text-lp-text font-bold tracking-tight'}`}
                >
                  <FaClipboardList className="inline mr-2" />
                  Riwayat Lengkap
                </button>
              </div>
              
              <div className="mt-4 text-sm text-lp-text2 font-light">
                <button
                  onClick={() => view === 'today' ? refetchToday() : null}
                  className="text-lp-atext hover:text-blue-800"
                >
                  <FaClock className="inline mr-1" /> Refresh Data
                </button>
              </div>
            </div>

            {/* Content berdasarkan view */}
            {view === 'today' && todayData ? (
              <div className="space-y-6">
                {/* Statistik Ringkas */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-lp-bg p-6 rounded-2xl border border-green-200">
                    <div className="text-3xl font-bold text-lp-green">
                      {getStatusCount('hadir')}
                    </div>
                    <div className="text-sm text-lp-green font-medium">Hadir</div>
                  </div>
                  <div className="bg-lp-bg p-6 rounded-2xl border border-yellow-200">
                    <div className="text-3xl font-bold text-yellow-600">
                      {getStatusCount('izin')}
                    </div>
                    <div className="text-sm text-yellow-600 font-medium">Izin</div>
                  </div>
                  <div className="bg-lp-bg p-6 rounded-2xl border border-blue-200">
                    <div className="text-3xl font-bold text-lp-atext">
                      {getStatusCount('sakit')}
                    </div>
                    <div className="text-sm text-lp-atext font-medium">Sakit</div>
                  </div>
                  <div className="bg-lp-bg p-6 rounded-2xl border border-red-200">
                    <div className="text-3xl font-bold text-red-600">
                      {getStatusCount('alpa')}
                    </div>
                    <div className="text-sm text-red-600 font-medium">Alpa</div>
                  </div>
                </div>

                {/* Jadwal Hari Ini */}
                <div className="bg-lp-surface rounded-2xl shadow-sm border border-lp-border border p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-lp-text font-semibold tracking-tight flex items-center gap-3">
                      <FaCalendarAlt className="text-lp-atext" />
                      Jadwal Kuliah {todayData.hari_ini} ({todayData.date || new Date().toLocaleDateString('id-ID')})
                    </h3>
                    <span className="text-sm text-lp-text2 font-light">
                      Total: {todayData.today_schedule?.length || 0} mata kuliah
                    </span>
                  </div>
                  
                  {todayData.today_schedule && todayData.today_schedule.length > 0 ? (
                    <div className="space-y-4">
                      {todayData.today_schedule.map((course, index) => (
                        <div key={index} className="border border-lp-border border rounded-xl p-4 hover:shadow-sm border border-lp-border transition-shadow">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="font-bold text-lp-text font-semibold tracking-tight">{course.mata_kuliah}</h4>
                              <div className="flex items-center gap-4 mt-2">
                                <div className="flex items-center text-sm text-lp-text2 font-light">
                                  <FaUserGraduate className="mr-2" />
                                  <span>{course.dosen}</span>
                                </div>
                                <div className="flex items-center text-sm text-lp-text2 font-light">
                                  <FaClock className="mr-2" />
                                  <span>{course.jam_mulai} - {course.jam_selesai}</span>
                                </div>
                              </div>
                              <div className="mt-3">
                                <p className="text-sm text-lp-text2">Kode: {course.kode} • Hari: {course.hari}</p>
                              </div>
                            </div>
                            <div className="ml-4 flex flex-col items-end">
                              {renderStatusBadge(course.status_absen)}
                              {course.waktu_absen && (
                                <p className="text-xs text-lp-text3 font-light mt-1">
                                  Absen: {course.waktu_absen}
                                </p>
                              )}
                              {course.status_absen === 'belum_absen' && (
                                <p className="text-xs text-yellow-600 mt-1">
                                  Belum absen
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-4 text-gray-300">📚</div>
                      <h4 className="font-semibold text-lp-text2 mb-2">Tidak ada jadwal kuliah hari ini</h4>
                      <p className="text-lp-text3 font-light">Anak Anda tidak memiliki jadwal kuliah hari ini</p>
                    </div>
                  )}
                </div>
                
                {/* Summary */}
                <div className="bg-lp-bg p-6 rounded-2xl">
                  <h4 className="font-bold text-lp-text font-semibold tracking-tight mb-4 flex items-center gap-2">
                    <FaChartLine className="text-lp-atext" />
                    Ringkasan Kehadiran Hari Ini
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-lp-green">{getStatusCount('hadir')}</div>
                      <div className="text-sm text-lp-text2 font-light">Hadir</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">{getStatusCount('izin')}</div>
                      <div className="text-sm text-lp-text2 font-light">Izin</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-lp-atext">{getStatusCount('sakit')}</div>
                      <div className="text-sm text-lp-text2 font-light">Sakit</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{getStatusCount('alpa')}</div>
                      <div className="text-sm text-lp-text2 font-light">Alpa</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : view === 'history' && historyData ? (
              <div className="space-y-6">
                {/* Statistik Riwayat */}
                <div className="bg-lp-surface rounded-2xl shadow-sm border border-lp-border border p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <FaChartLine className="text-lp-atext text-2xl" />
                    <h3 className="text-xl font-bold text-lp-text font-semibold tracking-tight">Statistik Kehadiran</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-lp-bg p-4 rounded-xl border border-green-200">
                      <div className="text-2xl font-bold text-lp-green">
                        {historyData.summary?.hadir || 0}
                      </div>
                      <div className="text-sm text-lp-green font-medium">Hadir</div>
                    </div>
                    <div className="bg-lp-bg p-4 rounded-xl border border-yellow-200">
                      <div className="text-2xl font-bold text-yellow-600">
                        {historyData.summary?.izin || 0}
                      </div>
                      <div className="text-sm text-yellow-600 font-medium">Izin</div>
                    </div>
                    <div className="bg-lp-bg p-4 rounded-xl border border-blue-200">
                      <div className="text-2xl font-bold text-lp-atext">
                        {historyData.summary?.sakit || 0}
                      </div>
                      <div className="text-sm text-lp-atext font-medium">Sakit</div>
                    </div>
                    <div className="bg-lp-bg p-4 rounded-xl border border-red-200">
                      <div className="text-2xl font-bold text-red-600">
                        {historyData.summary?.alpa || 0}
                      </div>
                      <div className="text-sm text-red-600 font-medium">Alpa</div>
                    </div>
                  </div>

                  <div className="bg-lp-bg p-4 rounded-xl">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-lp-text2 font-light">Persentase Kehadiran</p>
                        <p className="text-2xl font-bold text-lp-atext">
                          {historyData.summary?.persentase?.toFixed(1) || 0}%
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-lp-text2 font-light">Total Absensi</p>
                        <p className="text-2xl font-bold text-lp-text font-semibold tracking-tight">{historyData.summary?.total || 0}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tabel Riwayat */}
                <div className="bg-lp-surface rounded-2xl shadow-sm border border-lp-border border overflow-hidden">
                  <div className="p-6 border-b border-lp-border border">
                    <h3 className="text-xl font-bold text-lp-text font-semibold tracking-tight flex items-center gap-3">
                      <FaClipboardList className="text-lp-atext" />
                      Riwayat Absensi
                    </h3>
                    <p className="text-sm text-lp-text2 font-light mt-1">
                      Total: {historyData.attendances?.length || 0} record
                    </p>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-lp-bg">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-lp-text3 font-light uppercase tracking-wider">
                            Tanggal & Waktu
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-lp-text3 font-light uppercase tracking-wider">
                            Mata Kuliah
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-lp-text3 font-light uppercase tracking-wider">
                            Dosen
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-lp-text3 font-light uppercase tracking-wider">
                            Jadwal
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-lp-text3 font-light uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-lp-surface divide-y divide-gray-200">
                        {historyData.attendances && historyData.attendances.length > 0 ? (
                          historyData.attendances.slice(0, 20).map((record, index) => (
                            <tr key={index} className="hover:bg-lp-bg">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div>
                                  <div className="text-sm font-medium text-lp-text font-bold tracking-tight">{record.tanggal}</div>
                                  <div className="text-sm text-lp-text3 font-light">{record.jam}</div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm font-medium text-lp-text font-bold tracking-tight">{record.mata_kuliah}</div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-lp-text font-bold tracking-tight">{record.dosen}</div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-lp-text font-bold tracking-tight">{record.hari_kuliah}</div>
                                <div className="text-sm text-lp-text3 font-light">{record.jam_mulai} - {record.jam_selesai}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {renderStatusBadge(record.status)}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="5" className="px-6 py-8 text-center text-lp-text3 font-light">
                              Belum ada riwayat absensi
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  
                  {historyData.attendances && historyData.attendances.length > 20 && (
                    <div className="p-4 border-t border-lp-border border text-center">
                      <p className="text-sm text-lp-text2 font-light">
                        Menampilkan 20 dari {historyData.attendances.length} record
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-4xl text-gray-300 mb-4">📊</div>
                <h3 className="text-xl font-bold text-lp-text2 mb-2">Tidak ada data</h3>
                <p className="text-lp-text3 font-light">Pilih opsi di atas untuk melihat data kehadiran</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export default PantauKehadiran