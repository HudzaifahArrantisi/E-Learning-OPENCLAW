import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import api from '../../services/api'
import Navbar from '../../components/Navbar'
import Sidebar from '../../components/Sidebar'
import useAuth from '../../hooks/useAuth'
import useProfile from '../../hooks/useProfile'

// Mock data untuk UKM
const mockUKMProfile = {
  id: 1,
  name: 'UKM NFSCC',
  username: 'nfscc',
  email: 'nfscc@kampus.ac.id',
  bio: 'Unit Kegiatan Mahasiswa Fotografi dan Sinematografi',
  website: 'https://nfscc.ac.id',
  phone: '+62 812-3456-7890',
  profile_picture: null,
  posts_count: 8,
  followers_count: 45,
  following_count: 12,
  role: 'ukm',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
}

const SettingProfileUKM = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { profile: localProfile, saveProfile, updateProfile } = useProfile('ukm')
  
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
        name: mockUKMProfile.name,
        email: mockUKMProfile.email,
        bio: mockUKMProfile.bio,
        website: mockUKMProfile.website,
        phone: mockUKMProfile.phone,
        username: mockUKMProfile.username
      })
    }
  }, [localProfile])

  // Simulate API call for profile update
  const updateProfileAPI = async (profileData) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const updatedProfile = {
          ...mockUKMProfile,
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
          ...mockUKMProfile,
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
      queryClient.invalidateQueries(['ukm-profile'])
      queryClient.invalidateQueries(['public-profile', 'ukm', formData.username])
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
      setSaveMessage('Nama UKM harus diisi')
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
        <Sidebar role="ukm" />
        <div className="flex-1 flex justify-center items-center">
          <div className="text-xl text-lp-text2 font-light">Loading profile...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar role="ukm" />
      <div className="flex-1 max-w-2xl mx-auto pb-20">
        <Navbar user={user} />
        
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-2">Pengaturan Profile UKM</h1>
          <p className="text-lp-text2 font-light mb-6">Kelola informasi profile UKM Anda</p>

          {/* Save Message */}
          {saveMessage && (
            <div className={`mb-4 p-3 rounded-lg ${
              saveMessage.includes('Error') 
                ? 'bg-red-100 border border-red-400 text-red-700'
                : 'bg-green-100 border border-green-400 text-green-700'
            }`}>
              {saveMessage}
            </div>
          )}

          {/* Preview Card */}
          <div className="mb-6 bg-lp-surface rounded-lg shadow-sm border p-4">
            <h3 className="font-bold mb-3">Preview Profile:</h3>
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-full bg-lp-bg flex items-center justify-center text-white text-xl font-bold">
                {previewImage ? (
                  <img src={previewImage} alt="Preview" className="w-16 h-16 rounded-full object-cover" />
                ) : (
                  formData.name?.[0]?.toUpperCase() || 'U'
                )}
              </div>
              <div>
                <div className="font-bold">{formData.name || 'Nama UKM'}</div>
                <div className="text-sm text-lp-text3 font-light">@{formData.username || 'username'}</div>
                <div className="text-xs text-gray-400">
                  Akan terlihat di: {window.location.origin}/profile/ukm/{formData.username || 'username'}
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="bg-lp-surface rounded-lg shadow-sm border p-6">
            <div className="space-y-6">
              {/* Profile Picture */}
              <div className="flex items-center space-x-6">
                <div className="relative">
                  {previewImage ? (
                    <img 
                      src={previewImage} 
                      alt="Profile preview" 
                      className="w-24 h-24 rounded-full object-cover border-2 border-orange-500"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-lp-bg flex items-center justify-center text-white text-2xl font-bold">
                      {formData.name?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                </div>
                <div>
                  <input
                    type="file"
                    id="profile-picture"
                    accept="image/jpeg,image/png,image/jpg"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label 
                    htmlFor="profile-picture" 
                    className="bg-lp-accent text-white px-4 py-2 rounded-lg hover:bg-lp-atext cursor-pointer inline-block"
                  >
                    Ubah Foto Profile
                  </label>
                  <p className="text-sm text-lp-text3 font-light mt-2">Format: JPG, PNG. Maksimal 2MB</p>
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-lp-text2 mb-2">
                    Nama UKM *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full border border-lp-border border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                    placeholder="Contoh: UKM Musik"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-lp-text2 mb-2">
                    Username *
                  </label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    className="w-full border border-lp-border border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                    placeholder="nfscc"
                  />
                  <p className="text-xs text-lp-text3 font-light mt-1">
                    URL: {window.location.origin}/profile/ukm/{formData.username || 'username'}
                  </p>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-lp-text2 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full border border-lp-border border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-lp-text2 mb-2">
                    Bio
                  </label>
                  <textarea
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    rows="3"
                    className="w-full border border-lp-border border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Deskripsikan UKM Anda..."
                    maxLength="150"
                  />
                  <p className="text-xs text-lp-text3 font-light text-right mt-1">
                    {formData.bio?.length || 0}/150 karakter
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-lp-text2 mb-2">
                    Website
                  </label>
                  <input
                    type="url"
                    name="website"
                    value={formData.website}
                    onChange={handleChange}
                    className="w-full border border-lp-border border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-lp-text2 mb-2">
                    Telepon
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full border border-lp-border border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="+62 812-3456-7890"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between items-center pt-6 border-t">
                <div className="text-sm text-lp-text3 font-light">
                  Terakhir update: {localProfile?.updated_at ? new Date(localProfile.updated_at).toLocaleString('id-ID') : 'Belum pernah'}
                </div>
                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={() => window.history.back()}
                    className="px-6 py-3 border border-lp-border border rounded-lg text-lp-text2 hover:bg-lp-bg"
                    disabled={isSubmitting}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-lp-accent text-white px-6 py-3 rounded-lg hover:bg-lp-atext disabled:opacity-50 flex items-center"
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Menyimpan...
                      </>
                    ) : (
                      'Simpan Perubahan'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </form>

          {/* Quick Actions */}
          <div className="mt-6 grid grid-cols-2 gap-4">
            <a
              href={`/profile/ukm/${formData.username || 'username'}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-lp-green text-white py-3 px-4 rounded-lg text-center hover:bg-[rgb(21,128,61)]"
            >
              👀 Lihat Profile Publik
            </a>
            <a
              href="/ukm/akun"
              className="bg-purple-600 text-white py-3 px-4 rounded-lg text-center hover:bg-purple-700"
            >
              📱 Lihat Akun Saya
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingProfileUKM