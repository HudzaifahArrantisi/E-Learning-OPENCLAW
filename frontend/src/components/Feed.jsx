// components/Feed.jsx
import React from 'react'
import { useQuery } from "@tanstack/react-query";
import api from '../services/api'
import PostCard from './PostCard'

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
    month: 'short',
    year: 'numeric'
  })
}

const Feed = () => {
  const { data: posts, isLoading, error } = useQuery({
    queryKey: ['feed'],
    queryFn: () => api.get('/api/feed').then(res => res.data.data || []),
    staleTime: 5 * 60 * 1000,
    cacheTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center py-12 gap-4">
      <div className="w-10 h-10 border-2 border-lp-border border-t-lp-accent rounded-full animate-spin" />
      <p className="text-lp-text2 text-sm font-light">Memuat postingan...</p>
    </div>
  )
  
  if (error) return (
    <div className="text-center py-8 text-lp-red text-sm font-light animate-fadeIn">
      Error loading feed: {error.message}
    </div>
  )

  return (
    <div className="font-sans font-light">
      {posts?.map(post => (
        <PostCard key={post.id} post={post} getRelativeTime={getRelativeTime} />
      ))}
      {(!posts || posts.length === 0) && !isLoading && (
        <div className="text-center py-12 animate-fadeIn">
          <div className="w-14 h-14 mx-auto mb-4 bg-lp-accentS rounded-2xl flex items-center justify-center">
            <span className="text-3xl opacity-70">📝</span>
          </div>
          <p className="text-[14px] font-medium text-lp-text">Belum ada postingan</p>
          <p className="text-[12px] mt-1 text-lp-text3 font-light">Jadilah yang pertama untuk posting!</p>
        </div>
      )}
    </div>
  )
}

export default Feed