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
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar role={user ? user.role : 'mahasiswa'} />
        <div className="flex-1 flex items-center justify-center ml-0 lg:ml-56">
          <div className="text-xl text-gray-600">Memuat profil...</div>
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar role={user ? user.role : 'mahasiswa'} />
        <div className="flex-1 max-w-2xl mx-auto p-8 ml-0 lg:ml-56">
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">❌</div>
            <h1 className="text-3xl font-bold mb-4">Profile Tidak Ditemukan</h1>
            <p className="text-gray-600 mb-4">{error ? error.message : 'Pastikan username dan role benar'}</p>
            <button 
              onClick={() => navigate(-1)} 
              className="mt-6 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Kembali
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar role={user ? user.role : 'mahasiswa'} />
      
      {/* Main Content - Diperbaiki untuk responsif */}
      <div className="flex-1 w-full ml-0 lg:ml-56">
        
        {/* Header Profil - Diperbaiki untuk lebih responsif */}
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
              {/* Foto Profil */}
              <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full bg-gradient-to-r from-purple-400 to-orange-500 p-1 flex-shrink-0">
                <div className="w-full h-full rounded-full bg-white p-1">
                  <div className="w-full h-full rounded-full overflow-hidden bg-gray-200 relative">
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
                          <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-400">
                            {profile.name && profile.name[0] ? profile.name[0].toUpperCase() : 'U'}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl sm:text-3xl md:text-4xl font-bold text-gray-400">
                        {profile.name && profile.name[0] ? profile.name[0].toUpperCase() : 'U'}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Info Profil */}
              <div className="text-center sm:text-left flex-1 w-full">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3">
                  <h1 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">{profile.name}</h1>
                  <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full border whitespace-nowrap">
                    {getRoleDisplay(role)}
                  </span>
                </div>
                
                <p className="text-gray-600 mb-3 sm:mb-4 text-sm">@{profile.username}</p>

                <div className="flex gap-4 sm:gap-6 justify-center sm:justify-start mb-3">
                  <div className="text-center">
                    <div className="font-bold text-sm sm:text-base text-gray-900">{userPosts.length}</div>
                    <div className="text-gray-500 text-xs">Postingan</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-sm sm:text-base text-gray-900">{profile.followers_count || 0}</div>
                    <div className="text-gray-500 text-xs">Pengikut</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-sm sm:text-base text-gray-900">{profile.following_count || 0}</div>
                    <div className="text-gray-500 text-xs">Mengikuti</div>
                  </div>
                </div>

                {profile.bio && (
                  <p className="text-gray-700 text-sm max-w-md text-center sm:text-left mx-auto sm:mx-0">{profile.bio}</p>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Filter Tabs */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-4">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveFilter('semua')}
              className={`flex-1 py-3 px-4 text-center font-medium text-sm transition-colors ${
                activeFilter === 'semua'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <FaEllipsisH className="text-xs" />
                <span>Semua</span>
              </div>
            </button>
            <button
              onClick={() => setActiveFilter('foto')}
              className={`flex-1 py-3 px-4 text-center font-medium text-sm transition-colors ${
                activeFilter === 'foto'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <FaImage className="text-xs" />
                <span>Foto</span>
              </div>
            </button>
            <button
              onClick={() => setActiveFilter('text')}
              className={`flex-1 py-3 px-4 text-center font-medium text-sm transition-colors ${
                activeFilter === 'text'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
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
              <div className="inline-block animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-b-2 border-blue-600"></div>
              <p className="text-gray-500 mt-2 text-sm">Memuat postingan...</p>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-12 sm:py-16 text-gray-500">
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
                      isImage ? 'bg-gray-100' : 'bg-gradient-to-br from-blue-50 to-indigo-50'
                    } rounded sm:rounded-lg cursor-pointer`}
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
                          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center">
                            <FaFileAlt className="text-white text-xs" />
                          </div>
                          <span className="text-xs font-medium text-blue-600">Postingan Teks</span>
                        </div>
                        
                        <div className="flex-1 overflow-hidden">
                          {post.title && (
                            <h3 className="font-bold text-gray-900 text-sm mb-1 line-clamp-1">
                              {post.title}
                            </h3>
                          )}
                          
                          <p className="text-gray-700 text-xs leading-relaxed line-clamp-4">
                            {truncateText(post.content, 150)}
                          </p>
                        </div>
                        
                        <div className="mt-2 pt-2 border-t border-gray-200 border-opacity-30">
                          <div className="flex items-center justify-between text-gray-500 text-xs">
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

      {/* Modal Postingan - Responsif untuk mobile */}
      {showPostModal && selectedPost && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg w-full h-full sm:h-[90vh] sm:max-w-5xl overflow-hidden flex flex-col sm:flex-row">
            
            {/* Bagian Gambar/Content - Responsif */}
            <div className={`sm:w-1/2 ${isImagePost(selectedPost) ? 'bg-black' : 'bg-gradient-to-br from-blue-50 to-indigo-50'} flex items-center justify-center flex-shrink-0 h-1/2 sm:h-full`}>
              {isImagePost(selectedPost) ? (
                <div className="w-full h-full flex items-center justify-center">
                  <img
                    src={getImageUrl(selectedPost.media_url)}
                    alt={`Post by ${selectedPost.author_name}`}
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 sm:p-12">
                  <div className="mb-4 sm:mb-6 flex items-center gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center">
                      <FaFileAlt className="text-white text-lg sm:text-xl" />
                    </div>
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900">Postingan Teks</h2>
                  </div>
                  
                  {selectedPost.title && (
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 text-center">
                      {selectedPost.title}
                    </h1>
                  )}
                  
                  <div className="max-w-md w-full">
                    <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
                      <p className="text-gray-800 text-sm sm:text-base leading-relaxed whitespace-pre-line">
                        {selectedPost.content}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bagian Konten */}
            <div className="sm:w-1/2 flex flex-col h-1/2 sm:h-full">
              
              {/* Header Post */}
              <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200">
                <Link 
                  to={`/profile/${selectedPost.role}/${cleanUsername(selectedPost.author_username || selectedPost.author_name)}`}
                  className="flex items-center space-x-2 sm:space-x-3 hover:opacity-80 transition-opacity"
                >
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-purple-400 to-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    {selectedPost.author_name?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 text-xs sm:text-sm">{selectedPost.author_name}</div>
                    <div className="text-gray-500 text-xs capitalize">{selectedPost.role}</div>
                  </div>
                </Link>
                <button 
                  onClick={() => setShowPostModal(false)}
                  className="text-gray-500 hover:text-gray-700 p-1 sm:p-2"
                >
                  <FaTimes className="text-base sm:text-lg" />
                </button>
              </div>

              {/* Area Konten dan Komentar - Scrollable */}
              <div className="flex-1 overflow-y-auto">
                {/* Caption - hanya untuk post image */}
                {isImagePost(selectedPost) && (
                  <div className="p-3 sm:p-4 border-b border-gray-100">
                    <div className="flex items-start space-x-2 sm:space-x-3">
                      <Link 
                        to={`/profile/${selectedPost.role}/${cleanUsername(selectedPost.author_username || selectedPost.author_name)}`}
                        className="flex-shrink-0"
                      >
                        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-purple-400 to-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                          {selectedPost.author_name?.[0]?.toUpperCase() || 'U'}
                        </div>
                      </Link>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <Link 
                            to={`/profile/${selectedPost.role}/${cleanUsername(selectedPost.author_username || selectedPost.author_name)}`}
                            className="hover:opacity-80 transition-opacity"
                          >
                            <span className="font-semibold text-gray-900 text-xs sm:text-sm">{selectedPost.author_name}</span>
                          </Link>
                        </div>
                        <p className="text-gray-800 whitespace-pre-line break-words text-xs sm:text-sm">
                          {selectedPost.content}
                        </p>
                        <div className="text-gray-500 text-xs mt-1 sm:mt-2">
                          {getRelativeTime(selectedPost.created_at)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Daftar Komentar - Scrollable */}
                <div className="p-3 sm:p-4 space-y-3 sm:space-y-4 max-h-[40vh] sm:max-h-[calc(100vh-300px)] overflow-y-auto">
                  {localComments.length > 0 ? (
                    localComments.map((comment) => (
                      <div key={comment.id} className="flex items-start space-x-2 sm:space-x-3">
                        <Link 
                          to={`/profile/${comment.user_role || 'mahasiswa'}/${cleanUsername(comment.author_username || comment.author_name)}`}
                          className="flex-shrink-0"
                        >
                          <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-blue-400 to-green-400 rounded-full flex items-center justify-center text-white text-xs font-bold">
                            {comment.author_name?.[0]?.toUpperCase() || 'U'}
                          </div>
                        </Link>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <Link 
                              to={`/profile/${comment.user_role || 'mahasiswa'}/${cleanUsername(comment.author_username || comment.author_name)}`}
                              className="hover:opacity-80 transition-opacity"
                            >
                              <span className="font-semibold text-gray-900 text-xs sm:text-sm">
                                {comment.author_name}
                              </span>
                            </Link>
                          </div>
                          <p className="text-gray-800 text-xs sm:text-sm break-words">
                            {comment.content}
                          </p>
                          <div className="text-gray-500 text-xs mt-1">
                            {getRelativeTime(comment.created_at)}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 sm:py-8 text-gray-500">
                      <div className="text-2xl sm:text-4xl mb-2">💬</div>
                      <p className="font-medium text-xs sm:text-sm">Belum ada komentar</p>
                      <p className="text-xs mt-1">Jadilah yang pertama berkomentar!</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions dan Input Komentar */}
              <div className="border-t border-gray-200">
                {/* Action Buttons */}
                <div className="flex items-center justify-between p-3 sm:p-4">
                  <div className="flex items-center space-x-3 sm:space-x-4">
                    <button
                      onClick={handleLikePost}
                      className={`p-1 sm:p-2 rounded-full transition-colors ${
                        selectedPost.user_has_liked 
                          ? 'text-red-500 hover:text-red-600' 
                          : 'text-gray-600 hover:text-red-500'
                      }`}
                    >
                      {selectedPost.user_has_liked ? (
                        <FaHeart className="text-lg sm:text-xl" />
                      ) : (
                        <FaRegHeart className="text-lg sm:text-xl" />
                      )}
                    </button>
                    <button className="text-gray-600 hover:text-blue-500 p-1 sm:p-2">
                      <FaComment className="text-lg sm:text-xl transform scale-x-[-1]" />
                    </button>
                    <button className="text-gray-600 hover:text-green-500 p-1 sm:p-2">
                      <FaPaperPlane className="text-lg sm:text-xl transform -rotate-45" />
                    </button>
                  </div>
                  <button 
                    onClick={handleSavePost}
                    className={`p-1 sm:p-2 rounded-full transition-colors ${
                      selectedPost.user_has_saved 
                        ? 'text-yellow-500 hover:text-yellow-600' 
                        : 'text-gray-600 hover:text-yellow-500'
                    }`}
                  >
                    {selectedPost.user_has_saved ? (
                      <FaBookmark className="text-lg sm:text-xl" />
                    ) : (
                      <FaRegBookmark className="text-lg sm:text-xl" />
                    )}
                  </button>
                </div>

                {/* Like Count */}
                <div className="px-3 sm:px-4 pb-2 sm:pb-3">
                  <div className="font-semibold text-gray-900 text-xs sm:text-sm">
                    {selectedPost.likes_count || 0} suka
                  </div>
                  <div className="text-gray-500 text-xs mt-0.5 sm:mt-1">
                    {getRelativeTime(selectedPost.created_at)}
                  </div>
                </div>

                {/* Input Komentar */}
                <form onSubmit={handleAddComment} className="p-3 sm:p-4 border-t border-gray-200">
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <button type="button" className="text-gray-500 hover:text-gray-700 p-1">
                      <FaSmile className="text-base sm:text-lg" />
                    </button>
                    <input
                      type="text"
                      placeholder="Tambahkan komentar..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      className="flex-1 text-xs sm:text-sm border-none focus:outline-none focus:ring-0 bg-transparent placeholder-gray-500"
                      disabled={isCommenting}
                    />
                    <button 
                      type="submit"
                      disabled={!commentText.trim() || isCommenting}
                      className={`font-semibold text-xs sm:text-sm px-2 sm:px-3 py-1 rounded-full transition-all duration-200 ${
                        commentText.trim() && !isCommenting
                          ? 'text-blue-500 hover:text-blue-700 hover:bg-blue-50'
                          : 'text-blue-300 cursor-not-allowed'
                      }`}
                    >
                      {isCommenting ? '...' : 'Kirim'}
                    </button>
                  </div>
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