// src/hooks/useAuth.js
// Centralized Auth Context — verifies token ONCE, shared across all components.
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import api from '../services/api'
import queryClient from '../lib/queryClient'
import { normalizeLoginIdentifier } from '../utils/auth'

const AuthContext = createContext(null)

const normalizeRole = (role) => String(role || '').trim().toLowerCase()

const normalizeUser = (user, fallbackRole = '') => ({
  ...(user || {}),
  role: normalizeRole(user?.role || fallbackRole),
})

// Provider: wrap this around your app (inside App.jsx)
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const hasVerified = useRef(false) // Prevent double-call from StrictMode

  // Function untuk verify token — only runs ONCE
  const verifyToken = useCallback(async () => {
    // Guard: skip if already verified (StrictMode protection)
    if (hasVerified.current) return
    hasVerified.current = true

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setLoading(false)
        return
      }

      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      const response = await api.get('/api/auth/verify')
      
      if (response.data.success) {
        const data = response.data.data || {}
        const verifiedUser = data.user || data
        setUser(normalizeUser(verifiedUser, data.role || localStorage.getItem('role')))
        setError(null)
      } else {
        throw new Error(response.data.message || 'Token verification failed')
      }
    } catch (error) {
      console.error('Verify token error:', error)
      localStorage.removeItem('token')
      localStorage.removeItem('role')
      delete api.defaults.headers.common['Authorization']
      setError(error.response?.data?.message || 'Session expired, please login again')
    } finally {
      setLoading(false)
    }
  }, [])

  // Cek token saat pertama kali load — ONLY ONCE
  useEffect(() => {
    verifyToken()
  }, [verifyToken])

  const applyAuthResponse = useCallback((payload, fallbackIdentifier = '') => {
    const { token, user, role, redirect } = payload || {}
    if (!token) {
      throw new Error('Token login tidak ditemukan pada respons server')
    }

    const userData = normalizeUser(user || { email: fallbackIdentifier }, role)
    if (!userData.role) {
      throw new Error('Role akun tidak ditemukan pada respons login')
    }

    localStorage.setItem('token', token)
    localStorage.setItem('role', userData.role)
    localStorage.setItem('dashboardLastActivityAt', String(Date.now()))
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`

    setUser(userData)
    setError(null)

    return { success: true, redirect, user: userData }
  }, [])

  const login = async (identifier, password) => {
    try {
      setLoading(true)
      setError(null)

      const normalizedIdentifier = normalizeLoginIdentifier(identifier)
      const response = await api.post('/api/auth/login', {
        identifier: normalizedIdentifier,
        password
      })

      if (response.data.success) {
        return applyAuthResponse(response.data.data, normalizedIdentifier)
      } else {
        throw new Error(response.data.message || 'Login failed')
      }
    } catch (error) {
      console.error('Login error:', error)
      const message = error.response?.data?.message || 'Login gagal. Periksa koneksi atau kredensial.'
      setError(message)
      return { success: false, message, data: error.response?.data }
    } finally {
      setLoading(false)
    }
  }

  const logout = useCallback(() => {
    // 1. Clear localStorage auth data
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    localStorage.removeItem('dashboardLastActivityAt')
    // 2. Remove Authorization header
    delete api.defaults.headers.common['Authorization']
    // 3. Clear ALL React Query cache — prevents stale profile/feed data
    //    from previous user session leaking into new login
    queryClient.clear()
    // 4. Reset local state
    setUser(null)
    setError(null)
    hasVerified.current = false // Allow re-verify on next login
  }, [])

  const refreshAuth = useCallback(() => {
    setLoading(true)
    hasVerified.current = false // Allow re-verify
    verifyToken()
  }, [verifyToken])

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    refreshAuth,
    applyAuthResponse,
    isAuthenticated: !!user && !!localStorage.getItem('token')
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// Hook: use this in any component to access auth state (NO extra API calls)
const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default useAuth
