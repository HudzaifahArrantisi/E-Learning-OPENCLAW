// src/components/Sidebar.jsx
import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  FaHome, FaUser, FaBook, FaMoneyBill, FaCalendar, 
  FaComment, FaNewspaper, FaChartBar, FaCog, 
  FaTimes, FaGraduationCap, FaTasks, FaUpload,
  FaInstagram, FaBookmark, FaUsers, FaStore
} from 'react-icons/fa'
import { IoIosSettings, IoIosPaper } from 'react-icons/io'
import { MdDashboard, MdClass, MdPayment } from 'react-icons/md'

const Sidebar = ({ role, isOpen, onClose }) => {
  const location = useLocation()

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/')

  const menuItems = {
    mahasiswa: [
      { path: '/mahasiswa', label: 'Dashboard', icon: <MdDashboard className="text-lg" /> },
      { path: '/mahasiswa/profile', label: 'Profile', icon: <FaUser className="text-lg" /> },
      { path: '/mahasiswa/matkul', label: 'My Courses', icon: <MdClass className="text-lg" /> },
      { path: '/mahasiswa/pembayaran-ukt', label: 'Pembayaran UKT', icon: <MdPayment className="text-lg" /> },
      { path: '/mahasiswa/cari-invoice', label: 'Invoice', icon: <FaMoneyBill className="text-lg" /> },
      { path: '/mahasiswa/scan-absensi', label: 'Jadwal dan Absensi', icon: <FaCalendar className="text-lg" /> },
      { path: '/mahasiswa/transkrip-nilai', label: 'Nilai', icon: <FaChartBar className="text-lg" /> },
      { path: '/mahasiswa/tugas', label: 'Tugas & Materi', icon: <FaTasks className="text-lg" /> },
      { path: '/mahasiswa/pesan', label: 'Chat', icon: <FaComment className="text-lg" /> }
    ],
    dosen: [
      { path: '/dosen', label: 'Dashboard', icon: <MdDashboard className="text-lg" /> },
      { path: '/dosen/course', label: 'Kelas Saya', icon: <FaBook className="text-lg" /> },
      { path: '/dosen/absensi', label: 'Absensi', icon: <FaCalendar className="text-lg" /> },
      { path: '/dosen/pesan', label: 'Pesan', icon: <FaComment className="text-lg" /> }
    ],
    admin: [
      { path: '/admin', label: 'Dashboard', icon: <MdDashboard className="text-lg" /> },
      { path: '/admin/akun', label: 'Akun Saya', icon: <FaUser className="text-lg" /> },
      { path: '/admin/posting-pemberitahuan', label: 'Buat Posting', icon: <IoIosPaper className="text-lg" /> },
      { path: '/admin/pemantauan-ukt', label: 'Monitor UKT', icon: <FaMoneyBill className="text-lg" /> },
      { path: '/admin/setting-profile', label: 'Pengaturan', icon: <IoIosSettings className="text-lg" /> }
    ],
    orangtua: [
      { path: '/ortu', label: 'Dashboard', icon: <MdDashboard className="text-lg" /> },
      { path: '/ortu/pantau-kehadiran', label: 'Kehadiran', icon: <FaCalendar className="text-lg" /> },
      { path: '/ortu/pembayaran-ukt', label: 'UKT', icon: <FaMoneyBill className="text-lg" /> }
    ],
    ukm: [
      { path: '/ukm', label: 'Dashboard', icon: <MdDashboard className="text-lg" /> },
      { path: '/ukm/akun', label: 'Profil', icon: <FaUser className="text-lg" /> },
      { path: '/ukm/posting', label: 'Posting', icon: <FaNewspaper className="text-lg" /> },
      { path: '/ukm/setting-profile', label: 'Pengaturan', icon: <IoIosSettings className="text-lg" /> }
    ],
    ormawa: [
      { path: '/ormawa', label: 'Dashboard', icon: <MdDashboard className="text-lg" /> },
      { path: '/ormawa/akun', label: 'Profil', icon: <FaUser className="text-lg" /> },
      { path: '/ormawa/posting', label: 'Posting', icon: <FaNewspaper className="text-lg" /> },
      { path: '/ormawa/setting-profile', label: 'Pengaturan', icon: <IoIosSettings className="text-lg" /> }
    ]
  }

  const items = menuItems[role] || []

  return (
    <>
      {/* Overlay untuk mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300 animate-fadeIn"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar - Instagram Style */}
      <div className={`
        fixed lg:sticky top-0 left-0 z-50
        w-64 bg-white shadow-2xl transform transition-all duration-500 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col h-screen border-r border-gray-100
      `}>
        {/* Header Sidebar - Instagram Inspired */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-orange-500 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                NF
              </div>
              <div>
                <h2 className="text-lg font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  StudentHub
                </h2>
                <p className="text-xs text-gray-500 capitalize font-medium">{role}</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
            >
              <FaTimes className="text-gray-500 text-lg" />
            </button>
          </div>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {/* Main Feed Link */}


          {/* Role Specific Menus */}
          {items.map((item) => (
            <div key={item.path}>
              <Link
                to={item.path}
                onClick={() => window.innerWidth < 1024 && onClose()}
                className={`
                  flex items-center space-x-3 p-3 rounded-xl transition-all duration-300
                  ${isActive(item.path) 
                    ? 'bg-gradient-to-r from-pink-50 to-pink-100 text-pink-600 border-l-4 border-pink-500' 
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
              >
                <div className={`${isActive(item.path) ? 'text-pink-500' : 'text-gray-400'}`}>
                  {item.icon}
                </div>
                <span className="font-medium">{item.label}</span>
              </Link>
            </div>
          ))}
        </nav>

        {/* Footer Sidebar */}
        <div className="p-4 border-t border-gray-100">
          <div className="space-y-2">

            <div className="text-xs text-gray-400 text-center pt-4">
              © 2024 NF StudentHub
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default Sidebar