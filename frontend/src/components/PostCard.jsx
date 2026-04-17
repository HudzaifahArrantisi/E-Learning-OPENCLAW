// components/PostCard.jsx
import React, { useState, memo, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { usePostInteractions } from '../hooks/usePostInteractions'
import { 
  FaHeart, FaRegHeart, FaComment, FaPaperPlane, 
  FaBookmark, FaRegBookmark, FaEllipsisH, FaSmile, 
  FaTimes, FaChevronLeft, FaChevronRight 
} from 'react-icons/fa'
import { FiSend } from 'react-icons/fi'
import { BsBookmark, BsBookmarkFill, BsHeart, BsHeartFill } from 'react-icons/bs'
import { MdCropSquare, MdCropPortrait, MdCropLandscape, MdCrop169 } from 'react-icons/md'
import { resolveBackendAssetUrl } from '../utils/assetUrl'

const cleanUsername = (username) => {
  if (!username) return ''
  return username.toLowerCase()
    .replace(/^ormawa_/, '')
    .replace(/^ukm_/, '')
    .replace(/^admin_/, '')
    .trim()
}

const CommentItem = memo(({ comment, getRelativeTime }) => {
  if (!comment) return null
  
  return (
    <div className="flex items-start space-x-3 group mb-4 animate-fadeIn">
      <Link 
        to={`/profile/${comment.user_role || 'mahasiswa'}/${cleanUsername(comment.author_username || comment.author_name)}`}
        className="flex-shrink-0"
      >
        <div className="w-8 h-8 bg-lp-surface border border-lp-border rounded-full flex items-center justify-center text-lp-text2 text-xs font-bold shrink-0">
          {comment.author_name?.[0]?.toUpperCase() || '?'}
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
          {comment.content || ''}
        </span>
        <div className="text-lp-text3 text-[12px] font-normal mt-1 flex gap-3">
          <span>{getRelativeTime ? getRelativeTime(comment.created_at) : new Date(comment.created_at).toLocaleDateString('id-ID')}</span>
          <button className="font-semibold hidden group-hover:block hover:text-lp-text2">Balas</button>
        </div>
      </div>
      <button className="pt-2 text-lp-text3 hover:text-lp-red px-1">
        <FaRegHeart className="text-[10px]" />
      </button>
    </div>
  )
})

const getAspectRatioInfo = (width, height) => {
  if (!width || !height) return { 
    ratio: '1:1', 
    class: 'aspect-square',
    icon: <MdCropSquare />
  }
  
  const ratio = height / width
  
  if (ratio >= 0.95 && ratio <= 1.05) {
    return { ratio: '1:1', class: 'aspect-square', icon: <MdCropSquare /> }
  }
  if (ratio >= 1.2 && ratio <= 1.35) {
    return { ratio: '4:5', class: 'aspect-[4/5]', icon: <MdCropPortrait /> }
  }
  if (ratio >= 1.7 && ratio <= 1.85) {
    return { ratio: '9:16', class: 'aspect-[9/16]', icon: <MdCrop169 /> }
  }
  if (ratio >= 0.5 && ratio <= 0.6) {
    return { ratio: '1.91:1', class: 'aspect-video', icon: <MdCropLandscape /> }
  }
  if (ratio > 1) {
    return { ratio: 'custom', class: '', icon: <MdCropPortrait /> }
  }
  return { ratio: 'custom', class: '', icon: <MdCropLandscape /> }
}

const PostCard = memo(({ post, getRelativeTime }) => {
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
  const [showComments, setShowComments] = useState(false)
  const [localComments, setLocalComments] = useState([])
  const [currentSlide, setCurrentSlide] = useState(0)
  const [showFullCaption, setShowFullCaption] = useState(false)
  const [showNavigation, setShowNavigation] = useState(false)
  const [animateLike, setAnimateLike] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  
  const commentInputRef = useRef(null)

  // Sync dengan data terbaru
  useEffect(() => {
    setIsLiked(post.user_has_liked || false)
    setIsSaved(post.user_has_saved || false)
    setLocalLikes(post.likes_count || 0)
    setLocalComments(Array.isArray(post?.comments) ? post.comments : [])
  }, [post])

  const username = cleanUsername(post.author_username || post.author_name?.toLowerCase().replace(/\s+/g, '_'))

  // Handle multiple media
  const mediaUrls = Array.isArray(post.media_url) ? post.media_url : 
                   post.media_url ? [post.media_url] : []
  
  const hasMultipleMedia = mediaUrls.length > 1
  const hasMedia = mediaUrls.length > 0

  const handleLike = async () => {
    if (isLiking) return
    
    const newLikeState = !isLiked
    setIsLiked(newLikeState)
    setAnimateLike(true)
    setLocalLikes(prev => newLikeState ? prev + 1 : prev - 1)

    try {
      await likePost(post.id)
    } catch (error) {
      setIsLiked(!newLikeState)
      setLocalLikes(prev => newLikeState ? prev - 1 : prev + 1)
    }
    
    setTimeout(() => setAnimateLike(false), 1000)
  }

  const handleSave = async () => {
    const newSaveState = !isSaved
    setIsSaved(newSaveState)

    try {
      await savePost(post.id)
    } catch (error) {
      setIsSaved(!newSaveState)
    }
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
      replies: []
    }

    setLocalComments(prev => [tempComment, ...prev])
    setCommentText('')

    try {
      await addComment(post.id, commentText.trim())
    } catch (error) {
      setLocalComments(prev => prev.filter(comment => comment.id !== tempComment.id))
    }
  }

  const handleImageError = (e) => {
    e.target.style.display = 'none'
    e.target.parentElement.classList.add('bg-lp-surface')
  }

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % mediaUrls.length)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + mediaUrls.length) % mediaUrls.length)
  }

  // Check if mobile
  const [isMobile, setIsMobile] = useState(false)
  
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Format caption
  const displayTitle = post.title || ''
  const displayContent = post.content || ''
  
  const shouldTruncateCaption = displayContent.length > 150 && !showFullCaption
  const truncatedCaption = shouldTruncateCaption 
    ? displayContent.substring(0, 150) + '...' 
    : displayContent

  // Heart animation
  const HeartAnimation = () => (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
      <div className="animate-heartBeat">
        <BsHeartFill className="text-white text-8xl opacity-80 drop-shadow-2xl" />
      </div>
    </div>
  )

  return (
    <>
      <div className="bg-white border border-lp-border rounded-2xl mb-4 w-full overflow-hidden max-w-[470px] mx-auto hover:border-lp-borderA hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-300 group">
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-3">
        <Link
          to={`/profile/${post.role}/${username}`}
          className="flex items-center gap-3 hover:opacity-90 transition-opacity"
        >
          <div className="w-8 h-8 bg-lp-accentS border border-lp-borderA rounded-full flex items-center justify-center text-lp-atext text-[11px] font-bold">
            {username?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <div className="font-semibold text-lp-text text-[13px] hover:underline tracking-tight">{username}</div>
            <div className="text-[10px] text-lp-text3 font-mono tracking-wider uppercase">{post.role}</div>
          </div>
        </Link>

        <button className="text-lp-text3 hover:text-lp-text2 p-1.5 rounded-full hover:bg-lp-surface transition-colors">
          <FaEllipsisH className="text-sm" />
        </button>
      </div>

      {/* Image Carousel */}
      {hasMedia && (
        <div 
          className="w-full relative bg-lp-surface"
          onMouseEnter={() => setShowNavigation(true)}
          onMouseLeave={() => setShowNavigation(false)}
        >
          <div className={`relative flex items-center justify-center overflow-hidden ${!imageLoaded ? 'animate-pulse bg-lp-surface' : ''}`}
            style={{ minHeight: '200px', maxHeight: '600px' }}
          >
            {animateLike && <HeartAnimation />}
            
            <div className="w-full h-full flex items-center justify-center">
              <img
                src={resolveBackendAssetUrl(mediaUrls[currentSlide])}
                alt={`Post content ${currentSlide + 1}`}
                className="w-full h-auto object-contain"
                onError={handleImageError}
                onLoad={() => setImageLoaded(true)}
                loading="lazy"
                style={{ display: 'block', maxHeight: '600px' }}
              />
            </div>
            
            {hasMultipleMedia && (
              <>
                <button
                  onClick={prevSlide}
                  className={`absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-sm text-lp-text p-2 rounded-full hover:bg-white transition-all z-20 shadow-sm ${
                    isMobile || showNavigation ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  <FaChevronLeft className="text-xs" />
                </button>
                <button
                  onClick={nextSlide}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-sm text-lp-text p-2 rounded-full hover:bg-white transition-all z-20 shadow-sm ${
                    isMobile || showNavigation ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  <FaChevronRight className="text-xs" />
                </button>
              </>
            )}
          </div>

          {hasMultipleMedia && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
              {mediaUrls.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    index === currentSlide 
                      ? 'bg-lp-accent scale-125' 
                      : 'bg-lp-text3/40 hover:bg-lp-text3/60'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Content Area */}
      <div className="px-4 pt-3">
        {/* Actions */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <button
              onClick={handleLike}
              disabled={isLiking}
              className={`relative flex items-center gap-1.5 ${isLiking ? 'opacity-50' : 'hover:opacity-70'} transition-opacity`}
            >
              {isLiked ? 
                <BsHeartFill className="text-lp-red text-lg hover:scale-110 transition-transform" /> : 
                <BsHeart className="text-lg text-lp-text hover:text-lp-red transition-colors" />
              }
              <span className="text-[12px] font-semibold text-lp-text">{localLikes}</span>
            </button>
            <button 
              onClick={() => {
                setShowComments(true);
                setTimeout(() => commentInputRef.current?.focus(), 100);
              }}
              className="flex items-center gap-1.5 hover:opacity-70 transition-opacity"
            >
              <FaComment className="text-lg text-lp-text hover:text-lp-accent transition-colors scale-x-[-1]" />
              <span className="text-[12px] font-semibold text-lp-text">{post.comments_count || 0}</span>
            </button>
            <button className="flex items-center gap-1.5 hover:opacity-70 transition-opacity">
              <FiSend className="text-lg text-lp-text hover:text-lp-green transition-colors -rotate-45" />
            </button>
          </div>
        </div>

        {/* Caption */}
        {displayContent && (
          <div className="mb-2">
            <div className="text-lp-text text-[13px] font-light leading-relaxed">
              <span className="font-semibold mr-1.5 hover:underline cursor-pointer tracking-tight">{username}</span>
              <span className="whitespace-pre-line">
                {truncatedCaption}
              </span>
              {shouldTruncateCaption && (
                <button
                  onClick={() => setShowFullCaption(true)}
                  className="text-lp-text3 hover:text-lp-text2 ml-1 text-[12px] font-medium"
                >
                  selengkapnya
                </button>
              )}
              {showFullCaption && displayContent.length > 150 && (
                <button
                  onClick={() => setShowFullCaption(false)}
                  className="text-lp-text3 hover:text-lp-text2 ml-1 text-[12px] font-medium"
                >
                  sembunyikan
                </button>
              )}
            </div>
          </div>
        )}

        {/* View Comments */}
        {localComments.length > 0 && (
          <button 
            onClick={() => setShowComments(true)}
            className="text-lp-text3 text-[12px] font-light mb-2 hover:text-lp-text2 transition-colors"
          >
            Lihat semua {localComments.length} komentar
          </button>
        )}

        {/* Time */}
        <div className="mb-3">
          <span className="text-[10px] text-lp-text3 uppercase tracking-widest font-mono">
            {getRelativeTime ? getRelativeTime(post.created_at) : new Date(post.created_at).toLocaleDateString('id-ID')}
          </span>
        </div>
      </div>
      </div> {/* Tutup card utama supaya Modal bebas dari efek CSS Transform */}

      {/* Comments Modal/Drawer */}
      {showComments && (
        <>
          {/* Desktop Modal */}
          {!isMobile && (
            <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 md:p-8 lg:p-12 animate-fadeIn">
              {/* Tombol Close Mengambang */}
              <button 
                onClick={() => setShowComments(false)}
                className="absolute top-4 right-4 text-white hover:text-gray-300 z-[60] p-2"
              >
                <FaTimes className="text-2xl sm:text-3xl" />
              </button>

              <div className="bg-white w-full h-[100dvh] md:w-auto md:h-auto md:max-h-[90vh] flex flex-col md:inline-block overflow-hidden shadow-2xl relative md:rounded-md md:pr-[350px] lg:pr-[400px]">
                
                {/* Bagian Gambar/Content - Background Putih/Abu agar tidak ada pillar hitam */}
                <div className={`w-full md:w-auto bg-lp-surface flex items-center justify-center flex-shrink-0 h-[45vh] md:h-full relative border-b md:border-b-0 border-lp-border`}>
                  {hasMedia ? (
                    <>
                      <div className="w-full h-full md:w-auto md:h-auto flex items-center justify-center bg-lp-surface">
                        <img
                          src={resolveBackendAssetUrl(mediaUrls[currentSlide])}
                          alt={`Post content ${currentSlide + 1}`}
                          className="w-full h-full md:w-auto md:h-auto md:max-w-[calc(95vw-350px)] lg:max-w-[calc(95vw-400px)] md:max-h-[90vh] md:min-h-[400px] object-contain block"
                          onError={handleImageError}
                        />
                      </div>
                      
                      {hasMultipleMedia && (
                        <>
                          <button onClick={prevSlide} className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/50 hover:bg-white text-black p-2 rounded-full transition-all shadow-sm">
                            <FaChevronLeft className="text-sm" />
                          </button>
                          <button onClick={nextSlide} className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/50 hover:bg-white text-black p-2 rounded-full transition-all shadow-sm">
                            <FaChevronRight className="text-sm" />
                          </button>
                          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                            {mediaUrls.map((_, index) => (
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

                {/* Bagian Sidebar Konten (Komentar & Caption) */}
                <div className="w-full md:w-[350px] lg:w-[400px] flex flex-col h-[55vh] md:h-full bg-white relative md:absolute md:top-0 md:bottom-0 md:right-0 border-l border-lp-border">
                  
                  {/* Header Post */}
                  <div className="flex items-center justify-between p-3 sm:p-4 border-b border-lp-border bg-white flex-shrink-0">
                    <Link to={`/profile/${post.role}/${username}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                      <div className="w-8 h-8 bg-lp-accentS border border-lp-borderA rounded-full flex items-center justify-center text-lp-atext text-xs font-bold shrink-0">
                        {username?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-lp-text text-[14px] tracking-tight">{username}</span>
                      </div>
                    </Link>
                    <button className="text-lp-text3 hover:text-lp-text2 p-1 font-bold tracking-widest leading-none pb-2">
                      ...
                    </button>
                  </div>

                  {/* Area Konten dan Komentar */}
                  <div className="flex-1 overflow-y-auto">
                    {/* Caption diposisikan di puncak area */}
                    {post.content && (
                      <div className="p-5 flex items-start space-x-4 border-b-[3px] border-gray-100 bg-gray-50/50 mb-2 relative">
                        <Link 
                          to={`/profile/${post.role}/${username}`}
                          className="flex-shrink-0 mt-0.5"
                        >
                          <div className="w-9 h-9 bg-lp-bg rounded-full flex items-center justify-center text-lp-text border-2 border-white shadow-sm text-sm font-bold shrink-0">
                            {username?.[0]?.toUpperCase() || '?'}
                          </div>
                        </Link>
                        <div className="flex-1 min-w-0">
                          <span className="font-bold text-gray-800 text-[14px] tracking-tight mr-2">
                            <Link 
                              to={`/profile/${post.role}/${username}`}
                              className="hover:text-lp-accent transition-colors"
                            >
                              {username}
                            </Link>
                          </span>
                          <div className="text-gray-700 font-normal whitespace-pre-line break-words text-[14px] leading-relaxed mt-1">
                            {post.content}
                          </div>
                          <div className="text-gray-400 text-[11px] font-medium mt-3 uppercase tracking-wider">
                            {getRelativeTime ? getRelativeTime(post.created_at) : new Date(post.created_at).toLocaleDateString('id-ID')}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="px-4 pb-4 space-y-4 pt-2">
                      {localComments.length > 0 ? (
                        localComments.map((comment) => (
                          <div key={comment.id} className="flex items-start space-x-3 group">
                            <Link 
                              to={`/profile/${comment.user_role || 'mahasiswa'}/${cleanUsername(comment.author_username || comment.author_name)}`}
                              className="flex-shrink-0"
                            >
                              <div className="w-8 h-8 bg-lp-surface border border-lp-border rounded-full flex items-center justify-center text-lp-text2 text-xs font-bold shrink-0">
                                {comment.author_name?.[0]?.toUpperCase() || '?'}
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
                                <span>{getRelativeTime ? getRelativeTime(comment.created_at) : new Date(comment.created_at).toLocaleDateString('id-ID')}</span>
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

                  {/* Actions, Likes, dan Input Komentar (Sticky di bawah) */}
                  <div className="border-t border-lp-border bg-white flex-shrink-0">
                    {/* Action Buttons */}
                    <div className="flex items-center justify-between px-4 py-2 mt-1">
                      <div className="flex items-center space-x-4">
                        <button
                          onClick={handleLike}
                          className={`transition-colors ${
                            isLiked 
                              ? 'text-lp-red hover:text-lp-red' 
                              : 'text-lp-text hover:text-lp-text2'
                          }`}
                        >
                          {isLiked ? (
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
                        onClick={handleSave}
                        className={`transition-colors ${
                          isSaved 
                            ? 'text-lp-text hover:text-lp-text' 
                            : 'text-lp-text hover:text-lp-text2'
                        }`}
                      >
                        {isSaved ? (
                          <FaBookmark className="text-2xl" />
                        ) : (
                          <FaRegBookmark className="text-2xl" />
                        )}
                      </button>
                    </div>

                    {/* Like Count & Timestamp */}
                    <div className="px-4 pb-3">
                      <div className="font-semibold text-[14px] text-lp-text mb-1">
                        {localLikes || 0} suka
                      </div>
                      <div className="text-[10px] text-lp-text3 uppercase tracking-wide">
                        {getRelativeTime ? getRelativeTime(post.created_at) : new Date(post.created_at).toLocaleDateString('id-ID')}
                      </div>
                    </div>

                    {/* Input Komentar Area */}
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
          )}

          {/* Mobile Drawer */}
          {isMobile && (
            <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 animate-fadeIn">
              <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-lp-border rounded-t-2xl max-h-[80vh] overflow-hidden animate-slideUp">
                <div className="flex justify-center py-3">
                  <div className="w-10 h-1 bg-lp-border rounded-full" />
                </div>

                <div className="flex items-center justify-between px-4 py-3 border-b border-lp-border">
                  <h3 className="font-semibold text-lp-text text-[14px] tracking-tight">Komentar</h3>
                  <button onClick={() => setShowComments(false)} className="text-lp-text3 hover:text-lp-text2 p-2 rounded-full hover:bg-lp-surface transition-colors">
                    <FaTimes className="text-sm" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar max-h-[50vh]">
                  {localComments.length > 0 ? (
                    <div className="space-y-3">
                      {localComments.map((comment) => (
                        <CommentItem key={comment.id} comment={comment} getRelativeTime={getRelativeTime} />
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
          )}
        </>
      )}
    </>
  )
})

export default PostCard