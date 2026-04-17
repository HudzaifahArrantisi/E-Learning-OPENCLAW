import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import api from '../../services/api'
import {
  FiBookOpen, FiUsers, FiCreditCard, FiCheckCircle,
  FiChevronRight, FiRefreshCw, FiSearch, FiGrid, FiList,
  FiBarChart2, FiEdit2, FiEye, FiFilter,
  FiTrendingUp, FiClock, FiBook, FiSettings
} from 'react-icons/fi'

const CourseDosen = () => {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [viewMode, setViewMode] = useState('grid')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('name') 

  useEffect(() => {
    fetchDosenCourses()
  }, [])

  const fetchDosenCourses = async () => {
    try {
      console.log(' Fetching dosen courses...')
      const response = await api.getDosenCourses()
      console.log('API Response:', response)
      
      if (response.data && response.data.data) {
        let coursesData = response.data.data
        
        // Sort courses
        if (sortBy === 'name') {
          coursesData.sort((a, b) => a.nama.localeCompare(b.nama))
        } else if (sortBy === 'code') {
          coursesData.sort((a, b) => a.kode.localeCompare(b.kode))
        } else if (sortBy === 'students') {
          coursesData.sort((a, b) => (b.student_count || 0) - (a.student_count || 0))
        }
        
        setCourses(coursesData)
      } else {
        setCourses([])
      }
    } catch (error) {
      console.error('❌ Error fetching courses:', error)
      setError('Gagal memuat data mata kuliah')
      setCourses([])
    } finally {
      setLoading(false)
    }
  }

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  const filteredCourses = courses.filter(course =>
    searchTerm === '' ||
    course.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.kode.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalStudents = courses.reduce((acc, course) => acc + (course.student_count || 0), 0)
  const totalSKS = courses.reduce((acc, course) => acc + (course.sks || 0), 0)
  const activeCourses = courses.filter(course => course.student_count > 0).length

  if (loading) {
    return (
      <div className="flex min-h-screen bg-lp-bg">
        <Sidebar role="dosen" isOpen={sidebarOpen} onClose={toggleSidebar} />
        <div className="flex-1 lg:ml-0 transition-all duration-300">
          <div className="p-6 lg:p-8">
            {/* Skeleton Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="lg:hidden p-3 rounded-xl bg-lp-surface/50 backdrop-blur-sm shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border animate-pulse">
                  <div className="w-6 h-6 bg-gray-200 rounded"></div>
                </div>
                <div>
                  <div className="h-8 w-64 bg-lp-bg rounded-lg animate-pulse mb-2"></div>
                  <div className="h-4 w-48 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
              <div className="h-12 w-32 bg-gray-200 rounded-xl animate-pulse"></div>
            </div>

            {/* Skeleton Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[1,2,3,4].map(item => (
                <div key={item} className="bg-lp-surface/50 backdrop-blur-sm rounded-2xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border animate-pulse">
                  <div className="h-6 w-24 bg-gray-200 rounded mb-4"></div>
                  <div className="h-10 w-16 bg-gray-300 rounded"></div>
                </div>
              ))}
            </div>

            {/* Skeleton Courses */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {[1,2,3,4,5,6].map(item => (
                <div key={item} className="bg-lp-surface/50 backdrop-blur-sm rounded-2xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border animate-pulse h-64">
                  <div className="h-6 w-32 bg-gray-200 rounded mb-4"></div>
                  <div className="h-4 w-full bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 w-3/4 bg-gray-200 rounded mb-6"></div>
                  <div className="h-10 w-full bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen bg-lp-bg">
        <Sidebar role="dosen" isOpen={sidebarOpen} onClose={toggleSidebar} />
        <div className="flex-1 lg:ml-0 transition-all duration-300">
          <div className="p-6 lg:p-8">
            <div className="flex items-center gap-4 mb-6">
              <button 
                onClick={toggleSidebar}
                className="lg:hidden p-3 rounded-xl bg-lp-surface/80 backdrop-blur-sm shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                <FiChevronRight className="text-xl text-lp-text2" />
              </button>
            </div>
            <div className="max-w-2xl mx-auto">
              <div className="bg-lp-bg rounded-2xl p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border border border-red-100">
                <div className="text-center">
                  <div className="p-4 bg-lp-bg rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                    <FiBookOpen className="text-3xl text-red-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-lp-text font-semibold tracking-tight mb-3">Gagal Memuat Data</h3>
                  <p className="text-lp-text2 font-light mb-6">
                    {error}. Silakan coba lagi atau periksa koneksi internet Anda.
                  </p>
                  <div className="flex flex-col sm:flex-row justify-center gap-3">
                    <button 
                      onClick={fetchDosenCourses} 
                      className="group relative overflow-hidden px-6 py-3 bg-lp-accent text-white rounded-xl font-medium shadow-[0_8px_30px_rgba(0,0,0,0.04)] border-none hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 flex items-center gap-2"
                    >
                      <div className="absolute inset-0 bg-lp-surface/10 translate-x-[-100%] group-hover:translate-x-full transition-transform duration-1000"></div>
                      <FiRefreshCw className="relative z-10" />
                      <span className="relative z-10">Coba Lagi</span>
                    </button>
                    <button 
                      onClick={() => window.location.reload()}
                      className="px-6 py-3 bg-lp-surface/80 backdrop-blur-sm border border-lp-border border text-lp-text2 rounded-xl font-medium shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border hover:shadow-xl transition-all duration-300 hover:bg-lp-surface flex items-center gap-2"
                    >
                      <FiRefreshCw />
                      Refresh Halaman
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-lp-bg">
      <Sidebar role="dosen" isOpen={sidebarOpen} onClose={toggleSidebar} />
      
      {/* Main Content */}
      <div className="flex-1 lg:ml-0 transition-all duration-300 min-w-0">
        <div className="p-6 lg:p-8">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
            <div className="flex items-center gap-4">
              <button 
                onClick={toggleSidebar}
                className="lg:hidden p-3 rounded-xl bg-lp-surface/80 backdrop-blur-sm shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                <FiChevronRight className="text-xl text-lp-text2" />
              </button>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-3 bg-lp-accent rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] border-none">
                    <FiBookOpen className="text-2xl text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl lg:text-4xl font-bold bg-lp-bg bg-clip-text text-transparent">
                      Mata Kuliah Yang Diampu
                    </h1>
                    <p className="text-lp-text2 font-light ml-16">Semester 3 • Total {courses.length} mata kuliah</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button 
                onClick={fetchDosenCourses}
                className="group relative overflow-hidden px-6 py-3 bg-lp-accent text-white rounded-xl font-medium shadow-[0_8px_30px_rgba(0,0,0,0.04)] border-none hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 flex items-center gap-2"
              >
                <div className="absolute inset-0 bg-lp-surface/10 translate-x-[-100%] group-hover:translate-x-full transition-transform duration-1000"></div>
                <FiRefreshCw className="relative z-10" />
                <span className="relative z-10">Refresh Data</span>
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-lp-surface/80 backdrop-blur-sm rounded-2xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border border border-lp-border border hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lp-text2 font-light text-sm mb-1">Total Mata Kuliah</p>
                  <h3 className="text-3xl font-bold text-lp-text font-semibold tracking-tight">{courses.length}</h3>
                </div>
                <div className="p-3 bg-lp-bg rounded-xl">
                  <FiBook className="text-2xl text-lp-atext" />
                </div>
              </div>
            </div>
            <div className="bg-lp-surface/80 backdrop-blur-sm rounded-2xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border border border-lp-border border hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lp-text2 font-light text-sm mb-1">Total Mahasiswa</p>
                  <h3 className="text-3xl font-bold text-lp-text font-semibold tracking-tight">{totalStudents}</h3>
                </div>
                <div className="p-3 bg-lp-bg rounded-xl">
                  <FiUsers className="text-2xl text-emerald-600" />
                </div>
              </div>
            </div>
            <div className="bg-lp-surface/80 backdrop-blur-sm rounded-2xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border border border-lp-border border hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lp-text2 font-light text-sm mb-1">Total SKS</p>
                  <h3 className="text-3xl font-bold text-lp-text font-semibold tracking-tight">{totalSKS}</h3>
                </div>
                <div className="p-3 bg-lp-bg rounded-xl">
                  <FiCreditCard className="text-2xl text-purple-600" />
                </div>
              </div>
            </div>
            <div className="bg-lp-surface/80 backdrop-blur-sm rounded-2xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border border border-lp-border border hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lp-text2 font-light text-sm mb-1">Matkul Aktif</p>
                  <h3 className="text-3xl font-bold text-lp-text font-semibold tracking-tight">{activeCourses}</h3>
                </div>
                <div className="p-3 bg-lp-bg rounded-xl">
                  <FiCheckCircle className="text-2xl text-amber-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Control Panel */}
          <div className="bg-lp-surface/80 backdrop-blur-sm rounded-2xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border border border-lp-border border mb-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-semibold text-lp-text2 mb-2">Cari Mata Kuliah</label>
                <div className="relative">
                  <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border border-lp-border border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-lp-surface/50 backdrop-blur-sm"
                    placeholder="Nama atau kode matkul..."
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-lp-text2 mb-2">Urutkan Berdasarkan</label>
                <div className="relative">
                  <FiTrendingUp className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <select
                    value={sortBy}
                    onChange={(e) => {
                      setSortBy(e.target.value)
                      fetchDosenCourses()
                    }}
                    className="w-full pl-12 pr-4 py-3 border border-lp-border border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-lp-surface/50 backdrop-blur-sm"
                  >
                    <option value="name">Nama Mata Kuliah</option>
                    <option value="code">Kode Mata Kuliah</option>
                    <option value="students">Jumlah Mahasiswa</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-lp-text2 mb-2">Tampilan</label>
                <div className="flex items-center gap-2">
                  <div className="bg-gray-100 rounded-xl p-1 flex items-center">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-lp-surface text-lp-atext shadow-sm' : 'text-lp-text3 font-light hover:text-lp-text2'}`}
                    >
                      <FiGrid className="text-lg" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-lp-surface text-lp-atext shadow-sm' : 'text-lp-text3 font-light hover:text-lp-text2'}`}
                    >
                      <FiList className="text-lg" />
                    </button>
                  </div>
                  <div className="flex-1 text-right text-sm text-lp-text3 font-light">
                    {filteredCourses.length} dari {courses.length} matkul
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Courses Grid/List */}
          {filteredCourses.length > 0 ? (
            viewMode === 'grid' ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredCourses.map((course, index) => (
                  <div key={index} className="group bg-lp-surface/80 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border border border-lp-border border hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <span className="inline-block px-3 py-1 bg-lp-bg text-blue-700 text-xs font-semibold rounded-full mb-2">
                            {course.kode}
                          </span>
                          <h3 className="text-xl font-bold text-lp-text font-semibold tracking-tight mb-2 line-clamp-2">
                            {course.nama}
                          </h3>
                          <p className="text-lp-text2 font-light text-sm">Semester 3</p>
                        </div>
                        <div className={`p-2 rounded-lg ${course.student_count > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-lp-text2 font-light'}`}>
                          <FiUsers />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-lp-bg p-3 rounded-xl border border-lp-border border">
                          <div className="text-sm text-lp-text2 font-light mb-1">SKS</div>
                          <div className="text-lg font-bold text-lp-text font-semibold tracking-tight">{course.sks} SKS</div>
                        </div>
                        <div className="bg-lp-bg p-3 rounded-xl border border-lp-border border">
                          <div className="text-sm text-lp-text2 font-light mb-1">Mahasiswa</div>
                          <div className={`text-lg font-bold ${course.student_count > 0 ? 'text-emerald-600' : 'text-lp-text2 font-light'}`}>
                            {course.student_count}
                          </div>
                        </div>
                      </div>
                      
                      <div className="pt-4 border-t border-lp-border border">
                        <div className="grid grid-cols-2 gap-3">
                          <Link 
                            to={`/dosen/matkul/${course.kode}`}
                            className="group/btn relative overflow-hidden px-4 py-3 bg-lp-accent text-white rounded-xl font-medium hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] border-none transition-all duration-300 hover:-translate-y-0.5 flex items-center justify-center gap-2"
                          >
                            <div className="absolute inset-0 bg-lp-surface/10 translate-x-[-100%] group-hover/btn:translate-x-full transition-transform duration-1000"></div>
                            <FiEdit2 className="relative z-10" />
                            <span className="relative z-10 text-sm">Kelola</span>
                          </Link>
                          <Link 
                            to={`/dosen/penilaian/${course.kode}`}
                            className="px-4 py-3 bg-lp-accent text-white rounded-xl font-medium hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] border-none transition-all duration-300 hover:-translate-y-0.5 flex items-center justify-center gap-2"
                          >
                            <FiBarChart2 />
                            <span className="text-sm">Nilai</span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-lp-surface/80 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border border border-lp-border border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[800px]">
                    <thead className="bg-lp-bg">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-lp-text2">Kode</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-lp-text2">Mata Kuliah</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-lp-text2">SKS</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-lp-text2">Mahasiswa</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-lp-text2">Status</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-lp-text2">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredCourses.map((course, index) => (
                        <tr key={index} className="hover:bg-lp-bg/50 transition-colors group">
                          <td className="px-6 py-4">
                            <span className="font-mono font-semibold text-lp-text font-bold tracking-tight">{course.kode}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="max-w-xs">
                              <div className="font-bold text-lp-text font-bold tracking-tight mb-1">{course.nama}</div>
                              <div className="text-sm text-lp-text3 font-light">Semester 3</div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-lp-bg text-blue-800 border border-blue-200">
                              {course.sks} SKS
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border ${
                              course.student_count > 0 
                                ? 'bg-lp-bg text-emerald-800 border-emerald-200' 
                                : 'bg-lp-bg text-lp-text font-semibold tracking-tight border-lp-border border'
                            }`}>
                              <FiUsers className="text-sm" />
                              {course.student_count} mahasiswa
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${course.student_count > 0 ? 'bg-emerald-500' : 'bg-gray-400'}`}></div>
                              <span className="text-sm text-lp-text2 font-light">
                                {course.student_count > 0 ? 'Aktif' : 'Non-Aktif'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Link 
                                to={`/dosen/matkul/${course.kode}`}
                                className="group/btn relative overflow-hidden px-4 py-2 bg-lp-accent text-white rounded-lg font-medium hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] border-none transition-all duration-300 hover:-translate-y-0.5 flex items-center gap-2"
                              >
                                <div className="absolute inset-0 bg-lp-surface/10 translate-x-[-100%] group-hover/btn:translate-x-full transition-transform duration-1000"></div>
                                <FiEdit2 className="relative z-10 text-sm" />
                                <span className="relative z-10 text-sm">Kelola</span>
                              </Link>
                              <Link 
                                to={`/dosen/penilaian/${course.kode}`}
                                className="px-4 py-2 bg-lp-accent text-white rounded-lg font-medium hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] border-none transition-all duration-300 hover:-translate-y-0.5 flex items-center gap-2"
                              >
                                <FiBarChart2 className="text-sm" />
                                <span className="text-sm">Nilai</span>
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          ) : (
            <div className="text-center py-16">
              <div className="p-4 bg-lp-bg rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                <FiBookOpen className="text-4xl text-gray-400" />
              </div>
              <h3 className="text-2xl font-bold text-lp-text2 mb-3">
                {searchTerm ? 'Mata Kuliah Tidak Ditemukan' : 'Belum ada mata kuliah'}
              </h3>
              <p className="text-lp-text3 font-light mb-8 max-w-md mx-auto">
                {searchTerm 
                  ? `Tidak ada mata kuliah yang cocok dengan pencarian "${searchTerm}"`
                  : 'Anda belum mengampu mata kuliah untuk semester ini.'
                }
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-3">
                <button 
                  onClick={fetchDosenCourses}
                  className="px-6 py-3 bg-lp-accent text-white rounded-xl font-medium shadow-[0_8px_30px_rgba(0,0,0,0.04)] border-none hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 flex items-center gap-2"
                >
                  <FiRefreshCw />
                  Muat Ulang
                </button>
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="px-6 py-3 bg-lp-surface/80 backdrop-blur-sm border border-lp-border border text-lp-text2 rounded-xl font-medium hover:shadow-xl transition-all duration-300 hover:bg-lp-surface flex items-center gap-2"
                  >
                    <FiFilter />
                    Reset Pencarian
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Quick Stats */}
          {filteredCourses.length > 0 && (
            <div className="mt-8 p-6 bg-lp-bg rounded-2xl border border-blue-100">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-semibold text-lp-text font-semibold tracking-tight mb-2">Statistik Singkat</h4>
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-lp-text2 font-light">
                      <span className="font-medium text-lp-text font-semibold tracking-tight">{filteredCourses.length}</span> mata kuliah
                    </div>
                    <div className="text-sm text-lp-text2 font-light">
                      <span className="font-medium text-lp-text font-semibold tracking-tight">{totalStudents}</span> total mahasiswa
                    </div>
                    <div className="text-sm text-lp-text2 font-light">
                      <span className="font-medium text-lp-text font-semibold tracking-tight">{activeCourses}</span> matkul aktif
                    </div>
                  </div>
                </div>
                <div className="text-sm text-lp-text3 font-light">
                  Terakhir diperbarui: {new Date().toLocaleTimeString('id-ID')}
                </div>
              </div>
            </div>
          )}

          {/* Custom CSS */}
          <style jsx>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes slideUp {
              from { 
                opacity: 0;
                transform: translateY(20px);
              }
              to { 
                opacity: 1;
                transform: translateY(0);
              }
            }
            .animate-fadeIn {
              animation: fadeIn 0.3s ease-out;
            }
            .animate-slideUp {
              animation: slideUp 0.4s ease-out;
            }
            .line-clamp-2 {
              display: -webkit-box;
              -webkit-line-clamp: 2;
              -webkit-box-orient: vertical;
              overflow: hidden;
            }
          `}</style>
        </div>
      </div>
    </div>
  )
}

export default CourseDosen