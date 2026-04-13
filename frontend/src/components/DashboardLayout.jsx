// src/components/DashboardLayout.jsx - DIUPDATE DENGAN DROPDOWN MOBILE
import React, { Suspense, lazy, useState } from 'react'
import { useQuery } from "@tanstack/react-query"
import { useNavigate, Link } from 'react-router-dom'
import api from '../services/api'
import Sidebar from './Sidebar'
import useAuth from '../hooks/useAuth'
import PostCard from './PostCard'
import { 
  FaSearch, FaRegHeart, FaBars, FaSignOutAlt, FaPlus, 
  FaInstagram, FaChevronDown, FaChevronUp, FaUsers, FaUniversity, FaClock, FaPaperclip
} from 'react-icons/fa'
import { RiHome7Line, RiHome7Fill } from 'react-icons/ri'
import { FiHome, FiSearch, FiPlusSquare, FiHeart, FiUsers } from 'react-icons/fi'
import { BsInstagram, BsPeopleFill } from 'react-icons/bs'
import { MdOutlineSchool } from 'react-icons/md'
import { getProfilePhotoUrl, getInitials, cleanUsername } from '../utils/profileUtils'
import { resolveBackendAssetUrl } from '../utils/assetUrl'

const Chatbot = lazy(() => import('./Chatbot'))

const getRelativeTime = (dateString) => {
  const rtf = new Intl.RelativeTimeFormat('id', { numeric: 'auto' })
  const now = Date.now()
  const postDate = new Date(dateString).getTime()
  const diffInSeconds = Math.floor((now - postDate) / 1000)

  if (diffInSeconds < 60) return 'baru saja'
  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) return rtf.format(-diffInMinutes, 'minute')
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return rtf.format(-diffInHours, 'hour')
  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) return rtf.format(-diffInDays, 'day')
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short'
  })
}

const formatDateTime = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getFileUrl = (filePath) => {
  return resolveBackendAssetUrl(filePath)
}

