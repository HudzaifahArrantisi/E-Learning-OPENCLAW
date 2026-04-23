// src/components/DashboardLayout.jsx
import React, { useEffect, useState } from 'react'
import { useQuery } from "@tanstack/react-query"
import { useNavigate, Link } from 'react-router-dom'
import api from '../services/api'
import Sidebar from './Sidebar'
import useAuth from '../hooks/useAuth'
import PostCard from './PostCard'
import { 
  FaBars, FaSignOutAlt, FaClock, FaPaperclip,
  FaChevronRight, FaUsers, FaTimes
} from 'react-icons/fa'
import { MdOutlineSchool } from 'react-icons/md'
import { BsPeopleFill } from 'react-icons/bs'
import { getProfilePhotoUrl, getInitials, cleanUsername } from '../utils/profileUtils'
import { resolveBackendAssetUrl } from '../utils/assetUrl'
import Loading from './Loading'

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

const getDaysRemaining = (dateString) => {
  if (!dateString) return null
  const now = new Date()
  const due = new Date(dateString)
  const diffTime = due - now
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays <= 0) return null
  return `${diffDays} hari lagi`
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

  useEffect(() => {
    if (!showAccountsDropdown) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [showAccountsDropdown])

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
    gcTime: 60 * 60 * 1000,
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

  const { data: recommendations } = useQuery({
    queryKey: ['public-recommendations'],
    queryFn: () => api.get('/api/public/recommendations').then(res => res.data?.data || { ormawa: [], ukm: [] }),
    staleTime: 5 * 60 * 1000,
    enabled: !isLoading,
  })

  if (isLoading) {
    return <Loading />
  }

  const organizations = recommendations?.ormawa || []
  const suggestedUKM = recommendations?.ukm || []

  const profileUsername = cleanUsername(profile?.username || user?.username || user?.name || 'user')
  const profileName = profile?.name || user?.name || 'User'
  const profileEmail = profile?.email || user?.email || ''
  const profilePhoto = profile?.profile_picture || profile?.photo || user?.profile_picture || user?.photo || ''

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
          <div className="sticky top-0 bg-white/85 backdrop-blur-md border-b border-lp-border z-20">
            <div className="px-4 py-2 flex items-center justify-between">
              {/* Left Side: Mobile Menu Button & Logo */}
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden p-1.5 hover:bg-lp-surface rounded-lg transition-colors"
                >
                  <FaBars className="text-base text-lp-text2" />
                </button>

                {/* Logo */}
                <Link to="/" className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-lp-accentS border border-lp-borderA flex items-center justify-center">
                    <svg className="w-3 h-3 stroke-lp-accent fill-none stroke-2 [stroke-linecap:round]" viewBox="0 0 24 24">
                      <path d="M22 10v6M2 10l10-5 10 5-10 5-10-5z" />
                      <path d="M6 12v5c3.33 1.67 8.67 1.67 12 0v-5" />
                    </svg>
                  </div>
                  <span className="text-[12px] font-bold text-lp-text tracking-[0.05em] hidden sm:inline">STUDENT-HUB</span>
                </Link>
              </div>

              {/* Right Side: Profile Info & Mobile Logout */}
              <div className="flex items-center gap-3 lg:hidden">
                <Link to={`/${role}/profile`} className="flex items-center gap-2">
                  <div className="flex flex-col items-end">
                    <span className="text-[12px] font-semibold text-lp-text leading-tight max-w-[100px] truncate">{profileName}</span>
                    <span className="text-[10px] text-lp-text3 font-mono hidden sm:block">@{profileUsername}</span>
                  </div>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs overflow-hidden border border-lp-border flex-shrink-0">
                    {profilePhoto ? (
                      <img 
                        src={getProfilePhotoUrl(profilePhoto)} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div 
                      className={`w-full h-full bg-lp-accentS flex items-center justify-center text-lp-atext font-bold ${profilePhoto ? 'hidden' : 'flex'}`}
                    >
                      {getInitials(profileName)}
                    </div>
                  </div>
                </Link>
                <button 
                  onClick={() => setShowLogoutConfirm(true)}
                  className="p-1.5 text-lp-red/80 hover:text-white hover:bg-lp-red rounded-lg transition-colors border border-transparent hover:border-lp-red/20"
                  title="Keluar"
                >
                  <FaSignOutAlt className="text-[14px]" />
                </button>
              </div>
            </div>

            {/* Role Filter Tabs */}
            <div className="flex overflow-x-auto scrollbar-hide">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-shrink-0 px-4 py-2.5 text-[11px] font-medium transition-all duration-200 relative uppercase tracking-wider ${
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
                onClick={() => setShowAccountsDropdown(true)}
                className="w-full flex items-center justify-between px-4 py-1.5 hover:bg-lp-surface/50 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-lp-accentS flex items-center justify-center">
                    <FaUsers className="text-lp-accent text-xs" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-[12px] text-lp-text">Rekomendasi Akun</div>
                    <div className="text-[10px] text-lp-text3 font-light">Temukan ormawa & UKM</div>
                  </div>
                </div>
                <FaChevronRight className="text-lp-text3 text-xs" />
              </button>
            </div>
          </div>

          {/* Mobile Recommendations Side Panel */}
          <div
            className={`lg:hidden fixed inset-0 z-40 transition-opacity duration-300 ${
              showAccountsDropdown ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
          >
            <button
              type="button"
              aria-label="Tutup rekomendasi akun"
              onClick={() => setShowAccountsDropdown(false)}
              className="absolute inset-0 bg-black/35 backdrop-blur-[2px]"
            />

            <div
              className={`absolute inset-y-0 right-0 w-[88%] max-w-sm bg-white border-l border-lp-border shadow-[0_20px_60px_rgba(0,0,0,0.2)] transform transition-transform duration-300 ease-out ${
                showAccountsDropdown ? 'translate-x-0' : 'translate-x-full'
              }`}
            >
              <div className="h-full flex flex-col">
                <div className="px-4 py-4 border-b border-lp-border bg-white/95 backdrop-blur">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-[14px] font-semibold text-lp-text">Rekomendasi Akun</h3>
                      <p className="text-[11px] text-lp-text3">Temukan ormawa & UKM</p>
                    </div>
                    <button
                      onClick={() => setShowAccountsDropdown(false)}
                      className="p-2 text-lp-text3 hover:text-lp-text hover:bg-lp-surface rounded-xl transition-colors"
                    >
                      <FaTimes className="text-sm" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-lp-surface p-1 rounded-xl">
                    <button
                      onClick={() => setActiveAccountTab('ormawa')}
                      className={`py-2 text-[12px] font-semibold flex items-center justify-center gap-1.5 rounded-lg transition-all ${
                        activeAccountTab === 'ormawa'
                          ? 'bg-white text-lp-atext shadow-sm'
                          : 'text-lp-text3 hover:text-lp-text'
                      }`}
                    >
                      <MdOutlineSchool className="text-sm" />
                      <span>Ormawa</span>
                    </button>
                    <button
                      onClick={() => setActiveAccountTab('ukm')}
                      className={`py-2 text-[12px] font-semibold flex items-center justify-center gap-1.5 rounded-lg transition-all ${
                        activeAccountTab === 'ukm'
                          ? 'bg-white text-lp-atext shadow-sm'
                          : 'text-lp-text3 hover:text-lp-text'
                      }`}
                    >
                      <BsPeopleFill className="text-sm" />
                      <span>UKM</span>
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                  {(activeAccountTab === 'ormawa' ? organizations : suggestedUKM).slice(0, 8).map((account) => (
                    <Link
                      key={account.id}
                      to={`/profile/${account.type}/${cleanUsername(account.username || account.name)}`}
                      onClick={() => setShowAccountsDropdown(false)}
                      className="flex items-center gap-3 p-3 rounded-xl border border-transparent hover:bg-lp-surface hover:border-lp-border transition-all duration-200"
                    >
                      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center font-bold text-sm overflow-hidden shrink-0 ${
                        activeAccountTab === 'ormawa'
                          ? 'bg-lp-accentS border-lp-borderA text-lp-atext'
                          : 'bg-lp-green/10 border-lp-green/20 text-lp-green'
                      }`}>
                        {account.profile_picture ? (
                          <img src={resolveBackendAssetUrl(account.profile_picture)} alt={account.name} className="w-full h-full object-cover" />
                        ) : (
                          account.name?.[0]?.toUpperCase() || (activeAccountTab === 'ormawa' ? 'O' : 'U')
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-lp-text text-[13px] truncate">{account.name}</div>
                        <div className="text-lp-text3 text-[11px] font-light">
                          {activeAccountTab === 'ormawa' ? 'Organisasi Mahasiswa' : 'Unit Kegiatan Mahasiswa'}
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold text-lp-text bg-white border border-lp-border px-2.5 py-1 rounded-full">
                        Detail
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
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
                            <h3 className="text-[20px] font-bold text-lp-text tracking-tight">{task.title}</h3>
                            <p className="text-[14px] text-lp-text2 font-bold mt-1">{task.course_name} • Pertemuan {task.pertemuan}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                            {task.is_overdue ? (
                              <span className="text-[10px] font-mono font-medium px-3 py-1 rounded-full bg-lp-red/8 text-lp-red tracking-wider uppercase">Terlambat</span>
                            ) : (
                              <>
                                <span className="text-[10px] font-mono font-medium px-3 py-1 rounded-full bg-lp-green/8 text-lp-green tracking-wider uppercase">Aktif</span>
                                {task.due_date && getDaysRemaining(task.due_date) && (
                                  <span className="text-[10px] text-lp-text3 font-medium font-mono uppercase tracking-tight">
                                    {getDaysRemaining(task.due_date)}
                                  </span>
                                )}
                              </>
                            )}
                          </div>
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
                {profilePhoto ? (
                  <img 
                    src={getProfilePhotoUrl(profilePhoto)} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div 
                  className={`w-full h-full bg-lp-accentS rounded-2xl flex items-center justify-center text-lp-atext font-bold ${profilePhoto ? 'hidden' : 'flex'}`}
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
                    <div className="w-9 h-9 bg-lp-accentS border border-lp-borderA rounded-xl flex items-center justify-center text-lp-atext font-bold text-xs overflow-hidden shrink-0">
                      {org.profile_picture ? (
                        <img src={resolveBackendAssetUrl(org.profile_picture)} alt={org.name} className="w-full h-full object-cover" />
                      ) : (
                        org.name?.[0]?.toUpperCase() || 'O'
                      )}
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
                    <div className="w-9 h-9 bg-lp-green/10 border border-lp-green/20 rounded-xl flex items-center justify-center text-lp-green font-bold text-xs overflow-hidden shrink-0">
                      {ukm.profile_picture ? (
                        <img src={resolveBackendAssetUrl(ukm.profile_picture)} alt={ukm.name} className="w-full h-full object-cover" />
                      ) : (
                        ukm.name?.[0]?.toUpperCase() || 'U'
                      )}
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
