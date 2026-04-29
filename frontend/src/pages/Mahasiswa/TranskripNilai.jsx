import React, { useState, useEffect } from 'react'
import Navbar from '../../components/Navbar'
import Sidebar from '../../components/Sidebar'
import useAuth from '../../hooks/useAuth'
import api from '../../services/api'
import {
  FiBarChart2, FiBookOpen, FiChevronDown, FiChevronRight,
  FiAward, FiTrendingUp, FiBook, FiUser, FiCalendar,
  FiCheckCircle, FiClock, FiSearch, FiFilter
} from 'react-icons/fi'

const TranskripNilai = () => {
  const { user } = useAuth()
  const [transkripData, setTranskripData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [expandedCourse, setExpandedCourse] = useState(null)
  const [filterCourse, setFilterCourse] = useState('')
  const [viewMode, setViewMode] = useState('matkul') // 'matkul' | 'pertemuan'
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    fetchTranskrip()
  }, [])

  const fetchTranskrip = async () => {
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

  const getGradeBadgeClass = (letter) => {
    if (['A', 'A-'].includes(letter)) return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
    if (['B+', 'B'].includes(letter)) return 'bg-blue-500/15 text-blue-400 border-blue-500/30'
    if (['B-', 'C+'].includes(letter)) return 'bg-amber-500/15 text-amber-400 border-amber-500/30'
    return 'bg-red-500/15 text-red-400 border-red-500/30'
  }

  const getScoreColor = (grade) => {
    if (grade >= 85) return 'text-emerald-400'
    if (grade >= 70) return 'text-blue-400'
    if (grade >= 55) return 'text-amber-400'
    return 'text-red-400'
  }

  const getProgressColor = (grade) => {
    if (grade >= 85) return 'bg-emerald-500'
    if (grade >= 70) return 'bg-blue-500'
    if (grade >= 55) return 'bg-amber-500'
    return 'bg-red-500'
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
      <div className="flex min-h-screen bg-lp-bg">
        <Sidebar role="mahasiswa" isOpen={sidebarOpen} onClose={toggleSidebar} />
        <div className="flex-1 lg:ml-0 transition-all duration-300">
          <div className="p-6 lg:p-8">
            <div className="h-10 w-72 bg-lp-surface rounded-xl animate-pulse mb-6" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {[1,2,3].map(i => (
                <div key={i} className="bg-lp-surface/50 rounded-2xl p-6 border border-lp-border animate-pulse">
                  <div className="h-5 w-24 bg-gray-700 rounded mb-4" />
                  <div className="h-10 w-20 bg-gray-600 rounded" />
                </div>
              ))}
            </div>
            {[1,2,3].map(i => (
              <div key={i} className="bg-lp-surface/50 rounded-2xl p-6 border border-lp-border animate-pulse mb-4">
                <div className="h-6 w-64 bg-gray-700 rounded" />
              </div>
            ))}
          </div>
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
      <Sidebar role="mahasiswa" isOpen={sidebarOpen} onClose={toggleSidebar} />

      <div className="flex-1 lg:ml-0 transition-all duration-300 min-w-0">
        <div className="p-6 lg:p-8">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              <button onClick={toggleSidebar} className="lg:hidden p-3 rounded-xl bg-lp-surface/80 border border-lp-border">
                <FiChevronRight className="text-xl text-lp-text2" />
              </button>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <div className="p-3 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-xl border border-indigo-500/30">
                    <FiBarChart2 className="text-2xl text-indigo-400" />
                  </div>
                  <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-lp-text">Transkrip Nilai</h1>
                    <p className="text-lp-text3 text-sm">{studentName} • {studentNIM}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="relative overflow-hidden bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-2xl p-5 border border-indigo-500/20">
              <div className="absolute -top-4 -right-4 w-20 h-20 bg-indigo-500/10 rounded-full blur-xl" />
              <p className="text-lp-text3 text-sm mb-1">IPK</p>
              <h3 className="text-3xl font-bold text-indigo-400">{ipk}</h3>
              <div className="flex items-center gap-1 mt-2">
                <FiTrendingUp className="text-sm text-indigo-400" />
                <span className="text-xs text-lp-text3">Indeks Prestasi Kumulatif</span>
              </div>
            </div>
            <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-2xl p-5 border border-emerald-500/20">
              <div className="absolute -top-4 -right-4 w-20 h-20 bg-emerald-500/10 rounded-full blur-xl" />
              <p className="text-lp-text3 text-sm mb-1">Total SKS</p>
              <h3 className="text-3xl font-bold text-emerald-400">{totalSKS}</h3>
              <div className="flex items-center gap-1 mt-2">
                <FiBook className="text-sm text-emerald-400" />
                <span className="text-xs text-lp-text3">Satuan Kredit Semester</span>
              </div>
            </div>
            <div className="relative overflow-hidden bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-2xl p-5 border border-amber-500/20">
              <div className="absolute -top-4 -right-4 w-20 h-20 bg-amber-500/10 rounded-full blur-xl" />
              <p className="text-lp-text3 text-sm mb-1">Mata Kuliah</p>
              <h3 className="text-3xl font-bold text-amber-400">{courses.length}</h3>
              <div className="flex items-center gap-1 mt-2">
                <FiBookOpen className="text-sm text-amber-400" />
                <span className="text-xs text-lp-text3">Dengan submission</span>
              </div>
            </div>
            <div className="relative overflow-hidden bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-2xl p-5 border border-cyan-500/20">
              <div className="absolute -top-4 -right-4 w-20 h-20 bg-cyan-500/10 rounded-full blur-xl" />
              <p className="text-lp-text3 text-sm mb-1">Nilai Masuk</p>
              <h3 className="text-3xl font-bold text-cyan-400">{totalGradedItems}</h3>
              <div className="flex items-center gap-1 mt-2">
                <FiCheckCircle className="text-sm text-cyan-400" />
                <span className="text-xs text-lp-text3">Total dinilai</span>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="bg-lp-surface/60 backdrop-blur-sm rounded-2xl p-5 border border-lp-border mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-lp-text3" />
                <input
                  type="text"
                  value={filterCourse}
                  onChange={e => setFilterCourse(e.target.value)}
                  placeholder="Cari mata kuliah..."
                  className="w-full pl-11 pr-4 py-3 bg-lp-bg/50 border border-lp-border rounded-xl text-lp-text2 placeholder:text-lp-text3 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50 transition-all"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('matkul')}
                  className={`px-5 py-3 rounded-xl font-medium text-sm transition-all ${
                    viewMode === 'matkul'
                      ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40'
                      : 'bg-lp-bg/50 text-lp-text3 border border-lp-border hover:text-lp-text2'
                  }`}
                >
                  <FiBookOpen className="inline mr-2" />Per Matkul
                </button>
                <button
                  onClick={() => setViewMode('pertemuan')}
                  className={`px-5 py-3 rounded-xl font-medium text-sm transition-all ${
                    viewMode === 'pertemuan'
                      ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40'
                      : 'bg-lp-bg/50 text-lp-text3 border border-lp-border hover:text-lp-text2'
                  }`}
                >
                  <FiCalendar className="inline mr-2" />Per Pertemuan
                </button>
              </div>
            </div>
          </div>

          {/* VIEW: Per Matkul */}
          {viewMode === 'matkul' && (
            <div className="space-y-4">
              {courses.length === 0 ? (
                <div className="text-center py-16 bg-lp-surface/40 rounded-2xl border border-lp-border">
                  <FiBookOpen className="mx-auto text-5xl text-lp-text3 mb-4" />
                  <h3 className="text-xl font-semibold text-lp-text2 mb-2">Belum Ada Nilai</h3>
                  <p className="text-lp-text3">Nilai akan muncul setelah dosen memberikan penilaian pada tugas Anda.</p>
                </div>
              ) : courses.map((course, idx) => {
                const isExpanded = expandedCourse === course.course_id
                const avgNum = parseFloat(course.average) || 0
                return (
                  <div key={idx} className="bg-lp-surface/60 backdrop-blur-sm rounded-2xl border border-lp-border overflow-hidden transition-all duration-300 hover:border-lp-border/80">
                    {/* Course Header */}
                    <button
                      onClick={() => setExpandedCourse(isExpanded ? null : course.course_id)}
                      className="w-full flex items-center justify-between p-5 text-left hover:bg-lp-bg/30 transition-colors"
                    >
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        <div className="p-3 bg-gradient-to-br from-indigo-500/15 to-purple-500/15 rounded-xl border border-indigo-500/20 shrink-0">
                          <FiBook className="text-xl text-indigo-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2.5 py-0.5 bg-lp-bg/60 rounded-lg text-xs font-mono text-lp-text3 border border-lp-border">{course.course_id}</span>
                            <h3 className="font-semibold text-lp-text truncate">{course.course_name}</h3>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-sm text-lp-text3">
                            <span className="flex items-center gap-1"><FiUser className="text-xs" />{course.dosen_name}</span>
                            <span>{course.sks} SKS</span>
                            <span>{course.total_graded} nilai</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0 ml-4">
                        <div className="text-right hidden sm:block">
                          <div className={`text-xl font-bold ${getScoreColor(avgNum)}`}>{course.average}</div>
                          <span className="text-xs text-lp-text3">Rata-rata</span>
                        </div>
                        <span className={`px-3 py-1.5 rounded-lg text-sm font-bold border ${getGradeBadgeClass(course.letter_grade)}`}>
                          {course.letter_grade}
                        </span>
                        <FiChevronDown className={`text-lp-text3 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                      </div>
                    </button>

                    {/* Expanded Detail */}
                    {isExpanded && (
                      <div className="border-t border-lp-border">
                        {/* Progress bar */}
                        <div className="px-5 pt-4 pb-2">
                          <div className="flex items-center justify-between text-xs text-lp-text3 mb-2">
                            <span>Rata-rata Nilai</span>
                            <span className={`font-semibold ${getScoreColor(avgNum)}`}>{course.average}/100</span>
                          </div>
                          <div className="h-2.5 bg-lp-bg rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-700 ${getProgressColor(avgNum)}`} style={{ width: `${avgNum}%` }} />
                          </div>
                        </div>

                        {/* Grades Table */}
                        <div className="px-5 pb-5">
                          <div className="overflow-x-auto">
                            <table className="w-full min-w-[600px]">
                              <thead>
                                <tr className="text-xs text-lp-text3 uppercase tracking-wider">
                                  <th className="text-left py-3 px-3">Pertemuan</th>
                                  <th className="text-left py-3 px-3">Tugas / Materi</th>
                                  <th className="text-left py-3 px-3">Tipe</th>
                                  <th className="text-center py-3 px-3">Nilai</th>
                                  <th className="text-left py-3 px-3">Tanggal</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-lp-border/50">
                                {(course.grades || []).map((g, gIdx) => (
                                  <tr key={gIdx} className="hover:bg-lp-bg/20 transition-colors">
                                    <td className="py-3 px-3">
                                      <span className="inline-flex items-center justify-center w-8 h-8 bg-indigo-500/15 rounded-lg text-sm font-bold text-indigo-400 border border-indigo-500/20">
                                        {g.pertemuan}
                                      </span>
                                    </td>
                                    <td className="py-3 px-3">
                                      <span className="text-sm text-lp-text font-medium">{g.task_title}</span>
                                    </td>
                                    <td className="py-3 px-3">
                                      <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${
                                        g.task_type === 'tugas'
                                          ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
                                          : 'bg-purple-500/15 text-purple-400 border border-purple-500/20'
                                      }`}>
                                        {g.task_type === 'tugas' ? 'Tugas' : 'Materi'}
                                      </span>
                                    </td>
                                    <td className="py-3 px-3 text-center">
                                      {g.grade > 0 ? (
                                        <span className={`text-lg font-bold ${getScoreColor(g.grade)}`}>{g.grade}</span>
                                      ) : (
                                        <span className="flex items-center justify-center gap-1 text-lp-text3 text-sm">
                                          <FiClock className="text-xs" /> Belum
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-3 px-3 text-sm text-lp-text3">
                                      {new Date(g.submitted_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
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
                <div className="text-center py-16 bg-lp-surface/40 rounded-2xl border border-lp-border">
                  <FiCalendar className="mx-auto text-5xl text-lp-text3 mb-4" />
                  <h3 className="text-xl font-semibold text-lp-text2 mb-2">Belum Ada Data</h3>
                  <p className="text-lp-text3">Belum ada nilai per pertemuan.</p>
                </div>
              ) : getPertemuanView().map(([pertemuan, grades]) => (
                <div key={pertemuan} className="bg-lp-surface/60 backdrop-blur-sm rounded-2xl border border-lp-border overflow-hidden">
                  <div className="flex items-center gap-3 p-5 border-b border-lp-border/50">
                    <div className="p-2.5 bg-gradient-to-br from-amber-500/15 to-orange-500/15 rounded-xl border border-amber-500/20">
                      <FiCalendar className="text-lg text-amber-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lp-text">Pertemuan {pertemuan}</h3>
                      <p className="text-xs text-lp-text3">{grades.length} nilai dari {new Set(grades.map(g => g.course_id)).size} mata kuliah</p>
                    </div>
                  </div>
                  <div className="divide-y divide-lp-border/30">
                    {grades.map((g, i) => (
                      <div key={i} className="flex items-center justify-between px-5 py-3 hover:bg-lp-bg/20 transition-colors">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-lp-text truncate">{g.task_title}</p>
                          <p className="text-xs text-lp-text3">{g.course_name}</p>
                        </div>
                        <div className="flex items-center gap-3 ml-4">
                          <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${
                            g.task_type === 'tugas' ? 'bg-blue-500/15 text-blue-400' : 'bg-purple-500/15 text-purple-400'
                          }`}>{g.task_type === 'tugas' ? 'Tugas' : 'Materi'}</span>
                          {g.grade > 0 ? (
                            <span className={`text-lg font-bold min-w-[3rem] text-right ${getScoreColor(g.grade)}`}>{g.grade}</span>
                          ) : (
                            <span className="text-sm text-lp-text3 min-w-[3rem] text-right">—</span>
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