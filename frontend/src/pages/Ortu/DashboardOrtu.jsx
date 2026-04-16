// src/pages/Ortu/DashboardOrtu.jsx
import React from 'react'
import DashboardLayout from '../../components/DashboardLayout'

const DashboardOrtu = () => {
  const quickActions = [
    { href: '/ortu/pantau-kehadiran', label: '📊 Pantau Kehadiran' },
    { href: '/ortu/pembayaran-ukt', label: '💳 Pembayaran UKT' },
    { href: '/ortu/nilai-akademik', label: '📈 Nilai Akademik' },
    { href: '/ortu/aktivitas', label: '📝 Aktivitas Terbaru' }
  ]

  const statsComponent = (stats) => (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
      <div className="bg-lp-accentS border border-lp-borderA p-5 rounded-2xl transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:-translate-y-0.5">
        <div className="text-2xl font-bold text-lp-atext">{stats?.rata_kehadiran || '0%'}</div>
        <div className="text-[11px] text-lp-text2 font-mono tracking-wider uppercase mt-1">Rata Kehadiran</div>
      </div>
      <div className="bg-lp-green/8 border border-lp-green/15 p-5 rounded-2xl transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:-translate-y-0.5">
        <div className="text-2xl font-bold text-lp-green">{stats?.rata_nilai || '-'}</div>
        <div className="text-[11px] text-lp-text2 font-mono tracking-wider uppercase mt-1">Rata Nilai</div>
      </div>
      <div className="bg-lp-amber/8 border border-lp-amber/15 p-5 rounded-2xl transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:-translate-y-0.5">
        <div className="text-2xl font-bold text-lp-amber">{stats?.status_ukt || 'Lunas'}</div>
        <div className="text-[11px] text-lp-text2 font-mono tracking-wider uppercase mt-1">Status UKT</div>
      </div>
    </div>
  )

  return (
    <DashboardLayout
      role="orangtua"
      profileEndpoint="/api/orangtua/profile"
      statsEndpoint="/api/orangtua/stats"
      quickActions={quickActions}
      statsComponent={statsComponent}
    />
  )
}

export default DashboardOrtu