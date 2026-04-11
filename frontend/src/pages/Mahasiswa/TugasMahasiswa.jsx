import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import Sidebar from '../../components/Sidebar'
import api from '../../services/api'
import useAuth from '../../hooks/useAuth'

const TugasMahasiswa = () => {
  const { user } = useAuth()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, tugas, materi

  useEffect(() => {
    fetchTasks()
  }, [])

  const fetchTasks = async () => {
    try {
      const res = await api.getMahasiswaTugasList()
      if (res.data.success) {
        setTasks(res.data.data.tasks)
      }
    } catch (error) {
      console.error('Error fetching tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredTasks = tasks.filter(t => {
    if (filter === 'all') return true
    return t.type === filter
  })

  // Format date nicely
  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
    return new Date(dateStr).toLocaleDateString('id-ID', options)
  }

  return (
    <div className="flex bg-gray-50 min-h-screen">
      <Sidebar role="mahasiswa" />
      <div className="main-content w-full">
        <Navbar user={user} />
        <div className="p-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Tugas & Materi</h1>
              <p className="text-gray-600">Daftar semua tugas dan materi dari mata kuliah Anda.</p>
            </div>
            
            <div className="flex space-x-2">
              <button 
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg font-medium transition ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'}`}
              >
                Semua
              </button>
              <button 
                onClick={() => setFilter('tugas')}
                className={`px-4 py-2 rounded-lg font-medium transition ${filter === 'tugas' ? 'bg-blue-600 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'}`}
              >
                Tugas
              </button>
              <button 
                onClick={() => setFilter('materi')}
                className={`px-4 py-2 rounded-lg font-medium transition ${filter === 'materi' ? 'bg-blue-600 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'}`}
              >
                Materi
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <i className="fas fa-spinner fa-spin text-3xl text-blue-500 mb-2"></i>
                <p className="text-gray-500">Memuat data...</p>
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="p-10 text-center">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-folder-open text-2xl text-blue-500"></i>
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-1">Tidak ada data</h3>
                <p className="text-gray-500">Belum ada tugas atau materi untuk Anda.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="p-4 font-semibold text-gray-600">Judul</th>
                      <th className="p-4 font-semibold text-gray-600">Mata Kuliah / Pertemuan</th>
                      <th className="p-4 font-semibold text-gray-600">Tipe</th>
                      <th className="p-4 font-semibold text-gray-600">Tenggat Waktu</th>
                      <th className="p-4 font-semibold text-gray-600">Status</th>
                      <th className="p-4 font-semibold text-gray-600 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredTasks.map((task) => (
                      <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4">
                          <p className="font-semibold text-gray-800">{task.title}</p>
                          <p className="text-sm text-gray-500 truncate max-w-xs" title={task.description}>
                            {task.description || '-'}
                          </p>
                        </td>
                        <td className="p-4">
                          <p className="font-medium text-gray-700">{task.course_name}</p>
                          <p className="text-sm text-gray-500">Pertemuan {task.pertemuan}</p>
                        </td>
                        <td className="p-4">
                          {task.type === 'tugas' ? (
                            <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-semibold uppercase tracking-wider">
                              <i className="fas fa-clipboard-list mr-1"></i> Tugas
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-cyan-100 text-cyan-700 rounded-lg text-xs font-semibold uppercase tracking-wider">
                              <i className="fas fa-book-open mr-1"></i> Materi
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          {task.type === 'tugas' ? (
                            <div>
                              <p className={`font-medium ${task.is_overdue ? 'text-red-600' : 'text-gray-700'}`}>
                                {formatDate(task.due_date)}
                              </p>
                              <p className={`text-xs mt-1 ${task.is_overdue ? 'text-red-500 font-semibold' : 'text-orange-500'}`}>
                                {task.is_overdue 
                                  ? 'Terlambat' 
                                  : task.days_remaining > 0 
                                    ? `${task.days_remaining} hari lagi` 
                                    : 'Hari ini'}
                              </p>
                            </div>
                          ) : (
                            <span className="text-gray-400 italic">Tidak ada</span>
                          )}
                        </td>
                        <td className="p-4">
                          {task.type === 'materi' ? (
                            <span className="text-gray-500 text-sm">Tersedia</span>
                          ) : task.has_submission ? (
                            <div className="flex items-center text-green-600 font-medium">
                              <i className="fas fa-check-circle mr-2"></i> Dikumpulkan
                            </div>
                          ) : (
                            <div className="flex items-center text-red-500 font-medium whitespace-nowrap">
                              <i className="fas fa-exclamation-circle mr-2"></i> Belum Dikerjakan
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <Link
                            to={`/mahasiswa/matkul/${task.course_id}/pertemuan/${task.pertemuan}`}
                            className="inline-block px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg font-medium transition"
                          >
                            Detail
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default TugasMahasiswa
