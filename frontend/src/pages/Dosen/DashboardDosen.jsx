// src/pages/Dosen/DashboardDosen.jsx
import React, { useState, useEffect } from 'react'
import DashboardLayout from '../../components/DashboardLayout'
import api from '../../services/api'

const DashboardDosen = () => {
  const [stats, setStats] = useState({
    matkul_diajar: 0,
    mahasiswa_bimbingan: 0,
    tugas_perlu_dinilai: 0,
    sesi_absensi: 0
  })

  useEffect(() => {
    fetchDosenStats()
  }, [])

  const fetchDosenStats = async () => {
    try {
      const response = await api.getDosenStats()
      setStats(response.data.data)
    } catch (error) {
      console.error('Error fetching dosen stats:', error)
    }
  }

  const quickActions = [
    { href: '/dosen/absensi', label: '📋 Buat Absensi' },
    { href: '/dosen/matkul', label: '🎓 Mata Kuliah' },
    { href: '/dosen/penilaian', label: '📝 Penilaian' },
    { href: '/dosen/pesan', label: '💬 Pesan' }
  ]

  const statsComponent = (dashboardStats) => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
      <div className="bg-lp-textS border border-lp-border p-5 rounded-2xl transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:-translate-y-0.5">
        <div className="text-2xl font-bold text-lp-text2">{stats.matkul_diajar}</div>
        <div className="text-[11px] text-lp-text2 font-semibold mt-2">Mata Kuliah</div>
        <div className="text-[10px] text-lp-text3 font-light">Yang diampu</div>
      </div>
      <div className="bg-lp-surface border border-lp-border p-5 rounded-2xl transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:-translate-y-0.5">
        <div className="text-2xl font-bold text-lp-text2">{stats.mahasiswa_bimbingan}</div>
        <div className="text-[11px] text-lp-text2 font-semibold mt-2">Mahasiswa</div>
        <div className="text-[10px] text-lp-text3 font-light">Total bimbingan</div>
      </div>
      <div className="bg-lp-amber/8 border border-lp-amber/15 p-5 rounded-2xl transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:-translate-y-0.5">
        <div className="text-2xl font-bold text-lp-amber">{stats.tugas_perlu_dinilai}</div>
        <div className="text-[11px] text-lp-text2 font-semibold mt-2">Perlu Dinilai</div>
        <div className="text-[10px] text-lp-text3 font-light">Tugas menunggu</div>
      </div>
      <div className="bg-lp-red/8 border border-lp-red/15 p-5 rounded-2xl transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:-translate-y-0.5">
        <div className="text-2xl font-bold text-lp-red">{stats.sesi_absensi}</div>
        <div className="text-[11px] text-lp-text2 font-semibold mt-2">Sesi Absensi</div>
        <div className="text-[10px] text-lp-text3 font-light">Aktif</div>
      </div>
    </div>
  )

  return (
    <DashboardLayout
      role="dosen"
      profileEndpoint="/api/dosen/profile"
      statsEndpoint="/api/dosen/stats"
      quickActions={quickActions}
      statsComponent={statsComponent}
      customStats={stats}
    />
  )
}

export default DashboardDosen