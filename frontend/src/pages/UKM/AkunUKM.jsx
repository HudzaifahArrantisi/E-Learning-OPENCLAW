// src/pages/UKM/AkunUKM.jsx
import React from 'react'
import { Link } from 'react-router-dom'
import useProfile from '../../hooks/useProfile'
import Navbar from '../../components/Navbar'
import Sidebar from '../../components/Sidebar'
import useAuth from '../../hooks/useAuth'
import { resolveBackendAssetUrl } from '../../utils/assetUrl'

const AkunUKM = () => {
  const { user } = useAuth()
  const { data: profile, isLoading } = useProfile()
  if (isLoading) return <div className="p-20 text-center">Loading profile...</div>

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar role="ukm" />
      <div className="flex-1 w-full max-w-5xl mx-auto p-4 sm:p-6 md:p-8">

        <Navbar user={user} />

        <div className="bg-white rounded-2xl shadow-xl p-5 sm:p-8 md:p-10 mb-8">
          <div className="flex flex-col md:flex-row gap-6 md:gap-10">
            <div className="mx-auto md:mx-0">
              {profile?.profile_picture ? (
                <img src={resolveBackendAssetUrl(profile.profile_picture)} alt="Profile UKM" className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 rounded-full object-cover border-4 sm:border-8 border-orange-500" />
              ) : (
                <div className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 rounded-full bg-gradient-to-r from-orange-500 to-orange-700 flex items-center justify-center text-white text-4xl sm:text-6xl md:text-7xl font-bold">
                  {profile?.name?.[0] || 'U'}
                </div>
              )}
            </div>

            <div className="flex-1 text-center md:text-left">
              <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold mb-2 sm:mb-3 break-words">{profile?.name}</h1>
              <p className="text-base sm:text-xl md:text-2xl text-gray-600 mb-4 sm:mb-6 break-all">@{profile?.username}</p>

              {profile?.bio && <p className="text-sm sm:text-lg md:text-xl mb-6 sm:mb-8 leading-relaxed">{profile.bio}</p>}

              <div className="grid grid-cols-3 gap-3 sm:gap-6 md:gap-10 text-center mb-6 sm:mb-8">
                <div>
                  <div className="text-xl sm:text-3xl md:text-4xl font-bold">0</div>
                  <div className="text-gray-600 text-xs sm:text-sm md:text-base">Postingan</div>
                </div>
                <div>
                  <div className="text-xl sm:text-3xl md:text-4xl font-bold">{profile?.followers_count || 0}</div>
                  <div className="text-gray-600 text-xs sm:text-sm md:text-base">Pengikut</div>
                </div>
                <div>
                  <div className="text-xl sm:text-3xl md:text-4xl font-bold">{profile?.following_count || 0}</div>
                  <div className="text-gray-600 text-xs sm:text-sm md:text-base">Mengikuti</div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 md:gap-6">
                <Link to="/ukm/setting-profile" className="bg-gray-200 hover:bg-gray-300 px-5 py-3 rounded-xl text-sm sm:text-base md:text-lg font-medium text-center">
                  Edit Profile
                </Link>
                <Link to="/ukm/posting" className="bg-orange-600 hover:bg-orange-700 text-white px-5 py-3 rounded-xl text-sm sm:text-base md:text-lg font-medium text-center">
                  Buat Postingan
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AkunUKM