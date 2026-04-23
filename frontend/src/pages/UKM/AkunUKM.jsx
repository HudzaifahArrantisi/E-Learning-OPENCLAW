// src/pages/UKM/AkunUKM.jsx
// Redirects to the unified ProfilePublic page with the user's own username
import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useProfile from '../../hooks/useProfile'
import Sidebar from '../../components/Sidebar'

const AkunUKM = () => {
  const navigate = useNavigate()
  const { data: profile, isLoading } = useProfile()

  useEffect(() => {
    if (profile?.username) {
      // Redirect to the premium ProfilePublic page
      navigate(`/profile/ukm/${profile.username}`, { replace: true })
    }
  }, [profile, navigate])

  // Show a loading state while profile is being fetched
  if (isLoading || !profile?.username) {
    return (
      <div className="flex min-h-screen bg-[#fafafa] font-sans">
        <Sidebar role="ukm" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-10 h-10 border-2 border-lp-border border-t-lp-accent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-lp-text2 text-sm font-light">Memuat profil...</p>
          </div>
        </div>
      </div>
    )
  }

  return null
}

export default AkunUKM