import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import useAuth from '../../hooks/useAuth'
import api from '../../services/api'
import {
  FiBookOpen, FiUsers, FiPlus, FiEdit2, FiTrash2,
  FiChevronRight, FiRefreshCw, FiSearch, FiFilter,
  FiX, FiCheck, FiAlertCircle, FiShield
} from 'react-icons/fi'

const FILTER_OPTIONS = [
  { value: 'all', label: 'Semua' },
  { value: 'wajib', label: 'Wajib' },
  { value: 'cyber', label: 'Peminatan Cyber Security' },
  { value: 'ai', label: 'Peminatan AI' },
]

const KATEGORI_OPTIONS = [
  { value: 'wajib', label: 'Wajib' },
  { value: 'peminatan_cs', label: 'Peminatan Cyber Security' },
  { value: 'peminatan_ai', label: 'Peminatan AI' },
]

const HARI_OPTIONS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

const kategoriLabel = (k) => {
  const map = { wajib: 'Wajib', peminatan_cs: 'Cyber Security', peminatan_ai: 'AI' }
  return map[k] || k
}

const kategoriColor = (k) => {
  const map = {
    wajib: 'bg-blue-50 text-blue-700 border-blue-200',
    peminatan_cs: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    peminatan_ai: 'bg-violet-50 text-violet-700 border-violet-200',
  }
  return map[k] || 'bg-gray-50 text-gray-700 border-gray-200'
}

