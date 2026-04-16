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

  useEffect(() => {
    fetchTasks()
  }, [])

  const fetchTasks = async () => {
    try {
      const res = await api.getMahasiswaTugasList()
      if (res.data.success) {
        setTasks(res.data.data.tasks || [])
      }
    } catch (error) {
      console.error('Error fetching tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  const tugasList = tasks.filter((task) => (task.type || '').toLowerCase() === 'tugas')

  // Format date nicely
  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
    return new Date(dateStr).toLocaleDateString('id-ID', options)
  }

  return (
    <div className="flex bg-lp-bg min-h-screen">
      <Sidebar role="mahasiswa" />
      <div className="main-content w-full">
        <Navbar user={user} />
        <div className="p-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-lp-text font-semibold tracking-tight">Daftar Tugas</h1>
              <p className="text-lp-text2 font-light">Daftar semua tugas dari mata kuliah Anda.</p>
            </div>

            <Link
              to="/mahasiswa/materi"
              className="px-4 py-2 rounded-lg font-medium border bg-lp-surface text-lp-text2 font-light hover:bg-lp-bg transition"
            >
              Lihat Materi
            </Link>
          </div>

          <div className="bg-lp-surface rounded-xl shadow-sm border border-lp-border border overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <i className="fas fa-spinner fa-spin text-3xl text-lp-atext mb-2"></i>
                <p className="text-lp-text3 font-light">Memuat data...</p>
              </div>
            ) : tugasList.length === 0 ? (
              <div className="p-10 text-center">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-folder-open text-2xl text-lp-atext"></i>
                </div>
                <h3 className="text-lg font-bold text-lp-text font-semibold tracking-tight mb-1">Tidak ada data</h3>
                <p className="text-lp-text3 font-light">Belum ada tugas untuk Anda.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-lp-bg border-b border-lp-border border">
                      <th className="p-4 font-semibold text-lp-text2 font-light">Judul</th>
                      <th className="p-4 font-semibold text-lp-text2 font-light">Mata Kuliah / Pertemuan</th>
                      <th className="p-4 font-semibold text-lp-text2 font-light">Tenggat Waktu</th>
                      <th className="p-4 font-semibold text-lp-text2 font-light">Status</th>
                      <th className="p-4 font-semibold text-lp-text2 font-light text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {tugasList.map((task) => (
                      <tr key={task.id} className="hover:bg-lp-bg transition-colors">
                        <td className="p-4">
                          <p className="font-semibold text-lp-text font-semibold tracking-tight">{task.title}</p>
                          <p className="text-sm text-lp-text3 font-light truncate max-w-xs" title={task.description}>
                            {task.description || '-'}
                          </p>
                        </td>
                        <td className="p-4">
                          <p className="font-medium text-lp-text2">{task.course_name}</p>
                          <p className="text-sm text-lp-text3 font-light">Pertemuan {task.pertemuan}</p>
                        </td>
                        <td className="p-4">
                          <div>
                            <p className={`font-medium ${task.is_overdue ? 'text-red-600' : 'text-lp-text2'}`}>
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
                        </td>
                        <td className="p-4">
                          {task.has_submission ? (
                            <div className="flex items-center text-lp-green font-medium">
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
                            to={`/mahasiswa/matkul/${task.course_id}/pertemuan/${task.pertemuan || 1}/tugas?taskId=${task.id}`}
                            className="inline-block px-4 py-2 bg-blue-50 text-lp-atext hover:bg-blue-100 rounded-lg font-medium transition"
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
