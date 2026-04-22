import React, { useEffect, useMemo, useState } from 'react'
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
    let mounted = true

    const loadMaterials = async () => {
      try {
        const res = await api.getMahasiswaTugasList()
        if (mounted && res.data.success) {
          const materiList = (res.data.data.tasks || []).filter(
            (item) => (item.type || '').toLowerCase() === 'materi'
          )
          setMaterials(materiList)
        }
      } catch (error) {
        console.error('Error fetching materials:', error)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadMaterials()

    return () => {
      mounted = false
    }
  }, [])

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
    return new Date(dateStr).toLocaleDateString('id-ID', options)
  }

  const sortedMaterials = useMemo(
    () =>
      [...materials].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)),
    [materials]
  )
  const totalCourses = new Set(sortedMaterials.map((item) => item.course_id).filter(Boolean)).size
  const latestMaterial = sortedMaterials[0]

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
                  Materi Mahasiswa
                </span>
                <h1 className="mt-4 text-3xl md:text-4xl leading-tight tracking-tight text-lp-text">
                  Materi pembelajaran
                  <span className="italic text-lp-text/40"> tersusun rapi</span>
                </h1>
                <p className="mt-2 max-w-2xl text-sm md:text-base text-lp-text2">
                  Akses materi terbaru dari setiap mata kuliah dengan tampilan bersih dan fokus untuk belajar.
                </p>
              </div>
              <Link
                to="/mahasiswa/tugas"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-lp-border bg-lp-surface px-5 py-2.5 text-sm font-semibold text-lp-text2 transition hover:border-lp-borderA hover:text-lp-atext"
              >
                Lihat Tugas
                <i className="fas fa-arrow-right text-xs"></i>
              </Link>
            </div>
          </section>

          <section className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            <div className="rounded-2xl border border-lp-borderA bg-lp-accentS p-4">
              <p className="text-[11px] font-mono uppercase tracking-widest text-lp-text3">Total Materi</p>
              <p className="mt-2 text-2xl font-semibold text-lp-atext">{sortedMaterials.length}</p>
            </div>
            <div className="rounded-2xl border border-lp-green/20 bg-lp-green/10 p-4">
              <p className="text-[11px] font-mono uppercase tracking-widest text-lp-text3">Mata Kuliah</p>
              <p className="mt-2 text-2xl font-semibold text-lp-green">{totalCourses}</p>
            </div>
            <div className="rounded-2xl border border-lp-amber/20 bg-lp-amber/10 p-4">
              <p className="text-[11px] font-mono uppercase tracking-widest text-lp-text3">Materi Terbaru</p>
              <p className="mt-2 text-sm font-semibold text-lp-amber line-clamp-2">{latestMaterial?.title || '-'}</p>
            </div>
            <div className="rounded-2xl border border-lp-border bg-lp-surface p-4">
              <p className="text-[11px] font-mono uppercase tracking-widest text-lp-text3">Upload Terakhir</p>
              <p className="mt-2 text-sm font-semibold text-lp-text2">{formatDate(latestMaterial?.created_at)}</p>
            </div>
          </section>

          <section className="rounded-3xl border border-lp-border bg-lp-card p-5 md:p-6 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 className="text-lg md:text-xl font-semibold tracking-tight text-lp-text">Daftar Materi</h2>
              <span className="rounded-full border border-lp-border bg-lp-surface px-3 py-1 text-xs text-lp-text2">
                {sortedMaterials.length} item
              </span>
            </div>

            {loading ? (
              <div className="py-14 text-center">
                <i className="fas fa-spinner fa-spin text-3xl text-lp-atext mb-2"></i>
                <p className="text-lp-text3 font-light">Memuat data...</p>
              </div>
            ) : sortedMaterials.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-lp-border bg-lp-surface p-10 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-lp-accent/10">
                  <i className="fas fa-book-open text-2xl text-lp-atext"></i>
                </div>
                <h3 className="text-lg font-semibold tracking-tight text-lp-text">Belum ada materi</h3>
                <p className="mt-1 text-lp-text3">Materi dari dosen akan otomatis muncul pada halaman ini.</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {sortedMaterials.map((materi) => (
                  <article
                    key={materi.id}
                    className="group rounded-2xl border border-lp-border bg-lp-surface p-5 transition-all hover:-translate-y-0.5 hover:border-lp-borderA hover:shadow-[0_12px_28px_rgba(75,115,255,0.12)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold tracking-tight text-lp-text">{materi.title}</h3>
                        <p className="mt-1 text-sm text-lp-text3 line-clamp-2">{materi.description || 'Tidak ada deskripsi.'}</p>
                      </div>
                      <span className="rounded-full border border-lp-border bg-lp-card px-2.5 py-1 text-[11px] uppercase tracking-wide text-lp-text2">
                        Pert. {materi.pertemuan || 1}
                      </span>
                    </div>

                    <div className="mt-4 space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-lp-text2">
                        <i className="fas fa-book text-lp-atext"></i>
                        <span>{materi.course_name || 'Mata kuliah tidak tersedia'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-lp-text2">
                        <i className="fas fa-upload text-lp-atext"></i>
                        <span>{formatDate(materi.created_at)}</span>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <span className="rounded-full border border-lp-green/20 bg-lp-green/10 px-3 py-1 text-xs font-medium text-lp-green">
                        Tersedia
                      </span>

                      <Link
                        to={`/mahasiswa/matkul/${materi.course_id}/pertemuan/${materi.pertemuan || 1}/materi`}
                        className="inline-flex items-center gap-2 rounded-xl border border-lp-border bg-lp-card px-4 py-2.5 text-sm font-semibold text-lp-atext transition group-hover:border-lp-borderA group-hover:bg-lp-accent/5"
                      >
                        Detail Materi
                        <i className="fas fa-arrow-right text-xs"></i>
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

export default MateriMahasiswa
