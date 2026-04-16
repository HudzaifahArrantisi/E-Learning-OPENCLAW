// src/pages/Admin/DashboardAdmin.jsx
import React from 'react'
import DashboardLayout from '../../components/DashboardLayout'

const DashboardAdmin = () => {
  const quickActions = [
    { href: '/admin/posting-pemberitahuan', label: '📢 Buat Pemberitahuan' },
    { href: '/admin/pemantauan-ukt', label: '💰 Pemantauan UKT' },
    { href: '/admin/kelola-akun', label: '👥 Kelola Akun' },
    { href: '/admin/laporan', label: '📈 Laporan Sistem' }
  ]

  const statsComponent = (stats) => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
      <div className="bg-lp-accentS border border-lp-borderA p-5 rounded-2xl transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:-translate-y-0.5">
        <div className="text-2xl font-bold text-lp-atext">{stats?.totalMahasiswa || 0}</div>
        <div className="text-[11px] text-lp-text2 font-mono tracking-wider uppercase mt-1">Total Mahasiswa</div>
      </div>
      <div className="bg-lp-green/8 border border-lp-green/15 p-5 rounded-2xl transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:-translate-y-0.5">
        <div className="text-2xl font-bold text-lp-green">{stats?.totalDosen || 0}</div>
        <div className="text-[11px] text-lp-text2 font-mono tracking-wider uppercase mt-1">Total Dosen</div>
      </div>
      <div className="bg-lp-red/8 border border-lp-red/15 p-5 rounded-2xl transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:-translate-y-0.5">
        <div className="text-2xl font-bold text-lp-red">{stats?.uktBelumBayar || 0}</div>
        <div className="text-[11px] text-lp-text2 font-mono tracking-wider uppercase mt-1">UKT Belum Bayar</div>
      </div>
      <div className="bg-lp-amber/8 border border-lp-amber/15 p-5 rounded-2xl transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:-translate-y-0.5">
        <div className="text-2xl font-bold text-lp-amber">{stats?.totalUkmOrmawa || 0}</div>
        <div className="text-[11px] text-lp-text2 font-mono tracking-wider uppercase mt-1">UKM/Ormawa</div>
      </div>
    </div>
  )

  return (
    <DashboardLayout
      role="admin"
      profileEndpoint="/api/admin/profile"
      statsEndpoint="/api/admin/stats"
      quickActions={quickActions}
      statsComponent={statsComponent}
    />
  )
}

export default DashboardAdmin