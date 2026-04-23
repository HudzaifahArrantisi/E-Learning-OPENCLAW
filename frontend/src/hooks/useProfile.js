// hooks/useProfile.js
import { useQuery } from '@tanstack/react-query'
import api from '../services/api'

const getAuthToken = () => localStorage.getItem('token')

const useProfile = (expectedRole = null, options = {}) => {
  const token = getAuthToken()
  const endpoint = options?.endpoint || '/api/profile/me'

  return useQuery({
    queryKey: ['my-profile', token, expectedRole, endpoint],
    queryFn: async () => {
      try {
        const currentToken = getAuthToken()
        const config = currentToken ? { headers: { Authorization: `Bearer ${currentToken}` } } : {}

        const res = await api.get(endpoint, config)
        const profile = res.data.data
        if (expectedRole && profile?.role && profile.role !== expectedRole) {
          throw new Error(`Role akun tidak sesuai. Diharapkan: ${expectedRole}, ditemukan: ${profile.role}`)
        }
        return profile
      } catch (error) {
        if (error.response?.status === 404) {
          throw new Error('Profil tidak ditemukan. Pastikan akun sudah login.')
        }

        throw new Error(error.response?.data?.error || 'Gagal memuat profil')
      }
    },
    enabled: !!token,
    staleTime: 1000 * 30,
    retry: 2,
    refetchOnWindowFocus: false,
  })
}

export default useProfile