const ManageMatkulSuperDosen = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [courses, setCourses] = useState([])
  const [dosenList, setDosenList] = useState([])
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(null)
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingCourse, setEditingCourse] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const emptyForm = { kode: '', nama: '', sks: 3, hari: 'Senin', jam_mulai: '08:00', jam_selesai: '10:30', kategori: 'wajib', dosen_id: 0 }
  const [form, setForm] = useState(emptyForm)

  // Check access
  useEffect(() => {
    const check = async () => {
      try {
        await api.checkSuperDosenAccess()
        setAuthorized(true)
      } catch {
        setAuthorized(false)
      }
    }
    check()
  }, [])

  const fetchCourses = useCallback(async () => {
    try {
      setLoading(true)
      const res = await api.getSuperDosenCourses(filter)
      setCourses(res.data?.data || [])
    } catch (err) {
      setFeedback({ type: 'error', msg: 'Gagal memuat data matkul' })
    } finally {
      setLoading(false)
    }
  }, [filter])

  const fetchDosenList = useCallback(async () => {
    try {
      const res = await api.getSuperDosenDosenList()
      setDosenList(res.data?.data || [])
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { if (authorized) { fetchCourses(); fetchDosenList() } }, [authorized, fetchCourses, fetchDosenList])

  const flash = (type, msg) => {
    setFeedback({ type, msg })
    setTimeout(() => setFeedback(null), 4000)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.kode || !form.nama || !form.kategori) {
      flash('error', 'Kode, Nama, dan Kategori wajib diisi')
      return
    }
    setSubmitting(true)
    try {
      if (editingCourse) {
        await api.updateSuperDosenCourse(editingCourse, {
          nama: form.nama, sks: form.sks, hari: form.hari,
          jam_mulai: form.jam_mulai, jam_selesai: form.jam_selesai,
          kategori: form.kategori, dosen_id: form.dosen_id || undefined,
        })
        flash('success', `Mata kuliah ${form.kode} berhasil diupdate`)
      } else {
        await api.createSuperDosenCourse(form)
        flash('success', `Mata kuliah ${form.kode} berhasil ditambahkan`)
      }
      setShowForm(false)
      setEditingCourse(null)
      setForm(emptyForm)
      fetchCourses()
    } catch (err) {
      flash('error', err.response?.data?.message || 'Gagal menyimpan data')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (kode, nama) => {
    if (!window.confirm(`Hapus mata kuliah "${nama}" (${kode})?`)) return
    try {
      await api.deleteSuperDosenCourse(kode)
      flash('success', `Mata kuliah ${kode} berhasil dihapus`)
      fetchCourses()
    } catch (err) {
      flash('error', err.response?.data?.message || 'Gagal menghapus')
    }
  }

  const openEdit = (course) => {
    setForm({
      kode: course.kode, nama: course.nama, sks: course.sks,
      hari: course.hari, jam_mulai: course.jam_mulai, jam_selesai: course.jam_selesai,
      kategori: course.kategori, dosen_id: 0,
    })
    setEditingCourse(course.kode)
    setShowForm(true)
  }

  const openCreate = () => {
    setForm(emptyForm)
    setEditingCourse(null)
    setShowForm(true)
  }

  const filtered = courses.filter(c =>
    !searchTerm || c.nama.toLowerCase().includes(searchTerm.toLowerCase()) || c.kode.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Unauthorized state
  if (authorized === false) {
    return (
      <div className="flex min-h-screen bg-lp-bg items-center justify-center">
        <div className="bg-white rounded-2xl p-10 shadow-lg border border-lp-border text-center max-w-md">
          <FiShield className="text-5xl text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-lp-text mb-2">Akses Ditolak</h2>
          <p className="text-lp-text2 font-light mb-6">Halaman ini hanya untuk Super Dosen.</p>
          <button onClick={() => navigate('/dosen')} className="px-6 py-3 bg-lp-text text-white rounded-xl font-medium hover:shadow-xl transition-all">
            Kembali ke Dashboard
          </button>
        </div>
      </div>
    )
  }

  if (authorized === null) {
    return <div className="flex min-h-screen bg-lp-bg items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-lp-text border-t-transparent rounded-full" /></div>
  }

  return (
    <div className="flex min-h-screen bg-lp-bg">
      <Sidebar role="dosen" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 lg:ml-0 transition-all duration-300 min-w-0">
        <div className="p-6 lg:p-8">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-3 rounded-xl bg-lp-surface/80 backdrop-blur-sm shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border">
                <FiChevronRight className="text-xl text-lp-text2" />
              </button>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <div className="p-3 bg-lp-text rounded-xl"><FiShield className="text-2xl text-white" /></div>
                  <div>
                    <h1 className="text-3xl lg:text-4xl font-bold text-lp-text">Kelola Mata Kuliah</h1>
                    <p className="text-lp-text2 font-light">Super Dosen • Manajemen Akademik Semester 4</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={fetchCourses} className="px-5 py-3 bg-lp-surface border border-lp-border text-lp-text2 rounded-xl font-medium hover:shadow-xl transition-all flex items-center gap-2">
                <FiRefreshCw /> Refresh
              </button>
              <button onClick={openCreate} className="group relative overflow-hidden px-6 py-3 bg-lp-text text-white rounded-xl font-medium shadow hover:shadow-xl transition-all hover:-translate-y-0.5 flex items-center gap-2">
                <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-full transition-transform duration-1000" />
                <FiPlus className="relative z-10" /><span className="relative z-10">Tambah Matkul</span>
              </button>
            </div>
          </div>

          {/* Feedback */}
          {feedback && (
            <div className={`mb-6 px-5 py-4 rounded-xl border flex items-center gap-3 animate-fadeIn ${feedback.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
              {feedback.type === 'success' ? <FiCheck className="text-lg" /> : <FiAlertCircle className="text-lg" />}
              <span className="font-medium text-sm">{feedback.msg}</span>
              <button onClick={() => setFeedback(null)} className="ml-auto"><FiX /></button>
            </div>
          )}

          {/* Filter & Search */}
          <div className="bg-lp-surface/80 backdrop-blur-sm rounded-2xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border mb-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-lp-text2 mb-2">Filter Kategori</label>
                <div className="flex flex-wrap gap-2">
                  {FILTER_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setFilter(opt.value)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${filter === opt.value ? 'bg-lp-text text-white border-lp-text shadow' : 'bg-white text-lp-text2 border-lp-border hover:border-lp-text/30'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-lp-text2 mb-2">Cari Matkul</label>
                <div className="relative">
                  <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-lp-text3" />
                  <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border border-lp-border rounded-xl focus:ring-2 focus:ring-lp-text/20 focus:border-transparent bg-white"
                    placeholder="Nama atau kode..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Form Modal */}
          {showForm && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[90] flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
              <div className="bg-white rounded-2xl shadow-2xl border border-lp-border w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="px-6 py-5 border-b border-lp-border flex items-center justify-between">
                  <h3 className="text-xl font-bold text-lp-text">{editingCourse ? 'Edit Mata Kuliah' : 'Tambah Mata Kuliah'}</h3>
                  <button onClick={() => setShowForm(false)} className="p-2 hover:bg-lp-surface rounded-xl"><FiX className="text-lg" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-lp-text2 mb-1">Kode *</label>
                      <input type="text" value={form.kode} disabled={!!editingCourse}
                        onChange={e => setForm({ ...form, kode: e.target.value.toUpperCase() })}
                        className="w-full px-4 py-2.5 border border-lp-border rounded-xl focus:ring-2 focus:ring-lp-text/20 disabled:bg-gray-100 disabled:text-gray-500 font-mono"
                        placeholder="IF401" required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-lp-text2 mb-1">SKS *</label>
                      <input type="number" value={form.sks} onChange={e => setForm({ ...form, sks: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2.5 border border-lp-border rounded-xl focus:ring-2 focus:ring-lp-text/20" min={1} max={6} required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-lp-text2 mb-1">Nama Mata Kuliah *</label>
                    <input type="text" value={form.nama} onChange={e => setForm({ ...form, nama: e.target.value })}
                      className="w-full px-4 py-2.5 border border-lp-border rounded-xl focus:ring-2 focus:ring-lp-text/20"
                      placeholder="Contoh: Pemrograman Fullstack" required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-lp-text2 mb-1">Kategori *</label>
                    <select value={form.kategori} onChange={e => setForm({ ...form, kategori: e.target.value })}
                      className="w-full px-4 py-2.5 border border-lp-border rounded-xl focus:ring-2 focus:ring-lp-text/20" required>
                      {KATEGORI_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-lp-text2 mb-1">Hari</label>
                      <select value={form.hari} onChange={e => setForm({ ...form, hari: e.target.value })}
                        className="w-full px-4 py-2.5 border border-lp-border rounded-xl focus:ring-2 focus:ring-lp-text/20">
                        {HARI_OPTIONS.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-lp-text2 mb-1">Mulai</label>
                      <input type="time" value={form.jam_mulai} onChange={e => setForm({ ...form, jam_mulai: e.target.value })}
                        className="w-full px-4 py-2.5 border border-lp-border rounded-xl focus:ring-2 focus:ring-lp-text/20"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-lp-text2 mb-1">Selesai</label>
                      <input type="time" value={form.jam_selesai} onChange={e => setForm({ ...form, jam_selesai: e.target.value })}
                        className="w-full px-4 py-2.5 border border-lp-border rounded-xl focus:ring-2 focus:ring-lp-text/20"
                      />
                    </div>
                  </div>
                  {dosenList.length > 0 && (
                    <div>
                      <label className="block text-sm font-semibold text-lp-text2 mb-1">Dosen Pengampu</label>
                      <select value={form.dosen_id} onChange={e => setForm({ ...form, dosen_id: parseInt(e.target.value) })}
                        className="w-full px-4 py-2.5 border border-lp-border rounded-xl focus:ring-2 focus:ring-lp-text/20">
                        <option value={0}>-- Pilih Dosen --</option>
                        {dosenList.map(d => <option key={d.id} value={d.id}>{d.name} ({d.nip})</option>)}
                      </select>
                    </div>
                  )}
                  <div className="flex justify-end gap-3 pt-4 border-t border-lp-border">
                    <button type="button" onClick={() => setShowForm(false)}
                      className="px-5 py-2.5 border border-lp-border text-lp-text2 rounded-xl font-medium hover:bg-lp-surface transition-all">
                      Batal
                    </button>
                    <button type="submit" disabled={submitting}
                      className="px-6 py-2.5 bg-lp-text text-white rounded-xl font-medium hover:shadow-xl transition-all disabled:opacity-50 flex items-center gap-2">
                      {submitting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FiCheck />}
                      {editingCourse ? 'Simpan Perubahan' : 'Tambah Matkul'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total Matkul', value: courses.length, icon: <FiBookOpen /> },
              { label: 'Wajib', value: courses.filter(c => c.kategori === 'wajib').length, icon: <FiFilter /> },
              { label: 'Cyber Security', value: courses.filter(c => c.kategori === 'peminatan_cs').length, icon: <FiShield /> },
              { label: 'AI', value: courses.filter(c => c.kategori === 'peminatan_ai').length, icon: <FiUsers /> },
            ].map((s, i) => (
              <div key={i} className="bg-lp-surface/80 backdrop-blur-sm rounded-2xl p-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border hover:shadow-xl transition-all hover:-translate-y-0.5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lp-text2 font-light text-xs mb-1">{s.label}</p>
                    <h3 className="text-2xl font-bold text-lp-text">{s.value}</h3>
                  </div>
                  <div className="p-2.5 bg-lp-bg rounded-xl text-lp-text2">{s.icon}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Course Table */}
          {loading ? (
            <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-2 border-lp-text border-t-transparent rounded-full" /></div>
          ) : filtered.length > 0 ? (
            <div className="bg-lp-surface/80 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead className="bg-lp-bg">
                    <tr>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-lp-text2 uppercase tracking-wider">Kode</th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-lp-text2 uppercase tracking-wider">Nama Mata Kuliah</th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-lp-text2 uppercase tracking-wider">Kategori</th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-lp-text2 uppercase tracking-wider">Jadwal</th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-lp-text2 uppercase tracking-wider">SKS</th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-lp-text2 uppercase tracking-wider">Dosen</th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-lp-text2 uppercase tracking-wider">Mhs</th>
                      <th className="px-5 py-3.5 text-right text-xs font-semibold text-lp-text2 uppercase tracking-wider">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map(course => (
                      <tr key={course.kode} className="hover:bg-lp-bg/50 transition-colors">
                        <td className="px-5 py-4 font-mono font-semibold text-sm text-lp-text">{course.kode}</td>
                        <td className="px-5 py-4">
                          <div className="font-semibold text-lp-text text-sm">{course.nama}</div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-semibold border ${kategoriColor(course.kategori)}`}>
                            {kategoriLabel(course.kategori)}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-sm text-lp-text2 font-light">
                          {course.hari}, {course.jam_mulai?.slice(0,5)}-{course.jam_selesai?.slice(0,5)}
                        </td>
                        <td className="px-5 py-4 text-sm font-medium text-lp-text">{course.sks}</td>
                        <td className="px-5 py-4 text-sm text-lp-text2 font-light">{course.dosen_name}</td>
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-1 text-sm text-lp-text2"><FiUsers className="text-xs" />{course.student_count}</span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => openEdit(course)} className="p-2 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors" title="Edit">
                              <FiEdit2 className="text-sm" />
                            </button>
                            <button onClick={() => handleDelete(course.kode, course.nama)} className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors" title="Hapus">
                              <FiTrash2 className="text-sm" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-5 py-3 border-t border-lp-border bg-lp-bg/50 text-sm text-lp-text3 font-light">
                Menampilkan {filtered.length} dari {courses.length} mata kuliah
              </div>
            </div>
          ) : (
            <div className="text-center py-16 bg-lp-surface/80 rounded-2xl border border-lp-border">
              <FiBookOpen className="text-4xl text-lp-text3 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-lp-text2 mb-2">
                {searchTerm ? 'Tidak ada hasil' : 'Belum ada mata kuliah'}
              </h3>
              <p className="text-lp-text3 font-light mb-6">
                {searchTerm ? `Tidak ada matkul cocok dengan "${searchTerm}"` : 'Tambahkan mata kuliah pertama.'}
              </p>
              {!searchTerm && (
                <button onClick={openCreate} className="px-6 py-3 bg-lp-text text-white rounded-xl font-medium hover:shadow-xl transition-all flex items-center gap-2 mx-auto">
                  <FiPlus /> Tambah Matkul
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ManageMatkulSuperDosen
