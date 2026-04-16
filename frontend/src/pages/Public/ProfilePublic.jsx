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
  FaFileAlt
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

  // Filter posts berdasarkan tipe
  useEffect(() => {
    if (!userPosts.length) {
      setFilteredPosts([])
      return
    }

    switch (activeFilter) {
      case 'foto':
        setFilteredPosts(userPosts.filter(post => 
          post.media_url && 
          (post.media_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) || 
           post.media_type === 'image')
        ))
        break
      case 'text':
        setFilteredPosts(userPosts.filter(post => 
          !post.media_url || 
          (!post.media_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) && 
           post.media_type !== 'image')
        ))
        break
      default:
        setFilteredPosts(userPosts)
    }
  }, [activeFilter, userPosts])

  // Fungsi untuk mendapatkan URL gambar yang benar
  const getImageUrl = (mediaUrl) => {
    return resolveBackendAssetUrl(mediaUrl)
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

  // Check if post is image
  const isImagePost = (post) => {
    return post.media_url && 
           (post.media_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) || 
            post.media_type === 'image')
  }

  // Truncate text for preview
  const truncateText = (text, maxLength = 100) => {
    if (!text) return ''
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-lp-bg font-sans font-light">
        <Sidebar role={user ? user.role : 'mahasiswa'} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center"><div className="w-10 h-10 border-2 border-lp-border border-t-lp-accent rounded-full animate-spin mx-auto mb-3" /><p className="text-lp-text2 text-sm font-light">Memuat profil...</p></div>
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="flex min-h-screen bg-lp-bg font-sans font-light">
        <Sidebar role={user ? user.role : 'mahasiswa'} />
        <div className="flex-1 max-w-2xl mx-auto p-8">
          <div className="bg-lp-surface border border-lp-border rounded-2xl p-12 text-center shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
            <div className="w-16 h-16 mx-auto mb-5 bg-lp-red/8 rounded-2xl flex items-center justify-center"><span className="text-3xl">❌</span></div>
            <h1 className="text-2xl font-semibold text-lp-text tracking-tight mb-3">Profile Tidak Ditemukan</h1>
            <p className="text-[13px] text-lp-text2 font-light mb-4">{error ? error.message : 'Pastikan username dan role benar'}</p>
            <button 
              onClick={() => navigate(-1)} 
              className="mt-4 bg-lp-text text-white px-6 py-3 rounded-full text-[13px] font-semibold hover:bg-lp-atext hover:-translate-y-px transition-all"
            >
              Kembali
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-lp-bg font-sans font-light">
      <Sidebar role={user ? user.role : 'mahasiswa'} />
      
      {/* Main Content - Diperbaiki untuk responsif */}
      <div className="flex-1 w-full ml-0 lg:ml-56">
        
        {/* Header Profil - Diperbaiki untuk lebih responsif dan aesthetically pleasing */}
        <header className="bg-white border-b border-lp-border relative">
          {/* Banner */}
          <div className="h-24 sm:h-36 lg:h-48 bg-gradient-to-r from-lp-accentS to-lp-surface w-full absolute top-0 left-0 z-0"></div>
          
          <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 lg:pt-32 pb-4 sm:pb-6 relative z-10">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:gap-6">
              {/* Foto Profil */}
              <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full border-4 border-white overflow-hidden flex-shrink-0 shadow-sm bg-lp-surface relative -mt-12 sm:-mt-16 z-20">
                <div className="w-full h-full bg-lp-surface">
                  <div className="w-full h-full overflow-hidden bg-lp-surface relative">
                    {profile.profile_picture ? (
                      <>
                        <img
                          src={getImageUrl(profile.profile_picture)}
                          alt={profile.name}
                          className="w-full h-full object-cover"
                          onError={handleProfileImageError}
                        />
                        <div 
                          className="absolute inset-0 hidden items-center justify-center bg-gray-200"
                          style={{ display: 'none' }}
                        >
                          <div className="text-3xl sm:text-4xl font-bold text-lp-text3">
                            {profile.name && profile.name[0] ? profile.name[0].toUpperCase() : 'U'}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl sm:text-4xl font-bold text-lp-text3 bg-lp-accentS">
                        {profile.name && profile.name[0] ? profile.name[0].toUpperCase() : 'U'}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Info Profil */}
              <div className="text-center sm:text-left flex-1 w-full pb-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-center sm:justify-start gap-2 mb-1">
                  <h1 className="text-xl sm:text-2xl font-bold text-lp-text tracking-tight truncate">{profile.name}</h1>
                  <span className="inline-flex w-max mx-auto sm:mx-0 px-3 py-1 bg-lp-accentS text-lp-atext text-[10px] font-mono tracking-wider uppercase rounded-full border border-lp-borderA whitespace-nowrap">
                    {getRoleDisplay(role)}
                  </span>
                </div>
                
                <p className="text-lp-text3 mb-3 text-[12px] font-mono">@{profile.username}</p>

                <div className="flex gap-4 sm:gap-8 justify-center sm:justify-start mb-3">
                  <div className="text-center sm:text-left">
                    <div className="font-bold text-base sm:text-lg text-lp-text">{userPosts.length}</div>
                    <div className="text-lp-text3 text-[10px] sm:text-[11px] font-mono tracking-wider uppercase">Postingan</div>
                  </div>
                  <div className="text-center sm:text-left">
                    <div className="font-bold text-base sm:text-lg text-lp-text">{profile.followers_count || 0}</div>
                    <div className="text-lp-text3 text-[10px] sm:text-[11px] font-mono tracking-wider uppercase">Pengikut</div>
                  </div>
                  <div className="text-center sm:text-left">
                    <div className="font-bold text-base sm:text-lg text-lp-text">{profile.following_count || 0}</div>
                    <div className="text-lp-text3 text-[10px] sm:text-[11px] font-mono tracking-wider uppercase">Mengikuti</div>
                  </div>
                </div>

                {profile.bio && (
                  <p className="text-lp-text2 text-[13px] font-light max-w-md text-center sm:text-left mx-auto sm:mx-0 leading-relaxed mt-2">{profile.bio}</p>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Filter Tabs */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-4">
          <div className="flex border-b border-lp-border">
            <button
              onClick={() => setActiveFilter('semua')}
              className={`flex-1 py-3 px-4 text-center font-medium text-[12px] transition-colors ${
                activeFilter === 'semua'
                  ? 'text-lp-text font-semibold border-b-2 border-lp-accent'
                  : 'text-lp-text3 hover:text-lp-text2'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <FaEllipsisH className="text-xs" />
                <span>Semua</span>
              </div>
            </button>
            <button
              onClick={() => setActiveFilter('foto')}
              className={`flex-1 py-3 px-4 text-center font-medium text-[12px] transition-colors ${
                activeFilter === 'foto'
                  ? 'text-lp-text font-semibold border-b-2 border-lp-accent'
                  : 'text-lp-text3 hover:text-lp-text2'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <FaImage className="text-xs" />
                <span>Foto</span>
              </div>
            </button>
            <button
              onClick={() => setActiveFilter('text')}
              className={`flex-1 py-3 px-4 text-center font-medium text-[12px] transition-colors ${
                activeFilter === 'text'
                  ? 'text-lp-text font-semibold border-b-2 border-lp-accent'
                  : 'text-lp-text3 hover:text-lp-text2'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <FaFileAlt className="text-xs" />
                <span>Text</span>
              </div>
            </button>
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
                const imageUrl = post.media_url ? getImageUrl(post.media_url) : null
                const isImage = isImagePost(post)

                return (
                  <div
                    key={post.id}
                    onClick={() => openPostModal(post)}
                    className={`relative aspect-square group overflow-hidden ${
                      isImage ? 'bg-lp-surface' : 'bg-lp-accentS'
                    } rounded-xl border border-lp-border cursor-pointer hover:border-lp-borderA transition-all`}
                  >
                    {isImage ? (
                      // Tampilan untuk postingan foto
                      <>
                        <img
                          src={imageUrl}
                          alt={`Post by ${post.author_name}`}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                          loading="lazy"
                          onError={handlePostImageError}
                        />
                        <div 
                          className="absolute inset-0 hidden items-center justify-center bg-gray-200"
                          style={{ display: 'none' }}
                        >
                          <svg className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      </>
                    ) : (
                      // Tampilan untuk postingan teks
                      <div className="w-full h-full p-3 sm:p-4 flex flex-col">
                        <div className="mb-2 flex items-center gap-2">
                          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-lp-accentS border border-lp-borderA flex items-center justify-center">
                            <FaFileAlt className="text-lp-accent text-xs" />
                          </div>
                          <span className="text-[10px] font-mono font-medium text-lp-atext tracking-wider uppercase">Postingan Teks</span>
                        </div>
                        
                        <div className="flex-1 overflow-hidden">
                          {post.title && (
                            <h3 className="font-semibold text-lp-text text-sm mb-1 line-clamp-1 tracking-tight">
                              {post.title}
                            </h3>
                          )}
                          
                          <p className="text-lp-text2 text-[11px] font-light leading-relaxed line-clamp-4">
                            {truncateText(post.content, 150)}
                          </p>
                        </div>
                        
                        <div className="mt-2 pt-2 border-t border-lp-border">
                          <div className="flex items-center justify-between text-lp-text3 text-[10px] font-mono">
                            <span className="flex items-center gap-1">
                              ❤️ {post.likes_count || 0}
                            </span>
                            <span className="flex items-center gap-1">
                              💬 {post.comments_count || 0}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Overlay untuk likes dan comments (hanya untuk foto) */}
                    {isImage && (
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <div className="flex gap-2 sm:gap-4 text-white text-xs sm:text-sm font-bold">
                          <span className="flex items-center gap-1">
                            ❤️ {post.likes_count || 0}
                          </span>
                          <span className="flex items-center gap-1">
                            💬 {post.comments_count || 0}
                          </span>
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
            
            {/* Bagian Gambar/Content - Menyesuaikan ukuran foto asli (Shrink-wrap) */}
            <div className={`w-full md:w-auto bg-lp-surface flex items-center justify-center flex-shrink-0 h-[45vh] md:h-full relative border-b md:border-b-0 border-lp-border`}>
              {isImagePost(selectedPost) ? (
                <div className="w-full h-full md:w-auto md:h-auto flex items-center justify-center bg-lp-surface">
                  <img
                    src={getImageUrl(selectedPost.media_url)}
                    alt={`Post by ${selectedPost.author_name}`}
                    className="w-full h-full md:w-auto md:h-auto md:max-w-[calc(95vw-350px)] lg:max-w-[calc(95vw-400px)] md:max-h-[90vh] md:min-h-[400px] object-contain block"
                  />
                </div>
              ) : (
                <div className="w-full h-full md:w-[400px] lg:w-[500px] md:min-h-[450px] flex flex-col items-center justify-center p-6 sm:p-12 bg-lp-surface">
                  <div className="mb-4 sm:mb-6 flex items-center gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white border border-lp-border flex items-center justify-center shadow-sm">
                      <FaFileAlt className="text-lp-text2 text-lg sm:text-xl" />
                    </div>
                    <h2 className="text-lg sm:text-xl font-semibold text-lp-text tracking-tight">Postingan Teks</h2>
                  </div>
                  
                  {selectedPost.title && (
                    <h1 className="text-xl sm:text-2xl font-semibold text-lp-text mb-4 text-center tracking-tight">
                      {selectedPost.title}
                    </h1>
                  )}
                  
                  <div className="max-w-md w-full">
                    <div className="bg-white p-6 sm:p-8 rounded-xl border border-lp-border shadow-sm">
                      <p className="text-lp-text text-[14px] font-normal leading-relaxed whitespace-pre-line text-center">
                        {selectedPost.content}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bagian Sidebar Konten */}
            <div className="w-full md:w-[350px] lg:w-[400px] flex flex-col h-[55vh] md:h-full bg-white relative md:absolute md:top-0 md:bottom-0 md:right-0 border-l border-lp-border">
              
              {/* Header Post */}
              <div className="flex items-center justify-between p-3 sm:p-4 border-b border-lp-border bg-white flex-shrink-0">
                <Link 
                  to={`/profile/${selectedPost.role}/${cleanUsername(selectedPost.author_username || selectedPost.author_name)}`}
                  className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
                >
                  <div className="w-8 h-8 bg-lp-accentS border border-lp-borderA rounded-full flex items-center justify-center text-lp-atext text-xs font-bold overflow-hidden shrink-0">
                    {selectedPost.author_name?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-lp-text text-[14px] tracking-tight">{selectedPost.author_name}</span>
                  </div>
                </Link>
                <button className="text-lp-text3 hover:text-lp-text2 p-1 font-bold tracking-widest leading-none pb-2">
                  ...
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
                      <div className="w-8 h-8 bg-lp-bg rounded-full flex items-center justify-center text-lp-text border border-lp-border text-xs font-bold shrink-0">
                        {selectedPost.author_name?.[0]?.toUpperCase() || 'U'}
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
                          <div className="w-8 h-8 bg-lp-surface border border-lp-border rounded-full flex items-center justify-center text-lp-text2 text-xs font-bold shrink-0">
                            {comment.author_name?.[0]?.toUpperCase() || 'U'}
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