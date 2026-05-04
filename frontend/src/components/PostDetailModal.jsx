// components/PostDetailModal.jsx
// Shared Instagram-style post detail modal used by both PostCard and ProfilePublic
import React, { useState, useEffect, useRef, memo } from 'react'
import { Link } from 'react-router-dom'
import { usePostInteractions } from '../hooks/usePostInteractions'
import api from '../services/api'
import { 
  FaHeart, FaRegHeart, FaComment, FaPaperPlane, 
  FaBookmark, FaRegBookmark, FaSmile, FaFileAlt,
  FaTimes, FaChevronLeft, FaChevronRight 
} from 'react-icons/fa'
import { resolveBackendAssetUrl } from '../utils/assetUrl'

const cleanUsername = (username) => {
  if (!username) return ''
  return username.toLowerCase()
    .replace(/^ormawa_/, '')
    .replace(/^ukm_/, '')
    .replace(/^admin_/, '')
    .trim()
}

const PostDetailModal = ({ post, onClose, getRelativeTime }) => {
  if (!post) return null

  const {
    likePost,
    addComment,
    savePost,
    isLiking,
    isCommenting
  } = usePostInteractions()

  const [isLiked, setIsLiked] = useState(post.user_has_liked || false)
  const [isSaved, setIsSaved] = useState(post.user_has_saved || false)
  const [localLikes, setLocalLikes] = useState(post.likes_count || 0)
  const [commentText, setCommentText] = useState('')
  const [localComments, setLocalComments] = useState([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isMobile, setIsMobile] = useState(false)

  const commentInputRef = useRef(null)
  const touchStartX = useRef(null)
  const touchEndX = useRef(null)

  const username = cleanUsername(post.author_username || post.author_name?.toLowerCase().replace(/\s+/g, '_'))

  // Media items
  const mediaItems = (() => {
    if (Array.isArray(post.media) && post.media.length > 0) {
      return post.media.map(m => ({
        url: m.media_url,
        type: m.media_type || 'image',
      }))
    }
    if (post.media_url) {
      const raw = post.media_url
      if (typeof raw === 'string') {
        const trimmed = raw.trim()
        if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
          try {
            const parsed = JSON.parse(trimmed)
            const arr = Array.isArray(parsed) ? parsed : [parsed]
            return arr.map(u => ({ url: u, type: 'image' }))
          } catch (e) {
            return [{ url: trimmed, type: 'image' }]
          }
        }
        return [{ url: trimmed, type: 'image' }]
      }
    }
    return []
  })()

  const hasMedia = mediaItems.length > 0
  const hasMultipleMedia = mediaItems.length > 1

  // Sync with post data
  useEffect(() => {
    setIsLiked(post.user_has_liked || false)
    setIsSaved(post.user_has_saved || false)
    setLocalLikes(post.likes_count || 0)
    setLocalComments(Array.isArray(post?.comments) ? post.comments : [])
    setCurrentSlide(0)
  }, [post])

  // Fetch comments
  useEffect(() => {
    let cancelled = false
    const fetchComments = async () => {
      setCommentsLoading(true)
      try {
        const response = await api.get(`/api/feed/${post.id}`, { skipErrorRedirect: true })
        if (cancelled) return
        const comments = Array.isArray(response?.data?.data?.comments)
          ? response.data.data.comments
          : []
        setLocalComments(comments)
      } catch (error) {
        if (cancelled) return
      } finally {
        if (!cancelled) setCommentsLoading(false)
      }
    }
    fetchComments()
    return () => { cancelled = true }
  }, [post.id])

  // Mobile check
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Touch swipe
  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX }
  const handleTouchMove = (e) => { touchEndX.current = e.touches[0].clientX }
  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return
    const diff = touchStartX.current - touchEndX.current
    const threshold = 50
    if (diff > threshold) setCurrentSlide(prev => Math.min(prev + 1, mediaItems.length - 1))
    else if (diff < -threshold) setCurrentSlide(prev => Math.max(prev - 1, 0))
    touchStartX.current = null
    touchEndX.current = null
  }

  const handleLike = async () => {
    if (isLiking) return
    const newLikeState = !isLiked
    setIsLiked(newLikeState)
    setLocalLikes(prev => newLikeState ? prev + 1 : prev - 1)
    try { await likePost(post.id) }
    catch (error) {
      setIsLiked(!newLikeState)
      setLocalLikes(prev => newLikeState ? prev - 1 : prev + 1)
    }
  }

  const handleSave = async () => {
    const newSaveState = !isSaved
    setIsSaved(newSaveState)
    try { await savePost(post.id) }
    catch (error) { setIsSaved(!newSaveState) }
  }

  const handleCommentSubmit = async (e) => {
    e.preventDefault()
    if (!commentText.trim() || isCommenting) return
    const tempComment = {
      id: Date.now(),
      content: commentText.trim(),
      author_name: 'Anda',
      user_role: 'current_user',
      created_at: new Date().toISOString(),
    }
    setLocalComments(prev => [tempComment, ...prev])
    setCommentText('')
    try { await addComment(post.id, commentText.trim()) }
    catch (error) { setLocalComments(prev => prev.filter(c => c.id !== tempComment.id)) }
  }

  const handleImageError = (e) => {
    e.target.style.display = 'none'
    e.target.parentElement.classList.add('bg-lp-surface')
  }

  const nextSlide = () => setCurrentSlide(prev => Math.min(prev + 1, mediaItems.length - 1))
  const prevSlide = () => setCurrentSlide(prev => Math.max(prev - 1, 0))

  const formatTime = (dateStr) => {
    if (getRelativeTime) return getRelativeTime(dateStr)
    return new Date(dateStr).toLocaleDateString('id-ID')
  }

  // Desktop Modal
  if (!isMobile) {
    return (
      <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 md:p-8 lg:p-12 animate-fadeIn">
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-white hover:text-gray-300 z-[60] p-2"
        >
          <FaTimes className="text-2xl sm:text-3xl" />
        </button>

        <div className="bg-white w-full h-[100dvh] md:w-auto md:h-auto md:max-h-[90vh] flex flex-col md:inline-block overflow-hidden shadow-2xl relative md:rounded-md md:pr-[350px] lg:pr-[400px]">
          
          {/* Image/Content Section */}
          <div className="w-full md:w-auto bg-lp-surface flex items-center justify-center flex-shrink-0 h-[45vh] md:h-full relative border-b md:border-b-0 border-lp-border">
            {hasMedia ? (
              <>
                <div 
                  className="w-full h-full md:w-auto md:h-auto flex items-center justify-center bg-lp-surface"
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                >
                  <img
                    src={resolveBackendAssetUrl(mediaItems[currentSlide]?.url)}
                    alt={`Post content ${currentSlide + 1}`}
                    className="w-full h-full md:w-auto md:h-auto md:max-w-[calc(95vw-350px)] lg:max-w-[calc(95vw-400px)] md:max-h-[90vh] md:min-h-[400px] object-contain block"
                    onError={handleImageError}
                  />
                </div>
                
                {hasMultipleMedia && (
                  <>
                    {currentSlide > 0 && (
                      <button onClick={prevSlide} className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/50 hover:bg-white text-black p-2 rounded-full transition-all shadow-sm z-20">
                        <FaChevronLeft className="text-sm" />
                      </button>
                    )}
                    {currentSlide < mediaItems.length - 1 && (
                      <button onClick={nextSlide} className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/50 hover:bg-white text-black p-2 rounded-full transition-all shadow-sm z-20">
                        <FaChevronRight className="text-sm" />
                      </button>
                    )}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
                      {mediaItems.map((_, index) => (
                        <button key={index} onClick={() => setCurrentSlide(index)} className={`w-1.5 h-1.5 rounded-full transition-all ${index === currentSlide ? 'bg-white scale-125' : 'bg-white/50'}`} />
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="w-full h-full md:w-[400px] lg:w-[500px] md:min-h-[450px] flex flex-col items-center justify-center p-6 sm:p-12 bg-lp-surface">
                <div className="mb-4 sm:mb-6 flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white border border-lp-border flex items-center justify-center shadow-sm">
                    <FaFileAlt className="text-lp-text2 text-lg sm:text-xl" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-semibold text-lp-text tracking-tight">Postingan Teks</h2>
                </div>
                
                {post.title && (
                  <h1 className="text-xl sm:text-2xl font-semibold text-lp-text mb-4 text-center tracking-tight">
                    {post.title}
                  </h1>
                )}
                
                <div className="max-w-md w-full">
                  <div className="bg-white p-6 sm:p-8 rounded-xl border border-lp-border shadow-sm">
                    <p className="text-lp-text text-[14px] font-normal leading-relaxed whitespace-pre-line text-center">
                      {post.content}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="w-full md:w-[350px] lg:w-[400px] flex flex-col h-[55vh] md:h-full bg-white relative md:absolute md:top-0 md:bottom-0 md:right-0 border-l border-lp-border">
            
            {/* Header */}
            <div className="flex items-center justify-between p-3 sm:p-4 border-b border-lp-border bg-white flex-shrink-0">
              <Link to={`/profile/${post.role}/${username}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <div className="w-8 h-8 bg-lp-accentS border border-lp-borderA rounded-full flex items-center justify-center text-lp-atext text-xs font-bold shrink-0 overflow-hidden">
                  {post.author_avatar ? (
                    <img src={resolveBackendAssetUrl(post.author_avatar)} alt={username} className="w-full h-full object-cover" />
                  ) : (
                    username?.[0]?.toUpperCase() || '?'
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-lp-text text-[14px] tracking-tight">{username}</span>
                </div>
              </Link>
              <button className="text-lp-text3 hover:text-lp-text2 p-1 font-bold tracking-widest leading-none pb-2">
                ...
              </button>
            </div>

            {/* Scrollable Content + Comments */}
            <div className="flex-1 overflow-y-auto">
              {/* Caption */}
              {post.content && (
                <div className="p-5 flex items-start space-x-4 border-b-[3px] border-gray-100 bg-gray-50/50 mb-2 relative">
                  <Link 
                    to={`/profile/${post.role}/${username}`}
                    className="flex-shrink-0 mt-0.5"
                  >
                    <div className="w-9 h-9 bg-lp-bg rounded-full flex items-center justify-center text-lp-text border-2 border-white shadow-sm text-sm font-bold shrink-0 overflow-hidden">
                      {post.author_avatar ? (
                        <img src={resolveBackendAssetUrl(post.author_avatar)} alt={username} className="w-full h-full object-cover" />
                      ) : (
                        username?.[0]?.toUpperCase() || '?'
                      )}
                    </div>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-gray-800 text-[14px] tracking-tight mr-2">
                      <Link 
                        to={`/profile/${post.role}/${username}`}
                        className="hover:text-lp-accent transition-colors"
                      >
                        {post.author_name || username}
                      </Link>
                    </span>
                    <div className="text-gray-700 font-normal whitespace-pre-line break-words text-[14px] leading-relaxed mt-1">
                      {post.content}
                    </div>
                    <div className="text-gray-400 text-[11px] font-medium mt-3 uppercase tracking-wider">
                      {formatTime(post.created_at)}
                    </div>
                  </div>
                </div>
              )}

              {/* Comments List */}
              <div className="px-4 pb-4 space-y-4 pt-2">
                {commentsLoading ? (
                  <div className="text-center py-8">
                    <p className="font-medium text-lp-text text-[14px]">Memuat komentar...</p>
                  </div>
                ) : localComments.length > 0 ? (
                  localComments.map((comment) => (
                    <div key={comment.id} className="flex items-start space-x-3 group">
                      <Link 
                        to={`/profile/${comment.user_role || 'mahasiswa'}/${cleanUsername(comment.author_username || comment.author_name)}`}
                        className="flex-shrink-0"
                      >
                        <div className="w-8 h-8 bg-lp-surface border border-lp-border rounded-full flex items-center justify-center text-lp-text2 text-xs font-bold shrink-0 overflow-hidden">
                          {comment.author_avatar ? (
                            <img src={resolveBackendAssetUrl(comment.author_avatar)} alt={comment.author_name} className="w-full h-full object-cover" />
                          ) : (
                            comment.author_name?.[0]?.toUpperCase() || '?'
                          )}
                        </div>
                      </Link>
                      <div className="flex-1 min-w-0 pt-1">
                        <span className="font-semibold text-lp-text text-[14px] tracking-tight mr-2">
                          <Link 
                            to={`/profile/${comment.user_role || 'mahasiswa'}/${cleanUsername(comment.author_username || comment.author_name)}`}
                            className="hover:opacity-80 transition-opacity"
                          >
                            {comment.author_name || 'Unknown'}
                          </Link>
                        </span>
                        <span className="text-lp-text text-[14px] font-normal break-words leading-relaxed">
                          {comment.content}
                        </span>
                        <div className="text-lp-text3 text-[12px] font-normal mt-1 flex gap-3">
                          <span>{formatTime(comment.created_at)}</span>
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
                    <p className="text-[12px] mt-1 text-lp-text3 font-light">Mulai obrolan.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Actions + Comment Input (Sticky bottom) */}
            <div className="border-t border-lp-border bg-white flex-shrink-0">
              <div className="flex items-center justify-between px-4 py-2 mt-1">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={handleLike}
                    className={`transition-colors ${
                      isLiked ? 'text-lp-red hover:text-lp-red' : 'text-lp-text hover:text-lp-text2'
                    }`}
                  >
                    {isLiked ? <FaHeart className="text-2xl" /> : <FaRegHeart className="text-2xl" />}
                  </button>
                  <button className="text-lp-text hover:text-lp-text2">
                    <FaComment className="text-2xl transform scale-x-[-1]" />
                  </button>
                  <button className="text-lp-text hover:text-lp-text2 mb-1">
                    <FaPaperPlane className="text-2xl transform -rotate-12" />
                  </button>
                </div>
                <button 
                  onClick={handleSave}
                  className={`transition-colors ${
                    isSaved ? 'text-lp-text hover:text-lp-text' : 'text-lp-text hover:text-lp-text2'
                  }`}
                >
                  {isSaved ? <FaBookmark className="text-2xl" /> : <FaRegBookmark className="text-2xl" />}
                </button>
              </div>

              <div className="px-4 pb-3">
                <div className="font-semibold text-[14px] text-lp-text mb-1">
                  {localLikes || 0} suka
                </div>
                <div className="text-[10px] text-lp-text3 uppercase tracking-wide">
                  {formatTime(post.created_at)}
                </div>
              </div>

              <form onSubmit={handleCommentSubmit} className="px-4 py-3 border-t border-lp-border flex items-center space-x-3">
                <button type="button" className="text-lp-text hover:text-lp-text2">
                  <FaSmile className="text-2xl" />
                </button>
                <input
                  ref={commentInputRef}
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
                      ? 'text-lp-atext hover:text-lp-accent'
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
    )
  }

  // Mobile Drawer
  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 animate-fadeIn" onClick={onClose}>
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-lp-border rounded-t-2xl max-h-[85vh] overflow-hidden animate-slideUp" onClick={e => e.stopPropagation()}>
        <div className="flex justify-center py-3">
          <div className="w-10 h-1 bg-lp-border rounded-full" />
        </div>

        {/* Mobile Image */}
        {hasMedia && (
          <div className="w-full relative bg-lp-surface" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
            <div className="relative overflow-hidden" style={{ maxHeight: '300px' }}>
              <div className="flex transition-transform duration-300 ease-out" style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
                {mediaItems.map((media, index) => (
                  <div key={index} className="w-full flex-shrink-0 flex items-center justify-center" style={{ maxHeight: '300px' }}>
                    <img src={resolveBackendAssetUrl(media.url)} alt={`Post ${index + 1}`} className="w-full h-auto object-contain" style={{ maxHeight: '300px' }} />
                  </div>
                ))}
              </div>
              {hasMultipleMedia && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
                  {mediaItems.map((_, index) => (
                    <div key={index} className={`rounded-full transition-all ${index === currentSlide ? 'bg-lp-accent w-2 h-2' : 'bg-white/60 w-1.5 h-1.5'}`} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between px-4 py-3 border-b border-lp-border">
          <h3 className="font-semibold text-lp-text text-[14px] tracking-tight">Komentar</h3>
          <button onClick={onClose} className="text-lp-text3 hover:text-lp-text2 p-2 rounded-full hover:bg-lp-surface transition-colors">
            <FaTimes className="text-sm" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 max-h-[40vh]">
          {localComments.length > 0 ? (
            <div className="space-y-3">
              {localComments.map((comment) => (
                <div key={comment.id} className="flex items-start space-x-3 group">
                  <div className="w-8 h-8 bg-lp-surface border border-lp-border rounded-full flex items-center justify-center text-lp-text2 text-xs font-bold shrink-0 overflow-hidden">
                    {comment.author_avatar ? (
                      <img src={resolveBackendAssetUrl(comment.author_avatar)} alt={comment.author_name} className="w-full h-full object-cover" />
                    ) : (
                      comment.author_name?.[0]?.toUpperCase() || '?'
                    )}
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                    <span className="font-semibold text-lp-text text-[14px] tracking-tight mr-2">{comment.author_name || 'Unknown'}</span>
                    <span className="text-lp-text text-[14px] font-normal break-words leading-relaxed">{comment.content}</span>
                    <div className="text-lp-text3 text-[12px] font-normal mt-1">
                      <span>{formatTime(comment.created_at)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-12 h-12 mx-auto mb-3 bg-lp-accentS rounded-2xl flex items-center justify-center">
                <span className="text-2xl">💬</span>
              </div>
              <p className="font-medium text-lp-text text-[14px]">Belum ada komentar</p>
              <p className="text-[12px] mt-1 text-lp-text3 font-light">Jadilah yang pertama berkomentar!</p>
            </div>
          )}
        </div>

        <div className="border-t border-lp-border p-4">
          <form onSubmit={handleCommentSubmit} className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Tambahkan komentar..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="flex-1 text-[13px] font-light text-lp-text border-none focus:outline-none bg-transparent placeholder-lp-text3"
              disabled={isCommenting}
            />
            <button 
              type="submit"
              disabled={!commentText.trim() || isCommenting}
              className={`text-[12px] font-semibold transition-colors ${
                commentText.trim() && !isCommenting
                  ? 'text-lp-atext hover:text-lp-accent'
                  : 'text-lp-text3/50 cursor-not-allowed'
              }`}
            >
              {isCommenting ? '...' : 'Kirim'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default memo(PostDetailModal)
