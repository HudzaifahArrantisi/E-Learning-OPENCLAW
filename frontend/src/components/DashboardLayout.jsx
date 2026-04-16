// src/components/DashboardLayout.jsx
import React, { Suspense, lazy, useState } from 'react'
import { useQuery } from "@tanstack/react-query"
import { useNavigate, Link } from 'react-router-dom'
import api from '../services/api'
import Sidebar from './Sidebar'
import useAuth from '../hooks/useAuth'
import PostCard from './PostCard'
import { 
  FaBars, FaSignOutAlt, FaClock, FaPaperclip,
  FaChevronDown, FaChevronUp, FaUsers
} from 'react-icons/fa'
import { MdOutlineSchool } from 'react-icons/md'
import { BsPeopleFill } from 'react-icons/bs'
import { getProfilePhotoUrl, getInitials, cleanUsername } from '../utils/profileUtils'
import { resolveBackendAssetUrl } from '../utils/assetUrl'
import Loading from './Loading'

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
      navigate('/')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const isLoading = profileLoading || postsLoading

  if (isLoading) {
    return <Loading />
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
    <div className="bg-lp-bg text-lp-text font-sans font-light min-h-screen relative z-0">
      {/* GLOBAL GRID BACKGROUND */}
      <div className="fixed inset-0 pointer-events-none z-[-1] bg-white">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.08)_1px,transparent_1px)] bg-[size:64px_64px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,rgba(255,255,255,0.85)_70%,#ffffff_100%)]" />
      </div>

      <div className="flex min-h-screen">
        {/* Sidebar */}
        <Sidebar 
          role={role} 
          isOpen={sidebarOpen} 
          onClose={() => setSidebarOpen(false)}
          profile={profile}
        />

        {/* Main Content */}
        <div className="flex-1 md:max-w-2xl lg:max-w-2xl mx-auto min-h-screen w-full">
          {/* Header */}
          <div className="sticky top-0 bg-white/80 backdrop-blur-2xl border-b border-lp-border z-20">
            <div className="px-5 py-3.5 flex items-center justify-between">
              {/* Mobile Menu Button */}
              <button 
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 hover:bg-lp-surface rounded-xl transition-colors"
              >
                <FaBars className="text-lg text-lp-text2" />
              </button>

              {/* Logo */}
              <Link to="/" className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-lp-accentS border border-lp-borderA flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 stroke-lp-accent fill-none stroke-2 [stroke-linecap:round]" viewBox="0 0 24 24">
                    <path d="M22 10v6M2 10l10-5 10 5-10 5-10-5z" />
                    <path d="M6 12v5c3.33 1.67 8.67 1.67 12 0v-5" />
                  </svg>
                </div>
                <span className="text-[13px] font-bold text-lp-text tracking-[0.05em] hidden sm:inline">STUDENT-HUB</span>
              </Link>
            </div>

            {/* Role Filter Tabs */}
            <div className="flex overflow-x-auto scrollbar-hide">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-shrink-0 px-5 py-3 text-[12.5px] transition-all duration-200 relative ${
                    activeTab === tab.key 
                      ? 'text-lp-text font-semibold' 
                      : 'text-lp-text3 hover:text-lp-text2 font-light'
                  }`}
                >
                  <span>{tab.label}</span>
                  {activeTab === tab.key && (
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-[2px] bg-lp-accent rounded-full" />
                  )}
                </button>
              ))}
            </div>

            {/* Mobile Accounts Dropdown Toggle */}
            <div className="lg:hidden border-t border-lp-border">
              <button
                onClick={() => setShowAccountsDropdown(!showAccountsDropdown)}
                className="w-full flex items-center justify-between px-5 py-3 text-lp-text2 hover:bg-lp-surface/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-lp-accentS flex items-center justify-center">
                    <FaUsers className="text-lp-accent text-xs" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-[13px] text-lp-text">Rekomendasi Akun</div>
                    <div className="text-[11px] text-lp-text3 font-light">Temukan ormawa & UKM</div>
                  </div>
                </div>
                {showAccountsDropdown ? (
                  <FaChevronUp className="text-lp-text3 text-xs" />
                ) : (
                  <FaChevronDown className="text-lp-text3 text-xs" />
                )}
              </button>

              {/* Mobile Accounts Dropdown Content */}
              {showAccountsDropdown && (
                <div className="bg-white border-t border-lp-border animate-slideUp">
                  {/* Account Type Tabs */}
                  <div className="flex border-b border-lp-border">
                    <button
                      onClick={() => setActiveAccountTab('ormawa')}
                      className={`flex-1 py-3 text-[12px] font-medium flex items-center justify-center gap-1.5 transition-colors ${activeAccountTab === 'ormawa' ? 'text-lp-atext border-b-2 border-lp-accent' : 'text-lp-text3'}`}
                    >
                      <MdOutlineSchool />
                      <span>Organisasi</span>
                    </button>
                    <button
                      onClick={() => setActiveAccountTab('ukm')}
                      className={`flex-1 py-3 text-[12px] font-medium flex items-center justify-center gap-1.5 transition-colors ${activeAccountTab === 'ukm' ? 'text-lp-atext border-b-2 border-lp-accent' : 'text-lp-text3'}`}
                    >
                      <BsPeopleFill />
                      <span>UKM</span>
                    </button>
                  </div>

                  {/* Accounts List */}
                  <div className="max-h-[300px] overflow-y-auto p-3 space-y-1">
                    {(activeAccountTab === 'ormawa' ? organizations : suggestedUKM).map((org) => (
                      <Link
                        key={org.id}
                        to={`/profile/${org.type}/${cleanUsername(org.username || org.name)}`}
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-lp-surface transition-all"
                        onClick={() => setShowAccountsDropdown(false)}
                      >
                        <div className="w-10 h-10 bg-lp-accentS border border-lp-borderA rounded-xl flex items-center justify-center text-lp-atext font-bold text-sm">
                          {org.name?.[0]?.toUpperCase() || 'O'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-lp-text text-[13px] truncate">{org.name}</div>
                          <div className="text-lp-text3 text-[11px] font-light">{activeAccountTab === 'ormawa' ? 'Organisasi Mahasiswa' : 'Unit Kegiatan Mahasiswa'}</div>
                        </div>
                        <span className="text-[11px] font-semibold text-lp-accent bg-lp-accentS px-3 py-1 rounded-full transition-all hover:-translate-y-px">
                          Detail
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Feed Content */}
          <div className="pb-20">
            {showTaskTabContent ? (
              <div className="animate-fadeIn px-5 py-5 space-y-3">
                {tasksLoading ? (
                  <div className="py-20 text-center">
                    <div className="w-8 h-8 border-2 border-lp-border border-t-lp-accent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-lp-text2 text-sm font-light">Memuat list tugas...</p>
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
                        className="w-full text-left bg-white border border-lp-border rounded-2xl p-5 hover:border-lp-borderA hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-300 group"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-[15px] font-semibold text-lp-text tracking-tight">{task.title}</h3>
                            <p className="text-[13px] text-lp-text2 font-light mt-1">{task.course_name} • Pertemuan {task.pertemuan}</p>
                          </div>
                          {task.is_overdue ? (
                            <span className="text-[10px] font-mono font-medium px-3 py-1 rounded-full bg-lp-red/8 text-lp-red tracking-wider uppercase">Terlambat</span>
                          ) : (
                            <span className="text-[10px] font-mono font-medium px-3 py-1 rounded-full bg-lp-green/8 text-lp-green tracking-wider uppercase">Aktif</span>
                          )}
                        </div>

                        <div className="mt-4 grid gap-2 text-[13px] text-lp-text2 font-light">
                          <div className="flex items-center gap-2">
                            <FaClock className="text-lp-amber text-xs" />
                            <span>Deadline: {dueDate}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <FaClock className="text-lp-accent text-xs" />
                            <span>Tanggal upload: {uploadDate}</span>
                          </div>
                        </div>

                        {task.description && (
                          <p className="mt-4 text-[13px] text-lp-text2 font-light leading-relaxed">
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
                              className="inline-flex items-center gap-2 text-[12px] text-lp-atext hover:text-lp-accent font-semibold transition-colors"
                            >
                              <FaPaperclip className="text-xs" />
                              <span>Lihat file tugas</span>
                            </a>
                          </div>
                        )}
                      </button>
                    )
                  })
                ) : (
                  <div className="text-center py-16 px-4">
                    <div className="w-16 h-16 mx-auto mb-5 bg-lp-accentS rounded-2xl flex items-center justify-center">
                      <span className="text-3xl">📚</span>
                    </div>
                    <h3 className="text-lg font-semibold text-lp-text mb-2 tracking-tight">Belum ada tugas</h3>
                    <p className="text-[13px] text-lp-text2 font-light max-w-sm mx-auto">
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
                <div className="w-16 h-16 mx-auto mb-5 bg-lp-accentS rounded-2xl flex items-center justify-center">
                  <span className="text-3xl">📝</span>
                </div>
                <h3 className="text-lg font-semibold text-lp-text mb-2 tracking-tight">Belum ada postingan</h3>
                <p className="text-[13px] text-lp-text2 font-light mb-6 max-w-sm mx-auto">
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
          <div className="mb-6 animate-fadeIn">
            <div className="flex items-center gap-4 p-4 bg-white border border-lp-border rounded-2xl hover:border-lp-borderA hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all duration-300">
              <Link 
                to={`/mahasiswa/profile`}
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-base hover:scale-105 transition-transform overflow-hidden border border-lp-border"
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
                  className={`w-full h-full bg-lp-accentS rounded-2xl flex items-center justify-center text-lp-atext font-bold ${profile?.photo ? 'hidden' : 'flex'}`}
                >
                  {getInitials(profileName)}
                </div>
              </Link>
              
              <div className="flex-1 min-w-0">
                <Link 
                  to={`/mahasiswa/profile`}
                  className="hover:opacity-80 transition-opacity block"
                >
                  <div className="font-semibold text-lp-text text-[14px] truncate tracking-tight">{profileName}</div>
                  <div className="text-lp-text3 text-[12px] font-mono truncate">@{profileUsername}</div>
                </Link>
                
                {/* Logout Button */}
                <button 
                  onClick={() => setShowLogoutConfirm(true)}
                  className="flex items-center gap-1.5 text-lp-text3 hover:text-lp-red mt-3 text-[11px] font-mono tracking-wider uppercase transition-colors"
                >
                  <FaSignOutAlt className="text-[10px]" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>

          {/* Organizations Suggestions - Ormawa */}
          <div className="bg-white border border-lp-border rounded-2xl p-4 mb-4 hover:border-lp-borderA hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all duration-300 animate-slideInRight">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[10px] font-mono font-medium tracking-[0.14em] uppercase text-lp-text3">Akun Ormawa</span>
              <div className="flex-1 h-px bg-lp-border" />
            </div>
            <div className="space-y-1.5">
              {organizations.slice(0, 6).map((org) => (
                <div key={org.id} className="flex items-center justify-between p-2.5 hover:bg-lp-surface rounded-xl transition-all duration-200 group">
                  <Link 
                    to={`/profile/${org.type}/${cleanUsername(org.username || org.name)}`}
                    className="flex items-center gap-3 flex-1 min-w-0"
                  >
                    <div className="w-9 h-9 bg-lp-accentS border border-lp-borderA rounded-xl flex items-center justify-center text-lp-atext font-bold text-xs">
                      {org.name?.[0]?.toUpperCase() || 'O'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-lp-text text-[12px] truncate tracking-tight">{org.name}</div>
                      <div className="text-lp-text3 text-[10px] font-light">Organisasi</div>
                    </div>
                  </Link>

                  <Link
                    to={`/profile/${org.type}/${cleanUsername(org.username || org.name)}`}
                    className="text-[10px] font-semibold text-lp-text bg-lp-surface px-3 py-1.5 rounded-full transition-all hover:bg-lp-text hover:text-white hover:-translate-y-px"
                  >
                    Detail
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* UKM Suggestions */}
          <div className="bg-white border border-lp-border rounded-2xl p-4 hover:border-lp-borderA hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all duration-300 animate-slideInRight">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[10px] font-mono font-medium tracking-[0.14em] uppercase text-lp-text3">Akun UKM</span>
              <div className="flex-1 h-px bg-lp-border" />
            </div>
            <div className="space-y-1.5">
              {suggestedUKM.slice(0, 6).map((ukm) => (
                <div key={ukm.id} className="flex items-center justify-between p-2.5 hover:bg-lp-surface rounded-xl transition-all duration-200 group">
                  <Link 
                    to={`/profile/${ukm.type}/${cleanUsername(ukm.username || ukm.name)}`}
                    className="flex items-center gap-3 flex-1 min-w-0"
                  >
                    <div className="w-9 h-9 bg-lp-green/10 border border-lp-green/20 rounded-xl flex items-center justify-center text-lp-green font-bold text-xs">
                      {ukm.name?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-lp-text text-[12px] truncate tracking-tight">{ukm.name}</div>
                      <div className="text-lp-text3 text-[10px] font-light">UKM</div>
                    </div>
                  </Link>
                  <Link
                    to={`/profile/${ukm.type}/${cleanUsername(ukm.username || ukm.name)}`}
                    className="text-[10px] font-semibold text-lp-text bg-lp-surface px-3 py-1.5 rounded-full transition-all hover:bg-lp-text hover:text-white hover:-translate-y-px"
                  >
                    Detail
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Links */}
          <div className="mt-6 text-center animate-fadeIn">
            <div className="flex flex-wrap items-center justify-center gap-2 text-[10px] text-lp-text3 font-light">
              <a href="#" className="hover:text-lp-text2 transition-colors">Terms</a>
              <span>·</span>
              <a href="#" className="hover:text-lp-text2 transition-colors">Privacy</a>
              <span>·</span>
              <a href="#" className="hover:text-lp-text2 transition-colors">Cookie</a>
            </div>
            <div className="flex items-center justify-center gap-1.5 mt-3">
              <div className="w-1 h-1 rounded-full bg-lp-accent/40" />
              <span className="text-[9px] font-mono text-lp-text3 tracking-[0.06em]">© 2025 Student Hub</span>
              <div className="w-1 h-1 rounded-full bg-lp-accent/40" />
            </div>
          </div>
        </div>

        {/* CHATBOT COMPONENT */}
        <Suspense fallback={null}>
          <Chatbot />
        </Suspense>

        {/* Logout Confirmation Modal */}
        {showLogoutConfirm && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-white border border-lp-border rounded-2xl p-7 max-w-sm w-full shadow-[0_24px_64px_rgba(0,0,0,0.1)] animate-scaleIn">
              <h3 className="text-lg font-semibold text-lp-text tracking-tight mb-2">Konfirmasi Logout</h3>
              <p className="text-[13px] text-lp-text2 font-light mb-6 leading-relaxed">
                Apakah Anda yakin ingin keluar dari akun Anda?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-3 px-4 border border-lp-border text-lp-text2 rounded-full hover:bg-lp-surface transition-all font-medium text-[13px]"
                >
                  Batal
                </button>
                <button
                  onClick={handleLogout}
                  className="flex-1 py-3 px-4 bg-lp-red text-white rounded-full hover:bg-red-700 hover:-translate-y-px transition-all font-semibold text-[13px] shadow-[0_4px_12px_rgba(220,38,38,0.2)]"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default DashboardLayout