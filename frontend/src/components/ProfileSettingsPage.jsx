import React, { useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import useAuth from '../hooks/useAuth'
import useProfile from '../hooks/useProfile'
import api from '../services/api'
import { resolveBackendAssetUrl } from '../utils/assetUrl'

const ROLE_CONFIG = {
  ukm: {
    title: 'Pengaturan Profil UKM',
    subtitle: 'Data ini akan tampil di profil publik UKM.',
    nameLabel: 'Nama UKM',
  },
  ormawa: {
    title: 'Pengaturan Profil Ormawa',
    subtitle: 'Data ini akan tampil di profil publik Ormawa.',
    nameLabel: 'Nama Ormawa',
  },
  admin: {
    title: 'Pengaturan Profil Admin',
    subtitle: 'Data ini akan tampil di profil publik Admin.',
    nameLabel: 'Nama Admin',
  },
}

const ProfileSettingsPage = ({ role }) => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const profileOptions = role === 'ormawa' ? { endpoint: '/api/ormawa/profile' } : undefined
  const { data: profile, isLoading, error: profileError } = useProfile(role, profileOptions)
  const config = ROLE_CONFIG[role] || ROLE_CONFIG.ukm

  const [formData, setFormData] = useState({
    name: '',
    username: '',
    bio: '',
    website: '',
    phone: '',
  })
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewImage, setPreviewImage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [localPreviewUrl, setLocalPreviewUrl] = useState('')

  const formatFileSize = (size) => {
    if (!size) return '0 KB'
    if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(2)} MB`
    return `${Math.ceil(size / 1024)} KB`
  }

  useEffect(() => {
    if (!profile) return
    setFormData({
      name: profile.name || '',
      username: profile.username || '',
      bio: profile.bio || '',
      website: profile.website || '',
      phone: profile.phone || '',
    })
    setPreviewImage(profile.profile_picture ? resolveBackendAssetUrl(profile.profile_picture) : '')
  }, [profile])

  useEffect(() => {
    return () => {
      if (localPreviewUrl) {
        URL.revokeObjectURL(localPreviewUrl)
      }
    }
  }, [localPreviewUrl])

  const publicProfileUrl = useMemo(() => {
    if (!formData.username) return ''
    return `/profile/${role}/${formData.username}`
  }, [role, formData.username])

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleFileChange = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('File harus berupa gambar.')
      event.target.value = ''
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Ukuran file maksimal 2MB.')
      event.target.value = ''
      return
    }
    setError('')
    if (localPreviewUrl) {
      URL.revokeObjectURL(localPreviewUrl)
    }
    const objectUrl = URL.createObjectURL(file)
    setLocalPreviewUrl(objectUrl)
    setSelectedFile(file)
    setPreviewImage(objectUrl)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!formData.name.trim() || !formData.username.trim()) {
      setError('Nama dan username wajib diisi.')
      return
    }
    setIsSubmitting(true)
    setMessage('')
    setError('')
    try {
      const payload = new FormData()
      payload.append('name', formData.name)
      payload.append('username', formData.username)
      payload.append('bio', formData.bio)
      payload.append('website', formData.website)
      payload.append('phone', formData.phone)
      if (selectedFile) {
        payload.append('profile_picture', selectedFile)
      }

      await api.updateMyProfile(payload)
      await queryClient.invalidateQueries({ queryKey: ['my-profile'] })
      await queryClient.invalidateQueries({ queryKey: ['public-profile'] })
      setSelectedFile(null)
      setMessage('Profil berhasil diperbarui.')
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Gagal memperbarui profil.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-lp-bg">
        <Sidebar role={role} />
        <div className="flex-1 flex items-center justify-center text-lp-text2">Memuat profil...</div>
      </div>
    )
  }

  if (profileError) {
    return (
      <div className="flex min-h-screen bg-lp-bg">
        <Sidebar role={role} />
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="max-w-lg w-full rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm">
            {profileError.message || 'Gagal memuat data profil dari database.'}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-lp-bg">
      <Sidebar role={role} />
      <div className="flex-1">
        <Navbar user={user} />
        <div className="max-w-3xl mx-auto p-6 sm:p-8">
          <h1 className="text-2xl font-semibold text-lp-text">{config.title}</h1>
          <p className="text-sm text-lp-text2 mt-1 mb-6">{config.subtitle}</p>

          {(message || error) && (
            <div className={`mb-5 rounded-lg border px-4 py-3 text-sm ${error ? 'bg-red-50 border-red-200 text-red-700' : 'bg-lp-surface border-lp-border text-lp-text'}`}>
              {error || message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-lp-border p-6 space-y-5">
            <div className="rounded-xl border border-lp-border bg-lp-surface/60 p-4 sm:p-5">
              <p className="text-sm font-semibold text-lp-text mb-1">Upload Foto Profil</p>
              <p className="text-xs text-lp-text2 mb-4">Foto akan tampil di profil publik UKM, Ormawa, dan Admin.</p>

              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="w-24 h-24 rounded-full bg-white border-2 border-lp-border overflow-hidden flex items-center justify-center text-2xl font-semibold text-lp-text2 shadow-sm">
                {previewImage ? (
                  <img src={previewImage} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  (formData.name?.[0] || 'U').toUpperCase()
                )}
                </div>

                <div className="flex-1">
                  <input id="profile-picture" type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  <label
                    htmlFor="profile-picture"
                    className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-lp-text text-white text-sm font-semibold tracking-wide cursor-pointer hover:bg-lp-atext transition-colors"
                  >
                    Pilih Foto
                  </label>
                  <p className="text-xs font-medium text-lp-text2 mt-2">Format: JPG / PNG. Ukuran maksimum: 2MB.</p>

                  {selectedFile && (
                    <div className="mt-3 inline-flex items-center gap-2 rounded-md border border-lp-border bg-white px-3 py-2">
                      <span className="text-xs font-semibold text-lp-text">{selectedFile.name}</span>
                      <span className="text-[11px] text-lp-text3">({formatFileSize(selectedFile.size)})</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm text-lp-text2 mb-1">{config.nameLabel}</label>
              <input name="name" value={formData.name} onChange={handleChange} required className="w-full border border-lp-border rounded-lg px-3 py-2" />
            </div>

            <div>
              <label className="block text-sm text-lp-text2 mb-1">Username</label>
              <input name="username" value={formData.username} onChange={handleChange} required className="w-full border border-lp-border rounded-lg px-3 py-2" />
            </div>

            <div>
              <label className="block text-sm text-lp-text2 mb-1">Bio</label>
              <textarea name="bio" value={formData.bio} onChange={handleChange} rows={4} maxLength={150} className="w-full border border-lp-border rounded-lg px-3 py-2 resize-none" />
            </div>

            <div>
              <label className="block text-sm text-lp-text2 mb-1">Website</label>
              <input name="website" value={formData.website} onChange={handleChange} className="w-full border border-lp-border rounded-lg px-3 py-2" />
            </div>

            <div>
              <label className="block text-sm text-lp-text2 mb-1">Phone</label>
              <input name="phone" value={formData.phone} onChange={handleChange} className="w-full border border-lp-border rounded-lg px-3 py-2" />
            </div>

            {publicProfileUrl && (
              <a href={publicProfileUrl} target="_blank" rel="noreferrer" className="inline-block text-sm text-lp-atext hover:underline">
                Lihat Profil Publik
              </a>
            )}

            <button type="submit" disabled={isSubmitting} className="w-full bg-lp-text text-white rounded-lg px-4 py-2 disabled:opacity-50">
              {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ProfileSettingsPage
