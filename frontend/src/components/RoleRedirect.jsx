import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuth from '../hooks/useAuth'
import Loading from './Loading'

const RoleRedirect = () => {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading) {
      if (user) {
        const roleRedirects = {
          admin: '/admin',
          dosen: '/dosen',
          mahasiswa: '/mahasiswa',
          orangtua: '/ortu',
          ukm: '/ukm',
          ormawa: '/ormawa'
        }
        navigate(roleRedirects[user.role] || '/')
      } else {
        navigate('/')
      }
    }
  }, [user, loading, navigate])

  if (loading) {
    return <Loading />
  }

  return null
}

export default RoleRedirect
