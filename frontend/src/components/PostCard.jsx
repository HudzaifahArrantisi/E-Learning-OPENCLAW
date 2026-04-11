// components/PostCard.jsx - DIUPDATE UNTUK PUSAT DAN LURUS
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
    <div className="flex space-x-3 mb-3 animate-fadeIn">
      <div className="flex-shrink-0">
        <Link 
          to={`/profile/${comment.user_role || 'mahasiswa'}/${cleanUsername(comment.author_username || comment.author_name)}`}
          className="hover:opacity-80 transition-opacity"
        >
          <div className="w-6 h-6 bg-gradient-to-r from-pink-500 to-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm">
            {comment.author_name?.[0]?.toUpperCase() || '?'}
          </div>
        </Link>
      </div>
      <div className="flex-1 min-w-0">
        <div className="bg-gray-50 rounded-2xl px-3 py-2 hover:bg-gray-100 transition-colors duration-200">
          <div className="flex items-center space-x-2 mb-1">
            <Link 
              to={`/profile/${comment.user_role || 'mahasiswa'}/${cleanUsername(comment.author_username || comment.author_name)}`}
              className="hover:opacity-80 transition-opacity"
            >
              <span className="text-sm font-semibold text-gray-900 hover:underline">
                {comment.author_name || 'Unknown'}
              </span>
            </Link>
            <span className="text-xs text-gray-500">
              {getRelativeTime ? getRelativeTime(comment.created_at) : new Date(comment.created_at).toLocaleDateString('id-ID')}
            </span>
          </div>
          <p className="text-gray-800 text-sm break-words leading-relaxed">{comment.content || ''}</p>
        </div>
      </div>
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
  
  // Square (1:1)
  if (ratio >= 0.95 && ratio <= 1.05) {
    return { 
      ratio: '1:1', 
      class: 'aspect-square',
      icon: <MdCropSquare />
    }
  }
  
  // Portrait (4:5)
  if (ratio >= 1.2 && ratio <= 1.35) {
    return { 
      ratio: '4:5', 
      class: 'aspect-[4/5]',
      icon: <MdCropPortrait />
    }
  }
  
  // Vertical/Stories (9:16)
  if (ratio >= 1.7 && ratio <= 1.85) {
    return { 
      ratio: '9:16', 
      class: 'aspect-[9/16]',
      icon: <MdCrop169 />
    }
  }
  
  // Landscape (1.91:1)
  if (ratio >= 0.5 && ratio <= 0.6) {
    return { 
      ratio: '1.91:1', 
      class: 'aspect-video',
      icon: <MdCropLandscape />
    }
  }
  
  // Custom portrait
  if (ratio > 1) {
    return { 
      ratio: 'custom', 
      class: '',
      icon: <MdCropPortrait />
    }
  }
  
  // Custom landscape
  return { 
    ratio: 'custom', 
    class: '',
    icon: <MdCropLandscape />
  }
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
    e.target.parentElement.classList.add('bg-gray-100')
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

  // Instagram-like heart animation
  const HeartAnimation = () => (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
      <div className="animate-heartBeat">
        <BsHeartFill className="text-white text-8xl opacity-80 drop-shadow-2xl" />
      </div>
    </div>
  )

  return (
    <div className="bg-white rounded-lg mb-6 w-full border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden max-w-[470px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-3.5 pb-3">
        <Link
          to={`/profile/${post.role}/${username}`}
          className="flex items-center space-x-3 hover:opacity-90 transition-opacity"
        >
          <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-orange-500 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm">
            {username?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <div className="font-semibold text-gray-900 text-sm hover:underline">{username}</div>
            <div className="text-xs text-gray-500 capitalize">{post.role}</div>
          </div>
        </Link>

        <button className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition-colors">
          <FaEllipsisH className="text-lg" />
        </button>
      </div>

      {/* Image Carousel - FIXED CENTER ALIGNMENT */}
      {hasMedia && (
        <div 
          className="w-full relative bg-white"
          onMouseEnter={() => setShowNavigation(true)}
          onMouseLeave={() => setShowNavigation(false)}
        >
          <div className={`relative bg-white flex items-center justify-center overflow-hidden ${!imageLoaded ? 'animate-pulse bg-gray-100' : ''}`}
            style={{ 
              minHeight: '200px',
              maxHeight: '600px'
            }}
          >
            {/* Heart Animation Overlay */}
            {animateLike && <HeartAnimation />}
            
            {/* Image Container with Perfect Centering */}
            <div className="w-full h-full flex items-center justify-center">
              <img
                src={mediaUrls[currentSlide].startsWith('http') ? mediaUrls[currentSlide] : `http://localhost:8080${mediaUrls[currentSlide]}`}
                alt={`Post content ${currentSlide + 1}`}
                className="w-full h-auto object-contain"
                onError={handleImageError}
                onLoad={() => setImageLoaded(true)}
                loading="lazy"
                style={{
                  display: 'block',
                  maxHeight: '600px'
                }}
              />
            </div>
            
            {/* Navigation Arrows */}
            {hasMultipleMedia && (
              <>
                <button
                  onClick={prevSlide}
                  className={`absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/30 text-white p-2 rounded-full hover:bg-black/50 transition-all duration-200 backdrop-blur-sm z-20 ${
                    isMobile || showNavigation ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  <FaChevronLeft className="text-sm" />
                </button>
                <button
                  onClick={nextSlide}
                  className={`absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/30 text-white p-2 rounded-full hover:bg-black/50 transition-all duration-200 backdrop-blur-sm z-20 ${
                    isMobile || showNavigation ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  <FaChevronRight className="text-sm" />
                </button>
              </>
            )}
          </div>

          {/* Slide Indicators */}
          {hasMultipleMedia && (
            <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex space-x-2 z-20">
              {mediaUrls.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    index === currentSlide 
                      ? 'bg-white scale-125 shadow-lg' 
                      : 'bg-white/50 hover:bg-white/80'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Content Area - FIXED PADDING */}
      <div className="px-3.5 pt-3">
        {/* Actions */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleLike}
              disabled={isLiking}
              className={`relative flex items-center space-x-2 ${isLiking ? 'opacity-50' : 'hover:opacity-70'}`}
            >
              {isLiked ? 
                <BsHeartFill className="text-red-500 text-xl hover:scale-110 transition-transform" /> : 
                <BsHeart className="text-xl text-gray-900 hover:text-red-400 transition-colors" />
              }
              <span className="text-sm font-semibold text-gray-900">{localLikes}</span>
            </button>
            <button 
              onClick={() => {
                setShowComments(true);
                setTimeout(() => commentInputRef.current?.focus(), 100);
              }}
              className="flex items-center space-x-2 hover:opacity-70 transition-opacity"
            >
              <FaComment className="text-xl text-gray-900 hover:text-blue-400 transition-colors transform scale-x-[-1]" />
              <span className="text-sm font-semibold text-gray-900">{post.comments_count || 0}</span>
            </button>
            <button className="flex items-center space-x-2 hover:opacity-70 transition-opacity">
              <FiSend className="text-xl text-gray-900 hover:text-green-400 transition-colors transform -rotate-45" />
            </button>
          </div>

        </div>

        {/* Caption */}
        {displayContent && (
          <div className="mb-2">
            <div className="text-gray-900 text-sm leading-relaxed">
              <span className="font-semibold mr-2 hover:underline cursor-pointer">{username}</span>
              <span className="whitespace-pre-line">
                {truncatedCaption}
              </span>
              {shouldTruncateCaption && (
                <button
                  onClick={() => setShowFullCaption(true)}
                  className="text-gray-500 hover:text-gray-700 ml-1 text-sm font-medium"
                >
                  selengkapnya
                </button>
              )}
              {showFullCaption && displayContent.length > 150 && (
                <button
                  onClick={() => setShowFullCaption(false)}
                  className="text-gray-500 hover:text-gray-700 ml-1 text-sm font-medium"
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
            className="text-gray-500 text-sm mb-2 hover:text-gray-700 transition-colors"
          >
            Lihat semua {localComments.length} komentar
          </button>
        )}

        {/* Time */}
        <div className="mb-3">
          <span className="text-xs text-gray-500 uppercase tracking-wide">
            {getRelativeTime ? getRelativeTime(post.created_at) : new Date(post.created_at).toLocaleDateString('id-ID')}
          </span>
        </div>

     
      </div>

      {/* Comments Modal/Drawer */}
      {showComments && (
        <>
          {/* Desktop Modal */}
          {!isMobile && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fadeIn">
              <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex shadow-2xl">
                {/* Image Carousel */}
                {hasMedia && (
                  <div className="w-1/2 bg-white flex items-center justify-center relative overflow-hidden">
                    <div className="w-full h-full flex items-center justify-center">
                      <img
                        src={mediaUrls[currentSlide].startsWith('http') ? mediaUrls[currentSlide] : `http://localhost:8080${mediaUrls[currentSlide]}`}
                        alt={`Post content ${currentSlide + 1}`}
                        className="w-full h-full object-contain"
                        onError={handleImageError}
                      />
                    </div>
                    
                    {hasMultipleMedia && (
                      <>
                        <button
                          onClick={prevSlide}
                          className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-all backdrop-blur-sm"
                        >
                          <FaChevronLeft className="text-sm" />
                        </button>
                        <button
                          onClick={nextSlide}
                          className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-all backdrop-blur-sm"
                        >
                          <FaChevronRight className="text-sm" />
                        </button>
                        
                        {/* Slide Indicators */}
                        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                          {mediaUrls.map((_, index) => (
                            <button
                              key={index}
                              onClick={() => setCurrentSlide(index)}
                              className={`w-2 h-2 rounded-full transition-all ${
                                index === currentSlide 
                                  ? 'bg-white scale-125' 
                                  : 'bg-white/50 hover:bg-white/80'
                              }`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Comments Section */}
                <div className={`${hasMedia ? 'w-1/2' : 'w-full'} flex flex-col h-[80vh]`}>
                  {/* Header */}
                  <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <Link
                      to={`/profile/${post.role}/${username}`}
                      className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
                    >
                      <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-orange-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                        {username?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 text-sm">{username}</div>
                        <div className="text-xs text-gray-500 capitalize">{post.role}</div>
                      </div>
                    </Link>
                    <button 
                      onClick={() => setShowComments(false)}
                      className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100 transition-colors"
                    >
                      <FaTimes className="text-lg" />
                    </button>
                  </div>

                  {/* Comments List */}
                  <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {localComments.length > 0 ? (
                      <div className="space-y-4">
                        {localComments.map((comment) => (
                          <CommentItem 
                            key={comment.id} 
                            comment={comment} 
                            getRelativeTime={getRelativeTime}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        <div className="text-4xl mb-3 opacity-50">💬</div>
                        <p className="font-medium text-gray-700">Belum ada komentar</p>
                        <p className="text-sm mt-1 text-gray-500">Jadilah yang pertama berkomentar!</p>
                      </div>
                    )}
                  </div>

                  {/* Comment Input */}
                  <div className="border-t border-gray-200 p-4">
                    <form onSubmit={handleCommentSubmit} className="flex items-center space-x-3">
                      <button type="button" className="text-gray-500 hover:text-gray-700">
                        <FaSmile className="text-lg" />
                      </button>
                      <input
                        type="text"
                        placeholder="Tambahkan komentar..."
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        className="flex-1 text-sm border-none focus:outline-none focus:ring-0 bg-transparent placeholder-gray-400"
                        disabled={isCommenting}
                      />
                      <button 
                        type="submit"
                        disabled={!commentText.trim() || isCommenting}
                        className={`text-sm font-medium transition-all duration-200 ${
                          commentText.trim() && !isCommenting
                            ? 'text-blue-500 hover:text-blue-600'
                            : 'text-blue-300 cursor-not-allowed'
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
            <div className="fixed inset-0 bg-black/50 z-50 animate-fadeIn">
              <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[80vh] overflow-hidden animate-slideUp">
                {/* Drawer Handle */}
                <div className="flex justify-center py-3">
                  <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900">Komentar</h3>
                  <button 
                    onClick={() => setShowComments(false)}
                    className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100 transition-colors"
                  >
                    <FaTimes className="text-lg" />
                  </button>
                </div>

                {/* Comments List */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar max-h-[50vh]">
                  {localComments.length > 0 ? (
                    <div className="space-y-4">
                      {localComments.map((comment) => (
                        <CommentItem 
                          key={comment.id} 
                          comment={comment} 
                          getRelativeTime={getRelativeTime}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <div className="text-4xl mb-3 opacity-50">💬</div>
                      <p className="font-medium text-gray-700">Belum ada komentar</p>
                      <p className="text-sm mt-1 text-gray-500">Jadilah yang pertama berkomentar!</p>
                    </div>
                  )}
                </div>

                {/* Comment Input */}
                <div className="border-t border-gray-200 p-4">
                  <form onSubmit={handleCommentSubmit} className="flex items-center space-x-3">
                    <button type="button" className="text-gray-500 hover:text-gray-700">
                      <FaSmile className="text-lg" />
                    </button>
                    <input
                      type="text"
                      placeholder="Tambahkan komentar..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      className="flex-1 text-sm border-none focus:outline-none focus:ring-0 bg-transparent placeholder-gray-400"
                      disabled={isCommenting}
                    />
                    <button 
                      type="submit"
                      disabled={!commentText.trim() || isCommenting}
                      className={`text-sm font-medium transition-all duration-200 ${
                        commentText.trim() && !isCommenting
                          ? 'text-blue-500 hover:text-blue-600'
                          : 'text-blue-300 cursor-not-allowed'
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
    </div>
  )
})

export default PostCard