import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import Sidebar from '../../components/Sidebar'
import api from '../../services/api'
import useAuth from '../../hooks/useAuth'

const MateriMahasiswa = () => {
  const { user } = useAuth()
  const [materials, setMaterials] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMaterials()
  }, [])

  const fetchMaterials = async () => {
    try {
      const res = await api.getMahasiswaTugasList()
      if (res.data.success) {
        const materiList = (res.data.data.tasks || []).filter(
          (item) => (item.type || '').toLowerCase() === 'materi'
        )
        setMaterials(materiList)
      }
    } catch (error) {
      console.error('Error fetching materials:', error)
    } finally {
      setLoading(false)
    }
  }

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
              <h1 className="text-2xl font-bold text-gray-800">Daftar Materi</h1>
              <p className="text-gray-600">Daftar semua materi pembelajaran dari mata kuliah Anda.</p>
            </div>

            <Link
              to="/mahasiswa/tugas"
              className="px-4 py-2 rounded-lg font-medium border bg-white text-gray-600 hover:bg-gray-50 transition"
            >
              Lihat Tugas
            </Link>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <i className="fas fa-spinner fa-spin text-3xl text-blue-500 mb-2"></i>
                <p className="text-gray-500">Memuat data...</p>
              </div>
            ) : materials.length === 0 ? (
              <div className="p-10 text-center">
                <div className="w-16 h-16 bg-cyan-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-book-open text-2xl text-cyan-500"></i>
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-1">Tidak ada materi</h3>
                <p className="text-gray-500">Belum ada materi yang tersedia untuk Anda.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="p-4 font-semibold text-gray-600">Judul</th>
                      <th className="p-4 font-semibold text-gray-600">Mata Kuliah / Pertemuan</th>
                      <th className="p-4 font-semibold text-gray-600">Tanggal Upload</th>
                      <th className="p-4 font-semibold text-gray-600">Status</th>
                      <th className="p-4 font-semibold text-gray-600 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {materials.map((materi) => (
                      <tr key={materi.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4">
                          <p className="font-semibold text-gray-800">{materi.title}</p>
                          <p className="text-sm text-gray-500 truncate max-w-xs" title={materi.description}>
                            {materi.description || '-'}
                          </p>
                        </td>
                        <td className="p-4">
                          <p className="font-medium text-gray-700">{materi.course_name}</p>
                          <p className="text-sm text-gray-500">Pertemuan {materi.pertemuan}</p>
                        </td>
                        <td className="p-4">
                          <p className="font-medium text-gray-700">{formatDate(materi.created_at)}</p>
                        </td>
                        <td className="p-4">
                          <span className="text-gray-500 text-sm">Tersedia</span>
                        </td>
                        <td className="p-4 text-center">
                          <Link
                            to={`/mahasiswa/matkul/${materi.course_id}/pertemuan/${materi.pertemuan || 1}/materi`}
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

export default MateriMahasiswa
