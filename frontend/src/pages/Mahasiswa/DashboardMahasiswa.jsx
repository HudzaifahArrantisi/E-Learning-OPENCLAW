// src/pages/Mahasiswa/DashboardMahasiswa.jsx
import React from 'react'
import DashboardLayout from '../../components/DashboardLayout'

const DashboardMahasiswa = () => {
  const quickActions = [
    { label: 'Lihat Matkul', href: '/mahasiswa/matkul' },
    { label: 'Pembayaran UKT', href: '/mahasiswa/pembayaran-ukt' },
    { label: 'Scan Absensi', href: '/mahasiswa/scan-absensi' },
    { label: 'Transkrip Nilai', href: '/mahasiswa/transkrip-nilai' }
  ]

  const statsComponent = (statsData) => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
      <div className="bg-lp-accentS border border-lp-borderA p-5 rounded-2xl text-center transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:-translate-y-0.5">
        <div className="text-2xl font-bold text-lp-atext">{statsData?.total_matkul || 0}</div>
        <div className="text-[11px] text-lp-text2 font-mono tracking-wider uppercase mt-1">Total Matkul</div>
      </div>
      <div className="bg-lp-green/8 border border-lp-green/15 p-5 rounded-2xl text-center transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:-translate-y-0.5">
        <div className="text-2xl font-bold text-lp-green">{statsData?.kehadiran || '0%'}</div>
        <div className="text-[11px] text-lp-text2 font-mono tracking-wider uppercase mt-1">Rata² Kehadiran</div>
      </div>
      <div className="bg-lp-amber/8 border border-lp-amber/15 p-5 rounded-2xl text-center transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:-translate-y-0.5">
        <div className="text-2xl font-bold text-lp-amber">{statsData?.tugas_menunggu || 0}</div>
        <div className="text-[11px] text-lp-text2 font-mono tracking-wider uppercase mt-1">Tugas Menunggu</div>
      </div>
      <div className="bg-lp-red/8 border border-lp-red/15 p-5 rounded-2xl text-center transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:-translate-y-0.5">
        <div className="text-2xl font-bold text-lp-red">{statsData?.ukt_status || 'Lunas'}</div>
        <div className="text-[11px] text-lp-text2 font-mono tracking-wider uppercase mt-1">Status UKT</div>
      </div>
    </div>
  )

  return (
    <DashboardLayout
      role="mahasiswa"
      profileEndpoint="/api/mahasiswa/profile"
      statsEndpoint="/api/mahasiswa/stats"
      quickActions={quickActions}
      statsComponent={statsComponent}
    />
  )
}

export default DashboardMahasiswa