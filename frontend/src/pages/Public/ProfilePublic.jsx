// src/pages/Public/ProfilePublic.jsx
import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'
import Sidebar from '../../components/Sidebar'
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

const ProfilePublic = () => {
  const { user } = useAuth()
  const { role, username } = useParams()
  const navigate = useNavigate()
  const [userPosts, setUserPosts] = useState([])
  const [loadingPosts, setLoadingPosts] = useState(false)
  const [selectedPost, setSelectedPost] = useState(null)
  const [showPostModal, setShowPostModal] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [isCommenting, setIsCommenting] = useState(false)
  const [localComments, setLocalComments] = useState([])
  const [activeFilter, setActiveFilter] = useState('semua') // 'semua', 'foto', 'text'
  const [filteredPosts, setFilteredPosts] = useState([])

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
    if (!profile) return

    const fetchPosts = async () => {
      setLoadingPosts(true)
      try {
        const res = await api.get(`/api/profile/public/${role}/${username}/posts`)
        console.log('Posts data from API:', res.data.data)
        
        const postsData = res.data.data || []
        setUserPosts(postsData)
        setFilteredPosts(postsData)
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
          setFilteredPosts(filtered)
        } catch (e) {
          console.error('Gagal ambil postingan', e)
          setUserPosts([])
          setFilteredPosts([])
        }
      } finally {
        setLoadingPosts(false)
      }
    }

    fetchPosts()
  }, [profile, role, username])

  // Helper untuk memproses media — support new post.media array + legacy media_url
  const getMediaUrls = (mediaUrlOrPost) => {
    // If a post object with .media array is passed
    if (mediaUrlOrPost && typeof mediaUrlOrPost === 'object' && !Array.isArray(mediaUrlOrPost)) {
      if (Array.isArray(mediaUrlOrPost.media) && mediaUrlOrPost.media.length > 0) {
        return mediaUrlOrPost.media.map(m => m.media_url)
      }
      // Fallback to .media_url
      const url = mediaUrlOrPost.media_url
      if (!url) return []
      return [url]
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
        } catch (e) {
          return [trimmed]
        }
      }
      return [trimmed]
    }
    return []
  }

  // Filter posts berdasarkan tipe
  useEffect(() => {
    if (!userPosts.length) {
      setFilteredPosts([])
      return
    }

    switch (activeFilter) {
      case 'foto':
        setFilteredPosts(userPosts.filter(post => isImagePost(post)))
        break
      case 'text':
        setFilteredPosts(userPosts.filter(post => !isImagePost(post)))
        break
      default:
        setFilteredPosts(userPosts)
    }
  }, [activeFilter, userPosts])

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
      
      setSelectedPost(fullPostData)
      setLocalComments(fullPostData.comments || [])
      setShowPostModal(true)
    } catch (error) {
      console.error('Gagal mengambil detail post:', error)
      // Fallback ke data post dasar jika gagal
      setSelectedPost(post)
      setLocalComments([])
      setShowPostModal(true)
    }
  }

  // Fungsi untuk menambah komentar
  const handleAddComment = async (e) => {
    e.preventDefault()
    if (!commentText.trim() || !selectedPost || isCommenting) return

    setIsCommenting(true)
    const tempComment = {
      id: Date.now(), // temporary ID
      content: commentText.trim(),
      author_name: user?.name || 'Anda',
      user_role: user?.role || 'mahasiswa',
      created_at: new Date().toISOString(),
      replies: []
    }

    try {
      // Optimistically update UI
      setLocalComments(prev => [tempComment, ...prev])
      setCommentText('')

      // Send to backend
      await api.post(`/api/post/${selectedPost.id}/comment`, {
        content: commentText.trim()
      })

      // Refresh comments from server
      const postRes = await api.get(`/api/post/${selectedPost.id}`)
      setLocalComments(postRes.data.data.comments || [])
      
    } catch (error) {
      console.error('Gagal menambah komentar:', error)
      // Remove optimistic update on error
      setLocalComments(prev => prev.filter(comment => comment.id !== tempComment?.id))
      alert('Gagal menambah komentar')
    } finally {
      setIsCommenting(false)
    }
  }

  // Fungsi untuk like post
  const handleLikePost = async () => {
    if (!selectedPost) return

    const originalLiked = selectedPost.user_has_liked
    const originalLikesCount = selectedPost.likes_count || 0

    try {
      // Optimistically update UI
      setSelectedPost(prev => ({
        ...prev,
        user_has_liked: !prev.user_has_liked,
        likes_count: prev.user_has_liked ? prev.likes_count - 1 : prev.likes_count + 1
      }))

      // Update in posts list
      setUserPosts(prev => prev.map(post => 
        post.id === selectedPost.id 
          ? { 
              ...post, 
              user_has_liked: !post.user_has_liked,
              likes_count: post.user_has_liked ? post.likes_count - 1 : post.likes_count + 1
            }
          : post
      ))

      // Send to backend
      await api.post(`/api/post/${selectedPost.id}/like`)

    } catch (error) {
      console.error('Gagal like post:', error)
      // Revert optimistic update on error
      setSelectedPost(prev => ({
        ...prev,
        user_has_liked: originalLiked,
        likes_count: originalLikesCount
      }))
    }
  }

  // Fungsi untuk save post
  const handleSavePost = async () => {
    if (!selectedPost) return

    const originalSaved = selectedPost.user_has_saved

    try {
      // Optimistically update UI
      setSelectedPost(prev => ({
        ...prev,
        user_has_saved: !prev.user_has_saved
      }))

      // Send to backend
      await api.post(`/api/post/${selectedPost.id}/save`)

    } catch (error) {
      console.error('Gagal save post:', error)
      // Revert optimistic update on error
      setSelectedPost(prev => ({
        ...prev,
        user_has_saved: originalSaved
      }))
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

  // Clean username untuk link
  const cleanUsername = (username) => {
    if (!username) return ''
    return username.toLowerCase()
      .replace(/^ormawa_/, '')
      .replace(/^ukm_/, '')
      .replace(/^admin_/, '')
      .trim()
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

  // Truncate text for preview
  const truncateText = (text, maxLength = 100) => {
    if (!text) return ''
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
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
                  </div>
                </div>
                
                <div className="flex items-center justify-center sm:justify-start gap-6 mb-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                    <span className="font-bold text-lg text-lp-text">{userPosts.length}</span>
                    <span className="text-lp-text3 text-[12px] uppercase tracking-wide">Postingan</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2 cursor-pointer hover:opacity-70 transition-opacity">
                    <span className="font-bold text-lg text-lp-text">{profile.followers_count || 0}</span>
                    <span className="text-lp-text3 text-[12px] uppercase tracking-wide">Pengikut</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2 cursor-pointer hover:opacity-70 transition-opacity">
                    <span className="font-bold text-lg text-lp-text">{profile.following_count || 0}</span>
                    <span className="text-lp-text3 text-[12px] uppercase tracking-wide">Mengikuti</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-lp-text3 text-[13px] font-medium">@{profile.username}</p>
                  {profile.bio && (
                    <p className="text-lp-text2 text-[14px] leading-relaxed max-w-lg mx-auto sm:mx-0 py-1">
                      {profile.bio}
                    </p>
                  )}
                  {profile.website && (
                    <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-lp-accent text-[13px] font-semibold hover:underline block w-fit mx-auto sm:mx-0">
                      {profile.website.replace(/^https?:\/\//, '')}
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>


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
              {filteredPosts.map((post) => {
                const urls = getMediaUrls(post)
                const imageUrl = urls.length > 0 ? resolveBackendAssetUrl(urls[0]) : null
                const isImage = isImagePost(post)

                return (
                  <div
                    key={post.id}
                    onClick={() => openPostModal(post)}
                    className={`relative aspect-square group overflow-hidden ${
                      isImage ? 'bg-lp-surface' : 'bg-lp-accentS'
                    } rounded-xl border border-lp-border cursor-pointer hover:border-lp-borderA transition-all`}
                  >
                    {/* Content */}
                    {isImage ? (
                      <>
                        <img
                          src={imageUrl}
                          alt={`Post by ${post.author_name}`}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          loading="lazy"
                          onError={handlePostImageError}
                        />
                        {/* Overlay ala Instagram Feed */}
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center backdrop-blur-[2px]">
                          <div className="flex gap-6 text-white font-bold">
                            <span className="flex items-center gap-2">
                              <FaHeart /> {post.likes_count || 0}
                            </span>
                            <span className="flex items-center gap-2">
                              <FaComment className="scale-x-[-1]" /> {post.comments_count || 0}
                            </span>
                          </div>
                        </div>
                        {urls.length > 1 && (
                          <div className="absolute top-2 right-2 bg-white/20 backdrop-blur-md rounded-lg p-1.5 z-10 shadow-sm border border-white/30">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9l-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </>
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
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal Postingan - Gaya Instagram Asli */}
      {showPostModal && selectedPost && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 md:p-8 lg:p-12 animate-fadeIn">
          {/* Tombol Close Mengambang ala Instagram */}
          <button 
            onClick={() => setShowPostModal(false)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 z-[60] p-2"
          >
            <FaTimes className="text-2xl sm:text-3xl" />
          </button>

          <div className="bg-white w-full h-[100dvh] md:w-auto md:h-auto md:max-h-[90vh] flex flex-col md:inline-block md:rounded-bl-none overflow-hidden shadow-2xl relative md:pr-[350px] lg:pr-[400px]">
            
            {/* Bagian Gambar/Content - Premium Carousel (Instagram Style) */}
            <div className={`w-full md:w-auto bg-black flex items-center justify-center flex-shrink-0 h-[50vh] md:h-full relative overflow-hidden`}>
              {isImagePost(selectedPost) ? (
                <div className="w-full h-full relative group">
                  {/* Media Content — Carousel */}
                  <div className="w-full h-full flex items-center justify-center overflow-hidden">
                    {(() => {
                      const urls = getMediaUrls(selectedPost)
                      return (
                        <div 
                          className="flex transition-transform duration-300 ease-out w-full h-full"
                          style={{ transform: `translateX(-${(selectedPost._modalSlide || 0) * 100}%)` }}
                        >
                          {urls.map((url, idx) => (
                            <div key={idx} className="w-full h-full flex-shrink-0 flex items-center justify-center">
                              <img
                                src={resolveBackendAssetUrl(url)}
                                alt={`Post by ${selectedPost.author_name} — slide ${idx + 1}`}
                                className="max-w-full max-h-full md:max-w-[calc(90vw-400px)] md:max-h-[90vh] object-contain block shadow-2xl"
                                loading={idx <= 1 ? 'eager' : 'lazy'}
                              />
                            </div>
                          ))}
                        </div>
                      )
                    })()}
                  </div>
                  
                  {/* Navigation arrows for modal carousel */}
                  {(() => {
                    const urls = getMediaUrls(selectedPost)
                    const slide = selectedPost._modalSlide || 0
                    if (urls.length <= 1) return null
                    return (
                      <>
                        {slide > 0 && (
                          <button 
                            onClick={() => setSelectedPost({...selectedPost, _modalSlide: slide - 1})}
                            className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-sm text-black p-2 rounded-full hover:bg-white transition-all z-20 shadow-sm"
                          >
                            <FaChevronLeft className="text-xs" />
                          </button>
                        )}
                        {slide < urls.length - 1 && (
                          <button 
                            onClick={() => setSelectedPost({...selectedPost, _modalSlide: slide + 1})}
                            className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-sm text-black p-2 rounded-full hover:bg-white transition-all z-20 shadow-sm"
                          >
                            <FaChevronRight className="text-xs" />
                          </button>
                        )}
                        <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full text-white text-[11px] font-bold">
                          {slide + 1} / {urls.length}
                        </div>
                        {/* Dots */}
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
                          {urls.map((_, idx) => (
                            <button 
                              key={idx}
                              onClick={() => setSelectedPost({...selectedPost, _modalSlide: idx})}
                              className={`rounded-full transition-all duration-200 ${
                                idx === slide ? 'bg-white w-2 h-2' : 'bg-white/50 w-1.5 h-1.5'
                              }`}
                            />
                          ))}
                        </div>
                      </>
                    )
                  })()}
                </div>
              ) : (
                <div className="w-full h-full md:w-[450px] lg:w-[550px] flex flex-col items-center justify-center p-8 sm:p-14 bg-white">
                  <div className="mb-8 flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-lp-accent/5 border border-lp-accent/10 flex items-center justify-center shadow-sm">
                      <FaFileAlt className="text-lp-accent text-2xl" />
                    </div>
                    <div className="h-0.5 w-12 bg-lp-border rounded-full"></div>
                    <span className="text-[12px] font-bold text-lp-text3 uppercase tracking-[0.2em]">Postingan Teks</span>
                  </div>
                  
                  <div className="w-full max-w-md relative">
                    {selectedPost.title && (
                      <h1 className="text-2xl font-bold text-lp-text mb-6 text-center leading-tight tracking-tight">
                        {selectedPost.title}
                      </h1>
                    )}
                    
                    <div className="bg-lp-bg p-8 sm:p-10 rounded-[1.5rem] border border-lp-border shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-lp-accent opacity-40"></div>
                      <p className="text-lp-text text-[15px] font-normal leading-[1.7] whitespace-pre-line text-center">
                        {selectedPost.content}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bagian Sidebar Konten */}
            <div className="w-full md:w-[350px] lg:w-[400px] flex flex-col h-[55vh] md:h-full bg-white relative md:absolute md:top-0 md:bottom-0 md:right-0 border-l border-lp-border">
              
              {/* Header Post Premium (Instagram Desktop Style) */}
              <div className="flex items-center justify-between p-4 border-b border-lp-border bg-white sticky top-0 z-10">
                <div className="flex items-center space-x-3">
                  <Link 
                    to={`/profile/${selectedPost.role}/${cleanUsername(selectedPost.author_username || selectedPost.author_name)}`}
                    className="w-10 h-10 rounded-full p-[1.5px] bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 shrink-0"
                  >
                    <div className="w-full h-full rounded-full bg-white p-[1.5px]">
                      <div className="w-full h-full rounded-full bg-lp-surface flex items-center justify-center text-lp-text font-bold text-sm overflow-hidden">
                        {selectedPost.author_avatar ? (
                          <img 
                            src={getImageUrl(selectedPost.author_avatar)} 
                            alt={selectedPost.author_name} 
                            className="w-full h-full object-cover"
                            onError={handleProfileImageError}
                          />
                        ) : (
                          <span className="flex items-center justify-center w-full h-full">
                            {selectedPost.author_name?.[0]?.toUpperCase() || 'U'}
                          </span>
                        )}
                        <span style={{display: 'none'}} className="flex items-center justify-center w-full h-full bg-lp-surface text-lp-text">
                          {selectedPost.author_name?.[0]?.toUpperCase() || 'U'}
                        </span>
                      </div>
                    </div>
                  </Link>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <Link 
                        to={`/profile/${selectedPost.role}/${cleanUsername(selectedPost.author_username || selectedPost.author_name)}`}
                        className="font-bold text-lp-text text-[14px] leading-tight hover:opacity-70 transition-opacity"
                      >
                        {selectedPost.author_username || cleanUsername(selectedPost.author_name)}
                      </Link>
                      <span className="text-lp-text3">•</span>
                      <button className="text-lp-accent text-[14px] font-bold hover:text-lp-atext">Ikuti</button>
                    </div>
                    <span className="text-[11px] text-lp-text3 leading-tight">{getRoleDisplay(selectedPost.role)}</span>
                  </div>
                </div>
                <button className="text-lp-text hover:text-gray-500 p-2">
                  <FaEllipsisH className="text-sm" />
                </button>
              </div>

              {/* Area Konten dan Komentar - Scrollable (Tanpa scrollbar custom untuk native feel) */}
              <div className="flex-1 overflow-y-auto">
                {/* Caption - Selalu di atas mirip Instagam */}
                {isImagePost(selectedPost) && selectedPost.content && (
                  <div className="p-4 flex items-start space-x-3">
                    <Link 
                      to={`/profile/${selectedPost.role}/${cleanUsername(selectedPost.author_username || selectedPost.author_name)}`}
                      className="flex-shrink-0"
                    >
                      <div className="w-8 h-8 bg-lp-bg rounded-full flex items-center justify-center text-lp-text border border-lp-border text-xs font-bold shrink-0 overflow-hidden">
                        {selectedPost.author_avatar ? (
                          <img 
                            src={getImageUrl(selectedPost.author_avatar)} 
                            alt={selectedPost.author_name} 
                            className="w-full h-full object-cover"
                            onError={handleProfileImageError}
                          />
                        ) : (
                          <span className="flex items-center justify-center w-full h-full">
                            {selectedPost.author_name?.[0]?.toUpperCase() || 'U'}
                          </span>
                        )}
                        <span style={{display: 'none'}} className="flex items-center justify-center w-full h-full bg-lp-bg text-lp-text">
                          {selectedPost.author_name?.[0]?.toUpperCase() || 'U'}
                        </span>
                      </div>
                    </Link>
                    <div className="flex-1 min-w-0 pt-1">
                      <span className="font-semibold text-lp-text text-[14px] tracking-tight mr-2">
                        <Link 
                          to={`/profile/${selectedPost.role}/${cleanUsername(selectedPost.author_username || selectedPost.author_name)}`}
                          className="hover:opacity-80 transition-opacity"
                        >
                          {selectedPost.author_name}
                        </Link>
                      </span>
                      <span className="text-lp-text font-normal whitespace-pre-line break-words text-[14px] leading-relaxed">
                        {selectedPost.content}
                      </span>
                      <div className="text-lp-text3 text-[12px] font-normal mt-2">
                        {getRelativeTime(selectedPost.created_at)}
                      </div>
                    </div>
                  </div>
                )}

                {/* Daftar Komentar */}
                <div className="px-4 pb-4 space-y-4 pt-2">
                  {localComments.length > 0 ? (
                    localComments.map((comment) => (
                      <div key={comment.id} className="flex items-start space-x-3 group">
                        <Link 
                          to={`/profile/${comment.user_role || 'mahasiswa'}/${cleanUsername(comment.author_username || comment.author_name)}`}
                          className="flex-shrink-0"
                        >
                          <div className="w-8 h-8 bg-lp-surface border border-lp-border rounded-full flex items-center justify-center text-lp-text2 text-xs font-bold shrink-0 overflow-hidden">
                            {comment.author_avatar ? (
                              <img 
                                src={getImageUrl(comment.author_avatar)} 
                                alt={comment.author_name} 
                                className="w-full h-full object-cover"
                                onError={handleProfileImageError}
                              />
                            ) : (
                              <span className="flex items-center justify-center w-full h-full">
                                {comment.author_name?.[0]?.toUpperCase() || 'U'}
                              </span>
                            )}
                            <span style={{display: 'none'}} className="flex items-center justify-center w-full h-full bg-lp-surface text-lp-text2">
                              {comment.author_name?.[0]?.toUpperCase() || 'U'}
                            </span>
                          </div>
                        </Link>
                        <div className="flex-1 min-w-0 pt-1">
                          <span className="font-semibold text-lp-text text-[14px] tracking-tight mr-2">
                            <Link 
                              to={`/profile/${comment.user_role || 'mahasiswa'}/${cleanUsername(comment.author_username || comment.author_name)}`}
                              className="hover:opacity-80 transition-opacity"
                            >
                              {comment.author_name}
                            </Link>
                          </span>
                          <span className="text-lp-text text-[14px] font-normal break-words leading-relaxed">
                            {comment.content}
                          </span>
                          <div className="text-lp-text3 text-[12px] font-normal mt-1 flex gap-3">
                            <span>{getRelativeTime(comment.created_at)}</span>
                            <button className="font-semibold hidden group-hover:block hover:text-lp-text2">Balas</button>
                          </div>
                        </div>
                        <button className="pt-2 text-lp-text3 hover:text-lp-red px-1">
                          <FaRegHeart className="text-[10px]" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <p className="font-medium text-lp-text text-[14px]">Belum ada komentar.</p>
                      <p className="text-[12px] text-lp-text3 font-light mt-1">Mulai obrolan.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions, Likes, dan Input Komentar (Sticky di bawah) */}
              <div className="border-t border-lp-border bg-white flex-shrink-0">
                {/* Action Buttons */}
                <div className="flex items-center justify-between px-4 py-2 mt-1">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={handleLikePost}
                      className={`transition-colors ${
                        selectedPost.user_has_liked 
                          ? 'text-lp-red hover:text-lp-red' 
                          : 'text-lp-text hover:text-lp-text2'
                      }`}
                    >
                      {selectedPost.user_has_liked ? (
                        <FaHeart className="text-2xl" />
                      ) : (
                        <FaRegHeart className="text-2xl" />
                      )}
                    </button>
                    <button className="text-lp-text hover:text-lp-text2">
                      <FaComment className="text-2xl transform scale-x-[-1]" />
                    </button>
                    <button className="text-lp-text hover:text-lp-text2 mb-1">
                      <FaPaperPlane className="text-2xl transform -rotate-12" />
                    </button>
                  </div>
                  <button 
                    onClick={handleSavePost}
                    className={`transition-colors ${
                      selectedPost.user_has_saved 
                        ? 'text-lp-text hover:text-lp-text' 
                        : 'text-lp-text hover:text-lp-text2'
                    }`}
                  >
                    {selectedPost.user_has_saved ? (
                      <FaBookmark className="text-2xl" />
                    ) : (
                      <FaRegBookmark className="text-2xl" />
                    )}
                  </button>
                </div>

                {/* Like Count & Timestamp */}
                <div className="px-4 pb-3">
                  <div className="font-semibold text-[14px] text-lp-text mb-1">
                    {selectedPost.likes_count || 0} suka
                  </div>
                  <div className="text-[10px] text-lp-text3 uppercase tracking-wide">
                    {getRelativeTime(selectedPost.created_at)}
                  </div>
                </div>

                {/* Input Komentar Area */}
                <form onSubmit={handleAddComment} className="px-4 py-3 border-t border-lp-border flex items-center space-x-3">
                  <button type="button" className="text-lp-text hover:text-lp-text2">
                    <FaSmile className="text-2xl" />
                  </button>
                  <input
                    type="text"
                    placeholder="Tambahkan komentar..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="flex-1 text-[14px] font-normal text-lp-text border-none focus:outline-none focus:ring-0 bg-transparent placeholder-lp-text3"
                    disabled={isCommenting}
                  />
                  <button 
                    type="submit"
                    disabled={!commentText.trim() || isCommenting}
                    className={`font-semibold text-[14px] transition-colors ${
                      commentText.trim() && !isCommenting
                        ? 'text-lp-atext hover:text-lp-accent' // atau blue-500 seperti ig
                        : 'text-lp-atext/40 cursor-text'
                    }`}
                  >
                    {isCommenting ? '...' : 'Kirim'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProfilePublic
