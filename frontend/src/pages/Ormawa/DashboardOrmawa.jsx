// src/pages/Ormawa/DashboardOrmawa.jsx
import React from 'react'
import DashboardLayout from '../../components/DashboardLayout'

const DashboardOrmawa = () => {
  const quickActions = [
    { href: '/ormawa/posting', label: '📝 Buat Postingan' },
    { href: '/ormawa/anggota', label: '👥 Kelola Anggota' },
    { href: '/ormawa/event', label: '📅 Buat Event' },
    { href: '/ormawa/laporan', label: '📊 Laporan Kegiatan' }
  ]

  const statsComponent = (stats) => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
      <div className="bg-lp-accentS border border-lp-borderA p-5 rounded-2xl transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:-translate-y-0.5">
        <div className="text-2xl font-bold text-lp-atext">{stats?.total_anggota || 0}</div>
        <div className="text-[11px] text-lp-text2 font-mono tracking-wider uppercase mt-1">Total Anggota</div>
      </div>
      <div className="bg-lp-green/8 border border-lp-green/15 p-5 rounded-2xl transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:-translate-y-0.5">
        <div className="text-2xl font-bold text-lp-green">{stats?.posting_count || 0}</div>
        <div className="text-[11px] text-lp-text2 font-mono tracking-wider uppercase mt-1">Postingan</div>
      </div>
      <div className="bg-lp-amber/8 border border-lp-amber/15 p-5 rounded-2xl transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:-translate-y-0.5">
        <div className="text-2xl font-bold text-lp-amber">{stats?.event_count || 0}</div>
        <div className="text-[11px] text-lp-text2 font-mono tracking-wider uppercase mt-1">Event</div>
      </div>
      <div className="bg-lp-red/8 border border-lp-red/15 p-5 rounded-2xl transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:-translate-y-0.5">
        <div className="text-2xl font-bold text-lp-red">{stats?.pengikut || 0}</div>
        <div className="text-[11px] text-lp-text2 font-mono tracking-wider uppercase mt-1">Pengikut</div>
      </div>
    </div>
  )

  return (
    <DashboardLayout
      role="ormawa"
      profileEndpoint="/api/ormawa/profile"
      statsEndpoint="/api/ormawa/stats"
      quickActions={quickActions}
      statsComponent={statsComponent}
    />
  )
}

export default DashboardOrmawa