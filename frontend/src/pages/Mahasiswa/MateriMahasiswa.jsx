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
    <div className="flex bg-lp-bg min-h-screen">
      <Sidebar role="mahasiswa" />
      <div className="main-content w-full">
        <Navbar user={user} />
        <div className="p-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-lp-text font-semibold tracking-tight">Daftar Materi</h1>
              <p className="text-lp-text2 font-light">Daftar semua materi pembelajaran dari mata kuliah Anda.</p>
            </div>

            <Link
              to="/mahasiswa/tugas"
              className="px-4 py-2 rounded-lg font-medium border bg-lp-surface text-lp-text2 font-light hover:bg-lp-bg transition"
            >
              Lihat Tugas
            </Link>
          </div>

          <div className="bg-lp-surface rounded-xl shadow-sm border border-lp-border border overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <i className="fas fa-spinner fa-spin text-3xl text-lp-atext mb-2"></i>
                <p className="text-lp-text3 font-light">Memuat data...</p>
              </div>
            ) : materials.length === 0 ? (
              <div className="p-10 text-center">
                <div className="w-16 h-16 bg-cyan-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-book-open text-2xl text-cyan-500"></i>
                </div>
                <h3 className="text-lg font-bold text-lp-text font-semibold tracking-tight mb-1">Tidak ada materi</h3>
                <p className="text-lp-text3 font-light">Belum ada materi yang tersedia untuk Anda.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-lp-bg border-b border-lp-border border">
                      <th className="p-4 font-semibold text-lp-text2 font-light">Judul</th>
                      <th className="p-4 font-semibold text-lp-text2 font-light">Mata Kuliah / Pertemuan</th>
                      <th className="p-4 font-semibold text-lp-text2 font-light">Tanggal Upload</th>
                      <th className="p-4 font-semibold text-lp-text2 font-light">Status</th>
                      <th className="p-4 font-semibold text-lp-text2 font-light text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {materials.map((materi) => (
                      <tr key={materi.id} className="hover:bg-lp-bg transition-colors">
                        <td className="p-4">
                          <p className="font-semibold text-lp-text font-semibold tracking-tight">{materi.title}</p>
                          <p className="text-sm text-lp-text3 font-light truncate max-w-xs" title={materi.description}>
                            {materi.description || '-'}
                          </p>
                        </td>
                        <td className="p-4">
                          <p className="font-medium text-lp-text2">{materi.course_name}</p>
                          <p className="text-sm text-lp-text3 font-light">Pertemuan {materi.pertemuan}</p>
                        </td>
                        <td className="p-4">
                          <p className="font-medium text-lp-text2">{formatDate(materi.created_at)}</p>
                        </td>
                        <td className="p-4">
                          <span className="text-lp-text3 font-light text-sm">Tersedia</span>
                        </td>
                        <td className="p-4 text-center">
                          <Link
                            to={`/mahasiswa/matkul/${materi.course_id}/pertemuan/${materi.pertemuan || 1}/materi`}
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

export default MateriMahasiswa
