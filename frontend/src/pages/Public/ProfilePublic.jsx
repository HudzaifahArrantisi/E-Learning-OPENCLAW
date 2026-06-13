// src/pages/Public/ProfilePublic.jsx
import React, { useState, useEffect, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'
import Sidebar from '../../components/Sidebar'
import PostDetailModal from '../../components/PostDetailModal'
import useAuth from '../../hooks/useAuth'
import { resolveBackendAssetUrl } from '../../utils/assetUrl'

// Icons
import { 
  FaHeart, 
  FaRegHeart, 
  FaComment, 
  FaPaperPlane, 
  FaBookmark, 
  FaRegBookmark,
  FaTimes,
  FaSmile,
  FaEllipsisH,
  FaImage,
  FaFileAlt,
  FaBars,
  FaChevronLeft,
  FaChevronRight
} from 'react-icons/fa'

const GridPostItem = ({ post, openPostModal, getMediaUrls, isImagePost, handlePostImageError }) => {
  const [currentSlide, setCurrentSlide] = useState(0)
  const urls = getMediaUrls(post)
  const isImage = isImagePost(post)
  
  const nextSlide = (e) => {
    e.stopPropagation()
    setCurrentSlide(prev => Math.min(prev + 1, urls.length - 1))
  }
  
  const prevSlide = (e) => {
    e.stopPropagation()
    setCurrentSlide(prev => Math.max(prev - 1, 0))
  }

  return (
    <div
      onClick={() => openPostModal(post)}
      className={`relative aspect-square group overflow-hidden ${
        isImage ? 'bg-lp-surface' : 'bg-lp-accentS'
      } rounded-xl border border-lp-border cursor-pointer hover:border-lp-borderA transition-all`}
    >
      {/* Content */}
      {isImage ? (
        <div className="w-full h-full relative select-none">
          {/* Carousel Track */}
          <div 
            className="flex transition-transform duration-300 ease-out w-full h-full"
            style={{ transform: `translateX(-${currentSlide * 100}%)` }}
          >
            {urls.map((url, idx) => (
              <div key={idx} className="w-full h-full flex-shrink-0">
                <img
                  src={resolveBackendAssetUrl(url)}
                  alt={`Post by ${post.author_name} - ${idx + 1}`}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  loading="lazy"
                  onError={handlePostImageError}
                  draggable={false}
                />
              </div>
            ))}
          </div>

          {/* Overlay ala Instagram Feed */}
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center backdrop-blur-[2px] pointer-events-none z-10">
            <div className="flex gap-6 text-white font-bold pointer-events-auto">
              <span className="flex items-center gap-2">
                <FaHeart /> {post.likes_count || 0}
              </span>
              <span className="flex items-center gap-2">
                <FaComment className="scale-x-[-1]" /> {post.comments_count || 0}
              </span>
            </div>
          </div>
          
          {urls.length > 1 && (
            <>
              {/* Multiple Images Icon Indicator */}
              <div className="absolute top-2 right-2 bg-black/30 backdrop-blur-md rounded-lg p-1.5 z-20 shadow-sm border border-white/10 pointer-events-none">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9l-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>

              {/* Navigation Arrows (Visible on Hover) */}
              {currentSlide > 0 && (
                <button 
                  onClick={prevSlide} 
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-sm text-black p-1.5 rounded-full z-30 hover:bg-white opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                >
                  <FaChevronLeft className="text-xs" />
                </button>
              )}
              {currentSlide < urls.length - 1 && (
                <button 
                  onClick={nextSlide} 
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-sm text-black p-1.5 rounded-full z-30 hover:bg-white opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                >
                  <FaChevronRight className="text-xs" />
                </button>
              )}

              {/* Dots */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1 z-30 pointer-events-none">
                {urls.map((_, idx) => (
                  <div 
                    key={idx} 
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      idx === currentSlide ? 'w-2.5 bg-white' : 'w-1.5 bg-white/50'
                    }`} 
                  />
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="w-full h-full p-4 sm:p-6 flex flex-col bg-white">
          <div className="mb-3 flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-lp-accent"></div>
             <span className="text-[10px] font-bold text-lp-text3 uppercase tracking-widest">Teks</span>
          </div>
          
          <div className="flex-1 overflow-hidden space-y-2">
            {post.title && (
              <h3 className="font-bold text-lp-text text-[15px] line-clamp-1 tracking-tight">
                {post.title}
              </h3>
            )}
            <p className="text-lp-text2 text-[12px] font-normal leading-relaxed line-clamp-5">
              {post.content}
            </p>
          </div>
          
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
              <div className="flex gap-3 text-lp-text3 text-[11px] font-bold">
                  <span>{post.likes_count || 0} Suka</span>
                  <span>{post.comments_count || 0} Komentar</span>
              </div>
              <div className="w-6 h-6 rounded-lg bg-lp-surface flex items-center justify-center opacity-40 group-hover:opacity-100 transition-opacity">
                  <FaFileAlt className="text-[10px] text-lp-text" />
              </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Helper untuk memproses media — support new post.media array + legacy media_url
const getMediaUrls = (mediaUrlOrPost) => {
  // If a post object with .media array is passed
  if (mediaUrlOrPost && typeof mediaUrlOrPost === 'object' && !Array.isArray(mediaUrlOrPost)) {
    if (Array.isArray(mediaUrlOrPost.media) && mediaUrlOrPost.media.length > 0) {
      // Even if the backend maps it to .media, if media_url is a JSON string, it needs parsing
      const rawUrl = mediaUrlOrPost.media[0].media_url
      if (typeof rawUrl === 'string' && (rawUrl.trim().startsWith('[') || rawUrl.trim().startsWith('{'))) {
         return getMediaUrls(rawUrl)
      }
      return mediaUrlOrPost.media.map(m => m.media_url)
    }
    // Fallback to .media_url
    return getMediaUrls(mediaUrlOrPost.media_url)
  }

  // Legacy: mediaUrl string or array
  const mediaUrl = mediaUrlOrPost
  if (!mediaUrl) return []
  if (Array.isArray(mediaUrl)) return mediaUrl
  
  if (typeof mediaUrl === 'string') {
    const trimmed = mediaUrl.trim()
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed)
        return Array.isArray(parsed) ? parsed : [parsed]
      } catch {
        return [trimmed]
      }
    }
    return [trimmed]
  }
  return []
}

// Check if post is image/content
const isImagePost = (post) => {
  if (!post) return false
  if (post.media_type === 'image') return true
  // Check new carousel media array
  if (Array.isArray(post.media) && post.media.length > 0) return true
  
  const urls = getMediaUrls(post.media_url)
  return urls.length > 0
}


const ProfilePublic = () => {
  const { user } = useAuth()
  const { role, username } = useParams()
  const navigate = useNavigate()
  const [userPosts, setUserPosts] = useState([])
  const [loadingPosts, setLoadingPosts] = useState(false)
  const [selectedPost, setSelectedPost] = useState(null)
  const [showPostModal, setShowPostModal] = useState(false)
  const [activeFilter, setActiveFilter] = useState('semua') // 'semua', 'foto', 'text'

  const filteredPosts = useMemo(() => {
    if (!userPosts.length) return []
    switch (activeFilter) {
      case 'foto':
        return userPosts.filter(post => isImagePost(post))
      case 'text':
        return userPosts.filter(post => !isImagePost(post))
      default:
        return userPosts
    }
  }, [activeFilter, userPosts])
  const [followState, setFollowState] = useState(null)
  const [followBusy, setFollowBusy] = useState(false)
  const [socialList, setSocialList] = useState(null)
  const [socialItems, setSocialItems] = useState([])
  const [socialLoading, setSocialLoading] = useState(false)

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['public-profile', role, username],
    queryFn: async () => {
      try {
        const res = await api.get(`/api/profile/public/${role}/${username}`)
        return res.data.data
      } catch (err) {
        throw new Error(err.response?.data?.message || 'Gagal memuat profil')
      }
    },
    retry: 2,
  })

  useEffect(() => {
    if (!user || !profile?.user_id) return
    api.getFollowStatus(profile.user_id)
      .then((res) => setFollowState(res.data.data))
      .catch(() => setFollowState(null))
  }, [user, profile?.user_id])

  const toggleFollow = async (targetId = profile?.user_id) => {
    if (!targetId || followBusy) return
    setFollowBusy(true)
    try {
      const isTargetProfile = Number(targetId) === Number(profile?.user_id)
      const currentlyFollowing = isTargetProfile
        ? followState?.is_following
        : socialItems.find((item) => Number(item.account.id) === Number(targetId))?.is_following
      const res = currentlyFollowing ? await api.unfollowUser(targetId) : await api.followUser(targetId)
      if (isTargetProfile) {
        setFollowState((current) => ({ ...current, ...res.data.data }))
      }
      setSocialItems((items) => items.map((item) => (
        Number(item.account.id) === Number(targetId)
          ? { ...item, is_following: !currentlyFollowing }
          : item
      )))
    } finally {
      setFollowBusy(false)
    }
  }

  const openSocialList = async (type) => {
    if (!user || !profile?.user_id) return
    setSocialList(type)
    setSocialLoading(true)
    try {
      const res = type === 'followers'
        ? await api.getFollowers(profile.user_id)
        : await api.getFollowing(profile.user_id)
      setSocialItems(res.data.data?.items || [])
    } catch {
      setSocialItems([])
    } finally {
      setSocialLoading(false)
    }
  }

  useEffect(() => {
    if (!profile || role === 'mahasiswa') return

    const fetchPosts = async () => {
      setLoadingPosts(true)
      try {
        const res = await api.get(`/api/profile/public/${role}/${username}/posts`)
        console.log('Posts data from API:', res.data.data)
        
        const postsData = res.data.data || []
        setUserPosts(postsData)
      } catch (err) {
        console.log('Fallback to feed filtering...', err)
        try {
          const feed = await api.get('/api/feed')
          const feedData = feed.data.data || []
          
          const filtered = feedData.filter(p => {
            const authorUsername = p.author_username || ''
            const authorName = p.author_name || ''
            const cleanAuthorUsername = authorUsername.toLowerCase().replace(/^ormawa_/, '').replace(/^ukm_/, '').replace(/^admin_/, '')
            const cleanParamUsername = username.toLowerCase().replace(/^ormawa_/, '').replace(/^ukm_/, '').replace(/^admin_/, '')
            
            return (
              p.role === role &&
              (cleanAuthorUsername === cleanParamUsername ||
               authorUsername.toLowerCase() === username.toLowerCase() ||
               authorName.toLowerCase().replace(/\s+/g, '_') === username.toLowerCase())
            )
          })
          
          console.log('Filtered posts from feed:', filtered)
          setUserPosts(filtered)
        } catch {
          setUserPosts([])
        }
      } finally {
        setLoadingPosts(false)
      }
    }

    fetchPosts()
  }, [profile, role, username])





  // Fungsi untuk mendapatkan URL gambar yang benar
  const getImageUrl = (mediaUrl) => {
    const urls = getMediaUrls(mediaUrl)
    return urls.length > 0 ? resolveBackendAssetUrl(urls[0]) : null
  }

  // Fungsi untuk handle error gambar profil
  const handleProfileImageError = (e) => {
    e.target.style.display = 'none'
    const placeholder = e.target.nextSibling
    if (placeholder) {
      placeholder.style.display = 'flex'
    }
  }

  // Fungsi untuk handle error gambar post
  const handlePostImageError = (e) => {
    e.target.style.display = 'none'
    const placeholder = e.target.nextSibling
    if (placeholder) {
      placeholder.style.display = 'flex'
    }
  }

  // Fungsi untuk membuka modal postingan
  const openPostModal = async (post) => {
    try {
      // Ambil data post lengkap termasuk komentar
      const postRes = await api.get(`/api/post/${post.id}`)
      const fullPostData = postRes.data.data
      
      // Preserve media array from original post if API doesn't include it
      if (!fullPostData.media && post.media) {
        fullPostData.media = post.media
      }
      
      setSelectedPost(fullPostData)
      setShowPostModal(true)
    } catch (error) {
      console.error('Gagal mengambil detail post:', error)
      // Fallback ke data post dasar jika gagal
      setSelectedPost(post)
      setShowPostModal(true)
    }
  }



  // Fungsi utility
  const getRoleDisplay = (role) => {
    switch (role) {
      case 'admin': return 'Administrator'
      case 'ormawa': return 'Organisasi Mahasiswa'
      case 'ukm': return 'Unit Kegiatan Mahasiswa'
      default: return 'User'
    }
  }

  const getRelativeTime = (dateString) => {
    if (!dateString) return 'Beberapa waktu lalu'
    
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now - date) / 1000)
    
    if (diffInSeconds < 60) return 'baru saja'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} menit lalu`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} jam lalu`
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} hari lalu`
    
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }



  const getFeedPath = () => {
    if (!user?.role) return '/'
    const roleHome = {
      admin: '/admin',
      dosen: '/dosen',
      mahasiswa: '/mahasiswa',
      orangtua: '/ortu',
      ukm: '/ukm',
      ormawa: '/ormawa',
    }
    return roleHome[user.role] || '/'
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-lp-bg font-sans font-light">
        {user && <Sidebar role={user.role} />}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center"><div className="w-10 h-10 border-2 border-lp-border border-t-lp-accent rounded-full animate-spin mx-auto mb-3" /><p className="text-lp-text2 text-sm font-light">Memuat profil...</p></div>
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="flex min-h-screen bg-lp-bg font-sans font-light">
        {user && <Sidebar role={user.role} />}
        <div className="flex-1 max-w-2xl mx-auto p-8">
          <div className="bg-lp-surface border border-lp-border rounded-2xl p-12 text-center shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
            <div className="w-16 h-16 mx-auto mb-5 bg-lp-red/8 rounded-2xl flex items-center justify-center"><span className="text-3xl">❌</span></div>
            <h1 className="text-2xl font-semibold text-lp-text tracking-tight mb-3">Profile Tidak Ditemukan</h1>
            <p className="text-[13px] text-lp-text2 font-light mb-4">{error ? error.message : 'Pastikan username dan role benar'}</p>
            <button 
              onClick={() => navigate(getFeedPath())} 
              className="mt-4 bg-lp-text text-white px-6 py-3 rounded-full text-[13px] font-semibold hover:bg-lp-atext hover:-translate-y-px transition-all"
            >
              Kembali ke Feed
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-[#fafafa] font-sans">
      {user && <Sidebar role={user.role} />}
      
      {/* Main Content - Diperbaiki untuk responsif */}
      <div className="flex-1 w-full relative">
        {/* Mobile Navbar - Hanya muncul di mobile (lg:hidden) */}
        <div className="lg:hidden sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-lp-border px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {user && (
              <button 
                onClick={() => window.dispatchEvent(new CustomEvent('nf-sidebar-toggle'))}
                className="p-2 hover:bg-lp-surface rounded-xl transition-all text-lp-text2"
                aria-label="Menu"
              >
                <FaBars className="text-lg" />
              </button>
            )}
            
            <Link to="/" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-lp-accentS border border-lp-borderA flex items-center justify-center">
                <svg className="w-3.5 h-3.5 stroke-lp-accent fill-none stroke-2 [stroke-linecap:round]" viewBox="0 0 24 24">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5-10-5z" />
                  <path d="M6 12v5c3.33 1.67 8.67 1.67 12 0v-5" />
                </svg>
              </div>
              <span className="text-[11px] font-bold text-lp-text tracking-wider">HUB</span>
            </Link>
          </div>

          {user && (
            <Link to={`/${user.role}`} className="w-8 h-8 rounded-full bg-lp-surface border border-lp-border flex items-center justify-center overflow-hidden">
               {user.profile_picture ? (
                 <img src={resolveBackendAssetUrl(user.profile_picture)} alt="Me" className="w-full h-full object-cover" />
               ) : (
                 <span className="text-[10px] font-bold text-lp-text3">{user.name?.[0]?.toUpperCase()}</span>
               )}
            </Link>
          )}
        </div>

        {/* Header Profil Premium */}
        <header className="bg-white border-b border-lp-border relative overflow-hidden">
          <button
            onClick={() => navigate(getFeedPath())}
            className="absolute top-3 left-3 sm:top-4 sm:left-6 z-30 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur border border-lp-border text-[11px] font-semibold text-lp-text2 hover:text-lp-text hover:bg-white transition-all"
          >
            <FaChevronLeft className="text-[9px]" />
            Kembali ke Feed
          </button>

          {/* Enhanced Banner */}
          <div className="h-32 sm:h-48 lg:h-64 bg-lp-accentS relative w-full overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-lp-accent/20 to-lp-surface/40 z-0"></div>
            <div className="absolute inset-0 opacity-[0.03] z-0" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, black 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent z-10"></div>
          </div>
          
          <div className="max-w-4xl mx-auto px-4 sm:px-8 relative z-20">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 sm:gap-10 -mt-16 sm:-mt-24 pb-8">
              {/* Foto Profil with premium border */}
              <div className="relative group">
                <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-4 border-white overflow-hidden shadow-xl bg-white relative z-20 transition-transform duration-500 hover:scale-[1.02]">
                  <div className="w-full h-full bg-lp-surface relative">
                    {profile.profile_picture ? (
                      <>
                        <img
                          src={getImageUrl(profile.profile_picture)}
                          alt={profile.name}
                          className="w-full h-full object-cover"
                          onError={handleProfileImageError}
                        />
                        <div 
                          className="absolute inset-0 hidden items-center justify-center bg-lp-surface"
                          style={{ display: 'none' }}
                        >
                          <div className="text-4xl font-bold text-lp-text3">
                            {profile.name?.[0]?.toUpperCase() || 'U'}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-lp-text3 bg-gradient-to-br from-lp-accentS to-lp-surface">
                        {profile.name?.[0]?.toUpperCase() || 'U'}
                      </div>
                    )}
                  </div>
                </div>
                {/* Decorative ring */}
                <div className="absolute -inset-1 bg-gradient-to-tr from-lp-accent/30 to-transparent rounded-full z-10 blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              </div>

              {/* Info Profil */}
              <div className="text-center sm:text-left flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                  <h1 className="text-2xl sm:text-3xl font-bold text-lp-text tracking-tight">{profile.name}</h1>
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <span className="px-3 py-1 bg-lp-accent/10 text-lp-accent text-[10px] font-bold tracking-wider uppercase rounded-lg border border-lp-accent/20">
                      {getRoleDisplay(role)}
                    </span>
                    {user && Number(user.id) === Number(profile.user_id) && (
                      <>
                        {role === 'mahasiswa' ? (
                          <Link 
                            to="/mahasiswa/profile"
                            className="px-4 py-1.5 bg-lp-surface border border-lp-border rounded-lg text-[12px] font-semibold text-lp-text hover:bg-white transition-all"
                          >
                            Edit Profil
                          </Link>
                        ) : (
                          <>
                            <Link 
                              to={`/${role}/setting-profile`}
                              className="px-4 py-1.5 bg-lp-surface border border-lp-border rounded-lg text-[12px] font-semibold text-lp-text hover:bg-white transition-all"
                            >
                              Edit Profil
                            </Link>
                            <Link
                              to={`/${role}/posting`}
                              className="px-4 py-1.5 bg-lp-text text-white rounded-lg text-[12px] font-semibold hover:bg-lp-atext transition-all"
                            >
                              Buat Postingan
                            </Link>
                          </>
                        )}
                      </>
                    )}
                    {role !== 'mahasiswa' && user && followState && !followState.is_own_account && (
                      <button
                        type="button"
                        disabled={followBusy}
                        onClick={() => toggleFollow()}
                        className={`px-5 py-1.5 rounded-lg text-[12px] font-semibold transition-all disabled:opacity-60 ${
                          followState.is_following
                            ? 'bg-lp-surface border border-lp-border text-lp-text'
                            : 'bg-lp-accent text-white hover:bg-lp-atext'
                        }`}
                      >
                        {followBusy ? 'Memproses...' : followState.is_following ? 'Following' : 'Follow'}
                      </button>
                    )}
                  </div>
                </div>
                
                {role !== 'mahasiswa' && (
                  <div className="flex items-center justify-center sm:justify-start gap-6 mb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                      <span className="font-bold text-lg text-lp-text">{userPosts.length}</span>
                      <span className="text-lp-text3 text-[12px] uppercase tracking-wide">Postingan</span>
                    </div>
                    <button type="button" onClick={() => openSocialList('followers')} className="flex flex-col sm:flex-row sm:items-center sm:gap-2 cursor-pointer hover:opacity-70 transition-opacity">
                      <span className="font-bold text-lg text-lp-text">{followState?.followers_count ?? profile.followers_count ?? 0}</span>
                      <span className="text-lp-text3 text-[12px] uppercase tracking-wide">Pengikut</span>
                    </button>
                    <button type="button" onClick={() => openSocialList('following')} className="flex flex-col sm:flex-row sm:items-center sm:gap-2 cursor-pointer hover:opacity-70 transition-opacity">
                      <span className="font-bold text-lg text-lp-text">{followState?.following_count ?? profile.following_count ?? 0}</span>
                      <span className="text-lp-text3 text-[12px] uppercase tracking-wide">Mengikuti</span>
                    </button>
                  </div>
                )}

                <div className="space-y-1">
                  <p className="text-lp-text3 text-[13px] font-medium">@{profile.username}</p>
                  {role === 'mahasiswa' && profile.nim && (
                    <p className="text-lp-text text-[14px] font-mono leading-relaxed max-w-lg mx-auto sm:mx-0 py-1">
                      NIM: {profile.nim}
                    </p>
                  )}
                  {role !== 'mahasiswa' && profile.bio && (
                    <p className="text-lp-text2 text-[14px] leading-relaxed max-w-lg mx-auto sm:mx-0 py-1">
                      {profile.bio}
                    </p>
                  )}
                  {role !== 'mahasiswa' && profile.website && (
                    <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-lp-accent text-[13px] font-semibold hover:underline block w-fit mx-auto sm:mx-0">
                      {profile.website.replace(/^https?:\/\//, '')}
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {role !== 'mahasiswa' && (
          <>
            {/* Filter Tabs - Premium Glass Effect */}
            <div className="max-w-4xl mx-auto px-4 sm:px-8 mt-6">
              <div className="flex justify-center border-t border-lp-border">
                <div className="flex gap-12 sm:gap-16">
                  <button
                    onClick={() => setActiveFilter('semua')}
                    className={`py-4 flex items-center gap-2 text-[12px] font-bold uppercase tracking-widest transition-all ${
                      activeFilter === 'semua'
                        ? 'text-lp-text border-t-2 border-lp-text -mt-[2px]'
                        : 'text-lp-text3 hover:text-lp-text2'
                    }`}
                  >
                    <FaEllipsisH className="text-[10px]" />
                    <span>Postingan</span>
                  </button>
                  <button
                    onClick={() => setActiveFilter('foto')}
                    className={`py-4 flex items-center gap-2 text-[12px] font-bold uppercase tracking-widest transition-all ${
                      activeFilter === 'foto'
                        ? 'text-lp-text border-t-2 border-lp-text -mt-[2px]'
                        : 'text-lp-text3 hover:text-lp-text2'
                    }`}
                  >
                    <FaImage className="text-[10px]" />
                    <span>Foto</span>
                  </button>
                  <button
                    onClick={() => setActiveFilter('text')}
                    className={`py-4 flex items-center gap-2 text-[12px] font-bold uppercase tracking-widest transition-all ${
                      activeFilter === 'text'
                        ? 'text-lp-text border-t-2 border-lp-text -mt-[2px]'
                        : 'text-lp-text3 hover:text-lp-text2'
                    }`}
                  >
                    <FaFileAlt className="text-[10px]" />
                    <span>Teks</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Grid Postingan - Diperbaiki untuk responsif */}
            <div className="max-w-4xl mx-auto p-3 sm:p-4">
              {loadingPosts ? (
                <div className="text-center py-8 sm:py-12">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 border-2 border-lp-border border-t-lp-accent rounded-full animate-spin mx-auto"></div>
                  <p className="text-lp-text2 mt-3 text-sm font-light">Memuat postingan...</p>
                </div>
              ) : filteredPosts.length === 0 ? (
                <div className="text-center py-12 sm:py-16 text-lp-text2">
                  <div className="text-4xl sm:text-5xl mb-3">
                    {activeFilter === 'foto' ? '📷' : activeFilter === 'text' ? '📄' : '📭'}
                  </div>
                  <p className="text-base sm:text-lg font-medium">
                    {activeFilter === 'semua' 
                      ? 'Belum ada postingan' 
                      : activeFilter === 'foto' 
                      ? 'Belum ada postingan foto' 
                      : 'Belum ada postingan teks'}
                  </p>
                  <p className="text-xs sm:text-sm mt-1">
                    {activeFilter === 'semua' 
                      ? 'User ini belum membuat postingan apapun' 
                      : `Tidak ada postingan ${activeFilter} dari user ini`}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 sm:gap-2 md:gap-3">
                  {filteredPosts.map((post) => (
                    <GridPostItem 
                      key={post.id} 
                      post={post} 
                      openPostModal={openPostModal} 
                      getMediaUrls={getMediaUrls} 
                      isImagePost={isImagePost} 
                      handlePostImageError={handlePostImageError} 
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {showPostModal && selectedPost && (
        <PostDetailModal
          post={selectedPost}
          onClose={() => setShowPostModal(false)}
          getRelativeTime={getRelativeTime}
        />
      )}
      {socialList && (
        <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4" onClick={() => setSocialList(null)}>
          <div className="w-full max-w-md max-h-[70vh] overflow-hidden bg-white rounded-2xl shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="px-5 py-4 border-b border-lp-border flex items-center justify-between">
              <h2 className="font-bold text-lp-text">{socialList === 'followers' ? 'Pengikut' : 'Mengikuti'}</h2>
              <button type="button" onClick={() => setSocialList(null)} className="p-2 text-lp-text3 hover:text-lp-text"><FaTimes /></button>
            </div>
            <div className="overflow-y-auto max-h-[58vh] divide-y divide-lp-border">
              {socialLoading ? (
                <p className="p-8 text-center text-sm text-lp-text3">Memuat...</p>
              ) : socialItems.length === 0 ? (
                <p className="p-8 text-center text-sm text-lp-text3">Belum ada akun.</p>
              ) : socialItems.map(({ account, is_following: isFollowing }) => (
                <div key={account.id} className="p-4 flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full overflow-hidden bg-lp-surface flex items-center justify-center font-bold text-lp-text3">
                    {account.profile_picture ? <img src={resolveBackendAssetUrl(account.profile_picture)} alt="" className="w-full h-full object-cover" /> : account.name?.[0]?.toUpperCase()}
                  </div>
                  <Link to={`/profile/${account.role}/${account.username}`} onClick={() => setSocialList(null)} className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-lp-text truncate">{account.name}</p>
                    <p className="text-xs text-lp-text3 truncate">@{account.username} · {account.role}</p>
                  </Link>
                  {Number(account.id) !== Number(user?.id) && (
                    <button type="button" disabled={followBusy} onClick={() => toggleFollow(account.id)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${isFollowing ? 'border border-lp-border bg-lp-surface text-lp-text' : 'bg-lp-accent text-white'}`}>
                      {isFollowing ? 'Unfollow' : 'Follow'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
  </div>
  );
}

export default ProfilePublic
