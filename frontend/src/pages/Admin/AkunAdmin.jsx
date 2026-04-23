import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import api from '../../services/api'
import Navbar from '../../components/Navbar'
import Sidebar from '../../components/Sidebar'
import useAuth from '../../hooks/useAuth'
import useProfile from '../../hooks/useProfile'
import { Link } from 'react-router-dom'
import { resolveBackendAssetUrl } from '../../utils/assetUrl'

const AkunAdmin = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { data: profile, refetch: reloadProfile } = useProfile()
  const [posts, setPosts] = useState([])
  const [editingPost, setEditingPost] = useState(null)
  const [editContent, setEditContent] = useState('')

  // Load posts from localStorage
  useEffect(() => {
    const loadPosts = () => {
      try {
        const savedPosts = localStorage.getItem('admin-posts')
        if (savedPosts) {
          setPosts(JSON.parse(savedPosts))
        } else {
          // Default posts
          setPosts([
            {
              id: 1,
              content: 'Selamat datang di sistem administrasi kampus. Pengumuman penting akan disampaikan melalui channel ini.',
              media_url: null,
              created_at: new Date().toISOString(),
              likes_count: 0,
              comments_count: 0
            }
          ])
        }
      } catch (error) {
        console.error('Error loading posts:', error)
      }
    }

    loadPosts()
    
    // Listen for profile updates
    const handleProfileUpdate = () => {
      reloadProfile()
    }
    
    window.addEventListener('profileUpdated', handleProfileUpdate)
    return () => window.removeEventListener('profileUpdated', handleProfileUpdate)
  }, [])

  const savePosts = (newPosts) => {
    try {
      localStorage.setItem('admin-posts', JSON.stringify(newPosts))
      setPosts(newPosts)
    } catch (error) {
      console.error('Error saving posts:', error)
    }
  }

  const deletePost = (postId) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus postingan ini?')) {
      const newPosts = posts.filter(post => post.id !== postId)
      savePosts(newPosts)
    }
  }

  const updatePost = (postId, newContent) => {
    const newPosts = posts.map(post => 
      post.id === postId 
        ? { ...post, content: newContent, updated_at: new Date().toISOString() }
        : post
    )
    savePosts(newPosts)
    setEditingPost(null)
    setEditContent('')
  }

  const handleEdit = (post) => {
    setEditingPost(post.id)
    setEditContent(post.content)
  }

  const handleUpdate = (postId) => {
    if (editContent.trim()) {
      updatePost(postId, editContent.trim())
    }
  }

  const addSamplePost = () => {
    const newPost = {
      id: Date.now(),
      content: 'Pengumuman resmi dari administrasi kampus. Perhatikan informasi berikut! 📢',
      media_url: null,
      created_at: new Date().toISOString(),
      likes_count: 0,
      comments_count: 0
    }
    savePosts([newPost, ...posts])
  }

  return (
    <div className="flex min-h-screen bg-[#fafafa] font-sans">
      <Sidebar role="admin" />
      <div className="flex-1 w-full relative">
        <Navbar user={user} />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          {/* Profile Header */}
          <div className="bg-lp-surface rounded-lg shadow-sm border mb-6">
            <div className="p-6">
              <div className="flex flex-col md:flex-row items-start space-y-6 md:space-y-0 md:space-x-8">
                
                {/* Profile Picture */}
                <div className="flex-shrink-0 flex justify-center md:justify-start">
                  {profile?.profile_picture ? (
                    <img 
                      src={resolveBackendAssetUrl(profile.profile_picture)}
                      alt="Profile" 
                      className="w-32 h-32 rounded-full object-cover border-2 border-blue-500"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-full bg-lp-bg flex items-center justify-center text-white text-4xl font-bold">
                      {profile?.name?.[0]?.toUpperCase() || 'A'}
                    </div>
                  )}
                </div>

                {/* Profile Info */}
                <div className="flex-1">
                  <div className="flex flex-col md:flex-row md:items-center gap-3 md:space-x-6 mb-4">
                    <h1 className="text-2xl font-bold text-lp-text font-bold tracking-tight">{profile?.name || 'Administrator'}</h1>
                    <div className="flex flex-wrap gap-2">
                      <Link 
                        to="/admin/setting-profile"
                        className="bg-gray-100 text-lp-text2 px-4 py-2 rounded-lg text-sm hover:bg-gray-200"
                      >
                        ✏️ Edit Profile
                      </Link>
                      <Link 
                        to="/admin/posting-pemberitahuan"
                        className="bg-lp-accent text-white px-4 py-2 rounded-lg text-sm hover:bg-lp-atext"
                      >
                        📝 Buat Pengumuman
                      </Link>
                      <button
                        onClick={addSamplePost}
                        className="bg-lp-green text-white px-4 py-2 rounded-lg text-sm hover:bg-[rgb(21,128,61)]"
                      >
                        ➕ Sample Post
                      </button>
                    </div>
                  </div>
                  
                  {/* Stats */}
                  <div className="flex space-x-8 mb-6">
                    <div className="text-center">
                      <div className="font-bold text-lg">{posts.length}</div>
                      <div className="text-lp-text3 font-light text-sm">Postingan</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-lg">{profile?.followers_count || 0}</div>
                      <div className="text-lp-text3 font-light text-sm">Pengikut</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-lg">{profile?.following_count || 0}</div>
                      <div className="text-lp-text3 font-light text-sm">Mengikuti</div>
                    </div>
                  </div>

                  {/* Bio & Info */}
                  <div className="space-y-2">
                    <p className="text-lp-text font-semibold tracking-tight font-medium">@{profile?.username || 'admin'}</p>
                    {profile?.bio && (
                      <p className="text-lp-text2 font-light">{profile.bio}</p>
                    )}
                    
                    <div className="flex flex-wrap gap-4 text-sm text-lp-text3 font-light">
                      {profile?.website && (
                        <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-lp-atext hover:text-blue-800">
                          🌐 {profile.website}
                        </a>
                      )}
                      {profile?.email && (
                        <span>📧 {profile.email}</span>
                      )}
                      {profile?.phone && (
                        <span>📞 {profile.phone}</span>
                      )}
                    </div>
                    
                    {profile?.updated_at && (
                      <p className="text-xs text-gray-400 mt-2">
                        Terakhir update: {new Date(profile.updated_at).toLocaleString('id-ID')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <a
              href={`/profile/admin/${profile?.username || 'admin'}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-lp-surface p-4 rounded-lg shadow-sm border text-center hover:bg-lp-bg"
            >
              <div className="text-2xl mb-2">👁️</div>
              <div className="font-medium">Lihat sebagai Publik</div>
            </a>
            <Link
              to="/admin/setting-profile"
              className="bg-lp-surface p-4 rounded-lg shadow-sm border text-center hover:bg-lp-bg"
            >
              <div className="text-2xl mb-2">⚙️</div>
              <div className="font-medium">Edit Profile</div>
            </Link>
            <Link
              to="/admin/posting-pemberitahuan"
              className="bg-lp-surface p-4 rounded-lg shadow-sm border text-center hover:bg-lp-bg"
            >
              <div className="text-2xl mb-2">📝</div>
              <div className="font-medium">Buat Pengumuman</div>
            </Link>
          </div>

          {/* Posts Section */}
          <div className="bg-lp-surface rounded-lg shadow-sm border">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">Pengumuman & Postingan</h2>
              <p className="text-lp-text2 font-light text-sm">Kelola semua pengumuman dan postingan admin</p>
            </div>

            {/* Posts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
              {posts.length > 0 ? (
                posts.map(post => (
                  <div key={post.id} className="bg-lp-bg rounded-lg border overflow-hidden">
                    {post.media_url && (
                      <img 
                        src={resolveBackendAssetUrl(post.media_url)} 
                        alt="post" 
                        className="w-full h-48 object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    )}
                    <div className="p-4">
                      {editingPost === post.id ? (
                        <div className="space-y-3">
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="w-full border border-lp-border rounded-lg p-3 text-sm resize-none"
                            rows="3"
                            placeholder="Edit pengumuman..."
                          />
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleUpdate(post.id)}
                              className="bg-lp-green text-white px-3 py-2 rounded text-sm flex-1"
                            >
                              💾 Simpan
                            </button>
                            <button
                              onClick={() => setEditingPost(null)}
                              className="bg-gray-600 text-white px-3 py-2 rounded text-sm flex-1"
                            >
                              ❌ Batal
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-lp-text2 text-sm mb-3">{post.content}</p>
                          <div className="flex justify-between items-center text-xs text-lp-text3 font-light">
                            <span>{new Date(post.created_at).toLocaleDateString('id-ID')}</span>
                            <div className="flex space-x-2">
                              <span>❤️ {post.likes_count}</span>
                              <span>💬 {post.comments_count}</span>
                            </div>
                          </div>
                          <div className="flex justify-between mt-3 pt-3 border-t">
                            <button
                              onClick={() => handleEdit(post)}
                              className="text-lp-atext text-sm hover:text-blue-800"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              onClick={() => deletePost(post.id)}
                              className="text-red-600 text-sm hover:text-red-800"
                            >
                              🗑️ Hapus
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full text-center py-12 text-lp-text3">
                  <p className="text-sm">Belum ada postingan</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AkunAdmin
