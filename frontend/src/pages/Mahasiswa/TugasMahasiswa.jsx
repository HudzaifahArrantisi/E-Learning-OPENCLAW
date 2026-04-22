import React, { useEffect, useMemo, useState } from 'react'
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
    let mounted = true

    const loadTasks = async () => {
      try {
        const res = await api.getMahasiswaTugasList()
        if (mounted && res.data.success) {
          setTasks(res.data.data.tasks || [])
        }
      } catch (error) {
        console.error('Error fetching tasks:', error)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadTasks()

    return () => {
      mounted = false
    }
  }, [])

  const tugasList = useMemo(
    () =>
      tasks
        .filter((task) => (task.type || '').toLowerCase() === 'tugas')
        .sort((a, b) => new Date(a.due_date || 0) - new Date(b.due_date || 0)),
    [tasks]
  )

  // Format date nicely
  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
    return new Date(dateStr).toLocaleDateString('id-ID', options)
  }

  const totalSubmitted = tugasList.filter((task) => task.has_submission).length
  const totalOverdue = tugasList.filter((task) => task.is_overdue && !task.has_submission).length
  const totalPending = tugasList.length - totalSubmitted

  const getDeadlineLabel = (task) => {
    if (task.has_submission) return { text: 'Sudah dikumpulkan', color: 'text-lp-green bg-lp-green/10 border-lp-green/20' }
    if (task.is_overdue) return { text: 'Terlambat', color: 'text-lp-red bg-lp-red/10 border-lp-red/20' }
    if (task.days_remaining > 0) return { text: `${task.days_remaining} hari lagi`, color: 'text-lp-amber bg-lp-amber/10 border-lp-amber/20' }
    return { text: 'Batas hari ini', color: 'text-lp-atext bg-lp-accent/10 border-lp-borderA' }
  }

  return (
    <div className="flex min-h-screen bg-lp-bg">
      <Sidebar role="mahasiswa" />
      <div className="main-content w-full">
        <Navbar user={user} />
        <div className="p-4 md:p-8 space-y-6">
          <section className="relative overflow-hidden rounded-3xl border border-lp-border bg-lp-card p-6 md:p-8 shadow-[0_12px_36px_rgba(15,23,42,0.06)]">
            <div className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-lp-accent/10 blur-3xl" />
            <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-lp-border bg-lp-surface px-3 py-1 text-[11px] font-mono uppercase tracking-widest text-lp-text3">
                  <span className="h-1.5 w-1.5 rounded-full bg-lp-accent" />
                  Tugas Mahasiswa
                </span>
                <h1 className="mt-4 text-3xl md:text-4xl leading-tight tracking-tight text-lp-text">
                  Kelola semua tugas
                  <span className="italic text-lp-text/40"> dalam satu tampilan</span>
                </h1>
                <p className="mt-2 max-w-2xl text-sm md:text-base text-lp-text2">
                  Pantau deadline, status pengumpulan, dan akses detail tugas lebih cepat dengan tampilan yang rapi.
                </p>
              </div>
              <Link
                to="/mahasiswa/materi"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-lp-border bg-lp-surface px-5 py-2.5 text-sm font-semibold text-lp-text2 transition hover:border-lp-borderA hover:text-lp-atext"
              >
                Lihat Materi
                <i className="fas fa-arrow-right text-xs"></i>
              </Link>
            </div>
          </section>

          <section className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            <div className="rounded-2xl border border-lp-borderA bg-lp-accentS p-4">
              <p className="text-[11px] font-mono uppercase tracking-widest text-lp-text3">Total Tugas</p>
              <p className="mt-2 text-2xl font-semibold text-lp-atext">{tugasList.length}</p>
            </div>
            <div className="rounded-2xl border border-lp-green/20 bg-lp-green/10 p-4">
              <p className="text-[11px] font-mono uppercase tracking-widest text-lp-text3">Dikumpulkan</p>
              <p className="mt-2 text-2xl font-semibold text-lp-green">{totalSubmitted}</p>
            </div>
            <div className="rounded-2xl border border-lp-amber/20 bg-lp-amber/10 p-4">
              <p className="text-[11px] font-mono uppercase tracking-widest text-lp-text3">Belum Selesai</p>
              <p className="mt-2 text-2xl font-semibold text-lp-amber">{totalPending}</p>
            </div>
            <div className="rounded-2xl border border-lp-red/20 bg-lp-red/10 p-4">
              <p className="text-[11px] font-mono uppercase tracking-widest text-lp-text3">Terlambat</p>
              <p className="mt-2 text-2xl font-semibold text-lp-red">{totalOverdue}</p>
            </div>
          </section>

          <section className="rounded-3xl border border-lp-border bg-lp-card p-5 md:p-6 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 className="text-lg md:text-xl font-semibold tracking-tight text-lp-text">Daftar Tugas Aktif</h2>
              <span className="rounded-full border border-lp-border bg-lp-surface px-3 py-1 text-xs text-lp-text2">
                {tugasList.length} item
              </span>
            </div>

            {loading ? (
              <div className="py-14 text-center">
                <i className="fas fa-spinner fa-spin text-3xl text-lp-atext mb-2"></i>
                <p className="text-lp-text3 font-light">Memuat data...</p>
              </div>
            ) : tugasList.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-lp-border bg-lp-surface p-10 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-lp-accent/10">
                  <i className="fas fa-folder-open text-2xl text-lp-atext"></i>
                </div>
                <h3 className="text-lg font-semibold tracking-tight text-lp-text">Belum ada tugas</h3>
                <p className="mt-1 text-lp-text3">Tugas yang diberikan dosen akan muncul di halaman ini.</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {tugasList.map((task) => {
                  const deadlineInfo = getDeadlineLabel(task)

                  return (
                    <article
                      key={task.id}
                      className="group rounded-2xl border border-lp-border bg-lp-surface p-5 transition-all hover:-translate-y-0.5 hover:border-lp-borderA hover:shadow-[0_12px_28px_rgba(75,115,255,0.12)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-base font-semibold tracking-tight text-lp-text">{task.title}</h3>
                          <p className="mt-1 text-sm text-lp-text3 line-clamp-2">{task.description || 'Tidak ada deskripsi.'}</p>
                        </div>
                        <span className="rounded-full border border-lp-border bg-lp-card px-2.5 py-1 text-[11px] uppercase tracking-wide text-lp-text2">
                          Pert. {task.pertemuan || 1}
                        </span>
                      </div>

                      <div className="mt-4 space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-lp-text2">
                          <i className="fas fa-book text-lp-atext"></i>
                          <span>{task.course_name || 'Mata kuliah tidak tersedia'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-lp-text2">
                          <i className="fas fa-calendar-alt text-lp-atext"></i>
                          <span>{formatDate(task.due_date)}</span>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <span className={`rounded-full border px-3 py-1 text-xs font-medium ${deadlineInfo.color}`}>
                          {deadlineInfo.text}
                        </span>

                        <span className={`text-sm font-medium ${task.has_submission ? 'text-lp-green' : 'text-lp-red'}`}>
                          {task.has_submission ? 'Dikumpulkan' : 'Belum Dikerjakan'}
                        </span>
                      </div>

                      <Link
                        to={`/mahasiswa/matkul/${task.course_id}/pertemuan/${task.pertemuan || 1}/tugas?taskId=${task.id}`}
                        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-lp-border bg-lp-card px-4 py-2.5 text-sm font-semibold text-lp-atext transition group-hover:border-lp-borderA group-hover:bg-lp-accent/5"
                      >
                        Detail Tugas
                        <i className="fas fa-arrow-right text-xs"></i>
                      </Link>
                    </article>
                  ) 
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

export default TugasMahasiswa
