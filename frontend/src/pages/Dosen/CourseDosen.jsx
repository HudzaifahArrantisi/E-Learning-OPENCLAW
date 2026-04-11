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
      <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Sidebar role="dosen" isOpen={sidebarOpen} onClose={toggleSidebar} />
        <div className="flex-1 lg:ml-0 transition-all duration-300">
          <div className="p-6 lg:p-8">
            {/* Skeleton Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="lg:hidden p-3 rounded-xl bg-white/50 backdrop-blur-sm shadow-lg animate-pulse">
                  <div className="w-6 h-6 bg-gray-200 rounded"></div>
                </div>
                <div>
                  <div className="h-8 w-64 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg animate-pulse mb-2"></div>
                  <div className="h-4 w-48 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
              <div className="h-12 w-32 bg-gray-200 rounded-xl animate-pulse"></div>
            </div>

            {/* Skeleton Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[1,2,3,4].map(item => (
                <div key={item} className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 shadow-lg animate-pulse">
                  <div className="h-6 w-24 bg-gray-200 rounded mb-4"></div>
                  <div className="h-10 w-16 bg-gray-300 rounded"></div>
                </div>
              ))}
            </div>

            {/* Skeleton Courses */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {[1,2,3,4,5,6].map(item => (
                <div key={item} className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 shadow-lg animate-pulse h-64">
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
      <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Sidebar role="dosen" isOpen={sidebarOpen} onClose={toggleSidebar} />
        <div className="flex-1 lg:ml-0 transition-all duration-300">
          <div className="p-6 lg:p-8">
            <div className="flex items-center gap-4 mb-6">
              <button 
                onClick={toggleSidebar}
                className="lg:hidden p-3 rounded-xl bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                <FiChevronRight className="text-xl text-gray-700" />
              </button>
            </div>
            <div className="max-w-2xl mx-auto">
              <div className="bg-gradient-to-r from-white to-gray-50 rounded-2xl p-8 shadow-lg border border-red-100">
                <div className="text-center">
                  <div className="p-4 bg-gradient-to-r from-red-100 to-red-50 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                    <FiBookOpen className="text-3xl text-red-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-3">Gagal Memuat Data</h3>
                  <p className="text-gray-600 mb-6">
                    {error}. Silakan coba lagi atau periksa koneksi internet Anda.
                  </p>
                  <div className="flex flex-col sm:flex-row justify-center gap-3">
                    <button 
                      onClick={fetchDosenCourses} 
                      className="group relative overflow-hidden px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 flex items-center gap-2"
                    >
                      <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-full transition-transform duration-1000"></div>
                      <FiRefreshCw className="relative z-10" />
                      <span className="relative z-10">Coba Lagi</span>
                    </button>
                    <button 
                      onClick={() => window.location.reload()}
                      className="px-6 py-3 bg-white/80 backdrop-blur-sm border border-gray-200 text-gray-700 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-300 hover:bg-white flex items-center gap-2"
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
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Sidebar role="dosen" isOpen={sidebarOpen} onClose={toggleSidebar} />
      
      {/* Main Content */}
      <div className="flex-1 lg:ml-0 transition-all duration-300 min-w-0">
        <div className="p-6 lg:p-8">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
            <div className="flex items-center gap-4">
              <button 
                onClick={toggleSidebar}
                className="lg:hidden p-3 rounded-xl bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                <FiChevronRight className="text-xl text-gray-700" />
              </button>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-lg">
                    <FiBookOpen className="text-2xl text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                      Mata Kuliah Yang Diampu
                    </h1>
                    <p className="text-gray-600 ml-16">Semester 3 • Total {courses.length} mata kuliah</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button 
                onClick={fetchDosenCourses}
                className="group relative overflow-hidden px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 flex items-center gap-2"
              >
                <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-full transition-transform duration-1000"></div>
                <FiRefreshCw className="relative z-10" />
                <span className="relative z-10">Refresh Data</span>
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">Total Mata Kuliah</p>
                  <h3 className="text-3xl font-bold text-gray-800">{courses.length}</h3>
                </div>
                <div className="p-3 bg-gradient-to-r from-blue-100 to-blue-50 rounded-xl">
                  <FiBook className="text-2xl text-blue-600" />
                </div>
              </div>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">Total Mahasiswa</p>
                  <h3 className="text-3xl font-bold text-gray-800">{totalStudents}</h3>
                </div>
                <div className="p-3 bg-gradient-to-r from-emerald-100 to-emerald-50 rounded-xl">
                  <FiUsers className="text-2xl text-emerald-600" />
                </div>
              </div>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">Total SKS</p>
                  <h3 className="text-3xl font-bold text-gray-800">{totalSKS}</h3>
                </div>
                <div className="p-3 bg-gradient-to-r from-purple-100 to-purple-50 rounded-xl">
                  <FiCreditCard className="text-2xl text-purple-600" />
                </div>
              </div>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">Matkul Aktif</p>
                  <h3 className="text-3xl font-bold text-gray-800">{activeCourses}</h3>
                </div>
                <div className="p-3 bg-gradient-to-r from-amber-100 to-amber-50 rounded-xl">
                  <FiCheckCircle className="text-2xl text-amber-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Control Panel */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100 mb-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Cari Mata Kuliah</label>
                <div className="relative">
                  <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 backdrop-blur-sm"
                    placeholder="Nama atau kode matkul..."
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Urutkan Berdasarkan</label>
                <div className="relative">
                  <FiTrendingUp className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <select
                    value={sortBy}
                    onChange={(e) => {
                      setSortBy(e.target.value)
                      fetchDosenCourses()
                    }}
                    className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 backdrop-blur-sm"
                  >
                    <option value="name">Nama Mata Kuliah</option>
                    <option value="code">Kode Mata Kuliah</option>
                    <option value="students">Jumlah Mahasiswa</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Tampilan</label>
                <div className="flex items-center gap-2">
                  <div className="bg-gray-100 rounded-xl p-1 flex items-center">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      <FiGrid className="text-lg" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      <FiList className="text-lg" />
                    </button>
                  </div>
                  <div className="flex-1 text-right text-sm text-gray-500">
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
                  <div key={index} className="group bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <span className="inline-block px-3 py-1 bg-gradient-to-r from-blue-100 to-blue-50 text-blue-700 text-xs font-semibold rounded-full mb-2">
                            {course.kode}
                          </span>
                          <h3 className="text-xl font-bold text-gray-800 mb-2 line-clamp-2">
                            {course.nama}
                          </h3>
                          <p className="text-gray-600 text-sm">Semester 3</p>
                        </div>
                        <div className={`p-2 rounded-lg ${course.student_count > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-600'}`}>
                          <FiUsers />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-gradient-to-r from-gray-50 to-white p-3 rounded-xl border border-gray-200">
                          <div className="text-sm text-gray-600 mb-1">SKS</div>
                          <div className="text-lg font-bold text-gray-800">{course.sks} SKS</div>
                        </div>
                        <div className="bg-gradient-to-r from-gray-50 to-white p-3 rounded-xl border border-gray-200">
                          <div className="text-sm text-gray-600 mb-1">Mahasiswa</div>
                          <div className={`text-lg font-bold ${course.student_count > 0 ? 'text-emerald-600' : 'text-gray-600'}`}>
                            {course.student_count}
                          </div>
                        </div>
                      </div>
                      
                      <div className="pt-4 border-t border-gray-100">
                        <div className="grid grid-cols-2 gap-3">
                          <Link 
                            to={`/dosen/matkul/${course.kode}`}
                            className="group/btn relative overflow-hidden px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 flex items-center justify-center gap-2"
                          >
                            <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover/btn:translate-x-full transition-transform duration-1000"></div>
                            <FiEdit2 className="relative z-10" />
                            <span className="relative z-10 text-sm">Kelola</span>
                          </Link>
                          <Link 
                            to={`/dosen/penilaian/${course.kode}`}
                            className="px-4 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 flex items-center justify-center gap-2"
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
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[800px]">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Kode</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Mata Kuliah</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">SKS</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Mahasiswa</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredCourses.map((course, index) => (
                        <tr key={index} className="hover:bg-gray-50/50 transition-colors group">
                          <td className="px-6 py-4">
                            <span className="font-mono font-semibold text-gray-900">{course.kode}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="max-w-xs">
                              <div className="font-bold text-gray-900 mb-1">{course.nama}</div>
                              <div className="text-sm text-gray-500">Semester 3</div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-gradient-to-r from-blue-100 to-blue-50 text-blue-800 border border-blue-200">
                              {course.sks} SKS
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border ${
                              course.student_count > 0 
                                ? 'bg-gradient-to-r from-emerald-100 to-emerald-50 text-emerald-800 border-emerald-200' 
                                : 'bg-gradient-to-r from-gray-100 to-gray-50 text-gray-800 border-gray-200'
                            }`}>
                              <FiUsers className="text-sm" />
                              {course.student_count} mahasiswa
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${course.student_count > 0 ? 'bg-emerald-500' : 'bg-gray-400'}`}></div>
                              <span className="text-sm text-gray-600">
                                {course.student_count > 0 ? 'Aktif' : 'Non-Aktif'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Link 
                                to={`/dosen/matkul/${course.kode}`}
                                className="group/btn relative overflow-hidden px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-medium hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 flex items-center gap-2"
                              >
                                <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover/btn:translate-x-full transition-transform duration-1000"></div>
                                <FiEdit2 className="relative z-10 text-sm" />
                                <span className="relative z-10 text-sm">Kelola</span>
                              </Link>
                              <Link 
                                to={`/dosen/penilaian/${course.kode}`}
                                className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg font-medium hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 flex items-center gap-2"
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
              <div className="p-4 bg-gradient-to-r from-gray-100 to-gray-50 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                <FiBookOpen className="text-4xl text-gray-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-700 mb-3">
                {searchTerm ? 'Mata Kuliah Tidak Ditemukan' : 'Belum ada mata kuliah'}
              </h3>
              <p className="text-gray-500 mb-8 max-w-md mx-auto">
                {searchTerm 
                  ? `Tidak ada mata kuliah yang cocok dengan pencarian "${searchTerm}"`
                  : 'Anda belum mengampu mata kuliah untuk semester ini.'
                }
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-3">
                <button 
                  onClick={fetchDosenCourses}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 flex items-center gap-2"
                >
                  <FiRefreshCw />
                  Muat Ulang
                </button>
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="px-6 py-3 bg-white/80 backdrop-blur-sm border border-gray-200 text-gray-700 rounded-xl font-medium hover:shadow-xl transition-all duration-300 hover:bg-white flex items-center gap-2"
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
            <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-white rounded-2xl border border-blue-100">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-2">Statistik Singkat</h4>
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-gray-600">
                      <span className="font-medium text-gray-800">{filteredCourses.length}</span> mata kuliah
                    </div>
                    <div className="text-sm text-gray-600">
                      <span className="font-medium text-gray-800">{totalStudents}</span> total mahasiswa
                    </div>
                    <div className="text-sm text-gray-600">
                      <span className="font-medium text-gray-800">{activeCourses}</span> matkul aktif
                    </div>
                  </div>
                </div>
                <div className="text-sm text-gray-500">
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