const DashboardLayout = ({ 
  role, 
  profileEndpoint = '/api/mahasiswa/profile',
  statsEndpoint, 
  quickActions = [],
  statsComponent,
  children 
}) => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('all')
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [showAccountsDropdown, setShowAccountsDropdown] = useState(false)
  const [activeAccountTab, setActiveAccountTab] = useState('ormawa')

  // Fetch profile data
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: [`${role}-profile`],
    queryFn: () => api.get(profileEndpoint).then(res => res.data.data),
    enabled: !!user && !!profileEndpoint,
    staleTime: 10 * 60 * 1000,
  })

  // Fetch posts
  const { data: posts = [], isLoading: postsLoading } = useQuery({
    queryKey: ['feed'],
    queryFn: () => api.get('/api/feed').then(res => res.data.data || []),
    staleTime: 30 * 60 * 1000,
    cacheTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  })

  const { data: mahasiswaTasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['mahasiswa-task-list'],
    queryFn: () => api.getMahasiswaTugasList().then(res => res.data?.data?.tasks || []),
    enabled: role === 'mahasiswa' && !!user,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 15000,
  })

  const tabs = role === 'mahasiswa'
    ? [
        { key: 'all', label: 'For You' },
        { key: 'admin', label: 'Admin' },
        { key: 'ormawa', label: 'Organizations' },
        { key: 'ukm', label: 'UKM' },
        { key: 'list_tugas', label: 'List Tugas' },
      ]
    : [
        { key: 'all', label: 'For You' },
        { key: 'admin', label: 'Admin' },
        { key: 'ormawa', label: 'Organizations' },
        { key: 'ukm', label: 'UKM' },
      ]
  

  const filteredPosts = activeTab === 'all' 
    ? posts 
    : posts.filter(post => post.role === activeTab)

  const tugasList = mahasiswaTasks.filter((task) => task.type === 'tugas')
  const showTaskTabContent = role === 'mahasiswa' && activeTab === 'list_tugas'

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const isLoading = profileLoading || postsLoading

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-white font-sans">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-pink-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-700 font-medium">Loading feed...</p>
        </div>
      </div>
    )
  }

  const organizations = [
    { id: 1, name: 'SENADA', type: 'ormawa', email: 'senada@nurulfikri.ac.id', username: 'senada' },
    { id: 2, name: 'BEM NF', type: 'ormawa', email: 'bem@nurulfikri.ac.id', username: 'bem' },
    { id: 3, name: 'DPM', type: 'ormawa', email: 'dpm@nurulfikri.ac.id', username: 'dpm' },
    { id: 4, name: 'HIMA TI', type: 'ormawa', email: 'hima_ti@nurulfikri.ac.id', username: 'hima_ti' },
    { id: 5, name: 'HIMA SI', type: 'ormawa', email: 'hima_si@nurulfikri.ac.id', username: 'hima_si' },
    { id: 6, name: 'HIMA BD', type: 'ormawa', email: 'hima_bd@nurulfikri.ac.id', username: 'hima_bd' },
  ]

  const suggestedUKM = [
    { id: 1, name: 'NFSCC', type: 'ukm', email: 'nfscc@nurulfikri.ac.id', username: 'nfscc' },
    { id: 2, name: 'GDGOC', type: 'ukm', email: 'gdgoc@nurulfikri.ac.id', username: 'gdgoc' },
    { id: 3, name: 'HALMAHERA', type: 'ukm', email: 'halmahera@nurulfikri.ac.id', username: 'halmahera' },
    { id: 4, name: 'BIZZCLUB', type: 'ukm', email: 'bizzclub@nurulfikri.ac.id', username: 'bizzclub' },
    { id: 5, name: 'MUDENG', type: 'ukm', email: 'mudeng@nurulfikri.ac.id', username: 'mudeng' },
    { id: 6, name: 'FORUM PEREMPUAN', type: 'ukm', email: 'forum_perempuan@nurulfikri.ac.id', username: 'forum_perempuan' },
  ]

  const profileUsername = cleanUsername(profile?.username || user?.username || user?.name || 'user')
  const profileName = profile?.name || user?.name || 'User'
  const profileEmail = profile?.email || user?.email || ''

  return (
    <div className="flex min-h-screen bg-white font-sans antialiased">
      {/* Sidebar */}
      <Sidebar 
        role={role} 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)}
        profile={profile}
      />

      {/* Main Content - FIXED CENTER ALIGNMENT */}
      <div className="flex-1 md:max-w-2xl lg:max-w-2xl mx-auto min-h-screen w-full">
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-gray-100 z-20">
          <div className="px-4 py-3 flex items-center justify-between">
            {/* Mobile Menu Button */}
            <button 
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FaBars className="text-xl text-gray-700" />
            </button>

            {/* Logo */}
            <Link to="/" className="flex items-center">
              <h1 className="text-xl font-bold bg-gradient-to-r from-pink-500 to-orange-500 bg-clip-text text-transparent md:text-2xl flex items-center font-logo">
                NF StudentHub
              </h1>
            </Link>
          </div>

          {/* Role Filter Tabs */}
          <div className="flex overflow-x-auto scrollbar-hide border-b border-gray-100">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-shrink-0 px-6 py-3 font-medium text-sm transition-all duration-200 relative flex items-center space-x-2 ${activeTab === tab.key ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <span>{tab.label}</span>
                {activeTab === tab.key && (
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-12 h-0.5 bg-gray-900 rounded-full animate-pulse"></div>
                )}
              </button>
            ))}
          </div>

          {/* Mobile Accounts Dropdown Toggle */}
          <div className="lg:hidden border-b border-gray-100">
            <button
              onClick={() => setShowAccountsDropdown(!showAccountsDropdown)}
              className="w-full flex items-center justify-between px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-r from-pink-100 to-orange-100 rounded-lg">
                  <FaUsers className="text-pink-500" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-sm">Rekomendasi Akun</div>
                  <div className="text-xs text-gray-500">Temukan ormawa & UKM</div>
                </div>
              </div>
              {showAccountsDropdown ? (
                <FaChevronUp className="text-gray-400" />
              ) : (
                <FaChevronDown className="text-gray-400" />
              )}
            </button>

            {/* Mobile Accounts Dropdown Content */}
            {showAccountsDropdown && (
              <div className="bg-white border-t border-gray-100 animate-slideDown">
                {/* Account Type Tabs */}
                <div className="flex border-b">
                  <button
                    onClick={() => setActiveAccountTab('ormawa')}
                    className={`flex-1 py-3 text-sm font-medium flex items-center justify-center space-x-2 ${activeAccountTab === 'ormawa' ? 'text-pink-600 border-b-2 border-pink-500' : 'text-gray-500'}`}
                  >
                    <MdOutlineSchool />
                    <span>Organisasi</span>
                  </button>
                  <button
                    onClick={() => setActiveAccountTab('ukm')}
                    className={`flex-1 py-3 text-sm font-medium flex items-center justify-center space-x-2 ${activeAccountTab === 'ukm' ? 'text-blue-600 border-b-2 border-blue-500' : 'text-gray-500'}`}
                  >
                    <BsPeopleFill />
                    <span>UKM</span>
                  </button>
                </div>

                {/* Accounts List */}
                <div className="max-h-[300px] overflow-y-auto p-3">
                  {activeAccountTab === 'ormawa' ? (
                    <div className="space-y-3">
                      {organizations.map((org) => (
                        <Link
                          key={org.id}
                          to={`/profile/${org.type}/${cleanUsername(org.username || org.name)}`}
                          className="flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                          onClick={() => setShowAccountsDropdown(false)}
                        >
                          <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white font-bold shadow-md">
                            {org.name?.[0]?.toUpperCase() || 'O'}
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900 text-sm">
                              {org.name}
                            </div>
                            <div className="text-gray-500 text-xs">
                              Organisasi Mahasiswa
                            </div>
                          </div>
                          <button className="px-4 py-1.5 bg-gradient-to-r from-pink-500 to-orange-500 text-white rounded-full text-xs font-semibold hover:opacity-90 transition-opacity">
                            Detail
                          </button>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {suggestedUKM.map((ukm) => (
                        <Link
                          key={ukm.id}
                          to={`/profile/${ukm.type}/${cleanUsername(ukm.username || ukm.name)}`}
                          className="flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                          onClick={() => setShowAccountsDropdown(false)}
                        >
                          <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-teal-500 rounded-xl flex items-center justify-center text-white font-bold shadow-md">
                            {ukm.name?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900 text-sm">
                              {ukm.name}
                            </div>
                            <div className="text-gray-500 text-xs">
                              Unit Kegiatan Mahasiswa
                            </div>
                          </div>
                          <button className="px-4 py-1.5 border border-blue-500 text-blue-500 rounded-full text-xs font-semibold hover:bg-blue-50 transition-colors">
                            Detail
                          </button>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Feed Content */}
        <div className="pb-20">
          {showTaskTabContent ? (
            <div className="animate-fadeIn px-4 py-5 space-y-4">
              {tasksLoading ? (
                <div className="py-20 text-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-4 border-pink-500 border-t-transparent mx-auto mb-4"></div>
                  <p className="text-gray-600">Memuat list tugas...</p>
                </div>
              ) : tugasList.length > 0 ? (
                tugasList.map((task) => {
                  const dueDate = task.due_date ? formatDateTime(task.due_date) : 'Tidak ditentukan'
                  const uploadDate = formatDateTime(task.created_at)
                  const fileUrl = getFileUrl(task.file_tugas)

                  return (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => navigate(`/mahasiswa/matkul/${task.course_id}/pertemuan/${task.pertemuan || 1}/tugas?taskId=${task.id}`)}
                      className="w-full text-left bg-white border border-gray-200 rounded-2xl p-5 hover:border-pink-300 hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{task.title}</h3>
                          <p className="text-sm text-gray-600 mt-1">{task.course_name} • Pertemuan {task.pertemuan}</p>
                        </div>
                        {task.is_overdue ? (
                          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-red-100 text-red-700">Terlambat</span>
                        ) : (
                          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-green-100 text-green-700">Aktif</span>
                        )}
                      </div>

                      <div className="mt-4 grid gap-2 text-sm text-gray-700">
                        <div className="flex items-center gap-2">
                          <FaClock className="text-orange-500" />
                          <span>Deadline: {dueDate}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FaClock className="text-blue-500" />
                          <span>Tanggal upload: {uploadDate}</span>
                        </div>
                      </div>

                      {task.description && (
                        <p className="mt-4 text-sm text-gray-600 leading-relaxed">
                          {task.description}
                        </p>
                      )}

                      {fileUrl && (
                        <div className="mt-4">
                          <a
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-2 text-sm text-pink-600 hover:text-pink-700 font-semibold"
                          >
                            <FaPaperclip />
                            <span>Lihat file tugas</span>
                          </a>
                        </div>
                      )}
                    </button>
                  )
                })
              ) : (
                <div className="text-center py-16 px-4">
                  <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-r from-pink-100 to-orange-100 rounded-full flex items-center justify-center">
                    <span className="text-4xl">📚</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Belum ada tugas</h3>
                  <p className="text-gray-600 max-w-sm mx-auto">
                    Tugas dari dosen akan tampil otomatis di sini saat dosen upload tugas baru.
                  </p>
                </div>
              )}
            </div>
          ) : filteredPosts.length > 0 ? (
            <div className="animate-fadeIn">
              {filteredPosts.map(post => (
                <PostCard key={post.id} post={post} getRelativeTime={getRelativeTime} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 px-4 animate-fadeIn">
              <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-r from-pink-100 to-orange-100 rounded-full flex items-center justify-center">
                <span className="text-4xl">📝</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Belum ada postingan</h3>
              <p className="text-gray-600 mb-6 max-w-sm mx-auto">
                {activeTab === 'all' 
                  ? 'Jadilah yang pertama berbagi dengan komunitas!'
                  : `Belum ada postingan dari ${activeTab}.`
                }
              </p>

            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar - Desktop Only */}
      <div className="hidden lg:block flex-1 max-w-sm sticky top-0 h-screen overflow-y-auto p-6 custom-scrollbar">
        {/* User Profile with Logout */}
        <div className="mb-8 animate-fadeIn">
          <div className="flex items-center space-x-4 mb-6 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <Link 
              to={`/mahasiswa/profile`}
              className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-lg hover:opacity-90 transition-all hover:scale-105 overflow-hidden border-2 border-pink-300"
            >
              {profile?.photo ? (
                <img 
                  src={getProfilePhotoUrl(profile.photo)} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div 
                className={`w-full h-full bg-gradient-to-r from-pink-500 to-orange-500 rounded-full flex items-center justify-center ${profile?.photo ? 'hidden' : 'flex'}`}
              >
                {getInitials(profileName)}
              </div>
            </Link>
            
            <div className="flex-1 min-w-0">
              <Link 
                to={`/mahasiswa/profile`}
                className="hover:opacity-80 transition-opacity block"
              >
                <div className="font-bold text-gray-900 truncate hover:underline">{profileName}</div>
                <div className="text-gray-500 text-sm truncate">@{profileUsername}</div>
              </Link>
              
              {/* Logout Button */}
              <button 
                onClick={() => setShowLogoutConfirm(true)}
                className="flex items-center space-x-2 text-gray-500 hover:text-red-500 mt-4 text-sm font-medium transition-all duration-200 hover:scale-105"
              >
                <FaSignOutAlt className="text-xs" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>

        {/* Organizations Suggestions - Ormawa */}
        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 mb-6 hover:shadow-sm transition-shadow animate-slideInRight">
          <div className="flex items-center space-x-2 mb-4">
    
            <h3 className="font-bold text-gray-900">AKUN ORMAWA</h3>
          </div>
          <div className="space-y-3">
            {organizations.slice(0, 6).map((org) => (
              <div key={org.id} className="flex items-center justify-between p-3 hover:bg-white rounded-xl transition-all duration-200 hover:scale-[1.02]">
                <Link 
                  to={`/profile/${org.type}/${cleanUsername(org.username || org.name)}`}
                  className="flex items-center space-x-3 flex-1 hover:opacity-80 transition-opacity min-w-0"
                >
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white font-bold shadow-md">
                    {org.name?.[0]?.toUpperCase() || 'O'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 text-sm truncate">
                      {org.name}
                    </div>
                    <div className="text-gray-500 text-xs truncate">
                      Organisasi
                    </div>
                  </div>
                </Link>

                <Link
                  to={`/profile/${org.type}/${cleanUsername(org.username || org.name)}`}
                  className="text-white bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  Detail
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* UKM Suggestions */}
        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 hover:shadow-sm transition-shadow animate-slideInRight">
          <div className="flex items-center space-x-2 mb-4">
            <div className="p-2 bg-gradient-to-r from-green-100 to-teal-100 rounded-lg">
              <FaUsers className="text-green-500" />
            </div>
            <h3 className="font-bold text-gray-900">AKUN UKM</h3>
          </div>
          <div className="space-y-3">
            {suggestedUKM.slice(0, 6).map((ukm) => (
              <div key={ukm.id} className="flex items-center justify-between p-3 hover:bg-white rounded-xl transition-all duration-200 hover:scale-[1.02]">
                <Link 
                  to={`/profile/${ukm.type}/${cleanUsername(ukm.username || ukm.name)}`}
                  className="flex items-center space-x-3 flex-1 hover:opacity-80 transition-opacity min-w-0"
                >
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-teal-500 rounded-xl flex items-center justify-center text-white font-bold shadow-md">
                    {ukm.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 text-sm truncate">
                      {ukm.name}
                    </div>
                    <div className="text-gray-500 text-xs truncate">
                      UKM
                    </div>
                  </div>
                </Link>
                <Link
                  to={`/profile/${ukm.type}/${cleanUsername(ukm.username || ukm.name)}`}
                  className="text-blue-500 font-semibold text-sm hover:text-blue-600 px-4 py-2 border border-blue-500 hover:bg-blue-50 rounded-full transition-all duration-200 hover:scale-105"
                >
                  Detail
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Links */}
        <div className="mt-6 text-xs text-gray-500 space-y-2 animate-fadeIn">
          <div className="flex flex-wrap gap-2">
            <a href="#" className="hover:text-gray-700 transition-colors">Terms of Service</a>
            <span>·</span>
            <a href="#" className="hover:text-gray-700 transition-colors">Privacy Policy</a>
            <span>·</span>
            <a href="#" className="hover:text-gray-700 transition-colors">Cookie Policy</a>
            <span>·</span>
            <a href="#" className="hover:text-gray-700 transition-colors">Accessibility</a>
          </div>
          <div>© 2024 NF StudentHub, Inc.</div>
        </div>
      </div>

      {/* CHATBOT COMPONENT */}
      <Suspense fallback={null}>
        <Chatbot />
      </Suspense>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-scaleIn">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Konfirmasi Logout</h3>
            <p className="text-gray-600 mb-6">
              Apakah Anda yakin ingin keluar dari akun Anda?
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-medium hover:scale-105"
              >
                Batal
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl hover:from-red-600 hover:to-pink-600 transition-all duration-200 font-medium shadow-lg hover:scale-105"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}  
    </div>
  )
}

export default DashboardLayout