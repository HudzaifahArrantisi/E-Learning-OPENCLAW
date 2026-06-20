import React, { useState, useEffect } from 'react'
import Navbar from '../../components/Navbar'
import Sidebar from '../../components/Sidebar'
import useAuth from '../../hooks/useAuth'
import api from '../../services/api'
import {
  FiBarChart2, FiBookOpen, FiChevronDown, FiMenu,
  FiAward, FiTrendingUp, FiBook, FiUser, FiCalendar,
  FiCheckCircle, FiClock, FiSearch, FiChevronRight,
  FiGrid, FiList
} from 'react-icons/fi'

const TranskripNilai = () => {
  const { user } = useAuth()
  const [transkripData, setTranskripData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [expandedCourse, setExpandedCourse] = useState(null)
  const [filterCourse, setFilterCourse] = useState('')
  const [viewMode, setViewMode] = useState('matkul') // 'matkul' | 'pertemuan'
  const [sidebarOpen, setSidebarOpen] = useState(false)

  async function fetchTranskrip() {
    try {
      setLoading(true)
      const res = await api.getTranskripNilai()
      setTranskripData(res.data?.data || null)
    } catch (err) {
      console.error('Error fetching transkrip:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(fetchTranskrip, 0)
    return () => window.clearTimeout(timeout)
  }, [])

  const getGradeBadgeClass = (letter) => {
    if (['A', 'A-'].includes(letter)) return 'bg-lp-green/10 text-lp-green border-lp-green/20'
    if (['B+', 'B'].includes(letter)) return 'bg-lp-accentS text-lp-atext border-lp-accent/20'
    if (['B-', 'C+'].includes(letter)) return 'bg-lp-amber/10 text-lp-amber border-lp-amber/20'
    return 'bg-lp-red/10 text-lp-red border-lp-red/20'
  }

  const getScoreColor = (grade) => {
    if (grade >= 85) return 'text-lp-green font-bold'
    if (grade >= 70) return 'text-lp-atext font-bold'
    if (grade >= 55) return 'text-lp-amber font-bold'
    return 'text-lp-red font-bold'
  }

  const getProgressColor = (grade) => {
    if (grade >= 85) return 'bg-lp-green'
    if (grade >= 70) return 'bg-lp-accent'
    if (grade >= 55) return 'bg-lp-amber'
    return 'bg-lp-red'
  }

  const filteredCourses = transkripData?.courses?.filter(c =>
    !filterCourse || c.course_name.toLowerCase().includes(filterCourse.toLowerCase()) ||
    c.course_id.toLowerCase().includes(filterCourse.toLowerCase())
  ) || []

  // Group grades by pertemuan across all courses
  const getPertemuanView = () => {
    const pertemuanMap = {}
    filteredCourses.forEach(course => {
      (course.grades || []).forEach(g => {
        const key = g.pertemuan
        if (!pertemuanMap[key]) pertemuanMap[key] = []
        pertemuanMap[key].push({ ...g, course_name: course.course_name, course_id: course.course_id })
      })
    })
    return Object.entries(pertemuanMap).sort(([a], [b]) => Number(a) - Number(b))
  }

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen)

  if (loading) {
    return (
      <div className="flex min-h-screen bg-lp-bg relative z-0">
        <Sidebar role="mahasiswa" isOpen={sidebarOpen} onClose={toggleSidebar} />
        <div className="flex-1 flex flex-col min-w-0 relative z-10">
          <Navbar user={user} onToggleSidebar={toggleSidebar} />
          <main className="flex-1 overflow-y-auto">
            <div className="p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto">
              <div className="h-12 w-64 bg-lp-surface rounded-2xl animate-pulse mb-8" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                {[1,2,3,4].map(i => (
                  <div key={i} className="bg-white border border-lp-border rounded-[2.5rem] p-7 animate-pulse h-40" />
                ))}
              </div>
              {[1,2,3].map(i => (
                <div key={i} className="bg-white border border-lp-border rounded-[2.5rem] p-6 animate-pulse h-24 mb-4" />
              ))}
            </div>
          </main>
        </div>
      </div>
    )
  }

  const courses = filteredCourses
  const ipk = transkripData?.ipk || '0.00'
  const totalSKS = transkripData?.total_sks || 0
  const studentName = transkripData?.student_name || user?.name || '-'
  const studentNIM = transkripData?.student_nim || '-'
  const totalGradedItems = courses.reduce((sum, c) => sum + (c.total_graded || 0), 0)

  return (
    <div className="flex min-h-screen bg-lp-bg">
      {/* Background Decorative Layer */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-lp-text/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-lp-text/5 blur-[120px] rounded-full" />
      </div>

      <Sidebar role="mahasiswa" isOpen={sidebarOpen} onClose={toggleSidebar} />

      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        <Navbar user={user} onToggleSidebar={toggleSidebar} />

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto">
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6 lg:gap-8 lg:mb-12">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <button 
                    onClick={toggleSidebar}
                    className="lg:hidden p-3 rounded-xl bg-white border border-lp-border hover:bg-lp-surface transition-all"
                  >
                    <FiChevronRight className="text-lp-text" />
                  </button>
                  <span className="text-[11px] font-mono font-medium tracking-[0.2em] uppercase text-lp-text3">
                    ACADEMIC PERFORMANCE
                  </span>
                </div>
                
                <h1 className="text-4xl md:text-5xl font-light text-lp-text tracking-tight mb-3">
                  Transkrip Nilai
                  <span className="text-lp-text3 block text-lg font-normal mt-2">
                    Pantau pencapaian akademik dan riwayat penilaian tugas Anda
                  </span>
                </h1>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              
              {/* IPK Card */}
              <div className="bg-white border border-lp-border rounded-[2.5rem] p-7 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300">
                <div className="absolute top-0 right-0 w-24 h-24 bg-lp-accentS blur-[35px] rounded-full pointer-events-none" />
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-mono font-bold tracking-[0.15em] uppercase text-lp-text3">IPK</span>
                  <div className="w-10 h-10 rounded-xl bg-lp-accentS flex items-center justify-center border border-lp-accent/15">
                    <FiAward className="text-lg text-lp-atext" />
                  </div>
                </div>
                <h3 className="text-4xl font-extrabold text-lp-text tracking-tight mb-1">{ipk}</h3>
                <p className="text-xs text-lp-text3 font-light">Indeks Prestasi Kumulatif</p>
              </div>

              {/* SKS Card */}
              <div className="bg-white border border-lp-border rounded-[2.5rem] p-7 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300">
                <div className="absolute top-0 right-0 w-24 h-24 bg-lp-green/5 blur-[35px] rounded-full pointer-events-none" />
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-mono font-bold tracking-[0.15em] uppercase text-lp-text3">Total SKS</span>
                  <div className="w-10 h-10 rounded-xl bg-lp-green/10 flex items-center justify-center border border-lp-green/20">
                    <FiBook className="text-lg text-lp-green" />
                  </div>
                </div>
                <h3 className="text-4xl font-extrabold text-lp-text tracking-tight mb-1">{totalSKS}</h3>
                <p className="text-xs text-lp-text3 font-light">Satuan Kredit Semester</p>
              </div>

              {/* Courses Card */}
              <div className="bg-white border border-lp-border rounded-[2.5rem] p-7 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300">
                <div className="absolute top-0 right-0 w-24 h-24 bg-lp-amber/5 blur-[35px] rounded-full pointer-events-none" />
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-mono font-bold tracking-[0.15em] uppercase text-lp-text3">Mata Kuliah</span>
                  <div className="w-10 h-10 rounded-xl bg-lp-amber/10 flex items-center justify-center border border-lp-amber/20">
                    <FiBookOpen className="text-lg text-lp-amber" />
                  </div>
                </div>
                <h3 className="text-4xl font-extrabold text-lp-text tracking-tight mb-1">{courses.length}</h3>
                <p className="text-xs text-lp-text3 font-light">Dengan submission nilai</p>
              </div>

              {/* Total Graded Card */}
              <div className="bg-white border border-lp-border rounded-[2.5rem] p-7 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300">
                <div className="absolute top-0 right-0 w-24 h-24 bg-lp-accentS blur-[35px] rounded-full pointer-events-none" />
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-mono font-bold tracking-[0.15em] uppercase text-lp-text3">Nilai Masuk</span>
                  <div className="w-10 h-10 rounded-xl bg-lp-accentS flex items-center justify-center border border-lp-accent/15">
                    <FiCheckCircle className="text-lg text-lp-atext" />
                  </div>
                </div>
                <h3 className="text-4xl font-extrabold text-lp-text tracking-tight mb-1">{totalGradedItems}</h3>
                <p className="text-xs text-lp-text3 font-light">Jumlah item tugas dinilai</p>
              </div>

            </div>

            {/* Controls / Filter Section */}
            <div className="bg-white border border-lp-border rounded-[2.5rem] p-6 mb-8 shadow-sm">
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-6">
                
                {/* Search Bar */}
                <div className="flex-1 relative">
                  <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-lp-text3 text-base" />
                  <input
                    type="text"
                    value={filterCourse}
                    onChange={e => setFilterCourse(e.target.value)}
                    placeholder="Cari mata kuliah berdasarkan nama atau kode..."
                    className="w-full pl-12 pr-5 py-3.5 bg-lp-surface/50 border border-lp-border rounded-2xl text-[14px] text-lp-text placeholder:text-lp-text3 focus:outline-none focus:ring-2 focus:ring-lp-accent/15 focus:border-lp-accent transition-all duration-300"
                  />
                </div>

                {/* Segmented Control for View Mode */}
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[11px] font-mono font-bold tracking-widest text-lp-text3 uppercase">Tampilan:</span>
                  <div className="bg-lp-surface p-1 rounded-full border border-lp-border flex items-center">
                    <button
                      onClick={() => setViewMode('matkul')}
                      className={`px-6 py-2.5 rounded-full font-bold text-xs transition-all duration-300 flex items-center gap-2 select-none cursor-pointer ${
                        viewMode === 'matkul'
                          ? 'bg-lp-text text-white shadow-sm'
                          : 'text-lp-text2 hover:text-lp-text'
                      }`}
                    >
                      <FiBookOpen className="text-sm shrink-0" />
                      <span>Mata Kuliah</span>
                    </button>
                    <button
                      onClick={() => setViewMode('pertemuan')}
                      className={`px-6 py-2.5 rounded-full font-bold text-xs transition-all duration-300 flex items-center gap-2 select-none cursor-pointer ${
                        viewMode === 'pertemuan'
                          ? 'bg-lp-text text-white shadow-sm'
                          : 'text-lp-text2 hover:text-lp-text'
                      }`}
                    >
                      <FiCalendar className="text-sm shrink-0" />
                      <span>Pertemuan</span>
                    </button>
                  </div>
                </div>

              </div>
            </div>

            {/* VIEW: Per Matkul */}
            {viewMode === 'matkul' && (
              <div className="space-y-4">
                {courses.length === 0 ? (
                  <div className="bg-white border border-lp-border rounded-[2.5rem] p-12 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-lp-surface flex items-center justify-center mx-auto mb-5">
                      <FiBookOpen className="text-xl text-lp-text3" />
                    </div>
                    <h4 className="font-bold text-lg text-lp-text2 mb-2">Belum Ada Nilai</h4>
                    <p className="text-sm text-lp-text3 font-light max-w-sm mx-auto">
                      Nilai akan muncul otomatis setelah dosen memberikan penilaian pada tugas Anda.
                    </p>
                  </div>
                ) : courses.map((course, idx) => {
                  const isExpanded = expandedCourse === course.course_id
                  const avgNum = parseFloat(course.average) || 0
                  return (
                    <div key={idx} className={`bg-white border ${isExpanded ? 'border-lp-text shadow-[0_12px_32px_rgba(0,0,0,0.04)]' : 'border-lp-border'} rounded-[2.5rem] overflow-hidden transition-all duration-500`}>
                      {/* Course Header */}
                      <button
                        onClick={() => setExpandedCourse(isExpanded ? null : course.course_id)}
                        className="w-full flex items-center justify-between p-6 text-left hover:bg-lp-surface/30 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-4 min-w-0 flex-1">
                          <div className="p-3 bg-lp-accentS border border-lp-accent/15 rounded-xl shrink-0">
                            <FiBook className="text-xl text-lp-atext" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <span className="px-2.5 py-0.5 bg-lp-surface rounded-lg text-xs font-mono font-semibold text-lp-text3 border border-lp-border">{course.course_id}</span>
                              <h3 className="font-bold text-lp-text truncate tracking-tight">{course.course_name}</h3>
                            </div>
                            <div className="flex items-center gap-4 mt-1.5 text-xs text-lp-text2 font-light">
                              <span className="flex items-center gap-1.5"><FiUser className="text-xs text-lp-text3" />{course.dosen_name}</span>
                              <span className="w-1.5 h-1.5 rounded-full bg-lp-border" />
                              <span>{course.sks} SKS</span>
                              <span className="w-1.5 h-1.5 rounded-full bg-lp-border" />
                              <span>{course.total_graded} nilai dinilai</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-6 shrink-0 ml-4">
                          <div className="text-right hidden sm:block">
                            <div className={`text-2xl font-extrabold ${getScoreColor(avgNum)}`}>{course.average}</div>
                            <span className="text-[10px] font-mono tracking-wider uppercase text-lp-text3">Rata-rata</span>
                          </div>
                          <span className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${getGradeBadgeClass(course.letter_grade)}`}>
                            {course.letter_grade}
                          </span>
                          <FiChevronDown className={`text-lp-text3 transition-transform duration-500 text-lg ${isExpanded ? 'rotate-180' : ''}`} />
                        </div>
                      </button>

                      {/* Expanded Detail */}
                      {isExpanded && (
                        <div className="border-t border-lp-border bg-lp-elevated/40 p-6">
                          {/* Progress bar */}
                          <div className="mb-6 bg-white border border-lp-border rounded-2xl p-4">
                            <div className="flex items-center justify-between text-xs font-semibold mb-2">
                              <span className="text-lp-text2">Grafik Rata-rata Nilai</span>
                              <span className={`font-mono font-bold ${getScoreColor(avgNum)}`}>{course.average}/100</span>
                            </div>
                            <div className="h-2.5 bg-lp-surface rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all duration-700 ${getProgressColor(avgNum)}`} style={{ width: `${avgNum}%` }} />
                            </div>
                          </div>

                          {/* Grades Table */}
                          <div className="bg-white border border-lp-border rounded-2xl overflow-hidden">
                            <div className="overflow-x-auto">
                              <table className="w-full min-w-[600px] border-collapse">
                                <thead>
                                  <tr className="bg-lp-surface border-b border-lp-border text-[10px] font-mono font-bold tracking-widest text-lp-text3 uppercase">
                                    <th className="text-left py-3.5 px-5">Pertemuan</th>
                                    <th className="text-left py-3.5 px-5">Tugas / Materi</th>
                                    <th className="text-left py-3.5 px-5">Tipe</th>
                                    <th className="text-center py-3.5 px-5">Nilai</th>
                                    <th className="text-left py-3.5 px-5">Tanggal Dinilai</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-lp-border/50">
                                  {(course.grades || []).map((g, gIdx) => (
                                    <tr key={gIdx} className="hover:bg-lp-surface/50 transition-colors">
                                      <td className="py-4 px-5">
                                        <span className="inline-flex items-center justify-center w-8 h-8 bg-lp-accentS rounded-lg text-xs font-bold text-lp-atext border border-lp-accent/15">
                                          P{g.pertemuan}
                                        </span>
                                      </td>
                                      <td className="py-4 px-5">
                                        <span className="text-xs text-lp-text font-bold">{g.task_title}</span>
                                      </td>
                                      <td className="py-4 px-5">
                                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                          g.task_type === 'tugas'
                                            ? 'bg-lp-accentS text-lp-atext border border-lp-accent/15'
                                            : 'bg-lp-green/10 text-lp-green border border-lp-green/15'
                                        }`}>
                                          {g.task_type === 'tugas' ? 'TUGAS' : 'MATERI'}
                                        </span>
                                      </td>
                                      <td className="py-4 px-5 text-center">
                                        {g.grade > 0 ? (
                                          <span className={`text-base font-extrabold ${getScoreColor(g.grade)}`}>{g.grade}</span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 text-lp-text3 text-xs font-light">
                                            <FiClock className="text-xs" /> Belum
                                          </span>
                                        )}
                                      </td>
                                      <td className="py-4 px-5 text-xs text-lp-text3">
                                        {new Date(g.submitted_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* VIEW: Per Pertemuan */}
            {viewMode === 'pertemuan' && (
              <div className="space-y-4">
                {getPertemuanView().length === 0 ? (
                  <div className="bg-white border border-lp-border rounded-[2.5rem] p-12 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-lp-surface flex items-center justify-center mx-auto mb-5">
                      <FiCalendar className="text-xl text-lp-text3" />
                    </div>
                    <h4 className="font-bold text-lg text-lp-text2 mb-2">Belum Ada Data</h4>
                    <p className="text-sm text-lp-text3 font-light max-w-sm mx-auto">
                      Nilai per pertemuan akan tampil setelah ada penugasan dari dosen.
                    </p>
                  </div>
                ) : getPertemuanView().map(([pertemuan, grades]) => (
                  <div key={pertemuan} className="bg-white border border-lp-border rounded-[2.5rem] overflow-hidden shadow-sm">
                    <div className="flex items-center gap-3.5 p-6 border-b border-lp-border bg-lp-elevated/30">
                      <div className="p-3 bg-lp-amber/10 border border-lp-amber/15 rounded-xl shrink-0">
                        <FiCalendar className="text-lg text-lp-amber" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lp-text text-base">Pertemuan {pertemuan}</h3>
                        <p className="text-xs text-lp-text3 mt-0.5 font-light">{grades.length} nilai diperoleh dari {new Set(grades.map(g => g.course_id)).size} mata kuliah</p>
                      </div>
                    </div>
                    <div className="divide-y divide-lp-border/50">
                      {grades.map((g, i) => (
                        <div key={i} className="flex items-center justify-between px-6 py-4 hover:bg-lp-surface/30 transition-colors">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-lp-text truncate">{g.task_title}</p>
                            <p className="text-[11px] text-lp-text3 mt-0.5 font-light">{g.course_name}</p>
                          </div>
                          <div className="flex items-center gap-4 ml-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              g.task_type === 'tugas' ? 'bg-lp-accentS text-lp-atext' : 'bg-lp-green/10 text-lp-green'
                            }`}>{g.task_type === 'tugas' ? 'Tugas' : 'Materi'}</span>
                            {g.grade > 0 ? (
                              <span className={`text-base font-extrabold min-w-[3rem] text-right ${getScoreColor(g.grade)}`}>{g.grade}</span>
                            ) : (
                              <span className="text-xs text-lp-text3 min-w-[3rem] text-right">—</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .space-y-4 > * { animation: fadeIn 0.4s ease-out backwards; }
        .space-y-4 > *:nth-child(1) { animation-delay: 0.05s; }
        .space-y-4 > *:nth-child(2) { animation-delay: 0.1s; }
        .space-y-4 > *:nth-child(3) { animation-delay: 0.15s; }
        .space-y-4 > *:nth-child(4) { animation-delay: 0.2s; }
        .space-y-4 > *:nth-child(5) { animation-delay: 0.25s; }
      `}</style>
    </div>
  )
}

export default TranskripNilai
