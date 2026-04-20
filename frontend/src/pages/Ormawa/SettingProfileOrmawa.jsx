import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import api from '../../services/api'
import Navbar from '../../components/Navbar'
import Sidebar from '../../components/Sidebar'
import useAuth from '../../hooks/useAuth'
import useProfile from '../../hooks/useProfile'

// Mock data untuk Ormawa
const mockOrmawaProfile = {
  id: 2,
  name: 'BEM Fakultas Teknik',
  username: 'bemtek',
  email: 'bem@teknik.ac.id',
  bio: 'Badan Eksekutif Mahasiswa - Wadah aspirasi dan kegiatan mahasiswa',
  website: 'https://bemtek.ac.id',
  phone: '+62 823-4567-8901',
  profile_picture: null,
  posts_count: 15,
  followers_count: 120,
  following_count: 8,
  role: 'ormawa',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
}

const SettingProfileOrmawa = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { profile: localProfile, saveProfile, updateProfile } = useProfile('ormawa')
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    bio: '',
    website: '',
    phone: '',
    username: ''
  })
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewImage, setPreviewImage] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')

  // Initialize form data from local profile
  useEffect(() => {
    if (localProfile) {
      setFormData({
        name: localProfile.name || '',
        email: localProfile.email || '',
        bio: localProfile.bio || '',
        website: localProfile.website || '',
        phone: localProfile.phone || '',
        username: localProfile.username || ''
      })
      if (localProfile.profile_picture) {
        setPreviewImage(localProfile.profile_picture)
      }
    } else {
      // Use mock data if no local profile
      setFormData({
        name: mockOrmawaProfile.name,
        email: mockOrmawaProfile.email,
        bio: mockOrmawaProfile.bio,
        website: mockOrmawaProfile.website,
        phone: mockOrmawaProfile.phone,
        username: mockOrmawaProfile.username
      })
    }
  }, [localProfile])

  // Simulate API call for profile update
  const updateProfileAPI = async (profileData) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const updatedProfile = {
          ...mockOrmawaProfile,
          ...profileData,
          id: localProfile?.id || Date.now(),
          updated_at: new Date().toISOString()
        }
        resolve({
          data: {
            success: true,
            message: 'Profile berhasil diupdate!',
            data: updatedProfile
          }
        })
      }, 1000)
    })
  }

  const updateMutation = useMutation({
    mutationFn: async (submitData) => {
      setIsSubmitting(true)
      setSaveMessage('')
      
      try {
        // Try real API first
        const response = await updateProfileAPI(submitData)
        const updatedProfile = response.data.data
        
        // Save to localStorage
        saveProfile(updatedProfile)
        
        return response
      } catch (error) {
        // Fallback to localStorage only
        const updatedProfile = {
          ...mockOrmawaProfile,
          ...submitData,
          id: localProfile?.id || Date.now(),
          updated_at: new Date().toISOString()
        }
        saveProfile(updatedProfile)
        
        return {
          data: {
            success: true,
            message: 'Profile berhasil diupdate (local)!',
            data: updatedProfile
          }
        }
      } finally {
        setIsSubmitting(false)
      }
    },
    onSuccess: (data) => {
      setSaveMessage(data.data.message)
      setTimeout(() => setSaveMessage(''), 3000)
      
      // Invalidate relevant queries
      queryClient.invalidateQueries(['ormawa-profile'])
      queryClient.invalidateQueries(['public-profile', 'ormawa', formData.username])
    },
    onError: (error) => {
      setSaveMessage('Error updating profile: ' + (error.message || 'Unknown error'))
      setTimeout(() => setSaveMessage(''), 5000)
    }
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Ukuran file maksimal 2MB')
        return
      }
      if (!file.type.startsWith('image/')) {
        alert('File harus berupa gambar')
        return
      }
      
      setSelectedFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        const imageDataUrl = reader.result
        setPreviewImage(imageDataUrl)
        // Simpan gambar ke localStorage sebagai data URL
        updateProfile({ profile_picture: imageDataUrl })
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      setSaveMessage('Nama Ormawa harus diisi')
      setTimeout(() => setSaveMessage(''), 3000)
      return
    }
    
    if (!formData.username.trim()) {
      setSaveMessage('Username harus diisi')
      setTimeout(() => setSaveMessage(''), 3000)
      return
    }

    const submitData = { ...formData }
    if (selectedFile) {
      submitData.profile_picture = previewImage
    }
    
    updateMutation.mutate(submitData)
  }

  // Show loading only if we don't have any data
  if (!localProfile && !formData.name) {
    return (
      <div className="flex min-h-screen bg-gray-100">
        <Sidebar role="ormawa" />
        <div className="flex-1 flex justify-center items-center">
          <div className="text-xl text-lp-text2 font-light">Loading profile...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-lp-bg font-sans">
      <Sidebar role="ormawa" />
      <div className="flex-1 relative overflow-hidden">
        <Navbar user={user} />
        
        {/* Background Decorative Element */}
        <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-lp-surface rounded-full blur-[120px] opacity-50 pointer-events-none z-0"></div>

        <div className="max-w-4xl mx-auto p-6 sm:p-10 relative z-10">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <span className="text-[11px] font-mono font-medium tracking-[0.2em] uppercase text-lp-text3 mb-3 block">MANAGEMENT CONSOLE</span>
            <h1 className="text-4xl md:text-5xl font-light text-lp-text tracking-tight mb-3">Pengaturan Profile Ormawa</h1>
            <p className="text-lg text-lp-text2 font-light">Konfigurasi representasi digital organisasi Anda.</p>
          </motion.div>

          {/* Alert Messages */}
          <AnimatePresence>
            {saveMessage && (
              <motion.div 
                initial={{ opacity: 0, height: 0, mb: 0 }}
                animate={{ opacity: 1, height: 'auto', mb: 24 }}
                exit={{ opacity: 0, height: 0, mb: 0 }}
                className={`overflow-hidden`}
              >
                <div className={`p-5 rounded-2xl border flex items-center gap-4 ${
                  saveMessage.includes('Error') 
                    ? 'bg-red-50/50 border-red-100 text-red-800'
                    : 'bg-lp-surface border-lp-border text-lp-text'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${saveMessage.includes('Error') ? 'bg-red-500' : 'bg-lp-text'}`}></div>
                  <p className="text-[13px] font-bold tracking-wider uppercase">{saveMessage}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Preview Card */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="lg:col-span-4 lg:sticky lg:top-24"
            >
              <div className="bg-white border border-lp-border rounded-[2.5rem] p-8 shadow-[0_32px_64px_rgba(0,0,0,0.03)] text-center">
                <div className="relative inline-block mb-6">
                  <div className="w-32 h-32 rounded-full bg-lp-surface border border-lp-border p-1">
                    {previewImage ? (
                      <img src={previewImage} alt="Preview" className="w-full h-full rounded-full object-cover grayscale-[0.2]" />
                    ) : (
                      <div className="w-full h-full rounded-full bg-lp-bg flex items-center justify-center text-white text-3xl font-light" style={{ backgroundColor: 'black' }}>
                        {formData.name?.[0]?.toUpperCase() || 'O'}
                      </div>
                    )}
                  </div>
                  <div className="absolute bottom-0 right-0 w-8 h-8 bg-lp-text text-white rounded-full flex items-center justify-center border-4 border-white">
                    <span className="text-[10px] font-bold italic">PRO</span>
                  </div>
                </div>
                
                <h3 className="text-2xl font-normal text-lp-text tracking-tight truncate">{formData.name || 'Nama Ormawa'}</h3>
                <p className="text-lp-text3 font-mono text-[11px] mb-8 mt-1 tracking-widest uppercase">@{formData.username || 'username'}</p>
                
                <div className="space-y-3 pt-8 border-t border-lp-border">
                  <a
                    href={`/profile/ormawa/${formData.username || 'username'}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full py-4 bg-lp-text text-white rounded-full text-[12px] font-bold tracking-[0.15em] uppercase hover:bg-lp-atext transition-all"
                  >
                    View Public Profile
                  </a>
                </div>
              </div>
            </motion.div>

            {/* Right Column: Settings Form */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-8"
            >
              <form onSubmit={handleSubmit} className="bg-white border border-lp-border rounded-[2.5rem] p-10 shadow-[0_32px_64px_rgba(0,0,0,0.03)]">
                <div className="space-y-10">
                  {/* Avatar Upload */}
                  <div>
                    <label className="block text-[11px] font-mono font-medium tracking-[0.2em] uppercase text-lp-text3 mb-5">PROFILE IMAGE</label>
                    <div className="flex flex-col sm:flex-row items-center gap-10">
                      <div className="w-24 h-24 rounded-full bg-lp-surface border border-lp-border overflow-hidden">
                        {previewImage ? (
                          <img src={previewImage} alt="Avatar" className="w-full h-full object-cover grayscale-[0.2]" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-lp-text text-2xl font-light">
                             {formData.name?.[0]?.toUpperCase() || 'O'}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 text-center sm:text-left">
                        <input
                          type="file"
                          id="profile-picture"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                        <label 
                          htmlFor="profile-picture" 
                          className="inline-flex items-center gap-3 px-8 py-4 bg-lp-surface border border-lp-border text-lp-text rounded-full text-[12px] font-bold tracking-[0.15em] uppercase hover:bg-lp-bg cursor-pointer transition-all mb-4"
                        >
                          Upload New Photo
                        </label>
                        <p className="text-[11px] text-lp-text3 font-medium tracking-[0.05em] uppercase opacity-60">Minimal 400x400px · PNG or JPG · Max 2MB</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10">
                    <div className="group">
                      <label className="block text-[11px] font-mono font-medium tracking-[0.2em] uppercase text-lp-text3 mb-3">NAME *</label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full bg-lp-surface border border-lp-border rounded-xl p-4 text-lp-text text-[15px] font-normal focus:outline-none focus:border-lp-text transition-all"
                        required
                        placeholder="BEM Fakultas Computer Science"
                      />
                    </div>

                    <div className="group">
                      <label className="block text-[11px] font-mono font-medium tracking-[0.2em] uppercase text-lp-text3 mb-3">USERNAME *</label>
                      <input
                        type="text"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        className="w-full bg-lp-surface border border-lp-border rounded-xl p-4 text-lp-text text-[15px] font-normal focus:outline-none focus:border-lp-text transition-all"
                        required
                        placeholder="bem_cs"
                      />
                    </div>

                    <div className="md:col-span-2 group">
                      <label className="block text-[11px] font-mono font-medium tracking-[0.2em] uppercase text-lp-text3 mb-3">EMAIL ADDRESS *</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full bg-lp-surface border border-lp-border rounded-xl p-4 text-lp-text text-[15px] font-normal focus:outline-none focus:border-lp-text transition-all"
                        required
                      />
                    </div>

                    <div className="md:col-span-2 group">
                      <label className="block text-[11px] font-mono font-medium tracking-[0.2em] uppercase text-lp-text3 mb-3">ABOUT / BIO</label>
                      <textarea
                        name="bio"
                        value={formData.bio}
                        onChange={handleChange}
                        rows="4"
                        className="w-full bg-lp-surface border border-lp-border rounded-xl p-4 text-lp-text text-[15px] font-normal focus:outline-none focus:border-lp-text transition-all resize-none"
                        placeholder="Short presentation of your organization..."
                        maxLength="150"
                      />
                      <div className="text-right mt-2">
                        <span className="text-[10px] font-mono text-lp-text3 tracking-widest uppercase opacity-60">
                          {formData.bio?.length || 0} / 150
                        </span>
                      </div>
                    </div>

                    <div className="group">
                      <label className="block text-[11px] font-mono font-medium tracking-[0.2em] uppercase text-lp-text3 mb-3">WEBSITE</label>
                      <input
                        type="url"
                        name="website"
                        value={formData.website}
                        onChange={handleChange}
                        className="w-full bg-lp-surface border border-lp-border rounded-xl p-4 text-lp-text text-[15px] font-normal focus:outline-none focus:border-lp-text transition-all"
                        placeholder="https://bem.ac.id"
                      />
                    </div>

                    <div className="group">
                      <label className="block text-[11px] font-mono font-medium tracking-[0.2em] uppercase text-lp-text3 mb-3">PHONE CONTACT</label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full bg-lp-surface border border-lp-border rounded-xl p-4 text-lp-text text-[15px] font-normal focus:outline-none focus:border-lp-text transition-all"
                        placeholder="+62 800 000 000"
                      />
                    </div>
                  </div>

                  {/* Submission Group */}
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-6 pt-10 border-t border-lp-border">
                    <p className="text-[10px] font-mono text-lp-text3 tracking-[0.15em] uppercase opacity-40 order-2 sm:order-1">
                      Last update: {localProfile?.updated_at ? new Date(localProfile.updated_at).toLocaleString('en-US', { dateStyle: 'medium'}) : 'Never'}
                    </p>
                    <div className="flex items-center gap-4 w-full sm:w-auto order-1 sm:order-2">
                      <button
                        type="button"
                        onClick={() => window.history.back()}
                        className="flex-1 sm:flex-none px-10 py-4 border border-lp-border text-lp-text2 rounded-full text-[12px] font-bold tracking-[0.15em] uppercase hover:bg-lp-surface transition-all"
                        disabled={isSubmitting}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 sm:flex-none bg-lp-text text-white px-10 py-4 rounded-full text-[12px] font-bold tracking-[0.15em] uppercase hover:bg-lp-atext disabled:opacity-40 transition-all flex items-center justify-center gap-3 shadow-[0_12px_24px_rgba(0,0,0,0.1)]"
                      >
                        {isSubmitting ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                          'Commit Changes'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingProfileOrmawa