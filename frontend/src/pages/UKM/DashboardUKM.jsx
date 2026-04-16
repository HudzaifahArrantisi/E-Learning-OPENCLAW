// src/pages/UKM/DashboardUKM.jsx
import React from 'react'
import DashboardLayout from '../../components/DashboardLayout'

const DashboardUKM = () => {
  const quickActions = [
    { href: '/ukm/posting', label: '📝 Buat Postingan' },
    { href: '/ukm/anggota', label: '👥 Kelola Anggota' },
    { href: '/ukm/event', label: '🎯 Buat Event' },
    { href: '/ukm/galeri', label: '🖼️ Kelola Galeri' }
  ]

  const statsComponent = (stats) => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
      <div className="bg-lp-accentS border border-lp-borderA p-5 rounded-2xl transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:-translate-y-0.5">
        <div className="text-2xl font-bold text-lp-atext">{stats?.posts_count || 0}</div>
        <div className="text-[11px] text-lp-text2 font-mono tracking-wider uppercase mt-1">Postingan</div>
      </div>
      <div className="bg-lp-green/8 border border-lp-green/15 p-5 rounded-2xl transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:-translate-y-0.5">
        <div className="text-2xl font-bold text-lp-green">{stats?.followers_count || 0}</div>
        <div className="text-[11px] text-lp-text2 font-mono tracking-wider uppercase mt-1">Pengikut</div>
      </div>
      <div className="bg-lp-amber/8 border border-lp-amber/15 p-5 rounded-2xl transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:-translate-y-0.5">
        <div className="text-2xl font-bold text-lp-amber">{stats?.members_count || 0}</div>
        <div className="text-[11px] text-lp-text2 font-mono tracking-wider uppercase mt-1">Anggota</div>
      </div>
      <div className="bg-lp-red/8 border border-lp-red/15 p-5 rounded-2xl transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:-translate-y-0.5">
        <div className="text-2xl font-bold text-lp-red">{stats?.events_count || 0}</div>
        <div className="text-[11px] text-lp-text2 font-mono tracking-wider uppercase mt-1">Event</div>
      </div>
    </div>
  )

  return (
    <DashboardLayout
      role="ukm"
      profileEndpoint="/api/ukm/profile"
      statsEndpoint="/api/ukm/stats"
      quickActions={quickActions}
      statsComponent={statsComponent}
    />
  )
}

export default DashboardUKM