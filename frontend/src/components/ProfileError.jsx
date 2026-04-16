// src/components/ProfileError.jsx
import React from 'react'
import { Link } from 'react-router-dom'

const ProfileError = ({ error, role }) => {
  const getRoleInfo = (role) => {
    switch(role) {
      case 'admin':
        return { color: 'lp-accent', name: 'Administrator', table: 'admin' }
      case 'ukm':
        return { color: 'lp-amber', name: 'UKM', table: 'ukm' }
      case 'ormawa':
        return { color: 'lp-accent', name: 'Ormawa', table: 'ormawa' }
      default:
        return { color: 'lp-text3', name: 'User', table: 'users' }
    }
  }

  const roleInfo = getRoleInfo(role)

  return (
    <div className="bg-lp-bg text-lp-text font-sans font-light min-h-screen relative z-0 flex items-center justify-center p-8">
      {/* GLOBAL GRID BACKGROUND */}
      <div className="fixed inset-0 pointer-events-none z-[-1] bg-white">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.08)_1px,transparent_1px)] bg-[size:64px_64px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,rgba(255,255,255,0.85)_70%,#ffffff_100%)]" />
      </div>

      <div className="w-full max-w-lg">
        <div className="bg-white border border-lp-border rounded-2xl p-10 text-center shadow-[0_14px_30px_rgba(0,0,0,0.06)] animate-slideUp">
          <div className="w-16 h-16 mx-auto mb-6 bg-lp-red/8 rounded-2xl flex items-center justify-center">
            <span className="text-3xl">😕</span>
          </div>
          <h1 className="text-2xl font-semibold text-lp-text tracking-tight mb-4">
            Profile Tidak Ditemukan
          </h1>
          
          <div className="bg-lp-red/5 border border-lp-red/15 rounded-xl p-4 mb-5 text-left">
            <p className="text-[12px] font-mono text-lp-red font-medium tracking-wider uppercase mb-1">Error Details</p>
            <p className="text-[13px] text-lp-red/80 font-light leading-relaxed">{error}</p>
          </div>
          
          <div className="bg-lp-accentS border border-lp-borderA rounded-xl p-4 mb-6 text-left">
            <p className="text-[12px] font-mono text-lp-atext font-medium tracking-wider uppercase mb-2">Informasi Role</p>
            <p className="text-[13px] text-lp-text2 font-light">
              <strong className="font-semibold text-lp-text">Role:</strong> {roleInfo.name} ({role})
            </p>
            <p className="text-[13px] text-lp-text2 font-light">
              <strong className="font-semibold text-lp-text">Tabel Database:</strong> {roleInfo.table}
            </p>
            <p className="text-[13px] text-lp-text2 font-light">
              <strong className="font-semibold text-lp-text">Solusi:</strong> Pastikan data Anda sudah terdaftar di tabel {roleInfo.table}
            </p>
          </div>

          <div className="flex gap-3 justify-center">
            <Link 
              to="/" 
              className="bg-lp-text text-white px-5 py-3 rounded-full text-[13px] font-semibold transition-all hover:bg-lp-atext hover:-translate-y-px"
            >
              Kembali ke Beranda
            </Link>
            <button 
              onClick={() => window.location.reload()}
              className="border border-lp-border text-lp-text2 px-5 py-3 rounded-full text-[13px] font-medium transition-all hover:bg-lp-surface"
            >
              Coba Lagi
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProfileError